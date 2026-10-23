import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Briefcase,
  Mail,
  Phone,
  Fingerprint,
  ShieldCheck,
  MapPin,
  Edit,
  X,
  Camera,
  LogOut,
  ArrowLeft,
} from "lucide-react";
import "../css/trangcanhan.css";
import BlockchainPanel from "./blockchainpannel"; // MỚI: khối ví blockchain

const DEFAULT_LOGO_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png";

const API_URL = "http://localhost:3000";

// Header gửi kèm token đăng nhập (token được lưu ở trang đăng nhập)
const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const avatarUrl = (path) => (path ? `${API_URL}${path}` : null);

const ProfilePage = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/dang-nhap");
  };

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    ho_ten: "",
    so_dien_thoai: "",
    email: "",
    dia_chi: "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const fetchProfile = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch(`${API_URL}/api/trang-ca-nhan`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!data.success) {
        setLoadError(data.message || "Không thể lấy hồ sơ cá nhân");
        return;
      }
      setProfile(data.data);
    } catch (err) {
      setLoadError("Không thể kết nối tới backend");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleOpenEdit = () => {
    setEditForm({
      ho_ten: profile.ho_ten || "",
      so_dien_thoai: profile.so_dien_thoai || "",
      email: profile.email || "",
      dia_chi: profile.dia_chi || "",
    });
    setAvatarFile(null);
    setAvatarPreview(avatarUrl(profile.anh_dai_dien));
    setSaveError("");
    setIsEditModalOpen(true);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editForm.ho_ten.trim()) {
      setSaveError("Vui lòng nhập họ và tên");
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      const formData = new FormData();
      formData.append("ho_ten", editForm.ho_ten.trim());
      formData.append("so_dien_thoai", editForm.so_dien_thoai.trim());
      formData.append("email", editForm.email.trim());
      formData.append("dia_chi", editForm.dia_chi.trim());
      if (avatarFile) formData.append("anh_dai_dien", avatarFile);

      const res = await fetch(`${API_URL}/api/trang-ca-nhan`, {
        method: "PUT",
        headers: authHeaders(),
        body: formData,
      });
      const data = await res.json();

      if (!data.success) {
        setSaveError(data.message || "Không thể lưu hồ sơ");
        return;
      }

      // Đồng bộ lại tên/ảnh đại diện vào localStorage để header các trang
      // khác cập nhật theo mà không cần đăng nhập lại.
      if (data.data) {
        try {
          const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
          localStorage.setItem(
            "user",
            JSON.stringify({ ...savedUser, ...data.data }),
          );
        } catch {
          // Bỏ qua nếu dữ liệu user cũ bị lỗi định dạng
        }
      }

      setIsEditModalOpen(false);
      await fetchProfile();
    } catch (err) {
      setSaveError("Không thể kết nối tới backend");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-dashboard">
      {/* HEADER */}
      <header className="dashboard-header">
        <div className="header-left">
          <img src={DEFAULT_LOGO_IMG} alt="Logo" className="header-logo-icon" />
          <span className="header-brand-title">AGRICHAIN</span>
        </div>

        <div className="header-right-actions">
          <div
            className="header-profile"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/trang-ca-nhan")}
            title="Xem hồ sơ cá nhân"
          >
            <div className="avatar-circle">
              {profile?.anh_dai_dien ? (
                <img
                  src={avatarUrl(profile.anh_dai_dien)}
                  alt="avatar"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "50%",
                  }}
                />
              ) : (
                <span className="avatar-initials">
                  {(profile?.ho_ten || "ND").slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div className="profile-meta">
              <span className="profile-name">
                {profile?.ho_ten || "Nông Dân"}
              </span>
              <span className="profile-role">
                {profile?.vai_tro_label || "Nông dân"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* NỘI DUNG PROFILE */}
      <div className="profile-content-wrap">
        {/* Nút quay lại trang trước */}
        <div className="back-navigation-container">
          <button
            type="button"
            className="btn-back"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={16} />
            Quay lại trang trước
          </button>
        </div>

        {loading && (
          <p style={{ padding: 24, color: "#6b7280" }}>Đang tải...</p>
        )}

        {!loading && loadError && (
          <p style={{ padding: 24, color: "#dc2626" }}>{loadError}</p>
        )}

        {!loading && !loadError && profile && (
          <div className="profile-main-card">
            <div className="profile-header-banner">
              <div
                style={{ display: "flex", alignItems: "center", gap: "20px" }}
              >
                <div className="profile-avatar-wrap">
                  {profile.anh_dai_dien ? (
                    <img
                      src={avatarUrl(profile.anh_dai_dien)}
                      alt="Avatar"
                      className="profile-avatar-img"
                    />
                  ) : (
                    <div
                      className="profile-avatar-img"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#ecfdf5",
                        color: "#278d49",
                      }}
                    >
                      <User size={32} />
                    </div>
                  )}
                  <span
                    className={`online-status-dot ${
                      profile.trang_thai === 1 ? "" : "offline"
                    }`}
                    title={
                      profile.trang_thai === 1
                        ? "Đang hoạt động"
                        : "Tài khoản bị khóa"
                    }
                    style={
                      profile.trang_thai === 1
                        ? undefined
                        : { background: "#dc2626" }
                    }
                  ></span>
                </div>
                <div>
                  <h1
                    style={{
                      fontSize: "22px",
                      fontWeight: "800",
                      color: "#111827",
                    }}
                  >
                    {profile.ho_ten}
                  </h1>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      marginTop: "2px",
                    }}
                  >
                    {profile.email || profile.ten_dang_nhap}
                  </p>
                  <span
                    style={{
                      display: "inline-block",
                      backgroundColor: "#ecfdf5",
                      color: "#16a34a",
                      fontSize: "11px",
                      fontWeight: "700",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      marginTop: "6px",
                    }}
                  >
                    Mã định danh: {profile.ma_nguoi_dung}
                  </span>
                </div>
              </div>

              <button
                style={{
                  backgroundColor: "#278d49",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                }}
                onClick={handleOpenEdit}
              >
                <Edit size={14} /> Chỉnh sửa thông tin
              </button>
            </div>

            <div className="profile-info-grid">
              <div className="profile-field">
                <div className="profile-field-icon">
                  <User size={18} />
                </div>
                <div>
                  <p className="profile-field-label">Họ và tên</p>
                  <p className="profile-field-value">{profile.ho_ten}</p>
                </div>
              </div>

              <div className="profile-field">
                <div className="profile-field-icon">
                  <Briefcase size={18} />
                </div>
                <div>
                  <p className="profile-field-label">Vai trò trong chuỗi</p>
                  <p className="profile-field-value">{profile.vai_tro_label}</p>
                </div>
              </div>

              <div className="profile-field">
                <div className="profile-field-icon">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="profile-field-label">Email liên hệ</p>
                  <p className="profile-field-value">{profile.email || "—"}</p>
                </div>
              </div>

              <div className="profile-field">
                <div className="profile-field-icon">
                  <Phone size={18} />
                </div>
                <div>
                  <p className="profile-field-label">Số điện thoại</p>
                  <p className="profile-field-value">
                    {profile.so_dien_thoai || "—"}
                  </p>
                </div>
              </div>

              <div className="profile-field">
                <div className="profile-field-icon">
                  <Fingerprint size={18} />
                </div>
                <div>
                  <p className="profile-field-label">Tên đăng nhập</p>
                  <p
                    className="profile-field-value"
                    style={{ fontFamily: "monospace" }}
                  >
                    {profile.ten_dang_nhap}
                  </p>
                </div>
              </div>

              <div className="profile-field">
                <div className="profile-field-icon">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="profile-field-label">Trạng thái tài khoản</p>
                  <p
                    className="profile-field-value"
                    style={{
                      color: profile.trang_thai === 1 ? "#16a34a" : "#dc2626",
                    }}
                  >
                    {profile.trang_thai === 1 ? "Đang hoạt động" : "Đã bị khóa"}
                  </p>
                </div>
              </div>

              <div
                className="profile-field"
                style={{
                  gridColumn: "span 2",
                  borderTop: "1px solid #f3f4f6",
                  paddingTop: "16px",
                }}
              >
                <div className="profile-field-icon">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="profile-field-label">Địa chỉ</p>
                  <p className="profile-field-value">
                    {profile.dia_chi || "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MỚI: Ví blockchain: liên kết ví, ký sự kiện truy xuất, admin duyệt ví */}
        <BlockchainPanel />
      </div>

      {/* MODAL SỬA PROFILE */}
      {isEditModalOpen && profile && (
        <div className="modal-overlay">
          <form className="modal-container" onSubmit={handleSave}>
            <div className="modal-header">
              <h3 style={{ fontSize: "16px", fontWeight: "700" }}>
                Cập Nhật Hồ Sơ Cá Nhân
              </h3>
              <button
                type="button"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#9ca3af",
                }}
                onClick={() => setIsEditModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {saveError && (
                <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 10 }}>
                  {saveError}
                </p>
              )}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  marginBottom: "16px",
                }}
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Preview"
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "10px",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "10px",
                      background: "#ecfdf5",
                      color: "#278d49",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <User size={24} />
                  </div>
                )}
                <label
                  style={{
                    padding: "6px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Camera size={14} /> Thay ảnh đại diện
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleAvatarChange}
                  />
                </label>
              </div>

              <div className="form-group">
                <label>Họ và tên (*)</label>
                <input
                  type="text"
                  value={editForm.ho_ten}
                  onChange={(e) =>
                    setEditForm({ ...editForm, ho_ten: e.target.value })
                  }
                  required
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Số điện thoại</label>
                  <input
                    type="text"
                    value={editForm.so_dien_thoai}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        so_dien_thoai: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Địa chỉ</label>
                <input
                  type="text"
                  value={editForm.dia_chi}
                  onChange={(e) =>
                    setEditForm({ ...editForm, dia_chi: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setIsEditModalOpen(false)}
              >
                Hủy
              </button>
              <button type="submit" className="btn-save" disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu Thay Đổi"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
