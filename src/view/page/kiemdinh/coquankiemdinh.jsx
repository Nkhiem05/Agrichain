import React, { useState, useEffect } from "react";
import {
  accepauthority,
  fetchSamplingListApi,
  updateSampleDetail,
  saveTestIndicators,
} from "../../../api/coquankiemdinhApi";
import {
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

const DEFAULT_LOGO_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png";

// Chuẩn hoá trạng thái để so sánh an toàn
const normalizeStatus = (s) =>
  String(s ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

// Các trạng thái được coi là "đã hẹn lịch, chưa lấy mẫu"
const SCHEDULED_STATUSES = ["DA_HEN_LICH", "DA_HEN", "CHO_LAY_MAU"];
// Các trạng thái được coi là "đã lấy mẫu / niêm phong"
const SAMPLED_STATUSES = [
  "DA_LAY_MAU",
  "DA_NIEM_PHONG",
  "DANG_XET_NGHIEM",
  "CHO_CONG_BO",
];
// Các trạng thái đã hoàn thành kiểm định
const COMPLETED_STATUSES = [
  "HOAN_THANH",
  "DA_KIEM_DINH",
  "DA_CONG_BO",
  "DAT_CHUAN",
  "KHONG_DAT",
];

// true => hiện thẻ hẹn lịch + nút "Cập nhật lấy mẫu & Niêm phong"
const isScheduledItem = (item) => {
  const status = normalizeStatus(
    item.trang_thai_ho_so ?? item.trang_thai ?? item.trang_thai_kiem_dinh,
  );
  if (SCHEDULED_STATUSES.includes(status)) return true;
  if (SAMPLED_STATUSES.includes(status) || COMPLETED_STATUSES.includes(status))
    return false;
  // Dự phòng: chưa có dữ liệu lấy mẫu thì coi là đang ở bước hẹn lịch
  return !item.thoi_gian_lay_mau && !item.khoi_luong_mau;
};

// Định dạng giờ hẹn giống mẫu: 08:30 Sáng
const formatGioHen = (g) => {
  if (!g) return "Chưa hẹn giờ";
  const [h, m] = String(g).split(":");
  const hour = parseInt(h, 10);
  if (Number.isNaN(hour)) return String(g);
  const buoi = hour < 12 ? "Sáng" : hour < 18 ? "Chiều" : "Tối";
  return `${h.padStart(2, "0")}:${(m ?? "00").slice(0, 2)} ${buoi}`;
};

function Coquankiemdinh() {
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState("requests");

  // State bộ lọc trạng thái riêng cho tab lấy mẫu
  const [samplingFilterStatus, setSamplingFilterStatus] = useState("ALL");

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

  // Form states cho tiếp nhận và lấy mẫu
  const [code, setCode] = useState("");
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [inspector, setInspector] = useState(
    "KS. Trần Minh Tuấn (Phòng Giám định Trồng trọt)",
  );
  const [sealCode, setSealCode] = useState("");
  const [sampleWeight, setSampleWeight] = useState("");
  const [sampleMethod, setSampleMethod] = useState(
    "Lấy chéo góc 5 điểm ngẫu nhiên trên liếp vườn",
  );
  const [visualCondition, setVisualCondition] = useState("");

  // Actions Modal
  const handleOpenAcceptModal = (codeVal, farmVal, maKiemDinh) => {
    setAcceptData({ code: codeVal, farm: farmVal });
    setCode(maKiemDinh);
    setModalAcceptOpen(true);
  };

  const handleConfirmScheduleSampling = async () => {
    try {
      await accepauthority(true, code, day, time, inspector);
      setModalAcceptOpen(false);
      fetchInspectionRequests(); // cập nhật lại tab yêu cầu
      setCurrentTab("sampling"); // chuyển tab lấy mẫu
    } catch (err) {
      console.error("Lỗi khi chấp thuận lịch hẹn:", err);
      alert("Chấp thuận lịch hẹn thất bại!");
    }
  };

  const handleOpenSamplingModal = (item) => {
    setSamplingData({
      requestCode: item.ma_ho_so,
      batchCode: item.ma_lo_nong_san,
      farmName: item.ten_nong_trai,
    });
    setCode(item.ma_kiem_dinh);
    setSealCode(
      item.ma_niem_phong || `SEAL-${Date.now().toString().slice(-6)}`,
    );
    setModalSamplingOpen(true);
  };

  const handleOpenPublishModal = (item) => {
    setCode(item.ma_kiem_dinh);
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

  // 1. Tải danh sách yêu cầu chờ duyệt (Tab 1)
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedStandard, setSelectedStandard] = useState("");

  const fetchInspectionRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const maCoQuan = user?.ma_nguoi_dung || "";
      const params = new URLSearchParams();
      params.append("trang_thai", "CHO_TIEP_NHAN");
      if (maCoQuan) params.append("ma_co_quan", maCoQuan);
      if (selectedStandard) {
        params.append("tieu_chuan", selectedStandard.toUpperCase());
      }

      const url = `http://localhost:3000/api/kiem-dinh/data?${params.toString()}`;
      const response = await fetch(url);
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.message || "Tải dữ liệu thất bại");
      }

      setRequests(result.data || []);
    } catch (err) {
      console.error("Lỗi nạp dữ liệu kiểm định:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentTab === "requests") {
      fetchInspectionRequests();
    }
  }, [currentTab, selectedStandard]);

  // 2. Tải danh sách khảo sát & lấy mẫu (Tab 2)
  const [samplingList, setSamplingList] = useState([]);
  const [samplingLoading, setSamplingLoading] = useState(false);
  const [samplingError, setSamplingError] = useState(null);

  const fetchSamplingRequests = async () => {
    setSamplingLoading(true);
    setSamplingError(null);
    try {
      const maCoQuan = user?.ma_nguoi_dung;
      const result = await fetchSamplingListApi(maCoQuan);

      if (!result.ok) {
        throw new Error(result.message || "Không thể tải danh sách lấy mẫu");
      }

      setSamplingList(result.data || []);
    } catch (err) {
      console.error("Lỗi nạp dữ liệu lấy mẫu:", err);
      setSamplingError(err.message);
    } finally {
      setSamplingLoading(false);
    }
  };

  useEffect(() => {
    if (currentTab === "sampling") {
      fetchSamplingRequests();
    }
  }, [currentTab]);

  // Lọc dữ liệu danh sách lấy mẫu ở phía client theo lựa chọn
  const filteredSamplingList = samplingList.filter((item) => {
    if (samplingFilterStatus === "ALL") return true;

    const status = normalizeStatus(
      item.trang_thai_ho_so ?? item.trang_thai ?? item.trang_thai_kiem_dinh,
    );

    if (samplingFilterStatus === "DA_HEN_LICH") {
      return isScheduledItem(item);
    }
    if (samplingFilterStatus === "DA_LAY_MAU") {
      return (
        SAMPLED_STATUSES.includes(status) ||
        (Boolean(item.thoi_gian_lay_mau || item.khoi_luong_mau) &&
          !COMPLETED_STATUSES.includes(status))
      );
    }
    if (samplingFilterStatus === "HOAN_THANH") {
      return COMPLETED_STATUSES.includes(status);
    }
    return true;
  });

  const [fixedValues, setFixedValues] = useState({
    DU_LUONG_BVTV: "",
    KIM_LOAI_NANG: "",
    VI_SINH: "",
    NITRATE: "",
  });

  const FIXED_NAMES = {
    DU_LUONG_BVTV: "Dư lượng BVTV (Hóa chất cấm)",
    KIM_LOAI_NANG: "Kim loại nặng (Chì, Cadimi)",
    VI_SINH: "Vi sinh (E.coli, Salmonella)",
    NITRATE: "Dư lượng Nitrate (NO3-)",
  };

  const handleSaveIndicators = async () => {
    const indicators = [
      ...Object.keys(FIXED_NAMES).map((ma) => ({
        loai: "CO_DINH",
        ma,
        ten: FIXED_NAMES[ma],
        val: fixedValues[ma],
      })),
      ...customIndicators.map((c) => ({
        loai: "TUY_CHINH",
        ma: null,
        ten: c.name,
        val: c.val,
      })),
    ];

    const res = await saveTestIndicators(code, indicators);
    if (res?.status) {
      alert(res.message);
      setModalPublishOpen(false);
    } else {
      alert(res?.message || "có lỗi xảy ra");
    }
  };

  return (
    <div className="kiemdinh">
      <div className="cert-container">
        {/* HEADER */}
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
              placeholder="Tìm mã hồ sơ, mã lô nông dân yêu cầu..."
            />
          </div>

          <div className="header-profile">
            <div className="avatar-circle"></div>
            <div className="profile-meta">
              <span className="profile-name">
                Trung Tâm Giám Định Nông Nghiệp Vùng 2
              </span>
              <span className="profile-role">
                Cơ quan kiểm định &amp; Chứng nhận
              </span>
            </div>
          </div>
        </header>

        {/* BODY */}
        <div className="cert-body">
          {/* SIDEBAR */}
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

          {/* MAIN CONTENT AREA */}
          <div className="cert-content-area no-scrollbar">
            {/* TAB 1: YÊU CẦU KIỂM ĐỊNH */}
            {currentTab === "requests" && (
              <main className="view-panel">
                <div className="metrics-sticky-wrapper">
                  <div className="metrics-grid">
                    <div className="metric-card">
                      <span className="metric-label">
                        Yêu cầu mới chờ duyệt
                      </span>
                      <p className="metric-val">
                        {requests.length || 0}{" "}
                        <span className="metric-unit">Hồ sơ mới</span>
                      </p>
                    </div>

                    <div className="metric-card">
                      <span className="metric-label">Đã lên lịch khảo sát</span>
                      <p className="metric-val">
                        {samplingList.filter(isScheduledItem).length || 0}{" "}
                        <span className="metric-unit">Đợt lấy mẫu</span>
                      </p>
                    </div>

                    <div className="metric-card">
                      <span className="metric-label">
                        Đã cấp chứng nhận tháng này
                      </span>
                      <p className="metric-val">
                        24 <span className="metric-unit">Lô đạt chuẩn</span>
                      </p>
                    </div>

                    <div className="filter-actions">
                      <div className="custom-select-box">
                        <select
                          className="select-control"
                          value={selectedStandard}
                          onChange={(e) => setSelectedStandard(e.target.value)}
                        >
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
                      <div className="filter-hint-text">
                        <span>🚜</span>
                        <span>Ưu tiên lô hàng cận ngày xuất xưởng</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card-stack">
                  {loading && (
                    <p style={{ textAlign: "center", color: "#6b7280" }}>
                      Đang tải danh sách hồ sơ...
                    </p>
                  )}

                  {error && (
                    <p style={{ color: "#dc2626", textAlign: "center" }}>
                      {error}
                    </p>
                  )}

                  {!loading && !error && requests.length === 0 && (
                    <p style={{ textAlign: "center", color: "#6b7280" }}>
                      Không có hồ sơ yêu cầu nào đang chờ xử lý.
                    </p>
                  )}

                  {!loading &&
                    requests.map((item) => (
                      <div className="item-card" key={item.ma_kiem_dinh}>
                        <div className="card-left-group">
                          <div className="card-icon-bubble icon-blue">
                            <FileText size={32} />
                          </div>

                          <div className="card-content-stack">
                            <div className="card-header-line">
                              <h3 className="card-title">
                                {item.ten_san_pham} Yêu cầu cấp tem{" "}
                                {item.tieu_chuan_dang_ky}
                              </h3>
                              <span className="pill-gray">
                                #{item.ma_ho_so}
                              </span>
                              <span className="pill-green-soft">
                                {item.ten_nong_trai || "Chưa gán trang trại"} (#
                                {item.ma_nong_trai || "N/A"})
                              </span>
                            </div>

                            <div className="card-meta-wrap">
                              <p>
                                Chủ nông trại:{" "}
                                <span className="text-meta-regular">
                                  {item.ten_chu_vuon} (
                                  {item.sdt_chu_vuon || "Chưa cập nhật SĐT"})
                                </span>
                              </p>
                              <p>
                                Mã lô thu hoạch:{" "}
                                <span className="text-meta-green">
                                  #{item.ma_lo_nong_san} (
                                  {item.so_luong_hien_tai} {item.don_vi_tinh})
                                </span>
                              </p>
                              <p>
                                Ngày nộp yêu cầu:{" "}
                                <span className="text-meta-regular">
                                  {new Date(item.ngay_nop_don).toLocaleString(
                                    "vi-VN",
                                  )}
                                </span>
                              </p>
                              <p>
                                Địa chỉ vườn:{" "}
                                <span className="text-meta-regular">
                                  {item.ten_thua_dat
                                    ? `${item.ten_thua_dat}, `
                                    : ""}
                                  {item.dia_diem_nong_trai || "Chưa có địa chỉ"}
                                </span>
                              </p>
                            </div>

                            <div className="card-desc-box">
                              <p style={{ fontWeight: 600, color: "#374151" }}>
                                Nội dung đề nghị:
                              </p>
                              <p>
                                {item.noi_dung_de_nghi ||
                                  "Không có ghi chú thêm."}
                              </p>
                            </div>

                            <div style={{ paddingTop: "4px" }}>
                              <span className="status-badge-amber">
                                Trạng thái: Chờ cơ quan chấp thuận &amp; hẹn
                                ngày lấy mẫu
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="card-actions-col">
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenAcceptModal(
                                item.ma_ho_so,
                                `${item.ten_nong_trai} (#${item.ma_nong_trai})`,
                                item.ma_kiem_dinh,
                              )
                            }
                            className="btn-primary"
                          >
                            <CalendarPlus size={16} />
                            <span>Chấp thuận &amp; Hẹn ngày lấy mẫu</span>
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (
                                window.confirm(
                                  `Bạn có chắc muốn từ chối hồ sơ ${item.ma_ho_so}?`,
                                )
                              ) {
                                await accepauthority(false, item.ma_kiem_dinh);
                                fetchInspectionRequests();
                              }
                            }}
                            className="btn-reject"
                          >
                            <XCircle size={16} />
                            <span>Từ chối hồ sơ</span>
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </main>
            )}

            {/* TAB 2: LỊCH HẸN & LẤY MẪU */}
            {currentTab === "sampling" && (
              <main className="view-panel">
                {/* THANH BANNER & BỘ LỌC CỐ ĐỊNH KHI CUỘN */}
                <div className="sampling-sticky-wrapper">
                  <div className="tab-banner-box tab-banner-with-filter">
                    <div className="banner-text-side">
                      <h2>Tiến Độ Khảo Sát &amp; Lấy Mẫu Tại Vườn</h2>
                      <p>
                        Cập nhật biên bản niêm phong khi kiểm định viên lấy mẫu
                        tại vườn hoặc nhập chỉ số công bố khi có kết quả phòng
                        Lab.
                      </p>
                    </div>

                    <div className="banner-filter-side">
                      <div
                        className="custom-select-box"
                        style={{ minWidth: "220px" }}
                      >
                        <select
                          className="select-control"
                          value={samplingFilterStatus}
                          onChange={(e) =>
                            setSamplingFilterStatus(e.target.value)
                          }
                        >
                          <option value="ALL">Tất cả trạng thái</option>
                          <option value="DA_HEN_LICH">Đã hẹn lịch</option>
                          <option value="DA_LAY_MAU">Đã lấy mẫu</option>
                          <option value="HOAN_THANH">
                            Hoàn thành kiểm định
                          </option>
                        </select>
                        <ChevronDown size={16} className="select-arrow-icon" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card-stack">
                  {samplingLoading && (
                    <p style={{ textAlign: "center", color: "#6b7280" }}>
                      Đang tải lịch hẹn &amp; danh sách mẫu...
                    </p>
                  )}

                  {samplingError && (
                    <p style={{ textAlign: "center", color: "#dc2626" }}>
                      {samplingError}
                    </p>
                  )}

                  {!samplingLoading &&
                    !samplingError &&
                    filteredSamplingList.length === 0 && (
                      <p style={{ textAlign: "center", color: "#6b7280" }}>
                        Không tìm thấy hồ sơ nào phù hợp với bộ lọc hiện tại.
                      </p>
                    )}

                  {!samplingLoading &&
                    filteredSamplingList.map((item) => {
                      const scheduled = isScheduledItem(item);
                      const farmLabel = `${item.ten_nong_trai || "Chưa rõ trang trại"}${
                        item.ma_nong_trai ? ` (#\${item.ma_nong_trai})` : ""
                      }`;

                      return scheduled ? (
                        /* Đã lên lịch */
                        <div className="item-card" key={item.ma_kiem_dinh}>
                          <div className="card-left-group">
                            <div className="card-icon-bubble icon-amber">
                              <CalendarClock size={32} />
                            </div>

                            <div className="card-content-stack">
                              <div className="card-header-line">
                                <h3 className="card-title">
                                  {item.ten_san_pham} Lô #{item.ma_lo_nong_san}
                                </h3>
                                <span className="pill-gray">
                                  #{item.ma_ho_so}
                                </span>
                                <span className="pill-green-soft">
                                  {farmLabel}
                                </span>
                              </div>

                              <div className="card-meta-wrap">
                                <p>
                                  Lịch hẹn lấy mẫu:{" "}
                                  <span className="text-meta-blue">
                                    {item.ngay_hen_lay_mau
                                      ? new Date(
                                          item.ngay_hen_lay_mau,
                                        ).toLocaleDateString("vi-VN")
                                      : "Chưa hẹn ngày"}{" "}
                                    ({formatGioHen(item.gio_hen_lay_mau)})
                                  </span>
                                </p>
                                <p>
                                  Kiểm định viên:{" "}
                                  <span className="text-meta-regular">
                                    {item.kiem_dinh_vien || "Chưa phân công"}
                                  </span>
                                </p>
                                <p>
                                  Địa điểm:{" "}
                                  <span className="text-meta-regular">
                                    {item.dia_diem_nong_trai ||
                                      "Chưa có địa chỉ"}
                                  </span>
                                </p>
                              </div>

                              <div style={{ paddingTop: "4px" }}>
                                <span className="status-badge-border-amber">
                                  Đã lên lịch - Chờ kiểm định viên đến vườn lấy
                                  mẫu &amp; niêm phong
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="card-actions-row">
                            <button
                              type="button"
                              onClick={() => handleOpenSamplingModal(item)}
                              className="btn-primary"
                            >
                              <QrCode size={16} />
                              <span>Cập nhật lấy mẫu &amp; Niêm phong</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Trong phòng Lab */
                        <div className="item-card" key={item.ma_kiem_dinh}>
                          <div className="card-left-group">
                            <div className="card-icon-bubble icon-purple">
                              <TestTube2 size={32} />
                            </div>

                            <div className="card-content-stack">
                              <div className="card-header-line">
                                <h3 className="card-title">
                                  Mẫu {item.ten_san_pham}
                                  {item.ma_mau ? ` #${item.ma_mau}` : ""} (Lô #
                                  {item.ma_lo_nong_san})
                                </h3>
                                <span className="pill-gray">
                                  #{item.ma_ho_so}
                                </span>
                                <span className="pill-green-soft">
                                  {item.ten_nong_trai || "Chưa rõ trang trại"}
                                </span>
                              </div>

                              <div className="card-meta-wrap">
                                <p>
                                  Ngày lấy mẫu:{" "}
                                  <span className="text-meta-regular">
                                    {item.thoi_gian_lay_mau
                                      ? new Date(
                                          item.thoi_gian_lay_mau,
                                        ).toLocaleDateString("vi-VN")
                                      : "N/A"}
                                  </span>
                                </p>
                                <p>
                                  Khối lượng:{" "}
                                  <span className="text-meta-purple">
                                    {item.khoi_luong_mau || "Chưa nhập"}
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
                                    {item.ma_niem_phong || "Chưa cấp seal"}
                                  </span>
                                </p>
                                <p>
                                  Tình trạng:{" "}
                                  <span
                                    style={{
                                      fontWeight: 600,
                                      color: "#d97706",
                                    }}
                                  >
                                    {item.tinh_trang_cam_quan ||
                                      "Đang xét nghiệm - Chờ duyệt công bố"}
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
                              onClick={() => handleOpenPublishModal(item)}
                              className="btn-primary"
                            >
                              <FileCheck2 size={16} />
                              <span>Nhập chỉ số &amp; Công bố</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </main>
            )}

            {/* TAB 3: CÔNG BỐ KẾT QUẢ */}
            {currentTab === "results" && (
              <main className="view-panel">
                <div className="tab-banner-box">
                  <h2>Danh Sách Lô Hàng Đã Công Bố Chứng Nhận</h2>
                  <p>
                    Kết quả được ký số điện tử và băm trực tiếp lên Blockchain
                    để người tiêu dùng quét QR kiểm chứng.
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
                          Smart Contract Hash: 0x7c49f821...a381e9b2 (Đã xác
                          thực lên AgriChain)
                        </div>
                      </div>
                    </div>

                    <div className="card-actions-row">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          alert(
                            "Đang tải giấy chứng nhận điện tử định dạng PDF có mã QR...",
                          );
                        }}
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
                      ánh từ người tiêu dùng phát hiện tồn dư vượt ngưỡng, cơ
                      quan kiểm định có quyền kích hoạt lệnh thu hồi ngay lập
                      tức để vô hiệu hóa mã QR truy xuất.
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
                    {acceptData.code} {acceptData.farm}
                  </b>
                </p>

                <div className="form-group">
                  <label>Ngày Đến Vườn Lấy Mẫu (*)</label>
                  <input
                    type="date"
                    className="form-control-input"
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Giờ Khảo Sát Dự Kiến</label>
                  <input
                    type="time"
                    className="form-control-input"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Phân Công Kiểm Định Viên Phụ Trách</label>
                  <select
                    className="form-control-select"
                    value={inspector}
                    onChange={(e) => setInspector(e.target.value)}
                  >
                    <option value="KS. Trần Minh Tuấn (Phòng Giám định Trồng trọt)">
                      KS. Trần Minh Tuấn (Phòng Giám định Trồng trọt)
                    </option>
                    <option value="ThS. Lê Hoàng Yến (Chuyên viên vi sinh)">
                      ThS. Lê Hoàng Yến (Chuyên viên vi sinh)
                    </option>
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
                    <b style={{ color: "#111827" }}>
                      {samplingData.requestCode}
                    </b>
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
                      value={sealCode}
                      onChange={(e) => setSealCode(e.target.value)}
                      className="form-control-input"
                      style={{ fontFamily: "monospace", fontWeight: 700 }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Số Lượng / Khối Lượng Mẫu (*)</label>
                    <input
                      type="text"
                      placeholder="VD: 3.0 kg (10 quả)"
                      className="form-control-input"
                      value={sampleWeight}
                      onChange={(e) => setSampleWeight(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Phương Pháp Lấy Mẫu Thực Địa</label>
                  <select
                    className="form-control-select"
                    value={sampleMethod}
                    onChange={(e) => setSampleMethod(e.target.value)}
                  >
                    <option value="Lấy chéo góc 5 điểm ngẫu nhiên trên liếp vườn">
                      Lấy chéo góc 5 điểm ngẫu nhiên trên liếp vườn
                    </option>
                    <option value="Lấy ngẫu nhiên trên khay chứa tại kho đệm">
                      Lấy ngẫu nhiên trên khay chứa tại kho đệm
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Tình Trạng Cảm Quan Tại Vườn</label>
                  <input
                    type="text"
                    placeholder="Mô tả tình trạng mẫu..."
                    className="form-control-input"
                    value={visualCondition}
                    onChange={(e) => setVisualCondition(e.target.value)}
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
                  onClick={async () => {
                    try {
                      await updateSampleDetail(
                        code,
                        sealCode,
                        sampleWeight,
                        sampleMethod,
                        visualCondition,
                      );
                      setModalSamplingOpen(false);
                      // Tải lại danh sách để tự động chuyển trạng thái
                      fetchSamplingRequests();
                    } catch (err) {
                      console.error("Lỗi cập nhật biên bản lấy mẫu:", err);
                      alert("Cập nhật biên bản thất bại!");
                    }
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
                    {Object.keys(FIXED_NAMES).map((ma) => (
                      <div className="form-group" key={ma}>
                        <span
                          style={{
                            color: "#6b7280",
                            fontWeight: 500,
                            display: "block",
                            marginBottom: "4px",
                          }}
                        >
                          {FIXED_NAMES[ma]}:
                        </span>
                        <input
                          type="text"
                          value={fixedValues[ma]}
                          onChange={(e) =>
                            setFixedValues({
                              ...fixedValues,
                              [ma]: e.target.value,
                            })
                          }
                          className="form-control-input"
                        />
                      </div>
                    ))}
                  </div>

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
                  onClick={handleSaveIndicators}
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
    </div>
  );
}

export default Coquankiemdinh;
