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
TỔNG QUAN
==================================================
*/

const getOverview = async (req, res) => {
  try {
    const [[farmCount]] = await db.query(
      `SELECT COUNT(*) AS n FROM nong_trai WHERE trang_thai = 1`,
    );
    const [[seasonCount]] = await db.query(
      `SELECT COUNT(*) AS n FROM mua_vu WHERE trang_thai = 1`,
    );
    const [[batchCount]] = await db.query(
      `SELECT COUNT(*) AS n FROM lo_nong_san
       WHERE tinh_trang_su_dung = 'ACTIVE' AND giai_doan_hien_tai <> 'COMPLETED'`,
    );
    const [[pendingRequestCount]] = await db.query(
      `SELECT COUNT(*) AS n FROM yeu_cau_cap_tai_khoan WHERE trang_thai_duyet = 'PENDING'`,
    );
    const [[lockedOrgCount]] = await db.query(
      `SELECT COUNT(*) AS n FROM nguoi_dung WHERE trang_thai = 0 AND vai_tro <> 'ADMIN'`,
    );
    const [recalledBatches] = await db.query(
      `SELECT k.ma_lo_nong_san, k.ly_do_thu_hoi, k.ngay_thu_hoi
       FROM kiem_dinh_lo_hang k
       WHERE k.trang_thai_ho_so = 'THU_HOI'
       ORDER BY k.ngay_thu_hoi DESC
       LIMIT 5`,
    );
    const [rejectedInspections] = await db.query(
      `SELECT k.ma_lo_nong_san, k.updated_at
       FROM kiem_dinh_lo_hang k
       WHERE k.trang_thai_ho_so = 'TU_CHOI'
       ORDER BY k.updated_at DESC
       LIMIT 5`,
    );

    const canhBao =
      recalledBatches.length + rejectedInspections.length + lockedOrgCount.n;

    const viecCanXuLy = [
      ...(pendingRequestCount.n > 0
        ? [
            {
              loai: "DANG_KY_CHO_DUYET",
              tieu_de: "Hồ sơ đăng ký chờ duyệt",
              mo_ta: `${pendingRequestCount.n} đơn vị vừa đăng ký, đang chờ admin duyệt`,
              so_luong: pendingRequestCount.n,
            },
          ]
        : []),
      ...recalledBatches.map((b) => ({
        loai: "LO_THU_HOI",
        tieu_de: `Lô ${b.ma_lo_nong_san} đã bị thu hồi`,
        mo_ta: b.ly_do_thu_hoi || "Cơ quan kiểm định đã thu hồi chứng nhận",
        ma_lo_nong_san: b.ma_lo_nong_san,
      })),
      ...rejectedInspections.map((b) => ({
        loai: "KIEM_DINH_TU_CHOI",
        tieu_de: `Lô ${b.ma_lo_nong_san} bị từ chối kiểm định`,
        mo_ta: "Cơ quan kiểm định đã từ chối hồ sơ đề nghị",
        ma_lo_nong_san: b.ma_lo_nong_san,
      })),
      ...(lockedOrgCount.n > 0
        ? [
            {
              loai: "TAI_KHOAN_BI_KHOA",
              tieu_de: "Có tài khoản đang bị khóa",
              mo_ta: `${lockedOrgCount.n} tài khoản đang bị vô hiệu hóa`,
              so_luong: lockedOrgCount.n,
            },
          ]
        : []),
    ];

    const [stageRows] = await db.query(
      `SELECT giai_doan_hien_tai, COUNT(*) AS n
       FROM lo_nong_san
       WHERE tinh_trang_su_dung = 'ACTIVE'
       GROUP BY giai_doan_hien_tai`,
    );

    return res.json({
      success: true,
      data: {
        so_nong_trai: farmCount.n,
        so_mua_vu: seasonCount.n,
        so_lo_dang_luu_thong: batchCount.n,
        so_canh_bao: canhBao,
        viec_can_xu_ly: viecCanXuLy,
        lo_theo_chang: stageRows.reduce((acc, r) => {
          acc[r.giai_doan_hien_tai] = r.n;
          return acc;
        }, {}),
      },
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy tổng quan admin:",
      "Không thể lấy dữ liệu tổng quan",
    );
  }
};

module.exports = { getOverview };
