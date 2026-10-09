const express = require("express");
const router = express.Router();

const taikhoanController = require("../../controller/controller_admin/taikhoanController");
const { checkAuth, requireRole } = require("../../midlewere/authMiddleware");

// Router này được mount ở gốc "/api/admin" (xem server.js) vì gồm 2 nhóm
// đường dẫn của cùng 1 trang "Tài khoản người dùng": tài khoản + đơn đăng ký.
router.use(checkAuth, requireRole("ADMIN"));

/*
==================================================
TÀI KHOẢN NGƯỜI DÙNG
==================================================
*/
router.get("/tai-khoan", taikhoanController.getAccounts);
router.post("/tai-khoan", taikhoanController.createAccount);
router.put("/tai-khoan/:maNguoiDung/khoa", taikhoanController.toggleAccountLock);
router.put(
  "/tai-khoan/:maNguoiDung/vai-tro",
  taikhoanController.changeAccountRole,
);

/*
==================================================
YÊU CẦU CẤP TÀI KHOẢN (đơn đăng ký chờ duyệt)
==================================================
*/
router.get("/yeu-cau-tai-khoan", taikhoanController.getAccountRequests);
router.put(
  "/yeu-cau-tai-khoan/:maYeuCau/duyet",
  taikhoanController.approveAccountRequest,
);
router.put(
  "/yeu-cau-tai-khoan/:maYeuCau/tu-choi",
  taikhoanController.rejectAccountRequest,
);

module.exports = router;
