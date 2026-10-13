const express = require("express");
const router = express.Router();
const nhaphanphoiController = require("../controller/nhaphanphoiController");
const { checkAuth, requireRole } = require("../midlewere/authMiddleware");

// Toàn bộ chức năng chỉ dành cho vai trò DISTRIBUTOR
router.use(checkAuth, requireRole("DISTRIBUTOR"));

// 1. Tiếp nhận hàng từ cơ sở sơ chế
router.get("/tiep-nhan", nhaphanphoiController.getIncomingShipments);
router.put("/tiep-nhan/:maVanDon/xac-nhan", nhaphanphoiController.confirmReceive);
router.put("/tiep-nhan/:maVanDon/tu-choi", nhaphanphoiController.rejectReceive);

// 2. Kho hàng
router.get("/kho-hang", nhaphanphoiController.getInventory);

// 3. Phân phối cho đại lý
router.get("/xuat-kho", nhaphanphoiController.getDispatchOrders);
router.post("/xuat-kho", nhaphanphoiController.createDispatch);
router.get("/xuat-kho/:maPhieu", nhaphanphoiController.getDispatchDetail);
router.put("/xuat-kho/:maPhieu/xuat-kho", nhaphanphoiController.markDispatchShipped);
router.put("/xuat-kho/:maPhieu/da-giao", nhaphanphoiController.markDispatchDelivered);

// 4. Đại lý
router.get("/dai-ly", nhaphanphoiController.getDealers);
router.post("/dai-ly", nhaphanphoiController.createDealer);
router.put("/dai-ly/:maDaiLy", nhaphanphoiController.updateDealer);
router.put("/dai-ly/:maDaiLy/trang-thai", nhaphanphoiController.toggleDealerStatus);
router.get("/dai-ly/:maDaiLy/lich-su", nhaphanphoiController.getDealerHistory);

module.exports = router;
