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

// Nhà phân phối
import Nhaphanphoi from "../src/view/page/nhaphanphoi/nhaphanphoi";
import Chitietphanphoi from "../src/view/page/nhaphanphoi/chitietphanphoi";

// Đại lý
import DaiLyPage from "./view/page/daily/daily";

// user
import User from "../src/view/page/user/user";
import Chitietuser from "../src/view/page/user/chitietuser";

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
      <Route path="/chi-tiet-so-che/:maSoChe" element={<Chitietsoche />} />

      {/*User */}
      <Route path="/user" element={<User />} />
      <Route path="/chi-tiet-user" element={<Chitietuser />} />

      {/*Admin*/}
      <Route path="/admin" element={<Admin />} />

      {/*Nhà phân phối*/}
      <Route path="/nha-phan-phoi" element={<Nhaphanphoi />} />
      <Route path="/chi-tiet-phan-phoi" element={<Chitietphanphoi />} />
      <Route path="/chi-tiet-phan-phoi/:maPhieu" element={<Chitietphanphoi />} />

      {/* Đại lý */}
      <Route path="/dai-ly" element={<DaiLyPage />} />

      {/*Profile*/}
      <Route path="/trang-ca-nhan" element={<Trangcanhan />} />

      {/* Điều hướng mặc định khi sai link */}
      <Route path="*" element={<Navigate to="/dang-nhap" replace />} />
    </Routes>
  );
};

export default AppRoutes;
