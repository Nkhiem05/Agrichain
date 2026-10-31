const db = require("../../config/db");
const chain = require("./chainClient");
const { traVeHangCho } = require("./ghiNhan");
const { VAI_TRO_ON_CHAIN } = require("./eventTypes");

// CÔNG CỤ QUẢN TRỊ: gỡ lô kẹt và đổi ví người dùng.
// Không bao giờ sửa dữ liệu đã nằm trên blockchain; chỉ xử lý phần còn chờ ký ở phía server.

class LoiQuanTri extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Quá ngần này phút mà giao dịch đã gửi vẫn chưa xác nhận thì coi là kẹt
const PHUT_GIAO_DICH_KET = 10;
// Yêu cầu chờ ký quá ngần này giờ thì gắn nhãn "chờ lâu"
const GIO_CHO_LAU = 24;

// Các sự kiện mà việc áp dụng vào dữ liệu chỉ xảy ra SAU khi ký (có ap_dung): hủy yêu cầu thì dữ liệu vẫn nguyên như trước khi bấm
const coApDung = (payload) =>
  Boolean(payload?.tham_so?.ap_dung && Object.keys(payload.tham_so.ap_dung).length > 0);

const docPayload = (v) => {
  if (!v) return {};
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return {};
  }
};

// ---------------------------------------------------------------- 1. Lô kẹt

// Mọi sự kiện chưa xác nhận, gom theo lô, kèm chẩn đoán vì sao chưa tiến lên được
const danhSachLoKet = async () => {
  const [rows] = await db.query(
    `
    SELECT ls.ma_lich_su, ls.ma_lo_nong_san, ls.so_thu_tu_su_kien AS stt, ls.loai_hoat_dong AS loai,
           ls.ma_nguoi_dung, nd.ho_ten, nd.vai_tro, ls.thoi_diem_xay_ra,
           TIMESTAMPDIFF(MINUTE, ls.thoi_diem_xay_ra, NOW()) AS so_phut_cho,
           ls.blockchain_sync_status AS trang_thai, o.status AS trang_thai_outbox, o.payload, o.tx_hash,
           o.last_error, o.retry_count,
           TIMESTAMPDIFF(MINUTE, o.submitted_at, NOW()) AS so_phut_da_gui,
           lo.ma_nguoi_quan_ly, lo.giai_doan_hien_tai,
           (SELECT COUNT(*) FROM lich_su_truy_xuat_lo c WHERE c.ma_su_kien_goc = ls.ma_lich_su) AS so_con,
           (SELECT MAX(l2.so_thu_tu_su_kien) FROM lich_su_truy_xuat_lo l2 WHERE l2.ma_lo_nong_san = ls.ma_lo_nong_san) AS stt_cuoi
    FROM lich_su_truy_xuat_lo ls
    JOIN blockchain_outbox o ON o.event_id = ls.ma_lich_su
    JOIN nguoi_dung nd ON nd.ma_nguoi_dung = ls.ma_nguoi_dung
    JOIN lo_nong_san lo ON lo.ma_lo_nong_san = ls.ma_lo_nong_san
    WHERE ls.blockchain_sync_status <> 'CONFIRMED'
    ORDER BY ls.ma_lo_nong_san, ls.so_thu_tu_su_kien
    LIMIT 500
    `,
  );

  const nguoiKy = [...new Set(rows.map((r) => r.ma_nguoi_dung))];
  const coVi = new Set();
  if (nguoiKy.length > 0) {
    const [vi] = await db.query(
      `SELECT ma_nguoi_dung FROM vi_blockchain WHERE ma_nguoi_dung IN (?) AND trang_thai = 1 AND trang_thai_duyet = 'DA_DUYET'`,
      [nguoiKy],
    );
    vi.forEach((v) => coVi.add(v.ma_nguoi_dung));
  }

  const theoLo = new Map();
  for (const r of rows) {
    if (!theoLo.has(r.ma_lo_nong_san)) theoLo.set(r.ma_lo_nong_san, []);
    theoLo.get(r.ma_lo_nong_san).push(r);
  }

  const ketQua = [];
  for (const [maLo, evs] of theoLo) {
    const dau = evs[0]; // sự kiện chưa ký sớm nhất: chặn mọi sự kiện sau
    const suKien = evs.map((e, i) => {
      const payload = docPayload(e.payload);
      const bi = i > 0; // đứng sau một sự kiện khác chưa ký
      let chanDoan = null;
      let muc = "cho"; // cho | ket | loi
      if (e.trang_thai_outbox === "FAILED") {
        muc = "loi";
        chanDoan = `Giao dịch bị lỗi: ${e.last_error || "không rõ lý do"}`;
      } else if (e.trang_thai_outbox === "SUBMITTED") {
        if (Number(e.so_phut_da_gui) >= PHUT_GIAO_DICH_KET) {
          muc = "ket";
          chanDoan = `Giao dịch đã gửi ${e.so_phut_da_gui} phút vẫn chưa được xác nhận (có thể đã bị hủy trong MetaMask)`;
        } else {
          chanDoan = "Giao dịch đã gửi, đang chờ blockchain xác nhận";
        }
      } else if (!coVi.has(e.ma_nguoi_dung)) {
        muc = "ket";
        chanDoan = `${e.ho_ten} chưa có ví được duyệt nên không ký được`;
      } else if (bi) {
        const truoc = evs[i - 1];
        chanDoan = `Đang xếp sau bước #${truoc.stt} của ${truoc.ho_ten}, bước đó phải ký xong trước`;
      } else if (e.last_error) {
        muc = "ket";
        chanDoan = `Lần ký trước không thành công: ${e.last_error}`;
      } else if (Number(e.so_phut_cho) >= GIO_CHO_LAU * 60) {
        muc = "ket";
        chanDoan = `${e.ho_ten} chưa ký sau hơn ${GIO_CHO_LAU} giờ`;
      } else {
        chanDoan = `Đang chờ ${e.ho_ten} ký`;
      }

      // Hủy yêu cầu: chỉ khi dữ liệu chưa thay đổi (có ap_dung), là sự kiện cuối của lô, không phải đang gửi, chưa ai tham chiếu
      let khongHuyDuoc = null;
      if (!coApDung(payload)) khongHuyDuoc = "Bước này đã thay đổi dữ liệu ngay khi tạo, không hủy được";
      else if (e.trang_thai_outbox === "SUBMITTED") khongHuyDuoc = "Giao dịch đang gửi, hãy 'Cho ký lại' trước";
      else if (Number(e.stt) !== Number(e.stt_cuoi)) khongHuyDuoc = "Còn bước khác của lô đứng sau, phải hủy bước đó trước";
      else if (Number(e.so_con) > 0) khongHuyDuoc = "Có sự kiện khác tham chiếu tới bước này";

      return {
        ma_lich_su: e.ma_lich_su,
        stt: Number(e.stt),
        loai: e.loai,
        ma_nguoi_ky: e.ma_nguoi_dung,
        ten_nguoi_ky: e.ho_ten,
        vai_tro: e.vai_tro,
        co_vi: coVi.has(e.ma_nguoi_dung),
        trang_thai: e.trang_thai_outbox,
        so_phut_cho: Number(e.so_phut_cho),
        tx_hash: e.tx_hash,
        loi_truoc: e.last_error,
        hanh_dong_ap_dung: payload.tham_so?.ap_dung?.hanh_dong || null,
        muc,
        chan_doan: chanDoan,
        co_the_dat_lai: ["FAILED", "SUBMITTED"].includes(e.trang_thai_outbox) || Boolean(e.last_error),
        co_the_huy: khongHuyDuoc === null,
        ly_do_khong_huy: khongHuyDuoc,
      };
    });

    const xauNhat = suKien.find((s) => s.muc === "loi") || suKien.find((s) => s.muc === "ket");
    ketQua.push({
      ma_lo: maLo,
      giai_doan: dau.giai_doan_hien_tai,
      ma_chu_lo: dau.ma_nguoi_quan_ly,
      so_su_kien: suKien.length,
      muc: xauNhat ? xauNhat.muc : "cho",
      tom_tat: xauNhat ? xauNhat.chan_doan : suKien[0].chan_doan,
      su_kien: suKien,
    });
  }

  // Lô kẹt/lỗi lên đầu
  const thuTu = { loi: 0, ket: 1, cho: 2 };
  ketQua.sort((a, b) => thuTu[a.muc] - thuTu[b.muc] || a.ma_lo.localeCompare(b.ma_lo));
  return ketQua;
};

const layMotSuKien = async (executor, maLichSu) => {
  const [rows] = await executor.query(
    `
    SELECT ls.ma_lich_su, ls.ma_lo_nong_san, ls.so_thu_tu_su_kien AS stt, ls.loai_hoat_dong AS loai,
           ls.ma_bam_su_kien_hien_tai AS event_hash, ls.blockchain_sync_status AS trang_thai,
           o.status AS trang_thai_outbox, o.payload, o.tx_hash
    FROM lich_su_truy_xuat_lo ls
    JOIN blockchain_outbox o ON o.event_id = ls.ma_lich_su
    WHERE ls.ma_lich_su = ?
    FOR UPDATE
    `,
    [maLichSu],
  );
  if (rows.length === 0) throw new LoiQuanTri(404, "Không tìm thấy sự kiện");
  return rows[0];
};

// Trả sự kiện về hàng chờ ký sạch: dùng khi giao dịch lỗi / kẹt / bị hủy trong MetaMask
const datLaiSuKien = async (maLichSu) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const e = await layMotSuKien(conn, maLichSu);
    if (e.trang_thai === "CONFIRMED") throw new LoiQuanTri(409, "Sự kiện này đã được xác nhận trên blockchain");

    // Nếu giao dịch đã vào khối thành công thì không đặt lại, để worker đối soát xác nhận
    if (e.tx_hash && chain.layCauHinh().daCauHinh) {
      let bienLai = null;
      try {
        bienLai = await chain.docBienLai(e.tx_hash);
      } catch {
        throw new LoiQuanTri(502, "Không đọc được blockchain để kiểm tra giao dịch, thử lại sau");
      }
      if (bienLai && bienLai.status === 1) {
        throw new LoiQuanTri(
          409,
          "Giao dịch này đã thành công trên blockchain. Hãy bấm 'Chạy đối soát ngay' để hệ thống xác nhận, không cần ký lại",
        );
      }
    }
    await traVeHangCho(conn, {
      maLichSu,
      lyDo: "Quản trị viên đã cho ký lại sự kiện này",
    });
    // Đã xử lý xong: xóa ghi chú lỗi để lô không còn bị gắn nhãn kẹt
    await conn.query(`UPDATE blockchain_outbox SET retry_count = 0, last_error = NULL WHERE event_id = ?`, [maLichSu]);
    await conn.commit();
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
};

// Tính lại bộ đếm chuỗi của lô sau khi gỡ sự kiện cuối
const tinhLaiBoDemLo = async (executor, maLo) => {
  const [cuoi] = await executor.query(
    `
    SELECT so_thu_tu_su_kien AS stt, ma_bam_su_kien_hien_tai AS hash
    FROM lich_su_truy_xuat_lo WHERE ma_lo_nong_san = ? ORDER BY so_thu_tu_su_kien DESC LIMIT 1
    `,
    [maLo],
  );
  const [con] = await executor.query(
    `SELECT COUNT(*) AS c FROM lich_su_truy_xuat_lo WHERE ma_lo_nong_san = ? AND blockchain_sync_status <> 'CONFIRMED'`,
    [maLo],
  );
  await executor.query(
    `
    UPDATE lo_nong_san
    SET latest_event_sequence = ?, latest_event_hash = ?, blockchain_sync_status = ?
    WHERE ma_lo_nong_san = ?
    `,
    [cuoi[0]?.stt ?? 0, cuoi[0]?.hash ?? null, Number(con[0].c) === 0 ? "CONFIRMED" : "QUEUED", maLo],
  );
};

// Hủy một yêu cầu đang chờ ký mà người dùng bỏ dở. Dữ liệu (kho, trạng thái lô, phiếu...) chưa bị áp dụng nên vẫn nguyên như trước khi họ bấm
const huySuKienChoKy = async (maLichSu) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const e = await layMotSuKien(conn, maLichSu);
    const payload = docPayload(e.payload);

    if (e.trang_thai === "CONFIRMED") throw new LoiQuanTri(409, "Sự kiện đã xác nhận trên blockchain, không hủy được");
    if (e.trang_thai_outbox === "SUBMITTED")
      throw new LoiQuanTri(409, "Giao dịch đang được gửi lên blockchain. Hãy bấm 'Cho ký lại' hoặc chờ worker xử lý rồi mới hủy");
    if (!coApDung(payload))
      throw new LoiQuanTri(409, "Bước này đã thay đổi dữ liệu ngay khi tạo (không phải kiểu 'ký xong mới áp dụng'), không hủy được");

    const [sau] = await conn.query(
      `SELECT COUNT(*) AS c FROM lich_su_truy_xuat_lo WHERE ma_lo_nong_san = ? AND so_thu_tu_su_kien > ?`,
      [e.ma_lo_nong_san, e.stt],
    );
    if (Number(sau[0].c) > 0)
      throw new LoiQuanTri(409, "Còn bước khác của lô đứng sau bước này, phải hủy các bước đó trước");
    const [con] = await conn.query(
      `SELECT COUNT(*) AS c FROM lich_su_truy_xuat_lo WHERE ma_su_kien_goc = ?`,
      [maLichSu],
    );
    if (Number(con[0].c) > 0) throw new LoiQuanTri(409, "Có sự kiện khác tham chiếu tới bước này");

    // Chặn trường hợp sự kiện thực ra đã nằm trên chain mà server chưa kịp biết
    if (chain.layCauHinh().daCauHinh) {
      let tren;
      try {
        tren = await chain.layTrangThaiLoTrenChain(e.ma_lo_nong_san);
      } catch {
        throw new LoiQuanTri(502, "Không đọc được blockchain để kiểm tra, thử lại sau");
      }
      if (tren?.tonTai && tren.lastHash === e.event_hash) {
        throw new LoiQuanTri(
          409,
          "Sự kiện này đã có trên blockchain. Hãy bấm 'Chạy đối soát ngay' để hệ thống xác nhận, không được hủy",
        );
      }
    }

    await conn.query(`DELETE FROM blockchain_outbox WHERE event_id = ?`, [maLichSu]);
    await conn.query(`DELETE FROM lich_su_truy_xuat_lo WHERE ma_lich_su = ?`, [maLichSu]);
    await tinhLaiBoDemLo(conn, e.ma_lo_nong_san);
    await conn.commit();
    return { ma_lo: e.ma_lo_nong_san, loai: e.loai };
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
};

// ---------------------------------------------------------------- 2. Đổi ví

// Những việc còn dang dở gắn với ví hiện tại của một người dùng: đổi ví lúc này sẽ làm các việc đó không ký tiếp được
const viecDangDo = async (maNguoiDung, diaChiCu) => {
  const vanDe = [];

  // a. Lô còn hàng mà chủ trên blockchain đang là ví cũ
  const [los] = await db.query(
    `
    SELECT lo.ma_lo_nong_san
    FROM lo_nong_san lo
    WHERE lo.ma_nguoi_quan_ly = ? AND lo.latest_event_sequence > 0 AND lo.giai_doan_hien_tai <> 'COMPLETED'
      AND EXISTS (SELECT 1 FROM lich_su_truy_xuat_lo ls WHERE ls.ma_lo_nong_san = lo.ma_lo_nong_san AND ls.blockchain_sync_status = 'CONFIRMED')
    `,
    [maNguoiDung],
  );
  if (los.length > 0 && chain.layCauHinh().daCauHinh) {
    for (const { ma_lo_nong_san: maLo } of los) {
      let tren = null;
      try {
        tren = await chain.layTrangThaiLoTrenChain(maLo);
      } catch {
        throw new LoiQuanTri(502, "Không đọc được blockchain để kiểm tra lô của người dùng, thử lại sau");
      }
      if (tren?.tonTai && tren.trangThai === 1 && tren.chuLo.toLowerCase() === diaChiCu.toLowerCase()) {
        vanDe.push({ loai: "LO_TREN_CHAIN", ma_lo: maLo, mo_ta: `Lô ${maLo} đang thuộc ví cũ trên blockchain, hợp đồng không có hàm chuyển chủ lô` });
      }
    }
  }

  // b. Sự kiện chờ ký của chính người này
  const [cho] = await db.query(
    `SELECT ma_lo_nong_san AS ma_lo, loai_hoat_dong AS loai FROM lich_su_truy_xuat_lo WHERE ma_nguoi_dung = ? AND blockchain_sync_status <> 'CONFIRMED'`,
    [maNguoiDung],
  );
  cho.forEach((c) => vanDe.push({ loai: "CHO_KY", ma_lo: c.ma_lo, mo_ta: `Lô ${c.ma_lo} còn bước ${c.loai} đang chờ người này ký` }));

  // c. Lệnh vận chuyển đang chạy mà người này là xe hoặc bên nhận (địa chỉ ví đã được ghi vào lệnh trên chain)
  const [lenh] = await db.query(
    `
    SELECT ma_van_don, ma_lo_nong_san AS ma_lo, trang_thai FROM lenh_van_chuyen
    WHERE (ma_don_vi_van_chuyen = ? OR ma_ben_nhan = ?)
      AND trang_thai IN ('CHO_LAY_HANG','DANG_VAN_CHUYEN','CHO_TIEP_NHAN','DANG_TRA_HANG')
    `,
    [maNguoiDung, maNguoiDung],
  );
  lenh.forEach((l) => vanDe.push({ loai: "LENH_DANG_CHAY", ma_lo: l.ma_lo, mo_ta: `Lệnh ${l.ma_van_don} của lô ${l.ma_lo} đang ở "${l.trang_thai}"` }));

  return vanDe;
};

// Danh sách người dùng có ví + các việc dang dở: để admin biết ai đổi ví được ngay
const danhSachViDoiDuoc = async () => {
  const [rows] = await db.query(
    `
    SELECT v.dia_chi_vi, v.ma_nguoi_dung, v.trang_thai_duyet, nd.ho_ten, nd.ten_dang_nhap, nd.vai_tro
    FROM vi_blockchain v JOIN nguoi_dung nd ON nd.ma_nguoi_dung = v.ma_nguoi_dung
    WHERE nd.vai_tro <> 'ADMIN'
    ORDER BY nd.vai_tro, nd.ho_ten
    `,
  );
  return rows;
};

const kiemTraDoiVi = async (maNguoiDung) => {
  const [vi] = await db.query(
    `
    SELECT v.dia_chi_vi, v.trang_thai_duyet, nd.ho_ten, nd.vai_tro
    FROM vi_blockchain v JOIN nguoi_dung nd ON nd.ma_nguoi_dung = v.ma_nguoi_dung
    WHERE v.ma_nguoi_dung = ?
    `,
    [maNguoiDung],
  );
  if (vi.length === 0) throw new LoiQuanTri(404, "Người dùng này chưa liên kết ví nào");
  if (vi[0].vai_tro === "ADMIN") throw new LoiQuanTri(400, "Ví của quản trị viên tự đổi ở trang Ví blockchain của họ");
  const van_de = await viecDangDo(maNguoiDung, vi[0].dia_chi_vi);
  return { ...vi[0], van_de };
};

// Gỡ liên kết ví: người dùng tự liên kết ví mới bằng chữ ký (ví mới phải do chính họ giữ), admin duyệt lại vai trò
const goLienKetVi = async (maNguoiDung, { lyDo, chapNhanMatLo }) => {
  if (!lyDo || String(lyDo).trim().length < 5) throw new LoiQuanTri(400, "Hãy nhập lý do đổi ví (ít nhất 5 ký tự)");
  const kt = await kiemTraDoiVi(maNguoiDung);
  if (kt.van_de.length > 0 && !chapNhanMatLo) {
    const e = new LoiQuanTri(409, "Người dùng còn việc dang dở gắn với ví cũ, đổi ví sẽ làm các việc này không ký tiếp được");
    e.van_de = kt.van_de;
    throw e;
  }
  let vaiTroTrenChain = null;
  if (chain.layCauHinh().daCauHinh) {
    try {
      vaiTroTrenChain = await chain.vaiTroTrenChain(kt.dia_chi_vi);
    } catch {
      vaiTroTrenChain = null;
    }
  }
  await db.query(`DELETE FROM vi_blockchain WHERE ma_nguoi_dung = ?`, [maNguoiDung]);
  await db.query(`DELETE FROM vi_blockchain_nonce WHERE ma_nguoi_dung = ?`, [maNguoiDung]);
  console.warn(
    `[Quản trị] Gỡ ví ${kt.dia_chi_vi} của ${maNguoiDung} (${kt.ho_ten}). Lý do: ${lyDo}. Còn ${kt.van_de.length} việc dang dở${chapNhanMatLo ? " (admin chấp nhận)" : ""}`,
  );
  return {
    dia_chi_cu: kt.dia_chi_vi,
    ho_ten: kt.ho_ten,
    van_de_bo_qua: chapNhanMatLo ? kt.van_de : [],
    vai_tro_con_tren_chain: vaiTroTrenChain, // số > 0: ví cũ vẫn còn vai trò trên hợp đồng, nên thu hồi (setRole = 0)
  };
};

module.exports = {
  LoiQuanTri,
  danhSachLoKet,
  datLaiSuKien,
  huySuKienChoKy,
  danhSachViDoiDuoc,
  kiemTraDoiVi,
  goLienKetVi,
  VAI_TRO_ON_CHAIN,
};
