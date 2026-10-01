import React from "react";
import { useNavigate } from "react-router-dom";
import "../../css/chitietmuavu.css"; // Lưu ý chỉnh lại đường dẫn cho đúng thư mục đặt file CSS của bạn

const DEFAULT_LOGO_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png";

const steps = [
  { step: 1, label: "Yêu cầu kiểm định" },
  { step: 2, label: "Lấy mẫu" },
  { step: 3, label: "Kết quả" },
  { step: 4, label: "Vận chuyển" },
  { step: 5, label: "Hoàn Thành" },
];

const HarvestDetailPage = () => {
  const navigate = useNavigate();
  const currentStep = 1;

  //   hàm quay lại
  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      alert("Quay về trang trước");
    }
  };

  const materials = [
    {
      name: "Phân NPK",
      type: "Phân bón",
      badgeClass: "badge-blue",
      dosage: "20kg/ha",
      date: "31/7/2026",
    },
    {
      name: "Decis",
      type: "Thuốc BVTV",
      badgeClass: "badge-orange",
      dosage: "20l/ha",
      date: "31/8/2026",
    },
  ];

  return (
    <div className="harvest-layout">
      {/* 1. HEADER */}
      <header className="harvest-header">
        <div className="header-left">
          <img src={DEFAULT_LOGO_IMG} alt="Logo" className="header-logo-icon" />
          <span className="header-brand-title">AGRICHAIN</span>
        </div>

        <div className="header-search-bar">
          <input type="text" placeholder="Tìm kiếm lô canh tác ..." />
        </div>

        <div className="header-profile">
          <div className="avatar-circle"></div>
          <div className="profile-meta">
            <span className="profile-name">Nguyễn Văn A</span>
            <span className="profile-role">Nông dân</span>
          </div>
        </div>
      </header>

      {/* 2. CONTAINER NỘI DUNG */}
      <main className="harvest-container">
        {/* Nút Back quay lại */}
        <div className="top-actions">
          <button className="back-button" onClick={handleBack} title="Quay lại">
            <svg
              className="back-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span>Quay lại trang trước</span>
          </button>
        </div>

        <div className="harvest-card-wrapper">
          <h2 className="harvest-page-title">Thông Tin Thu Hoạch</h2>

          {/* Stepper Process Bar */}
          <div className="stepper-wrapper">
            <div className="stepper-line"></div>
            {steps.map((item) => (
              <div
                key={item.step}
                className={`step-item ${item.step <= currentStep ? "active" : ""}`}
              >
                <div className="step-circle">{item.step}</div>
                <div className="step-text">{item.label}</div>
              </div>
            ))}
          </div>

          {/* Grid 3 Card Thông Tin */}
          <div className="details-grid">
            {/* Card: Mùa Vụ */}
            <div className="info-card">
              <div className="info-card-header">
                <span className="card-icon">🗓️</span>
                <h4>Mùa Vụ</h4>
              </div>
              <div className="info-card-body">
                <div className="field-group full-width">
                  <span className="field-label">Tên mùa vụ</span>
                  <span className="field-value">Quýt đường vụ hè 2026</span>
                </div>
                <div className="field-row">
                  <div className="field-group">
                    <span className="field-label">Giống cây</span>
                    <span className="field-value">Quýt đường</span>
                  </div>
                  <div className="field-group">
                    <span className="field-label">Bắt đầu</span>
                    <span className="field-value">15/06/2026</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card: Nông trại */}
            <div className="info-card">
              <div className="info-card-header">
                <span className="card-icon">🌱</span>
                <h4>Nông trại</h4>
              </div>
              <div className="info-card-body">
                <div className="field-group full-width">
                  <span className="field-label">Tên nông trại</span>
                  <span className="field-value">Vườn cam A1</span>
                </div>
                <div className="field-row">
                  <div className="field-group">
                    <span className="field-label">Mã nông trại</span>
                    <span className="field-value">FARM11111</span>
                  </div>
                  <div className="field-group">
                    <span className="field-label">Loại đất</span>
                    <span className="field-value">Phù sa</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card: Thu hoạch */}
            <div className="info-card">
              <div className="info-card-header">
                <span className="card-icon">📦</span>
                <h4>Thu hoạch</h4>
              </div>
              <div className="info-card-body">
                <div className="field-row">
                  <div className="field-group">
                    <span className="field-label">Sản lượng</span>
                    <span className="field-value">20.000kg</span>
                  </div>
                  <div className="field-group">
                    <span className="field-label">Mã lô</span>
                    <span className="field-value">LA111</span>
                  </div>
                </div>
                <div className="field-row">
                  <div className="field-group">
                    <span className="field-label">Ngày thu hoạch</span>
                    <span className="field-value">31/12/2026</span>
                  </div>
                  <div className="field-group">
                    <span className="field-label">Thửa đất</span>
                    <span className="field-value">A1-1</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bảng Vật Tư */}
          <div className="materials-container">
            <h3 className="materials-title">Phân bón và thuốc BVTV</h3>
            <div className="materials-table-wrapper">
              <table className="materials-table">
                <thead>
                  <tr>
                    <th>Tên vật tư</th>
                    <th>Loại vật tư</th>
                    <th>Liều lượng</th>
                    <th>Ngày sử dụng</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m, index) => (
                    <tr key={index}>
                      <td>{m.name}</td>
                      <td>
                        <span className={`status-badge ${m.badgeClass}`}>
                          {m.type}
                        </span>
                      </td>
                      <td>{m.dosage}</td>
                      <td>{m.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="harvest-actions">
            <button className="btn-cancel" onClick={() => navigate(-1)}>
              Hủy
            </button>
            <button className="btn-save">Lưu thông tin</button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HarvestDetailPage;
