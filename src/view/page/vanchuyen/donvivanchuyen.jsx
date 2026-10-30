import React, { useState, useEffect, useCallback } from "react";
import usePersistentTab from "../../../hooks/usePersistentTab";
import { useNavigate } from "react-router-dom";
import {
  Truck,
  PackageCheck,
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
  Wallet,
  Users,
  Pencil,
  Trash2,
  MoreVertical,
} from "lucide-react";
import "../../css/donvivanchuyen.css";
import BlockchainPanel from "../blockchainpannel";
import { kyCacSuKienDangCho } from "../../../api/blockchainApi";
import {
  fetchMyTrips,
  acceptTrip,
  rejectTrip,
  confirmPickup,
  confirmArrival,
  fetchDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
  fetchVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} from "../../../api/donvivanchuyenApi";

const DEFAULT_LOGO_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png";

const STATUS_LABEL = {
  CHO_CHAP_NHAN: { text: "Chờ chấp nhận", tone: "amber", icon: Clock },
  CHO_LAY_HANG: { text: "Chờ lấy hàng", tone: "amber", icon: PackageSearch },
  DANG_VAN_CHUYEN: { text: "Đang vận chuyển", tone: "blue", icon: Navigation },
  CHO_TIEP_NHAN: {
    text: "Đã đến nơi - Chờ bên nhận xác nhận",
    tone: "emerald",
    icon: ClipboardCheck,
  },
  HOAN_THANH: { text: "Đã hoàn thành", tone: "success", icon: CheckCircle2 },
  TU_CHOI: { text: "Đã từ chối", tone: "danger", icon: XCircle },
  DA_HUY: { text: "Đã hủy", tone: "danger", icon: XCircle },
};

const formatWeight = (value, unit) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return `- ${unit || ""}`;

  if ((unit || "").toLowerCase() === "kg" && num >= 1000) {
    const tons = num / 1000;
    return `${tons.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} Tấn`;
  }

  return `${num.toLocaleString("vi-VN", { maximumFractionDigits: 3 })} ${unit || ""}`;
};

const tripRoute = (t) =>
  `${t.ten_nguoi_gui || "—"} ➔ ${t.ten_ben_nhan || t.dia_chi_giao_hang || "—"}`;

const TEN_CHO_KY = {
  LAY_HANG: "Chờ ký lấy hàng",
  DEN_NOI: "Chờ ký đến nơi",
  TU_CHOI: "Chờ ký từ chối",
};

const BadgeChoKy = ({ text }) => (
  <span
    style={{
      display: "inline-block",
      fontSize: 12.5,
      fontWeight: 600,
      color: "#b45309",
      background: "#fffbeb",
      border: "1px solid #fde68a",
      borderRadius: 999,
      padding: "3px 10px",
      marginLeft: 8,
    }}
  >
    {text}
  </span>
);

const EMPTY_DRIVER = {
  ho_ten: "",
  so_dien_thoai: "",
  so_giay_phep: "",
  hang_bang: "",
};
const EMPTY_VEHICLE = { bien_so: "", loai_xe: "", tai_trong_kg: "" };

export default function AgriChainLogistics() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentTab, setCurrentTab] = usePersistentTab(
    "vanchuyen",
    "shipping",
    ["shipping", "pickup", "delivery", "fleet", "blockchain"],
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Dropdown menu của từng thẻ chuyến xe
  const [openDropdown, setOpenDropdown] = useState(null);

  const [acceptModalTrip, setAcceptModalTrip] = useState(null);
  const [acceptForm, setAcceptForm] = useState({
    ma_tai_xe: "",
    ma_phuong_tien: "",
  });

  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [driverForm, setDriverForm] = useState(EMPTY_DRIVER);
  const [editingDriver, setEditingDriver] = useState(null);
  const [vehicleForm, setVehicleForm] = useState(EMPTY_VEHICLE);
  const [editingVehicle, setEditingVehicle] = useState(null);

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

  // Đóng dropdown khi nhấp chuột ra ngoài
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

  const handleToggleMenu = (e, maVanDon) => {
    e.stopPropagation();
    setOpenDropdown((prev) => (prev === maVanDon ? null : maVanDon));
  };

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

  const taiLaiNgam = useCallback(async () => {
    try {
      const res = await fetchMyTrips();
      setTrips(res?.data || []);
    } catch {
      /* giữ danh sách cũ */
    }
  }, []);

  useEffect(() => {
    if (user && currentTab !== "blockchain") taiLaiNgam();
  }, [currentTab, user, taiLaiNgam]);

  useEffect(() => {
    if (!user) return undefined;
    const lamMoi = () => {
      if (document.visibilityState === "visible") taiLaiNgam();
    };
    window.addEventListener("focus", lamMoi);
    document.addEventListener("visibilitychange", lamMoi);
    const timer = setInterval(lamMoi, 10000);
    return () => {
      window.removeEventListener("focus", lamMoi);
      document.removeEventListener("visibilitychange", lamMoi);
      clearInterval(timer);
    };
  }, [user, taiLaiNgam]);

  const coChuyenChoKy = trips.some((t) => t.cho_ky);
  useEffect(() => {
    if (!coChuyenChoKy) return undefined;
    const timer = setInterval(taiLaiNgam, 5000);
    return () => clearInterval(timer);
  }, [coChuyenChoKy, taiLaiNgam]);

  const kySauThaoTac = async (loiBao) => {
    try {
      const kq = await kyCacSuKienDangCho();
      if (kq.soDaKy > 0) {
        await loadTrips();
        alert(
          `${loiBao}\nĐã ký ${kq.soDaKy} sự kiện lên blockchain, chuyến đã chuyển sang bước tiếp theo.`,
        );
      } else {
        alert(
          `${loiBao}\nChưa ký được: ${kq.lyDo}.\nChuyến giữ nguyên bước hiện tại; bấm lại nút để ký.`,
        );
      }
    } catch (loi) {
      const lyDo =
        loi?.code === "ACTION_REJECTED" || loi?.code === 4001
          ? "bạn đã từ chối trong MetaMask"
          : loi?.reason || loi?.shortMessage || loi?.message;
      alert(
        `${loiBao}\nChưa ký được (${lyDo}).\nChuyến giữ nguyên bước hiện tại; bấm lại nút để ký.`,
      );
    }
    await loadTrips();
  };

  const chanNeuBenGuiChuaKy = (trip) => {
    if (!trip.chua_ky_lenh) return false;
    alert(
      `Bên gửi (${trip.ten_nguoi_gui || "—"}) chưa ký xác nhận lấy hàng đi cho chuyến ${trip.ma_van_don} lên blockchain.\nHãy chờ bên gửi ký xong rồi mới bấm lấy hàng đi.${
        trip.ly_do_chua_ky_lenh ? `\n\n${trip.ly_do_chua_ky_lenh}` : ""
      }`,
    );
    return true;
  };

  // ==================== QUẢN LÝ TÀI XẾ & PHƯƠNG TIỆN ====================

  const loadFleet = useCallback(async () => {
    try {
      const [d, v] = await Promise.all([fetchDrivers(), fetchVehicles()]);
      const dsTaiXe = d?.data || [];
      const dsXe = v?.data || [];
      setDrivers(dsTaiXe);
      setVehicles(dsXe);
      return { drivers: dsTaiXe, vehicles: dsXe };
    } catch (err) {
      alert(err.message || "Không thể tải danh sách tài xế / phương tiện");
      return null;
    }
  }, []);

  useEffect(() => {
    if (user && currentTab === "fleet") loadFleet();
  }, [user, currentTab, loadFleet]);

  const handleSaveDriver = async () => {
    if (!driverForm.ho_ten.trim()) {
      alert("Vui lòng nhập họ tên tài xế!");
      return;
    }
    try {
      const payload = {
        ho_ten: driverForm.ho_ten.trim(),
        so_dien_thoai: driverForm.so_dien_thoai.trim(),
        so_giay_phep: driverForm.so_giay_phep.trim(),
        hang_bang: driverForm.hang_bang.trim(),
      };
      const res = editingDriver
        ? await updateDriver(editingDriver, payload)
        : await createDriver(payload);
      setDriverForm(EMPTY_DRIVER);
      setEditingDriver(null);
      await loadFleet();
      alert(res?.message || "Đã lưu tài xế");
    } catch (err) {
      alert(err.message || "Không thể lưu tài xế");
    }
  };

  const handleEditDriver = (d) => {
    setEditingDriver(d.ma_tai_xe);
    setDriverForm({
      ho_ten: d.ho_ten || "",
      so_dien_thoai: d.so_dien_thoai || "",
      so_giay_phep: d.so_giay_phep || "",
      hang_bang: d.hang_bang || "",
    });
  };

  const handleDeleteDriver = async (d) => {
    if (!window.confirm(`Xóa tài xế ${d.ho_ten} khỏi danh sách?`)) return;
    try {
      await deleteDriver(d.ma_tai_xe);
      if (editingDriver === d.ma_tai_xe) {
        setEditingDriver(null);
        setDriverForm(EMPTY_DRIVER);
      }
      await loadFleet();
    } catch (err) {
      alert(err.message || "Không thể xóa tài xế");
    }
  };

  const handleSaveVehicle = async () => {
    if (!vehicleForm.bien_so.trim()) {
      alert("Vui lòng nhập biển số xe!");
      return;
    }
    try {
      const payload = {
        bien_so: vehicleForm.bien_so.trim(),
        loai_xe: vehicleForm.loai_xe.trim(),
        tai_trong_kg:
          vehicleForm.tai_trong_kg === ""
            ? ""
            : Number(vehicleForm.tai_trong_kg),
      };
      const res = editingVehicle
        ? await updateVehicle(editingVehicle, payload)
        : await createVehicle(payload);
      setVehicleForm(EMPTY_VEHICLE);
      setEditingVehicle(null);
      await loadFleet();
      alert(res?.message || "Đã lưu phương tiện");
    } catch (err) {
      alert(err.message || "Không thể lưu phương tiện");
    }
  };

  const handleEditVehicle = (v) => {
    setEditingVehicle(v.ma_phuong_tien);
    setVehicleForm({
      bien_so: v.bien_so || "",
      loai_xe: v.loai_xe || "",
      tai_trong_kg:
        v.tai_trong_kg === null || v.tai_trong_kg === undefined
          ? ""
          : String(Number(v.tai_trong_kg)),
    });
  };

  const handleDeleteVehicle = async (v) => {
    if (!window.confirm(`Xóa phương tiện ${v.bien_so} khỏi danh sách?`)) return;
    try {
      await deleteVehicle(v.ma_phuong_tien);
      if (editingVehicle === v.ma_phuong_tien) {
        setEditingVehicle(null);
        setVehicleForm(EMPTY_VEHICLE);
      }
      await loadFleet();
    } catch (err) {
      alert(err.message || "Không thể xóa phương tiện");
    }
  };

  // ==================== CHẤP NHẬN / TỪ CHỐI ====================

  const handleOpenAccept = async (trip) => {
    setOpenDropdown(null);
    const ds = await loadFleet();
    if (!ds) return;
    if (ds.drivers.length === 0 || ds.vehicles.length === 0) {
      const thieu =
        ds.drivers.length === 0 && ds.vehicles.length === 0
          ? "tài xế và phương tiện"
          : ds.drivers.length === 0
            ? "tài xế"
            : "phương tiện";
      alert(
        `Bạn chưa có ${thieu} nào trong danh sách.\nHãy thêm ở mục "Tài xế & phương tiện" rồi quay lại chấp nhận chuyến.`,
      );
      setCurrentTab("fleet");
      return;
    }
    setAcceptModalTrip(trip);
    setAcceptForm({ ma_tai_xe: "", ma_phuong_tien: "" });
  };

  const handleSubmitAccept = async () => {
    if (!acceptForm.ma_tai_xe || !acceptForm.ma_phuong_tien) {
      alert("Vui lòng chọn tài xế và phương tiện phụ trách từ danh sách!");
      return;
    }
    try {
      await acceptTrip(
        acceptModalTrip.ma_van_don,
        acceptForm.ma_tai_xe,
        acceptForm.ma_phuong_tien,
      );
      setAcceptModalTrip(null);
      await loadTrips();
      alert(`Đã chấp nhận chuyến ${acceptModalTrip.ma_van_don}!`);
    } catch (err) {
      alert(err.message || "Không thể chấp nhận chuyến");
    }
  };

  const handleOpenReject = async (trip) => {
    setOpenDropdown(null);
    if (trip.cho_ky === "TU_CHOI") {
      await kySauThaoTac(`Chuyến ${trip.ma_van_don} đang chờ ký từ chối.`);
      return;
    }
    setRejectModalTrip(trip);
    setRejectReason("");
  };

  const handleSubmitReject = async () => {
    if (!rejectReason.trim()) {
      alert("Vui lòng nhập lý do từ chối!");
      return;
    }
    try {
      const kq = await rejectTrip(
        rejectModalTrip.ma_van_don,
        rejectReason.trim(),
      );
      const ma = rejectModalTrip.ma_van_don;
      setRejectModalTrip(null);
      await loadTrips();
      if (kq?.cho_ky) await kySauThaoTac(`Chuyến ${ma}: ${kq.message}`);
      else alert(kq?.message || "Đã từ chối chuyến vận chuyển");
    } catch (err) {
      alert(err.message || "Không thể từ chối chuyến");
    }
  };

  // ==================== LẤY HÀNG ====================

  const handleOpenPickup = async (trip) => {
    setOpenDropdown(null);
    let hienTai = trip;
    if (trip.chua_ky_lenh) {
      try {
        const res = await fetchMyTrips();
        const ds = res?.data || [];
        setTrips(ds);
        hienTai = ds.find((t) => t.ma_van_don === trip.ma_van_don) || trip;
      } catch {
        /* giữ trạng thái đang có */
      }
    }
    if (chanNeuBenGuiChuaKy(hienTai)) return;
    trip = hienTai;
    if (trip.cho_ky === "LAY_HANG") {
      await kySauThaoTac(
        `Chuyến ${trip.ma_van_don} đang chờ ký xác nhận lấy hàng.`,
      );
      return;
    }
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
      const kq = await confirmPickup(pickupModalTrip.ma_van_don, value);
      const ma = pickupModalTrip.ma_van_don;
      setPickupModalTrip(null);
      await loadTrips();
      if (kq?.cho_ky) await kySauThaoTac(`Chuyến ${ma}: ${kq.message}`);
      else alert(`Đã xác nhận lấy hàng chuyến ${ma}, xe bắt đầu vận chuyển!`);
    } catch (err) {
      alert(err.message || "Không thể xác nhận lấy hàng");
    }
  };

  // ==================== ĐẾN NƠI ====================

  const handleConfirmArrival = async (trip) => {
    setOpenDropdown(null);
    if (trip.cho_ky === "DEN_NOI") {
      await kySauThaoTac(
        `Chuyến ${trip.ma_van_don} đang chờ ký xác nhận đến nơi.`,
      );
      return;
    }
    if (
      !window.confirm(
        `Xác nhận xe đã đến điểm giao cho chuyến ${trip.ma_van_don}?`,
      )
    )
      return;
    try {
      const kq = await confirmArrival(trip.ma_van_don);
      await loadTrips();
      if (kq?.cho_ky)
        await kySauThaoTac(`Chuyến ${trip.ma_van_don}: ${kq.message}`);
      else alert("Đã xác nhận đến nơi. Chờ bên nhận xác nhận tiếp nhận.");
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
      "Mã Chuyến",
      "Mã Lô",
      "Sản Phẩm",
      "Người Gửi",
      "Bên Nhận",
      "Tài Xế",
      "Biển Số",
      "Khối Lượng",
      "Trạng Thái",
    ];
    const rows = dataList.map((t) => [
      t.ma_van_don,
      t.ma_lo_nong_san,
      `"${t.ten_san_pham}"`,
      `"${t.ten_nguoi_gui || ""}"`,
      `"${t.ten_ben_nhan || t.dia_chi_giao_hang || ""}"`,
      `"${t.ten_tai_xe || ""}"`,
      t.bien_so_xe || "",
      `"${formatWeight(t.khoi_luong, t.don_vi_tinh)}"`,
      t.trang_thai,
    ]);
    const csvContent =
      "﻿" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
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

    const matchesStatus =
      statusFilter === "all" ? true : t.trang_thai === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pickupTrips = trips.filter((t) => t.trang_thai === "CHO_LAY_HANG");
  const pickupHistory = trips.filter((t) =>
    ["DANG_VAN_CHUYEN", "CHO_TIEP_NHAN", "HOAN_THANH"].includes(t.trang_thai),
  );
  const deliveryTrips = trips.filter((t) => t.trang_thai === "DANG_VAN_CHUYEN");
  const deliveryHistory = trips.filter((t) =>
    ["CHO_TIEP_NHAN", "HOAN_THANH"].includes(t.trang_thai),
  );

  if (!user) return null;

  return (
    <div className="vanchuyen">
      <div className="app-container">
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
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "50%",
                  }}
                />
              ) : (
                (user.ho_ten || "VC").slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="profile-meta">
              <span className="profile-name">
                {user.ho_ten || "Đơn vị vận chuyển"}
              </span>
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
              <button
                onClick={() => setCurrentTab("fleet")}
                className={`nav-item ${currentTab === "fleet" ? "active" : ""}`}
              >
                <Users size={20} />
                <span>Tài xế & phương tiện</span>
              </button>
              <button
                onClick={() => setCurrentTab("blockchain")}
                className={`nav-item ${currentTab === "blockchain" ? "active" : ""}`}
              >
                <Wallet size={20} />
                <span>Ký blockchain</span>
              </button>
            </nav>

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
              <div
                style={{
                  background: "#fef2f2",
                  color: "#dc2626",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  margin: "16px",
                }}
              >
                {errorMsg}
              </div>
            )}

            {loading ? (
              <div
                style={{
                  padding: "48px",
                  textAlign: "center",
                  color: "#6b7280",
                }}
              >
                Đang tải dữ liệu...
              </div>
            ) : (
              <>
                {currentTab === "blockchain" && (
                  <div className="blockchain-tab-wrapper">
                    <p className="blockchain-tab-desc">
                      Đơn vị vận chuyển ký các bước: lấy hàng, giao tới nơi, từ
                      chối chuyến, chở trả hàng bị từ chối. Các bước của một lô
                      ký theo thứ tự, nên có bước phải chờ bên gửi ký tạo lệnh
                      trước.
                    </p>
                    <div className="blockchain-panel-full">
                      <BlockchainPanel thongBaoBangAlert onDaKy={taiLaiNgam} />
                    </div>
                  </div>
                )}

                {currentTab === "fleet" && (
                  <div className="fleet-wrap">
                    <p className="fleet-desc">
                      Danh sách tài xế và phương tiện của đơn vị. Khi chấp nhận
                      chuyến chỉ cần chọn từ danh sách này, không phải nhập tay;
                      bên gửi cũng không nhập tài xế hay biển số.
                    </p>

                    <div className="fleet-grid">
                      {/* ===== TÀI XẾ ===== */}
                      <section className="fleet-card">
                        <div className="fleet-card-head">
                          <h3>
                            <Users size={18} /> Tài xế ({drivers.length})
                          </h3>
                        </div>

                        <div className="fleet-form">
                          <div className="form-row-2">
                            <div className="form-group">
                              <label>Họ tên (*)</label>
                              <input
                                className="form-input"
                                value={driverForm.ho_ten}
                                onChange={(e) =>
                                  setDriverForm({
                                    ...driverForm,
                                    ho_ten: e.target.value,
                                  })
                                }
                                placeholder="Nguyễn Văn Hùng"
                              />
                            </div>
                            <div className="form-group">
                              <label>Số điện thoại</label>
                              <input
                                className="form-input"
                                value={driverForm.so_dien_thoai}
                                onChange={(e) =>
                                  setDriverForm({
                                    ...driverForm,
                                    so_dien_thoai: e.target.value,
                                  })
                                }
                                placeholder="0901234567"
                              />
                            </div>
                          </div>
                          <div className="form-row-2">
                            <div className="form-group">
                              <label>Số giấy phép lái xe</label>
                              <input
                                className="form-input"
                                value={driverForm.so_giay_phep}
                                onChange={(e) =>
                                  setDriverForm({
                                    ...driverForm,
                                    so_giay_phep: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="form-group">
                              <label>Hạng bằng</label>
                              <input
                                className="form-input"
                                value={driverForm.hang_bang}
                                onChange={(e) =>
                                  setDriverForm({
                                    ...driverForm,
                                    hang_bang: e.target.value,
                                  })
                                }
                                placeholder="C, FC..."
                              />
                            </div>
                          </div>
                          <div className="fleet-form-actions">
                            {editingDriver && (
                              <button
                                className="btn-cancel"
                                onClick={() => {
                                  setEditingDriver(null);
                                  setDriverForm(EMPTY_DRIVER);
                                }}
                              >
                                Hủy sửa
                              </button>
                            )}
                            <button
                              className="btn-primary"
                              onClick={handleSaveDriver}
                            >
                              <Plus size={15} />
                              <span>
                                {editingDriver ? "Lưu tài xế" : "Thêm tài xế"}
                              </span>
                            </button>
                          </div>
                        </div>

                        <table className="fleet-table">
                          <thead>
                            <tr>
                              <th>Mã</th>
                              <th>Họ tên</th>
                              <th>SĐT</th>
                              <th>GPLX</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {drivers.length === 0 && (
                              <tr>
                                <td colSpan={5} className="fleet-empty">
                                  Chưa có tài xế nào.
                                </td>
                              </tr>
                            )}
                            {drivers.map((d) => (
                              <tr key={d.ma_tai_xe}>
                                <td>{d.ma_tai_xe}</td>
                                <td>
                                  <b>{d.ho_ten}</b>
                                  {d.dang_chay_chuyen && (
                                    <span className="fleet-busy">
                                      Đang chạy {d.dang_chay_chuyen}
                                    </span>
                                  )}
                                </td>
                                <td>{d.so_dien_thoai || "—"}</td>
                                <td>
                                  {[d.hang_bang, d.so_giay_phep]
                                    .filter(Boolean)
                                    .join(" - ") || "—"}
                                </td>
                                <td className="fleet-row-actions">
                                  <button
                                    title="Sửa"
                                    onClick={() => handleEditDriver(d)}
                                  >
                                    <Pencil size={15} />
                                  </button>
                                  <button
                                    title="Xóa"
                                    className="danger"
                                    onClick={() => handleDeleteDriver(d)}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </section>

                      {/* ===== PHƯƠNG TIỆN ===== */}
                      <section className="fleet-card">
                        <div className="fleet-card-head">
                          <h3>
                            <Truck size={18} /> Phương tiện ({vehicles.length})
                          </h3>
                        </div>

                        <div className="fleet-form">
                          <div className="form-row-2">
                            <div className="form-group">
                              <label>Biển số xe (*)</label>
                              <input
                                className="form-input"
                                value={vehicleForm.bien_so}
                                onChange={(e) =>
                                  setVehicleForm({
                                    ...vehicleForm,
                                    bien_so: e.target.value,
                                  })
                                }
                                placeholder="65C-128.45"
                              />
                            </div>
                            <div className="form-group">
                              <label>Loại xe</label>
                              <input
                                className="form-input"
                                value={vehicleForm.loai_xe}
                                onChange={(e) =>
                                  setVehicleForm({
                                    ...vehicleForm,
                                    loai_xe: e.target.value,
                                  })
                                }
                                placeholder="Xe tải đông lạnh"
                              />
                            </div>
                          </div>
                          <div className="form-group">
                            <label>Tải trọng (kg)</label>
                            <input
                              className="form-input"
                              type="number"
                              min="0"
                              value={vehicleForm.tai_trong_kg}
                              onChange={(e) =>
                                setVehicleForm({
                                  ...vehicleForm,
                                  tai_trong_kg: e.target.value,
                                })
                              }
                              placeholder="5000"
                            />
                          </div>
                          <div className="fleet-form-actions">
                            {editingVehicle && (
                              <button
                                className="btn-cancel"
                                onClick={() => {
                                  setEditingVehicle(null);
                                  setVehicleForm(EMPTY_VEHICLE);
                                }}
                              >
                                Hủy sửa
                              </button>
                            )}
                            <button
                              className="btn-primary"
                              onClick={handleSaveVehicle}
                            >
                              <Plus size={15} />
                              <span>
                                {editingVehicle
                                  ? "Lưu phương tiện"
                                  : "Thêm phương tiện"}
                              </span>
                            </button>
                          </div>
                        </div>

                        <table className="fleet-table">
                          <thead>
                            <tr>
                              <th>Mã</th>
                              <th>Biển số</th>
                              <th>Loại xe</th>
                              <th>Tải trọng</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {vehicles.length === 0 && (
                              <tr>
                                <td colSpan={5} className="fleet-empty">
                                  Chưa có phương tiện nào.
                                </td>
                              </tr>
                            )}
                            {vehicles.map((v) => (
                              <tr key={v.ma_phuong_tien}>
                                <td>{v.ma_phuong_tien}</td>
                                <td>
                                  <b>{v.bien_so}</b>
                                  {v.dang_chay_chuyen && (
                                    <span className="fleet-busy">
                                      Đang chạy {v.dang_chay_chuyen}
                                    </span>
                                  )}
                                </td>
                                <td>{v.loai_xe || "—"}</td>
                                <td>
                                  {v.tai_trong_kg === null ||
                                  v.tai_trong_kg === undefined
                                    ? "—"
                                    : `${Number(v.tai_trong_kg).toLocaleString("vi-VN")} kg`}
                                </td>
                                <td className="fleet-row-actions">
                                  <button
                                    title="Sửa"
                                    onClick={() => handleEditVehicle(v)}
                                  >
                                    <Pencil size={15} />
                                  </button>
                                  <button
                                    title="Xóa"
                                    className="danger"
                                    onClick={() => handleDeleteVehicle(v)}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </section>
                    </div>
                  </div>
                )}

                {/* TAB 1: QUẢN LÝ VẬN CHUYỂN */}
                {currentTab === "shipping" && (
                  <main className="view-container">
                    <div className="metrics-row">
                      <div className="metric-card">
                        <div className="metric-title">Đơn chờ chấp nhận</div>
                        <div className="metric-number">
                          {
                            trips.filter(
                              (t) => t.trang_thai === "CHO_CHAP_NHAN",
                            ).length
                          }
                          <span className="metric-unit">ĐƠN CHỜ NHẬN</span>
                        </div>
                      </div>

                      <div className="metric-card">
                        <div className="metric-title">Đơn chờ lấy hàng</div>
                        <div className="metric-number">
                          {
                            trips.filter((t) => t.trang_thai === "CHO_LAY_HANG")
                              .length
                          }
                          <span className="metric-unit">ĐƠN SẴN SÀNG</span>
                        </div>
                      </div>

                      <div className="metric-card">
                        <div className="metric-title">Chuyến xe đang chạy</div>
                        <div className="metric-number">
                          {
                            trips.filter(
                              (t) => t.trang_thai === "DANG_VAN_CHUYEN",
                            ).length
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
                          <option value="CHO_CHAP_NHAN">Chờ chấp nhận</option>
                          <option value="CHO_LAY_HANG">Chờ lấy hàng</option>
                          <option value="DANG_VAN_CHUYEN">
                            Đang vận chuyển
                          </option>
                          <option value="CHO_TIEP_NHAN">
                            Chờ bên nhận xác nhận
                          </option>
                          <option value="HOAN_THANH">Đã hoàn thành</option>
                          <option value="TU_CHOI">Đã từ chối</option>
                        </select>
                      </div>
                    </div>

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
                          <AlertCircle
                            size={36}
                            style={{ margin: "0 auto 10px", color: "#9ca3af" }}
                          />
                          Không có chuyến vận chuyển nào phù hợp với bộ lọc hiện
                          tại.
                        </div>
                      ) : (
                        filteredTrips.map((trip) => {
                          const statusInfo =
                            STATUS_LABEL[trip.trang_thai] ||
                            STATUS_LABEL.CHO_CHAP_NHAN;
                          const StatusIcon = statusInfo.icon;
                          const isMenuOpen = openDropdown === trip.ma_van_don;

                          return (
                            <div
                              key={trip.ma_van_don}
                              className={`trip-card ${isMenuOpen ? "has-open-menu" : ""}`}
                            >
                              <div className="trip-card-left">
                                <div
                                  className={`icon-avatar ${
                                    trip.trang_thai === "DANG_VAN_CHUYEN"
                                      ? "blue"
                                      : trip.trang_thai === "CHO_CHAP_NHAN"
                                        ? "amber"
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
                                    <span className="tag-gray">
                                      #{trip.ma_van_don}
                                    </span>
                                    <span className="tag-green">
                                      Mã lô: {trip.ma_lo_nong_san}
                                    </span>
                                  </div>

                                  <div className="trip-meta-row">
                                    <p>
                                      Xe tải & Tài xế:{" "}
                                      <span className="meta-val">
                                        {trip.bien_so_xe || "Chưa phân công"} (
                                        {trip.ten_tai_xe || "Chưa phân công"})
                                      </span>
                                    </p>
                                    <p>
                                      Lộ trình:{" "}
                                      <span className="meta-val">
                                        {tripRoute(trip)}
                                      </span>
                                    </p>
                                    <p>
                                      Khối lượng hàng:{" "}
                                      <span className="highlight-weight">
                                        {formatWeight(
                                          trip.khoi_luong,
                                          trip.don_vi_tinh,
                                        )}
                                      </span>
                                    </p>
                                    <p>
                                      Thời gian xuất:{" "}
                                      <span className="meta-val">
                                        {trip.thoi_gian_xuat}
                                      </span>
                                    </p>
                                  </div>

                                  <div>
                                    <span
                                      className={`status-badge-${statusInfo.tone}`}
                                    >
                                      <StatusIcon
                                        size={13}
                                        style={{ marginRight: "4px" }}
                                      />
                                      {statusInfo.text}
                                    </span>
                                    {trip.cho_ky && (
                                      <BadgeChoKy
                                        text={TEN_CHO_KY[trip.cho_ky]}
                                      />
                                    )}
                                    {trip.chua_ky_lenh && (
                                      <BadgeChoKy text="Chờ bên gửi ký xác nhận lấy hàng đi" />
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="trip-card-actions">
                                <div className="dropdown-container">
                                  <button
                                    type="button"
                                    className="btn-more-dots"
                                    title="Tùy chọn thao tác"
                                    onClick={(e) =>
                                      handleToggleMenu(e, trip.ma_van_don)
                                    }
                                  >
                                    <MoreVertical size={18} />
                                  </button>

                                  {isMenuOpen && (
                                    <div className="dropdown-menu">
                                      <div
                                        className="dropdown-item"
                                        onClick={() => {
                                          setOpenDropdown(null);
                                          setDetailTrip(trip);
                                        }}
                                      >
                                        <Eye size={15} />
                                        <span>Xem chi tiết</span>
                                      </div>

                                      {trip.trang_thai === "CHO_CHAP_NHAN" && (
                                        <>
                                          <div className="dropdown-divider"></div>
                                          <div
                                            className="dropdown-item"
                                            style={{ color: "#16a34a" }}
                                            onClick={() =>
                                              handleOpenAccept(trip)
                                            }
                                          >
                                            <CheckCircle2 size={15} />
                                            <span>Chấp nhận vận chuyển</span>
                                          </div>
                                          <div
                                            className="dropdown-item danger"
                                            onClick={() =>
                                              handleOpenReject(trip)
                                            }
                                          >
                                            <XCircle size={15} />
                                            <span>Từ chối</span>
                                          </div>
                                        </>
                                      )}

                                      {trip.trang_thai === "CHO_LAY_HANG" && (
                                        <>
                                          <div className="dropdown-divider"></div>
                                          <div
                                            className="dropdown-item"
                                            style={{ color: "#2563eb" }}
                                            onClick={() =>
                                              handleOpenPickup(trip)
                                            }
                                          >
                                            <ArrowUpRight size={15} />
                                            <span>Xác nhận lấy hàng đi</span>
                                          </div>
                                        </>
                                      )}

                                      {trip.trang_thai ===
                                        "DANG_VAN_CHUYEN" && (
                                        <>
                                          <div className="dropdown-divider"></div>
                                          <div
                                            className="dropdown-item"
                                            style={{ color: "#16a34a" }}
                                            onClick={() =>
                                              handleConfirmArrival(trip)
                                            }
                                          >
                                            <CheckCircle size={15} />
                                            <span>Xác nhận đã đến nơi</span>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
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
                  <main
                    className="view-container"
                    style={{ overflowY: "auto", paddingBottom: "36px" }}
                  >
                    <div className="section-header-box">
                      <div>
                        <h2>Biên Bản Nhận Hàng & Xuất Phát</h2>
                        <p>
                          Các chuyến đã được chấp nhận, đang chờ xe đến lấy hàng
                          tại điểm gửi.
                        </p>
                      </div>
                    </div>

                    {pickupTrips.length === 0 ? (
                      <div
                        className="section-card"
                        style={{
                          textAlign: "center",
                          padding: "32px",
                          color: "#6b7280",
                        }}
                      >
                        Không có chuyến nào đang chờ lấy hàng.
                      </div>
                    ) : (
                      pickupTrips.map((trip) => (
                        <div
                          className="section-card"
                          key={trip.ma_van_don}
                          style={{ marginBottom: "12px" }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <p style={{ fontWeight: 700, color: "#1f2937" }}>
                                {trip.ten_san_pham} (#{trip.ma_lo_nong_san} -{" "}
                                {formatWeight(
                                  trip.khoi_luong,
                                  trip.don_vi_tinh,
                                )}
                                )
                              </p>
                              <p style={{ color: "#6b7280", fontSize: "13px" }}>
                                Lấy từ: {trip.ten_nguoi_gui} ➔ Tài xế{" "}
                                {trip.ten_tai_xe} ({trip.bien_so_xe})
                                {trip.cho_ky && (
                                  <BadgeChoKy text={TEN_CHO_KY[trip.cho_ky]} />
                                )}
                                {trip.chua_ky_lenh && (
                                  <BadgeChoKy text="Chờ bên gửi ký xác nhận lấy hàng đi" />
                                )}
                              </p>
                            </div>
                            <button
                              onClick={() => handleOpenPickup(trip)}
                              className="btn-primary"
                            >
                              <ArrowUpRight size={16} />
                              <span>Xác nhận lấy hàng</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}

                    <div className="section-card" style={{ marginTop: "16px" }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "14px",
                          color: "#1f2937",
                          marginBottom: "10px",
                        }}
                      >
                        Lịch sử các chuyến đã lấy hàng
                      </div>
                      {pickupHistory.length === 0 ? (
                        <p style={{ color: "#9ca3af", fontSize: "13px" }}>
                          Chưa có chuyến nào.
                        </p>
                      ) : (
                        pickupHistory.map((t) => (
                          <div
                            key={t.ma_van_don}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              padding: "8px 0",
                              borderBottom: "1px solid #f3f4f6",
                              fontSize: "13px",
                            }}
                          >
                            <span>
                              {t.ten_san_pham} (#{t.ma_lo_nong_san}) -{" "}
                              {formatWeight(t.khoi_luong, t.don_vi_tinh)}
                            </span>
                            <span style={{ color: "#6b7280" }}>
                              {STATUS_LABEL[t.trang_thai]?.text}
                            </span>
                          </div>
                        ))
                      )}
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
                        <h2>Xác Nhận Đến Điểm Giao</h2>
                        <p>
                          Khi xe đến nơi, bấm xác nhận để báo cho bên nhận biết
                          hàng đã tới — bên nhận sẽ tự xác nhận tiếp nhận ở
                          trang của họ.
                        </p>
                      </div>
                    </div>

                    {deliveryTrips.length === 0 ? (
                      <div
                        className="section-card"
                        style={{
                          textAlign: "center",
                          padding: "32px",
                          color: "#6b7280",
                        }}
                      >
                        Không có chuyến nào đang trên đường.
                      </div>
                    ) : (
                      deliveryTrips.map((trip) => (
                        <div
                          className="section-card"
                          key={trip.ma_van_don}
                          style={{ marginBottom: "12px" }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
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
                                #{trip.ma_van_don} - {trip.ten_san_pham} (
                                {trip.ma_lo_nong_san})
                              </h3>
                              <p
                                style={{ fontSize: "12.5px", color: "#6b7280" }}
                              >
                                Điểm giao:{" "}
                                {trip.ten_ben_nhan ||
                                  trip.dia_chi_giao_hang ||
                                  "—"}
                                {trip.cho_ky && (
                                  <BadgeChoKy text={TEN_CHO_KY[trip.cho_ky]} />
                                )}
                              </p>
                            </div>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                onClick={() => setDetailTrip(trip)}
                                className="btn-action-detail"
                              >
                                <Eye size={15} />
                                <span>Xem chi tiết</span>
                              </button>
                              <button
                                onClick={() => handleConfirmArrival(trip)}
                                className="btn-primary"
                              >
                                <Check size={16} />
                                <span>Xác nhận đã đến nơi</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}

                    <div className="section-card" style={{ marginTop: "16px" }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "14px",
                          color: "#1f2937",
                          marginBottom: "10px",
                        }}
                      >
                        Các chuyến đã đến nơi / hoàn thành
                      </div>
                      {deliveryHistory.length === 0 ? (
                        <p style={{ color: "#9ca3af", fontSize: "13px" }}>
                          Chưa có chuyến nào.
                        </p>
                      ) : (
                        deliveryHistory.map((t) => (
                          <div
                            key={t.ma_van_don}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              padding: "8px 0",
                              borderBottom: "1px solid #f3f4f6",
                              fontSize: "13px",
                            }}
                          >
                            <span>
                              {t.ten_san_pham} (#{t.ma_lo_nong_san}) -{" "}
                              {formatWeight(t.khoi_luong, t.don_vi_tinh)}
                            </span>
                            <span style={{ color: "#6b7280" }}>
                              {STATUS_LABEL[t.trang_thai]?.text}
                            </span>
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
                  <CheckCircle2 size={20} color="#278d49" /> Chấp Nhận Chuyến
                  Vận Chuyển
                </h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setAcceptModalTrip(null)}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <p style={{ color: "#4b5563" }}>
                  Chuyến #{acceptModalTrip.ma_van_don}:{" "}
                  <b>{acceptModalTrip.ten_san_pham}</b> (
                  {acceptModalTrip.ma_lo_nong_san})
                </p>
                <div className="form-group">
                  <label>Tài xế phụ trách (*)</label>
                  <select
                    value={acceptForm.ma_tai_xe}
                    onChange={(e) =>
                      setAcceptForm({
                        ...acceptForm,
                        ma_tai_xe: e.target.value,
                      })
                    }
                    className="form-select"
                  >
                    <option value="">-- Chọn tài xế từ danh sách --</option>
                    {drivers.map((d) => (
                      <option key={d.ma_tai_xe} value={d.ma_tai_xe}>
                        {d.ho_ten}
                        {d.so_dien_thoai ? ` - ${d.so_dien_thoai}` : ""}
                        {d.dang_chay_chuyen
                          ? ` (đang chạy ${d.dang_chay_chuyen})`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Phương tiện (*)</label>
                  <select
                    value={acceptForm.ma_phuong_tien}
                    onChange={(e) =>
                      setAcceptForm({
                        ...acceptForm,
                        ma_phuong_tien: e.target.value,
                      })
                    }
                    className="form-select"
                  >
                    <option value="">
                      -- Chọn phương tiện từ danh sách --
                    </option>
                    {vehicles.map((v) => (
                      <option key={v.ma_phuong_tien} value={v.ma_phuong_tien}>
                        {v.bien_so}
                        {v.loai_xe ? ` - ${v.loai_xe}` : ""}
                        {v.tai_trong_kg
                          ? ` (${Number(v.tai_trong_kg).toLocaleString("vi-VN")} kg)`
                          : ""}
                        {v.dang_chay_chuyen
                          ? ` (đang chạy ${v.dang_chay_chuyen})`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <p style={{ fontSize: 12.5, color: "#6b7280", margin: 0 }}>
                  Cần thêm tài xế / xe mới? Vào mục "Tài xế & phương tiện".
                </p>
              </div>
              <div className="modal-footer">
                <button
                  className="btn-cancel"
                  onClick={() => setAcceptModalTrip(null)}
                >
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
                  <XCircle size={20} color="#dc2626" /> Từ Chối Chuyến Vận
                  Chuyển
                </h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setRejectModalTrip(null)}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <p style={{ color: "#4b5563" }}>
                  Chuyến #{rejectModalTrip.ma_van_don}:{" "}
                  <b>{rejectModalTrip.ten_san_pham}</b>
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
                <button
                  className="btn-cancel"
                  onClick={() => setRejectModalTrip(null)}
                >
                  Đóng
                </button>
                <button
                  className="btn-primary"
                  style={{ backgroundColor: "#dc2626" }}
                  onClick={handleSubmitReject}
                >
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
                  <PackageCheck size={20} color="#278d49" /> Xác Nhận Lấy Hàng
                  Lên Xe
                </h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setPickupModalTrip(null)}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <p style={{ color: "#4b5563" }}>
                  Chuyến: <b>#{pickupModalTrip.ma_van_don}</b> | Lô hàng:{" "}
                  <b>{pickupModalTrip.ten_san_pham}</b> (
                  {pickupModalTrip.ma_lo_nong_san})
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
                <button
                  className="btn-cancel"
                  onClick={() => setPickupModalTrip(null)}
                >
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
                  <Eye size={20} color="#2563eb" /> Chi Tiết Chuyến Vận Chuyển #
                  {detailTrip.ma_van_don}
                </h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setDetailTrip(null)}
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
                    <label>Mã chuyến</label>
                    <span style={{ fontWeight: 700, color: "#1d4ed8" }}>
                      #{detailTrip.ma_van_don}
                    </span>
                  </div>
                  <div className="readonly-item">
                    <label>Mã lô nông sản</label>
                    <span
                      className="tag-green"
                      style={{ width: "fit-content" }}
                    >
                      #{detailTrip.ma_lo_nong_san}
                    </span>
                  </div>
                  <div className="readonly-item">
                    <label>Tên nông sản / hàng hóa</label>
                    <span style={{ fontWeight: 600, color: "#1f2937" }}>
                      {detailTrip.ten_san_pham}
                    </span>
                  </div>
                  <div className="readonly-item">
                    <label>Khối lượng</label>
                    <span style={{ fontWeight: 600, color: "#047857" }}>
                      {formatWeight(
                        detailTrip.khoi_luong,
                        detailTrip.don_vi_tinh,
                      )}
                    </span>
                  </div>
                  <div className="readonly-item">
                    <label>Phương tiện & Tài xế</label>
                    <span>
                      {detailTrip.bien_so_xe || "Chưa phân công"} -{" "}
                      {detailTrip.ten_tai_xe || "Chưa phân công"}
                    </span>
                  </div>
                  <div className="readonly-item">
                    <label>Bên gửi</label>
                    <span>{detailTrip.ten_nguoi_gui || "—"}</span>
                  </div>
                  <div className="readonly-item">
                    <label>Bên nhận / Điểm giao</label>
                    <span>
                      {detailTrip.ten_ben_nhan ||
                        detailTrip.dia_chi_giao_hang ||
                        "—"}
                    </span>
                  </div>
                  <div className="readonly-item">
                    <label>Thời gian xuất</label>
                    <span>{detailTrip.thoi_gian_xuat}</span>
                  </div>
                </div>

                {detailTrip.ghi_chu && (
                  <div className="readonly-item" style={{ marginTop: "6px" }}>
                    <label>Ghi chú</label>
                    <span style={{ color: "#4b5563", fontSize: "13px" }}>
                      {detailTrip.ghi_chu}
                    </span>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  className="btn-cancel"
                  onClick={() => setDetailTrip(null)}
                >
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
