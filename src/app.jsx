// src/routes/AppRoutes.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import DangNhap from "./view/dangnhap";
import Nongdan from "./view/page/nongdan/nongdan";
import Chitietnongtrai from "./view/page/nongdan/chitietnongtrai";
import Chitietmuavu from "./view/page/nongdan/chitietmuavu";
import Coquankiemdinh from "../src/view/page/kiemdinh/coquankiemdinh";
import ChiTietKiemDinh from "../src/view/page/kiemdinh/chitietkiemdinh";
import Donvivanchuyen from "../src/view/page/vanchuyen/donvivanchuyen";

const AppRoutes = () => {
  return (
    <Routes>
      {/* Đường dẫn mặc định: Trang Đăng Nhập */}
      <Route path="/dang-nhap" element={<DangNhap />} />

      {/* Đường dẫn xem giao diện Nông Dân */}
      <Route path="/nong-dan" element={<Nongdan />} />

      {/* Trang chi tiết nông trại */}
      <Route path="/chi-tiet-nong-trai" element={<Chitietnongtrai />} />

      {/* Trang chi tiết thu hoạch */}
      <Route path="/chi-tiet-mua-vu" element={<Chitietmuavu />} />

      {/* Trang cơ quan kiểm định */}
      <Route path="/co-quan-kiem-dinh" element={<Coquankiemdinh />} />

      {/* Trang cơ quan kiểm định */}
      <Route path="/chi-tiet-kiem-dinh" element={<ChiTietKiemDinh />} />

      {/* Trang cơ quan kiểm định */}
      <Route path="/van-chuyen" element={<Donvivanchuyen />} />

      {/* Điều hướng mặc định khi sai link */}
      <Route path="*" element={<Navigate to="/dang-nhap" replace />} />
    </Routes>
  );
};

export default AppRoutes;
