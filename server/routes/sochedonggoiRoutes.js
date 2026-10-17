const express = require("express");
const router = express.Router();
const sochedonggoiController = require("../controller/sochedonggoiController");
const { checkAuth, requireRole } = require("../midlewere/authMiddleware");

// Toàn bộ chức năng chỉ dành cho vai trò PROCESSOR
router.use(checkAuth, requireRole("PROCESSOR"));

// 1. Tiếp nhận lô nông sản
router.get("/tiep-nhan", sochedonggoiController.getIncomingShipments);
router.put("/tiep-nhan/:maVanDon/xac-nhan", sochedonggoiController.confirmReceive);
router.put("/tiep-nhan/:maVanDon/tu-choi", sochedonggoiController.rejectReceive);

// 2. Sơ chế & đóng gói
router.get("/lo-kha-dung", sochedonggoiController.getAvailableRawLots);
router.get("/so-che", sochedonggoiController.getProcessingBatches);
router.post("/so-che", sochedonggoiController.createProcessingBatch);
router.get("/so-che/:maSoChe/chi-tiet", sochedonggoiController.getBatchDetail);
router.put("/so-che/:maSoChe/giai-doan", sochedonggoiController.updateProcessingStage);
router.put("/so-che/:maSoChe", sochedonggoiController.updateProcessingBatch);
router.delete("/so-che/:maSoChe", sochedonggoiController.deleteProcessingBatch);

// 3. Tách / gộp lô
router.get("/tach-gop/lo-kha-dung", sochedonggoiController.getSplitMergeLots);
router.get("/tach-gop", sochedonggoiController.getSplitMergeLog);
router.post("/tach-gop/tach", sochedonggoiController.splitBatch);
router.post("/tach-gop/gop", sochedonggoiController.mergeBatch);

// 4. Bàn giao vận chuyển
router.get("/san-sang-ban-giao", sochedonggoiController.getReadyToShip);
router.get("/don-vi-van-chuyen", sochedonggoiController.getTransporters);
router.get("/nha-phan-phoi", sochedonggoiController.getDistributors);
router.get("/ban-giao", sochedonggoiController.getShipments);
router.get("/ban-giao/:maVanDon", sochedonggoiController.getShipmentById);
router.post("/ban-giao", sochedonggoiController.createShipment);

module.exports = router;
