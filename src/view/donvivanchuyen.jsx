import React, { useState } from "react";
import {
  Truck,
  PackageCheck,
  MapPin,
  ClipboardCheck,
  Search,
  ChevronDown,
  Plus,
  Navigation,
  CheckCircle,
  PackageSearch,
  ArrowUpRight,
  QrCode,
  PlusCircle,
  Check,
  X,
  CheckCircle2,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import "../public/css/donvivanchuyen.css";

export default function AgriChainLogistics() {
  const [currentTab, setCurrentTab] = useState("shipping");
  const [searchTerm, setSearchTerm] = useState("");

  // Dữ liệu danh sách chuyến xe
  const [trips, setTrips] = useState([
    {
      id: "VC-2026-8801",
      title: "Chuyến Vận Chuyển: Quýt Đường Xuất Khẩu",
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
    },
    {
      id: "VC-2026-8802",
      title: "Chuyển Giao Nông Sản: Cam Sành VietGAP",
      batchCode: "LH-8824",
      driver: "Chưa phân công",
      plate: "Đang điều xe",
      route: "Vườn Cam A1 (#FARM-01111) ➔ Khu Sơ Chế Chế Biến Mekong",
      weight: "1,500 kg",
      temp: "Môi trường",
      location: "Tại điểm bốc hàng",
      status: "pending_pickup",
      statusText: "Trạng thái: Xe đã đến điểm lấy hàng - Chờ xác nhận bốc xếp",
    },
  ]);

  // Quản lý trạng thái mở/đóng Modal
  const [modalState, setModalState] = useState({
    createTrip: false,
    pickupAction: false,
    journeyLog: false,
    deliveryConfirm: false,
  });

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

  // Xử lý tạo chuyến mới
  const handleCreateTripSubmit = (e) => {
    e.preventDefault();
    const newId = `VC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTrip = {
      id: newId,
      title: `Chuyển Giao: ${newTripForm.batch.split(" - ")[1] || "Nông sản"}`,
      batchCode: newTripForm.batch.split(" ")[1] || "SC-CUSTOM",
      driver: newTripForm.driver,
      plate: newTripForm.plate,
      route: `${newTripForm.from} ➔ ${newTripForm.to}`,
      weight: "Theo kế hoạch",
      temp: "Chuẩn lạnh 5-8°C",
      location: newTripForm.from,
      status: "pending_pickup",
      statusText: "Trạng thái: Vừa tạo - Chờ xuất bến lấy hàng",
    };
    setTrips([newTrip, ...trips]);
    alert(`Đã khởi tạo chuyến vận chuyển ${newId} thành công!`);
    closeModal("createTrip");
  };

  // Xác nhận lấy hàng
  const handleConfirmPickup = () => {
    alert(
      "Đã xác nhận lấy hàng thành công và kích hoạt thiết bị giám sát hành trình!",
    );
    closeModal("pickupAction");
    setCurrentTab("journey");
  };

  // Hoàn tất bàn giao
  const handleConfirmDelivery = () => {
    alert(
      "Đã hoàn tất bàn giao hàng đến điểm đích và ký biên bản giao nhận điện tử!",
    );
    closeModal("deliveryConfirm");
    setCurrentTab("shipping");
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
      "Lô Hàng",
      "Tài Xế",
      "Biển Số",
      "Lộ Trình",
      "Khối Lượng",
      "Nhiệt Độ",
    ];
    const rows = dataList.map((t) => [
      t.id,
      `"${t.title}"`,
      t.batchCode,
      `"${t.driver}"`,
      t.plate,
      `"${t.route}"`,
      `"${t.weight}"`,
      `"${t.temp}"`,
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

  // Lọc chuyến theo từ khóa tìm kiếm
  const filteredTrips = trips.filter(
    (t) =>
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.batchCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="app-container">
      {/* 1. HEADER NẰM TRÊN CÙNG MÀN HÌNH */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">
            <div className="brand-icon-inner"></div>
          </div>
          <span className="brand-name">AGRICHAIN</span>
        </div>

        <div className="search-box">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm biển số xe, mã đơn vận chuyển, mã lô..."
            className="search-input"
          />
          <Search className="search-icon" size={16} />
        </div>

        <div className="user-profile">
          <div className="user-avatar">VC</div>
          <div className="user-info">
            <p>Công Ty Vận Tải Lạnh Mekong Express</p>
            <p>Đơn vị vận chuyển / Logistics</p>
          </div>
        </div>
      </header>

      {/* 2. BODY LAYOUT: SIDEBAR BÊN TRÁI & MAIN CONTENT BÊN PHẢI */}
      <div className="body-layout">
        {/* SIDEBAR ĐIỀU HƯỚNG */}
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
              onClick={() => setCurrentTab("journey")}
              className={`nav-item ${currentTab === "journey" ? "active" : ""}`}
            >
              <MapPin size={20} />
              <span>Ghi lại hành trình</span>
            </button>

            <button
              onClick={() => setCurrentTab("delivery")}
              className={`nav-item ${currentTab === "delivery" ? "active" : ""}`}
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
              <div className="metrics-grid">
                <div className="metric-card">
                  <span className="metric-label">Chuyến xe đang lăn bánh</span>
                  <p className="metric-value">
                    3 <span className="metric-sub">CHUYẾN ĐANG CHẠY</span>
                  </p>
                </div>

                <div className="metric-card">
                  <span className="metric-label">
                    Đơn chờ tiếp nhận lấy hàng
                  </span>
                  <p className="metric-value">
                    2 <span className="metric-sub">ĐƠN MỚI</span>
                  </p>
                </div>

                <div className="metric-card">
                  <span className="metric-label">Giao thành công tuần này</span>
                  <p className="metric-value">
                    16 <span className="metric-sub">CHUYẾN HOÀN TẤT</span>
                  </p>
                </div>

                <div className="quick-actions-col">
                  <div className="custom-select-wrapper">
                    <select className="custom-select">
                      <option>-- Tất cả đội xe --</option>
                      <option>Đội xe tải lạnh chuyên dụng (5°C)</option>
                      <option>Đội xe tải thùng mui bạt nông sản</option>
                    </select>
                    <ChevronDown size={16} />
                  </div>
                  <button
                    onClick={() => openModal("createTrip")}
                    className="btn-primary"
                  >
                    <Plus size={14} />
                    <span>Tạo Lộ Trình Vận Chuyển Mới</span>
                  </button>
                </div>
              </div>

              {/* Danh sách chuyến xe */}
              <div className="shipment-list">
                {filteredTrips.map((trip) => (
                  <div key={trip.id} className="trip-card">
                    <div className="trip-card-left">
                      <div
                        className={`icon-avatar ${
                          trip.status === "in_transit" ? "blue" : "amber"
                        }`}
                      >
                        {trip.status === "in_transit" ? (
                          <Navigation size={32} />
                        ) : (
                          <PackageSearch size={32} />
                        )}
                      </div>
                      <div className="trip-details">
                        <div className="trip-header-line">
                          <h3>{trip.title}</h3>
                          <span className="tag-gray">#{trip.id}</span>
                          <span className="tag-green">
                            Mã lô #{trip.batchCode}
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
                            <span className="meta-val">{trip.route}</span>
                          </p>
                          <p>
                            Khối lượng hàng:{" "}
                            <span className="highlight-weight">
                              {trip.weight}
                            </span>
                          </p>
                          <p>
                            Nhiệt độ thùng xe:{" "}
                            <span className="highlight-temp">{trip.temp}</span>
                          </p>
                        </div>

                        <div className="trip-location-note">
                          <p>Vị trí cập nhật gần nhất:</p>
                          <p>{trip.location}</p>
                        </div>

                        <div>
                          <span
                            className={
                              trip.status === "in_transit"
                                ? "status-badge-blue"
                                : "status-badge-amber"
                            }
                          >
                            {trip.statusText}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="actions-vertical">
                      {trip.status === "in_transit" ? (
                        <>
                          <button
                            onClick={() => openModal("journeyLog")}
                            className="btn-secondary"
                          >
                            <MapPin size={14} />
                            <span>Ghi nhật ký hành trình</span>
                          </button>
                          <button
                            onClick={() => openModal("deliveryConfirm")}
                            className="btn-primary"
                          >
                            <CheckCircle size={14} />
                            <span>Xác nhận giao hàng đến</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setPickupForm((prev) => ({
                              ...prev,
                              tripCode: `#${trip.id}`,
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
                    </div>
                  </div>
                ))}
              </div>
            </main>
          )}

          {/* TAB 2: XÁC NHẬN LẤY HÀNG ĐI */}
          {currentTab === "pickup" && (
            <main className="view-container">
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
                    fontSize: "12px",
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
                        Lô #SC-2026-001 (1,200 kg Quýt Đường)
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
                        padding: "2px 10px",
                        borderRadius: "4px",
                        fontWeight: 600,
                        fontSize: "11px",
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
                        Lô #LH-8809 (800 kg Cam Sành)
                      </p>
                      <p style={{ color: "#6b7280" }}>
                        Lấy từ: Nông trại Vườn Cam A1 ➔ Tài xế Lê Thành Đạt lúc
                        07:15 - 28/09/2026
                      </p>
                    </div>
                    <span
                      style={{
                        backgroundColor: "#d1fae5",
                        color: "#065f46",
                        padding: "2px 10px",
                        borderRadius: "4px",
                        fontWeight: 600,
                        fontSize: "11px",
                      }}
                    >
                      Đã hoàn thành chuyến
                    </span>
                  </div>
                </div>
              </div>
            </main>
          )}

          {/* TAB 3: GHI LẠI HÀNH TRÌNH */}
          {currentTab === "journey" && (
            <main className="view-container">
              <div className="section-card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <h2
                      style={{
                        fontSize: "16px",
                        fontWeight: 700,
                        color: "#1f2937",
                      }}
                    >
                      Hành Trình Di Chuyển Chuyến Xe #VC-2026-8801
                    </h2>
                    <p style={{ fontSize: "12px", color: "#6b7280" }}>
                      Theo dõi định vị GPS và thông số bảo quản nông sản liên
                      tục
                    </p>
                  </div>
                  <button
                    onClick={() => openModal("journeyLog")}
                    className="btn-primary"
                  >
                    <PlusCircle size={16} />
                    <span>Thêm Điểm Dừng / Cập Nhật GPS</span>
                  </button>
                </div>

                <div className="timeline-track">
                  <div className="timeline-item">
                    <span className="timeline-dot"></span>
                    <p className="timeline-title">
                      13:15 - 30/09/2026: Rời Xưởng Sơ Chế Trà Vinh
                    </p>
                    <p className="timeline-desc">
                      Xuất phát với thùng xe làm lạnh ổn định ở mức 6.0°C. Niêm
                      phong seal mã #SEAL-LOG-119.
                    </p>
                  </div>

                  <div className="timeline-item">
                    <span className="timeline-dot"></span>
                    <p className="timeline-title">
                      15:00 - 30/09/2026: Qua Cầu Mỹ Thuận 2
                    </p>
                    <p className="timeline-desc">
                      Tốc độ trung bình 60km/h. Cảm biến nhiệt độ đo được:
                      6.2°C, độ ẩm 85%.
                    </p>
                  </div>

                  <div className="timeline-item">
                    <span className="timeline-dot-ping"></span>
                    <span className="timeline-dot current"></span>
                    <p className="timeline-title current">
                      16:45 - 30/09/2026: Trạm Dừng Nghỉ Cao Tốc Trung Lương
                    </p>
                    <p className="timeline-desc" style={{ color: "#4b5563" }}>
                      Tài xế kiểm tra thùng xe: Niêm phong nguyên vẹn, nhiệt độ
                      duy trì tốt 6.1°C.
                    </p>
                  </div>
                </div>
              </div>
            </main>
          )}

          {/* TAB 4: XÁC NHẬN GIAO HÀNG ĐẾN */}
          {currentTab === "delivery" && (
            <main className="view-container">
              <div className="section-header-box">
                <div>
                  <h2>Xác Nhận Bàn Giao Hàng Đến Điểm Đích</h2>
                  <p>
                    Chốt trạng thái hoàn thành chuyến đi, bàn giao sản phẩm cho
                    siêu thị/đối tác bán lẻ kèm chữ ký nhận.
                  </p>
                </div>
                <button
                  onClick={() =>
                    exportToJson(
                      {
                        trip: "VC-2026-8801",
                        item: "Quýt Đường",
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
                        fontSize: "14px",
                        color: "#1f2937",
                      }}
                    >
                      Đơn Bàn Giao #VC-2026-8801 - Lô Quýt Đường
                    </h3>
                    <p style={{ fontSize: "12px", color: "#6b7280" }}>
                      Điểm giao: Kho Phân Phối Bách Hóa Xanh Bình Tân
                    </p>
                  </div>
                  <button
                    onClick={() => openModal("deliveryConfirm")}
                    className="btn-primary"
                  >
                    <Check size={16} />
                    <span>Lập Biên Bản Giao Nhận</span>
                  </button>
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
                <Truck size={20} color="#059669" /> Khởi Tạo Chuyến Vận Chuyển
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
                      setNewTripForm({ ...newTripForm, batch: e.target.value })
                    }
                  >
                    <option>
                      Lô #SC-2026-002 - Cam Sành Đóng Thùng (800 kg)
                    </option>
                    <option>
                      Lô #LH-8824 - Quýt Đường Mới Thu Hoạch (1,500 kg)
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
                        setNewTripForm({ ...newTripForm, from: e.target.value })
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
                <PackageCheck size={20} color="#059669" /> Xác Nhận Lấy Hàng Lên
                Xe
              </h3>
              <button
                className="modal-close-btn"
                onClick={() => closeModal("pickupAction")}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: "#4b5563" }}>
                Chuyến xe:{" "}
                <b style={{ color: "#047857" }}>
                  {pickupForm.tripCode} ({pickupForm.batchCode})
                </b>
              </p>
              <div className="form-group">
                <label>Khối Lượng Cân Thực Tế Lên Xe (kg)</label>
                <input
                  type="number"
                  value={pickupForm.weight}
                  onChange={(e) =>
                    setPickupForm({ ...pickupForm, weight: e.target.value })
                  }
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Mã Niêm Phong Seal Khóa Thùng</label>
                <input
                  type="text"
                  value={pickupForm.sealCode}
                  onChange={(e) =>
                    setPickupForm({ ...pickupForm, sealCode: e.target.value })
                  }
                  className="form-input font-mono"
                />
              </div>
              <div className="form-group">
                <label>Nhiệt Độ Thùng Xe Ban Đầu (°C)</label>
                <input
                  type="text"
                  value={pickupForm.temp}
                  onChange={(e) =>
                    setPickupForm({ ...pickupForm, temp: e.target.value })
                  }
                  className="form-input"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => closeModal("pickupAction")}
              >
                Hủy
              </button>
              <button className="btn-primary" onClick={handleConfirmPickup}>
                Xác Nhận & Xuất Phát
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: GHI NHẬT KÝ HÀNH TRÌNH */}
      {/* ========================================================= */}
      {modalState.journeyLog && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>
                <MapPin size={20} color="#059669" /> Ghi Lại Chặng Hành Trình
              </h3>
              <button
                className="modal-close-btn"
                onClick={() => closeModal("journeyLog")}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Vị Trí / Địa Điểm Hiện Tại (*)</label>
                <input
                  type="text"
                  value={journeyForm.location}
                  onChange={(e) =>
                    setJourneyForm({ ...journeyForm, location: e.target.value })
                  }
                  placeholder="Ví dụ: Trạm thu phí Long Phước..."
                  className="form-input"
                />
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Nhiệt Độ Thùng (°C)</label>
                  <input
                    type="text"
                    value={journeyForm.temp}
                    onChange={(e) =>
                      setJourneyForm({ ...journeyForm, temp: e.target.value })
                    }
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Độ Ẩm Thùng (%)</label>
                  <input
                    type="text"
                    value={journeyForm.humidity}
                    onChange={(e) =>
                      setJourneyForm({
                        ...journeyForm,
                        humidity: e.target.value,
                      })
                    }
                    className="form-input"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Ghi Chú Trình Trạng Nông Sản</label>
                <textarea
                  rows="2"
                  value={journeyForm.note}
                  onChange={(e) =>
                    setJourneyForm({ ...journeyForm, note: e.target.value })
                  }
                  className="form-textarea"
                ></textarea>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => closeModal("journeyLog")}
              >
                Hủy
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  alert(
                    "Đã cập nhật tọa độ GPS và thông số lạnh lên AgriChain!",
                  );
                  closeModal("journeyLog");
                }}
              >
                Ghi Lên Chuỗi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: XÁC NHẬN GIAO HÀNG (DELIVERY CONFIRM) */}
      {/* ========================================================= */}
      {modalState.deliveryConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>
                <CheckCircle2 size={20} color="#059669" /> Xác Nhận Giao Hàng
                Đến Nơi
              </h3>
              <button
                className="modal-close-btn"
                onClick={() => closeModal("deliveryConfirm")}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Người Nhận Hàng (*)</label>
                <input
                  type="text"
                  value={deliveryForm.recipient}
                  onChange={(e) =>
                    setDeliveryForm({
                      ...deliveryForm,
                      recipient: e.target.value,
                    })
                  }
                  placeholder="Phạm Thị Mai (Thủ kho Bách Hóa Xanh)"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Kết Quả Kiểm Tra Hàng Khi Mở Thùng</label>
                <select
                  className="form-select"
                  value={deliveryForm.checkResult}
                  onChange={(e) =>
                    setDeliveryForm({
                      ...deliveryForm,
                      checkResult: e.target.value,
                    })
                  }
                  style={{ fontWeight: 600, color: "#047857" }}
                >
                  <option>
                    Đầy đủ số lượng - Không dập hỏng - Đạt chuẩn nghiệm thu
                  </option>
                  <option>
                    Có phát sinh hao hụt & dập nát (Lập biên bản riêng)
                  </option>
                </select>
              </div>
              <div className="form-group">
                <label>Ký Nhận Điện Tử (Mã OTP / Chữ ký số)</label>
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
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => closeModal("deliveryConfirm")}
              >
                Đóng
              </button>
              <button className="btn-primary" onClick={handleConfirmDelivery}>
                Hoàn Tất Bàn Giao
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
