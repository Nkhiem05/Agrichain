import React, { useState, useEffect } from "react";
import "../public/css/nongdan.css";

const DEFAULT_FARM_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790604174/bc300a15ff78093fb0042758aec26846_ldrct6.jpg";
const DEFAULT_LOGO_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790603730/logo_hvpizf.png";

const DashboardPage = () => {
  const [activeTab, setActiveTab] = useState("farm");

  // State quản lý popup thêm mới
  const [showFarmModal, setShowFarmModal] = useState(false);
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showMaterialForm, setShowMaterialForm] = useState(false);

  // State quản lý việc mở Dropdown menu của các nút "..."
  const [openDropdown, setOpenDropdown] = useState(null);

  // Hàm toggle Dropdown
  const handleToggleDropdown = (id) => {
    if (openDropdown === id) {
      setOpenDropdown(null);
    } else {
      setOpenDropdown(id);
    }
  };

  // Đóng dropdown khi click ra ngoài (Tùy chọn nâng cao UI)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".dropdown-container")) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleCloseSeasonModal = () => {
    setShowSeasonModal(false);
    setShowMaterialForm(false);
  };

  return (
    <div className="dashboard-layout">
      {/* 1. THANH HEADER DÙNG CHUNG */}
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

      {/* 2. THÂN GIAO DIỆN (SIDEBAR + CONTENT) */}
      <div className="dashboard-body">
        {/* THANH MENU TRÁI (SIDEBAR) */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-heading">Chức năng</div>
          <ul className="sidebar-menu">
            <li
              className={`sidebar-item ${activeTab === "farm" ? "active" : ""}`}
              onClick={() => setActiveTab("farm")}
            >
              <span className="menu-icon">🌱</span>
              Quản lý nông trại
            </li>
            <li
              className={`sidebar-item ${
                activeTab === "season" ? "active" : ""
              }`}
              onClick={() => setActiveTab("season")}
            >
              <span className="menu-icon">🌾</span>
              Quản lý mùa vụ
            </li>
            <li
              className={`sidebar-item ${
                activeTab === "batch" ? "active" : ""
              }`}
              onClick={() => setActiveTab("batch")}
            >
              <span className="menu-icon">📦</span>
              Quản lý lô thu hoạch
            </li>
          </ul>
        </aside>

        {/* NỘI DUNG CHÍNH THAY ĐỔI THEO TAB */}
        <main className="dashboard-content">
          {/* TAB 1: QUẢN LÝ NÔNG TRẠI */}
          {activeTab === "farm" && (
            <div>
              <div className="metrics-row">
                <div className="metric-card">
                  <div className="metric-title">Tổng diện tích canh tác</div>
                  <div className="metric-number">
                    12.0<span className="metric-unit">Hecta</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-title">Số lô canh tác</div>
                  <div className="metric-number">17</div>
                </div>
                <div className="metric-card">
                  <div className="metric-title">Số nông trại</div>
                  <div className="metric-number">2</div>
                </div>
                <div className="actions-box">
                  <button
                    className="btn-primary-action"
                    onClick={() => setShowFarmModal(true)}
                  >
                    + Thêm nông trại
                  </button>
                  <div className="action-tip">
                    <span>🚜</span> Thêm nông trại mới để bắt đầu quản lý mùa vụ
                  </div>
                </div>
              </div>

              <div className="farm-card">
                <img src={DEFAULT_FARM_IMG} alt="Farm" className="farm-image" />
                <div className="farm-details">
                  <div>
                    <h3 className="farm-name">Vườn Cam A1</h3>
                    <span className="tag-badge green">FARM-01111</span>
                    <div className="farm-info-grid">
                      <div>
                        <div className="info-label">Diện tích</div>
                        <div className="info-val">6.0 ha</div>
                      </div>
                      <div>
                        <div className="info-label">Thổ nhưỡng</div>
                        <div className="info-val">Đất phù sa</div>
                      </div>
                      <div>
                        <div className="info-label">Địa chỉ</div>
                        <div className="info-val">Ấp 10 , Trí Phải, Cà Mau</div>
                      </div>
                      <div>
                        <div className="info-label">Người Quản lý</div>
                        <div className="info-val">Nguyễn Văn A</div>
                      </div>
                    </div>
                    <div className="farm-crop-summary">
                      <strong>Cây trồng chủ yếu:</strong> Cam Sành, Quýt đường
                    </div>
                  </div>
                  <div className="farm-card-buttons">
                    <button className="btn-update">cập nhật thông tin</button>
                    <button className="btn-map">Xem Bản đồ</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: QUẢN LÝ MÙA VỤ */}
          {activeTab === "season" && (
            <div>
              <div className="metrics-row">
                <div className="metric-card">
                  <div className="metric-title">Mùa vụ đang triển khai</div>
                  <div className="metric-number">
                    2<span className="metric-unit">MÙA VỤ</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-title">Số lô đang canh tác</div>
                  <div className="metric-number">2/2</div>
                </div>
                <div className="metric-card">
                  <div className="metric-title">Lô sắp thu hoạch</div>
                  <div className="metric-number">1</div>
                </div>
                <div className="actions-box">
                  <select className="filter-select">
                    <option>-- chọn nông trại --</option>
                    <option>Vườn Cam A1</option>
                  </select>
                  <button
                    className="btn-primary-action"
                    onClick={() => setShowSeasonModal(true)}
                  >
                    + Thêm Mùa Vụ
                  </button>
                </div>
              </div>

              {/* Mùa vụ 1 */}
              <div className="season-card">
                <img
                  src={DEFAULT_FARM_IMG}
                  alt="Crop"
                  className="season-thumbnail"
                />
                <div className="season-body">
                  <div className="season-header">
                    <h3 className="season-title">Quýt Đường</h3>
                    <div className="season-tags">
                      <span className="tag-badge gray">#LA111</span>
                      <span className="tag-badge green">
                        Vườn cam A1(#FARM-01111)
                      </span>
                    </div>
                  </div>
                  <div className="season-row-info">
                    <span>
                      <strong>Giống:</strong> Quýt Đường
                    </span>
                    <span>
                      <strong>Thửa:</strong> A1-1
                    </span>
                    <span>
                      <strong>Ngày bắt đầu:</strong> 18/06/2025
                    </span>
                    <span>
                      <strong>Tuổi:</strong> 4 tháng tuổi
                    </span>
                  </div>
                  <div className="season-inputs-title">
                    Phân bón và thuốc BVTV:
                  </div>
                  <ul className="season-inputs-list">
                    <li>Decis</li>
                    <li>Phân NPK</li>
                  </ul>
                  <span className="harvest-estimate-badge">
                    Dự kiến thu hoạch 18/07/2027
                  </span>
                </div>

                <div className="season-actions">
                  <button className="btn-outline-green">
                    ✏️ cập nhật mùa vụ
                  </button>
                  <div className="dropdown-container">
                    <button
                      className="btn-more"
                      onClick={() => handleToggleDropdown("season-1")}
                    >
                      ⋮
                    </button>
                    {/* Dropdown Menu Mùa vụ */}
                    {openDropdown === "season-1" && (
                      <div className="dropdown-menu">
                        <div className="dropdown-item">Đánh dấu sẵn sàng</div>
                        <div className="dropdown-divider"></div>
                        <div className="dropdown-item danger">Xóa</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Mùa vụ 2 */}
              <div className="season-card">
                <img
                  src={DEFAULT_FARM_IMG}
                  alt="Crop"
                  className="season-thumbnail"
                />
                <div className="season-body">
                  <div className="season-header">
                    <h3 className="season-title">Quýt Đường</h3>
                    <div className="season-tags">
                      <span className="tag-badge gray">#LA111</span>
                      <span className="tag-badge green">
                        Vườn cam A1(#FARM-01111)
                      </span>
                    </div>
                  </div>
                  <div className="season-row-info">
                    <span>
                      <strong>Giống:</strong> Quýt Đường
                    </span>
                    <span>
                      <strong>Thửa:</strong> A1-1
                    </span>
                    <span>
                      <strong>Ngày bắt đầu:</strong> 18/06/2025
                    </span>
                    <span>
                      <strong>Tuổi:</strong> 4 tháng tuổi
                    </span>
                  </div>
                  <div className="season-inputs-title">
                    Phân bón và thuốc BVTV:
                  </div>
                  <ul className="season-inputs-list">
                    <li>Decis</li>
                    <li>Phân NPK</li>
                  </ul>
                  <span className="harvest-estimate-badge">
                    Dự kiến thu hoạch 18/07/2027
                  </span>
                </div>

                <div className="season-actions">
                  <button className="btn-harvest">Thu hoạch</button>
                  <div className="dropdown-container">
                    <button
                      className="btn-more"
                      onClick={() => handleToggleDropdown("season-2")}
                    >
                      ⋮
                    </button>
                    {openDropdown === "season-2" && (
                      <div className="dropdown-menu">
                        <div className="dropdown-item">Đánh dấu sẵn sàng</div>
                        <div className="dropdown-divider"></div>
                        <div className="dropdown-item danger">Xóa</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: QUẢN LÝ LÔ THU HOẠCH */}
          {activeTab === "batch" && (
            <div>
              <div className="metrics-row">
                <div className="metric-card">
                  <div className="metric-title">Số lô chờ thu hoạch</div>
                  <div className="metric-number">1</div>
                </div>
                <div className="metric-card">
                  <div className="metric-title">Số lô canh tác</div>
                  <div className="metric-number">17</div>
                </div>
                <div className="metric-card">
                  <div className="metric-title">Số nông trại</div>
                  <div className="metric-number">2</div>
                </div>
                <div className="actions-box">
                  <button
                    className="btn-primary-action"
                    onClick={() => setShowBatchModal(true)}
                  >
                    + Tạo lô thu hoạch
                  </button>
                  <div className="action-tip">
                    <span>🌾</span> Tạo lô thu hoạch nông sản của bạn
                  </div>
                </div>
              </div>

              <div className="table-container">
                <table className="batch-table">
                  <thead>
                    <tr>
                      <th>Mã lô</th>
                      <th>Mã nông trại</th>
                      <th>Mùa vụ</th>
                      <th>Thửa đất</th>
                      <th>Sản lượng</th>
                      <th>Ngày thu hoạch</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>LA1-11111111</td>
                      <td>FARM11111111</td>
                      <td>Quýt đường vụ hè</td>
                      <td>A1-12111</td>
                      <td>12.000kg</td>
                      <td>25/12/2026</td>
                      <td>
                        <div className="status-icon-cell">
                          <span className="status-icon success">✓</span>
                          <div className="dropdown-container">
                            <button
                              className="btn-more"
                              onClick={() => handleToggleDropdown("batch-1")}
                            >
                              ⋮
                            </button>
                            {/* Dropdown Menu Lô Thu Hoạch */}
                            {openDropdown === "batch-1" && (
                              <div className="dropdown-menu">
                                <div className="dropdown-item">
                                  Xem chi tiết
                                </div>
                                <div className="dropdown-divider"></div>
                                <div className="dropdown-item">Cập nhật</div>
                                <div className="dropdown-divider"></div>
                                <div className="dropdown-item">
                                  Yêu cầu kiểm định
                                </div>
                                <div className="dropdown-divider"></div>
                                <div className="dropdown-item danger">Xóa</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* --- CÁC POPUP --- */}
      {/* 1. Popup Thêm Nông Trại */}
      {showFarmModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Thông tin nông trại</h3>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tên nông trại</label>
                <input type="text" placeholder="Nhập tên nông trại của bạn" />
              </div>
              <div className="form-group">
                <label>Người quản lý</label>
                <input type="text" placeholder="Họ và tên người quản lý" />
              </div>
              <div className="form-group">
                <label>Cây trồng chủ yếu</label>
                <input type="text" placeholder="VD: lúa, cà phê, sầu riêng" />
              </div>
              <div className="form-group">
                <label>Loại đất</label>
                <select>
                  <option>-- Chọn loại đất --</option>
                  <option>Đất phù sa</option>
                  <option>Đất đỏ bazan</option>
                </select>
              </div>
              <div className="form-group">
                <label>Địa chỉ</label>
                <input type="text" placeholder="xã/phường, tỉnh/thành phố" />
              </div>
              <div className="form-group">
                <label>Ảnh của nông trại</label>
                <input type="file" />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowFarmModal(false)}
              >
                Hủy
              </button>
              <button className="btn-save">Lưu thông tin</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Popup Thêm Mùa Vụ */}
      {showSeasonModal && (
        <div className="modal-overlay">
          <div className="modal-container modal-lg">
            <div className="modal-header">
              <h3>Thông Tin Mùa Vụ</h3>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tên thửa đất</label>
                <input type="text" placeholder="Nhập tên nông trại của bạn" />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Giống cây</label>
                  <input type="text" placeholder="Nhập tên giống cây" />
                </div>
                <div className="form-group">
                  <label>Thửa đất</label>
                  <select>
                    <option>-- Chọn thửa đất --</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Ngày bắt đầu</label>
                  <input type="date" />
                </div>
                <div className="form-group">
                  <label>Ngày thu hoạch dự kiến</label>
                  <input type="date" />
                </div>
              </div>
              <div className="material-section">
                <div className="material-header">
                  <h4>Phân bón và thuốc BVTV sử dụng</h4>
                  <button
                    className="btn-add-small"
                    onClick={() => setShowMaterialForm(true)}
                  >
                    + Thêm
                  </button>
                </div>
                {showMaterialForm && (
                  <div className="material-box">
                    <button
                      className="btn-remove-material"
                      onClick={() => setShowMaterialForm(false)}
                    >
                      ✕
                    </button>
                    <div className="form-grid-2">
                      <div className="form-group radio-group-container">
                        <label>Loại vật tư</label>
                        <div className="radio-group">
                          <label>
                            <input type="radio" name="vattu" /> Phân bón
                          </label>
                          <label>
                            <input type="radio" name="vattu" /> Thuốc BVTV
                          </label>
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Tên phân thuốc</label>
                        <select>
                          <option>-- Chọn thửa đất --</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Liều lượng (lít,kg)</label>
                        <input type="number" />
                      </div>
                      <div className="form-group">
                        <label>Ngày sử dụng</label>
                        <input type="date" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCloseSeasonModal}>
                Hủy
              </button>
              <button className="btn-save">Lưu thông tin</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Popup Tạo Lô Thu Hoạch */}
      {showBatchModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Thông Tin Thu Hoạch</h3>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Mã Lô</label>
                <select>
                  <option>-- Chọn mã lô --</option>
                </select>
              </div>
              <div className="form-grid-2 readonly-grid">
                <div className="readonly-item">
                  <label>Mã nông trại</label>
                  <span>Chưa có dữ liệu</span>
                </div>
                <div className="readonly-item">
                  <label>Thửa đất</label>
                  <span>Chưa có dữ liệu</span>
                </div>
                <div className="readonly-item">
                  <label>Mùa vụ</label>
                  <span>Chưa có dữ liệu</span>
                </div>
                <div className="readonly-item">
                  <label>Giống cây</label>
                  <span>Chưa có dữ liệu</span>
                </div>
              </div>
              <div className="form-group">
                <label>Sản lượng (kg)</label>
                <input type="number" />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowBatchModal(false)}
              >
                Hủy
              </button>
              <button className="btn-save">Lưu thông tin</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
