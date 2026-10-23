const express = require("express");
const router = express.Router();
const blockchainController = require("../controller/blockchainController");
const { checkAuth, requireRole } = require("../midlewere/authMiddleware");

// Công khai: cấu hình mạng và xác thực lô cho người tiêu dùng
router.get("/cau-hinh", blockchainController.layCauHinhCongKhai);
router.get("/xac-thuc/:maLo", blockchainController.xacThucLo);

router.use(checkAuth);

// Ví của người dùng đang đăng nhập
router.get("/vi", blockchainController.viCuaToi);
router.post("/vi/nonce", blockchainController.taoNonce);
router.post("/vi/lien-ket", blockchainController.lienKetVi);

// Sự kiện chờ ký lên blockchain
router.get("/cho-ky", blockchainController.choKy);
router.post("/su-kien/:maLichSu/xac-nhan", blockchainController.xacNhanSuKien);

// Quản trị viên duyệt vai trò của ví
router.get(
  "/admin/vi-cho-duyet",
  requireRole("ADMIN"),
  blockchainController.danhSachViChoDuyet,
);
router.post(
  "/admin/vi/:diaChi/duyet",
  requireRole("ADMIN"),
  blockchainController.duyetVi,
);
router.post(
  "/admin/vi/:diaChi/tu-choi",
  requireRole("ADMIN"),
  blockchainController.tuChoiVi,
);

module.exports = router;
