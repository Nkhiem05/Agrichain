const db = require("../../server/config/db");
const bcrypt = require("bcryptjs");

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
    // Với mysql2/promise, destructuring lấy mảng [results]
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

    return res.json({
      success: true,
      message: "Đăng nhập thành công",
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

module.exports = { login };
