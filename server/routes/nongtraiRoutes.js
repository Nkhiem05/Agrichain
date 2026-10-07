const express = require("express");
const router = express.Router();
const nongtraiController = require("../controller/nongtraiController");

// Trang chi tiết nông trại: thông tin nông trại + danh sách thửa đất
router.get("/:maNongTrai/chi-tiet", nongtraiController.getFarmDetail);

// Thêm thửa đất (có thể bắt đầu canh tác luôn)
router.post("/:maNongTrai/thua-dat", nongtraiController.createPlot);

// Sửa / xóa thửa đất
router.put("/:maNongTrai/thua-dat/:maThuaDat", nongtraiController.updatePlot);

router.delete(
  "/:maNongTrai/thua-dat/:maThuaDat",
  nongtraiController.deletePlot,
);

module.exports = router;
