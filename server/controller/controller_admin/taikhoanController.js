const db = require("../../config/db");
const bcrypt = require("bcryptjs");

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

const withTransaction = async (callback) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

// Sinh mã dạng PREFIX001, PREFIX002, ... (không trùng với mã đã có)
const generateCode = async (connection, table, column, prefix) => {
  const [rows] = await connection.query(
    `
    SELECT COALESCE(MAX(CAST(SUBSTRING(${column}, ?) AS UNSIGNED)), 0) AS max_no
    FROM ${table}
    WHERE ${column} REGEXP ?
    `,
    [prefix.length + 1, `^${prefix}[0-9]+$`],
  );

  return prefix + String(Number(rows[0].max_no) + 1).padStart(3, "0");
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

const VALID_ROLES = Object.keys(ROLE_LABELS);

const slugifyUsername = (text) =>
  (text || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20) || "user";

const randomPassword = () => Math.random().toString(36).slice(-10) + "A1!";

// Tìm tên đăng nhập trống dựa trên gốc (goc, goc1, goc2, ...)
const findAvailableUsername = async (connection, base) => {
  const [rows] = await connection.query(
    `SELECT ten_dang_nhap FROM nguoi_dung WHERE ten_dang_nhap LIKE ?`,
    [`${base}%`],
  );
  const taken = new Set(rows.map((r) => r.ten_dang_nhap));
  if (!taken.has(base)) return base;
  for (let i = 1; i < 1000; i++) {
    const candidate = `${base}${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}${Date.now()}`;
};

const roleCodePrefix = (vai_tro) => {
  switch (vai_tro) {
    case "FARMER_COOP":
      return "ND";
    case "PROCESSOR":
      return "SC";
    case "TRANSPORTER":
      return "VC";
    case "DISTRIBUTOR":
      return "PP";
    case "CERT_AUTHORITY":
      return "CQ";
    case "ADMIN":
      return "ADMIN";
    default:
      return "KH";
  }
};

/*
==================================================
TÀI KHOẢN NGƯỜI DÙNG
==================================================
*/

const getAccounts = async (req, res) => {
  try {
    const [accounts] = await db.query(
      `
      SELECT
        nd.ma_nguoi_dung,
        nd.ho_ten,
        nd.ten_dang_nhap,
        nd.vai_tro,
        nd.so_dien_thoai,
        nd.trang_thai,
        nd.created_at,
        (
          SELECT GROUP_CONCAT(nt.ten_nong_trai SEPARATOR ', ')
          FROM nong_trai nt
          WHERE nt.ma_nguoi_dung = nd.ma_nguoi_dung
        ) AS ten_nong_trai
      FROM nguoi_dung nd
      ORDER BY nd.created_at DESC
      `,
    );

    return res.json({
      success: true,
      data: accounts.map((a) => ({
        ...a,
        vai_tro_label: ROLE_LABELS[a.vai_tro] || a.vai_tro,
        don_vi: a.ten_nong_trai || null,
      })),
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy danh sách tài khoản:",
      "Không thể lấy danh sách tài khoản",
    );
  }
};

// Admin tạo tài khoản trực tiếp (không qua duyệt đơn đăng ký)
const createAccount = async (req, res) => {
  try {
    const ho_ten = cleanText(req.body?.ho_ten);
    const vai_tro = cleanText(req.body?.vai_tro);
    const so_dien_thoai = cleanText(req.body?.so_dien_thoai);
    const ten_dang_nhap_input = cleanText(req.body?.ten_dang_nhap);
    const mat_khau_input = cleanText(req.body?.mat_khau);
    // Chỉ dùng khi vai_tro = FARMER_COOP: tạo luôn nông trại gốc cho tài khoản mới
    const ten_nong_trai = cleanText(req.body?.ten_nong_trai);
    const dia_diem_nong_trai = cleanText(req.body?.dia_diem_nong_trai);

    if (!ho_ten) throw new ApiError(400, "Vui lòng nhập họ tên / tên đơn vị");
    if (!VALID_ROLES.includes(vai_tro)) {
      throw new ApiError(400, "Vai trò không hợp lệ");
    }
    if (vai_tro === "FARMER_COOP" && (!ten_nong_trai || !dia_diem_nong_trai)) {
      throw new ApiError(
        400,
        "Vui lòng nhập tên nông trại và địa điểm để tạo nông trại gốc",
      );
    }

    const result = await withTransaction(async (connection) => {
      const username = ten_dang_nhap_input
        ? await findAvailableUsername(connection, slugifyUsername(ten_dang_nhap_input))
        : await findAvailableUsername(connection, slugifyUsername(ho_ten));

      if (ten_dang_nhap_input && username !== ten_dang_nhap_input) {
        throw new ApiError(409, "Tên đăng nhập đã được sử dụng");
      }

      const plainPassword = mat_khau_input || randomPassword();
      const hash = bcrypt.hashSync(plainPassword, 12);
      const ma_nguoi_dung = await generateCode(
        connection,
        "nguoi_dung",
        "ma_nguoi_dung",
        roleCodePrefix(vai_tro),
      );

      await connection.execute(
        `
        INSERT INTO nguoi_dung
        (ma_nguoi_dung, ho_ten, ten_dang_nhap, mat_khau, vai_tro, so_dien_thoai, trang_thai)
        VALUES (?, ?, ?, ?, ?, ?, 1)
        `,
        [ma_nguoi_dung, ho_ten, username, hash, vai_tro, so_dien_thoai],
      );

      if (vai_tro === "FARMER_COOP") {
        const ma_nong_trai = await generateCode(
          connection,
          "nong_trai",
          "ma_nong_trai",
          "NT",
        );

        await connection.execute(
          `
          INSERT INTO nong_trai
          (ma_nong_trai, ma_nguoi_dung, ten_nong_trai, dia_diem_nong_trai, trang_thai)
          VALUES (?, ?, ?, ?, 1)
          `,
          [ma_nong_trai, ma_nguoi_dung, ten_nong_trai, dia_diem_nong_trai],
        );
      }

      return { ma_nguoi_dung, username, plainPassword };
    });

    return res.status(201).json({
      success: true,
      message: "Tạo tài khoản thành công",
      data: {
        ma_nguoi_dung: result.ma_nguoi_dung,
        ten_dang_nhap: result.username,
        mat_khau_tam: result.plainPassword,
      },
    });
  } catch (err) {
    return sendError(res, err, "Lỗi tạo tài khoản:", "Không thể tạo tài khoản");
  }
};

const toggleAccountLock = async (req, res) => {
  const { maNguoiDung } = req.params;

  try {
    const [accounts] = await db.execute(
      `SELECT trang_thai, vai_tro FROM nguoi_dung WHERE ma_nguoi_dung = ? LIMIT 1`,
      [maNguoiDung],
    );

    if (accounts.length === 0) {
      throw new ApiError(404, "Không tìm thấy tài khoản");
    }

    if (accounts[0].vai_tro === "ADMIN" && req.user.ma_nguoi_dung === maNguoiDung) {
      throw new ApiError(400, "Không thể tự khóa tài khoản đang đăng nhập");
    }

    const next = accounts[0].trang_thai ? 0 : 1;

    await db.execute(`UPDATE nguoi_dung SET trang_thai = ? WHERE ma_nguoi_dung = ?`, [
      next,
      maNguoiDung,
    ]);

    return res.json({
      success: true,
      message: next ? "Đã mở khóa tài khoản" : "Đã khóa tài khoản",
      data: { trang_thai: next },
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi khóa/mở tài khoản:",
      "Không thể đổi trạng thái tài khoản",
    );
  }
};

const changeAccountRole = async (req, res) => {
  const { maNguoiDung } = req.params;
  const vai_tro = cleanText(req.body?.vai_tro);

  try {
    if (!VALID_ROLES.includes(vai_tro)) {
      throw new ApiError(400, "Vai trò không hợp lệ");
    }

    const [accounts] = await db.execute(
      `SELECT ma_nguoi_dung FROM nguoi_dung WHERE ma_nguoi_dung = ? LIMIT 1`,
      [maNguoiDung],
    );

    if (accounts.length === 0) {
      throw new ApiError(404, "Không tìm thấy tài khoản");
    }

    await db.execute(`UPDATE nguoi_dung SET vai_tro = ? WHERE ma_nguoi_dung = ?`, [
      vai_tro,
      maNguoiDung,
    ]);

    return res.json({
      success: true,
      message: "Đã cập nhật vai trò tài khoản",
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi đổi vai trò tài khoản:",
      "Không thể đổi vai trò tài khoản",
    );
  }
};

/*
==================================================
YÊU CẦU CẤP TÀI KHOẢN (đơn đăng ký)
==================================================
*/

const getAccountRequests = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT ma_yeu_cau, vai_tro_yeu_cau, ho_ten, so_dien_thoai, email,
             ten_co_so, dia_chi, thong_tin_bo_sung, trang_thai_duyet,
             ly_do_tu_choi, created_at
      FROM yeu_cau_cap_tai_khoan
      WHERE trang_thai_duyet = COALESCE(?, trang_thai_duyet)
      ORDER BY created_at DESC
      `,
      [cleanText(req.query?.trang_thai)],
    );

    return res.json({
      success: true,
      data: rows.map((r) => ({
        ...r,
        vai_tro_label: ROLE_LABELS[r.vai_tro_yeu_cau] || r.vai_tro_yeu_cau,
      })),
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy danh sách yêu cầu cấp tài khoản:",
      "Không thể lấy danh sách yêu cầu",
    );
  }
};

const approveAccountRequest = async (req, res) => {
  const { maYeuCau } = req.params;

  try {
    const result = await withTransaction(async (connection) => {
      const [requests] = await connection.execute(
        `SELECT * FROM yeu_cau_cap_tai_khoan WHERE ma_yeu_cau = ? LIMIT 1 FOR UPDATE`,
        [maYeuCau],
      );

      if (requests.length === 0) {
        throw new ApiError(404, "Không tìm thấy yêu cầu");
      }

      const request = requests[0];

      if (request.trang_thai_duyet !== "PENDING") {
        throw new ApiError(409, "Yêu cầu này đã được xử lý trước đó");
      }

      const username = await findAvailableUsername(
        connection,
        slugifyUsername(request.ten_co_so || request.ho_ten),
      );
      const plainPassword = randomPassword();
      const hash = bcrypt.hashSync(plainPassword, 12);
      const ma_nguoi_dung = await generateCode(
        connection,
        "nguoi_dung",
        "ma_nguoi_dung",
        roleCodePrefix(request.vai_tro_yeu_cau),
      );

      await connection.execute(
        `
        INSERT INTO nguoi_dung
        (ma_nguoi_dung, ho_ten, ten_dang_nhap, mat_khau, vai_tro, so_dien_thoai, trang_thai)
        VALUES (?, ?, ?, ?, ?, ?, 1)
        `,
        [
          ma_nguoi_dung,
          request.ho_ten,
          username,
          hash,
          request.vai_tro_yeu_cau,
          request.so_dien_thoai,
        ],
      );

      // Nông dân/HTX: tạo luôn nông trại gốc từ tên cơ sở + địa chỉ đã khai
      if (request.vai_tro_yeu_cau === "FARMER_COOP") {
        const ma_nong_trai = await generateCode(
          connection,
          "nong_trai",
          "ma_nong_trai",
          "NT",
        );

        await connection.execute(
          `
          INSERT INTO nong_trai
          (ma_nong_trai, ma_nguoi_dung, ten_nong_trai, dia_diem_nong_trai, trang_thai)
          VALUES (?, ?, ?, ?, 1)
          `,
          [ma_nong_trai, ma_nguoi_dung, request.ten_co_so, request.dia_chi],
        );
      }

      await connection.execute(
        `
        UPDATE yeu_cau_cap_tai_khoan
        SET trang_thai_duyet = 'APPROVED',
            ma_nguoi_dung_tao = ?,
            ma_nguoi_duyet = ?,
            ngay_duyet = NOW()
        WHERE ma_yeu_cau = ?
        `,
        [ma_nguoi_dung, req.user.ma_nguoi_dung, maYeuCau],
      );

      return { ma_nguoi_dung, username, plainPassword };
    });

    return res.json({
      success: true,
      message: "Đã duyệt yêu cầu và tạo tài khoản",
      data: {
        ma_nguoi_dung: result.ma_nguoi_dung,
        ten_dang_nhap: result.username,
        mat_khau_tam: result.plainPassword,
      },
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi duyệt yêu cầu cấp tài khoản:",
      "Không thể duyệt yêu cầu",
    );
  }
};

const rejectAccountRequest = async (req, res) => {
  const { maYeuCau } = req.params;
  const ly_do = cleanText(req.body?.ly_do_tu_choi);

  try {
    await withTransaction(async (connection) => {
      const [requests] = await connection.execute(
        `SELECT trang_thai_duyet FROM yeu_cau_cap_tai_khoan WHERE ma_yeu_cau = ? LIMIT 1 FOR UPDATE`,
        [maYeuCau],
      );

      if (requests.length === 0) {
        throw new ApiError(404, "Không tìm thấy yêu cầu");
      }

      if (requests[0].trang_thai_duyet !== "PENDING") {
        throw new ApiError(409, "Yêu cầu này đã được xử lý trước đó");
      }

      await connection.execute(
        `
        UPDATE yeu_cau_cap_tai_khoan
        SET trang_thai_duyet = 'REJECTED',
            ly_do_tu_choi = ?,
            ma_nguoi_duyet = ?,
            ngay_duyet = NOW()
        WHERE ma_yeu_cau = ?
        `,
        [ly_do, req.user.ma_nguoi_dung, maYeuCau],
      );
    });

    return res.json({ success: true, message: "Đã từ chối yêu cầu" });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi từ chối yêu cầu cấp tài khoản:",
      "Không thể từ chối yêu cầu",
    );
  }
};

module.exports = {
  getAccounts,
  createAccount,
  toggleAccountLock,
  changeAccountRole,
  getAccountRequests,
  approveAccountRequest,
  rejectAccountRequest,
};
