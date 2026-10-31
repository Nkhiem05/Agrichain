import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Contract } from "ethers";
import { Wallet, RefreshCw, CheckCheck, ExternalLink, Scale, ListChecks } from "lucide-react";
import { TEN_SU_KIEN } from "../xacthucblockchain";
import QuanTriLoKet from "./quantriloket";
import {
  fetchCauHinh,
  fetchViCuaToi,
  fetchDanhSachVi,
  taoNonceLienKet,
  lienKetVi,
  duyetVi,
  tuChoiVi,
  ketNoiMetaMask,
  fetchNguong,
  xacNhanNguong,
  fetchOutbox,
  chayOutboxNgay,
  dongBoVaiTro,
} from "../../../api/blockchainApi";

// Mục "Ví blockchain" của trang quản trị: liên kết ví admin, duyệt / từ chối ví của người dùng.
// Duyệt = admin ký setRole (1 ví) hoặc setRoles (nhiều ví 1 lần) trên hợp đồng, rồi backend đọc lại
// vai trò trên chain mới đánh dấu "đã duyệt".
// Bộ ngưỡng kiểm định: admin ký setThreshold(mã băm bộ ngưỡng) để cơ quan kiểm định công bố được kết quả.
// Hàng chờ (Outbox): số sự kiện chờ ký / đã gửi / đã xác nhận, tình trạng worker đối soát.

const TEN_TRANG_THAI_OUTBOX = {
  QUEUED: { text: "Chờ ký", cls: "warning" },
  SUBMITTED: { text: "Đã gửi, chờ xác nhận", cls: "info" },
  CONFIRMED: { text: "Đã xác nhận", cls: "success" },
  FAILED: { text: "Lỗi", cls: "danger" },
};

const TEN_VAI_TRO = {
  ADMIN: "Quản trị viên",
  FARMER_COOP: "Nông dân / HTX",
  CERT_AUTHORITY: "Cơ quan kiểm định",
  TRANSPORTER: "Đơn vị vận chuyển",
  PROCESSOR: "Cơ sở sơ chế",
  DISTRIBUTOR: "Nhà phân phối",
  RETAILER: "Đại lý",
};

const TRANG_THAI = {
  CHO_DUYET: { text: "Chờ duyệt", cls: "warning" },
  DA_DUYET: { text: "Đã duyệt", cls: "success" },
  TU_CHOI: { text: "Từ chối", cls: "danger" },
};

const BO_LOC = [
  { key: "CHO_DUYET", label: "Chờ duyệt" },
  { key: "DA_DUYET", label: "Đã duyệt" },
  { key: "TU_CHOI", label: "Từ chối" },
  { key: "", label: "Tất cả" },
];

const rutGon = (s, dau = 6, cuoi = 4) =>
  s && s.length > dau + cuoi + 3 ? `${s.slice(0, dau)}...${s.slice(-cuoi)}` : s || "";

const cungDiaChi = (a, b) => Boolean(a && b && a.toLowerCase() === b.toLowerCase());

const loiNgan = (e) => {
  if (e?.code === "ACTION_REJECTED" || e?.code === 4001) return "Bạn đã từ chối trong MetaMask";
  return e?.reason || e?.shortMessage || e?.message || "Có lỗi xảy ra";
};

const DuyetViBlockchain = () => {
  const [cauHinh, setCauHinh] = useState(null);
  const [viAdmin, setViAdmin] = useState(null);
  const [adminHopDong, setAdminHopDong] = useState(null);
  const [hopDong, setHopDong] = useState({ dia_chi: null, loi: null });
  const [dsVi, setDsVi] = useState([]);
  const [boLoc, setBoLoc] = useState("CHO_DUYET");
  const [daChon, setDaChon] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [dangXuLy, setDangXuLy] = useState("");
  const [thongBao, setThongBao] = useState({ loai: "", text: "" });
  const [nguong, setNguong] = useState(null);
  const [outbox, setOutbox] = useState(null);

  const taiDuLieu = useCallback(async () => {
    setDangTai(true);
    try {
      const [cfg, toi, ds] = await Promise.all([fetchCauHinh(), fetchViCuaToi(), fetchDanhSachVi()]);
      setCauHinh(cfg);
      setViAdmin(toi.vi);
      setAdminHopDong(ds.admin_hop_dong);
      setHopDong(ds.hop_dong || { dia_chi: null, loi: null });
      setDsVi(ds.vi);
      setDaChon((cu) => cu.filter((dc) => ds.vi.some((w) => w.dia_chi_vi === dc && w.trang_thai_duyet === "CHO_DUYET")));
      setNguong(await fetchNguong().catch(() => null));
      setOutbox(await fetchOutbox().catch(() => null));
    } catch (e) {
      setThongBao({ loai: "loi", text: loiNgan(e) });
    } finally {
      setDangTai(false);
    }
  }, []);

  useEffect(() => {
    taiDuLieu();
  }, [taiDuLieu]);

  const viNguoiDung = useMemo(() => dsVi.filter((w) => w.vai_tro !== "ADMIN"), [dsVi]);
  const hienThi = useMemo(
    () => viNguoiDung.filter((w) => !boLoc || w.trang_thai_duyet === boLoc),
    [viNguoiDung, boLoc],
  );
  const viLech = useMemo(() => viNguoiDung.filter((w) => w.lech_vai_tro), [viNguoiDung]);
  const dem = (tt) => viNguoiDung.filter((w) => w.trang_thai_duyet === tt).length;
  const coTheChon = (w) => w.trang_thai_duyet === "CHO_DUYET" && Boolean(w.vai_tro_on_chain);
  const dsChoChon = hienThi.filter(coTheChon);

  // Ví admin trên web phải đúng ví admin của hợp đồng thì mới ký setRole được
  const viAdminDung = cungDiaChi(viAdmin?.dia_chi_vi, adminHopDong);
  const sanSangDuyet = Boolean(cauHinh?.daCauHinh) && viAdminDung;

  const chayTacVu = async (khoa, fn) => {
    setDangXuLy(khoa);
    setThongBao({ loai: "", text: "" });
    try {
      await fn();
    } catch (e) {
      setThongBao({ loai: "loi", text: loiNgan(e) });
    } finally {
      setDangXuLy("");
    }
  };

  // Mở MetaMask, bắt buộc đang chọn đúng ví admin của hợp đồng
  const layHopDongAdmin = async () => {
    const { signer, diaChi } = await ketNoiMetaMask(cauHinh);
    if (!cungDiaChi(diaChi, adminHopDong)) {
      throw new Error(`Hãy chọn ví admin ${rutGon(adminHopDong)} trong MetaMask (đang chọn ${rutGon(diaChi)})`);
    }
    return new Contract(cauHinh.contractAddress, cauHinh.abi, signer);
  };

  const lienKetViAdmin = () =>
    chayTacVu("lien-ket", async () => {
      const { signer, diaChi } = await ketNoiMetaMask(cauHinh);
      const { thong_diep: thongDiep } = await taoNonceLienKet();
      const chuKy = await signer.signMessage(thongDiep);
      const kq = await lienKetVi(diaChi, chuKy);
      setThongBao({ loai: "ok", text: kq.message });
      await taiDuLieu();
    });

  const duyetMot = (w) =>
    chayTacVu(w.dia_chi_vi, async () => {
      const contract = await layHopDongAdmin();
      const tx = await contract.setRole(w.dia_chi_vi, w.vai_tro_on_chain);
      await tx.wait();
      await duyetVi(w.dia_chi_vi, tx.hash);
      setThongBao({ loai: "ok", text: `Đã duyệt ví của ${w.ho_ten}` });
      await taiDuLieu();
    });

  // Duyệt nhiều ví bằng 1 lần ký (setRoles), sau đó báo backend kiểm tra từng ví trên chain
  const duyetNhieu = () =>
    chayTacVu("duyet-nhieu", async () => {
      const ds = viNguoiDung.filter((w) => daChon.includes(w.dia_chi_vi) && coTheChon(w));
      if (ds.length === 0) throw new Error("Chưa chọn ví nào để duyệt");
      const contract = await layHopDongAdmin();
      const tx = await contract.setRoles(
        ds.map((w) => w.dia_chi_vi),
        ds.map((w) => w.vai_tro_on_chain),
      );
      await tx.wait();
      const loi = [];
      for (const w of ds) {
        try {
          await duyetVi(w.dia_chi_vi, tx.hash);
        } catch (e) {
          loi.push(`${w.ho_ten}: ${loiNgan(e)}`);
        }
      }
      setDaChon([]);
      setThongBao(
        loi.length === 0
          ? { loai: "ok", text: `Đã duyệt ${ds.length} ví trong 1 lần ký` }
          : { loai: "loi", text: `Duyệt được ${ds.length - loi.length}/${ds.length} ví. ${loi.join("; ")}` },
      );
      await taiDuLieu();
    });

  const tuChoi = (w) =>
    chayTacVu(`tc-${w.dia_chi_vi}`, async () => {
      if (!window.confirm(`Từ chối ví của ${w.ho_ten}? Người dùng sẽ phải liên kết lại ví.`)) return;
      await tuChoiVi(w.dia_chi_vi);
      setThongBao({ loai: "ok", text: `Đã từ chối ví của ${w.ho_ten}` });
      await taiDuLieu();
    });

  // Hợp đồng mới chưa có vai trò nào: gán lại cho mọi ví đã duyệt trong 1 lần ký (setRoles), rồi server kiểm tra trên chain
  const dongBoVaiTroLai = () =>
    chayTacVu("dong-bo-vai-tro", async () => {
      const ds = viLech;
      if (ds.length === 0) throw new Error("Không có ví nào cần gán lại vai trò");
      const contract = await layHopDongAdmin();
      const tx = await contract.setRoles(
        ds.map((w) => w.dia_chi_vi),
        ds.map((w) => w.vai_tro_on_chain),
      );
      await tx.wait();
      const kq = await dongBoVaiTro(
        ds.map((w) => w.dia_chi_vi),
        tx.hash,
      );
      setThongBao({ loai: kq.data.con_lech.length === 0 ? "ok" : "loi", text: kq.message });
      await taiDuLieu();
    });

  // Ghi bộ ngưỡng đang áp dụng lên hợp đồng, rồi báo backend đọc lại trên chain và lưu phiên bản
  const ghiNguong = () =>
    chayTacVu("nguong", async () => {
      const contract = await layHopDongAdmin();
      const tx = await contract.setThreshold(nguong.ma_bam);
      await tx.wait();
      const kq = await xacNhanNguong(nguong.ma_bam, tx.hash);
      setThongBao({ loai: "ok", text: kq.message });
      await taiDuLieu();
    });

  const doiSoatNgay = () =>
    chayTacVu("doi-soat", async () => {
      const { data: kq } = await chayOutboxNgay();
      setThongBao({
        loai: "ok",
        text: kq
          ? `Đối soát xong: xác nhận ${kq.xacNhan}, đối soát từ chain ${kq.doiSoat}, trả về hàng chờ ${kq.traVe}, chờ vào khối ${kq.choKhoi}, áp dụng lại bước đã ký ${kq.apDungLai || 0}`
          : "Chưa cấu hình hợp đồng, không có gì để đối soát",
      });
      await taiDuLieu();
    });

  const doiChon = (diaChi) =>
    setDaChon((cu) => (cu.includes(diaChi) ? cu.filter((x) => x !== diaChi) : [...cu, diaChi]));
  const chonTatCa = (chon) => setDaChon(chon ? dsChoChon.map((w) => w.dia_chi_vi) : []);

  const linkExplorer = (loai, giaTri) =>
    cauHinh?.explorerUrl && giaTri ? `${cauHinh.explorerUrl.replace(/\/$/, "")}/${loai}/${giaTri}` : null;

  return (
    <div>
      <div className="sticky-top-section">
        <div className="metrics-row">
          <div className="metric-card warn">
            <span className="metric-title">Ví chờ duyệt</span>
            <div className="metric-number">
              {dem("CHO_DUYET")} <span className="metric-unit">VÍ</span>
            </div>
          </div>
          <div className="metric-card">
            <span className="metric-title">Đã duyệt</span>
            <div className="metric-number">
              {dem("DA_DUYET")} <span className="metric-unit">VÍ</span>
            </div>
          </div>
          <div className="metric-card">
            <span className="metric-title">Từ chối</span>
            <div className="metric-number">
              {dem("TU_CHOI")} <span className="metric-unit">VÍ</span>
            </div>
          </div>
          <div className="metric-card">
            <span className="metric-title">Mạng blockchain</span>
            <div className="metric-number" style={{ fontSize: 16 }}>
              {cauHinh?.tenMang || "—"}{" "}
              <span className="metric-unit">{cauHinh?.chainId || ""}</span>
            </div>
          </div>
        </div>

        <div className="content-head">
          <div>
            <h2>Duyệt ví blockchain</h2>
            <p>
              Người dùng liên kết ví MetaMask ở Trang cá nhân; quản trị viên gán vai trò cho ví trên
              hợp đồng thông minh để ví đó được ký các bước truy xuất.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn-action-view" onClick={taiDuLieu} disabled={dangTai}>
              <RefreshCw size={14} /> Tải lại
            </button>
            <button
              type="button"
              className="btn-primary-action"
              style={{ whiteSpace: "nowrap" }}
              onClick={duyetNhieu}
              disabled={!sanSangDuyet || daChon.length === 0 || Boolean(dangXuLy)}
              title="Gán vai trò cho tất cả ví đã chọn trong 1 lần ký MetaMask"
            >
              <CheckCheck size={16} />{" "}
              {dangXuLy === "duyet-nhieu" ? "Đang duyệt..." : `Duyệt đã chọn (${daChon.length})`}
            </button>
          </div>
        </div>
      </div>

      {/* Ví admin */}
      <div className="table-container" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              <Wallet size={16} /> Ví quản trị
            </div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              Địa chỉ hợp đồng server đang dùng:{" "}
              {hopDong.dia_chi ? (
                <a className="mono" href={linkExplorer("address", hopDong.dia_chi) || undefined} target="_blank" rel="noreferrer">
                  {hopDong.dia_chi}
                </a>
              ) : (
                <span className="mono">chưa cấu hình</span>
              )}
            </div>
            <div style={{ fontSize: 13, marginTop: 2 }}>
              Ví admin của hợp đồng:{" "}
              <span className="mono">{adminHopDong || (cauHinh?.daCauHinh ? "không đọc được" : "chưa cấu hình hợp đồng")}</span>
            </div>
            <div style={{ fontSize: 13, marginTop: 2 }}>
              Ví đang liên kết với tài khoản admin:{" "}
              <span className="mono">{viAdmin?.dia_chi_vi || "chưa liên kết"}</span>{" "}
              {viAdmin && adminHopDong && (
                <span className={`status-pill ${viAdminDung ? "success" : "danger"}`}>
                  {viAdminDung ? "Khớp" : "Không khớp"}
                </span>
              )}
            </div>
            {!dangTai && hopDong.loi && (
              <div style={{ fontSize: 13, marginTop: 6, color: "#dc2626" }}>
                Không đọc được hợp đồng: {hopDong.loi}
              </div>
            )}
            {!dangTai && adminHopDong && !viAdminDung && (
              <div style={{ fontSize: 13, marginTop: 6, color: "#b45309" }}>
                Chỉ ví admin của hợp đồng (ví đã deploy) mới duyệt được. Hãy chọn đúng ví đó trong
                MetaMask rồi bấm "Liên kết ví admin".
              </div>
            )}
          </div>
          {adminHopDong && (!viAdmin || !viAdminDung) && (
            <button
              type="button"
              className="btn-primary-action"
              onClick={lienKetViAdmin}
              disabled={Boolean(dangXuLy) || !cauHinh?.daCauHinh}
            >
              <Wallet size={16} /> {dangXuLy === "lien-ket" ? "Đang xử lý..." : "Liên kết ví admin"}
            </button>
          )}
        </div>
      </div>

      {/* Ví đã duyệt trong CSDL nhưng hợp đồng đang dùng chưa gán vai trò (vd vừa deploy hợp đồng mới) */}
      {viLech.length > 0 && (
        <div className="table-container" style={{ padding: 16, marginBottom: 16, borderLeft: "4px solid #f59e0b" }} data-testid="vi-lech">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ fontWeight: 700 }}>
                {viLech.length} ví đã duyệt nhưng hợp đồng đang dùng chưa gán vai trò
              </div>
              <div style={{ fontSize: 13, marginTop: 4, color: "#6b7280" }}>
                Thường gặp sau khi deploy hợp đồng mới: các ví vẫn "Đã duyệt" trong hệ thống nhưng hợp đồng mới chưa biết họ, nên họ không ký được
                (báo "chưa có vai trò trên hợp đồng blockchain hiện tại"). Bấm nút bên cạnh để gán lại vai trò cho tất cả trong 1 lần ký MetaMask:{" "}
                {viLech.map((w) => w.ho_ten).join(", ")}.
              </div>
            </div>
            <button
              type="button"
              className="btn-primary-action"
              style={{ whiteSpace: "nowrap" }}
              onClick={dongBoVaiTroLai}
              disabled={!sanSangDuyet || Boolean(dangXuLy)}
              title="Admin ký setRoles cho các ví này trên hợp đồng đang dùng"
            >
              <CheckCheck size={16} /> {dangXuLy === "dong-bo-vai-tro" ? "Đang gán..." : `Gán lại vai trò (${viLech.length})`}
            </button>
          </div>
        </div>
      )}

      {/* Bộ ngưỡng kiểm định */}
      {nguong && (
        <div className="table-container" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                <Scale size={16} /> Bộ ngưỡng kiểm định
              </div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                Đang áp dụng {nguong.so_chi_tieu} chỉ tiêu (Danh mục dùng chung → ngưỡng kiểm định). Mã băm:{" "}
                <span className="mono" title={nguong.ma_bam}>{rutGon(nguong.ma_bam, 10, 8)}</span>{" "}
                {nguong.tren_chain === true && <span className="status-pill success">Đã ghi lên blockchain</span>}
                {nguong.tren_chain === false && <span className="status-pill danger">Chưa ghi lên blockchain</span>}
              </div>
              {nguong.phien_ban?.ma_giao_dich_blockchain && (
                <div style={{ fontSize: 13, marginTop: 2 }}>
                  Phiên bản #{nguong.phien_ban.ma_phien_ban}, giao dịch{" "}
                  <a
                    className="mono"
                    href={linkExplorer("tx", nguong.phien_ban.ma_giao_dich_blockchain) || undefined}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {rutGon(nguong.phien_ban.ma_giao_dich_blockchain, 10, 6)}
                  </a>
                </div>
              )}
              {nguong.tren_chain === false && (
                <div style={{ fontSize: 13, marginTop: 6, color: "#b45309" }}>
                  Cơ quan kiểm định chỉ công bố được kết quả khi bộ ngưỡng đang áp dụng đã được ghi lên
                  blockchain. Mỗi lần sửa ngưỡng cần ghi lại.
                </div>
              )}
              {nguong.tren_chain === true && !nguong.phien_ban?.ma_giao_dich_blockchain && (
                <div style={{ fontSize: 13, marginTop: 6, color: "#b45309" }}>
                  Bộ ngưỡng đã có trên chain nhưng server chưa lưu phiên bản: bấm "Ghi bộ ngưỡng" để ký lại và lưu.
                </div>
              )}
              {nguong.loi_chain && (
                <div style={{ fontSize: 13, marginTop: 6, color: "#dc2626" }}>
                  Không đọc được bộ ngưỡng trên chain: {nguong.loi_chain}
                </div>
              )}
            </div>
            {/* Hiện nút khi chưa có trên hợp đồng đang dùng (kể cả khi CSDL còn giữ tx của hợp đồng cũ) hoặc server chưa lưu phiên bản */}
            {(nguong.tren_chain !== true || !nguong.phien_ban?.ma_giao_dich_blockchain) && (
              <button
                type="button"
                className="btn-primary-action"
                style={{ whiteSpace: "nowrap" }}
                onClick={ghiNguong}
                disabled={!sanSangDuyet || Boolean(dangXuLy)}
                title="Admin ký setThreshold(mã băm) trên hợp đồng"
              >
                <Scale size={16} /> {dangXuLy === "nguong"
                  ? "Đang ghi..."
                  : nguong.phien_ban?.ma_giao_dich_blockchain
                    ? "Ghi lại bộ ngưỡng lên hợp đồng này"
                    : "Ghi bộ ngưỡng lên blockchain"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hàng chờ ghi blockchain (Outbox) */}
      {outbox && (
        <div className="table-container" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                <ListChecks size={16} /> Hàng chờ ghi blockchain (Outbox)
              </div>
              <div style={{ fontSize: 13, marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.entries(TEN_TRANG_THAI_OUTBOX).map(([k, v]) => (
                  <span key={k} className={`status-pill ${v.cls}`}>
                    {v.text}: {outbox.dem?.[k] || 0}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 12.5, marginTop: 6, color: "#6b7280" }}>
                Worker {outbox.worker.dang_bat ? `đang chạy nền, mỗi ${outbox.worker.chu_ky_giay} giây` : "đang tắt (BLOCKCHAIN_WORKER=0)"}
                {outbox.worker.lan_chay_cuoi &&
                  ` · lần chạy cuối ${new Date(outbox.worker.lan_chay_cuoi).toLocaleTimeString("vi-VN")}`}
                . Worker không ký thay ai: chỉ theo dõi giao dịch đã gửi và đối soát với chain.
              </div>
              {outbox.worker.loi_cuoi && (
                <div style={{ fontSize: 13, marginTop: 4, color: "#dc2626" }}>Lỗi lần chạy cuối: {outbox.worker.loi_cuoi}</div>
              )}
            </div>
            <button
              type="button"
              className="btn-action-view"
              style={{ whiteSpace: "nowrap" }}
              onClick={doiSoatNgay}
              disabled={Boolean(dangXuLy) || !cauHinh?.daCauHinh}
            >
              <RefreshCw size={14} /> {dangXuLy === "doi-soat" ? "Đang đối soát..." : "Đối soát ngay"}
            </button>
          </div>
          {outbox.gan_day?.length > 0 && (
            <table className="admin-table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Lô</th>
                  <th>Sự kiện</th>
                  <th>Người ký</th>
                  <th>Trạng thái</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {outbox.gan_day.map((r) => {
                  const tt = TEN_TRANG_THAI_OUTBOX[r.status] || { text: r.status, cls: "info" };
                  const linkTx = linkExplorer("tx", r.tx_hash);
                  return (
                    <tr key={r.event_id}>
                      <td className="mono">{r.ma_lo_nong_san}</td>
                      <td>{TEN_SU_KIEN[r.loai_hoat_dong] || r.loai_hoat_dong}</td>
                      <td>{r.ho_ten}</td>
                      <td>
                        <span className={`status-pill ${tt.cls}`}>{tt.text}</span>
                        {linkTx && (
                          <a href={linkTx} target="_blank" rel="noreferrer" style={{ marginLeft: 6, fontSize: 12 }}>
                            giao dịch <ExternalLink size={11} />
                          </a>
                        )}
                      </td>
                      <td style={{ fontSize: 12.5, color: r.last_error && r.status !== "CONFIRMED" ? "#b45309" : "#6b7280", maxWidth: 360 }}>
                        {r.last_error || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Gỡ lô kẹt và đổi ví người dùng */}
      <QuanTriLoKet
        layHopDongAdmin={layHopDongAdmin}
        sanSangKy={sanSangDuyet}
        onThongBao={setThongBao}
        onXong={taiDuLieu}
        linkExplorer={(h) => linkExplorer("tx", h)}
      />

      {thongBao.text && (
        <div
          className={`status-pill ${thongBao.loai === "ok" ? "success" : "danger"}`}
          style={{ display: "block", padding: "10px 14px", marginBottom: 12, whiteSpace: "normal" }}
        >
          {thongBao.text}
        </div>
      )}

      {/* Bộ lọc */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {BO_LOC.map((b) => (
          <button
            key={b.key || "all"}
            type="button"
            className={boLoc === b.key ? "btn-primary-action" : "btn-action-view"}
            onClick={() => setBoLoc(b.key)}
          >
            {b.label} ({b.key ? dem(b.key) : viNguoiDung.length})
          </button>
        ))}
      </div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 40, textAlign: "center" }}>
                <input
                  type="checkbox"
                  title="Chọn tất cả ví chờ duyệt đang hiện"
                  disabled={dsChoChon.length === 0 || !sanSangDuyet}
                  checked={dsChoChon.length > 0 && dsChoChon.every((w) => daChon.includes(w.dia_chi_vi))}
                  onChange={(e) => chonTatCa(e.target.checked)}
                />
              </th>
              <th>Người dùng</th>
              <th>Vai trò</th>
              <th>Địa chỉ ví</th>
              <th style={{ textAlign: "center" }}>Trạng thái</th>
              <th>Thời điểm</th>
              <th style={{ textAlign: "center" }}>Thao tác</th>
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
                <td colSpan={7} style={{ color: "#6b7280" }}>
                  Không có ví nào ở mục này.
                </td>
              </tr>
            )}
            {!dangTai &&
              hienThi.map((w) => {
                const tt = TRANG_THAI[w.trang_thai_duyet] || { text: w.trang_thai_duyet, cls: "info" };
                const linkVi = linkExplorer("address", w.dia_chi_vi);
                const linkTx = linkExplorer("tx", w.tx_gan_vai_tro);
                return (
                  <tr key={w.dia_chi_vi}>
                    <td style={{ textAlign: "center" }}>
                      {coTheChon(w) && (
                        <input
                          type="checkbox"
                          disabled={!sanSangDuyet}
                          checked={daChon.includes(w.dia_chi_vi)}
                          onChange={() => doiChon(w.dia_chi_vi)}
                        />
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{w.ho_ten}</div>
                      <div className="mono" style={{ fontSize: 12, color: "#6b7280" }}>
                        {w.ma_nguoi_dung} · {w.ten_dang_nhap}
                      </div>
                    </td>
                    <td>{TEN_VAI_TRO[w.vai_tro] || w.vai_tro}</td>
                    <td className="mono">
                      {linkVi ? (
                        <a href={linkVi} target="_blank" rel="noreferrer" title={w.dia_chi_vi}>
                          {rutGon(w.dia_chi_vi, 8, 6)} <ExternalLink size={12} />
                        </a>
                      ) : (
                        rutGon(w.dia_chi_vi, 8, 6)
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`status-pill ${tt.cls}`}>{tt.text}</span>
                      {w.trang_thai !== 1 && (
                        <div style={{ fontSize: 11, color: "#dc2626", marginTop: 2 }}>Ví bị tắt</div>
                      )}
                      {w.lech_vai_tro && (
                        <div style={{ fontSize: 11, color: "#b45309", marginTop: 2 }}>Chưa có vai trò trên hợp đồng này</div>
                      )}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      <div>Liên kết: {w.thoi_diem_dang_ky ? new Date(w.thoi_diem_dang_ky).toLocaleString("vi-VN") : "—"}</div>
                      {w.thoi_diem_duyet && <div>Duyệt: {new Date(w.thoi_diem_duyet).toLocaleString("vi-VN")}</div>}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {w.trang_thai_duyet === "CHO_DUYET" ? (
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <button
                            type="button"
                            className="btn-action-view"
                            onClick={() => duyetMot(w)}
                            disabled={!sanSangDuyet || !w.vai_tro_on_chain || Boolean(dangXuLy)}
                            title={!w.vai_tro_on_chain ? "Vai trò này không cần ví on-chain" : "Ký setRole cho ví này"}
                          >
                            {dangXuLy === w.dia_chi_vi ? "Đang duyệt..." : "Duyệt"}
                          </button>
                          <button
                            type="button"
                            className="btn-action-retry"
                            onClick={() => tuChoi(w)}
                            disabled={Boolean(dangXuLy)}
                          >
                            Từ chối
                          </button>
                        </div>
                      ) : linkTx ? (
                        <a href={linkTx} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                          Giao dịch duyệt <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span style={{ color: "#9ca3af" }}>—</span>
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

export default DuyetViBlockchain;
