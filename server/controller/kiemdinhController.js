const { Code } = require("lucide-react");
const db = require("../config/db");

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

const accepauthority = async (req, res) => {
  const { code } = req.query;
  const { status, day, time, inspector } = req.body;

  if (status) {
    const sql = `UPDATE kiem_dinh_lo_hang SET trang_thai_ho_so=?, ngay_hen_lay_mau=?, gio_hen_lay_mau=?, kiem_dinh_vien=? WHERE ma_kiem_dinh =?`;
    const [result] = await db.query(sql, [
      "DA_HEN_LICH",
      day,
      time,
      inspector,
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
  } else if (!status) {
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

module.exports = {
  taidlyeucaukiemdinh,
  accepauthority,
};
