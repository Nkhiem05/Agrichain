const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();
const muavuController = require("../controller/muavuController");

/*
==================================================
UPLOAD ẢNH MÙA VỤ
==================================================
*/

const SEASON_UPLOAD_DIR = path.join(__dirname, "../upload/seasons");
fs.mkdirSync(SEASON_UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, SEASON_UPLOAD_DIR);
  },

  filename: function (req, file, cb) {
    const fileName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname).toLowerCase();

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

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

// Trả lỗi upload (sai định dạng, quá 5MB) dạng JSON thay vì lỗi mặc định của Express
const uploadSeasonImage = (req, res, next) => {
  upload.single("anh_mua_vu")(req, res, (err) => {
    if (!err) return next();

    return res.status(400).json({
      success: false,
      message:
        err.code === "LIMIT_FILE_SIZE"
          ? "Ảnh không được vượt quá 5MB"
          : err.message,
    });
  });
};

// Danh mục phân bón / thuốc BVTV cho ô "Tên phân thuốc"
router.get("/vat-tu", muavuController.getMaterials);

// 3 ô thống kê đầu trang
router.get("/thong-ke/user/:maNguoiDung", muavuController.getSeasonStats);

// Danh sách mùa vụ của nông dân (lọc theo ?ma_nong_trai=&keyword=)
router.get("/user/:maNguoiDung", muavuController.getSeasons);

router.get("/:maMuaVu", muavuController.getSeasonById);

router.post("/", uploadSeasonImage, muavuController.createSeason);

router.put("/:maMuaVu", uploadSeasonImage, muavuController.updateSeason);

router.delete("/:maMuaVu", muavuController.deleteSeason);

module.exports = router;
