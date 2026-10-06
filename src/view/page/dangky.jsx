import React, { useState } from "react";
import "../css/dangky.css";

const ACTOR_DATA = {
  FARMER: {
    id: "FARMER",
    name: "Nông dân / Trang trại",
    shortName: "Nông dân",
    icon: (
      <svg
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    ),
    roleDesc:
      "Khởi tạo nguồn gốc nông sản, ghi nhận nhật ký mùa vụ (bón phân, tưới tiêu, thuốc BVTV) và tạo lô hàng khi thu hoạch.",
    terms: [
      "Cam kết khai báo trung thực thời gian gieo trồng, bón phân và thu hoạch.",
      "Tuân thủ danh mục thuốc bảo vệ thực vật theo tiêu chuẩn VietGAP/GlobalGAP.",
      "Chịu trách nhiệm hoàn toàn về tính xác thực của dữ liệu nhật ký khi ký số ghi lên chuỗi khối.",
      "Sẵn sàng đối soát mẫu thực địa khi có yêu cầu kiểm tra ngẫu nhiên từ hệ thống.",
    ],
  },
  TRANSPORTER: {
    id: "TRANSPORTER",
    name: "Đơn vị Vận chuyển (Logistics)",
    shortName: "Vận chuyển",
    icon: (
      <svg
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
        />
      </svg>
    ),
    roleDesc:
      "Tiếp nhận lô hàng từ nông trại, giám sát điều kiện bảo quản nhiệt độ/độ ẩm trên đường đi và bàn giao đến bên phân phối.",
    terms: [
      "Ghi nhận đầy đủ mã niêm phong và QR lô hàng tại thời điểm nhận và giao hàng.",
      "Duy trì dải nhiệt độ, độ ẩm quy định trong suốt lộ trình vận chuyển.",
      "Cập nhật đúng mốc thời gian giao nhận; báo cáo sự cố hư hại, chậm trễ tức thời.",
      "Chịu trách nhiệm bảo quản nguyên vẹn hàng hoá trong phạm vi phụ trách.",
    ],
  },
  DISTRIBUTOR: {
    id: "DISTRIBUTOR",
    name: "Bên Phân phối / Điểm bán lẻ",
    shortName: "Phân phối",
    icon: (
      <svg
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
    roleDesc:
      "Tiếp nhận nông sản về kho/siêu thị, kiểm tra quy chuẩn chất lượng và niêm yết mã truy xuất cho người tiêu dùng.",
    terms: [
      "Kiểm tra tính nguyên vẹn của lô hàng và quét mã xác nhận nhập kho trên hệ thống.",
      "Công khai minh bạch mã QR truy xuất nguồn gốc tại điểm bán lẻ cho người tiêu dùng.",
      "Không tự ý làm giả, can thiệp hoặc thay thế nhãn mác truy xuất nguồn gốc.",
      "Phối hợp xử lý và thu hồi nhanh chóng lô hàng khi phát hiện vi phạm tiêu chuẩn an toàn.",
    ],
  },
};

export const DangKy = () => {
  const [selectedRole, setSelectedRole] = useState("FARMER");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    facilityName: "",
    address: "",
  });

  const currentActor = ACTOR_DATA[selectedRole];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !selectedRole ||
      !formData.fullName ||
      !formData.phone ||
      !formData.email ||
      !formData.facilityName ||
      !formData.address
    ) {
      alert("Vui lòng điền đầy đủ các trường thông tin bắt buộc!");
      return;
    }

    if (!agreedTerms) {
      alert("Bạn cần đồng ý với các điều khoản trước khi gửi yêu cầu!");
      return;
    }

    setIsSubmitting(true);
    try {
      const fetyeucau = await fetch("http://localhost:3000/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: selectedRole,
          dulieu: formData,
        }),
      });
      const res = await fetyeucau.json();

      if (!res.ok) {
        console.log(res);

        alert("Có lỗi xảy ra, vui lòng thử lại!");
        return;
      }
      setSubmitted(true);
    } catch (error) {
      console.error(error);
      alert("Có lỗi kết nối đến máy chủ, vui lòng thử lại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="req-container">
      <div className="req-card">
        {/* Header với Logo Badge nâng cấp */}
        <div className="req-header">
          <div className="req-brand-wrapper">
            <div className="req-logo-badge">
              <img
                src="https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png"
                alt="AgriChain Logo"
                className="req-logo-img"
              />
            </div>
            <span className="req-system-tag">Hệ thống Chuỗi khối</span>
          </div>
          <h1 className="req-title">Yêu Cầu Cấp Tài Khoản</h1>
          <p className="req-subtitle">
            Hệ thống truy xuất nguồn gốc nông sản chuẩn quốc gia{" "}
            <strong>AgriChain</strong>
          </p>
        </div>

        {submitted ? (
          /* Màn hình gửi thành công */
          <div className="req-success-view">
            <div className="req-success-icon">
              <svg
                width="36"
                height="36"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="req-success-title">Đã Gửi Yêu Cầu Thành Công!</h3>
            <p className="req-success-desc">
              Hệ thống đã ghi nhận yêu cầu của bạn. Thông tin đăng nhập sẽ được
              gửi tới email <strong>{formData.email}</strong> sau khi được quản
              trị viên xét duyệt.
            </p>
            <a href="/dang-nhap" className="req-back-btn">
              Quay lại Đăng nhập
            </a>
          </div>
        ) : (
          /* Form yêu cầu */
          <form onSubmit={handleSubmit}>
            {/* Lựa chọn vai trò Actor */}
            <div className="req-actor-section">
              <label className="req-label">
                Chọn vai trò của bạn <span className="req-required">*</span>
              </label>
              <div className="req-actor-grid">
                {Object.values(ACTOR_DATA).map((actor) => {
                  const isSelected = selectedRole === actor.id;
                  return (
                    <button
                      key={actor.id}
                      type="button"
                      className={`req-actor-btn ${isSelected ? "active" : ""}`}
                      onClick={() => setSelectedRole(actor.id)}
                    >
                      <div className="icon">{actor.icon}</div>
                      <span>{actor.shortName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Khối giải thích vai trò */}
            <div className="req-role-info">
              <div>
                <span className="req-role-title">
                  Vai trò: {currentActor.name}
                </span>
                <p className="req-role-desc">{currentActor.roleDesc}</p>
              </div>
              <button
                type="button"
                className="req-link-terms"
                onClick={() => setIsModalOpen(true)}
              >
                Xem điều khoản
              </button>
            </div>

            {/* Các trường nhập liệu */}
            <div className="req-grid-2">
              <div className="req-form-group">
                <label className="req-input-label">
                  Họ và tên người đại diện{" "}
                  <span className="req-required">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  placeholder="Nguyễn Văn A"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="req-input"
                />
              </div>

              <div className="req-form-group">
                <label className="req-input-label">
                  Số điện thoại <span className="req-required">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="0912 345 678"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="req-input"
                />
              </div>
            </div>

            <div className="req-form-group">
              <label className="req-input-label">
                Địa chỉ Email <span className="req-required">*</span>
              </label>
              <input
                type="email"
                name="email"
                required
                placeholder="contact@example.com"
                value={formData.email}
                onChange={handleInputChange}
                className="req-input"
              />
            </div>

            <div className="req-form-group">
              <label className="req-input-label">
                Tên Hợp tác xã / Cơ sở / Doanh nghiệp{" "}
                <span className="req-required">*</span>
              </label>
              <input
                type="text"
                name="facilityName"
                required
                placeholder="VD: HTX Nông Nghiệp Sạch Cần Thơ"
                value={formData.facilityName}
                onChange={handleInputChange}
                className="req-input"
              />
            </div>

            {/* Ô Địa chỉ */}
            <div className="req-form-group">
              <label className="req-input-label">
                Địa chỉ hoạt động <span className="req-required">*</span>
              </label>
              <input
                type="text"
                name="address"
                required
                placeholder="VD: Số 123 Đường 3/2, P. Xuân Khánh, Q. Ninh Kiều, Cần Thơ"
                value={formData.address}
                onChange={handleInputChange}
                className="req-input"
              />
            </div>

            {/* Tích chọn điều khoản */}
            <label className="req-terms-checkbox">
              <input
                type="checkbox"
                required
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
              />
              <span>
                Tôi cam kết thông tin chính xác và đồng ý với{" "}
                <button
                  type="button"
                  className="req-link-terms"
                  onClick={() => setIsModalOpen(true)}
                >
                  Điều khoản & Trách nhiệm của {currentActor.shortName}
                </button>
                .
              </span>
            </label>

            {/* Nút gửi */}
            <button
              type="submit"
              className="req-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Đang gửi yêu cầu..."
                : "Gửi Yêu Cầu Cấp Tài Khoản"}
            </button>

            {/* Quay về đăng nhập */}
            <div className="req-footer-link">
              Đã có tài khoản? <a href="/dang-nhap">Đăng nhập ngay</a>
            </div>
          </form>
        )}
      </div>

      {/* POPUP / MODAL ĐIỀU KHOẢN */}
      {isModalOpen && (
        <div className="req-modal-overlay">
          <div className="req-modal-content">
            <div className="req-modal-header">
              <h3>Điều Khoản: {currentActor.name}</h3>
              <button
                type="button"
                className="req-modal-close"
                onClick={() => setIsModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <div className="req-modal-body">
              <p>
                Để đảm bảo tính toàn vẹn và bất biến trên hệ thống chuỗi khối
                AgriChain, bên yêu cầu cần cam kết:
              </p>
              <ul className="req-terms-list">
                {currentActor.terms.map((term, index) => (
                  <li key={index}>{term}</li>
                ))}
              </ul>
              <div className="req-modal-note">
                * Lưu ý: Mọi hành vi gian lận dữ liệu sau khi ghi lên chuỗi sẽ
                bị khoá quyền tài khoản vĩnh viễn.
              </div>
            </div>

            <div className="req-modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsModalOpen(false)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setAgreedTerms(true);
                  setIsModalOpen(false);
                }}
              >
                Tôi đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DangKy;
