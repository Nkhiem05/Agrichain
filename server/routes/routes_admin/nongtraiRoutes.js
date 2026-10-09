const express = require("express");
const router = express.Router();

const nongtraiController = require("../../controller/controller_admin/nongtraiController");
const { checkAuth, requireRole } = require("../../midlewere/authMiddleware");

router.use(checkAuth, requireRole("ADMIN"));

router.get("/", nongtraiController.getFarms);
router.put("/:maNongTrai/khoa", nongtraiController.toggleFarmLock);

module.exports = router;
