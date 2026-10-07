const db = require("../../server/config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "bi_mat_agrichain_2026";

// 1. Hàm xử lý đăng nhập
const login = async (req, res) => {
  const { ten_dang_nhap, mat_khau } = req.body;

  if (!ten_dang_nhap || !mat_khau) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng nhập tên đăng nhập và mật khẩu",
    });
  }

  const sql = `
    SELECT *
    FROM nguoi_dung
    WHERE ten_dang_nhap = ?
    LIMIT 1
  `;

  try {
    const [results] = await db.execute(sql, [ten_dang_nhap]);

    if (results.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Tên đăng nhập hoặc mật khẩu không đúng",
      });
    }

    const user = results[0];

    if (user.trang_thai !== 1) {
      return res.status(403).json({
        success: false,
        message: "Tài khoản đã bị khóa",
      });
    }

    let hash = user.mat_khau;
    if (hash && hash.startsWith("$2y$")) {
      hash = "$2b$" + hash.substring(4);
    }

    const passwordDung = await bcrypt.compare(mat_khau, hash);

    if (!passwordDung) {
      return res.status(401).json({
        success: false,
        message: "Tên đăng nhập hoặc mật khẩu không đúng",
      });
    }

    // Tạo token chứa mã người dùng và vai trò
    const token = jwt.sign(
      {
        ma_nguoi_dung: user.ma_nguoi_dung,
        vai_tro: user.vai_tro,
      },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    return res.json({
      success: true,
      message: "Đăng nhập thành công",
      token,
      user: {
        ma_nguoi_dung: user.ma_nguoi_dung,
        ho_ten: user.ho_ten,
        ten_dang_nhap: user.ten_dang_nhap,
        vai_tro: user.vai_tro,
        so_dien_thoai: user.so_dien_thoai,
      },
    });
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server trong quá trình xử lý đăng nhập",
    });
  }
};

// 2. Hàm xác thực token cho ProtectedRoute frontend gọi sang
const verifyToken = async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      valid: false,
      message: "Không tìm thấy token xác thực",
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(403).json({
        valid: false,
        message: "Phiên đăng nhập đã hết hạn hoặc token không hợp lệ",
      });
    }

    // Token hợp lệ, trả về payload (ma_nguoi_dung, vai_tro)
    return res.json({
      valid: true,
      user: decodedUser,
    });
  });
};

module.exports = { login, verifyToken };
