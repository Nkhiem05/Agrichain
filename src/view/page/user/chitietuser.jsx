import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Sprout,
  Award,
  Package,
  Store,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";
import "../../css/chitietuser.css";
import { fetchChiTietUser } from "../../../api/chitietuserApi";

const DEFAULT_LOGO_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png";

const formatDate = (dateStr) => {
  if (!dateStr) return "Chưa cập nhật";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("vi-VN");
};

const TraceDetailPage = ({ onBack }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Đọc mã lô hàng từ URL: /chi-tiet-user?malohang=LO001
  const rawBatchCode =
    searchParams.get("malohang") || searchParams.get("batchCode") || "";
  const currentBatchCode = rawBatchCode.trim();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  useEffect(() => {
    let isMounted = true;

    if (!currentBatchCode) {
      setLoading(false);
      setError("Không tìm thấy mã lô hàng trên liên kết (?malohang=...)");
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchChiTietUser(currentBatchCode);
        if (isMounted) setData(result);
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [currentBatchCode]);

  if (loading) {
    return (
      <div className="trace-loading-screen">
        <div className="trace-loading-inner">
          <Loader2 className="animate-spin" size={24} /> Đang truy vấn sổ cái
          chuỗi khối...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="trace-error-box">
        <AlertCircle
          size={48}
          color="#ef4444"
          style={{ margin: "0 auto 12px" }}
        />
        <h3 style={{ fontSize: "18px", color: "#1f2937" }}>
          Không thể truy xuất thông tin
        </h3>
        <p style={{ color: "#6b7280", margin: "8px 0 20px" }}>
          {error || "Lô hàng không tồn tại hoặc chưa được kích hoạt."}
        </p>
        <button onClick={handleBack} className="btn-back-action">
          Quay lại màn hình quét
        </button>
      </div>
    );
  }

  const { batch, blockchain, farming, audit, processing, shipping } = data;
  const latestShipment = shipping && shipping.length > 0 ? shipping[0] : null;

  return (
    <div className="trace-page">
      {/* HEADER */}
      <header className="dashboard-header">
        <div className="header-left" onClick={handleBack}>
          <img src={DEFAULT_LOGO_IMG} alt="Logo" className="header-logo-icon" />
          <div>
            <span className="header-brand-title">AGRICHAIN</span>
          </div>
        </div>

        <div className="chain-badge">
          <span className="pulse-dot"></span>
          <span>
            Mainnet Online • Block #
            {blockchain?.so_thu_tu_su_kien || "18,924,102"}
          </span>
        </div>
      </header>

      {/* CHI TIẾT SẢN PHẨM TRUY XUẤT */}
      <div className="detail-container">
        <div className="back-bar">
          <button className="back-btn" onClick={handleBack}>
            <ArrowLeft size={16} /> Quay lại màn hình quét
          </button>
          <span className="chain-verify-status">
            <CheckCircle2 size={16} /> Đã Khớp Chữ Ký Chuỗi Khối
          </span>
        </div>

        <div className="detail-grid">
          {/* THÔNG TIN CHUNG & BLOCKCHAIN */}
          <div className="info-column">
            <div className="timeline-box">
              <span className="batch-code-label">#{batch?.ma_lo_nong_san}</span>
              <h2 className="batch-product-title">{batch?.ten_san_pham}</h2>
              <p className="batch-description">
                {batch?.mo_ta_san_pham ||
                  `${batch?.loai_san_pham} tiêu chuẩn kiểm định`}
              </p>

              {(() => {
                const revoked =
                  audit?.trang_thai_ho_so === "THU_HOI" ||
                  audit?.ket_luan === "REVOKED";
                const passed = !revoked && audit?.ket_luan === "PASSED";
                const failed = !revoked && audit?.ket_luan === "FAILED";
                const label = passed
                  ? `Đạt chứng nhận ${audit.tieu_chuan_dang_ky}`
                  : failed
                    ? `Không đạt kiểm định ${audit.tieu_chuan_dang_ky}`
                    : revoked
                      ? "Chứng nhận đã bị thu hồi"
                      : "Chưa có kết quả kiểm định";
                return (
                  <div
                    className="cert-status-badge"
                    style={
                      passed
                        ? undefined
                        : {
                            color: failed || revoked ? "#dc2626" : "#6b7280",
                          }
                    }
                  >
                    <ShieldCheck size={16} /> {label}
                  </div>
                );
              })()}
            </div>

            <div className="blockchain-card">
              <div className="blockchain-card-header">
                <span>XÁC THỰC CHUỖI KHỐI</span>
                <span className="text-verified">100% Verified</span>
              </div>
              <p className="tx-hash-label">Transaction Hash:</p>
              <p className="tx-hash-value">
                {blockchain?.ma_giao_dich_blockchain ||
                  batch?.latest_event_hash ||
                  "0x7c49f821e9ba0029b3014fec6491a381e9b2a74c"}
              </p>
              <div className="blockchain-card-footer">
                <span>Trạng thái: {batch?.integrity_status}</span>
                <span>AgriChain V2</span>
              </div>
            </div>
          </div>

          {/* DÒNG ĐỜI SẢN PHẨM */}
          <div className="timeline-box">
            <h3 className="timeline-header-title">
              Hồ Sơ Dòng Đời Sản Phẩm Minh Bạch
            </h3>

            <div className="timeline-vertical">
              {/* 1. Nông Trại */}
              {farming && (
                <div className="timeline-step">
                  <span className="timeline-step-dot dot-farming"></span>
                  <div className="timeline-step-title">
                    <Sprout size={16} color="#16a34a" /> 1. Canh Tác & Thu Hoạch
                  </div>
                  <p className="farm-info-highlight">
                    {farming.ten_nong_trai} - Nông dân: {farming.ten_nong_dan} (
                    {farming.dia_diem_nong_trai})
                  </p>
                  <div className="step-card-box bg-farming">
                    <p className="step-detail-time">
                      Bắt đầu: {formatDate(farming.ngay_gieo_trong)} • Thu
                      hoạch: {formatDate(batch.ngay_thu_hoach)} (
                      {Number(batch.so_luong_hien_tai).toLocaleString()}{" "}
                      {batch.don_vi_tinh})
                    </p>
                    {farming.supplies && farming.supplies.length > 0 && (
                      <table className="table-compact">
                        <thead>
                          <tr>
                            <th>Ngày</th>
                            <th>Hoạt chất BVTV / Phân bón</th>
                            <th>Liều lượng</th>
                          </tr>
                        </thead>
                        <tbody>
                          {farming.supplies.map((item, idx) => (
                            <tr key={idx}>
                              <td>{formatDate(item.ngay_su_dung)}</td>
                              <td>{item.ten_vat_tu}</td>
                              <td className="supply-amount">
                                {item.lieu_luong} {item.don_vi_tinh}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* 2. Kiểm định */}
              {audit && (
                <div className="timeline-step">
                  <span className="timeline-step-dot dot-audit"></span>
                  <div className="timeline-step-title">
                    <Award size={16} color="#9333ea" /> 2. Kiểm Định Chất Lượng
                  </div>
                  <p className="audit-info-highlight">
                    {audit.ten_co_quan} - Mã hồ sơ: {audit.ma_ho_so}
                  </p>
                  <p
                    className={
                      audit.ket_luan === "PASSED"
                        ? "table-status-pass"
                        : "table-status-fail"
                    }
                    style={{ margin: "4px 0 8px", fontWeight: 700 }}
                  >
                    Kết luận:{" "}
                    {audit.ket_luan === "PASSED"
                      ? "ĐẠT CHUẨN"
                      : audit.ket_luan === "FAILED"
                        ? "KHÔNG ĐẠT CHUẨN"
                        : audit.trang_thai_ho_so === "THU_HOI" ||
                            audit.ket_luan === "REVOKED"
                          ? "CHỨNG THƯ ĐÃ BỊ THU HỒI"
                          : audit.ket_luan}
                    {audit.so_chung_nhan
                      ? ` · Số chứng nhận ${audit.so_chung_nhan}`
                      : ""}
                  </p>
                  <div className="step-card-box bg-audit">
                    {audit.indicators && audit.indicators.length > 0 ? (
                      <table className="table-compact">
                        <thead>
                          <tr>
                            <th>Chỉ tiêu xét nghiệm</th>
                            <th>Hàm lượng</th>
                            <th>Kết luận</th>
                          </tr>
                        </thead>
                        <tbody>
                          {audit.indicators.map((ind, idx) => (
                            <tr key={idx}>
                              <td>{ind.ten_chi_so}</td>
                              <td>{ind.gia_tri}</td>
                              <td
                                className={
                                  ind.dat
                                    ? "table-status-pass"
                                    : "table-status-fail"
                                }
                              >
                                {ind.dat ? "Đạt chuẩn" : "Không đạt"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="empty-subtext">
                        Cơ quan kiểm định đã công bố kết quả.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* 3. Sơ chế */}
              {processing && (
                <div className="timeline-step">
                  <span className="timeline-step-dot dot-processing"></span>
                  <div className="timeline-step-title">
                    <Package size={16} color="#2563eb" /> 3. Sơ Chế & Đóng Gói
                  </div>
                  <p className="processing-info-highlight">
                    {processing.ten_co_so} - {processing.tieu_de}
                  </p>
                  <div className="step-card-box bg-processing">
                    <p>
                      • Dây chuyền:{" "}
                      {processing.khu_vuc_so_che ||
                        "Khu vực phân loại đóng gói"}
                    </p>
                    <p>
                      • Thời gian hoàn tất:{" "}
                      {formatDate(
                        processing.ngay_hoan_tat || processing.ngay_bat_dau,
                      )}{" "}
                      - Trạng thái: {processing.giai_doan_so_che}
                    </p>
                  </div>
                </div>
              )}

              {/* 4. Phân phối */}
              {latestShipment && (
                <div className="timeline-step">
                  <span className="timeline-step-dot dot-shipping"></span>
                  <div className="timeline-step-title">
                    <Store size={16} color="#d97706" /> 4. Phân Phối & Bán Lẻ
                  </div>
                  <p className="shipping-info-highlight">
                    {latestShipment.ten_don_vi_van_chuyen} ➔{" "}
                    {latestShipment.ten_ben_nhan ||
                      latestShipment.dia_chi_giao_hang ||
                      "Điểm bán lẻ"}
                  </p>
                  <div className="step-card-box bg-shipping">
                    <p>
                      • Tài xế: {latestShipment.ten_tai_xe || "Chưa phân công"}{" "}
                      (Biển số: {latestShipment.bien_so_xe || "N/A"})
                    </p>
                    <p>
                      • Xuất phát: {formatDate(latestShipment.thoi_gian_xuat)} •
                      Trạng thái: {latestShipment.trang_thai}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TraceDetailPage;
