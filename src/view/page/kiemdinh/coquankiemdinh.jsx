import React, { useState, useEffect } from "react";
import usePersistentTab from "../../../hooks/usePersistentTab";
import {
  accepauthority,
  fetchSamplingListApi,
  updateSampleDetail,
  saveTestIndicators,
  updateInspectionStatus,
  exportInspectionCertificateWord,
  fetchNguongKiemDinhApi,
  fetchInspectorsApi,
  createInspectorApi,
  updateInspectorApi,
  setInspectorStatusApi,
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
  Check,
  Edit3,
  LogOut,
  Users,
  UserPlus,
  Phone,
  Mail,
} from "lucide-react";
import "../../css/coquankiemdinh.css";
import { useNavigate } from "react-router-dom";

const DEFAULT_LOGO_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png";

const normalizeStatus = (s) =>
  String(s ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

const SCHEDULED_STATUSES = ["DA_HEN_LICH", "DA_HEN"];
const PENDING_SAMPLE_STATUSES = [
  "CHO_LAY_MAU",
  "DANG_XET_NGHIEM",
  "CHO_XET_NGHIEM",
];
const SAMPLED_STATUSES = [
  "DA_LAY_MAU",
  "DA_NIEM_PHONG",
  "CHO_CONG_BO",
  "DA_HOAN_THANH",
  "HOAN_THANH",
  "DA_KIEM_DINH",
];

const isScheduledItem = (item) => {
  const status = normalizeStatus(
    item.trang_thai_ho_so ?? item.trang_thai ?? item.trang_thai_kiem_dinh,
  );
  if (SCHEDULED_STATUSES.includes(status)) return true;
  return (
    !item.thoi_gian_lay_mau &&
    !item.khoi_luong_mau &&
    !PENDING_SAMPLE_STATUSES.includes(status) &&
    !SAMPLED_STATUSES.includes(status)
  );
};

const isPendingSampleItem = (item) => {
  const status = normalizeStatus(
    item.trang_thai_ho_so ?? item.trang_thai ?? item.trang_thai_kiem_dinh,
  );
  return PENDING_SAMPLE_STATUSES.includes(status);
};

const isSampledItem = (item) => {
  const status = normalizeStatus(
    item.trang_thai_ho_so ?? item.trang_thai ?? item.trang_thai_kiem_dinh,
  );
  // Ưu tiên trạng thái DB: DA_HEN_LICH và CHO_LAY_MAU không phải đã lấy mẫu
  if (
    SCHEDULED_STATUSES.includes(status) ||
    PENDING_SAMPLE_STATUSES.includes(status)
  ) {
    return false;
  }
  return (
    SAMPLED_STATUSES.includes(status) ||
    Boolean(item.thoi_gian_lay_mau && item.khoi_luong_mau)
  );
};

const formatWeight = (value, unit) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return `- ${unit || ""}`;

  // Lưu trữ luôn theo kg; hiển thị tự quy đổi sang Tấn khi đạt 1.000kg trở lên
  // cho dễ đọc (vd: 3500 -> "3,5 Tấn"), dưới mức đó vẫn hiện kg (vd: "900 kg").
  if ((unit || "").toLowerCase() === "kg" && num >= 1000) {
    const tons = num / 1000;
    return `${tons.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} Tấn`;
  }

  return `${num.toLocaleString("vi-VN", { maximumFractionDigits: 3 })} ${unit || ""}`;
};

const formatGioHen = (g) => {
  if (!g) return "Chưa hẹn giờ";
  const [h, m] = String(g).split(":");
  const hour = parseInt(h, 10);
  if (Number.isNaN(hour)) return String(g);
  const buoi = hour < 12 ? "Sáng" : hour < 18 ? "Chiều" : "Tối";
  return `${h.padStart(2, "0")}:${(m ?? "00").slice(0, 2)} ${buoi}`;
};

// Kết quả Đạt / Không đạt do server đánh giá (server/utils/danhGiaChiSo.js) để mọi trang cùng một công thức
const checkAllIndicatorsPass = (item) => item.tat_ca_dat === true;

function Coquankiemdinh() {
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = usePersistentTab("kiemdinh", "requests", ["requests","sampling","results","violations","inspectors"]);

  const [samplingFilterStatus, setSamplingFilterStatus] = useState("ALL");

  const handlechitietkiemdinh = (e) => {
    e.preventDefault();
    navigate("/chi-tiet-kiem-dinh");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/dang-nhap");
  };

  const [modalAcceptOpen, setModalAcceptOpen] = useState(false);
  const [modalSamplingOpen, setModalSamplingOpen] = useState(false);
  const [modalPublishOpen, setModalPublishOpen] = useState(false);
  const [modalRevokeOpen, setModalRevokeOpen] = useState(false);
  const [modalConfirmPublishOpen, setModalConfirmPublishOpen] = useState(false);
  const [modalFailOpen, setModalFailOpen] = useState(false);
  const [failItem, setFailItem] = useState(null);

  const [acceptData, setAcceptData] = useState({ code: "", farm: "" });

  const [samplingData, setSamplingData] = useState({
    requestCode: "",
    batchCode: "",
    farmName: "",
  });

  // State danh sách các chỉ số tải từ bảng nguong_kiem_dinh_chuan
  const [standardIndicators, setStandardIndicators] = useState([]);
  const [indicatorValues, setIndicatorValues] = useState({});
  const [loadingStandards, setLoadingStandards] = useState(false);

  const [revokeItem, setRevokeItem] = useState(null);
  const [revokeReason, setRevokeReason] = useState(
    "Phát hiện tồn dư chất cấm vượt ngưỡng kiểm định an toàn",
  );

  const [selectedPublishItem, setSelectedPublishItem] = useState(null);

  const [code, setCode] = useState("");
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [inspectors, setInspectors] = useState([]);
  const [inspectorsLoading, setInspectorsLoading] = useState(false);
  const [selectedInspectorId, setSelectedInspectorId] = useState("");
  const [modalInspectorOpen, setModalInspectorOpen] = useState(false);
  const [editingInspectorId, setEditingInspectorId] = useState(null);
  const [inspectorForm, setInspectorForm] = useState({
    ho_ten: "",
    chuc_vu: "",
    so_dien_thoai: "",
    email: "",
  });
  const [inspectorFormError, setInspectorFormError] = useState("");
  const [inspectorSaving, setInspectorSaving] = useState(false);
  const [sealCode, setSealCode] = useState("");
  const [sampleWeight, setSampleWeight] = useState("");
  const [sampleMethod, setSampleMethod] = useState(
    "Lấy chéo góc 5 điểm ngẫu nhiên trên liếp vườn",
  );
  const [visualCondition, setVisualCondition] = useState("");

  const activeInspectors = inspectors.filter((i) => i.trang_thai === 1);

  const loadInspectors = async () => {
    setInspectorsLoading(true);
    try {
      const res = await fetchInspectorsApi();
      if (res.ok) setInspectors(res.data || []);
    } catch (err) {
      console.error("Lỗi khi tải kiểm định viên:", err);
    } finally {
      setInspectorsLoading(false);
    }
  };

  useEffect(() => {
    if (currentTab === "inspectors" || modalAcceptOpen) {
      loadInspectors();
    }
  }, [currentTab, modalAcceptOpen]);

  // Chọn sẵn kiểm định viên đầu tiên đang hoạt động khi mở hộp thoại chấp thuận
  useEffect(() => {
    if (!modalAcceptOpen) return;
    const stillValid = activeInspectors.some(
      (i) => i.ma_kiem_dinh_vien === selectedInspectorId,
    );
    if (!stillValid) {
      setSelectedInspectorId(activeInspectors[0]?.ma_kiem_dinh_vien || "");
    }
  }, [inspectors, modalAcceptOpen]);

  const openInspectorModal = (item) => {
    setEditingInspectorId(item ? item.ma_kiem_dinh_vien : null);
    setInspectorForm({
      ho_ten: item?.ho_ten || "",
      chuc_vu: item?.chuc_vu || "",
      so_dien_thoai: item?.so_dien_thoai || "",
      email: item?.email || "",
    });
    setInspectorFormError("");
    setModalInspectorOpen(true);
  };

  const handleSaveInspector = async () => {
    if (!inspectorForm.ho_ten.trim()) {
      setInspectorFormError("Vui lòng nhập họ tên kiểm định viên");
      return;
    }
    setInspectorSaving(true);
    setInspectorFormError("");
    try {
      const res = editingInspectorId
        ? await updateInspectorApi(editingInspectorId, inspectorForm)
        : await createInspectorApi(inspectorForm);
      if (!res.ok) {
        setInspectorFormError(res.message || "Không lưu được kiểm định viên");
        return;
      }
      setModalInspectorOpen(false);
      loadInspectors();
    } catch (err) {
      console.error("Lỗi khi lưu kiểm định viên:", err);
      setInspectorFormError("Không kết nối được máy chủ");
    } finally {
      setInspectorSaving(false);
    }
  };

  const handleToggleInspector = async (item) => {
    const res = await setInspectorStatusApi(
      item.ma_kiem_dinh_vien,
      item.trang_thai !== 1,
    );
    if (!res.ok) {
      alert(res.message || "Không đổi được trạng thái");
      return;
    }
    loadInspectors();
  };

  const handleOpenAcceptModal = (codeVal, farmVal, maKiemDinh) => {
    setAcceptData({ code: codeVal, farm: farmVal });
    setCode(maKiemDinh);
    setModalAcceptOpen(true);
  };

  const handleConfirmScheduleSampling = async () => {
    try {
      const chosen = activeInspectors.find(
        (i) => i.ma_kiem_dinh_vien === selectedInspectorId,
      );
      if (!chosen) {
        alert("Vui lòng chọn kiểm định viên phụ trách");
        return;
      }
      const inspectorText = chosen.chuc_vu
        ? `${chosen.ho_ten} (${chosen.chuc_vu})`
        : chosen.ho_ten;
      const res = await accepauthority(
        true,
        code,
        day,
        time,
        inspectorText,
        chosen.ma_kiem_dinh_vien,
      );
      if (!res) return; // thiếu dữ liệu: API đã báo
      if (!res.status) {
        alert(res.message || "Chấp thuận lịch hẹn thất bại!");
        return;
      }
      setModalAcceptOpen(false);
      fetchInspectionRequests();
      setCurrentTab("sampling");
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

  // Mở popup và gửi yêu cầu đến server tải các tiêu chuẩn của bảng ngưỡng kiểm định chuẩn
  const handleOpenPublishModal = async (item) => {
    setCode(item.ma_kiem_dinh);
    setStandardIndicators([]);
    setIndicatorValues({});
    setLoadingStandards(true);
    setModalPublishOpen(true);

    try {
      const res = await fetchNguongKiemDinhApi(
        item.ma_kiem_dinh,
        item.tieu_chuan_dang_ky,
        item.ma_san_pham,
      );

      if (res?.ok && res.data) {
        const standards = res.data.standards || [];
        const saved = res.data.savedIndicators || [];

        setStandardIndicators(standards);

        // Khởi tạo các giá trị, nếu có giá trị đã lưu trước thì điền vào
        const valMap = {};
        standards.forEach((std) => {
          // ma_chi_so là mã nhóm (vd KIM_LOAI_NANG, VI_SINH) dùng chung nhiều chất, nên chỉ khớp theo tên chất
          const found = saved.find((s) => s.ten_chi_so === std.ten_chi_tiet_chat);
          valMap[std.ma_nguong] = found ? found.gia_tri : "";
        });

        setIndicatorValues(valMap);
      }
    } catch (error) {
      console.error("Lỗi khi tải ngưỡng kiểm định chuẩn:", error);
      alert("Không thể tải danh sách tiêu chuẩn kiểm định!");
    } finally {
      setLoadingStandards(false);
    }
  };

  const handleOpenConfirmPublishModal = (item) => {
    setSelectedPublishItem(item);
    setCode(item.ma_kiem_dinh);
    setModalConfirmPublishOpen(true);
  };

  const handleOpenRevokeModal = (item) => {
    setRevokeItem(item);
    setCode(item.ma_kiem_dinh);
    setRevokeReason("Phát hiện tồn dư chất cấm vượt ngưỡng kiểm định an toàn");
    setModalRevokeOpen(true);
  };

  const handleConfirmRevoke = async () => {
    if (!revokeItem) return;
    if (!revokeReason.trim()) {
      alert("Vui lòng nhập lý do thu hồi chứng nhận!");
      return;
    }

    try {
      await updateInspectionStatus(
        revokeItem.ma_kiem_dinh,
        "Deny",
        revokeReason,
      );
      alert(
        `Đã kích hoạt thu hồi lô #${revokeItem.ma_lo_nong_san} thành công!`,
      );
      setModalRevokeOpen(false);
      fetchSamplingRequests();
      fetchRevokedCertificates();
    } catch (err) {
      console.error("Lỗi yêu cầu thu hồi:", err);
      alert("Gửi yêu cầu thu hồi thất bại!");
    }
  };

  const handleConfirmPublish = async () => {
    if (!selectedPublishItem) return;
    try {
      const result = await updateInspectionStatus(
        selectedPublishItem.ma_kiem_dinh,
        "accept",
        null,
      );
      if (!result?.status) {
        alert(result?.message || "Công bố kết quả thất bại!");
        return;
      }
      alert(
        `Đã công bố chứng nhận cho lô #${selectedPublishItem.ma_lo_nong_san} thành công!${
          result.so_chung_nhan ? ` Số chứng nhận: ${result.so_chung_nhan}` : ""
        }`,
      );
      setModalConfirmPublishOpen(false);
      fetchSamplingRequests();
      fetchPublishedCertificates();
    } catch (err) {
      console.error("Lỗi khi công bố chứng nhận:", err);
      alert("Công bố kết quả thất bại!");
    }
  };

  const handleOpenFailModal = (item) => {
    setFailItem(item);
    setCode(item.ma_kiem_dinh);
    setModalFailOpen(true);
  };

  const handleConfirmFail = async () => {
    if (!failItem) return;
    try {
      const result = await updateInspectionStatus(
        failItem.ma_kiem_dinh,
        "fail",
        null,
      );
      if (!result?.status) {
        alert(result?.message || "Công bố kết luận không đạt thất bại!");
        return;
      }
      alert(
        `Đã công bố kết luận KHÔNG ĐẠT cho lô #${failItem.ma_lo_nong_san}.`,
      );
      setModalFailOpen(false);
      fetchSamplingRequests();
      fetchPublishedCertificates();
    } catch (err) {
      console.error("Lỗi khi công bố không đạt:", err);
      alert("Công bố kết luận không đạt thất bại!");
    }
  };

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

  const [publishedList, setPublishedList] = useState([]);
  const [publishedLoading, setPublishedLoading] = useState(false);

  const fetchPublishedCertificates = async () => {
    setPublishedLoading(true);
    try {
      const maCoQuan = user?.ma_nguoi_dung || "";
      const params = new URLSearchParams();
      params.append("trang_thai", "DA_CONG_BO");
      if (maCoQuan) params.append("ma_co_quan", maCoQuan);

      const res = await fetch(
        `http://localhost:3000/api/kiem-dinh/data?${params.toString()}`,
      );
      const result = await res.json();
      if (result.ok) {
        setPublishedList(result.data || []);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách công bố:", err);
    } finally {
      setPublishedLoading(false);
    }
  };

  useEffect(() => {
    // Tab "requests" cũng cần danh sách này để đếm số chứng nhận đã cấp
    if (currentTab === "results" || currentTab === "requests") {
      fetchPublishedCertificates();
    }
  }, [currentTab]);

  const [revokedList, setRevokedList] = useState([]);
  const [revokedLoading, setRevokedLoading] = useState(false);

  const fetchRevokedCertificates = async () => {
    setRevokedLoading(true);
    try {
      const maCoQuan = user?.ma_nguoi_dung || "";
      const params = new URLSearchParams();
      params.append("trang_thai", "THU_HOI");
      if (maCoQuan) params.append("ma_co_quan", maCoQuan);

      const res = await fetch(
        `http://localhost:3000/api/kiem-dinh/data?${params.toString()}`,
      );
      const result = await res.json();
      if (result.ok) {
        setRevokedList(result.data || []);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách thu hồi:", err);
    } finally {
      setRevokedLoading(false);
    }
  };

  useEffect(() => {
    if (currentTab === "violations") {
      fetchRevokedCertificates();
    }
  }, [currentTab]);

  const filteredSamplingList = samplingList.filter((item) => {
    if (samplingFilterStatus === "ALL") return true;

    if (samplingFilterStatus === "DA_HEN_LICH") {
      return isScheduledItem(item);
    }
    if (samplingFilterStatus === "CHO_LAY_MAU") {
      return isPendingSampleItem(item);
    }
    if (samplingFilterStatus === "DA_LAY_MAU") {
      return isSampledItem(item);
    }
    return true;
  });

  // Lưu chỉ số xét nghiệm và xóa cũ, insert lại toàn bộ
  const handleSaveIndicators = async () => {
    const indicators = standardIndicators.map((std) => ({
      loai: "CO_DINH",
      ma: std.ma_chi_so,
      ten: std.ten_chi_tiet_chat,
      val: indicatorValues[std.ma_nguong] ?? "",
    }));

    try {
      const res = await saveTestIndicators(code, indicators);
      if (res?.status) {
        alert(res.message);
        setModalPublishOpen(false);
        fetchSamplingRequests();
      } else {
        alert(res?.message || "Có lỗi xảy ra");
      }
    } catch (err) {
      console.error("Lỗi khi lưu chỉ số kiểm định:", err);
      alert("Lưu chỉ số kiểm định thất bại!");
    }
  };

  // chuyển sang trang chi tiết kiểm định
  const handleXemChiTietKiemDinh = (maKiemDinh) => {
    if (!maKiemDinh) {
      alert("Hồ sơ này chưa có mã kiểm định!");
      return;
    }
    navigate(`/chi-tiet-kiem-dinh?makiemdinh=${maKiemDinh}`);
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

          <div
            className="header-profile"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/trang-ca-nhan")}
            title="Xem hồ sơ cá nhân"
          >
            <div className="avatar-circle" style={{ overflow: "hidden" }}>
              {user?.anh_dai_dien ? (
                <img
                  src={`http://localhost:3000${user.anh_dai_dien}`}
                  alt="avatar"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "50%",
                  }}
                />
              ) : (
                (user?.ho_ten || "KD").slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="profile-meta">
              <span className="profile-name">
                {user?.ho_ten || "Cơ quan kiểm định"}
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

                <button
                  type="button"
                  onClick={() => setCurrentTab("inspectors")}
                  className={`nav-item-btn ${
                    currentTab === "inspectors" ? "active" : ""
                  }`}
                >
                  <Users size={20} />
                  <span>Kiểm định viên</span>
                </button>
              </nav>
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
                <span className="pulse-dot"></span>
                <span>
                  Node kiểm định: <b>Cert-Authority-VN</b>
                </span>
              </div>
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
                        {
                          publishedList.filter((p) => {
                            if (p.ket_luan !== "PASSED" || !p.ngay_cong_bo)
                              return false;
                            const d = new Date(p.ngay_cong_bo);
                            const now = new Date();
                            return (
                              d.getMonth() === now.getMonth() &&
                              d.getFullYear() === now.getFullYear()
                            );
                          }).length
                        }{" "}
                        <span className="metric-unit">Lô đạt chuẩn</span>
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
                    <p className="state-msg">Đang tải danh sách hồ sơ...</p>
                  )}

                  {error && <p className="state-msg-error">{error}</p>}

                  {!loading && !error && requests.length === 0 && (
                    <p className="state-msg">
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
                                  {formatWeight(
                                    item.so_luong_hien_tai,
                                    item.don_vi_tinh,
                                  )}
                                  )
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
                              <p className="card-desc-title">
                                Nội dung đề nghị:
                              </p>
                              <p>
                                {item.noi_dung_de_nghi ||
                                  "Không có ghi chú thêm."}
                              </p>
                            </div>

                            <div className="status-badge-wrapper">
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
                      <div className="custom-select-box select-box-sampling">
                        <select
                          className="select-control"
                          value={samplingFilterStatus}
                          onChange={(e) =>
                            setSamplingFilterStatus(e.target.value)
                          }
                        >
                          <option value="ALL">Tất cả trạng thái</option>
                          <option value="DA_HEN_LICH">Đã hẹn lịch</option>
                          <option value="CHO_LAY_MAU">Chờ lấy mẫu</option>
                          <option value="DA_LAY_MAU">Đã lấy mẫu</option>
                        </select>
                        <ChevronDown size={16} className="select-arrow-icon" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card-stack">
                  {samplingLoading && (
                    <p className="state-msg">
                      Đang tải lịch hẹn &amp; danh sách mẫu...
                    </p>
                  )}

                  {samplingError && (
                    <p className="state-msg-error">{samplingError}</p>
                  )}

                  {!samplingLoading &&
                    !samplingError &&
                    filteredSamplingList.length === 0 && (
                      <p className="state-msg">
                        Không tìm thấy hồ sơ nào phù hợp với bộ lọc hiện tại.
                      </p>
                    )}

                  {!samplingLoading &&
                    filteredSamplingList.map((item) => {
                      const farmLabel = `${item.ten_nong_trai || "Chưa rõ trang trại"}${item.ma_nong_trai ? ` (#${item.ma_nong_trai})` : ""}`;

                      // 1. TRẠNG THÁI "CHỜ LẤY MẪU" -> HIỂN THỊ NÚT "NHẬP CHỈ SỐ MẪU"
                      if (isPendingSampleItem(item)) {
                        return (
                          <div className="item-card" key={item.ma_kiem_dinh}>
                            <div className="card-left-group">
                              <div className="card-icon-bubble icon-purple">
                                <TestTube2 size={32} />
                              </div>

                              <div className="card-content-stack">
                                <div className="card-header-line">
                                  <h3 className="card-title">
                                    Mẫu {item.ten_san_pham}
                                    {item.ma_mau ? ` #${item.ma_mau}` : ""} (Lô
                                    #{item.ma_lo_nong_san})
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
                                    Ngày hẹn:{" "}
                                    <span className="text-meta-regular">
                                      {item.ngay_hen_lay_mau
                                        ? new Date(
                                            item.ngay_hen_lay_mau,
                                          ).toLocaleDateString("vi-VN")
                                        : "Chờ lấy mẫu"}
                                    </span>
                                  </p>
                                  <p>
                                    Khối lượng mẫu:{" "}
                                    <span className="text-meta-purple">
                                      {item.khoi_luong_mau || "Chờ tiếp nhận"}
                                    </span>
                                  </p>
                                  <p>
                                    Mã niêm phong:{" "}
                                    <span className="text-meta-code">
                                      {item.ma_niem_phong || "Chưa cấp seal"}
                                    </span>
                                  </p>
                                  <p>
                                    Tình trạng:{" "}
                                    <span className="text-meta-warning-state">
                                      {item.tinh_trang_cam_quan ||
                                        "Đang xét nghiệm - Chờ duyệt công bố"}
                                    </span>
                                  </p>
                                </div>

                                <div className="status-badge-wrapper">
                                  <span className="status-badge-purple">
                                    Trạng thái: Chờ lấy mẫu &amp; Xét nghiệm Lab
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
                                <span>Nhập chỉ số mẫu</span>
                              </button>
                            </div>
                          </div>
                        );
                      }

                      // 2. TRẠNG THÁI "ĐÃ LẤY MẪU" -> KIỂM TRA ĐẠT CHUẨN ĐỂ ẨN NÚT CÔNG BỐ
                      if (isSampledItem(item)) {
                        const allPassed = checkAllIndicatorsPass(item);

                        return (
                          <div
                            className="item-card"
                            key={item.ma_kiem_dinh}
                            style={{ cursor: "pointer" }}
                            onClick={() =>
                              handleXemChiTietKiemDinh(item.ma_kiem_dinh)
                            }
                          >
                            <div className="card-left-group">
                              <div
                                className={`card-icon-bubble ${
                                  allPassed ? "icon-emerald" : "icon-rose"
                                }`}
                              >
                                {allPassed ? (
                                  <Check size={32} />
                                ) : (
                                  <AlertTriangle size={32} color="#dc2626" />
                                )}
                              </div>

                              <div className="card-content-stack">
                                <div className="card-header-line">
                                  <h3 className="card-title">
                                    {item.ten_san_pham} Lô #
                                    {item.ma_lo_nong_san}
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
                                    Mã niêm phong:{" "}
                                    <span className="text-meta-code">
                                      {item.ma_niem_phong || "N/A"}
                                    </span>
                                  </p>
                                  <p>
                                    Thời gian lấy mẫu:{" "}
                                    <span className="text-meta-regular">
                                      {item.thoi_gian_lay_mau
                                        ? new Date(
                                            item.thoi_gian_lay_mau,
                                          ).toLocaleDateString("vi-VN")
                                        : "Đã lấy mẫu"}
                                    </span>
                                  </p>
                                  <p>
                                    Đánh giá kết quả:{" "}
                                    <span
                                      style={{
                                        fontWeight: 600,
                                        color: allPassed
                                          ? "#059669"
                                          : "#dc2626",
                                      }}
                                    >
                                      {allPassed
                                        ? "Đạt chuẩn an toàn (Đủ điều kiện công bố)"
                                        : "Có chỉ số vượt ngưỡng (Không đạt chuẩn)"}
                                    </span>
                                  </p>
                                </div>

                                <div className="status-badge-wrapper">
                                  <span
                                    className={
                                      allPassed
                                        ? "status-badge-emerald"
                                        : "status-badge-rose"
                                    }
                                  >
                                    {allPassed
                                      ? "Trạng thái: Đã xét nghiệm & Đạt chuẩn"
                                      : "Trạng thái: Không đạt chuẩn kiểm định"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="card-actions-row">
                              {/* Nút Sửa */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPublishModal(item);
                                }}
                                className="btn-action-edit"
                              >
                                <Edit3 size={15} />
                                <span>Sửa</span>
                              </button>

                              {/* NÚT CÔNG BỐ: ẨN KHI CÓ BẤT KỲ CHẤT NÀO KHÔNG ĐẠT */}
                              {allPassed && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenConfirmPublishModal(item);
                                  }}
                                  className="btn-action-publish"
                                >
                                  <Award size={15} />
                                  <span>Công bố</span>
                                </button>
                              )}

                              {/* NÚT CÔNG BỐ KHÔNG ĐẠT: CHỈ KHI CÓ CHỈ SỐ VƯỢT NGƯỠNG */}
                              {!allPassed &&
                                (item.danh_sach_chi_so || []).length > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenFailModal(item);
                                    }}
                                    className="btn-action-revoke"
                                  >
                                    <XCircle size={15} />
                                    <span>Công bố không đạt</span>
                                  </button>
                                )}

                              {/* Nút Yêu Cầu Thu Hồi */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenRevokeModal(item);
                                }}
                                className="btn-action-revoke"
                              >
                                <ShieldAlert size={15} />
                                <span>Yêu cầu thu hồi</span>
                              </button>
                            </div>
                          </div>
                        );
                      }

                      // 3. TRẠNG THÁI "ĐÃ HẸN LỊCH"
                      return (
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

                              <div className="status-badge-wrapper">
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
                      );
                    })}
                </div>
              </main>
            )}

            {/* TAB 3: CÔNG BỐ KẾT QUẢ */}
            {currentTab === "results" && (
              <main className="view-panel view-panel-clean">
                <div className="tab-banner-box">
                  <h2>Danh Sách Lô Hàng Đã Có Kết Luận Kiểm Định</h2>
                  <p>
                    Lô đạt chuẩn được cấp số chứng nhận và chứng thư; lô không
                    đạt được lưu kết luận để nông dân và người tiêu dùng tra
                    cứu qua mã QR.
                  </p>
                </div>

                <div className="card-stack">
                  {publishedLoading && (
                    <p className="state-msg">
                      Đang nạp danh sách công bố chứng nhận...
                    </p>
                  )}

                  {!publishedLoading && publishedList.length === 0 && (
                    <p className="state-msg">
                      Chưa có lô hàng nào được công bố kết luận.
                    </p>
                  )}

                  {!publishedLoading &&
                    publishedList.map((item) => {
                      const isPassed = item.ket_luan !== "FAILED";
                      return (
                      <div
                        className="item-card"
                        key={item.ma_kiem_dinh}
                        style={{ cursor: "pointer" }}
                        onClick={() => {
                          handleXemChiTietKiemDinh(item.ma_kiem_dinh);
                        }}
                      >
                        <div className="card-left-group">
                          <div
                            className={`card-icon-bubble ${
                              isPassed ? "icon-emerald" : "icon-rose"
                            }`}
                          >
                            {isPassed ? (
                              <BadgeCheck size={32} />
                            ) : (
                              <XCircle size={32} />
                            )}
                          </div>

                          <div className="card-content-stack">
                            <div className="card-header-line">
                              <h3 className="card-title">
                                {item.ten_san_pham}{" "}
                                {isPassed ? "Đạt Chuẩn" : "Không Đạt Chuẩn"}{" "}
                                {item.tieu_chuan_dang_ky}
                              </h3>
                              {isPassed ? (
                                <span className="pill-cert-pass">
                                  ĐẠT CHUẨN
                                </span>
                              ) : (
                                <span className="pill-cert-fail">
                                  KHÔNG ĐẠT
                                </span>
                              )}
                              {isPassed && (
                                <span className="pill-blue-cert">
                                  Số CN: {item.so_chung_nhan || "Chưa cấp"}
                                </span>
                              )}
                            </div>

                            <div className="card-meta-wrap">
                              <p>
                                Lô được cấp:{" "}
                                <span className="text-meta-green">
                                  #{item.ma_lo_nong_san}
                                </span>
                              </p>
                              <p>
                                Nông trại:{" "}
                                <span className="text-meta-regular">
                                  {item.ten_nong_trai || "Chưa rõ"}
                                </span>
                              </p>
                              <p>
                                Chủ vườn:{" "}
                                <span className="text-meta-regular">
                                  {item.ten_chu_vuon || "N/A"}
                                </span>
                              </p>
                              <p>
                                Ngày công bố:{" "}
                                <span className="text-meta-regular">
                                  {new Date(
                                    item.ngay_cong_bo || item.ngay_nop_don,
                                  ).toLocaleDateString("vi-VN")}
                                </span>
                              </p>
                              {isPassed && item.hieu_luc_tu && (
                                <p>
                                  Hiệu lực:{" "}
                                  <span className="text-meta-regular">
                                    {item.hieu_luc_tu
                                      .split("-")
                                      .reverse()
                                      .join("/")}
                                    {item.hieu_luc_den
                                      ? ` - ${item.hieu_luc_den
                                          .split("-")
                                          .reverse()
                                          .join("/")}`
                                      : ""}
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="card-actions-row">
                          {isPassed && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                exportInspectionCertificateWord(item);
                              }}
                              className="btn-light"
                            >
                              <Download size={16} />
                              <span>Tải Chứng Thư</span>
                            </button>
                          )}
                        </div>
                      </div>
                      );
                    })}
                </div>
              </main>
            )}

            {/* TAB 4: CẢNH BÁO & THU HỒI */}
            {currentTab === "violations" && (
              <main className="view-panel view-panel-clean">
                <div className="alert-box-warning">
                  <AlertTriangle size={20} className="alert-icon-warning" />
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
                    <span>Danh Sách Lô Hàng Bị Đình Chỉ / Thu Hồi</span>
                    <span className="violations-subtitle">
                      Đã cập nhật lên cổng thông tin an toàn thực phẩm
                    </span>
                  </div>

                  <div>
                    {revokedLoading && (
                      <p className="state-msg" style={{ padding: "16px" }}>
                        Đang tải danh sách thu hồi...
                      </p>
                    )}

                    {!revokedLoading && revokedList.length === 0 && (
                      <p className="state-msg" style={{ padding: "16px" }}>
                        Hiện không có hồ sơ nào bị đình chỉ hoặc thu hồi.
                      </p>
                    )}

                    {!revokedLoading &&
                      revokedList.map((item) => (
                        <div
                          className="violations-row"
                          key={item.ma_kiem_dinh}
                          onClick={handlechitietkiemdinh}
                        >
                          <div className="violations-left-group">
                            <div className="violation-avatar">
                              <X size={20} />
                            </div>
                            <div>
                              <div className="violation-title-group">
                                <span className="violation-item-title">
                                  Lô {item.ten_san_pham} #{item.ma_lo_nong_san}
                                </span>
                                <span className="badge-revoked">
                                  THU HỒI CHỨNG NHẬN
                                </span>
                              </div>
                              <p className="violation-reason-text">
                                Lý do:{" "}
                                {item.noi_dung_de_nghi ||
                                  "Phát hiện tồn dư thuốc bảo vệ thực vật vượt ngưỡng."}
                              </p>
                            </div>
                          </div>
                          <div className="violations-right-group">
                            <span className="violation-date">
                              {new Date(item.ngay_nop_don).toLocaleDateString(
                                "vi-VN",
                              )}
                            </span>
                            <span className="violation-lock-status">
                              Khóa truy xuất vĩnh viễn
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </main>
            )}
            {/* TAB 5: KIỂM ĐỊNH VIÊN */}
            {currentTab === "inspectors" && (
              <main className="view-panel">
                <div className="metrics-sticky-wrapper">
                  <div className="metrics-grid">
                    <div className="metric-card">
                      <span className="metric-label">Tổng kiểm định viên</span>
                      <p className="metric-val">
                        {inspectors.length}{" "}
                        <span className="metric-unit">Người</span>
                      </p>
                    </div>
                    <div className="metric-card">
                      <span className="metric-label">Đang hoạt động</span>
                      <p className="metric-val">
                        {activeInspectors.length}{" "}
                        <span className="metric-unit">Người</span>
                      </p>
                    </div>
                    <div className="metric-card">
                      <span className="metric-label">Hồ sơ đang phụ trách</span>
                      <p className="metric-val">
                        {inspectors.reduce((n, i) => n + i.dang_phu_trach, 0)}{" "}
                        <span className="metric-unit">Hồ sơ</span>
                      </p>
                    </div>
                    <div className="filter-actions">
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => openInspectorModal(null)}
                      >
                        <UserPlus size={15} />
                        Thêm kiểm định viên
                      </button>
                    </div>
                  </div>
                </div>

                <div className="card-stack">
                  {inspectorsLoading && inspectors.length === 0 && (
                    <p className="inspector-empty-hint">Đang tải dữ liệu...</p>
                  )}
                  {!inspectorsLoading && inspectors.length === 0 && (
                    <p className="inspector-empty-hint">
                      Chưa có kiểm định viên nào. Bấm &quot;Thêm kiểm định
                      viên&quot; để tạo mới và dùng khi phân công hồ sơ.
                    </p>
                  )}
                  {inspectors.map((item) => (
                    <div
                      key={item.ma_kiem_dinh_vien}
                      className={`item-card inspector-card ${
                        item.trang_thai === 1 ? "" : "inspector-inactive"
                      }`}
                    >
                      <div className="inspector-info">
                        <div className="inspector-name-row">
                          <h4 className="card-title">{item.ho_ten}</h4>
                          <span
                            className={
                              item.trang_thai === 1
                                ? "status-badge-emerald"
                                : "status-badge-amber"
                            }
                          >
                            {item.trang_thai === 1
                              ? "Đang hoạt động"
                              : "Tạm ngưng"}
                          </span>
                        </div>
                        <p className="inspector-role">
                          {item.chuc_vu || "Chưa cập nhật chức vụ"}
                          <span className="inspector-code">
                            {" "}
                            · {item.ma_kiem_dinh_vien}
                          </span>
                        </p>
                        <div className="inspector-contact">
                          {item.so_dien_thoai && (
                            <span>
                              <Phone size={13} /> {item.so_dien_thoai}
                            </span>
                          )}
                          {item.email && (
                            <span>
                              <Mail size={13} /> {item.email}
                            </span>
                          )}
                        </div>
                        <p className="inspector-workload">
                          Đang phụ trách <b>{item.dang_phu_trach}</b> hồ sơ ·
                          Tổng đã nhận <b>{item.tong_ho_so}</b> hồ sơ
                        </p>
                      </div>
                      <div className="card-actions-row">
                        <button
                          type="button"
                          className="btn-light"
                          onClick={() => openInspectorModal(item)}
                        >
                          <Edit3 size={14} /> Sửa
                        </button>
                        <button
                          type="button"
                          className={
                            item.trang_thai === 1
                              ? "btn-reject"
                              : "btn-primary"
                          }
                          onClick={() => handleToggleInspector(item)}
                        >
                          {item.trang_thai === 1 ? "Tạm ngưng" : "Kích hoạt"}
                        </button>
                      </div>
                    </div>
                  ))}
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
                <p className="modal-info-text">
                  Hồ sơ kiểm định:{" "}
                  <b className="modal-highlight-green">
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
                    value={selectedInspectorId}
                    onChange={(e) => setSelectedInspectorId(e.target.value)}
                    disabled={activeInspectors.length === 0}
                  >
                    {activeInspectors.length === 0 && (
                      <option value="">-- Chưa có kiểm định viên --</option>
                    )}
                    {activeInspectors.map((i) => (
                      <option
                        key={i.ma_kiem_dinh_vien}
                        value={i.ma_kiem_dinh_vien}
                      >
                        {i.ho_ten}
                        {i.chuc_vu ? ` (${i.chuc_vu})` : ""}
                        {i.dang_phu_trach > 0
                          ? ` - đang phụ trách ${i.dang_phu_trach} hồ sơ`
                          : ""}
                      </option>
                    ))}
                  </select>
                  {!inspectorsLoading && activeInspectors.length === 0 && (
                    <p className="inspector-empty-hint">
                      Cơ quan chưa có kiểm định viên đang hoạt động. Hãy thêm
                      tại mục &quot;Kiểm định viên&quot; ở thanh bên.
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label>Ghi Chú Gửi Nông Dân Chuẩn Bị</label>
                  <textarea
                    rows="2"
                    placeholder="Nhập ghi chú"
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
                  disabled={!selectedInspectorId}
                >
                  Chấp Thuận &amp; Phát Lịch Hẹn
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: THÊM / SỬA KIỂM ĐỊNH VIÊN */}
        {modalInspectorOpen && (
          <div className="modal-overlay">
            <div className="modal-dialog modal-max-md">
              <div className="modal-header">
                <h3 className="modal-title">
                  <UserPlus size={20} color="#059669" />
                  {editingInspectorId
                    ? "Cập Nhật Kiểm Định Viên"
                    : "Thêm Kiểm Định Viên"}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalInspectorOpen(false)}
                  className="btn-close-modal"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                <div className="form-group">
                  <label>Họ và tên (*)</label>
                  <input
                    type="text"
                    className="form-control-input"
                    maxLength={150}
                    placeholder="VD: KS. Nguyễn Văn A"
                    value={inspectorForm.ho_ten}
                    onChange={(e) =>
                      setInspectorForm({
                        ...inspectorForm,
                        ho_ten: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Chức vụ / Chuyên môn</label>
                  <input
                    type="text"
                    className="form-control-input"
                    maxLength={150}
                    placeholder="VD: Phòng Giám định Trồng trọt"
                    value={inspectorForm.chuc_vu}
                    onChange={(e) =>
                      setInspectorForm({
                        ...inspectorForm,
                        chuc_vu: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Số điện thoại</label>
                  <input
                    type="text"
                    className="form-control-input"
                    maxLength={20}
                    value={inspectorForm.so_dien_thoai}
                    onChange={(e) =>
                      setInspectorForm({
                        ...inspectorForm,
                        so_dien_thoai: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    className="form-control-input"
                    maxLength={150}
                    value={inspectorForm.email}
                    onChange={(e) =>
                      setInspectorForm({
                        ...inspectorForm,
                        email: e.target.value,
                      })
                    }
                  />
                </div>
                {inspectorFormError && (
                  <p className="inspector-form-error">{inspectorFormError}</p>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setModalInspectorOpen(false)}
                  className="btn-cancel"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveInspector}
                  className="btn-primary"
                  disabled={inspectorSaving}
                >
                  {inspectorSaving ? "Đang lưu..." : "Lưu"}
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
                    <b className="modal-highlight-dark">
                      {samplingData.requestCode}
                    </b>
                  </div>
                  <div>
                    Lô nông sản:{" "}
                    <b className="modal-highlight-green">
                      {samplingData.batchCode}
                    </b>
                  </div>
                  <div className="grid-col-full">
                    Đơn vị:{" "}
                    <b className="modal-highlight-dark">
                      {samplingData.farmName}
                    </b>
                  </div>
                </div>

                <div className="grid-two-cols">
                  <div className="form-group">
                    <label>Mã Túi Niêm Phong (Mã Seal QR) (*)</label>
                    <input
                      type="text"
                      value={sealCode}
                      onChange={(e) => setSealCode(e.target.value)}
                      className="form-control-input font-code-bold"
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

        {/* MODAL 3: NHẬP CHỈ SỐ MẪU TỰ ĐỘNG THEO TIÊU CHUẨN (GIỮ NGUYÊN CẤU TRÚC GỐC, KHÔNG LỖI DẤU HAI CHẤM) */}
        {modalPublishOpen && (
          <div className="modal-overlay">
            <div className="modal-dialog modal-max-xl">
              <div className="modal-header">
                <h3 className="modal-title">
                  <Award size={20} color="#059669" />
                  Nhập Chỉ Số Xét Nghiệm Chuẩn
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
                    <span className="indicators-header-title">
                      Chỉ số xét nghiệm từ Phòng Thí Nghiệm (Quy chuẩn bắt buộc)
                    </span>
                  </div>

                  {loadingStandards ? (
                    <p style={{ textAlign: "center", padding: "20px" }}>
                      Đang tải danh sách tiêu chuẩn kiểm định...
                    </p>
                  ) : standardIndicators.length === 0 ? (
                    <p
                      style={{
                        textAlign: "center",
                        padding: "20px",
                        color: "#6b7280",
                      }}
                    >
                      Không có tiêu chuẩn nào được cấu hình cho sản phẩm hoặc
                      tiêu chuẩn này.
                    </p>
                  ) : (
                    <div className="grid-two-cols">
                      {standardIndicators.map((std) => (
                        <div className="form-group" key={std.ma_nguong}>
                          <span className="indicator-field-label">
                            {std.ten_chi_tiet_chat}
                          </span>
                          <span className="indicator-threshold-hint">
                            Đạt khi: <b>{std.mo_ta_nguong}</b>
                            {std.toan_tu_so_sanh === "AM_TINH" &&
                              " — nhập “Âm tính” hoặc 0"}
                          </span>
                          <input
                            type="text"
                            value={indicatorValues[std.ma_nguong] ?? ""}
                            placeholder={
                              std.don_vi_tinh
                                ? `Nhập (${std.don_vi_tinh})`
                                : "Nhập kết quả..."
                            }
                            onChange={(e) =>
                              setIndicatorValues({
                                ...indicatorValues,
                                [std.ma_nguong]: e.target.value,
                              })
                            }
                            className="form-control-input"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Mã Số Giấy Chứng Nhận Cấp Mới:</label>
                  <input
                    type="text"
                    readOnly
                    defaultValue="VG-2026-9921"
                    className="form-control-input readonly-code-input"
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
                  <span>Ký Số &amp; Lưu Chỉ Số</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 4: POPUP YÊU CẦU THU HỒI CHỨNG NHẬN */}
        {modalRevokeOpen && revokeItem && (
          <div className="modal-overlay">
            <div className="modal-dialog modal-max-md">
              <div className="modal-header">
                <h3 className="modal-title color-danger">
                  <ShieldAlert size={20} color="#dc2626" />
                  Yêu Cầu Thu Hồi Lô Nông Sản
                </h3>
                <button
                  type="button"
                  onClick={() => setModalRevokeOpen(false)}
                  className="btn-close-modal"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                <div className="revoke-warning-card">
                  <AlertTriangle size={18} className="revoke-warning-icon" />
                  <span>
                    Hành động này sẽ tạm dừng hoặc vô hiệu hóa mã QR tem kiểm
                    định của lô hàng này trên hệ thống truy xuất!
                  </span>
                </div>

                <div className="inherited-info-card">
                  <div>
                    Mã hồ sơ:{" "}
                    <b className="modal-highlight-dark">
                      #{revokeItem.ma_ho_so}
                    </b>
                  </div>
                  <div>
                    Mã lô nông sản:{" "}
                    <b className="modal-highlight-danger">
                      #{revokeItem.ma_lo_nong_san}
                    </b>
                  </div>
                  <div className="grid-col-full">
                    Sản phẩm:{" "}
                    <b className="modal-highlight-dark">
                      {revokeItem.ten_san_pham} -{" "}
                      {revokeItem.ten_nong_trai || "Chưa rõ nông trại"}
                    </b>
                  </div>
                </div>

                <div className="form-group">
                  <label>Lý do / Mô tả chi tiết thu hồi (*)</label>
                  <textarea
                    rows="3"
                    className="form-control-textarea"
                    placeholder="Nhập lý do thu hồi kiểm định (tồn dư thuốc, vi sinh, sai phạm mã số...)"
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setModalRevokeOpen(false)}
                  className="btn-cancel"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRevoke}
                  className="btn-confirm-revoke"
                >
                  <ShieldAlert size={16} />
                  <span>Xác Nhận Kích Hoạt Thu Hồi</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 6: XÁC NHẬN CÔNG BỐ KẾT LUẬN KHÔNG ĐẠT */}
        {modalFailOpen && failItem && (
          <div className="modal-overlay">
            <div className="modal-dialog modal-max-md">
              <div className="modal-header">
                <h3 className="modal-title">
                  <XCircle size={20} color="#be123c" />
                  Công Bố Kết Luận Không Đạt
                </h3>
                <button
                  type="button"
                  onClick={() => setModalFailOpen(false)}
                  className="btn-close-modal"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                <div className="publish-confirm-info-box">
                  <p>
                    Lô hàng <b>#{failItem.ma_lo_nong_san}</b> có chỉ số vượt
                    ngưỡng tiêu chuẩn. Sau khi công bố, hồ sơ được kết luận{" "}
                    <b>KHÔNG ĐẠT</b>, không cấp chứng thư và lô không thể tạo
                    lệnh vận chuyển. Nông dân có thể gửi lại yêu cầu kiểm định
                    mới.
                  </p>
                  <div className="inherited-info-card">
                    <div className="grid-col-full">
                      Sản phẩm:{" "}
                      <b className="modal-highlight-dark">
                        {failItem.ten_san_pham} (
                        {failItem.ten_nong_trai || "Nông trại"})
                      </b>
                    </div>
                    <div className="grid-col-full">
                      Mã niêm phong:{" "}
                      <b className="modal-highlight-dark font-code">
                        {failItem.ma_niem_phong || "Chưa cấp seal"}
                      </b>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setModalFailOpen(false)}
                  className="btn-cancel"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleConfirmFail}
                  className="btn-confirm-revoke"
                >
                  <XCircle size={16} />
                  <span>Công bố không đạt</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 5: POPUP THÔNG BÁO XÁC NHẬN CÔNG BỐ KẾT QUẢ */}
        {modalConfirmPublishOpen && selectedPublishItem && (
          <div className="modal-overlay">
            <div className="modal-dialog modal-max-md">
              <div className="modal-header">
                <h3 className="modal-title">
                  <Award size={20} color="#047857" />
                  Xác Nhận Công Bố Chứng Nhận
                </h3>
                <button
                  type="button"
                  onClick={() => setModalConfirmPublishOpen(false)}
                  className="btn-close-modal"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                <div className="publish-confirm-info-box">
                  <p>
                    Bạn đang chuẩn bị tiến hành công bố chứng nhận kiểm định cho
                    lô hàng sau:
                  </p>
                  <div className="inherited-info-card">
                    <div>
                      Lô hàng:{" "}
                      <b className="modal-highlight-green">
                        #{selectedPublishItem.ma_lo_nong_san}
                      </b>
                    </div>
                    <div>
                      Mẫu kiểm định:{" "}
                      <b className="modal-highlight-dark">
                        {selectedPublishItem.ma_mau || "N/A"}
                      </b>
                    </div>
                    <div className="grid-col-full">
                      Sản phẩm:{" "}
                      <b className="modal-highlight-dark">
                        {selectedPublishItem.ten_san_pham} (
                        {selectedPublishItem.ten_nong_trai || "Nông trại"})
                      </b>
                    </div>
                    <div className="grid-col-full">
                      Mã niêm phong:{" "}
                      <b className="modal-highlight-dark font-code">
                        {selectedPublishItem.ma_niem_phong || "Chưa cấp seal"}
                      </b>
                    </div>
                  </div>
                </div>

                <p className="publish-guide-note">
                  Nhấn <b>"Công bố kết quả"</b> để phê duyệt và đưa kết quả kiểm
                  định chính thức lên hệ thống.
                </p>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setModalConfirmPublishOpen(false)}
                  className="btn-cancel"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPublish}
                  className="btn-action-publish"
                >
                  <FileCheck2 size={16} />
                  <span>Công bố kết quả</span>
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
