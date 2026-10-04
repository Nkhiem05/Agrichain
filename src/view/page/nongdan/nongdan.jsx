import React, { useEffect, useState } from "react";
import {
  Sprout,
  Wheat,
  PackageCheck,
  CalendarCheck,
  Truck,
  Eye,
  CheckCircle2,
  Clock,
} from "lucide-react";
import "../../css/nongdan.css";
import { useNavigate } from "react-router-dom";

const DEFAULT_FARM_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790604174/bc300a15ff78093fb0042758aec26846_ldrct6.jpg";

const DEFAULT_LOGO_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png";

const API_URL = "http://localhost:3000";

const DashboardPage = () => {
  const navigate = useNavigate();

  // =========================================================
  // TAB
  // =========================================================
  const [activeTab, setActiveTab] = useState("farm");

  // =========================================================
  // POPUP
  // =========================================================
  const [showFarmModal, setShowFarmModal] = useState(false);
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);

  // =========================================================
  // DROPDOWN
  // =========================================================
  const [openDropdown, setOpenDropdown] = useState(null);

  // =========================================================
  // USER ĐANG ĐĂNG NHẬP
  // =========================================================
  const [user, setUser] = useState(null);

  // =========================================================
  // NÔNG TRẠI
  // =========================================================
  const [farms, setFarms] = useState([]);
  const [loadingFarms, setLoadingFarms] = useState(false);
  const [farmError, setFarmError] = useState("");

  // =========================================================
  // DANH SÁCH NGƯỜI QUẢN LÝ
  // =========================================================
  const [managers, setManagers] = useState([]);

  // =========================================================
  // NÔNG TRẠI ĐANG SỬA
  // =========================================================
  const [editingFarm, setEditingFarm] = useState(null);

  // =========================================================
  // FORM NÔNG TRẠI
  // =========================================================
  const [farmForm, setFarmForm] = useState({
    ma_nong_trai: "",
    ma_nguoi_dung: "",
    ten_nong_trai: "",
    dia_diem_nong_trai: "",
    dien_tich_nong_trai: "",
  });

  // =========================================================
  // ẢNH NÔNG TRẠI
  // =========================================================
  const [anhNongTrai, setAnhNongTrai] = useState(null);
  const [farmImagePreview, setFarmImagePreview] = useState(null);

  // =========================================================
  // TRẠNG THÁI LƯU
  // =========================================================
  const [savingFarm, setSavingFarm] = useState(false);

  // =========================================================
  // DỮ LIỆU LÔ HÀNG ĐỂ CHỌN KHI TẠO LỆNH VẬN CHUYỂN
  // =========================================================
  const availableBatches = [
    {
      ma_lo: "LA1-11111111",
      ten_lo: "Quýt đường loại 1 đợt 1",
      ma_nong_trai: "FARM11111111",
      ten_nong_san: "Quýt Đường Mọng Nước",
      san_luong: "5.000 kg",
      ngay_thu_hoach: "25/12/2026",
    },
    {
      ma_lo: "LA2-22091104",
      ten_lo: "Xoài Cát Hòa Lộc xuất khẩu",
      ma_nong_trai: "FARM22091104",
      ten_nong_san: "Xoài Cát Hòa Lộc",
      san_luong: "3.500 kg",
      ngay_thu_hoach: "15/11/2026",
    },
  ];

  const [selectedBatchCode, setSelectedBatchCode] = useState("");
  const selectedBatchInfo = availableBatches.find(
    (b) => b.ma_lo === selectedBatchCode,
  );

  // =========================================================
  // LẤY USER TỪ LOCAL STORAGE
  // =========================================================
  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      navigate("/");
      return;
    }

    try {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
    } catch (error) {
      console.error("Không đọc được thông tin người dùng:", error);
      localStorage.removeItem("user");
      navigate("/");
    }
  }, [navigate]);

  // =========================================================
  // LẤY DANH SÁCH NÔNG TRẠI
  // =========================================================
  const fetchFarms = async (maNguoiDung) => {
    if (!maNguoiDung) return;

    setLoadingFarms(true);
    setFarmError("");

    try {
      const response = await fetch(
        `${API_URL}/api/farmer/farms/user/${maNguoiDung}`,
      );
      const data = await response.json();

      if (!response.ok) {
        setFarmError(data.message || "Không thể lấy danh sách nông trại");
        return;
      }

      setFarms(data.data || []);
    } catch (error) {
      console.error("Lỗi lấy danh sách nông trại:", error);
      setFarmError("Không thể kết nối tới backend");
    } finally {
      setLoadingFarms(false);
    }
  };

  // =========================================================
  // LẤY DANH SÁCH NGƯỜI QUẢN LÝ
  // =========================================================
  const fetchManagers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/farmer/managers`);
      const data = await response.json();

      if (!response.ok) {
        console.error(data.message || "Không thể lấy danh sách người quản lý");
        return;
      }

      setManagers(data.data || []);
    } catch (error) {
      console.error("Lỗi lấy danh sách người quản lý:", error);
    }
  };

  useEffect(() => {
    if (user?.ma_nguoi_dung) {
      fetchFarms(user.ma_nguoi_dung);
    }
  }, [user]);

  useEffect(() => {
    fetchManagers();
  }, []);

  // =========================================================
  // DROPDOWN
  // =========================================================
  const handleToggleDropdown = (id) => {
    if (openDropdown === id) {
      setOpenDropdown(null);
    } else {
      setOpenDropdown(id);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".dropdown-container")) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  // =========================================================
  // CHUYỂN TRANG CHI TIẾT
  // =========================================================
  const handlechitietnongtrai = (e) => {
    e.preventDefault();
    navigate("/chi-tiet-nong-trai");
  };

  const handlechitietmuavu = (e) => {
    e.preventDefault();
    navigate("/chi-tiet-mua-vu");
  };

  // =========================================================
  // INPUT FORM NÔNG TRẠI
  // =========================================================
  const handleFarmInputChange = (e) => {
    const { name, value } = e.target;
    setFarmForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =========================================================
  // CHỌN ẢNH
  // =========================================================
  const handleFarmImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setAnhNongTrai(null);
      return;
    }

    setAnhNongTrai(file);

    if (farmImagePreview && farmImagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(farmImagePreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setFarmImagePreview(previewUrl);
  };

  // =========================================================
  // RESET FORM
  // =========================================================
  const resetFarmForm = () => {
    setFarmForm({
      ma_nong_trai: "",
      ma_nguoi_dung: "",
      ten_nong_trai: "",
      dia_diem_nong_trai: "",
      dien_tich_nong_trai: "",
    });

    setAnhNongTrai(null);

    if (farmImagePreview && farmImagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(farmImagePreview);
    }

    setFarmImagePreview(null);
    setEditingFarm(null);
  };

  // =========================================================
  // MỞ POPUP THÊM NÔNG TRẠI
  // =========================================================
  const handleOpenAddFarm = () => {
    setEditingFarm(null);
    setFarmForm({
      ma_nong_trai: "",
      ma_nguoi_dung: user?.ma_nguoi_dung || "",
      ten_nong_trai: "",
      dia_diem_nong_trai: "",
      dien_tich_nong_trai: "",
    });

    setAnhNongTrai(null);
    setFarmImagePreview(null);
    setShowFarmModal(true);
  };

  // =========================================================
  // ĐÓNG POPUP
  // =========================================================
  const handleCloseFarmModal = () => {
    setShowFarmModal(false);
    resetFarmForm();
  };

  // =========================================================
  // THÊM NÔNG TRẠI
  // =========================================================
  const handleAddFarm = async (e) => {
    e.preventDefault();

    if (
      !farmForm.ma_nong_trai.trim() ||
      !farmForm.ma_nguoi_dung ||
      !farmForm.ten_nong_trai.trim() ||
      !farmForm.dia_diem_nong_trai.trim()
    ) {
      alert("Vui lòng nhập đầy đủ mã, tên, người quản lý và địa chỉ");
      return;
    }

    setSavingFarm(true);

    try {
      const formData = new FormData();
      formData.append("ma_nong_trai", farmForm.ma_nong_trai.trim());
      formData.append("ma_nguoi_dung", farmForm.ma_nguoi_dung);
      formData.append("ten_nong_trai", farmForm.ten_nong_trai.trim());
      formData.append("dia_diem_nong_trai", farmForm.dia_diem_nong_trai.trim());
      formData.append("dien_tich_nong_trai", farmForm.dien_tich_nong_trai);

      if (anhNongTrai) {
        formData.append("anh_nong_trai", anhNongTrai);
      }

      const response = await fetch(`${API_URL}/api/farmer/farms`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Thêm nông trại thất bại");
        return;
      }

      alert("Thêm nông trại thành công");
      handleCloseFarmModal();
      await fetchFarms(user.ma_nguoi_dung);
    } catch (error) {
      console.error("Lỗi thêm nông trại:", error);
      alert("Không thể kết nối tới backend");
    } finally {
      setSavingFarm(false);
    }
  };

  // =========================================================
  // MỞ POPUP SỬA NÔNG TRẠI
  // =========================================================
  const handleEditFarm = (farm) => {
    setEditingFarm(farm);
    setFarmForm({
      ma_nong_trai: farm.ma_nong_trai || "",
      ma_nguoi_dung: farm.ma_nguoi_dung || "",
      ten_nong_trai: farm.ten_nong_trai || "",
      dia_diem_nong_trai: farm.dia_diem_nong_trai || "",
      dien_tich_nong_trai: farm.dien_tich_nong_trai || "",
    });

    setAnhNongTrai(null);

    if (farm.anh_nong_trai) {
      setFarmImagePreview(`${API_URL}${farm.anh_nong_trai}`);
    } else {
      setFarmImagePreview(null);
    }

    setShowFarmModal(true);
  };

  // =========================================================
  // CẬP NHẬT NÔNG TRẠI
  // =========================================================
  const handleUpdateFarm = async (e) => {
    e.preventDefault();

    if (!editingFarm) return;

    if (
      !farmForm.ma_nguoi_dung ||
      !farmForm.ten_nong_trai.trim() ||
      !farmForm.dia_diem_nong_trai.trim()
    ) {
      alert("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    setSavingFarm(true);

    try {
      const formData = new FormData();
      formData.append("ma_nguoi_dung", farmForm.ma_nguoi_dung);
      formData.append("ten_nong_trai", farmForm.ten_nong_trai.trim());
      formData.append("dia_diem_nong_trai", farmForm.dia_diem_nong_trai.trim());
      formData.append("dien_tich_nong_trai", farmForm.dien_tich_nong_trai);

      if (anhNongTrai) {
        formData.append("anh_nong_trai", anhNongTrai);
      }

      const response = await fetch(
        `${API_URL}/api/farmer/farms/${editingFarm.ma_nong_trai}`,
        {
          method: "PUT",
          body: formData,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Cập nhật nông trại thất bại");
        return;
      }

      alert("Cập nhật nông trại thành công");
      handleCloseFarmModal();
      await fetchFarms(user.ma_nguoi_dung);
    } catch (error) {
      console.error("Lỗi cập nhật nông trại:", error);
      alert("Không thể kết nối tới backend");
    } finally {
      setSavingFarm(false);
    }
  };

  // =========================================================
  // XÓA NÔNG TRẠI
  // =========================================================
  const handleDeleteFarm = async (maNongTrai) => {
    const confirmDelete = window.confirm("Bạn có chắc muốn xóa nông trại này?");

    if (!confirmDelete) return;

    try {
      const response = await fetch(
        `${API_URL}/api/farmer/farms/${maNongTrai}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Xóa nông trại thất bại");
        return;
      }

      alert("Xóa nông trại thành công");
      await fetchFarms(user.ma_nguoi_dung);
    } catch (error) {
      console.error("Lỗi xóa nông trại:", error);
      alert("Không thể kết nối tới backend");
    }
  };

  // =========================================================
  // TÌM TÊN NGƯỜI QUẢN LÝ
  // =========================================================
  const getManagerName = (maNguoiDung) => {
    const manager = managers.find((item) => item.ma_nguoi_dung === maNguoiDung);

    if (manager) return manager.ho_ten;
    if (user?.ma_nguoi_dung === maNguoiDung) return user.ho_ten;

    return maNguoiDung;
  };

  // =========================================================
  // TỔNG DIỆN TÍCH
  // =========================================================
  const tongDienTich = farms.reduce((total, farm) => {
    return total + Number(farm.dien_tich_nong_trai || 0);
  }, 0);

  // =========================================================
  // ĐÓNG POPUP MÙA VỤ
  // =========================================================
  const handleCloseSeasonModal = () => {
    setShowSeasonModal(false);
    setShowMaterialForm(false);
  };

  return (
    <div className="nongdan dashboard-layout">
      {/* =====================================================
          HEADER
      ====================================================== */}
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
            <span className="profile-name">{user?.ho_ten || "Nông dân"}</span>
            <span className="profile-role">Nông dân</span>
          </div>
        </div>
      </header>

      {/* =====================================================
          BODY
      ====================================================== */}
      <div className="dashboard-body">
        {/* ===================================================
            SIDEBAR
        ==================================================== */}
        <aside className="dashboard-sidebar">
          <div>
            <div className="sidebar-heading">Chức năng canh tác</div>
            <nav className="sidebar-nav">
              <button
                type="button"
                onClick={() => setActiveTab("farm")}
                className={`nav-item-btn ${
                  activeTab === "farm" ? "active" : ""
                }`}
              >
                <Sprout size={20} />
                <span>Quản lý nông trại</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("season")}
                className={`nav-item-btn ${
                  activeTab === "season" ? "active" : ""
                }`}
              >
                <Wheat size={20} />
                <span>Quản lý mùa vụ</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("batch")}
                className={`nav-item-btn ${
                  activeTab === "batch" ? "active" : ""
                }`}
              >
                <PackageCheck size={20} />
                <span>Quản lý lô thu hoạch</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("inspection")}
                className={`nav-item-btn ${
                  activeTab === "inspection" ? "active" : ""
                }`}
              >
                <CalendarCheck size={20} />
                <span>Lịch hẹn kiểm định</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("shipping")}
                className={`nav-item-btn ${
                  activeTab === "shipping" ? "active" : ""
                }`}
              >
                <Truck size={20} />
                <span>Vận chuyển & Bàn giao</span>
              </button>
            </nav>
          </div>

          <div className="sidebar-footer">
            <span className="pulse-dot"></span>
            <span>
              Node nông dân: <b>Agri-Farm-Node</b>
            </span>
          </div>
        </aside>

        {/* ===================================================
            CONTENT
        ==================================================== */}
        <main className="dashboard-content">
          {/* =================================================
              TAB NÔNG TRẠI
          ================================================== */}
          {activeTab === "farm" && (
            <div>
              <div className="metrics-row">
                <div className="metric-card">
                  <div className="metric-title">Tổng diện tích canh tác</div>
                  <div className="metric-number">
                    {tongDienTich.toFixed(2)}
                    <span className="metric-unit">Hecta</span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-title">Số lô canh tác</div>
                  <div className="metric-number">0</div>
                </div>

                <div className="metric-card">
                  <div className="metric-title">Số nông trại</div>
                  <div className="metric-number">{farms.length}</div>
                </div>

                <div className="actions-box">
                  <button
                    className="btn-primary-action"
                    onClick={handleOpenAddFarm}
                  >
                    + Thêm nông trại
                  </button>
                  <div className="action-tip">
                    <span>🚜</span>
                    Thêm nông trại mới để bắt đầu quản lý mùa vụ
                  </div>
                </div>
              </div>

              {loadingFarms && <p>Đang tải danh sách nông trại...</p>}

              {farmError && <p style={{ color: "red" }}>{farmError}</p>}

              {!loadingFarms && !farmError && farms.length === 0 && (
                <p>Chưa có nông trại nào.</p>
              )}

              {farms.map((farm) => {
                const imageUrl = farm.anh_nong_trai
                  ? `${API_URL}${farm.anh_nong_trai}`
                  : DEFAULT_FARM_IMG;

                return (
                  <div className="farm-card" key={farm.ma_nong_trai}>
                    <img
                      src={imageUrl}
                      alt={farm.ten_nong_trai}
                      className="farm-image"
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_FARM_IMG;
                      }}
                    />

                    <div className="farm-details">
                      <div>
                        <h3 className="farm-name">{farm.ten_nong_trai}</h3>
                        <span className="tag-badge green">
                          {farm.ma_nong_trai}
                        </span>

                        <div className="farm-info-grid">
                          <div>
                            <div className="info-label">Diện tích</div>
                            <div className="info-val">
                              {farm.dien_tich_nong_trai || 0} ha
                            </div>
                          </div>

                          <div>
                            <div className="info-label">Địa chỉ</div>
                            <div className="info-val">
                              {farm.dia_diem_nong_trai}
                            </div>
                          </div>

                          <div>
                            <div className="info-label">Người quản lý</div>
                            <div className="info-val">
                              {getManagerName(farm.ma_nguoi_dung)}
                            </div>
                          </div>

                          <div>
                            <div className="info-label">Trạng thái</div>
                            <div className="info-val">
                              {farm.trang_thai === 1
                                ? "Đang hoạt động"
                                : "Ngưng hoạt động"}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="farm-card-buttons">
                        <button
                          className="btn-update"
                          onClick={handlechitietnongtrai}
                        >
                          Xem chi tiết
                        </button>

                        <button
                          className="btn-update"
                          onClick={() => handleEditFarm(farm)}
                        >
                          Sửa
                        </button>

                        <button
                          className="btn-map"
                          onClick={() => handleDeleteFarm(farm.ma_nong_trai)}
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* =================================================
              TAB MÙA VỤ
          ================================================== */}
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
                    {farms.map((farm) => (
                      <option key={farm.ma_nong_trai} value={farm.ma_nong_trai}>
                        {farm.ten_nong_trai}
                      </option>
                    ))}
                  </select>

                  <button
                    className="btn-primary-action"
                    onClick={() => setShowSeasonModal(true)}
                  >
                    + Thêm Mùa Vụ
                  </button>
                </div>
              </div>

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
                      <span className="tag-badge green">Dữ liệu mẫu</span>
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
                  </div>
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

                    {openDropdown === "season-1" && (
                      <div className="dropdown-menu">
                        <div
                          className="dropdown-item"
                          onClick={handlechitietmuavu}
                        >
                          Xem chi tiết
                        </div>
                        <div className="dropdown-divider"></div>
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

          {/* =================================================
              TAB LÔ THU HOẠCH
          ================================================== */}
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
                  <div className="metric-number">{farms.length}</div>
                </div>

                <div className="actions-box">
                  <button
                    className="btn-primary-action"
                    onClick={() => setShowBatchModal(true)}
                  >
                    + Tạo lô thu hoạch
                  </button>
                  <div className="action-tip">
                    <span>🌾</span>
                    Tạo lô thu hoạch nông sản của bạn
                  </div>
                </div>
              </div>

              <div className="table-container custom-scrollbar">
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

                            {openDropdown === "batch-1" && (
                              <div className="dropdown-menu">
                                <div
                                  className="dropdown-item"
                                  onClick={handlechitietmuavu}
                                >
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

          {/* =================================================
              TAB LỊCH HẸN KIỂM ĐỊNH (TỰ FIT KHUNG, KHÔNG TRÀN)
          ================================================== */}
          {activeTab === "inspection" && (
            <div className="inspection-view-wrapper">
              <div className="inspection-table-card">
                <table className="inspection-table">
                  <thead>
                    <tr>
                      <th className="col-code">Mã lịch</th>
                      <th>Mã lô kiểm định</th>
                      <th>Cơ quan kiểm định</th>
                      <th>Ngày hẹn kiểm tra</th>
                      <th>Ghi chú / Địa điểm</th>
                      <th>Trạng thái phê duyệt</th>
                      <th className="col-actions">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="col-code tracking-code">LH-2026-001</td>
                      <td className="nowrap-cell">
                        <span className="batch-code-badge">LA1-11111111</span>
                      </td>
                      <td className="agency-name">
                        Trung tâm Kiểm nghiệm Nông nghiệp Vùng 2
                      </td>
                      <td className="inspection-date">12/10/2026 (08:30)</td>
                      <td className="inspection-note">
                        Kiểm định dư lượng thuốc BVTV tại vườn
                      </td>
                      <td className="nowrap-cell">
                        <span className="status-pill success">
                          <CheckCircle2 size={14} />
                          Đã chấp nhận
                        </span>
                      </td>
                      <td className="col-actions">
                        <button type="button" className="btn-action-view">
                          <Eye size={14} />
                          Xem phiếu
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="col-code tracking-code">LH-2026-002</td>
                      <td className="nowrap-cell">
                        <span className="batch-code-badge">LA2-22091104</span>
                      </td>
                      <td className="agency-name">
                        Viện Tiêu chuẩn Chất lượng AgriCheck
                      </td>
                      <td className="inspection-date">16/10/2026 (14:00)</td>
                      <td className="inspection-note">
                        Lấy mẫu test độ ngọt và chuẩn VietGAP
                      </td>
                      <td className="nowrap-cell">
                        <span className="status-pill warning">
                          <Clock size={14} />
                          Chờ phê duyệt
                        </span>
                      </td>
                      <td className="col-actions">
                        <button type="button" className="btn-action-edit">
                          Sửa lịch
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="col-code tracking-code">LH-2026-003</td>
                      <td className="nowrap-cell">
                        <span className="batch-code-badge">LA1-09091801</span>
                      </td>
                      <td className="agency-name">
                        Chi cục Trồng trọt & BVTV Tỉnh
                      </td>
                      <td className="inspection-date">02/10/2026 (09:00)</td>
                      <td className="inspection-note">
                        Hồ sơ canh tác chưa cập nhật đủ nhật ký
                      </td>
                      <td className="nowrap-cell">
                        <span className="status-pill danger">Từ chối</span>
                      </td>
                      <td className="col-actions">
                        <button type="button" className="btn-action-retry">
                          Gửi lại đơn
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =================================================
              TAB VẬN CHUYỂN & BÀN GIAO
          ================================================== */}
          {activeTab === "shipping" && (
            <div>
              <div className="metrics-row">
                <div className="metric-card">
                  <div className="metric-title">Đơn đang vận chuyển</div>
                  <div className="metric-number">
                    2<span className="metric-unit">CHUYẾN</span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-title">Đã bàn giao thành công</div>
                  <div className="metric-number">12</div>
                </div>

                <div className="metric-card">
                  <div className="metric-title">Khối lượng đã xuất</div>
                  <div className="metric-number">
                    24.5<span className="metric-unit">TẤN</span>
                  </div>
                </div>

                <div className="actions-box">
                  <button
                    className="btn-primary-action"
                    onClick={() => {
                      setSelectedBatchCode("");
                      setShowShippingModal(true);
                    }}
                  >
                    + Tạo lệnh bàn giao
                  </button>
                  <div className="action-tip">
                    <span>🚛</span>
                    Theo dõi hành trình nông sản từ kho tới đơn vị sơ chế đóng
                    gói
                  </div>
                </div>
              </div>

              <div className="shipping-table-card custom-scrollbar">
                <table className="shipping-table">
                  <thead>
                    <tr>
                      <th className="col-code">Mã vận đơn</th>
                      <th>Mã lô hàng</th>
                      <th>Tên sản phẩm</th>
                      <th>Đơn vị vận chuyển</th>
                      <th>Khối lượng</th>
                      <th>Thời gian xuất</th>
                      <th>Trạng thái</th>
                      <th className="col-actions">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* DÒNG 1 */}
                    <tr>
                      <td className="col-code tracking-code">VD-LOG-9901</td>
                      <td>
                        <span className="batch-code-badge">#SC-2026-002</span>
                      </td>
                      <td className="product-name">Cam Sành Đóng Thùng 10kg</td>
                      <td>
                        <div className="carrier-name">
                          Mekong Cold Logistics
                        </div>
                        <div className="carrier-sub">
                          Võ Minh Toàn (51D-891.22)
                        </div>
                      </td>
                      <td className="package-weight">800 kg</td>
                      <td className="export-time">04/10/2026 - 16:30</td>
                      <td>
                        <span className="status-pill info">
                          <Truck size={14} />
                          Đang vận chuyển
                        </span>
                      </td>
                      <td className="col-actions">
                        <button type="button" className="btn-action-detail">
                          <Eye size={14} />
                          Chi tiết
                        </button>
                      </td>
                    </tr>

                    {/* DÒNG 2 */}
                    <tr>
                      <td className="col-code tracking-code">VD-LOG-8812</td>
                      <td>
                        <span className="batch-code-badge">#SC-2026-000</span>
                      </td>
                      <td className="product-name">Xoài Cát Hòa Lộc Hộp Quà</td>
                      <td>
                        <div className="carrier-name">
                          Giao Hàng Nhanh AgriShip
                        </div>
                        <div className="carrier-sub">
                          Phạm Quốc Bảo (64A-012.89)
                        </div>
                      </td>
                      <td className="package-weight">1,200 kg</td>
                      <td className="export-time">02/10/2026 - 09:15</td>
                      <td>
                        <span className="status-pill success">
                          <CheckCircle2 size={14} />
                          Đã hoàn thành
                        </span>
                      </td>
                      <td className="col-actions">
                        <button type="button" className="btn-action-detail">
                          <Eye size={14} />
                          Chi tiết
                        </button>
                      </td>
                    </tr>

                    {/* DÒNG 3 */}
                    <tr>
                      <td className="col-code tracking-code">VD-LOG-7721</td>
                      <td>
                        <span className="batch-code-badge">#SC-2026-003</span>
                      </td>
                      <td className="product-name">Bưởi Năm Roi Xuất Khẩu</td>
                      <td>
                        <div className="carrier-name">
                          Vận Tải Lạnh Miền Tây
                        </div>
                        <div className="carrier-sub">
                          Lê Hoàng Phúc (65C-112.56)
                        </div>
                      </td>
                      <td className="package-weight">2,000 kg</td>
                      <td className="export-time">04/10/2026 - 17:00</td>
                      <td>
                        <span className="status-pill warning">
                          <Clock size={14} />
                          Chờ chấp nhận
                        </span>
                      </td>
                      <td className="col-actions">
                        <button type="button" className="btn-action-detail">
                          <Eye size={14} />
                          Chi tiết
                        </button>
                      </td>
                    </tr>

                    {/* DÒNG 4 */}
                    <tr>
                      <td className="col-code tracking-code">VD-LOG-6655</td>
                      <td>
                        <span className="batch-code-badge">#SC-2026-004</span>
                      </td>
                      <td className="product-name">
                        Chanh Không Hạt Đóng Thùng
                      </td>
                      <td>
                        <div className="carrier-name">Mekong Logistics</div>
                        <div className="carrier-sub">
                          Nguyễn Văn Hưng (66B-098.33)
                        </div>
                      </td>
                      <td className="package-weight">650 kg</td>
                      <td className="export-time">04/10/2026 - 17:30</td>
                      <td>
                        <span className="status-pill purple">
                          <Clock size={14} />
                          Chờ tiếp nhận
                        </span>
                      </td>
                      <td className="col-actions">
                        <button type="button" className="btn-action-detail">
                          <Eye size={14} />
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* =====================================================
          POPUP THÊM / SỬA NÔNG TRẠI
      ====================================================== */}
      {showFarmModal && (
        <div className="modal-overlay">
          <form
            className="modal-container"
            onSubmit={editingFarm ? handleUpdateFarm : handleAddFarm}
          >
            <div className="modal-header">
              <h3>
                {editingFarm ? "Cập nhật nông trại" : "Thông tin nông trại"}
              </h3>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Mã nông trại</label>
                <input
                  type="text"
                  name="ma_nong_trai"
                  value={farmForm.ma_nong_trai}
                  onChange={handleFarmInputChange}
                  placeholder="VD: NT002"
                  readOnly={!!editingFarm}
                />
              </div>

              <div className="form-group">
                <label>Tên nông trại</label>
                <input
                  type="text"
                  name="ten_nong_trai"
                  value={farmForm.ten_nong_trai}
                  onChange={handleFarmInputChange}
                  placeholder="Nhập tên nông trại của bạn"
                />
              </div>

              <div className="form-group">
                <label>Người quản lý</label>
                <select
                  name="ma_nguoi_dung"
                  value={farmForm.ma_nguoi_dung}
                  onChange={handleFarmInputChange}
                >
                  <option value="">-- Chọn người quản lý --</option>
                  {managers.map((manager) => (
                    <option
                      key={manager.ma_nguoi_dung}
                      value={manager.ma_nguoi_dung}
                    >
                      {manager.ho_ten}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Địa chỉ</label>
                <input
                  type="text"
                  name="dia_diem_nong_trai"
                  value={farmForm.dia_diem_nong_trai}
                  onChange={handleFarmInputChange}
                  placeholder="Xã/phường, tỉnh/thành phố"
                />
              </div>

              <div className="form-group">
                <label>Diện tích (ha)</label>
                <input
                  type="number"
                  name="dien_tich_nong_trai"
                  value={farmForm.dien_tich_nong_trai}
                  onChange={handleFarmInputChange}
                  placeholder="VD: 5.5"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label>Ảnh của nông trại</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFarmImageChange}
                />
              </div>

              {farmImagePreview && (
                <div className="form-group">
                  <label>Ảnh hiện tại</label>
                  <img
                    src={farmImagePreview}
                    alt="Xem trước"
                    style={{
                      width: "100%",
                      maxHeight: "220px",
                      objectFit: "cover",
                      borderRadius: "8px",
                    }}
                  />
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={handleCloseFarmModal}
                disabled={savingFarm}
              >
                Hủy
              </button>

              <button type="submit" className="btn-save" disabled={savingFarm}>
                {savingFarm
                  ? "Đang lưu..."
                  : editingFarm
                    ? "Cập nhật"
                    : "Lưu thông tin"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================
          POPUP MÙA VỤ
      ====================================================== */}
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
                    type="button"
                    className="btn-add-small"
                    onClick={() => setShowMaterialForm(true)}
                  >
                    + Thêm
                  </button>
                </div>

                {showMaterialForm && (
                  <div className="material-box">
                    <button
                      type="button"
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
                            <input type="radio" name="vattu" />
                            Phân bón
                          </label>
                          <label>
                            <input type="radio" name="vattu" />
                            Thuốc BVTV
                          </label>
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Tên phân thuốc</label>
                        <select>
                          <option>-- Chọn vật tư --</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Liều lượng</label>
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
              <button
                type="button"
                className="btn-cancel"
                onClick={handleCloseSeasonModal}
              >
                Hủy
              </button>

              <button type="button" className="btn-save">
                Lưu thông tin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          POPUP LÔ THU HOẠCH
      ====================================================== */}
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
                type="button"
                className="btn-cancel"
                onClick={() => setShowBatchModal(false)}
              >
                Hủy
              </button>

              <button type="button" className="btn-save">
                Lưu thông tin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          POPUP TẠO LỆNH VẬN CHUYỂN & BÀN GIAO
      ====================================================== */}
      {showShippingModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Tạo Lệnh Vận Chuyển & Bàn Giao</h3>
            </div>

            <div className="modal-body">
              {/* CHỌN LÔ */}
              <div className="form-group">
                <label>Chọn lô nông sản</label>
                <select
                  value={selectedBatchCode}
                  onChange={(e) => setSelectedBatchCode(e.target.value)}
                >
                  <option value="">-- Chọn lô thu hoạch --</option>
                  {availableBatches.map((item) => (
                    <option key={item.ma_lo} value={item.ma_lo}>
                      {item.ma_lo} - {item.ten_lo}
                    </option>
                  ))}
                </select>
              </div>

              {/* TỰ ĐỘNG CẬP NHẬT THÔNG TIN HOẶC ĐỂ CHƯA CÓ THÔNG TIN */}
              <div className="form-grid-2 readonly-grid">
                <div className="readonly-item">
                  <label>Mã lô</label>
                  <span
                    style={{
                      color: selectedBatchInfo ? "#1f2937" : "#9ca3af",
                      fontWeight: selectedBatchInfo ? 600 : 400,
                    }}
                  >
                    {selectedBatchInfo?.ma_lo || "Chưa có thông tin"}
                  </span>
                </div>

                <div className="readonly-item">
                  <label>Nông trại</label>
                  <span
                    style={{
                      color: selectedBatchInfo ? "#1f2937" : "#9ca3af",
                      fontWeight: selectedBatchInfo ? 600 : 400,
                    }}
                  >
                    {selectedBatchInfo?.ma_nong_trai || "Chưa có thông tin"}
                  </span>
                </div>

                <div className="readonly-item">
                  <label>Tên nông sản</label>
                  <span
                    style={{
                      color: selectedBatchInfo ? "#1f2937" : "#9ca3af",
                      fontWeight: selectedBatchInfo ? 600 : 400,
                    }}
                  >
                    {selectedBatchInfo?.ten_nong_san || "Chưa có thông tin"}
                  </span>
                </div>

                <div className="readonly-item">
                  <label>Sản lượng</label>
                  <span
                    style={{
                      color: selectedBatchInfo ? "#1f2937" : "#9ca3af",
                      fontWeight: selectedBatchInfo ? 600 : 400,
                    }}
                  >
                    {selectedBatchInfo?.san_luong || "Chưa có thông tin"}
                  </span>
                </div>

                <div className="readonly-item">
                  <label>Ngày thu hoạch</label>
                  <span
                    style={{
                      color: selectedBatchInfo ? "#1f2937" : "#9ca3af",
                      fontWeight: selectedBatchInfo ? 600 : 400,
                    }}
                  >
                    {selectedBatchInfo?.ngay_thu_hoach || "Chưa có thông tin"}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowShippingModal(false)}
              >
                Hủy
              </button>

              <button
                type="button"
                className="btn-save"
                onClick={() => {
                  alert("Đã tạo lệnh vận chuyển & bàn giao thành công");
                  setShowShippingModal(false);
                }}
              >
                Tạo lệnh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
