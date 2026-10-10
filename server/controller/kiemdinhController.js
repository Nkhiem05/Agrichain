const { Smartphone } = require("lucide-react");
const db = require("../config/db");
const { generateUniqueCode } = require("../utils/generateCode");

// Hàm duy nhất: Tải danh sách yêu cầu kiểm định
const taidlyeucaukiemdinh = async (req, res) => {
  try {
    const { ma_co_quan, tieu_chuan, trang_thai } = req.query;
    let sql = `
      SELECT 
        kd.ma_kiem_dinh,
        kd.ma_ho_so,
        kd.ma_lo_nong_san,
        kd.ma_co_quan,
        kd.tieu_chuan_dang_ky,
        kd.noi_dung_de_nghi,
        kd.trang_thai_ho_so,
        kd.created_at AS ngay_nop_don,
        lo.so_luong_hien_tai,
        lo.don_vi_tinh,
        sp.ten_san_pham,
        nt.ma_nong_trai,
        nt.ten_nong_trai,
        nt.dia_diem_nong_trai,
        td.ten_thua_dat,
        nd.ho_ten AS ten_chu_vuon,
        nd.so_dien_thoai AS sdt_chu_vuon
      FROM kiem_dinh_lo_hang kd
      INNER JOIN lo_nong_san lo ON kd.ma_lo_nong_san = lo.ma_lo_nong_san
      INNER JOIN san_pham_nong_san sp ON lo.ma_san_pham = sp.ma_san_pham
      LEFT JOIN mua_vu mv ON lo.ma_mua_vu = mv.ma_mua_vu
      LEFT JOIN nong_trai nt ON mv.ma_nong_trai = nt.ma_nong_trai
      LEFT JOIN thua_dat td ON mv.ma_thua_dat = td.ma_thua_dat
      LEFT JOIN nguoi_dung nd ON lo.ma_nguoi_quan_ly = nd.ma_nguoi_dung
      WHERE 1=1
    `;

    const values = [];

    // Lọc theo mã cơ quan nếu có truyền vào
    if (ma_co_quan) {
      sql += ` AND kd.ma_co_quan = ?`;
      values.push(ma_co_quan);
    }

    // Lọc theo trạng thái hồ sơ (mặc định lấy CHO_TIEP_NHAN)
    if (trang_thai) {
      sql += ` AND kd.trang_thai_ho_so = ?`;
      values.push(trang_thai);
    } else {
      sql += ` AND kd.trang_thai_ho_so = 'CHO_TIEP_NHAN'`;
    }

    // Lọc theo tiêu chuẩn (VIETGAP, GLOBALGAP, ORGANIC)
    if (tieu_chuan) {
      sql += ` AND kd.tieu_chuan_dang_ky = ?`;
      values.push(tieu_chuan.toUpperCase());
    }

    sql += ` ORDER BY kd.created_at DESC`;

    const [rows] = await db.query(sql, values);

    return res.status(200).json({
      ok: true,
      message: "Lấy danh sách yêu cầu kiểm định thành công",
      data: rows,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách yêu cầu kiểm định:", error);
    return res.status(500).json({
      ok: false,
      message: "Lỗi máy chủ nội bộ",
    });
  }
};

// chấp nhận yêu cầu kiểm định
const accepauthority = async (req, res) => {
  const { code } = req.query;
  const { status, day, time, inspector } = req.body;

  if (status) {
    const qrSealCode = await generateUniqueCode(
      db,
      "kiem_dinh_lo_hang",
      "ma_niem_phong",
      "QR-Seal-",
      10,
    );
    const sql = `UPDATE kiem_dinh_lo_hang SET trang_thai_ho_so=?, ngay_hen_lay_mau=?, gio_hen_lay_mau=?, kiem_dinh_vien=?, ma_niem_phong=? WHERE ma_kiem_dinh =?`;
    const [result] = await db.query(sql, [
      "DA_HEN_LICH",
      day,
      time,
      inspector,
      qrSealCode,
      code,
    ]);

    if (result.affectedRows > 0) {
      return res.status(200).json({
        message: "đã chấp nhận yêu cầu kiểm định",
        status: true,
      });
    } else {
      return res.status(404).json({ message: "đã có lỗi xảy ra" });
    }
  } else {
    const sql = `UPDATE kiem_dinh_lo_hang SET trang_thai_ho_so=? WHERE ma_kiem_dinh =?`;
    const [result] = await db.query(sql, ["TU_CHOI", code]);

    if (result.affectedRows > 0) {
      return res.status(200).json({
        message: "đã từ chối yêu cầu kiểm định",
        status: true,
      });
    } else {
      return res.status(404).json({ message: "đã có lỗi xảy ra" });
    }
  }
};

// Lấy các hồ sơ đã hẹn lịch hoặc đã lấy mẫu
const getSamplingScheduleList = async (req, res) => {
  try {
    const { ma_co_quan } = req.query;
    let sql = `
      SELECT 
        kd.ma_kiem_dinh,
        kd.ma_niem_phong,
        kd.ma_ho_so,
        kd.ma_lo_nong_san,
        kd.tieu_chuan_dang_ky,
        kd.ngay_hen_lay_mau,
        kd.gio_hen_lay_mau,
        kd.kiem_dinh_vien,
        kd.ma_niem_phong,
        kd.khoi_luong_mau,
        kd.phuong_phap_lay_mau,
        kd.tinh_trang_cam_quan,
        kd.thoi_gian_lay_mau,
        kd.trang_thai_ho_so,
        -- Thông tin sản phẩm & lô
        sp.ten_san_pham,
        lo.so_luong_hien_tai,
        lo.don_vi_tinh,
        -- Thông tin nông trại & chủ vườn
        nt.ten_nong_trai,
        nt.dia_diem_nong_trai,
        nd.ho_ten AS ten_chu_vuon,
        nd.so_dien_thoai AS sdt_chu_vuon
      FROM kiem_dinh_lo_hang kd
      JOIN lo_nong_san lo ON kd.ma_lo_nong_san = lo.ma_lo_nong_san
      JOIN san_pham_nong_san sp ON lo.ma_san_pham = sp.ma_san_pham
      LEFT JOIN mua_vu mv ON lo.ma_mua_vu = mv.ma_mua_vu
      LEFT JOIN nong_trai nt ON mv.ma_nong_trai = nt.ma_nong_trai
      LEFT JOIN nguoi_dung nd ON nt.ma_nguoi_dung = nd.ma_nguoi_dung
      WHERE kd.trang_thai_ho_so IN ('DA_HEN_LICH', 'DA_LAY_MAU')
    `;

    const params = [];
    if (ma_co_quan) {
      sql += ` AND kd.ma_co_quan = ?`;
      params.push(ma_co_quan);
    }

    sql += ` ORDER BY kd.ngay_hen_lay_mau ASC, kd.gio_hen_lay_mau ASC`;
    const [rows] = await db.query(sql, params);

    return res.status(200).json({
      ok: true,
      data: rows,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách lịch hẹn và lấy mẫu:", error);
    return res.status(500).json({
      ok: false,
      message: "Lỗi máy chủ nội bộ",
      error: error.message,
    });
  }
};

const updateSampleDetail = async (req, res) => {
  const { code } = req.query;
  const { sealcode, sampleweight, samplemethod, visualconsition } = req.body;

  const sql = `UPDATE kiem_dinh_lo_hang SET ma_niem_phong =?, khoi_luong_mau=?, phuong_phap_lay_mau =?, tinh_trang_cam_quan=?, trang_thai_ho_so='DA_LAY_MAU' WHERE ma_kiem_dinh =?`;
  const [result] = await db.query(sql, [
    sealcode,
    sampleweight,
    samplemethod,
    visualconsition,
    code,
  ]);

  if (result.affectedRows) {
    res.status(200).json({
      status: true,
      message: "đã lấy mẫu",
    });
  } else {
    res.status(200).json({
      status: false,
      message: "có lỗi xảu ra vui lòng thử lại",
    });
  }
};

const saveTestIndicators = async (req, res) => {
  const { code } = req.query;
  const { indicators } = req.body; // [{loai, ma, ten, val}, ...]

  const rows = (indicators || [])
    .filter((i) => i.ten?.trim() && i.val?.trim())
    .map((i, idx) => [
      code,
      i.loai,
      i.ma || null,
      i.ten.trim(),
      i.val.trim(),
      idx + 1,
    ]);

  if (!code || rows.length === 0) {
    return res
      .status(200)
      .json({ status: false, message: "vui lòng nhập chỉ số" });
  }

  await db.query(`DELETE FROM chi_so_kiem_dinh WHERE ma_kiem_dinh = ?`, [code]);
  await db.query(
    `INSERT INTO chi_so_kiem_dinh (ma_kiem_dinh, loai_chi_so, ma_chi_so, ten_chi_so, gia_tri, thu_tu) VALUES ?`,
    [rows],
  );

  res.status(200).json({ status: true, message: "đã lưu chỉ số xét nghiệm" });
};

module.exports = {
  taidlyeucaukiemdinh,
  accepauthority,
  getSamplingScheduleList,
  updateSampleDetail,
  saveTestIndicators,
};
