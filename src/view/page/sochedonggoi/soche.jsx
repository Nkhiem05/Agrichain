import React, { useState } from "react";
import {
  ArrowRightLeft,
  Package,
  Layers,
  Search,
  Check,
  CheckCheck,
  PlusCircle,
  Edit3,
  FileCog,
  Trash2,
  MoreVertical,
  QrCode,
  GitFork,
  Plus,
  Split,
  Combine,
  Truck,
  Box,
  X,
} from "lucide-react";
import "../../css/soche.css";

const DEFAULT_LOGO_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png";

const ProcessingPage = () => {
  // 1. Quản lý Tab chính (đồng bộ chuẩn sidebar nông dân)
  const [activeTab, setActiveTab] = useState("processing");

  // 2. State danh sách lô sơ chế & đóng gói
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

  // 3. State điều khiển Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);

  // 4. State phục vụ cập nhật trạng thái
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [newStatus, setNewStatus] = useState("Đang rửa sạch & diệt khuẩn");

  // 5. Thao tác tiếp nhận lô
  const handleConfirmReception = (id) => {
    alert(
      `Đã xác nhận tiếp nhận lô thu hoạch ${id} từ nhà vườn vào kho sơ chế.`,
    );
    setActiveTab("processing");
  };

  // 6. Xóa lô sơ chế
  const handleDeleteBatch = (id) => {
    if (
      window.confirm(
        `Bạn có chắc chắn muốn xóa dữ liệu lô sơ chế ${id}? Hành động này sẽ được ghi nhận vào nhật ký kiểm toán.`,
      )
    ) {
      setProcessingBatches((prev) => prev.filter((item) => item.id !== id));
      alert(`Đã xóa lô ${id} thành công.`);
    }
  };

  // 7. Cập nhật trạng thái
  const handleOpenStatusModal = (batchId, curStatus) => {
    setSelectedBatchId(batchId);
    setNewStatus(curStatus);
    setShowStatusModal(true);
  };

  const handleSaveStatus = () => {
    setProcessingBatches((prev) =>
      prev.map((item) =>
        item.id === selectedBatchId ? { ...item, status: newStatus } : item,
      ),
    );
    setShowStatusModal(false);
    alert(
      `Đã cập nhật trạng thái lô ${selectedBatchId} thành: "${newStatus}"!`,
    );
  };

  return (
    <div className="soche-dashboard">
      {/* ================= HEADER (ĐỒNG BỘ NÔNG DÂN) ================= */}
      <header className="dashboard-header">
        <div className="header-left">
          <img src={DEFAULT_LOGO_IMG} alt="Logo" className="header-logo-icon" />
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
        {/* ================= SIDEBAR (ĐỒNG BỘ NÔNG DÂN) ================= */}
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
          {/* TAB 1: TIẾP NHẬN LÔ NÔNG SẢN */}
          {activeTab === "reception" && (
            <div>
              <div className="metrics-row">
                <div className="metric-card">
                  <div className="metric-title">
                    Lô thu hoạch đang chuyển đến
                  </div>
                  <div className="metric-number">
                    3<span className="metric-unit">LÔ HÀNG</span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-title">Tổng lượng chờ nhập kho</div>
                  <div className="metric-number">
                    4,250<span className="metric-unit">KG</span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-title">Đã tiếp nhận trong tuần</div>
                  <div className="metric-number">
                    18<span className="metric-unit">PHIẾU</span>
                  </div>
                </div>

                <div className="actions-box">
                  <select className="filter-select">
                    <option>-- Tất cả nông trại --</option>
                    <option>Nông trại Vườn Cam A1</option>
                    <option>Hợp tác xã Bưởi Năm Roi Bình Minh</option>
                  </select>
                  <button
                    className="btn-primary-action"
                    onClick={() => alert("Khởi động Camera quét mã QR...")}
                  >
                    <QrCode size={16} /> Quét mã nhận lô
                  </button>
                </div>
              </div>

              {/* Danh sách lô chờ nhập */}
              <div className="card-item">
                <div className="card-icon-box amber">
                  <Truck size={28} />
                </div>
                <div className="card-body">
                  <div className="card-header-line">
                    <h3 className="card-title">
                      Quýt Đường Trà Vinh (Lô thu hoạch)
                    </h3>
                    <span className="tag-badge gray">#LH-8824</span>
                    <span className="tag-badge green">
                      Vườn Cam A1 (#FARM-01111)
                    </span>
                  </div>
                  <div className="card-meta-row">
                    <span>
                      Thời gian xuất vườn: <strong>30/09/2026 - 06:30</strong>
                    </span>
                    <span>
                      Khối lượng: <strong>1,500 kg</strong>
                    </span>
                    <span>
                      Người giao: <strong>Trần Văn Cảnh (64A-092.11)</strong>
                    </span>
                  </div>
                  <div className="card-desc">
                    <strong>Thông tin đính kèm:</strong> Đã kiểm nghiệm nitrate
                    an toàn, độ ngọt 11-12 Brix.
                  </div>
                  <span className="badge-status-line warning">
                    Chờ kiểm đếm và xác nhận nhập kho
                  </span>
                </div>
                <div className="card-actions">
                  <button
                    className="btn-action-outline"
                    onClick={() => handleConfirmReception("LH-8824")}
                  >
                    <Check size={16} /> Tiếp nhận lô
                  </button>
                  <button className="btn-icon danger" title="Từ chối">
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="card-item">
                <div className="card-icon-box green">
                  <CheckCheck size={28} />
                </div>
                <div className="card-body">
                  <div className="card-header-line">
                    <h3 className="card-title">
                      Cam Sành VietGAP (Đã nhập kho đệm)
                    </h3>
                    <span className="tag-badge gray">#LH-8821</span>
                    <span className="tag-badge green">
                      Vườn Quýt B2 (#FARM-01120)
                    </span>
                  </div>
                  <div className="card-meta-row">
                    <span>
                      Thời gian tiếp nhận: <strong>29/09/2026 - 15:45</strong>
                    </span>
                    <span>
                      Khối lượng: <strong>2,000 kg</strong>
                    </span>
                    <span>
                      Trạng thái:{" "}
                      <strong style={{ color: "#16a34a" }}>
                        Đã lưu kho đệm
                      </strong>
                    </span>
                  </div>
                  <span className="badge-status-line success">
                    Sẵn sàng chuyển sang tạo lô sơ chế
                  </span>
                </div>
                <div className="card-actions">
                  <button
                    className="btn-action-outline"
                    onClick={() => {
                      setActiveTab("processing");
                      setShowCreateModal(true);
                    }}
                  >
                    <PlusCircle size={16} /> Tạo lô sơ chế từ lô này
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: QUẢN LÝ SƠ CHẾ & ĐÓNG GÓI */}
          {activeTab === "processing" && (
            <div>
              <div className="metrics-row">
                <div className="metric-card">
                  <div className="metric-title">Lô đang sơ chế</div>
                  <div className="metric-number">
                    {processingBatches.length}
                    <span className="metric-unit">LÔ ĐANG CHẠY</span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-title">Tiến độ xưởng sơ chế</div>
                  <div className="metric-number">
                    2/3<span className="metric-unit">DÂY CHUYỀN</span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-title">Đóng gói sẵn sàng xuất kho</div>
                  <div className="metric-number">
                    1<span className="metric-unit">LÔ HOÀN TẤT</span>
                  </div>
                </div>

                <div className="actions-box">
                  <select className="filter-select">
                    <option>-- Tất cả xưởng chế biến --</option>
                    <option>Xưởng phân loại A</option>
                    <option>Khu đóng thùng lạnh</option>
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

              {/* Danh sách các lô sơ chế */}
              {processingBatches.map((b) => (
                <div className="card-item" key={b.id}>
                  <div
                    className={`card-icon-box ${b.iconType === "box" ? "amber" : "green"}`}
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
                        Quy cách / Thửa: <strong>{b.lot}</strong>
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
                            color: b.status.includes("hoàn tất")
                              ? "#16a34a"
                              : "#2563eb",
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
                      Dự kiến hoàn tất: {b.estDate}
                    </span>
                  </div>

                  <div className="card-actions">
                    <button
                      className="btn-action-outline"
                      onClick={() => handleOpenStatusModal(b.id, b.status)}
                    >
                      <Edit3 size={15} /> Cập nhật
                    </button>
                    <button className="btn-icon" title="Sửa lô">
                      <FileCog size={16} />
                    </button>
                    <button
                      className="btn-icon danger"
                      title="Xóa lô"
                      onClick={() => handleDeleteBatch(b.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      className="btn-icon"
                      title="Tách lô này"
                      onClick={() => setShowSplitModal(true)}
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: QUẢN LÝ TÁCH / GỘP LÔ */}
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
                    Phân loại kích cỡ phẩm cấp (Tách lô) hoặc gom đơn hàng xuất
                    khẩu (Gộp lô).
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

              {/* Bảng nhật ký Tách / Gộp */}
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
                        <span style={{ fontWeight: "700", fontSize: "14px" }}>
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
                        Từ: <b>#LH-8809 (450kg)</b> và <b>#LH-8812 (350kg)</b> →
                        Tổng:{" "}
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

                <div className="log-item">
                  <div className="log-left">
                    <div className="log-icon orange">
                      <Split size={20} />
                    </div>
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span style={{ fontWeight: "700", fontSize: "14px" }}>
                          Tách từ Lô gốc #LH-8819
                        </span>
                        <span className="tag-badge gray">Tách 2 lô con</span>
                      </div>
                      <p
                        style={{
                          fontSize: "12px",
                          color: "#6b7280",
                          marginTop: "4px",
                        }}
                      >
                        Lô gốc (1,500kg) → <b>#SC-L1 (Loại 1: 1,000kg)</b> +{" "}
                        <b>#SC-L2 (Loại 2: 500kg)</b>
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: "12px" }}>
                    <span style={{ color: "#9ca3af", display: "block" }}>
                      25/09/2026 - 14:30
                    </span>
                    <span style={{ color: "#16a34a", fontWeight: "600" }}>
                      Thành công (Tx: 0x4f1...87c)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ================= MODAL 1: TẠO LÔ SƠ CHẾ MỚI ================= */}
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
                  <option>#LH-8821 - Cam Sành VietGAP (2,000 kg)</option>
                  <option>#LH-8824 - Quýt Đường Trà Vinh (1,500 kg)</option>
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

      {/* ================= MODAL 2: CẬP NHẬT TRẠNG THÁI ================= */}
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
                <strong style={{ color: "#2e8b57" }}>{selectedBatchId}</strong>
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
              <div className="form-group">
                <label>Ghi chú kiểm tra chất lượng (KCS)</label>
                <input
                  type="text"
                  placeholder="Độ hao hụt 2%, quả đều đẹp..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowStatusModal(false)}
              >
                Đóng
              </button>
              <button className="btn-save" onClick={handleSaveStatus}>
                Cập Nhật Lên Chuỗi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: TÁCH LÔ ================= */}
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
                  <option>#SC-2026-001 - Quýt Đường (1,200 kg còn lại)</option>
                </select>
              </div>
              <div
                style={{
                  backgroundColor: "#f9fafb",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                }}
              >
                <p style={{ fontWeight: "700", marginBottom: "8px" }}>
                  Quy định tách lô con:
                </p>
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
                  alert("Đã tách thành công thành 2 mã lô con mới!");
                  setShowSplitModal(false);
                }}
              >
                Tách Lô Ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: GỘP LÔ ================= */}
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
              <p style={{ color: "#4b5563", marginBottom: "8px" }}>
                Chọn ít nhất 2 lô cùng loại sản phẩm để gom thành 1 chuyến hàng:
              </p>
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  marginBottom: "14px",
                }}
              >
                <label
                  style={{ display: "flex", gap: "8px", cursor: "pointer" }}
                >
                  <input type="checkbox" defaultChecked />
                  <span>
                    <b>#LH-8821</b> Cam Sành (500 kg - Vườn A1)
                  </span>
                </label>
                <label
                  style={{ display: "flex", gap: "8px", cursor: "pointer" }}
                >
                  <input type="checkbox" defaultChecked />
                  <span>
                    <b>#LH-8825</b> Cam Sành (600 kg - Vườn A2)
                  </span>
                </label>
              </div>
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
                  alert("Đã gộp lô thành công trên Smart Contract!");
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
  );
};

export default ProcessingPage;
