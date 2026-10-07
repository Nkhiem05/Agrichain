const express = require("express");
const router = express.Router();
const lothuhoachController = require("../controller/lothuhoachController");

// 3 ô thống kê đầu trang
router.get("/thong-ke/user/:maNguoiDung", lothuhoachController.getBatchStats);

// Danh sách lô thu hoạch của nông dân (lọc theo ?ma_nong_trai=)
router.get("/user/:maNguoiDung", lothuhoachController.getBatches);

router.get("/:maLo", lothuhoachController.getBatchById);

router.post("/", lothuhoachController.createBatch);

router.put("/:maLo", lothuhoachController.updateBatch);

router.delete("/:maLo", lothuhoachController.deleteBatch);

module.exports = router;
