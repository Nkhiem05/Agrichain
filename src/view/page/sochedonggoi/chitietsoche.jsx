import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Package,
  Layers,
  FileCheck2,
  Calendar,
  Building2,
  CheckCircle2,
  GitBranch,
  Split,
  Combine,
  Share2,
} from "lucide-react";
import "../../css/chitietsoche.css";
import { fetchProcessingBatchDetail } from "../../../api/sochedonggoiApi";

const DEFAULT_LOGO_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png";

const PROCESSING_STAGE_LABEL = {
  DANG_RUA_KHU_KHUAN: "Đang rửa sạch & diệt khuẩn",
  DANG_PHAN_LOAI: "Đang phân loại theo kích thước",
  DANG_DONG_GOI: "Đang đóng gói thùng",
  DA_HOAN_TAT: "Đã đóng gói hoàn tất",
};

const formatWeight = (value, unit) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return `- ${unit || ""}`;
  return `${num.toLocaleString("vi-VN")} ${unit || ""}`;
};

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("vi-VN");
};

const ChiTietSoChePage = () => {
  const navigate = useNavigate();
  const { maSoChe } = useParams();
  const [user, setUser] = useState(null);
  const [batchData, setBatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showQrModal, setShowQrModal] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (!savedUser) {
      navigate("/");
      return;
    }
    try {
      setUser(JSON.parse(savedUser));
    } catch {
      localStorage.removeItem("user");
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    if (!user || !maSoChe) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const res = await fetchProcessingBatchDetail(maSoChe);
        if (!cancelled) setBatchData(res?.data || null);
      } catch (err) {
        if (!cancelled) setErrorMsg(err.message || "Không thể tải chi tiết lô sơ chế");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, maSoChe]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="processing-detail-layout">
        <div style={{ padding: "48px", textAlign: "center", color: "#6b7280" }}>Đang tải dữ liệu...</div>
      </div>
    );
  }

  if (errorMsg || !batchData) {
    return (
      <div className="processing-detail-layout">
        <div style={{ padding: "48px", textAlign: "center", color: "#dc2626" }}>
          {errorMsg || "Không tìm thấy lô sơ chế"}
          <div style={{ marginTop: "16px" }}>
            <button className="btn-back" onClick={() => navigate(-1)}>
              <ArrowLeft size={18} /> <span>Quay lại</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // QR chỉ mã hoá mã lô (chưa có trang tra cứu công khai cho người tiêu dùng,
  // và hệ thống chưa tích hợp blockchain nên không hiển thị mã băng/chứng chỉ giả)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    `AGRICHAIN-LOT:${batchData.ma_lo_moi}`,
  )}`;

  const lineageType = batchData.lineage_type;
  const mergedSources =
    lineageType === "MERGED" ? batchData.lineage_sources || [] : [];

  return (
    <div className="processing-detail-layout">
      <header className="dashboard-header">
        <div className="header-left">
          <img src={DEFAULT_LOGO_IMG} alt="Logo" className="header-logo-icon" />
          <span className="header-brand-title">AGRICHAIN</span>
        </div>

        <div
          className="header-profile"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/trang-ca-nhan")}
          title="Xem hồ sơ cá nhân"
        >
          <div className="avatar-circle">{(user.ho_ten || "CS").slice(0, 2).toUpperCase()}</div>
          <div className="profile-meta">
            <span className="profile-name">{user.ho_ten || "Cơ sở sơ chế"}</span>
            <span className="profile-role">Cơ sở sơ chế / Đóng gói</span>
          </div>
        </div>
      </header>

      <div className="processing-main-scroll">
        <main className="processing-container">
          <div className="top-actions">
            <button className="btn-back" onClick={() => navigate(-1)}>
              <ArrowLeft size={18} />
              <span>Quay lại danh sách sơ chế</span>
            </button>
          </div>

          <div className="processing-card-wrapper">
            <div className="processing-card-header">
              <div>
                <div className="processing-title-row">
                  <h2 className="processing-page-title">{batchData.tieu_de}</h2>
                  {lineageType === "ORIGINAL" && (
                    <span className="origin-badge original">
                      <CheckCircle2 size={13} /> Lô nguyên bản
                    </span>
                  )}
                  {lineageType === "SPLIT" && (
                    <span className="origin-badge split">
                      <Split size={13} /> Lô tách nhánh
                    </span>
                  )}
                  {lineageType === "MERGED" && (
                    <span className="origin-badge merged">
                      <Combine size={13} /> Lô gom / Gộp
                    </span>
                  )}
                </div>
                <p className="processing-subtitle">
                  Mã quản lý: <strong>{batchData.ma_lo_moi}</strong> • Cơ sở thực hiện:{" "}
                  {user.ho_ten || "Cơ sở sơ chế"}
                </p>
              </div>

              <div
                className="processing-qr-wrapper"
                onClick={() => setShowQrModal(true)}
                title="Bấm để phóng to và quét mã QR"
              >
                <img src={qrUrl} alt={`Mã QR lô ${batchData.ma_lo_moi}`} className="qr-image" />
                <div className="qr-info">
                  <span className="qr-label">QR Truy xuất lô sơ chế</span>
                  <span className="qr-code-text">{batchData.ma_lo_moi}</span>
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
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                marginBottom: "16px",
              }}
            >
              {Object.entries(PROCESSING_STAGE_LABEL).map(([key, label], idx) => {
                const order = Object.keys(PROCESSING_STAGE_LABEL);
                const currentIdx = order.indexOf(batchData.giai_doan_so_che);
                const active = idx <= currentIdx;
                return (
                  <span
                    key={key}
                    className="tag-badge"
                    style={{
                      background: active ? "#dcfce7" : "#f3f4f6",
                      color: active ? "#15803d" : "#9ca3af",
                      fontWeight: active ? 700 : 400,
                    }}
                  >
                    {idx + 1}. {label}
                  </span>
                );
              })}
            </div>

            {lineageType === "ORIGINAL" && (
              <div className="lineage-card original">
                <div className="lineage-header">
                  <CheckCircle2 size={18} color="#059669" />
                  <span>Nguồn Gốc: Lô Nguyên Bản Trực Tiếp</span>
                </div>
                <p className="lineage-content">
                  Lô sơ chế này được thực hiện trực tiếp và giữ nguyên vẹn từ 1 lô đã tiếp nhận, không
                  qua phân tách hay gộp đơn hàng.
                </p>
                {batchData.lineage_direct_source && (
                  <div className="lineage-badges-list">
                    <span className="sub-batch-chip">
                      Lô nguồn: <strong>#{batchData.lineage_direct_source}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}

            {lineageType === "SPLIT" && (
              <div className="lineage-card split">
                <div className="lineage-header">
                  <Split size={18} color="#d97706" />
                  <span>Nguồn Gốc: Phân Tách Từ Lô Gốc</span>
                </div>
                <p className="lineage-content">
                  Lô đưa vào sơ chế (<strong>#{batchData.lineage_direct_source}</strong>) được phân
                  loại và tách ra từ lô gốc:{" "}
                  <strong>#{batchData.lineage_sources?.[0]?.ma_lo_nguon || "—"}</strong>.
                </p>
              </div>
            )}

            {lineageType === "MERGED" && (
              <div className="lineage-card merged">
                <div className="lineage-header">
                  <Combine size={18} color="#2563eb" />
                  <span>Nguồn Gốc: Gom / Gộp Từ {mergedSources.length} Lô</span>
                </div>
                <p className="lineage-content">
                  Lô đưa vào sơ chế (<strong>#{batchData.lineage_direct_source}</strong>) được gộp từ
                  các lô thành phần sau:
                </p>
                <div className="lineage-badges-list">
                  {mergedSources.map((m) => (
                    <span className="sub-batch-chip" key={m.ma_lo_nguon}>
                      <GitBranch size={13} color="#2563eb" />
                      Lô #{m.ma_lo_nguon} ({m.ten_san_pham || "—"}):{" "}
                      <strong>{formatWeight(m.so_luong_tham_gia, m.don_vi_tinh)}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="details-grid">
              <div className="info-card">
                <div className="info-card-header">
                  <Package size={17} color="#278d49" />
                  <h4>Sản Phẩm & Quy Cách</h4>
                </div>
                <div className="info-card-body">
                  <div className="field-group full-width">
                    <span className="field-label">Giống nông sản</span>
                    <span className="field-value">{batchData.ten_san_pham}</span>
                  </div>
                  <div className="field-row">
                    <div className="field-group">
                      <span className="field-label">Khối lượng hiện tại</span>
                      <span className="field-value">
                        {formatWeight(batchData.so_luong_hien_tai, batchData.don_vi_tinh)}
                      </span>
                    </div>
                    <div className="field-group">
                      <span className="field-label">Khu vực sơ chế</span>
                      <span className="field-value">{batchData.khu_vuc_so_che || "—"}</span>
                    </div>
                  </div>
                  <div className="field-group full-width">
                    <span className="field-label">Quy cách & tiêu chuẩn</span>
                    <span className="field-value">{batchData.quy_cach_tieu_chuan || "—"}</span>
                  </div>
                </div>
              </div>

              <div className="info-card">
                <div className="info-card-header">
                  <Building2 size={17} color="#278d49" />
                  <h4>Cơ Sở Đóng Gói</h4>
                </div>
                <div className="info-card-body">
                  <div className="field-group full-width">
                    <span className="field-label">Tên cơ sở</span>
                    <span className="field-value">{user.ho_ten || "—"}</span>
                  </div>
                  <div className="field-group full-width">
                    <span className="field-label">Mã lô thành phẩm</span>
                    <span className="field-value">{batchData.ma_lo_moi}</span>
                  </div>
                </div>
              </div>

              <div className="info-card">
                <div className="info-card-header">
                  <Calendar size={17} color="#278d49" />
                  <h4>Nhật Ký Thực Hiện</h4>
                </div>
                <div className="info-card-body">
                  <div className="field-row">
                    <div className="field-group">
                      <span className="field-label">Ngày bắt đầu sơ chế</span>
                      <span className="field-value">{formatDate(batchData.ngay_bat_dau)}</span>
                    </div>
                    <div className="field-group">
                      <span className="field-label">Ngày hoàn tất</span>
                      <span className="field-value">{formatDate(batchData.ngay_hoan_tat)}</span>
                    </div>
                  </div>
                  <div className="field-group full-width">
                    <span className="field-label">Trạng thái hiện tại</span>
                    <span className="field-value">
                      {PROCESSING_STAGE_LABEL[batchData.giai_doan_so_che] || batchData.giai_doan_so_che}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="inspection-container">
              <div className="inspection-title-row">
                <h3 className="inspection-title">
                  <FileCheck2 size={19} color="#278d49" />
                  Bảng Thông Số Kiểm Định Liên Quan
                </h3>
                <span className="inspection-subtitle">
                  Dữ liệu kiểm định thật của lô nguồn (nếu có hồ sơ kiểm định)
                </span>
              </div>

              {!batchData.inspections || batchData.inspections.length === 0 ? (
                <div style={{ padding: "24px 0", textAlign: "center", color: "#9ca3af", fontSize: "13.5px" }}>
                  Chưa có dữ liệu kiểm định cho lô này hoặc lô nguồn.
                </div>
              ) : (
                <div className="inspection-table-wrapper">
                  <table className="inspection-table">
                    <thead>
                      <tr>
                        <th>Thuộc mã lô</th>
                        <th>Tiêu chuẩn đăng ký</th>
                        <th>Chỉ số</th>
                        <th>Giá trị</th>
                        <th>Kết luận</th>
                        <th>Trạng thái hồ sơ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchData.inspections.map((item, index) => (
                        <tr key={index}>
                          <td>
                            <strong style={{ fontFamily: "monospace", color: "#1e40af" }}>
                              {item.ma_lo_nong_san}
                            </strong>
                          </td>
                          <td>{item.tieu_chuan_dang_ky || "—"}</td>
                          <td>{item.ten_chi_so || "—"}</td>
                          <td style={{ color: "#15803d", fontWeight: "600" }}>{item.gia_tri || "—"}</td>
                          <td>{item.ket_luan || "—"}</td>
                          <td>{item.trang_thai_ho_so || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="processing-actions">
              <button className="btn-cancel" onClick={() => navigate(-1)}>
                Đóng
              </button>
              <button
                className="btn-save"
                onClick={() => {
                  navigator.clipboard.writeText(`AGRICHAIN-LOT:${batchData.ma_lo_moi}`);
                  alert("Đã sao chép mã lô vào bộ nhớ tạm!");
                }}
              >
                <Share2 size={16} /> Sao chép mã lô
              </button>
            </div>
          </div>
        </main>
      </div>

      {showQrModal && (
        <div className="modal-overlay" onClick={() => setShowQrModal(false)}>
          <div className="qr-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="qr-modal-header">
              <h3>Mã QR Lô Sơ Chế</h3>
              <button type="button" className="btn-close-modal" onClick={() => setShowQrModal(false)}>
                ✕
              </button>
            </div>

            <div className="qr-modal-body">
              <div className="qr-scanner-frame">
                <div className="qr-scan-line"></div>
                <img src={qrUrl} alt={`Mã QR lô ${batchData.ma_lo_moi}`} className="qr-large-img" />
              </div>

              <div className="qr-modal-batch">Mã lô: {batchData.ma_lo_moi}</div>
              <p className="qr-modal-desc">
                Mã QR mã hoá mã lô nông sản. Trang tra cứu công khai cho người tiêu dùng đang được xây
                dựng.
              </p>
            </div>

            <div className="qr-modal-footer">
              <button type="button" className="btn-modal-close" onClick={() => setShowQrModal(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChiTietSoChePage;
