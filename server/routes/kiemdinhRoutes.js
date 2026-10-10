const express = require("express");
const router = express.Router();
const kiemdinhController = require("../controller/kiemdinhController");

router.get("/data", kiemdinhController.taidlyeucaukiemdinh);
router.post("/accept-authority", kiemdinhController.accepauthority);
router.get(
  "/getSamplingScheduleList",
  kiemdinhController.getSamplingScheduleList,
);
router.post("/updatesampledetail", kiemdinhController.updateSampleDetail);
router.post("/save-indicators", kiemdinhController.saveTestIndicators);
module.exports = router;
