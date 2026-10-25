const { hashNoiDung, canonicalJson } = require("./canonical");

// Bộ ngưỡng kiểm định đang áp dụng (bảng nguong_kiem_dinh_chuan, trang_thai = 1).
// Nội dung công khai nên không thêm salt: ai cũng tự băm lại được để đối chiếu với chain.
const layNoiDungNguong = async (executor) => {
  const [rows] = await executor.query(
    `
    SELECT ma_chi_so, ten_chi_tiet_chat, phuong_phap_thu, tieu_chuan_ap_dung, ma_san_pham,
           toan_tu_so_sanh, CAST(nguong_toi_da AS CHAR) AS nguong_toi_da, don_vi_tinh
    FROM nguong_kiem_dinh_chuan
    WHERE trang_thai = 1
    ORDER BY ma_chi_so, ten_chi_tiet_chat, tieu_chuan_ap_dung, ma_san_pham
    `,
  );
  return { v: 1, nguong: rows };
};

// Mã băm bộ ngưỡng hiện hành + phiên bản đã lưu (nếu có) trong bảng phien_ban_nguong
const phienBanNguongHienHanh = async (executor) => {
  const noiDung = await layNoiDungNguong(executor);
  const maBam = hashNoiDung(noiDung);
  const [rows] = await executor.query(
    `
    SELECT ma_phien_ban, ma_bam, ghi_chu, ma_giao_dich_blockchain, created_at
    FROM phien_ban_nguong
    WHERE ma_bam = ?
    LIMIT 1
    `,
    [maBam],
  );
  return {
    noiDung,
    noiDungJson: canonicalJson(noiDung),
    maBam,
    soChiTieu: noiDung.nguong.length,
    phienBan: rows[0] || null,
  };
};

module.exports = { layNoiDungNguong, phienBanNguongHienHanh };
