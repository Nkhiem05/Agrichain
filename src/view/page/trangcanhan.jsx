import React, { useState } from "react";
import {
  User,
  Briefcase,
  Mail,
  Phone,
  Fingerprint,
  ShieldCheck,
  MapPin,
  FileText,
  Edit,
  X,
  Camera,
} from "lucide-react";
import "../css/trangcanhan.css";

const DEFAULT_LOGO_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png";

const ProfilePage = () => {
  const [profile, setProfile] = useState({
    name: "Nguyễn Văn A",
    role: "Nông dân (Farmer)",
    email: "nguyenvana.agri@gmail.com",
    phone: "0912 345 678",
    actorId: "AGRI-VN-0942",
    address: "Ấp 10, Xã Trí Phải, Huyện Thới Bình, Tỉnh Cà Mau",
    bio: "Thành viên hợp tác xã nông nghiệp VietGAP Cà Mau. Phụ trách giám sát và số hóa quy trình canh tác cây có múi trên nền tảng AGRICHAIN.",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=260",
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ ...profile });

  const handleOpenEdit = () => {
    setEditForm({ ...profile });
    setIsEditModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    setProfile({ ...editForm });
    setIsEditModalOpen(false);
    alert("Hồ sơ đã được lưu thành công!");
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setEditForm((prev) => ({ ...prev, avatar: url }));
    }
  };

  return (
    <div className="profile-dashboard">
      {/* HEADER */}
      <header className="dashboard-header">
        <div className="header-left">
          <img src={DEFAULT_LOGO_IMG} alt="Logo" className="header-logo-icon" />
          <span className="header-brand-title">AGRICHAIN PROFILE</span>
        </div>
      </header>

      {/* NỘI DUNG PROFILE */}
      <div className="profile-content-wrap">
        <div className="profile-main-card">
          <div className="profile-header-banner">
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div className="profile-avatar-wrap">
                <img
                  src={profile.avatar}
                  alt="Avatar"
                  className="profile-avatar-img"
                />
                <span
                  className="online-status-dot"
                  title="Đang hoạt động"
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
                  {profile.name}
                </h1>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#6b7280",
                    marginTop: "2px",
                  }}
                >
                  {profile.email}
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
                  Actor ID: {profile.actorId}
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
                <p className="profile-field-value">{profile.name}</p>
              </div>
            </div>

            <div className="profile-field">
              <div className="profile-field-icon">
                <Briefcase size={18} />
              </div>
              <div>
                <p className="profile-field-label">Vai trò trong chuỗi</p>
                <p className="profile-field-value">{profile.role}</p>
              </div>
            </div>

            <div className="profile-field">
              <div className="profile-field-icon">
                <Mail size={18} />
              </div>
              <div>
                <p className="profile-field-label">Email liên hệ</p>
                <p className="profile-field-value">{profile.email}</p>
              </div>
            </div>

            <div className="profile-field">
              <div className="profile-field-icon">
                <Phone size={18} />
              </div>
              <div>
                <p className="profile-field-label">Số điện thoại</p>
                <p className="profile-field-value">{profile.phone}</p>
              </div>
            </div>

            <div className="profile-field">
              <div className="profile-field-icon">
                <Fingerprint size={18} />
              </div>
              <div>
                <p className="profile-field-label">Mã định danh Actor ID</p>
                <p
                  className="profile-field-value"
                  style={{ fontFamily: "monospace" }}
                >
                  {profile.actorId}
                </p>
              </div>
            </div>

            <div className="profile-field">
              <div className="profile-field-icon">
                <ShieldCheck size={18} />
              </div>
              <div>
                <p className="profile-field-label">Trạng thái hồ sơ</p>
                <p className="profile-field-value" style={{ color: "#16a34a" }}>
                  Đã xác minh chuỗi khối
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
                <p className="profile-field-label">
                  Địa chỉ / Khu vực canh tác
                </p>
                <p className="profile-field-value">{profile.address}</p>
              </div>
            </div>

            <div className="profile-field" style={{ gridColumn: "span 2" }}>
              <div className="profile-field-icon">
                <FileText size={18} />
              </div>
              <div>
                <p className="profile-field-label">
                  Ghi chú & Lĩnh vực phụ trách
                </p>
                <p
                  className="profile-field-value"
                  style={{ fontWeight: "normal", color: "#475569" }}
                >
                  {profile.bio}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL SỬA PROFILE */}
      {isEditModalOpen && (
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  marginBottom: "16px",
                }}
              >
                <img
                  src={editForm.avatar}
                  alt="Preview"
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "10px",
                    objectFit: "cover",
                  }}
                />
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
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Vai trò Actor (*)</label>
                <select
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm({ ...editForm, role: e.target.value })
                  }
                >
                  <option value="Nông dân (Farmer)">Nông dân (Farmer)</option>
                  <option value="Chủ cơ sở sơ chế (Processor)">
                    Chủ cơ sở sơ chế (Processor)
                  </option>
                  <option value="Đơn vị kiểm định (Auditor)">
                    Đơn vị kiểm định (Auditor)
                  </option>
                  <option value="Tài xế vận chuyển (Logistics)">
                    Tài xế vận chuyển (Logistics)
                  </option>
                </select>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <div className="form-group">
                  <label>Email (*)</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Số điện thoại (*)</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm({ ...editForm, phone: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Địa chỉ</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) =>
                    setEditForm({ ...editForm, address: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Ghi chú / Chức trách</label>
                <textarea
                  rows={3}
                  value={editForm.bio}
                  onChange={(e) =>
                    setEditForm({ ...editForm, bio: e.target.value })
                  }
                ></textarea>
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
              <button type="submit" className="btn-save">
                Lưu Thay Đổi
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
