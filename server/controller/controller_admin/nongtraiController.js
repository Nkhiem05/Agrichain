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

const ROLE_LABELS = {
  ADMIN: "Quản trị viên",
  FARMER_COOP: "Nông dân / HTX",
  PROCESSOR: "Cơ sở sơ chế",
  TRANSPORTER: "Đơn vị vận chuyển",
  DISTRIBUTOR: "Đơn vị phân phối",
  CONSUMER: "Người tiêu dùng",
  CERT_AUTHORITY: "Cơ quan kiểm định",
};

/*
==================================================
NÔNG TRẠI
==================================================
*/

const getFarms = async (req, res) => {
  try {
    const [farms] = await db.query(
      `
      SELECT
        nt.ma_nong_trai,
        nt.ten_nong_trai,
        nt.dia_diem_nong_trai,
        nt.dien_tich_nong_trai,
        nt.trang_thai,
        nd.ma_nguoi_dung,
        nd.ho_ten AS nguoi_dai_dien,
        nd.so_dien_thoai,
        (SELECT COUNT(*) FROM thua_dat td WHERE td.ma_nong_trai = nt.ma_nong_trai) AS so_thua_dat,
        (SELECT COUNT(*) FROM mua_vu mv WHERE mv.ma_nong_trai = nt.ma_nong_trai AND mv.trang_thai = 1) AS so_mua_vu_dang_chay
      FROM nong_trai nt
      JOIN nguoi_dung nd ON nt.ma_nguoi_dung = nd.ma_nguoi_dung
      ORDER BY nt.created_at DESC
      `,
    );

    const [orgs] = await db.query(
      `
      SELECT ma_nguoi_dung, ho_ten, vai_tro, so_dien_thoai, trang_thai, created_at
      FROM nguoi_dung
      WHERE vai_tro IN ('PROCESSOR', 'TRANSPORTER', 'CERT_AUTHORITY', 'DISTRIBUTOR')
      ORDER BY created_at DESC
      `,
    );

    return res.json({
      success: true,
      data: {
        nong_trai: farms,
        to_chuc_khac: orgs.map((o) => ({
          ...o,
          vai_tro_label: ROLE_LABELS[o.vai_tro] || o.vai_tro,
        })),
      },
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy danh sách nông trại:",
      "Không thể lấy danh sách nông trại",
    );
  }
};

const toggleFarmLock = async (req, res) => {
  const { maNongTrai } = req.params;

  try {
    const [farms] = await db.execute(
      `SELECT trang_thai FROM nong_trai WHERE ma_nong_trai = ? LIMIT 1`,
      [maNongTrai],
    );

    if (farms.length === 0) {
      throw new ApiError(404, "Không tìm thấy nông trại");
    }

    const next = farms[0].trang_thai ? 0 : 1;

    await db.execute(`UPDATE nong_trai SET trang_thai = ? WHERE ma_nong_trai = ?`, [
      next,
      maNongTrai,
    ]);

    return res.json({
      success: true,
      message: next
        ? "Đã mở khóa nông trại"
        : "Đã khóa nông trại, chặn giao dịch từ nông trại này",
      data: { trang_thai: next },
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi khóa/mở nông trại:",
      "Không thể đổi trạng thái nông trại",
    );
  }
};

module.exports = { getFarms, toggleFarmLock };
