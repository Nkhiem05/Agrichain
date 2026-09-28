import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Import 2 trang giao diện của bạn (chỉnh lại đường dẫn nếu tên thư mục của bạn khác)
import LoginPage from "../../view/dangnhap";
import DashboardPage from "../../view/nongdan";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Đường dẫn mặc định: Trang Đăng Nhập */}
        <Route path="/" element={<LoginPage />} />

        {/* Đường dẫn xem giao diện Nông Dân */}
        <Route path="/nong-dan" element={<DashboardPage />} />

        {/* Nếu gõ đường dẫn lạ, tự động chuyển về trang đăng nhập */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
