const express = require("express");
const router = express.Router();
const kiemdinhController = require("../controller/kiemdinhController");

router.get("/data", kiemdinhController.taidlyeucaukiemdinh);
router.post("/accept-authority", kiemdinhController.accepauthority);

module.exports = router;
