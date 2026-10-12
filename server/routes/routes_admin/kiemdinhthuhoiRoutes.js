const express = require("express");
const router = express.Router();

const kiemdinhthuhoiController = require("../../controller/controller_admin/kiemdinhthuhoiController");
const { checkAuth, requireRole } = require("../../midlewere/authMiddleware");

router.use(checkAuth, requireRole("ADMIN"));

router.get("/", kiemdinhthuhoiController.getInspections);
router.put("/:maKiemDinh/thu-hoi", kiemdinhthuhoiController.recallInspection);

module.exports = router;
