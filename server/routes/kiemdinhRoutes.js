const express = require("express");
const router = express.Router();
const kiemdinhController = require("../controller/kiemdinhController");

router.get("/", kiemdinhController.taidlyeucaukiemdinh);

module.exports = router;
