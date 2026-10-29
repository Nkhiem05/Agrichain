// Chẩn đoán các sự kiện chưa ký xong: so sánh database với blockchain. Mặc định chỉ đọc, không sửa gì.
//   --dong-bo       đánh dấu "đã xác nhận" cho các sự kiện thực sự đã có trên chain
//   --sua-trung-ma  hồ sơ kiểm định có mã đã bị lô khác dùng trên chain: đặt cho hồ sơ một certId riêng (chưa dùng)
//                   để ký được; chỉ áp dụng cho hồ sơ mà bước niêm phong CHƯA lên chain
//   Chạy ở thư mục gốc dự án:  node chan-doan-ky.js
require("dotenv").config();
const db = require("./server/config/db");
const chain = require("./server/services/blockchain/chainClient");
const {
  certIdCuaHoSo,
  certIdMoiCuaHoSo,
} = require("./server/services/blockchain/canonical");
const { ghiNhanDaXacNhan } = require("./server/services/blockchain/ghiNhan");

const DONG_BO = process.argv.includes("--dong-bo");
const SUA_TRUNG_MA = process.argv.includes("--sua-trung-ma");

(async () => {
  const c = chain.layContract();
  if (!c)
    throw new Error("Chưa cấu hình blockchain (BLOCKCHAIN_CONTRACT_ADDRESS)");
  console.log(
    "Hợp đồng:",
    c.contract.target ?? "",
    "| không gian tên:",
    process.env.BLOCKCHAIN_NAMESPACE || "(trống)",
  );

  const [rows] = await db.query(
    `
    SELECT ls.ma_lich_su, ls.ma_lo_nong_san, ls.so_thu_tu_su_kien, ls.loai_hoat_dong,
           ls.blockchain_sync_status, ls.ma_bam_su_kien_hien_tai, o.payload
    FROM lich_su_truy_xuat_lo ls
    JOIN blockchain_outbox o ON o.event_id = ls.ma_lich_su
    WHERE ls.blockchain_sync_status <> 'CONFIRMED'
    ORDER BY ls.ma_lo_nong_san, ls.so_thu_tu_su_kien
    `,
  );
  if (rows.length === 0) console.log("Không có sự kiện nào đang chờ ký.");

  const cache = new Map(); // mã lô -> { tren chain, các hash của lô trong database }
  const lay = async (maLo) => {
    if (!cache.has(maLo)) {
      const tren = await chain.layTrangThaiLoTrenChain(maLo);
      const [ev] = await db.query(
        `SELECT so_thu_tu_su_kien AS stt, ma_bam_su_kien_hien_tai AS hash FROM lich_su_truy_xuat_lo WHERE ma_lo_nong_san = ? ORDER BY so_thu_tu_su_kien`,
        [maLo],
      );
      cache.set(maLo, { tren, ev });
    }
    return cache.get(maLo);
  };

  const ketLuan = { sanSang: 0, daCoTrenChain: 0, trungMa: 0 };
  for (const r of rows) {
    const o = typeof r.payload === "string" ? JSON.parse(r.payload) : r.payload;
    const { tren, ev } = await lay(r.ma_lo_nong_san);
    const stt = Number(r.so_thu_tu_su_kien);
    const idxChain = tren?.tonTai
      ? ev.findIndex((e) => e.hash === tren.lastHash)
      : -1;
    const maKD = o.tham_so?.ma_kiem_dinh;
    let cert = null;
    if (maKD) {
      const x = await c.contract.certs(
        o.tham_so.cert_id || certIdCuaHoSo(maKD),
      );
      cert = { tonTai: x.exists, lo: x.batchId };
    }
    const batchIdLo = o.batch_id;

    let kq;
    if (idxChain >= 0 && ev[idxChain].stt >= stt) {
      kq = `ĐÃ CÓ TRÊN CHAIN (hash lô trên chain đã tới sự kiện #${ev[idxChain].stt}) -> chỉ là database chưa biết`;
      ketLuan.daCoTrenChain++;
      if (DONG_BO) {
        const conn = await db.getConnection();
        try {
          await ghiNhanDaXacNhan(conn, {
            maLichSu: r.ma_lich_su,
            maLo: r.ma_lo_nong_san,
            ghiChu: "Chẩn đoán: sự kiện đã có trên chain",
          });
          kq += "  [đã đánh dấu xác nhận]";
        } finally {
          conn.release();
        }
      }
    } else if (o.ham === "harvest" && tren?.tonTai) {
      kq = `TRÙNG MÃ LÔ: lô ${r.ma_lo_nong_san} đã có trên chain (chủ ${tren.chuLo}) nhưng KHÁC dữ liệu trong database`;
      ketLuan.trungMa++;
    } else if (
      cert?.tonTai &&
      o.loai === "SAMPLING_SEALED" &&
      cert.lo.toLowerCase() !== String(batchIdLo).toLowerCase()
    ) {
      kq = `TRÙNG MÃ HỒ SƠ: ${maKD} đã được dùng trên chain cho lô khác`;
      ketLuan.trungMa++;
      if (SUA_TRUNG_MA) {
        let lanThu = 0;
        let certMoi = certIdMoiCuaHoSo(maKD, r.ma_lo_nong_san, lanThu);
        while ((await c.contract.certs(certMoi)).exists && lanThu < 50) {
          lanThu++;
          certMoi = certIdMoiCuaHoSo(maKD, r.ma_lo_nong_san, lanThu);
        }
        const [kqSua] = await db.query(
          `
          UPDATE blockchain_outbox o
          JOIN lich_su_truy_xuat_lo ls ON ls.ma_lich_su = o.event_id
          SET o.payload = JSON_SET(o.payload, '$.tham_so.cert_id', ?)
          WHERE ls.blockchain_sync_status <> 'CONFIRMED'
            AND JSON_UNQUOTE(JSON_EXTRACT(ls.du_lieu_chi_tiet, '$.du_lieu.ma_kiem_dinh')) = ?
          `,
          [certMoi, maKD],
        );
        kq += `  [đã đặt certId riêng cho ${kqSua.affectedRows} sự kiện của hồ sơ này]`;
      }
    } else if (cert?.tonTai && o.loai === "SAMPLING_SEALED") {
      kq = `Hồ sơ ${maKD} đã được niêm phong trên chain cho đúng lô này, nhưng hash lô trên chain chưa khớp sự kiện -> kiểm tra thủ công`;
      ketLuan.trungMa++;
    } else {
      kq = "CHƯA có trên chain -> ký được (nếu các sự kiện trước của lô đã ký)";
      ketLuan.sanSang++;
    }
    console.log(
      `${r.ma_lo_nong_san} #${stt} ${r.loai_hoat_dong}${maKD ? " (" + maKD + ")" : ""} [${r.blockchain_sync_status}]\n   -> ${kq}`,
    );
  }
  console.log("\nTổng kết:", ketLuan);
  process.exit(0);
})().catch((e) => {
  console.error("Lỗi:", e.message);
  process.exit(1);
});
