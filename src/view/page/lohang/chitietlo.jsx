import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import QRCode from "qrcode";
import { ArrowLeft, Copy, Download, ExternalLink, Printer, Loader2, AlertCircle } from "lucide-react";
import { fetchChiTietUser } from "../../../api/chitietuserApi";
import { XacThucBlockchainCard, ChuoiKhoiChip } from "../xacthucblockchain";
import "../../css/chitietlo.css";

const KHOA_DIA_CHI = "agrichain_dia_chi_qr";

const TEN_GIAI_DOAN = {
  CREATED: "Mới tạo",
  HARVESTED: "Đã thu hoạch",
  IN_TRANSIT: "Đang vận chuyển",
  RECEIVED: "Đã nhập kho",
  PROCESSING: "Đang sơ chế",
  PROCESSED: "Đã sơ chế",
  PACKAGED: "Đã đóng gói",
  DISTRIBUTED: "Đã tới điểm bán",
  COMPLETED: "Đã bán hết",
};

// Địa chỉ gốc của website ghi trong mã QR. Mặc định là địa chỉ đang mở trang; điện thoại quét được thì địa chỉ này
// phải truy cập được từ điện thoại (IP máy tính trong mạng LAN hoặc tên miền), không dùng localhost.
const layDiaChiGoc = () => {
  try {
    return localStorage.getItem(KHOA_DIA_CHI) || window.location.origin;
  } catch {
    return window.location.origin;
  }
};

const ChiTietLoPage = () => {
  const navigate = useNavigate();
  const { maLo } = useParams();
  const [data, setData] = useState(null);
  const [loi, setLoi] = useState("");
  const [dangTai, setDangTai] = useState(true);
  const [diaChiGoc, setDiaChiGoc] = useState(layDiaChiGoc);
  const [anhQr, setAnhQr] = useState("");
  const [daChep, setDaChep] = useState(false);
  const anhIn = useRef(null);

  // Chỉ người đã đăng nhập mới vào trang này (người mua xem bằng trang tra cứu công khai)
  useEffect(() => {
    if (!localStorage.getItem("user")) navigate("/dang-nhap");
  }, [navigate]);

  useEffect(() => {
    let huy = false;
    setDangTai(true);
    setLoi("");
    fetchChiTietUser(maLo)
      .then((kq) => !huy && setData(kq))
      .catch((e) => !huy && setLoi(e.message))
      .finally(() => !huy && setDangTai(false));
    return () => {
      huy = true;
    };
  }, [maLo]);

  const diaChiSach = diaChiGoc.trim().replace(/\/+$/, "");
  const lienKet = useMemo(
    () => `${diaChiSach}/chi-tiet-user?malohang=${encodeURIComponent(maLo || "")}`,
    [diaChiSach, maLo],
  );
  const dangDungLocalhost = /\/\/(localhost|127\.0\.0\.1)/i.test(diaChiSach);

  useEffect(() => {
    if (!maLo || !/^https?:\/\//i.test(diaChiSach)) {
      setAnhQr("");
      return;
    }
    let huy = false;
    QRCode.toDataURL(lienKet, { width: 1024, margin: 2, errorCorrectionLevel: "M" })
      .then((url) => !huy && setAnhQr(url))
      .catch(() => !huy && setAnhQr(""));
    return () => {
      huy = true;
    };
  }, [lienKet, maLo, diaChiSach]);

  const luuDiaChi = (v) => {
    setDiaChiGoc(v);
    try {
      localStorage.setItem(KHOA_DIA_CHI, v);
    } catch {
      /* không lưu được thì thôi */
    }
  };

  const taiAnh = () => {
    if (!anhQr) return;
    const a = document.createElement("a");
    a.href = anhQr;
    a.download = `QR-${maLo}.png`;
    a.click();
  };

  const chepLienKet = async () => {
    try {
      await navigator.clipboard.writeText(lienKet);
      setDaChep(true);
      setTimeout(() => setDaChep(false), 1800);
    } catch {
      window.prompt("Sao chép liên kết:", lienKet);
    }
  };

  const batch = data?.batch;

  return (
    <div className="ctlo-page">
      <header className="ctlo-header">
        <button type="button" className="ctlo-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Quay lại
        </button>
        <span className="ctlo-brand">AGRICHAIN</span>
        <span className="ctlo-chip">
          <ChuoiKhoiChip maLo={maLo} />
        </span>
      </header>

      <main className="ctlo-main">
        {dangTai && (
          <div className="ctlo-center">
            <Loader2 className="animate-spin" size={22} /> Đang tải thông tin lô…
          </div>
        )}
        {!dangTai && loi && (
          <div className="ctlo-center ctlo-loi">
            <AlertCircle size={36} />
            <p>{loi}</p>
          </div>
        )}

        {!dangTai && !loi && (
          <>
            <section className="ctlo-card ctlo-tieude">
              <span className="ctlo-ma">#{batch?.ma_lo_nong_san || maLo}</span>
              <h1>{batch?.ten_san_pham || "Lô nông sản"}</h1>
              <dl className="ctlo-thongtin">
                <div>
                  <dt>Khối lượng hiện tại</dt>
                  <dd>
                    {batch?.so_luong_hien_tai != null
                      ? `${Number(batch.so_luong_hien_tai).toLocaleString("vi-VN")} ${batch?.don_vi_tinh || ""}`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt>Ngày thu hoạch</dt>
                  <dd>{batch?.ngay_thu_hoach ? String(batch.ngay_thu_hoach).slice(0, 10) : "—"}</dd>
                </div>
                <div>
                  <dt>Giai đoạn</dt>
                  <dd>{TEN_GIAI_DOAN[batch?.giai_doan_hien_tai] || batch?.giai_doan_hien_tai || "—"}</dd>
                </div>
                <div>
                  <dt>Chứng nhận</dt>
                  <dd>{data?.audit?.so_chung_nhan || data?.audit?.tieu_chuan_dang_ky || "Chưa có"}</dd>
                </div>
              </dl>
            </section>

            <div className="ctlo-luoi">
              <section className="ctlo-card">
                <h2>Mã QR của lô</h2>
                <p className="ctlo-mota">
                  Dán lên bao bì. Người mua quét bằng camera điện thoại sẽ mở trang truy xuất nguồn gốc của lô này, không cần đăng nhập.
                </p>

                <div className="ctlo-qr-khung">
                  {anhQr ? <img src={anhQr} alt={`Mã QR lô ${maLo}`} className="ctlo-qr" /> : <span className="ctlo-mut">Nhập địa chỉ website hợp lệ (bắt đầu bằng http:// hoặc https://) để tạo mã QR.</span>}
                </div>

                <label className="ctlo-nhan" htmlFor="ctlo-diachi">
                  Địa chỉ website ghi trong mã QR
                </label>
                <input
                  id="ctlo-diachi"
                  className="ctlo-input"
                  value={diaChiGoc}
                  onChange={(e) => luuDiaChi(e.target.value)}
                  placeholder="https://ten-mien-cua-ban.vn hoặc http://192.168.1.10:5173"
                />
                {dangDungLocalhost && (
                  <p className="ctlo-canhbao">
                    Địa chỉ đang là <b>localhost</b>: điện thoại quét sẽ không mở được. Hãy nhập IP của máy chạy web (ví dụ http://192.168.1.10:5173, cả hai thiết bị cùng mạng Wi-Fi) hoặc tên miền thật.
                  </p>
                )}
                <code className="ctlo-lienket">{lienKet}</code>

                <div className="ctlo-nut">
                  <button type="button" onClick={taiAnh} disabled={!anhQr}>
                    <Download size={15} /> Tải ảnh QR
                  </button>
                  <button type="button" onClick={() => window.print()} disabled={!anhQr}>
                    <Printer size={15} /> In nhãn
                  </button>
                  <button type="button" onClick={chepLienKet}>
                    <Copy size={15} /> {daChep ? "Đã chép" : "Chép liên kết"}
                  </button>
                  <a href={lienKet} target="_blank" rel="noreferrer">
                    <ExternalLink size={15} /> Mở trang người mua
                  </a>
                </div>
              </section>

              <section className="ctlo-card">
                <XacThucBlockchainCard maLo={batch?.ma_lo_nong_san || maLo} />
              </section>
            </div>
          </>
        )}
      </main>

      {/* Nhãn chỉ hiện khi in */}
      <div className="ctlo-nhan-in" ref={anhIn}>
        {anhQr && <img src={anhQr} alt="" />}
        <strong>{batch?.ten_san_pham || ""}</strong>
        <span>Mã lô: {maLo}</span>
        <small>Quét mã để xem nguồn gốc sản phẩm</small>
      </div>
    </div>
  );
};

export default ChiTietLoPage;
