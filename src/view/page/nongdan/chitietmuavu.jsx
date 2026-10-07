import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import "../../css/chitietmuavu.css";

const DEFAULT_LOGO_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png";

const API_URL = "http://localhost:3000";

// "2026-06-18" -> "18/06/2026"
const formatDate = (value) => {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

const formatQuantity = (value, unit) =>
  `${Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 3 })} ${unit || ""}`.trim();

const MATERIAL_TYPES = {
  PHAN_BON: { label: "Phân bón", badgeClass: "badge-blue" },
  THUOC_BVTV: { label: "Thuốc BVTV", badgeClass: "badge-orange" },
};

const steps = [
  { step: 1, label: "Yêu cầu kiểm định" },
  { step: 2, label: "Lấy mẫu" },
  { step: 3, label: "Kết quả" },
  { step: 4, label: "Vận chuyển" },
  { step: 5, label: "Hoàn Thành" },
];

const HarvestDetailPage = () => {
  const navigate = useNavigate();
  const { maMuaVu } = useParams();
  const [searchParams] = useSearchParams();
  const requestedBatch = searchParams.get("lo");

  // State user đồng bộ với header nông dân
  const [user, setUser] = useState(null);

  // State điều khiển mở popup QR Code
  const [showQrModal, setShowQrModal] = useState(false);

  const [season, setSeason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Lô đang xem + dữ liệu đang sửa của lô đó
  const [selectedBatchCode, setSelectedBatchCode] = useState("");
  const [harvestForm, setHarvestForm] = useState({
    so_luong: "",
    ngay_thu_hoach: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      navigate("/");
      return;
    }

    try {
      setUser(JSON.parse(savedUser));
    } catch (error) {
      console.error("Lỗi đọc thông tin người dùng:", error);
      localStorage.removeItem("user");
      navigate("/");
    }
  }, [navigate]);

  const fetchSeason = async () => {
    if (!maMuaVu) {
      setError("Chưa chọn mùa vụ. Hãy mở từ trang Quản lý mùa vụ.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/mua-vu/${encodeURIComponent(maMuaVu)}`,
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Không thể lấy chi tiết mùa vụ");
        return;
      }

      setSeason(data.data);
    } catch (err) {
      console.error("Lỗi lấy chi tiết mùa vụ:", err);
      setError("Không thể kết nối tới backend");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeason();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maMuaVu]);

  const batches = season?.lo_thu_hoach || [];
  const materials = season?.vat_tu || [];

  // Mặc định xem lô được yêu cầu (?lo=...), nếu không thì lô mới nhất
  useEffect(() => {
    if (!season) return;

    const list = season.lo_thu_hoach || [];
    const preferred = list.find((b) => b.ma_lo_nong_san === requestedBatch);

    setSelectedBatchCode((current) => {
      if (list.some((b) => b.ma_lo_nong_san === current)) return current;
      return (preferred || list[0])?.ma_lo_nong_san || "";
    });
  }, [season, requestedBatch]);

  const batch = batches.find((b) => b.ma_lo_nong_san === selectedBatchCode);

  // Đổi lô (hoặc tải lại) thì nạp lại dữ liệu vào ô sửa
  useEffect(() => {
    setHarvestForm({
      so_luong: batch?.so_luong_hien_tai ?? "",
      ngay_thu_hoach: batch?.ngay_thu_hoach ?? "",
    });
  }, [batch]);

  const currentStep = batch?.buoc_hien_tai || 1;
  const batchCode = batch?.ma_lo_nong_san || "";

  const traceUrl = `https://agrichain.vn/trace/${batchCode}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    traceUrl,
  )}`;

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/nong-dan");
    }
  };

  const handleSave = async () => {
    if (!batch) return;

    if (!(Number(harvestForm.so_luong) > 0)) {
      alert("Sản lượng phải lớn hơn 0");
      return;
    }

    if (!harvestForm.ngay_thu_hoach) {
      alert("Vui lòng chọn ngày thu hoạch");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${API_URL}/api/lo-thu-hoach/${encodeURIComponent(batch.ma_lo_nong_san)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            so_luong: Number(harvestForm.so_luong),
            ngay_thu_hoach: harvestForm.ngay_thu_hoach,
          }),
        },
      );
      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Lưu thông tin thất bại");
        return;
      }

      alert(data.message);
      await fetchSeason();
    } catch (err) {
      console.error("Lỗi lưu thông tin thu hoạch:", err);
      alert("Không thể kết nối tới backend");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="harvest-layout">
      {/* 1. HEADER CHUẨN CỦA NÔNG DÂN (ĐÃ BỎ SEARCH BAR) */}
      <header className="dashboard-header">
        <div className="header-left">
          <img src={DEFAULT_LOGO_IMG} alt="Logo" className="header-logo-icon" />
          <span className="header-brand-title">AGRICHAIN</span>
        </div>

        <div className="header-profile">
          <div className="avatar-circle"></div>
          <div className="profile-meta">
            <span className="profile-name">
              {user?.ho_ten || "Nông dân"}
            </span>
            <span className="profile-role">Nông dân</span>
          </div>
        </div>
      </header>

      {/* 2. KHUNG CUỘN THEO CHIỀU DỌC */}
      <div className="harvest-main-scroll">
        <main className="harvest-container">
          {/* Nút quay lại */}
          <div className="top-actions">
            <button className="btn-back" onClick={handleBack} title="Quay lại">
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span>Quay lại trang trước</span>
            </button>
          </div>

          {loading && <p>Đang tải thông tin mùa vụ...</p>}

          {error && <p>{error}</p>}

          {season && (
            <div className="harvest-card-wrapper">
              {/* Header Card kèm mã QR và sự kiện Click mở popup */}
              <div className="harvest-card-header">
                <div>
                  <h2 className="harvest-page-title">Thông Tin Thu Hoạch</h2>
                  <p className="harvest-subtitle">
                    Chi tiết thu hoạch và nhật ký canh tác theo chuỗi cung ứng
                  </p>
                </div>

                {/* Bấm vào khối QR để mở popup to (chỉ có khi đã có lô) */}
                {batch && (
                  <div
                    className="harvest-qr-wrapper"
                    onClick={() => setShowQrModal(true)}
                    title="Bấm vào để phóng to mã QR và quét"
                  >
                    <img
                      src={qrUrl}
                      alt={`Mã QR lô ${batchCode}`}
                      className="qr-image"
                    />
                    <div className="qr-info">
                      <span className="qr-label">QR Truy xuất nguồn gốc</span>
                      <span className="qr-code-text">{batchCode}</span>
                      <button
                        type="button"
                        className="btn-qr-scan"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowQrModal(true);
                        }}
                      >
                        🔍 Phóng to để quét
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Stepper Process Bar */}
              <div className="stepper-wrapper">
                <div className="stepper-line"></div>
                {steps.map((item) => (
                  <div
                    key={item.step}
                    className={`step-item ${item.step <= currentStep ? "active" : ""}`}
                  >
                    <div className="step-circle">{item.step}</div>
                    <div className="step-text">{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Grid 3 Card Thông Tin */}
              <div className="details-grid">
                {/* Card: Mùa Vụ */}
                <div className="info-card">
                  <div className="info-card-header">
                    <span className="card-icon">🗓️</span>
                    <h4>Mùa Vụ</h4>
                  </div>
                  <div className="info-card-body">
                    <div className="field-group full-width">
                      <span className="field-label">Tên mùa vụ</span>
                      <span className="field-value">{season.loai_cay_trong}</span>
                    </div>
                    <div className="field-row">
                      <div className="field-group">
                        <span className="field-label">Giống cây</span>
                        <span className="field-value">
                          {season.giong_cay || "—"}
                        </span>
                      </div>
                      <div className="field-group">
                        <span className="field-label">Bắt đầu</span>
                        <span className="field-value">
                          {formatDate(season.ngay_gieo_trong)}
                        </span>
                      </div>
                    </div>
                    <div className="field-row">
                      <div className="field-group">
                        <span className="field-label">Mã mùa vụ</span>
                        <span className="field-value">{season.ma_mua_vu}</span>
                      </div>
                      <div className="field-group">
                        <span className="field-label">Dự kiến thu hoạch</span>
                        <span className="field-value">
                          {formatDate(season.ngay_thu_hoach_du_kien)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card: Nông trại */}
                <div className="info-card">
                  <div className="info-card-header">
                    <span className="card-icon">🌱</span>
                    <h4>Nông trại</h4>
                  </div>
                  <div className="info-card-body">
                    <div className="field-group full-width">
                      <span className="field-label">Tên nông trại</span>
                      <span className="field-value">{season.ten_nong_trai}</span>
                    </div>
                    <div className="field-row">
                      <div className="field-group">
                        <span className="field-label">Mã nông trại</span>
                        <span className="field-value">{season.ma_nong_trai}</span>
                      </div>
                      <div className="field-group">
                        <span className="field-label">Loại đất</span>
                        <span className="field-value">
                          {season.loai_dat || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card: Thu hoạch */}
                <div className="info-card">
                  <div className="info-card-header">
                    <span className="card-icon">📦</span>
                    <h4>Thu hoạch</h4>
                  </div>
                  <div className="info-card-body">
                    {!batch ? (
                      <div className="field-group full-width">
                        <span className="field-label">Trạng thái</span>
                        <span className="field-value">
                          Chưa có lô thu hoạch. Hãy tạo ở tab Quản lý lô thu
                          hoạch.
                        </span>
                      </div>
                    ) : (
                      <>
                        {batches.length > 1 && (
                          <div className="field-group full-width">
                            <span className="field-label">Chọn lô</span>
                            <select
                              className="field-input"
                              value={selectedBatchCode}
                              onChange={(e) =>
                                setSelectedBatchCode(e.target.value)
                              }
                            >
                              {batches.map((item) => (
                                <option
                                  key={item.ma_lo_nong_san}
                                  value={item.ma_lo_nong_san}
                                >
                                  {item.ma_lo_nong_san} -{" "}
                                  {formatDate(item.ngay_thu_hoach)}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div className="field-row">
                          <div className="field-group">
                            <span className="field-label">
                              Sản lượng ({batch.don_vi_tinh})
                            </span>
                            <input
                              className="field-input"
                              type="number"
                              min="0"
                              step="any"
                              value={harvestForm.so_luong}
                              onChange={(e) =>
                                setHarvestForm({
                                  ...harvestForm,
                                  so_luong: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="field-group">
                            <span className="field-label">Mã lô</span>
                            <span className="field-value">{batchCode}</span>
                          </div>
                        </div>
                        <div className="field-row">
                          <div className="field-group">
                            <span className="field-label">Ngày thu hoạch</span>
                            <input
                              className="field-input"
                              type="date"
                              value={harvestForm.ngay_thu_hoach}
                              onChange={(e) =>
                                setHarvestForm({
                                  ...harvestForm,
                                  ngay_thu_hoach: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="field-group">
                            <span className="field-label">Thửa đất</span>
                            <span className="field-value">
                              {season.ten_thua_dat || "—"}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Bảng Vật Tư */}
              <div className="materials-container">
                <h3 className="materials-title">Phân bón và thuốc BVTV</h3>
                <div className="materials-table-wrapper">
                  <table className="materials-table">
                    <thead>
                      <tr>
                        <th>Tên vật tư</th>
                        <th>Loại vật tư</th>
                        <th>Liều lượng</th>
                        <th>Ngày sử dụng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materials.length === 0 && (
                        <tr>
                          <td colSpan={4}>
                            Chưa ghi nhận phân bón hoặc thuốc BVTV nào.
                          </td>
                        </tr>
                      )}

                      {materials.map((m) => {
                        const type = MATERIAL_TYPES[m.loai_vat_tu] || {
                          label: m.loai_vat_tu,
                          badgeClass: "",
                        };

                        return (
                          <tr key={m.ma_su_dung}>
                            <td>{m.ten_vat_tu}</td>
                            <td>
                              <span className={`status-badge ${type.badgeClass}`}>
                                {type.label}
                              </span>
                            </td>
                            <td>{formatQuantity(m.lieu_luong, m.don_vi_tinh)}</td>
                            <td>{formatDate(m.ngay_su_dung)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="harvest-actions">
                <button className="btn-cancel" onClick={handleBack}>
                  Hủy
                </button>
                <button
                  className="btn-save"
                  onClick={handleSave}
                  disabled={!batch || saving}
                >
                  {saving ? "Đang lưu..." : "Lưu thông tin"}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* =========================================================
          POPUP PHÓNG TO MÃ QR ĐỂ QUÉT
      ========================================================== */}
      {showQrModal && batch && (
        <div className="modal-overlay" onClick={() => setShowQrModal(false)}>
          <div
            className="qr-modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="qr-modal-header">
              <h3>Mã QR Lô Nông Sản</h3>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowQrModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="qr-modal-body">
              <div className="qr-scanner-frame">
                <div className="qr-scan-line"></div>
                <img
                  src={qrUrl}
                  alt={`Mã QR lô ${batchCode}`}
                  className="qr-large-img"
                />
              </div>

              <div className="qr-modal-batch">Mã lô: #{batchCode}</div>
              <p className="qr-modal-desc">
                Sử dụng camera điện thoại hoặc thiết bị quét QR để truy xuất
                thông tin nhật ký nguồn gốc nông sản
              </p>
            </div>

            <div className="qr-modal-footer">
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setShowQrModal(false)}
              >
                Đóng
              </button>
              <a
                href={traceUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-open-link"
              >
                Xem trang liên kết
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HarvestDetailPage;
