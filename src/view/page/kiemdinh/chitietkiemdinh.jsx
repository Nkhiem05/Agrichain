import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../css/chitietkiemdinh.css";

const DEFAULT_LOGO_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png";

// ================= ICONS SVG THUẦN =================
const IconSvg = ({ size = 20, color = "currentColor", children }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    {children}
  </svg>
);

const ArrowLeftIcon = (props) => (
  <IconSvg {...props}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </IconSvg>
);

const BadgeCheckIcon = (props) => (
  <IconSvg {...props}>
    <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
    <path d="m9 12 2 2 4-4" />
  </IconSvg>
);

const DownloadIcon = (props) => (
  <IconSvg {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="12" x2="12" y2="3" />
  </IconSvg>
);

const FileTextIcon = (props) => (
  <IconSvg {...props}>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M10 9H8" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
  </IconSvg>
);

const ShieldCheckIcon = (props) => (
  <IconSvg {...props}>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </IconSvg>
);

const ClockIcon = (props) => (
  <IconSvg {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </IconSvg>
);

const ChiTietKiemDinh = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Nhận dữ liệu truyền qua state (hoặc fallback mặc định)
  const certCode = location.state?.id || "VG-2026-8812";
  const batchCode = location.state?.batch || "#LH-8821";

  return (
    <div className="detail-layout">
      {/* 1. HEADER CHUẨN ĐỒNG NHẤT */}
      <header className="dashboard-header">
        <div className="header-left">
          <img src={DEFAULT_LOGO_IMG} alt="Logo" className="header-logo-icon" />
          <span className="header-brand-title">AGRICHAIN</span>
        </div>

        <div className="header-search-bar">
          <input type="text" placeholder="Tìm kiếm chứng nhận, hồ sơ..." />
        </div>

        <div className="header-profile">
          <div className="avatar-circle">KD</div>
          <div className="profile-meta">
            <span className="profile-name">
              Trung Tâm Giám Định Nông Nghiệp Vùng 2
            </span>
            <span className="profile-role">Cơ quan kiểm định & Chứng nhận</span>
          </div>
        </div>
      </header>

      {/* 2. NỘI DUNG CHI TIẾT */}
      <div className="detail-content-area">
        <div className="detail-container">
          {/* THANH ĐIỀU HƯỚNG QUAY LẠI */}
          <div className="detail-top-nav">
            <button onClick={() => navigate(-1)} className="btn-back">
              <ArrowLeftIcon size={16} />
              <span>Quay lại danh sách</span>
            </button>
            <div className="detail-actions-right">
              <button
                onClick={() => alert("Đang in biên bản & chứng thư số...")}
                className="btn-print"
              >
                <DownloadIcon size={16} />
                <span>Tải Chứng Thư PDF</span>
              </button>
            </div>
          </div>

          {/* BANNER THÔNG TIN CHỨNG NHẬN */}
          <div className="cert-header-card">
            <div className="cert-header-left">
              <div className="cert-stamp">
                <BadgeCheckIcon size={44} />
              </div>
              <div className="cert-main-info">
                <div className="cert-badge-row">
                  <span className="badge-tag-pass">ĐẠT CHUẨN</span>
                  <span className="badge-tag-code">Số CN: {certCode}</span>
                  <span style={{ fontSize: 13, color: "#6b7280" }}>
                    Tiêu chuẩn: <b>VietGAP Trồng trọt</b>
                  </span>
                </div>
                <h1 className="cert-title">
                  Hồ Sơ Chứng Nhận: Quýt Đường Trà Vinh ({batchCode})
                </h1>
                <p className="cert-sub">
                  Đơn vị sản xuất: <b>HTX Bưởi & Cam Bình Minh</b> | Mã vùng
                  trồng: <b>#FARM-01111</b>
                </p>
              </div>
            </div>
          </div>

          {/* GRID BẢNG CHỈ SỐ VÀ BLOCKCHAIN TRACE */}
          <div className="detail-grid">
            {/* CỘT TRÁI: KẾT QUẢ XÉT NGHIỆM CHI TIẾT */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              <div className="info-section-card">
                <h3 className="section-card-title">
                  <FileTextIcon size={18} color="#059669" />
                  <span>
                    Bảng Phân Tích Chỉ Số Hóa Sinh Phòng Lab (Trung Tâm Vùng 2)
                  </span>
                </h3>
                <table className="detail-table">
                  <thead>
                    <tr>
                      <th>Hạng mục kiểm nghiệm</th>
                      <th>Phương pháp thử</th>
                      <th>Kết quả đo</th>
                      <th>Ngưỡng tiêu chuẩn</th>
                      <th>Đánh giá</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <b>Dư lượng hoạt chất BVTV</b>
                      </td>
                      <td>TCVN 10780:2015</td>
                      <td className="val-safe">Âm tính</td>
                      <td>Không phát hiện (&lt; 0.01 mg/kg)</td>
                      <td>
                        <span className="status-text-pass">Đạt</span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <b>Kim loại nặng (Chì - Pb)</b>
                      </td>
                      <td>AOAC 2015.01</td>
                      <td className="val-safe">0.02 mg/kg</td>
                      <td>&le; 0.1 mg/kg</td>
                      <td>
                        <span className="status-text-pass">Đạt</span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <b>Kim loại nặng (Cadimi - Cd)</b>
                      </td>
                      <td>AOAC 2015.01</td>
                      <td className="val-safe">Không phát hiện</td>
                      <td>&le; 0.05 mg/kg</td>
                      <td>
                        <span className="status-text-pass">Đạt</span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <b>Vi sinh vật (E.coli)</b>
                      </td>
                      <td>ISO 16649-2</td>
                      <td className="val-safe">0 CFU/g</td>
                      <td>&le; 10 CFU/g</td>
                      <td>
                        <span className="status-text-pass">Đạt</span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <b>Hàm lượng Nitrate (NO3-)</b>
                      </td>
                      <td>TCVN 5247:1990</td>
                      <td className="val-safe">18.5 mg/kg</td>
                      <td>&le; 150 mg/kg</td>
                      <td>
                        <span className="status-text-pass">Đạt</span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <b>Độ ngọt cảm quan (Brix)</b>
                      </td>
                      <td>Khúc xạ kế quang</td>
                      <td style={{ fontWeight: 700 }}>11.8 Brix</td>
                      <td>&ge; 10 Brix</td>
                      <td>
                        <span className="status-text-pass">Tốt</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* THÔNG TIN NIÊM PHONG LẤY MẪU */}
              <div className="info-section-card">
                <h3 className="section-card-title">
                  <ShieldCheckIcon size={18} color="#059669" />
                  <span>Biên Bản Lấy Mẫu & Niêm Phong Thực Địa</span>
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "14px",
                    fontSize: 13,
                  }}
                >
                  <p>
                    Mã mẫu phòng Lab: <b>#MAU-2026-08</b>
                  </p>
                  <p>
                    Mã Seal niêm phong:{" "}
                    <b style={{ fontFamily: "monospace" }}>SEAL-QR-77192</b>
                  </p>
                  <p>
                    Khối lượng mẫu lưu: <b>3.5 kg (12 quả ngẫu nhiên)</b>
                  </p>
                  <p>
                    Kiểm định viên lấy mẫu: <b>KS. Trần Minh Tuấn</b>
                  </p>
                  <p>
                    Địa điểm lấy mẫu: <b>Thửa A1-1, Ấp Bình Hòa, Trà Vinh</b>
                  </p>
                  <p>
                    Tình trạng mẫu khi nhập kho:{" "}
                    <b>Đạt chuẩn cảm quan, tem seal nguyên vẹn</b>
                  </p>
                </div>
              </div>
            </div>

            {/* CỘT PHẢI: XÁC THỰC SMART CONTRACT & TIẾN ĐỘ */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              {/* BLOCKCHAIN CERT */}
              <div className="info-section-card">
                <h3 className="section-card-title">
                  <span>Tem Truy Xuất Nguồn Gốc</span>
                </h3>
                <div className="qr-preview-box">
                  <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://agrichain.vn/verify/VG-2026-8812"
                    alt="QR Code"
                    className="qr-box-img"
                  />
                  <p style={{ fontSize: 12, color: "#4b5563" }}>
                    Quét để xác thực trực tiếp trên AgriChain Mainnet
                  </p>
                  <div className="tx-hash-badge">0x7c49f821b03e...a381e9b2</div>
                </div>
              </div>

              {/* TIMELINE CÁC BƯỚC */}
              <div className="info-section-card">
                <h3 className="section-card-title">
                  <ClockIcon size={18} color="#059669" />
                  <span>Lịch Sử Kiểm Định</span>
                </h3>
                <div className="timeline-list">
                  <div className="timeline-item">
                    <span className="timeline-dot"></span>
                    <span className="timeline-item-title">
                      Đã cấp chứng nhận & băm Hash lên chuỗi
                    </span>
                    <span className="timeline-item-time">
                      30/09/2026 - 15:45
                    </span>
                    <p className="timeline-item-desc">
                      Đã kích hoạt tem số VietGAP có hiệu lực 12 tháng.
                    </p>
                  </div>

                  <div className="timeline-item">
                    <span className="timeline-dot"></span>
                    <span className="timeline-item-title">
                      Phòng Lab hoàn tất kiểm nghiệm hóa sinh
                    </span>
                    <span className="timeline-item-time">
                      30/09/2026 - 10:15
                    </span>
                    <p className="timeline-item-desc">
                      Các chỉ tiêu đều nằm dưới ngưỡng an toàn tối đa.
                    </p>
                  </div>

                  <div className="timeline-item">
                    <span className="timeline-dot"></span>
                    <span className="timeline-item-title">
                      Kiểm định viên lấy mẫu tại vườn
                    </span>
                    <span className="timeline-item-time">
                      29/09/2026 - 09:00
                    </span>
                    <p className="timeline-item-desc">
                      Lấy 3.5 kg mẫu và dán mã seal SEAL-QR-77192.
                    </p>
                  </div>

                  <div className="timeline-item">
                    <span className="timeline-dot"></span>
                    <span className="timeline-item-title">
                      Tiếp nhận yêu cầu từ nông dân
                    </span>
                    <span className="timeline-item-time">
                      28/09/2026 - 08:30
                    </span>
                    <p className="timeline-item-desc">
                      Hồ sơ đăng ký #HS-KD-9038 được duyệt khảo sát.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChiTietKiemDinh;
