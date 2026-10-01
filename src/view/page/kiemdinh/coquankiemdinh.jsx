import React, { useState } from "react";
import {
  Search,
  ClipboardList,
  CalendarClock,
  Award,
  ShieldAlert,
  ChevronDown,
  Filter,
  FileText,
  CalendarPlus,
  XCircle,
  QrCode,
  TestTube2,
  FileCheck2,
  BadgeCheck,
  Download,
  AlertTriangle,
  X,
  CalendarCheck,
  ClipboardCheck,
  PlusCircle,
  Check,
  Trash2,
} from "lucide-react";
import "../../css/coquankiemdinh.css";
import { useNavigate } from "react-router-dom";

function Coquankiemdinh() {
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState("requests");

  // Hàm chuyển trang xem chi tiết kết quả kiểm định
  const handlechitietkiemdinh = (e) => {
    e.preventDefault();
    navigate("/chi-tiet-kiem-dinh");
  };
  // Modals state
  const [modalAcceptOpen, setModalAcceptOpen] = useState(false);
  const [modalSamplingOpen, setModalSamplingOpen] = useState(false);
  const [modalPublishOpen, setModalPublishOpen] = useState(false);

  // Modal Accept Data
  const [acceptData, setAcceptData] = useState({ code: "", farm: "" });

  // Modal Sampling Data
  const [samplingData, setSamplingData] = useState({
    requestCode: "",
    batchCode: "",
    farmName: "",
  });

  // Modal Publish Dynamic Indicators
  const [customIndicators, setCustomIndicators] = useState([]);

  // Actions
  const handleOpenAcceptModal = (code, farm) => {
    setAcceptData({ code, farm });
    setModalAcceptOpen(true);
  };

  const handleConfirmScheduleSampling = () => {
    alert(
      "Đã chấp thuận yêu cầu và gửi thông báo lịch hẹn lấy mẫu đến nông dân thành công!",
    );
    setModalAcceptOpen(false);
    setCurrentTab("sampling");
  };

  const handleOpenSamplingModal = (requestCode, batchCode, farmName) => {
    setSamplingData({ requestCode, batchCode, farmName });
    setModalSamplingOpen(true);
  };

  const handleOpenPublishModal = () => {
    setModalPublishOpen(true);
  };

  const handleAddCustomIndicator = () => {
    setCustomIndicators((prev) => [...prev, { name: "", val: "" }]);
  };

  const handleCustomIndicatorChange = (index, field, value) => {
    setCustomIndicators((prev) => {
      const next = [...prev];
      next[index][field] = value;
      return next;
    });
  };

  const handleRemoveCustomIndicator = (index) => {
    setCustomIndicators((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handlePublishToBlockchain = () => {
    alert(
      "Đã công bố chứng nhận VietGAP lên AgriChain Mainnet thành công! Người tiêu dùng có thể quét QR để xem kết quả kiểm nghiệm.",
    );
    setModalPublishOpen(false);
    setCurrentTab("results");
  };

  const handleRejectRequest = (code) => {
    if (
      window.confirm(`Bạn có chắc chắn muốn từ chối tiếp nhận hồ sơ ${code}?`)
    ) {
      alert("Đã gửi lý do từ chối về tài khoản Nông dân.");
    }
  };

  return (
    <div className="cert-container">
      {/* 1. HEADER */}
      <header className="cert-header">
        <div className="brand-wrapper">
          <div className="brand-logo-circle">
            <div className="brand-logo-dot"></div>
          </div>
          <span className="brand-name">AGRICHAIN</span>
        </div>

        {/* Search */}
        <div className="search-box-wrapper">
          <input
            type="text"
            placeholder="Tìm mã hồ sơ, mã lô nông dân yêu cầu..."
            className="search-input"
          />
          <Search className="search-icon" size={16} />
        </div>

        {/* User Actor */}
        <div className="user-actor-wrapper">
          <div className="avatar-badge">KD</div>
          <div className="actor-info">
            <p className="actor-title">
              Trung Tâm Giám Định Nông Nghiệp Vùng 2
            </p>
            <p className="actor-sub">Cơ quan kiểm định &amp; Chứng nhận</p>
          </div>
        </div>
      </header>

      {/* BODY WRAPPER */}
      <div className="cert-body">
        {/* 2. SIDEBAR */}
        <aside className="cert-sidebar">
          <div>
            <div className="sidebar-title">Chức năng kiểm định</div>
            <nav className="sidebar-nav">
              <button
                type="button"
                onClick={() => setCurrentTab("requests")}
                className={`nav-item-btn ${
                  currentTab === "requests" ? "active" : ""
                }`}
              >
                <ClipboardList size={20} />
                <span>Yêu cầu kiểm định</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentTab("sampling")}
                className={`nav-item-btn ${
                  currentTab === "sampling" ? "active" : ""
                }`}
              >
                <CalendarClock size={20} />
                <span>Lịch hẹn &amp; Lấy mẫu</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentTab("results")}
                className={`nav-item-btn ${
                  currentTab === "results" ? "active" : ""
                }`}
              >
                <Award size={20} />
                <span>Công bố chứng nhận</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentTab("violations")}
                className={`nav-item-btn ${
                  currentTab === "violations" ? "active" : ""
                }`}
              >
                <ShieldAlert size={20} />
                <span>Cảnh báo &amp; Thu hồi</span>
              </button>
            </nav>
          </div>

          <div className="sidebar-footer">
            <span className="pulse-dot"></span>
            <span>
              Node kiểm định: <b>Cert-Authority-VN</b>
            </span>
          </div>
        </aside>

        {/* 3. MAIN CONTENT AREA */}
        <div className="cert-content-area no-scrollbar">
          {/* TAB 1: YÊU CẦU KIỂM ĐỊNH */}
          {currentTab === "requests" && (
            <main className="view-panel">
              <div className="metrics-grid">
                <div className="metric-card">
                  <span className="metric-label">Yêu cầu mới chờ duyệt</span>
                  <p className="metric-val">
                    4 <span className="metric-unit">HỒ SƠ MỚI</span>
                  </p>
                </div>

                <div className="metric-card">
                  <span className="metric-label">Đã lên lịch khảo sát</span>
                  <p className="metric-val">
                    3 <span className="metric-unit">ĐỢT LẤY MẪU</span>
                  </p>
                </div>

                <div className="metric-card">
                  <span className="metric-label">
                    Đã cấp chứng nhận tháng này
                  </span>
                  <p className="metric-val">
                    24 <span className="metric-unit">LÔ ĐẠT CHUẨN</span>
                  </p>
                </div>

                <div className="filter-actions">
                  <div className="custom-select-box">
                    <select className="select-control" defaultValue="">
                      <option value="">-- Tiêu chuẩn đăng ký --</option>
                      <option value="vietgap">VietGAP Trồng trọt</option>
                      <option value="globalgap">GlobalGAP</option>
                      <option value="organic">
                        Organic Nông nghiệp hữu cơ
                      </option>
                    </select>
                    <ChevronDown size={16} className="select-arrow-icon" />
                  </div>
                  <button type="button" className="btn-filter-urgent">
                    <Filter size={14} />
                    <span>Lọc hồ sơ khẩn cấp</span>
                  </button>
                </div>
              </div>

              <div className="card-stack">
                <div className="item-card">
                  <div className="card-left-group">
                    <div className="card-icon-bubble icon-blue">
                      <FileText size={32} />
                    </div>

                    <div className="card-content-stack">
                      <div className="card-header-line">
                        <h3 className="card-title">
                          Quýt Đường Trà Vinh - Yêu cầu cấp tem VietGAP
                        </h3>
                        <span className="pill-gray">#HS-KD-9041</span>
                        <span className="pill-green-soft">
                          Vườn cam A1 (#FARM-01111)
                        </span>
                      </div>

                      <div className="card-meta-wrap">
                        <p>
                          Chủ nông trại:{" "}
                          <span className="text-meta-regular">
                            Nguyễn Văn A (0918.xxx.xxx)
                          </span>
                        </p>
                        <p>
                          Mã lô thu hoạch:{" "}
                          <span className="text-meta-green">
                            #LH-8824 (1,500 kg)
                          </span>
                        </p>
                        <p>
                          Ngày nộp yêu cầu:{" "}
                          <span className="text-meta-regular">
                            30/09/2026 - 08:30
                          </span>
                        </p>
                        <p>
                          Địa chỉ vườn:{" "}
                          <span className="text-meta-regular">
                            Thửa A1-1, Ấp Bình Hòa, Trà Vinh
                          </span>
                        </p>
                      </div>

                      <div className="card-desc-box">
                        <p style={{ fontWeight: 600, color: "#374151" }}>
                          Nội dung đề nghị:
                        </p>
                        <p>
                          Lô đã thu hoạch xong và trữ tạm, nông dân yêu cầu cơ
                          quan đến lấy mẫu quả kiểm nghiệm dư lượng BVTV (Decis,
                          NPK) để hoàn thiện hồ sơ xuất khẩu vào chuỗi siêu thị.
                        </p>
                      </div>

                      <div style={{ paddingTop: "4px" }}>
                        <span className="status-badge-amber">
                          Trạng thái: Chờ cơ quan chấp thuận &amp; hẹn ngày lấy
                          mẫu
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="card-actions-col">
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenAcceptModal(
                          "#HS-KD-9041",
                          "Vườn cam A1 (#FARM-01111)",
                        )
                      }
                      className="btn-primary"
                    >
                      <CalendarPlus size={16} />
                      <span>Chấp thuận &amp; Hẹn ngày lấy mẫu</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectRequest("#HS-KD-9041")}
                      className="btn-reject"
                    >
                      <XCircle size={16} />
                      <span>Từ chối hồ sơ</span>
                    </button>
                  </div>
                </div>
              </div>
            </main>
          )}

          {/* TAB 2: LỊCH HẸN & LẤY MẪU */}
          {currentTab === "sampling" && (
            <main className="view-panel">
              <div className="tab-banner-box">
                <h2>Tiến Độ Khảo Sát &amp; Lấy Mẫu Tại Vườn</h2>
                <p>
                  Cập nhật biên bản niêm phong khi kiểm định viên lấy mẫu tại
                  vườn hoặc nhập chỉ số công bố khi có kết quả phòng Lab.
                </p>
              </div>

              <div className="card-stack">
                {/* Đã lên lịch */}
                <div className="item-card">
                  <div className="card-left-group">
                    <div className="card-icon-bubble icon-amber">
                      <CalendarClock size={32} />
                    </div>

                    <div className="card-content-stack">
                      <div className="card-header-line">
                        <h3 className="card-title">
                          Quýt Đường Trà Vinh - Lô #LH-8824
                        </h3>
                        <span className="pill-gray">#HS-KD-9041</span>
                        <span className="pill-green-soft">
                          Vườn cam A1 (#FARM-01111)
                        </span>
                      </div>

                      <div className="card-meta-wrap">
                        <p>
                          Lịch hẹn lấy mẫu:{" "}
                          <span className="text-meta-blue">
                            02/10/2026 (08:30 Sáng)
                          </span>
                        </p>
                        <p>
                          Kiểm định viên:{" "}
                          <span className="text-meta-regular">
                            KS. Trần Minh Tuấn
                          </span>
                        </p>
                        <p>
                          Địa điểm:{" "}
                          <span className="text-meta-regular">
                            Ấp Bình Hòa, Trà Vinh
                          </span>
                        </p>
                      </div>

                      <div style={{ paddingTop: "4px" }}>
                        <span className="status-badge-border-amber">
                          Đã lên lịch - Chờ kiểm định viên đến vườn lấy mẫu
                          &amp; niêm phong
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="card-actions-row">
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenSamplingModal(
                          "#HS-KD-9041",
                          "#LH-8824",
                          "Vườn cam A1 (#FARM-01111)",
                        )
                      }
                      className="btn-primary"
                    >
                      <QrCode size={16} />
                      <span>Cập nhật lấy mẫu &amp; Niêm phong</span>
                    </button>
                  </div>
                </div>

                {/* Trong phòng Lab */}
                <div className="item-card">
                  <div className="card-left-group">
                    <div className="card-icon-bubble icon-purple">
                      <TestTube2 size={32} />
                    </div>

                    <div className="card-content-stack">
                      <div className="card-header-line">
                        <h3 className="card-title">
                          Mẫu Quýt Đường #MAU-2026-08 (Lô #LH-8821)
                        </h3>
                        <span className="pill-gray">#HS-KD-9038</span>
                        <span className="pill-green-soft">
                          HTX Bưởi &amp; Cam Bình Minh
                        </span>
                      </div>

                      <div className="card-meta-wrap">
                        <p>
                          Ngày lấy mẫu:{" "}
                          <span className="text-meta-regular">29/09/2026</span>
                        </p>
                        <p>
                          Khối lượng:{" "}
                          <span className="text-meta-purple">
                            3.5 kg (12 quả ngẫu nhiên)
                          </span>
                        </p>
                        <p>
                          Mã niêm phong:{" "}
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontWeight: 700,
                              color: "#111827",
                            }}
                          >
                            SEAL-QR-77192
                          </span>
                        </p>
                        <p>
                          Tình trạng:{" "}
                          <span style={{ fontWeight: 600, color: "#d97706" }}>
                            Đã xong sắc ký - Chờ duyệt công bố
                          </span>
                        </p>
                      </div>

                      <div style={{ paddingTop: "4px" }}>
                        <span className="status-badge-purple">
                          Đã có phiếu kết quả xét nghiệm Lab
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="card-actions-row">
                    <button
                      type="button"
                      onClick={handleOpenPublishModal}
                      className="btn-primary"
                    >
                      <FileCheck2 size={16} />
                      <span>Nhập chỉ số &amp; Công bố</span>
                    </button>
                  </div>
                </div>
              </div>
            </main>
          )}

          {/* TAB 3: CÔNG BỐ KẾT QUẢ */}
          {currentTab === "results" && (
            <main className="view-panel">
              <div className="tab-banner-box">
                <h2>Danh Sách Lô Hàng Đã Công Bố Chứng Nhận</h2>
                <p>
                  Kết quả được ký số điện tử và băm trực tiếp lên Blockchain để
                  người tiêu dùng quét QR kiểm chứng.
                </p>
              </div>

              <div className="card-stack">
                <div className="item-card" onClick={handlechitietkiemdinh}>
                  <div className="card-left-group">
                    <div className="card-icon-bubble icon-emerald">
                      <BadgeCheck size={32} />
                    </div>

                    <div className="card-content-stack">
                      <div className="card-header-line">
                        <h3 className="card-title">
                          Quýt Đường Đạt Chuẩn VietGAP Trồng Trọt
                        </h3>
                        <span className="pill-cert-pass">ĐẠT CHUẨN</span>
                        <span className="pill-blue-cert">
                          Số CN: VG-2026-8812
                        </span>
                      </div>

                      <div className="card-meta-wrap">
                        <p>
                          Lô được cấp:{" "}
                          <span className="text-meta-green">#LH-8821</span>
                        </p>
                        <p>
                          Độ ngọt:{" "}
                          <span className="text-meta-regular">11.8 Brix</span>
                        </p>
                        <p>
                          Dư lượng hóa chất:{" "}
                          <span className="text-meta-green">
                            Không phát hiện (Dưới ngưỡng đo 0.01 mg/kg)
                          </span>
                        </p>
                        <p>
                          Hiệu lực:{" "}
                          <span className="text-meta-regular">
                            30/09/2026 - 30/09/2027
                          </span>
                        </p>
                      </div>

                      <div className="contract-hash">
                        Smart Contract Hash: 0x7c49f821...a381e9b2 (Đã xác thực
                        lên AgriChain)
                      </div>
                    </div>
                  </div>

                  <div className="card-actions-row">
                    <button
                      type="button"
                      onClick={() =>
                        alert(
                          "Đang tải giấy chứng nhận điện tử định dạng PDF có mã QR...",
                        )
                      }
                      className="btn-light"
                    >
                      <Download size={16} />
                      <span>Tải Chứng Thư</span>
                    </button>
                  </div>
                </div>
              </div>
            </main>
          )}

          {/* TAB 4: CẢNH BÁO & THU HỒI */}
          {currentTab === "violations" && (
            <main className="view-panel">
              <div className="alert-box-warning">
                <AlertTriangle
                  size={20}
                  style={{ flexShrink: 0, marginTop: "2px" }}
                />
                <div className="alert-box-text">
                  <h4>Quyền Hạn Đình Chỉ &amp; Thu Hồi Mã Chứng Nhận</h4>
                  <p>
                    Trường hợp kiểm tra đột xuất tại xưởng đóng gói hoặc phản
                    ánh từ người tiêu dùng phát hiện tồn dư vượt ngưỡng, cơ quan
                    kiểm định có quyền kích hoạt lệnh thu hồi ngay lập tức để vô
                    hiệu hóa mã QR truy xuất.
                  </p>
                </div>
              </div>

              <div className="violations-table-container">
                <div className="violations-table-header">
                  <span>Danh Sách Lô Hàng Bị Đình Chỉ / Không Đạt Chuẩn</span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 400,
                      color: "#dc2626",
                    }}
                  >
                    Đã cập nhật lên cổng thông tin an toàn thực phẩm
                  </span>
                </div>

                <div>
                  <div
                    className="violations-row"
                    onClick={handlechitietkiemdinh}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                      }}
                    >
                      <div className="violation-avatar">
                        <X size={20} />
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
                              fontWeight: 700,
                              fontSize: "14px",
                              color: "#1f2937",
                            }}
                          >
                            Lô Cam Sành #LH-8799
                          </span>
                          <span
                            style={{
                              backgroundColor: "#fee2e2",
                              color: "#991b1b",
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontSize: "10px",
                            }}
                          >
                            THU HỒI CHỨNG NHẬN
                          </span>
                        </div>
                        <p style={{ color: "#6b7280", marginTop: "2px" }}>
                          Lý do: Phát hiện tồn dư thuốc bảo vệ thực vật hoạt
                          chất Chlorpyrifos vượt 1.5 lần mức cho phép.
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          color: "#9ca3af",
                          display: "block",
                          fontSize: "11px",
                        }}
                      >
                        20/09/2026
                      </span>
                      <span style={{ color: "#dc2626", fontWeight: 600 }}>
                        Khóa truy xuất vĩnh viễn
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </main>
          )}
        </div>
      </div>

      {/* ============================================== */}
      {/* MODALS */}
      {/* ============================================== */}

      {/* MODAL 1: CHẤP THUẬN VÀ HẸN NGÀY LẤY MẪU */}
      {modalAcceptOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog modal-max-md">
            <div className="modal-header">
              <h3 className="modal-title">
                <CalendarCheck size={20} color="#059669" />
                Xác Nhận Hẹn Ngày Lấy Mẫu
              </h3>
              <button
                type="button"
                onClick={() => setModalAcceptOpen(false)}
                className="btn-close-modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ color: "#4b5563" }}>
                Hồ sơ kiểm định:{" "}
                <b style={{ color: "#047857" }}>
                  {acceptData.code} - {acceptData.farm}
                </b>
              </p>

              <div className="form-group">
                <label>Ngày Đến Vườn Lấy Mẫu (*)</label>
                <input
                  type="date"
                  defaultValue="2026-10-02"
                  className="form-control-input"
                />
              </div>

              <div className="form-group">
                <label>Giờ Khảo Sát Dự Kiến</label>
                <input
                  type="time"
                  defaultValue="08:30"
                  className="form-control-input"
                />
              </div>

              <div className="form-group">
                <label>Phân Công Kiểm Định Viên Phụ Trách</label>
                <select className="form-control-select">
                  <option>
                    KS. Trần Minh Tuấn (Phòng Giám định Trồng trọt)
                  </option>
                  <option>ThS. Lê Hoàng Yến (Chuyên viên vi sinh)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Ghi Chú Gửi Nông Dân Chuẩn Bị</label>
                <textarea
                  rows="2"
                  defaultValue="Giữ nguyên hiện trạng lô quả, xuất trình sổ nhật ký bón phân thuốc ngày lấy mẫu."
                  className="form-control-textarea"
                ></textarea>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setModalAcceptOpen(false)}
                className="btn-cancel"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmScheduleSampling}
                className="btn-primary"
              >
                Chấp Thuận &amp; Phát Lịch Hẹn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CẬP NHẬT BIÊN BẢN LẤY MẪU */}
      {modalSamplingOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog modal-max-lg">
            <div className="modal-header">
              <h3 className="modal-title">
                <ClipboardCheck size={20} color="#059669" />
                Cập Nhật Biên Bản Niêm Phong Mẫu
              </h3>
              <button
                type="button"
                onClick={() => setModalSamplingOpen(false)}
                className="btn-close-modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="inherited-info-card">
                <div>
                  Hồ sơ:{" "}
                  <b style={{ color: "#111827" }}>{samplingData.requestCode}</b>
                </div>
                <div>
                  Lô nông sản:{" "}
                  <b style={{ color: "#047857" }}>{samplingData.batchCode}</b>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  Đơn vị:{" "}
                  <b style={{ color: "#111827" }}>{samplingData.farmName}</b>
                </div>
              </div>

              <div className="grid-two-cols">
                <div className="form-group">
                  <label>Mã Túi Niêm Phong (Mã Seal QR) (*)</label>
                  <input
                    type="text"
                    defaultValue="SEAL-QR-9901"
                    placeholder="Nhập hoặc quét mã seal..."
                    className="form-control-input"
                    style={{ fontFamily: "monospace", fontWeight: 700 }}
                  />
                </div>
                <div className="form-group">
                  <label>Số Lượng / Khối Lượng Mẫu (*)</label>
                  <input
                    type="text"
                    defaultValue="3.0 kg (10 quả)"
                    placeholder="VD: 3.0 kg (10 quả)"
                    className="form-control-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Phương Pháp Lấy Mẫu Thực Địa</label>
                <select className="form-control-select">
                  <option>Lấy chéo góc 5 điểm ngẫu nhiên trên liếp vườn</option>
                  <option>Lấy ngẫu nhiên trên khay chứa tại kho đệm</option>
                </select>
              </div>

              <div className="form-group">
                <label>Tình Trạng Cảm Quan Tại Vườn</label>
                <input
                  type="text"
                  defaultValue="Quả căng mọng, không dập nát, bề mặt vỏ không nấm bệnh."
                  className="form-control-input"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setModalSamplingOpen(false)}
                className="btn-cancel"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  alert(
                    "Đã cập nhật biên bản lấy mẫu & niêm phong thành công! Mẫu đã sẵn sàng chuyển vào phòng Lab.",
                  );
                  setModalSamplingOpen(false);
                }}
                className="btn-primary"
              >
                Lưu &amp; Chuyển Về Phòng Lab
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: NHẬP CHỈ SỐ & CÔNG BỐ KẾT QUẢ */}
      {modalPublishOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog modal-max-xl">
            <div className="modal-header">
              <h3 className="modal-title">
                <Award size={20} color="#059669" />
                Công Bố Kết Quả Kiểm Nghiệm Lên Chuỗi
              </h3>
              <button
                type="button"
                onClick={() => setModalPublishOpen(false)}
                className="btn-close-modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body modal-scrollable-body">
              <div className="indicators-block">
                <div className="indicators-block-header">
                  <span
                    style={{
                      fontWeight: 700,
                      color: "#374151",
                      textTransform: "uppercase",
                      letterSpacing: "0.025em",
                    }}
                  >
                    Chỉ số xét nghiệm từ Phòng Thí Nghiệm
                  </span>
                  <button
                    type="button"
                    onClick={handleAddCustomIndicator}
                    className="btn-add-indicator"
                  >
                    <PlusCircle size={14} />
                    <span>Thêm chỉ số khác</span>
                  </button>
                </div>

                <div className="grid-two-cols">
                  <div className="form-group">
                    <span
                      style={{
                        color: "#6b7280",
                        fontWeight: 500,
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      Dư lượng BVTV (Hóa chất cấm):
                    </span>
                    <input
                      type="text"
                      defaultValue="Âm tính"
                      className="form-control-input"
                      style={{ fontWeight: 700, color: "#059669" }}
                    />
                  </div>
                  <div className="form-group">
                    <span
                      style={{
                        color: "#6b7280",
                        fontWeight: 500,
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      Kim loại nặng (Chì, Cadimi):
                    </span>
                    <input
                      type="text"
                      defaultValue="< 0.05 mg/kg (Đạt)"
                      className="form-control-input"
                    />
                  </div>
                  <div className="form-group">
                    <span
                      style={{
                        color: "#6b7280",
                        fontWeight: 500,
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      Vi sinh (E.coli, Salmonella):
                    </span>
                    <input
                      type="text"
                      defaultValue="Không phát hiện"
                      className="form-control-input"
                    />
                  </div>
                  <div className="form-group">
                    <span
                      style={{
                        color: "#6b7280",
                        fontWeight: 500,
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      Dư lượng Nitrate (NO3-):
                    </span>
                    <input
                      type="text"
                      defaultValue="0.02 mg/kg"
                      className="form-control-input"
                    />
                  </div>
                </div>

                {/* Danh sách các chỉ số thêm tùy chỉnh */}
                {customIndicators.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      paddingTop: "6px",
                      borderTop: "1px solid rgba(229, 231, 235, 0.8)",
                    }}
                  >
                    {customIndicators.map((item, index) => (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <input
                          type="text"
                          placeholder="Tên chỉ số (vd: Độ ngọt Brix, pH...)"
                          value={item.name}
                          onChange={(e) =>
                            handleCustomIndicatorChange(
                              index,
                              "name",
                              e.target.value,
                            )
                          }
                          className="form-control-input"
                        />
                        <input
                          type="text"
                          placeholder="Giá trị đo (vd: 12.5 Brix, 6.2...)"
                          value={item.val}
                          onChange={(e) =>
                            handleCustomIndicatorChange(
                              index,
                              "val",
                              e.target.value,
                            )
                          }
                          className="form-control-input"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomIndicator(index)}
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "#9ca3af",
                            padding: "6px",
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Kết Luận Đánh Giá (*)</label>
                <select
                  className="form-control-select"
                  style={{ fontWeight: 700, color: "#047857" }}
                >
                  <option>
                    ĐẠT CHUẨN VIETGAP TRỒNG TRỌT (Cấp tem chứng nhận)
                  </option>
                  <option>ĐẠT CHUẨN XUẤT KHẨU GLOBALGAP</option>
                  <option>ĐẠT CHUẨN NÔNG NGHIỆP HỮU CƠ (ORGANIC)</option>
                  <option>
                    KHÔNG ĐẠT (Phát hiện tồn dư vượt ngưỡng quy định)
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label>Mã Số Giấy Chứng Nhận Cấp Mới:</label>
                <input
                  type="text"
                  readOnly
                  defaultValue="VG-2026-9921"
                  className="form-control-input"
                  style={{
                    backgroundColor: "#f3f4f6",
                    fontFamily: "monospace",
                    fontWeight: 700,
                  }}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setModalPublishOpen(false)}
                className="btn-cancel"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handlePublishToBlockchain}
                className="btn-primary"
              >
                <Check size={16} />
                <span>Ký Số &amp; Công Bố Lên Chuỗi</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Coquankiemdinh;
