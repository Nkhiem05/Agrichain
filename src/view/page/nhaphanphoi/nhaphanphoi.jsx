import React, { useState, useEffect, useCallback } from "react";
import usePersistentTab from "../../../hooks/usePersistentTab";
import {
  ArchiveRestore,
  Boxes,
  Send,
  Users,
  PlusCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Ban,
  Lock,
  Truck,
  Check,
  MoreVertical,
  Eye,
  Pencil,
  History,
  Power,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../../css/nhaphanphoi.css";
import {
  fetchIncomingShipments,
  confirmReceiveShipment,
  rejectReceiveShipment,
  fetchInventory,
  fetchDispatchOrders,
  createDispatch,
  fetchDealers,
  createDealer,
  updateDealer,
  toggleDealerStatus,
  fetchDealerHistory,
} from "../../../api/nhaphanphoiApi";

const DEFAULT_LOGO_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png";

// Nhãn + badge cho trạng thái lệnh vận chuyển (lenh_van_chuyen.trang_thai) -
// các bước trước CHO_TIEP_NHAN do đơn vị vận chuyển tự điều khiển.
const INCOMING_STATUS = {
  CHO_CHAP_NHAN: { text: "Chờ đơn vị vận chuyển xác nhận", tone: "warning", icon: Clock },
  CHO_LAY_HANG: { text: "Chờ xe đến lấy hàng", tone: "info", icon: Truck },
  DANG_VAN_CHUYEN: { text: "Đang vận chuyển tới kho", tone: "info", icon: Truck },
  CHO_TIEP_NHAN: { text: "Đã đến nơi - Sẵn sàng tiếp nhận", tone: "purple", icon: Clock },
  HOAN_THANH: { text: "Đã nhập kho", tone: "success", icon: CheckCircle2 },
  TU_CHOI: { text: "Đã từ chối", tone: "danger", icon: XCircle },
};

// Nhãn tiếng Việt cho trạng thái phiếu xuất kho (phieu_xuat_kho.trang_thai)
const DISPATCH_STATUS_LABEL = {
  CHO_XUAT: "Chờ xuất kho",
  DANG_GIAO: "Đang trên đường giao",
  DA_GIAO: "Đã giao thành công",
  DA_HUY: "Đã hủy",
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

const NhaPhanPhoiPage = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // ==========================================
  // 1. QUẢN LÝ TAB
  // ==========================================
  const [activeTab, setActiveTab] = usePersistentTab("nhaphanphoi", "tab-import", ["tab-import","tab-inventory","tab-dispatch","tab-dealers"]);

  // ==========================================
  // 2. QUẢN LÝ DROPDOWN MENU THAO TÁC (⋮)
  // ==========================================
  const [openDropdown, setOpenDropdown] = useState(null);
  const [menuPos, setMenuPos] = useState({
    right: 0,
    top: 0,
    bottom: 0,
    up: false,
  });

  const handleToggleMenu = (e, id) => {
    e.stopPropagation();
    if (openDropdown === id) {
      setOpenDropdown(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const MENU_HEIGHT = 160;
    setMenuPos({
      right: window.innerWidth - rect.right,
      top: rect.bottom + 6,
      bottom: window.innerHeight - rect.top + 6,
      up: window.innerHeight - rect.bottom < MENU_HEIGHT,
    });
    setOpenDropdown(id);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        !e.target.closest(".dropdown-container") &&
        !e.target.closest(".dropdown-menu")
      ) {
        setOpenDropdown(null);
      }
    };
    const handleScroll = () => setOpenDropdown(null);

    document.addEventListener("click", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);

    return () => {
      document.removeEventListener("click", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  // ==========================================
  // 3. DỮ LIỆU TAB 1: NHẬP KHO
  // ==========================================
  const [importOrders, setImportOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const [receiveForm, setReceiveForm] = useState({
    thucNhan: "",
    haoHut: 0,
    viTriKho: "",
    hanLuuKho: "",
  });
  const [rejectReason, setRejectReason] = useState("");

  // ==========================================
  // 4. DỮ LIỆU TAB 2: KHO HÀNG
  // ==========================================
  const [selectedWarehouse, setSelectedWarehouse] = useState("ALL");
  const [inventoryList, setInventoryList] = useState([]);

  // ==========================================
  // 5. DỮ LIỆU TAB 3: PHÂN PHỐI CHO ĐẠI LÝ
  // ==========================================
  const [dispatchOrders, setDispatchOrders] = useState([]);
  const [showCreateDispatchModal, setShowCreateDispatchModal] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({
    daiLyId: "",
    maLo: "",
    soLuongXuat: "",
    hinhThuc: "TU_GIAO",
    tenDonViVC: "",
    taiXe: "",
    bienSo: "",
  });

  // ==========================================
  // 6. DỮ LIỆU TAB 4: ĐẠI LÝ
  // ==========================================
  const [dealers, setDealers] = useState([]);
  const [showDealerModal, setShowDealerModal] = useState(false);
  const [editingDealer, setEditingDealer] = useState(null);
  const [dealerForm, setDealerForm] = useState({
    ten: "",
    nguoiLienHe: "",
    sdt: "",
    diaChi: "",
  });
  const [viewHistoryDealer, setViewHistoryDealer] = useState(null);
  const [dealerHistory, setDealerHistory] = useState([]);

  // ==========================================
  // NẠP DỮ LIỆU THẬT
  // ==========================================
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/dang-nhap");
      return;
    }
    setUser(JSON.parse(userData));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/dang-nhap");
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const [incoming, inventory, dispatch, dealerList] = await Promise.all([
        fetchIncomingShipments(),
        fetchInventory(),
        fetchDispatchOrders(),
        fetchDealers(),
      ]);
      setImportOrders(incoming?.data || []);
      setInventoryList(inventory?.data || []);
      setDispatchOrders(dispatch?.data || []);
      setDealers(dealerList?.data || []);
    } catch (err) {
      setErrorMsg(err.message || "Không thể tải dữ liệu từ máy chủ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadAll();
  }, [user, loadAll]);

  // ==========================================
  // TÍNH TOÁN METRICS
  // ==========================================
  const incomingActiveCount = importOrders.filter(
    (o) => o.trang_thai === "DANG_VAN_CHUYEN" || o.trang_thai === "CHO_TIEP_NHAN",
  ).length;
  const totalStockKg = inventoryList.reduce(
    (acc, cur) => acc + Number(cur.so_luong_hien_tai),
    0,
  );
  const shippingDispatchCount = dispatchOrders.filter(
    (d) => d.trang_thai === "DANG_GIAO",
  ).length;

  const getDaysRemaining = (dateStr) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(dateStr);
    const diffTime = expDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const warehouseOptions = Array.from(
    new Set(inventoryList.map((i) => i.vi_tri_luu_kho).filter(Boolean)),
  );

  // ==========================================
  // ĐIỀU HƯỚNG TRANG CHI TIẾT
  // ==========================================
  const handleNavigateChiTietPhanPhoi = (maPhieu) => {
    navigate(`/chi-tiet-phan-phoi/${encodeURIComponent(maPhieu)}`);
  };

  // ==========================================
  // HÀNH ĐỘNG TAB 1: NHẬP KHO
  // ==========================================
  const handleOpenDetailModal = (order) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
    setOpenDropdown(null);
  };

  const handleOpenReceiveModal = (order) => {
    setOpenDropdown(null);
    setSelectedOrder(order);
    setReceiveForm({
      thucNhan: order.khoi_luong,
      haoHut: 0,
      viTriKho: "",
      hanLuuKho: "",
    });
    setShowReceiveModal(true);
  };

  const handleReceiveChangeThucNhan = (val) => {
    const thucNhanVal = Number(val);
    const lenhVal = Number(selectedOrder?.khoi_luong || 0);
    const diff = Math.max(0, Math.round((lenhVal - thucNhanVal) * 1000) / 1000);
    setReceiveForm((prev) => ({ ...prev, thucNhan: val, haoHut: diff }));
  };

  const handleConfirmReceive = async () => {
    if (!receiveForm.thucNhan || Number(receiveForm.thucNhan) <= 0) {
      alert("Vui lòng nhập khối lượng thực nhận hợp lệ!");
      return;
    }
    if (!receiveForm.viTriKho.trim()) {
      alert("Vui lòng nhập vị trí lưu kho!");
      return;
    }

    try {
      await confirmReceiveShipment(selectedOrder.ma_van_don, {
        khoi_luong_thuc_te: Number(receiveForm.thucNhan),
        vi_tri_luu_kho: receiveForm.viTriKho.trim(),
        han_luu_kho: receiveForm.hanLuuKho || undefined,
      });
      setShowReceiveModal(false);
      await loadAll();
      alert(`Đã nhập kho thành công ${receiveForm.thucNhan} kg cho lô ${selectedOrder.ma_lo_nong_san}!`);
    } catch (err) {
      alert(err.message || "Không thể xác nhận nhập kho");
    }
  };

  const handleOpenRejectModal = (order) => {
    setOpenDropdown(null);
    setSelectedOrder(order);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      alert("Bắt buộc ghi rõ lý do từ chối nhận hàng!");
      return;
    }
    try {
      await rejectReceiveShipment(selectedOrder.ma_van_don, rejectReason.trim());
      setShowRejectModal(false);
      await loadAll();
    } catch (err) {
      alert(err.message || "Không thể từ chối tiếp nhận");
    }
  };

  // ==========================================
  // HÀNH ĐỘNG TAB 3: PHÂN PHỐI ĐẠI LÝ
  // ==========================================
  const handleOpenCreateDispatch = () => {
    const validLots = inventoryList
      .filter((lot) => lot.trang_thai_chung_thu !== "REVOKED" && Number(lot.so_luong_hien_tai) > 0)
      .sort((a, b) => new Date(a.han_luu_kho || "9999-12-31") - new Date(b.han_luu_kho || "9999-12-31"));

    setDispatchForm({
      daiLyId: dealers.find((d) => d.trang_thai === "HOAT_DONG")?.ma_dai_ly || "",
      maLo: validLots[0]?.ma_lo_nong_san || "",
      soLuongXuat: "",
      hinhThuc: "TU_GIAO",
      tenDonViVC: "",
      taiXe: "",
      bienSo: "",
    });
    setShowCreateDispatchModal(true);
  };

  const handleSaveDispatch = async () => {
    if (!dispatchForm.daiLyId) return alert("Vui lòng chọn đại lý nhận hàng!");
    if (!dispatchForm.maLo) return alert("Vui lòng chọn lô xuất hàng!");
    const xuatKg = Number(dispatchForm.soLuongXuat);
    if (!xuatKg || xuatKg <= 0) return alert("Số lượng xuất phải lớn hơn 0!");
    if (dispatchForm.hinhThuc === "TU_GIAO" && (!dispatchForm.taiXe.trim() || !dispatchForm.bienSo.trim())) {
      return alert("Vui lòng điền tài xế và biển số xe!");
    }
    if (dispatchForm.hinhThuc === "DV_VAN_CHUYEN" && !dispatchForm.tenDonViVC.trim()) {
      return alert("Vui lòng nhập tên đơn vị vận chuyển!");
    }

    try {
      const res = await createDispatch({
        ma_dai_ly: dispatchForm.daiLyId,
        ma_lo_nong_san: dispatchForm.maLo,
        so_luong_xuat: xuatKg,
        hinh_thuc: dispatchForm.hinhThuc,
        ten_don_vi_van_chuyen: dispatchForm.tenDonViVC.trim() || undefined,
        ten_tai_xe: dispatchForm.taiXe.trim() || undefined,
        bien_so_xe: dispatchForm.bienSo.trim() || undefined,
      });
      setShowCreateDispatchModal(false);
      await loadAll();
      alert(`Đã lập phiếu xuất kho ${res?.data?.ma_phieu || ""} thành công!`);
    } catch (err) {
      alert(err.message || "Không thể lập phiếu xuất kho");
    }
  };

  // Lọc kho hàng theo vị trí
  const filteredInventory = inventoryList.filter((item) => {
    if (selectedWarehouse === "ALL") return true;
    return item.vi_tri_luu_kho === selectedWarehouse;
  });

  // ==========================================
  // HÀNH ĐỘNG TAB 4: ĐẠI LÝ
  // ==========================================
  const handleOpenEditDealer = (dealer) => {
    setOpenDropdown(null);
    setEditingDealer(dealer);
    setDealerForm({
      ten: dealer.ten,
      nguoiLienHe: dealer.nguoi_lien_he || "",
      sdt: dealer.so_dien_thoai || "",
      diaChi: dealer.dia_chi || "",
    });
    setShowDealerModal(true);
  };

  const handleToggleDealerStatus = async (id) => {
    setOpenDropdown(null);
    try {
      await toggleDealerStatus(id);
      await loadAll();
    } catch (err) {
      alert(err.message || "Không thể đổi trạng thái đại lý");
    }
  };

  const handleOpenDealerHistory = async (dealer) => {
    setOpenDropdown(null);
    setViewHistoryDealer(dealer);
    try {
      const res = await fetchDealerHistory(dealer.ma_dai_ly);
      setDealerHistory(res?.data || []);
    } catch (err) {
      setDealerHistory([]);
    }
  };

  const handleSaveDealer = async () => {
    if (!dealerForm.ten.trim() || !dealerForm.sdt.trim()) {
      alert("Vui lòng nhập tên đại lý và số điện thoại!");
      return;
    }
    const payload = {
      ten: dealerForm.ten.trim(),
      nguoi_lien_he: dealerForm.nguoiLienHe.trim() || undefined,
      so_dien_thoai: dealerForm.sdt.trim(),
      dia_chi: dealerForm.diaChi.trim() || undefined,
    };
    try {
      if (editingDealer) {
        await updateDealer(editingDealer.ma_dai_ly, payload);
        alert("Cập nhật đại lý thành công!");
      } else {
        await createDealer(payload);
        alert("Thêm đại lý mới thành công!");
      }
      setShowDealerModal(false);
      await loadAll();
    } catch (err) {
      alert(err.message || "Không thể lưu đại lý");
    }
  };

  if (!user) return null;

  return (
    <div className="nhaphanphoi dashboard-layout">
      {/* ================= HEADER ================= */}
      <header className="dashboard-header">
        <div className="header-left">
          <img src={DEFAULT_LOGO_IMG} alt="Logo" className="header-logo-icon" />
          <span className="header-brand-title">AGRICHAIN</span>
        </div>

        <div className="header-search-bar">
          <input
            type="text"
            placeholder="Tìm kiếm phiếu nhập, phiếu xuất, mã lô..."
          />
        </div>

        <div
          className="header-profile"
          title="Xem trang cá nhân"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/trang-ca-nhan")}
        >
          <div className="avatar-circle" style={{ overflow: "hidden" }}>
            {user.anh_dai_dien ? (
              <img
                src={`http://localhost:3000${user.anh_dai_dien}`}
                alt="avatar"
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
              />
            ) : (
              (user.ho_ten || "NPP").slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="profile-meta">
            <span className="profile-name">{user.ho_ten}</span>
            <span className="profile-role">Đơn vị phân phối trung chuyển</span>
          </div>
        </div>
      </header>

      {errorMsg && (
        <div style={{ padding: "10px 24px", color: "#b91c1c", fontSize: 13 }}>
          {errorMsg}
        </div>
      )}

      {/* ================= BODY ================= */}
      <div className="dashboard-body">
        {/* ================= SIDEBAR ================= */}
        <aside className="dashboard-sidebar">
          <div>
            <div className="sidebar-heading">Quản Lý Phân Phối</div>
            <nav className="sidebar-nav">
              <button
                type="button"
                onClick={() => setActiveTab("tab-import")}
                className={`nav-item-btn ${activeTab === "tab-import" ? "active" : ""}`}
              >
                <ArchiveRestore size={20} />
                <span>Nhập kho</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("tab-inventory")}
                className={`nav-item-btn ${activeTab === "tab-inventory" ? "active" : ""}`}
              >
                <Boxes size={20} />
                <span>Kho hàng</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("tab-dispatch")}
                className={`nav-item-btn ${activeTab === "tab-dispatch" ? "active" : ""}`}
              >
                <Send size={20} />
                <span>Phân phối cho đại lý</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("tab-dealers")}
                className={`nav-item-btn ${activeTab === "tab-dealers" ? "active" : ""}`}
              >
                <Users size={20} />
                <span>Đại lý</span>
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
                Nhà phân phối: <b>{user.ho_ten}</b>
              </span>
            </div>
          </div>
        </aside>

        {/* ================= MAIN CONTENT ================= */}
        <main className="dashboard-content">
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
              Đang tải dữ liệu...
            </div>
          ) : (
            <>
              {/* ================= TAB 1: NHẬP KHO ================= */}
              {activeTab === "tab-import" && (
                <div>
                  <div className="metrics-row">
                    <div className="metric-card">
                      <div className="metric-title">
                        Chuyến xe đang đến / Chờ nhập
                      </div>
                      <div className="metric-number">
                        {incomingActiveCount}
                        <span className="metric-unit">CHUYẾN</span>
                      </div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-title">Tổng tồn kho hiện tại</div>
                      <div className="metric-number">
                        {totalStockKg >= 1000
                          ? (totalStockKg / 1000).toLocaleString("vi-VN", {
                              maximumFractionDigits: 2,
                            })
                          : totalStockKg.toLocaleString("vi-VN", {
                              maximumFractionDigits: 3,
                            })}
                        <span className="metric-unit">
                          {totalStockKg >= 1000 ? "TẤN" : "KG"}
                        </span>
                      </div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-title">Phiếu xuất đang giao</div>
                      <div className="metric-number">
                        {shippingDispatchCount}
                        <span className="metric-unit">ĐƠN</span>
                      </div>
                    </div>
                  </div>

                  <div className="tab-section-header">
                    <div>
                      <h3 className="tab-section-title">
                        Danh Sách Lệnh Vận Chuyển Nhập Kho
                      </h3>
                      <p className="tab-section-desc">
                        Theo dõi trạng thái vận đơn, nghiệm thu và lưu kho nông
                        sản từ cơ sở sơ chế.
                      </p>
                    </div>
                  </div>

                  <div className="table-container custom-scrollbar">
                    <table className="batch-table">
                      <thead>
                        <tr>
                          <th>Mã vận đơn</th>
                          <th>Mã lô</th>
                          <th>Tên sản phẩm</th>
                          <th>Đơn vị gửi hàng</th>
                          <th>Khối lượng</th>
                          <th>Thời gian xuất</th>
                          <th>Trạng thái</th>
                          <th>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importOrders.length === 0 ? (
                          <tr>
                            <td colSpan={8} style={{ padding: 24, color: "#6b7280" }}>
                              Chưa có lệnh vận chuyển nào gửi tới kho của bạn.
                            </td>
                          </tr>
                        ) : (
                          importOrders.map((order) => {
                            const isDropdownActive =
                              openDropdown === `order-${order.ma_van_don}`;
                            const statusInfo = INCOMING_STATUS[order.trang_thai] || {
                              text: order.trang_thai,
                              tone: "info",
                              icon: Clock,
                            };
                            const StatusIcon = statusInfo.icon;

                            return (
                              <tr
                                key={order.ma_van_don}
                                className={isDropdownActive ? "row-has-open-menu" : ""}
                              >
                                <td style={{ fontWeight: 700, color: "#1d4ed8" }}>
                                  {order.ma_van_don}
                                </td>
                                <td>
                                  <span
                                    style={{
                                      padding: "3px 8px",
                                      backgroundColor: "#f1f5f9",
                                      borderRadius: 4,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {order.ma_lo_nong_san}
                                  </span>
                                </td>
                                <td style={{ fontWeight: 600, color: "#1f2937" }}>
                                  {order.ten_san_pham}
                                </td>
                                <td>{order.ten_nguoi_gui}</td>
                                <td style={{ fontWeight: 700, color: "rgb(31, 41, 55)" }}>
                                  {formatWeight(order.khoi_luong, order.don_vi_tinh)}
                                </td>
                                <td style={{ color: "#64748b", fontSize: 12.5 }}>
                                  {order.thoi_gian_xuat}
                                </td>
                                <td>
                                  <span className={`status-pill ${statusInfo.tone}`}>
                                    <StatusIcon size={13} /> {statusInfo.text}
                                  </span>
                                </td>
                                <td>
                                  <div className="status-icon-cell">
                                    {order.trang_thai === "HOAN_THANH" ? (
                                      <span
                                        className="status-icon-modern success"
                                        title="Đã hoàn tất lưu kho"
                                      >
                                        <CheckCircle2 size={16} />
                                      </span>
                                    ) : (
                                      <span className="status-icon-modern empty" title="Chưa nhập kho">
                                        <span className="empty-indicator"></span>
                                      </span>
                                    )}

                                    <div className="dropdown-container">
                                      <button
                                        type="button"
                                        className="btn-more-dots"
                                        title="Thao tác"
                                        onClick={(e) => handleToggleMenu(e, `order-${order.ma_van_don}`)}
                                      >
                                        <MoreVertical size={18} />
                                      </button>

                                      {isDropdownActive && (
                                        <div
                                          className={`dropdown-menu dropdown-fixed ${menuPos.up ? "dropdown-up" : ""}`}
                                          style={{
                                            right: menuPos.right,
                                            ...(menuPos.up ? { bottom: menuPos.bottom } : { top: menuPos.top }),
                                          }}
                                        >
                                          <div className="dropdown-item" onClick={() => handleOpenDetailModal(order)}>
                                            <Eye size={15} />
                                            Xem chi tiết
                                          </div>

                                          {order.trang_thai === "CHO_TIEP_NHAN" && (
                                            <>
                                              <div className="dropdown-divider"></div>
                                              <div className="dropdown-item" onClick={() => handleOpenReceiveModal(order)}>
                                                <Check size={15} color="#15803d" />
                                                Nghiệm thu & Nhập kho
                                              </div>
                                              <div className="dropdown-item danger" onClick={() => handleOpenRejectModal(order)}>
                                                <XCircle size={15} />
                                                Từ chối nhận
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ================= TAB 2: KHO HÀNG ================= */}
              {activeTab === "tab-inventory" && (
                <div>
                  <div className="tab-section-header" style={{ marginTop: 20 }}>
                    <div>
                      <h3 className="tab-section-title">
                        Báo Cáo Kho Hàng Thực Tế & Thời Hạn Lưu Kho
                      </h3>
                      <p className="tab-section-desc">
                        Quản lý tồn kho nông sản thực tế, cảnh báo cận hạn và
                        chứng thư kiểm định.
                      </p>
                    </div>

                    <div style={{ width: 250 }}>
                      <select
                        className="filter-select"
                        style={{ width: "100%", height: 38, cursor: "pointer", fontWeight: 500 }}
                        value={selectedWarehouse}
                        onChange={(e) => setSelectedWarehouse(e.target.value)}
                      >
                        <option value="ALL">-- Tất cả các kho --</option>
                        {warehouseOptions.map((w) => (
                          <option key={w} value={w}>
                            {w}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="table-container">
                    <table className="batch-table">
                      <thead>
                        <tr>
                          <th>Mã Lô Hàng</th>
                          <th>Tên Sản Phẩm</th>
                          <th>Vị Trí Lưu Kho</th>
                          <th>Số Lượng Tồn</th>
                          <th>Hạn Lưu Kho</th>
                          <th>Trạng Thái Lô</th>
                          <th>Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInventory.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ padding: 24, color: "#6b7280" }}>
                              Không có lô hàng nào tồn trong khu vực kho này.
                            </td>
                          </tr>
                        ) : (
                          filteredInventory.map((lot) => {
                            const daysLeft = getDaysRemaining(lot.han_luu_kho);
                            const isRevoked = lot.trang_thai_chung_thu === "REVOKED";
                            const isExpiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft > 0;
                            const isExpired = daysLeft !== null && daysLeft <= 0;

                            return (
                              <tr key={lot.ma_lo_nong_san} className={isRevoked ? "row-locked" : ""}>
                                <td style={{ fontWeight: 700 }}>{lot.ma_lo_nong_san}</td>
                                <td style={{ fontWeight: 600, color: "#1e293b" }}>{lot.ten_san_pham}</td>
                                <td style={{ color: "#1e293b", fontWeight: 500 }}>
                                  {lot.vi_tri_luu_kho || "—"}
                                </td>
                                <td style={{ fontWeight: 700, color: "#1e293b" }}>
                                  {formatWeight(lot.so_luong_hien_tai, lot.don_vi_tinh)}
                                </td>
                                <td>
                                  {lot.han_luu_kho || "—"}
                                  {isExpiringSoon && (
                                    <span style={{ display: "block", fontSize: 11, color: "#b45309", fontWeight: 600 }}>
                                      (Cận date: còn {daysLeft} ngày)
                                    </span>
                                  )}
                                  {isExpired && (
                                    <span style={{ display: "block", fontSize: 11, color: "#b91c1c", fontWeight: 600 }}>
                                      (Đã hết hạn lưu kho)
                                    </span>
                                  )}
                                </td>
                                <td>
                                  {isRevoked ? (
                                    <span className="status-pill danger">
                                      <Ban size={14} /> Thu hồi (Khoá)
                                    </span>
                                  ) : isExpiringSoon ? (
                                    <span className="status-pill warning">
                                      <AlertTriangle size={14} /> Cận hạn xuất
                                    </span>
                                  ) : isExpired ? (
                                    <span className="status-pill danger">
                                      <XCircle size={14} /> Hết hạn lưu kho
                                    </span>
                                  ) : lot.trang_thai_chung_thu === "VALID" ? (
                                    <span className="status-pill success">
                                      <CheckCircle2 size={14} /> Đã kiểm định đạt
                                    </span>
                                  ) : (
                                    <span className="status-pill info">Chưa có kiểm định</span>
                                  )}
                                </td>
                                <td>
                                  {isRevoked ? (
                                    <button
                                      type="button"
                                      disabled
                                      style={{
                                        padding: "5px 10px",
                                        backgroundColor: "#f1f5f9",
                                        color: "#94a3b8",
                                        border: "1px solid #cbd5e1",
                                        borderRadius: 6,
                                        fontSize: 12,
                                        cursor: "not-allowed",
                                      }}
                                    >
                                      <Lock size={13} style={{ marginRight: 4 }} /> Bị khóa xuất
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="btn-action-view"
                                      onClick={() => setActiveTab("tab-dispatch")}
                                    >
                                      Xuất bán
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ================= TAB 3: PHÂN PHỐI CHO ĐẠI LÝ ================= */}
              {activeTab === "tab-dispatch" && (
                <div>
                  <div className="metrics-row">
                    <div className="metric-card">
                      <div className="metric-title">Phiếu chờ xuất kho</div>
                      <div className="metric-number">
                        {dispatchOrders.filter((o) => o.trang_thai === "CHO_XUAT").length}
                        <span className="metric-unit">PHIẾU</span>
                      </div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-title">Phiếu đang trên đường giao</div>
                      <div className="metric-number">
                        {shippingDispatchCount}
                        <span className="metric-unit">ĐANG GIAO</span>
                      </div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-title">Đã giao thành công</div>
                      <div className="metric-number">
                        {dispatchOrders.filter((o) => o.trang_thai === "DA_GIAO").length}
                        <span className="metric-unit">ĐƠN</span>
                      </div>
                    </div>
                    <div className="actions-box">
                      <button type="button" className="btn-primary-action" onClick={handleOpenCreateDispatch}>
                        <PlusCircle size={17} /> Lập Phiếu Phân Phối
                      </button>
                    </div>
                  </div>

                  <div className="tab-section-header">
                    <div>
                      <h3 className="tab-section-title">
                        Nhật Ký Phiếu Xuất Giao Cho Đại Lý & Siêu Thị
                      </h3>
                      <p className="tab-section-desc">
                        Theo dõi trạng thái giao nhận hàng và xem chi tiết đơn hàng.
                      </p>
                    </div>
                  </div>

                  <div className="table-container">
                    <table className="batch-table">
                      <thead>
                        <tr>
                          <th>Mã Phiếu</th>
                          <th>Đại Lý Nhận</th>
                          <th>Lô Hàng - Tên SP</th>
                          <th>SL Xuất</th>
                          <th>Trạng Thái</th>
                          <th>Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dispatchOrders.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ padding: 24, color: "#6b7280" }}>
                              Chưa lập phiếu xuất kho nào.
                            </td>
                          </tr>
                        ) : (
                          dispatchOrders.map((order) => (
                            <tr key={order.ma_phieu}>
                              <td style={{ fontWeight: 700, color: "#1d4ed8" }}>{order.ma_phieu}</td>
                              <td style={{ fontWeight: 600 }}>{order.ten_dai_ly}</td>
                              <td>
                                <strong>{order.ma_lo_nong_san}</strong> - {order.ten_san_pham}
                              </td>
                              <td style={{ fontWeight: 700 }}>
                                {formatWeight(order.so_luong_xuat, order.don_vi_tinh)}
                              </td>
                              <td>
                                <span
                                  className={`status-pill ${
                                    order.trang_thai === "DA_GIAO"
                                      ? "success"
                                      : order.trang_thai === "DANG_GIAO"
                                        ? "info"
                                        : order.trang_thai === "DA_HUY"
                                          ? "danger"
                                          : "warning"
                                  }`}
                                >
                                  {DISPATCH_STATUS_LABEL[order.trang_thai] || order.trang_thai}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: "inline-flex", justifyContent: "center" }}>
                                  <button
                                    type="button"
                                    className="btn-action-view-outline"
                                    title="Xem chi tiết đơn phân phối"
                                    onClick={() => handleNavigateChiTietPhanPhoi(order.ma_phieu)}
                                  >
                                    <Eye size={14} />
                                    <span>Xem chi tiết</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ================= TAB 4: ĐẠI LÝ ================= */}
              {activeTab === "tab-dealers" && (
                <div>
                  <div className="tab-section-header" style={{ marginTop: 20 }}>
                    <div>
                      <h3 className="tab-section-title">
                        Danh Sách Đại Lý & Kênh Bán Lẻ Hợp Tác
                      </h3>
                      <p className="tab-section-desc">
                        Quản lý đầu mối nhận hàng, địa chỉ và thông tin hợp tác phân phối.
                      </p>
                    </div>
                    <div>
                      <button
                        type="button"
                        className="btn-primary-action"
                        onClick={() => {
                          setEditingDealer(null);
                          setDealerForm({ ten: "", nguoiLienHe: "", sdt: "", diaChi: "" });
                          setShowDealerModal(true);
                        }}
                      >
                        <PlusCircle size={17} />
                        <span>Thêm Đại Lý Mới</span>
                      </button>
                    </div>
                  </div>

                  <div className="table-container custom-scrollbar">
                    <table className="batch-table">
                      <thead>
                        <tr>
                          <th>Mã ĐL</th>
                          <th>Tên Đại Lý</th>
                          <th>Người Liên Hệ</th>
                          <th>Số Điện Thoại</th>
                          <th>Địa Chỉ</th>
                          <th>Trạng Thái</th>
                          <th>Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dealers.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ padding: 24, color: "#6b7280" }}>
                              Chưa có đại lý nào, bấm "Thêm Đại Lý Mới" để bắt đầu.
                            </td>
                          </tr>
                        ) : (
                          dealers.map((d) => {
                            const isDropdownActive = openDropdown === `dealer-${d.ma_dai_ly}`;

                            return (
                              <tr key={d.ma_dai_ly} className={isDropdownActive ? "row-has-open-menu" : ""}>
                                <td style={{ fontWeight: 700 }}>{d.ma_dai_ly}</td>
                                <td style={{ fontWeight: 600 }}>{d.ten}</td>
                                <td>{d.nguoi_lien_he}</td>
                                <td style={{ color: "#2563eb" }}>{d.so_dien_thoai}</td>
                                <td>{d.dia_chi}</td>
                                <td>
                                  {d.trang_thai === "HOAT_DONG" ? (
                                    <span className="status-pill success">Đang hợp tác</span>
                                  ) : (
                                    <span className="status-pill gray">Tạm ngưng</span>
                                  )}
                                </td>
                                <td>
                                  <div className="status-icon-cell">
                                    {d.trang_thai === "HOAT_DONG" ? (
                                      <span className="status-icon-modern success" title="Đang hợp tác">
                                        <CheckCircle2 size={16} />
                                      </span>
                                    ) : (
                                      <span className="status-icon-modern empty" title="Tạm ngưng hợp tác">
                                        <span className="empty-indicator"></span>
                                      </span>
                                    )}

                                    <div className="dropdown-container">
                                      <button
                                        type="button"
                                        className="btn-more-dots"
                                        title="Thao tác"
                                        onClick={(e) => handleToggleMenu(e, `dealer-${d.ma_dai_ly}`)}
                                      >
                                        <MoreVertical size={18} />
                                      </button>

                                      {isDropdownActive && (
                                        <div
                                          className={`dropdown-menu dropdown-fixed ${menuPos.up ? "dropdown-up" : ""}`}
                                          style={{
                                            right: menuPos.right,
                                            ...(menuPos.up ? { bottom: menuPos.bottom } : { top: menuPos.top }),
                                          }}
                                        >
                                          <div className="dropdown-item" onClick={() => handleOpenEditDealer(d)}>
                                            <Pencil size={15} />
                                            Sửa thông tin
                                          </div>

                                          <div className="dropdown-item" onClick={() => handleOpenDealerHistory(d)}>
                                            <History size={15} />
                                            Lịch sử nhận hàng
                                          </div>

                                          <div className="dropdown-divider"></div>

                                          <div
                                            className={`dropdown-item ${d.trang_thai === "HOAT_DONG" ? "danger" : ""}`}
                                            onClick={() => handleToggleDealerStatus(d.ma_dai_ly)}
                                          >
                                            <Power size={15} />
                                            {d.trang_thai === "HOAT_DONG" ? "Tạm ngưng hợp tác" : "Kích hoạt hợp tác"}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ================= POPUP 1: CHI TIẾT VẬN ĐƠN (TAB 1) ================= */}
      {showDetailModal && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Chi Tiết Vận Đơn {selectedOrder.ma_van_don}</h3>
            </div>
            <div className="modal-body">
              <div className="form-grid-2 readonly-grid">
                <div className="readonly-item">
                  <label>Mã vận đơn</label>
                  <span style={{ fontWeight: 700, color: "#1d4ed8" }}>{selectedOrder.ma_van_don}</span>
                </div>
                <div className="readonly-item">
                  <label>Mã lô nông sản</label>
                  <span style={{ fontWeight: 700 }}>{selectedOrder.ma_lo_nong_san}</span>
                </div>
                <div className="readonly-item">
                  <label>Tên sản phẩm</label>
                  <span>{selectedOrder.ten_san_pham}</span>
                </div>
                <div className="readonly-item">
                  <label>Đơn vị gửi hàng</label>
                  <span>{selectedOrder.ten_nguoi_gui}</span>
                </div>
                <div className="readonly-item">
                  <label>Đơn vị vận chuyển</label>
                  <span>{selectedOrder.ten_don_vi_van_chuyen}</span>
                </div>
                <div className="readonly-item">
                  <label>Khối lượng</label>
                  <span style={{ fontWeight: 700, color: "#15803d" }}>
                    {formatWeight(selectedOrder.khoi_luong, selectedOrder.don_vi_tinh)}
                  </span>
                </div>
                <div className="readonly-item">
                  <label>Tài xế phụ trách</label>
                  <span>{selectedOrder.ten_tai_xe}</span>
                </div>
                <div className="readonly-item">
                  <label>Biển số xe</label>
                  <span>{selectedOrder.bien_so_xe}</span>
                </div>
                <div className="readonly-item">
                  <label>Thời gian xuất</label>
                  <span>{selectedOrder.thoi_gian_xuat}</span>
                </div>
                <div className="readonly-item">
                  <label>Trạng thái</label>
                  <span style={{ fontWeight: 600 }}>
                    {INCOMING_STATUS[selectedOrder.trang_thai]?.text || selectedOrder.trang_thai}
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={() => setShowDetailModal(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= POPUP 2: NGHIỆM THU NHẬP KHO (TAB 1) ================= */}
      {showReceiveModal && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Biên Bản Kiểm Đếm & Nghiệm Thu Nhập Kho</h3>
            </div>
            <div className="modal-body">
              <div style={{ backgroundColor: "#f8fafc", padding: "10px 14px", borderRadius: 6, marginBottom: 14, fontSize: 13 }}>
                <p>
                  Mã vận đơn: <b>{selectedOrder.ma_van_don}</b>
                </p>
                <p>
                  Lô hàng: <b>{selectedOrder.ma_lo_nong_san}</b> - {selectedOrder.ten_san_pham}
                </p>
                <p>
                  Khối lượng theo lệnh VC:{" "}
                  <b style={{ color: "#15803d" }}>
                    {selectedOrder.khoi_luong} {selectedOrder.don_vi_tinh}
                  </b>
                </p>
              </div>

              <div className="form-group">
                <label>Khối Lượng Cân Thực Nhận ({selectedOrder.don_vi_tinh}) (*)</label>
                <input
                  type="number"
                  value={receiveForm.thucNhan}
                  onChange={(e) => handleReceiveChangeThucNhan(e.target.value)}
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Khối lượng hao hụt ({selectedOrder.don_vi_tinh})</label>
                  <input
                    type="number"
                    readOnly
                    value={receiveForm.haoHut}
                    style={{ backgroundColor: "#f1f5f9", fontWeight: 700 }}
                  />
                </div>
                <div className="form-group">
                  <label>Vị Trí Lưu Kho (*)</label>
                  <input
                    type="text"
                    placeholder="VD: Kho Mát A (Kệ Pallet 01)"
                    value={receiveForm.viTriKho}
                    onChange={(e) => setReceiveForm({ ...receiveForm, viTriKho: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Hạn Lưu Kho (nếu có)</label>
                <input
                  type="date"
                  value={receiveForm.hanLuuKho}
                  onChange={(e) => setReceiveForm({ ...receiveForm, hanLuuKho: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={() => setShowReceiveModal(false)}>
                Hủy
              </button>
              <button type="button" className="btn-save" onClick={handleConfirmReceive}>
                Xác Nhận Lưu Kho
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= POPUP 3: TỪ CHỐI NHẬP HÀNG (TAB 1) ================= */}
      {showRejectModal && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 style={{ color: "#dc2626" }}>Từ Chối Nhập Hàng Vào Kho</h3>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: "#4b5563", marginBottom: 12 }}>
                Từ chối nhận vận đơn <b>{selectedOrder.ma_van_don}</b> mang lô{" "}
                <b>{selectedOrder.ma_lo_nong_san}</b>. Bắt buộc nhập lý do:
              </p>
              <div className="form-group">
                <label>Lý do từ chối nhận (*)</label>
                <textarea
                  rows={4}
                  placeholder="VD: Đứt niêm phong Seal thùng xe, hàng không đạt chất lượng..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={() => setShowRejectModal(false)}>
                Đóng
              </button>
              <button type="button" className="btn-save danger" onClick={handleConfirmReject}>
                Xác Nhận Từ Chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= POPUP 4: LẬP PHIẾU PHÂN PHỐI (TAB 3) ================= */}
      {showCreateDispatchModal && (
        <div className="modal-overlay">
          <div className="modal-container modal-lg">
            <div className="modal-header">
              <h3>Lập Phiếu Phân Phối Cho Đại Lý</h3>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Chọn Đại Lý Nhận Hàng (*)</label>
                <select
                  value={dispatchForm.daiLyId}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, daiLyId: e.target.value })}
                >
                  <option value="">-- Chọn đại lý --</option>
                  {dealers
                    .filter((d) => d.trang_thai === "HOAT_DONG")
                    .map((d) => (
                      <option key={d.ma_dai_ly} value={d.ma_dai_ly}>
                        {d.ten} ({d.dia_chi})
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Chọn Lô Hàng Xuất (Hạn gần nhất trước) (*)</label>
                  <select
                    value={dispatchForm.maLo}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, maLo: e.target.value })}
                  >
                    <option value="">-- Chọn lô --</option>
                    {inventoryList.map((lot) => {
                      const isRevoked = lot.trang_thai_chung_thu === "REVOKED";
                      return (
                        <option key={lot.ma_lo_nong_san} value={lot.ma_lo_nong_san} disabled={isRevoked}>
                          {lot.ma_lo_nong_san} - {lot.ten_san_pham} (Tồn: {formatWeight(lot.so_luong_hien_tai, lot.don_vi_tinh)}
                          {lot.han_luu_kho ? ` - Hạn: ${lot.han_luu_kho}` : ""})
                          {isRevoked ? " [BỊ THU HỒI - KHÓA]" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label>Số Lượng Xuất (*)</label>
                  <input
                    type="number"
                    placeholder="VD: 300"
                    value={dispatchForm.soLuongXuat}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, soLuongXuat: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Hình Thức Vận Chuyển</label>
                <div style={{ display: "flex", gap: 20, padding: "6px 0" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="hinhThuc"
                      checked={dispatchForm.hinhThuc === "TU_GIAO"}
                      onChange={() => setDispatchForm({ ...dispatchForm, hinhThuc: "TU_GIAO" })}
                    />
                    Tự giao xe kho
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="hinhThuc"
                      checked={dispatchForm.hinhThuc === "DV_VAN_CHUYEN"}
                      onChange={() => setDispatchForm({ ...dispatchForm, hinhThuc: "DV_VAN_CHUYEN" })}
                    />
                    Đơn vị vận chuyển đối tác
                  </label>
                </div>
              </div>

              {dispatchForm.hinhThuc === "TU_GIAO" ? (
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Tài Xế Phụ Trách (*)</label>
                    <input
                      type="text"
                      value={dispatchForm.taiXe}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, taiXe: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Biển Số Xe (*)</label>
                    <input
                      type="text"
                      value={dispatchForm.bienSo}
                      onChange={(e) => setDispatchForm({ ...dispatchForm, bienSo: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <div className="form-group">
                  <label>Tên Đơn Vị Vận Chuyển Đối Tác (*)</label>
                  <input
                    type="text"
                    placeholder="VD: Giao Hàng Tiết Kiệm / Viettel Post"
                    value={dispatchForm.tenDonViVC}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, tenDonViVC: e.target.value })}
                  />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={() => setShowCreateDispatchModal(false)}>
                Hủy
              </button>
              <button type="button" className="btn-save" onClick={handleSaveDispatch}>
                Tạo Phiếu Xuất Kho
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= POPUP 5: THÊM / SỬA ĐẠI LÝ (TAB 4) ================= */}
      {showDealerModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>{editingDealer ? "Cập Nhật Thông Tin Đại Lý" : "Thêm Đại Lý Mới"}</h3>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tên Đại Lý / Siêu Thị (*)</label>
                <input
                  type="text"
                  placeholder="VD: Siêu thị Co.opMart"
                  value={dealerForm.ten}
                  onChange={(e) => setDealerForm({ ...dealerForm, ten: e.target.value })}
                />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Người Liên Hệ</label>
                  <input
                    type="text"
                    placeholder="VD: Nguyễn Văn A"
                    value={dealerForm.nguoiLienHe}
                    onChange={(e) => setDealerForm({ ...dealerForm, nguoiLienHe: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Số Điện Thoại (*)</label>
                  <input
                    type="text"
                    placeholder="VD: 0908123456"
                    value={dealerForm.sdt}
                    onChange={(e) => setDealerForm({ ...dealerForm, sdt: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Địa Chỉ Kho Giao Hàng</label>
                <textarea
                  rows={2}
                  placeholder="Địa chỉ giao hàng..."
                  value={dealerForm.diaChi}
                  onChange={(e) => setDealerForm({ ...dealerForm, diaChi: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={() => setShowDealerModal(false)}>
                Hủy
              </button>
              <button type="button" className="btn-save" onClick={handleSaveDealer}>
                Lưu Đại Lý
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= POPUP 6: XEM LỊCH SỬ NHẬN HÀNG CỦA ĐẠI LÝ (TAB 4) ================= */}
      {viewHistoryDealer && (
        <div className="modal-overlay">
          <div className="modal-container modal-lg">
            <div className="modal-header">
              <h3>Lịch Sử Bàn Giao: {viewHistoryDealer.ten}</h3>
            </div>
            <div className="modal-body">
              {dealerHistory.length === 0 ? (
                <p style={{ textAlign: "center", padding: 20, color: "#6b7280" }}>
                  Chưa có lịch sử giao hàng nào cho đại lý này.
                </p>
              ) : (
                <div className="table-container" style={{ margin: 0 }}>
                  <table className="batch-table">
                    <thead>
                      <tr>
                        <th>Mã Phiếu</th>
                        <th>Lô Hàng</th>
                        <th>SL Xuất</th>
                        <th>Trạng Thái</th>
                        <th>Ngày Lập</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dealerHistory.map((h) => (
                        <tr key={h.ma_phieu}>
                          <td style={{ fontWeight: 700, color: "#1d4ed8" }}>{h.ma_phieu}</td>
                          <td>{h.ma_lo_nong_san}</td>
                          <td>
                            {formatWeight(h.so_luong_xuat, h.don_vi_tinh)}
                          </td>
                          <td>
                            <span
                              className={`status-pill ${
                                h.trang_thai === "DA_GIAO"
                                  ? "success"
                                  : h.trang_thai === "DANG_GIAO"
                                    ? "info"
                                    : h.trang_thai === "DA_HUY"
                                      ? "danger"
                                      : "warning"
                              }`}
                            >
                              {DISPATCH_STATUS_LABEL[h.trang_thai] || h.trang_thai}
                            </span>
                          </td>
                          <td>{new Date(h.created_at).toLocaleDateString("vi-VN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setViewHistoryDealer(null);
                  setDealerHistory([]);
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NhaPhanPhoiPage;
