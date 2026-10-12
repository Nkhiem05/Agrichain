const db = require("../config/db");

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

const ROLE_LABELS = {
  ADMIN: "Quản trị viên",
  FARMER_COOP: "Nông dân / HTX",
  PROCESSOR: "Cơ sở sơ chế",
  TRANSPORTER: "Đơn vị vận chuyển",
  DISTRIBUTOR: "Đơn vị phân phối",
  CONSUMER: "Người tiêu dùng",
  CERT_AUTHORITY: "Cơ quan kiểm định",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/*
==================================================
HỒ SƠ CÁ NHÂN (tài khoản đang đăng nhập)
==================================================
*/

const getProfile = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `
      SELECT ma_nguoi_dung, ho_ten, ten_dang_nhap, vai_tro, so_dien_thoai,
             email, dia_chi, anh_dai_dien, trang_thai, created_at
      FROM nguoi_dung
      WHERE ma_nguoi_dung = ?
      LIMIT 1
      `,
      [req.user.ma_nguoi_dung],
    );

    if (rows.length === 0) {
      throw new ApiError(404, "Không tìm thấy tài khoản");
    }

    const profile = rows[0];

    return res.json({
      success: true,
      data: {
        ...profile,
        vai_tro_label: ROLE_LABELS[profile.vai_tro] || profile.vai_tro,
      },
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy hồ sơ cá nhân:",
      "Không thể lấy hồ sơ cá nhân",
    );
  }
};

const updateProfile = async (req, res) => {
  try {
    const ho_ten = cleanText(req.body?.ho_ten);
    const so_dien_thoai = cleanText(req.body?.so_dien_thoai);
    const email = cleanText(req.body?.email);
    const dia_chi = cleanText(req.body?.dia_chi);
    const anh_dai_dien = req.file
      ? `/uploads/avatars/${req.file.filename}`
      : null;

    if (!ho_ten) {
      throw new ApiError(400, "Vui lòng nhập họ và tên");
    }
    if (ho_ten.length > 150) {
      throw new ApiError(400, "Họ và tên tối đa 150 ký tự");
    }
    if (email && !EMAIL_REGEX.test(email)) {
      throw new ApiError(400, "Email không hợp lệ");
    }

    await db.execute(
      `
      UPDATE nguoi_dung
      SET ho_ten = ?,
          so_dien_thoai = ?,
          email = ?,
          dia_chi = ?,
          anh_dai_dien = COALESCE(?, anh_dai_dien)
      WHERE ma_nguoi_dung = ?
      `,
      [
        ho_ten,
        so_dien_thoai,
        email,
        dia_chi,
        anh_dai_dien,
        req.user.ma_nguoi_dung,
      ],
    );

    return res.json({
      success: true,
      message: "Đã cập nhật hồ sơ cá nhân",
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi cập nhật hồ sơ cá nhân:",
      "Không thể cập nhật hồ sơ cá nhân",
    );
  }
};

module.exports = { getProfile, updateProfile };
