import React from "react";
import "../public/css/dangnhap.css";
import { useNavigate } from "react-router-dom";

// Đổi đường dẫn ảnh máy cày và logo tại đây
const FARM_BG_IMAGE =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790604174/bc300a15ff78093fb0042758aec26846_ldrct6.jpg";
const LOGO_IMAGE =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790603730/logo_hvpizf.png";

const LoginPage = () => {
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // Chuyển thẳng sang trang nông dân khi bấm nút
    navigate("/nong-dan");
  };

  // ... giữ nguyên phần còn lại

  return (
    <div className="login-wrapper">
      <div className="login-container">
        {/* Nửa bên trái: Ảnh nền, Lớp phủ mờ (Overlay) và Logo */}
        <div className="login-left">
          {/* Ảnh nền */}
          <img
            src={FARM_BG_IMAGE}
            alt="Farm Background"
            className="login-bg-img"
          />

          {/* Lớp phủ làm tối dần về đáy */}
          <div className="login-overlay"></div>

          {/* Khối thương hiệu */}
          <div className="login-brand">
            <img
              src={LOGO_IMAGE}
              alt="Agrichain Logo"
              className="brand-logo-img"
            />
            <div className="brand-title">AGRICHAIN</div>
            <div className="brand-subtitle">
              Truy Xuất nguồn gốc nông sản
              <br />
              minh bạch từ nông trại đến bàn ăn
            </div>
          </div>
        </div>

        {/* Nửa bên phải: Form đăng nhập */}
        <div className="login-right">
          <h2 className="login-title">Đăng Nhập</h2>

          <div className="social-login">
            <button type="button" className="btn-social">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                alt="Google"
                className="google-icon"
              />
              Google
            </button>
            <button type="button" className="btn-social">
              {/* Nút phụ trống theo mẫu */}
            </button>
          </div>

          <div className="divider">Hoặc</div>

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label>Tên đăng nhập hoặc email</label>
              <input type="text" placeholder="VD: Agri0101 ..." />
            </div>

            <div className="input-group">
              <label>Mật khẩu</label>
              <input type="password" placeholder="Nhập mật khẩu của bạn ..." />
              <a href="#" className="forgot-password">
                Quên mật khẩu
              </a>
            </div>

            <button type="submit" className="btn-submit">
              Đăng Nhập
            </button>
          </form>

          <div className="register-link">
            Chưa có tài khoản? <a href="#">yêu cầu cấp tài khoản</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
