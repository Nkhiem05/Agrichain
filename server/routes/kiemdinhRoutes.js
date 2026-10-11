const express = require("express");
const router = express.Router();
const kiemdinhController = require("../controller/kiemdinhController");
const yeucauKiemdinhController = require("../controller/yeucauKiemdinhController");
const { checkAuth } = require("../midlewere/authMiddleware");

// tải yêu cầu kiểm định
router.get("/data", kiemdinhController.taidlyeucaukiemdinh);
//chấp nhận yêu cầu kiểm định
router.post("/accept-authority", kiemdinhController.accepauthority);

//tải dữ liệu lịch hẹn và lấy mẫu
router.get(
  "/getSamplingScheduleList",
  kiemdinhController.getSamplingScheduleList,
);
// cập nhật lấy mẫu (pp lấy mẫu tình trạng mẫu qrseal)
router.post("/updatesampledetail", kiemdinhController.updateSampleDetail);
//lưu dữ liệu các chất được kiểm định
router.post("/save-indicators", kiemdinhController.saveTestIndicators);
//công bố kiểm định hoặc yêu cầu thu hồi
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

// Nông dân gửi yêu cầu kiểm định (cần đăng nhập, danh tính lấy từ token)
router.get("/co-quan", checkAuth, yeucauKiemdinhController.getAuthorities);
router.get(
  "/yeu-cau/cua-toi",
  checkAuth,
  yeucauKiemdinhController.getMyRequests,
);

// kiểm tra đăng nhập
router.post("/yeu-cau", checkAuth, yeucauKiemdinhController.createRequest);
module.exports = router;
