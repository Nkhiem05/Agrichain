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

  // ================= DỮ LIỆU NÔNG TRẠI / CHỦ THỂ =================
  const [actors, setActors] = useState([
    {
      id: "FARM-01111",
      name: "Vườn Cam A1",
      type: "Nông trại / HTX canh tác",
      rep: "Nguyễn Văn A",
      taxId: "1802198001",
      node: "0x52a9...01ce",
      category: "farm",
      active: true,
      desc: "Quản lý nông trại, mùa vụ, ghi nhật ký vật tư, xuất lô thu hoạch, đặt lịch kiểm định, tạo yêu cầu vận chuyển.",
    },
    {
      id: "NODE-CS-01",
      name: "HTX Sơ Chế & Chế Biến Mekong",
      type: "Cơ sở sơ chế / đóng gói",
      rep: "Trần Văn Long",
      taxId: "1802198291",
      node: "0x81b7...d319",
      category: "factory",
      active: true,
      desc: "Tiếp nhận hoặc từ chối lô, cân thực tế, khởi tạo lô sơ chế, tách/gộp lô, ký số bao bì, bàn giao vận chuyển.",
    },
    {
      id: "NODE-KD-02",
      name: "Trung Tâm Giám Định Vùng 2",
      type: "Cơ quan kiểm định",
      rep: "Sở Nông nghiệp & PTNT",
      taxId: "VietGAP / GlobalGAP",
      node: "0x34f1...99bc",
      category: "inspection",
      active: true,
      desc: "Chấp thuận hoặc từ chối hồ sơ, hẹn lấy mẫu, niêm phong, nhập chỉ số xét nghiệm, ký số và công bố chứng nhận.",
    },
    {
      id: "NODE-VC-04",
      name: "Mekong Express Logistics",
      type: "Đơn vị vận chuyển",
      rep: "Lê Quốc Bảo",
      taxId: "1801455620",
      node: "0x9ad0...4e72",
      category: "shipping",
      active: true,
      desc: "Nhận chuyến, quét QR lấy hàng, ghi hành trình GPS, xác nhận giao hàng, ký biên bản giao nhận điện tử.",
    },
    {
      id: "NODE-CS-07",
      name: "HTX Bến Tre Fresh",
      type: "Cơ sở sơ chế / đóng gói",
      rep: "Phạm Thị Hoa",
      taxId: "1300774511",
      node: "0xd941...c4a1",
      category: "factory",
      active: false,
      desc: "Vi phạm quy trình tách/gộp lô - Node tạm dừng giao dịch trên Smart Contract.",
    },
  ]);

  // ================= DỮ LIỆU TÀI KHOẢN =================
  const [users, setUsers] = useState([
    {
      username: "nongdan_nguyenvana",
      name: "Nguyễn Văn A",
      org: "Vườn Cam A1",
      role: "Nông dân",
      active: true,
    },
    {
      username: "soche_tranvanlong",
      name: "Trần Văn Long",
      org: "HTX Sơ Chế Mekong",
      role: "Cơ sở sơ chế",
      active: true,
    },
    {
      username: "kiemdinh_ttgd2",
      name: "Võ Minh Khoa",
      org: "Trung Tâm Giám Định V2",
      role: "Kiểm định viên",
      active: true,
    },
    {
      username: "taixe_hung65c",
      name: "Nguyễn Văn Hùng",
      org: "Mekong Express Logistics",
      role: "Tài xế vận chuyển",
      active: true,
    },
    {
      username: "taixe_minhtri",
      name: "Nguyễn Minh Trí",
      org: "Mekong Express Logistics",
      role: "Tài xế vận chuyển",
      active: false,
    },
  ]);

  // ================= DỮ LIỆU DANH MỤC =================
  const [categories, setCategories] = useState([
    {
      title: "Giống cây trồng",
      items: [
        "Quýt Đường miền Tây",
        "Cam Sành Tiền Giang",
        "Bưởi Da Xanh Bến Tre",
      ],
    },
    {
      title: "Tiêu chuẩn kiểm định",
      items: ["VietGAP trồng trọt", "GlobalGAP xuất khẩu"],
    },
    {
      title: "Chỉ số xét nghiệm",
      items: [
        "Dư lượng thuốc BVTV (mg/kg)",
        "Kim loại nặng (Pb, Cd)",
        "Độ Brix tiêu chuẩn",
      ],
    },
    {
      title: "Vật tư & phân bón",
      items: ["Phân bón NPK 20-20-15", "Thuốc trừ sâu Decis 2.5EC"],
    },
    {
      title: "Quy cách đóng gói",
      items: ["Thùng carton 10 kg", "Túi lưới 2 kg", "Khay xốp bọc màng 500 g"],
    },
    {
      title: "Phương tiện & ngưỡng bảo quản",
      items: ["Xe lạnh 4–8°C", "Xe thường có bạt che"],
    },
  ]);

  // ================= TOÀN VẸN CHUỖI ON-CHAIN =================
  const [blocksVerified, setBlocksVerified] = useState(42918);
  const [isVerifying, setIsVerifying] = useState(false);

  // ================= FORM STATES =================
  const [newActor, setNewActor] = useState({
    name: "",
    type: "Nông trại / HTX canh tác",
    taxId: "",
    node: "",
  });

  const [newUser, setNewUser] = useState({
    username: "",
    name: "",
    org: "Vườn Cam A1",
    role: "Nông dân",
  });

  const [newCat, setNewCat] = useState({
    categoryType: "Giống cây trồng",
    name: "",
  });

  const [recallReason, setRecallReason] = useState("");

  // ================= XỬ LÝ SỰ KIỆN =================
  const toggleActorStatus = (id) => {
    setActors((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, active: !item.active } : item,
      ),
    );
  };

  const toggleUserStatus = (username) => {
    setUsers((prev) =>
      prev.map((item) =>
        item.username === username ? { ...item, active: !item.active } : item,
      ),
    );
    setOpenDropdownUser(null);
  };

  const handleAddActor = (e) => {
    e.preventDefault();
    if (!newActor.name) return alert("Vui lòng điền tên nông trại");
    const created = {
      id: `#NODE-${Math.floor(1000 + Math.random() * 9000)}`,
      name: newActor.name,
      type: newActor.type,
      rep: "Đại diện hợp pháp",
      taxId: newActor.taxId || "Đang xác thực",
      node:
        newActor.node ||
        "0x" + Math.random().toString(16).substring(2, 8) + "...node",
      category: "farm",
      active: true,
      desc: "Node mới thêm, đã ghi nhận trên mạng Smart Contract.",
    };
    setActors([...actors, created]);
    setShowActorModal(false);
    setNewActor({
      name: "",
      type: "Nông trại / HTX canh tác",
      taxId: "",
      node: "",
    });
  };

  const handleAddUser = (e) => {
    e.preventDefault();
    if (!newUser.username || !newUser.name)
      return alert("Vui lòng nhập đủ thông tin");
    setUsers([...users, { ...newUser, active: true }]);
    setShowUserModal(false);
    setNewUser({
      username: "",
      name: "",
      org: "Vườn Cam A1",
      role: "Nông dân",
    });
  };

  const handleSaveEditRoleUser = (e) => {
    e.preventDefault();
    setUsers((prev) =>
      prev.map((u) =>
        u.username === editingRoleUser.username
          ? { ...u, role: editingRoleUser.role }
          : u,
      ),
    );
    setEditingRoleUser(null);
  };

  const handleAddCategoryItem = (e) => {
    e.preventDefault();
    if (!newCat.name) return alert("Vui lòng nhập tên mục");
    setCategories((prev) =>
      prev.map((c) =>
        c.title === newCat.categoryType
          ? { ...c, items: [...c.items, newCat.name] }
          : c,
      ),
    );
    setShowCatModal(false);
    setNewCat({ categoryType: "Giống cây trồng", name: "" });
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
                      128 <span className="metric-unit">NÔNG TRẠI</span>
                    </div>
                  </div>
                  <div className="metric-card">
                    <span className="metric-title">Mùa vụ đang chạy</span>
                    <div className="metric-number">
                      214 <span className="metric-unit">MÙA VỤ</span>
                    </div>
                  </div>
                  <div className="metric-card">
                    <span className="metric-title">Lô đang lưu thông</span>
                    <div className="metric-number">
                      86 <span className="metric-unit">LÔ</span>
                    </div>
                  </div>
                  <div className="metric-card warn">
                    <span className="metric-title">Cảnh báo cần xử lý</span>
                    <div className="metric-number">
                      5 <span className="metric-unit">MỤC</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overview-cols">
                <div className="box-section">
                  <h3>
                    <span>Việc cần xử lý</span>
                    <span className="status-pill danger">5 mục</span>
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingBottom: 12,
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: 13.5, color: "#1f2937" }}>
                          Hồ sơ đăng ký chờ duyệt
                        </strong>
                        <p
                          style={{
                            fontSize: 12,
                            color: "#6b7280",
                            marginTop: 2,
                          }}
                        >
                          3 đơn vị vừa đăng ký: 1 nông trại, 1 cơ sở sơ chế, 1
                          đơn vị vận chuyển
                        </p>
                      </div>
                      <button
                        className="btn-action-view"
                        onClick={() => setActiveTab("farms")}
                      >
                        Xem
                      </button>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingBottom: 12,
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: 13.5, color: "#dc2626" }}>
                          Lô #LH-8790 không đạt chuẩn VietGAP
                        </strong>
                        <p
                          style={{
                            fontSize: 12,
                            color: "#6b7280",
                            marginTop: 2,
                          }}
                        >
                          Cơ quan kiểm định đã đình chỉ tem chứng nhận hôm nay
                        </p>
                      </div>
                      <button
                        className="btn-action-retry"
                        onClick={() => {
                          setSelectedRecallBatch("#LH-8790");
                          setShowRecallModal(true);
                        }}
                      >
                        Thu hồi
                      </button>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingBottom: 12,
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: 13.5, color: "#1f2937" }}>
                          Chuyến #VC-3021 vượt ngưỡng nhiệt độ
                        </strong>
                        <p
                          style={{
                            fontSize: 12,
                            color: "#6b7280",
                            marginTop: 2,
                          }}
                        >
                          Xe 65C-128.45 ghi nhận 12°C, ngưỡng cho phép 4–8°C
                        </p>
                      </div>
                      <button
                        className="btn-action-edit"
                        onClick={() => setActiveTab("shipping")}
                      >
                        Xem
                      </button>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: 13.5, color: "#1f2937" }}>
                          Cơ sở sơ chế bị vô hiệu hóa
                        </strong>
                        <p
                          style={{
                            fontSize: 12,
                            color: "#6b7280",
                            marginTop: 2,
                          }}
                        >
                          HTX Bến Tre Fresh, giao dịch chuỗi từ node này đang bị
                          chặn
                        </p>
                      </div>
                      <button
                        className="btn-action-view"
                        onClick={() => setActiveTab("farms")}
                      >
                        Xem
                      </button>
                    </div>
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
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 13,
                          marginBottom: 4,
                        }}
                      >
                        <span>Canh tác</span>
                        <b>42</b>
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
                            width: "48%",
                            height: "100%",
                            background: "#67ac7d",
                          }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 13,
                          marginBottom: 4,
                        }}
                      >
                        <span>Sơ chế</span>
                        <b>18</b>
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
                            width: "21%",
                            height: "100%",
                            background: "#14532d",
                          }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 13,
                          marginBottom: 4,
                        }}
                      >
                        <span>Kiểm định</span>
                        <b>11</b>
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
                            width: "13%",
                            height: "100%",
                            background: "#e0a030",
                          }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 13,
                          marginBottom: 4,
                        }}
                      >
                        <span>Vận chuyển</span>
                        <b>15</b>
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
                            width: "17%",
                            height: "100%",
                            background: "#4f8fd6",
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className="alert-box ok" style={{ marginTop: 12 }}>
                      <div>
                        <b>100% Khối hợp lệ</b>
                        <p>Lần đối soát gần nhất: 15 phút trước</p>
                      </div>
                      <CheckCircle2 color="#16a34a" size={24} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NÔNG TRẠI */}
          {activeTab === "farms" && (
            <div>
              <div className="sticky-top-section">
                <div className="metrics-row">
                  <div className="metric-card">
                    <span className="metric-title">
                      Tổng số nông trại & đối tác
                    </span>
                    <div className="metric-number">
                      {actors.length}{" "}
                      <span className="metric-unit">ĐƠN VỊ</span>
                    </div>
                  </div>
                  <div className="metric-card">
                    <span className="metric-title">Đang hoạt động</span>
                    <div className="metric-number">
                      {actors.filter((a) => a.active).length}
                    </div>
                  </div>
                  <div className="metric-card warn">
                    <span className="metric-title">Đang bị vô hiệu hóa</span>
                    <div className="metric-number">
                      {actors.filter((a) => !a.active).length}{" "}
                      <span className="metric-unit">CHỦ THỂ</span>
                    </div>
                  </div>
                  <div className="metric-card">
                    <span className="metric-title">Chờ duyệt đăng ký</span>
                    <div className="metric-number">
                      3 <span className="metric-unit">HỒ SƠ</span>
                    </div>
                  </div>
                </div>

                <div className="content-head">
                  <div>
                    <h2>Quản lý Nông Trại & Chuỗi Liên Kết</h2>
                    <p>
                      Mỗi nông trại là một node xác thực có thẩm quyền độc lập
                      trên Smart Contract.
                    </p>
                  </div>
                  <button
                    className="btn-primary-action"
                    onClick={() => setShowActorModal(true)}
                  >
                    <Plus size={16} /> Đăng ký nông trại
                  </button>
                </div>
              </div>

              {actors.map((actor) => (
                <div
                  key={actor.id}
                  className={`panel-card ${actor.active ? "" : "disabled"}`}
                >
                  <div
                    className={`card-icon-avatar ${
                      actor.category === "shipping"
                        ? "amber"
                        : actor.category === "inspection"
                          ? "blue"
                          : actor.active
                            ? ""
                            : "red"
                    }`}
                  >
                    {actor.category === "farm" && <Tractor size={26} />}
                    {actor.category === "factory" && <Factory size={26} />}
                    {actor.category === "inspection" && <Award size={26} />}
                    {actor.category === "shipping" && <Truck size={26} />}
                  </div>

                  <div className="card-main">
                    <div className="card-head-row">
                      <h3>{actor.name}</h3>
                      <span className="status-pill gray mono">#{actor.id}</span>
                      <span
                        className={`status-pill ${actor.active ? "success" : "danger"}`}
                      >
                        {actor.type}
                      </span>
                    </div>

                    <div className="card-grid-info">
                      <span>
                        Đại diện: <strong>{actor.rep}</strong>
                      </span>
                      <span>
                        Mã định danh/MST: <strong>{actor.taxId}</strong>
                      </span>
                      <span>
                        Node: <strong className="mono">{actor.node}</strong>
                      </span>
                      <span>
                        Trạng thái:{" "}
                        <strong
                          style={{
                            color: actor.active ? "#15803d" : "#dc2626",
                          }}
                        >
                          {actor.active ? "Đang hoạt động" : "Đã vô hiệu hóa"}
                        </strong>
                      </span>
                    </div>

                    <div className="card-desc-box">
                      <strong>Quyền hạn chuỗi:</strong> {actor.desc}
                    </div>
                  </div>

                  <div className="card-actions-col">
                    <button
                      className={
                        actor.active ? "btn-action-retry" : "btn-action-view"
                      }
                      onClick={() => toggleActorStatus(actor.id)}
                    >
                      {actor.active ? <Lock size={12} /> : <Unlock size={12} />}
                      {actor.active ? "Vô hiệu hóa" : "Kích hoạt lại"}
                    </button>
                    <button
                      className="btn-action-edit"
                      onClick={() => alert(`Xem chi tiết hồ sơ: ${actor.name}`)}
                    >
                      <Eye size={12} /> Xem chi tiết
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
                      {users.filter((u) => u.active).length}
                    </div>
                  </div>
                  <div className="metric-card warn">
                    <span className="metric-title">Tài khoản bị khóa</span>
                    <div className="metric-number">
                      {users.filter((u) => !u.active).length}{" "}
                      <span className="metric-unit">USER</span>
                    </div>
                  </div>
                  <div className="metric-card">
                    <span className="metric-title">Vai trò quản trị</span>
                    <div className="metric-number">
                      1 <span className="metric-unit">SUPER ADMIN</span>
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
                    {users.map((user) => (
                      <tr key={user.username}>
                        <td className="mono" style={{ fontWeight: 600 }}>
                          {user.username}
                        </td>
                        <td>{user.name}</td>
                        <td style={{ color: "#16a34a", fontWeight: 600 }}>
                          {user.org}
                        </td>
                        <td>{user.role}</td>
                        <td style={{ textAlign: "center" }}>
                          <span
                            className={`status-pill ${user.active ? "success" : "danger"}`}
                          >
                            {user.active ? "Hoạt động" : "Bị khóa"}
                          </span>
                        </td>
                        <td
                          style={{ textAlign: "center", position: "relative" }}
                        >
                          <div
                            className="dropdown-wrapper"
                            ref={
                              openDropdownUser === user.username
                                ? dropdownRef
                                : null
                            }
                          >
                            {/* Nút 3 chấm tối giản, hiện đại */}
                            <button
                              type="button"
                              className={`btn-action-more ${
                                openDropdownUser === user.username
                                  ? "active"
                                  : ""
                              }`}
                              title="Tùy chọn thao tác"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownUser(
                                  openDropdownUser === user.username
                                    ? null
                                    : user.username,
                                );
                              }}
                            >
                              <MoreVertical size={16} />
                            </button>

                            {/* Dropdown Menu Popup */}
                            {openDropdownUser === user.username && (
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
                                    user.active ? "danger" : "success"
                                  }`}
                                  onClick={() =>
                                    toggleUserStatus(user.username)
                                  }
                                >
                                  {user.active ? (
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

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                  gap: 16,
                }}
              >
                {categories.map((cat, idx) => (
                  <div
                    key={idx}
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
                      <span>{cat.title}</span>
                      <span style={{ color: "#278d49", fontSize: 12 }}>
                        {cat.items.length} mục
                      </span>
                    </div>
                    <div>
                      {cat.items.map((item, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "10px 16px",
                            borderBottom:
                              i === cat.items.length - 1
                                ? "none"
                                : "1px solid #f3f4f6",
                            fontSize: 13,
                          }}
                        >
                          <span>{item}</span>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              style={{
                                background: "none",
                                border: "none",
                                color: "#6b7280",
                                cursor: "pointer",
                                fontSize: 12,
                              }}
                              onClick={() => alert(`Sửa ${item}`)}
                            >
                              Sửa
                            </button>
                            <button
                              style={{
                                background: "none",
                                border: "none",
                                color: "#dc2626",
                                cursor: "pointer",
                                fontSize: 12,
                              }}
                              onClick={() => {
                                setCategories((prev) =>
                                  prev.map((c) =>
                                    c.title === cat.title
                                      ? {
                                          ...c,
                                          items: c.items.filter(
                                            (it) => it !== item,
                                          ),
                                        }
                                      : c,
                                  ),
                                );
                              }}
                            >
                              Xóa
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
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
                  <span className="detail-label">Tên đăng nhập:</span>
                  <span className="detail-value mono font-bold">
                    {selectedUserDetail.username}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Họ và tên:</span>
                  <span className="detail-value">
                    {selectedUserDetail.name}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Đơn vị trực thuộc:</span>
                  <span className="detail-value" style={{ color: "#16a34a" }}>
                    {selectedUserDetail.org}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Vai trò:</span>
                  <span className="detail-value">
                    {selectedUserDetail.role}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Trạng thái:</span>
                  <span
                    className={`status-pill ${
                      selectedUserDetail.active ? "success" : "danger"
                    }`}
                  >
                    {selectedUserDetail.active ? "Hoạt động" : "Bị khóa"}
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
                  value={`${editingRoleUser.name} (${editingRoleUser.username})`}
                  disabled
                  style={{ background: "#f3f4f6", cursor: "not-allowed" }}
                />
              </div>
              <div className="form-group">
                <label>Đơn vị trực thuộc</label>
                <input
                  type="text"
                  value={editingRoleUser.org}
                  disabled
                  style={{ background: "#f3f4f6", cursor: "not-allowed" }}
                />
              </div>
              <div className="form-group">
                <label>Vai trò / Quyền hạn trên Smart Contract (*)</label>
                <select
                  value={editingRoleUser.role}
                  onChange={(e) =>
                    setEditingRoleUser({
                      ...editingRoleUser,
                      role: e.target.value,
                    })
                  }
                >
                  <option>Nông dân</option>
                  <option>Cơ sở sơ chế</option>
                  <option>Kiểm định viên</option>
                  <option>Tài xế vận chuyển</option>
                </select>
                <small style={{ color: "#6b7280", marginTop: 6, fontSize: 12 }}>
                  Quyền hạn mới sẽ được cập nhật đồng bộ lên sổ cái phân quyền
                  Smart Contract.
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
                  value={newActor.type}
                  onChange={(e) =>
                    setNewActor({ ...newActor, type: e.target.value })
                  }
                >
                  <option>Nông trại / HTX canh tác</option>
                  <option>Cơ sở sơ chế & đóng gói</option>
                  <option>Cơ quan kiểm định</option>
                  <option>Đơn vị vận chuyển</option>
                </select>
              </div>
              <div className="form-group">
                <label>Tên nông trại / đơn vị (*)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Vườn Trái Cây Hữu Cơ Nam Bộ"
                  value={newActor.name}
                  onChange={(e) =>
                    setNewActor({ ...newActor, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Mã số thuế / giấy phép</label>
                  <input
                    type="text"
                    placeholder="0312984920"
                    value={newActor.taxId}
                    onChange={(e) =>
                      setNewActor({ ...newActor, taxId: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Node / Public key</label>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={newActor.node}
                    onChange={(e) =>
                      setNewActor({ ...newActor, node: e.target.value })
                    }
                  />
                </div>
              </div>
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
                Tạo nông trại
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
                <label>Tên đăng nhập (*)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: taixe_minhtri"
                  value={newUser.username}
                  onChange={(e) =>
                    setNewUser({ ...newUser, username: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Họ và tên (*)</label>
                <input
                  type="text"
                  placeholder="Nguyễn Minh Trí"
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Chủ thể trực thuộc</label>
                  <select
                    value={newUser.org}
                    onChange={(e) =>
                      setNewUser({ ...newUser, org: e.target.value })
                    }
                  >
                    {actors.map((a) => (
                      <option key={a.id} value={a.name}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Vai trò</label>
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({ ...newUser, role: e.target.value })
                    }
                  >
                    <option>Nông dân</option>
                    <option>Cơ sở sơ chế</option>
                    <option>Kiểm định viên</option>
                    <option>Tài xế vận chuyển</option>
                  </select>
                </div>
              </div>
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
                  {categories.map((c, i) => (
                    <option key={i} value={c.title}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Tên mục (*)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Quýt Đường miền Tây"
                  value={newCat.name}
                  onChange={(e) =>
                    setNewCat({ ...newCat, name: e.target.value })
                  }
                  required
                />
              </div>
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
