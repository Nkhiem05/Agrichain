const express = require("express");
const router = express.Router();
const kiemdinhController = require("../controller/kiemdinhController");
const yeucauKiemdinhController = require("../controller/yeucauKiemdinhController");
const { checkAuth } = require("../midlewere/authMiddleware");

router.get("/", kiemdinhController.taidlyeucaukiemdinh);

// Nông dân gửi yêu cầu kiểm định (cần đăng nhập, danh tính lấy từ token)
router.get("/co-quan", checkAuth, yeucauKiemdinhController.getAuthorities);

router.get(
  "/yeu-cau/cua-toi",
  checkAuth,
  yeucauKiemdinhController.getMyRequests,
);

router.post("/yeu-cau", checkAuth, yeucauKiemdinhController.createRequest);

module.exports = router;
