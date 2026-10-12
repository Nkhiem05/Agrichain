const express = require("express");
const router = express.Router();

const vanchuyenAdminController = require("../../controller/controller_admin/vanchuyenAdminController");
const { checkAuth, requireRole } = require("../../midlewere/authMiddleware");

router.use(checkAuth, requireRole("ADMIN"));

router.get("/", vanchuyenAdminController.getShipments);

module.exports = router;
