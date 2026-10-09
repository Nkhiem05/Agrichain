const express = require("express");
const router = express.Router();

const tongquanController = require("../../controller/controller_admin/tongquanController");
const { checkAuth, requireRole } = require("../../midlewere/authMiddleware");

router.use(checkAuth, requireRole("ADMIN"));

router.get("/", tongquanController.getOverview);

module.exports = router;
