import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../../css/chitietnongtrai.css";

const DEFAULT_LOGO_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png";

const DEFAULT_FARM_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790604174/bc300a15ff78093fb0042758aec26846_ldrct6.jpg";

const API_URL = "http://localhost:3000";

const EMPTY_PLOT_FORM = {
  ten_thua_dat: "",
  dien_tich: "",
  loai_dat: "",
  status: "active",
  loai_cay_trong: "",
};

// "2026-06-18" -> "18/06/2026"
const formatDate = (value) => {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

const formatArea = (value) =>
  value === null || value === undefined || value === ""
    ? "—"
    : `${Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} ha`;

export default function FarmDetail() {
  const navigate = useNavigate();
  const { maNongTrai } = useParams();

  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [farm, setFarm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState(EMPTY_PLOT_FORM);
  const [saving, setSaving] = useState(false);

  // Thửa đang sửa (null = đang thêm mới)
  const [editingPlot, setEditingPlot] = useState(null);

  // Lấy user từ localStorage (giống trang nông dân)
  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      navigate("/");
      return;
    }

    try {
      setUser(JSON.parse(savedUser));
    } catch {
      localStorage.removeItem("user");
      navigate("/");
    }
  }, [navigate]);

  // Lấy thông tin nông trại + danh sách thửa đất
  const fetchFarm = async () => {
    if (!maNongTrai) {
      setError("Chưa chọn nông trại. Hãy mở từ trang Quản lý nông trại.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/nong-trai/${encodeURIComponent(maNongTrai)}/chi-tiet`,
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Không thể lấy chi tiết nông trại");
        return;
      }

      setFarm(data.data);
    } catch (err) {
      console.error("Lỗi lấy chi tiết nông trại:", err);
      setError("Không thể kết nối tới backend");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maNongTrai]);

  const plots = farm?.thua_dat || [];

  const filteredPlots = plots.filter((plot) => {
    const keyword = searchTerm.trim().toLowerCase();

    return (
      (plot.ten_thua_dat || "").toLowerCase().includes(keyword) ||
      (plot.loai_cay_trong || "").toLowerCase().includes(keyword)
    );
  });

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/nong-dan");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPlot(null);
    setFormData(EMPTY_PLOT_FORM);
  };

  const handleOpenAdd = () => {
    setEditingPlot(null);
    setFormData(EMPTY_PLOT_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plot) => {
    setEditingPlot(plot);
    setFormData({
      ten_thua_dat: plot.ten_thua_dat || "",
      dien_tich: plot.dien_tich ?? "",
      loai_dat: plot.loai_dat || "",
      // Chỉ đổi được giữa "đất trống" và "tạm ngưng"
      status: plot.trang_thai === "TAM_NGUNG" ? "TAM_NGUNG" : "DAT_TRONG",
      loai_cay_trong: "",
    });
    setIsModalOpen(true);
  };

  // Thửa đang có mùa vụ chạy thì trạng thái do mùa vụ quyết định
  const editingHasSeason = !!editingPlot?.ma_mua_vu;

  const handleSavePlot = async (e) => {
    e.preventDefault();

    if (!formData.ten_thua_dat.trim()) return;

    setSaving(true);

    const baseUrl = `${API_URL}/api/nong-trai/${encodeURIComponent(maNongTrai)}/thua-dat`;
    const common = {
      ten_thua_dat: formData.ten_thua_dat.trim(),
      dien_tich: formData.dien_tich,
      loai_dat: formData.loai_dat.trim(),
    };

    try {
      const response = await fetch(
        editingPlot ? `${baseUrl}/${editingPlot.ma_thua_dat}` : baseUrl,
        {
          method: editingPlot ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editingPlot
              ? {
                  ...common,
                  ...(editingHasSeason ? {} : { trang_thai: formData.status }),
                }
              : {
                  ...common,
                  bat_dau_canh_tac: formData.status === "active",
                  loai_cay_trong: formData.loai_cay_trong.trim(),
                },
          ),
        },
      );
      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Lưu thửa đất thất bại");
        return;
      }

      handleCloseModal();
      await fetchFarm();
    } catch (err) {
      console.error("Lỗi lưu thửa đất:", err);
      alert("Không thể kết nối tới backend");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlot = async (plot) => {
    if (!window.confirm(`Bạn có chắc muốn xóa ${plot.ten_thua_dat}?`)) return;

    try {
      const response = await fetch(
        `${API_URL}/api/nong-trai/${encodeURIComponent(maNongTrai)}/thua-dat/${plot.ma_thua_dat}`,
        { method: "DELETE" },
      );
      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Xóa thửa đất thất bại");
        return;
      }

      await fetchFarm();
    } catch (err) {
      console.error("Lỗi xóa thửa đất:", err);
      alert("Không thể kết nối tới backend");
    }
  };

  return (
    <div className="agrichain-wrapper">
      <header className="dashboard-header">
        <div className="header-left">
          <img src={DEFAULT_LOGO_IMG} alt="Logo" className="header-logo-icon" />
          <span className="header-brand-title">AGRICHAIN</span>
        </div>

        <div className="header-search-bar">
          <input
            type="text"
            placeholder="Tìm kiếm thửa đất, cây trồng ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="header-profile">
          <div className="avatar-circle"></div>
          <div className="profile-meta">
            <span className="profile-name">{user?.ho_ten || "Nông dân"}</span>
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

        {loading && <p>Đang tải thông tin nông trại...</p>}

        {error && <p>{error}</p>}

        {farm && (
          <>
            {/* Thẻ thông tin nông trại */}
            <div className="farm-card">
              <div className="farm-image-box">
                <img
                  src={
                    farm.anh_nong_trai
                      ? `${API_URL}${farm.anh_nong_trai}`
                      : DEFAULT_FARM_IMG
                  }
                  alt={farm.ten_nong_trai}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = DEFAULT_FARM_IMG;
                  }}
                />
              </div>

              <div className="farm-details">
                <div className="farm-title-row">
                  <h1 className="farm-title">{farm.ten_nong_trai}</h1>
                  <span className="farm-badge">{farm.ma_nong_trai}</span>
                </div>

                <div className="farm-stats-grid">
                  <div className="stat-col">
                    <span className="stat-label">Diện tích</span>
                    <span className="stat-val">
                      {formatArea(farm.dien_tich_nong_trai)}
                    </span>
                  </div>
                  <div className="stat-col">
                    <span className="stat-label">Thổ nhưỡng</span>
                    <span className="stat-val">
                      {farm.loai_dat.length > 0
                        ? farm.loai_dat.join(", ")
                        : "Chưa cập nhật"}
                    </span>
                  </div>
                  <div className="stat-col">
                    <span className="stat-label">Địa chỉ</span>
                    <span className="stat-val">{farm.dia_diem_nong_trai}</span>
                  </div>
                  <div className="stat-col">
                    <span className="stat-label">Người Quản lý</span>
                    <span className="stat-val">{farm.nguoi_quan_ly}</span>
                  </div>
                </div>

                <div className="farm-crops">
                  <span className="crops-label">Cây trồng chủ yếu: </span>
                  <span className="crops-value">
                    {farm.cay_trong_chu_yeu.length > 0
                      ? farm.cay_trong_chu_yeu.join(", ")
                      : "Chưa có"}
                  </span>
                </div>
              </div>
            </div>

            {/* Tiêu đề & Nút thêm thửa đất */}
            <div className="section-header">
              <div>
                <h2 className="section-title">Quản lý thửa đất</h2>
                <p className="section-subtitle">
                  Theo dõi tình trạng canh tác của nông trại
                </p>
              </div>

              <button
                className="btn-add-plot"
                onClick={handleOpenAdd}
              >
                + Thêm thửa đất
              </button>
            </div>

            {plots.length === 0 && (
              <p>Nông trại chưa có thửa đất nào. Bấm "+ Thêm thửa đất".</p>
            )}

            {/* Lưới danh sách thửa */}
            <div className="plots-grid">
              {filteredPlots.map((plot) => {
                const isActive = plot.trang_thai === "DANG_CANH_TAC";

                return (
                  <div
                    key={plot.ma_thua_dat}
                    className={`plot-card ${
                      isActive ? "plot-active" : "plot-empty"
                    }`}
                  >
                    <div className="plot-header">
                      <div>
                        <h3 className="plot-name">{plot.ten_thua_dat}</h3>
                        <span className="plot-area">
                          {formatArea(plot.dien_tich)}
                        </span>
                      </div>
                      <div className="plot-status-wrap">
                        {isActive ? (
                          <span className="status-badge status-active">
                            <span className="status-dot"></span> Đang canh tác
                          </span>
                        ) : (
                          <span className="status-badge status-empty">
                            {plot.trang_thai === "TAM_NGUNG"
                              ? "Tạm ngưng"
                              : "Đất trống"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="plot-body">
                      {isActive ? (
                        <>
                          <p className="crop-name">
                            {plot.loai_cay_trong || "Chưa gắn mùa vụ"}
                          </p>
                          {plot.ngay_gieo_trong && (
                            <>
                              <p className="plot-date">
                                Bắt đầu: {formatDate(plot.ngay_gieo_trong)}
                              </p>
                              <p className="plot-duration">
                                {plot.so_ngay} ngày
                              </p>
                            </>
                          )}
                        </>
                      ) : (
                        <p className="empty-notice">Chưa bắt đầu mùa vụ</p>
                      )}
                    </div>

                    <div className="plot-actions">
                      <button
                        type="button"
                        className="plot-action-btn"
                        onClick={() => handleOpenEdit(plot)}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="plot-action-btn danger"
                        onClick={() => handleDeletePlot(plot)}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* Modal Popup thêm thửa đất */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingPlot ? "Sửa thửa đất" : "Thêm thửa đất mới"}</h3>
              <button className="modal-close" onClick={handleCloseModal}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSavePlot} className="modal-form">
              <div className="form-group">
                <label>Tên thửa đất</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Thửa A1-3"
                  value={formData.ten_thua_dat}
                  onChange={(e) =>
                    setFormData({ ...formData, ten_thua_dat: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Diện tích (ha)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="2.5"
                  value={formData.dien_tich}
                  onChange={(e) =>
                    setFormData({ ...formData, dien_tich: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Loại đất</label>
                <input
                  type="text"
                  placeholder="Đất phù sa, đất đỏ bazan..."
                  value={formData.loai_dat}
                  onChange={(e) =>
                    setFormData({ ...formData, loai_dat: e.target.value })
                  }
                />
              </div>

              {editingPlot ? (
                <div className="form-group">
                  <label>Trạng thái</label>
                  {editingHasSeason ? (
                    <input
                      type="text"
                      value={`Đang canh tác (mùa vụ ${editingPlot.ma_mua_vu}) - đổi ở Quản lý mùa vụ`}
                      disabled
                    />
                  ) : (
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                    >
                      <option value="DAT_TRONG">Đất trống</option>
                      <option value="TAM_NGUNG">Tạm ngưng</option>
                    </select>
                  )}
                </div>
              ) : (
                <>
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
                        value={formData.loai_cay_trong}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            loai_cay_trong: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  )}
                </>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleCloseModal}
                >
                  Hủy
                </button>
                <button type="submit" className="btn-submit" disabled={saving}>
                  {saving ? "Đang lưu..." : editingPlot ? "Cập nhật" : "Lưu thửa đất"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
