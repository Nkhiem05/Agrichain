// src/routes/AppRoutes.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import DangNhap from "../view/dangnhap";
import Nongdan from "../view/nongdan";
import Chitietnongtrai from "../view/chitietnongtrai";
import Chitietthuhoach from "../view/chitietthuhoach";
import Coquankiemdinh from "../view/coquankiemdinh";
import ChiTietKiemDinh from "../view/chitietkiemdinh";
import Donvivanchuyen from "../view/donvivanchuyen";

const AppRoutes = () => {
  return (
    <Routes>
      {/* Đường dẫn mặc định: Trang Đăng Nhập */}
      <Route path="/" element={<DangNhap />} />

      {/* Đường dẫn xem giao diện Nông Dân */}
      <Route path="/nong-dan" element={<Nongdan />} />

      {/* Trang chi tiết nông trại */}
      <Route path="/chi-tiet-nong-trai" element={<Chitietnongtrai />} />

      {/* Trang chi tiết thu hoạch */}
      <Route path="/chi-tiet-thu-hoach" element={<Chitietthuhoach />} />

      {/* Trang cơ quan kiểm định */}
      <Route path="/co-quan-kiem-dinh" element={<Coquankiemdinh />} />

      {/* Trang cơ quan kiểm định */}
      <Route path="/chi-tiet-kiem-dinh" element={<ChiTietKiemDinh />} />

      {/* Trang cơ quan kiểm định */}
      <Route path="/van-chuyen" element={<Donvivanchuyen />} />

      {/* Điều hướng mặc định khi sai link */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
