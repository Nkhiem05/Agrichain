const express = require("express");
const router = express.Router();
const donvivanchuyenController = require("../controller/donvivanchuyenController");
const { checkAuth, requireRole } = require("../midlewere/authMiddleware");

// Toàn bộ chức năng chỉ dành cho vai trò TRANSPORTER
router.use(checkAuth, requireRole("TRANSPORTER"));

router.get("/cua-toi", donvivanchuyenController.getMyTrips);

// Quản lý tài xế & phương tiện của đơn vị (đặt trước các route /:maVanDon)
router.get("/tai-xe", donvivanchuyenController.getDrivers);
router.post("/tai-xe", donvivanchuyenController.createDriver);
router.put("/tai-xe/:maTaiXe", donvivanchuyenController.updateDriver);
router.delete("/tai-xe/:maTaiXe", donvivanchuyenController.deleteDriver);
router.get("/phuong-tien", donvivanchuyenController.getVehicles);
router.post("/phuong-tien", donvivanchuyenController.createVehicle);
router.put(
  "/phuong-tien/:maPhuongTien",
  donvivanchuyenController.updateVehicle,
);
router.delete(
  "/phuong-tien/:maPhuongTien",
  donvivanchuyenController.deleteVehicle,
);

router.get("/:maVanDon", donvivanchuyenController.getTripById);
router.put("/:maVanDon/chap-nhan", donvivanchuyenController.acceptTrip);
router.put("/:maVanDon/tu-choi", donvivanchuyenController.rejectTrip);
router.put("/:maVanDon/lay-hang", donvivanchuyenController.confirmPickup);
router.put("/:maVanDon/den-noi", donvivanchuyenController.confirmArrival);

module.exports = router;
