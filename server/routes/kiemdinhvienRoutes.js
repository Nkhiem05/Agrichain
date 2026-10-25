const express = require("express");
const router = express.Router();
const kiemdinhvienController = require("../controller/kiemdinhvienController");
const { checkAuth, requireRole } = require("../midlewere/authMiddleware");

// Chỉ cơ quan kiểm định mới quản lý kiểm định viên của chính mình
router.use(checkAuth, requireRole("CERT_AUTHORITY"));

router.get("/", kiemdinhvienController.getInspectors);
router.post("/", kiemdinhvienController.createInspector);
router.put("/:id", kiemdinhvienController.updateInspector);
router.put("/:id/trang-thai", kiemdinhvienController.setInspectorStatus);

module.exports = router;
