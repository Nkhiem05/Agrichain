const express = require("express");
const router = express.Router();
const kiemdinhController = require("../controller/kiemdinhController");
const yeucauKiemdinhController = require("../controller/yeucauKiemdinhController");
const { checkAuth } = require("../midlewere/authMiddleware");

// Tải yêu cầu kiểm định
router.get("/data", kiemdinhController.taidlyeucaukiemdinh);

// Chấp nhận yêu cầu kiểm định
router.post("/accept-authority", kiemdinhController.accepauthority);

// Tải dữ liệu lịch hẹn và lấy mẫu
router.get(
  "/getSamplingScheduleList",
  kiemdinhController.getSamplingScheduleList,
);

// Cập nhật lấy mẫu (pp lấy mẫu, tình trạng mẫu, qrseal)
router.post("/updatesampledetail", kiemdinhController.updateSampleDetail);

// Tải danh sách ngưỡng kiểm định chuẩn để render form
router.get("/nguong-kiem-dinh", kiemdinhController.getNguongKiemDinh);

// Lưu dữ liệu các chất được kiểm định (Xóa cũ & Insert mới)
router.post("/save-indicators", kiemdinhController.saveTestIndicators);

// Công bố kiểm định hoặc yêu cầu thu hồi
router.post(
  "/updateInspectionStatus",
  kiemdinhController.updateInspectionStatus,
);

// Tải danh sách lô hàng đã công bố chứng nhận
router.get(
  "/published-certificates",
  kiemdinhController.getPublishedCertificates,
);

// Tải danh sách lô hàng bị đình chỉ / thu hồi
router.get("/revoked-certificates", kiemdinhController.getRevokedCertificates);

// Nông dân gửi yêu cầu kiểm định
router.get("/co-quan", checkAuth, yeucauKiemdinhController.getAuthorities);
router.get(
  "/yeu-cau/cua-toi",
  checkAuth,
  yeucauKiemdinhController.getMyRequests,
);
router.post("/yeu-cau", checkAuth, yeucauKiemdinhController.createRequest);

module.exports = router;
