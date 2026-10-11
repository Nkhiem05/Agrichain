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
LÔ HÀNG TOÀN CHUỖI
==================================================
*/

const getBatches = async (req, res) => {
  try {
    const giaiDoan = cleanText(req.query?.giai_doan);
    const q = cleanText(req.query?.q);

    let sql = `
      SELECT
        lo.ma_lo_nong_san,
        lo.so_luong_hien_tai,
        lo.don_vi_tinh,
        lo.giai_doan_hien_tai,
        lo.tinh_trang_su_dung,
        DATE_FORMAT(lo.ngay_thu_hoach, '%Y-%m-%d') AS ngay_thu_hoach,
        lo.created_at,
        sp.ten_san_pham,
        nt.ten_nong_trai,
        nd.ho_ten AS nguoi_quan_ly
      FROM lo_nong_san lo
      LEFT JOIN san_pham_nong_san sp ON lo.ma_san_pham = sp.ma_san_pham
      LEFT JOIN mua_vu mv ON lo.ma_mua_vu = mv.ma_mua_vu
      LEFT JOIN nong_trai nt ON mv.ma_nong_trai = nt.ma_nong_trai
      LEFT JOIN nguoi_dung nd ON lo.ma_nguoi_quan_ly = nd.ma_nguoi_dung
      WHERE lo.tinh_trang_su_dung = 'ACTIVE'
    `;
    const values = [];

    if (giaiDoan) {
      sql += ` AND lo.giai_doan_hien_tai = ?`;
      values.push(giaiDoan);
    }

    if (q) {
      sql += ` AND (lo.ma_lo_nong_san LIKE ? OR sp.ten_san_pham LIKE ?)`;
      values.push(`%${q}%`, `%${q}%`);
    }

    sql += ` ORDER BY lo.created_at DESC LIMIT 300`;

    const [rows] = await db.query(sql, values);

    const [stageRows] = await db.query(
      `SELECT giai_doan_hien_tai, COUNT(*) AS n
       FROM lo_nong_san
       WHERE tinh_trang_su_dung = 'ACTIVE'
       GROUP BY giai_doan_hien_tai`,
    );

    return res.json({
      success: true,
      data: {
        danh_sach: rows,
        theo_chang: stageRows.reduce((acc, r) => {
          acc[r.giai_doan_hien_tai] = r.n;
          return acc;
        }, {}),
      },
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy danh sách lô hàng toàn chuỗi:",
      "Không thể lấy danh sách lô hàng",
    );
  }
};

module.exports = { getBatches };
