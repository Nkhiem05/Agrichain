const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "bi_mat_agrichain_2026";

const checkAuth = (req, res, next) => {
  // Lấy header Authorization: Bearer <token>
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Vui lòng đăng nhập để thực hiện chức năng này",
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: "Phiên đăng nhập đã hết hạn hoặc token không hợp lệ",
      });
    }

    // Đính kèm thông tin user giải mã được để các route/controller sau dùng nếu cần
    req.user = decodedUser;
    next();
  });
};

// Chỉ cho phép khi vai trò của người dùng (đã giải mã từ token) nằm trong danh sách cho phép.
// Dùng sau checkAuth: checkAuth, requireRole("ADMIN")
const requireRole =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.vai_tro)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền thực hiện chức năng này",
      });
    }
    next();
  };

module.exports = { checkAuth, requireRole };
