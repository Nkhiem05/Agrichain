import React, { useState, useEffect } from "react";
import {
  ArrowRightLeft,
  Package,
  Layers,
  Check,
  CheckCheck,
  PlusCircle,
  Edit3,
  Trash2,
  QrCode,
  GitFork,
  Plus,
  Split,
  Combine,
  Truck,
  Box,
  X,
  XCircle,
  Calendar,
  AlertCircle,
  Scale,
  Clock,
  CheckCircle2,
  SendHorizontal,
  Eye,
  MapPin,
  FileText,
  MoreVertical,
} from "lucide-react";
import "../../css/soche.css";
import { useNavigate } from "react-router-dom";

const DEFAULT_LOGO_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png";

const ProcessingPage = () => {
  const navigate = useNavigate();
  // 1. Quản lý Tab chính: reception -> processing -> batch-split-merge -> shipping
  const [activeTab, setActiveTab] = useState("reception");

  // 2. Bộ lọc trạng thái Tab Tiếp Nhận
  const [receptionFilter, setReceptionFilter] = useState("ALL");

  // 3. Bộ lọc trạng thái Tab Sơ Chế: ALL | PROCESSING | PACKAGED
  const [processingFilter, setProcessingFilter] = useState("ALL");

  // 4. Bộ lọc trạng thái Tab Bàn Giao Vận Chuyển
  const [shippingFilter, setShippingFilter] = useState("ALL");

  // 5. Danh sách các lô thu hoạch phân công đến cơ sở
  const [incomingBatches, setIncomingBatches] = useState([
    {
      id: "#LH-8824",
      name: "Quýt Đường Trà Vinh (Lô thu hoạch)",
      farmName: "Vườn Cam A1 (#FARM-01111)",
      departureTime: "30/09/2026 - 06:30",
      estimatedArrival: "04/10/2026 - 15:30 (Hôm nay)",
      weight: "1,500 kg",
      driver: "Trần Văn Cảnh (Xe 64A-092.11)",
      note: "Đã kiểm nghiệm nitrate an toàn, độ ngọt 11-12 Brix.",
      statusCode: "CHO_CHAP_NHAN",
      timelineStep: 1,
    },
    {
      id: "#LH-8826",
      name: "Bưởi Da Xanh Bến Tre",
      farmName: "HTX Bưởi Giồng Trôm (#FARM-01205)",
      departureTime: "04/10/2026 - 08:00",
      estimatedArrival: "05/10/2026 - 09:00 (Ngày mai)",
      weight: "2,500 kg",
      driver: "Nguyễn Văn Lộc (Xe 71C-018.33)",
      note: "Tiêu chuẩn GlobalGAP xuất khẩu, bảo quản mát.",
      statusCode: "DANG_VAN_CHUYEN",
      timelineStep: 2,
    },
    {
      id: "#LH-8821",
      name: "Cam Sành VietGAP (Đã nhập kho đệm)",
      farmName: "Vườn Quýt B2 (#FARM-01120)",
      departureTime: "29/09/2026 - 07:00",
      estimatedArrival: "29/09/2026 - 15:45",
      weight: "2,000 kg",
      actualWeight: "1,980 kg",
      driver: "Lê Hoàng Nam (Xe 65C-129.80)",
      note: "Đã quét QR, cân thực tế đạt chuẩn KCS.",
      statusCode: "DA_TIEP_NHAN",
      timelineStep: 4,
    },
  ]);

  // 6. Danh sách các lô sơ chế
  const [processingBatches, setProcessingBatches] = useState([
    {
      id: "#SC-2026-001",
      title: "Quýt Đường Đóng Thùng Xuất Khẩu",
      source: "Vườn cam A1 (#FARM-01111)",
      variety: "Quýt Đường",
      lot: "A1-1",
      startDate: "28/09/2026",
      weight: "1,200 kg",
      status: "Đang rửa ozon & phân loại size",
      processInfo: [
        "Rửa sạch khử khuẩn bằng sục khí ozon vi bọt",
        "Sấy ráo nhiệt độ phòng và phủ sáp hữu cơ bảo quản",
      ],
      estDate: "01/10/2026",
      iconType: "package",
    },
    {
      id: "#SC-2026-002",
      title: "Cam Sành Đóng Thùng 10kg",
      source: "Lô gộp #LH-8809 & #LH-8812",
      variety: "Cam Sành Tiền Giang",
      lot: "10kg / thùng (Carton 5 lớp)",
      startDate: "27/09/2026",
      weight: "800 kg",
      status: "Đã đóng gói hoàn tất",
      processInfo: [
        "Dán nhãn tem QR truy xuất nguồn gốc từng thùng",
        "Lưu trữ kho mát 8°C - 10°C",
      ],
      estDate: "Đã hoàn tất",
      iconType: "box",
    },
  ]);

  // 7. Danh sách các đơn bàn giao vận chuyển
  const [shippingHandoverList, setShippingHandoverList] = useState([
    {
      trackingCode: "VD-LOG-9901",
      batchId: "#SC-2026-002",
      batchTitle: "Cam Sành Đóng Thùng 10kg",
      transporter: "Mekong Cold Logistics",
      driver: "Võ Minh Toàn",
      plateNumber: "51D-891.22",
      destWarehouse: "Kho Tổng Siêu Thị Go! Cần Thơ",
      weight: "800 kg",
      handoverTime: "04/10/2026 - 16:30",
      statusCode: "DANG_VAN_CHUYEN",
      statusName: "Đang vận chuyển",
      estimatedDelivery: "05/10/2026 - 08:00",
      temperature: "Kho lạnh 8°C",
      sealNumber: "SEAL-MK-88912",
    },
    {
      trackingCode: "VD-LOG-8812",
      batchId: "#SC-2026-000",
      batchTitle: "Xoài Cát Hòa Lộc Hộp Quà",
      transporter: "Giao Hàng Nhanh AgriShip",
      driver: "Phạm Quốc Bảo",
      plateNumber: "64A-012.89",
      destWarehouse: "Cảng Cát Lái - Kho CFS",
      weight: "1,200 kg",
      handoverTime: "02/10/2026 - 09:15",
      statusCode: "DA_HOAN_THANH",
      statusName: "Đã hoàn thành",
      estimatedDelivery: "02/10/2026 - 15:00",
      temperature: "Nhiệt độ phòng thoáng mát",
      sealNumber: "SEAL-AS-11029",
    },
    {
      trackingCode: "VD-LOG-7721",
      batchId: "#SC-2026-003",
      batchTitle: "Bưởi Năm Roi Xuất Khẩu",
      transporter: "Vận Tải Lạnh Miền Tây",
      driver: "Lê Hoàng Phúc",
      plateNumber: "65C-112.56",
      destWarehouse: "Trung tâm Phân phối MM Mega Market",
      weight: "2,000 kg",
      handoverTime: "04/10/2026 - 17:00",
      statusCode: "CHO_CHAP_NHAN",
      statusName: "Chờ chấp nhận",
      estimatedDelivery: "05/10/2026 - 14:00",
      temperature: "Kho lạnh 10°C",
      sealNumber: "SEAL-MT-77621",
    },
    {
      trackingCode: "VD-LOG-6655",
      batchId: "#SC-2026-004",
      batchTitle: "Chanh Không Hạt Đóng Thùng",
      transporter: "Mekong Logistics",
      driver: "Nguyễn Văn Hưng",
      plateNumber: "66B-098.33",
      destWarehouse: "Kho Lạnh Central Group",
      weight: "650 kg",
      handoverTime: "04/10/2026 - 17:30",
      statusCode: "CHO_TIEP_NHAN",
      statusName: "Chờ tiếp nhận",
      estimatedDelivery: "05/10/2026 - 10:30",
      temperature: "Kho lạnh 6°C",
      sealNumber: "SEAL-MK-44018",
    },
  ]);

  // Quản lý đóng/mở dropdown menu 3 chấm
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);

  // Modal Tiếp nhận (Cân thực tế & QR)
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receivingBatch, setReceivingBatch] = useState(null);
  const [actualWeightInput, setActualWeightInput] = useState("");

  // Modal Từ chối tiếp nhận
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingBatch, setRejectingBatch] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  // Modal Bàn giao cho đơn vị vận chuyển
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [handoverBatch, setHandoverBatch] = useState(null);
  const [handoverForm, setHandoverForm] = useState({
    transporter: "Mekong Cold Logistics",
    driver: "",
    plateNumber: "",
    destWarehouse: "Kho Trung Chuyển Metro",
  });

  // Modal Xem chi tiết vận chuyển
  const [showShippingDetailModal, setShowShippingDetailModal] = useState(false);
  const [selectedShippingDetail, setSelectedShippingDetail] = useState(null);

  // Cập nhật trạng thái
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [newStatus, setNewStatus] = useState("Đang rửa sạch & diệt khuẩn");

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest(".action-menu-wrapper")) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  // ==================== CÁC HÀM XỬ LÝ ====================

  const habdlechitietsoche = (e) => {
    e.preventDefault();
    navigate("/chi-tiet-so-che");
  };

  const handleAcceptBatch = (batchId) => {
    setIncomingBatches((prev) =>
      prev.map((item) =>
        item.id === batchId
          ? {
              ...item,
              statusCode: "DANG_VAN_CHUYEN",
              timelineStep: 2,
            }
          : item,
      ),
    );
    alert(
      `Đã chấp nhận lô ${batchId}. Trạng thái chuyển thành "ĐANG VẬN CHUYỂN" để nhà xe di chuyển đến cơ sở.`,
    );
  };

  const handleOpenRejectModal = (batch) => {
    setRejectingBatch(batch);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) {
      alert("Vui lòng nhập lý do từ chối để Admin có cơ sở phân công lại!");
      return;
    }
    setIncomingBatches((prev) =>
      prev.filter((item) => item.id !== rejectingBatch.id),
    );
    setShowRejectModal(false);
    alert(
      `Đã từ chối tiếp nhận lô ${rejectingBatch.id}. Lô hàng đã được hoàn trả lại danh sách CHỜ_PHÂN_CÔNG của Admin.`,
    );
  };

  const handleOpenReceiveModal = (batch) => {
    setReceivingBatch(batch);
    setActualWeightInput(batch.weight.replace(/[^0-9]/g, ""));
    setShowReceiveModal(true);
  };

  const handleConfirmFinalReceive = () => {
    if (!actualWeightInput) {
      alert("Vui lòng nhập khối lượng cân thực tế!");
      return;
    }

    setIncomingBatches((prev) =>
      prev.map((item) =>
        item.id === receivingBatch.id
          ? {
              ...item,
              statusCode: "DA_TIEP_NHAN",
              timelineStep: 4,
              actualWeight: `${Number(actualWeightInput).toLocaleString()} kg`,
            }
          : item,
      ),
    );
    setShowReceiveModal(false);
    alert(
      `Đã tiếp nhận thành công lô ${receivingBatch.id} vào kho với trọng lượng ${Number(
        actualWeightInput,
      ).toLocaleString()} kg. Dữ liệu đã được ký số và ghi nhận lên chuỗi!`,
    );
  };

  // Mở Popup bàn giao
  const handleOpenHandover = (batch) => {
    setHandoverBatch(batch);
    setHandoverForm({
      transporter: "Mekong Cold Logistics",
      driver: "Trần Hữu Lợi",
      plateNumber: "65C-109.44",
      destWarehouse: "Trung tâm phân phối Co.opmart",
    });
    setShowHandoverModal(true);
  };

  // Xác nhận tạo lệnh bàn giao vận chuyển
  const handleConfirmHandover = () => {
    if (!handoverForm.driver.trim() || !handoverForm.plateNumber.trim()) {
      alert("Vui lòng điền đủ tên tài xế và biển số xe vận chuyển!");
      return;
    }

    const newRecord = {
      trackingCode: `VD-LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      batchId: handoverBatch.id,
      batchTitle: handoverBatch.title,
      transporter: handoverForm.transporter,
      driver: handoverForm.driver,
      plateNumber: handoverForm.plateNumber,
      destWarehouse: handoverForm.destWarehouse,
      weight: handoverBatch.weight,
      handoverTime: "04/10/2026 - 18:00",
      statusCode: "CHO_CHAP_NHAN",
      statusName: "Chờ chấp nhận",
      estimatedDelivery: "05/10/2026 - 12:00",
      temperature: "Kho lạnh 8°C",
      sealNumber: `SEAL-MK-${Math.floor(10000 + Math.random() * 90000)}`,
    };

    setShippingHandoverList((prev) => [newRecord, ...prev]);
    setShowHandoverModal(false);
    alert(
      `Đã tạo vận đơn ${newRecord.trackingCode} cho đơn vị vận chuyển thành công!`,
    );
    setActiveTab("shipping");
  };

  // Mở popup xem chi tiết vận chuyển
  const handleOpenShippingDetail = (item) => {
    setSelectedShippingDetail(item);
    setShowShippingDetailModal(true);
  };

  // Lọc tab Tiếp Nhận
  const filteredIncomingBatches = incomingBatches.filter((item) => {
    if (receptionFilter === "ALL") return true;
    return item.statusCode === receptionFilter;
  });

  // Lọc tab Sơ Chế
  const filteredProcessingBatches = processingBatches.filter((b) => {
    if (processingFilter === "ALL") return true;
    if (processingFilter === "PACKAGED") return b.status.includes("hoàn tất");
    if (processingFilter === "PROCESSING")
      return !b.status.includes("hoàn tất");
    return true;
  });

  // Lọc tab Bàn Giao Vận Chuyển
  const filteredShippingList = shippingHandoverList.filter((item) => {
    if (shippingFilter === "ALL") return true;
    return item.statusCode === shippingFilter;
  });

  return (
    <div className="soche">
      <div className="soche-dashboard">
        {/* ================= HEADER ================= */}
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
              placeholder="Tìm kiếm lô nông sản, mã sơ chế, QR code..."
            />
          </div>

          <div className="header-profile">
            <div className="avatar-circle">CS</div>
            <div className="profile-meta">
              <span className="profile-name">HTX Sơ Chế Mekong</span>
              <span className="profile-role">Cơ sở sơ chế / Đóng gói</span>
            </div>
          </div>
        </header>

        {/* ================= BODY ================= */}
        <div className="dashboard-body">
          {/* ================= SIDEBAR ================= */}
          <aside className="dashboard-sidebar">
            <div>
              <div className="sidebar-heading">Chức năng cơ sở</div>
              <nav className="sidebar-nav">
                <button
                  type="button"
                  onClick={() => setActiveTab("reception")}
                  className={`nav-item-btn ${
                    activeTab === "reception" ? "active" : ""
                  }`}
                >
                  <ArrowRightLeft size={20} />
                  <span>Tiếp nhận lô nông sản</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("processing")}
                  className={`nav-item-btn ${
                    activeTab === "processing" ? "active" : ""
                  }`}
                >
                  <Package size={20} />
                  <span>Quản lý sơ chế đóng gói</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("batch-split-merge")}
                  className={`nav-item-btn ${
                    activeTab === "batch-split-merge" ? "active" : ""
                  }`}
                >
                  <Layers size={20} />
                  <span>Quản lý tách / gộp lô</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("shipping")}
                  className={`nav-item-btn ${
                    activeTab === "shipping" ? "active" : ""
                  }`}
                >
                  <Truck size={20} />
                  <span>Bàn giao vận chuyển</span>
                </button>
              </nav>
            </div>

            <div className="sidebar-footer">
              <span className="pulse-dot"></span>
              <span>
                Mạng chuỗi: <b>AgriChain Mainnet</b>
              </span>
            </div>
          </aside>

          {/* ================= CONTENT CHÍNH ================= */}
          <main className="dashboard-content">
            <div className="dashboard-content-inner">
              {/* ================= TAB 1: TIẾP NHẬN LÔ NÔNG SẢN ================= */}
              {activeTab === "reception" && (
                <div>
                  <div className="metrics-row">
                    <div className="metric-card">
                      <div className="metric-title">Chờ duyệt / Vận chuyển</div>
                      <div className="metric-number">
                        {
                          incomingBatches.filter(
                            (b) => b.statusCode !== "DA_TIEP_NHAN",
                          ).length
                        }
                        <span className="metric-unit">LÔ HÀNG</span>
                      </div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-title">Đã tiếp nhận nhập kho</div>
                      <div className="metric-number">
                        {
                          incomingBatches.filter(
                            (b) => b.statusCode === "DA_TIEP_NHAN",
                          ).length
                        }
                        <span className="metric-unit">LÔ ĐÃ NHẬP</span>
                      </div>
                    </div>

                    <div className="actions-box">
                      <select
                        className="filter-select"
                        value={receptionFilter}
                        onChange={(e) => setReceptionFilter(e.target.value)}
                      >
                        <option value="ALL">Tất cả lô hàng</option>
                        <option value="CHO_CHAP_NHAN">
                          Chờ chấp nhận (Mới phân công)
                        </option>
                        <option value="DANG_VAN_CHUYEN">
                          Chờ tiếp nhận (Đang vận chuyển)
                        </option>
                        <option value="DA_TIEP_NHAN">
                          Đã tiếp nhận (Đã cân & nhập kho)
                        </option>
                      </select>

                      <button
                        className="btn-primary-action"
                        onClick={() =>
                          alert("Khởi động Camera quét nhanh mã QR lô hàng...")
                        }
                      >
                        <QrCode size={16} /> Quét nhanh mã QR
                      </button>
                    </div>
                  </div>

                  {filteredIncomingBatches.length === 0 ? (
                    <div
                      style={{
                        padding: "48px 0",
                        textAlign: "center",
                        color: "#6b7280",
                      }}
                    >
                      <AlertCircle
                        size={40}
                        style={{ margin: "0 auto 10px", color: "#9ca3af" }}
                      />
                      <p>
                        Không có lô nông sản nào phù hợp với bộ lọc hiện tại.
                      </p>
                    </div>
                  ) : (
                    filteredIncomingBatches.map((batch) => (
                      <div className="card-item" key={batch.id}>
                        <div
                          className={`card-icon-box ${
                            batch.statusCode === "DA_TIEP_NHAN"
                              ? "green"
                              : batch.statusCode === "DANG_VAN_CHUYEN"
                                ? "blue"
                                : "amber"
                          }`}
                        >
                          {batch.statusCode === "DA_TIEP_NHAN" ? (
                            <CheckCheck size={28} />
                          ) : (
                            <Truck size={28} />
                          )}
                        </div>

                        <div className="card-body">
                          <div className="card-header-line">
                            <h3 className="card-title">{batch.name}</h3>
                            <span className="tag-badge gray">{batch.id}</span>
                            <span className="tag-badge green">
                              {batch.farmName}
                            </span>
                          </div>

                          <div className="card-meta-row">
                            <span>
                              Xuất vườn: <strong>{batch.departureTime}</strong>
                            </span>
                            <span>
                              Khối lượng đăng ký:{" "}
                              <strong>{batch.weight}</strong>
                            </span>
                            {batch.actualWeight && (
                              <span>
                                Cân thực tế:{" "}
                                <strong style={{ color: "#16a34a" }}>
                                  {batch.actualWeight}
                                </strong>
                              </span>
                            )}
                            <span>
                              Tài xế: <strong>{batch.driver}</strong>
                            </span>
                          </div>

                          <div className="card-desc">
                            <strong>Ghi chú:</strong> {batch.note}
                          </div>

                          <div className="arrival-banner">
                            <Calendar size={15} />
                            <span>
                              Thời gian dự kiến đến:{" "}
                              <strong>{batch.estimatedArrival}</strong>
                            </span>
                          </div>

                          {/* TIMELINE VẬN CHUYỂN */}
                          <div className="shipping-timeline">
                            <div className="timeline-step completed">
                              <span className="timeline-dot">
                                <Check size={12} strokeWidth={3} />
                              </span>
                              <span>Nông dân xuất lô</span>
                            </div>

                            <div
                              className={`timeline-connector ${
                                batch.timelineStep >= 2 ? "filled" : ""
                              }`}
                            ></div>

                            <div
                              className={`timeline-step ${
                                batch.timelineStep > 1
                                  ? "completed"
                                  : batch.timelineStep === 1
                                    ? "active"
                                    : ""
                              }`}
                            >
                              <span className="timeline-dot">
                                {batch.timelineStep > 1 ? (
                                  <Check size={12} strokeWidth={3} />
                                ) : (
                                  "2"
                                )}
                              </span>
                              <span>Cơ sở chấp nhận</span>
                            </div>

                            <div
                              className={`timeline-connector ${
                                batch.timelineStep >= 3 ? "filled" : ""
                              }`}
                            ></div>

                            <div
                              className={`timeline-step ${
                                batch.timelineStep > 2
                                  ? "completed"
                                  : batch.timelineStep === 2
                                    ? "active"
                                    : ""
                              }`}
                            >
                              <span className="timeline-dot">
                                {batch.timelineStep > 2 ? (
                                  <Check size={12} strokeWidth={3} />
                                ) : (
                                  "3"
                                )}
                              </span>
                              <span>Đang vận chuyển</span>
                            </div>

                            <div
                              className={`timeline-connector ${
                                batch.timelineStep >= 4 ? "filled" : ""
                              }`}
                            ></div>

                            <div
                              className={`timeline-step ${
                                batch.timelineStep === 4 ? "completed" : ""
                              }`}
                            >
                              <span className="timeline-dot">
                                {batch.timelineStep === 4 ? (
                                  <Check size={12} strokeWidth={3} />
                                ) : (
                                  "4"
                                )}
                              </span>
                              <span>Đã cân & Nhập kho</span>
                            </div>
                          </div>

                          <div style={{ marginTop: "10px" }}>
                            {batch.statusCode === "CHO_CHAP_NHAN" && (
                              <span className="badge-status-line warning">
                                <Clock size={14} /> Chờ cơ sở xác nhận chấp nhận
                                lô
                              </span>
                            )}
                            {batch.statusCode === "DANG_VAN_CHUYEN" && (
                              <span className="badge-status-line info">
                                <Truck size={14} /> Đang vận chuyển tới cơ sở -
                                Sẵn sàng tiếp nhận
                              </span>
                            )}
                            {batch.statusCode === "DA_TIEP_NHAN" && (
                              <span className="badge-status-line success">
                                <CheckCircle2 size={14} /> Đã tiếp nhận & Ghi
                                nhận Blockchain thành công
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="card-actions">
                          {batch.statusCode === "CHO_CHAP_NHAN" && (
                            <>
                              <button
                                className="btn-action-outline"
                                onClick={() => handleAcceptBatch(batch.id)}
                              >
                                <Check size={16} /> Chấp nhận lô
                              </button>
                              <button
                                className="btn-action-outline danger"
                                onClick={() => handleOpenRejectModal(batch)}
                              >
                                <XCircle size={16} /> Từ chối
                              </button>
                            </>
                          )}

                          {batch.statusCode === "DANG_VAN_CHUYEN" && (
                            <button
                              className="btn-action-outline blue"
                              onClick={() => handleOpenReceiveModal(batch)}
                            >
                              <Scale size={16} /> Tiếp nhận lô
                            </button>
                          )}

                          {batch.statusCode === "DA_TIEP_NHAN" && (
                            <button
                              className="btn-action-outline"
                              onClick={() => {
                                setActiveTab("processing");
                                setShowCreateModal(true);
                              }}
                            >
                              <PlusCircle size={16} /> Tạo lô sơ chế
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ================= TAB 2: QUẢN LÝ SƠ CHẾ & ĐÓNG GÓI ================= */}
              {activeTab === "processing" && (
                <div>
                  <div className="metrics-row">
                    <div className="metric-card">
                      <div className="metric-title">Lô đang sơ chế</div>
                      <div className="metric-number">
                        {
                          processingBatches.filter(
                            (b) => !b.status.includes("hoàn tất"),
                          ).length
                        }
                        <span className="metric-unit">LÔ ĐANG CHẠY</span>
                      </div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-title">
                        Đóng gói sẵn sàng xuất kho
                      </div>
                      <div className="metric-number">
                        {
                          processingBatches.filter((b) =>
                            b.status.includes("hoàn tất"),
                          ).length
                        }
                        <span className="metric-unit">LÔ HOÀN TẤT</span>
                      </div>
                    </div>

                    <div className="actions-box">
                      <select
                        className="filter-select"
                        value={processingFilter}
                        onChange={(e) => setProcessingFilter(e.target.value)}
                      >
                        <option value="ALL">Tất cả trạng thái sơ chế</option>
                        <option value="PROCESSING">
                          Đang sơ chế & phân loại
                        </option>
                        <option value="PACKAGED">
                          Đã đóng gói (Chờ bàn giao)
                        </option>
                      </select>

                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="btn-secondary-action"
                          style={{ flex: 1 }}
                          onClick={() => setActiveTab("batch-split-merge")}
                        >
                          <GitFork size={15} /> Tách / Gộp
                        </button>
                        <button
                          className="btn-primary-action"
                          style={{ flex: 1.5 }}
                          onClick={() => setShowCreateModal(true)}
                        >
                          <Plus size={16} /> Tạo Lô
                        </button>
                      </div>
                    </div>
                  </div>

                  {filteredProcessingBatches.map((b) => {
                    const isPackaged = b.status.includes("hoàn tất");

                    return (
                      <div className="card-item" key={b.id}>
                        <div
                          className={`card-icon-box ${
                            b.iconType === "box" ? "amber" : "green"
                          }`}
                        >
                          {b.iconType === "box" ? (
                            <Box size={28} />
                          ) : (
                            <Package size={28} />
                          )}
                        </div>
                        <div className="card-body">
                          <div className="card-header-line">
                            <h3 className="card-title">{b.title}</h3>
                            <span className="tag-badge gray">{b.id}</span>
                            <span className="tag-badge green">{b.source}</span>
                          </div>

                          <div className="card-meta-row">
                            <span>
                              Giống: <strong>{b.variety}</strong>
                            </span>
                            <span>
                              Quy cách: <strong>{b.lot}</strong>
                            </span>
                            <span>
                              Bắt đầu: <strong>{b.startDate}</strong>
                            </span>
                            <span>
                              Khối lượng: <strong>{b.weight}</strong>
                            </span>
                            <span>
                              Trạng thái:{" "}
                              <strong
                                style={{
                                  color: isPackaged ? "#16a34a" : "#2563eb",
                                }}
                              >
                                {b.status}
                              </strong>
                            </span>
                          </div>

                          <div className="card-desc">
                            <strong>Quy trình & Tiêu chuẩn:</strong>
                            <ul>
                              {b.processInfo.map((p, idx) => (
                                <li key={idx}>{p}</li>
                              ))}
                            </ul>
                          </div>

                          <span className="badge-status-line success">
                            <Clock size={13} /> Dự kiến hoàn tất: {b.estDate}
                          </span>
                        </div>

                        {/* NÚT 3 CHẤM VÀ MENU DROPDOWN (GIỮ NGUYÊN XEM CHI TIẾT - KHÔNG DÙNG POPUP) */}
                        <div className="card-actions">
                          <div className="action-menu-wrapper">
                            <button
                              type="button"
                              className={`btn-more-dots ${
                                openDropdownId === b.id ? "active" : ""
                              }`}
                              title="Tùy chọn thao tác"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownId(
                                  openDropdownId === b.id ? null : b.id,
                                );
                              }}
                            >
                              <MoreVertical size={18} />
                            </button>

                            {openDropdownId === b.id && (
                              <div className="action-dropdown-menu">
                                <button
                                  type="button"
                                  className="dropdown-item-btn"
                                  onClick={habdlechitietsoche}
                                >
                                  <Eye size={15} color="#2563eb" /> Xem chi tiết
                                </button>

                                <button
                                  type="button"
                                  className="dropdown-item-btn"
                                  onClick={() => {
                                    setSelectedBatchId(b.id);
                                    setNewStatus(b.status);
                                    setShowStatusModal(true);
                                    setOpenDropdownId(null);
                                  }}
                                >
                                  <Edit3 size={15} color="#059669" /> Cập nhật
                                </button>

                                {isPackaged && (
                                  <button
                                    type="button"
                                    className="dropdown-item-btn"
                                    onClick={() => {
                                      handleOpenHandover(b);
                                      setOpenDropdownId(null);
                                    }}
                                  >
                                    <SendHorizontal size={15} color="#0d9488" />{" "}
                                    Bàn giao
                                  </button>
                                )}

                                <button
                                  type="button"
                                  className="dropdown-item-btn danger"
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    if (
                                      window.confirm(
                                        `Bạn có chắc chắn muốn xóa lô ${b.id}?`,
                                      )
                                    ) {
                                      setProcessingBatches((prev) =>
                                        prev.filter((i) => i.id !== b.id),
                                      );
                                    }
                                  }}
                                >
                                  <Trash2 size={15} color="#dc2626" /> Xóa
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ================= TAB 3: QUẢN LÝ TÁCH / GỘP LÔ ================= */}
              {activeTab === "batch-split-merge" && (
                <div>
                  <div className="subtab-box">
                    <div>
                      <h2
                        style={{
                          fontSize: "16px",
                          fontWeight: "700",
                          color: "#1f2937",
                        }}
                      >
                        Điều Phối & Phân Chia Lô Hàng
                      </h2>
                      <p
                        style={{
                          fontSize: "12px",
                          color: "#6b7280",
                          marginTop: "2px",
                        }}
                      >
                        Phân loại kích cỡ phẩm cấp (Tách lô) hoặc gom đơn hàng
                        xuất khẩu (Gộp lô).
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className="btn-secondary-action"
                        style={{ padding: "0 14px" }}
                        onClick={() => setShowSplitModal(true)}
                      >
                        <Split size={16} /> Thực hiện tách lô
                      </button>
                      <button
                        className="btn-primary-action"
                        style={{ padding: "0 14px" }}
                        onClick={() => setShowMergeModal(true)}
                      >
                        <Combine size={16} /> Thực hiện gộp lô
                      </button>
                    </div>
                  </div>

                  <div className="log-container">
                    <div className="log-header">
                      <span>Nhật Ký Tách / Gộp Lô Nông Sản</span>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "normal",
                          color: "#6b7280",
                        }}
                      >
                        Lưu vết bất biến trên Smart Contract
                      </span>
                    </div>

                    <div className="log-item">
                      <div className="log-left">
                        <div className="log-icon blue">
                          <Combine size={20} />
                        </div>
                        <div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: "700",
                                fontSize: "14px",
                              }}
                            >
                              Lô gộp #LH-GOP-04
                            </span>
                            <span className="tag-badge gray">
                              Gộp 2 lô thu hoạch
                            </span>
                          </div>
                          <p
                            style={{
                              fontSize: "12px",
                              color: "#6b7280",
                              marginTop: "4px",
                            }}
                          >
                            Từ: <b>#LH-8809 (450kg)</b> và{" "}
                            <b>#LH-8812 (350kg)</b> → Tổng:{" "}
                            <strong style={{ color: "#16a34a" }}>800 kg</strong>
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", fontSize: "12px" }}>
                        <span style={{ color: "#9ca3af", display: "block" }}>
                          27/09/2026 - 10:15
                        </span>
                        <span style={{ color: "#16a34a", fontWeight: "600" }}>
                          Thành công (Tx: 0x82b...9a1)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= TAB 4: BÀN GIAO CHO ĐƠN VỊ VẬN CHUYỂN ================= */}
              {activeTab === "shipping" && (
                <div>
                  <div className="metrics-row">
                    <div className="metric-card">
                      <div className="metric-title">SL Lô chờ chấp nhận</div>
                      <div className="metric-number">
                        {
                          shippingHandoverList.filter(
                            (item) => item.statusCode === "CHO_CHAP_NHAN",
                          ).length
                        }
                        <span className="metric-unit">LÔ ĐƠN</span>
                      </div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-title">SL Đang vận chuyển</div>
                      <div className="metric-number">
                        {
                          shippingHandoverList.filter(
                            (item) =>
                              item.statusCode === "DANG_VAN_CHUYEN" ||
                              item.statusCode === "CHO_TIEP_NHAN",
                          ).length
                        }
                        <span className="metric-unit">CHUYẾN XE</span>
                      </div>
                    </div>

                    <div className="metric-card">
                      <div className="metric-title">SL Đã hoàn thành</div>
                      <div className="metric-number">
                        {
                          shippingHandoverList.filter(
                            (item) => item.statusCode === "DA_HOAN_THANH",
                          ).length
                        }
                        <span className="metric-unit">ĐƠN GIAO</span>
                      </div>
                    </div>

                    <div className="actions-box">
                      <select
                        className="filter-select"
                        value={shippingFilter}
                        onChange={(e) => setShippingFilter(e.target.value)}
                      >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="CHO_CHAP_NHAN">Chờ chấp nhận</option>
                        <option value="CHO_TIEP_NHAN">Chờ tiếp nhận</option>
                        <option value="DANG_VAN_CHUYEN">
                          Đã tiếp nhận (Đang vận chuyển)
                        </option>
                        <option value="DA_HOAN_THANH">Đã hoàn thành</option>
                      </select>

                      <button
                        className="btn-primary-action"
                        onClick={() => {
                          const readyBatch = processingBatches.find((b) =>
                            b.status.includes("hoàn tất"),
                          );
                          if (readyBatch) {
                            handleOpenHandover(readyBatch);
                          } else {
                            alert(
                              "Chưa có lô nào hoàn tất đóng gói để bàn giao!",
                            );
                          }
                        }}
                      >
                        <Plus size={16} /> Tạo lệnh bàn giao
                      </button>
                    </div>
                  </div>

                  <div className="table-container">
                    <table className="shipping-table">
                      <thead>
                        <tr>
                          <th>Mã vận đơn</th>
                          <th>Mã lô hàng</th>
                          <th>Tên sản phẩm</th>
                          <th>Đơn vị vận chuyển</th>
                          <th>Khối lượng</th>
                          <th>Thời gian xuất</th>
                          <th>Trạng thái</th>
                          <th>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredShippingList.length === 0 ? (
                          <tr>
                            <td
                              colSpan={8}
                              style={{
                                textAlign: "center",
                                padding: "30px",
                                color: "#6b7280",
                              }}
                            >
                              Không tìm thấy vận đơn nào với trạng thái đã chọn.
                            </td>
                          </tr>
                        ) : (
                          filteredShippingList.map((row, idx) => (
                            <tr key={idx}>
                              <td>
                                <strong
                                  style={{
                                    color: "#2563eb",
                                    fontFamily: "monospace",
                                    fontSize: "13.5px",
                                  }}
                                >
                                  {row.trackingCode}
                                </strong>
                              </td>
                              <td>
                                <span className="tag-badge gray">
                                  {row.batchId}
                                </span>
                              </td>
                              <td>{row.batchTitle}</td>
                              <td>
                                <div>
                                  <strong>{row.transporter}</strong>
                                </div>
                                <div
                                  style={{
                                    fontSize: "12px",
                                    color: "#6b7280",
                                  }}
                                >
                                  {row.driver} ({row.plateNumber})
                                </div>
                              </td>
                              <td>
                                <strong>{row.weight}</strong>
                              </td>
                              <td>{row.handoverTime}</td>
                              <td>
                                {row.statusCode === "CHO_CHAP_NHAN" && (
                                  <span className="badge-status-line warning">
                                    <Clock size={12} /> Chờ chấp nhận
                                  </span>
                                )}
                                {row.statusCode === "CHO_TIEP_NHAN" && (
                                  <span className="badge-status-line purple">
                                    <Clock size={12} /> Chờ tiếp nhận
                                  </span>
                                )}
                                {row.statusCode === "DANG_VAN_CHUYEN" && (
                                  <span className="badge-status-line info">
                                    <Truck size={12} /> Đang vận chuyển
                                  </span>
                                )}
                                {row.statusCode === "DA_HOAN_THANH" && (
                                  <span className="badge-status-line success">
                                    <CheckCircle2 size={12} /> Đã hoàn thành
                                  </span>
                                )}
                              </td>
                              <td>
                                <button
                                  className="btn-detail-table"
                                  onClick={() => handleOpenShippingDetail(row)}
                                >
                                  <Eye size={14} /> Chi tiết
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>

        {/* ================= MODAL: TIẾP NHẬN LÔ ================= */}
        {showReceiveModal && receivingBatch && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h3>
                  <Scale size={18} color="#2e8b57" /> Xác Nhận Tiếp Nhận & Cân
                  Thực Tế
                </h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setShowReceiveModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                <p style={{ color: "#4b5563", marginBottom: "14px" }}>
                  Đang hoàn tất tiếp nhận cho lô:{" "}
                  <strong style={{ color: "#278d49" }}>
                    {receivingBatch.id} - {receivingBatch.name}
                  </strong>
                </p>

                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px dashed #cbd5e1",
                    marginBottom: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <QrCode size={36} color="#059669" />
                  <div style={{ fontSize: "12px", color: "#475569" }}>
                    <div>
                      Trạng thái QR Lô hàng:{" "}
                      <strong style={{ color: "#16a34a" }}>HỢP LỆ</strong>
                    </div>
                    <div>Truy xuất từ: {receivingBatch.farmName}</div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Khối lượng trên lệnh vận chuyển</label>
                  <input
                    type="text"
                    disabled
                    value={receivingBatch.weight}
                    style={{ backgroundColor: "#f3f4f6" }}
                  />
                </div>

                <div className="form-group">
                  <label>
                    Khối lượng cân thực tế tại trạm cân kho (kg) (*)
                  </label>
                  <input
                    type="number"
                    value={actualWeightInput}
                    onChange={(e) => setActualWeightInput(e.target.value)}
                    placeholder="Nhập số kg thực tế..."
                    autoFocus
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn-cancel"
                  onClick={() => setShowReceiveModal(false)}
                >
                  Hủy
                </button>
                <button
                  className="btn-save"
                  onClick={handleConfirmFinalReceive}
                >
                  Xác nhận & Ghi chuỗi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL: TỪ CHỐI TIẾP NHẬN ================= */}
        {showRejectModal && rejectingBatch && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h3 style={{ color: "#dc2626" }}>
                  <XCircle size={18} color="#dc2626" /> Từ Chối Tiếp Nhận Lô
                </h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setShowRejectModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                <p style={{ color: "#4b5563", marginBottom: "12px" }}>
                  Bạn đang từ chối lô hàng <strong>{rejectingBatch.id}</strong>.
                  Lô hàng này sẽ được hoàn trả lại danh sách{" "}
                  <strong>CHỜ_PHÂN_CÔNG</strong> trên hệ thống Admin.
                </p>

                <div className="form-group">
                  <label>Lý do từ chối (*)</label>
                  <textarea
                    rows={3}
                    placeholder="VD: Kho đã đầy công suất lưu trữ, tiêu chuẩn phẩm cấp chưa phù hợp..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn-cancel"
                  onClick={() => setShowRejectModal(false)}
                >
                  Đóng
                </button>
                <button
                  className="btn-save danger"
                  onClick={handleConfirmReject}
                >
                  Xác nhận từ chối
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL: TẠO LỆNH BÀN GIAO VẬN CHUYỂN ================= */}
        {showHandoverModal && handoverBatch && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h3>
                  <Truck size={18} color="#2e8b57" /> Bàn Giao Vận Chuyển Hàng
                  Hoá
                </h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setShowHandoverModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    marginBottom: "14px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div style={{ fontWeight: "700", color: "#111827" }}>
                    {handoverBatch.title} ({handoverBatch.id})
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      marginTop: "2px",
                    }}
                  >
                    Khối lượng xuất kho: <strong>{handoverBatch.weight}</strong>
                  </div>
                </div>

                <div className="form-group">
                  <label>Đơn vị vận chuyển (Logistics)</label>
                  <input
                    type="text"
                    value={handoverForm.transporter}
                    onChange={(e) =>
                      setHandoverForm({
                        ...handoverForm,
                        transporter: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Tài xế tiếp nhận</label>
                    <input
                      type="text"
                      placeholder="Họ tên tài xế..."
                      value={handoverForm.driver}
                      onChange={(e) =>
                        setHandoverForm({
                          ...handoverForm,
                          driver: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Biển số xe</label>
                    <input
                      type="text"
                      placeholder="VD: 65C-109.44"
                      value={handoverForm.plateNumber}
                      onChange={(e) =>
                        setHandoverForm({
                          ...handoverForm,
                          plateNumber: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Điểm giao hàng / Kho tiếp nhận</label>
                  <input
                    type="text"
                    value={handoverForm.destWarehouse}
                    onChange={(e) =>
                      setHandoverForm({
                        ...handoverForm,
                        destWarehouse: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn-cancel"
                  onClick={() => setShowHandoverModal(false)}
                >
                  Hủy
                </button>
                <button className="btn-save" onClick={handleConfirmHandover}>
                  Xác nhận bàn giao
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL: XEM CHI TIẾT VẬN ĐƠN ================= */}
        {showShippingDetailModal && selectedShippingDetail && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h3>
                  <FileText size={18} color="#2563eb" /> Chi Tiết Vận Đơn Vận
                  Chuyển
                </h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setShowShippingDetailModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                <div className="shipping-detail-card">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: "15px",
                        fontWeight: "700",
                        color: "#2563eb",
                      }}
                    >
                      {selectedShippingDetail.trackingCode}
                    </span>
                    <span className="tag-badge green">
                      {selectedShippingDetail.batchId}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#1e293b",
                    }}
                  >
                    {selectedShippingDetail.batchTitle}
                  </div>
                </div>

                <div className="detail-info-grid">
                  <div className="detail-item">
                    <span className="detail-label">Đơn vị vận tải:</span>
                    <span className="detail-value">
                      {selectedShippingDetail.transporter}
                    </span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Khối lượng hàng:</span>
                    <span className="detail-value">
                      {selectedShippingDetail.weight}
                    </span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Tài xế phụ trách:</span>
                    <span className="detail-value">
                      {selectedShippingDetail.driver}
                    </span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Biển số phương tiện:</span>
                    <span className="detail-value">
                      {selectedShippingDetail.plateNumber}
                    </span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Thời gian xuất xưởng:</span>
                    <span className="detail-value">
                      {selectedShippingDetail.handoverTime}
                    </span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Dự kiến giao hàng:</span>
                    <span className="detail-value">
                      {selectedShippingDetail.estimatedDelivery}
                    </span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Môi trường bảo quản:</span>
                    <span className="detail-value">
                      {selectedShippingDetail.temperature}
                    </span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Mã kẹp chì / Seal:</span>
                    <span
                      className="detail-value"
                      style={{ fontFamily: "monospace", color: "#059669" }}
                    >
                      {selectedShippingDetail.sealNumber}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    borderTop: "1px dashed #e2e8f0",
                    paddingTop: "12px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                  }}
                >
                  <MapPin
                    size={16}
                    color="#dc2626"
                    style={{ marginTop: "2px" }}
                  />
                  <div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      Địa điểm kho đến / Nhận hàng:
                    </div>
                    <div
                      style={{
                        fontSize: "13.5px",
                        fontWeight: "600",
                        color: "#1e293b",
                      }}
                    >
                      {selectedShippingDetail.destWarehouse}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn-cancel"
                  onClick={() => setShowShippingDetailModal(false)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL: TẠO LÔ SƠ CHẾ ================= */}
        {showCreateModal && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h3>
                  <PlusCircle size={18} color="#2e8b57" /> Tạo Lô Sơ Chế Mới
                </h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setShowCreateModal(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Chọn Lô Thu Hoạch Tiếp Nhận (*)</label>
                  <select>
                    {incomingBatches
                      .filter((b) => b.statusCode === "DA_TIEP_NHAN")
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.id} - {b.name} ({b.actualWeight || b.weight})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tên Gọi Lô Sơ Chế (*)</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Quýt Đường tuyển chọn size VIP"
                  />
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Khối Lượng Đưa Vào (kg)</label>
                    <input type="number" defaultValue={1000} />
                  </div>
                  <div className="form-group">
                    <label>Khu Vực Sơ Chế</label>
                    <select>
                      <option>Dây chuyền rửa Ozon A</option>
                      <option>Khu đóng thùng lạnh B</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Quy Cách & Tiêu Chuẩn</label>
                  <textarea
                    rows={3}
                    placeholder="Phân loại kích thước > 250g, khử khuẩn ozon..."
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn-cancel"
                  onClick={() => setShowCreateModal(false)}
                >
                  Hủy
                </button>
                <button
                  className="btn-save"
                  onClick={() => {
                    alert("Đã tạo lô sơ chế thành công!");
                    setShowCreateModal(false);
                  }}
                >
                  Xác Nhận Tạo Lô
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL: CẬP NHẬT TRẠNG THÁI SƠ CHẾ ================= */}
        {showStatusModal && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h3>
                  <Check size={18} color="#2e8b57" /> Cập Nhật Trạng Thái
                </h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setShowStatusModal(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <p style={{ color: "#4b5563", marginBottom: "12px" }}>
                  Đang cập nhật cho mã lô:{" "}
                  <strong style={{ color: "#2e8b57" }}>
                    {selectedBatchId}
                  </strong>
                </p>
                <div className="form-group">
                  <label>Giai Đoạn Sơ Chế</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    <option value="Đang rửa sạch & diệt khuẩn">
                      Đang rửa sạch & diệt khuẩn bằng Ozon
                    </option>
                    <option value="Đang phân loại theo kích thước/độ ngọt">
                      Đang phân loại theo kích thước & độ ngọt
                    </option>
                    <option value="Đang bọc màng co & đóng gói thành phẩm">
                      Đang bọc màng co & đóng gói thùng
                    </option>
                    <option value="Đã đóng gói hoàn tất">
                      Đã đóng gói hoàn tất - Sẵn sàng xuất kho
                    </option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn-cancel"
                  onClick={() => setShowStatusModal(false)}
                >
                  Đóng
                </button>
                <button
                  className="btn-save"
                  onClick={() => {
                    setProcessingBatches((prev) =>
                      prev.map((item) =>
                        item.id === selectedBatchId
                          ? { ...item, status: newStatus }
                          : item,
                      ),
                    );
                    setShowStatusModal(false);
                    alert("Cập nhật trạng thái thành công!");
                  }}
                >
                  Cập Nhật Lên Chuỗi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL: TÁCH LÔ ================= */}
        {showSplitModal && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h3>
                  <Split size={18} color="#2e8b57" /> Tách Lô Hàng Sơ Chế
                </h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setShowSplitModal(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Chọn Lô Gốc Cần Tách</label>
                  <select>
                    <option>
                      #SC-2026-001 - Quýt Đường (1,200 kg còn lại)
                    </option>
                  </select>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Lô con 1 (kg):</label>
                    <input type="number" defaultValue={700} />
                  </div>
                  <div className="form-group">
                    <label>Phẩm cấp:</label>
                    <input type="text" defaultValue="Loại 1 Xuất Khẩu" />
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Lô con 2 (kg):</label>
                    <input type="number" defaultValue={500} />
                  </div>
                  <div className="form-group">
                    <label>Phẩm cấp:</label>
                    <input type="text" defaultValue="Loại 2 Nội Địa" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn-cancel"
                  onClick={() => setShowSplitModal(false)}
                >
                  Hủy
                </button>
                <button
                  className="btn-save"
                  onClick={() => {
                    alert("Đã tách lô thành công!");
                    setShowSplitModal(false);
                  }}
                >
                  Tách Lô Ngay
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL: GỘP LÔ ================= */}
        {showMergeModal && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h3>
                  <Combine size={18} color="#2e8b57" /> Gộp Các Lô Nông Sản
                </h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setShowMergeModal(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Mã Lô Gộp Dự Kiến</label>
                  <input
                    type="text"
                    readOnly
                    value="#SC-GOP-2026-X1 (Tổng: 1,100 kg)"
                    style={{
                      backgroundColor: "#f3f4f6",
                      fontWeight: "700",
                      color: "#065f46",
                    }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn-cancel"
                  onClick={() => setShowMergeModal(false)}
                >
                  Hủy
                </button>
                <button
                  className="btn-save"
                  onClick={() => {
                    alert("Đã gộp lô thành công!");
                    setShowMergeModal(false);
                  }}
                >
                  Tạo Lô Gộp
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessingPage;
