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
    // Ví blockchain người dùng đã liên kết, chờ admin gán vai trò trên hợp đồng
    let pendingWalletCount = 0;
    try {
      const [[r]] = await db.query(
        `SELECT COUNT(*) AS n FROM vi_blockchain WHERE trang_thai_duyet = 'CHO_DUYET'`,
      );
      pendingWalletCount = Number(r.n);
    } catch (err) {
      if (err.code !== "ER_NO_SUCH_TABLE" && err.code !== "ER_BAD_FIELD_ERROR") throw err;
    }
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

    // Lô đã công bố kết luận KHÔNG ĐẠT (không được cấp chứng nhận, không được vận chuyển)
    const [failedInspections] = await db.query(
      `SELECT k.ma_lo_nong_san, k.ma_kiem_dinh, k.updated_at
       FROM kiem_dinh_lo_hang k
       WHERE k.trang_thai_ho_so = 'DA_CONG_BO' AND k.ket_luan = 'FAILED'
       ORDER BY k.updated_at DESC
       LIMIT 5`,
    );
    // Lệnh vận chuyển bị bên nhận từ chối
    const [rejectedShipments] = await db.query(
      `SELECT v.ma_van_don, v.ma_lo_nong_san, v.ghi_chu
       FROM lenh_van_chuyen v
       WHERE v.trang_thai = 'TU_CHOI'
       ORDER BY v.updated_at DESC
       LIMIT 5`,
    );

    const canhBao =
      recalledBatches.length +
      rejectedInspections.length +
      failedInspections.length +
      rejectedShipments.length +
      lockedOrgCount.n;

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
      ...(pendingWalletCount > 0
        ? [
            {
              loai: "VI_CHO_DUYET",
              tieu_de: "Ví blockchain chờ duyệt",
              mo_ta: `${pendingWalletCount} ví đã liên kết, chờ admin gán vai trò trên hợp đồng`,
              so_luong: pendingWalletCount,
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
      ...failedInspections.map((b) => ({
        loai: "KIEM_DINH_KHONG_DAT",
        tieu_de: `Lô ${b.ma_lo_nong_san} kiểm định KHÔNG ĐẠT`,
        mo_ta: `Hồ sơ ${b.ma_kiem_dinh} có chỉ số vượt ngưỡng, lô không được cấp chứng nhận và không được vận chuyển`,
        ma_lo_nong_san: b.ma_lo_nong_san,
      })),
      ...rejectedShipments.map((v) => ({
        loai: "VAN_CHUYEN_TU_CHOI",
        tieu_de: `Lệnh ${v.ma_van_don} bị từ chối tiếp nhận`,
        mo_ta: v.ghi_chu
          ? `Lô ${v.ma_lo_nong_san}: ${v.ghi_chu}`
          : `Bên nhận đã từ chối lô ${v.ma_lo_nong_san}`,
        ma_lo_nong_san: v.ma_lo_nong_san,
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
