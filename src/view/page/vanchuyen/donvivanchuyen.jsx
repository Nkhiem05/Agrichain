import React, { useState, useEffect } from "react";
import {
  Truck,
  PackageCheck,
  MapPin,
  ClipboardCheck,
  Search,
  Plus,
  Navigation,
  CheckCircle,
  PackageSearch,
  ArrowUpRight,
  QrCode,
  PlusCircle,
  Check,
  X,
  FileSpreadsheet,
  Download,
  Clock,
  ArrowLeft,
  CheckCircle2,
  Eye,
} from "lucide-react";
import "../../css/donvivanchuyen.css";

const DEFAULT_LOGO_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png";

export default function AgriChainLogistics() {
  const [currentTab, setCurrentTab] = useState("shipping");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (err) {
        console.error("Không đọc được user:", err);
      }
    }
  }, []);

  // Quản lý chuyến xe đang chọn để xem/ghi nhật ký hành trình inline
  const [selectedJourneyTrip, setSelectedJourneyTrip] = useState(null);

  // Dữ liệu danh sách chuyến xe
  const [trips, setTrips] = useState([
    {
      id: "VC-2026-8800",
      title: "Chuyển Giao Nông Sản: Xoài Cát Hòa Lộc",
      batchName: "Xoài Cát Hòa Lộc Tiêu Chuẩn GlobalGAP",
      batchCode: "XCHL-2026-09",
      driver: "Chưa phân công",
      plate: "Chưa điều xe",
      route: "Hợp Tác Xã Xoài Mỹ Xương (Đồng Tháp) ➔ Cảng Cát Lái (TP.HCM)",
      weight: "2,000 kg (200 thùng)",
      temp: "Chuẩn lạnh 8-10°C",
      location: "Chờ đơn vị vận tải xác nhận tiếp nhận đơn",
      status: "pending_accept",
      statusText: "Trạng thái: Chờ xác nhận tiếp nhận đơn vận chuyển",
      recipient: "Cảng Cát Lái - Kho CFS",
      sealCode: "SEAL-WAIT-00",
      notes: "Hàng chờ xe tiếp nhận",
    },
    {
      id: "VC-2026-8801",
      title: "Chuyến Vận Chuyển: Quýt Đường Xuất Khẩu",
      batchName: "Quýt Đường Đóng Thùng Xuất Khẩu",
      batchCode: "SC-2026-001",
      driver: "Nguyễn Văn Hùng",
      plate: "65C-128.45",
      route: "HTX Sơ Chế Trà Vinh ➔ Trung Tâm Phân Phối Bách Hóa Xanh (TP.HCM)",
      weight: "1,200 kg (120 thùng)",
      temp: "6.2°C",
      location:
        "Trạm dừng chân Cao tốc Trung Lương - Mỹ Tho (Cách điểm giao 45km - Dự kiến đến: 17:30)",
      status: "in_transit",
      statusText: "Trạng thái: Đang vận chuyển trên đường",
      recipient: "Kho Phân Phối Bách Hóa Xanh Bình Tân",
      sealCode: "SEAL-LOG-119",
      notes: "Nhiệt độ ổn định, kiểm tra định kỳ mỗi 2 tiếng",
    },
    {
      id: "VC-2026-8802",
      title: "Chuyển Giao Nông Sản: Cam Sành VietGAP",
      batchName: "Cam Sành VietGAP Trà Ôn",
      batchCode: "LH-8824",
      driver: "Chưa phân công",
      plate: "Đang điều xe",
      route: "Vườn Cam A1 (#FARM-01111) ➔ Khu Sơ Chế Chế Biến Mekong",
      weight: "1,500 kg",
      temp: "Môi trường",
      location: "Tại điểm bốc hàng",
      status: "pending_pickup",
      statusText: "Trạng thái: Xe đã đến điểm lấy hàng - Chờ xác nhận bốc xếp",
      recipient: "Khu Sơ Chế Chế Biến Mekong",
      sealCode: "SEAL-TRUCK-9901",
      notes: "Hàng vừa thu hoạch trong ngày",
    },
    {
      id: "VC-2026-8803",
      title: "Chuyển Giao: Bưởi Da Xanh Bến Tre",
      batchName: "Bưởi Da Xanh Loại 1",
      batchCode: "BDX-2026-44",
      driver: "Lê Thành Đạt",
      plate: "65C-234.12",
      route: "Vựa Bưởi Mỏ Cày Bắc ➔ Tổng Kho Mega Market Bình Phú",
      weight: "1,800 kg (150 thùng)",
      temp: "12.0°C",
      location: "Đã cập bến điểm đích - Chờ xác nhận ký nhận bàn giao",
      status: "pending_delivery",
      statusText: "Trạng thái: Đã đến điểm đích - Chờ xác nhận bàn giao",
      recipient: "Tổng Kho Mega Market Bình Phú (Quản lý kho: Phan Thành)",
      sealCode: "SEAL-TRUCK-8842",
      notes: "Đã kiểm tra sơ bộ ngoại quan, nguyên đai nguyên kiện",
    },
  ]);

  // Quản lý trạng thái mở/đóng Modal
  const [modalState, setModalState] = useState({
    createTrip: false,
    pickupAction: false,
    journeyLog: false,
    deliveryConfirm: false,
    deliveryDetail: false,
  });

  // State chuyến xe đang xem chi tiết giao nhận
  const [detailTrip, setDetailTrip] = useState(null);

  // State Form Khởi tạo chuyến
  const [newTripForm, setNewTripForm] = useState({
    batch: "Lô #SC-2026-002 - Cam Sành Đóng Thùng (800 kg)",
    plate: "65C-128.45 (Xe Lạnh 2.5T)",
    driver: "Nguyễn Văn Hùng",
    from: "HTX Sơ Chế Mekong",
    to: "Kho Siêu Thị Co.opMart Cần Thơ",
  });

  // State Form Pickup
  const [pickupForm, setPickupForm] = useState({
    tripCode: "#VC-2026-8802",
    batchName: "Cam Sành VietGAP Trà Ôn",
    batchCode: "#LH-8824",
    weight: "1500",
    sealCode: "SEAL-TRUCK-9901",
    temp: "5.8",
  });

  // State Form Journey
  const [journeyForm, setJourneyForm] = useState({
    location: "",
    temp: "6.0",
    humidity: "85%",
    note: "Hàng hóa cố định tốt, không rung lắc mạnh, nhiệt độ bảo quản chuẩn.",
  });

  // State Form Delivery
  const [deliveryForm, setDeliveryForm] = useState({
    tripCode: "#VC-2026-8801",
    recipient: "",
    checkResult: "Đầy đủ số lượng - Không dập hỏng - Đạt chuẩn nghiệm thu",
    signatureOtp: "OTP-CONFIRM-8219",
  });

  const openModal = (name) =>
    setModalState((prev) => ({ ...prev, [name]: true }));
  const closeModal = (name) =>
    setModalState((prev) => ({ ...prev, [name]: false }));

  // Mở modal xem chi tiết đơn giao hàng
  const handleOpenDetail = (trip) => {
    setDetailTrip(trip);
    openModal("deliveryDetail");
  };

  // Chấp nhận đơn vận chuyển
  const handleAcceptTrip = (tripId) => {
    setTrips((prevTrips) =>
      prevTrips.map((item) => {
        if (item.id === tripId) {
          return {
            ...item,
            status: "pending_pickup",
            statusText:
              "Trạng thái: Đã tiếp nhận - Sẵn sàng điều xe đến lấy hàng",
            plate: "65C-128.45 (Chờ xuất bến)",
            driver: "Nguyễn Văn Hùng (Chờ chỉ định)",
          };
        }
        return item;
      }),
    );
    alert(
      `Đã chấp nhận đơn vận chuyển #${tripId}! Đơn đã được chuyển sang trạng thái chờ lấy hàng.`,
    );
  };

  // Khởi tạo chuyến mới
  const handleCreateTripSubmit = (e) => {
    e.preventDefault();
    const newId = `VC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const parsedBatch = newTripForm.batch.split(" - ")[1] || "Nông sản sạch";
    const parsedCode = (newTripForm.batch.match(/#[A-Za-z0-9-]+/) || [
      "#SC-CUSTOM",
    ])[0].replace("#", "");

    const newTrip = {
      id: newId,
      title: `Chuyển Giao: ${parsedBatch}`,
      batchName: parsedBatch,
      batchCode: parsedCode,
      driver: newTripForm.driver,
      plate: newTripForm.plate,
      route: `${newTripForm.from} ➔ ${newTripForm.to}`,
      weight: "Theo kế hoạch",
      temp: "Chuẩn lạnh 5-8°C",
      location: newTripForm.from,
      status: "pending_pickup",
      statusText: "Trạng thái: Vừa tạo - Chờ xuất bến lấy hàng",
      recipient: newTripForm.to,
      sealCode: "SEAL-TRUCK-" + Math.floor(1000 + Math.random() * 9000),
      notes: "Đơn vận chuyển mới khởi tạo",
    };
    setTrips([newTrip, ...trips]);
    alert(`Đã khởi tạo chuyến vận chuyển ${newId} thành công!`);
    closeModal("createTrip");
  };

  // Xác nhận lấy hàng
  const handleConfirmPickup = (e) => {
    e.preventDefault();
    alert(
      "Đã xác nhận lấy hàng thành công và kích hoạt thiết bị giám sát hành trình!",
    );
    closeModal("pickupAction");
  };

  // Cập nhật nhật ký hành trình
  const handleAddJourneyPoint = (e) => {
    e.preventDefault();
    alert(
      `Đã ghi nhận điểm kiểm tra GPS: ${journeyForm.location || "Trạm giám sát"} thành công!`,
    );
    closeModal("journeyLog");
    setJourneyForm({
      location: "",
      temp: "6.0",
      humidity: "85%",
      note: "Hàng hóa cố định tốt, không rung lắc mạnh, nhiệt độ bảo quản chuẩn.",
    });
  };

  // Hoàn tất bàn giao
  const handleConfirmDelivery = (e) => {
    e.preventDefault();
    alert(
      "Đã hoàn tất bàn giao hàng đến điểm đích và ký biên bản giao nhận điện tử!",
    );
    closeModal("deliveryConfirm");
  };

  // Xuất dữ liệu JSON
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

  // Xuất dữ liệu CSV
  const exportToCsv = (dataList, filename = "chuyen_xe_logistics.csv") => {
    if (!dataList || !dataList.length) return;
    const headers = [
      "Mã Chuyến",
      "Tiêu Đề",
      "Tên Lô Hàng",
      "Mã Lô",
      "Tài Xế",
      "Biển Số",
      "Lộ Trình",
      "Khối Lượng",
      "Nhiệt Độ",
      "Trạng Thái",
    ];
    const rows = dataList.map((t) => [
      t.id,
      `"${t.title}"`,
      `"${t.batchName}"`,
      t.batchCode,
      `"${t.driver}"`,
      t.plate,
      `"${t.route}"`,
      `"${t.weight}"`,
      `"${t.temp}"`,
      `"${t.status}"`,
    ]);
    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
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

  // Lọc chuyến theo từ khóa và Dropdown trạng thái
  const filteredTrips = trips.filter((t) => {
    const matchesSearch =
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.batchCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.batchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.title.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ? true : t.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="vanchuyen">
      <div className="app-container">
        {/* ================= HEADER ĐƯỢC THAY THẾ CHUẨN ================= */}
        <header className="dashboard-header">
          <div className="header-left">
            <img
              src={DEFAULT_LOGO_IMG}
              alt="Logo"
              className="header-logo-icon"
            />
            <span className="header-brand-title">AGRICHAIN</span>
          </div>

          <div className="header-search-bar">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm lô canh tác, mã chuyến, biển số..."
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

        {/* 2. BODY LAYOUT */}
        <div className="body-layout">
          {/* SIDEBAR ĐIỀU HƯỚNG */}
          <aside className="sidebar no-scrollbar">
            <div className="sidebar-title">Nghiệp vụ logistics</div>
            <nav className="sidebar-nav">
              <button
                onClick={() => {
                  setCurrentTab("shipping");
                  setSelectedJourneyTrip(null);
                }}
                className={`nav-item ${
                  currentTab === "shipping" ? "active" : ""
                }`}
              >
                <Truck size={20} />
                <span>Quản lý vận chuyển</span>
              </button>

              <button
                onClick={() => {
                  setCurrentTab("pickup");
                  setSelectedJourneyTrip(null);
                }}
                className={`nav-item ${currentTab === "pickup" ? "active" : ""}`}
              >
                <PackageCheck size={20} />
                <span>Xác nhận lấy hàng đi</span>
              </button>

              <button
                onClick={() => {
                  setCurrentTab("delivery");
                  setSelectedJourneyTrip(null);
                }}
                className={`nav-item ${
                  currentTab === "delivery" ? "active" : ""
                }`}
              >
                <ClipboardCheck size={20} />
                <span>Xác nhận giao hàng đến</span>
              </button>
            </nav>

            {/* Action Buttons Xuất File */}
            <div
              style={{
                padding: "0 12px 12px 12px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <button
                onClick={() => exportToCsv(trips)}
                className="btn-secondary"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  fontSize: "11px",
                  padding: "6px",
                }}
              >
                <FileSpreadsheet size={14} />
                <span>Xuất file Excel/CSV</span>
              </button>
              <button
                onClick={() => exportToJson(trips)}
                className="btn-secondary"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  fontSize: "11px",
                  padding: "6px",
                }}
              >
                <Download size={14} />
                <span>Export Dữ Liệu JSON</span>
              </button>
            </div>

            <div className="sidebar-footer">
              <div className="iot-status">
                <span className="pulse-dot"></span>
                <span>
                  Hệ thống IoT Lạnh: <b>Đang đồng bộ</b>
                </span>
              </div>
              <p className="sub-note">GPS Tracker Active #MekongLog-01</p>
            </div>
          </aside>

          {/* NỘI DUNG CHÍNH (MAIN WRAPPER) */}
          <div className="main-wrapper no-scrollbar">
            {/* TAB 1: QUẢN LÝ VẬN CHUYỂN */}
            {currentTab === "shipping" && (
              <main className="view-container">
                {selectedJourneyTrip ? (
                  <div
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      paddingBottom: "36px",
                    }}
                  >
                    <div className="section-card">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          borderBottom: "1px solid var(--border-color)",
                          paddingBottom: "16px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                          }}
                        >
                          <button
                            onClick={() => setSelectedJourneyTrip(null)}
                            className="btn-secondary"
                            style={{ padding: "6px 12px", borderRadius: "8px" }}
                          >
                            <ArrowLeft size={16} />
                            <span>Quay lại danh sách</span>
                          </button>
                          <div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <h2
                                style={{
                                  fontSize: "16px",
                                  fontWeight: 700,
                                  color: "#1f2937",
                                }}
                              >
                                Hành Trình Di Chuyển Chuyến Xe #
                                {selectedJourneyTrip.id}
                              </h2>
                              <span className="tag-green">
                                Lô: {selectedJourneyTrip.batchName} (#
                                {selectedJourneyTrip.batchCode})
                              </span>
                            </div>
                            <p
                              style={{
                                fontSize: "12px",
                                color: "#6b7280",
                                marginTop: "2px",
                              }}
                            >
                              Lộ trình: {selectedJourneyTrip.route} | Tài xế:{" "}
                              {selectedJourneyTrip.driver} (
                              {selectedJourneyTrip.plate})
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => openModal("journeyLog")}
                          className="btn-primary"
                        >
                          <PlusCircle size={16} />
                          <span>Thêm Điểm Dừng / Cập Nhật GPS</span>
                        </button>
                      </div>

                      <div
                        className="timeline-track"
                        style={{ marginTop: "12px" }}
                      >
                        <div className="timeline-item">
                          <span className="timeline-dot"></span>
                          <p className="timeline-title">
                            13:15 - 30/09/2026: Bắt đầu xuất phát
                          </p>
                          <p className="timeline-desc">
                            Lô hàng: <b>{selectedJourneyTrip.batchName}</b> (#
                            {selectedJourneyTrip.batchCode}). Xuất phát với
                            thùng xe làm lạnh ổn định ở mức 6.0°C. Niêm phong
                            seal mã #SEAL-LOG-119.
                          </p>
                        </div>

                        <div className="timeline-item">
                          <span className="timeline-dot"></span>
                          <p className="timeline-title">
                            15:00 - 30/09/2026: Qua Cầu Mỹ Thuận 2
                          </p>
                          <p className="timeline-desc">
                            Tốc độ trung bình 60km/h. Cảm biến nhiệt độ thùng
                            lạnh đo được: 6.2°C, độ ẩm 85%.
                          </p>
                        </div>

                        <div className="timeline-item">
                          <span className="timeline-dot-ping"></span>
                          <span className="timeline-dot current"></span>
                          <p className="timeline-title current">
                            16:45 - 30/09/2026: {selectedJourneyTrip.location}
                          </p>
                          <p
                            className="timeline-desc"
                            style={{ color: "#4b5563" }}
                          >
                            Tài xế kiểm tra thùng xe: Niêm phong nguyên vẹn,
                            nhiệt độ duy trì tốt ({selectedJourneyTrip.temp}).
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* METRICS ROW CHUẨN STYLE NÔNG DÂN - CỐ ĐỊNH 100% TRÊN CÙNG */}
                    <div className="metrics-row">
                      <div className="metric-card">
                        <div className="metric-title">Đơn chờ tiếp nhận</div>
                        <div className="metric-number">
                          {
                            trips.filter((t) => t.status === "pending_accept")
                              .length
                          }
                          <span className="metric-unit">ĐƠN CHỜ NHẬN</span>
                        </div>
                      </div>

                      <div className="metric-card">
                        <div className="metric-title">Đơn chờ lấy hàng</div>
                        <div className="metric-number">
                          {
                            trips.filter((t) => t.status === "pending_pickup")
                              .length
                          }
                          <span className="metric-unit">ĐƠN SẴN SÀNG</span>
                        </div>
                      </div>

                      <div className="metric-card">
                        <div className="metric-title">Chuyến xe đang chạy</div>
                        <div className="metric-number">
                          {
                            trips.filter((t) => t.status === "in_transit")
                              .length
                          }
                          <span className="metric-unit">
                            CHUYẾN ĐANG LĂN BÁNH
                          </span>
                        </div>
                      </div>

                      <div className="actions-box">
                        <select
                          className="filter-select"
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                        >
                          <option value="all">-- Tất cả trạng thái --</option>
                          <option value="pending_accept">Chờ chấp nhận</option>
                          <option value="pending_pickup">Chờ lấy hàng</option>
                          <option value="in_transit">Đang vận chuyển</option>
                          <option value="pending_delivery">Chờ xác nhận</option>
                        </select>

                        <button
                          onClick={() => openModal("createTrip")}
                          className="btn-primary-action"
                        >
                          <Plus size={16} />
                          <span>Tạo Lộ Trình Mới</span>
                        </button>
                      </div>
                    </div>

                    {/* VÙNG CUỘN ĐỘC LẬP CHO DANH SÁCH CHUYẾN XE */}
                    <div className="shipment-list-scroll">
                      {filteredTrips.length === 0 ? (
                        <div
                          className="section-card"
                          style={{
                            textAlign: "center",
                            padding: "40px",
                            color: "#6b7280",
                          }}
                        >
                          Không có chuyến vận chuyển nào phù hợp với bộ lọc hiện
                          tại.
                        </div>
                      ) : (
                        filteredTrips.map((trip) => (
                          <div key={trip.id} className="trip-card">
                            <div className="trip-card-left">
                              <div
                                className={`icon-avatar ${
                                  trip.status === "in_transit"
                                    ? "blue"
                                    : trip.status === "pending_accept"
                                      ? "purple"
                                      : trip.status === "pending_delivery"
                                        ? "emerald"
                                        : "amber"
                                }`}
                              >
                                {trip.status === "in_transit" ? (
                                  <Navigation size={30} />
                                ) : trip.status === "pending_accept" ? (
                                  <Clock size={30} />
                                ) : trip.status === "pending_delivery" ? (
                                  <ClipboardCheck size={30} />
                                ) : (
                                  <PackageSearch size={30} />
                                )}
                              </div>
                              <div className="trip-details">
                                <div className="trip-header-line">
                                  <h3>{trip.title}</h3>
                                  <span className="tag-gray">#{trip.id}</span>
                                  <span className="tag-green">
                                    Tên lô: {trip.batchName} (#{trip.batchCode})
                                  </span>
                                </div>

                                <div className="trip-meta-row">
                                  <p>
                                    Xe tải & Tài xế:{" "}
                                    <span className="meta-val">
                                      {trip.plate} ({trip.driver})
                                    </span>
                                  </p>
                                  <p>
                                    Lộ trình:{" "}
                                    <span className="meta-val">
                                      {trip.route}
                                    </span>
                                  </p>
                                  <p>
                                    Khối lượng hàng:{" "}
                                    <span className="highlight-weight">
                                      {trip.weight}
                                    </span>
                                  </p>
                                  <p>
                                    Nhiệt độ thùng xe:{" "}
                                    <span className="highlight-temp">
                                      {trip.temp}
                                    </span>
                                  </p>
                                </div>

                                <div className="trip-location-note">
                                  <p>Vị trí & Thông tin điều phối:</p>
                                  <p>{trip.location}</p>
                                </div>

                                <div>
                                  <span
                                    className={
                                      trip.status === "in_transit"
                                        ? "status-badge-blue"
                                        : trip.status === "pending_accept"
                                          ? "status-badge-purple"
                                          : trip.status === "pending_delivery"
                                            ? "status-badge-emerald"
                                            : "status-badge-amber"
                                    }
                                  >
                                    {trip.statusText}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="actions-vertical">
                              {trip.status === "pending_accept" && (
                                <button
                                  onClick={() => handleAcceptTrip(trip.id)}
                                  className="btn-primary"
                                  style={{ backgroundColor: "#7c3aed" }}
                                >
                                  <CheckCircle2 size={16} />
                                  <span>Chấp nhận vận chuyển</span>
                                </button>
                              )}

                              {trip.status === "pending_pickup" && (
                                <button
                                  onClick={() => {
                                    setPickupForm((prev) => ({
                                      ...prev,
                                      tripCode: `#${trip.id}`,
                                      batchName: trip.batchName,
                                      batchCode: `#${trip.batchCode}`,
                                    }));
                                    openModal("pickupAction");
                                  }}
                                  className="btn-primary"
                                >
                                  <ArrowUpRight size={16} />
                                  <span>Xác nhận lấy hàng đi</span>
                                </button>
                              )}

                              {trip.status === "in_transit" && (
                                <>
                                  <button
                                    onClick={() => setSelectedJourneyTrip(trip)}
                                    className="btn-secondary"
                                  >
                                    <MapPin size={14} />
                                    <span>Ghi nhật ký hành trình</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDeliveryForm((prev) => ({
                                        ...prev,
                                        tripCode: `#${trip.id}`,
                                      }));
                                      openModal("deliveryConfirm");
                                    }}
                                    className="btn-primary"
                                  >
                                    <CheckCircle size={14} />
                                    <span>Xác nhận giao hàng đến</span>
                                  </button>
                                </>
                              )}

                              {/* KHUNG XÁC NHẬN GIAO: CÓ NÚT XEM CHI TIẾT */}
                              {trip.status === "pending_delivery" && (
                                <>
                                  <button
                                    onClick={() => handleOpenDetail(trip)}
                                    className="btn-action-detail"
                                    style={{ width: "100%" }}
                                  >
                                    <Eye size={15} />
                                    <span>Xem chi tiết</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDeliveryForm((prev) => ({
                                        ...prev,
                                        tripCode: `#${trip.id}`,
                                      }));
                                      openModal("deliveryConfirm");
                                    }}
                                    className="btn-primary"
                                  >
                                    <CheckCircle2 size={16} />
                                    <span>Ký xác nhận bàn giao</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </main>
            )}

            {/* TAB 2: XÁC NHẬN LẤY HÀNG ĐI */}
            {currentTab === "pickup" && (
              <main
                className="view-container"
                style={{ overflowY: "auto", paddingBottom: "36px" }}
              >
                <div className="section-header-box">
                  <div>
                    <h2>Biên Bản Nhận Hàng & Xuất Phát</h2>
                    <p>
                      Xác nhận trực tiếp giữa tài xế và bên bàn giao (Nhà vườn
                      hoặc Cơ sở sơ chế), lưu thời gian thực lên chuỗi.
                    </p>
                  </div>
                  <button
                    onClick={() => openModal("pickupAction")}
                    className="btn-primary"
                  >
                    <QrCode size={16} />
                    <span>Quét QR Mã Lô Lấy Hàng</span>
                  </button>
                </div>

                <div className="section-card">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      borderBottom: "1px solid #f3f4f6",
                      paddingBottom: "12px",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: "14px",
                        color: "#1f2937",
                      }}
                    >
                      Danh Sách Lô Hàng Đã Lấy Đi Gần Đây
                    </span>
                    <span style={{ fontSize: "12px", color: "#6b7280" }}>
                      Có chữ ký số 2 bên
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      fontSize: "13px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingBottom: "12px",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      <div>
                        <p style={{ fontWeight: 700, color: "#1f2937" }}>
                          Tên lô: Quýt Đường Đóng Thùng Xuất Khẩu (Mã:
                          #SC-2026-001 - 1,200 kg)
                        </p>
                        <p style={{ color: "#6b7280" }}>
                          Lấy từ: Cơ sở Sơ Chế Mekong ➔ Tài xế Nguyễn Văn Hùng
                          nhận lúc 13:00 - 30/09/2026
                        </p>
                      </div>
                      <span
                        style={{
                          backgroundColor: "#d1fae5",
                          color: "#065f46",
                          padding: "3px 10px",
                          borderRadius: "4px",
                          fontWeight: 600,
                          fontSize: "12px",
                        }}
                      >
                        Đã ký xác nhận nhận hàng
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <p style={{ fontWeight: 700, color: "#1f2937" }}>
                          Tên lô: Cam Sành VietGAP Trà Ôn (Mã: #LH-8809 - 800
                          kg)
                        </p>
                        <p style={{ color: "#6b7280" }}>
                          Lấy từ: Nông trại Vườn Cam A1 ➔ Tài xế Lê Thành Đạt
                          lúc 07:15 - 28/09/2026
                        </p>
                      </div>
                      <span
                        style={{
                          backgroundColor: "#d1fae5",
                          color: "#065f46",
                          padding: "3px 10px",
                          borderRadius: "4px",
                          fontWeight: 600,
                          fontSize: "12px",
                        }}
                      >
                        Đã hoàn thành chuyến
                      </span>
                    </div>
                  </div>
                </div>
              </main>
            )}

            {/* TAB 3: XÁC NHẬN GIAO HÀNG ĐẾN */}
            {currentTab === "delivery" && (
              <main
                className="view-container"
                style={{ overflowY: "auto", paddingBottom: "36px" }}
              >
                <div className="section-header-box">
                  <div>
                    <h2>Xác Nhận Bàn Giao Hàng Đến Điểm Đích</h2>
                    <p>
                      Chốt trạng thái hoàn thành chuyến đi, bàn giao sản phẩm
                      cho siêu thị/đối tác bán lẻ kèm chữ ký nhận.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      exportToJson(
                        {
                          trip: "VC-2026-8801",
                          item: "Quýt Đường Đóng Thùng Xuất Khẩu",
                          batchCode: "SC-2026-001",
                          quantity: "120 thùng (1,200 kg)",
                          status: "Nguyên seal",
                          tempAtArrival: "6.0°C",
                          signedBy: "Phạm Thị Mai",
                          timestamp: new Date().toISOString(),
                        },
                        "bien_ban_giao_hang_VC-8801.json",
                      )
                    }
                    className="btn-secondary"
                  >
                    <Download size={14} />
                    <span>Xuất Biên Bản Điện Tử</span>
                  </button>
                </div>

                <div className="section-card">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderBottom: "1px solid #f3f4f6",
                      paddingBottom: "12px",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          fontWeight: 700,
                          fontSize: "15px",
                          color: "#1f2937",
                        }}
                      >
                        Đơn Bàn Giao #VC-2026-8801 - Quýt Đường Đóng Thùng Xuất
                        Khẩu (#SC-2026-001)
                      </h3>
                      <p style={{ fontSize: "12.5px", color: "#6b7280" }}>
                        Điểm giao: Kho Phân Phối Bách Hóa Xanh Bình Tân
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() =>
                          handleOpenDetail({
                            id: "VC-2026-8801",
                            title: "Chuyến Vận Chuyển: Quýt Đường Xuất Khẩu",
                            batchName: "Quýt Đường Đóng Thùng Xuất Khẩu",
                            batchCode: "SC-2026-001",
                            driver: "Nguyễn Văn Hùng",
                            plate: "65C-128.45",
                            route:
                              "HTX Sơ Chế Trà Vinh ➔ Trung Tâm Phân Phối Bách Hóa Xanh (TP.HCM)",
                            weight: "1,200 kg (120 thùng)",
                            temp: "6.0°C",
                            recipient:
                              "Kho Phân Phối Bách Hóa Xanh Bình Tân (Phạm Thị Mai)",
                            sealCode: "SEAL-LOG-119",
                            notes:
                              "Nguyên seal không rách vỡ, nghiệm thu đạt 100%",
                          })
                        }
                        className="btn-action-detail"
                      >
                        <Eye size={15} />
                        <span>Xem chi tiết</span>
                      </button>
                      <button
                        onClick={() => openModal("deliveryConfirm")}
                        className="btn-primary"
                      >
                        <Check size={16} />
                        <span>Lập Biên Bản Giao Nhận</span>
                      </button>
                    </div>
                  </div>

                  <div className="data-summary-grid">
                    <div>
                      <span className="label">Số lượng bàn giao:</span>
                      <span className="value">120 thùng carton (1,200 kg)</span>
                    </div>
                    <div>
                      <span className="label">Tình trạng niêm phong:</span>
                      <span className="value" style={{ color: "#047857" }}>
                        Nguyên seal không rách vỡ
                      </span>
                    </div>
                    <div>
                      <span className="label">Nhiệt độ thùng khi mở cửa:</span>
                      <span className="value" style={{ color: "#1d4ed8" }}>
                        6.0°C
                      </span>
                    </div>
                  </div>
                </div>
              </main>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* MODAL 1: TẠO CHUYẾN ĐI MỚI */}
        {/* ========================================================= */}
        {modalState.createTrip && (
          <div className="modal-overlay">
            <div className="modal-content lg">
              <div className="modal-header">
                <h3>
                  <Truck size={20} color="#2e8b57" /> Khởi Tạo Chuyến Vận Chuyển
                  Mới
                </h3>
                <button
                  className="modal-close-btn"
                  onClick={() => closeModal("createTrip")}
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreateTripSubmit}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Chọn Lô Hàng Cần Chở (*)</label>
                    <select
                      className="form-select"
                      value={newTripForm.batch}
                      onChange={(e) =>
                        setNewTripForm({
                          ...newTripForm,
                          batch: e.target.value,
                        })
                      }
                    >
                      <option>
                        Lô #SC-2026-002 - Cam Sành Đóng Thùng (800 kg)
                      </option>
                      <option>
                        Lô #LH-8824 - Quýt Đường Mới Thu Hoạch (1,500 kg)
                      </option>
                      <option>
                        Lô #XCHL-2026-09 - Xoài Cát Hòa Lộc Tiêu Chuẩn GlobalGAP
                        (2,000 kg)
                      </option>
                    </select>
                  </div>
                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Xe Tải Chuyên Dụng (*)</label>
                      <input
                        type="text"
                        value={newTripForm.plate}
                        onChange={(e) =>
                          setNewTripForm({
                            ...newTripForm,
                            plate: e.target.value,
                          })
                        }
                        placeholder="65C-128.45 (Xe Lạnh 2.5T)"
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Tài Xế Phụ Trách</label>
                      <input
                        type="text"
                        value={newTripForm.driver}
                        onChange={(e) =>
                          setNewTripForm({
                            ...newTripForm,
                            driver: e.target.value,
                          })
                        }
                        placeholder="Nguyễn Văn Hùng"
                        className="form-input"
                        required
                      />
                    </div>
                  </div>
                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Điểm Nhận Hàng (Bắt Đầu)</label>
                      <input
                        type="text"
                        value={newTripForm.from}
                        onChange={(e) =>
                          setNewTripForm({
                            ...newTripForm,
                            from: e.target.value,
                          })
                        }
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Điểm Giao Đến (Đích)</label>
                      <input
                        type="text"
                        value={newTripForm.to}
                        onChange={(e) =>
                          setNewTripForm({ ...newTripForm, to: e.target.value })
                        }
                        placeholder="Kho Siêu Thị Co.opMart Cần Thơ"
                        className="form-input"
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => closeModal("createTrip")}
                  >
                    Hủy
                  </button>
                  <button type="submit" className="btn-primary">
                    Tạo Chuyến Đi
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 2: XÁC NHẬN LẤY HÀNG (PICKUP) */}
        {/* ========================================================= */}
        {modalState.pickupAction && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>
                  <PackageCheck size={20} color="#2e8b57" /> Xác Nhận Lấy Hàng
                  Lên Xe
                </h3>
                <button
                  className="modal-close-btn"
                  onClick={() => closeModal("pickupAction")}
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleConfirmPickup}>
                <div className="modal-body">
                  <p style={{ color: "#4b5563" }}>
                    Chuyến xe: <b>{pickupForm.tripCode}</b> | Lô hàng:{" "}
                    <b>{pickupForm.batchName}</b> ({pickupForm.batchCode})
                  </p>
                  <div className="form-group">
                    <label>Khối lượng thực nhận (kg)</label>
                    <input
                      type="number"
                      value={pickupForm.weight}
                      onChange={(e) =>
                        setPickupForm({ ...pickupForm, weight: e.target.value })
                      }
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Mã chì niêm phong (Seal Truck)</label>
                    <input
                      type="text"
                      value={pickupForm.sealCode}
                      onChange={(e) =>
                        setPickupForm({
                          ...pickupForm,
                          sealCode: e.target.value,
                        })
                      }
                      className="form-input font-mono"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Nhiệt độ thùng xe lúc nhận (°C)</label>
                    <input
                      type="text"
                      value={pickupForm.temp}
                      onChange={(e) =>
                        setPickupForm({ ...pickupForm, temp: e.target.value })
                      }
                      className="form-input font-mono"
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => closeModal("pickupAction")}
                  >
                    Đóng
                  </button>
                  <button type="submit" className="btn-primary">
                    Xác Nhận & Xuất Phát
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 3: GHI NHẬT KÝ HÀNH TRÌNH / GPS */}
        {/* ========================================================= */}
        {modalState.journeyLog && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>
                  <MapPin size={20} color="#2e8b57" /> Cập Nhật Điểm Dừng & IoT
                  Lạnh
                </h3>
                <button
                  className="modal-close-btn"
                  onClick={() => closeModal("journeyLog")}
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddJourneyPoint}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Địa điểm / Tọa độ hiện tại (*)</label>
                    <input
                      type="text"
                      value={journeyForm.location}
                      onChange={(e) =>
                        setJourneyForm({
                          ...journeyForm,
                          location: e.target.value,
                        })
                      }
                      placeholder="VD: Trạm thu phí Long Phước (TP. Thủ Đức)"
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Nhiệt độ thùng (°C)</label>
                      <input
                        type="text"
                        value={journeyForm.temp}
                        onChange={(e) =>
                          setJourneyForm({
                            ...journeyForm,
                            temp: e.target.value,
                          })
                        }
                        className="form-input font-mono"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Độ ẩm (%)</label>
                      <input
                        type="text"
                        value={journeyForm.humidity}
                        onChange={(e) =>
                          setJourneyForm({
                            ...journeyForm,
                            humidity: e.target.value,
                          })
                        }
                        className="form-input font-mono"
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Ghi chú tình trạng nông sản</label>
                    <textarea
                      rows={3}
                      value={journeyForm.note}
                      onChange={(e) =>
                        setJourneyForm({ ...journeyForm, note: e.target.value })
                      }
                      className="form-textarea"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => closeModal("journeyLog")}
                  >
                    Hủy
                  </button>
                  <button type="submit" className="btn-primary">
                    Lưu Lên Hệ Thống
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 4: XÁC NHẬN GIAO HÀNG ĐẾN */}
        {/* ========================================================= */}
        {modalState.deliveryConfirm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>
                  <CheckCircle2 size={20} color="#2e8b57" /> Nghiệm Thu & Giao
                  Hàng Đến
                </h3>
                <button
                  className="modal-close-btn"
                  onClick={() => closeModal("deliveryConfirm")}
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleConfirmDelivery}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Người đại diện bên nhận (*)</label>
                    <input
                      type="text"
                      value={deliveryForm.recipient}
                      onChange={(e) =>
                        setDeliveryForm({
                          ...deliveryForm,
                          recipient: e.target.value,
                        })
                      }
                      placeholder="VD: Quản lý kho - Nguyễn Thị Mai"
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Kết quả kiểm tra tình trạng</label>
                    <input
                      type="text"
                      value={deliveryForm.checkResult}
                      onChange={(e) =>
                        setDeliveryForm({
                          ...deliveryForm,
                          checkResult: e.target.value,
                        })
                      }
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Mã xác thực biên bản / OTP giao hàng</label>
                    <input
                      type="text"
                      value={deliveryForm.signatureOtp}
                      onChange={(e) =>
                        setDeliveryForm({
                          ...deliveryForm,
                          signatureOtp: e.target.value,
                        })
                      }
                      className="form-input font-mono"
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => closeModal("deliveryConfirm")}
                  >
                    Hủy
                  </button>
                  <button type="submit" className="btn-primary">
                    Hoàn Tất Bàn Giao
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 5: XEM CHI TIẾT ĐƠN BÀN GIAO */}
        {/* ========================================================= */}
        {modalState.deliveryDetail && detailTrip && (
          <div className="modal-overlay">
            <div className="modal-content lg">
              <div className="modal-header">
                <h3>
                  <Eye size={20} color="#2563eb" /> Chi Tiết Biên Bản Bàn Giao #
                  {detailTrip.id}
                </h3>
                <button
                  className="modal-close-btn"
                  onClick={() => closeModal("deliveryDetail")}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <div
                  className="form-grid-2 readonly-grid"
                  style={{ gap: "14px" }}
                >
                  <div className="readonly-item">
                    <label>Mã đơn vận chuyển</label>
                    <span style={{ fontWeight: 700, color: "#1d4ed8" }}>
                      #{detailTrip.id}
                    </span>
                  </div>
                  <div className="readonly-item">
                    <label>Mã lô nông sản</label>
                    <span
                      className="tag-green"
                      style={{ width: "fit-content" }}
                    >
                      #{detailTrip.batchCode}
                    </span>
                  </div>
                  <div className="readonly-item">
                    <label>Tên nông sản / hàng hóa</label>
                    <span style={{ fontWeight: 600, color: "#1f2937" }}>
                      {detailTrip.batchName}
                    </span>
                  </div>
                  <div className="readonly-item">
                    <label>Khối lượng / Quy cách</label>
                    <span style={{ fontWeight: 600, color: "#047857" }}>
                      {detailTrip.weight}
                    </span>
                  </div>
                  <div className="readonly-item">
                    <label>Phương tiện & Tài xế</label>
                    <span>
                      {detailTrip.plate} - {detailTrip.driver}
                    </span>
                  </div>
                  <div className="readonly-item">
                    <label>Nhiệt độ thùng xe lúc đến</label>
                    <span
                      style={{
                        fontWeight: 600,
                        color: "#2563eb",
                        fontFamily: "monospace",
                      }}
                    >
                      {detailTrip.temp}
                    </span>
                  </div>
                  <div className="readonly-item">
                    <label>Mã seal niêm phong</label>
                    <span style={{ fontFamily: "monospace", color: "#374151" }}>
                      {detailTrip.sealCode || "SEAL-TRUCK-8842"}
                    </span>
                  </div>
                  <div className="readonly-item">
                    <label>Đơn vị / Đại diện nhận hàng</label>
                    <span style={{ color: "#374151" }}>
                      {detailTrip.recipient || "Ban quản lý tiếp nhận"}
                    </span>
                  </div>
                </div>

                <div className="readonly-item" style={{ marginTop: "6px" }}>
                  <label>Lộ trình di chuyển</label>
                  <span style={{ color: "#4b5563", fontSize: "13px" }}>
                    {detailTrip.route}
                  </span>
                </div>

                <div className="readonly-item" style={{ marginTop: "6px" }}>
                  <label>Ghi chú tình trạng nghiệm thu</label>
                  <span style={{ color: "#4b5563", fontSize: "13px" }}>
                    {detailTrip.notes ||
                      "Nguyên đai nguyên kiện, bao bì không rách vỡ, tem QR truy xuất quét thành công."}
                  </span>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => closeModal("deliveryDetail")}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    closeModal("deliveryDetail");
                    setDeliveryForm((prev) => ({
                      ...prev,
                      tripCode: `#${detailTrip.id}`,
                    }));
                    openModal("deliveryConfirm");
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>Tiến Hành Ký Giao Nhận</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
