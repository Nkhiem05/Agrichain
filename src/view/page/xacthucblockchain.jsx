import React, { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import { fetchXacThuc } from "../api/blockchainApi";
import "../view/css/blockchain.css";

// Tên sự kiện hiển thị cho người tiêu dùng
export const TEN_SU_KIEN = {
  HARVEST_CONFIRMED: "Chốt thu hoạch",
  SAMPLING_SEALED: "Niêm phong mẫu kiểm định",
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
  const lienKetTx = (tx) =>
    data.explorer_url && tx ? `${data.explorer_url}/tx/${tx}` : null;

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

      <p className="tx-hash-label">Mã băm sự kiện mới nhất:</p>
      <p className="tx-hash-value">{data.hash_moi_nhat || "Chưa có"}</p>

      {data.su_kien.length > 0 && (
        <ol className="bc-events">
          {data.su_kien.map((e) => {
            const link = lienKetTx(e.tx_hash);
            return (
              <li
                key={e.stt}
                className={e.trang_thai === "CONFIRMED" ? "" : "bc-pending"}
              >
                <div className="bc-event-title">
                  <ShieldCheck size={14} />
                  <span>{TEN_SU_KIEN[e.loai] || e.loai}</span>
                </div>
                <div className="bc-event-meta">
                  {new Date(e.thoi_diem).toLocaleString("vi-VN")} • {e.nguoi_ky}
                </div>
                <div className="bc-event-meta">
                  {e.trang_thai === "CONFIRMED" ? (
                    <>
                      Ví ký {rutGon(e.dia_chi_vi_ky)} •{" "}
                      {link ? (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Giao dịch {rutGon(e.tx_hash, 8, 6)}
                        </a>
                      ) : (
                        <span>Giao dịch {rutGon(e.tx_hash, 8, 6)}</span>
                      )}
                    </>
                  ) : (
                    <>Chưa ký lên blockchain</>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="blockchain-card-footer">
        <span>
          Đã ký {data.da_xac_nhan}/{data.so_su_kien} sự kiện
        </span>
        <span>{data.ten_mang}</span>
      </div>
    </div>
  );
};

export default XacThucBlockchainCard;
