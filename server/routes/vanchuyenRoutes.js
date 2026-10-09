const express = require("express");
const router = express.Router();
const vanchuyenController = require("../controller/vanchuyenController");
const { checkAuth } = require("../midlewere/authMiddleware");

// Tất cả cần đăng nhập, danh tính nông dân lấy từ token

// Đơn vị vận chuyển và cơ sở nhận hàng cho popup tạo lệnh
router.get("/doi-tac", checkAuth, vanchuyenController.getPartners);

// Lô còn ở nông trại và chưa có lệnh vận chuyển
router.get("/lo-san-sang", checkAuth, vanchuyenController.getReadyBatches);

// Danh sách lệnh của nông dân + 3 ô số liệu đầu trang
router.get("/cua-toi", checkAuth, vanchuyenController.getMyOrders);

router.get("/:maVanDon", checkAuth, vanchuyenController.getOrderById);

router.post("/", checkAuth, vanchuyenController.createOrder);

// Hủy lệnh khi xe chưa lấy hàng
router.put("/:maVanDon/huy", checkAuth, vanchuyenController.cancelOrder);

module.exports = router;
