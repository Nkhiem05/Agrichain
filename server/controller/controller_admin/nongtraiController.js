const db = require("../../config/db");
const { generateUniqueCode } = require("../../utils/generateCode");

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

const cleanText = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
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

    await db.execute(
      `UPDATE nong_trai SET trang_thai = ? WHERE ma_nong_trai = ?`,
      [next, maNongTrai],
    );

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

// Admin tạo nông trại mới và gắn luôn vào một tài khoản nông dân có sẵn:
// một tài khoản nông dân có thể có nhiều nông trại, chủ tài khoản không cần tự tạo.
const createActor = async (req, res) => {
  try {
    const ma_nguoi_dung = cleanText(req.body?.ma_nguoi_dung);
    const ten_nong_trai = cleanText(req.body?.ten_nong_trai);
    const dia_diem_nong_trai = cleanText(req.body?.dia_diem_nong_trai);

    if (!ma_nguoi_dung)
      throw new ApiError(400, "Vui lòng chọn tài khoản liên kết");
    if (!ten_nong_trai || !dia_diem_nong_trai) {
      throw new ApiError(400, "Vui lòng nhập tên nông trại và địa điểm");
    }

    const [accounts] = await db.execute(
      `SELECT vai_tro, trang_thai FROM nguoi_dung WHERE ma_nguoi_dung = ? LIMIT 1`,
      [ma_nguoi_dung],
    );

    if (accounts.length === 0)
      throw new ApiError(404, "Không tìm thấy tài khoản");
    if (accounts[0].vai_tro !== "FARMER_COOP") {
      throw new ApiError(
        400,
        "Chỉ tài khoản nông dân mới có thể sở hữu nông trại",
      );
    }
    if (!accounts[0].trang_thai) {
      throw new ApiError(
        400,
        "Tài khoản đang bị khóa, không thể gắn nông trại",
      );
    }

    // Mã nông trại do server sinh (NT001, NT002, ...); thử lại nếu 2 request cùng lúc sinh trùng mã
    let ma_nong_trai;

    for (let attempt = 1; ; attempt++) {
      ma_nong_trai = await generateUniqueCode(
        db,
        "nong_trai",
        "ma_nong_trai",
        "NT",
      );

      try {
        await db.execute(
          `
          INSERT INTO nong_trai
          (ma_nong_trai, ma_nguoi_dung, ten_nong_trai, dia_diem_nong_trai, trang_thai)
          VALUES (?, ?, ?, ?, 1)
          `,
          [ma_nong_trai, ma_nguoi_dung, ten_nong_trai, dia_diem_nong_trai],
        );
        break;
      } catch (err) {
        if (err.code === "ER_DUP_ENTRY" && attempt < 3) continue;
        throw err;
      }
    }

    return res.status(201).json({
      success: true,
      message: "Đã tạo nông trại và gắn vào tài khoản",
      data: { ma_nguoi_dung, ma_nong_trai },
    });
  } catch (err) {
    return sendError(res, err, "Lỗi tạo nông trại:", "Không thể tạo nông trại");
  }
};

module.exports = { getFarms, toggleFarmLock, createActor };
