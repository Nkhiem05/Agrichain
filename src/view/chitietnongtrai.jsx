import React, { useState } from "react";
import "../public/css/chitietnongtrai.css";

const DEFAULT_LOGO_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png";

export default function FarmDetail() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Dữ liệu vườn cam mẫu[cite: 1]
  const [farmData] = useState({
    name: "Vườn Cam A1",
    code: "FARM-01111",
    area: "6.0 ha",
    soilType: "Đất phù sa",
    address: "Ấp 10 , Trí Phải, Cà Mau",
    manager: "Nguyễn Văn A",
    mainCrops: "Cam Sành, Quýt đường",
    image:
      "https://images.unsplash.com/photo-1582281298055-e25b84a30b0b?w=600&auto=format&fit=crop&q=80",
  });

  // Danh sách các thửa đất[cite: 1]
  const [plots, setPlots] = useState([
    {
      id: 1,
      name: "Thửa A1-1",
      area: "2.5ha",
      crop: "Quýt đường",
      startDate: "18/06/2026",
      days: 42,
      status: "active",
    },
    {
      id: 2,
      name: "Thửa A1-2",
      area: "2.5ha",
      crop: "",
      startDate: "",
      days: 0,
      status: "empty",
    },
    {
      id: 3,
      name: "Thửa A1-1",
      area: "2.5ha",
      crop: "Quýt đường",
      startDate: "18/06/2026",
      days: 42,
      status: "active",
    },
    {
      id: 4,
      name: "Thửa A1-1",
      area: "2.5ha",
      crop: "Quýt đường",
      startDate: "18/06/2026",
      days: 42,
      status: "active",
    },
    {
      id: 5,
      name: "Thửa A1-2",
      area: "2.5ha",
      crop: "",
      startDate: "",
      days: 0,
      status: "empty",
    },
    {
      id: 6,
      name: "Thửa A1-1",
      area: "2.5ha",
      crop: "Quýt đường",
      startDate: "18/06/2026",
      days: 42,
      status: "active",
    },
  ]);

  const [formData, setFormData] = useState({
    name: "",
    area: "",
    crop: "",
    status: "active",
  });

  const filteredPlots = plots.filter(
    (plot) =>
      plot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plot.crop.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      alert("Quay về trang trước");
    }
  };

  const handleAddPlot = (e) => {
    e.preventDefault();
    if (!formData.name) return;

    const newPlot = {
      id: Date.now(),
      name: formData.name,
      area: formData.area ? `${formData.area}ha` : "2.0ha",
      crop: formData.status === "active" ? formData.crop || "Quýt đường" : "",
      startDate: formData.status === "active" ? "01/07/2026" : "",
      days: formData.status === "active" ? 1 : 0,
      status: formData.status,
    };

    setPlots([...plots, newPlot]);
    setIsModalOpen(false);
    setFormData({ name: "", area: "", crop: "", status: "active" });
  };

  return (
    <div className="agrichain-wrapper">
      <header className="dashboard-header">
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

      {/* Nội dung chính căn giữa */}
      <main className="main-container">
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

        {/* Thẻ thông tin Vườn Cam A1[cite: 1] */}
        <div className="farm-card">
          <div className="farm-image-box">
            <img src={farmData.image} alt={farmData.name} />
          </div>

          <div className="farm-details">
            <div className="farm-title-row">
              <h1 className="farm-title">{farmData.name}</h1>
              <span className="farm-badge">{farmData.code}</span>
            </div>

            <div className="farm-stats-grid">
              <div className="stat-col">
                <span className="stat-label">Diện tích</span>
                <span className="stat-val">{farmData.area}</span>
              </div>
              <div className="stat-col">
                <span className="stat-label">Thổ nhưỡng</span>
                <span className="stat-val">{farmData.soilType}</span>
              </div>
              <div className="stat-col">
                <span className="stat-label">Địa chỉ</span>
                <span className="stat-val">{farmData.address}</span>
              </div>
              <div className="stat-col">
                <span className="stat-label">Người Quản lý</span>
                <span className="stat-val">{farmData.manager}</span>
              </div>
            </div>

            <div className="farm-crops">
              <span className="crops-label">Cây trồng chủ yếu: </span>
              <span className="crops-value">{farmData.mainCrops}</span>
            </div>
          </div>
        </div>

        {/* Tiêu đề & Nút thêm thửa đất[cite: 1] */}
        <div className="section-header">
          <div>
            <h2 className="section-title">Quản lý thửa đất</h2>
            <p className="section-subtitle">
              Theo dõi tình trạng canh tác của nông trại
            </p>
          </div>

          <button className="btn-add-plot" onClick={() => setIsModalOpen(true)}>
            + Thêm thửa đất
          </button>
        </div>

        {/* Lưới danh sách thửa[cite: 1] */}
        <div className="plots-grid">
          {filteredPlots.map((plot) => (
            <div
              key={plot.id}
              className={`plot-card ${
                plot.status === "active" ? "plot-active" : "plot-empty"
              }`}
            >
              <div className="plot-header">
                <div>
                  <h3 className="plot-name">{plot.name}</h3>
                  <span className="plot-area">{plot.area}</span>
                </div>
                <div className="plot-status-wrap">
                  {plot.status === "active" ? (
                    <span className="status-badge status-active">
                      <span className="status-dot"></span> Đang canh tác
                    </span>
                  ) : (
                    <span className="status-badge status-empty">Đất trống</span>
                  )}
                </div>
              </div>

              <div className="plot-body">
                {plot.status === "active" ? (
                  <>
                    <p className="crop-name">{plot.crop}</p>
                    <p className="plot-date">Bắt đầu: {plot.startDate}</p>
                    <p className="plot-duration">{plot.days} ngày</p>
                  </>
                ) : (
                  <p className="empty-notice">Chưa bắt đầu mùa vụ</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Modal Popup thêm thửa đất */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Thêm thửa đất mới</h3>
              <button
                className="modal-close"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddPlot} className="modal-form">
              <div className="form-group">
                <label>Tên thửa đất</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Thửa A1-3"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Diện tích (ha)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="2.5"
                  value={formData.area}
                  onChange={(e) =>
                    setFormData({ ...formData, area: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Trạng thái ban đầu</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                >
                  <option value="active">Đang canh tác</option>
                  <option value="empty">Đất trống</option>
                </select>
              </div>

              {formData.status === "active" && (
                <div className="form-group">
                  <label>Loại cây trồng</label>
                  <input
                    type="text"
                    placeholder="Quýt đường, Cam sành..."
                    value={formData.crop}
                    onChange={(e) =>
                      setFormData({ ...formData, crop: e.target.value })
                    }
                  />
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsModalOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn-submit">
                  Lưu thửa đất
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
