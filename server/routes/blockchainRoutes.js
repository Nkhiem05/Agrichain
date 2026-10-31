const express = require("express");
const router = express.Router();
const blockchainController = require("../controller/blockchainController");
const quanTri = require("../controller/blockchainQuanTriController");
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
router.get("/lich-su-ky", blockchainController.lichSuDaKy);
router.post("/su-kien/:maLichSu/da-gui", blockchainController.daGuiSuKien);
router.post("/su-kien/:maLichSu/xac-nhan", blockchainController.xacNhanSuKien);

// Quản trị viên duyệt vai trò của ví
router.get(
  "/admin/vi-cho-duyet",
  requireRole("ADMIN"),
  blockchainController.danhSachViChoDuyet,
);
router.get("/admin/vi", requireRole("ADMIN"), blockchainController.danhSachVi);
router.post(
  "/admin/vi/dong-bo-vai-tro",
  requireRole("ADMIN"),
  blockchainController.dongBoVaiTro,
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

// Quản trị viên ghi bộ ngưỡng kiểm định lên blockchain (setThreshold)
router.get("/admin/nguong", requireRole("ADMIN"), blockchainController.thongTinNguong);
router.post(
  "/admin/nguong/xac-nhan",
  requireRole("ADMIN"),
  blockchainController.xacNhanNguong,
);

// Hàng chờ ghi blockchain (Outbox) và worker đối soát
router.get("/admin/outbox", requireRole("ADMIN"), blockchainController.thongTinOutbox);
router.post("/admin/outbox/chay", requireRole("ADMIN"), blockchainController.chayOutboxNgay);

// Đối soát toàn bộ lô với chain (tab "Nhật ký & toàn vẹn" của admin)
router.get("/admin/doi-soat", requireRole("ADMIN"), blockchainController.thongTinDoiSoat);
router.post("/admin/doi-soat/chay", requireRole("ADMIN"), blockchainController.chayDoiSoat);

// Gỡ lô kẹt: xem lô đang chờ ký + chẩn đoán, cho ký lại, hủy yêu cầu bỏ dở
router.get("/admin/lo-ket", requireRole("ADMIN"), quanTri.danhSachLoKet);
router.post("/admin/lo-ket/su-kien/:maLichSu/dat-lai", requireRole("ADMIN"), quanTri.datLaiSuKien);
router.post("/admin/lo-ket/su-kien/:maLichSu/huy", requireRole("ADMIN"), quanTri.huySuKien);

// Đổi ví người dùng: kiểm tra việc dang dở rồi gỡ liên kết để họ liên kết ví mới
router.get("/admin/doi-vi", requireRole("ADMIN"), quanTri.danhSachViDoiDuoc);
router.get("/admin/doi-vi/:maNguoiDung", requireRole("ADMIN"), quanTri.kiemTraDoiVi);
router.post("/admin/doi-vi/:maNguoiDung/go", requireRole("ADMIN"), quanTri.goLienKetVi);

module.exports = router;
