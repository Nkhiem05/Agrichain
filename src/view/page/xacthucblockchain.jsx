import React, { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import { fetchXacThuc } from "../../api/blockchainApi";
import "../css/blockchain.css";

// Tên sự kiện hiển thị cho người tiêu dùng
export const TEN_SU_KIEN = {
  HARVEST_CONFIRMED: "Chốt thu hoạch",
  SAMPLING_SEALED: "Niêm phong mẫu kiểm định",
  SAMPLING_CONFIRMED: "Chủ lô xác nhận lấy mẫu",
  CERTIFICATE_ISSUED: "Cấp chứng nhận kiểm định",
  CERTIFICATE_FAILED: "Kết luận kiểm định không đạt",
  CERTIFICATE_REVOKED: "Thu hồi chứng nhận",
  TRANSPORT_ORDERED: "Tạo lệnh bàn giao",
  PICKUP_CONFIRMED: "Vận chuyển lấy hàng",
  DELIVERY_CONFIRMED: "Vận chuyển đến nơi",
  STOCK_IN_CONFIRMED: "Bên nhận xác nhận nhập kho",
  HANDOVER_REJECTED: "Hủy / từ chối bàn giao",
  BATCH_RELATION: "Tạo lô từ lô nguồn",
  PROCESSING_DONE: "Hoàn tất sơ chế",
  PACKAGING_DONE: "Hoàn tất đóng gói",
  DISPATCHED: "Xuất kho cho đại lý",
  DELIVERED_TO_AGENT: "Giao hàng cho đại lý",
  COMPLETE_CONFIRMED: "Hoàn tất",
  RETURN_SHIPPED: "Gửi trả hàng",
  RETURN_RECEIVED: "Nhận lại hàng trả",
  CORRECTION: "Đính chính",
};

// Vai trò của người ký (hiển thị cạnh tên)
export const TEN_VAI_TRO_KY = {
  FARMER_COOP: "Nông dân",
  CERT_AUTHORITY: "Cơ quan kiểm định",
  TRANSPORTER: "Vận chuyển",
  PROCESSOR: "Sơ chế",
  DISTRIBUTOR: "Phân phối",
  RETAILER: "Đại lý",
  ADMIN: "Quản trị",
};

// Khối lượng trên chain (gram, chuỗi số) -> "1.234,5 kg"
const gramSangKg = (g) => {
  const so = Number(g);
  if (!Number.isFinite(so)) return "";
  return `${(so / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 3 })} kg`;
};

export const TRANG_THAI_XAC_THUC = {
  // mau: dùng trên nền sáng; mauNen: dùng trên thẻ nền xanh đậm
  VERIFIED: {
    nhan: "Đã xác thực trên blockchain",
    mau: "#16a34a",
    mauNen: "#86efac",
    ok: true,
  },
  INCOMPLETE: {
    nhan: "Đang chờ đủ chữ ký trên blockchain",
    mau: "#d97706",
    mauNen: "#fcd34d",
    ok: false,
  },
  MISMATCH: {
    nhan: "Dữ liệu KHÔNG khớp blockchain",
    mau: "#dc2626",
    mauNen: "#fca5a5",
    ok: false,
  },
  BROKEN_CHAIN: {
    nhan: "Chuỗi sự kiện bị đứt",
    mau: "#dc2626",
    mauNen: "#fca5a5",
    ok: false,
  },
  NOT_CHECKED: {
    nhan: "Chưa ghi nhận lên blockchain",
    mau: "#6b7280",
    mauNen: "#d1d5db",
    ok: false,
  },
};

export const rutGon = (value, dau = 6, cuoi = 4) =>
  value && value.length > dau + cuoi + 3
    ? `${value.slice(0, dau)}...${value.slice(-cuoi)}`
    : value || "";

// Dùng chung một lần gọi API cho nhiều component trên cùng trang
const boNho = new Map();
const layXacThuc = (maLo) => {
  if (!boNho.has(maLo)) {
    const p = fetchXacThuc(maLo).catch((err) => {
      boNho.delete(maLo);
      throw err;
    });
    boNho.set(maLo, p);
  }
  return boNho.get(maLo);
};

const useXacThuc = (maLo) => {
  const [state, setState] = useState({ loading: true, data: null, error: "" });

  useEffect(() => {
    if (!maLo) return undefined;
    let huy = false;
    setState({ loading: true, data: null, error: "" });
    layXacThuc(maLo)
      .then((data) => !huy && setState({ loading: false, data, error: "" }))
      .catch(
        (err) =>
          !huy && setState({ loading: false, data: null, error: err.message }),
      );
    return () => {
      huy = true;
    };
  }, [maLo]);

  return state;
};

// Huy hiệu ở đầu trang
export const ChuoiKhoiBadge = ({ maLo }) => {
  const { loading, data, error } = useXacThuc(maLo);
  const tt = data && TRANG_THAI_XAC_THUC[data.trang_thai];

  let text = "Đang kiểm tra blockchain...";
  if (!loading && error) text = "Không kiểm tra được blockchain";
  if (!loading && data) {
    text = `${data.ten_mang} • ${data.da_xac_nhan}/${data.so_su_kien} sự kiện đã ký`;
  }

  return (
    <div className="chain-badge">
      <span
        className="pulse-dot"
        style={tt ? { background: tt.mau } : undefined}
      ></span>
      <span>{text}</span>
    </div>
  );
};

// Dòng trạng thái cạnh nút quay lại
export const ChuoiKhoiChip = ({ maLo }) => {
  const { loading, data, error } = useXacThuc(maLo);
  if (loading)
    return <span className="chain-verify-status">Đang xác thực...</span>;
  if (error || !data) {
    return (
      <span className="chain-verify-status" style={{ color: "#6b7280" }}>
        <AlertCircle size={16} /> Chưa xác thực được
      </span>
    );
  }
  const tt = TRANG_THAI_XAC_THUC[data.trang_thai];
  const Icon = tt.ok ? CheckCircle2 : AlertCircle;
  return (
    <span
      className="chain-verify-status"
      style={tt.ok ? undefined : { color: tt.mau }}
    >
      <Icon size={16} /> {tt.nhan}
    </span>
  );
};

// Danh sách sự kiện đã ký của một lô (dùng cho lô đang xem và các lô nguồn trong dòng dõi)
const DanhSachSuKien = ({ suKien, lienKetTx }) => (
  <ol className="bc-events">
    {suKien.map((e) => {
      const link = lienKetTx(e.tx_hash);
      return (
        <li key={e.stt} className={e.trang_thai === "CONFIRMED" ? "" : "bc-pending"}>
          <div className="bc-event-title">
            <ShieldCheck size={14} />
            <span>{TEN_SU_KIEN[e.loai] || e.loai}</span>
          </div>
          <div className="bc-event-meta">
            {new Date(e.thoi_diem).toLocaleString("vi-VN")} • {e.nguoi_ky}
            {TEN_VAI_TRO_KY[e.vai_tro] ? ` (${TEN_VAI_TRO_KY[e.vai_tro]})` : ""}
          </div>
          <div className="bc-event-meta">
            {e.trang_thai === "CONFIRMED" ? (
              <>
                Ví ký {rutGon(e.dia_chi_vi_ky)} •{" "}
                {link ? (
                  <a href={link} target="_blank" rel="noopener noreferrer">
                    Giao dịch {rutGon(e.tx_hash, 8, 6)}
                  </a>
                ) : (
                  <span>Giao dịch {rutGon(e.tx_hash, 8, 6)}</span>
                )}
              </>
            ) : (
              <>{e.trang_thai === "SUBMITTED" ? "Đã gửi, đang chờ blockchain xác nhận" : "Chưa ký lên blockchain"}</>
            )}
          </div>
        </li>
      );
    })}
  </ol>
);

const NHAN_QUAN_HE = {
  SPLIT: "tách ra",
  MERGE: "gộp vào",
  TRANSFORM: "sơ chế / chế biến thành",
};

const giaiDoanLo = {
  RECEIVED: "đã nhập kho",
  DISTRIBUTED: "đã tới điểm bán",
  PACKAGED: "đã đóng gói",
  COMPLETED: "đã bán hết",
};

const kgLo = (v, dv) => {
  const n = Number(v);
  return Number.isFinite(n) ? `${n.toLocaleString("vi-VN", { maximumFractionDigits: 3 })} ${dv || ""}`.trim() : "";
};

// Thẻ chi tiết: kết quả đối chiếu + các sự kiện đã ký
export const XacThucBlockchainCard = ({ maLo }) => {
  const { loading, data, error } = useXacThuc(maLo);

  if (loading) {
    return (
      <div className="blockchain-card">
        <div className="blockchain-card-header">
          <span>XÁC THỰC CHUỖI KHỐI</span>
        </div>
        <p className="bc-muted">Đang đối chiếu với blockchain...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="blockchain-card">
        <div className="blockchain-card-header">
          <span>XÁC THỰC CHUỖI KHỐI</span>
        </div>
        <p className="bc-error">{error || "Không lấy được kết quả xác thực"}</p>
      </div>
    );
  }

  const tt = TRANG_THAI_XAC_THUC[data.trang_thai];
  const goc = data.explorer_url ? data.explorer_url.replace(/\/$/, "") : null;
  const lienKetTx = (tx) => (goc && tx ? `${goc}/tx/${tx}` : null);
  const lienKetHopDong =
    goc && data.contract_address ? `${goc}/address/${data.contract_address}` : null;
  const tren = data.tren_chain;
  const nguon = data.dong_doi?.lo_nguon || [];
  const con = data.dong_doi?.lo_con || [];
  const nguonTuXa = [...nguon].reverse(); // nông trại trước, lô gần nhất sau

  return (
    <div className="blockchain-card">
      <div className="blockchain-card-header">
        <span>XÁC THỰC CHUỖI KHỐI</span>
        <span className="bc-status" style={{ color: tt.mauNen }}>
          {tt.nhan}
        </span>
      </div>

      {data.ly_do?.length > 0 && (
        <ul className="bc-reasons" style={{ color: tt.mauNen }}>
          {data.ly_do.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}

      <p className="bc-muted" style={{ fontSize: 11.5, lineHeight: 1.5 }}>
        Mỗi bước dưới đây do chính bên liên quan ký bằng ví riêng. Hệ thống đối chiếu dữ liệu
        lưu trữ với mã băm trên blockchain; dữ liệu bị sửa sẽ không khớp.
      </p>

      {tren?.tonTai && (
        <p className="tx-hash-label" style={{ fontSize: 11.5, lineHeight: 1.6 }}>
          Trên blockchain: khối lượng {gramSangKg(tren.khoiLuongGram)}
          {" • "}
          {tren.khongDat
            ? "lô đã bị kết luận KHÔNG ĐẠT"
            : tren.soChungNhan > 0
              ? tren.chungNhanHopLe
                ? `${tren.soChungNhan} chứng nhận còn hiệu lực`
                : "chứng nhận đã hết hiệu lực hoặc bị thu hồi"
              : "chưa có chứng nhận"}
        </p>
      )}

      <p className="tx-hash-label">Mã băm sự kiện mới nhất:</p>
      <p className="tx-hash-value">{data.hash_moi_nhat || "Chưa có"}</p>

      {/* Hành trình trước đó: các lô nguồn, từ nơi xa nhất (nông trại) tới gần nhất, mỗi lô có chuỗi ký riêng đã được xác thực */}
      {nguon.length > 0 && (
        <div className="bc-lineage" data-testid="bc-lo-nguon">
          <div className="bc-lineage-title">
            Hành trình trước đó ({nguon.length} lô nguồn)
          </div>
          <p className="bc-muted" style={{ fontSize: 11.5, lineHeight: 1.5 }}>
            Lô này được tạo ra từ các lô dưới đây. Mỗi lô có chuỗi chữ ký riêng, được đối chiếu độc lập với blockchain.
          </p>
          {nguonTuXa.map((n) => {
            const xt = n.xac_thuc;
            const tt2 = xt ? TRANG_THAI_XAC_THUC[xt.trang_thai] : null;
            return (
              <details key={n.ma_lo} className="bc-lineage-item" data-lo={n.ma_lo}>
                <summary>
                  <b>Lô {n.ma_lo}</b>
                  <span className="bc-lineage-note">
                    {NHAN_QUAN_HE[n.loai_lien_ket] || "tạo"} {kgLo(n.so_luong, n.don_vi_tinh)} → lô {n.tao_ra_lo}
                  </span>
                  <span className="bc-lineage-state" style={{ color: tt2 ? tt2.mauNen : "#d1d5db" }}>
                    {xt
                      ? xt.so_su_kien > 0
                        ? `${xt.da_xac_nhan}/${xt.so_su_kien} sự kiện • ${tt2.nhan}`
                        : "Lô cũ, chưa theo dõi trên blockchain"
                      : "Không kiểm tra được"}
                  </span>
                </summary>
                {xt?.ly_do?.length > 0 && (
                  <ul className="bc-reasons" style={{ color: tt2 ? tt2.mauNen : undefined }}>
                    {xt.ly_do.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                )}
                {xt?.su_kien?.length > 0 && <DanhSachSuKien suKien={xt.su_kien} lienKetTx={lienKetTx} />}
              </details>
            );
          })}
        </div>
      )}

      {nguon.length > 0 && data.su_kien.length > 0 && (
        <div className="bc-lineage-title" style={{ marginTop: 14 }}>
          Các bước của chính lô {maLo}
        </div>
      )}

      {data.su_kien.length > 0 && <DanhSachSuKien suKien={data.su_kien} lienKetTx={lienKetTx} />}

      {/* Hành trình tiếp theo: các lô con đã tách / gộp / chế biến ra từ lô này */}
      {con.length > 0 && (
        <div className="bc-lineage" data-testid="bc-lo-con">
          <div className="bc-lineage-title">Hành trình tiếp theo ({con.length} lô con)</div>
          <p className="bc-muted" style={{ fontSize: 11.5, lineHeight: 1.5 }}>
            Hàng của lô này đã được chia / chuyển thành các lô dưới đây. Xem mã lô con để biết hàng đi tiếp tới đâu.
          </p>
          <ul className="bc-lineage-list">
            {con.map((c) => (
              <li key={c.ma_lo} data-lo={c.ma_lo}>
                <b>Lô {c.ma_lo}</b>
                <span className="bc-lineage-note">
                  {NHAN_QUAN_HE[c.loai_lien_ket] || "tạo"} {kgLo(c.so_luong, c.don_vi_tinh)}
                  {c.tao_tu_lo !== maLo ? ` (từ lô ${c.tao_tu_lo})` : ""}
                </span>
                <span className="bc-lineage-note">
                  {c.nguoi_giu}
                  {TEN_VAI_TRO_KY[c.vai_tro_nguoi_giu] ? ` (${TEN_VAI_TRO_KY[c.vai_tro_nguoi_giu]})` : ""}
                  {giaiDoanLo[c.giai_doan] ? ` • ${giaiDoanLo[c.giai_doan]}` : ""}
                  {c.so_su_kien > 0 ? ` • ${c.da_ky}/${c.so_su_kien} sự kiện đã ký` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="blockchain-card-footer">
        <span>
          Đã ký {data.da_xac_nhan}/{data.so_su_kien} sự kiện
        </span>
        {lienKetHopDong ? (
          <a href={lienKetHopDong} target="_blank" rel="noopener noreferrer" style={{ color: "#bbf7d0" }}>
            {data.ten_mang} • Hợp đồng {rutGon(data.contract_address)}
          </a>
        ) : (
          <span>{data.ten_mang}</span>
        )}
      </div>
    </div>
  );
};

export default XacThucBlockchainCard;
