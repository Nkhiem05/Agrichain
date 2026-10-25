import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, ExternalLink, ShieldCheck, Eye } from "lucide-react";
import { fetchDoiSoat, chayDoiSoat } from "../../../api/blockchainApi";
import { TEN_SU_KIEN, TEN_VAI_TRO_KY } from "../xacthucblockchain";

// Tab "Nhật ký & toàn vẹn" của trang quản trị: đối soát THẬT mọi lô có sự kiện với blockchain.
// Mỗi lô được kiểm tra: chuỗi hash trong MySQL liền mạch, dữ liệu gốc (mùa vụ, chỉ số kiểm định,
// lô nguồn) chưa bị sửa, và hash mới nhất trên hợp đồng khớp với sự kiện trong hệ thống.

const TRANG_THAI = {
  VERIFIED: { text: "Khớp blockchain", cls: "success" },
  INCOMPLETE: { text: "Chờ đủ chữ ký", cls: "warning" },
  MISMATCH: { text: "Dữ liệu bị sửa", cls: "danger" },
  BROKEN_CHAIN: { text: "Chuỗi bị đứt", cls: "danger" },
  NOT_CHECKED: { text: "Chưa đối soát", cls: "gray" },
};

const TRANG_THAI_KY = {
  CONFIRMED: { text: "Đã ký", cls: "success" },
  SUBMITTED: { text: "Đã gửi", cls: "info" },
  QUEUED: { text: "Chờ ký", cls: "warning" },
  FAILED: { text: "Lỗi", cls: "danger" },
};

const BO_LOC = [
  { key: "", label: "Tất cả" },
  { key: "LOI", label: "Có sai lệch" },
  { key: "INCOMPLETE", label: "Chờ đủ chữ ký" },
  { key: "VERIFIED", label: "Khớp" },
];

const rutGon = (s, dau = 6, cuoi = 4) =>
  s && s.length > dau + cuoi + 3 ? `${s.slice(0, dau)}...${s.slice(-cuoi)}` : s || "";

const DoiSoatToanVen = () => {
  const [data, setData] = useState(null);
  const [dangTai, setDangTai] = useState(true);
  const [dangChay, setDangChay] = useState(false);
  const [boLoc, setBoLoc] = useState("");
  const [thongBao, setThongBao] = useState({ loai: "", text: "" });

  const taiDuLieu = useCallback(async () => {
    setDangTai(true);
    try {
      setData(await fetchDoiSoat());
    } catch (e) {
      setThongBao({ loai: "loi", text: e.message });
    } finally {
      setDangTai(false);
    }
  }, []);

  useEffect(() => {
    taiDuLieu();
  }, [taiDuLieu]);

  const chay = async () => {
    setDangChay(true);
    setThongBao({ loai: "", text: "" });
    try {
      const kq = await chayDoiSoat();
      setData(kq.data);
      const t = kq.data.thong_ke;
      setThongBao({ loai: t.MISMATCH + t.BROKEN_CHAIN > 0 ? "loi" : "ok", text: kq.message });
    } catch (e) {
      setThongBao({ loai: "loi", text: e.message });
    } finally {
      setDangChay(false);
    }
  };

  const goc = data?.explorer_url ? data.explorer_url.replace(/\/$/, "") : null;
  const linkTx = (tx) => (goc && tx ? `${goc}/tx/${tx}` : null);
  const t = data?.thong_ke || {};
  const soLoi = (t.MISMATCH || 0) + (t.BROKEN_CHAIN || 0);

  const hienThi = useMemo(() => {
    const ds = data?.lo || [];
    if (boLoc === "LOI") return ds.filter((l) => l.integrity_status === "MISMATCH" || l.integrity_status === "BROKEN_CHAIN");
    if (boLoc) return ds.filter((l) => l.integrity_status === boLoc);
    return ds;
  }, [data, boLoc]);

  const lanCuoi = data?.lan_chay_cuoi;

  return (
    <div>
      <div className="sticky-top-section">
        <div className="metrics-row">
          <div className="metric-card">
            <span className="metric-title">Lô được theo dõi</span>
            <div className="metric-number">
              {t.tong ?? "—"} <span className="metric-unit">LÔ</span>
            </div>
          </div>
          <div className="metric-card">
            <span className="metric-title">Khớp blockchain</span>
            <div className="metric-number" style={{ color: "#15803d" }}>
              {t.VERIFIED ?? "—"} <span className="metric-unit">LÔ</span>
            </div>
          </div>
          <div className="metric-card">
            <span className="metric-title">Chờ đủ chữ ký</span>
            <div className="metric-number" style={{ color: "#b45309" }}>
              {t.INCOMPLETE ?? "—"} <span className="metric-unit">LÔ</span>
            </div>
          </div>
          <div className={`metric-card ${soLoi > 0 ? "warn" : ""}`}>
            <span className="metric-title">Có sai lệch</span>
            <div className="metric-number">
              {data ? soLoi : "—"} <span className="metric-unit">LÔ</span>
            </div>
          </div>
        </div>

        <div className={`alert-box ${soLoi > 0 ? "" : "ok"}`}>
          <div>
            <b>Đối soát dữ liệu với blockchain</b>
            <p>
              Kiểm tra từng lô: chuỗi hash trong CSDL liền mạch, dữ liệu gốc (mùa vụ, chỉ số kiểm định,
              lô nguồn) chưa bị sửa, và hash mới nhất trên hợp đồng {rutGon(data?.contract_address)} ({data?.ten_mang || "—"})
              khớp với hệ thống.{" "}
              {lanCuoi
                ? `Lần gần nhất: ${new Date(lanCuoi.thoi_diem).toLocaleString("vi-VN")}, ${lanCuoi.so_lo} lô, ${(lanCuoi.thoi_gian_ms / 1000).toFixed(1)} giây.`
                : "Chưa chạy lần nào kể từ khi khởi động server (trạng thái bên dưới là kết quả xác thực gần nhất của từng lô)."}
              {t.chua_theo_doi > 0 && ` ${t.chua_theo_doi} lô cũ chưa có sự kiện trên blockchain không nằm trong danh sách.`}
            </p>
          </div>
          <button className="btn-primary-action" style={{ whiteSpace: "nowrap" }} onClick={chay} disabled={dangChay || dangTai}>
            <RefreshCw size={15} className={dangChay ? "spin-icon" : ""} />
            {dangChay ? "Đang đối soát..." : "Chạy đối soát ngay"}
          </button>
        </div>

        {thongBao.text && (
          <div
            className={`status-pill ${thongBao.loai === "ok" ? "success" : "danger"}`}
            style={{ display: "block", padding: "10px 14px", marginBottom: 12, whiteSpace: "normal" }}
          >
            {thongBao.text}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {BO_LOC.map((b) => (
            <button
              key={b.key || "all"}
              type="button"
              className={boLoc === b.key ? "btn-primary-action" : "btn-action-view"}
              onClick={() => setBoLoc(b.key)}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="table-container" style={{ marginBottom: 20 }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Mã lô</th>
              <th>Sản phẩm</th>
              <th>Đang giữ lô</th>
              <th>Đã ký</th>
              <th>Kết quả đối soát</th>
              <th>Chi tiết</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {dangTai && (
              <tr>
                <td colSpan={7}>Đang tải...</td>
              </tr>
            )}
            {!dangTai && hienThi.length === 0 && (
              <tr>
                <td colSpan={7}>Không có lô nào ở mục này.</td>
              </tr>
            )}
            {!dangTai &&
              hienThi.map((l) => {
                const tt = TRANG_THAI[l.integrity_status] || { text: l.integrity_status, cls: "gray" };
                return (
                  <tr key={l.ma_lo_nong_san}>
                    <td className="mono">{l.ma_lo_nong_san}</td>
                    <td>{l.ten_san_pham || "—"}</td>
                    <td>
                      {l.nguoi_giu || "—"}
                      {TEN_VAI_TRO_KY[l.vai_tro_nguoi_giu] && (
                        <div style={{ fontSize: 12, color: "#6b7280" }}>{TEN_VAI_TRO_KY[l.vai_tro_nguoi_giu]}</div>
                      )}
                    </td>
                    <td>
                      {l.da_ky}/{l.so_su_kien}
                    </td>
                    <td>
                      <span className={`status-pill ${tt.cls}`}>{tt.text}</span>
                    </td>
                    <td style={{ fontSize: 12.5, color: tt.cls === "danger" ? "#dc2626" : "#6b7280", maxWidth: 380 }}>
                      {l.ly_do.length > 0 ? l.ly_do.join("; ") : l.integrity_status === "VERIFIED" ? "Mọi sự kiện đều khớp" : "—"}
                    </td>
                    <td>
                      <a
                        className="btn-action-view"
                        href={`/chi-tiet-user?malohang=${encodeURIComponent(l.ma_lo_nong_san)}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Mở trang tra cứu của người tiêu dùng"
                      >
                        <Eye size={14} /> Xem
                      </a>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="content-head">
        <div>
          <h2>Nhật ký ký blockchain</h2>
          <p>30 sự kiện truy xuất gần nhất: ai ký, ví nào, giao dịch nào trên {data?.ten_mang || "blockchain"}.</p>
        </div>
      </div>
      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Người ký</th>
              <th>Sự kiện</th>
              <th>Lô</th>
              <th>Trạng thái</th>
              <th>Giao dịch</th>
            </tr>
          </thead>
          <tbody>
            {(data?.nhat_ky || []).length === 0 && !dangTai && (
              <tr>
                <td colSpan={6}>Chưa có sự kiện nào.</td>
              </tr>
            )}
            {(data?.nhat_ky || []).map((e) => {
              const tk = TRANG_THAI_KY[e.blockchain_sync_status] || { text: e.blockchain_sync_status, cls: "gray" };
              const link = linkTx(e.ma_giao_dich_blockchain);
              return (
                <tr key={e.ma_lich_su}>
                  <td>{new Date(e.thoi_diem_xay_ra).toLocaleString("vi-VN")}</td>
                  <td>
                    <b>{e.ho_ten}</b>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      {TEN_VAI_TRO_KY[e.vai_tro] || e.vai_tro}
                      {e.dia_chi_vi_ky ? ` · ${rutGon(e.dia_chi_vi_ky)}` : ""}
                    </div>
                  </td>
                  <td>
                    <ShieldCheck size={13} style={{ verticalAlign: "-2px", color: "#15803d" }} />{" "}
                    {TEN_SU_KIEN[e.loai_hoat_dong] || e.loai_hoat_dong}
                  </td>
                  <td className="mono">{e.ma_lo_nong_san}</td>
                  <td>
                    <span className={`status-pill ${tk.cls}`}>{tk.text}</span>
                  </td>
                  <td className="mono">
                    {link ? (
                      <a href={link} target="_blank" rel="noreferrer">
                        {rutGon(e.ma_giao_dich_blockchain, 8, 6)} <ExternalLink size={11} />
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DoiSoatToanVen;
