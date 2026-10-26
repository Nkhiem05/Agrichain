require("dotenv").config();
const express = require("express");
const blockchainRoutes = require("./routes/blockchainRoutes");

const configApp = require("./config/configApp");
require("./config/db"); // nạp file để kết nối MySQL khi khởi động

const authRoutes = require("./routes/authRoutes");
const farmerRoutes = require("./routes/farmerRoutes");
const registerRoutes = require("./routes/registerRoutes");
const kiemdinhRoutes = require("./routes/kiemdinhRoutes");
const kiemdinhvienRoutes = require("./routes/kiemdinhvienRoutes");
const chitietkiemdinhroutes = require("./routes/chitietkiemdinhroute");
const muavuRoutes = require("./routes/muavuRoutes");
const lothuhoachRoutes = require("./routes/lothuhoachRoutes");
const nongtraiRoutes = require("./routes/nongtraiRoutes");
const vanchuyenRoutes = require("./routes/vanchuyenRoutes");
const adminTongQuanRoutes = require("./routes/routes_admin/tongquanRoutes");
const adminNongTraiRoutes = require("./routes/routes_admin/nongtraiRoutes");
const adminTaiKhoanRoutes = require("./routes/routes_admin/taikhoanRoutes");
const adminDanhMucRoutes = require("./routes/routes_admin/danhmucRoutes");
const adminLoHangRoutes = require("./routes/routes_admin/lohangRoutes");
const adminKiemDinhThuHoiRoutes = require("./routes/routes_admin/kiemdinhthuhoiRoutes");
const adminVanChuyenRoutes = require("./routes/routes_admin/vanchuyenAdminRoutes");
const trangcanhanRoutes = require("./routes/trangcanhanRoutes");
const sochedonggoiRoutes = require("./routes/sochedonggoiRoutes");
const donvivanchuyenRoutes = require("./routes/donvivanchuyenRoutes");
const chitietuser = require("./routes/chitietuserRoute");
const nhaphanphoiRoutes = require("./routes/nhaphanphoiRoutes");

const app = express();
const port = process.env.PORT || 3000;

// Cài đặt chung: cors, json, ảnh
configApp(app);

// Test backend
app.get("/", (req, res) => {
  res.send("Backend Agrichain đang hoạt động!");
});

// Login
app.use("/api", authRoutes);

//resgister
app.use("/api/register", registerRoutes);

// Nông dân
app.use("/api/farmer", farmerRoutes);

//kiểm định
app.use("/api/kiem-dinh", kiemdinhRoutes);
app.use("/api/kiem-dinh-vien", kiemdinhvienRoutes);
app.use("/api/chi-tiet-kiem-dinh", chitietkiemdinhroutes);

// Mùa vụ
app.use("/api/mua-vu", muavuRoutes);

// Lô thu hoạch
app.use("/api/lo-thu-hoach", lothuhoachRoutes);

// Chi tiết nông trại
app.use("/api/nong-trai", nongtraiRoutes);

// Vận chuyển & bàn giao
app.use("/api/van-chuyen", vanchuyenRoutes);

// Quản trị hệ thống (admin) - mỗi trang 1 controller + routes riêng
app.use("/api/admin/tong-quan", adminTongQuanRoutes);
app.use("/api/admin/nong-trai", adminNongTraiRoutes);
app.use("/api/admin", adminTaiKhoanRoutes); // /tai-khoan... và /yeu-cau-tai-khoan...
app.use("/api/admin/danh-muc", adminDanhMucRoutes);
app.use("/api/admin/lo-hang", adminLoHangRoutes);
app.use("/api/admin/kiem-dinh", adminKiemDinhThuHoiRoutes);
app.use("/api/admin/van-chuyen", adminVanChuyenRoutes);

// Trang cá nhân (hồ sơ của tài khoản đang đăng nhập)
app.use("/api/trang-ca-nhan", trangcanhanRoutes);

// Cơ sở sơ chế / đóng gói
app.use("/api/so-che", sochedonggoiRoutes);

// Đơn vị vận chuyển (thao tác trên lệnh vận chuyển được chỉ định)
app.use("/api/don-vi-van-chuyen", donvivanchuyenRoutes);

// chi tiết user (quét mã qr)
app.use("/api/chi-tiet-user", chitietuser);
// Nhà phân phối (tiếp nhận, kho hàng, phân phối cho đại lý, quản lý đại lý)
app.use("/api/nha-phan-phoi", nhaphanphoiRoutes);
// Đại lý (RETAILER): nhận hàng từ nhà phân phối, xác nhận bán hết
app.use("/api/dai-ly", require("./routes/dailyRoutes"));

// Blockchain: liên kết ví, ký sự kiện truy xuất, xác thực lô hàng
app.use("/api/blockchain", blockchainRoutes);
app.listen(port, () => {
  console.log(`Server đang chạy tại http://localhost:${port}`);
  // Outbox worker: theo dõi giao dịch đã gửi và đối soát với chain (không ký thay ai)
  require("./services/blockchain/outboxWorker").batDau();
});
