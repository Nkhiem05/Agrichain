import React, { useCallback, useEffect, useState } from "react";
import usePersistentTab from "../../../hooks/usePersistentTab";
import { useNavigate } from "react-router-dom";
import { PackageCheck, Store, Wallet, LogOut, CheckCircle2, XCircle, Truck, Eye } from "lucide-react";
import "../../css/nhaphanphoi.css";
import BlockchainPanel from "../blockchainpannel";
import { kyNgay } from "../kyNgay";
import {
  fetchHangDangToi,
  xacNhanNhanHang,
  tuChoiNhanHang,
  fetchKhoDaiLy,
  xacNhanBanHet,
} from "../../../api/dailyApi";

// Trang của ĐẠI LÝ (tài khoản RETAILER): nhận hàng nhà phân phối giao tới, quản lý lô trong cửa hàng,
// xác nhận đã bán hết. Mỗi bước được ký lên blockchain ở mục "Ký blockchain".

const DEFAULT_LOGO_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png";

const TRANG_THAI_HANG = {
  CHO_CHAP_NHAN: { text: "Chờ đơn vị vận chuyển nhận chuyến", tone: "warning" },
  CHO_LAY_HANG: { text: "Chờ lấy hàng tại kho", tone: "info" },
  DANG_VAN_CHUYEN: { text: "Đang trên đường tới", tone: "info" },
  CHO_TIEP_NHAN: { text: "Đã tới - chờ bạn nhận hàng", tone: "warning" },
  HOAN_THANH: { text: "Đã nhận", tone: "success" },
  TU_CHOI: { text: "Đã từ chối", tone: "danger" },
};

const TRANG_THAI_XAC_THUC = {
  VERIFIED: { text: "Khớp blockchain", tone: "success" },
  INCOMPLETE: { text: "Chờ đủ chữ ký", tone: "warning" },
  MISMATCH: { text: "Dữ liệu bị sửa", tone: "danger" },
  BROKEN_CHAIN: { text: "Chuỗi bị đứt", tone: "danger" },
  NOT_CHECKED: { text: "Chưa đối soát", tone: "gray" },
};

const soKg = (v, dv) => `${Number(v || 0).toLocaleString("vi-VN", { maximumFractionDigits: 3 })} ${dv || "kg"}`;

const DaiLyPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = usePersistentTab("daily", "receive", ["receive", "stock", "blockchain"]);
  const [hangToi, setHangToi] = useState([]);
  const [kho, setKho] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [dangXuLy, setDangXuLy] = useState("");

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/dang-nhap");
      return;
    }
    setUser(JSON.parse(userData));
  }, [navigate]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const [toi, k] = await Promise.all([fetchHangDangToi(), fetchKhoDaiLy()]);
      setHangToi(toi?.data || []);
      setKho(k?.data || []);
    } catch (err) {
      setErrorMsg(err.message || "Không thể tải dữ liệu từ máy chủ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadAll();
  }, [user, loadAll]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/dang-nhap");
  };

  const chay = async (khoa, fn) => {
    setDangXuLy(khoa);
    try {
      const kq = await fn();
      await loadAll();
      await kyNgay(kq?.message || "Đã thực hiện.", { taiLai: loadAll });
    } catch (err) {
      alert(err.message || "Có lỗi xảy ra");
    } finally {
      setDangXuLy("");
    }
  };

  const nhanHang = (item) => {
    const nhap = window.prompt(
      `Nhận lô ${item.ma_lo_nong_san} (${item.ten_san_pham}).\nKhối lượng gửi: ${soKg(item.khoi_luong, item.don_vi_tinh)}.\nNhập khối lượng cân thực tế:`,
      String(Number(item.khoi_luong)),
    );
    if (nhap === null) return;
    const kl = Number(String(nhap).replace(",", "."));
    if (!kl || kl <= 0) return alert("Khối lượng không hợp lệ");
    chay(item.ma_van_don, () => xacNhanNhanHang(item.ma_van_don, kl));
  };

  const tuChoi = (item) => {
    const lyDo = window.prompt(`Lý do từ chối nhận lô ${item.ma_lo_nong_san}:`);
    if (!lyDo || !lyDo.trim()) return;
    chay(item.ma_van_don, () => tuChoiNhanHang(item.ma_van_don, lyDo.trim()));
  };

  const banHet = (lo) => {
    if (!window.confirm(`Xác nhận lô ${lo.ma_lo_nong_san} (${lo.ten_san_pham}) đã bán hết? Lô sẽ kết thúc vòng đời và không nhận thêm thao tác.`)) return;
    chay(lo.ma_lo_nong_san, () => xacNhanBanHet(lo.ma_lo_nong_san));
  };

  if (!user) return null;

  const choNhan = hangToi.filter((h) => h.trang_thai === "CHO_TIEP_NHAN").length;
  const dangToi = hangToi.filter((h) => ["CHO_CHAP_NHAN", "CHO_LAY_HANG", "DANG_VAN_CHUYEN"].includes(h.trang_thai)).length;
  const dangBan = kho.filter((l) => l.giai_doan_hien_tai !== "COMPLETED").length;

  return (
    <div className="nhaphanphoi dashboard-layout">
      <header className="dashboard-header">
        <div className="header-left">
          <img src={DEFAULT_LOGO_IMG} alt="Logo" className="header-logo-icon" />
          <span className="header-brand-title">AGRICHAIN</span>
        </div>
        <div style={{ flex: 1 }} />
        <div
          className="header-profile"
          title="Xem trang cá nhân"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/trang-ca-nhan")}
        >
          <div className="avatar-circle">{(user.ho_ten || "ĐL").slice(0, 2).toUpperCase()}</div>
          <div className="profile-meta">
            <span className="profile-name">{user.ho_ten}</span>
            <span className="profile-role">Đại lý bán lẻ</span>
          </div>
        </div>
      </header>

      {errorMsg && <div style={{ padding: "10px 24px", color: "#b91c1c", fontSize: 13 }}>{errorMsg}</div>}

      <div className="dashboard-body">
        <aside className="dashboard-sidebar">
          <div>
            <div className="sidebar-heading">Đại lý</div>
            <nav className="sidebar-nav">
              <button type="button" onClick={() => setActiveTab("receive")} className={`nav-item-btn ${activeTab === "receive" ? "active" : ""}`}>
                <PackageCheck size={20} />
                <span>Nhận hàng</span>
              </button>
              <button type="button" onClick={() => setActiveTab("stock")} className={`nav-item-btn ${activeTab === "stock" ? "active" : ""}`}>
                <Store size={20} />
                <span>Hàng trong cửa hàng</span>
              </button>
              <button type="button" onClick={() => setActiveTab("blockchain")} className={`nav-item-btn ${activeTab === "blockchain" ? "active" : ""}`}>
                <Wallet size={20} />
                <span>Ký blockchain</span>
              </button>
            </nav>
          </div>
          <div style={{ marginTop: "auto" }}>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "calc(100% - 24px)", margin: "0 12px 10px",
                padding: "10px 12px", border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626",
                borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: "pointer",
              }}
            >
              <LogOut size={17} />
              Đăng xuất
            </button>
            <div className="sidebar-footer">
              <span className="pulse-dot"></span>
              <span>Đại lý: <b>{user.ho_ten}</b></span>
            </div>
          </div>
        </aside>

        <main className="dashboard-content">
          <div className="metrics-row">
            <div className="metric-card">
              <div className="metric-title">Hàng đã tới - chờ nhận</div>
              <div className="metric-number">{choNhan}<span className="metric-unit">CHUYẾN</span></div>
            </div>
            <div className="metric-card">
              <div className="metric-title">Hàng đang trên đường</div>
              <div className="metric-number">{dangToi}<span className="metric-unit">CHUYẾN</span></div>
            </div>
            <div className="metric-card">
              <div className="metric-title">Lô đang bán</div>
              <div className="metric-number">{dangBan}<span className="metric-unit">LÔ</span></div>
            </div>
          </div>

          {loading && <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Đang tải dữ liệu...</div>}

          {!loading && activeTab === "receive" && (
            <div>
              <div className="tab-section-header">
                <div>
                  <h3 className="tab-section-title">Hàng nhà phân phối giao tới</h3>
                  <p className="tab-section-desc">
                    Khi hàng tới, cân và bấm "Nhận hàng" (hoặc "Từ chối"), rồi ký xác nhận ở mục Ký blockchain.
                  </p>
                </div>
              </div>
              <div className="table-container">
                <table className="batch-table">
                  <thead>
                    <tr>
                      <th>Lô hàng</th>
                      <th>Từ</th>
                      <th>Khối lượng</th>
                      <th>Giao bởi</th>
                      <th>Trạng thái</th>
                      <th style={{ textAlign: "center" }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hangToi.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding: 24, color: "#6b7280" }}>Chưa có hàng nào giao tới.</td></tr>
                    ) : (
                      hangToi.map((h) => {
                        const tt = TRANG_THAI_HANG[h.trang_thai] || { text: h.trang_thai, tone: "gray" };
                        return (
                          <tr key={h.ma_van_don}>
                            <td>
                              <strong>{h.ma_lo_nong_san}</strong> - {h.ten_san_pham}
                              <div style={{ fontSize: 12, color: "#6b7280" }}>{h.ma_phieu ? `Phiếu ${h.ma_phieu} · ` : ""}{h.ma_van_don}</div>
                            </td>
                            <td>{h.ten_nguoi_gui}</td>
                            <td style={{ fontWeight: 700 }}>
                              {soKg(h.khoi_luong, h.don_vi_tinh)}
                              {h.khoi_luong_nhan && <div style={{ fontSize: 12, color: "#15803d" }}>Nhận: {soKg(h.khoi_luong_nhan, h.don_vi_tinh)}</div>}
                            </td>
                            <td>
                              <Truck size={14} style={{ verticalAlign: "-2px" }} />{" "}
                              {Number(h.tu_giao) ? "Nhà phân phối tự giao" : h.ten_van_chuyen}
                              {h.bien_so_xe && <div style={{ fontSize: 12, color: "#6b7280" }}>{h.ten_tai_xe} · {h.bien_so_xe}</div>}
                            </td>
                            <td><span className={`status-pill ${tt.tone}`}>{tt.text}</span></td>
                            <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                              {h.trang_thai === "CHO_TIEP_NHAN" ? (
                                <>
                                  <button type="button" className="btn-primary-action" disabled={Boolean(dangXuLy)} onClick={() => nhanHang(h)}>
                                    <CheckCircle2 size={14} /> Nhận hàng
                                  </button>{" "}
                                  <button type="button" className="btn-cancel" disabled={Boolean(dangXuLy)} onClick={() => tuChoi(h)} style={{ color: "#dc2626" }}>
                                    <XCircle size={14} /> Từ chối
                                  </button>
                                </>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && activeTab === "stock" && (
            <div>
              <div className="tab-section-header">
                <div>
                  <h3 className="tab-section-title">Hàng trong cửa hàng</h3>
                  <p className="tab-section-desc">
                    Bán hết một lô thì bấm "Đã bán hết" và ký "Hoàn tất": lô kết thúc vòng đời trên blockchain.
                  </p>
                </div>
              </div>
              <div className="table-container">
                <table className="batch-table">
                  <thead>
                    <tr>
                      <th>Lô hàng</th>
                      <th>Nhập từ</th>
                      <th>Còn lại</th>
                      <th>Xác thực</th>
                      <th style={{ textAlign: "center" }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kho.length === 0 ? (
                      <tr><td colSpan={5} style={{ padding: 24, color: "#6b7280" }}>Chưa có lô nào trong cửa hàng.</td></tr>
                    ) : (
                      kho.map((l) => {
                        const xt = TRANG_THAI_XAC_THUC[l.integrity_status] || TRANG_THAI_XAC_THUC.NOT_CHECKED;
                        const xong = l.giai_doan_hien_tai === "COMPLETED";
                        return (
                          <tr key={l.ma_lo_nong_san}>
                            <td><strong>{l.ma_lo_nong_san}</strong> - {l.ten_san_pham}</td>
                            <td>{l.nhap_tu || "—"}</td>
                            <td style={{ fontWeight: 700 }}>{xong ? "Đã bán hết" : soKg(l.so_luong_hien_tai, l.don_vi_tinh)}</td>
                            <td><span className={`status-pill ${xt.tone}`}>{xt.text}</span></td>
                            <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                              <button
                                type="button"
                                className="btn-action-view-outline"
                                onClick={() => navigate(`/lo-hang/${encodeURIComponent(l.ma_lo_nong_san)}`)}
                                title="Xem chi tiết lô và lấy mã QR"
                              >
                                <Eye size={14} /> Chi tiết &amp; QR
                              </button>{" "}
                              <a
                                className="btn-action-view-outline"
                                href={`/chi-tiet-user?malohang=${encodeURIComponent(l.ma_lo_nong_san)}`}
                                target="_blank"
                                rel="noreferrer"
                                title="Trang tra cứu của người mua"
                              >
                                <Eye size={14} /> Tra cứu
                              </a>{" "}
                              {!xong && (
                                <button type="button" className="btn-primary-action" disabled={Boolean(dangXuLy)} onClick={() => banHet(l)}>
                                  <CheckCircle2 size={14} /> Đã bán hết
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "blockchain" && (
            <div style={{ maxWidth: 980, paddingTop: 16 }}>
              <p style={{ fontSize: 13.5, color: "#4b5563", margin: "0 0 12px", lineHeight: 1.5 }}>
                Đại lý ký khi nhận hàng (kèm khối lượng thực nhận), khi từ chối nhận, và khi xác nhận đã bán hết lô.
              </p>
              <BlockchainPanel />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default DaiLyPage;
