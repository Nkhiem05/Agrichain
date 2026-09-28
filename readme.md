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
