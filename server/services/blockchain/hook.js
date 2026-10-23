const { ghiSuKien, layChiSoKiemDinh } = require("./traceEvent");
const { hashNoiDung } = require("./canonical");

// Các hàm ghi sự kiện cho từng nghiệp vụ, để controller chỉ cần gọi một dòng.

// Đổi ngày hết hạn (YYYY-MM-DD) thành mốc unix giây cuối ngày theo giờ Việt Nam.
// Backend coi chứng nhận còn hiệu lực đến hết ngày hieu_luc_den.
const hanChungNhanUnix = (ngay) => {
  if (!ngay) return 0;
  const ms = Date.parse(`${ngay}T23:59:59+07:00`);
  return Number.isNaN(ms) ? 0 : Math.floor(ms / 1000);
};

const LOAI_SAU_LENH = [
  "PICKUP_CONFIRMED",
  "DELIVERY_CONFIRMED",
  "STOCK_IN_CONFIRMED",
  "HANDOVER_REJECTED",
];

// Sự kiện của một lệnh vận chuyển (lenh_van_chuyen). Gọi bên trong transaction của controller.
const ghiSuKienVanDon = async (
  executor,
  maVanDon,
  loai,
  maNguoiKy,
  duLieuThem = {},
) => {
  const [rows] = await executor.query(
    `
    SELECT ma_van_don, ma_lo_nong_san, ma_nguoi_gui, ma_don_vi_van_chuyen, ma_ben_nhan,
           CAST(khoi_luong AS CHAR) AS khoi_luong, don_vi_tinh, ten_tai_xe, bien_so_xe
    FROM lenh_van_chuyen
    WHERE ma_van_don = ?
    LIMIT 1
    `,
    [maVanDon],
  );
  if (rows.length === 0)
    throw new Error(`Không tìm thấy lệnh vận chuyển ${maVanDon}`);
  const v = rows[0];

  const duLieu = {
    ma_van_don: v.ma_van_don,
    ma_nguoi_gui: v.ma_nguoi_gui,
    ma_don_vi_van_chuyen: v.ma_don_vi_van_chuyen,
    ma_ben_nhan: v.ma_ben_nhan,
    khoi_luong: v.khoi_luong,
    don_vi_tinh: v.don_vi_tinh,
    ten_tai_xe: v.ten_tai_xe,
    bien_so_xe: v.bien_so_xe,
    ...duLieuThem,
  };
  const thamSoLenh = {
    ma_van_don: v.ma_van_don,
    ma_don_vi_van_chuyen: v.ma_don_vi_van_chuyen,
    ma_ben_nhan: v.ma_ben_nhan || null,
  };

  // Lệnh tạo trước khi bật blockchain: bổ sung sự kiện "tạo lệnh" do người gửi ký để chuỗi đủ bước
  if (LOAI_SAU_LENH.includes(loai)) {
    const [daCo] = await executor.query(
      `
      SELECT 1 FROM lich_su_truy_xuat_lo
      WHERE ma_lo_nong_san = ? AND loai_hoat_dong = 'TRANSPORT_ORDERED'
        AND JSON_UNQUOTE(JSON_EXTRACT(du_lieu_chi_tiet, '$.du_lieu.ma_van_don')) = ?
      LIMIT 1
      `,
      [v.ma_lo_nong_san, v.ma_van_don],
    );
    if (daCo.length === 0) {
      const goc = await ghiSuKien(executor, {
        maLo: v.ma_lo_nong_san,
        loai: "TRANSPORT_ORDERED",
        maNguoiKy: v.ma_nguoi_gui,
        duLieu,
        thamSo: thamSoLenh,
      });
      if (!goc) return null; // lô cũ không được theo dõi
    }
  }

  return ghiSuKien(executor, {
    maLo: v.ma_lo_nong_san,
    loai,
    maNguoiKy,
    duLieu,
    thamSo: loai === "TRANSPORT_ORDERED" ? thamSoLenh : {},
  });
};

// Sự kiện kiểm định. Các controller kiểm định không dùng transaction nên hàm này tự mở transaction riêng
// và KHÔNG ném lỗi: nghiệp vụ kiểm định đã hoàn tất, việc ghi hàng chờ blockchain lỗi chỉ được ghi log.
const ghiSuKienKiemDinh = async (db, maKiemDinh, loai) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `
      SELECT ma_kiem_dinh, ma_ho_so, ma_lo_nong_san, ma_co_quan, tieu_chuan_dang_ky, so_chung_nhan,
             ket_luan, DATE_FORMAT(hieu_luc_tu, '%Y-%m-%d') AS hieu_luc_tu,
             DATE_FORMAT(hieu_luc_den, '%Y-%m-%d') AS hieu_luc_den,
             ma_niem_phong, khoi_luong_mau,
             DATE_FORMAT(thoi_gian_lay_mau, '%Y-%m-%d %H:%i:%s') AS thoi_gian_lay_mau,
             ly_do_thu_hoi
      FROM kiem_dinh_lo_hang
      WHERE ma_kiem_dinh = ?
      LIMIT 1
      `,
      [maKiemDinh],
    );
    if (rows.length === 0) {
      await connection.rollback();
      return null;
    }
    const kd = rows[0];

    const duLieu = {
      ma_kiem_dinh: kd.ma_kiem_dinh,
      ma_ho_so: kd.ma_ho_so,
      tieu_chuan_dang_ky: kd.tieu_chuan_dang_ky,
      ma_niem_phong: kd.ma_niem_phong,
      khoi_luong_mau: kd.khoi_luong_mau,
      thoi_gian_lay_mau: kd.thoi_gian_lay_mau,
    };
    if (loai !== "SAMPLING_SEALED") {
      const chiSo = await layChiSoKiemDinh(connection, maKiemDinh);
      Object.assign(duLieu, {
        so_chung_nhan: kd.so_chung_nhan,
        ket_luan: kd.ket_luan,
        hieu_luc_tu: kd.hieu_luc_tu,
        hieu_luc_den: kd.hieu_luc_den,
        ly_do_thu_hoi: kd.ly_do_thu_hoi,
        chi_so: chiSo,
        hash_chi_so: hashNoiDung(chiSo),
      });
    }

    const ketQua = await ghiSuKien(connection, {
      maLo: kd.ma_lo_nong_san,
      loai,
      maNguoiKy: kd.ma_co_quan,
      duLieu,
      thamSo:
        loai === "CERTIFICATE_ISSUED"
          ? { het_han: hanChungNhanUnix(kd.hieu_luc_den) }
          : {},
    });

    await connection.commit();
    return ketQua;
  } catch (err) {
    if (connection) await connection.rollback().catch(() => {});
    console.error(
      `Không ghi được sự kiện ${loai} của hồ sơ ${maKiemDinh} vào hàng chờ blockchain:`,
      err,
    );
    return null;
  } finally {
    if (connection) connection.release();
  }
};

module.exports = { ghiSuKienVanDon, ghiSuKienKiemDinh, hanChungNhanUnix };
