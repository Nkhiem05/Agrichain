import React from "react";
import {
  Sprout,
  Award,
  Package,
  Store,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import "../../css/chitietuser.css";

const DEFAULT_LOGO_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png";

const TraceDetailPage = ({ batchCode = "#SC-2026-001", onBack }) => {
  return (
    <div className="trace-page">
      {/* HEADER */}
      <header className="dashboard-header">
        <div className="header-left" onClick={onBack}>
          <img src={DEFAULT_LOGO_IMG} alt="Logo" className="header-logo-icon" />
          <div>
            <span className="header-brand-title">AGRICHAIN</span>
          </div>
        </div>

        <div className="chain-badge">
          <span className="pulse-dot"></span>
          <span>Mainnet Online • Block #18,924,102</span>
        </div>
      </header>

      {/* CHI TIẾT SẢN PHẨM TRUY XUẤT */}
      <div className="detail-container">
        <div className="back-bar">
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              border: "none",
              background: "none",
              color: "#16a34a",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
            }}
            onClick={onBack}
          >
            <ArrowLeft size={16} /> Quay lại màn hình quét
          </button>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              fontWeight: "700",
              color: "#15803d",
            }}
          >
            <CheckCircle2 size={16} /> Đã Khớp Chữ Ký Chuỗi Khối
          </span>
        </div>

        <div className="detail-grid">
          {/* THÔNG TIN CHUNG & BLOCKCHAIN */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            <div className="timeline-box">
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "#16a34a",
                }}
              >
                {batchCode}
              </span>
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: "800",
                  marginTop: "4px",
                }}
              >
                Quýt Đường Đóng Thùng
              </h2>
              <p style={{ fontSize: "12px", color: "#6b7280" }}>
                Giống thuần canh tác tại Trà Vinh
              </p>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginTop: "8px",
                  color: "#16a34a",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              >
                <ShieldCheck size={16} /> Đạt Chứng Nhận VietGAP
              </div>
            </div>

            <div className="blockchain-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span>XÁC THỰC CHUỖI KHỐI</span>
                <span style={{ color: "#86efac" }}>100% Verified</span>
              </div>
              <p style={{ fontSize: "10px", color: "#d1fae5" }}>
                Transaction Hash:
              </p>
              <p
                style={{
                  wordBreak: "break-all",
                  fontWeight: "700",
                  color: "#ffffff",
                  marginBottom: "8px",
                }}
              >
                0x7c49f821e9ba0029b3014fec6491a381e9b2a74c
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderTop: "1px solid rgba(255,255,255,0.2)",
                  paddingTop: "8px",
                }}
              >
                <span>Block: #18,924,102</span>
                <span>AgriChain V2</span>
              </div>
            </div>
          </div>

          {/* DÒNG ĐỜI SẢN PHẨM */}
          <div className="timeline-box">
            <h3
              style={{
                fontSize: "16px",
                fontWeight: "700",
                marginBottom: "16px",
              }}
            >
              Hồ Sơ Dòng Đời Sản Phẩm Minh Bạch
            </h3>

            <div className="timeline-vertical">
              {/* 1. Nông Trại */}
              <div className="timeline-step">
                <span className="timeline-step-dot"></span>
                <div className="timeline-step-title">
                  <Sprout size={16} color="#16a34a" /> 1. Canh Tác & Thu Hoạch
                </div>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#16a34a",
                    fontWeight: "600",
                  }}
                >
                  Vườn Cam A1 (#FARM-01111) - Nông dân: Nguyễn Văn A (Trà Vinh)
                </p>
                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    padding: "12px",
                    borderRadius: "8px",
                    marginTop: "8px",
                  }}
                >
                  <p style={{ fontSize: "12px", color: "#475569" }}>
                    Bắt đầu: 18/06/2025 • Thu hoạch: 20/09/2026 (1,500 kg)
                  </p>
                  <table className="table-compact" style={{ marginTop: "8px" }}>
                    <thead>
                      <tr>
                        <th>Ngày</th>
                        <th>Hoạt chất BVTV / Phân bón</th>
                        <th>Cách ly</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>10/08/2026</td>
                        <td>NPK Đầu Trâu 20-20-15</td>
                        <td>Bón lót nuôi quả</td>
                      </tr>
                      <tr>
                        <td>25/08/2026</td>
                        <td>Thuốc trừ sâu Decis 2.5EC</td>
                        <td style={{ color: "#16a34a", fontWeight: "700" }}>
                          Cách ly 26 ngày (≥14 ngày)
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. Kiểm định */}
              <div className="timeline-step">
                <span
                  className="timeline-step-dot"
                  style={{ backgroundColor: "#9333ea" }}
                ></span>
                <div className="timeline-step-title">
                  <Award size={16} color="#9333ea" /> 2. Kiểm Định Chất Lượng
                </div>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#9333ea",
                    fontWeight: "600",
                  }}
                >
                  Trung Tâm Giám Định Nông Nghiệp Vùng 2 - Giấy chứng nhận:
                  VG-2026-8812
                </p>
                <div
                  style={{
                    backgroundColor: "#faf5ff",
                    padding: "12px",
                    borderRadius: "8px",
                    marginTop: "8px",
                  }}
                >
                  <table className="table-compact">
                    <thead>
                      <tr>
                        <th>Chỉ tiêu xét nghiệm</th>
                        <th>Hàm lượng</th>
                        <th>Kết luận</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Nitrate (NO3)</td>
                        <td>0.02 mg/kg</td>
                        <td style={{ color: "#16a34a", fontWeight: "700" }}>
                          Đạt chuẩn
                        </td>
                      </tr>
                      <tr>
                        <td>Deltamethrin (Decis)</td>
                        <td>&lt; 0.005 mg/kg</td>
                        <td style={{ color: "#16a34a", fontWeight: "700" }}>
                          Không phát hiện tồn dư
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Sơ chế */}
              <div className="timeline-step">
                <span
                  className="timeline-step-dot"
                  style={{ backgroundColor: "#2563eb" }}
                ></span>
                <div className="timeline-step-title">
                  <Package size={16} color="#2563eb" /> 3. Sơ Chế & Đóng Gói
                </div>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#2563eb",
                    fontWeight: "600",
                  }}
                >
                  HTX Sơ Chế & Chế Biến Mekong - Mã lô: {batchCode}
                </p>
                <div
                  style={{
                    backgroundColor: "#eff6ff",
                    padding: "12px",
                    borderRadius: "8px",
                    marginTop: "8px",
                    fontSize: "12px",
                  }}
                >
                  <p>• Rửa sục Ozon 0.5 ppm diệt nấm khuẩn (27/09/2026)</p>
                  <p>
                    • Sấy ráo khí mát 35°C và đóng thùng 10kg dán tem QR
                    (28/09/2026)
                  </p>
                </div>
              </div>

              {/* 4. Phân phối */}
              <div className="timeline-step">
                <span
                  className="timeline-step-dot"
                  style={{ backgroundColor: "#d97706" }}
                ></span>
                <div className="timeline-step-title">
                  <Store size={16} color="#d97706" /> 4. Phân Phối & Bán Lẻ
                </div>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#d97706",
                    fontWeight: "600",
                  }}
                >
                  Tổng Kho Bách Hóa Sài Gòn ➔ Siêu thị Co.opMart Lý Thường Kiệt
                </p>
                <div
                  style={{
                    backgroundColor: "#fffbeb",
                    padding: "12px",
                    borderRadius: "8px",
                    marginTop: "8px",
                    fontSize: "12px",
                  }}
                >
                  <p>
                    • Vận chuyển: Xe tải lạnh 65C-128.45 duy trì nhiệt độ 8°C
                    (29/09/2026)
                  </p>
                  <p>
                    • Trạng thái: Lên kệ phục vụ người tiêu dùng (30/09/2026)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TraceDetailPage;
