import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../../css/chitietkiemdinh.css";
import { fetchChiTietKiemDinh } from "../../../api/chitietkiemdinhApi";

const DEFAULT_LOGO_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png";

// ================= ICONS SVG THUẦN =================
const IconSvg = ({ size = 20, color = "currentColor", children }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    {children}
  </svg>
);

const ArrowLeftIcon = (props) => (
  <IconSvg {...props}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </IconSvg>
);

const BadgeCheckIcon = (props) => (
  <IconSvg {...props}>
    <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
    <path d="m9 12 2 2 4-4" />
  </IconSvg>
);

const BadgeXIcon = (props) => (
  <IconSvg {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </IconSvg>
);

const DownloadIcon = (props) => (
  <IconSvg {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="12" x2="12" y2="3" />
  </IconSvg>
);

const FileTextIcon = (props) => (
  <IconSvg {...props}>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M10 9H8" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
  </IconSvg>
);

const ShieldCheckIcon = (props) => (
  <IconSvg {...props}>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </IconSvg>
);

const ClockIcon = (props) => (
  <IconSvg {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </IconSvg>
);

// ================= HÀM TIỆN ÍCH =================
const formatDateTime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "" : d.toLocaleString("vi-VN");
};

const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("vi-VN");
};

const shortHash = (hash) =>
  hash && hash.length > 24 ? `${hash.slice(0, 12)}...${hash.slice(-8)}` : hash;

// ================= HEADER DÙNG CHUNG =================
const DashboardHeader = () => (
  <header className="dashboard-header">
    <div className="header-left">
      <img src={DEFAULT_LOGO_IMG} alt="Logo" className="header-logo-icon" />
      <span className="header-brand-title">AGRICHAIN</span>
    </div>

    <div className="header-search-bar">
      <input type="text" placeholder="Tìm kiếm chứng nhận, hồ sơ..." />
    </div>

    <div className="header-profile">
      <div className="avatar-circle">KD</div>
      <div className="profile-meta">
        <span className="profile-name">
          Trung Tâm Giám Định Nông Nghiệp Vùng 2
        </span>
        <span className="profile-role">Cơ quan kiểm định & Chứng nhận</span>
      </div>
    </div>
  </header>
);

const ChiTietKiemDinh = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const maKiemDinh = searchParams.get("makiemdinh");

  // ================= STATE TẢI DỮ LIỆU =================
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    const loadChiTiet = async () => {
      setLoading(true);
      setError(null);
      try {
        const json = await fetchChiTietKiemDinh(maKiemDinh);
        setData(json.data);
      } catch (err) {
        console.error("Lỗi tải chi tiết kiểm định:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (maKiemDinh) {
      loadChiTiet();
    } else {
      setLoading(false);
      setError("Không tìm thấy mã kiểm định trên đường dẫn.");
    }
  }, [maKiemDinh]);

  // ================= TRẠNG THÁI LOADING / LỖI =================
  if (loading) {
    return (
      <div className="detail-layout">
        <DashboardHeader />
        <div className="state-message">
          Đang nạp dữ liệu chi tiết hồ sơ kiểm định...
        </div>
      </div>
    );
  }

  if (error || !data || !data.kiem_dinh) {
    return (
      <div className="detail-layout">
        <DashboardHeader />
        <div className="detail-content-area">
          <div className="detail-container">
            <div className="detail-top-nav">
              <button onClick={() => navigate(-1)} className="btn-back">
                <ArrowLeftIcon size={16} />
                <span>Quay lại</span>
              </button>
            </div>
            <div className="state-message state-message-error">
              {error || "Không tìm thấy hồ sơ kiểm định yêu cầu."}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ================= DỮ LIỆU TỪ API =================
  const { kiem_dinh: kd, chi_so: rawChiSo = [], lich_su: timeline = [] } = data;

  // Lọc unique chỉ số để tránh hiển thị lặp dòng
  const danhSachChiSo = Array.from(
    new Map(
      rawChiSo.map((item) => [item.ten_chi_so || item.ma_chi_so_kd, item]),
    ).values(),
  );

  // Kết luận đã công bố (PASSED/FAILED/REVOKED) được ưu tiên hơn kết quả tính tạm từ chỉ số
  const isRevoked = kd.ket_luan === "REVOKED";
  const isDatChuan =
    kd.ket_luan === "PASSED"
      ? true
      : kd.ket_luan === "FAILED" || isRevoked
        ? false
        : kd.tong_ket_lab === "DAT";
  const hasCertificate = kd.ket_luan === "PASSED" && Boolean(kd.so_chung_nhan);
  const certCode = kd.so_chung_nhan || "Chưa cấp chứng thư";
  const batchCode = kd.ma_lo_nong_san ? `#${kd.ma_lo_nong_san}` : "";

  // Tx hash mới nhất có trên chuỗi (dùng cho khối QR)
  const latestTx = [...timeline]
    .reverse()
    .find((e) => e.ma_giao_dich_blockchain)?.ma_giao_dich_blockchain;

  const sampleTime =
    formatDateTime(kd.thoi_gian_lay_mau) ||
    formatDate(kd.ngay_hen_lay_mau) ||
    "Chưa lấy mẫu";

  const sampleAddress =
    `${kd.ten_thua_dat ? `${kd.ten_thua_dat}, ` : ""}${
      kd.dia_diem_nong_trai || ""
    }` || "Chưa có địa chỉ";

  // Mã QR dẫn tới trang truy xuất của lô hàng (người dùng quét để xem hành trình)
  const traceUrl = kd.ma_lo_nong_san
    ? `${window.location.origin}/chi-tiet-user?malohang=${encodeURIComponent(
        kd.ma_lo_nong_san,
      )}`
    : "";

  const validityText =
    kd.hieu_luc_tu && kd.hieu_luc_den
      ? `${formatDate(kd.hieu_luc_tu)} - ${formatDate(kd.hieu_luc_den)}`
      : "";

  return (
    <div className="chitietkiemdinh">
      <div className="detail-layout">
        {/* 1. HEADER */}
        <DashboardHeader />

        {/* 2. NỘI DUNG CHI TIẾT */}
        <div className="detail-content-area">
          <div className="detail-container">
            {/* THANH ĐIỀU HƯỚNG QUAY LẠI */}
            <div className="detail-top-nav">
              <button onClick={() => navigate(-1)} className="btn-back">
                <ArrowLeftIcon size={16} />
                <span>Quay lại danh sách</span>
              </button>
              <div className="detail-actions-right">
                {/* Mở hộp thoại in của trình duyệt: chọn "Lưu dưới dạng PDF" để tải file */}
                <button onClick={() => window.print()} className="btn-print">
                  <DownloadIcon size={16} />
                  <span>
                    {hasCertificate ? "Tải Chứng Thư PDF" : "Tải Biên Bản PDF"}
                  </span>
                </button>
              </div>
            </div>

            {/* BANNER THÔNG TIN CHỨNG NHẬN */}
            <div className="cert-header-card">
              <div className="cert-header-left">
                <div
                  className={`cert-stamp ${
                    isDatChuan ? "stamp-pass" : "stamp-fail"
                  }`}
                >
                  {isDatChuan ? (
                    <BadgeCheckIcon size={44} />
                  ) : (
                    <BadgeXIcon size={44} />
                  )}
                </div>
                <div className="cert-main-info">
                  <div className="cert-badge-row">
                    <span
                      className={
                        isDatChuan ? "badge-tag-pass" : "badge-tag-fail"
                      }
                    >
                      {isRevoked
                        ? "ĐÃ THU HỒI"
                        : isDatChuan
                          ? "ĐẠT CHUẨN"
                          : "KHÔNG ĐẠT"}
                    </span>
                    <span className="badge-tag-code">Số CN: {certCode}</span>
                    {validityText && (
                      <span style={{ fontSize: 13, color: "#6b7280" }}>
                        Hiệu lực: <b>{validityText}</b>
                      </span>
                    )}
                    <span style={{ fontSize: 13, color: "#6b7280" }}>
                      Mã hồ sơ: <b>{kd.ma_ho_so}</b>
                    </span>
                    <span style={{ fontSize: 13, color: "#6b7280" }}>
                      Tiêu chuẩn: <b>{kd.tieu_chuan_dang_ky || "Chưa rõ"}</b>
                    </span>
                  </div>
                  <h1 className="cert-title">
                    Hồ Sơ Chứng Nhận: {kd.ten_san_pham}{" "}
                    {batchCode && `(${batchCode})`}
                  </h1>
                  <p className="cert-sub">
                    Nông trại: <b>{kd.ten_nong_trai || "Chưa rõ nông trại"}</b>{" "}
                    | Chủ nông trại:{" "}
                    <b>{kd.ten_chu_nong_trai || "Chưa cập nhật"}</b>
                  </p>
                </div>
              </div>
            </div>

            {/* GRID BẢNG CHỈ SỐ VÀ BLOCKCHAIN TRACE */}
            <div className="detail-grid">
              {/* CỘT TRÁI */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                }}
              >
                {/* BẢNG CHỈ SỐ XÉT NGHIỆM */}
                <div className="info-section-card">
                  <h3 className="section-card-title">
                    <FileTextIcon size={18} color="#059669" />
                    <span>Bảng Phân Tích Chỉ Số Kiểm Nghiệm Phòng Lab</span>
                  </h3>
                  <table className="detail-table">
                    <thead>
                      <tr>
                        <th>Hạng mục kiểm nghiệm</th>
                        <th>Phương pháp thử</th>
                        <th>Kết quả đo</th>
                        <th>Ngưỡng tiêu chuẩn</th>
                        <th>Đánh giá</th>
                      </tr>
                    </thead>
                    <tbody>
                      {danhSachChiSo.length === 0 ? (
                        <tr>
                          <td
                            colSpan="5"
                            style={{ textAlign: "center", padding: "24px" }}
                          >
                            Chưa có kết quả xét nghiệm chỉ số phòng Lab.
                          </td>
                        </tr>
                      ) : (
                        danhSachChiSo.map((cs, idx) => (
                          <tr key={cs.ma_chi_so_kd || idx}>
                            <td>
                              <b>{cs.ten_chi_so}</b>
                            </td>
                            <td>{cs.phuong_phap_thu}</td>
                            <td
                              className={cs.is_pass ? "val-safe" : "val-danger"}
                            >
                              {cs.gia_tri}
                            </td>
                            <td>{cs.nguong_tieu_chuan}</td>
                            <td>
                              <span
                                className={
                                  cs.is_pass
                                    ? "status-text-pass"
                                    : "status-text-fail"
                                }
                              >
                                {cs.danh_gia}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* THÔNG TIN NIÊM PHONG LẤY MẪU */}
                <div className="info-section-card">
                  <h3 className="section-card-title">
                    <ShieldCheckIcon size={18} color="#059669" />
                    <span>Biên Bản Lấy Mẫu & Niêm Phong Thực Địa</span>
                  </h3>
                  <div className="sample-info-grid">
                    <p>
                      Mã kiểm định: <b>#{kd.ma_kiem_dinh}</b>
                    </p>
                    <p>
                      Mã Seal niêm phong:{" "}
                      <b style={{ fontFamily: "monospace" }}>
                        {kd.ma_niem_phong || "Chưa cấp niêm phong"}
                      </b>
                    </p>
                    <p>
                      Sản lượng lô:{" "}
                      <b>
                        {kd.so_luong_hien_tai} {kd.dvt_lo || "kg"}
                      </b>
                    </p>
                    <p>
                      Kiểm định viên:{" "}
                      <b>{kd.kiem_dinh_vien || "Chưa phân công"}</b>
                    </p>
                    <p>
                      Địa điểm lấy mẫu: <b>{sampleAddress}</b>
                    </p>
                    <p>
                      Thời gian lấy mẫu: <b>{sampleTime}</b>
                    </p>
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                }}
              >
                {/* BLOCKCHAIN CERT */}
                <div className="info-section-card">
                  <h3 className="section-card-title">
                    <span>Tem Truy Xuất Nguồn Gốc</span>
                  </h3>
                  <div className="qr-preview-box">
                    {traceUrl && (
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                          traceUrl,
                        )}`}
                        alt="QR Code"
                        className="qr-box-img"
                      />
                    )}
                    <p style={{ fontSize: 12, color: "#4b5563" }}>
                      Quét để xem hành trình và kết quả kiểm định của lô{" "}
                      {kd.ma_lo_nong_san} trên AgriChain
                    </p>
                    <div className="tx-hash-badge">
                      {latestTx ? shortHash(latestTx) : "Chưa ghi lên chuỗi"}
                    </div>
                  </div>
                </div>

                {/* TIMELINE */}
                <div className="info-section-card">
                  <h3 className="section-card-title">
                    <ClockIcon size={18} color="#059669" />
                    <span>Lịch Sử Kiểm Định</span>
                  </h3>
                  <div className="timeline-list">
                    {timeline.length === 0 ? (
                      <p className="timeline-item-desc">
                        Chưa có nhật ký sự kiện chuỗi.
                      </p>
                    ) : (
                      timeline.map((event, idx) => (
                        <div
                          className="timeline-item"
                          key={event.ma_lich_su || idx}
                        >
                          <span className="timeline-dot"></span>
                          <span className="timeline-item-title">
                            {event.loai_hoat_dong}
                          </span>
                          <span className="timeline-item-time">
                            {formatDateTime(event.thoi_diem_xay_ra)}
                          </span>
                          {event.ma_bam_su_kien_hien_tai && (
                            <p className="timeline-item-desc timeline-hash">
                              Mã băm:{" "}
                              <code>{event.ma_bam_su_kien_hien_tai}</code>
                            </p>
                          )}
                          {event.ma_giao_dich_blockchain && (
                            <p className="timeline-item-desc timeline-hash">
                              Tx Hash:{" "}
                              <code>{event.ma_giao_dich_blockchain}</code>
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChiTietKiemDinh;
