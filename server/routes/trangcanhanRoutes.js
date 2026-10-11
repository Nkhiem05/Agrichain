const express = require("express");
const multer = require("multer");
const path = require("path");

const router = express.Router();

const trangcanhanController = require("../controller/trangcanhanController");
const { checkAuth } = require("../midlewere/authMiddleware");

/*
==================================================
UPLOAD ẢNH ĐẠI DIỆN
==================================================
*/

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../upload/avatars"));
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

const uploadAvatar = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

// Mọi tài khoản đã đăng nhập đều xem/sửa được hồ sơ của chính mình
router.use(checkAuth);

router.get("/", trangcanhanController.getProfile);
router.put(
  "/",
  uploadAvatar.single("anh_dai_dien"),
  trangcanhanController.updateProfile,
);

module.exports = router;
