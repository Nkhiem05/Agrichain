const db = require("../../config/db");

/*
==================================================
TIỆN ÍCH
==================================================
*/

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const cleanText = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
};

const sendError = (res, err, logMessage, fallbackMessage) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
    });
  }

  console.error(logMessage, err);
  return res.status(500).json({
    success: false,
    message: fallbackMessage,
  });
};

/*
==================================================
KIỂM ĐỊNH & THU HỒI
==================================================
*/

const getInspections = async (req, res) => {
  try {
    const trangThai = cleanText(req.query?.trang_thai);

    let sql = `
      SELECT
        kd.ma_kiem_dinh,
        kd.ma_ho_so,
        kd.ma_lo_nong_san,
        kd.tieu_chuan_dang_ky,
        kd.so_chung_nhan,
        kd.ket_luan,
        kd.trang_thai_ho_so,
        DATE_FORMAT(kd.hieu_luc_tu, '%Y-%m-%d') AS hieu_luc_tu,
        DATE_FORMAT(kd.hieu_luc_den, '%Y-%m-%d') AS hieu_luc_den,
        kd.ly_do_thu_hoi,
        kd.ngay_thu_hoi,
        kd.created_at,
        sp.ten_san_pham,
        co_quan.ho_ten AS ten_co_quan
      FROM kiem_dinh_lo_hang kd
      LEFT JOIN lo_nong_san lo ON kd.ma_lo_nong_san = lo.ma_lo_nong_san
      LEFT JOIN san_pham_nong_san sp ON lo.ma_san_pham = sp.ma_san_pham
      LEFT JOIN nguoi_dung co_quan ON kd.ma_co_quan = co_quan.ma_nguoi_dung
      WHERE 1 = 1
    `;
    const values = [];

    if (trangThai === "KHONG_DAT") {
      sql += ` AND kd.trang_thai_ho_so = 'DA_CONG_BO' AND kd.ket_luan = 'FAILED'`;
    } else if (trangThai === "DA_CONG_BO") {
      sql += ` AND kd.trang_thai_ho_so = 'DA_CONG_BO' AND kd.ket_luan = 'PASSED'`;
    } else if (trangThai) {
      sql += ` AND kd.trang_thai_ho_so = ?`;
      values.push(trangThai);
    }

    sql += ` ORDER BY kd.created_at DESC LIMIT 300`;

    const [rows] = await db.query(sql, values);

    const [statRows] = await db.query(
      `SELECT
         CASE WHEN trang_thai_ho_so = 'DA_CONG_BO' AND ket_luan = 'FAILED'
              THEN 'KHONG_DAT' ELSE trang_thai_ho_so END AS trang_thai_ho_so,
         COUNT(*) AS n
       FROM kiem_dinh_lo_hang
       GROUP BY 1`,
    );

    return res.json({
      success: true,
      data: {
        danh_sach: rows,
        theo_trang_thai: statRows.reduce((acc, r) => {
          acc[r.trang_thai_ho_so] = r.n;
          return acc;
        }, {}),
      },
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy danh sách kiểm định:",
      "Không thể lấy danh sách kiểm định",
    );
  }
};

// Chỉ thu hồi được hồ sơ đã công bố chứng nhận ĐẠT (DA_CONG_BO + PASSED)
const recallInspection = async (req, res) => {
  const { maKiemDinh } = req.params;
  const ly_do = cleanText(req.body?.ly_do_thu_hoi);

  try {
    if (!ly_do) {
      throw new ApiError(400, "Vui lòng nhập lý do thu hồi");
    }

    const [rows] = await db.execute(
      `SELECT trang_thai_ho_so, ket_luan FROM kiem_dinh_lo_hang WHERE ma_kiem_dinh = ? LIMIT 1`,
      [maKiemDinh],
    );

    if (rows.length === 0) {
      throw new ApiError(404, "Không tìm thấy hồ sơ kiểm định");
    }

    if (rows[0].trang_thai_ho_so !== "DA_CONG_BO" || rows[0].ket_luan !== "PASSED") {
      throw new ApiError(
        409,
        "Chỉ thu hồi được hồ sơ đã công bố chứng nhận đạt chuẩn",
      );
    }

    await db.execute(
      `
      UPDATE kiem_dinh_lo_hang
      SET trang_thai_ho_so = 'THU_HOI',
          ly_do_thu_hoi = ?,
          ngay_thu_hoi = NOW()
      WHERE ma_kiem_dinh = ?
      `,
      [ly_do, maKiemDinh],
    );

    return res.json({
      success: true,
      message: "Đã thu hồi chứng nhận kiểm định",
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi thu hồi chứng nhận kiểm định:",
      "Không thể thu hồi chứng nhận",
    );
  }
};

module.exports = { getInspections, recallInspection };
