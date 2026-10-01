## Hướng Dẫn Cài Đặt Chi Tiết

1. **Cài đặt môi trường:** Tải và cài đặt Node.js (phiên bản LTS) tại [https://nodejs.org](https://nodejs.org). Kiểm tra cài đặt thành công qua terminal bằng hai lệnh: `node -v` và `npm -v`.

2. **Cài đặt toàn bộ thư viện chỉ bằng một lệnh:**
   Mở terminal (hoặc Command Prompt) tại thư mục chứa dự án và chạy:

   ```bash
   npm install react@^19.3.0 react-dom@^19.3.0 react-router-dom@^7.18.4 express@^5.2.1 dotenv@^18.0.4 nodemon@^3.1.14 && npm install -D vite@^8.3.1 @vitejs/plugin-react@^6.1.1
   ```

3. **setup script**
   mở file `Agrichain\package.json` tìm kiếm bằng từ khóa `script` thay sript cũ bằng
   ````json
   "scripts": {
   "test": "echo \"Error: no test specified\" && exit 1",
   "dev": "node src/server.js",
   "ui": "vite",
   "build": "vite build"
   },```
   ````
4. **chạy giao diện**
   mở terminal gõ `npm run ui` terminal sẽ trả về đường link copy link dán vào trình duyệt để mở giao diện

5. **cấu trúc file**
   ## Cấu trúc thư mục dự án

Agrichain/
├── server/ # Mã nguồn Backend (Node.js / Express)
│ ├── config/ # Cấu hình hệ thống, kết nối cơ sở dữ liệu, view engine
│ ├── controller/ # Tiếp nhận request từ client, điều phối dữ liệu và gọi service
│ ├── midlewere/ # Middleware xử lý trung gian (xác thực auth, phân quyền, CORS)
│ ├── migration/ # Quản lý phiên bản và tạo/sửa đổi bảng cơ sở dữ liệu
│ ├── modal/ # Định nghĩa schema / model dữ liệu (ORM/Database models)
│ ├── routes/ # Khai báo các đường dẫn API và gán tới controller tương ứng
│ ├── seeder/ # Dữ liệu mẫu (mock data) khởi tạo ban đầu cho database
│ ├── services/ # Xử lý logic nghiệp vụ chính (business logic, tương tác DB/Blockchain)
│ └── server.js # File khởi động server Express chính
│
├── src/ # Mã nguồn Frontend (React + Vite)
│ ├── api/ # Cấu hình gọi API Backend (Axios/Fetch instance, API endpoints)
│ ├── view/ # Toàn bộ giao diện người dùng
│ │ ├── css/ # Chứa các file stylesheet định dạng giao diện cho từng màn hình
│ │ └── page/ # Các trang giao diện phân theo từng actor/vai trò
│ │ ├── kiemdinh/ # Màn hình cho Cơ quan kiểm định chất lượng nông sản
│ │ ├── nguoidung/ # Màn hình tra cứu thông tin nguồn gốc cho Người tiêu dùng
│ │ ├── nongdan/ # Màn hình quản lý mùa vụ, nông trại, thu hoạch cho Nông dân
│ │ ├── quantrivien/ # Màn hình Quản trị viên hệ thống (Admin dashboard)
│ │ ├── sochedonggoi/ # Màn hình cho Cơ sở sơ chế, đóng gói sản phẩm
│ │ └── vanchuyen/ # Màn hình cho Đơn vị vận chuyển (quản lý lô hàng vận tải)
│ ├── app.jsx # Component gốc cấu hình Routes và layout chính
│ └── main.jsx # Điểm gắn kết React vào DOM index.html
│
├── package.json # Khai báo các thư viện phụ thuộc và scripts chạy dự án
└── vite.config.jsx # File cấu hình đóng gói và dev server của Vite
