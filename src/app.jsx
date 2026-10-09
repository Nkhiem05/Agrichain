// src/routes/AppRoutes.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// đăng nhập
import DangNhap from "./view/page/dangnhap";
import Dangky from "./view/page/dangky";

//nông dân
import Nongdan from "./view/page/nongdan/nongdan";
import Chitietnongtrai from "./view/page/nongdan/chitietnongtrai";
import Chitietmuavu from "./view/page/nongdan/chitietmuavu";

//kiểm định
import Coquankiemdinh from "../src/view/page/kiemdinh/coquankiemdinh";
import ChiTietKiemDinh from "../src/view/page/kiemdinh/chitietkiemdinh";

// vận chuyển
import Donvivanchuyen from "../src/view/page/vanchuyen/donvivanchuyen";

// sơ chế
import Soche from "../src/view/page/sochedonggoi/soche";
import Chitietsoche from "../src/view/page/sochedonggoi/chitietsoche";

// profile
import Trangcanhan from "./view/page/trangcanhan";

// admin
import Admin from "../src/view/page/admin/admin";

// user
import User from "../src/view/page/user/user";

const AppRoutes = () => {
  return (
    <Routes>
      {/* Đăng nhập*/}
      <Route path="/dang-nhap" element={<DangNhap />} />
      <Route path="/dang-ky" element={<Dangky />} />

      {/* Nông Dân */}
      <Route path="/nong-dan" element={<Nongdan />} />
      <Route path="/chi-tiet-nong-trai" element={<Chitietnongtrai />} />
      <Route
        path="/chi-tiet-nong-trai/:maNongTrai"
        element={<Chitietnongtrai />}
      />
      <Route path="/chi-tiet-mua-vu" element={<Chitietmuavu />} />
      <Route path="/chi-tiet-mua-vu/:maMuaVu" element={<Chitietmuavu />} />

      {/*kiểm định */}
      <Route path="/kiem-dinh" element={<Coquankiemdinh />} />
      <Route path="/chi-tiet-kiem-dinh" element={<ChiTietKiemDinh />} />

      {/*Vận chuyển */}
      <Route path="/van-chuyen" element={<Donvivanchuyen />} />

      {/*Sơ chế*/}
      <Route path="/so-che" element={<Soche />} />
      <Route path="/chi-tiet-so-che" element={<Chitietsoche />} />

      {/*User */}
      <Route path="/user" element={<User />} />

      {/*Admin*/}
      <Route path="/admin" element={<Admin />} />

      {/*Profile*/}
      <Route path="/trang-ca-nhan" element={<Trangcanhan />} />

      {/* Điều hướng mặc định khi sai link */}
      <Route path="*" element={<Navigate to="/dang-nhap" replace />} />
    </Routes>
  );
};

export default AppRoutes;
