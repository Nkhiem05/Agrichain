import React, { useState } from "react";
import "../css/dangnhap.css";
import { useNavigate } from "react-router-dom";

// Ảnh nền và logo
const FARM_BG_IMAGE =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790604174/bc300a15ff78093fb0042758aec26846_ldrct6.jpg";

const LOGO_IMAGE =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png";

const LoginPage = () => {
  const navigate = useNavigate();

  // Biến lưu dữ liệu người dùng nhập
  const [tenDangNhap, setTenDangNhap] = useState("");
  const [matKhau, setMatKhau] = useState("");

  // Biến hiển thị lỗi và trạng thái đang đăng nhập
  const [loi, setLoi] = useState("");
  const [dangTai, setDangTai] = useState(false);

  // Hàm xử lý đăng nhập
  const handleLogin = async (e) => {
    e.preventDefault();

    setLoi("");

    // Kiểm tra người dùng đã nhập đủ chưa
    if (!tenDangNhap.trim() || !matKhau) {
      setLoi("Vui lòng nhập tên đăng nhập và mật khẩu");
      return;
    }

    setDangTai(true);

    try {
      // Gửi thông tin đăng nhập sang backend
      const response = await fetch("http://localhost:3000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          ten_dang_nhap: tenDangNhap,
          mat_khau: matKhau,
        }),
      });

      // Tìm đến đoạn này trong hàm handleLogin:
      const data = await response.json();

      if (!response.ok) {
        setLoi(data.message || "Đăng nhập thất bại");
        return;
      }
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      console.log("Đăng nhập thành công:", data.user);

      // Điều hướng dựa theo vai trò
      switch (data.user.vai_tro) {
        case "FARMER_COOP":
          navigate("/nong-dan");
          break;

        case "TRANSPORTER":
          navigate("/van-chuyen");
          break;

        case "CERT_AUTHORITY":
          navigate("/co-quan-kiem-dinh");
          break;

        case "ADMIN":
          navigate("/admin");
          break;

        case "PROCESSOR":
          alert("Đăng nhập cơ sở sơ chế thành công");
          break;

        case "DISTRIBUTOR":
          alert("Đăng nhập đơn vị phân phối thành công");
          break;

        case "CONSUMER":
          alert("Đăng nhập người tiêu dùng thành công");
          break;

        default:
          alert("Đăng nhập thành công");
      }
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);

      setLoi(
        "Không thể kết nối tới máy chủ. Vui lòng kiểm tra backend có đang chạy không.",
      );
    } finally {
      setDangTai(false);
    }
  };

  const handleresgister = (e) => {
    e.preventDefault();
    navigate("/dang-ky");
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
        {/* Nửa bên trái */}
        <div className="login-left">
          <img
            src={FARM_BG_IMAGE}
            alt="Farm Background"
            className="login-bg-img"
          />

          <div className="login-overlay"></div>

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

        {/* Nửa bên phải */}
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
              {/* Nút phụ trống theo giao diện cũ */}
            </button>
          </div>

          <div className="divider">Hoặc</div>

          <form onSubmit={handleLogin}>
            {/* Tên đăng nhập */}
            <div className="input-group">
              <label>Tên đăng nhập hoặc email</label>

              <input
                type="text"
                placeholder="VD: Agri0101 ..."
                value={tenDangNhap}
                onChange={(e) => setTenDangNhap(e.target.value)}
                disabled={dangTai}
              />
            </div>

            {/* Mật khẩu */}
            <div className="input-group">
              <label>Mật khẩu</label>

              <input
                type="password"
                placeholder="Nhập mật khẩu của bạn ..."
                value={matKhau}
                onChange={(e) => setMatKhau(e.target.value)}
                disabled={dangTai}
              />

              <a
                href="#"
                className="forgot-password"
                onClick={(e) => e.preventDefault()}
              >
                Quên mật khẩu
              </a>
            </div>

            {/* Thông báo lỗi */}
            {loi && (
              <div
                style={{
                  color: "red",
                  marginBottom: "15px",
                  fontSize: "14px",
                }}
              >
                {loi}
              </div>
            )}

            {/* Nút đăng nhập */}
            <button type="submit" className="btn-submit" disabled={dangTai}>
              {dangTai ? "Đang đăng nhập..." : "Đăng Nhập"}
            </button>
          </form>

          <div className="register-link">
            Chưa có tài khoản?{" "}
            <a href="#" onClick={handleresgister}>
              yêu cầu cấp tài khoản
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
