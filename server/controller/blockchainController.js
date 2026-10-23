const crypto = require("crypto");
const { verifyMessage, isAddress, getAddress, ZeroAddress } = require("ethers");
const db = require("../config/db");
const {
  ABI,
  VAI_TRO_ON_CHAIN,
  ZERO_HASH,
} = require("../services/blockchain/eventTypes");
const {
  canonicalJson,
  hashNoiDung,
  hashSuKien,
  batchIdCuaLo,
} = require("../services/blockchain/canonical");
const {
  layBanChupMuaVu,
  layChiSoKiemDinh,
} = require("../services/blockchain/traceEvent");
const chain = require("../services/blockchain/chainClient");

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const sendError = (res, err, fallback) => {
  if (err instanceof ApiError || err.status) {
    return res
      .status(err.status)
      .json({ success: false, message: err.message });
  }
  console.error(fallback, err);
  return res.status(500).json({ success: false, message: fallback });
};

const withTransaction = async (callback) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

// Cột JSON (longtext + json_valid) có thể được driver trả về dạng chuỗi hoặc đã parse thành object
const docJson = (value) =>
  typeof value === "string" ? JSON.parse(value) : value;

const thongDiepLienKet = (maNguoiDung, nonce) =>
  `Agrichain xac nhan lien ket vi\nTai khoan: ${maNguoiDung}\nNonce: ${nonce}`;

const chuanHoaDiaChi = (value) => {
  if (typeof value !== "string" || !isAddress(value)) {
    throw new ApiError(400, "Địa chỉ ví không hợp lệ");
  }
  return value.toLowerCase();
};

/* ======================= Cấu hình và ví ======================= */

const layCauHinhCongKhai = (req, res) => {
  const cfg = chain.layCauHinh();
  return res.json({
    success: true,
    data: {
      chainId: cfg.chainId,
      tenMang: cfg.tenMang,
      rpcUrl: cfg.rpcUrl,
      explorerUrl: cfg.explorerUrl,
      tienTe: cfg.tienTe,
      contractAddress: cfg.contractAddress,
      daCauHinh: cfg.daCauHinh,
      abi: ABI,
    },
  });
};

const viCuaToi = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT dia_chi_vi, trang_thai, trang_thai_duyet, thoi_diem_dang_ky
      FROM vi_blockchain
      WHERE ma_nguoi_dung = ?
      LIMIT 1
      `,
      [req.user.ma_nguoi_dung],
    );
    return res.json({
      success: true,
      data: {
        vi: rows[0]
          ? { ...rows[0], dia_chi_vi: getAddress(rows[0].dia_chi_vi) }
          : null,
        vai_tro: req.user.vai_tro,
        can_vi:
          Boolean(VAI_TRO_ON_CHAIN[req.user.vai_tro]) ||
          req.user.vai_tro === "ADMIN",
      },
    });
  } catch (err) {
    return sendError(res, err, "Không thể lấy thông tin ví");
  }
};

const taoNonce = async (req, res) => {
  try {
    const nonce = crypto.randomBytes(16).toString("hex");
    await db.query(
      `
      REPLACE INTO vi_blockchain_nonce (ma_nguoi_dung, nonce, het_han)
      VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))
      `,
      [req.user.ma_nguoi_dung, nonce],
    );
    return res.json({
      success: true,
      data: {
        nonce,
        thong_diep: thongDiepLienKet(req.user.ma_nguoi_dung, nonce),
      },
    });
  } catch (err) {
    return sendError(res, err, "Không thể tạo nonce");
  }
};

const lienKetVi = async (req, res) => {
  try {
    const maNguoiDung = req.user.ma_nguoi_dung;
    const diaChi = chuanHoaDiaChi(req.body?.address);
    const chuKy = req.body?.signature;
    if (typeof chuKy !== "string") throw new ApiError(400, "Thiếu chữ ký");

    if (!VAI_TRO_ON_CHAIN[req.user.vai_tro] && req.user.vai_tro !== "ADMIN") {
      throw new ApiError(400, "Vai trò này không cần ví blockchain");
    }

    const trangThai = await withTransaction(async (connection) => {
      const [nonceRows] = await connection.query(
        `SELECT nonce FROM vi_blockchain_nonce WHERE ma_nguoi_dung = ? AND het_han > NOW() FOR UPDATE`,
        [maNguoiDung],
      );
      if (nonceRows.length === 0)
        throw new ApiError(400, "Phiên liên kết đã hết hạn, hãy thử lại");

      let nguoiKy;
      try {
        nguoiKy = verifyMessage(
          thongDiepLienKet(maNguoiDung, nonceRows[0].nonce),
          chuKy,
        );
      } catch {
        throw new ApiError(400, "Chữ ký không hợp lệ");
      }
      if (nguoiKy.toLowerCase() !== diaChi) {
        throw new ApiError(400, "Chữ ký không khớp với địa chỉ ví");
      }
      await connection.query(
        `DELETE FROM vi_blockchain_nonce WHERE ma_nguoi_dung = ?`,
        [maNguoiDung],
      );

      const [dungRoi] = await connection.query(
        `SELECT ma_nguoi_dung FROM vi_blockchain WHERE dia_chi_vi = ? LIMIT 1 FOR UPDATE`,
        [diaChi],
      );
      if (dungRoi.length > 0 && dungRoi[0].ma_nguoi_dung !== maNguoiDung) {
        throw new ApiError(409, "Ví này đã được liên kết với tài khoản khác");
      }

      const [cu] = await connection.query(
        `SELECT dia_chi_vi, trang_thai_duyet FROM vi_blockchain WHERE ma_nguoi_dung = ? FOR UPDATE`,
        [maNguoiDung],
      );
      if (
        cu.length > 0 &&
        cu[0].trang_thai_duyet === "DA_DUYET" &&
        cu[0].dia_chi_vi !== diaChi
      ) {
        throw new ApiError(
          409,
          "Tài khoản đã có ví được duyệt, hãy liên hệ quản trị viên để đổi ví",
        );
      }

      // Ví của admin không cần vai trò trên contract nên được duyệt luôn
      const duyet = req.user.vai_tro === "ADMIN" ? "DA_DUYET" : "CHO_DUYET";
      await connection.query(
        `DELETE FROM vi_blockchain WHERE ma_nguoi_dung = ?`,
        [maNguoiDung],
      );
      await connection.query(
        `
        INSERT INTO vi_blockchain (dia_chi_vi, ma_nguoi_dung, trang_thai, trang_thai_duyet, thoi_diem_duyet)
        VALUES (?, ?, 1, ?, IF(? = 'DA_DUYET', NOW(), NULL))
        `,
        [diaChi, maNguoiDung, duyet, duyet],
      );
      return duyet;
    });

    return res.json({
      success: true,
      message:
        trangThai === "DA_DUYET"
          ? "Đã liên kết ví"
          : "Đã liên kết ví, vui lòng chờ quản trị viên duyệt vai trò trên blockchain",
      data: { dia_chi_vi: getAddress(diaChi), trang_thai_duyet: trangThai },
    });
  } catch (err) {
    return sendError(res, err, "Không thể liên kết ví");
  }
};

/* ======================= Quản trị viên duyệt ví ======================= */

const danhSachViChoDuyet = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT v.dia_chi_vi, v.ma_nguoi_dung, v.trang_thai_duyet, nd.ho_ten, nd.vai_tro
      FROM vi_blockchain v
      JOIN nguoi_dung nd ON nd.ma_nguoi_dung = v.ma_nguoi_dung
      WHERE v.trang_thai_duyet = 'CHO_DUYET'
      ORDER BY v.thoi_diem_dang_ky
      `,
    );
    return res.json({
      success: true,
      data: rows.map((r) => ({
        ...r,
        dia_chi_vi: getAddress(r.dia_chi_vi),
        vai_tro_on_chain: VAI_TRO_ON_CHAIN[r.vai_tro] || null,
      })),
    });
  } catch (err) {
    return sendError(res, err, "Không thể lấy danh sách ví chờ duyệt");
  }
};

// Sau khi admin ký setRole bằng ví của mình, server kiểm tra lại trực tiếp trên chain rồi mới đánh dấu đã duyệt
const duyetVi = async (req, res) => {
  try {
    const diaChi = chuanHoaDiaChi(req.params.diaChi);
    const [rows] = await db.query(
      `
      SELECT v.dia_chi_vi, nd.vai_tro
      FROM vi_blockchain v JOIN nguoi_dung nd ON nd.ma_nguoi_dung = v.ma_nguoi_dung
      WHERE v.dia_chi_vi = ? LIMIT 1
      `,
      [diaChi],
    );
    if (rows.length === 0) throw new ApiError(404, "Không tìm thấy ví");

    const vaiTroMongDoi = VAI_TRO_ON_CHAIN[rows[0].vai_tro];
    if (!vaiTroMongDoi)
      throw new ApiError(
        400,
        "Vai trò của tài khoản này không cần ví on-chain",
      );

    let vaiTroThucTe;
    try {
      vaiTroThucTe = await chain.vaiTroTrenChain(diaChi);
    } catch (err) {
      console.error("Lỗi đọc vai trò on-chain:", err);
      throw new ApiError(502, "Không đọc được blockchain, thử lại sau");
    }
    if (vaiTroThucTe === null)
      throw new ApiError(503, "Chưa cấu hình contract blockchain trên server");
    if (vaiTroThucTe !== vaiTroMongDoi) {
      throw new ApiError(
        409,
        "Trên blockchain, ví này chưa được gán đúng vai trò (hãy ký setRole trước)",
      );
    }

    const txHash =
      typeof req.body?.txHash === "string" &&
      /^0x[0-9a-fA-F]{64}$/.test(req.body.txHash)
        ? req.body.txHash.toLowerCase()
        : null;
    await db.query(
      `UPDATE vi_blockchain SET trang_thai_duyet = 'DA_DUYET', tx_gan_vai_tro = ?, thoi_diem_duyet = NOW() WHERE dia_chi_vi = ?`,
      [txHash, diaChi],
    );
    return res.json({ success: true, message: "Đã duyệt ví" });
  } catch (err) {
    return sendError(res, err, "Không thể duyệt ví");
  }
};

const tuChoiVi = async (req, res) => {
  try {
    const diaChi = chuanHoaDiaChi(req.params.diaChi);
    const [result] = await db.query(
      `UPDATE vi_blockchain SET trang_thai_duyet = 'TU_CHOI' WHERE dia_chi_vi = ? AND trang_thai_duyet = 'CHO_DUYET'`,
      [diaChi],
    );
    if (result.affectedRows === 0)
      throw new ApiError(404, "Không có ví nào đang chờ duyệt với địa chỉ này");
    return res.json({ success: true, message: "Đã từ chối ví" });
  } catch (err) {
    return sendError(res, err, "Không thể từ chối ví");
  }
};

/* ======================= Danh sách sự kiện chờ ký ======================= */

const layViDaDuyet = async (maNguoiDungs) => {
  if (maNguoiDungs.length === 0) return new Map();
  const [rows] = await db.query(
    `
    SELECT ma_nguoi_dung, dia_chi_vi
    FROM vi_blockchain
    WHERE ma_nguoi_dung IN (?) AND trang_thai = 1 AND trang_thai_duyet = 'DA_DUYET'
    `,
    [maNguoiDungs],
  );
  return new Map(rows.map((r) => [r.ma_nguoi_dung, getAddress(r.dia_chi_vi)]));
};

// Dựng tham số gọi hàm contract cho một sự kiện. Trả { args } hoặc { thieuVi: [...] }.
const dungThamSoGoiHam = (o, viCua) => {
  const {
    batch_id: batchId,
    prev_hash: prev,
    event_hash: ev,
    loai_ma: loaiMa,
    tham_so: ts = {},
  } = o;
  switch (o.ham) {
    case "harvest":
      return { args: [batchId, ev] };
    case "certify":
      return { args: [batchId, loaiMa, ts.het_han || 0, prev, ev] };
    case "orderTransport": {
      const thieuVi = [];
      const vanChuyen = viCua.get(ts.ma_don_vi_van_chuyen);
      if (!vanChuyen) thieuVi.push(ts.ma_don_vi_van_chuyen);
      let benNhan = ZeroAddress;
      if (ts.ma_ben_nhan) {
        benNhan = viCua.get(ts.ma_ben_nhan);
        if (!benNhan) thieuVi.push(ts.ma_ben_nhan);
      }
      if (thieuVi.length > 0) return { thieuVi };
      return { args: [batchId, vanChuyen, benNhan, prev, ev] };
    }
    case "pickup":
    case "arrive":
    case "confirmReceive":
    case "rejectHandover":
      return { args: [batchId, prev, ev] };
    case "createChild":
      return {
        args: [
          batchId,
          (ts.ma_lo_nguon || []).map(batchIdCuaLo),
          ts.hash_lo_nguon || [],
          ev,
        ],
      };
    case "step":
      return { args: [batchId, loaiMa, prev, ev] };
    default:
      return { args: null };
  }
};

const choKy = async (req, res) => {
  try {
    const maNguoiDung = req.user.ma_nguoi_dung;
    const [rows] = await db.query(
      `
      SELECT ls.ma_lich_su, ls.ma_lo_nong_san, ls.so_thu_tu_su_kien, ls.loai_hoat_dong,
             ls.blockchain_sync_status, ls.thoi_diem_xay_ra, o.payload
      FROM lich_su_truy_xuat_lo ls
      JOIN blockchain_outbox o ON o.event_id = ls.ma_lich_su
      WHERE ls.ma_nguoi_dung = ? AND ls.blockchain_sync_status <> 'CONFIRMED'
      ORDER BY ls.thoi_diem_xay_ra, ls.so_thu_tu_su_kien
      LIMIT 200
      `,
      [maNguoiDung],
    );

    const items = rows.map((r) => ({
      ...r,
      outbox: docJson(r.payload),
    }));

    // Sự kiện chưa xác nhận nhỏ nhất của từng lô liên quan (lô của sự kiện + các lô nguồn)
    const cacLo = new Set();
    const cacNguoi = new Set();
    for (const it of items) {
      cacLo.add(it.ma_lo_nong_san);
      (it.outbox.tham_so?.ma_lo_nguon || []).forEach((l) => cacLo.add(l));
      if (it.outbox.tham_so?.ma_don_vi_van_chuyen)
        cacNguoi.add(it.outbox.tham_so.ma_don_vi_van_chuyen);
      if (it.outbox.tham_so?.ma_ben_nhan)
        cacNguoi.add(it.outbox.tham_so.ma_ben_nhan);
    }
    cacNguoi.add(maNguoiDung);

    const minChuaXacNhan = new Map();
    if (cacLo.size > 0) {
      const [mins] = await db.query(
        `
        SELECT ma_lo_nong_san, MIN(so_thu_tu_su_kien) AS min_stt
        FROM lich_su_truy_xuat_lo
        WHERE blockchain_sync_status <> 'CONFIRMED' AND ma_lo_nong_san IN (?)
        GROUP BY ma_lo_nong_san
        `,
        [[...cacLo]],
      );
      mins.forEach((m) =>
        minChuaXacNhan.set(m.ma_lo_nong_san, Number(m.min_stt)),
      );
    }

    const viCua = await layViDaDuyet([...cacNguoi]);
    const viCuaToiAddr = viCua.get(maNguoiDung) || null;

    const data = items.map((it) => {
      const stt = Number(it.so_thu_tu_su_kien);
      let lyDo = null;

      if (!viCuaToiAddr) lyDo = "Bạn chưa có ví được duyệt";
      else if (minChuaXacNhan.get(it.ma_lo_nong_san) !== stt)
        lyDo = "Đang chờ sự kiện trước của lô được ký";

      const ts = it.outbox.tham_so || {};
      if (!lyDo && it.outbox.ham === "createChild") {
        const seqs = ts.seq_lo_nguon || [];
        (ts.ma_lo_nguon || []).forEach((lo, i) => {
          const min = minChuaXacNhan.get(lo);
          if (min !== undefined && min <= seqs[i])
            lyDo = `Đang chờ lô nguồn ${lo} được ký xong`;
        });
      }

      const dung = dungThamSoGoiHam(it.outbox, viCua);
      if (!lyDo && dung.thieuVi) {
        lyDo = `Chờ ${dung.thieuVi.join(", ")} liên kết và được duyệt ví`;
      }

      return {
        ma_lich_su: it.ma_lich_su,
        ma_lo: it.ma_lo_nong_san,
        stt,
        loai: it.loai_hoat_dong,
        thoi_diem: it.thoi_diem_xay_ra,
        trang_thai: it.blockchain_sync_status,
        san_sang: !lyDo,
        ly_do: lyDo,
        ham: it.outbox.ham,
        args: lyDo ? null : dung.args,
      };
    });

    return res.json({
      success: true,
      data: { vi: viCuaToiAddr, su_kien: data },
    });
  } catch (err) {
    return sendError(res, err, "Không thể lấy danh sách sự kiện chờ ký");
  }
};

/* ======================= Xác nhận giao dịch ======================= */

const capNhatTrangThaiLo = async (executor, maLo) => {
  const [r] = await executor.query(
    `SELECT COUNT(*) AS con FROM lich_su_truy_xuat_lo WHERE ma_lo_nong_san = ? AND blockchain_sync_status <> 'CONFIRMED'`,
    [maLo],
  );
  await executor.query(
    `UPDATE lo_nong_san SET blockchain_sync_status = ? WHERE ma_lo_nong_san = ?`,
    [Number(r[0].con) === 0 ? "CONFIRMED" : "QUEUED", maLo],
  );
};

const xacNhanSuKien = async (req, res) => {
  try {
    const { maLichSu } = req.params;
    const txHash = req.body?.txHash;
    if (typeof txHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
      throw new ApiError(400, "Mã giao dịch không hợp lệ");
    }

    const [rows] = await db.query(
      `
      SELECT ma_lich_su, ma_lo_nong_san, ma_nguoi_dung, ma_bam_su_kien_hien_tai, blockchain_sync_status
      FROM lich_su_truy_xuat_lo WHERE ma_lich_su = ? LIMIT 1
      `,
      [maLichSu],
    );
    const ev = rows[0];
    if (!ev || ev.ma_nguoi_dung !== req.user.ma_nguoi_dung) {
      throw new ApiError(404, "Không tìm thấy sự kiện cần ký của bạn");
    }
    if (ev.blockchain_sync_status === "CONFIRMED") {
      return res.json({
        success: true,
        message: "Sự kiện đã được xác nhận trước đó",
      });
    }

    const kq = await chain.kiemTraGiaoDichSuKien(txHash, {
      maLo: ev.ma_lo_nong_san,
      eventHash: ev.ma_bam_su_kien_hien_tai,
    });

    // Ví ký phải là ví đã được duyệt của chính người dùng này
    const [vi] = await db.query(
      `SELECT dia_chi_vi FROM vi_blockchain WHERE ma_nguoi_dung = ? AND trang_thai_duyet = 'DA_DUYET' LIMIT 1`,
      [req.user.ma_nguoi_dung],
    );
    if (vi.length === 0 || vi[0].dia_chi_vi.toLowerCase() !== kq.signer) {
      throw new ApiError(403, "Giao dịch không do ví đã duyệt của bạn ký");
    }

    await withTransaction(async (connection) => {
      await connection.query(
        `
        UPDATE lich_su_truy_xuat_lo
        SET blockchain_sync_status = 'CONFIRMED', ma_giao_dich_blockchain = ?, dia_chi_vi_ky = ?
        WHERE ma_lich_su = ?
        `,
        [txHash.toLowerCase(), kq.signer, maLichSu],
      );
      await connection.query(
        `
        UPDATE blockchain_outbox
        SET status = 'CONFIRMED', tx_hash = ?, submitted_at = COALESCE(submitted_at, NOW()), confirmed_at = NOW()
        WHERE event_id = ?
        `,
        [txHash.toLowerCase(), maLichSu],
      );
      await capNhatTrangThaiLo(connection, ev.ma_lo_nong_san);
    });

    return res.json({
      success: true,
      message: "Đã xác nhận sự kiện trên blockchain",
    });
  } catch (err) {
    return sendError(res, err, "Không thể xác nhận sự kiện");
  }
};

/* ======================= Xác thực (công khai cho người tiêu dùng) ======================= */

const xacThucLo = async (req, res) => {
  try {
    const maLo = String(req.params.maLo || "")
      .replace(/^#/, "")
      .trim();
    const [loRows] = await db.query(
      `SELECT ma_lo_nong_san, latest_event_sequence, latest_event_hash FROM lo_nong_san WHERE ma_lo_nong_san = ?`,
      [maLo],
    );
    if (loRows.length === 0) throw new ApiError(404, "Không tìm thấy lô hàng");
    const lo = loRows[0];

    const [events] = await db.query(
      `
      SELECT ls.so_thu_tu_su_kien, ls.loai_hoat_dong, ls.thoi_diem_xay_ra, ls.du_lieu_chi_tiet,
             ls.ma_bam_du_lieu, ls.ma_bam_su_kien_truoc, ls.ma_bam_su_kien_hien_tai,
             ls.ma_giao_dich_blockchain, ls.dia_chi_vi_ky, ls.blockchain_sync_status,
             nd.ho_ten, nd.vai_tro
      FROM lich_su_truy_xuat_lo ls
      JOIN nguoi_dung nd ON nd.ma_nguoi_dung = ls.ma_nguoi_dung
      WHERE ls.ma_lo_nong_san = ?
      ORDER BY ls.so_thu_tu_su_kien
      `,
      [maLo],
    );

    const cfg = chain.layCauHinh();
    let trangThai = "VERIFIED";
    const lyDo = [];
    const danger = (status, text) => {
      // mức nghiêm trọng: BROKEN_CHAIN > MISMATCH > INCOMPLETE > VERIFIED
      const bac = { VERIFIED: 0, INCOMPLETE: 1, MISMATCH: 2, BROKEN_CHAIN: 3 };
      if (bac[status] > bac[trangThai]) trangThai = status;
      lyDo.push(text);
    };

    if (events.length === 0) {
      return res.json({
        success: true,
        data: {
          trang_thai: "NOT_CHECKED",
          ly_do: [
            "Lô chưa có sự kiện truy xuất nào được ghi nhận lên blockchain",
          ],
          so_su_kien: 0,
          da_xac_nhan: 0,
          hash_moi_nhat: null,
          tren_chain: null,
          explorer_url: cfg.explorerUrl,
          contract_address: cfg.contractAddress,
          ten_mang: cfg.tenMang,
          chain_id: cfg.chainId,
          su_kien: [],
        },
      });
    }

    // 1. Chuỗi hash trong MySQL phải liền mạch và đúng nội dung
    let prev = ZERO_HASH;
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      const stt = i + 1;
      if (
        Number(e.so_thu_tu_su_kien) !== stt ||
        e.ma_bam_su_kien_truoc !== prev
      ) {
        danger("BROKEN_CHAIN", `Chuỗi sự kiện bị đứt tại bước ${stt}`);
        break;
      }
      let payload;
      try {
        payload = docJson(e.du_lieu_chi_tiet);
      } catch {
        danger("MISMATCH", `Nội dung sự kiện ${stt} không đọc được`);
        break;
      }
      const hashND = hashNoiDung(payload);
      if (
        hashND !== e.ma_bam_du_lieu ||
        hashSuKien(prev, hashND) !== e.ma_bam_su_kien_hien_tai
      ) {
        danger(
          "MISMATCH",
          `Nội dung sự kiện ${stt} (${e.loai_hoat_dong}) đã bị thay đổi sau khi ghi`,
        );
        break;
      }

      // Thu hoạch: snapshot mùa vụ và vật tư hiện tại phải trùng snapshot đã chốt
      if (
        e.loai_hoat_dong === "HARVEST_CONFIRMED" &&
        payload.du_lieu?.ma_mua_vu &&
        payload.du_lieu?.hash_ban_chup
      ) {
        const snap = await layBanChupMuaVu(db, payload.du_lieu.ma_mua_vu);
        if (!snap || snap.hash !== payload.du_lieu.hash_ban_chup) {
          danger(
            "MISMATCH",
            "Thông tin mùa vụ hoặc vật tư (phân bón, thuốc BVTV) đã bị thay đổi sau khi chốt thu hoạch",
          );
        }
      }

      // Kiểm định: chỉ số xét nghiệm hiện tại phải trùng chỉ số lúc công bố
      if (payload.du_lieu?.ma_kiem_dinh && payload.du_lieu?.hash_chi_so) {
        const chiSo = await layChiSoKiemDinh(db, payload.du_lieu.ma_kiem_dinh);
        if (hashNoiDung(chiSo) !== payload.du_lieu.hash_chi_so) {
          danger(
            "MISMATCH",
            "Chỉ số xét nghiệm của hồ sơ kiểm định đã bị thay đổi sau khi công bố",
          );
        }
      }

      // Lô con: hash lô nguồn đã cam kết phải đúng với chuỗi của lô nguồn
      if (e.loai_hoat_dong === "BATCH_RELATION") {
        for (const n of payload.du_lieu?.nguon || []) {
          const [src] = await db.query(
            `SELECT ma_bam_su_kien_hien_tai FROM lich_su_truy_xuat_lo WHERE ma_lo_nong_san = ? AND so_thu_tu_su_kien = ?`,
            [n.ma_lo, n.seq],
          );
          if (src.length === 0 || src[0].ma_bam_su_kien_hien_tai !== n.hash) {
            danger(
              "MISMATCH",
              `Lô nguồn ${n.ma_lo} không khớp với cam kết khi tạo lô`,
            );
          }
        }
      }
      prev = e.ma_bam_su_kien_hien_tai;
    }
    if (
      events.length > 0 &&
      lo.latest_event_hash !== events[events.length - 1].ma_bam_su_kien_hien_tai
    ) {
      danger("BROKEN_CHAIN", "Hash mới nhất của lô không khớp lịch sử sự kiện");
    }

    // 2. Đối chiếu với blockchain
    let tren = null;
    if (
      events.length > 0 &&
      trangThai !== "BROKEN_CHAIN" &&
      trangThai !== "MISMATCH"
    ) {
      if (!cfg.daCauHinh) {
        danger("INCOMPLETE", "Server chưa cấu hình contract blockchain");
      } else {
        try {
          tren = await chain.layTrangThaiLoTrenChain(maLo);
        } catch (err) {
          console.error("Lỗi đọc blockchain:", err);
          danger(
            "INCOMPLETE",
            "Không đọc được blockchain lúc này, hãy thử lại sau",
          );
        }
        if (tren) {
          if (!tren.tonTai) {
            danger(
              "INCOMPLETE",
              "Chưa có sự kiện nào của lô được ký lên blockchain",
            );
          } else {
            const idx = events.findIndex(
              (e) => e.ma_bam_su_kien_hien_tai === tren.lastHash,
            );
            if (idx === -1) {
              danger(
                "MISMATCH",
                "Hash trên blockchain không khớp bất kỳ sự kiện nào trong hệ thống",
              );
            } else if (idx < events.length - 1) {
              danger(
                "INCOMPLETE",
                `Mới có ${idx + 1}/${events.length} sự kiện được ký lên blockchain`,
              );
            }
          }
        }
      }
    }

    await db.query(
      `UPDATE lo_nong_san SET integrity_status = ? WHERE ma_lo_nong_san = ?`,
      [trangThai, maLo],
    );

    return res.json({
      success: true,
      data: {
        trang_thai: trangThai,
        ly_do: lyDo,
        so_su_kien: events.length,
        da_xac_nhan: events.filter(
          (e) => e.blockchain_sync_status === "CONFIRMED",
        ).length,
        hash_moi_nhat: lo.latest_event_hash,
        tren_chain: tren,
        explorer_url: cfg.explorerUrl,
        contract_address: cfg.contractAddress,
        ten_mang: cfg.tenMang,
        chain_id: cfg.chainId,
        su_kien: events.map((e) => ({
          stt: Number(e.so_thu_tu_su_kien),
          loai: e.loai_hoat_dong,
          thoi_diem: e.thoi_diem_xay_ra,
          nguoi_ky: e.ho_ten,
          vai_tro: e.vai_tro,
          dia_chi_vi_ky: e.dia_chi_vi_ky ? getAddress(e.dia_chi_vi_ky) : null,
          tx_hash: e.ma_giao_dich_blockchain,
          trang_thai: e.blockchain_sync_status,
        })),
      },
    });
  } catch (err) {
    return sendError(res, err, "Không thể xác thực lô hàng");
  }
};

module.exports = {
  layCauHinhCongKhai,
  viCuaToi,
  taoNonce,
  lienKetVi,
  danhSachViChoDuyet,
  duyetVi,
  tuChoiVi,
  choKy,
  xacNhanSuKien,
  xacThucLo,
};
