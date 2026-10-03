import React, { useState } from "react";
import {
  Sprout,
  Scissors,
  Award,
  Package,
  Store,
  QrCode,
  Scan,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Check,
  X,
} from "lucide-react";
import "../../css/user.css";

const DEFAULT_LOGO_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png";

const TraceabilityPage = () => {
  const [currentScreen, setCurrentScreen] = useState("landing");
  const [batchCode, setBatchCode] = useState("#SC-2026-001");
  const [showScannerModal, setShowScannerModal] = useState(false);

  const handleSimulateScan = () => {
    setShowScannerModal(false);
    setCurrentScreen("detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="trace-page">
      {/* HEADER */}
      <header className="dashboard-header">
        <div
          className="header-left"
          onClick={() => setCurrentScreen("landing")}
        >
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

      {/* MÀN HÌNH 1: LANDING & QUÉT QR */}
      {currentScreen === "landing" && (
        <div className="landing-container">
          {/* CỘT TRÁI: QUY TRÌNH CHUẨN */}
          <div className="timeline-box">
            <h1
              style={{
                fontSize: "22px",
                fontWeight: "800",
                color: "#111827",
                marginBottom: "6px",
              }}
            >
              Quy Trình Chuẩn Hóa Chuỗi Cung Ứng
            </h1>
            <p
              style={{
                fontSize: "12px",
                color: "#6b7280",
                marginBottom: "20px",
              }}
            >
              Mỗi mắt xích đều ký số điện tử để xác nhận dữ liệu độc lập trên
              Smart Contract[cite: 5].
            </p>

            <div className="timeline-vertical">
              <div className="timeline-step">
                <span className="timeline-step-dot"></span>
                <div className="timeline-step-title">
                  <Sprout size={16} color="#16a34a" /> 1. Gieo Trồng & Quản Lý
                  Canh Tác
                </div>
                <p className="timeline-step-desc">
                  Lập nhật ký bón phân, tưới tiêu và chi tiết hoạt chất BVTV
                  theo chuẩn an toàn sinh học[cite: 1].
                </p>
              </div>

              <div className="timeline-step">
                <span className="timeline-step-dot"></span>
                <div className="timeline-step-title">
                  <Scissors size={16} color="#16a34a" /> 2. Thu Hoạch & Cách Ly
                  An Toàn
                </div>
                <p className="timeline-step-desc">
                  Đảm bảo thời gian cách ly hoạt chất và niêm phong lô quả trước
                  khi xuất vườn.
                </p>
              </div>

              <div className="timeline-step">
                <span
                  className="timeline-step-dot"
                  style={{ backgroundColor: "#9333ea" }}
                ></span>
                <div className="timeline-step-title">
                  <Award size={16} color="#9333ea" /> 3. Kiểm Định & Giám Định
                  Chất Lượng
                </div>
                <p className="timeline-step-desc">
                  Đơn vị độc lập kiểm tra dư lượng hóa chất, vi sinh và công bố
                  mã giấy chứng nhận.
                </p>
              </div>

              <div className="timeline-step">
                <span
                  className="timeline-step-dot"
                  style={{ backgroundColor: "#2563eb" }}
                ></span>
                <div className="timeline-step-title">
                  <Package size={16} color="#2563eb" /> 4. Sơ Chế, Khử Trùng &
                  Đóng Gói
                </div>
                <p className="timeline-step-desc">
                  Khử khuẩn sục ozon, sấy khô nhiệt độ chuẩn và gắn tem mã hóa
                  QR truy xuất[cite: 5].
                </p>
              </div>

              <div className="timeline-step">
                <span
                  className="timeline-step-dot"
                  style={{ backgroundColor: "#d97706" }}
                ></span>
                <div className="timeline-step-title">
                  <Store size={16} color="#d97706" /> 5. Vận Chuyển Chuỗi Lạnh &
                  Phân Phối
                </div>
                <p className="timeline-step-desc">
                  Giám sát nhiệt độ xe tải lạnh suốt hành trình trước khi chuyển
                  giao đến tay người tiêu dùng[cite: 3, 4].
                </p>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: QUÉT QR & NHẬP MÃ */}
          <div className="qr-box">
            <div className="scanner-icon-wrap">
              <Scan size={38} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: "700" }}>
              Kiểm Tra Tem Nông Sản
            </h3>
            <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
              Hướng camera quét tem QR dán trên từng quả hoặc thùng carton[cite:
              5].
            </p>

            <button
              className="btn-scan-primary"
              onClick={() => setShowScannerModal(true)}
            >
              <QrCode size={18} /> Quét Mã QR Ngay[cite: 5]
            </button>

            <div style={{ width: "100%", marginTop: "20px" }}>
              <span
                style={{
                  fontSize: "11px",
                  color: "#9ca3af",
                  textTransform: "uppercase",
                }}
              >
                Hoặc tra cứu bằng mã
              </span>
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <input
                  type="text"
                  value={batchCode}
                  onChange={(e) => setBatchCode(e.target.value)}
                  style={{
                    flex: 1,
                    height: "38px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    padding: "0 10px",
                    fontFamily: "monospace",
                    fontSize: "13px",
                  }}
                />
                <button
                  style={{
                    height: "38px",
                    padding: "0 14px",
                    backgroundColor: "#f3f4f6",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontWeight: "700",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                  onClick={() => setCurrentScreen("detail")}
                >
                  Tra cứu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MÀN HÌNH 2: CHI TIẾT SẢN PHẨM TRUY XUẤT */}
      {currentScreen === "detail" && (
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
              onClick={() => setCurrentScreen("landing")}
            >
              <ArrowLeft size={16} /> Quay lại màn hình quét[cite: 5]
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
              <CheckCircle2 size={16} /> Đã Khớp Chữ Ký Chuỗi Khối[cite: 5]
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
                  Giống thuần canh tác tại Trà Vinh[cite: 1]
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
                  <span>XÁC THỰC CHUỖI KHỐI[cite: 5]</span>
                  <span style={{ color: "#86efac" }}>100% Verified</span>
                </div>
                <p style={{ fontSize: "10px", color: "#d1fae5" }}>
                  Transaction Hash[cite: 5]:
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
                  <span>Block: #18,924,102[cite: 5]</span>
                  <span>AgriChain V2[cite: 5]</span>
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
                    Vườn Cam A1 (#FARM-01111) - Nông dân: Nguyễn Văn A (Trà
                    Vinh)[cite: 1]
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
                      Bắt đầu: 18/06/2025 • Thu hoạch: 20/09/2026 (1,500
                      kg)[cite: 1]
                    </p>
                    <table
                      className="table-compact"
                      style={{ marginTop: "8px" }}
                    >
                      <thead>
                        <tr>
                          <th>Ngày</th>
                          <th>Hoạt chất BVTV / Phân bón[cite: 1]</th>
                          <th>Cách ly</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>10/08/2026</td>
                          <td>NPK Đầu Trâu 20-20-15[cite: 1]</td>
                          <td>Bón lót nuôi quả</td>
                        </tr>
                        <tr>
                          <td>25/08/2026</td>
                          <td>Thuốc trừ sâu Decis 2.5EC[cite: 1]</td>
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
                          <td>Deltamethrin (Decis)[cite: 1]</td>
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
                    HTX Sơ Chế & Chế Biến Mekong - Mã lô: #SC-2026-001[cite: 2]
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
                      (28/09/2026)[cite: 5]
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
                    Tổng Kho Bách Hóa Sài Gòn ➔ Siêu thị Co.opMart Lý Thường
                    Kiệt[cite: 4]
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
                      (29/09/2026)[cite: 3, 4]
                    </p>
                    <p>
                      • Trạng thái: Lên kệ phục vụ người tiêu dùng
                      (30/09/2026)[cite: 4]
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MÔ PHỎNG CAMERA QUÉT QR */}
      {showScannerModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "24px",
            color: "white",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
              maxWidth: "420px",
            }}
          >
            <span>Hướng camera vào mã tem QR[cite: 5]</span>
            <button
              style={{
                background: "none",
                border: "none",
                color: "white",
                cursor: "pointer",
              }}
              onClick={() => setShowScannerModal(false)}
            >
              <X size={20} />
            </button>
          </div>

          <div
            style={{
              width: "240px",
              height: "240px",
              border: "2px solid #34d399",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <QrCode size={110} color="rgba(255,255,255,0.3)" />
          </div>

          <button
            className="btn-scan-primary"
            style={{ maxWidth: "420px" }}
            onClick={handleSimulateScan}
          >
            <Check size={16} /> Nhận Diện Mã Thành Công (Mô Phỏng)[cite: 5]
          </button>
        </div>
      )}
    </div>
  );
};

export default TraceabilityPage;
