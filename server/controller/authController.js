const db = require("../../server/config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken"); // 1. Thêm import jwt

const JWT_SECRET = process.env.JWT_SECRET || "bi_mat_agrichain_2026"; // Nên đưa vào file .env

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

    // 2. Tạo Token có chứa ID và vai trò của user (hết hạn sau 1 ngày)
    const token = jwt.sign(
      {
        ma_nguoi_dung: user.ma_nguoi_dung,
        vai_tro: user.vai_tro,
      },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    // 3. Trả token kèm theo thông tin user
    return res.json({
      success: true,
      message: "Đăng nhập thành công",
      token, // Trả token về cho React
      user: {
        ma_nguoi_dung: user.ma_nguoi_dung,
        ho_ten: user.ho_ten,
        ten_dang_nhap: user.ten_dang_nhap,
        vai_tro: user.vai_tro,
        so_dien_thoai: user.so_dien_thoai,
        anh_dai_dien: user.anh_dai_dien || null,
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

module.exports = { login };
