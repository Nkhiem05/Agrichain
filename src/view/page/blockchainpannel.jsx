import React, { useCallback, useEffect, useRef, useState } from "react";
import { BrowserProvider, Contract } from "ethers";
import { Wallet, RefreshCw, PenLine, CheckCircle2, AlertTriangle, Clock, History, ExternalLink } from "lucide-react";
import {
  fetchCauHinh,
  fetchViCuaToi,
  taoNonceLienKet,
  lienKetVi,
  fetchChoKy,
  fetchLichSuKy,
  guiVaXacNhanSuKien,
  dichLoiBlockchain,
  docTrangThaiMetaMask,
} from "../../api/blockchainApi";
import {
  TEN_SU_KIEN as TEN_SU_KIEN_CONG_KHAI,
  rutGon,
} from "./xacthucblockchain";

// Tên hiển thị cho người ký: sự kiện tạo lệnh là bước bên gửi xác nhận cho xe lấy hàng đi (ký sau khi vận chuyển chấp nhận)
const TEN_SU_KIEN = {
  ...TEN_SU_KIEN_CONG_KHAI,
  TRANSPORT_ORDERED: "Xác nhận lấy hàng đi (ký lệnh vận chuyển)",
};
import "../css/blockchain.css";

const TRANG_THAI_DUYET = {
  CHO_DUYET: "Đang chờ quản trị viên duyệt",
  DA_DUYET: "Đã được duyệt",
  TU_CHOI: "Bị từ chối",
};

const loiNgan = (e) => dichLoiBlockchain(e);

// Lý do chưa ký được, kèm sự kiện đang chặn: ai phải ký bước nào trước
const lyDoChuaKy = (it) => {
  const cb = it.chan_boi;
  if (!cb) return it.ly_do || "Sự kiện này chưa ký được";
  const ten = TEN_SU_KIEN[cb.loai] || cb.loai;
  const nguoi = cb.ten_nguoi_ky
    ? `${cb.ten_nguoi_ky} (${cb.ma_nguoi_ky})`
    : cb.ma_nguoi_ky;
  return [
    `${it.ly_do}.`,
    "",
    `Bước đang chặn: #${cb.stt} "${ten}" của lô ${it.ma_lo}`,
    cb.trang_thai === "SUBMITTED"
      ? `Người ký: ${nguoi}. Giao dịch đã gửi, đang chờ blockchain xác nhận.`
      : `Người ký: ${nguoi}. Bước này chưa được ký, người đó cần ký trước.`,
  ].join("\n");
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

// Mọi sự kiện đều có nút ký; sự kiện chưa đủ điều kiện thì nút mờ, bấm ra alert nói rõ ai / bước nào đang chặn.
// thongBaoBangAlert: hiện thông báo kết quả bằng alert (thay vì dòng chữ trong khung ví).
// onDaKy: gọi mỗi khi có sự kiện vừa được ký xong (biến mất khỏi danh sách chờ) để trang chứa khối này tải lại dữ liệu,
// tránh phải F5 mới thấy lô / lệnh đã ký.
// Khung gồm: kiểm tra ví / mạng / số dư của MetaMask, các sự kiện chờ ký gom theo lô (mô tả điều đang xác nhận,
// trạng thái, lý do chờ, lỗi lần trước đã dịch sang tiếng Việt) và lịch sử các sự kiện đã ký.
const PHAN_TRAM_SO_DU_THAP = 0.001;

const NHAN_TRANG_THAI = {
  san_sang: { text: "Sẵn sàng ký", cls: "ok" },
  cho_truoc: { text: "Chờ bước trước", cls: "wait" },
  da_gui: { text: "Đã gửi, chờ xác nhận", cls: "sent" },
  loi: { text: "Cần ký lại", cls: "err" },
};

const trangThaiSuKien = (it, loiRieng) => {
  if (it.trang_thai === "SUBMITTED") return "da_gui";
  if (it.loi_truoc || loiRieng) return it.san_sang ? "loi" : "cho_truoc";
  return it.san_sang ? "san_sang" : "cho_truoc";
};

const BlockchainPanel = ({ thongBaoBangAlert = false, onDaKy = null }) => {
  const [cauHinh, setCauHinh] = useState(null);
  const [thongTin, setThongTin] = useState(null);
  const [choKy, setChoKy] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [dangXuLy, setDangXuLy] = useState("");
  const [tienDo, setTienDo] = useState("");
  const [thongBao, setThongBao] = useState({ loai: "", text: "" });
  const [loiSuKien, setLoiSuKien] = useState({});
  const [mm, setMm] = useState({ coMetaMask: true, diaChi: null, chainId: null, soDu: null });
  const [lichSu, setLichSu] = useState(null);
  const [moLichSu, setMoLichSu] = useState(false);
  const choKyTruoc = useRef(null);
  const idDangKy = useRef(null);
  const onDaKyRef = useRef(onDaKy);
  onDaKyRef.current = onDaKy;

  // Hiện lỗi sau khi nút đã trở lại bình thường: alert chặn giao diện nên không được gọi lúc nút còn ở "Đang ký..."
  const baoLoi = (e, khoa) => {
    const text = loiNgan(e);
    const id = khoa && khoa !== "ky-tat-ca" && khoa !== "lien-ket" ? khoa : idDangKy.current;
    if (id) setLoiSuKien((cu) => ({ ...cu, [id]: text }));
    if (thongBaoBangAlert) setTimeout(() => alert(text), 0);
    else setThongBao({ loai: "loi", text });
  };
  const baoOk = (text) => {
    if (thongBaoBangAlert) setTimeout(() => alert(text), 0);
    else setThongBao({ loai: "ok", text });
  };

  const taiMetaMask = useCallback(async () => {
    setMm(await docTrangThaiMetaMask());
  }, []);

  const taiLichSu = useCallback(async () => {
    try {
      setLichSu((await fetchLichSuKy()).su_kien);
    } catch {
      setLichSu([]);
    }
  }, []);

  const taiDuLieu = useCallback(async () => {
    try {
      const [cfg, tt] = await Promise.all([fetchCauHinh(), fetchViCuaToi()]);
      setCauHinh(cfg);
      setThongTin(tt);

      const daDuyet = tt.vi?.trang_thai_duyet === "DA_DUYET";
      if (daDuyet && tt.vai_tro !== "ADMIN") {
        const ds = (await fetchChoKy()).su_kien;
        // Có sự kiện vừa rời danh sách chờ = đã lên blockchain: báo trang chứa khối này tải lại
        const truoc = choKyTruoc.current;
        if (truoc && truoc.some((id) => !ds.some((x) => x.ma_lich_su === id))) {
          if (onDaKyRef.current) onDaKyRef.current();
        }
        choKyTruoc.current = ds.map((x) => x.ma_lich_su);
        setChoKy(ds);
        // Sự kiện đã rời danh sách thì bỏ lỗi cũ của nó
        setLoiSuKien((cu) => Object.fromEntries(Object.entries(cu).filter(([id]) => ds.some((x) => x.ma_lich_su === id))));
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
    taiMetaMask();
    // Người dùng đổi tài khoản / mạng trong MetaMask: cập nhật phần kiểm tra ngay
    const eth = window.ethereum;
    const khiDoi = () => taiMetaMask();
    try {
      eth?.on?.("accountsChanged", khiDoi);
      eth?.on?.("chainChanged", khiDoi);
    } catch {
      /* ví không hỗ trợ lắng nghe */
    }
    return () => {
      try {
        eth?.removeListener?.("accountsChanged", khiDoi);
        eth?.removeListener?.("chainChanged", khiDoi);
      } catch {
        /* bỏ qua */
      }
    };
  }, [taiDuLieu, taiMetaMask]);

  // Có sự kiện đã gửi giao dịch, đang chờ blockchain/worker xác nhận: tự tải lại để nút ký hiện lại
  // (khi giao dịch hỏng) hoặc dòng biến mất (khi đã xác nhận)
  const coDangCho = choKy.some((x) => x.trang_thai === "SUBMITTED");
  useEffect(() => {
    if (!coDangCho) return undefined;
    const timer = setInterval(taiDuLieu, 5000);
    return () => clearInterval(timer);
  }, [coDangCho, taiDuLieu]);

  // Đang chờ người khác ký bước trước: thỉnh thoảng tự tải lại để bước của mình sáng lên khi tới lượt
  const coChoNguoiKhac = choKy.some((x) => !x.san_sang && x.trang_thai !== "SUBMITTED");
  useEffect(() => {
    if (!coChoNguoiKhac) return undefined;
    const timer = setInterval(taiDuLieu, 20000);
    return () => clearInterval(timer);
  }, [coChoNguoiKhac, taiDuLieu]);

  useEffect(() => {
    if (moLichSu) taiLichSu();
  }, [moLichSu, taiLichSu, choKy.length]);

  if (dangTai || !thongTin || !thongTin.can_vi) return null;

  const vi = thongTin.vi;
  const laAdmin = thongTin.vai_tro === "ADMIN";

  const chayTacVu = async (khoa, fn) => {
    setDangXuLy(khoa);
    setThongBao({ loai: "", text: "" });
    let loi = null;
    try {
      await fn();
    } catch (e) {
      loi = e;
    }
    // Trả nút về bình thường TRƯỚC khi báo lỗi (alert làm đứng giao diện nên nút sẽ kẹt "Đang ký..." nếu báo trước)
    setDangXuLy("");
    setTienDo("");
    if (loi) {
      baoLoi(loi, khoa);
      await taiDuLieu(); // trạng thái sự kiện có thể đã đổi (ví dụ đã gửi giao dịch rồi mới lỗi)
    }
    taiMetaMask();
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

  const ketNoiVi = () =>
    chayTacVu("ket-noi", async () => {
      await ketNoiMetaMask(cauHinh);
    });

  // Ký một sự kiện: gọi hàm tương ứng trên contract rồi báo server kiểm tra giao dịch
  const kyMotSuKien = async (item) => {
    idDangKy.current = item.ma_lich_su;
    const { signer, diaChi } = await ketNoiMetaMask(cauHinh);
    if (diaChi.toLowerCase() !== vi.dia_chi_vi.toLowerCase()) {
      throw new Error(
        `Hãy chọn đúng ví ${rutGon(vi.dia_chi_vi)} trong MetaMask (đang chọn ${rutGon(diaChi)})`,
      );
    }
    const contract = new Contract(cauHinh.contractAddress, cauHinh.abi, signer);
    const kq = await guiVaXacNhanSuKien(contract, item);
    setLoiSuKien((cu) => {
      const { [item.ma_lich_su]: _bo, ...con } = cu;
      return con;
    });
    return kq;
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
      const tong = choKy.filter((x) => x.san_sang).length;
      for (let vong = 0; vong < 30; vong++) {
        const ds = (await fetchChoKy()).su_kien.filter((x) => x.san_sang);
        if (ds.length === 0) break;
        for (const item of ds) {
          setTienDo(`${soDaKy + 1}/${Math.max(tong, soDaKy + 1)}`);
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
  const soDaGui = choKy.filter((x) => x.trang_thai === "SUBMITTED").length;
  const soChoTruoc = choKy.filter((x) => !x.san_sang && x.trang_thai !== "SUBMITTED").length;
  const viDaKetNoi = laAdmin || vi?.trang_thai_duyet === "DA_DUYET";

  const linkTx = (tx) =>
    tx && cauHinh?.explorerUrl ? `${cauHinh.explorerUrl.replace(/\/$/, "")}/tx/${tx}` : null;

  // Gom sự kiện theo lô, giữ thứ tự xuất hiện
  const nhomTheoLo = [];
  choKy.forEach((it) => {
    let nhom = nhomTheoLo.find((n) => n.ma_lo === it.ma_lo);
    if (!nhom) {
      nhom = { ma_lo: it.ma_lo, ds: [] };
      nhomTheoLo.push(nhom);
    }
    nhom.ds.push(it);
  });

  // Phần kiểm tra MetaMask (chỉ đọc, không mở popup)
  const dungVi = mm.diaChi && vi && mm.diaChi.toLowerCase() === vi.dia_chi_vi.toLowerCase();
  const dungMang = cauHinh && mm.chainId !== null && mm.chainId === cauHinh.chainId;
  const soDuThap = mm.soDu !== null && mm.soDu < PHAN_TRAM_SO_DU_THAP;
  const kiemTra = [
    {
      khoa: "mm",
      nhan: "MetaMask",
      ok: mm.coMetaMask,
      text: mm.coMetaMask ? "Đã cài" : "Chưa cài MetaMask",
    },
    {
      khoa: "vi",
      nhan: "Ví đang chọn",
      ok: Boolean(dungVi),
      text: !mm.diaChi
        ? "Chưa kết nối"
        : dungVi
          ? "Đúng ví đã liên kết"
          : `Sai ví: đang chọn ${rutGon(mm.diaChi)}, cần ${rutGon(vi?.dia_chi_vi)}`,
    },
    {
      khoa: "mang",
      nhan: "Mạng",
      ok: Boolean(dungMang),
      text: mm.chainId === null
        ? "Chưa biết"
        : dungMang
          ? cauHinh.tenMang
          : `Đang ở mạng ${mm.chainId}, khi ký sẽ tự chuyển sang ${cauHinh?.tenMang}`,
    },
    {
      khoa: "so-du",
      nhan: "Số dư phí",
      ok: mm.soDu !== null && !soDuThap,
      text: mm.soDu === null
        ? "Chưa đọc được"
        : soDuThap
          ? `${mm.soDu.toFixed(4)} ${cauHinh?.tienTe || ""}: quá thấp, có thể không đủ trả phí`
          : `${mm.soDu.toFixed(4)} ${cauHinh?.tienTe || ""}`,
    },
  ];

  return (
    <div className="bc-panel">
      <div className="bc-panel-head">
        <h3>
          <Wallet size={18} /> Ví blockchain
        </h3>
        <button
          type="button"
          className="bc-btn bc-btn-ghost"
          onClick={() => {
            taiDuLieu();
            taiMetaMask();
          }}
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
        <p className={thongBao.loai === "ok" ? "bc-ok" : "bc-error"} style={{ whiteSpace: "pre-line" }}>
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

      {vi?.trang_thai_duyet === "CHO_DUYET" && (
        <p className="bc-warn">
          Ví của bạn đang chờ quản trị viên duyệt vai trò trên blockchain. Sau khi được duyệt bạn mới ký được.
        </p>
      )}

      {/* Kiểm tra MetaMask trước khi ký */}
      {vi && !laAdmin && (
        <div className="bc-checks" data-testid="bc-checks">
          {kiemTra.map((k) => (
            <div key={k.khoa} className={`bc-check ${k.ok ? "ok" : "warn"}`}>
              {k.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              <span>
                <b>{k.nhan}:</b> {k.text}
              </span>
            </div>
          ))}
          {mm.coMetaMask && !mm.diaChi && (
            <button type="button" className="bc-btn bc-btn-ghost" onClick={ketNoiVi} disabled={Boolean(dangXuLy)}>
              Kết nối MetaMask
            </button>
          )}
        </div>
      )}

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
                  ? `Đang ký ${tienDo}...`
                  : `Ký tất cả (${soSanSang})`}
              </button>
            )}
          </div>

          {choKy.length > 0 && (
            <div className="bc-summary" data-testid="bc-summary">
              <span className="bc-chip ok">Sẵn sàng ký: {soSanSang}</span>
              <span className="bc-chip wait">Chờ bước trước: {soChoTruoc}</span>
              <span className="bc-chip sent">Đã gửi, chờ xác nhận: {soDaGui}</span>
            </div>
          )}

          {choKy.length === 0 ? (
            <p className="bc-muted">
              Không có sự kiện nào đang chờ ký. Khi bạn thực hiện một bước cần ghi lên blockchain, yêu cầu sẽ hiện ở đây.
            </p>
          ) : (
            nhomTheoLo.map((nhom) => (
              <div key={nhom.ma_lo} className="bc-lot" data-lo={nhom.ma_lo}>
                <div className="bc-lot-head">
                  <span className="bc-mono">Lô {nhom.ma_lo}</span>
                  <span className="bc-muted">
                    {nhom.ds.length} bước chờ ký, ký theo thứ tự từ trên xuống
                  </span>
                </div>
                {nhom.ds.map((it) => {
                  const loiRieng = loiSuKien[it.ma_lich_su];
                  const tt = trangThaiSuKien(it, loiRieng);
                  const nhan = NHAN_TRANG_THAI[tt];
                  const link = linkTx(it.tx_hash);
                  return (
                    <div key={it.ma_lich_su} className={`bc-ev bc-ev-${nhan.cls}`} data-ma-lich-su={it.ma_lich_su}>
                      <div className="bc-ev-top">
                        <span className="bc-step-num">#{it.stt}</span>
                        <strong className="bc-ev-name">{TEN_SU_KIEN[it.loai] || it.loai}</strong>
                        <span className={`bc-chip ${nhan.cls}`}>
                          {tt === "da_gui" ? <Clock size={12} /> : null} {nhan.text}
                        </span>
                        <span className="bc-ev-time">{new Date(it.thoi_diem).toLocaleString("vi-VN")}</span>
                      </div>
                      {it.ket_qua && <p className="bc-ev-result">{it.ket_qua}</p>}
                      {it.chi_tiet?.length > 0 && (
                        <dl className="bc-ev-detail">
                          {it.chi_tiet.map((c) => (
                            <div key={c.nhan}>
                              <dt>{c.nhan}</dt>
                              <dd>{c.gia_tri}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      {!it.san_sang && it.trang_thai !== "SUBMITTED" && (
                        <div className="bc-ev-why">{lyDoChuaKy(it)}</div>
                      )}
                      {it.trang_thai === "SUBMITTED" && (
                        <div className="bc-ev-why">
                          Giao dịch đã gửi, đang chờ blockchain xác nhận. Hệ thống tự kiểm tra, bạn không cần làm gì thêm.
                        </div>
                      )}
                      {(loiRieng || it.loi_truoc) && (
                        <div className="bc-ev-err">
                          {loiRieng ? loiRieng : `Lần ký trước chưa thành công: ${it.loi_truoc}`}
                        </div>
                      )}
                      <div className="bc-ev-actions">
                        <button
                          type="button"
                          className="bc-btn"
                          style={it.san_sang ? undefined : { opacity: 0.5 }}
                          onClick={() =>
                            it.san_sang ? ky(it) : alert(lyDoChuaKy(it))
                          }
                          disabled={Boolean(dangXuLy)}
                        >
                          {dangXuLy === it.ma_lich_su
                            ? "Đang ký..."
                            : "Ký lên blockchain"}
                        </button>
                        {link && (
                          <a href={link} target="_blank" rel="noreferrer" className="bc-link">
                            xem giao dịch <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}

      {/* Lịch sử đã ký */}
      {!laAdmin && vi?.trang_thai_duyet === "DA_DUYET" && (
        <div className="bc-section">
          <button
            type="button"
            className="bc-btn bc-btn-ghost"
            onClick={() => setMoLichSu((v) => !v)}
            aria-expanded={moLichSu}
          >
            <History size={14} /> {moLichSu ? "Ẩn lịch sử đã ký" : "Xem lịch sử đã ký"}
          </button>
          {moLichSu && (
            <div className="bc-history" data-testid="bc-history">
              {lichSu === null ? (
                <p className="bc-muted">Đang tải...</p>
              ) : lichSu.length === 0 ? (
                <p className="bc-muted">Bạn chưa ký sự kiện nào đã được xác nhận.</p>
              ) : (
                <table className="bc-table">
                  <thead>
                    <tr>
                      <th>Lô</th>
                      <th>Sự kiện</th>
                      <th>Thời điểm</th>
                      <th>Giao dịch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lichSu.map((h) => {
                      const link = linkTx(h.tx_hash);
                      return (
                        <tr key={h.ma_lich_su}>
                          <td className="bc-mono">{h.ma_lo}</td>
                          <td>{TEN_SU_KIEN[h.loai] || h.loai}</td>
                          <td>{new Date(h.thoi_diem).toLocaleString("vi-VN")}</td>
                          <td className="bc-mono">
                            {h.tx_hash ? (
                              link ? (
                                <a href={link} target="_blank" rel="noreferrer">
                                  {rutGon(h.tx_hash, 8, 6)}
                                </a>
                              ) : (
                                rutGon(h.tx_hash, 8, 6)
                              )
                            ) : (
                              "—"
                            )}
                            {h.so_block ? <span className="bc-muted"> · khối {h.so_block}</span> : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
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
