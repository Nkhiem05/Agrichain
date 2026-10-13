const express = require("express");
const router = express.Router();
const { getTraceDetail } = require("../controller/chitietuserController");

router.get("/:batchCode", getTraceDetail);

module.exports = router;
