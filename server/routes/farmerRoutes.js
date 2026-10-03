const express = require("express");
const multer = require("multer");
const path = require("path");

const router = express.Router();

const farmerController = require("../controller/farmerController");

/*
==================================================
UPLOAD ẢNH NÔNG TRẠI
==================================================
*/

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../upload/farms "));
  },

  filename: function (req, file, cb) {
    const fileName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, fileName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ cho phép JPG, PNG hoặc WEBP"), false);
  }
};

const uploadFarmImage = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter,
});

/*
==================================================
NGƯỜI QUẢN LÝ
==================================================
*/

router.get("/managers", farmerController.getManagers);

/*
==================================================
NÔNG TRẠI
==================================================
*/

router.get("/farms/user/:maNguoiDung", farmerController.getFarms);

router.get("/farm-detail/:maNongTrai", farmerController.getFarmDetail);

router.get("/farms/:maNongTrai", farmerController.getFarmById);

router.post(
  "/farms",
  uploadFarmImage.single("anh_nong_trai"),
  farmerController.createFarm,
);

router.put(
  "/farms/:maNongTrai",
  uploadFarmImage.single("anh_nong_trai"),
  farmerController.updateFarm,
);

router.delete("/farms/:maNongTrai", farmerController.deleteFarm);

/*
==================================================
THỬA ĐẤT
==================================================
*/

router.get("/plots/farm/:maNongTrai", farmerController.getPlots);

router.post("/plots", farmerController.createPlot);

router.put("/plots/:maThuaDat", farmerController.updatePlot);

router.delete("/plots/:maThuaDat", farmerController.deletePlot);

/*
==================================================
MÙA VỤ
==================================================
*/

router.get("/seasons/farm/:maNongTrai", farmerController.getSeasons);

router.get("/seasons/:maMuaVu", farmerController.getSeasonById);

router.post("/seasons", farmerController.createSeason);

router.put("/seasons/:maMuaVu", farmerController.updateSeason);

router.delete("/seasons/:maMuaVu", farmerController.deleteSeason);

/*
==================================================
LÔ NÔNG SẢN
==================================================
*/

router.get("/batches/user/:maNguoiDung", farmerController.getBatches);

router.get("/batches/:maLo", farmerController.getBatchById);

router.post("/batches", farmerController.createBatch);

router.put("/batches/:maLo", farmerController.updateBatch);

router.delete("/batches/:maLo", farmerController.deleteBatch);

module.exports = router;
