import React, { useCallback, useEffect, useState } from "react";
import { BrowserProvider, Contract } from "ethers";
import { Wallet, RefreshCw, PenLine } from "lucide-react";
import {
  fetchCauHinh,
  fetchViCuaToi,
  taoNonceLienKet,
  lienKetVi,
  fetchChoKy,
  xacNhanSuKien,
  fetchViChoDuyet,
  duyetVi,
  tuChoiVi,
} from "../api/blockchainApi";
import { TEN_SU_KIEN, rutGon } from "./xacthucblockchain";
import "../view/css/blockchain.css";

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

const BlockchainPanel = () => {
  const [cauHinh, setCauHinh] = useState(null);
  const [thongTin, setThongTin] = useState(null);
  const [choKy, setChoKy] = useState([]);
  const [viChoDuyet, setViChoDuyet] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [dangXuLy, setDangXuLy] = useState("");
  const [thongBao, setThongBao] = useState({ loai: "", text: "" });

  const baoLoi = (e) => setThongBao({ loai: "loi", text: loiNgan(e) });
  const baoOk = (text) => setThongBao({ loai: "ok", text });

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
      if (tt.vai_tro === "ADMIN") {
        setViChoDuyet(await fetchViChoDuyet());
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
    const tx = await contract[item.ham](...item.args);
    await tx.wait();
    await xacNhanSuKien(item.ma_lich_su, tx.hash);
  };

  const ky = (item) =>
    chayTacVu(item.ma_lich_su, async () => {
      await kyMotSuKien(item);
      baoOk("Đã ký và ghi lên blockchain");
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

  const duyet = (w) =>
    chayTacVu(w.dia_chi_vi, async () => {
      const { signer, diaChi } = await ketNoiMetaMask(cauHinh);
      if (!vi || diaChi.toLowerCase() !== vi.dia_chi_vi.toLowerCase()) {
        throw new Error(
          `Hãy chọn ví admin ${rutGon(vi?.dia_chi_vi)} trong MetaMask`,
        );
      }
      const contract = new Contract(
        cauHinh.contractAddress,
        cauHinh.abi,
        signer,
      );
      const tx = await contract.setRole(w.dia_chi_vi, w.vai_tro_on_chain);
      await tx.wait();
      await duyetVi(w.dia_chi_vi, tx.hash);
      baoOk(`Đã duyệt ví của ${w.ho_ten}`);
      await taiDuLieu();
    });

  const tuChoi = (w) =>
    chayTacVu(w.dia_chi_vi, async () => {
      await tuChoiVi(w.dia_chi_vi);
      baoOk("Đã từ chối ví");
      await taiDuLieu();
    });

  const soSanSang = choKy.filter((x) => x.san_sang).length;

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
        {vi ? (
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
                      {it.san_sang ? (
                        <button
                          type="button"
                          className="bc-btn"
                          onClick={() => ky(it)}
                          disabled={Boolean(dangXuLy)}
                        >
                          {dangXuLy === it.ma_lich_su
                            ? "Đang ký..."
                            : "Ký lên blockchain"}
                        </button>
                      ) : (
                        <span className="bc-muted">{it.ly_do}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Quản trị viên duyệt ví */}
      {laAdmin && (
        <div className="bc-section">
          <div className="bc-section-head">
            <h4>Ví chờ duyệt ({viChoDuyet.length})</h4>
          </div>
          {!vi && (
            <p className="bc-warn">
              Hãy liên kết ví admin (chính ví đã deploy contract) trước khi
              duyệt ví của người khác.
            </p>
          )}
          {viChoDuyet.length === 0 ? (
            <p className="bc-muted">Không có ví nào đang chờ duyệt.</p>
          ) : (
            <table className="bc-table">
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Vai trò</th>
                  <th>Ví</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {viChoDuyet.map((w) => (
                  <tr key={w.dia_chi_vi}>
                    <td>
                      {w.ho_ten}{" "}
                      <span className="bc-muted">({w.ma_nguoi_dung})</span>
                    </td>
                    <td>{w.vai_tro}</td>
                    <td className="bc-mono">{rutGon(w.dia_chi_vi, 8, 6)}</td>
                    <td className="bc-actions">
                      <button
                        type="button"
                        className="bc-btn"
                        onClick={() => duyet(w)}
                        disabled={
                          Boolean(dangXuLy) || !vi || !w.vai_tro_on_chain
                        }
                      >
                        {dangXuLy === w.dia_chi_vi
                          ? "Đang xử lý..."
                          : "Duyệt vai trò"}
                      </button>
                      <button
                        type="button"
                        className="bc-btn bc-btn-ghost"
                        onClick={() => tuChoi(w)}
                        disabled={Boolean(dangXuLy)}
                      >
                        Từ chối
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default BlockchainPanel;
