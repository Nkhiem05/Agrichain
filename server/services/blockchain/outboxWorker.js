const db = require("../../config/db");
const chain = require("./chainClient");
const { ghiNhanDaXacNhan, traVeHangCho } = require("./ghiNhan");

// OUTBOX WORKER: chạy nền trong server, KHÔNG giữ khóa bí mật và KHÔNG tự ký.
// Người dùng vẫn ký bằng MetaMask; worker chỉ làm phần việc sau khi ký:
//   1. Theo dõi giao dịch đã gửi (SUBMITTED): vào khối thành công -> CONFIRMED;
//      thất bại / quá hạn không thấy trên chain -> trả về hàng chờ (QUEUED) kèm lý do để ký lại.
//   2. Đối soát (QUEUED): sự kiện đã có trên chain mà server chưa biết (ví dụ trình duyệt đóng
//      trước khi kịp báo về) -> CONFIRMED, để các bước sau của lô không bị kẹt.
// Bật / tắt và chu kỳ chỉnh trong .env (không bắt buộc): BLOCKCHAIN_WORKER=0 để tắt,
// BLOCKCHAIN_WORKER_GIAY (mặc định 15), BLOCKCHAIN_WORKER_HET_HAN_PHUT (30), BLOCKCHAIN_WORKER_DOI_SOAT_GIAY (120).

const CHU_KY_GIAY = Math.max(5, Number(process.env.BLOCKCHAIN_WORKER_GIAY) || 15);
const HET_HAN_PHUT = Math.max(5, Number(process.env.BLOCKCHAIN_WORKER_HET_HAN_PHUT) || 30);
const SO_KHOI_TIM_LOG = Math.max(10, Number(process.env.BLOCKCHAIN_WORKER_SO_KHOI) || 100);
// mỗi lô đang chờ ký chỉ đọc chain tối đa 1 lần / 120 giây (đỡ tốn lượt gọi RPC)
const GIAN_CACH_DOI_SOAT_GIAY = Math.max(5, Number(process.env.BLOCKCHAIN_WORKER_DOI_SOAT_GIAY) || 120);
const MOI_LAN = 30;

const trangThai = {
  dangBat: false,
  dangChay: false,
  chuKyGiay: CHU_KY_GIAY,
  lanChayCuoi: null,
  ketQuaCuoi: null,
  loiCuoi: null,
};
let hen = null;

const rutGonTx = (h) => (h ? `${h.slice(0, 10)}...` : "");

const trongGiaoDich = async (fn) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const kq = await fn(conn);
    await conn.commit();
    return kq;
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
};

// 1. Giao dịch đã gửi: chờ biên lai
const xuLyDaGui = async (kq) => {
  const [rows] = await db.query(
    `
    SELECT o.event_id, o.tx_hash, o.retry_count,
           TIMESTAMPDIFF(MINUTE, o.submitted_at, NOW()) AS so_phut,
           ls.ma_lo_nong_san, ls.ma_nguoi_dung, ls.ma_bam_su_kien_hien_tai
    FROM blockchain_outbox o
    JOIN lich_su_truy_xuat_lo ls ON ls.ma_lich_su = o.event_id
    WHERE o.status = 'SUBMITTED' AND o.tx_hash IS NOT NULL
      AND (o.next_retry_at IS NULL OR o.next_retry_at <= NOW())
    ORDER BY o.submitted_at
    LIMIT ?
    `,
    [MOI_LAN],
  );

  for (const r of rows) {
    const bienLai = await chain.docBienLai(r.tx_hash);

    if (!bienLai) {
      if (Number(r.so_phut) >= HET_HAN_PHUT) {
        await trongGiaoDich((conn) =>
          traVeHangCho(conn, {
            maLichSu: r.event_id,
            lyDo: `Giao dịch ${rutGonTx(r.tx_hash)} không xuất hiện trên blockchain sau ${HET_HAN_PHUT} phút (có thể đã bị hủy trong MetaMask). Cần ký lại.`,
          }),
        );
        kq.traVe++;
      } else {
        // chưa vào khối: hẹn kiểm tra lại, giãn dần (15s, 30s, 60s ... tối đa 5 phút)
        const giay = Math.min(300, CHU_KY_GIAY * 2 ** Math.min(Number(r.retry_count), 5));
        await db.query(
          `UPDATE blockchain_outbox SET retry_count = retry_count + 1, next_retry_at = DATE_ADD(NOW(), INTERVAL ? SECOND) WHERE event_id = ?`,
          [giay, r.event_id],
        );
        kq.choKhoi++;
      }
      continue;
    }

    if (bienLai.status !== 1) {
      await trongGiaoDich((conn) =>
        traVeHangCho(conn, {
          maLichSu: r.event_id,
          lyDo: `Giao dịch ${rutGonTx(r.tx_hash)} thất bại trên blockchain (hợp đồng từ chối). Cần ký lại.`,
        }),
      );
      kq.traVe++;
      continue;
    }

    // Vào khối thành công: phải đúng sự kiện này và do ví đã duyệt của người ký
    let xn;
    try {
      xn = await chain.kiemTraGiaoDichSuKien(r.tx_hash, {
        maLo: r.ma_lo_nong_san,
        eventHash: r.ma_bam_su_kien_hien_tai,
      });
    } catch (err) {
      await trongGiaoDich((conn) =>
        traVeHangCho(conn, {
          maLichSu: r.event_id,
          lyDo: `Giao dịch ${rutGonTx(r.tx_hash)} không ghi sự kiện này (${err.message}). Cần ký lại.`,
        }),
      );
      kq.traVe++;
      continue;
    }
    const [vi] = await db.query(
      `SELECT dia_chi_vi FROM vi_blockchain WHERE ma_nguoi_dung = ? AND trang_thai_duyet = 'DA_DUYET' LIMIT 1`,
      [r.ma_nguoi_dung],
    );
    const dungVi = vi.length > 0 && vi[0].dia_chi_vi.toLowerCase() === xn.signer;
    await trongGiaoDich((conn) =>
      ghiNhanDaXacNhan(conn, {
        maLichSu: r.event_id,
        maLo: r.ma_lo_nong_san,
        txHash: r.tx_hash,
        signer: xn.signer,
        soBlock: xn.blockNumber,
        ghiChu: dungVi ? null : "Người ký trên chain không phải ví đã duyệt hiện tại của tài khoản này",
      }),
    );
    kq.xacNhan++;
  }
};

// 2. Đối soát: sự kiện còn chờ nhưng hash trên chain đã đi tới (hoặc vượt qua) nó
const doiSoatHangCho = async (kq) => {
  const [los] = await db.query(
    `
    SELECT DISTINCT ls.ma_lo_nong_san
    FROM blockchain_outbox o
    JOIN lich_su_truy_xuat_lo ls ON ls.ma_lich_su = o.event_id
    WHERE o.status = 'QUEUED' AND (o.next_retry_at IS NULL OR o.next_retry_at <= NOW())
    LIMIT ?
    `,
    [MOI_LAN],
  );

  for (const { ma_lo_nong_san: maLo } of los) {
    const tren = await chain.layTrangThaiLoTrenChain(maLo);
    const [events] = await db.query(
      `
      SELECT ma_lich_su, so_thu_tu_su_kien, ma_bam_su_kien_hien_tai, blockchain_sync_status
      FROM lich_su_truy_xuat_lo
      WHERE ma_lo_nong_san = ?
      ORDER BY so_thu_tu_su_kien
      `,
      [maLo],
    );
    const idx = tren?.tonTai
      ? events.findIndex((e) => e.ma_bam_su_kien_hien_tai === tren.lastHash)
      : -1;
    const canXacNhan = idx >= 0 ? events.slice(0, idx + 1).filter((e) => e.blockchain_sync_status !== "CONFIRMED") : [];

    for (const e of canXacNhan) {
      let gd = null;
      try {
        gd = await chain.timGiaoDichSuKien(maLo, e.ma_bam_su_kien_hien_tai, SO_KHOI_TIM_LOG);
      } catch {
        gd = null; // RPC không cho quét log: vẫn xác nhận theo hash trên chain
      }
      await trongGiaoDich((conn) =>
        ghiNhanDaXacNhan(conn, {
          maLichSu: e.ma_lich_su,
          maLo,
          txHash: gd?.txHash || null,
          signer: gd?.signer || null,
          soBlock: gd?.soBlock || null,
          ghiChu: gd ? "Worker đối soát: sự kiện đã có trên chain" : "Worker đối soát: sự kiện đã có trên chain (không tìm lại được mã giao dịch)",
        }),
      );
      kq.doiSoat++;
    }

    // Chưa có gì mới: hẹn lần đọc chain sau cho các sự kiện còn chờ của lô này
    await db.query(
      `
      UPDATE blockchain_outbox o
      JOIN lich_su_truy_xuat_lo ls ON ls.ma_lich_su = o.event_id
      SET o.next_retry_at = DATE_ADD(NOW(), INTERVAL ? SECOND)
      WHERE ls.ma_lo_nong_san = ? AND o.status = 'QUEUED'
      `,
      [GIAN_CACH_DOI_SOAT_GIAY, maLo],
    );
  }
};

const chayMotLan = async () => {
  if (trangThai.dangChay) return trangThai.ketQuaCuoi;
  if (!chain.layCauHinh().daCauHinh) return null;
  trangThai.dangChay = true;
  const kq = { xacNhan: 0, choKhoi: 0, traVe: 0, doiSoat: 0 };
  try {
    await xuLyDaGui(kq);
    await doiSoatHangCho(kq);
    trangThai.loiCuoi = null;
    if (kq.xacNhan || kq.traVe || kq.doiSoat) {
      console.log(
        `[Outbox worker] xác nhận ${kq.xacNhan}, đối soát ${kq.doiSoat}, trả về hàng chờ ${kq.traVe}, chờ vào khối ${kq.choKhoi}`,
      );
    }
  } catch (err) {
    trangThai.loiCuoi = err.shortMessage || err.message;
    console.error("[Outbox worker] lỗi:", trangThai.loiCuoi);
  } finally {
    trangThai.dangChay = false;
    trangThai.lanChayCuoi = new Date();
    trangThai.ketQuaCuoi = kq;
  }
  return kq;
};

const batDau = () => {
  if (process.env.BLOCKCHAIN_WORKER === "0" || hen) return;
  trangThai.dangBat = true;
  hen = setInterval(chayMotLan, CHU_KY_GIAY * 1000);
  hen.unref?.();
  setTimeout(chayMotLan, 3000).unref?.();
  console.log(`[Outbox worker] chạy nền mỗi ${CHU_KY_GIAY} giây (không ký, chỉ theo dõi và đối soát)`);
};

const dung = () => {
  if (hen) clearInterval(hen);
  hen = null;
  trangThai.dangBat = false;
};

module.exports = { batDau, dung, chayMotLan, trangThai };
