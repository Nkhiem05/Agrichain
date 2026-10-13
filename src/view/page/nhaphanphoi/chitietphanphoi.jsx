import React, { useState } from "react";
import {
  ArrowLeft,
  Printer,
  CheckCircle2,
  Clock,
  Truck,
  Building2,
  Package,
  FileText,
  QrCode,
  AlertTriangle,
  MapPin,
  Phone,
  User,
  CalendarClock,
  Weight,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import "../../css/chitietphanphoi.css";

const DEFAULT_LOGO_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png";

const ChiTietPhanPhoiPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // Dữ liệu chi tiết mẫu của phiếu phân phối
  const [orderDetail] = useState({
    maPhieu: id || "PXK-2026-081",
    ngayLap: "12/10/2026 - 08:30",
    trangThai: "DA_GIAO", // CHO_XUAT | DANG_GIAO | DA_GIAO
    txHash: "0x9f88c42b10a239d...771e84",

    // Thông tin đại lý nhận
    daiLy: {
      maDL: "DL01",
      ten: "Hệ thống Siêu Thị Co.opMart - Chi nhánh Lý Thường Kiệt",
      nguoiDaiDien: "Nguyễn Thu Hà",
      sdt: "0908 123 456",
      diaChi: "497 Lý Thường Kiệt, Phường 7, Tân Bình, TP. Hồ Chí Minh",
    },

    // Thông tin lô hàng nông sản
    sanPham: {
      maLo: "SC-2026-002",
      tenSP: "Cam Sành Tiền Giang VietGAP",
      khoXuat: "Kho Mát A (Kệ Pallet 04 - AgriHub Central #01)",
      tieuChuan: "VietGAP (Chứng thư: VG-TG-2026-09)",
      hanBaoQuan: "30/10/2026",
      soLuongXuat: 300,
      soLuongThucNhan: 300,
      quyCach: "30 thùng × 10 kg",
      haoHut: 0,
      donGiaUocTinh: "28.000 đ/kg",
    },

    // Thông tin vận chuyển
    vanChuyen: {
      hinhThuc: "Đơn vị vận chuyển liên kết",
      donVi: "Giao Hàng Nhanh AgriLogistics",
      taiXe: "Trần Minh Trí",
      bienSo: "51C-782.90",
      sdtTaiXe: "0934 556 778",
      thoiGianXuatKho: "12/10/2026 - 09:15",
      thoiGianBanGiao: "12/10/2026 - 11:45",
      ghiChuGiao:
        "Bảo quản xe mát 8 – 12°C, xếp nhẹ tay tránh dập đáy thùng.",
    },

    // Lịch trình phân phối (Tracking timeline)
    timeline: [
      {
        tieuDe: "Lập phiếu xuất kho thành công",
        thoiGian: "12/10/2026 - 08:30",
        moTa: "Thủ kho Bách Hóa Sài Gòn hoàn tất chỉ định xuất lô SC-2026-002.",
        hoanThanh: true,
      },
      {
        tieuDe: "Xuất xe & Niêm phong Seal",
        thoiGian: "12/10/2026 - 09:15",
        moTa: "Bàn giao 30 thùng cho tài xế Trần Minh Trí (Xe 51C-782.90). Mã seal: SEAL-PP-441.",
        hoanThanh: true,
      },
      {
        tieuDe: "Xe cập bãi đại lý",
        thoiGian: "12/10/2026 - 11:20",
        moTa: "Xe đến địa chỉ Siêu Thị Co.opMart Lý Thường Kiệt, kiểm tra seal nguyên vẹn.",
        hoanThanh: true,
      },
      {
        tieuDe: "Đại lý hoàn tất kiểm đếm & Nhận hàng",
        thoiGian: "12/10/2026 - 11:45",
        moTa: "Đại diện Nguyễn Thu Hà ký nhận đủ 300 kg, không phát hiện dập hỏng.",
        hoanThanh: true,
      },
    ],
  });

  const haoHutKg =
    orderDetail.sanPham.soLuongXuat - orderDetail.sanPham.soLuongThucNhan;
  const haoHutPct =
    orderDetail.sanPham.soLuongXuat > 0
      ? ((haoHutKg / orderDetail.sanPham.soLuongXuat) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="ctpp-page">
      {/* =================== HEADER =================== */}
      <header className="ctpp-header">
        <div className="ctpp-header-left">
          <img src={DEFAULT_LOGO_IMG} alt="Logo" className="ctpp-logo" />
          <span className="ctpp-brand">AGRICHAIN</span>
        </div>
        <div className="ctpp-header-profile">
          <div className="ctpp-avatar">NPP</div>
          <div className="ctpp-profile-meta">
            <span className="ctpp-profile-name">Tổng Kho Bách Hóa Sài Gòn</span>
            <span className="ctpp-profile-role">Đơn vị phân phối trung chuyển</span>
          </div>
        </div>
      </header>

      {/* =================== MAIN =================== */}
      <main className="ctpp-main">
        {/* TOP BAR: Quay lại + In phiếu */}
        <div className="ctpp-topbar">
          <button
            type="button"
            className="ctpp-btn-back"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={16} />
            Quay lại danh sách
          </button>
          <div className="ctpp-topbar-actions">
            <button
              type="button"
              className="ctpp-btn-print"
              onClick={() =>
                alert(`Đang in phiếu xuất kho điện tử ${orderDetail.maPhieu}...`)
              }
            >
              <Printer size={15} />
              In Phiếu Giao Nhận
            </button>
          </div>
        </div>

        {/* ===== HERO CARD (Banner tổng quan) ===== */}
        <div className="ctpp-hero-card">
          <div className="ctpp-hero-left">
            <div className="ctpp-hero-badge">
              <CheckCircle2 size={13} />
              Bàn giao hoàn tất
            </div>
            <h2 className="ctpp-hero-title">
              Phiếu Phân Phối: {orderDetail.maPhieu}
            </h2>
            <p className="ctpp-hero-sub">
              Lập lệnh lúc: <b>{orderDetail.ngayLap}</b> &nbsp;•&nbsp; Kho
              xuất: <b>{orderDetail.sanPham.khoXuat}</b>
            </p>
          </div>

          <div className="ctpp-hero-right">
            <div className="ctpp-txhash-box">
              <QrCode size={24} color="#86efac" />
              <div>
                <span className="ctpp-txhash-label">Mã xác thực Blockchain</span>
                <span className="ctpp-txhash-value">{orderDetail.txHash}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== 4 Ô STATS đối chiếu số lượng ===== */}
        <div className="ctpp-stats-row">
          <div className="ctpp-stat-box">
            <span className="ctpp-stat-label">Khối lượng xuất kho</span>
            <div>
              <span className="ctpp-stat-value">
                {orderDetail.sanPham.soLuongXuat}
              </span>
              <span className="ctpp-stat-unit"> kg</span>
            </div>
            <span className="ctpp-stat-badge info">
              <Package size={11} />
              {orderDetail.sanPham.quyCach}
            </span>
          </div>

          <div className="ctpp-stat-box">
            <span className="ctpp-stat-label">Khối lượng thực nhận</span>
            <div>
              <span className="ctpp-stat-value green">
                {orderDetail.sanPham.soLuongThucNhan}
              </span>
              <span className="ctpp-stat-unit"> kg</span>
            </div>
            <span className="ctpp-stat-badge success">
              <CheckCircle2 size={11} />
              Khớp đầy đủ
            </span>
          </div>

          <div className="ctpp-stat-box">
            <span className="ctpp-stat-label">Hao hụt vận chuyển</span>
            <div>
              <span
                className={`ctpp-stat-value ${haoHutKg > 0 ? "amber" : "green"}`}
              >
                {haoHutKg}
              </span>
              <span className="ctpp-stat-unit"> kg ({haoHutPct}%)</span>
            </div>
            <span
              className={`ctpp-stat-badge ${haoHutKg > 0 ? "warning" : "success"}`}
            >
              <Weight size={11} />
              {haoHutKg === 0 ? "Không hao hụt" : "Có hao hụt"}
            </span>
          </div>

          <div className="ctpp-stat-box">
            <span className="ctpp-stat-label">Đơn giá ước tính</span>
            <div>
              <span className="ctpp-stat-value blue" style={{ fontSize: 17 }}>
                {orderDetail.sanPham.donGiaUocTinh}
              </span>
            </div>
            <span className="ctpp-stat-badge info">
              <CalendarClock size={11} />
              HSD: {orderDetail.sanPham.hanBaoQuan}
            </span>
          </div>
        </div>

        {/* ===== GRID 2 CỘT: Đại lý + Lô hàng ===== */}
        <div className="ctpp-info-grid">
          {/* Cột 1: Đại lý nhận */}
          <div className="ctpp-info-card">
            <div className="ctpp-info-card-title">
              <div className="ctpp-info-card-title-icon blue">
                <Building2 size={16} />
              </div>
              Đơn Vị Đại Lý Tiếp Nhận
            </div>
            <div className="ctpp-field-list">
              <div className="ctpp-field-row">
                <span className="ctpp-field-label">
                  <Building2 size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
                  Tên đại lý:
                </span>
                <span className="ctpp-field-value">{orderDetail.daiLy.ten}</span>
              </div>
              <div className="ctpp-field-row">
                <span className="ctpp-field-label">
                  <User size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
                  Người đại diện:
                </span>
                <span className="ctpp-field-value muted">
                  {orderDetail.daiLy.nguoiDaiDien}
                </span>
              </div>
              <div className="ctpp-field-row">
                <span className="ctpp-field-label">
                  <Phone size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
                  Số điện thoại:
                </span>
                <span className="ctpp-field-value blue">
                  {orderDetail.daiLy.sdt}
                </span>
              </div>
              <div className="ctpp-field-row">
                <span className="ctpp-field-label">
                  <MapPin size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
                  Địa chỉ giao hàng:
                </span>
                <span className="ctpp-field-value muted">
                  {orderDetail.daiLy.diaChi}
                </span>
              </div>
            </div>
          </div>

          {/* Cột 2: Lô hàng nông sản */}
          <div className="ctpp-info-card">
            <div className="ctpp-info-card-title">
              <div className="ctpp-info-card-title-icon green">
                <Package size={16} />
              </div>
              Chi Tiết Lô Hàng Xuất Kho
            </div>
            <div className="ctpp-field-list">
              <div className="ctpp-field-row">
                <span className="ctpp-field-label">Tên sản phẩm:</span>
                <span className="ctpp-field-value">
                  {orderDetail.sanPham.tenSP}
                  <span className="ctpp-tag">{orderDetail.sanPham.maLo}</span>
                </span>
              </div>
              <div className="ctpp-field-row">
                <span className="ctpp-field-label">Tiêu chuẩn chất lượng:</span>
                <span className="ctpp-field-value green">
                  {orderDetail.sanPham.tieuChuan}
                </span>
              </div>
              <div className="ctpp-field-row">
                <span className="ctpp-field-label">Quy cách đóng gói:</span>
                <span className="ctpp-field-value muted">
                  {orderDetail.sanPham.quyCach}
                </span>
              </div>
              <div className="ctpp-field-row">
                <span className="ctpp-field-label">Hạn lưu kho tối đa:</span>
                <span className="ctpp-field-value muted">
                  {orderDetail.sanPham.hanBaoQuan}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== GRID 2 CỘT: Vận chuyển ===== */}
        <div className="ctpp-info-grid">
          {/* Cột 1: Đơn vị giao hàng */}
          <div className="ctpp-info-card">
            <div className="ctpp-info-card-title">
              <div className="ctpp-info-card-title-icon amber">
                <Truck size={16} />
              </div>
              Thông Tin Vận Chuyển
            </div>
            <div className="ctpp-field-list">
              <div className="ctpp-field-row">
                <span className="ctpp-field-label">Đơn vị vận chuyển:</span>
                <span className="ctpp-field-value">
                  {orderDetail.vanChuyen.donVi}
                </span>
              </div>
              <div className="ctpp-field-row">
                <span className="ctpp-field-label">Tài xế & Biển số:</span>
                <span className="ctpp-field-value muted">
                  {orderDetail.vanChuyen.taiXe}{" "}
                  <span className="ctpp-tag">{orderDetail.vanChuyen.bienSo}</span>
                </span>
              </div>
              <div className="ctpp-field-row">
                <span className="ctpp-field-label">SĐT tài xế:</span>
                <span className="ctpp-field-value blue">
                  {orderDetail.vanChuyen.sdtTaiXe}
                </span>
              </div>
              <div className="ctpp-field-row">
                <span className="ctpp-field-label">Giờ xuất kho:</span>
                <span className="ctpp-field-value muted">
                  {orderDetail.vanChuyen.thoiGianXuatKho}
                </span>
              </div>
              <div className="ctpp-field-row">
                <span className="ctpp-field-label">Giờ bàn giao:</span>
                <span className="ctpp-field-value muted">
                  {orderDetail.vanChuyen.thoiGianBanGiao}
                </span>
              </div>
            </div>
          </div>

          {/* Cột 2: Ghi chú điều phối */}
          <div className="ctpp-info-card">
            <div className="ctpp-info-card-title">
              <div className="ctpp-info-card-title-icon slate">
                <FileText size={16} />
              </div>
              Ghi Chú Điều Phối Giao Hàng
            </div>
            <div
              style={{
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: 8,
                padding: "12px 14px",
                fontSize: 13,
                color: "#78350f",
                lineHeight: 1.65,
                fontStyle: "italic",
              }}
            >
              <AlertTriangle
                size={14}
                style={{ marginRight: 6, verticalAlign: "middle", color: "#b45309" }}
              />
              {orderDetail.vanChuyen.ghiChuGiao}
            </div>

            {/* Thống kê nhanh */}
            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <div
                style={{
                  background: "#f0fdf4",
                  borderRadius: 8,
                  padding: "10px 12px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 11, color: "#15803d", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>
                  Hình thức
                </div>
                <div style={{ fontSize: 12.5, color: "#0f172a", fontWeight: 700 }}>
                  {orderDetail.vanChuyen.hinhThuc}
                </div>
              </div>
              <div
                style={{
                  background: "#f0fdf4",
                  borderRadius: 8,
                  padding: "10px 12px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 11, color: "#15803d", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>
                  Kết quả
                </div>
                <div style={{ fontSize: 12.5, color: "#15803d", fontWeight: 700 }}>
                  ✓ Giao đủ hàng
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== TIMELINE HÀNH TRÌNH ===== */}
        <div className="ctpp-section-card">
          <div className="ctpp-section-title">
            <div className="ctpp-section-title-icon">
              <Clock size={17} />
            </div>
            Nhật Ký Hành Trình Giao Hàng
          </div>

          <div className="ctpp-timeline">
            <div className="ctpp-timeline-line" />
            {orderDetail.timeline.map((step, idx) => (
              <div className="ctpp-timeline-item" key={idx}>
                <div
                  className={`ctpp-timeline-dot${step.hoanThanh ? "" : " pending"}`}
                />
                <div>
                  <div className="ctpp-timeline-header">
                    <span className="ctpp-timeline-title">{step.tieuDe}</span>
                    <span className="ctpp-timeline-time">{step.thoiGian}</span>
                    {step.hoanThanh && (
                      <span className="ctpp-status-pill success" style={{ fontSize: 11 }}>
                        <CheckCircle2 size={11} /> Hoàn tất
                      </span>
                    )}
                  </div>
                  <p className="ctpp-timeline-desc">{step.moTa}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChiTietPhanPhoiPage;
