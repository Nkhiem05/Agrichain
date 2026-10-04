import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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

const DEFAULT_LOGO_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png";

const steps = [
  { step: 1, label: "Tiếp nhận lô" },
  { step: 2, label: "Rửa & Khử khuẩn" },
  { step: 3, label: "Phân loại KCS" },
  { step: 4, label: "Đóng gói dán tem" },
  { step: 5, label: "Xuất xưởng bàn giao" },
];

const ChiTietSoChePage = () => {
  const navigate = useNavigate();
  const [showQrModal, setShowQrModal] = useState(false);

  // =========================================================================
  // DỮ LIỆU MẪU: Đổi lineageType sang "ORIGINAL", "SPLIT" hoặc "MERGED" để test
  // =========================================================================
  const [batchData] = useState({
    id: "#SC-2026-002",
    title: "Cam Sành Đóng Thùng 10kg Xuất Khẩu",
    variety: "Cam Sành Tiền Giang",
    weight: "800 kg",
    packaging: "Thùng carton 5 lớp - 10kg/thùng",
    facilityName: "HTX Sơ Chế Nông Sản Mekong",
    facilityCode: "FAC-MEKONG-01",
    processingDate: "27/09/2026",
    packDate: "01/10/2026",
    storageTemp: "Kho lạnh 8°C - 10°C",
    currentStep: 4,

    // Trạng thái nguồn gốc lô:
    // "ORIGINAL": Lô nguyên bản nhận thẳng từ 1 lô thu hoạch
    // "SPLIT": Lô được tách ra từ 1 lô gốc
    // "MERGED": Lô được gộp từ nhiều lô khác nhau
    lineageType: "MERGED",

    // Dữ liệu nguồn gốc chi tiết
    originDetails: {
      splitFrom: null,
      mergedFrom: [
        {
          id: "#LH-8809",
          variety: "Cam Sành",
          farm: "Vườn Cam A1 (#FARM-01111)",
          contributedWeight: "450 kg",
        },
        {
          id: "#LH-8812",
          variety: "Cam Sành",
          farm: "HTX Trái Cây Cái Bè (#FARM-01118)",
          contributedWeight: "350 kg",
        },
      ],
      originalLot: null,
    },

    // Thông số kiểm định chất lượng:
    // Nếu là MERGED hoặc SPLIT, thể hiện đầy đủ kiểm định theo từng lô cấu thành hoặc lô gốc
    inspections: [
      {
        batchRef: "#LH-8809",
        metric: "Dư lượng thuốc BVTV & Nitrat",
        standard: "VietGAP / MRL < 0.01 mg/kg",
        actualValue: "Không phát hiện (ND)",
        inspector: "Trung tâm Kiểm nghiệm Vùng 2",
        status: "Đạt chuẩn",
      },
      {
        batchRef: "#LH-8809",
        metric: "Độ ngọt trung bình",
        standard: "≥ 10.5 Brix",
        actualValue: "11.2 Brix",
        inspector: "KCS Kho Sơ Chế",
        status: "Đạt chuẩn",
      },
      {
        batchRef: "#LH-8812",
        metric: "Dư lượng thuốc BVTV & Nitrat",
        standard: "VietGAP / MRL < 0.01 mg/kg",
        actualValue: "Không phát hiện (ND)",
        inspector: "Chi cục Trồng trọt & BVTV",
        status: "Đạt chuẩn",
      },
      {
        batchRef: "#LH-8812",
        metric: "Độ ngọt trung bình",
        standard: "≥ 10.5 Brix",
        actualValue: "10.8 Brix",
        inspector: "KCS Kho Sơ Chế",
        status: "Đạt chuẩn",
      },
      {
        batchRef: "#SC-2026-002 (Lô thành phẩm)",
        metric: "Khử khuẩn vi sinh bề mặt (Ozon)",
        standard: "E.coli / Salmonella Âm tính",
        actualValue: "Âm tính 100%",
        inspector: "Lab Kiểm soát nội bộ",
        status: "Đạt chuẩn",
      },
    ],
  });

  const traceUrl = `https://agrichain.vn/trace/${batchData.id.replace("#", "")}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    traceUrl,
  )}`;

  return (
    <div className="processing-detail-layout">
      {/* 1. HEADER CƠ SỞ SƠ CHẾ (KHÔNG CÓ SEARCH BAR) */}
      <header className="dashboard-header">
        <div className="header-left">
          <img src={DEFAULT_LOGO_IMG} alt="Logo" className="header-logo-icon" />
          <span className="header-brand-title">AGRICHAIN</span>
        </div>

        <div className="header-profile">
          <div className="avatar-circle">CS</div>
          <div className="profile-meta">
            <span className="profile-name">HTX Sơ Chế Mekong</span>
            <span className="profile-role">Cơ sở sơ chế / Đóng gói</span>
          </div>
        </div>
      </header>

      {/* 2. MAIN SCROLL CONTAINER */}
      <div className="processing-main-scroll">
        <main className="processing-container">
          {/* Nút Quay lại */}
          <div className="top-actions">
            <button className="btn-back" onClick={() => navigate(-1)}>
              <ArrowLeft size={18} />
              <span>Quay lại danh sách sơ chế</span>
            </button>
          </div>

          <div className="processing-card-wrapper">
            {/* Header Card kèm QR & Trạng thái lô */}
            <div className="processing-card-header">
              <div>
                <div className="processing-title-row">
                  <h2 className="processing-page-title">{batchData.title}</h2>
                  {/* Badge định danh nguồn gốc lô */}
                  {batchData.lineageType === "ORIGINAL" && (
                    <span className="origin-badge original">
                      <CheckCircle2 size={13} /> Lô nguyên bản
                    </span>
                  )}
                  {batchData.lineageType === "SPLIT" && (
                    <span className="origin-badge split">
                      <Split size={13} /> Lô tách nhánh
                    </span>
                  )}
                  {batchData.lineageType === "MERGED" && (
                    <span className="origin-badge merged">
                      <Combine size={13} /> Lô gom / Gộp
                    </span>
                  )}
                </div>
                <p className="processing-subtitle">
                  Mã quản lý: <strong>{batchData.id}</strong> • Cơ sở thực hiện:{" "}
                  {batchData.facilityName}
                </p>
              </div>

              {/* Khối xem mã QR */}
              <div
                className="processing-qr-wrapper"
                onClick={() => setShowQrModal(true)}
                title="Bấm để phóng to và quét mã QR"
              >
                <img
                  src={qrUrl}
                  alt={`Mã QR lô ${batchData.id}`}
                  className="qr-image"
                />
                <div className="qr-info">
                  <span className="qr-label">QR Truy xuất lô sơ chế</span>
                  <span className="qr-code-text">{batchData.id}</span>
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

            {/* Stepper quy trình */}
            <div className="stepper-wrapper">
              <div className="stepper-line"></div>
              {steps.map((item) => (
                <div
                  key={item.step}
                  className={`step-item ${
                    item.step <= batchData.currentStep ? "active" : ""
                  }`}
                >
                  <div className="step-circle">{item.step}</div>
                  <div className="step-text">{item.label}</div>
                </div>
              ))}
            </div>

            {/* KHỐI NGUỒN GỐC LÔ: NGUYÊN BẢN HAY TÁCH / GỘP */}
            {batchData.lineageType === "ORIGINAL" && (
              <div className="lineage-card original">
                <div className="lineage-header">
                  <CheckCircle2 size={18} color="#059669" />
                  <span>Nguồn Gốc: Lô Nguyên Bản Trực Tiếp</span>
                </div>
                <p className="lineage-content">
                  Lô sơ chế này được thực hiện trực tiếp và giữ nguyên vẹn từ 1
                  lô thu hoạch của nhà vườn, không qua phân tách hay gộp đơn
                  hàng.
                </p>
                <div className="lineage-badges-list">
                  <span className="sub-batch-chip">
                    Thu hoạch gốc: <strong>#LH-8821 (Vườn Cam A1)</strong>
                  </span>
                </div>
              </div>
            )}

            {batchData.lineageType === "SPLIT" && (
              <div className="lineage-card split">
                <div className="lineage-header">
                  <Split size={18} color="#d97706" />
                  <span>Nguồn Gốc: Phân Tách Từ Lô Gốc</span>
                </div>
                <p className="lineage-content">
                  Lô này được phân loại và tách ra từ lô thu hoạch gốc:{" "}
                  <strong>
                    {batchData.originDetails.splitFrom?.parentBatchId ||
                      "#LH-8819"}
                  </strong>{" "}
                  (Tổng ban đầu: 1,500 kg).
                </p>
                <div className="lineage-badges-list">
                  <span className="sub-batch-chip">
                    Phẩm cấp phân loại: <strong>Loại 1 tuyển chọn</strong>
                  </span>
                  <span className="sub-batch-chip">
                    Lô nhánh song song: <strong>#SC-L2 (Loại 2)</strong>
                  </span>
                </div>
              </div>
            )}

            {batchData.lineageType === "MERGED" && (
              <div className="lineage-card merged">
                <div className="lineage-header">
                  <Combine size={18} color="#2563eb" />
                  <span>
                    Nguồn Gốc: Gom / Gộp Từ{" "}
                    {batchData.originDetails.mergedFrom.length} Lô Thu Hoạch
                  </span>
                </div>
                <p className="lineage-content">
                  Để đáp ứng đủ đơn hàng xuất khẩu, lô thành phẩm này được đóng
                  thùng từ các lô thu hoạch thành phần sau:
                </p>
                <div className="lineage-badges-list">
                  {batchData.originDetails.mergedFrom.map((m) => (
                    <span className="sub-batch-chip" key={m.id}>
                      <GitBranch size={13} color="#2563eb" />
                      Lô {m.id} ({m.variety} - {m.farm}):{" "}
                      <strong>{m.contributedWeight}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Grid 3 Card Thông Tin Sơ Chế */}
            <div className="details-grid">
              {/* Card 1: Thông tin sản phẩm */}
              <div className="info-card">
                <div className="info-card-header">
                  <Package size={17} color="#278d49" />
                  <h4>Sản Phẩm & Quy Cách</h4>
                </div>
                <div className="info-card-body">
                  <div className="field-group full-width">
                    <span className="field-label">Giống nông sản</span>
                    <span className="field-value">{batchData.variety}</span>
                  </div>
                  <div className="field-row">
                    <div className="field-group">
                      <span className="field-label">Tổng khối lượng</span>
                      <span className="field-value">{batchData.weight}</span>
                    </div>
                    <div className="field-group">
                      <span className="field-label">Nhiệt độ lưu kho</span>
                      <span className="field-value">
                        {batchData.storageTemp}
                      </span>
                    </div>
                  </div>
                  <div className="field-group full-width">
                    <span className="field-label">Quy cách đóng gói</span>
                    <span className="field-value">{batchData.packaging}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Cơ sở thực hiện */}
              <div className="info-card">
                <div className="info-card-header">
                  <Building2 size={17} color="#278d49" />
                  <h4>Cơ Sở Đóng Gói</h4>
                </div>
                <div className="info-card-body">
                  <div className="field-group full-width">
                    <span className="field-label">Tên cơ sở</span>
                    <span className="field-value">
                      {batchData.facilityName}
                    </span>
                  </div>
                  <div className="field-row">
                    <div className="field-group">
                      <span className="field-label">Mã cơ sở</span>
                      <span className="field-value">
                        {batchData.facilityCode}
                      </span>
                    </div>
                    <div className="field-group">
                      <span className="field-label">Tiêu chuẩn xưởng</span>
                      <span className="field-value">HACCP / ISO 22000</span>
                    </div>
                  </div>
                  <div className="field-group full-width">
                    <span className="field-label">Địa chỉ đóng gói</span>
                    <span className="field-value">
                      KCN Sông Hậu, Huyện Châu Thành
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: Thời gian & Chứng từ */}
              <div className="info-card">
                <div className="info-card-header">
                  <Calendar size={17} color="#278d49" />
                  <h4>Nhật Ký Thực Hiện</h4>
                </div>
                <div className="info-card-body">
                  <div className="field-row">
                    <div className="field-group">
                      <span className="field-label">Ngày bắt đầu sơ chế</span>
                      <span className="field-value">
                        {batchData.processingDate}
                      </span>
                    </div>
                    <div className="field-group">
                      <span className="field-label">Ngày đóng thùng</span>
                      <span className="field-value">{batchData.packDate}</span>
                    </div>
                  </div>
                  <div className="field-group full-width">
                    <span className="field-label">Smart Contract Hash</span>
                    <span
                      className="field-value"
                      style={{ fontFamily: "monospace", fontSize: "0.82rem" }}
                    >
                      0x82b7...9a1fe4c
                    </span>
                  </div>
                  <div className="field-group full-width">
                    <span className="field-label">Hạn bảo quản an toàn</span>
                    <span className="field-value">
                      30 ngày kể từ ngày đóng gói
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* BẢNG THÔNG SỐ KIỂM ĐỊNH CHẤT LƯỢNG */}
            <div className="inspection-container">
              <div className="inspection-title-row">
                <h3 className="inspection-title">
                  <FileCheck2 size={19} color="#278d49" />
                  Bảng Thông Số Kiểm Định & Kiểm Nghiệm Chất Lượng
                </h3>
                <span className="inspection-subtitle">
                  {batchData.lineageType === "ORIGINAL"
                    ? "Hiển thị kiểm định lô nguyên bản"
                    : "Hiển thị kiểm định từng lô thành phần & thành phẩm"}
                </span>
              </div>

              <div className="inspection-table-wrapper">
                <table className="inspection-table">
                  <thead>
                    <tr>
                      <th>Thuộc mã lô</th>
                      <th>Chỉ tiêu kiểm tra</th>
                      <th>Quy chuẩn yêu cầu</th>
                      <th>Kết quả thực tế</th>
                      <th>Đơn vị thẩm định</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchData.inspections.map((item, index) => (
                      <tr key={index}>
                        <td>
                          <strong
                            style={{
                              fontFamily: "monospace",
                              color: "#1e40af",
                            }}
                          >
                            {item.batchRef}
                          </strong>
                        </td>
                        <td>
                          <strong>{item.metric}</strong>
                        </td>
                        <td>{item.standard}</td>
                        <td style={{ color: "#15803d", fontWeight: "600" }}>
                          {item.actualValue}
                        </td>
                        <td>{item.inspector}</td>
                        <td>
                          <span className="status-badge badge-green">
                            <CheckCircle2 size={13} /> {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Hàng nút bấm phía dưới */}
            <div className="processing-actions">
              <button className="btn-cancel" onClick={() => navigate(-1)}>
                Đóng
              </button>
              <button
                className="btn-save"
                onClick={() => {
                  navigator.clipboard.writeText(traceUrl);
                  alert(
                    "Đã sao chép liên kết truy xuất nguồn gốc vào bộ nhớ tạm!",
                  );
                }}
              >
                <Share2 size={16} /> Chia sẻ liên kết truy xuất
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* 3. MODAL PHÓNG TO MÃ QR ĐỂ QUÉT */}
      {showQrModal && (
        <div className="modal-overlay" onClick={() => setShowQrModal(false)}>
          <div
            className="qr-modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="qr-modal-header">
              <h3>Mã QR Lô Sơ Chế</h3>
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
                  alt={`Mã QR lô ${batchData.id}`}
                  className="qr-large-img"
                />
              </div>

              <div className="qr-modal-batch">Mã lô: {batchData.id}</div>
              <p className="qr-modal-desc">
                Quét mã để xem nhật ký tách / gộp lô, thông số kiểm nghiệm
                nitrat/độ ngọt và chứng chỉ HACCP được lưu trữ bất biến.
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
                Mở trang truy xuất
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChiTietSoChePage;
