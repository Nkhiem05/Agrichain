const express = require("express");
const router = express.Router();
const userController = require("../controller/chitietuserController");

router.get("/", userController.getChiTietKiemDinh);

module.exports = router;
