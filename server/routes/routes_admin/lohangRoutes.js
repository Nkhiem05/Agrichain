const express = require("express");
const router = express.Router();

const lohangController = require("../../controller/controller_admin/lohangController");
const { checkAuth, requireRole } = require("../../midlewere/authMiddleware");

router.use(checkAuth, requireRole("ADMIN"));

router.get("/", lohangController.getBatches);

module.exports = router;
