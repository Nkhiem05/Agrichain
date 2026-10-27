import React, { useCallback, useEffect, useState } from "react";
import { BrowserProvider, Contract } from "ethers";
import { Wallet, RefreshCw, PenLine } from "lucide-react";
import {
  fetchCauHinh,
  fetchViCuaToi,
  taoNonceLienKet,
  lienKetVi,
  fetchChoKy,
  guiVaXacNhanSuKien,
} from "../../api/blockchainApi";
import { TEN_SU_KIEN, rutGon } from "./xacthucblockchain";
import "../css/blockchain.css";

const TRANG_THAI_DUYET = {
  CHO_DUYET: "Đang chờ quản trị viên duyệt",
  DA_DUYET: "Đã được duyệt",
  TU_CHOI: "Bị từ chối",
};

const loiNgan = (e) => {
  if (e?.code === "ACTION_REJECTED" || e?.code === 4001) {
    return "Bạn đã từ chối trong MetaMask";
  }
  return e?.reason || e?.shortMessage || e?.message || "Có lỗi xảy ra";
};

// Mở MetaMask, chuyển đúng mạng, trả về signer (ví đang chọn)
const ketNoiMetaMask = async (cauHinh) => {
  if (!window.ethereum) throw new Error("Chưa cài MetaMask");

  let provider = new BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);

  const mang = await provider.getNetwork();
  if (Number(mang.chainId) !== cauHinh.chainId) {
    const chainIdHex = "0x" + cauHinh.chainId.toString(16);
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }],
      });
    } catch (e) {
      // 4902: ví chưa có mạng này -> thêm mạng
      if (e?.code !== 4902 && e?.data?.originalError?.code !== 4902) throw e;
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainIdHex,
            chainName: cauHinh.tenMang,
            nativeCurrency: {
              name: cauHinh.tienTe,
              symbol: cauHinh.tienTe,
              decimals: 18,
            },
            rpcUrls: [cauHinh.rpcUrl],
            blockExplorerUrls: cauHinh.explorerUrl ? [cauHinh.explorerUrl] : [],
          },
        ],
      });
    }
    provider = new BrowserProvider(window.ethereum); // mạng đã đổi: tạo provider mới
  }

  const signer = await provider.getSigner();
  return { signer, diaChi: await signer.getAddress() };
};

// thongBaoBangAlert: hiện thông báo kết quả bằng alert (thay vì dòng chữ trong khung ví), khung ví chỉ ghi
// "Ví đã kết nối / Chưa kết nối ví", và nút ký của sự kiện chưa đủ điều kiện vẫn bấm được: bấm thì alert lý do.
// Mặc định tắt nên các trang khác dùng khung này không đổi.
const BlockchainPanel = ({ thongBaoBangAlert = false }) => {
  const [cauHinh, setCauHinh] = useState(null);
  const [thongTin, setThongTin] = useState(null);
  const [choKy, setChoKy] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [dangXuLy, setDangXuLy] = useState("");
  const [thongBao, setThongBao] = useState({ loai: "", text: "" });

  const baoLoi = (e) => {
    if (thongBaoBangAlert) alert(loiNgan(e));
    else setThongBao({ loai: "loi", text: loiNgan(e) });
  };
  const baoOk = (text) => {
    if (thongBaoBangAlert) alert(text);
    else setThongBao({ loai: "ok", text });
  };

  const taiDuLieu = useCallback(async () => {
    try {
      const [cfg, tt] = await Promise.all([fetchCauHinh(), fetchViCuaToi()]);
      setCauHinh(cfg);
      setThongTin(tt);

      const daDuyet = tt.vi?.trang_thai_duyet === "DA_DUYET";
      if (daDuyet && tt.vai_tro !== "ADMIN") {
        setChoKy((await fetchChoKy()).su_kien);
      } else {
        setChoKy([]);
      }
    } catch (e) {
      // chưa đăng nhập hoặc server chưa có blockchain: ẩn khối này
      setThongTin(null);
      console.warn("Blockchain panel:", e.message);
    } finally {
      setDangTai(false);
    }
  }, []);

  useEffect(() => {
    taiDuLieu();
  }, [taiDuLieu]);

  // Có sự kiện đã gửi giao dịch, đang chờ blockchain/worker xác nhận: tự tải lại để nút ký hiện lại
  // (khi giao dịch hỏng) hoặc dòng biến mất (khi đã xác nhận)
  const coDangCho = choKy.some((x) => x.trang_thai === "SUBMITTED");
  useEffect(() => {
    if (!coDangCho) return undefined;
    const timer = setInterval(taiDuLieu, 5000);
    return () => clearInterval(timer);
  }, [coDangCho, taiDuLieu]);

  if (dangTai || !thongTin || !thongTin.can_vi) return null;

  const vi = thongTin.vi;
  const laAdmin = thongTin.vai_tro === "ADMIN";

  const chayTacVu = async (khoa, fn) => {
    setDangXuLy(khoa);
    setThongBao({ loai: "", text: "" });
    try {
      await fn();
    } catch (e) {
      baoLoi(e);
      await taiDuLieu(); // trạng thái sự kiện có thể đã đổi (ví dụ đã gửi giao dịch rồi mới lỗi)
    } finally {
      setDangXuLy("");
    }
  };

  const lienKet = () =>
    chayTacVu("lien-ket", async () => {
      const { signer, diaChi } = await ketNoiMetaMask(cauHinh);
      const { thong_diep: thongDiep } = await taoNonceLienKet();
      const chuKy = await signer.signMessage(thongDiep);
      const kq = await lienKetVi(diaChi, chuKy);
      baoOk(kq.message);
      await taiDuLieu();
    });

  // Ký một sự kiện: gọi hàm tương ứng trên contract rồi báo server kiểm tra giao dịch
  const kyMotSuKien = async (item) => {
    const { signer, diaChi } = await ketNoiMetaMask(cauHinh);
    if (diaChi.toLowerCase() !== vi.dia_chi_vi.toLowerCase()) {
      throw new Error(
        `Hãy chọn đúng ví ${rutGon(vi.dia_chi_vi)} trong MetaMask`,
      );
    }
    const contract = new Contract(cauHinh.contractAddress, cauHinh.abi, signer);
    return guiVaXacNhanSuKien(contract, item);
  };

  const ky = (item) =>
    chayTacVu(item.ma_lich_su, async () => {
      const kq = await kyMotSuKien(item);
      baoOk(
        kq === "cho-xac-nhan"
          ? "Đã gửi giao dịch. Blockchain đang xác nhận, hệ thống sẽ tự cập nhật"
          : "Đã ký và ghi lên blockchain",
      );
      await taiDuLieu();
    });

  // Ký lần lượt mọi sự kiện đang sẵn sàng (sự kiện kế tiếp có thể sẵn sàng sau khi ký xong cái trước)
  const kyTatCa = () =>
    chayTacVu("ky-tat-ca", async () => {
      let soDaKy = 0;
      for (let vong = 0; vong < 30; vong++) {
        const ds = (await fetchChoKy()).su_kien.filter((x) => x.san_sang);
        if (ds.length === 0) break;
        for (const item of ds) {
          await kyMotSuKien(item);
          soDaKy++;
        }
      }
      baoOk(
        soDaKy > 0
          ? `Đã ký ${soDaKy} sự kiện`
          : "Không có sự kiện nào sẵn sàng để ký",
      );
      await taiDuLieu();
    });

  const soSanSang = choKy.filter((x) => x.san_sang).length;
  const viDaKetNoi = laAdmin || vi?.trang_thai_duyet === "DA_DUYET";

  const linkGiaoDich = (it) =>
    it.tx_hash &&
    cauHinh?.explorerUrl && (
      <>
        {" "}
        <a
          href={`${cauHinh.explorerUrl.replace(/\/$/, "")}/tx/${it.tx_hash}`}
          target="_blank"
          rel="noreferrer"
        >
          (xem giao dịch)
        </a>
      </>
    );

  return (
    <div className="bc-panel">
      <div className="bc-panel-head">
        <h3>
          <Wallet size={18} /> Ví blockchain
        </h3>
        <button
          type="button"
          className="bc-btn bc-btn-ghost"
          onClick={taiDuLieu}
          title="Tải lại"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {!cauHinh?.daCauHinh && (
        <p className="bc-warn">
          Máy chủ chưa cấu hình contract blockchain (BLOCKCHAIN_CONTRACT_ADDRESS
          hoặc blockchain/deployed-agrichain.json).
        </p>
      )}

      {thongBao.text && (
        <p className={thongBao.loai === "ok" ? "bc-ok" : "bc-error"}>
          {thongBao.text}
        </p>
      )}

      {/* Liên kết ví */}
      <div className="bc-row">
        {thongBaoBangAlert ? (
          <div>
            <div className="bc-label">Trạng thái ví</div>
            {vi && <div className="bc-mono">{vi.dia_chi_vi}</div>}
            <div
              className="bc-muted"
              style={{
                color: viDaKetNoi ? "#16a34a" : "#b45309",
                fontWeight: 600,
              }}
            >
              {viDaKetNoi ? "Ví đã kết nối" : "Chưa kết nối ví"}
            </div>
          </div>
        ) : vi ? (
          <div>
            <div className="bc-label">Ví đã liên kết</div>
            <div className="bc-mono">{vi.dia_chi_vi}</div>
            <div className="bc-muted">
              {laAdmin
                ? "Ví quản trị (admin của contract)"
                : TRANG_THAI_DUYET[vi.trang_thai_duyet]}
            </div>
          </div>
        ) : (
          <div className="bc-muted">
            Bạn chưa liên kết ví. Cần ví MetaMask để ký các bước truy xuất nguồn
            gốc của mình.
          </div>
        )}
        {(!vi || vi.trang_thai_duyet !== "DA_DUYET") && (
          <button
            type="button"
            className="bc-btn"
            onClick={lienKet}
            disabled={dangXuLy === "lien-ket" || !cauHinh?.daCauHinh}
          >
            {dangXuLy === "lien-ket"
              ? "Đang xử lý..."
              : vi
                ? "Liên kết lại ví"
                : "Liên kết ví MetaMask"}
          </button>
        )}
      </div>

      {/* Sự kiện chờ ký */}
      {!laAdmin && vi?.trang_thai_duyet === "DA_DUYET" && (
        <div className="bc-section">
          <div className="bc-section-head">
            <h4>Sự kiện chờ ký ({choKy.length})</h4>
            {soSanSang > 0 && (
              <button
                type="button"
                className="bc-btn"
                onClick={kyTatCa}
                disabled={Boolean(dangXuLy)}
              >
                <PenLine size={14} />{" "}
                {dangXuLy === "ky-tat-ca"
                  ? "Đang ký..."
                  : `Ký tất cả (${soSanSang})`}
              </button>
            )}
          </div>

          {choKy.length === 0 ? (
            <p className="bc-muted">Không có sự kiện nào đang chờ ký.</p>
          ) : (
            <table className="bc-table">
              <thead>
                <tr>
                  <th>Lô</th>
                  <th>Sự kiện</th>
                  <th>Thời điểm</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {choKy.map((it) => (
                  <tr key={it.ma_lich_su}>
                    <td className="bc-mono">{it.ma_lo}</td>
                    <td>{TEN_SU_KIEN[it.loai] || it.loai}</td>
                    <td>{new Date(it.thoi_diem).toLocaleString("vi-VN")}</td>
                    <td>
                      {it.loi_truoc && (
                        <div className="bc-warn" style={{ marginBottom: 6 }}>
                          Lần ký trước: {it.loi_truoc}
                        </div>
                      )}
                      {it.san_sang || thongBaoBangAlert ? (
                        <>
                          <button
                            type="button"
                            className="bc-btn"
                            style={it.san_sang ? undefined : { opacity: 0.5 }}
                            onClick={() =>
                              it.san_sang
                                ? ky(it)
                                : alert(it.ly_do || "Sự kiện này chưa ký được")
                            }
                            disabled={Boolean(dangXuLy)}
                          >
                            {dangXuLy === it.ma_lich_su
                              ? "Đang ký..."
                              : "Ký lên blockchain"}
                          </button>
                          {!it.san_sang && linkGiaoDich(it)}
                        </>
                      ) : (
                        <span className="bc-muted">
                          {it.ly_do}
                          {linkGiaoDich(it)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Việc duyệt ví đã chuyển sang trang Quản trị */}
      {laAdmin && (
        <p className="bc-muted">
          Duyệt ví của người dùng nằm ở trang Quản trị → mục "Ví blockchain".
        </p>
      )}
    </div>
  );
};

export default BlockchainPanel;
