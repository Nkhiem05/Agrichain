import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Truck,
  PackageCheck,
  MapPin,
  ClipboardCheck,
  Plus,
  Navigation,
  CheckCircle,
  PackageSearch,
  ArrowUpRight,
  Check,
  X,
  FileSpreadsheet,
  Download,
  Clock,
  CheckCircle2,
  Eye,
  XCircle,
  AlertCircle,
  LogOut,
} from "lucide-react";
import "../../css/donvivanchuyen.css";
import {
  fetchMyTrips,
  acceptTrip,
  rejectTrip,
  confirmPickup,
  confirmArrival,
} from "../../../api/donvivanchuyenApi";

const DEFAULT_LOGO_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png";

const STATUS_LABEL = {
  CHO_CHAP_NHAN: { text: "Chờ chấp nhận", tone: "purple", icon: Clock },
  CHO_LAY_HANG: { text: "Chờ lấy hàng", tone: "amber", icon: PackageSearch },
  DANG_VAN_CHUYEN: { text: "Đang vận chuyển", tone: "blue", icon: Navigation },
  CHO_TIEP_NHAN: { text: "Đã đến nơi - Chờ bên nhận xác nhận", tone: "emerald", icon: ClipboardCheck },
  HOAN_THANH: { text: "Đã hoàn thành", tone: "success", icon: CheckCircle2 },
  TU_CHOI: { text: "Đã từ chối", tone: "danger", icon: XCircle },
  DA_HUY: { text: "Đã hủy", tone: "danger", icon: XCircle },
};

const formatWeight = (value, unit) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return `- ${unit || ""}`;
  return `${num.toLocaleString("vi-VN")} ${unit || ""}`;
};

const tripRoute = (t) =>
  `${t.ten_nguoi_gui || "—"} ➔ ${t.ten_ben_nhan || t.dia_chi_giao_hang || "—"}`;

export default function AgriChainLogistics() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentTab, setCurrentTab] = useState("shipping");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [acceptModalTrip, setAcceptModalTrip] = useState(null);
  const [acceptForm, setAcceptForm] = useState({ ten_tai_xe: "", bien_so_xe: "" });

  const [rejectModalTrip, setRejectModalTrip] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const [pickupModalTrip, setPickupModalTrip] = useState(null);
  const [pickupWeight, setPickupWeight] = useState("");

  const [detailTrip, setDetailTrip] = useState(null);

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

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/dang-nhap");
  };

  const loadTrips = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetchMyTrips();
      setTrips(res?.data || []);
    } catch (err) {
      setErrorMsg(err.message || "Không thể tải danh sách chuyến vận chuyển");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadTrips();
  }, [user, loadTrips]);

  // ==================== CHẤP NHẬN / TỪ CHỐI ====================

  const handleOpenAccept = (trip) => {
    setAcceptModalTrip(trip);
    setAcceptForm({ ten_tai_xe: trip.ten_tai_xe || "", bien_so_xe: trip.bien_so_xe || "" });
  };

  const handleSubmitAccept = async () => {
    if (!acceptForm.ten_tai_xe.trim() || !acceptForm.bien_so_xe.trim()) {
      alert("Vui lòng nhập tên tài xế và biển số xe phụ trách!");
      return;
    }
    try {
      await acceptTrip(acceptModalTrip.ma_van_don, acceptForm.ten_tai_xe.trim(), acceptForm.bien_so_xe.trim());
      setAcceptModalTrip(null);
      await loadTrips();
      alert(`Đã chấp nhận chuyến ${acceptModalTrip.ma_van_don}!`);
    } catch (err) {
      alert(err.message || "Không thể chấp nhận chuyến");
    }
  };

  const handleOpenReject = (trip) => {
    setRejectModalTrip(trip);
    setRejectReason("");
  };

  const handleSubmitReject = async () => {
    if (!rejectReason.trim()) {
      alert("Vui lòng nhập lý do từ chối!");
      return;
    }
    try {
      await rejectTrip(rejectModalTrip.ma_van_don, rejectReason.trim());
      setRejectModalTrip(null);
      await loadTrips();
    } catch (err) {
      alert(err.message || "Không thể từ chối chuyến");
    }
  };

  // ==================== LẤY HÀNG ====================

  const handleOpenPickup = (trip) => {
    setPickupModalTrip(trip);
    setPickupWeight(String(Math.round(Number(trip.khoi_luong))));
  };

  const handleSubmitPickup = async () => {
    const value = Number(pickupWeight);
    if (!pickupWeight || !Number.isFinite(value) || value <= 0) {
      alert("Vui lòng nhập khối lượng thực nhận hợp lệ!");
      return;
    }
    try {
      await confirmPickup(pickupModalTrip.ma_van_don, value);
      setPickupModalTrip(null);
      await loadTrips();
      alert(`Đã xác nhận lấy hàng chuyến ${pickupModalTrip.ma_van_don}, xe bắt đầu vận chuyển!`);
    } catch (err) {
      alert(err.message || "Không thể xác nhận lấy hàng");
    }
  };

  // ==================== ĐẾN NƠI ====================

  const handleConfirmArrival = async (trip) => {
    if (!window.confirm(`Xác nhận xe đã đến điểm giao cho chuyến ${trip.ma_van_don}?`)) return;
    try {
      await confirmArrival(trip.ma_van_don);
      await loadTrips();
      alert("Đã xác nhận đến nơi. Chờ bên nhận xác nhận tiếp nhận.");
    } catch (err) {
      alert(err.message || "Không thể xác nhận đến nơi");
    }
  };

  // ==================== XUẤT FILE ====================

  const exportToJson = (data, filename = "agrichain_logistics_data.json") => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToCsv = (dataList, filename = "chuyen_xe_logistics.csv") => {
    if (!dataList || !dataList.length) return;
    const headers = [
      "Mã Chuyến", "Mã Lô", "Sản Phẩm", "Người Gửi", "Bên Nhận", "Tài Xế", "Biển Số",
      "Khối Lượng", "Trạng Thái",
    ];
    const rows = dataList.map((t) => [
      t.ma_van_don, t.ma_lo_nong_san, `"${t.ten_san_pham}"`, `"${t.ten_nguoi_gui || ""}"`,
      `"${t.ten_ben_nhan || t.dia_chi_giao_hang || ""}"`, `"${t.ten_tai_xe || ""}"`,
      t.bien_so_xe || "", `"${formatWeight(t.khoi_luong, t.don_vi_tinh)}"`, t.trang_thai,
    ]);
    const csvContent = "﻿" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ==================== LỌC ====================

  const filteredTrips = trips.filter((t) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      t.ma_van_don.toLowerCase().includes(term) ||
      (t.bien_so_xe || "").toLowerCase().includes(term) ||
      t.ma_lo_nong_san.toLowerCase().includes(term) ||
      t.ten_san_pham.toLowerCase().includes(term);

    const matchesStatus = statusFilter === "all" ? true : t.trang_thai === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pickupTrips = trips.filter((t) => t.trang_thai === "CHO_LAY_HANG");
  const pickupHistory = trips.filter((t) =>
    ["DANG_VAN_CHUYEN", "CHO_TIEP_NHAN", "HOAN_THANH"].includes(t.trang_thai),
  );
  const deliveryTrips = trips.filter((t) => t.trang_thai === "DANG_VAN_CHUYEN");
  const deliveryHistory = trips.filter((t) => ["CHO_TIEP_NHAN", "HOAN_THANH"].includes(t.trang_thai));

  if (!user) return null;

  return (
    <div className="vanchuyen">
      <div className="app-container">
        <header className="dashboard-header">
          <div className="header-left">
            <img src={DEFAULT_LOGO_IMG} alt="Logo" className="header-logo-icon" />
            <span className="header-brand-title">AGRICHAIN</span>
          </div>

          <div className="header-search-bar">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm mã chuyến, mã lô, biển số..."
            />
          </div>

          <div
            className="header-profile"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/trang-ca-nhan")}
            title="Xem hồ sơ cá nhân"
          >
            <div className="avatar-circle" style={{ overflow: "hidden" }}>
              {user.anh_dai_dien ? (
                <img
                  src={`http://localhost:3000${user.anh_dai_dien}`}
                  alt="avatar"
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                />
              ) : (
                (user.ho_ten || "VC").slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="profile-meta">
              <span className="profile-name">{user.ho_ten || "Đơn vị vận chuyển"}</span>
              <span className="profile-role">Đơn vị vận chuyển</span>
            </div>
          </div>
        </header>

        <div className="body-layout">
          <aside className="sidebar no-scrollbar">
            <div className="sidebar-title">Nghiệp vụ logistics</div>
            <nav className="sidebar-nav">
              <button
                onClick={() => setCurrentTab("shipping")}
                className={`nav-item ${currentTab === "shipping" ? "active" : ""}`}
              >
                <Truck size={20} />
                <span>Quản lý vận chuyển</span>
              </button>

              <button
                onClick={() => setCurrentTab("pickup")}
                className={`nav-item ${currentTab === "pickup" ? "active" : ""}`}
              >
                <PackageCheck size={20} />
                <span>Xác nhận lấy hàng đi</span>
              </button>

              <button
                onClick={() => setCurrentTab("delivery")}
                className={`nav-item ${currentTab === "delivery" ? "active" : ""}`}
              >
                <ClipboardCheck size={20} />
                <span>Xác nhận giao hàng đến</span>
              </button>
            </nav>

            <div style={{ padding: "0 12px 12px 12px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <button
                onClick={() => exportToCsv(trips)}
                className="btn-secondary"
                style={{ width: "100%", justifyContent: "center", fontSize: "11px", padding: "6px" }}
              >
                <FileSpreadsheet size={14} />
                <span>Xuất file Excel/CSV</span>
              </button>
              <button
                onClick={() => exportToJson(trips)}
                className="btn-secondary"
                style={{ width: "100%", justifyContent: "center", fontSize: "11px", padding: "6px" }}
              >
                <Download size={14} />
                <span>Export Dữ Liệu JSON</span>
              </button>
            </div>

            <div style={{ marginTop: "auto" }}>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "calc(100% - 24px)",
                  margin: "0 12px 10px",
                  padding: "10px 12px",
                  border: "1px solid #fecaca",
                  background: "#fef2f2",
                  color: "#dc2626",
                  borderRadius: 8,
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <LogOut size={17} />
                Đăng xuất
              </button>

              <div className="sidebar-footer">
                <div className="iot-status">
                  <span className="pulse-dot"></span>
                  <span>
                    Tài khoản: <b>{user.ten_dang_nhap}</b>
                  </span>
                </div>
              </div>
            </div>
          </aside>

          <div className="main-wrapper no-scrollbar">
            {errorMsg && (
              <div style={{ background: "#fef2f2", color: "#dc2626", padding: "12px 16px", borderRadius: "8px", margin: "16px" }}>
                {errorMsg}
              </div>
            )}

            {loading ? (
              <div style={{ padding: "48px", textAlign: "center", color: "#6b7280" }}>Đang tải dữ liệu...</div>
            ) : (
              <>
                {/* TAB 1: QUẢN LÝ VẬN CHUYỂN */}
                {currentTab === "shipping" && (
                  <main className="view-container">
                    <div className="metrics-row">
                      <div className="metric-card">
                        <div className="metric-title">Đơn chờ chấp nhận</div>
                        <div className="metric-number">
                          {trips.filter((t) => t.trang_thai === "CHO_CHAP_NHAN").length}
                          <span className="metric-unit">ĐƠN CHỜ NHẬN</span>
                        </div>
                      </div>

                      <div className="metric-card">
                        <div className="metric-title">Đơn chờ lấy hàng</div>
                        <div className="metric-number">
                          {trips.filter((t) => t.trang_thai === "CHO_LAY_HANG").length}
                          <span className="metric-unit">ĐƠN SẴN SÀNG</span>
                        </div>
                      </div>

                      <div className="metric-card">
                        <div className="metric-title">Chuyến xe đang chạy</div>
                        <div className="metric-number">
                          {trips.filter((t) => t.trang_thai === "DANG_VAN_CHUYEN").length}
                          <span className="metric-unit">CHUYẾN ĐANG LĂN BÁNH</span>
                        </div>
                      </div>

                      <div className="actions-box">
                        <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                          <option value="all">-- Tất cả trạng thái --</option>
                          <option value="CHO_CHAP_NHAN">Chờ chấp nhận</option>
                          <option value="CHO_LAY_HANG">Chờ lấy hàng</option>
                          <option value="DANG_VAN_CHUYEN">Đang vận chuyển</option>
                          <option value="CHO_TIEP_NHAN">Chờ bên nhận xác nhận</option>
                          <option value="HOAN_THANH">Đã hoàn thành</option>
                          <option value="TU_CHOI">Đã từ chối</option>
                        </select>
                      </div>
                    </div>

                    <div className="shipment-list-scroll">
                      {filteredTrips.length === 0 ? (
                        <div className="section-card" style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
                          <AlertCircle size={36} style={{ margin: "0 auto 10px", color: "#9ca3af" }} />
                          Không có chuyến vận chuyển nào phù hợp với bộ lọc hiện tại.
                        </div>
                      ) : (
                        filteredTrips.map((trip) => {
                          const statusInfo = STATUS_LABEL[trip.trang_thai] || STATUS_LABEL.CHO_CHAP_NHAN;
                          const StatusIcon = statusInfo.icon;

                          return (
                            <div key={trip.ma_van_don} className="trip-card">
                              <div className="trip-card-left">
                                <div
                                  className={`icon-avatar ${
                                    trip.trang_thai === "DANG_VAN_CHUYEN"
                                      ? "blue"
                                      : trip.trang_thai === "CHO_CHAP_NHAN"
                                        ? "purple"
                                        : trip.trang_thai === "CHO_TIEP_NHAN"
                                          ? "emerald"
                                          : "amber"
                                  }`}
                                >
                                  <StatusIcon size={30} />
                                </div>
                                <div className="trip-details">
                                  <div className="trip-header-line">
                                    <h3>{trip.ten_san_pham}</h3>
                                    <span className="tag-gray">#{trip.ma_van_don}</span>
                                    <span className="tag-green">Mã lô: {trip.ma_lo_nong_san}</span>
                                  </div>

                                  <div className="trip-meta-row">
                                    <p>
                                      Xe tải & Tài xế:{" "}
                                      <span className="meta-val">
                                        {trip.bien_so_xe || "Chưa phân công"} ({trip.ten_tai_xe || "Chưa phân công"})
                                      </span>
                                    </p>
                                    <p>
                                      Lộ trình: <span className="meta-val">{tripRoute(trip)}</span>
                                    </p>
                                    <p>
                                      Khối lượng hàng:{" "}
                                      <span className="highlight-weight">{formatWeight(trip.khoi_luong, trip.don_vi_tinh)}</span>
                                    </p>
                                    <p>
                                      Thời gian xuất: <span className="meta-val">{trip.thoi_gian_xuat}</span>
                                    </p>
                                  </div>

                                  <div>
                                    <span className={`status-badge-${statusInfo.tone}`}>
                                      <StatusIcon size={13} style={{ marginRight: "4px" }} />
                                      {statusInfo.text}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="actions-vertical">
                                <button onClick={() => setDetailTrip(trip)} className="btn-action-detail">
                                  <Eye size={15} />
                                  <span>Xem chi tiết</span>
                                </button>

                                {trip.trang_thai === "CHO_CHAP_NHAN" && (
                                  <>
                                    <button onClick={() => handleOpenAccept(trip)} className="btn-primary" style={{ backgroundColor: "#7c3aed" }}>
                                      <CheckCircle2 size={16} />
                                      <span>Chấp nhận vận chuyển</span>
                                    </button>
                                    <button onClick={() => handleOpenReject(trip)} className="btn-secondary" style={{ color: "#dc2626" }}>
                                      <XCircle size={16} />
                                      <span>Từ chối</span>
                                    </button>
                                  </>
                                )}

                                {trip.trang_thai === "CHO_LAY_HANG" && (
                                  <button onClick={() => handleOpenPickup(trip)} className="btn-primary">
                                    <ArrowUpRight size={16} />
                                    <span>Xác nhận lấy hàng đi</span>
                                  </button>
                                )}

                                {trip.trang_thai === "DANG_VAN_CHUYEN" && (
                                  <button onClick={() => handleConfirmArrival(trip)} className="btn-primary">
                                    <CheckCircle size={14} />
                                    <span>Xác nhận đã đến nơi</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </main>
                )}

                {/* TAB 2: XÁC NHẬN LẤY HÀNG ĐI */}
                {currentTab === "pickup" && (
                  <main className="view-container" style={{ overflowY: "auto", paddingBottom: "36px" }}>
                    <div className="section-header-box">
                      <div>
                        <h2>Biên Bản Nhận Hàng & Xuất Phát</h2>
                        <p>Các chuyến đã được chấp nhận, đang chờ xe đến lấy hàng tại điểm gửi.</p>
                      </div>
                    </div>

                    {pickupTrips.length === 0 ? (
                      <div className="section-card" style={{ textAlign: "center", padding: "32px", color: "#6b7280" }}>
                        Không có chuyến nào đang chờ lấy hàng.
                      </div>
                    ) : (
                      pickupTrips.map((trip) => (
                        <div className="section-card" key={trip.ma_van_don} style={{ marginBottom: "12px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <p style={{ fontWeight: 700, color: "#1f2937" }}>
                                {trip.ten_san_pham} (#{trip.ma_lo_nong_san} - {formatWeight(trip.khoi_luong, trip.don_vi_tinh)})
                              </p>
                              <p style={{ color: "#6b7280", fontSize: "13px" }}>
                                Lấy từ: {trip.ten_nguoi_gui} ➔ Tài xế {trip.ten_tai_xe} ({trip.bien_so_xe})
                              </p>
                            </div>
                            <button onClick={() => handleOpenPickup(trip)} className="btn-primary">
                              <ArrowUpRight size={16} />
                              <span>Xác nhận lấy hàng</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}

                    <div className="section-card" style={{ marginTop: "16px" }}>
                      <div style={{ fontWeight: 700, fontSize: "14px", color: "#1f2937", marginBottom: "10px" }}>
                        Lịch sử các chuyến đã lấy hàng
                      </div>
                      {pickupHistory.length === 0 ? (
                        <p style={{ color: "#9ca3af", fontSize: "13px" }}>Chưa có chuyến nào.</p>
                      ) : (
                        pickupHistory.map((t) => (
                          <div
                            key={t.ma_van_don}
                            style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6", fontSize: "13px" }}
                          >
                            <span>
                              {t.ten_san_pham} (#{t.ma_lo_nong_san}) - {formatWeight(t.khoi_luong, t.don_vi_tinh)}
                            </span>
                            <span style={{ color: "#6b7280" }}>{STATUS_LABEL[t.trang_thai]?.text}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </main>
                )}

                {/* TAB 3: XÁC NHẬN GIAO HÀNG ĐẾN */}
                {currentTab === "delivery" && (
                  <main className="view-container" style={{ overflowY: "auto", paddingBottom: "36px" }}>
                    <div className="section-header-box">
                      <div>
                        <h2>Xác Nhận Đến Điểm Giao</h2>
                        <p>
                          Khi xe đến nơi, bấm xác nhận để báo cho bên nhận biết hàng đã tới — bên nhận sẽ tự
                          xác nhận tiếp nhận ở trang của họ.
                        </p>
                      </div>
                    </div>

                    {deliveryTrips.length === 0 ? (
                      <div className="section-card" style={{ textAlign: "center", padding: "32px", color: "#6b7280" }}>
                        Không có chuyến nào đang trên đường.
                      </div>
                    ) : (
                      deliveryTrips.map((trip) => (
                        <div className="section-card" key={trip.ma_van_don} style={{ marginBottom: "12px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <h3 style={{ fontWeight: 700, fontSize: "15px", color: "#1f2937" }}>
                                #{trip.ma_van_don} - {trip.ten_san_pham} ({trip.ma_lo_nong_san})
                              </h3>
                              <p style={{ fontSize: "12.5px", color: "#6b7280" }}>
                                Điểm giao: {trip.ten_ben_nhan || trip.dia_chi_giao_hang || "—"}
                              </p>
                            </div>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button onClick={() => setDetailTrip(trip)} className="btn-action-detail">
                                <Eye size={15} />
                                <span>Xem chi tiết</span>
                              </button>
                              <button onClick={() => handleConfirmArrival(trip)} className="btn-primary">
                                <Check size={16} />
                                <span>Xác nhận đã đến nơi</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}

                    <div className="section-card" style={{ marginTop: "16px" }}>
                      <div style={{ fontWeight: 700, fontSize: "14px", color: "#1f2937", marginBottom: "10px" }}>
                        Các chuyến đã đến nơi / hoàn thành
                      </div>
                      {deliveryHistory.length === 0 ? (
                        <p style={{ color: "#9ca3af", fontSize: "13px" }}>Chưa có chuyến nào.</p>
                      ) : (
                        deliveryHistory.map((t) => (
                          <div
                            key={t.ma_van_don}
                            style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6", fontSize: "13px" }}
                          >
                            <span>
                              {t.ten_san_pham} (#{t.ma_lo_nong_san}) - {formatWeight(t.khoi_luong, t.don_vi_tinh)}
                            </span>
                            <span style={{ color: "#6b7280" }}>{STATUS_LABEL[t.trang_thai]?.text}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </main>
                )}
              </>
            )}
          </div>
        </div>

        {/* MODAL: CHẤP NHẬN CHUYẾN */}
        {acceptModalTrip && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>
                  <CheckCircle2 size={20} color="#2e8b57" /> Chấp Nhận Chuyến Vận Chuyển
                </h3>
                <button className="modal-close-btn" onClick={() => setAcceptModalTrip(null)}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <p style={{ color: "#4b5563" }}>
                  Chuyến #{acceptModalTrip.ma_van_don}: <b>{acceptModalTrip.ten_san_pham}</b> ({acceptModalTrip.ma_lo_nong_san})
                </p>
                <div className="form-group">
                  <label>Tài xế phụ trách (*)</label>
                  <input
                    type="text"
                    value={acceptForm.ten_tai_xe}
                    onChange={(e) => setAcceptForm({ ...acceptForm, ten_tai_xe: e.target.value })}
                    className="form-input"
                    placeholder="Nguyễn Văn Hùng"
                  />
                </div>
                <div className="form-group">
                  <label>Biển số xe (*)</label>
                  <input
                    type="text"
                    value={acceptForm.bien_so_xe}
                    onChange={(e) => setAcceptForm({ ...acceptForm, bien_so_xe: e.target.value })}
                    className="form-input"
                    placeholder="65C-128.45"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-cancel" onClick={() => setAcceptModalTrip(null)}>
                  Hủy
                </button>
                <button className="btn-primary" onClick={handleSubmitAccept}>
                  Xác Nhận Chấp Nhận
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: TỪ CHỐI CHUYẾN */}
        {rejectModalTrip && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3 style={{ color: "#dc2626" }}>
                  <XCircle size={20} color="#dc2626" /> Từ Chối Chuyến Vận Chuyển
                </h3>
                <button className="modal-close-btn" onClick={() => setRejectModalTrip(null)}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <p style={{ color: "#4b5563" }}>
                  Chuyến #{rejectModalTrip.ma_van_don}: <b>{rejectModalTrip.ten_san_pham}</b>
                </p>
                <div className="form-group">
                  <label>Lý do từ chối (*)</label>
                  <textarea
                    rows={3}
                    className="form-textarea"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="VD: Xe đang bận tuyến khác, quá tải trọng..."
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-cancel" onClick={() => setRejectModalTrip(null)}>
                  Đóng
                </button>
                <button className="btn-primary" style={{ backgroundColor: "#dc2626" }} onClick={handleSubmitReject}>
                  Xác Nhận Từ Chối
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: XÁC NHẬN LẤY HÀNG */}
        {pickupModalTrip && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>
                  <PackageCheck size={20} color="#2e8b57" /> Xác Nhận Lấy Hàng Lên Xe
                </h3>
                <button className="modal-close-btn" onClick={() => setPickupModalTrip(null)}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <p style={{ color: "#4b5563" }}>
                  Chuyến: <b>#{pickupModalTrip.ma_van_don}</b> | Lô hàng: <b>{pickupModalTrip.ten_san_pham}</b> ({pickupModalTrip.ma_lo_nong_san})
                </p>
                <div className="form-group">
                  <label>Khối lượng thực nhận (kg)</label>
                  <input
                    type="number"
                    value={pickupWeight}
                    onChange={(e) => setPickupWeight(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-cancel" onClick={() => setPickupModalTrip(null)}>
                  Đóng
                </button>
                <button className="btn-primary" onClick={handleSubmitPickup}>
                  Xác Nhận & Xuất Phát
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: XEM CHI TIẾT CHUYẾN */}
        {detailTrip && (
          <div className="modal-overlay">
            <div className="modal-content lg">
              <div className="modal-header">
                <h3>
                  <Eye size={20} color="#2563eb" /> Chi Tiết Chuyến Vận Chuyển #{detailTrip.ma_van_don}
                </h3>
                <button className="modal-close-btn" onClick={() => setDetailTrip(null)}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <div className="form-grid-2 readonly-grid" style={{ gap: "14px" }}>
                  <div className="readonly-item">
                    <label>Mã chuyến</label>
                    <span style={{ fontWeight: 700, color: "#1d4ed8" }}>#{detailTrip.ma_van_don}</span>
                  </div>
                  <div className="readonly-item">
                    <label>Mã lô nông sản</label>
                    <span className="tag-green" style={{ width: "fit-content" }}>
                      #{detailTrip.ma_lo_nong_san}
                    </span>
                  </div>
                  <div className="readonly-item">
                    <label>Tên nông sản / hàng hóa</label>
                    <span style={{ fontWeight: 600, color: "#1f2937" }}>{detailTrip.ten_san_pham}</span>
                  </div>
                  <div className="readonly-item">
                    <label>Khối lượng</label>
                    <span style={{ fontWeight: 600, color: "#047857" }}>
                      {formatWeight(detailTrip.khoi_luong, detailTrip.don_vi_tinh)}
                    </span>
                  </div>
                  <div className="readonly-item">
                    <label>Phương tiện & Tài xế</label>
                    <span>
                      {detailTrip.bien_so_xe || "Chưa phân công"} - {detailTrip.ten_tai_xe || "Chưa phân công"}
                    </span>
                  </div>
                  <div className="readonly-item">
                    <label>Bên gửi</label>
                    <span>{detailTrip.ten_nguoi_gui || "—"}</span>
                  </div>
                  <div className="readonly-item">
                    <label>Bên nhận / Điểm giao</label>
                    <span>{detailTrip.ten_ben_nhan || detailTrip.dia_chi_giao_hang || "—"}</span>
                  </div>
                  <div className="readonly-item">
                    <label>Thời gian xuất</label>
                    <span>{detailTrip.thoi_gian_xuat}</span>
                  </div>
                </div>

                {detailTrip.ghi_chu && (
                  <div className="readonly-item" style={{ marginTop: "6px" }}>
                    <label>Ghi chú</label>
                    <span style={{ color: "#4b5563", fontSize: "13px" }}>{detailTrip.ghi_chu}</span>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn-cancel" onClick={() => setDetailTrip(null)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
