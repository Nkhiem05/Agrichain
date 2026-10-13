const express = require("express");
const router = express.Router();
const donvivanchuyenController = require("../controller/donvivanchuyenController");
const { checkAuth, requireRole } = require("../midlewere/authMiddleware");

// Toàn bộ chức năng chỉ dành cho vai trò TRANSPORTER
router.use(checkAuth, requireRole("TRANSPORTER"));

router.get("/cua-toi", donvivanchuyenController.getMyTrips);
router.get("/:maVanDon", donvivanchuyenController.getTripById);
router.put("/:maVanDon/chap-nhan", donvivanchuyenController.acceptTrip);
router.put("/:maVanDon/tu-choi", donvivanchuyenController.rejectTrip);
router.put("/:maVanDon/lay-hang", donvivanchuyenController.confirmPickup);
router.put("/:maVanDon/den-noi", donvivanchuyenController.confirmArrival);

module.exports = router;
