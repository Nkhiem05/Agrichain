import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Printer,
  CheckCircle2,
  Clock,
  Truck,
  Building2,
  Package,
  FileText,
  AlertTriangle,
  MapPin,
  Phone,
  User,
  Weight,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import "../../css/chitietphanphoi.css";
import {
  fetchDispatchDetail,
  markDispatchShipped,
  markDispatchDelivered,
} from "../../../api/nhaphanphoiApi";

const DEFAULT_LOGO_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png";

const STATUS_LABEL = {
  CHO_XUAT: { text: "Chờ xuất kho", tone: "warning" },
  DANG_GIAO: { text: "Đang trên đường giao", tone: "info" },
  DA_GIAO: { text: "Bàn giao hoàn tất", tone: "success" },
  DA_HUY: { text: "Đã huỷ", tone: "danger" },
};

const ChiTietPhanPhoiPage = () => {
  const navigate = useNavigate();
  const { maPhieu } = useParams();

  const [orderDetail, setOrderDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [acting, setActing] = useState(false);

  const loadDetail = async () => {
    if (!maPhieu) {
      setErrorMsg("Thiếu mã phiếu xuất kho cần xem");
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetchDispatchDetail(maPhieu);
      setOrderDetail(res?.data || null);
    } catch (err) {
      setErrorMsg(err.message || "Không tìm thấy phiếu xuất kho");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maPhieu]);

  const handleMarkShipped = async () => {
    if (!window.confirm(`Xác nhận đã xuất kho phiếu ${orderDetail.ma_phieu}?`))
      return;
    setActing(true);
    try {
      await markDispatchShipped(orderDetail.ma_phieu);
      await loadDetail();
    } catch (err) {
      alert(err.message || "Không thể xác nhận xuất kho");
    } finally {
      setActing(false);
    }
  };

  const handleMarkDelivered = async () => {
    if (
      !window.confirm(
        `Xác nhận đại lý đã nhận đủ hàng cho phiếu ${orderDetail.ma_phieu}?`,
      )
    )
      return;
    setActing(true);
    try {
      await markDispatchDelivered(orderDetail.ma_phieu);
      await loadDetail();
    } catch (err) {
      alert(err.message || "Không thể xác nhận giao hàng");
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="ctpp-page">
        <div style={{ padding: 60, textAlign: "center", color: "#6b7280" }}>
          Đang tải...
        </div>
      </div>
    );
  }

  if (errorMsg || !orderDetail) {
    return (
      <div className="ctpp-page">
        <main className="ctpp-main">
          <button
            type="button"
            className="ctpp-btn-back"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={16} />
            Quay lại danh sách
          </button>
          <div style={{ padding: 40, textAlign: "center", color: "#dc2626" }}>
            {errorMsg || "Không tìm thấy phiếu xuất kho"}
          </div>
        </main>
      </div>
    );
  }

  const statusInfo = STATUS_LABEL[orderDetail.trang_thai] || {
    text: orderDetail.trang_thai,
    tone: "info",
  };

  // Dòng thời gian thật, chỉ dựng từ các mốc đã thực sự xảy ra (không có bên
  // thứ 2 xác nhận số liệu vì đại lý không có tài khoản trong hệ thống).
  const timeline = [
    {
      tieuDe: "Lập phiếu xuất kho",
      thoiGian: orderDetail.created_at
        ? new Date(orderDetail.created_at).toLocaleString("vi-VN")
        : null,
      moTa: `Xuất ${orderDetail.so_luong_xuat} ${orderDetail.don_vi_tinh} lô ${orderDetail.ma_lo_nong_san} cho đại lý ${orderDetail.ten_dai_ly}.`,
      hoanThanh: true,
    },
  ];
  if (orderDetail.thoi_gian_xuat) {
    timeline.push({
      tieuDe: "Đã xuất kho, bắt đầu giao hàng",
      thoiGian: orderDetail.thoi_gian_xuat,
      moTa:
        orderDetail.hinh_thuc === "TU_GIAO"
          ? `${orderDetail.ten_tai_xe || "—"} (${orderDetail.bien_so_xe || "—"})`
          : orderDetail.ten_don_vi_van_chuyen || "—",
      hoanThanh: true,
    });
  }
  if (orderDetail.thoi_gian_giao) {
    timeline.push({
      tieuDe: "Đại lý đã nhận hàng",
      thoiGian: orderDetail.thoi_gian_giao,
      moTa: `Nhà phân phối xác nhận đã bàn giao đủ hàng cho ${orderDetail.ten_dai_ly}.`,
      hoanThanh: true,
    });
  }

  return (
    <div className="ctpp-page">
      <header className="ctpp-header">
        <div className="ctpp-header-left">
          <img src={DEFAULT_LOGO_IMG} alt="Logo" className="ctpp-logo" />
          <span className="ctpp-brand">AGRICHAIN</span>
        </div>
      </header>

      <main className="ctpp-main">
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
              onClick={() => window.print()}
            >
              <Printer size={15} />
              In Phiếu Giao Nhận
            </button>
          </div>
        </div>

        <div className="ctpp-hero-card">
          <div className="ctpp-hero-left">
            <div
              className={`ctpp-status-pill ${statusInfo.tone}`}
              style={{ marginBottom: 10 }}
            >
              <CheckCircle2 size={13} />
              {statusInfo.text}
            </div>
            <h2 className="ctpp-hero-title">
              Phiếu Phân Phối: {orderDetail.ma_phieu}
            </h2>
            <p className="ctpp-hero-sub">
              Lập lệnh lúc:{" "}
              <b>{new Date(orderDetail.created_at).toLocaleString("vi-VN")}</b>
            </p>
          </div>

          <div className="ctpp-hero-right">
            {orderDetail.trang_thai === "CHO_XUAT" && (
              <button
                type="button"
                className="ctpp-btn-print"
                disabled={acting}
                onClick={handleMarkShipped}
              >
                <Truck size={15} />
                Xác Nhận Đã Xuất Kho
              </button>
            )}
            {orderDetail.trang_thai === "DANG_GIAO" && (
              <button
                type="button"
                className="ctpp-btn-print"
                disabled={acting}
                onClick={handleMarkDelivered}
              >
                <CheckCircle2 size={15} />
                Xác Nhận Đã Giao Hàng
              </button>
            )}
          </div>
        </div>

        <div className="ctpp-stats-row">
          <div className="ctpp-stat-box">
            <span className="ctpp-stat-label">Khối lượng xuất kho</span>
            <div>
              <span className="ctpp-stat-value">
                {orderDetail.so_luong_xuat}
              </span>
              <span className="ctpp-stat-unit"> {orderDetail.don_vi_tinh}</span>
            </div>
            <span className="ctpp-stat-badge info">
              <Package size={11} />
              {orderDetail.ma_lo_nong_san}
            </span>
          </div>

          <div className="ctpp-stat-box">
            <span className="ctpp-stat-label">Hình thức giao hàng</span>
            <div>
              <span className="ctpp-stat-value" style={{ fontSize: 17 }}>
                {orderDetail.hinh_thuc === "TU_GIAO"
                  ? "Tự giao xe kho"
                  : "Đơn vị vận chuyển đối tác"}
              </span>
            </div>
            <span className="ctpp-stat-badge info">
              <Weight size={11} />
              {statusInfo.text}
            </span>
          </div>
        </div>

        <div className="ctpp-info-grid">
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
                  <Building2
                    size={12}
                    style={{ marginRight: 4, verticalAlign: "middle" }}
                  />
                  Tên đại lý:
                </span>
                <span className="ctpp-field-value">
                  {orderDetail.ten_dai_ly}
                </span>
              </div>
              <div className="ctpp-field-row">
                <span className="ctpp-field-label">
                  <User
                    size={12}
                    style={{ marginRight: 4, verticalAlign: "middle" }}
                  />
                  Người đại diện:
                </span>
                <span className="ctpp-field-value muted">
                  {orderDetail.dai_ly?.nguoi_lien_he || "—"}
                </span>
              </div>
              <div className="ctpp-field-row">
                <span className="ctpp-field-label">
                  <Phone
                    size={12}
                    style={{ marginRight: 4, verticalAlign: "middle" }}
                  />
                  Số điện thoại:
                </span>
                <span className="ctpp-field-value blue">
                  {orderDetail.dai_ly?.so_dien_thoai || "—"}
                </span>
              </div>
              <div className="ctpp-field-row">
                <span className="ctpp-field-label">
                  <MapPin
                    size={12}
                    style={{ marginRight: 4, verticalAlign: "middle" }}
                  />
                  Địa chỉ giao hàng:
                </span>
                <span className="ctpp-field-value muted">
                  {orderDetail.dai_ly?.dia_chi || "—"}
                </span>
              </div>
            </div>
          </div>

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
                  {orderDetail.ten_san_pham}
                  <span className="ctpp-tag">{orderDetail.ma_lo_nong_san}</span>
                </span>
              </div>
              <div className="ctpp-field-row">
                <span className="ctpp-field-label">Số lượng xuất:</span>
                <span className="ctpp-field-value green">
                  {orderDetail.so_luong_xuat} {orderDetail.don_vi_tinh}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="ctpp-info-grid">
          <div className="ctpp-info-card">
            <div className="ctpp-info-card-title">
              <div className="ctpp-info-card-title-icon amber">
                <Truck size={16} />
              </div>
              Thông Tin Vận Chuyển
            </div>
            <div className="ctpp-field-list">
              {orderDetail.hinh_thuc === "TU_GIAO" ? (
                <>
                  <div className="ctpp-field-row">
                    <span className="ctpp-field-label">Tài xế phụ trách:</span>
                    <span className="ctpp-field-value">
                      {orderDetail.ten_tai_xe || "—"}
                    </span>
                  </div>
                  <div className="ctpp-field-row">
                    <span className="ctpp-field-label">Biển số xe:</span>
                    <span className="ctpp-field-value muted">
                      <span className="ctpp-tag">
                        {orderDetail.bien_so_xe || "—"}
                      </span>
                    </span>
                  </div>
                </>
              ) : (
                <div className="ctpp-field-row">
                  <span className="ctpp-field-label">Đơn vị vận chuyển:</span>
                  <span className="ctpp-field-value">
                    {orderDetail.ten_don_vi_van_chuyen || "—"}
                  </span>
                </div>
              )}
              <div className="ctpp-field-row">
                <span className="ctpp-field-label">Giờ xuất kho:</span>
                <span className="ctpp-field-value muted">
                  {orderDetail.thoi_gian_xuat || "Chưa xuất kho"}
                </span>
              </div>
              <div className="ctpp-field-row">
                <span className="ctpp-field-label">Giờ bàn giao:</span>
                <span className="ctpp-field-value muted">
                  {orderDetail.thoi_gian_giao || "Chưa bàn giao"}
                </span>
              </div>
            </div>
          </div>

          {orderDetail.ghi_chu && (
            <div className="ctpp-info-card">
              <div className="ctpp-info-card-title">
                <div className="ctpp-info-card-title-icon slate">
                  <FileText size={16} />
                </div>
                Ghi Chú
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
                }}
              >
                <AlertTriangle
                  size={14}
                  style={{
                    marginRight: 6,
                    verticalAlign: "middle",
                    color: "#b45309",
                  }}
                />
                {orderDetail.ghi_chu}
              </div>
            </div>
          )}
        </div>

        <div className="ctpp-section-card">
          <div className="ctpp-section-title">
            <div className="ctpp-section-title-icon">
              <Clock size={17} />
            </div>
            Nhật Ký Hành Trình Giao Hàng
          </div>

          <div className="ctpp-timeline">
            <div className="ctpp-timeline-line" />
            {timeline.map((step, idx) => (
              <div className="ctpp-timeline-item" key={idx}>
                <div
                  className={`ctpp-timeline-dot${step.hoanThanh ? "" : " pending"}`}
                />
                <div>
                  <div className="ctpp-timeline-header">
                    <span className="ctpp-timeline-title">{step.tieuDe}</span>
                    <span className="ctpp-timeline-time">{step.thoiGian}</span>
                    {step.hoanThanh && (
                      <span
                        className="ctpp-status-pill success"
                        style={{ fontSize: 11 }}
                      >
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
