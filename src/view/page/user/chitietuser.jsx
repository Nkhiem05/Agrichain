import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import {
  Sprout,
  Award,
  Package,
  Store,
  Truck,
  ShoppingBag,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Maximize2,
} from "lucide-react";
import "../../css/chitietuser.css";
import { fetchChiTietUser } from "../../../api/chitietuserApi";
import { ChuoiKhoiChip, XacThucBlockchainCard } from "../xacthucblockchain";

// Địa chỉ gốc của website ghi trong mã QR (dùng chung với trang chi tiết lô: cùng khóa lưu trong trình duyệt).
// Mặc định là địa chỉ đang mở trang; điện thoại quét được thì địa chỉ này phải truy cập được từ điện thoại
// (IP máy tính trong mạng LAN hoặc tên miền), không dùng localhost.
const KHOA_DIA_CHI = "agrichain_dia_chi_qr";
const layDiaChiGoc = () => {
  try {
    return localStorage.getItem(KHOA_DIA_CHI) || window.location.origin;
  } catch {
    return window.location.origin;
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return "Chưa cập nhật";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("vi-VN");
};

const NHAN_TRANG_THAI_VAN_DON = {
  CHO_CHAP_NHAN: "Chờ đơn vị vận chuyển chấp nhận",
  CHO_LAY_HANG: "Chờ lấy hàng",
  DANG_VAN_CHUYEN: "Đang vận chuyển",
  CHO_TIEP_NHAN: "Đã đến nơi, chờ bên nhận xác nhận",
  HOAN_THANH: "Đã giao và được tiếp nhận",
  TU_CHOI: "Bị từ chối, hàng trả về bên gửi",
  DANG_TRA_HANG: "Bị từ chối, đang chở trả về bên gửi",
  DA_TRA_LAI: "Đã trả hàng về bên gửi",
};
const NHAN_TRANG_THAI_PHIEU = {
  CHO_XUAT: "Chờ xuất kho",
  DANG_GIAO: "Đang giao",
  DA_GIAO: "Đã giao",
};

const dinhDangKhoiLuong = (v, dv) =>
  v === null || v === undefined || v === ""
    ? "Chưa cập nhật"
    : `${Number(v).toLocaleString("vi-VN")} ${dv || ""}`.trim();

// Xếp lệnh vận chuyển vào chặng: 1 = nông trại → sơ chế, 2 = sơ chế → nhà phân phối, 3 = nhà phân phối → đại lý
const timChang = (s) => {
  if (s.vai_tro_ben_nhan === "PROCESSOR") return 1;
  if (s.vai_tro_ben_nhan === "DISTRIBUTOR") return 2;
  if (s.vai_tro_ben_nhan === "RETAILER") return 3;
  if (s.vai_tro_ben_gui === "FARMER_COOP") return 1;
  if (s.vai_tro_ben_gui === "PROCESSOR") return 2;
  if (s.vai_tro_ben_gui === "DISTRIBUTOR") return 3;
  return 0;
};

// Một chặng vận chuyển trong dòng đời sản phẩm
const BuocVanChuyen = ({ so, tieuDe, lenh }) => (
  <div className="timeline-step">
    <span className="timeline-step-dot dot-transport"></span>
    <div className="timeline-step-title">
      <Truck size={16} color="#0891b2" /> {so}. {tieuDe}
    </div>
    {lenh.map((s) => (
      <div key={s.ma_van_don}>
        <p className="transport-info-highlight">
          {s.ten_don_vi_van_chuyen}: {s.ten_ben_gui || "Bên gửi"} ➔{" "}
          {s.ten_ben_nhan || s.dia_chi_giao_hang || "Điểm nhận"}
        </p>
        <div className="step-card-box bg-transport">
          <p>
            • Tài xế: {s.ten_tai_xe || "Chưa phân công"} (Biển số:{" "}
            {s.bien_so_xe || "N/A"})
          </p>
          <p>
            • Xuất phát: {formatDate(s.thoi_gian_xuat)} • Khối lượng:{" "}
            {dinhDangKhoiLuong(s.khoi_luong, s.don_vi_tinh)}
            {s.khoi_luong_nhan !== null && s.khoi_luong_nhan !== undefined
              ? ` → thực nhận ${dinhDangKhoiLuong(s.khoi_luong_nhan, s.don_vi_tinh)}`
              : ""}
          </p>
          <p>
            • Trạng thái:{" "}
            {NHAN_TRANG_THAI_VAN_DON[s.trang_thai] || s.trang_thai}
          </p>
        </div>
      </div>
    ))}
  </div>
);

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
  const [diaChiGoc, setDiaChiGoc] = useState(layDiaChiGoc);
  const [anhQr, setAnhQr] = useState("");
  const [showQrModal, setShowQrModal] = useState(false);

  // Mã QR của chính trang này: quét bằng điện thoại sẽ mở đúng trang truy xuất của lô
  const diaChiSach = diaChiGoc.trim().replace(/\/+$/, "");
  const lienKet = useMemo(
    () =>
      `${diaChiSach}/chi-tiet-user?malohang=${encodeURIComponent(currentBatchCode)}`,
    [diaChiSach, currentBatchCode],
  );
  const dangDungLocalhost = /\/\/(localhost|127\.0\.0\.1)/i.test(diaChiSach);

  useEffect(() => {
    if (!currentBatchCode || !/^https?:\/\//i.test(diaChiSach)) {
      setAnhQr("");
      return undefined;
    }
    let huy = false;
    QRCode.toDataURL(lienKet, {
      width: 512,
      margin: 1,
      errorCorrectionLevel: "M",
    })
      .then((url) => !huy && setAnhQr(url))
      .catch(() => !huy && setAnhQr(""));
    return () => {
      huy = true;
    };
  }, [lienKet, currentBatchCode, diaChiSach]);

  const doiDiaChi = () => {
    const v = window.prompt(
      "Nhập địa chỉ website mà điện thoại truy cập được (ví dụ http://192.168.1.10:5173):",
      diaChiSach,
    );
    if (v && /^https?:\/\/\S+$/i.test(v.trim())) {
      setDiaChiGoc(v.trim());
      try {
        localStorage.setItem(KHOA_DIA_CHI, v.trim());
      } catch {
        /* không lưu được thì thôi */
      }
    } else if (v) {
      alert("Địa chỉ phải bắt đầu bằng http:// hoặc https://");
    }
  };

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

  const { batch, farming, audit, processing, shipping, distribution } = data;

  // Dòng đời đầy đủ: canh tác → kiểm định → vận chuyển → sơ chế → vận chuyển → phân phối → vận chuyển → đại lý
  const chang = { 1: [], 2: [], 3: [] };
  (shipping || []).forEach((s) => {
    const c = timChang(s);
    if (c) chang[c].push(s);
  });
  const phieuXuat = distribution || [];
  const nhaPhanPhoi =
    chang[2][chang[2].length - 1]?.ten_ben_nhan ||
    phieuXuat[0]?.ten_nha_phan_phoi ||
    chang[3][0]?.ten_ben_gui ||
    null;
  const lenhDaiLy = chang[3][chang[3].length - 1] || null;
  const tenDaiLy =
    lenhDaiLy?.ten_ben_nhan ||
    phieuXuat.find((p) => p.ten_dai_ly)?.ten_dai_ly ||
    null;
  const coBuocPhanPhoi =
    chang[2].length > 0 || phieuXuat.length > 0 || Boolean(batch?.vi_tri_luu_kho);
  const coBuocDaiLy = chang[3].length > 0 || Boolean(tenDaiLy);

  const cacBuoc = [];
  if (farming) cacBuoc.push("canhtac");
  if (audit) cacBuoc.push("kiemdinh");
  if (chang[1].length > 0) cacBuoc.push("vc1");
  if (processing) cacBuoc.push("soche");
  if (chang[2].length > 0) cacBuoc.push("vc2");
  if (coBuocPhanPhoi) cacBuoc.push("phanphoi");
  if (chang[3].length > 0) cacBuoc.push("vc3");
  if (coBuocDaiLy) cacBuoc.push("daily");
  const so = (khoa) => cacBuoc.indexOf(khoa) + 1;

  return (
    <div className="trace-page">
      {/* CHI TIẾT SẢN PHẨM TRUY XUẤT */}
      <div className="detail-container">
        <div className="back-bar">
          <button className="back-btn" onClick={handleBack} title="Quay lại">
            <ArrowLeft size={15} />
            <span>Quay lại trang trước</span>
          </button>
        </div>

        <div className="detail-grid">
          {/* THÔNG TIN CHUNG & BLOCKCHAIN */}
          <div className="info-column">
            <div className="timeline-box">
              <div className="batch-code-row">
                <span className="batch-code-label">
                  #{batch?.ma_lo_nong_san}
                </span>
                <ChuoiKhoiChip
                  maLo={batch?.ma_lo_nong_san || currentBatchCode}
                />
              </div>
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

            {/* Xác thực thật: đối chiếu dữ liệu với blockchain, từng bước kèm người ký và giao dịch */}
            <XacThucBlockchainCard
              maLo={batch?.ma_lo_nong_san || currentBatchCode}
            />
          </div>

          {/* DÒNG ĐỜI SẢN PHẨM */}
          <div className="timeline-box">
            <div className="timeline-title-row">
              <h3 className="timeline-header-title">
                Hồ Sơ Dòng Đời Sản Phẩm Minh Bạch
              </h3>

              {/* Mã QR của trang này (giống trang chi tiết mùa vụ): bấm để phóng to */}
              {anhQr && (
                <div className="trace-qr-wrap">
                  <div
                    className="trace-qr-box"
                    onClick={() => setShowQrModal(true)}
                    title="Bấm vào để phóng to mã QR và quét"
                  >
                    <img
                      src={anhQr}
                      alt={`Mã QR lô ${currentBatchCode}`}
                      className="trace-qr-img"
                    />
                    <div className="trace-qr-text">
                      <span className="trace-qr-cap">
                        QR Truy xuất nguồn gốc
                      </span>
                      <span className="trace-qr-code">
                        {batch?.ma_lo_nong_san || currentBatchCode}
                      </span>
                      <button
                        type="button"
                        className="trace-qr-zoom"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowQrModal(true);
                        }}
                      >
                        <Maximize2 size={13} /> Phóng to để quét
                      </button>
                    </div>
                  </div>
                  {dangDungLocalhost && (
                    <button
                      type="button"
                      className="trace-qr-doi"
                      onClick={doiDiaChi}
                    ></button>
                  )}
                </div>
              )}
            </div>

            <div className="timeline-vertical">
              {/* 1. Nông Trại */}
              {farming && (
                <div className="timeline-step">
                  <span className="timeline-step-dot dot-farming"></span>
                  <div className="timeline-step-title">
                    <Sprout size={16} color="#16a34a" /> {so("canhtac")}. Canh Tác & Thu Hoạch
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
                    <Award size={16} color="#9333ea" /> {so("kiemdinh")}. Kiểm Định Chất Lượng
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

              {/* Vận chuyển: nông trại → cơ sở sơ chế */}
              {chang[1].length > 0 && (
                <BuocVanChuyen
                  so={so("vc1")}
                  tieuDe="Vận Chuyển tới Cơ Sở Sơ Chế"
                  lenh={chang[1]}
                />
              )}

              {/* 3. Sơ chế */}
              {processing && (
                <div className="timeline-step">
                  <span className="timeline-step-dot dot-processing"></span>
                  <div className="timeline-step-title">
                    <Package size={16} color="#2563eb" /> {so("soche")}. Sơ Chế & Đóng Gói
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

              {/* Vận chuyển: cơ sở sơ chế → nhà phân phối */}
              {chang[2].length > 0 && (
                <BuocVanChuyen
                  so={so("vc2")}
                  tieuDe="Vận Chuyển tới Nhà Phân Phối"
                  lenh={chang[2]}
                />
              )}

              {/* Phân phối: nhập kho, lưu kho, xuất kho cho đại lý */}
              {coBuocPhanPhoi && (
                <div className="timeline-step">
                  <span className="timeline-step-dot dot-shipping"></span>
                  <div className="timeline-step-title">
                    <Store size={16} color="#d97706" /> {so("phanphoi")}. Phân
                    Phối (Nhà Phân Phối)
                  </div>
                  <p className="shipping-info-highlight">
                    {nhaPhanPhoi || "Nhà phân phối"}
                  </p>
                  <div className="step-card-box bg-shipping">
                    <p>
                      • Kho: {batch?.vi_tri_luu_kho || "Chưa cập nhật"} • Hạn
                      lưu kho: {formatDate(batch?.han_luu_kho)}
                    </p>
                    {phieuXuat.map((p) => (
                      <p key={p.ma_phieu}>
                        • Phiếu xuất kho {p.ma_phieu}:{" "}
                        {dinhDangKhoiLuong(p.so_luong_xuat, p.don_vi_tinh)} ➔{" "}
                        {p.ten_dai_ly || "Đại lý"} •{" "}
                        {NHAN_TRANG_THAI_PHIEU[p.trang_thai] || p.trang_thai}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Vận chuyển: nhà phân phối → đại lý */}
              {chang[3].length > 0 && (
                <BuocVanChuyen
                  so={so("vc3")}
                  tieuDe="Vận Chuyển tới Đại Lý"
                  lenh={chang[3]}
                />
              )}

              {/* Đại lý bán lẻ */}
              {coBuocDaiLy && (
                <div className="timeline-step">
                  <span className="timeline-step-dot dot-retail"></span>
                  <div className="timeline-step-title">
                    <ShoppingBag size={16} color="#db2777" /> {so("daily")}.
                    Đại Lý Bán Lẻ
                  </div>
                  <p className="retail-info-highlight">
                    {tenDaiLy || "Điểm bán lẻ"}
                  </p>
                  <div className="step-card-box bg-retail">
                    <p>
                      • Tiếp nhận:{" "}
                      {lenhDaiLy?.trang_thai === "HOAN_THANH"
                        ? `Đã nhận hàng, khối lượng thực nhận ${dinhDangKhoiLuong(
                            lenhDaiLy.khoi_luong_nhan ?? lenhDaiLy.khoi_luong,
                            lenhDaiLy.don_vi_tinh,
                          )}`
                        : lenhDaiLy
                          ? NHAN_TRANG_THAI_VAN_DON[lenhDaiLy.trang_thai] ||
                            lenhDaiLy.trang_thai
                          : "Chờ giao hàng"}
                    </p>
                    <p>
                      • Tình trạng lô:{" "}
                      {batch?.giai_doan_hien_tai === "COMPLETED"
                        ? "Đã bán hết"
                        : lenhDaiLy?.trang_thai === "HOAN_THANH"
                          ? "Đang bán tại cửa hàng"
                          : "Chưa tới cửa hàng"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* POPUP PHÓNG TO MÃ QR ĐỂ QUÉT */}
      {showQrModal && anhQr && (
        <div
          className="trace-modal-overlay"
          onClick={() => setShowQrModal(false)}
        >
          <div className="trace-qr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="trace-qr-modal-header">
              <h3>Mã QR Lô Nông Sản</h3>
              <button
                type="button"
                className="trace-qr-modal-x"
                onClick={() => setShowQrModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="trace-qr-modal-body">
              <div className="trace-qr-frame">
                <img
                  src={anhQr}
                  alt={`Mã QR lô ${currentBatchCode}`}
                  className="trace-qr-large"
                />
              </div>
              <div className="trace-qr-modal-batch">
                Mã lô: #{batch?.ma_lo_nong_san || currentBatchCode}
              </div>
              <p className="trace-qr-modal-desc">
                Sử dụng camera điện thoại hoặc thiết bị quét QR để truy xuất
                thông tin nhật ký nguồn gốc nông sản
              </p>
            </div>

            <div className="trace-qr-modal-footer">
              <button
                type="button"
                className="trace-qr-btn-close"
                onClick={() => setShowQrModal(false)}
              >
                Đóng
              </button>
              <a
                href={lienKet}
                target="_blank"
                rel="noreferrer"
                className="trace-qr-btn-link"
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

export default TraceDetailPage;
