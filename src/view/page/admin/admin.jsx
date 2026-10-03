import React, { useState } from "react";
import {
  ShieldCheck,
  Users,
  FolderTree,
  Activity,
  UserPlus,
  Factory,
  Award,
  Settings2,
  Ban,
  Check,
  Plus,
  Edit2,
  Trash,
  ShieldAlert,
  RefreshCw,
  X,
  Building2,
} from "lucide-react";
import "../../css/admin.css";

const DEFAULT_LOGO_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png";

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState("actors");

  // State Chủ thể
  const [actors, setActors] = useState([
    {
      id: 1,
      name: "HTX Sơ Chế & Chế Biến Mekong",
      code: "#NODE-CS-01",
      type: "Cơ Sở Sơ Chế / Đóng Gói",
      representative: "Trần Văn Long",
      tax: "1802198291",
      nodeAddress: "0x81b7...d319",
      active: true,
      permissions:
        "Tiếp nhận lô, Khởi tạo lô sơ chế, Tách/Gộp lô, Ký số chứng thực bao bì.",
    },
    {
      id: 2,
      name: "Trung Tâm Giám Định Vùng 2",
      code: "#NODE-KD-02",
      type: "Cơ Quan Kiểm Định Chất Lượng",
      representative: "Sở Nông Nghiệp & PTNT",
      tax: "Cấp chứng nhận VietGAP / GlobalGAP",
      nodeAddress: "0x34f1...99bc",
      active: true,
      permissions:
        "Duyệt lịch hẹn lấy mẫu, Công bố kết quả xét nghiệm, Đình chỉ tem chứng nhận.",
    },
  ]);

  // State Người dùng
  const [userList, setUserList] = useState([
    {
      username: "nongdan_nguyenvana",
      fullname: "Nguyễn Văn A",
      org: "Vườn Cam A1 (#FARM-01111)",
      role: "Nông Dân (Canh tác)",
      status: "Hoạt động",
    },
    {
      username: "taixe_hung65c",
      fullname: "Nguyễn Văn Hùng",
      org: "Mekong Express Logistics",
      role: "Tài Xế Vận Chuyển",
      status: "Hoạt động",
    },
  ]);

  // State Modal
  const [showAddActorModal, setShowAddActorModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddCatModal, setShowAddCatModal] = useState(false);

  // Vô hiệu hóa/Kích hoạt chủ thể
  const toggleActorStatus = (id) => {
    setActors((prev) =>
      prev.map((actor) => {
        if (actor.id === id) {
          const updated = !actor.active;
          alert(
            updated
              ? `Đã kích hoạt lại chủ thể ${actor.name}!`
              : `Đã vô hiệu hóa chủ thể ${actor.name}! Tất cả giao dịch chuỗi từ node này đã bị chặn.`,
          );
          return { ...actor, active: updated };
        }
        return actor;
      }),
    );
  };

  // Khóa người dùng
  const handleLockUser = (username) => {
    if (window.confirm(`Bạn có chắc muốn tạm khóa tài khoản "${username}"?`)) {
      setUserList((prev) =>
        prev.map((u) =>
          u.username === username ? { ...u, status: "Bị khóa" } : u,
        ),
      );
      alert(`Tài khoản ${username} đã bị khóa.`);
    }
  };

  // Kiểm tra tính toàn vẹn
  const handleRunIntegrityCheck = () => {
    alert(
      "Đang đối soát cây Merkle... Toàn bộ 42,918 khối và giao dịch khớp hoàn toàn với sổ cái Smart Contract. Không phát hiện sai lệch dữ liệu!",
    );
  };

  return (
    <div className="admin-dashboard">
      {/* HEADER (ĐỒNG BỘ NÔNG DÂN) */}
      <header className="dashboard-header">
        <div className="header-left">
          <img src={DEFAULT_LOGO_IMG} alt="Logo" className="header-logo-icon" />
          <span className="header-brand-title">AGRICHAIN ADMIN</span>
        </div>

        <div className="header-search-bar">
          <input
            type="text"
            placeholder="Tìm kiếm tài khoản, chủ thể, mã hợp đồng..."
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

      {/* BODY */}
      <div className="dashboard-body">
        {/* SIDEBAR (ĐỒNG BỘ NÔNG DÂN) */}
        <aside className="dashboard-sidebar">
          <div>
            <div className="sidebar-heading">Quản trị hệ thống</div>
            <nav className="sidebar-nav">
              <button
                type="button"
                onClick={() => setActiveTab("actors")}
                className={`nav-item-btn ${activeTab === "actors" ? "active" : ""}`}
              >
                <ShieldCheck size={20} />
                <span>Tài khoản & Chủ thể</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("users")}
                className={`nav-item-btn ${activeTab === "users" ? "active" : ""}`}
              >
                <Users size={20} />
                <span>Tài khoản người dùng</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("categories")}
                className={`nav-item-btn ${activeTab === "categories" ? "active" : ""}`}
              >
                <FolderTree size={20} />
                <span>Danh mục dùng chung</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("system")}
                className={`nav-item-btn ${activeTab === "system" ? "active" : ""}`}
              >
                <Activity size={20} />
                <span>Giám sát chuỗi & Lô hàng</span>
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

        {/* NỘI DUNG CHÍNH */}
        <main className="dashboard-content">
          {/* TAB 1: TÀI KHOẢN & CHỦ THỂ */}
          {activeTab === "actors" && (
            <div>
              <div className="metrics-row">
                <div className="metric-card">
                  <div className="metric-title">Tổng số chủ thể chuỗi</div>
                  <div className="metric-number">
                    {actors.length + 40}
                    <span className="metric-unit">ĐƠN VỊ</span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-title">Chủ thể đang hoạt động</div>
                  <div className="metric-number">
                    {actors.filter((a) => a.active).length + 39}
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-title">Đang bị vô hiệu hóa</div>
                  <div className="metric-number" style={{ color: "#dc2626" }}>
                    {actors.filter((a) => !a.active).length}
                    <span className="metric-unit" style={{ color: "#dc2626" }}>
                      CHỦ THỂ
                    </span>
                  </div>
                </div>

                <div className="actions-box">
                  <button
                    className="btn-primary-action"
                    onClick={() => setShowAddActorModal(true)}
                  >
                    <UserPlus size={16} /> + Đăng ký chủ thể
                  </button>
                </div>
              </div>

              {/* Danh sách chủ thể */}
              {actors.map((actor) => (
                <div className="card-item" key={actor.id}>
                  <div
                    className={`card-icon-box ${actor.id === 1 ? "green" : "blue"}`}
                  >
                    {actor.id === 1 ? (
                      <Factory size={28} />
                    ) : (
                      <Award size={28} />
                    )}
                  </div>

                  <div className="card-body">
                    <div className="card-header-line">
                      <h3 className="card-title">{actor.name}</h3>
                      <span className="tag-badge gray">{actor.code}</span>
                      <span
                        className={`tag-badge ${actor.id === 1 ? "green" : "blue"}`}
                      >
                        {actor.type}
                      </span>
                    </div>

                    <div className="card-meta-row">
                      <span>
                        Đại diện: <strong>{actor.representative}</strong>
                      </span>
                      <span>
                        Mã định danh/MST: <strong>{actor.tax}</strong>
                      </span>
                      <span>
                        Địa chỉ node: <strong>{actor.nodeAddress}</strong>
                      </span>
                      <span>
                        Trạng thái:{" "}
                        <strong
                          style={{
                            color: actor.active ? "#15803d" : "#dc2626",
                          }}
                        >
                          {actor.active
                            ? "Đang hoạt động (Active)"
                            : "Đã vô hiệu hóa"}
                        </strong>
                      </span>
                    </div>

                    <div className="card-desc">
                      <strong>Quyền hạn chuỗi:</strong> {actor.permissions}
                    </div>
                  </div>

                  <div className="card-actions">
                    <button
                      className={
                        actor.active
                          ? "btn-action-danger"
                          : "btn-action-outline"
                      }
                      onClick={() => toggleActorStatus(actor.id)}
                    >
                      {actor.active ? <Ban size={15} /> : <Check size={15} />}
                      <span>
                        {actor.active ? "Vô hiệu hóa" : "Kích hoạt lại"}
                      </span>
                    </button>
                    <button
                      className="btn-action-outline"
                      onClick={() =>
                        alert("Mở cấu hình phân quyền Smart Contract")
                      }
                    >
                      <Settings2 size={15} /> Phân quyền
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: NGƯỜI DÙNG */}
          {activeTab === "users" && (
            <div style={{ paddingTop: "24px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: "#ffffff",
                  padding: "16px 20px",
                  borderRadius: "10px",
                  border: "1px solid #e5e7eb",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <h2 style={{ fontSize: "16px", fontWeight: "700" }}>
                    Danh Sách Người Dùng Hệ Thống
                  </h2>
                  <p style={{ fontSize: "12px", color: "#6b7280" }}>
                    Quản lý định danh cá nhân thuộc các chủ thể tham gia chuỗi
                    cung ứng.
                  </p>
                </div>
                <button
                  className="btn-primary-action"
                  style={{ height: "36px", padding: "0 16px" }}
                  onClick={() => setShowAddUserModal(true)}
                >
                  <UserPlus size={16} /> Thêm tài khoản
                </button>
              </div>

              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Tên Đăng Nhập</th>
                      <th>Họ & Tên</th>
                      <th>Chủ Thể Trực Thuộc</th>
                      <th>Vai Trò</th>
                      <th>Trạng Thái</th>
                      <th style={{ textAlign: "right" }}>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userList.map((u, idx) => (
                      <tr key={idx}>
                        <td
                          style={{ fontWeight: "700", fontFamily: "monospace" }}
                        >
                          {u.username}
                        </td>
                        <td>{u.fullname}</td>
                        <td style={{ color: "#16a34a", fontWeight: "600" }}>
                          {u.org}
                        </td>
                        <td>{u.role}</td>
                        <td>
                          <span
                            className={`status-badge ${
                              u.status === "Hoạt động" ? "active" : "disabled"
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {u.status === "Hoạt động" ? (
                            <button
                              style={{
                                background: "none",
                                border: "none",
                                color: "#dc2626",
                                fontWeight: "600",
                                cursor: "pointer",
                              }}
                              onClick={() => handleLockUser(u.username)}
                            >
                              Khóa tài khoản
                            </button>
                          ) : (
                            <span style={{ color: "#9ca3af" }}>Đã khóa</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: DANH MỤC */}
          {activeTab === "categories" && (
            <div style={{ paddingTop: "24px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: "#ffffff",
                  padding: "16px 20px",
                  borderRadius: "10px",
                  border: "1px solid #e5e7eb",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <h2 style={{ fontSize: "16px", fontWeight: "700" }}>
                    Danh Mục Chuẩn Hóa Toàn Ngành
                  </h2>
                  <p style={{ fontSize: "12px", color: "#6b7280" }}>
                    Định nghĩa trước danh mục cây trồng, loại phân bón và tiêu
                    chuẩn chứng nhận.
                  </p>
                </div>
                <button
                  className="btn-primary-action"
                  style={{ height: "36px", padding: "0 16px" }}
                  onClick={() => setShowAddCatModal(true)}
                >
                  <Plus size={16} /> Thêm danh mục
                </button>
              </div>

              <div className="categories-grid">
                <div className="category-box">
                  <div className="category-box-header">
                    <span style={{ fontWeight: "700", fontSize: "14px" }}>
                      Giống Cây Trồng
                    </span>
                    <span
                      style={{
                        color: "#16a34a",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      2 giống
                    </span>
                  </div>
                  <div className="category-item">
                    <span>Quýt Đường miền Tây</span>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <Edit2
                        size={14}
                        style={{ cursor: "pointer", color: "#6b7280" }}
                      />
                      <Trash
                        size={14}
                        style={{ cursor: "pointer", color: "#dc2626" }}
                      />
                    </div>
                  </div>
                  <div className="category-item">
                    <span>Cam Sành Tiền Giang</span>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <Edit2
                        size={14}
                        style={{ cursor: "pointer", color: "#6b7280" }}
                      />
                      <Trash
                        size={14}
                        style={{ cursor: "pointer", color: "#dc2626" }}
                      />
                    </div>
                  </div>
                </div>

                <div className="category-box">
                  <div className="category-box-header">
                    <span style={{ fontWeight: "700", fontSize: "14px" }}>
                      Tiêu Chuẩn Đăng Kiểm
                    </span>
                    <span
                      style={{
                        color: "#16a34a",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      2 chuẩn
                    </span>
                  </div>
                  <div className="category-item">
                    <span>VietGAP Trồng Trọt</span>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <Edit2
                        size={14}
                        style={{ cursor: "pointer", color: "#6b7280" }}
                      />
                      <Trash
                        size={14}
                        style={{ cursor: "pointer", color: "#dc2626" }}
                      />
                    </div>
                  </div>
                  <div className="category-item">
                    <span>GlobalGAP Xuất Khẩu</span>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <Edit2
                        size={14}
                        style={{ cursor: "pointer", color: "#6b7280" }}
                      />
                      <Trash
                        size={14}
                        style={{ cursor: "pointer", color: "#dc2626" }}
                      />
                    </div>
                  </div>
                </div>

                <div className="category-box">
                  <div className="category-box-header">
                    <span style={{ fontWeight: "700", fontSize: "14px" }}>
                      Vật Tư & Phân Bón
                    </span>
                    <span
                      style={{
                        color: "#16a34a",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      2 loại
                    </span>
                  </div>
                  <div className="category-item">
                    <span>Phân bón NPK 20-20-15</span>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <Edit2
                        size={14}
                        style={{ cursor: "pointer", color: "#6b7280" }}
                      />
                      <Trash
                        size={14}
                        style={{ cursor: "pointer", color: "#dc2626" }}
                      />
                    </div>
                  </div>
                  <div className="category-item">
                    <span>Thuốc trừ sâu Decis 2.5EC</span>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <Edit2
                        size={14}
                        style={{ cursor: "pointer", color: "#6b7280" }}
                      />
                      <Trash
                        size={14}
                        style={{ cursor: "pointer", color: "#dc2626" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GIÁM SÁT CHUỖI & LÔ HÀNG */}
          {activeTab === "system" && (
            <div style={{ paddingTop: "24px" }}>
              <div
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px",
                  padding: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "16px" }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "10px",
                      backgroundColor: "#ecfdf5",
                      color: "#15803d",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ShieldAlert size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: "700" }}>
                      Kiểm Tra Tính Toàn Vẹn Chuỗi Dữ Liệu
                    </h3>
                    <p style={{ fontSize: "12px", color: "#6b7280" }}>
                      Đối chiếu giá trị Hash khối giữa CSDL tập trung và Sổ cái
                      Smart Contract.
                    </p>
                  </div>
                </div>
                <button
                  className="btn-primary-action"
                  style={{ height: "38px", padding: "0 18px" }}
                  onClick={handleRunIntegrityCheck}
                >
                  <RefreshCw size={15} /> Chạy kiểm tra ngay
                </button>
              </div>

              <div className="table-container" style={{ padding: "20px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #f3f4f6",
                    paddingBottom: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <h3 style={{ fontSize: "14px", fontWeight: "700" }}>
                    Theo Dõi Trạng Thái Lô Toàn Chuỗi
                  </h3>
                  <span className="status-badge active">100% Khối hợp lệ</span>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      borderBottom: "1px solid #f3f4f6",
                      paddingBottom: "12px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span style={{ fontWeight: "700", fontSize: "14px" }}>
                          Lô Thành Phẩm #SC-2026-001
                        </span>
                        <span className="tag-badge blue">
                          Đang Vận Chuyển Chuỗi Lạnh
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: "12px",
                          color: "#6b7280",
                          marginTop: "4px",
                        }}
                      >
                        Trà Vinh ➔ Tổng Kho Bách Hóa Xanh (TP.HCM) | Xe
                        65C-128.45
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontWeight: "700",
                          color: "#15803d",
                        }}
                      >
                        Hash: 0x7c49...a74c
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontSize: "11px",
                          color: "#9ca3af",
                        }}
                      >
                        Cập nhật 15 phút trước
                      </span>
                    </div>
                  </div>

                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span style={{ fontWeight: "700", fontSize: "14px" }}>
                          Lô Thu Hoạch #LH-8824
                        </span>
                        <span className="tag-badge gray">Chờ Sơ Chế</span>
                      </div>
                      <p
                        style={{
                          fontSize: "12px",
                          color: "#6b7280",
                          marginTop: "4px",
                        }}
                      >
                        Vườn Cam A1 ➔ HTX Sơ Chế Mekong (1,500 kg Quýt Đường)
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontWeight: "700",
                          color: "#15803d",
                        }}
                      >
                        Hash: 0x3d12...88fe
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontSize: "11px",
                          color: "#9ca3af",
                        }}
                      >
                        Cập nhật hôm nay
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: ĐĂNG KÝ CHỦ THỂ */}
      {showAddActorModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>
                <Building2 size={18} color="#2e8b57" /> Đăng Ký Chủ Thể Mới
              </h3>
              <button
                className="modal-close-btn"
                onClick={() => setShowAddActorModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Loại Hình Chủ Thể (*)</label>
                <select>
                  <option>Nông Trại / Hợp Tác Xã Canh Tác</option>
                  <option>Cơ Sở Sơ Chế & Đóng Gói</option>
                  <option>Cơ Quan Kiểm Định / Giám Định</option>
                  <option>Đơn Vị Vận Chuyển / Logistics</option>
                </select>
              </div>
              <div className="form-group">
                <label>Tên Doanh Nghiệp / Chủ Thể (*)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Công Ty Cổ Phần Nông Sản Nam Bộ"
                />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Mã Số Thuế / Giấy Phép</label>
                  <input type="text" placeholder="0312984920" />
                </div>
                <div className="form-group">
                  <label>Node / Public Key</label>
                  <input type="text" placeholder="0x..." />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowAddActorModal(false)}
              >
                Hủy
              </button>
              <button
                className="btn-save"
                onClick={() => {
                  alert("Đã khởi tạo node chủ thể mới thành công!");
                  setShowAddActorModal(false);
                }}
              >
                Tạo Chủ Thể
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: THÊM NGƯỜI DÙNG */}
      {showAddUserModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>
                <UserPlus size={18} color="#2e8b57" /> Thêm Tài Khoản Đăng Nhập
              </h3>
              <button
                className="modal-close-btn"
                onClick={() => setShowAddUserModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tên Đăng Nhập (*)</label>
                <input type="text" placeholder="Ví dụ: taixe_minhtri" />
              </div>
              <div className="form-group">
                <label>Họ Và Tên</label>
                <input type="text" placeholder="Nguyễn Minh Trí" />
              </div>
              <div className="form-group">
                <label>Chủ Thể Trực Thuộc</label>
                <select>
                  <option>HTX Sơ Chế & Chế Biến Mekong</option>
                  <option>Vườn Cam A1 (#FARM-01111)</option>
                  <option>Mekong Express Logistics</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowAddUserModal(false)}
              >
                Hủy
              </button>
              <button
                className="btn-save"
                onClick={() => {
                  alert("Đã tạo tài khoản người dùng thành công!");
                  setShowAddUserModal(false);
                }}
              >
                Tạo Tài Khoản
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: THÊM DANH MỤC */}
      {showAddCatModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>
                <Plus size={18} color="#2e8b57" /> Thêm Danh Mục Dùng Chung
              </h3>
              <button
                className="modal-close-btn"
                onClick={() => setShowAddCatModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Loại Danh Mục</label>
                <select>
                  <option>Giống Nông Sản</option>
                  <option>Tiêu Chuẩn Kiểm Định</option>
                  <option>Phân Bón & Thuốc BVTV</option>
                </select>
              </div>
              <div className="form-group">
                <label>Tên Danh Mục (*)</label>
                <input type="text" placeholder="Ví dụ: Bưởi Da Xanh Bến Tre" />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowAddCatModal(false)}
              >
                Hủy
              </button>
              <button
                className="btn-save"
                onClick={() => {
                  alert("Đã lưu mục mới vào danh mục dùng chung!");
                  setShowAddCatModal(false);
                }}
              >
                Lưu Mục
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
