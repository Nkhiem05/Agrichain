import React, { useCallback, useEffect, useState } from "react";
import { Wrench, RefreshCw, UserCog, AlertTriangle } from "lucide-react";
import { TEN_SU_KIEN } from "../xacthucblockchain";
import {
  fetchLoKet,
  datLaiSuKien,
  huySuKienChoKy,
  fetchViDoiDuoc,
  kiemTraDoiVi,
  goLienKetViNguoiDung,
} from "../../../api/blockchainApi";

// Hai công cụ quản trị trong mục "Ví blockchain":
//  1. Lô đang chờ ký: xem vì sao chưa tiến lên, cho ký lại giao dịch lỗi / kẹt, hủy yêu cầu mà người dùng bỏ dở.
//  2. Đổi ví người dùng: kiểm tra việc dang dở gắn với ví cũ, gỡ liên kết để họ liên kết ví mới.
// Không sửa gì đã nằm trên blockchain; hợp đồng không có hàm chuyển chủ lô nên lô đang thuộc ví cũ sẽ chặn việc đổi ví.

const MUC = {
  loi: { text: "Lỗi", cls: "danger" },
  ket: { text: "Kẹt", cls: "warning" },
  cho: { text: "Đang chờ ký", cls: "info" },
};

const TEN_VAI_TRO = {
  FARMER_COOP: "Nông dân / HTX",
  CERT_AUTHORITY: "Cơ quan kiểm định",
  TRANSPORTER: "Đơn vị vận chuyển",
  PROCESSOR: "Cơ sở sơ chế",
  DISTRIBUTOR: "Nhà phân phối",
  RETAILER: "Đại lý",
};

const rutGon = (s, dau = 6, cuoi = 4) =>
  s && s.length > dau + cuoi + 3 ? `${s.slice(0, dau)}...${s.slice(-cuoi)}` : s || "";

const phut = (p) => (p < 60 ? `${p} phút` : p < 1440 ? `${Math.floor(p / 60)} giờ` : `${Math.floor(p / 1440)} ngày`);

const loiNgan = (e) => {
  if (e?.code === "ACTION_REJECTED" || e?.code === 4001) return "Bạn đã từ chối trong MetaMask";
  return e?.reason || e?.shortMessage || e?.message || "Có lỗi xảy ra";
};

const QuanTriLoKet = ({ layHopDongAdmin, sanSangKy, onThongBao, onXong, linkExplorer }) => {
  const [loKet, setLoKet] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [dangXuLy, setDangXuLy] = useState("");

  const [dsVi, setDsVi] = useState([]);
  const [chonNguoi, setChonNguoi] = useState("");
  const [kiemTra, setKiemTra] = useState(null);
  const [lyDo, setLyDo] = useState("");
  const [chapNhan, setChapNhan] = useState(false);
  const [ketQuaGo, setKetQuaGo] = useState(null);

  const taiLai = useCallback(async () => {
    setDangTai(true);
    try {
      const [ket, vi] = await Promise.all([fetchLoKet(), fetchViDoiDuoc()]);
      setLoKet(ket);
      setDsVi(vi);
    } catch (e) {
      onThongBao({ loai: "loi", text: loiNgan(e) });
    } finally {
      setDangTai(false);
    }
  }, [onThongBao]);

  useEffect(() => {
    taiLai();
  }, [taiLai]);

  const chay = async (khoa, fn) => {
    setDangXuLy(khoa);
    onThongBao({ loai: "", text: "" });
    try {
      await fn();
    } catch (e) {
      onThongBao({ loai: "loi", text: loiNgan(e) });
    } finally {
      setDangXuLy("");
    }
  };

  const datLai = (ev) =>
    chay(`dl-${ev.ma_lich_su}`, async () => {
      const kq = await datLaiSuKien(ev.ma_lich_su);
      onThongBao({ loai: "ok", text: kq.message });
      await taiLai();
    });

  const huy = (lo, ev) =>
    chay(`huy-${ev.ma_lich_su}`, async () => {
      const ten = TEN_SU_KIEN[ev.loai] || ev.loai;
      if (
        !window.confirm(
          `Hủy yêu cầu "${ten}" của lô ${lo.ma_lo}?\n\nDữ liệu lô giữ nguyên như trước khi ${ev.ten_nguoi_ky} bấm. Họ có thể bấm làm lại bước này.`,
        )
      )
        return;
      const kq = await huySuKienChoKy(ev.ma_lich_su);
      onThongBao({ loai: "ok", text: kq.message });
      await taiLai();
    });

  const chonVaKiemTra = (maNguoiDung) => {
    setChonNguoi(maNguoiDung);
    setKiemTra(null);
    setKetQuaGo(null);
    setChapNhan(false);
    if (!maNguoiDung) return;
    chay("kt-vi", async () => setKiemTra(await kiemTraDoiVi(maNguoiDung)));
  };

  const goVi = () =>
    chay("go-vi", async () => {
      if (!window.confirm(`Gỡ ví ${rutGon(kiemTra.dia_chi_vi, 8, 6)} của ${kiemTra.ho_ten}?\nHọ sẽ phải liên kết ví mới rồi chờ bạn duyệt lại.`)) return;
      const kq = await goLienKetViNguoiDung(chonNguoi, lyDo.trim(), chapNhan);
      setKetQuaGo(kq.data);
      onThongBao({ loai: "ok", text: kq.message });
      setKiemTra(null);
      setChonNguoi("");
      setLyDo("");
      setChapNhan(false);
      await taiLai();
      if (onXong) onXong();
    });

  const thuHoiVaiTro = () =>
    chay("thu-hoi", async () => {
      const contract = await layHopDongAdmin();
      const tx = await contract.setRole(ketQuaGo.dia_chi_cu, 0);
      await tx.wait();
      setKetQuaGo({ ...ketQuaGo, vai_tro_con_tren_chain: 0 });
      onThongBao({ loai: "ok", text: "Đã thu hồi vai trò của ví cũ trên blockchain" });
      if (onXong) onXong();
    });

  const daThuHoi = ketQuaGo && !Number(ketQuaGo.vai_tro_con_tren_chain);

  return (
    <>
      {/* 1. Lô đang chờ ký */}
      <div className="table-container" style={{ padding: 16, marginBottom: 16 }} data-testid="lo-ket">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              <Wrench size={16} /> Lô đang chờ ký / bị kẹt
            </div>
            <div style={{ fontSize: 12.5, marginTop: 4, color: "#6b7280" }}>
              Liệt kê mọi lô còn bước chưa ký xong, kèm lý do. "Cho ký lại" đưa giao dịch lỗi hoặc kẹt về hàng chờ. "Hủy yêu cầu"
              dùng khi người dùng bấm rồi bỏ dở: dữ liệu lô vẫn nguyên như trước khi họ bấm.
            </div>
          </div>
          <button type="button" className="btn-action-view" style={{ whiteSpace: "nowrap" }} onClick={taiLai} disabled={dangTai}>
            <RefreshCw size={14} /> Tải lại
          </button>
        </div>

        {loKet.length === 0 ? (
          <div style={{ marginTop: 12, fontSize: 13.5, color: "#16a34a" }}>
            {dangTai ? "Đang tải..." : "Không có lô nào đang chờ ký. Mọi sự kiện đã lên blockchain."}
          </div>
        ) : (
          loKet.map((lo) => {
            const m = MUC[lo.muc] || MUC.cho;
            return (
              <div key={lo.ma_lo} data-lo={lo.ma_lo} style={{ marginTop: 12, border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <strong className="mono">{lo.ma_lo}</strong>
                  <span className={`status-pill ${m.cls}`}>{m.text}</span>
                  <span style={{ fontSize: 13, color: "#374151" }}>{lo.tom_tat}</span>
                </div>
                <table className="admin-table" style={{ marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th>Bước</th>
                      <th>Sự kiện</th>
                      <th>Người ký</th>
                      <th>Tình trạng</th>
                      <th style={{ textAlign: "center" }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lo.su_kien.map((ev) => {
                      const mm = MUC[ev.muc] || MUC.cho;
                      const linkTx = linkExplorer(ev.tx_hash);
                      return (
                        <tr key={ev.ma_lich_su}>
                          <td>#{ev.stt}</td>
                          <td>{TEN_SU_KIEN[ev.loai] || ev.loai}</td>
                          <td>
                            {ev.ten_nguoi_ky}
                            <div style={{ fontSize: 11.5, color: "#6b7280" }}>{TEN_VAI_TRO[ev.vai_tro] || ev.vai_tro}</div>
                          </td>
                          <td style={{ maxWidth: 380 }}>
                            <span className={`status-pill ${mm.cls}`}>{ev.trang_thai === "QUEUED" ? "Chờ ký" : ev.trang_thai === "SUBMITTED" ? "Đã gửi" : "Lỗi"}</span>
                            <div style={{ fontSize: 12.5, marginTop: 4 }}>
                              {ev.chan_doan} · chờ {phut(ev.so_phut_cho)}
                            </div>
                            {linkTx && (
                              <a href={linkTx} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                                xem giao dịch
                              </a>
                            )}
                          </td>
                          <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                            {ev.co_the_dat_lai && (
                              <button type="button" className="btn-action-retry" disabled={Boolean(dangXuLy)} onClick={() => datLai(ev)}>
                                {dangXuLy === `dl-${ev.ma_lich_su}` ? "Đang xử lý..." : "Cho ký lại"}
                              </button>
                            )}{" "}
                            <button
                              type="button"
                              className="btn-action-view"
                              disabled={Boolean(dangXuLy) || !ev.co_the_huy}
                              title={ev.co_the_huy ? "Hủy yêu cầu chờ ký này" : ev.ly_do_khong_huy}
                              onClick={() => huy(lo, ev)}
                            >
                              Hủy yêu cầu
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })
        )}
      </div>

      {/* 2. Đổi ví người dùng */}
      <div className="table-container" style={{ padding: 16, marginBottom: 16 }} data-testid="doi-vi">
        <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          <UserCog size={16} /> Đổi ví cho người dùng
        </div>
        <div style={{ fontSize: 12.5, marginTop: 4, color: "#6b7280" }}>
          Dùng khi người dùng mất / đổi ví MetaMask. Bạn gỡ ví cũ, họ đăng nhập và tự liên kết ví mới bằng chữ ký, rồi bạn duyệt lại vai trò.
          Hợp đồng không có hàm chuyển chủ lô, nên lô còn hàng đang thuộc ví cũ trên blockchain sẽ chặn việc đổi.
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={chonNguoi}
            onChange={(e) => chonVaKiemTra(e.target.value)}
            disabled={Boolean(dangXuLy)}
            aria-label="Chọn người dùng cần đổi ví"
            style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", minWidth: 280 }}
          >
            <option value="">-- Chọn người dùng --</option>
            {dsVi.map((v) => (
              <option key={v.ma_nguoi_dung} value={v.ma_nguoi_dung}>
                {v.ho_ten} · {TEN_VAI_TRO[v.vai_tro] || v.vai_tro} · {rutGon(v.dia_chi_vi)}
              </option>
            ))}
          </select>
        </div>

        {kiemTra && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13.5 }}>
              Ví hiện tại: <span className="mono">{kiemTra.dia_chi_vi}</span>
            </div>
            {kiemTra.van_de.length === 0 ? (
              <div style={{ marginTop: 6, fontSize: 13.5, color: "#16a34a" }}>Không có việc dang dở, đổi ví được ngay.</div>
            ) : (
              <div style={{ marginTop: 8, padding: 10, background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8 }}>
                <div style={{ fontWeight: 600, display: "flex", gap: 6, alignItems: "center", fontSize: 13.5 }}>
                  <AlertTriangle size={15} /> Còn {kiemTra.van_de.length} việc dang dở gắn với ví cũ
                </div>
                <ul style={{ margin: "6px 0 0 18px", fontSize: 13 }}>
                  {kiemTra.van_de.map((v, i) => (
                    <li key={i}>{v.mo_ta}</li>
                  ))}
                </ul>
                <label style={{ display: "flex", gap: 6, alignItems: "flex-start", marginTop: 8, fontSize: 13 }}>
                  <input type="checkbox" checked={chapNhan} onChange={(e) => setChapNhan(e.target.checked)} style={{ marginTop: 3 }} />
                  <span>
                    Tôi hiểu các việc trên sẽ không ký tiếp được bằng ví mới (chỉ chọn khi ví cũ đã mất hẳn). Dữ liệu đã nằm trên blockchain vẫn xác thực bình thường.
                  </span>
                </label>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <input
                type="text"
                value={lyDo}
                onChange={(e) => setLyDo(e.target.value)}
                placeholder="Lý do đổi ví (bắt buộc)"
                aria-label="Lý do đổi ví"
                style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", minWidth: 280, flex: 1 }}
              />
              <button
                type="button"
                className="btn-primary-action"
                onClick={goVi}
                disabled={Boolean(dangXuLy) || lyDo.trim().length < 5 || (kiemTra.van_de.length > 0 && !chapNhan)}
              >
                {dangXuLy === "go-vi" ? "Đang gỡ..." : "Gỡ ví cũ"}
              </button>
            </div>
          </div>
        )}

        {ketQuaGo && (
          <div style={{ marginTop: 12, padding: 10, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, fontSize: 13.5 }}>
            Đã gỡ ví cũ <span className="mono">{rutGon(ketQuaGo.dia_chi_cu, 8, 6)}</span> của {ketQuaGo.ho_ten}. Bước tiếp theo:
            <ol style={{ margin: "6px 0 0 18px" }}>
              <li>{ketQuaGo.ho_ten} đăng nhập, vào mục Ký blockchain và liên kết ví mới.</li>
              <li>Bạn duyệt ví mới ở danh sách "Chờ duyệt" bên dưới.</li>
              <li>
                {daThuHoi ? (
                  "Ví cũ đã hết vai trò trên blockchain."
                ) : (
                  <>
                    Nên thu hồi vai trò của ví cũ trên blockchain (ví cũ còn vai trò, ai giữ ví đó vẫn ký được).{" "}
                    <button type="button" className="btn-action-view" onClick={thuHoiVaiTro} disabled={Boolean(dangXuLy) || !sanSangKy}>
                      {dangXuLy === "thu-hoi" ? "Đang ký..." : "Thu hồi vai trò ví cũ"}
                    </button>
                  </>
                )}
              </li>
            </ol>
          </div>
        )}
      </div>
    </>
  );
};

export default QuanTriLoKet;
