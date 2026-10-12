const express = require("express");
const router = express.Router();
// Kiểm tra đúng tên thư mục và tên file controller của bạn:
const kiemDinhController = require("../controller/chitietkiemdinhComtroller");

// Tuyến đường lấy chi tiết kiểm định theo mã kiểm định
router.get("/:maKiemDinh", kiemDinhController.getChiTietKiemDinh);

module.exports = router;
