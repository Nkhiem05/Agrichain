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

```text
Agrichain/
├── src/                        # Thư mục mã nguồn chính của ứng dụng
│   ├── config/                 # Cấu hình hệ thống (kết nối database, biến môi trường, thiết lập app)
│   ├── controller/             # Tiếp nhận request, điều phối logic và trả về response cho client
│   ├── midlewere/              # Các middleware xử lý trung gian (xác thực token, phân quyền, validate)
│   ├── migration/              # Quản lý lịch sử và các tệp tạo, thay đổi cấu trúc bảng cơ sở dữ liệu
│   ├── modal/                  # Định nghĩa mô hình dữ liệu (Models / Schemas) và tương tác trực tiếp với DB
│   ├── public/                 # Chứa các tài nguyên tĩnh truy cập công khai
│   │   ├── css/                # Các file định dạng giao diện tĩnh (CSS stylesheets)
│   │   └── js/                 # Các file kịch bản client-side thuần (JavaScript phía frontend)
│   ├── route/                  # Định nghĩa và phân luồng các tuyến đường dẫn API/URL của ứng dụng
│   ├── seeder/                 # Kịch bản chèn dữ liệu mẫu ban đầu vào cơ sở dữ liệu để kiểm thử
│   ├── services/               # Xử lý logic nghiệp vụ phức tạp, gọi API bên thứ 3 hoặc tương tác Web3/Smart Contract
│   └── view/                   # Chứa các template giao diện người dùng (giao diện hiển thị, views/components)
├── .env                        # Chứa biến môi trường nội bộ, khóa bí mật (không commit lên Git)
├── .env.example                # File cấu hình biến môi trường mẫu cho lập trình viên khác
├── index.html                  # File HTML gốc (entry point) của client
├── package.json                # Khai báo thông tin dự án, danh sách thư viện (dependencies) và script chạy
├── package-lock.json           # Khóa chi tiết phiên bản cây phụ thuộc của các gói thư viện
├── readme.md                   # Tài liệu hướng dẫn cài đặt, thiết lập và tổng quan dự án
├── server.js                   # Điểm khởi chạy chính của máy chủ backend (Node.js/Express)
└── vite.config.js              # Cấu hình trình đóng gói và môi trường phát triển Vite
```
