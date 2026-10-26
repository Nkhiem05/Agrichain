const express = require("express");
const router = express.Router();
const dailyController = require("../controller/dailyController");
const { checkAuth, requireRole } = require("../midlewere/authMiddleware");

// Toàn bộ chức năng chỉ dành cho tài khoản đại lý (RETAILER)
router.use(checkAuth, requireRole("RETAILER"));

// 1. Hàng đang tới: nhận / từ chối
router.get("/nhan-hang", dailyController.getIncoming);
router.put("/nhan-hang/:maVanDon/xac-nhan", dailyController.confirmReceive);
router.put("/nhan-hang/:maVanDon/tu-choi", dailyController.rejectReceive);

// 2. Hàng trong cửa hàng: xác nhận đã bán hết
router.get("/kho", dailyController.getStock);
router.put("/kho/:maLo/hoan-tat", dailyController.completeLot);

module.exports = router;
