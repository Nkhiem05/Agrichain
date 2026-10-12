const express = require("express");
const router = express.Router();
const kiemdinhController = require("../controller/kiemdinhController");
const yeucauKiemdinhController = require("../controller/yeucauKiemdinhController");
const { checkAuth } = require("../midlewere/authMiddleware");

router.get("/data", kiemdinhController.taidlyeucaukiemdinh);
router.post("/accept-authority", kiemdinhController.accepauthority);
router.get(
  "/getSamplingScheduleList",
  kiemdinhController.getSamplingScheduleList,
);
router.post("/updatesampledetail", kiemdinhController.updateSampleDetail);
router.post("/save-indicators", kiemdinhController.saveTestIndicators);


router.get("/co-quan", checkAuth, yeucauKiemdinhController.getAuthorities);

router.get(
  "/yeu-cau/cua-toi",
  checkAuth,
  yeucauKiemdinhController.getMyRequests,
);

router.post("/yeu-cau", checkAuth, yeucauKiemdinhController.createRequest);

module.exports = router;