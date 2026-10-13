import React, { useState, useEffect } from "react";
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
  Printer,
  Ban,
  Lock,
  Truck,
  Check,
  MoreVertical,
  Eye,
  Pencil,
  History,
  Power,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../../css/nhaphanphoi.css";

const DEFAULT_LOGO_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png";

const NhaPhanPhoiPage = () => {
  const navigate = useNavigate();

  // ==========================================
  // 1. QUẢN LÝ TAB
  // ==========================================
  const [activeTab, setActiveTab] = useState("tab-import");

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
  const [importOrders, setImportOrders] = useState([
    {
      maVanDon: "VC-2026-9011",
      maLo: "SC-2026-004",
      tenSP: "Thanh Long Ruột Đỏ Bình Thuận",
      benGui: "HTX Thanh Long Chợ Gạo",
      taiXe: "Chưa phân công",
      bienSo: "—",
      khoiLuongLenh: 1800,
      khoiLuongThuc: 0,
      thoiGian: "14/10/2026 - 08:30",
      trangThai: "CHO_TIEP_NHAN",
    },
    {
      maVanDon: "VC-2026-8809",
      maLo: "SC-2026-003",
      tenSP: "Bưởi Da Xanh Bến Tre",
      benGui: "Công Ty Nông Sản Sông Tiền",
      taiXe: "Trần Minh Phát",
      bienSo: "63D-092.11",
      khoiLuongLenh: 2500,
      khoiLuongThuc: 0,
      thoiGian: "13/10/2026 - 15:00",
      trangThai: "DANG_VAN_CHUYEN",
    },
    {
      maVanDon: "VC-2026-8801",
      maLo: "SC-2026-001",
      tenSP: "Quýt Đường Sơ Chế Loại 1",
      benGui: "HTX Sơ Chế Chế Biến Mekong",
      taiXe: "Nguyễn Văn Hùng",
      bienSo: "65C-128.45",
      khoiLuongLenh: 1200,
      khoiLuongThuc: 0,
      thoiGian: "13/10/2026 - 10:15",
      trangThai: "DA_DEN_BAI",
    },
    {
      maVanDon: "VC-2026-8790",
      maLo: "SC-2026-002",
      tenSP: "Cam Sành Tiền Giang VietGAP",
      benGui: "Vựa Nông Sản Cái Bè",
      taiXe: "Lê Văn Đạt",
      bienSo: "64B-883.12",
      khoiLuongLenh: 800,
      khoiLuongThuc: 800,
      thoiGian: "12/10/2026 - 16:30",
      trangThai: "DA_NHAP_KHO",
    },
  ]);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const [receiveForm, setReceiveForm] = useState({
    thucNhan: "",
    haoHut: 0,
    lyDoHaoHut: "",
    viTriKho: "Kho Mát A (Kệ Pallet 01)",
  });
  const [rejectReason, setRejectReason] = useState("");

  // ==========================================
  // 4. DỮ LIỆU TAB 2: KHO HÀNG
  // ==========================================
  const [selectedWarehouse, setSelectedWarehouse] = useState("ALL");
  const [inventoryList, setInventoryList] = useState([
    {
      maLo: "SC-2026-001",
      tenSP: "Quýt Đường Sơ Chế Loại 1",
      viTri: "Kho Mát A (Kệ Pallet 01)",
      tonKho: 1195,
      donVi: "kg",
      hanBaoQuan: "2026-10-18",
      trangThaiChungThu: "VALID",
    },
    {
      maLo: "SC-2026-002",
      tenSP: "Cam Sành Tiền Giang VietGAP",
      viTri: "Kho Mát A (Kệ Pallet 04)",
      tonKho: 800,
      donVi: "kg",
      hanBaoQuan: "2026-10-30",
      trangThaiChungThu: "VALID",
    },
    {
      maLo: "SC-2026-099",
      tenSP: "Xoài Cát Hòa Lộc",
      viTri: "Kho Mát B (Kệ Pallet 12)",
      tonKho: 500,
      donVi: "kg",
      hanBaoQuan: "2026-11-15",
      trangThaiChungThu: "REVOKED",
    },
  ]);

  // ==========================================
  // 5. DỮ LIỆU TAB 3: PHÂN PHỐI CHO ĐẠI LÝ
  // ==========================================
  const [dispatchOrders, setDispatchOrders] = useState([
    {
      maPhieu: "PXK-2026-081",
      daiLyId: "DL01",
      tenDaiLy: "Hệ thống Siêu Thị Co.opMart",
      maLo: "SC-2026-002",
      tenSP: "Cam Sành Tiền Giang VietGAP",
      soLuongXuat: 300,
      soLuongThucNhan: 300,
      hinhThuc: "DV_VAN_CHUYEN",
      vanChuyenInfo: "Giao Hàng Nhanh AgriLogistics",
      trangThai: "DA_GIAO",
      ngayTao: "12/10/2026",
    },
    {
      maPhieu: "PXK-2026-082",
      daiLyId: "DL02",
      tenDaiLy: "Bách Hóa Xanh - Chi nhánh 12",
      maLo: "SC-2026-001",
      tenSP: "Quýt Đường Sơ Chế Loại 1",
      soLuongXuat: 250,
      soLuongThucNhan: 0,
      hinhThuc: "TU_GIAO",
      vanChuyenInfo: "Tài xế kho: Lê Hoàng (59C-334.81)",
      trangThai: "DANG_GIAO",
      ngayTao: "13/10/2026",
    },
    {
      maPhieu: "PXK-2026-083",
      daiLyId: "DL01",
      tenDaiLy: "Hệ thống Siêu Thị Co.opMart",
      maLo: "SC-2026-001",
      tenSP: "Quýt Đường Sơ Chế Loại 1",
      soLuongXuat: 150,
      soLuongThucNhan: 0,
      hinhThuc: "TU_GIAO",
      vanChuyenInfo: "Tài xế kho: Lê Hoàng (59C-334.81)",
      trangThai: "CHO_XUAT",
      ngayTao: "13/10/2026",
    },
  ]);

  const [showCreateDispatchModal, setShowCreateDispatchModal] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({
    daiLyId: "DL01",
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
  const [dealers, setDealers] = useState([
    {
      id: "DL01",
      ten: "Hệ thống Siêu Thị Co.opMart",
      nguoiLienHe: "Nguyễn Thu Hà",
      sdt: "0908123456",
      diaChi: "168 Nguyễn Đình Chiểu, Q.3, TP.HCM",
      trangThai: "HOAT_DONG",
    },
    {
      id: "DL02",
      ten: "Bách Hóa Xanh - Chi nhánh 12",
      nguoiLienHe: "Phạm Quốc Tuấn",
      sdt: "0912345678",
      diaChi: "45 Quang Trung, Gò Vấp, TP.HCM",
      trangThai: "HOAT_DONG",
    },
  ]);

  const [showDealerModal, setShowDealerModal] = useState(false);
  const [editingDealer, setEditingDealer] = useState(null);
  const [dealerForm, setDealerForm] = useState({
    ten: "",
    nguoiLienHe: "",
    sdt: "",
    diaChi: "",
  });
  const [viewHistoryDealer, setViewHistoryDealer] = useState(null);

  // ==========================================
  // TÍNH TOÁN METRICS
  // ==========================================
  const incomingActiveCount = importOrders.filter(
    (o) => o.trangThai === "DANG_VAN_CHUYEN" || o.trangThai === "DA_DEN_BAI",
  ).length;
  const totalStockKg = inventoryList.reduce((acc, cur) => acc + cur.tonKho, 0);
  const shippingDispatchCount = dispatchOrders.filter(
    (d) => d.trangThai === "DANG_GIAO",
  ).length;

  const getDaysRemaining = (dateStr) => {
    const today = new Date("2026-10-13");
    const expDate = new Date(dateStr);
    const diffTime = expDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // ==========================================
  // ĐIỀU HƯỚNG TRANG CHI TIẾT
  // ==========================================
  const handleNavigateChiTietPhanPhoi = (maDon) => {
    navigate(`/chi-tiet-phan-phoi?madon=${encodeURIComponent(maDon)}`);
  };

  // ==========================================
  // HÀNH ĐỘNG TAB 1: NHẬP KHO
  // ==========================================
  const handleOpenDetailModal = (order) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
    setOpenDropdown(null);
  };

  const handleAcceptOrder = (order) => {
    setOpenDropdown(null);
    if (
      window.confirm(
        `Xác nhận chấp nhận vận đơn ${order.maVanDon}? Bên vận chuyển sẽ bốc xếp và xuất phát đến kho.`,
      )
    ) {
      setImportOrders((prev) =>
        prev.map((o) =>
          o.maVanDon === order.maVanDon
            ? { ...o, trangThai: "DANG_VAN_CHUYEN" }
            : o,
        ),
      );
      alert(`Đã duyệt vận đơn ${order.maVanDon}!`);
    }
  };

  const handleRejectPendingOrder = (order) => {
    setOpenDropdown(null);
    const reason = prompt(
      `Lý do từ chối vận đơn ${order.maVanDon} trước khi giao:`,
    );
    if (reason && reason.trim()) {
      setImportOrders((prev) =>
        prev.map((o) =>
          o.maVanDon === order.maVanDon ? { ...o, trangThai: "TU_CHOI" } : o,
        ),
      );
    }
  };

  const handleOpenReceiveModal = (order) => {
    setOpenDropdown(null);
    setSelectedOrder(order);
    setReceiveForm({
      thucNhan: order.khoiLuongLenh,
      haoHut: 0,
      lyDoHaoHut: "",
      viTriKho: "Kho Mát A (Kệ Pallet 01)",
    });
    setShowReceiveModal(true);
  };

  const handleReceiveChangeThucNhan = (val) => {
    const thucNhanVal = Number(val);
    const lenhVal = selectedOrder?.khoiLuongLenh || 0;
    const diff = Math.max(0, lenhVal - thucNhanVal);
    setReceiveForm((prev) => ({
      ...prev,
      thucNhan: val,
      haoHut: diff,
    }));
  };

  const handleConfirmReceive = () => {
    if (!receiveForm.thucNhan || Number(receiveForm.thucNhan) <= 0) {
      alert("Vui lòng nhập khối lượng thực nhận hợp lệ!");
      return;
    }
    if (Number(receiveForm.haoHut) > 0 && !receiveForm.lyDoHaoHut.trim()) {
      alert("Phát hiện hao hụt, vui lòng nhập lý do hao hụt!");
      return;
    }

    const newStock = {
      maLo: selectedOrder.maLo,
      tenSP: selectedOrder.tenSP,
      viTri: receiveForm.viTriKho,
      tonKho: Number(receiveForm.thucNhan),
      donVi: "kg",
      hanBaoQuan: "2026-10-28",
      trangThaiChungThu: "VALID",
    };
    setInventoryList((prev) => [newStock, ...prev]);

    setImportOrders((prev) =>
      prev.map((o) =>
        o.maVanDon === selectedOrder.maVanDon
          ? {
              ...o,
              khoiLuongThuc: Number(receiveForm.thucNhan),
              trangThai: "DA_NHAP_KHO",
            }
          : o,
      ),
    );

    setShowReceiveModal(false);
    alert(
      `Đã lưu kho thành công ${receiveForm.thucNhan} kg cho lô ${selectedOrder.maLo}!`,
    );
  };

  const handleOpenRejectModal = (order) => {
    setOpenDropdown(null);
    setSelectedOrder(order);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) {
      alert("Bắt buộc ghi rõ lý do từ chối nhận hàng!");
      return;
    }
    setImportOrders((prev) =>
      prev.map((o) =>
        o.maVanDon === selectedOrder.maVanDon
          ? { ...o, trangThai: "TU_CHOI" }
          : o,
      ),
    );
    setShowRejectModal(false);
    alert(
      `Đã từ chối nhận vận đơn ${selectedOrder.maVanDon}. Lý do: ${rejectReason}`,
    );
  };

  // ==========================================
  // HÀNH ĐỘNG TAB 3: PHÂN PHỐI ĐẠI LÝ
  // ==========================================
  const handleOpenCreateDispatch = () => {
    const validLots = inventoryList
      .filter((lot) => lot.trangThaiChungThu === "VALID" && lot.tonKho > 0)
      .sort((a, b) => new Date(a.hanBaoQuan) - new Date(b.hanBaoQuan));

    const defaultLot = validLots[0]?.maLo || "";
    setDispatchForm({
      daiLyId: dealers.find((d) => d.trangThai === "HOAT_DONG")?.id || "",
      maLo: defaultLot,
      soLuongXuat: "",
      hinhThuc: "TU_GIAO",
      tenDonViVC: "",
      taiXe: "Lê Hoàng",
      bienSo: "59C-334.81",
    });
    setShowCreateDispatchModal(true);
  };

  const handleSaveDispatch = () => {
    const lot = inventoryList.find((l) => l.maLo === dispatchForm.maLo);
    if (!lot) {
      alert("Vui lòng chọn lô xuất hàng!");
      return;
    }
    if (lot.trangThaiChungThu === "REVOKED") {
      alert("LÔ ĐÃ BỊ THU HỒI CHỨNG THƯ! Hệ thống tự động chặn xuất.");
      return;
    }
    const days = getDaysRemaining(lot.hanBaoQuan);
    if (days <= 0) {
      alert("Lô hàng đã hết hạn bảo quản! Không thể xuất kho.");
      return;
    }
    const xuatKg = Number(dispatchForm.soLuongXuat);
    if (!xuatKg || xuatKg <= 0) {
      alert("Số lượng xuất phải lớn hơn 0!");
      return;
    }
    if (xuatKg > lot.tonKho) {
      alert(`Số lượng vượt quá tồn kho khả dụng (${lot.tonKho} kg)!`);
      return;
    }

    const selectedDealer = dealers.find((d) => d.id === dispatchForm.daiLyId);

    const newDispatch = {
      maPhieu: `PXK-2026-0${dispatchOrders.length + 84}`,
      daiLyId: selectedDealer.id,
      tenDaiLy: selectedDealer.ten,
      maLo: lot.maLo,
      tenSP: lot.tenSP,
      soLuongXuat: xuatKg,
      soLuongThucNhan: 0,
      hinhThuc: dispatchForm.hinhThuc,
      vanChuyenInfo:
        dispatchForm.hinhThuc === "TU_GIAO"
          ? `${dispatchForm.taiXe} (${dispatchForm.bienSo})`
          : dispatchForm.tenDonViVC,
      trangThai: "CHO_XUAT",
      ngayTao: "13/10/2026",
    };

    setInventoryList((prev) =>
      prev.map((item) =>
        item.maLo === lot.maLo
          ? { ...item, tonKho: item.tonKho - xuatKg }
          : item,
      ),
    );

    setDispatchOrders([newDispatch, ...dispatchOrders]);
    setShowCreateDispatchModal(false);
    alert(`Đã lập phiếu xuất kho ${newDispatch.maPhieu} thành công!`);
  };

  // Lọc kho hàng theo vị trí
  const filteredInventory = inventoryList.filter((item) => {
    if (selectedWarehouse === "ALL") return true;
    return item.viTri.includes(selectedWarehouse);
  });

  // ==========================================
  // HÀNH ĐỘNG TAB 4: ĐẠI LÝ
  // ==========================================
  const handleOpenEditDealer = (dealer) => {
    setOpenDropdown(null);
    setEditingDealer(dealer);
    setDealerForm({
      ten: dealer.ten,
      nguoiLienHe: dealer.nguoiLienHe,
      sdt: dealer.sdt,
      diaChi: dealer.diaChi,
    });
    setShowDealerModal(true);
  };

  const handleToggleDealerStatus = (id) => {
    setOpenDropdown(null);
    setDealers((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              trangThai: d.trangThai === "HOAT_DONG" ? "NGUNG" : "HOAT_DONG",
            }
          : d,
      ),
    );
  };

  const handleOpenDealerHistory = (dealer) => {
    setOpenDropdown(null);
    setViewHistoryDealer(dealer);
  };

  const handleSaveDealer = () => {
    if (!dealerForm.ten || !dealerForm.sdt) {
      alert("Vui lòng nhập tên đại lý và số điện thoại!");
      return;
    }
    if (editingDealer) {
      setDealers((prev) =>
        prev.map((d) =>
          d.id === editingDealer.id ? { ...d, ...dealerForm } : d,
        ),
      );
      alert("Cập nhật đại lý thành công!");
    } else {
      const newD = {
        id: `DL0${dealers.length + 1}`,
        ...dealerForm,
        trangThai: "HOAT_DONG",
      };
      setDealers([...dealers, newD]);
      alert("Thêm đại lý mới thành công!");
    }
    setShowDealerModal(false);
  };

  return (
    <div className="nongdan dashboard-layout">
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

        <div className="header-profile" title="Tài khoản NPP">
          <div className="avatar-circle">NPP</div>
          <div className="profile-meta">
            <span className="profile-name">Tổng Kho Bách Hóa Sài Gòn</span>
            <span className="profile-role">Đơn vị phân phối trung chuyển</span>
          </div>
        </div>
      </header>

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

          <div className="sidebar-footer">
            <span className="pulse-dot"></span>
            <span>
              Kho vận: <b>AgriHub Central #01</b>
            </span>
          </div>
        </aside>

        {/* ================= MAIN CONTENT ================= */}
        <main className="dashboard-content">
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
                    {totalStockKg.toLocaleString("vi-VN")}
                    <span className="metric-unit">KG</span>
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
                    Theo dõi trạng thái vận đơn, duyệt tiếp nhận và nghiệm thu
                    lưu kho nông sản.
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
                      <th>Khối lượng thực nhận</th>
                      <th>Thời gian</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importOrders.map((order) => {
                      const isDropdownActive =
                        openDropdown === `order-${order.maVanDon}`;

                      const renderStatus = () => {
                        switch (order.trangThai) {
                          case "CHO_TIEP_NHAN":
                            return (
                              <span className="status-pill warning">
                                <Clock size={13} /> Chờ chấp nhận
                              </span>
                            );
                          case "DANG_VAN_CHUYEN":
                            return (
                              <span className="status-pill info">
                                <Truck size={13} /> Đang vận chuyển
                              </span>
                            );
                          case "DA_DEN_BAI":
                            return (
                              <span
                                className="status-pill warning"
                                style={{
                                  backgroundColor: "#fef08a",
                                  color: "#854d0e",
                                }}
                              >
                                <Clock size={13} /> Xe đã đến bãi
                              </span>
                            );
                          case "DA_NHAP_KHO":
                            return (
                              <span className="status-pill success">
                                <CheckCircle2 size={13} /> Đã nhập kho
                              </span>
                            );
                          case "TU_CHOI":
                            return (
                              <span className="status-pill danger">
                                <XCircle size={13} /> Đã từ chối
                              </span>
                            );
                          default:
                            return order.trangThai;
                        }
                      };

                      return (
                        <tr
                          key={order.maVanDon}
                          className={
                            isDropdownActive ? "row-has-open-menu" : ""
                          }
                        >
                          <td style={{ fontWeight: 700, color: "#1d4ed8" }}>
                            {order.maVanDon}
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
                              {order.maLo}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, color: "#1f2937" }}>
                            {order.tenSP}
                          </td>
                          <td>{order.benGui}</td>
                          <td style={{ fontWeight: 700, color: "#15803d" }}>
                            {order.khoiLuongThuc > 0
                              ? `${order.khoiLuongThuc.toLocaleString("vi-VN")} kg`
                              : `${order.khoiLuongLenh.toLocaleString("vi-VN")} kg (Lệnh)`}
                          </td>
                          <td style={{ color: "#64748b", fontSize: 12.5 }}>
                            {order.thoiGian}
                          </td>
                          <td>{renderStatus()}</td>
                          <td>
                            <div className="status-icon-cell">
                              {order.trangThai === "DA_NHAP_KHO" ? (
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
                                      `order-${order.maVanDon}`,
                                    )
                                  }
                                >
                                  <MoreVertical size={18} />
                                </button>

                                {isDropdownActive && (
                                  <div
                                    className={`dropdown-menu dropdown-fixed ${
                                      menuPos.up ? "dropdown-up" : ""
                                    }`}
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

                                    {order.trangThai === "CHO_TIEP_NHAN" && (
                                      <>
                                        <div className="dropdown-divider"></div>
                                        <div
                                          className="dropdown-item"
                                          onClick={() =>
                                            handleAcceptOrder(order)
                                          }
                                        >
                                          <Check size={15} color="#15803d" />
                                          Chấp nhận tiếp nhận
                                        </div>
                                        <div
                                          className="dropdown-item danger"
                                          onClick={() =>
                                            handleRejectPendingOrder(order)
                                          }
                                        >
                                          <XCircle size={15} />
                                          Từ chối nhận
                                        </div>
                                      </>
                                    )}

                                    {order.trangThai === "DA_DEN_BAI" && (
                                      <>
                                        <div className="dropdown-divider"></div>
                                        <div
                                          className="dropdown-item"
                                          onClick={() =>
                                            handleOpenReceiveModal(order)
                                          }
                                        >
                                          <CheckCircle2
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
                                          Từ chối nhận tại bãi
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
                    })}
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
                    Báo Cáo Kho Hàng Thực Tế & Thời Hạn Bảo Quản
                  </h3>
                  <p className="tab-section-desc">
                    Quản lý vòng đời nông sản trong kho, hạn chế hao hụt và cảnh
                    báo cận date.
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
                    <option value="Kho Mát A">
                      Kho Mát A (Trái cây có múi)
                    </option>
                    <option value="Kho Mát B">
                      Kho Mát B (Trái cây nhiệt đới)
                    </option>
                    <option value="Kho Lạnh C">Kho Lạnh C (Rau củ quả)</option>
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
                      <th>Hạn Bảo Quản</th>
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
                        const daysLeft = getDaysRemaining(lot.hanBaoQuan);
                        const isRevoked = lot.trangThaiChungThu === "REVOKED";
                        const isExpiringSoon = daysLeft <= 7 && daysLeft > 0;
                        const isExpired = daysLeft <= 0;

                        return (
                          <tr
                            key={lot.maLo}
                            className={isRevoked ? "row-locked" : ""}
                          >
                            <td style={{ fontWeight: 700 }}>{lot.maLo}</td>
                            <td style={{ fontWeight: 600, color: "#1e293b" }}>
                              {lot.tenSP}
                            </td>
                            <td style={{ color: "#2563eb", fontWeight: 500 }}>
                              {lot.viTri}
                            </td>
                            <td style={{ fontWeight: 700, color: "#15803d" }}>
                              {lot.tonKho.toLocaleString("vi-VN")} {lot.donVi}
                            </td>
                            <td>
                              {lot.hanBaoQuan}
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
                                  (Đã hết hạn bảo quản)
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
                                  <XCircle size={14} /> Hết hạn sử dụng
                                </span>
                              ) : (
                                <span className="status-pill success">
                                  <CheckCircle2 size={14} /> An toàn
                                </span>
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
                                  <Lock size={13} style={{ marginRight: 4 }} />{" "}
                                  Bị khóa xuất
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

          {/* ================= TAB 3: PHÂN PHỐI CHO ĐẠI LÝ (CHỈ GIỮ LẠI NÚT XEM CHI TIẾT) ================= */}
          {activeTab === "tab-dispatch" && (
            <div>
              <div className="metrics-row">
                <div className="metric-card">
                  <div className="metric-title">Phiếu chờ xuất kho</div>
                  <div className="metric-number">
                    {
                      dispatchOrders.filter((o) => o.trangThai === "CHO_XUAT")
                        .length
                    }
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
                    {
                      dispatchOrders.filter((o) => o.trangThai === "DA_GIAO")
                        .length
                    }
                    <span className="metric-unit">ĐƠN</span>
                  </div>
                </div>
                <div className="actions-box">
                  <button
                    type="button"
                    className="btn-primary-action"
                    onClick={() => setShowCreateDispatchModal(true)}
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
                    Theo dõi trạng thái giao nhận hàng, đối chiếu số lượng thực
                    nhận và xem chi tiết đơn hàng.
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
                      <th>Thực Nhận</th>
                      <th>Trạng Thái</th>
                      <th>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispatchOrders.map((order) => (
                      <tr key={order.maPhieu}>
                        <td style={{ fontWeight: 700, color: "#1d4ed8" }}>
                          {order.maPhieu}
                        </td>
                        <td style={{ fontWeight: 600 }}>{order.tenDaiLy}</td>
                        <td>
                          <strong>{order.maLo}</strong> - {order.tenSP}
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          {order.soLuongXuat} kg
                        </td>
                        <td style={{ fontWeight: 700, color: "#15803d" }}>
                          {order.trangThai === "DA_GIAO"
                            ? `${order.soLuongThucNhan} kg`
                            : "—"}
                        </td>
                        <td>
                          <span className="status-pill success">
                            {order.trangThai}
                          </span>
                        </td>
                        <td>
                          {/* CHỈ GIỮ LẠI DUY NHẤT 1 NÚT XEM CHI TIẾT */}
                          <div
                            style={{
                              display: "inline-flex",
                              justifyContent: "center",
                            }}
                          >
                            <button
                              type="button"
                              className="btn-action-view"
                              title="Xem chi tiết đơn phân phối"
                              onClick={() =>
                                handleNavigateChiTietPhanPhoi(order.maPhieu)
                              }
                            >
                              <Eye size={14} />
                              <span>Xem chi tiết</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB 4: ĐẠI LÝ (NÚT 3 CHẤM POPUP) ================= */}
          {activeTab === "tab-dealers" && (
            <div>
              <div className="tab-section-header" style={{ marginTop: 20 }}>
                <div>
                  <h3 className="tab-section-title">
                    Danh Sách Đại Lý & Kênh Bán Lẻ Hợp Tác
                  </h3>
                  <p className="tab-section-desc">
                    Quản lý đầu mối nhận hàng, địa chỉ và thông tin hợp tác phân
                    phối.
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
                      <th>Trạng Thái</th>
                      <th>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dealers.map((d) => {
                      const isDropdownActive =
                        openDropdown === `dealer-${d.id}`;

                      return (
                        <tr
                          key={d.id}
                          className={
                            isDropdownActive ? "row-has-open-menu" : ""
                          }
                        >
                          <td style={{ fontWeight: 700 }}>{d.id}</td>
                          <td style={{ fontWeight: 600 }}>{d.ten}</td>
                          <td>{d.nguoiLienHe}</td>
                          <td style={{ color: "#2563eb" }}>{d.sdt}</td>
                          <td>{d.diaChi}</td>
                          <td>
                            {d.trangThai === "HOAT_DONG" ? (
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
                              {d.trangThai === "HOAT_DONG" ? (
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

                              {/* NÚT 3 CHẤM DÀNH CHO TAB ĐẠI LÝ */}
                              <div className="dropdown-container">
                                <button
                                  type="button"
                                  className="btn-more-dots"
                                  title="Thao tác"
                                  onClick={(e) =>
                                    handleToggleMenu(e, `dealer-${d.id}`)
                                  }
                                >
                                  <MoreVertical size={18} />
                                </button>

                                {isDropdownActive && (
                                  <div
                                    className={`dropdown-menu dropdown-fixed ${
                                      menuPos.up ? "dropdown-up" : ""
                                    }`}
                                    style={{
                                      right: menuPos.right,
                                      ...(menuPos.up
                                        ? { bottom: menuPos.bottom }
                                        : { top: menuPos.top }),
                                    }}
                                  >
                                    <div
                                      className="dropdown-item"
                                      onClick={() => handleOpenEditDealer(d)}
                                    >
                                      <Pencil size={15} />
                                      Sửa thông tin
                                    </div>

                                    <div
                                      className="dropdown-item"
                                      onClick={() => handleOpenDealerHistory(d)}
                                    >
                                      <History size={15} />
                                      Lịch sử nhận hàng
                                    </div>

                                    <div className="dropdown-divider"></div>

                                    <div
                                      className={`dropdown-item ${d.trangThai === "HOAT_DONG" ? "danger" : ""}`}
                                      onClick={() =>
                                        handleToggleDealerStatus(d.id)
                                      }
                                    >
                                      <Power size={15} />
                                      {d.trangThai === "HOAT_DONG"
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
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ================= POPUP 1: CHI TIẾT VẬN ĐƠN (TAB 1) ================= */}
      {showDetailModal && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Chi Tiết Vận Đơn {selectedOrder.maVanDon}</h3>
            </div>
            <div className="modal-body">
              <div className="form-grid-2 readonly-grid">
                <div className="readonly-item">
                  <label>Mã vận đơn</label>
                  <span style={{ fontWeight: 700, color: "#1d4ed8" }}>
                    {selectedOrder.maVanDon}
                  </span>
                </div>
                <div className="readonly-item">
                  <label>Mã lô nông sản</label>
                  <span style={{ fontWeight: 700 }}>{selectedOrder.maLo}</span>
                </div>
                <div className="readonly-item">
                  <label>Tên sản phẩm</label>
                  <span>{selectedOrder.tenSP}</span>
                </div>
                <div className="readonly-item">
                  <label>Đơn vị gửi hàng</label>
                  <span>{selectedOrder.benGui}</span>
                </div>
                <div className="readonly-item">
                  <label>Khối lượng trên lệnh</label>
                  <span style={{ fontWeight: 700, color: "#15803d" }}>
                    {selectedOrder.khoiLuongLenh.toLocaleString("vi-VN")} kg
                  </span>
                </div>
                <div className="readonly-item">
                  <label>Khối lượng thực nhận</label>
                  <span style={{ fontWeight: 700 }}>
                    {selectedOrder.khoiLuongThuc > 0
                      ? `${selectedOrder.khoiLuongThuc.toLocaleString("vi-VN")} kg`
                      : "Chưa cân nhập kho"}
                  </span>
                </div>
                <div className="readonly-item">
                  <label>Tài xế phụ trách</label>
                  <span>{selectedOrder.taiXe}</span>
                </div>
                <div className="readonly-item">
                  <label>Biển số xe</label>
                  <span>{selectedOrder.bienSo}</span>
                </div>
                <div className="readonly-item">
                  <label>Thời gian ghi nhận</label>
                  <span>{selectedOrder.thoiGian}</span>
                </div>
                <div className="readonly-item">
                  <label>Trạng thái</label>
                  <span style={{ fontWeight: 600 }}>
                    {selectedOrder.trangThai}
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
                  Mã vận đơn: <b>{selectedOrder.maVanDon}</b>
                </p>
                <p>
                  Lô sơ chế: <b>{selectedOrder.maLo}</b> - {selectedOrder.tenSP}
                </p>
                <p>
                  Khối lượng theo lệnh VC:{" "}
                  <b style={{ color: "#15803d" }}>
                    {selectedOrder.khoiLuongLenh} kg
                  </b>
                </p>
              </div>

              <div className="form-group">
                <label>Khối Lượng Cân Thực Nhận (kg) (*)</label>
                <input
                  type="number"
                  value={receiveForm.thucNhan}
                  onChange={(e) => handleReceiveChangeThucNhan(e.target.value)}
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Khối lượng hao hụt (kg)</label>
                  <input
                    type="number"
                    readOnly
                    value={receiveForm.haoHut}
                    style={{ backgroundColor: "#f1f5f9", fontWeight: 700 }}
                  />
                </div>
                <div className="form-group">
                  <label>Chỉ Định Vị Trí Kho Nhận</label>
                  <select
                    value={receiveForm.viTriKho}
                    onChange={(e) =>
                      setReceiveForm({
                        ...receiveForm,
                        viTriKho: e.target.value,
                      })
                    }
                  >
                    <option>Kho Mát A (Kệ Pallet 01)</option>
                    <option>Kho Mát A (Kệ Pallet 02)</option>
                    <option>Kho Lạnh B (Dãy 04)</option>
                  </select>
                </div>
              </div>

              {Number(receiveForm.haoHut) > 0 && (
                <div className="form-group">
                  <label style={{ color: "#b91c1c" }}>
                    Lý do hao hụt dập hỏng (*)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="VD: Dập đáy thùng trong khi di chuyển..."
                    value={receiveForm.lyDoHaoHut}
                    onChange={(e) =>
                      setReceiveForm({
                        ...receiveForm,
                        lyDoHaoHut: e.target.value,
                      })
                    }
                  />
                </div>
              )}
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
                Từ chối nhận vận đơn <b>{selectedOrder.maVanDon}</b> mang lô{" "}
                <b>{selectedOrder.maLo}</b>. Bắt buộc nhập lý do:
              </p>
              <div className="form-group">
                <label>Lý do từ chối nhận (*)</label>
                <textarea
                  rows={4}
                  placeholder="VD: Đứt niêm phong Seal thùng xe, nhiệt độ thùng xe quá cao làm úng quả..."
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
                  {dealers
                    .filter((d) => d.trangThai === "HOAT_DONG")
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.ten} ({d.diaChi})
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Chọn Lô Hàng Xuất (FEFO - Hạn gần nhất) (*)</label>
                  <select
                    value={dispatchForm.maLo}
                    onChange={(e) =>
                      setDispatchForm({ ...dispatchForm, maLo: e.target.value })
                    }
                  >
                    {inventoryList.map((lot) => {
                      const isRevoked = lot.trangThaiChungThu === "REVOKED";
                      return (
                        <option
                          key={lot.maLo}
                          value={lot.maLo}
                          disabled={isRevoked}
                        >
                          {lot.maLo} - {lot.tenSP} (Tồn: {lot.tonKho} kg - Hạn:{" "}
                          {lot.hanBaoQuan}){" "}
                          {isRevoked ? "[BỊ THU HỒI - KHÓA]" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label>Số Lượng Xuất (kg) (*)</label>
                  <input
                    type="number"
                    placeholder="VD: 300"
                    value={dispatchForm.soLuongXuat}
                    onChange={(e) =>
                      setDispatchForm({
                        ...dispatchForm,
                        soLuongXuat: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Hình Thức Vận Chuyển</label>
                <div style={{ display: "flex", gap: 20, padding: "6px 0" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="hinhThuc"
                      checked={dispatchForm.hinhThuc === "TU_GIAO"}
                      onChange={() =>
                        setDispatchForm({
                          ...dispatchForm,
                          hinhThuc: "TU_GIAO",
                        })
                      }
                    />
                    Tự giao xe kho
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="hinhThuc"
                      checked={dispatchForm.hinhThuc === "DV_VAN_CHUYEN"}
                      onChange={() =>
                        setDispatchForm({
                          ...dispatchForm,
                          hinhThuc: "DV_VAN_CHUYEN",
                        })
                      }
                    />
                    Đơn vị vận chuyển đối tác
                  </label>
                </div>
              </div>

              {dispatchForm.hinhThuc === "TU_GIAO" ? (
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Tài Xế Phụ Trách</label>
                    <input
                      type="text"
                      value={dispatchForm.taiXe}
                      onChange={(e) =>
                        setDispatchForm({
                          ...dispatchForm,
                          taiXe: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Biển Số Xe</label>
                    <input
                      type="text"
                      value={dispatchForm.bienSo}
                      onChange={(e) =>
                        setDispatchForm({
                          ...dispatchForm,
                          bienSo: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="form-group">
                  <label>Tên Đơn Vị Vận Chuyển Đối Tác</label>
                  <input
                    type="text"
                    placeholder="VD: Giao Hàng Tiết Kiệm / Viettel Post"
                    value={dispatchForm.tenDonViVC}
                    onChange={(e) =>
                      setDispatchForm({
                        ...dispatchForm,
                        tenDonViVC: e.target.value,
                      })
                    }
                  />
                </div>
              )}
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
              {dispatchOrders.filter((o) => o.daiLyId === viewHistoryDealer.id)
                .length === 0 ? (
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
                        <th>Thực Nhận</th>
                        <th>Trạng Thái</th>
                        <th>Ngày</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dispatchOrders
                        .filter((o) => o.daiLyId === viewHistoryDealer.id)
                        .map((h) => (
                          <tr key={h.maPhieu}>
                            <td style={{ fontWeight: 700 }}>{h.maPhieu}</td>
                            <td>{h.maLo}</td>
                            <td>{h.soLuongXuat} kg</td>
                            <td style={{ fontWeight: 700, color: "#15803d" }}>
                              {h.trangThai === "DA_GIAO"
                                ? `${h.soLuongThucNhan} kg`
                                : "—"}
                            </td>
                            <td>
                              <span className="status-pill success">
                                {h.trangThai}
                              </span>
                            </td>
                            <td>{h.ngayTao}</td>
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
                onClick={() => setViewHistoryDealer(null)}
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
