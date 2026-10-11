const db = require("../../config/db");

/*
==================================================
TIỆN ÍCH
==================================================
*/

const cleanText = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
};

const sendError = (res, err, logMessage, fallbackMessage) => {
  console.error(logMessage, err);
  return res.status(500).json({
    success: false,
    message: fallbackMessage,
  });
};

/*
==================================================
VẬN CHUYỂN (giám sát toàn hệ thống, chỉ xem)
==================================================
*/

const getShipments = async (req, res) => {
  try {
    const trangThai = cleanText(req.query?.trang_thai);

    let sql = `
      SELECT
        vc.ma_van_don,
        vc.ma_lo_nong_san,
        vc.khoi_luong,
        vc.don_vi_tinh,
        vc.thoi_gian_xuat,
        vc.ten_tai_xe,
        vc.bien_so_xe,
        vc.trang_thai,
        vc.created_at,
        sp.ten_san_pham,
        guoi.ho_ten AS ten_nguoi_gui,
        donvi.ho_ten AS ten_don_vi_van_chuyen,
        nhan.ho_ten AS ten_ben_nhan
      FROM lenh_van_chuyen vc
      LEFT JOIN lo_nong_san lo ON vc.ma_lo_nong_san = lo.ma_lo_nong_san
      LEFT JOIN san_pham_nong_san sp ON lo.ma_san_pham = sp.ma_san_pham
      LEFT JOIN nguoi_dung guoi ON vc.ma_nguoi_gui = guoi.ma_nguoi_dung
      LEFT JOIN nguoi_dung donvi ON vc.ma_don_vi_van_chuyen = donvi.ma_nguoi_dung
      LEFT JOIN nguoi_dung nhan ON vc.ma_ben_nhan = nhan.ma_nguoi_dung
      WHERE 1 = 1
    `;
    const values = [];

    if (trangThai) {
      sql += ` AND vc.trang_thai = ?`;
      values.push(trangThai);
    }

    sql += ` ORDER BY vc.created_at DESC LIMIT 300`;

    const [rows] = await db.query(sql, values);

    const [statRows] = await db.query(
      `SELECT trang_thai, COUNT(*) AS n FROM lenh_van_chuyen GROUP BY trang_thai`,
    );

    return res.json({
      success: true,
      data: {
        danh_sach: rows,
        theo_trang_thai: statRows.reduce((acc, r) => {
          acc[r.trang_thai] = r.n;
          return acc;
        }, {}),
      },
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy danh sách vận chuyển:",
      "Không thể lấy danh sách vận chuyển",
    );
  }
};

module.exports = { getShipments };
