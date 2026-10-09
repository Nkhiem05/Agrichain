import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  ShieldCheck,
  FolderKanban,
  Boxes,
  Microscope,
  Truck,
  Link2,
  Plus,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Eye,
  RefreshCw,
  UserPlus,
  Navigation,
  FileCheck2,
  X,
  Tractor,
  Factory,
  Award,
  Users,
  UserCheck,
  MoreVertical,
} from "lucide-react";
import "../../css/admin.css";

const DEFAULT_LOGO_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png";

const API_URL = "http://localhost:3000";

// Header gửi kèm token đăng nhập (token được lưu ở trang đăng nhập)
const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const ROLE_OPTIONS = [
  { value: "FARMER_COOP", label: "Nông dân / HTX" },
  { value: "PROCESSOR", label: "Cơ sở sơ chế" },
  { value: "TRANSPORTER", label: "Đơn vị vận chuyển" },
  { value: "DISTRIBUTOR", label: "Đơn vị phân phối" },
  { value: "CERT_AUTHORITY", label: "Cơ quan kiểm định" },
];

const ROLE_LABELS = ROLE_OPTIONS.reduce(
  (acc, r) => ({ ...acc, [r.value]: r.label }),
  { ADMIN: "Quản trị viên", CONSUMER: "Người tiêu dùng" },
);

const STAGE_LABELS = {
  CREATED: "Mới tạo",
  HARVESTED: "Đã thu hoạch",
  PROCESSED: "Đã sơ chế",
  PACKAGED: "Đã đóng gói",
  IN_TRANSIT: "Đang vận chuyển",
  RECEIVED: "Đã nhận hàng",
  DISTRIBUTED: "Đã phân phối",
  COMPLETED: "Hoàn tất",
};

export default function AdminDashboard() {
  // ================= TABS =================
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");

  // ================= MODALS STATE =================
  const [showActorModal, setShowActorModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showRecallModal, setShowRecallModal] = useState(false);
  const [selectedRecallBatch, setSelectedRecallBatch] = useState("#LH-8790");
  const [showGpsModal, setShowGpsModal] = useState(null);

  // Modal Chi tiết & Phân quyền người dùng
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [editingRoleUser, setEditingRoleUser] = useState(null);

  // State quản lý Dropdown Menu đang mở ở dòng tài khoản nào
  const [openDropdownUser, setOpenDropdownUser] = useState(null);
  const dropdownRef = useRef(null);

  // Bắt sự kiện click ra ngoài menu để tự đóng
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdownUser(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ================= TỔNG QUAN (từ API) =================
  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // ================= NÔNG TRẠI / TỔ CHỨC (từ API) =================
  const [farms, setFarms] = useState([]);
  const [otherOrgs, setOtherOrgs] = useState([]);
  const [loadingFarms, setLoadingFarms] = useState(true);

  // ================= YÊU CẦU CẤP TÀI KHOẢN (từ API) =================
  const [accountRequests, setAccountRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // ================= TÀI KHOẢN NGƯỜI DÙNG (từ API) =================
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // ================= DANH MỤC DÙNG CHUNG (từ API) =================
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [catalogMaterials, setCatalogMaterials] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // ================= TOÀN VẸN CHUỖI ON-CHAIN (chưa triển khai, dữ liệu minh họa) =================
  const [blocksVerified, setBlocksVerified] = useState(42918);
  const [isVerifying, setIsVerifying] = useState(false);

  // ================= FORM STATES =================
  const [newActor, setNewActor] = useState({
    vai_tro: "FARMER_COOP",
    ho_ten: "",
    so_dien_thoai: "",
    ten_nong_trai: "",
    dia_diem_nong_trai: "",
  });

  const [newUser, setNewUser] = useState({
    ten_dang_nhap: "",
    ho_ten: "",
    vai_tro: "FARMER_COOP",
    so_dien_thoai: "",
    ten_nong_trai: "",
    dia_diem_nong_trai: "",
  });

  const [newCat, setNewCat] = useState({
    categoryType: "giong_cay_trong",
    name: "",
    loai_vat_tu: "PHAN_BON",
    don_vi_tinh: "kg",
  });

  const [recallReason, setRecallReason] = useState("");

  // ================= GỌI API =================
  const fetchOverview = async () => {
    setLoadingOverview(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/tong-quan`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) setOverview(data.data);
    } catch (err) {
      console.error("Lỗi lấy tổng quan:", err);
    } finally {
      setLoadingOverview(false);
    }
  };

  const fetchFarms = async () => {
    setLoadingFarms(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/nong-trai`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setFarms(data.data.nong_trai || []);
        setOtherOrgs(data.data.to_chuc_khac || []);
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách nông trại:", err);
    } finally {
      setLoadingFarms(false);
    }
  };

  const fetchAccountRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch(
        `${API_URL}/api/admin/yeu-cau-tai-khoan?trang_thai=PENDING`,
        { headers: authHeaders() },
      );
      const data = await res.json();
      if (data.success) setAccountRequests(data.data || []);
    } catch (err) {
      console.error("Lỗi lấy yêu cầu cấp tài khoản:", err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/tai-khoan`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) setUsers(data.data || []);
    } catch (err) {
      console.error("Lỗi lấy danh sách tài khoản:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchCatalog = async () => {
    setLoadingCatalog(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/danh-muc`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setCatalogProducts(data.data.giong_cay_trong || []);
        setCatalogMaterials(data.data.vat_tu || []);
      }
    } catch (err) {
      console.error("Lỗi lấy danh mục dùng chung:", err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  // Gọi lại toàn bộ dữ liệu sau mỗi thao tác ghi, vì các trang phụ thuộc lẫn nhau
  // (ví dụ: duyệt yêu cầu đăng ký làm thay đổi cả Tổng quan, Nông trại, Tài khoản)
  const refreshAll = () => {
    fetchOverview();
    fetchFarms();
    fetchAccountRequests();
    fetchUsers();
    fetchCatalog();
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ================= XỬ LÝ SỰ KIỆN =================
  const toggleFarmLock = async (maNongTrai) => {
    try {
      const res = await fetch(
        `${API_URL}/api/admin/nong-trai/${maNongTrai}/khoa`,
        { method: "PUT", headers: authHeaders() },
      );
      const data = await res.json();
      if (!data.success) return alert(data.message || "Không thể đổi trạng thái");
      refreshAll();
    } catch (err) {
      alert("Không thể kết nối tới máy chủ");
    }
  };

  const toggleOrgLock = async (maNguoiDung) => {
    try {
      const res = await fetch(
        `${API_URL}/api/admin/tai-khoan/${maNguoiDung}/khoa`,
        { method: "PUT", headers: authHeaders() },
      );
      const data = await res.json();
      if (!data.success) return alert(data.message || "Không thể đổi trạng thái");
      refreshAll();
    } catch (err) {
      alert("Không thể kết nối tới máy chủ");
    }
  };

  const toggleUserStatus = async (maNguoiDung) => {
    setOpenDropdownUser(null);
    await toggleOrgLock(maNguoiDung);
  };

  const approveAccountRequest = async (maYeuCau) => {
    try {
      const res = await fetch(
        `${API_URL}/api/admin/yeu-cau-tai-khoan/${maYeuCau}/duyet`,
        { method: "PUT", headers: authHeaders() },
      );
      const data = await res.json();
      if (!data.success) return alert(data.message || "Không thể duyệt yêu cầu");
      alert(
        `Đã duyệt! Tên đăng nhập: ${data.data.ten_dang_nhap} — Mật khẩu tạm: ${data.data.mat_khau_tam}\nHãy gửi thông tin này cho đơn vị đăng ký.`,
      );
      refreshAll();
    } catch (err) {
      alert("Không thể kết nối tới máy chủ");
    }
  };

  const rejectAccountRequest = async (maYeuCau) => {
    const ly_do = window.prompt("Lý do từ chối (không bắt buộc):", "");
    if (ly_do === null) return;
    try {
      const res = await fetch(
        `${API_URL}/api/admin/yeu-cau-tai-khoan/${maYeuCau}/tu-choi`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ ly_do_tu_choi: ly_do }),
        },
      );
      const data = await res.json();
      if (!data.success) return alert(data.message || "Không thể từ chối yêu cầu");
      refreshAll();
    } catch (err) {
      alert("Không thể kết nối tới máy chủ");
    }
  };

  const handleAddActor = async (e) => {
    e.preventDefault();
    if (!newActor.ho_ten) return alert("Vui lòng điền tên đơn vị / đại diện");
    if (
      newActor.vai_tro === "FARMER_COOP" &&
      (!newActor.ten_nong_trai || !newActor.dia_diem_nong_trai)
    ) {
      return alert("Vui lòng nhập tên nông trại và địa điểm");
    }

    try {
      const res = await fetch(`${API_URL}/api/admin/tai-khoan`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(newActor),
      });
      const data = await res.json();
      if (!data.success) return alert(data.message || "Không thể tạo đơn vị");

      alert(
        `Đã tạo! Tên đăng nhập: ${data.data.ten_dang_nhap} — Mật khẩu tạm: ${data.data.mat_khau_tam}\nHãy gửi thông tin này cho đơn vị.`,
      );
      setShowActorModal(false);
      setNewActor({
        vai_tro: "FARMER_COOP",
        ho_ten: "",
        so_dien_thoai: "",
        ten_nong_trai: "",
        dia_diem_nong_trai: "",
      });
      refreshAll();
    } catch (err) {
      alert("Không thể kết nối tới máy chủ");
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUser.ho_ten) return alert("Vui lòng nhập đủ thông tin");
    if (
      newUser.vai_tro === "FARMER_COOP" &&
      (!newUser.ten_nong_trai || !newUser.dia_diem_nong_trai)
    ) {
      return alert("Vui lòng nhập tên nông trại và địa điểm");
    }

    try {
      const res = await fetch(`${API_URL}/api/admin/tai-khoan`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (!data.success) return alert(data.message || "Không thể tạo tài khoản");

      alert(
        `Đã tạo tài khoản!\nTên đăng nhập: ${data.data.ten_dang_nhap}\nMật khẩu tạm: ${data.data.mat_khau_tam}`,
      );
      setShowUserModal(false);
      setNewUser({
        ten_dang_nhap: "",
        ho_ten: "",
        vai_tro: "FARMER_COOP",
        so_dien_thoai: "",
        ten_nong_trai: "",
        dia_diem_nong_trai: "",
      });
      refreshAll();
    } catch (err) {
      alert("Không thể kết nối tới máy chủ");
    }
  };

  const handleSaveEditRoleUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(
        `${API_URL}/api/admin/tai-khoan/${editingRoleUser.ma_nguoi_dung}/vai-tro`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ vai_tro: editingRoleUser.vai_tro }),
        },
      );
      const data = await res.json();
      if (!data.success) return alert(data.message || "Không thể đổi vai trò");
      setEditingRoleUser(null);
      refreshAll();
    } catch (err) {
      alert("Không thể kết nối tới máy chủ");
    }
  };

  const handleAddCategoryItem = async (e) => {
    e.preventDefault();
    if (!newCat.name) return alert("Vui lòng nhập tên mục");

    try {
      const isProduct = newCat.categoryType === "giong_cay_trong";
      const url = isProduct
        ? `${API_URL}/api/admin/danh-muc/giong-cay-trong`
        : `${API_URL}/api/admin/danh-muc/vat-tu`;
      const body = isProduct
        ? { ten_san_pham: newCat.name }
        : {
            ten_vat_tu: newCat.name,
            loai_vat_tu: newCat.loai_vat_tu,
            don_vi_tinh: newCat.don_vi_tinh,
          };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) return alert(data.message || "Không thể thêm danh mục");

      setShowCatModal(false);
      setNewCat({
        categoryType: "giong_cay_trong",
        name: "",
        loai_vat_tu: "PHAN_BON",
        don_vi_tinh: "kg",
      });
      fetchCatalog();
    } catch (err) {
      alert("Không thể kết nối tới máy chủ");
    }
  };

  const toggleProductCatalog = async (maSanPham) => {
    try {
      const res = await fetch(
        `${API_URL}/api/admin/danh-muc/giong-cay-trong/${maSanPham}/khoa`,
        { method: "PUT", headers: authHeaders() },
      );
      const data = await res.json();
      if (!data.success) return alert(data.message || "Không thể đổi trạng thái");
      fetchCatalog();
    } catch (err) {
      alert("Không thể kết nối tới máy chủ");
    }
  };

  const toggleMaterialCatalog = async (maVatTu) => {
    try {
      const res = await fetch(
        `${API_URL}/api/admin/danh-muc/vat-tu/${maVatTu}/khoa`,
        { method: "PUT", headers: authHeaders() },
      );
      const data = await res.json();
      if (!data.success) return alert(data.message || "Không thể đổi trạng thái");
      fetchCatalog();
    } catch (err) {
      alert("Không thể kết nối tới máy chủ");
    }
  };

  const handleVerifyChain = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setBlocksVerified((prev) => prev + Math.floor(Math.random() * 8 + 1));
      setIsVerifying(false);
      alert(
        "Đã đối soát xong! Toàn bộ khối giao dịch đều khớp 100% với Smart Contract.",
      );
    }, 1000);
  };

  return (
    <div className="admin">
      {/* ================= HEADER ================= */}
      <header className="dashboard-header">
        <div className="header-left">
          <img src={DEFAULT_LOGO_IMG} alt="Logo" className="header-logo-icon" />
          <span className="header-brand-title">AGRICHAIN ADMIN</span>
        </div>

        <div className="header-search-bar">
          <input
            type="text"
            placeholder="Tìm tài khoản, nông trại, mã lô, mã chuyến, mã hợp đồng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="header-profile">
          <div className="avatar-circle">AD</div>
          <div className="profile-meta">
            <span className="profile-name">Quản Trị Viên Hệ Thống</span>
            <span className="profile-role">Super Administrator</span>
          </div>
        </div>
      </header>

      {/* ================= BODY ================= */}
      <div className="dashboard-body">
        {/* ================= SIDEBAR ================= */}
        <aside className="dashboard-sidebar">
          <div>
            <div className="sidebar-heading">Quản trị hệ thống</div>
            <nav className="sidebar-nav">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={`nav-item-btn ${activeTab === "overview" ? "active" : ""}`}
              >
                <LayoutDashboard size={18} />
                <span>Tổng quan</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("farms")}
                className={`nav-item-btn ${activeTab === "farms" ? "active" : ""}`}
              >
                <ShieldCheck size={18} />
                <span>Nông trại</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("users")}
                className={`nav-item-btn ${activeTab === "users" ? "active" : ""}`}
              >
                <Users size={18} />
                <span>Tài khoản người dùng</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("catalog")}
                className={`nav-item-btn ${activeTab === "catalog" ? "active" : ""}`}
              >
                <FolderKanban size={18} />
                <span>Danh mục dùng chung</span>
              </button>
            </nav>

            <div className="sidebar-heading" style={{ marginTop: 16 }}>
              Giám sát chuỗi cung ứng
            </div>
            <nav className="sidebar-nav">
              <button
                type="button"
                onClick={() => setActiveTab("batches")}
                className={`nav-item-btn ${activeTab === "batches" ? "active" : ""}`}
              >
                <Boxes size={18} />
                <span>Lô hàng toàn chuỗi</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("inspection")}
                className={`nav-item-btn ${activeTab === "inspection" ? "active" : ""}`}
              >
                <Microscope size={18} />
                <span>Kiểm định & thu hồi</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("shipping")}
                className={`nav-item-btn ${activeTab === "shipping" ? "active" : ""}`}
              >
                <Truck size={18} />
                <span>Vận chuyển</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("integrity")}
                className={`nav-item-btn ${activeTab === "integrity" ? "active" : ""}`}
              >
                <Link2 size={18} />
                <span>Nhật ký & toàn vẹn</span>
              </button>
            </nav>
          </div>

          <div className="sidebar-footer">
            <span className="pulse-dot"></span>
            <span>
              AgriChain Core: <b>v2.4.0 (Active)</b>
            </span>
          </div>
        </aside>

        {/* ================= CONTENT ================= */}
        <main className="dashboard-content">
          {/* TAB 1: TỔNG QUAN */}
          {activeTab === "overview" && (
            <div>
              <div className="sticky-top-section">
                <div className="metrics-row">
                  <div className="metric-card">
                    <span className="metric-title">
                      Nông trại đang canh tác
                    </span>
                    <div className="metric-number">
                      {loadingOverview ? "…" : overview?.so_nong_trai ?? 0}{" "}
                      <span className="metric-unit">NÔNG TRẠI</span>
                    </div>
                  </div>
                  <div className="metric-card">
                    <span className="metric-title">Mùa vụ đang chạy</span>
                    <div className="metric-number">
                      {loadingOverview ? "…" : overview?.so_mua_vu ?? 0}{" "}
                      <span className="metric-unit">MÙA VỤ</span>
                    </div>
                  </div>
                  <div className="metric-card">
                    <span className="metric-title">Lô đang lưu thông</span>
                    <div className="metric-number">
                      {loadingOverview ? "…" : overview?.so_lo_dang_luu_thong ?? 0}{" "}
                      <span className="metric-unit">LÔ</span>
                    </div>
                  </div>
                  <div className="metric-card warn">
                    <span className="metric-title">Cảnh báo cần xử lý</span>
                    <div className="metric-number">
                      {loadingOverview ? "…" : overview?.so_canh_bao ?? 0}{" "}
                      <span className="metric-unit">MỤC</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overview-cols">
                <div className="box-section">
                  <h3>
                    <span>Việc cần xử lý</span>
                    <span className="status-pill danger">
                      {overview?.viec_can_xu_ly?.length || 0} mục
                    </span>
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                    }}
                  >
                    {!loadingOverview &&
                      (overview?.viec_can_xu_ly || []).length === 0 && (
                        <p style={{ fontSize: 13, color: "#6b7280" }}>
                          Không có việc cần xử lý.
                        </p>
                      )}

                    {(overview?.viec_can_xu_ly || []).map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          paddingBottom: 12,
                          borderBottom:
                            idx === overview.viec_can_xu_ly.length - 1
                              ? "none"
                              : "1px solid #f3f4f6",
                        }}
                      >
                        <div>
                          <strong
                            style={{
                              fontSize: 13.5,
                              color:
                                item.loai === "LO_THU_HOI" ||
                                item.loai === "KIEM_DINH_TU_CHOI"
                                  ? "#dc2626"
                                  : "#1f2937",
                            }}
                          >
                            {item.tieu_de}
                          </strong>
                          <p
                            style={{
                              fontSize: 12,
                              color: "#6b7280",
                              marginTop: 2,
                            }}
                          >
                            {item.mo_ta}
                          </p>
                        </div>
                        <button
                          className="btn-action-view"
                          onClick={() =>
                            setActiveTab(
                              item.loai === "TAI_KHOAN_BI_KHOA"
                                ? "users"
                                : item.loai === "DANG_KY_CHO_DUYET"
                                  ? "farms"
                                  : "farms",
                            )
                          }
                        >
                          Xem
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="box-section">
                  <h3>Lô hàng theo chặng</h3>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                    }}
                  >
                    {!loadingOverview &&
                      Object.keys(overview?.lo_theo_chang || {}).length === 0 && (
                        <p style={{ fontSize: 13, color: "#6b7280" }}>
                          Chưa có lô nào.
                        </p>
                      )}

                    {Object.entries(overview?.lo_theo_chang || {}).map(
                      ([stage, count]) => {
                        const max = Math.max(
                          1,
                          ...Object.values(overview?.lo_theo_chang || {}),
                        );
                        const pct = Math.round((count / max) * 100);
                        return (
                          <div key={stage}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: 13,
                                marginBottom: 4,
                              }}
                            >
                              <span>{STAGE_LABELS[stage] || stage}</span>
                              <b>{count}</b>
                            </div>
                            <div
                              style={{
                                height: 8,
                                background: "#eef2f0",
                                borderRadius: 4,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${pct}%`,
                                  height: "100%",
                                  background: "#67ac7d",
                                }}
                              ></div>
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NÔNG TRẠI */}
          {activeTab === "farms" && (
            <div>
              {(() => {
                const totalActors = farms.length + otherOrgs.length;
                const activeActors =
                  farms.filter((f) => f.trang_thai === 1).length +
                  otherOrgs.filter((o) => o.trang_thai === 1).length;

                return (
                  <div className="sticky-top-section">
                    <div className="metrics-row">
                      <div className="metric-card">
                        <span className="metric-title">
                          Tổng số nông trại & đối tác
                        </span>
                        <div className="metric-number">
                          {totalActors} <span className="metric-unit">ĐƠN VỊ</span>
                        </div>
                      </div>
                      <div className="metric-card">
                        <span className="metric-title">Đang hoạt động</span>
                        <div className="metric-number">{activeActors}</div>
                      </div>
                      <div className="metric-card warn">
                        <span className="metric-title">Đang bị vô hiệu hóa</span>
                        <div className="metric-number">
                          {totalActors - activeActors}{" "}
                          <span className="metric-unit">CHỦ THỂ</span>
                        </div>
                      </div>
                      <div className="metric-card">
                        <span className="metric-title">Chờ duyệt đăng ký</span>
                        <div className="metric-number">
                          {accountRequests.length}{" "}
                          <span className="metric-unit">HỒ SƠ</span>
                        </div>
                      </div>
                    </div>

                    <div className="content-head">
                      <div>
                        <h2>Quản lý Nông Trại & Chuỗi Liên Kết</h2>
                        <p>
                          Danh sách nông trại, cơ sở sơ chế, cơ quan kiểm định
                          và đơn vị vận chuyển đang tham gia hệ thống.
                        </p>
                      </div>
                      <button
                        className="btn-primary-action"
                        onClick={() => setShowActorModal(true)}
                      >
                        <Plus size={16} /> Đăng ký đơn vị mới
                      </button>
                    </div>
                  </div>
                );
              })()}

              {!loadingRequests && accountRequests.length > 0 && (
                <div className="box-section" style={{ marginBottom: 16 }}>
                  <h3>
                    <span>Yêu cầu đăng ký chờ duyệt</span>
                    <span className="status-pill warning">
                      {accountRequests.length} hồ sơ
                    </span>
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {accountRequests.map((r) => (
                      <div
                        key={r.ma_yeu_cau}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          paddingBottom: 12,
                          borderBottom: "1px solid #f3f4f6",
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: 13.5 }}>
                            {r.ten_co_so}{" "}
                            <span className="status-pill gray" style={{ marginLeft: 6 }}>
                              {r.vai_tro_label}
                            </span>
                          </strong>
                          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                            Đại diện: {r.ho_ten} · {r.so_dien_thoai} · {r.email}
                            <br />
                            Địa chỉ: {r.dia_chi}
                          </p>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="btn-action-view"
                            onClick={() => approveAccountRequest(r.ma_yeu_cau)}
                          >
                            Duyệt
                          </button>
                          <button
                            className="btn-action-retry"
                            onClick={() => rejectAccountRequest(r.ma_yeu_cau)}
                          >
                            Từ chối
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {loadingFarms && <p style={{ color: "#6b7280" }}>Đang tải...</p>}

              {!loadingFarms &&
                farms.map((farm) => (
                  <div
                    key={farm.ma_nong_trai}
                    className={`panel-card ${farm.trang_thai ? "" : "disabled"}`}
                  >
                    <div
                      className={`card-icon-avatar ${farm.trang_thai ? "" : "red"}`}
                    >
                      <Tractor size={26} />
                    </div>

                    <div className="card-main">
                      <div className="card-head-row">
                        <h3>{farm.ten_nong_trai}</h3>
                        <span className="status-pill gray mono">
                          #{farm.ma_nong_trai}
                        </span>
                        <span
                          className={`status-pill ${farm.trang_thai ? "success" : "danger"}`}
                        >
                          Nông trại / HTX canh tác
                        </span>
                      </div>

                      <div className="card-grid-info">
                        <span>
                          Đại diện: <strong>{farm.nguoi_dai_dien}</strong>
                        </span>
                        <span>
                          Điện thoại: <strong>{farm.so_dien_thoai || "—"}</strong>
                        </span>
                        <span>
                          Địa điểm: <strong>{farm.dia_diem_nong_trai}</strong>
                        </span>
                        <span>
                          Trạng thái:{" "}
                          <strong
                            style={{ color: farm.trang_thai ? "#15803d" : "#dc2626" }}
                          >
                            {farm.trang_thai ? "Đang hoạt động" : "Đã vô hiệu hóa"}
                          </strong>
                        </span>
                      </div>

                      <div className="card-desc-box">
                        <strong>Hiện trạng:</strong> {farm.so_thua_dat} thửa đất ·{" "}
                        {farm.so_mua_vu_dang_chay} mùa vụ đang canh tác
                      </div>
                    </div>

                    <div className="card-actions-col">
                      <button
                        className={
                          farm.trang_thai ? "btn-action-retry" : "btn-action-view"
                        }
                        onClick={() => toggleFarmLock(farm.ma_nong_trai)}
                      >
                        {farm.trang_thai ? (
                          <Lock size={12} />
                        ) : (
                          <Unlock size={12} />
                        )}
                        {farm.trang_thai ? "Vô hiệu hóa" : "Kích hoạt lại"}
                      </button>
                    </div>
                  </div>
                ))}

              {!loadingFarms &&
                otherOrgs.map((org) => (
                  <div
                    key={org.ma_nguoi_dung}
                    className={`panel-card ${org.trang_thai ? "" : "disabled"}`}
                  >
                    <div
                      className={`card-icon-avatar ${
                        org.vai_tro === "TRANSPORTER"
                          ? "amber"
                          : org.vai_tro === "CERT_AUTHORITY"
                            ? "blue"
                            : org.trang_thai
                              ? ""
                              : "red"
                      }`}
                    >
                      {org.vai_tro === "TRANSPORTER" && <Truck size={26} />}
                      {org.vai_tro === "CERT_AUTHORITY" && <Award size={26} />}
                      {(org.vai_tro === "PROCESSOR" ||
                        org.vai_tro === "DISTRIBUTOR") && <Factory size={26} />}
                    </div>

                    <div className="card-main">
                      <div className="card-head-row">
                        <h3>{org.ho_ten}</h3>
                        <span className="status-pill gray mono">
                          #{org.ma_nguoi_dung}
                        </span>
                        <span
                          className={`status-pill ${org.trang_thai ? "success" : "danger"}`}
                        >
                          {org.vai_tro_label}
                        </span>
                      </div>

                      <div className="card-grid-info">
                        <span>
                          Điện thoại: <strong>{org.so_dien_thoai || "—"}</strong>
                        </span>
                        <span>
                          Trạng thái:{" "}
                          <strong
                            style={{ color: org.trang_thai ? "#15803d" : "#dc2626" }}
                          >
                            {org.trang_thai ? "Đang hoạt động" : "Đã vô hiệu hóa"}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="card-actions-col">
                      <button
                        className={
                          org.trang_thai ? "btn-action-retry" : "btn-action-view"
                        }
                        onClick={() => toggleOrgLock(org.ma_nguoi_dung)}
                      >
                        {org.trang_thai ? (
                          <Lock size={12} />
                        ) : (
                          <Unlock size={12} />
                        )}
                        {org.trang_thai ? "Vô hiệu hóa" : "Kích hoạt lại"}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* TAB 3: TÀI KHOẢN NGƯỜI DÙNG */}
          {activeTab === "users" && (
            <div>
              <div className="sticky-top-section">
                <div className="metrics-row">
                  <div className="metric-card">
                    <span className="metric-title">Tổng số tài khoản</span>
                    <div className="metric-number">
                      {users.length} <span className="metric-unit">USER</span>
                    </div>
                  </div>
                  <div className="metric-card">
                    <span className="metric-title">Đang hoạt động</span>
                    <div className="metric-number">
                      {users.filter((u) => u.trang_thai === 1).length}
                    </div>
                  </div>
                  <div className="metric-card warn">
                    <span className="metric-title">Tài khoản bị khóa</span>
                    <div className="metric-number">
                      {users.filter((u) => u.trang_thai !== 1).length}{" "}
                      <span className="metric-unit">USER</span>
                    </div>
                  </div>
                  <div className="metric-card">
                    <span className="metric-title">Vai trò quản trị</span>
                    <div className="metric-number">
                      {users.filter((u) => u.vai_tro === "ADMIN").length}{" "}
                      <span className="metric-unit">SUPER ADMIN</span>
                    </div>
                  </div>
                </div>

                <div className="content-head">
                  <div>
                    <h2>Danh sách tài khoản người dùng</h2>
                    <p>
                      Quản lý quyền truy cập và phân công vai trò nhân sự trong
                      hệ thống.
                    </p>
                  </div>
                  <button
                    className="btn-primary-action"
                    onClick={() => setShowUserModal(true)}
                  >
                    <UserPlus size={16} /> Thêm tài khoản
                  </button>
                </div>
              </div>

              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Tên đăng nhập</th>
                      <th>Họ và tên</th>
                      <th>Chủ thể trực thuộc</th>
                      <th>Vai trò</th>
                      <th style={{ textAlign: "center" }}>Trạng thái</th>
                      <th style={{ textAlign: "center", width: 80 }}>
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingUsers && (
                      <tr>
                        <td colSpan={6}>Đang tải...</td>
                      </tr>
                    )}
                    {!loadingUsers &&
                      users.map((user) => (
                        <tr key={user.ma_nguoi_dung}>
                          <td className="mono" style={{ fontWeight: 600 }}>
                            {user.ten_dang_nhap}
                          </td>
                          <td>{user.ho_ten}</td>
                          <td style={{ color: "#16a34a", fontWeight: 600 }}>
                            {user.don_vi || "—"}
                          </td>
                          <td>{user.vai_tro_label}</td>
                          <td style={{ textAlign: "center" }}>
                            <span
                              className={`status-pill ${user.trang_thai === 1 ? "success" : "danger"}`}
                            >
                              {user.trang_thai === 1 ? "Hoạt động" : "Bị khóa"}
                            </span>
                          </td>
                          <td
                            style={{ textAlign: "center", position: "relative" }}
                          >
                            <div
                              className="dropdown-wrapper"
                              ref={
                                openDropdownUser === user.ma_nguoi_dung
                                  ? dropdownRef
                                  : null
                              }
                            >
                              {/* Nút 3 chấm tối giản, hiện đại */}
                              <button
                                type="button"
                                className={`btn-action-more ${
                                  openDropdownUser === user.ma_nguoi_dung
                                    ? "active"
                                    : ""
                                }`}
                                title="Tùy chọn thao tác"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownUser(
                                    openDropdownUser === user.ma_nguoi_dung
                                      ? null
                                      : user.ma_nguoi_dung,
                                  );
                                }}
                              >
                                <MoreVertical size={16} />
                              </button>

                              {/* Dropdown Menu Popup */}
                              {openDropdownUser === user.ma_nguoi_dung && (
                                <div className="action-dropdown-menu">
                                  <button
                                    type="button"
                                    className="dropdown-item"
                                    onClick={() => {
                                      setSelectedUserDetail(user);
                                      setOpenDropdownUser(null);
                                    }}
                                  >
                                    <Eye size={15} color="#2563eb" />
                                    <span>Xem chi tiết</span>
                                  </button>

                                  <button
                                    type="button"
                                    className="dropdown-item"
                                    onClick={() => {
                                      setEditingRoleUser({ ...user });
                                      setOpenDropdownUser(null);
                                    }}
                                  >
                                    <UserCheck size={15} color="#16a34a" />
                                    <span>Phân quyền & Vai trò</span>
                                  </button>

                                  <div className="dropdown-divider"></div>

                                  <button
                                    type="button"
                                    className={`dropdown-item ${
                                      user.trang_thai === 1 ? "danger" : "success"
                                    }`}
                                    onClick={() =>
                                      toggleUserStatus(user.ma_nguoi_dung)
                                    }
                                  >
                                    {user.trang_thai === 1 ? (
                                      <>
                                        <Lock size={15} color="#dc2626" />
                                        <span>Khóa tài khoản</span>
                                      </>
                                    ) : (
                                      <>
                                        <Unlock size={15} color="#16a34a" />
                                        <span>Mở tài khoản</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: DANH MỤC DÙNG CHUNG */}
          {activeTab === "catalog" && (
            <div>
              <div className="sticky-top-section">
                <div className="content-head">
                  <div>
                    <h2>Danh mục chuẩn hóa toàn ngành</h2>
                    <p>
                      Nông dân, cơ sở sơ chế và cơ quan kiểm định cùng chọn từ
                      các danh mục này.
                    </p>
                  </div>
                  <button
                    className="btn-primary-action"
                    onClick={() => setShowCatModal(true)}
                  >
                    <Plus size={16} /> Thêm danh mục
                  </button>
                </div>
              </div>

              {loadingCatalog && <p style={{ color: "#6b7280" }}>Đang tải...</p>}

              {!loadingCatalog && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        background: "#f9fafb",
                        borderBottom: "1px solid #e5e7eb",
                        fontWeight: 700,
                      }}
                    >
                      <span>Giống cây trồng</span>
                      <span style={{ color: "#278d49", fontSize: 12 }}>
                        {catalogProducts.length} mục
                      </span>
                    </div>
                    <div>
                      {catalogProducts.length === 0 && (
                        <div style={{ padding: "10px 16px", fontSize: 13, color: "#6b7280" }}>
                          Chưa có giống cây trồng nào.
                        </div>
                      )}
                      {catalogProducts.map((item, i) => (
                        <div
                          key={item.ma_san_pham}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "10px 16px",
                            borderBottom:
                              i === catalogProducts.length - 1
                                ? "none"
                                : "1px solid #f3f4f6",
                            fontSize: 13,
                            opacity: item.trang_thai ? 1 : 0.5,
                          }}
                        >
                          <span>
                            {item.ten_san_pham}
                            <small style={{ color: "#9ca3af", marginLeft: 6 }}>
                              ({item.loai_san_pham} · {item.don_vi_tinh_mac_dinh})
                            </small>
                          </span>
                          <button
                            style={{
                              background: "none",
                              border: "none",
                              color: item.trang_thai ? "#dc2626" : "#16a34a",
                              cursor: "pointer",
                              fontSize: 12,
                            }}
                            onClick={() => toggleProductCatalog(item.ma_san_pham)}
                          >
                            {item.trang_thai ? "Ẩn" : "Hiện"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        background: "#f9fafb",
                        borderBottom: "1px solid #e5e7eb",
                        fontWeight: 700,
                      }}
                    >
                      <span>Vật tư & phân bón</span>
                      <span style={{ color: "#278d49", fontSize: 12 }}>
                        {catalogMaterials.length} mục
                      </span>
                    </div>
                    <div>
                      {catalogMaterials.length === 0 && (
                        <div style={{ padding: "10px 16px", fontSize: 13, color: "#6b7280" }}>
                          Chưa có vật tư nào.
                        </div>
                      )}
                      {catalogMaterials.map((item, i) => (
                        <div
                          key={item.ma_vat_tu}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "10px 16px",
                            borderBottom:
                              i === catalogMaterials.length - 1
                                ? "none"
                                : "1px solid #f3f4f6",
                            fontSize: 13,
                            opacity: item.trang_thai ? 1 : 0.5,
                          }}
                        >
                          <span>
                            {item.ten_vat_tu}
                            <small style={{ color: "#9ca3af", marginLeft: 6 }}>
                              (
                              {item.loai_vat_tu === "PHAN_BON"
                                ? "Phân bón"
                                : "Thuốc BVTV"}{" "}
                              · {item.don_vi_tinh})
                            </small>
                          </span>
                          <button
                            style={{
                              background: "none",
                              border: "none",
                              color: item.trang_thai ? "#dc2626" : "#16a34a",
                              cursor: "pointer",
                              fontSize: 12,
                            }}
                            onClick={() => toggleMaterialCatalog(item.ma_vat_tu)}
                          >
                            {item.trang_thai ? "Ẩn" : "Hiện"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: LÔ HÀNG TOÀN CHUỖI */}
          {activeTab === "batches" && (
            <div>
              <div className="sticky-top-section">
                <div className="metrics-row">
                  <div className="metric-card">
                    <span className="metric-title">Canh tác (Nông dân)</span>
                    <div className="metric-number">
                      42 <span className="metric-unit">LÔ THU HOẠCH</span>
                    </div>
                  </div>
                  <div className="metric-card">
                    <span className="metric-title">Sơ chế (Cơ sở)</span>
                    <div className="metric-number">
                      18 <span className="metric-unit">TÁCH/GỘP</span>
                    </div>
                  </div>
                  <div className="metric-card">
                    <span className="metric-title">Kiểm định</span>
                    <div className="metric-number">
                      11 <span className="metric-unit">CHỜ MẪU/KẾT QUẢ</span>
                    </div>
                  </div>
                  <div className="metric-card">
                    <span className="metric-title">Vận chuyển</span>
                    <div className="metric-number">
                      15 <span className="metric-unit">ĐANG TRÊN ĐƯỜNG</span>
                    </div>
                  </div>
                </div>

                <div className="content-head">
                  <div>
                    <h2>Theo dõi trạng thái lô toàn chuỗi</h2>
                    <p>
                      Mỗi lô hiển thị chặng hiện tại và mã Hash gần nhất ghi lên
                      sổ cái Smart Contract.
                    </p>
                  </div>
                  <span className="status-pill success">100% Khối hợp lệ</span>
                </div>
              </div>

              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Mã lô</th>
                      <th>Nguồn gốc</th>
                      <th>Chặng hiện tại</th>
                      <th>Khối lượng</th>
                      <th>Tx Hash</th>
                      <th style={{ textAlign: "center" }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <b>#LH-8824</b>
                        <small style={{ display: "block", color: "#6b7280" }}>
                          Lô thu hoạch
                        </small>
                      </td>
                      <td>Vườn Cam A1, mùa vụ Quýt Đường</td>
                      <td>
                        <span className="status-pill gray">Chờ sơ chế</span>
                      </td>
                      <td>1.500 kg</td>
                      <td
                        className="mono"
                        style={{ color: "#15803d", fontWeight: 700 }}
                      >
                        0x3d12...88fe
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button className="btn-action-view">
                          <Eye size={12} /> Hành trình
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <b>#LH-8801</b>
                        <small style={{ display: "block", color: "#6b7280" }}>
                          Lô thu hoạch
                        </small>
                      </td>
                      <td>Vườn Cam A1 → HTX Mekong</td>
                      <td>
                        <span className="status-pill info">
                          Đang tiếp nhận, cân thực tế
                        </span>
                      </td>
                      <td>2.000 kg</td>
                      <td
                        className="mono"
                        style={{ color: "#15803d", fontWeight: 700 }}
                      >
                        0x61aa...b210
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button className="btn-action-view">
                          <Eye size={12} /> Hành trình
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <b>#SC-2026-004</b>
                        <small style={{ display: "block", color: "#6b7280" }}>
                          Lô sơ chế (gộp)
                        </small>
                      </td>
                      <td>HTX Sơ Chế Mekong</td>
                      <td>
                        <span className="status-pill warning">
                          Chờ lấy mẫu kiểm định
                        </span>
                      </td>
                      <td>1.850 kg</td>
                      <td
                        className="mono"
                        style={{ color: "#15803d", fontWeight: 700 }}
                      >
                        0xb7e3...12c9
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button className="btn-action-view">
                          <Eye size={12} /> Hành trình
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <b>#SC-2026-001</b>
                        <small style={{ display: "block", color: "#6b7280" }}>
                          Lô thành phẩm
                        </small>
                      </td>
                      <td>Trà Vinh → Tổng kho Bách Hóa Xanh</td>
                      <td>
                        <span className="status-pill info">
                          Đang vận chuyển chuỗi lạnh
                        </span>
                      </td>
                      <td>1.200 kg</td>
                      <td
                        className="mono"
                        style={{ color: "#15803d", fontWeight: 700 }}
                      >
                        0x7c49...a74c
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button className="btn-action-view">
                          <Eye size={12} /> Hành trình
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <b>#LH-8790</b>
                        <small style={{ display: "block", color: "#dc2626" }}>
                          Lô thu hoạch
                        </small>
                      </td>
                      <td>Vườn Bưởi B3</td>
                      <td>
                        <span className="status-pill danger">Bị đình chỉ</span>
                      </td>
                      <td>800 kg</td>
                      <td
                        className="mono"
                        style={{ color: "#dc2626", fontWeight: 700 }}
                      >
                        0xe419...77aa
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className="btn-action-retry"
                          onClick={() => {
                            setSelectedRecallBatch("#LH-8790");
                            setShowRecallModal(true);
                          }}
                        >
                          Xem lý do
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: KIỂM ĐỊNH & THU HỒI */}
          {activeTab === "inspection" && (
            <div>
              <div className="sticky-top-section">
                <div className="metrics-row">
                  <div className="metric-card">
                    <span className="metric-title">Yêu cầu kiểm định mới</span>
                    <div className="metric-number">
                      9 <span className="metric-unit">HỒ SƠ</span>
                    </div>
                  </div>
                  <div className="metric-card">
                    <span className="metric-title">Đã hẹn lấy mẫu</span>
                    <div className="metric-number">6</div>
                  </div>
                  <div className="metric-card">
                    <span className="metric-title">Chứng nhận đã công bố</span>
                    <div className="metric-number">73</div>
                  </div>
                  <div className="metric-card warn">
                    <span className="metric-title">Lô bị đình chỉ</span>
                    <div className="metric-number">
                      2 <span className="metric-unit">LÔ</span>
                    </div>
                  </div>
                </div>

                <div className="alert-box">
                  <div>
                    <b>Lô #LH-8790 không đạt chuẩn VietGAP</b>
                    <p>
                      Dư lượng Decis vượt ngưỡng. Tem chứng nhận đã bị đình chỉ,
                      lô chưa được thu hồi khỏi các điểm bán.
                    </p>
                  </div>
                  <button
                    className="btn-action-retry"
                    onClick={() => {
                      setSelectedRecallBatch("#LH-8790");
                      setShowRecallModal(true);
                    }}
                  >
                    Thu hồi lô
                  </button>
                </div>

                <div className="content-head">
                  <div>
                    <h2>Hồ sơ kiểm định</h2>
                    <p>
                      Từ yêu cầu của nông dân đến chứng nhận ký số do cơ quan
                      kiểm định công bố.
                    </p>
                  </div>
                </div>
              </div>

              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Hồ sơ</th>
                      <th>Nông trại</th>
                      <th>Tiêu chuẩn</th>
                      <th>Lịch lấy mẫu</th>
                      <th>Trạng thái</th>
                      <th style={{ textAlign: "center" }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="mono">
                        <b>#KD-2201</b>
                      </td>
                      <td>Vườn Cam A1</td>
                      <td>VietGAP trồng trọt</td>
                      <td>12/10/2026</td>
                      <td>
                        <span className="status-pill warning">Chờ lấy mẫu</span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button className="btn-action-view">Chi tiết</button>
                      </td>
                    </tr>
                    <tr>
                      <td className="mono">
                        <b>#KD-2198</b>
                      </td>
                      <td>Vườn Quýt C2</td>
                      <td>GlobalGAP xuất khẩu</td>
                      <td>08/10/2026</td>
                      <td>
                        <span className="status-pill info">
                          Đã niêm phong, chờ kết quả
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button className="btn-action-view">Chi tiết</button>
                      </td>
                    </tr>
                    <tr>
                      <td className="mono">
                        <b>#KD-2187</b>
                      </td>
                      <td>Vườn Cam A1</td>
                      <td>VietGAP trồng trọt</td>
                      <td>02/10/2026</td>
                      <td>
                        <span className="status-pill success">
                          Đã công bố chứng nhận
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button className="btn-action-view">
                          Tải chứng thư
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="mono">
                        <b>#KD-2180</b>
                      </td>
                      <td>Vườn Bưởi B3</td>
                      <td>VietGAP trồng trọt</td>
                      <td>29/09/2026</td>
                      <td>
                        <span className="status-pill danger">
                          Không đạt, đình chỉ tem
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className="btn-action-retry"
                          onClick={() => {
                            setSelectedRecallBatch("#LH-8790");
                            setShowRecallModal(true);
                          }}
                        >
                          Xử lý
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: VẬN CHUYỂN */}
          {activeTab === "shipping" && (
            <div>
              <div className="sticky-top-section">
                <div className="metrics-row">
                  <div className="metric-card">
                    <span className="metric-title">Chuyến chờ nhận</span>
                    <div className="metric-number">4</div>
                  </div>
                  <div className="metric-card">
                    <span className="metric-title">Đang vận chuyển</span>
                    <div className="metric-number">
                      19 <span className="metric-unit">CHUYẾN</span>
                    </div>
                  </div>
                  <div className="metric-card">
                    <span className="metric-title">Đã giao hôm nay</span>
                    <div className="metric-number">11</div>
                  </div>
                  <div className="metric-card warn">
                    <span className="metric-title">Cảnh báo hành trình</span>
                    <div className="metric-number">
                      1 <span className="metric-unit">CHUYẾN</span>
                    </div>
                  </div>
                </div>

                <div className="content-head">
                  <div>
                    <h2>Giám sát chuyến vận chuyển</h2>
                    <p>
                      Theo dõi nhận chuyến, lấy hàng, nhật ký GPS và biên bản
                      giao nhận điện tử.
                    </p>
                  </div>
                  <button
                    className="btn-action-edit"
                    onClick={() => alert("Đang xuất báo cáo...")}
                  >
                    Xuất Excel / CSV
                  </button>
                </div>
              </div>

              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Mã chuyến</th>
                      <th>Lộ trình</th>
                      <th>Xe / Tài xế</th>
                      <th>Nhiệt độ</th>
                      <th>Trạng thái</th>
                      <th style={{ textAlign: "center" }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <b>#VC-3021</b>
                        <small style={{ display: "block", color: "#6b7280" }}>
                          Lô #SC-2026-001
                        </small>
                      </td>
                      <td>Trà Vinh → TP.HCM</td>
                      <td>
                        65C-128.45
                        <small style={{ display: "block", color: "#6b7280" }}>
                          Nguyễn Văn Hùng
                        </small>
                      </td>
                      <td style={{ color: "#dc2626", fontWeight: 700 }}>
                        12°C
                      </td>
                      <td>
                        <span className="status-pill danger">Vượt ngưỡng</span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className="btn-action-edit"
                          onClick={() => setShowGpsModal("#VC-3021")}
                        >
                          <Navigation size={12} /> Xem GPS
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <b>#VC-3019</b>
                        <small style={{ display: "block", color: "#6b7280" }}>
                          Lô #SC-2026-003
                        </small>
                      </td>
                      <td>Cần Thơ → Đà Nẵng</td>
                      <td>
                        65H-044.12
                        <small style={{ display: "block", color: "#6b7280" }}>
                          Lê Văn Tâm
                        </small>
                      </td>
                      <td>6°C</td>
                      <td>
                        <span className="status-pill info">
                          Đang vận chuyển
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className="btn-action-edit"
                          onClick={() => setShowGpsModal("#VC-3019")}
                        >
                          <Navigation size={12} /> Xem GPS
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <b>#VC-3017</b>
                        <small style={{ display: "block", color: "#6b7280" }}>
                          Lô #SC-2026-002
                        </small>
                      </td>
                      <td>Tiền Giang → Cần Thơ</td>
                      <td>
                        63C-210.77
                        <small style={{ display: "block", color: "#6b7280" }}>
                          Phạm Hữu Phúc
                        </small>
                      </td>
                      <td>5°C</td>
                      <td>
                        <span className="status-pill warning">
                          Chờ lấy hàng
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button className="btn-action-view">Chi tiết</button>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <b>#VC-3012</b>
                        <small style={{ display: "block", color: "#6b7280" }}>
                          Lô #SC-2026-000
                        </small>
                      </td>
                      <td>Vĩnh Long → TP.HCM</td>
                      <td>
                        64C-099.31
                        <small style={{ display: "block", color: "#6b7280" }}>
                          Trần Quốc Việt
                        </small>
                      </td>
                      <td>7°C</td>
                      <td>
                        <span className="status-pill success">
                          Đã giao, đã ký
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button className="btn-action-view">
                          <FileCheck2 size={12} /> Biên bản
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: NHẬT KÝ & TOÀN VẸN */}
          {activeTab === "integrity" && (
            <div>
              <div className="sticky-top-section">
                <div className="alert-box ok">
                  <div>
                    <b>Kiểm tra tính toàn vẹn chuỗi dữ liệu</b>
                    <p>
                      Đối chiếu Hash khối giữa CSDL tập trung và sổ cái Smart
                      Contract. Lần gần nhất:{" "}
                      <b>{blocksVerified.toLocaleString()} khối</b> khớp hoàn
                      toàn.
                    </p>
                  </div>
                  <button
                    className="btn-primary-action"
                    onClick={handleVerifyChain}
                    disabled={isVerifying}
                  >
                    <RefreshCw
                      size={15}
                      className={isVerifying ? "spin-icon" : ""}
                    />
                    {isVerifying ? "Đang kiểm tra..." : "Chạy kiểm tra ngay"}
                  </button>
                </div>

                <div className="content-head">
                  <div>
                    <h2>Nhật ký thao tác quản trị và chuỗi</h2>
                    <p>
                      Mọi thay đổi quyền, khóa tài khoản và giao dịch bị chặn
                      đều được ghi lại.
                    </p>
                  </div>
                </div>
              </div>

              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Tác nhân</th>
                      <th>Hành động</th>
                      <th>Đối tượng</th>
                      <th>Tx Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>08/10/2026 09:41</td>
                      <td>
                        <b>admin</b>
                      </td>
                      <td>
                        <span className="status-pill danger">
                          Vô hiệu hóa nông trại
                        </span>
                      </td>
                      <td>HTX Bến Tre Fresh</td>
                      <td
                        className="mono"
                        style={{ color: "#15803d", fontWeight: 700 }}
                      >
                        0x91c2...03ab
                      </td>
                    </tr>
                    <tr>
                      <td>08/10/2026 09:12</td>
                      <td>
                        <b>kiemdinh_ttgd2</b>
                      </td>
                      <td>
                        <span className="status-pill danger">
                          Đình chỉ tem chứng nhận
                        </span>
                      </td>
                      <td>Lô #LH-8790</td>
                      <td
                        className="mono"
                        style={{ color: "#dc2626", fontWeight: 700 }}
                      >
                        0xe419...77aa
                      </td>
                    </tr>
                    <tr>
                      <td>08/10/2026 08:30</td>
                      <td>
                        <b>taixe_hung65c</b>
                      </td>
                      <td>
                        <span className="status-pill info">Cập nhật GPS</span>
                      </td>
                      <td>Chuyến #VC-3021</td>
                      <td
                        className="mono"
                        style={{ color: "#15803d", fontWeight: 700 }}
                      >
                        0x7c49...a74c
                      </td>
                    </tr>
                    <tr>
                      <td>07/10/2026 16:05</td>
                      <td>
                        <b>soche_tranvanlong</b>
                      </td>
                      <td>
                        <span className="status-pill warning">Gộp lô</span>
                      </td>
                      <td>#SC-2026-004</td>
                      <td
                        className="mono"
                        style={{ color: "#15803d", fontWeight: 700 }}
                      >
                        0xb7e3...12c9
                      </td>
                    </tr>
                    <tr>
                      <td>07/10/2026 14:20</td>
                      <td>
                        <b>admin</b>
                      </td>
                      <td>
                        <span className="status-pill success">
                          Tạo tài khoản
                        </span>
                      </td>
                      <td>taixe_minhtri</td>
                      <td
                        className="mono"
                        style={{ color: "#15803d", fontWeight: 700 }}
                      >
                        0x4ab0...e5f1
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ================= MODAL XEM CHI TIẾT TÀI KHOẢN ================= */}
      {selectedUserDetail && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Thông tin chi tiết tài khoản</h3>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setSelectedUserDetail(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="user-detail-card">
                <div className="detail-row">
                  <span className="detail-label">Mã tài khoản:</span>
                  <span className="detail-value mono font-bold">
                    {selectedUserDetail.ma_nguoi_dung}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Tên đăng nhập:</span>
                  <span className="detail-value mono font-bold">
                    {selectedUserDetail.ten_dang_nhap}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Họ và tên:</span>
                  <span className="detail-value">
                    {selectedUserDetail.ho_ten}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Điện thoại:</span>
                  <span className="detail-value">
                    {selectedUserDetail.so_dien_thoai || "—"}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Đơn vị trực thuộc:</span>
                  <span className="detail-value" style={{ color: "#16a34a" }}>
                    {selectedUserDetail.don_vi || "—"}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Vai trò:</span>
                  <span className="detail-value">
                    {selectedUserDetail.vai_tro_label}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Trạng thái:</span>
                  <span
                    className={`status-pill ${
                      selectedUserDetail.trang_thai === 1 ? "success" : "danger"
                    }`}
                  >
                    {selectedUserDetail.trang_thai === 1 ? "Hoạt động" : "Bị khóa"}
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setSelectedUserDetail(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL PHÂN QUYỀN & VAI TRÒ ================= */}
      {editingRoleUser && (
        <div className="modal-overlay">
          <form className="modal-container" onSubmit={handleSaveEditRoleUser}>
            <div className="modal-header">
              <h3>Phân quyền & Vai trò tài khoản</h3>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setEditingRoleUser(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tài khoản người dùng</label>
                <input
                  type="text"
                  value={`${editingRoleUser.ho_ten} (${editingRoleUser.ten_dang_nhap})`}
                  disabled
                  style={{ background: "#f3f4f6", cursor: "not-allowed" }}
                />
              </div>
              <div className="form-group">
                <label>Đơn vị trực thuộc</label>
                <input
                  type="text"
                  value={editingRoleUser.don_vi || "—"}
                  disabled
                  style={{ background: "#f3f4f6", cursor: "not-allowed" }}
                />
              </div>
              <div className="form-group">
                <label>Vai trò / Quyền hạn (*)</label>
                <select
                  value={editingRoleUser.vai_tro}
                  onChange={(e) =>
                    setEditingRoleUser({
                      ...editingRoleUser,
                      vai_tro: e.target.value,
                    })
                  }
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <small style={{ color: "#6b7280", marginTop: 6, fontSize: 12 }}>
                  Đổi vai trò chỉ thay quyền đăng nhập, không tự tạo nông trại
                  hay xóa dữ liệu cũ của tài khoản.
                </small>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setEditingRoleUser(null)}
              >
                Hủy
              </button>
              <button type="submit" className="btn-save">
                Cập nhật vai trò
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL ĐĂNG KÝ NÔNG TRẠI ================= */}
      {showActorModal && (
        <div className="modal-overlay">
          <form className="modal-container" onSubmit={handleAddActor}>
            <div className="modal-header">
              <h3>Đăng ký nông trại / chủ thể mới</h3>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowActorModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Loại hình (*)</label>
                <select
                  value={newActor.vai_tro}
                  onChange={(e) =>
                    setNewActor({ ...newActor, vai_tro: e.target.value })
                  }
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>
                  {newActor.vai_tro === "FARMER_COOP"
                    ? "Họ tên đại diện (*)"
                    : "Tên đơn vị (*)"}
                </label>
                <input
                  type="text"
                  placeholder={
                    newActor.vai_tro === "FARMER_COOP"
                      ? "Nguyễn Văn A"
                      : "Ví dụ: HTX Sơ Chế & Chế Biến Mekong"
                  }
                  value={newActor.ho_ten}
                  onChange={(e) =>
                    setNewActor({ ...newActor, ho_ten: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Số điện thoại</label>
                <input
                  type="text"
                  placeholder="09xxxxxxxx"
                  value={newActor.so_dien_thoai}
                  onChange={(e) =>
                    setNewActor({ ...newActor, so_dien_thoai: e.target.value })
                  }
                />
              </div>
              {newActor.vai_tro === "FARMER_COOP" && (
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Tên nông trại (*)</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Vườn Trái Cây Hữu Cơ Nam Bộ"
                      value={newActor.ten_nong_trai}
                      onChange={(e) =>
                        setNewActor({
                          ...newActor,
                          ten_nong_trai: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Địa điểm nông trại (*)</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Cần Thơ"
                      value={newActor.dia_diem_nong_trai}
                      onChange={(e) =>
                        setNewActor({
                          ...newActor,
                          dia_diem_nong_trai: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowActorModal(false)}
              >
                Hủy
              </button>
              <button type="submit" className="btn-save">
                Tạo đơn vị
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL THÊM TÀI KHOẢN ================= */}
      {showUserModal && (
        <div className="modal-overlay">
          <form className="modal-container" onSubmit={handleAddUser}>
            <div className="modal-header">
              <h3>Thêm tài khoản người dùng</h3>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowUserModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tên đăng nhập</label>
                <input
                  type="text"
                  placeholder="Để trống để hệ thống tự tạo"
                  value={newUser.ten_dang_nhap}
                  onChange={(e) =>
                    setNewUser({ ...newUser, ten_dang_nhap: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>Họ và tên (*)</label>
                <input
                  type="text"
                  placeholder="Nguyễn Minh Trí"
                  value={newUser.ho_ten}
                  onChange={(e) =>
                    setNewUser({ ...newUser, ho_ten: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Vai trò</label>
                  <select
                    value={newUser.vai_tro}
                    onChange={(e) =>
                      setNewUser({ ...newUser, vai_tro: e.target.value })
                    }
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Số điện thoại</label>
                  <input
                    type="text"
                    placeholder="09xxxxxxxx"
                    value={newUser.so_dien_thoai}
                    onChange={(e) =>
                      setNewUser({ ...newUser, so_dien_thoai: e.target.value })
                    }
                  />
                </div>
              </div>
              {newUser.vai_tro === "FARMER_COOP" && (
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Tên nông trại (*)</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Vườn Trái Cây Hữu Cơ Nam Bộ"
                      value={newUser.ten_nong_trai}
                      onChange={(e) =>
                        setNewUser({
                          ...newUser,
                          ten_nong_trai: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Địa điểm nông trại (*)</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Cần Thơ"
                      value={newUser.dia_diem_nong_trai}
                      onChange={(e) =>
                        setNewUser({
                          ...newUser,
                          dia_diem_nong_trai: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowUserModal(false)}
              >
                Hủy
              </button>
              <button type="submit" className="btn-save">
                Tạo tài khoản
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL THÊM DANH MỤC ================= */}
      {showCatModal && (
        <div className="modal-overlay">
          <form className="modal-container" onSubmit={handleAddCategoryItem}>
            <div className="modal-header">
              <h3>Thêm danh mục dùng chung</h3>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowCatModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Loại danh mục</label>
                <select
                  value={newCat.categoryType}
                  onChange={(e) =>
                    setNewCat({ ...newCat, categoryType: e.target.value })
                  }
                >
                  <option value="giong_cay_trong">Giống cây trồng</option>
                  <option value="vat_tu">Vật tư & phân bón</option>
                </select>
              </div>
              <div className="form-group">
                <label>Tên mục (*)</label>
                <input
                  type="text"
                  placeholder={
                    newCat.categoryType === "giong_cay_trong"
                      ? "Ví dụ: Quýt Đường miền Tây"
                      : "Ví dụ: Phân bón NPK 20-20-15"
                  }
                  value={newCat.name}
                  onChange={(e) =>
                    setNewCat({ ...newCat, name: e.target.value })
                  }
                  required
                />
              </div>
              {newCat.categoryType === "vat_tu" && (
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Loại vật tư</label>
                    <select
                      value={newCat.loai_vat_tu}
                      onChange={(e) =>
                        setNewCat({ ...newCat, loai_vat_tu: e.target.value })
                      }
                    >
                      <option value="PHAN_BON">Phân bón</option>
                      <option value="THUOC_BVTV">Thuốc BVTV</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Đơn vị tính</label>
                    <input
                      type="text"
                      placeholder="kg, lít..."
                      value={newCat.don_vi_tinh}
                      onChange={(e) =>
                        setNewCat({ ...newCat, don_vi_tinh: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowCatModal(false)}
              >
                Hủy
              </button>
              <button type="submit" className="btn-save">
                Lưu danh mục
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL THU HỒI LÔ ================= */}
      {showRecallModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3
                style={{
                  color: "#dc2626",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertTriangle size={18} /> Thu hồi lô {selectedRecallBatch}
              </h3>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowRecallModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 14 }}>
                Lô sẽ bị chặn mọi giao dịch tiếp theo trên chuỗi Smart Contract,
                và người tiêu dùng khi quét mã QR sẽ thấy cảnh báo thu hồi tức
                thì.
              </p>
              <div className="form-group">
                <label>Lý do thu hồi (*)</label>
                <textarea
                  placeholder="Dư lượng thuốc BVTV vượt ngưỡng cho phép..."
                  value={recallReason}
                  onChange={(e) => setRecallReason(e.target.value)}
                ></textarea>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowRecallModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-save"
                style={{ background: "#dc2626" }}
                onClick={() => {
                  if (!recallReason)
                    return alert("Vui lòng nhập lý do thu hồi!");
                  alert(
                    `Đã kích hoạt lệnh thu hồi lô ${selectedRecallBatch} trên Smart Contract!`,
                  );
                  setShowRecallModal(false);
                  setRecallReason("");
                }}
              >
                Xác nhận thu hồi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL GPS VẬN CHUYỂN ================= */}
      {showGpsModal && (
        <div className="modal-overlay">
          <div className="modal-container modal-lg">
            <div className="modal-header">
              <h3>Nhật ký hành trình GPS & Cảm biến: {showGpsModal}</h3>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowGpsModal(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div
                style={{
                  height: 180,
                  background: "#e2e8f0",
                  borderRadius: 8,
                  display: "grid",
                  placeItems: "center",
                  color: "#475569",
                  marginBottom: 16,
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <Navigation
                    size={32}
                    color="#2563eb"
                    style={{ margin: "0 auto 6px" }}
                  />
                  <b>Mô phỏng bản đồ vệ tinh tuyến đường (Trà Vinh → TP.HCM)</b>
                  <p style={{ fontSize: 12, color: "#64748b" }}>
                    Cập nhật tự động qua định vị IoT
                  </p>
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Tọa độ hiện tại</label>
                  <input
                    type="text"
                    readOnly
                    value="10.2431° N, 106.3753° E (Bến Lức, Long An)"
                  />
                </div>
                <div className="form-group">
                  <label>Nhiệt độ thùng lạnh</label>
                  <input
                    type="text"
                    readOnly
                    value="12°C (Vượt ngưỡng tiêu chuẩn 4–8°C)"
                    style={{ color: "#dc2626", fontWeight: 700 }}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowGpsModal(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
