const express = require("express");
const router = express.Router();

const authController = require("../controller/authController");

// Tuyến đường đăng nhập
router.post("/login", authController.login);

// Tuyến đường kiểm tra token cho ProtectedRoute frontend
router.get("/verify-token", authController.verifyToken);

module.exports = router;
