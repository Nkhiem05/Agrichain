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
  Wallet,
  Warehouse,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../../css/nhaphanphoi.css";
import BlockchainPanel from "../blockchainpannel";
import { baoKetQua } from "../kyNgay";
import {
  fetchIncomingShipments,
  confirmReceiveShipment,
  rejectReceiveShipment,
  fetchInventory,
  fetchDispatchOrders,
  createDispatch,
  fetchDealers,
  fetchDispatchTransporters,
  createDealer,
  updateDealer,
  toggleDealerStatus,
  fetchDealerHistory,
  fetchDealerAccounts,
  fetchWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
} from "../../../api/nhaphanphoiApi";

const DEFAULT_LOGO_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png";

// Nhãn + badge cho trạng thái lệnh vận chuyển (lenh_van_chuyen.trang_thai) -
// các bước trước CHO_TIEP_NHAN do đơn vị vận chuyển tự điều khiển.
const INCOMING_STATUS = {
  CHO_CHAP_NHAN: {
    text: "Chờ đơn vị vận chuyển xác nhận",
    tone: "warning",
    icon: Clock,
  },
  CHO_LAY_HANG: { text: "Chờ xe đến lấy hàng", tone: "info", icon: Truck },
  DANG_VAN_CHUYEN: {
    text: "Đang vận chuyển tới kho",
    tone: "info",
    icon: Truck,
  },
  CHO_TIEP_NHAN: {
    text: "Đã đến nơi - Sẵn sàng tiếp nhận",
    tone: "purple",
    icon: Clock,
  },
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
  const [activeTab, setActiveTab] = usePersistentTab(
    "nhaphanphoi",
    "tab-import",
    [
      "tab-import",
      "tab-inventory",
      "tab-warehouse",
      "tab-dispatch",
      "tab-dealers",
      "blockchain",
    ],
  );

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
    maKho: "",
    hanLuuKho: "",
  });
  const [rejectReason, setRejectReason] = useState("");

  // ==========================================
  // 4. DỮ LIỆU TAB 2: KHO HÀNG
  // ==========================================
  const [selectedWarehouse, setSelectedWarehouse] = useState("ALL");
  const [inventoryList, setInventoryList] = useState([]);

  // Danh sách kho do nhà phân phối tạo ở mục Quản lý kho (nhập kho chỉ chọn trong danh sách này)
  const [warehouses, setWarehouses] = useState([]);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [warehouseForm, setWarehouseForm] = useState({
    tenKho: "",
    diaChi: "",
    ghiChu: "",
  });

  // ==========================================
  // 5. DỮ LIỆU TAB 3: PHÂN PHỐI CHO ĐẠI LÝ
  // ==========================================
  const [dispatchOrders, setDispatchOrders] = useState([]);
  const [showCreateDispatchModal, setShowCreateDispatchModal] = useState(false);
  // Giao hàng cho đại lý luôn THUÊ đơn vị vận chuyển (tài khoản vận chuyển): họ chấp nhận lệnh, tự ký lấy hàng và đến nơi
  const [transporters, setTransporters] = useState([]);
  const [dispatchForm, setDispatchForm] = useState({
    daiLyId: "",
    maLo: "",
    soLuongXuat: "",
    maDonViVanChuyen: "",
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
    maNguoiDung: "",
  });
  // Tài khoản đại lý (vai trò RETAILER) để gắn với đại lý: đại lý ký nhận hàng bằng tài khoản này
  const [dealerAccounts, setDealerAccounts] = useState([]);
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
      const [
        incoming,
        inventory,
        dispatch,
        dealerList,
        accountList,
        warehouseList,
      ] = await Promise.all([
        fetchIncomingShipments(),
        fetchInventory(),
        fetchDispatchOrders(),
        fetchDealers(),
        fetchDealerAccounts().catch(() => null),
        fetchWarehouses().catch(() => null),
      ]);
      setImportOrders(incoming?.data || []);
      setInventoryList(inventory?.data || []);
      setDispatchOrders(dispatch?.data || []);
      setDealers(dealerList?.data || []);
      setDealerAccounts(accountList?.data || []);
      setWarehouses(warehouseList?.data || []);
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
    (o) =>
      o.trang_thai === "DANG_VAN_CHUYEN" || o.trang_thai === "CHO_TIEP_NHAN",
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

  // Bộ lọc kho: kho đã tạo + tên kho còn sót ở các lô cũ
  const warehouseOptions = Array.from(
    new Set([
      ...warehouses.map((w) => w.ten_kho),
      ...inventoryList.map((i) => i.vi_tri_luu_kho).filter(Boolean),
    ]),
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

  const handleOpenReceiveModal = async (order) => {
    setOpenDropdown(null);
    // Lấy danh sách kho mới nhất; chưa có kho nào thì chuyển sang mục Quản lý kho để tạo trước
    let dsKho = warehouses;
    try {
      dsKho = (await fetchWarehouses())?.data || [];
      setWarehouses(dsKho);
    } catch {
      /* dùng danh sách đã có */
    }
    if (dsKho.length === 0) {
      alert(
        'Bạn chưa có kho nào. Hãy tạo kho ở mục "Quản lý kho" rồi quay lại nhập kho.',
      );
      setActiveTab("tab-warehouse");
      return;
    }
    setSelectedOrder(order);
    setReceiveForm({
      thucNhan: order.khoi_luong,
      haoHut: 0,
      maKho: dsKho.length === 1 ? dsKho[0].ma_kho : "",
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
    if (!receiveForm.maKho) {
      alert("Vui lòng chọn kho lưu hàng!");
      return;
    }

    try {
      const res = await confirmReceiveShipment(selectedOrder.ma_van_don, {
        khoi_luong_thuc_te: Number(receiveForm.thucNhan),
        ma_kho: receiveForm.maKho,
        han_luu_kho: receiveForm.hanLuuKho || undefined,
      });
      setShowReceiveModal(false);
      await loadAll();
      await baoKetQua(res, {
        thanhCong: `Đã nhập kho ${receiveForm.thucNhan} kg cho lô ${selectedOrder.ma_lo_nong_san}.`,
        taiLai: loadAll,
      });
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
      const res = await rejectReceiveShipment(
        selectedOrder.ma_van_don,
        rejectReason.trim(),
      );
      setShowRejectModal(false);
      await loadAll();
      await baoKetQua(res, {
        thanhCong: `Đã từ chối tiếp nhận chuyến ${selectedOrder.ma_van_don}.`,
        taiLai: loadAll,
      });
    } catch (err) {
      alert(err.message || "Không thể từ chối tiếp nhận");
    }
  };

  // ==========================================
  // HÀNH ĐỘNG TAB 3: PHÂN PHỐI ĐẠI LÝ
  // ==========================================
  const handleOpenCreateDispatch = async () => {
    // Tải lại danh sách đại lý để chọn (đại lý vừa thêm ở tab Đại lý có ngay trong danh sách)
    let dsDaiLy = dealers;
    try {
      dsDaiLy = (await fetchDealers())?.data || [];
      setDealers(dsDaiLy);
    } catch {
      /* dùng danh sách đã có */
    }
    // Đơn vị vận chuyển để thuê (tài khoản vận chuyển)
    let dsVanChuyen = transporters;
    try {
      dsVanChuyen = (await fetchDispatchTransporters())?.data || [];
      setTransporters(dsVanChuyen);
    } catch {
      /* dùng danh sách đã có */
    }
    if (dsVanChuyen.length === 0) {
      alert("Chưa có tài khoản đơn vị vận chuyển nào để thuê giao hàng. Hãy tạo tài khoản vận chuyển trước.");
      return;
    }
    if (!dsDaiLy.some((d) => d.trang_thai === "HOAT_DONG")) {
      alert(
        'Chưa có đại lý nào đang hợp tác. Hãy thêm đại lý ở mục "Đại lý" rồi lập phiếu phân phối.',
      );
      setActiveTab("tab-dealers");
      return;
    }

    const validLots = inventoryList
      .filter(
        (lot) =>
          lot.trang_thai_chung_thu !== "REVOKED" &&
          Number(lot.so_luong_hien_tai) > 0,
      )
      .sort(
        (a, b) =>
          new Date(a.han_luu_kho || "9999-12-31") -
          new Date(b.han_luu_kho || "9999-12-31"),
      );

    setDispatchForm({
      // Ưu tiên đại lý đã gắn tài khoản (đại lý ký nhận hàng trên blockchain bằng tài khoản đó)
      daiLyId:
        (
          dsDaiLy.find(
            (d) => d.trang_thai === "HOAT_DONG" && d.ma_nguoi_dung,
          ) || dsDaiLy.find((d) => d.trang_thai === "HOAT_DONG")
        )?.ma_dai_ly || "",
      maLo: validLots.find((lot) => !lot.cho_ky)?.ma_lo_nong_san || "",
      soLuongXuat: "",
      maDonViVanChuyen: dsVanChuyen[0]?.ma_nguoi_dung || "",
    });
    setShowCreateDispatchModal(true);
  };

  const handleSaveDispatch = async () => {
    if (!dispatchForm.daiLyId) return alert("Vui lòng chọn đại lý nhận hàng!");
    if (!dispatchForm.maLo) return alert("Vui lòng chọn lô xuất hàng!");
    if (!dispatchForm.maDonViVanChuyen) return alert("Vui lòng chọn đơn vị vận chuyển!");
    // Giao nguyên lô: khối lượng lấy theo tồn của lô, không tách lô
    const lotChon = inventoryList.find((l) => l.ma_lo_nong_san === dispatchForm.maLo);
    const xuatKg = Number(lotChon?.so_luong_hien_tai);
    if (!xuatKg || xuatKg <= 0) return alert("Lô được chọn không còn hàng để giao!");

    try {
      const res = await createDispatch({
        ma_dai_ly: dispatchForm.daiLyId,
        ma_lo_nong_san: dispatchForm.maLo,
        so_luong_xuat: xuatKg,
        hinh_thuc: "DV_VAN_CHUYEN", // luôn thuê đơn vị vận chuyển: họ chấp nhận lệnh rồi tự ký lấy hàng / đến nơi
        ma_don_vi_van_chuyen: dispatchForm.maDonViVanChuyen,
      });
      setShowCreateDispatchModal(false);
      await loadAll();
      await baoKetQua(
        { ...res, message: `${res?.message || "Đã lập phiếu xuất kho"}: ${res?.data?.ma_phieu || ""}.` },
        { thanhCong: `Đã lập phiếu xuất kho ${res?.data?.ma_phieu || ""}.`, taiLai: loadAll },
      );
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
  // HÀNH ĐỘNG: QUẢN LÝ KHO
  // ==========================================
  const handleOpenCreateWarehouse = () => {
    setEditingWarehouse(null);
    setWarehouseForm({ tenKho: "", diaChi: "", ghiChu: "" });
    setShowWarehouseModal(true);
  };

  const handleOpenEditWarehouse = (kho) => {
    setEditingWarehouse(kho);
    setWarehouseForm({
      tenKho: kho.ten_kho,
      diaChi: kho.dia_chi || "",
      ghiChu: kho.ghi_chu || "",
    });
    setShowWarehouseModal(true);
  };

  const handleSaveWarehouse = async () => {
    if (!warehouseForm.tenKho.trim()) {
      alert("Vui lòng nhập tên kho!");
      return;
    }
    const payload = {
      ten_kho: warehouseForm.tenKho.trim(),
      dia_chi: warehouseForm.diaChi.trim() || undefined,
      ghi_chu: warehouseForm.ghiChu.trim() || undefined,
    };
    try {
      if (editingWarehouse) {
        await updateWarehouse(editingWarehouse.ma_kho, payload);
        alert("Cập nhật kho thành công!");
      } else {
        await createWarehouse(payload);
        alert("Tạo kho thành công!");
      }
      setShowWarehouseModal(false);
      await loadAll();
    } catch (err) {
      alert(err.message || "Không thể lưu kho");
    }
  };

  const handleDeleteWarehouse = async (kho) => {
    if (!window.confirm(`Xóa kho "${kho.ten_kho}"?`)) return;
    try {
      await deleteWarehouse(kho.ma_kho);
      await loadAll();
    } catch (err) {
      alert(err.message || "Không thể xóa kho");
    }
  };

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
      maNguoiDung: dealer.ma_nguoi_dung || "",
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
      ma_nguoi_dung: dealerForm.maNguoiDung || undefined,
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
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "50%",
                }}
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
                onClick={() => setActiveTab("tab-warehouse")}
                className={`nav-item-btn ${activeTab === "tab-warehouse" ? "active" : ""}`}
              >
                <Warehouse size={20} />
                <span>Quản lý kho</span>
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
              <button
                type="button"
                onClick={() => setActiveTab("blockchain")}
                className={`nav-item-btn ${activeTab === "blockchain" ? "active" : ""}`}
              >
                <Wallet size={20} />
                <span>Ký blockchain</span>
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
                            <td
                              colSpan={8}
                              style={{ padding: 24, color: "#6b7280" }}
                            >
                              Chưa có lệnh vận chuyển nào gửi tới kho của bạn.
                            </td>
                          </tr>
                        ) : (
                          importOrders.map((order) => {
                            const isDropdownActive =
                              openDropdown === `order-${order.ma_van_don}`;
                            const statusInfo = INCOMING_STATUS[
                              order.trang_thai
                            ] || {
                              text: order.trang_thai,
                              tone: "info",
                              icon: Clock,
                            };
                            const StatusIcon = statusInfo.icon;

                            return (
                              <tr
                                key={order.ma_van_don}
                                className={
                                  isDropdownActive ? "row-has-open-menu" : ""
                                }
                              >
                                <td
                                  style={{ fontWeight: 700, color: "#1d4ed8" }}
                                >
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
                                <td
                                  style={{ fontWeight: 600, color: "#1f2937" }}
                                >
                                  {order.ten_san_pham}
                                </td>
                                <td>{order.ten_nguoi_gui}</td>
                                <td
                                  style={{
                                    fontWeight: 700,
                                    color: "rgb(31, 41, 55)",
                                  }}
                                >
                                  {formatWeight(
                                    order.khoi_luong,
                                    order.don_vi_tinh,
                                  )}
                                </td>
                                <td
                                  style={{ color: "#64748b", fontSize: 12.5 }}
                                >
                                  {order.thoi_gian_xuat}
                                </td>
                                <td>
                                  <span
                                    className={`status-pill ${statusInfo.tone}`}
                                  >
                                    <StatusIcon size={13} /> {statusInfo.text}
                                  </span>
                                  {order.cho_ky && (
                                    <span
                                      className="status-pill warning"
                                      style={{ marginLeft: 6 }}
                                      title="Bạn đã bấm nhưng chưa ký: bước này chỉ có hiệu lực sau khi ký"
                                    >
                                      {({ NHAP_KHO: "Chờ ký nhập kho", TU_CHOI: "Chờ ký từ chối" })[order.cho_ky] || "Chờ ký"}
                                    </span>
                                  )}
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
                                      <span
                                        className="status-icon-modern empty"
                                        title="Chưa nhập kho"
                                      >
                                        <span className="empty-indicator"></span>
                                      </span>
                                    )}

                                    <div className="dropdown-container">
                                      <button
                                        type="button"
                                        className="btn-more-dots"
                                        title="Thao tác"
                                        onClick={(e) =>
                                          handleToggleMenu(
                                            e,
                                            `order-${order.ma_van_don}`,
                                          )
                                        }
                                      >
                                        <MoreVertical size={18} />
                                      </button>

                                      {isDropdownActive && (
                                        <div
                                          className={`dropdown-menu dropdown-fixed ${menuPos.up ? "dropdown-up" : ""}`}
                                          style={{
                                            right: menuPos.right,
                                            ...(menuPos.up
                                              ? { bottom: menuPos.bottom }
                                              : { top: menuPos.top }),
                                          }}
                                        >
                                          <div
                                            className="dropdown-item"
                                            onClick={() =>
                                              handleOpenDetailModal(order)
                                            }
                                          >
                                            <Eye size={15} />
                                            Xem chi tiết
                                          </div>

                                          {order.trang_thai ===
                                            "CHO_TIEP_NHAN" && (
                                            <>
                                              <div className="dropdown-divider"></div>
                                              <div
                                                className="dropdown-item"
                                                onClick={() =>
                                                  handleOpenReceiveModal(order)
                                                }
                                              >
                                                <Check
                                                  size={15}
                                                  color="#15803d"
                                                />
                                                Nghiệm thu & Nhập kho
                                              </div>
                                              <div
                                                className="dropdown-item danger"
                                                onClick={() =>
                                                  handleOpenRejectModal(order)
                                                }
                                              >
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
                        style={{
                          width: "100%",
                          height: 38,
                          cursor: "pointer",
                          fontWeight: 500,
                        }}
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
                            <td
                              colSpan={7}
                              style={{ padding: 24, color: "#6b7280" }}
                            >
                              Không có lô hàng nào tồn trong khu vực kho này.
                            </td>
                          </tr>
                        ) : (
                          filteredInventory.map((lot) => {
                            const daysLeft = getDaysRemaining(lot.han_luu_kho);
                            const isRevoked =
                              lot.trang_thai_chung_thu === "REVOKED";
                            const isExpiringSoon =
                              daysLeft !== null &&
                              daysLeft <= 7 &&
                              daysLeft > 0;
                            const isExpired =
                              daysLeft !== null && daysLeft <= 0;

                            return (
                              <tr
                                key={lot.ma_lo_nong_san}
                                className={isRevoked ? "row-locked" : ""}
                              >
                                <td style={{ fontWeight: 700 }}>
                                  {lot.ma_lo_nong_san}
                                </td>
                                <td
                                  style={{ fontWeight: 600, color: "#1e293b" }}
                                >
                                  {lot.ten_san_pham}
                                </td>
                                <td
                                  style={{ color: "#1e293b", fontWeight: 500 }}
                                >
                                  {lot.vi_tri_luu_kho || "—"}
                                </td>
                                <td
                                  style={{ fontWeight: 700, color: "#1e293b" }}
                                >
                                  {formatWeight(
                                    lot.so_luong_hien_tai,
                                    lot.don_vi_tinh,
                                  )}
                                </td>
                                <td>
                                  {lot.han_luu_kho || "—"}
                                  {isExpiringSoon && (
                                    <span
                                      style={{
                                        display: "block",
                                        fontSize: 11,
                                        color: "#b45309",
                                        fontWeight: 600,
                                      }}
                                    >
                                      (Cận date: còn {daysLeft} ngày)
                                    </span>
                                  )}
                                  {isExpired && (
                                    <span
                                      style={{
                                        display: "block",
                                        fontSize: 11,
                                        color: "#b91c1c",
                                        fontWeight: 600,
                                      }}
                                    >
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
                                      <CheckCircle2 size={14} /> Đã kiểm định
                                      đạt
                                    </span>
                                  ) : (
                                    <span className="status-pill info">
                                      Chưa có kiểm định
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="btn-action-view-outline"
                                    style={{ marginRight: 6 }}
                                    title="Xem chi tiết lô và lấy mã QR"
                                    onClick={() =>
                                      navigate(
                                        `/lo-hang/${encodeURIComponent(lot.ma_lo_nong_san)}`,
                                      )
                                    }
                                  >
                                    <Eye size={14} /> Chi tiết &amp; QR
                                  </button>
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
                                      <Lock
                                        size={13}
                                        style={{ marginRight: 4 }}
                                      />{" "}
                                      Bị khóa xuất
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="btn-action-view"
                                      onClick={() =>
                                        setActiveTab("tab-dispatch")
                                      }
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
              {activeTab === "tab-warehouse" && (
                <div>
                  <div className="tab-section-header" style={{ marginTop: 20 }}>
                    <div>
                      <h3 className="tab-section-title">Quản Lý Kho</h3>
                      <p className="tab-section-desc">
                        Tạo các kho của bạn; khi nhập kho chỉ cần chọn kho trong
                        danh sách này.
                      </p>
                    </div>
                    <div>
                      <button
                        type="button"
                        className="btn-primary-action"
                        onClick={handleOpenCreateWarehouse}
                      >
                        <PlusCircle size={17} />
                        <span>Tạo Kho</span>
                      </button>
                    </div>
                  </div>

                  <div className="table-container custom-scrollbar">
                    <table className="batch-table">
                      <thead>
                        <tr>
                          <th>Mã Kho</th>
                          <th>Tên Kho</th>
                          <th>Địa Chỉ</th>
                          <th>Số Lô Đang Chứa</th>
                          <th>Tổng Khối Lượng</th>
                          <th>Ghi Chú</th>
                          <th>Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {warehouses.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              style={{ padding: 24, color: "#6b7280" }}
                            >
                              Chưa có kho nào, bấm "Tạo Kho" để bắt đầu.
                            </td>
                          </tr>
                        ) : (
                          warehouses.map((kho) => (
                            <tr key={kho.ma_kho}>
                              <td style={{ fontWeight: 700 }}>{kho.ma_kho}</td>
                              <td style={{ fontWeight: 600 }}>{kho.ten_kho}</td>
                              <td>{kho.dia_chi || "—"}</td>
                              <td>{kho.so_lo}</td>
                              <td style={{ fontWeight: 700 }}>
                                {formatWeight(kho.tong_khoi_luong, "kg")}
                              </td>
                              <td>{kho.ghi_chu || "—"}</td>
                              <td>
                                <div style={{ display: "inline-flex", gap: 8 }}>
                                  <button
                                    type="button"
                                    className="btn-action-view-outline"
                                    title="Sửa kho"
                                    onClick={() => handleOpenEditWarehouse(kho)}
                                  >
                                    <Pencil size={14} />
                                    <span>Sửa</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-action-view-outline"
                                    style={{
                                      color: "#dc2626",
                                      borderColor: "#fecaca",
                                    }}
                                    title="Xóa kho"
                                    onClick={() => handleDeleteWarehouse(kho)}
                                  >
                                    <Trash2 size={14} />
                                    <span>Xóa</span>
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

              {activeTab === "tab-dispatch" && (
                <div>
                  <div className="metrics-row">
                    <div className="metric-card">
                      <div className="metric-title">Phiếu chờ xuất kho</div>
                      <div className="metric-number">
                        {
                          dispatchOrders.filter(
                            (o) => o.trang_thai === "CHO_XUAT",
                          ).length
                        }
                        <span className="metric-unit">PHIẾU</span>
                      </div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-title">
                        Phiếu đang trên đường giao
                      </div>
                      <div className="metric-number">
                        {shippingDispatchCount}
                        <span className="metric-unit">ĐANG GIAO</span>
                      </div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-title">Đã giao thành công</div>
                      <div className="metric-number">
                        {
                          dispatchOrders.filter(
                            (o) => o.trang_thai === "DA_GIAO",
                          ).length
                        }
                        <span className="metric-unit">ĐƠN</span>
                      </div>
                    </div>
                    <div className="actions-box">
                      <button
                        type="button"
                        className="btn-primary-action"
                        onClick={handleOpenCreateDispatch}
                      >
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
                        Theo dõi trạng thái giao nhận hàng và xem chi tiết đơn
                        hàng.
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
                            <td
                              colSpan={6}
                              style={{ padding: 24, color: "#6b7280" }}
                            >
                              Chưa lập phiếu xuất kho nào.
                            </td>
                          </tr>
                        ) : (
                          dispatchOrders.map((order) => (
                            <tr key={order.ma_phieu}>
                              <td style={{ fontWeight: 700, color: "#1d4ed8" }}>
                                {order.ma_phieu}
                              </td>
                              <td style={{ fontWeight: 600 }}>
                                {order.ten_dai_ly}
                              </td>
                              <td>
                                <strong>{order.ma_lo_nong_san}</strong> -{" "}
                                {order.ten_san_pham}
                              </td>
                              <td style={{ fontWeight: 700 }}>
                                {formatWeight(
                                  order.so_luong_xuat,
                                  order.don_vi_tinh,
                                )}
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
                                  {order.trang_thai === "DANG_GIAO" &&
                                  order.trang_thai_van_don === "CHO_TIEP_NHAN"
                                    ? "Đã tới nơi - Chờ đại lý nhận"
                                    : DISPATCH_STATUS_LABEL[order.trang_thai] ||
                                      order.trang_thai}
                                </span>
                                  {order.cho_ky && (
                                    <span
                                      className="status-pill warning"
                                      style={{ marginLeft: 6 }}
                                      title="Bạn đã bấm nhưng chưa ký: bước này chỉ có hiệu lực sau khi ký"
                                    >
                                      {({ XUAT_KHO: "Chờ ký xuất kho", TOI_NOI: "Chờ ký tới nơi", TAO_PHIEU: "Chờ ký xác nhận lấy hàng đi" })[order.cho_ky] || "Chờ ký"}
                                    </span>
                                  )}
                              </td>
                              <td>
                                <div
                                  style={{
                                    display: "inline-flex",
                                    justifyContent: "center",
                                  }}
                                >
                                  <button
                                    type="button"
                                    className="btn-action-view-outline"
                                    title="Xem chi tiết đơn phân phối"
                                    onClick={() =>
                                      handleNavigateChiTietPhanPhoi(
                                        order.ma_phieu,
                                      )
                                    }
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

              {activeTab === "blockchain" && (
                <div className="bc-tab">
                  <p className="bc-tab-desc">
                    Nhà phân phối ký khi nhận hàng (kèm khối lượng thực nhận)
                    hoặc từ chối nhận, khi lập phiếu phân phối cho đại lý (xác nhận
                    giao nguyên lô cho xe lấy đi). Đơn vị vận chuyển tự ký lấy hàng và tới nơi. Các
                    bước của một lô ký theo thứ tự.
                  </p>
                  <BlockchainPanel />
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
                        Quản lý đầu mối nhận hàng, địa chỉ và thông tin hợp tác
                        phân phối.
                      </p>
                    </div>
                    <div>
                      <button
                        type="button"
                        className="btn-primary-action"
                        onClick={() => {
                          setEditingDealer(null);
                          setDealerForm({
                            ten: "",
                            nguoiLienHe: "",
                            sdt: "",
                            diaChi: "",
                            maNguoiDung: "",
                          });
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
                          <th>Tài Khoản</th>
                          <th>Trạng Thái</th>
                          <th>Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dealers.length === 0 ? (
                          <tr>
                            <td
                              colSpan={8}
                              style={{ padding: 24, color: "#6b7280" }}
                            >
                              Chưa có đại lý nào, bấm "Thêm Đại Lý Mới" để bắt
                              đầu.
                            </td>
                          </tr>
                        ) : (
                          dealers.map((d) => {
                            const isDropdownActive =
                              openDropdown === `dealer-${d.ma_dai_ly}`;

                            return (
                              <tr
                                key={d.ma_dai_ly}
                                className={
                                  isDropdownActive ? "row-has-open-menu" : ""
                                }
                              >
                                <td style={{ fontWeight: 700 }}>
                                  {d.ma_dai_ly}
                                </td>
                                <td style={{ fontWeight: 600 }}>{d.ten}</td>
                                <td>{d.nguoi_lien_he}</td>
                                <td style={{ color: "#2563eb" }}>
                                  {d.so_dien_thoai}
                                </td>
                                <td>{d.dia_chi}</td>
                                <td>
                                  {d.tai_khoan ? (
                                    <span style={{ fontWeight: 600 }}>
                                      {d.tai_khoan}
                                    </span>
                                  ) : (
                                    <span
                                      style={{
                                        color: "#b45309",
                                        fontSize: 12.5,
                                      }}
                                    >
                                      Chưa gắn
                                    </span>
                                  )}
                                </td>
                                <td>
                                  {d.trang_thai === "HOAT_DONG" ? (
                                    <span className="status-pill success">
                                      Đang hợp tác
                                    </span>
                                  ) : (
                                    <span className="status-pill gray">
                                      Tạm ngưng
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <div className="status-icon-cell">
                                    {d.trang_thai === "HOAT_DONG" ? (
                                      <span
                                        className="status-icon-modern success"
                                        title="Đang hợp tác"
                                      >
                                        <CheckCircle2 size={16} />
                                      </span>
                                    ) : (
                                      <span
                                        className="status-icon-modern empty"
                                        title="Tạm ngưng hợp tác"
                                      >
                                        <span className="empty-indicator"></span>
                                      </span>
                                    )}

                                    <div className="dropdown-container">
                                      <button
                                        type="button"
                                        className="btn-more-dots"
                                        title="Thao tác"
                                        onClick={(e) =>
                                          handleToggleMenu(
                                            e,
                                            `dealer-${d.ma_dai_ly}`,
                                          )
                                        }
                                      >
                                        <MoreVertical size={18} />
                                      </button>

                                      {isDropdownActive && (
                                        <div
                                          className={`dropdown-menu dropdown-fixed ${menuPos.up ? "dropdown-up" : ""}`}
                                          style={{
                                            right: menuPos.right,
                                            ...(menuPos.up
                                              ? { bottom: menuPos.bottom }
                                              : { top: menuPos.top }),
                                          }}
                                        >
                                          <div
                                            className="dropdown-item"
                                            onClick={() =>
                                              handleOpenEditDealer(d)
                                            }
                                          >
                                            <Pencil size={15} />
                                            Sửa thông tin
                                          </div>

                                          <div
                                            className="dropdown-item"
                                            onClick={() =>
                                              handleOpenDealerHistory(d)
                                            }
                                          >
                                            <History size={15} />
                                            Lịch sử nhận hàng
                                          </div>

                                          <div className="dropdown-divider"></div>

                                          <div
                                            className={`dropdown-item ${d.trang_thai === "HOAT_DONG" ? "danger" : ""}`}
                                            onClick={() =>
                                              handleToggleDealerStatus(
                                                d.ma_dai_ly,
                                              )
                                            }
                                          >
                                            <Power size={15} />
                                            {d.trang_thai === "HOAT_DONG"
                                              ? "Tạm ngưng hợp tác"
                                              : "Kích hoạt hợp tác"}
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
                  <span style={{ fontWeight: 700, color: "#1d4ed8" }}>
                    {selectedOrder.ma_van_don}
                  </span>
                </div>
                <div className="readonly-item">
                  <label>Mã lô nông sản</label>
                  <span style={{ fontWeight: 700 }}>
                    {selectedOrder.ma_lo_nong_san}
                  </span>
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
                    {formatWeight(
                      selectedOrder.khoi_luong,
                      selectedOrder.don_vi_tinh,
                    )}
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
                    {INCOMING_STATUS[selectedOrder.trang_thai]?.text ||
                      selectedOrder.trang_thai}
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowDetailModal(false)}
              >
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
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  padding: "10px 14px",
                  borderRadius: 6,
                  marginBottom: 14,
                  fontSize: 13,
                }}
              >
                <p>
                  Mã vận đơn: <b>{selectedOrder.ma_van_don}</b>
                </p>
                <p>
                  Lô hàng: <b>{selectedOrder.ma_lo_nong_san}</b> -{" "}
                  {selectedOrder.ten_san_pham}
                </p>
                <p>
                  Khối lượng theo lệnh VC:{" "}
                  <b style={{ color: "#15803d" }}>
                    {selectedOrder.khoi_luong} {selectedOrder.don_vi_tinh}
                  </b>
                </p>
              </div>

              <div className="form-group">
                <label>
                  Khối Lượng Cân Thực Nhận ({selectedOrder.don_vi_tinh}) (*)
                </label>
                <input
                  type="number"
                  value={receiveForm.thucNhan}
                  onChange={(e) => handleReceiveChangeThucNhan(e.target.value)}
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>
                    Khối lượng hao hụt ({selectedOrder.don_vi_tinh})
                  </label>
                  <input
                    type="number"
                    readOnly
                    value={receiveForm.haoHut}
                    style={{ backgroundColor: "#f1f5f9", fontWeight: 700 }}
                  />
                </div>
                <div className="form-group">
                  <label>Kho Lưu Hàng (*)</label>
                  <select
                    value={receiveForm.maKho}
                    onChange={(e) =>
                      setReceiveForm({ ...receiveForm, maKho: e.target.value })
                    }
                  >
                    <option value="">-- Chọn kho --</option>
                    {warehouses.map((kho) => (
                      <option key={kho.ma_kho} value={kho.ma_kho}>
                        {kho.ten_kho}
                        {kho.dia_chi ? ` (${kho.dia_chi})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Hạn Lưu Kho (nếu có)</label>
                <input
                  type="date"
                  value={receiveForm.hanLuuKho}
                  onChange={(e) =>
                    setReceiveForm({
                      ...receiveForm,
                      hanLuuKho: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowReceiveModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-save"
                onClick={handleConfirmReceive}
              >
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
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowRejectModal(false)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="btn-save danger"
                onClick={handleConfirmReject}
              >
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
                  onChange={(e) =>
                    setDispatchForm({
                      ...dispatchForm,
                      daiLyId: e.target.value,
                    })
                  }
                >
                  <option value="">-- Chọn đại lý --</option>
                  {dealers
                    .filter((d) => d.trang_thai === "HOAT_DONG")
                    .map((d) => (
                      <option key={d.ma_dai_ly} value={d.ma_dai_ly}>
                        {d.ten} ({d.dia_chi})
                        {d.ma_nguoi_dung ? "" : " - chưa gắn tài khoản"}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Chọn Lô Hàng Xuất (Hạn gần nhất trước) (*)</label>
                  <select
                    value={dispatchForm.maLo}
                    onChange={(e) =>
                      setDispatchForm({ ...dispatchForm, maLo: e.target.value })
                    }
                  >
                    <option value="">-- Chọn lô --</option>
                    {inventoryList.map((lot) => {
                      const isRevoked = lot.trang_thai_chung_thu === "REVOKED";
                      // Lô còn bước chưa ký blockchain (vd nhập kho chưa ký): chưa lập phiếu phân phối được
                      const choKy = Boolean(lot.cho_ky);
                      return (
                        <option
                          key={lot.ma_lo_nong_san}
                          value={lot.ma_lo_nong_san}
                          disabled={isRevoked || choKy}
                        >
                          {lot.ma_lo_nong_san} - {lot.ten_san_pham} (Tồn:{" "}
                          {formatWeight(lot.so_luong_hien_tai, lot.don_vi_tinh)}
                          {lot.han_luu_kho ? ` - Hạn: ${lot.han_luu_kho}` : ""})
                          {isRevoked ? " [BỊ THU HỒI - KHÓA]" : ""}
                          {choKy && !isRevoked ? " [CHỜ KÝ - ký ở tab Ký blockchain]" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label>Khối Lượng Giao</label>
                  <div
                    style={{
                      padding: "10px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: 8,
                      background: "#f9fafb",
                      fontSize: 14,
                    }}
                  >
                    {(() => {
                      const lotChon = inventoryList.find((l) => l.ma_lo_nong_san === dispatchForm.maLo);
                      return lotChon
                        ? `Giao nguyên lô: ${formatWeight(lotChon.so_luong_hien_tai, lotChon.don_vi_tinh)}`
                        : "Chọn lô để xem khối lượng";
                    })()}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Đơn Vị Vận Chuyển (*)</label>
                <select
                  value={dispatchForm.maDonViVanChuyen}
                  onChange={(e) =>
                    setDispatchForm({
                      ...dispatchForm,
                      maDonViVanChuyen: e.target.value,
                    })
                  }
                >
                  <option value="">-- Chọn đơn vị vận chuyển --</option>
                  {transporters.map((t) => (
                    <option key={t.ma_nguoi_dung} value={t.ma_nguoi_dung}>
                      {t.ho_ten}
                      {t.so_dien_thoai ? ` (${t.so_dien_thoai})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <p
                style={{
                  fontSize: 12.5,
                  color: "#4b5563",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Đơn vị vận chuyển sẽ nhận lệnh, chọn tài xế và xe rồi chấp nhận. Sau đó bạn ký
                "Xác nhận lấy hàng đi" ở tab Ký blockchain; đơn vị vận chuyển tự ký lấy hàng và
                đến nơi trên trang của họ, rồi đại lý ký nhận.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowCreateDispatchModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-save"
                onClick={handleSaveDispatch}
              >
                Tạo Phiếu Xuất Kho
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= POPUP: TẠO / SỬA KHO ================= */}
      {showWarehouseModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>{editingWarehouse ? "Cập Nhật Kho" : "Tạo Kho Mới"}</h3>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tên Kho (*)</label>
                <input
                  type="text"
                  placeholder="VD: Kho Mát A"
                  value={warehouseForm.tenKho}
                  onChange={(e) =>
                    setWarehouseForm({
                      ...warehouseForm,
                      tenKho: e.target.value,
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label>Địa Chỉ Kho</label>
                <input
                  type="text"
                  placeholder="VD: 12 Đường số 5, KCN Vĩnh Lộc, TP.HCM"
                  value={warehouseForm.diaChi}
                  onChange={(e) =>
                    setWarehouseForm({
                      ...warehouseForm,
                      diaChi: e.target.value,
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label>Ghi Chú</label>
                <input
                  type="text"
                  placeholder="VD: Nhiệt độ 8-12°C, 6 kệ pallet"
                  value={warehouseForm.ghiChu}
                  onChange={(e) =>
                    setWarehouseForm({
                      ...warehouseForm,
                      ghiChu: e.target.value,
                    })
                  }
                />
              </div>
              {editingWarehouse && (
                <small style={{ color: "#6b7280" }}>
                  Đổi tên kho thì các lô đang lưu trong kho này đổi theo.
                </small>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowWarehouseModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-save"
                onClick={handleSaveWarehouse}
              >
                {editingWarehouse ? "Lưu Kho" : "Tạo Kho"}
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
              <h3>
                {editingDealer
                  ? "Cập Nhật Thông Tin Đại Lý"
                  : "Thêm Đại Lý Mới"}
              </h3>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tên Đại Lý / Siêu Thị (*)</label>
                <input
                  type="text"
                  placeholder="VD: Siêu thị Co.opMart"
                  value={dealerForm.ten}
                  onChange={(e) =>
                    setDealerForm({ ...dealerForm, ten: e.target.value })
                  }
                />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Người Liên Hệ</label>
                  <input
                    type="text"
                    placeholder="VD: Nguyễn Văn A"
                    value={dealerForm.nguoiLienHe}
                    onChange={(e) =>
                      setDealerForm({
                        ...dealerForm,
                        nguoiLienHe: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Số Điện Thoại (*)</label>
                  <input
                    type="text"
                    placeholder="VD: 0908123456"
                    value={dealerForm.sdt}
                    onChange={(e) =>
                      setDealerForm({ ...dealerForm, sdt: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Địa Chỉ Kho Giao Hàng</label>
                <textarea
                  rows={2}
                  placeholder="Địa chỉ giao hàng..."
                  value={dealerForm.diaChi}
                  onChange={(e) =>
                    setDealerForm({ ...dealerForm, diaChi: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>Tài Khoản Đại Lý</label>
                <select
                  value={dealerForm.maNguoiDung}
                  onChange={(e) =>
                    setDealerForm({
                      ...dealerForm,
                      maNguoiDung: e.target.value,
                    })
                  }
                >
                  <option value="">-- Chưa gắn tài khoản --</option>
                  {dealerAccounts
                    .filter(
                      (a) =>
                        !a.ma_dai_ly ||
                        a.ma_dai_ly === editingDealer?.ma_dai_ly ||
                        a.ma_nguoi_dung === dealerForm.maNguoiDung,
                    )
                    .map((a) => (
                      <option key={a.ma_nguoi_dung} value={a.ma_nguoi_dung}>
                        {a.ho_ten} ({a.ten_dang_nhap})
                      </option>
                    ))}
                </select>
                <small style={{ color: "#6b7280" }}>
                  Đại lý dùng tài khoản này để xác nhận nhận hàng và ký lên
                  blockchain. Bắt buộc khi xuất hàng có ghi blockchain.
                </small>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowDealerModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-save"
                onClick={handleSaveDealer}
              >
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
                <p
                  style={{ textAlign: "center", padding: 20, color: "#6b7280" }}
                >
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
                          <td style={{ fontWeight: 700, color: "#1d4ed8" }}>
                            {h.ma_phieu}
                          </td>
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
                              {DISPATCH_STATUS_LABEL[h.trang_thai] ||
                                h.trang_thai}
                            </span>
                          </td>
                          <td>
                            {new Date(h.created_at).toLocaleDateString("vi-VN")}
                          </td>
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
