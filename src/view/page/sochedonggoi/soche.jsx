import React, { useState, useEffect, useCallback } from "react";
import usePersistentTab from "../../../hooks/usePersistentTab";
import {
  ArrowRightLeft,
  Package,
  Layers,
  Check,
  CheckCheck,
  PlusCircle,
  Edit3,
  Trash2,
  QrCode,
  GitFork,
  Plus,
  Split,
  Combine,
  Truck,
  Box,
  X,
  XCircle,
  Calendar,
  AlertCircle,
  Scale,
  Clock,
  CheckCircle2,
  SendHorizontal,
  Eye,
  MapPin,
  FileText,
  MoreVertical,
  LogOut,
  Wallet,
} from "lucide-react";
import "../../css/soche.css";
import BlockchainPanel from "../blockchainpannel";
import { useNavigate } from "react-router-dom";
import {
  fetchIncomingShipments,
  confirmReceiveShipment,
  rejectReceiveShipment,
  fetchAvailableRawLots,
  fetchProcessingBatches,
  createProcessingBatch,
  updateProcessingStage,
  updateProcessingBatch,
  deleteProcessingBatch,
  fetchSplitMergeLots,
  fetchSplitMergeLog,
  splitBatch,
  mergeBatch,
  fetchReadyToShip,
  fetchTransporters,
  fetchDistributors,
  fetchShipments,
  createShipment,
} from "../../../api/sochedonggoiApi";

const DEFAULT_LOGO_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png";

// Nhãn + màu badge cho trạng thái lệnh vận chuyển (lenh_van_chuyen.trang_thai)
const SHIPMENT_STATUS_LABEL = {
  CHO_CHAP_NHAN: {
    text: "Chờ đơn vị vận chuyển xác nhận",
    tone: "warning",
    icon: Clock,
  },
  CHO_LAY_HANG: { text: "Chờ xe đến lấy hàng", tone: "info", icon: Truck },
  DANG_VAN_CHUYEN: {
    text: "Đang vận chuyển tới cơ sở",
    tone: "info",
    icon: Truck,
  },
  CHO_TIEP_NHAN: {
    text: "Đã đến nơi - Sẵn sàng tiếp nhận",
    tone: "purple",
    icon: Clock,
  },
  HOAN_THANH: {
    text: "Đã tiếp nhận & nhập kho",
    tone: "success",
    icon: CheckCircle2,
  },
  TU_CHOI: { text: "Đã từ chối tiếp nhận", tone: "danger", icon: XCircle },
  DA_HUY: { text: "Đã hủy", tone: "danger", icon: XCircle },
};

const PROCESSING_STAGE_LABEL = {
  DANG_RUA_KHU_KHUAN: "Đang rửa sạch & diệt khuẩn bằng Ozon",
  DANG_PHAN_LOAI: "Đang phân loại theo kích thước & độ ngọt",
  DANG_DONG_GOI: "Đang bọc màng co & đóng gói thùng",
  DA_HOAN_TAT: "Đã đóng gói hoàn tất - Sẵn sàng xuất kho",
};

const formatWeight = (value, unit) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return `- ${unit || ""}`;

  // Lưu trữ luôn theo kg; hiển thị tự quy đổi sang Tấn khi đạt 1.000kg trở lên
  // cho dễ đọc (vd: 3500 -> "3,5 Tấn"), dưới mức đó vẫn hiện kg (vd: "900 kg").
  if ((unit || "").toLowerCase() === "kg" && num >= 1000) {
    const tons = num / 1000;
    return `${tons.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} Tấn`;
  }

  return `${num.toLocaleString("vi-VN", { maximumFractionDigits: 3 })} ${unit || ""}`;
};

const ProcessingPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Tab chính: reception -> processing -> batch-split-merge -> shipping
  const [activeTab, setActiveTab] = usePersistentTab("soche", "reception", [
    "reception",
    "processing",
    "batch-split-merge",
    "shipping",
    "blockchain",
  ]);

  const [receptionFilter, setReceptionFilter] = useState("ALL");
  const [processingFilter, setProcessingFilter] = useState("ALL");
  const [shippingFilter, setShippingFilter] = useState("ALL");

  // Dữ liệu thật từ API
  const [incomingShipments, setIncomingShipments] = useState([]);
  const [processingBatches, setProcessingBatches] = useState([]);
  const [availableRawLots, setAvailableRawLots] = useState([]);
  const [splitMergeLots, setSplitMergeLots] = useState([]);
  const [splitMergeLog, setSplitMergeLog] = useState([]);
  const [readyToShip, setReadyToShip] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [shipments, setShipments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [openDropdownId, setOpenDropdownId] = useState(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);

  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receivingShipment, setReceivingShipment] = useState(null);
  const [actualWeightInput, setActualWeightInput] = useState("");

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingShipment, setRejectingShipment] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [handoverBatch, setHandoverBatch] = useState(null);
  // Khác null khi mở từ nút "Tạo lệnh bàn giao" mà có nhiều lô sẵn sàng: người dùng phải chọn lô trong hộp thoại
  const [handoverPickList, setHandoverPickList] = useState(null);
  const [handoverForm, setHandoverForm] = useState({
    ma_don_vi_van_chuyen: "",
    ma_ben_nhan: "",
    dia_chi_giao_hang: "",
  });
  const [distributors, setDistributors] = useState([]);

  const [showShippingDetailModal, setShowShippingDetailModal] = useState(false);
  const [selectedShippingDetail, setSelectedShippingDetail] = useState(null);

  // Tạo lô sơ chế
  const [createForm, setCreateForm] = useState({
    ma_lo_nguon: "",
    tieu_de: "",
    khu_vuc_so_che: "Dây chuyền rửa Ozon A",
    quy_cach_tieu_chuan: "",
  });

  // Sửa thông tin lô sơ chế (tên gọi, khu vực, quy cách)
  const [editForm, setEditForm] = useState({
    ma_so_che: "",
    ma_lo_moi: "",
    tieu_de: "",
    khu_vuc_so_che: "",
    quy_cach_tieu_chuan: "",
  });

  // Cập nhật trạng thái sơ chế
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [newStage, setNewStage] = useState("DANG_RUA_KHU_KHUAN");

  // Tách lô
  const [splitForm, setSplitForm] = useState({
    ma_lo_goc: "",
    child1Weight: "",
    child1Grade: "Loại 1 Xuất Khẩu",
    child2Weight: "",
    child2Grade: "Loại 2 Nội Địa",
  });

  // Gộp lô
  const [mergeSelected, setMergeSelected] = useState([]);
  const [mergeTitle, setMergeTitle] = useState("");

  // ==================== TẢI DỮ LIỆU ====================

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (!savedUser) {
      navigate("/");
      return;
    }
    try {
      setUser(JSON.parse(savedUser));
    } catch {
      localStorage.removeItem("user");
      navigate("/");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/dang-nhap");
  };

  // nen = true: tải lại âm thầm (không hiện "Đang tải" che mất tab đang mở, vd tab Ký blockchain đang chờ MetaMask)
  const loadAll = useCallback(async (nen = false) => {
    if (!nen) setLoading(true);
    setErrorMsg("");
    try {
      const [
        incoming,
        processing,
        rawLots,
        splitLots,
        log,
        ready,
        trans,
        dists,
        ships,
      ] = await Promise.all([
        fetchIncomingShipments(),
        fetchProcessingBatches(),
        fetchAvailableRawLots(),
        fetchSplitMergeLots(),
        fetchSplitMergeLog(),
        fetchReadyToShip(),
        fetchTransporters(),
        fetchDistributors(),
        fetchShipments(),
      ]);
      setIncomingShipments(incoming?.data || []);
      setProcessingBatches(processing?.data || []);
      setAvailableRawLots(rawLots?.data || []);
      setSplitMergeLots(splitLots?.data || []);
      setSplitMergeLog(log?.data || []);
      setReadyToShip(ready?.data || []);
      setTransporters(trans?.data || []);
      setDistributors(dists?.data || []);
      setShipments(ships?.data || []);
    } catch (err) {
      setErrorMsg(err.message || "Không thể tải dữ liệu từ máy chủ");
    } finally {
      if (!nen) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadAll();
  }, [user, loadAll]);

  // Quay lại các tab nghiệp vụ (vd sau khi ký ở tab Ký blockchain) thì tải lại để thấy lô / bước đã ký, không cần F5
  useEffect(() => {
    if (user && activeTab !== "blockchain") loadAll(true);
  }, [activeTab, user, loadAll]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest(".action-menu-wrapper")) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  // Thao tác có ký blockchain: báo rõ bước vừa tạo và chuyển sang tab Ký blockchain để ký ngay
  const baoChoKy = (res, macDinh) => {
    alert(res?.message || macDinh);
    if (res?.cho_ky) setActiveTab("blockchain");
  };

  // Lô còn sự kiện chưa ký thì báo lý do và không làm tiếp (trả true nếu bị chặn)
  const chanNeuChuaKy = (item) => {
    if (item?.chua_ky_lo) {
      alert(item.ly_do_chua_ky);
      return true;
    }
    return false;
  };

  // ==================== TIẾP NHẬN ====================

  const handleOpenReceiveModal = (shipment) => {
    setReceivingShipment(shipment);
    setActualWeightInput(String(Math.round(Number(shipment.khoi_luong))));
    setShowReceiveModal(true);
  };

  const handleConfirmFinalReceive = async () => {
    const value = Number(actualWeightInput);
    if (!actualWeightInput || !Number.isFinite(value) || value <= 0) {
      alert("Vui lòng nhập khối lượng cân thực tế hợp lệ!");
      return;
    }
    try {
      const res = await confirmReceiveShipment(
        receivingShipment.ma_van_don,
        value,
      );
      setShowReceiveModal(false);
      await loadAll();
      baoChoKy(
        res,
        `Đã tiếp nhận thành công lô ${receivingShipment.ma_lo_nong_san} vào kho với khối lượng ${value.toLocaleString("vi-VN")} kg.`,
      );
    } catch (err) {
      alert(err.message || "Không thể xác nhận tiếp nhận");
    }
  };

  const handleOpenRejectModal = (shipment) => {
    setRejectingShipment(shipment);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      alert("Vui lòng nhập lý do từ chối!");
      return;
    }
    try {
      const res = await rejectReceiveShipment(
        rejectingShipment.ma_van_don,
        rejectReason.trim(),
      );
      setShowRejectModal(false);
      await loadAll();
      baoChoKy(
        res,
        `Đã từ chối tiếp nhận lô ${rejectingShipment.ma_lo_nong_san}.`,
      );
    } catch (err) {
      alert(err.message || "Không thể từ chối tiếp nhận");
    }
  };

  const filteredIncoming = incomingShipments.filter((item) => {
    if (receptionFilter === "ALL") return true;
    return item.trang_thai === receptionFilter;
  });

  // ==================== SƠ CHẾ & ĐÓNG GÓI ====================

  const handleOpenCreateModal = () => {
    setCreateForm({
      ma_lo_nguon: availableRawLots[0]?.ma_lo_nong_san || "",
      tieu_de: "",
      khu_vuc_so_che: "Dây chuyền rửa Ozon A",
      quy_cach_tieu_chuan: "",
    });
    setShowCreateModal(true);
  };

  const handleSubmitCreate = async () => {
    const { ma_lo_nguon, tieu_de, khu_vuc_so_che, quy_cach_tieu_chuan } =
      createForm;
    if (!ma_lo_nguon) return alert("Vui lòng chọn lô đã tiếp nhận!");
    if (!tieu_de.trim()) return alert("Vui lòng nhập tên gọi lô sơ chế!");

    if (
      chanNeuChuaKy(
        availableRawLots.find((l) => l.ma_lo_nong_san === ma_lo_nguon),
      )
    )
      return;

    try {
      const res = await createProcessingBatch({
        ma_lo_nguon,
        tieu_de: tieu_de.trim(),
        khu_vuc_so_che,
        quy_cach_tieu_chuan: quy_cach_tieu_chuan.trim(),
      });
      setShowCreateModal(false);
      await loadAll();
      baoChoKy(res, "Đã bắt đầu sơ chế trên lô đã nhận (giữ nguyên mã lô).");
    } catch (err) {
      alert(err.message || "Không thể tạo lô sơ chế");
    }
  };

  const handleOpenEditModal = (batch) => {
    setEditForm({
      ma_so_che: batch.ma_so_che,
      ma_lo_moi: batch.ma_lo_moi,
      tieu_de: batch.tieu_de || "",
      khu_vuc_so_che: batch.khu_vuc_so_che || "",
      quy_cach_tieu_chuan: batch.quy_cach_tieu_chuan || "",
    });
    setShowEditModal(true);
    setOpenDropdownId(null);
  };

  const handleSubmitEdit = async () => {
    if (!editForm.tieu_de.trim())
      return alert("Vui lòng nhập tên gọi lô sơ chế!");

    try {
      await updateProcessingBatch(editForm.ma_so_che, {
        tieu_de: editForm.tieu_de.trim(),
        khu_vuc_so_che: editForm.khu_vuc_so_che.trim(),
        quy_cach_tieu_chuan: editForm.quy_cach_tieu_chuan.trim(),
      });
      setShowEditModal(false);
      await loadAll();
      alert("Đã cập nhật thông tin lô sơ chế!");
    } catch (err) {
      alert(err.message || "Không thể cập nhật thông tin lô sơ chế");
    }
  };

  const handleOpenStatusModal = (batch) => {
    setOpenDropdownId(null);
    if (chanNeuChuaKy(batch)) return;
    setSelectedBatchId(batch.ma_so_che);
    setNewStage(batch.giai_doan_so_che);
    setShowStatusModal(true);
    setOpenDropdownId(null);
  };

  const handleSubmitStatus = async () => {
    try {
      const res = await updateProcessingStage(selectedBatchId, newStage);
      setShowStatusModal(false);
      await loadAll();
      baoChoKy(res, "Cập nhật trạng thái thành công!");
    } catch (err) {
      alert(err.message || "Không thể cập nhật trạng thái");
    }
  };

  const handleDeleteProcessing = async (batch) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa lô ${batch.ma_lo_moi}?`))
      return;
    try {
      await deleteProcessingBatch(batch.ma_so_che);
      await loadAll();
    } catch (err) {
      alert(err.message || "Không thể xóa lô sơ chế");
    }
  };

  const handleOpenHandover = (batch) => {
    if (chanNeuChuaKy(batch)) return;
    setHandoverPickList(null);
    setHandoverBatch(batch);
    setHandoverForm({
      ma_don_vi_van_chuyen: "",
      ma_ben_nhan: "",
      dia_chi_giao_hang: "",
    });
    setShowHandoverModal(true);
  };

  const filteredProcessing = processingBatches.filter((b) => {
    if (processingFilter === "ALL") return true;
    if (processingFilter === "PACKAGED")
      return b.giai_doan_so_che === "DA_HOAN_TAT";
    if (processingFilter === "PROCESSING")
      return b.giai_doan_so_che !== "DA_HOAN_TAT";
    return true;
  });

  // ==================== TÁCH / GỘP LÔ ====================

  const handleSubmitSplit = async () => {
    const { ma_lo_goc, child1Weight, child1Grade, child2Weight, child2Grade } =
      splitForm;
    const w1 = Number(child1Weight);
    const w2 = Number(child2Weight);
    if (!ma_lo_goc) return alert("Vui lòng chọn lô gốc cần tách!");
    if (!w1 || w1 <= 0 || !w2 || w2 <= 0)
      return alert("Khối lượng mỗi lô con phải lớn hơn 0!");
    if (
      chanNeuChuaKy(splitMergeLots.find((l) => l.ma_lo_nong_san === ma_lo_goc))
    )
      return;

    try {
      const res = await splitBatch(ma_lo_goc, [
        { khoi_luong: w1, pham_cap: child1Grade },
        { khoi_luong: w2, pham_cap: child2Grade },
      ]);
      setShowSplitModal(false);
      await loadAll();
      baoChoKy(res, "Đã tách lô thành công!");
    } catch (err) {
      alert(err.message || "Không thể tách lô");
    }
  };

  const handleToggleMergeSelect = (maLo) => {
    setMergeSelected((prev) =>
      prev.includes(maLo) ? prev.filter((x) => x !== maLo) : [...prev, maLo],
    );
  };

  const mergeTotalWeight = splitMergeLots
    .filter((l) => mergeSelected.includes(l.ma_lo_nong_san))
    .reduce((sum, l) => sum + Number(l.so_luong_hien_tai), 0);

  const handleSubmitMerge = async () => {
    if (mergeSelected.length < 2)
      return alert("Vui lòng chọn ít nhất 2 lô để gộp!");
    const loChuaKy = splitMergeLots.find(
      (l) => mergeSelected.includes(l.ma_lo_nong_san) && l.chua_ky_lo,
    );
    if (chanNeuChuaKy(loChuaKy)) return;
    try {
      const res = await mergeBatch(mergeSelected, mergeTitle.trim() || null);
      setShowMergeModal(false);
      setMergeSelected([]);
      setMergeTitle("");
      await loadAll();
      baoChoKy(res, "Đã gộp lô thành công!");
    } catch (err) {
      alert(err.message || "Không thể gộp lô");
    }
  };

  // ==================== BÀN GIAO VẬN CHUYỂN ====================

  const handleOpenGenericHandover = () => {
    if (readyToShip.length === 0) {
      alert("Chưa có lô nào hoàn tất đóng gói để bàn giao!");
      return;
    }
    if (readyToShip.length > 1) {
      // Nhiều lô sẵn sàng bàn giao: không tự chọn đại 1 lô, bắt buộc người dùng chọn rõ trong hộp thoại.
      handleOpenHandover(null);
      setHandoverPickList(readyToShip);
      return;
    }
    handleOpenHandover(readyToShip[0]);
  };

  const handleOpenShippingDetail = (item) => {
    setSelectedShippingDetail(item);
    setShowShippingDetailModal(true);
  };

  const handleConfirmHandover = async () => {
    const { ma_don_vi_van_chuyen, ma_ben_nhan, dia_chi_giao_hang } =
      handoverForm;
    if (!handoverBatch) return alert("Vui lòng chọn lô hàng cần bàn giao!");
    if (chanNeuChuaKy(handoverBatch)) return;
    if (!ma_don_vi_van_chuyen) return alert("Vui lòng chọn đơn vị vận chuyển!");
    if (!ma_ben_nhan && !dia_chi_giao_hang.trim())
      return alert(
        "Vui lòng chọn nhà phân phối nhận hàng hoặc nhập điểm giao hàng!",
      );

    try {
      const maLoHang = handoverBatch.ma_lo_moi || handoverBatch.ma_lo_nong_san;
      const res = await createShipment({
        ma_lo_nong_san: maLoHang,
        ma_don_vi_van_chuyen,
        ma_ben_nhan: ma_ben_nhan || undefined,
        dia_chi_giao_hang: dia_chi_giao_hang.trim() || undefined,
      });
      setShowHandoverModal(false);
      await loadAll();
      if (res?.cho_ky) {
        baoChoKy(res);
      } else {
        alert(
          `Đã tạo vận đơn ${res?.data?.ma_van_don || ""} cho đơn vị vận chuyển thành công!`,
        );
        setActiveTab("shipping");
      }
    } catch (err) {
      alert(err.message || "Không thể tạo lệnh bàn giao");
    }
  };

  const filteredShipments = shipments.filter((item) => {
    if (shippingFilter === "ALL") return true;
    return item.trang_thai === shippingFilter;
  });

  if (!user) return null;

  return (
    <div className="soche">
      <div className="soche-dashboard">
        {/* ================= HEADER ================= */}
        <header className="dashboard-header">
          <div className="header-left">
            <img
              src={DEFAULT_LOGO_IMG}
              alt="Logo"
              className="header-logo-icon"
            />
            <span className="header-brand-title">AGRICHAIN</span>
          </div>

          <div className="header-search-bar">
            <input
              type="text"
              placeholder="Tìm kiếm lô nông sản, mã sơ chế..."
            />
          </div>

          <div
            className="header-profile"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/trang-ca-nhan")}
            title="Xem hồ sơ cá nhân"
          >
            <div className="avatar-circle" style={{ overflow: "hidden" }}>
              {user.anh_dai_dien ? (
                <img
                  src={`http://localhost:3000${user.anh_dai_dien}`}
                  alt="avatar"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "50%",
                  }}
                />
              ) : (
                (user.ho_ten || "CS").slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="profile-meta">
              <span className="profile-name">
                {user.ho_ten || "Cơ sở sơ chế"}
              </span>
              <span className="profile-role">Cơ sở sơ chế / Đóng gói</span>
            </div>
          </div>
        </header>

        {/* ================= BODY ================= */}
        <div className="dashboard-body">
          <aside className="dashboard-sidebar">
            <div>
              <div className="sidebar-heading">Chức năng cơ sở</div>
              <nav className="sidebar-nav">
                <button
                  type="button"
                  onClick={() => setActiveTab("reception")}
                  className={`nav-item-btn ${activeTab === "reception" ? "active" : ""}`}
                >
                  <ArrowRightLeft size={20} />
                  <span>Tiếp nhận lô nông sản</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("processing")}
                  className={`nav-item-btn ${activeTab === "processing" ? "active" : ""}`}
                >
                  <Package size={20} />
                  <span>Quản lý sơ chế đóng gói</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("batch-split-merge")}
                  className={`nav-item-btn ${activeTab === "batch-split-merge" ? "active" : ""}`}
                >
                  <Layers size={20} />
                  <span>Quản lý tách / gộp lô</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("shipping")}
                  className={`nav-item-btn ${activeTab === "shipping" ? "active" : ""}`}
                >
                  <Truck size={20} />
                  <span>Bàn giao vận chuyển</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("blockchain")}
                  className={`nav-item-btn ${activeTab === "blockchain" ? "active" : ""}`}
                >
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
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "calc(100% - 24px)",
                  margin: "0 12px 10px",
                  padding: "10px 12px",
                  border: "1px solid #fecaca",
                  background: "#fef2f2",
                  color: "#dc2626",
                  borderRadius: 8,
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <LogOut size={17} />
                Đăng xuất
              </button>

              <div className="sidebar-footer">
                <span className="pulse-dot"></span>
                <span>
                  Tài khoản: <b>{user.ten_dang_nhap}</b>
                </span>
              </div>
            </div>
          </aside>

          <main className="dashboard-content">
            <div className="dashboard-content-inner">
              {errorMsg && (
                <div
                  style={{
                    background: "#fef2f2",
                    color: "#dc2626",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    marginBottom: "16px",
                  }}
                >
                  {errorMsg}
                </div>
              )}

              {loading ? (
                <div
                  style={{
                    padding: "48px 0",
                    textAlign: "center",
                    color: "#6b7280",
                  }}
                >
                  Đang tải dữ liệu...
                </div>
              ) : (
                <>
                  {activeTab === "blockchain" && (
                    <div style={{ maxWidth: 980, paddingTop: 16 }}>
                      <p
                        style={{
                          fontSize: 13.5,
                          color: "#4b5563",
                          margin: "0 0 12px",
                          lineHeight: 1.5,
                        }}
                      >
                        Mỗi bước của cơ sở (nhận / từ chối hàng, tạo lô, đóng
                        gói, tách / gộp, tạo lệnh bàn giao) chỉ có hiệu lực sau
                        khi bạn ký ở đây. Các bước của một lô ký theo thứ tự.
                      </p>
                      <BlockchainPanel onDaKy={() => loadAll(true)} />
                    </div>
                  )}

                  {/* ================= TAB 1: TIẾP NHẬN LÔ NÔNG SẢN ================= */}
                  {activeTab === "reception" && (
                    <div>
                      <div className="metrics-row">
                        <div className="metric-card">
                          <div className="metric-title">Chờ xử lý</div>
                          <div className="metric-number">
                            {
                              incomingShipments.filter(
                                (b) =>
                                  !["HOAN_THANH", "TU_CHOI"].includes(
                                    b.trang_thai,
                                  ),
                              ).length
                            }
                            <span className="metric-unit">LÔ HÀNG</span>
                          </div>
                        </div>

                        <div className="metric-card">
                          <div className="metric-title">
                            Đã tiếp nhận nhập kho
                          </div>
                          <div className="metric-number">
                            {
                              incomingShipments.filter(
                                (b) => b.trang_thai === "HOAN_THANH",
                              ).length
                            }
                            <span className="metric-unit">LÔ ĐÃ NHẬP</span>
                          </div>
                        </div>

                        <div className="actions-box">
                          <select
                            className="filter-select"
                            value={receptionFilter}
                            onChange={(e) => setReceptionFilter(e.target.value)}
                          >
                            <option value="ALL">Tất cả lô hàng</option>
                            <option value="CHO_CHAP_NHAN">
                              Chờ xe xác nhận
                            </option>
                            <option value="CHO_LAY_HANG">Chờ lấy hàng</option>
                            <option value="DANG_VAN_CHUYEN">
                              Đang vận chuyển
                            </option>
                            <option value="CHO_TIEP_NHAN">Chờ tiếp nhận</option>
                            <option value="HOAN_THANH">Đã tiếp nhận</option>
                            <option value="TU_CHOI">Đã từ chối</option>
                          </select>
                        </div>
                      </div>

                      {filteredIncoming.length === 0 ? (
                        <div
                          style={{
                            padding: "48px 0",
                            textAlign: "center",
                            color: "#6b7280",
                          }}
                        >
                          <AlertCircle
                            size={40}
                            style={{ margin: "0 auto 10px", color: "#9ca3af" }}
                          />
                          <p>
                            Không có lô nông sản nào phù hợp với bộ lọc hiện
                            tại.
                          </p>
                        </div>
                      ) : (
                        filteredIncoming.map((shipment) => {
                          const statusInfo =
                            SHIPMENT_STATUS_LABEL[shipment.trang_thai] ||
                            SHIPMENT_STATUS_LABEL.CHO_CHAP_NHAN;
                          const StatusIcon = statusInfo.icon;
                          // Chỉ tiếp nhận/từ chối được khi đơn vị vận chuyển đã báo đến nơi
                          const canAct =
                            shipment.trang_thai === "CHO_TIEP_NHAN";

                          return (
                            <div
                              className="card-item"
                              key={shipment.ma_van_don}
                            >
                              <div
                                className={`card-icon-box ${
                                  shipment.trang_thai === "HOAN_THANH"
                                    ? "green"
                                    : shipment.trang_thai === "TU_CHOI"
                                      ? "amber"
                                      : "blue"
                                }`}
                              >
                                {shipment.trang_thai === "HOAN_THANH" ? (
                                  <CheckCheck size={28} />
                                ) : (
                                  <Truck size={28} />
                                )}
                              </div>

                              <div className="card-body">
                                <div className="card-header-line">
                                  <h3 className="card-title">
                                    {shipment.ten_san_pham} (
                                    {shipment.ma_lo_nong_san})
                                  </h3>
                                  <span className="tag-badge gray">
                                    {shipment.ma_van_don}
                                  </span>
                                  {shipment.ten_nong_trai && (
                                    <span className="tag-badge green">
                                      {shipment.ten_nong_trai}
                                    </span>
                                  )}
                                </div>

                                <div className="card-meta-row">
                                  <span>
                                    Người gửi:{" "}
                                    <strong>{shipment.ten_nguoi_gui}</strong>
                                  </span>
                                  <span>
                                    Khối lượng:{" "}
                                    <strong>
                                      {formatWeight(
                                        shipment.khoi_luong,
                                        shipment.don_vi_tinh,
                                      )}
                                    </strong>
                                  </span>
                                  <span>
                                    Đơn vị vận chuyển:{" "}
                                    <strong>
                                      {shipment.ten_don_vi_van_chuyen}
                                    </strong>
                                  </span>
                                  {shipment.ten_tai_xe && (
                                    <span>
                                      Tài xế:{" "}
                                      <strong>{shipment.ten_tai_xe}</strong>
                                    </span>
                                  )}
                                </div>

                                {shipment.ghi_chu && (
                                  <div className="card-desc">
                                    <strong>Ghi chú:</strong> {shipment.ghi_chu}
                                  </div>
                                )}

                                <div className="arrival-banner">
                                  <Calendar size={15} />
                                  <span>
                                    Thời gian xuất:{" "}
                                    <strong>{shipment.thoi_gian_xuat}</strong>
                                  </span>
                                </div>

                                <div style={{ marginTop: "10px" }}>
                                  <span
                                    className={`badge-status-line ${statusInfo.tone}`}
                                  >
                                    <StatusIcon size={14} /> {statusInfo.text}
                                  </span>
                                  {shipment.cho_ky && (
                                    <span
                                      className="badge-status-line warning"
                                      style={{ marginLeft: 8 }}
                                    >
                                      <Clock size={14} />
                                      {shipment.cho_ky === "NHAN_HANG"
                                        ? " Đã bấm tiếp nhận - chờ bạn ký blockchain"
                                        : " Đã bấm từ chối - chờ bạn ký blockchain"}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="card-actions">
                                {canAct && shipment.cho_ky && (
                                  <button
                                    className="btn-action-outline blue"
                                    onClick={() => setActiveTab("blockchain")}
                                  >
                                    <Clock size={16} /> Đi tới Ký blockchain
                                  </button>
                                )}
                                {canAct && !shipment.cho_ky && (
                                  <>
                                    <button
                                      className="btn-action-outline blue"
                                      onClick={() =>
                                        handleOpenReceiveModal(shipment)
                                      }
                                    >
                                      <Scale size={16} /> Tiếp nhận lô
                                    </button>
                                    <button
                                      className="btn-action-outline danger"
                                      onClick={() =>
                                        handleOpenRejectModal(shipment)
                                      }
                                    >
                                      <XCircle size={16} /> Từ chối
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* ================= TAB 2: QUẢN LÝ SƠ CHẾ & ĐÓNG GÓI ================= */}
                  {activeTab === "processing" && (
                    <div>
                      <div className="metrics-row">
                        <div className="metric-card">
                          <div className="metric-title">Lô đang sơ chế</div>
                          <div className="metric-number">
                            {
                              processingBatches.filter(
                                (b) => b.giai_doan_so_che !== "DA_HOAN_TAT",
                              ).length
                            }
                            <span className="metric-unit">LÔ ĐANG CHẠY</span>
                          </div>
                        </div>

                        <div className="metric-card">
                          <div className="metric-title">
                            Đóng gói sẵn sàng xuất kho
                          </div>
                          <div className="metric-number">
                            {
                              processingBatches.filter(
                                (b) => b.giai_doan_so_che === "DA_HOAN_TAT",
                              ).length
                            }
                            <span className="metric-unit">LÔ HOÀN TẤT</span>
                          </div>
                        </div>

                        <div className="actions-box">
                          <select
                            className="filter-select"
                            value={processingFilter}
                            onChange={(e) =>
                              setProcessingFilter(e.target.value)
                            }
                          >
                            <option value="ALL">
                              Tất cả trạng thái sơ chế
                            </option>
                            <option value="PROCESSING">
                              Đang sơ chế & phân loại
                            </option>
                            <option value="PACKAGED">
                              Đã đóng gói (Chờ bàn giao)
                            </option>
                          </select>

                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              className="btn-secondary-action"
                              style={{ flex: 1 }}
                              onClick={() => setActiveTab("batch-split-merge")}
                            >
                              <GitFork size={15} /> Tách / Gộp
                            </button>
                            <button
                              className="btn-primary-action"
                              style={{ flex: 1.5 }}
                              onClick={handleOpenCreateModal}
                            >
                              <Plus size={16} /> Bắt đầu sơ chế
                            </button>
                          </div>
                        </div>
                      </div>

                      {filteredProcessing.length === 0 ? (
                        <div
                          style={{
                            padding: "48px 0",
                            textAlign: "center",
                            color: "#6b7280",
                          }}
                        >
                          <AlertCircle
                            size={40}
                            style={{ margin: "0 auto 10px", color: "#9ca3af" }}
                          />
                          <p>Chưa có lô sơ chế nào.</p>
                        </div>
                      ) : (
                        filteredProcessing.map((b) => {
                          const isPackaged =
                            b.giai_doan_so_che === "DA_HOAN_TAT";

                          return (
                            <div className="card-item" key={b.ma_so_che}>
                              <div
                                className={`card-icon-box ${isPackaged ? "amber" : "green"}`}
                              >
                                {isPackaged ? (
                                  <Box size={28} />
                                ) : (
                                  <Package size={28} />
                                )}
                              </div>
                              <div className="card-body">
                                <div className="card-header-line">
                                  <h3 className="card-title">{b.tieu_de}</h3>
                                  <span className="tag-badge gray">
                                    {b.ma_lo_moi}
                                  </span>
                                  {b.ma_lo_nguon && (
                                    <span className="tag-badge green">
                                      Nguồn: {b.ma_lo_nguon}
                                    </span>
                                  )}
                                </div>

                                <div className="card-meta-row">
                                  <span>
                                    Sản phẩm: <strong>{b.ten_san_pham}</strong>
                                  </span>
                                  <span>
                                    Khối lượng:{" "}
                                    <strong>
                                      {formatWeight(
                                        b.so_luong_hien_tai,
                                        b.don_vi_tinh,
                                      )}
                                    </strong>
                                  </span>
                                  <span>
                                    Bắt đầu:{" "}
                                    <strong>
                                      {new Date(
                                        b.ngay_bat_dau,
                                      ).toLocaleDateString("vi-VN")}
                                    </strong>
                                  </span>
                                  <span>
                                    Trạng thái:{" "}
                                    <strong
                                      style={{
                                        color: isPackaged
                                          ? "#16a34a"
                                          : "#2563eb",
                                      }}
                                    >
                                      {
                                        PROCESSING_STAGE_LABEL[
                                          b.giai_doan_so_che
                                        ]
                                      }
                                    </strong>
                                  </span>
                                </div>

                                {(b.khu_vuc_so_che ||
                                  b.quy_cach_tieu_chuan) && (
                                  <div className="card-desc">
                                    <strong>Quy trình & Tiêu chuẩn:</strong>
                                    <ul>
                                      {b.khu_vuc_so_che && (
                                        <li>Khu vực: {b.khu_vuc_so_che}</li>
                                      )}
                                      {b.quy_cach_tieu_chuan && (
                                        <li>{b.quy_cach_tieu_chuan}</li>
                                      )}
                                    </ul>
                                  </div>
                                )}

                                {b.ngay_hoan_tat && (
                                  <span className="badge-status-line success">
                                    <Clock size={13} /> Hoàn tất:{" "}
                                    {new Date(
                                      b.ngay_hoan_tat,
                                    ).toLocaleDateString("vi-VN")}
                                  </span>
                                )}

                                {b.chua_ky_lo && (
                                  <div style={{ marginTop: 8 }}>
                                    <span
                                      className="badge-status-line warning"
                                      title={b.ly_do_chua_ky}
                                    >
                                      <Clock size={13} />{" "}
                                      {b.cho_ky_giai_doan
                                        ? `Chờ ký để chuyển sang: ${PROCESSING_STAGE_LABEL[b.cho_ky_giai_doan] || b.cho_ky_giai_doan}`
                                        : "Chờ ký blockchain bước tạo lô"}
                                    </span>
                                    <button
                                      type="button"
                                      className="btn-detail-table"
                                      style={{ marginLeft: 8 }}
                                      onClick={() => setActiveTab("blockchain")}
                                    >
                                      Ký ngay
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div className="card-actions">
                                <div className="action-menu-wrapper">
                                  <button
                                    type="button"
                                    className={`btn-more-dots ${openDropdownId === b.ma_so_che ? "active" : ""}`}
                                    title="Tùy chọn thao tác"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenDropdownId(
                                        openDropdownId === b.ma_so_che
                                          ? null
                                          : b.ma_so_che,
                                      );
                                    }}
                                  >
                                    <MoreVertical size={18} />
                                  </button>

                                  {openDropdownId === b.ma_so_che && (
                                    <div className="action-dropdown-menu">
                                      <button
                                        type="button"
                                        className="dropdown-item-btn"
                                        onClick={() => {
                                          setOpenDropdownId(null);
                                          navigate(
                                            `/chi-tiet-so-che/${b.ma_so_che}`,
                                          );
                                        }}
                                      >
                                        <Eye size={15} /> Xem chi tiết
                                      </button>

                                      <button
                                        type="button"
                                        className="dropdown-item-btn"
                                        onClick={() => {
                                          setOpenDropdownId(null);
                                          navigate(`/lo-hang/${encodeURIComponent(b.ma_lo_moi)}`);
                                        }}
                                      >
                                        <Eye size={15} /> Chi tiết lô &amp; mã QR
                                      </button>

                                      {/* Lô đã đóng gói mà không còn trong danh sách sẵn sàng bàn giao
                                          (đã bàn giao) thì không sửa thông tin nữa */}
                                      {(!isPackaged ||
                                        readyToShip.some(
                                          (r) => r.ma_so_che === b.ma_so_che,
                                        )) && (
                                        <button
                                          type="button"
                                          className="dropdown-item-btn"
                                          onClick={() => handleOpenEditModal(b)}
                                        >
                                          <FileText size={15} /> Sửa thông tin
                                        </button>
                                      )}

                                      {!isPackaged && (
                                        <button
                                          type="button"
                                          className="dropdown-item-btn"
                                          onClick={() =>
                                            handleOpenStatusModal(b)
                                          }
                                        >
                                          <Edit3 size={15} /> Cập nhật
                                        </button>
                                      )}

                                      {isPackaged &&
                                        readyToShip.some(
                                          (r) => r.ma_so_che === b.ma_so_che,
                                        ) && (
                                          <button
                                            type="button"
                                            className="dropdown-item-btn"
                                            onClick={() => {
                                              setOpenDropdownId(null);
                                              handleOpenHandover(b);
                                            }}
                                          >
                                            <SendHorizontal size={15} /> Bàn
                                            giao
                                          </button>
                                        )}

                                      <button
                                        type="button"
                                        className="dropdown-item-btn danger"
                                        onClick={() => {
                                          setOpenDropdownId(null);
                                          handleDeleteProcessing(b);
                                        }}
                                      >
                                        <Trash2 size={15} /> Xóa
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* ================= TAB 3: QUẢN LÝ TÁCH / GỘP LÔ ================= */}
                  {activeTab === "batch-split-merge" && (
                    <div>
                      <div className="subtab-box">
                        <div>
                          <h2
                            style={{
                              fontSize: "16px",
                              fontWeight: "700",
                              color: "#1f2937",
                            }}
                          >
                            Điều Phối & Phân Chia Lô Hàng
                          </h2>
                          <p
                            style={{
                              fontSize: "12px",
                              color: "#6b7280",
                              marginTop: "2px",
                            }}
                          >
                            Phân loại kích cỡ phẩm cấp (Tách lô) hoặc gom đơn
                            hàng xuất khẩu (Gộp lô).
                          </p>
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            className="btn-secondary-action"
                            style={{ padding: "0 14px" }}
                            onClick={() => {
                              setSplitForm({
                                ma_lo_goc:
                                  splitMergeLots[0]?.ma_lo_nong_san || "",
                                child1Weight: "",
                                child1Grade: "Loại 1 Xuất Khẩu",
                                child2Weight: "",
                                child2Grade: "Loại 2 Nội Địa",
                              });
                              setShowSplitModal(true);
                            }}
                          >
                            <Split size={16} /> Thực hiện tách lô
                          </button>
                          <button
                            className="btn-primary-action"
                            style={{ padding: "0 14px" }}
                            onClick={() => {
                              setMergeSelected([]);
                              setMergeTitle("");
                              setShowMergeModal(true);
                            }}
                          >
                            <Combine size={16} /> Thực hiện gộp lô
                          </button>
                        </div>
                      </div>

                      <div className="log-container">
                        <div className="log-header">
                          <span>Nhật Ký Tách / Gộp Lô Nông Sản</span>
                        </div>

                        {splitMergeLog.length === 0 ? (
                          <div
                            style={{
                              padding: "32px 0",
                              textAlign: "center",
                              color: "#6b7280",
                            }}
                          >
                            Chưa có hoạt động tách / gộp lô nào.
                          </div>
                        ) : (
                          Object.values(
                            splitMergeLog.reduce((acc, row) => {
                              if (!acc[row.relation_group_id])
                                acc[row.relation_group_id] = [];
                              acc[row.relation_group_id].push(row);
                              return acc;
                            }, {}),
                          ).map((group) => {
                            const isMerge = group[0].loai_lien_ket === "MERGE";
                            return (
                              <div
                                className="log-item"
                                key={group[0].relation_group_id}
                              >
                                <div className="log-left">
                                  <div
                                    className={`log-icon ${isMerge ? "blue" : "amber"}`}
                                  >
                                    {isMerge ? (
                                      <Combine size={20} />
                                    ) : (
                                      <Split size={20} />
                                    )}
                                  </div>
                                  <div>
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontWeight: "700",
                                          fontSize: "14px",
                                        }}
                                      >
                                        {isMerge ? "Gộp lô" : "Tách lô"} #
                                        {group[0].relation_group_id}
                                      </span>
                                      <span className="tag-badge gray">
                                        {isMerge
                                          ? `Gộp ${group.length} lô`
                                          : `Tách thành ${group.length} lô`}
                                      </span>
                                    </div>
                                    <p
                                      style={{
                                        fontSize: "12px",
                                        color: "#6b7280",
                                        marginTop: "4px",
                                      }}
                                    >
                                      {isMerge ? (
                                        <>
                                          Từ:{" "}
                                          {group
                                            .map(
                                              (g) =>
                                                `#${g.ma_lo_nguon} (${formatWeight(g.so_luong_tham_gia, g.don_vi_tinh)})`,
                                            )
                                            .join(", ")}{" "}
                                          → Lô mới:{" "}
                                          <strong style={{ color: "#16a34a" }}>
                                            #{group[0].ma_lo_duoc_tao_ra}
                                          </strong>
                                        </>
                                      ) : (
                                        <>
                                          Từ lô gốc #{group[0].ma_lo_nguon} →{" "}
                                          {group
                                            .map(
                                              (g) =>
                                                `#${g.ma_lo_duoc_tao_ra} (${formatWeight(g.so_luong_tham_gia, g.don_vi_tinh)}${g.pham_cap_lo_moi ? " - " + g.pham_cap_lo_moi : ""})`,
                                            )
                                            .join(", ")}
                                        </>
                                      )}
                                    </p>
                                    <div
                                      style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: "8px",
                                        marginTop: "8px",
                                      }}
                                    >
                                      {[
                                        ...new Map(
                                          group.map((g) => [
                                            g.ma_lo_duoc_tao_ra,
                                            g,
                                          ]),
                                        ).values(),
                                      ].map((g) => {
                                        const ready = readyToShip.find(
                                          (r) =>
                                            r.ma_lo_moi === g.ma_lo_duoc_tao_ra,
                                        );
                                        const stateText = g.chua_ky_lo
                                          ? "Chờ ký blockchain"
                                          : g.tinh_trang_lo_moi !== "ACTIVE"
                                            ? "Đã dùng tiếp (gộp/tách/sơ chế)"
                                            : g.ma_van_don_lo_moi
                                              ? `Đã bàn giao - vận đơn ${g.ma_van_don_lo_moi}`
                                              : ready
                                                ? "Sẵn sàng bàn giao"
                                                : "Đang ở kho";
                                        return (
                                          <span
                                            key={g.ma_lo_duoc_tao_ra}
                                            style={{
                                              display: "inline-flex",
                                              alignItems: "center",
                                              gap: "8px",
                                              fontSize: "12px",
                                              padding: "4px 10px",
                                              border: "1px solid #e5e7eb",
                                              borderRadius: "8px",
                                              backgroundColor: "#f9fafb",
                                            }}
                                          >
                                            <strong>
                                              #{g.ma_lo_duoc_tao_ra}
                                            </strong>
                                            <span>
                                              {formatWeight(
                                                g.so_luong_lo_moi,
                                                g.don_vi_tinh,
                                              )}
                                            </span>
                                            <span
                                              style={{
                                                color: g.chua_ky_lo
                                                  ? "#b45309"
                                                  : ready
                                                    ? "#16a34a"
                                                    : "#6b7280",
                                              }}
                                              title={
                                                g.ly_do_chua_ky || undefined
                                              }
                                            >
                                              {stateText}
                                            </span>
                                            {ready && (
                                              <button
                                                type="button"
                                                className="btn-primary-action"
                                                style={{
                                                  height: "26px",
                                                  padding: "0 12px",
                                                  fontSize: "12px",
                                                }}
                                                onClick={() =>
                                                  handleOpenHandover(ready)
                                                }
                                              >
                                                Bàn giao
                                              </button>
                                            )}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                                <div
                                  style={{
                                    textAlign: "right",
                                    fontSize: "12px",
                                  }}
                                >
                                  <span
                                    style={{
                                      color: "#9ca3af",
                                      display: "block",
                                    }}
                                  >
                                    {new Date(
                                      group[0].thoi_diem_tao_lien_ket,
                                    ).toLocaleString("vi-VN")}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* ================= TAB 4: BÀN GIAO CHO ĐƠN VỊ VẬN CHUYỂN ================= */}
                  {activeTab === "shipping" && (
                    <div>
                      <div className="metrics-row">
                        <div className="metric-card">
                          <div className="metric-title">
                            SL Lô chờ chấp nhận
                          </div>
                          <div className="metric-number">
                            {
                              shipments.filter(
                                (item) => item.trang_thai === "CHO_CHAP_NHAN",
                              ).length
                            }
                            <span className="metric-unit">LÔ ĐƠN</span>
                          </div>
                        </div>

                        <div className="metric-card">
                          <div className="metric-title">SL Đang vận chuyển</div>
                          <div className="metric-number">
                            {
                              shipments.filter((item) =>
                                [
                                  "CHO_LAY_HANG",
                                  "DANG_VAN_CHUYEN",
                                  "CHO_TIEP_NHAN",
                                ].includes(item.trang_thai),
                              ).length
                            }
                            <span className="metric-unit">CHUYẾN XE</span>
                          </div>
                        </div>

                        <div className="metric-card">
                          <div className="metric-title">SL Đã hoàn thành</div>
                          <div className="metric-number">
                            {
                              shipments.filter(
                                (item) => item.trang_thai === "HOAN_THANH",
                              ).length
                            }
                            <span className="metric-unit">ĐƠN GIAO</span>
                          </div>
                        </div>

                        <div className="actions-box">
                          <select
                            className="filter-select"
                            value={shippingFilter}
                            onChange={(e) => setShippingFilter(e.target.value)}
                          >
                            <option value="ALL">Tất cả trạng thái</option>
                            <option value="CHO_CHAP_NHAN">Chờ chấp nhận</option>
                            <option value="CHO_LAY_HANG">Chờ lấy hàng</option>
                            <option value="DANG_VAN_CHUYEN">
                              Đang vận chuyển
                            </option>
                            <option value="CHO_TIEP_NHAN">Chờ tiếp nhận</option>
                            <option value="HOAN_THANH">Đã hoàn thành</option>
                          </select>

                          <button
                            className="btn-primary-action"
                            onClick={handleOpenGenericHandover}
                          >
                            <Plus size={16} /> Tạo lệnh bàn giao
                          </button>
                        </div>
                      </div>

                      <div className="table-container">
                        <table className="shipping-table">
                          <thead>
                            <tr>
                              <th>Mã vận đơn</th>
                              <th>Mã lô hàng</th>
                              <th>Tên sản phẩm</th>
                              <th>Đơn vị vận chuyển</th>
                              <th>Khối lượng</th>
                              <th>Thời gian xuất</th>
                              <th>Trạng thái</th>
                              <th>Thao tác</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredShipments.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={8}
                                  style={{
                                    textAlign: "center",
                                    padding: "30px",
                                    color: "#6b7280",
                                  }}
                                >
                                  Không tìm thấy vận đơn nào với trạng thái đã
                                  chọn.
                                </td>
                              </tr>
                            ) : (
                              filteredShipments.map((row) => {
                                const statusInfo =
                                  SHIPMENT_STATUS_LABEL[row.trang_thai] ||
                                  SHIPMENT_STATUS_LABEL.CHO_CHAP_NHAN;
                                const StatusIcon = statusInfo.icon;
                                return (
                                  <tr key={row.ma_van_don}>
                                    <td>
                                      <strong
                                        style={{
                                          color: "#2563eb",
                                          fontFamily: "monospace",
                                          fontSize: "13.5px",
                                        }}
                                      >
                                        {row.ma_van_don}
                                      </strong>
                                    </td>
                                    <td>
                                      <span className="tag-badge gray">
                                        {row.ma_lo_nong_san}
                                      </span>
                                    </td>
                                    <td>{row.ten_san_pham}</td>
                                    <td>
                                      <div>
                                        <strong>
                                          {row.ten_don_vi_van_chuyen}
                                        </strong>
                                      </div>
                                      <div
                                        style={{
                                          fontSize: "12px",
                                          color: "#6b7280",
                                        }}
                                      >
                                        {row.ten_tai_xe
                                          ? `${row.ten_tai_xe}${row.bien_so_xe ? ` (${row.bien_so_xe})` : ""}`
                                          : "Chưa phân công tài xế"}
                                      </div>
                                    </td>
                                    <td>
                                      <strong>
                                        {formatWeight(
                                          row.khoi_luong,
                                          row.don_vi_tinh,
                                        )}
                                      </strong>
                                    </td>
                                    <td>{row.thoi_gian_xuat}</td>
                                    <td>
                                      <span
                                        className={`badge-status-line ${statusInfo.tone}`}
                                      >
                                        <StatusIcon size={12} />{" "}
                                        {statusInfo.text}
                                      </span>
                                      {row.cho_ky_lenh && (
                                        <div style={{ marginTop: 6 }}>
                                          <span className="badge-status-line warning">
                                            <Clock size={12} /> Chờ bạn ký lệnh
                                            bàn giao
                                          </span>
                                        </div>
                                      )}
                                    </td>
                                    <td>
                                      <button
                                        className="btn-detail-table"
                                        onClick={() =>
                                          handleOpenShippingDetail(row)
                                        }
                                      >
                                        <Eye size={14} /> Chi tiết
                                      </button>
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
                </>
              )}
            </div>
          </main>
        </div>

        {/* ================= MODAL: TIẾP NHẬN LÔ ================= */}
        {showReceiveModal && receivingShipment && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h3>
                  <Scale size={18} color="#2e8b57" /> Xác Nhận Tiếp Nhận & Cân
                  Thực Tế
                </h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setShowReceiveModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                <p style={{ color: "#4b5563", marginBottom: "14px" }}>
                  Đang hoàn tất tiếp nhận cho lô:{" "}
                  <strong style={{ color: "#278d49" }}>
                    {receivingShipment.ma_lo_nong_san} -{" "}
                    {receivingShipment.ten_san_pham}
                  </strong>
                </p>

                <div className="form-group">
                  <label>Khối lượng trên lệnh vận chuyển</label>
                  <input
                    type="text"
                    disabled
                    value={formatWeight(
                      receivingShipment.khoi_luong,
                      receivingShipment.don_vi_tinh,
                    )}
                    style={{ backgroundColor: "#f3f4f6" }}
                  />
                </div>

                <div className="form-group">
                  <label>
                    Khối lượng cân thực tế tại trạm cân kho (
                    {receivingShipment.don_vi_tinh || "đơn vị lô"}) (*)
                  </label>
                  <input
                    type="number"
                    value={actualWeightInput}
                    onChange={(e) => setActualWeightInput(e.target.value)}
                    placeholder={`Nhập số ${receivingShipment.don_vi_tinh || ""} thực tế...`}
                    autoFocus
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn-cancel"
                  onClick={() => setShowReceiveModal(false)}
                >
                  Hủy
                </button>
                <button
                  className="btn-save"
                  onClick={handleConfirmFinalReceive}
                >
                  Xác nhận tiếp nhận
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL: TỪ CHỐI TIẾP NHẬN ================= */}
        {showRejectModal && rejectingShipment && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h3 style={{ color: "#dc2626" }}>
                  <XCircle size={18} color="#dc2626" /> Từ Chối Tiếp Nhận Lô
                </h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setShowRejectModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                <p style={{ color: "#4b5563", marginBottom: "12px" }}>
                  Bạn đang từ chối lô hàng{" "}
                  <strong>{rejectingShipment.ma_lo_nong_san}</strong>. Lệnh vận
                  chuyển sẽ bị đóng và nông dân có thể tạo lại lệnh mới.
                </p>

                <div className="form-group">
                  <label>Lý do từ chối (*)</label>
                  <textarea
                    rows={3}
                    placeholder="VD: Kho đã đầy công suất lưu trữ, tiêu chuẩn phẩm cấp chưa phù hợp..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn-cancel"
                  onClick={() => setShowRejectModal(false)}
                >
                  Đóng
                </button>
                <button
                  className="btn-save danger"
                  onClick={handleConfirmReject}
                >
                  Xác nhận từ chối
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL: TẠO LỆNH BÀN GIAO VẬN CHUYỂN ================= */}
        {showHandoverModal && (handoverBatch || handoverPickList) && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h3>
                  <Truck size={18} color="#2e8b57" /> Bàn Giao Vận Chuyển Hàng
                  Hoá
                </h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setShowHandoverModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                {handoverPickList && (
                  <div className="form-group">
                    <label>Lô hàng cần bàn giao (*)</label>
                    <select
                      value={handoverBatch?.ma_lo_moi || ""}
                      onChange={(e) =>
                        setHandoverBatch(
                          handoverPickList.find(
                            (r) => r.ma_lo_moi === e.target.value,
                          ) || null,
                        )
                      }
                    >
                      <option value="">-- Chọn lô đã đóng gói --</option>
                      {handoverPickList.map((r) => (
                        <option key={r.ma_lo_moi} value={r.ma_lo_moi}>
                          {`${r.ma_lo_moi} - ${r.tieu_de} (${formatWeight(r.so_luong_hien_tai, r.don_vi_tinh)})${
                            r.nguon === "MERGE"
                              ? " · lô gộp"
                              : r.nguon === "SPLIT"
                                ? " · lô tách"
                                : ""
                          }`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {handoverBatch && (
                  <div
                    style={{
                      backgroundColor: "#f8fafc",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      marginBottom: "14px",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <div style={{ fontWeight: "700", color: "#111827" }}>
                      {handoverBatch.tieu_de} (
                      {handoverBatch.ma_lo_moi || handoverBatch.ma_lo_nong_san})
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        marginTop: "2px",
                      }}
                    >
                      Khối lượng xuất kho:{" "}
                      <strong>
                        {formatWeight(
                          handoverBatch.so_luong_hien_tai,
                          handoverBatch.don_vi_tinh,
                        )}
                      </strong>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Đơn vị vận chuyển (*)</label>
                  <select
                    value={handoverForm.ma_don_vi_van_chuyen}
                    onChange={(e) =>
                      setHandoverForm({
                        ...handoverForm,
                        ma_don_vi_van_chuyen: e.target.value,
                      })
                    }
                  >
                    <option value="">-- Chọn đơn vị --</option>
                    {transporters.map((t) => (
                      <option key={t.ma_nguoi_dung} value={t.ma_nguoi_dung}>
                        {t.ho_ten}
                      </option>
                    ))}
                  </select>
                </div>

                <p
                  style={{
                    fontSize: "12.5px",
                    color: "#4b5563",
                    margin: "0 0 10px",
                    lineHeight: 1.5,
                  }}
                >
                  Tài xế và phương tiện do đơn vị vận chuyển chọn từ danh sách
                  của họ khi chấp nhận lệnh.
                </p>

                <div className="form-group">
                  <label>Nhà phân phối nhận hàng</label>
                  <select
                    value={handoverForm.ma_ben_nhan}
                    onChange={(e) =>
                      setHandoverForm({
                        ...handoverForm,
                        ma_ben_nhan: e.target.value,
                        dia_chi_giao_hang: e.target.value
                          ? ""
                          : handoverForm.dia_chi_giao_hang,
                      })
                    }
                  >
                    <option value="">
                      -- Chưa có tài khoản, nhập địa chỉ bên dưới --
                    </option>
                    {distributors.map((d) => (
                      <option key={d.ma_nguoi_dung} value={d.ma_nguoi_dung}>
                        {d.ho_ten}
                      </option>
                    ))}
                  </select>
                  {!handoverForm.ma_ben_nhan && (
                    <small
                      style={{
                        display: "block",
                        marginTop: 6,
                        color: "#b45309",
                        lineHeight: 1.4,
                      }}
                    >
                      Lô được truy xuất trên blockchain thì phải chọn nhà phân
                      phối có tài khoản (bên nhận ký nhận hàng bằng ví); giao
                      tới địa chỉ tự do sẽ bị từ chối.
                    </small>
                  )}
                </div>

                {!handoverForm.ma_ben_nhan && (
                  <div className="form-group">
                    <label>Điểm giao hàng / Kho tiếp nhận (*)</label>
                    <input
                      type="text"
                      placeholder="VD: Kho Trung Chuyển Metro"
                      value={handoverForm.dia_chi_giao_hang}
                      onChange={(e) =>
                        setHandoverForm({
                          ...handoverForm,
                          dia_chi_giao_hang: e.target.value,
                        })
                      }
                    />
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  className="btn-cancel"
                  onClick={() => setShowHandoverModal(false)}
                >
                  Hủy
                </button>
                <button className="btn-save" onClick={handleConfirmHandover}>
                  Xác nhận bàn giao
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL: XEM CHI TIẾT VẬN ĐƠN ================= */}
        {showShippingDetailModal && selectedShippingDetail && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h3>
                  <FileText size={18} color="#2563eb" /> Chi Tiết Vận Đơn Vận
                  Chuyển
                </h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setShowShippingDetailModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                <div className="shipping-detail-card">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: "15px",
                        fontWeight: "700",
                        color: "#2563eb",
                      }}
                    >
                      {selectedShippingDetail.ma_van_don}
                    </span>
                    <span className="tag-badge green">
                      {selectedShippingDetail.ma_lo_nong_san}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#1e293b",
                    }}
                  >
                    {selectedShippingDetail.ten_san_pham}
                  </div>
                </div>

                <div className="detail-info-grid">
                  <div className="detail-item">
                    <span className="detail-label">Đơn vị vận tải:</span>
                    <span className="detail-value">
                      {selectedShippingDetail.ten_don_vi_van_chuyen}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Khối lượng hàng:</span>
                    <span className="detail-value">
                      {formatWeight(
                        selectedShippingDetail.khoi_luong,
                        selectedShippingDetail.don_vi_tinh,
                      )}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Tài xế phụ trách:</span>
                    <span className="detail-value">
                      {selectedShippingDetail.ten_tai_xe ||
                        "Chờ đơn vị vận chuyển phân công"}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Biển số phương tiện:</span>
                    <span className="detail-value">
                      {selectedShippingDetail.bien_so_xe ||
                        "Chờ đơn vị vận chuyển phân công"}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Thời gian xuất xưởng:</span>
                    <span className="detail-value">
                      {selectedShippingDetail.thoi_gian_xuat}
                    </span>
                  </div>
                  {selectedShippingDetail.ten_ben_nhan && (
                    <div className="detail-item">
                      <span className="detail-label">Bên nhận:</span>
                      <span className="detail-value">
                        {selectedShippingDetail.ten_ben_nhan}
                      </span>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    borderTop: "1px dashed #e2e8f0",
                    paddingTop: "12px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                  }}
                >
                  <MapPin
                    size={16}
                    color="#dc2626"
                    style={{ marginTop: "2px" }}
                  />
                  <div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      Địa điểm kho đến / Nhận hàng:
                    </div>
                    <div
                      style={{
                        fontSize: "13.5px",
                        fontWeight: "600",
                        color: "#1e293b",
                      }}
                    >
                      {selectedShippingDetail.dia_chi_giao_hang}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn-cancel"
                  onClick={() => setShowShippingDetailModal(false)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL: TẠO LÔ SƠ CHẾ ================= */}
        {showCreateModal && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h3>
                  <PlusCircle size={18} color="#2e8b57" /> Bắt Đầu Sơ Chế Lô Đã
                  Nhận
                </h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setShowCreateModal(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Chọn Lô Đã Tiếp Nhận (*)</label>
                  {availableRawLots.length === 0 ? (
                    <p style={{ fontSize: "12.5px", color: "#9ca3af" }}>
                      Chưa có lô nào đã tiếp nhận để sơ chế. Hãy tiếp nhận lô ở
                      tab "Tiếp nhận lô nông sản" trước.
                    </p>
                  ) : (
                    <select
                      value={createForm.ma_lo_nguon}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          ma_lo_nguon: e.target.value,
                        })
                      }
                    >
                      {availableRawLots.map((b) => (
                        <option key={b.ma_lo_nong_san} value={b.ma_lo_nong_san}>
                          {b.ma_lo_nong_san} - {b.ten_san_pham} (
                          {formatWeight(b.so_luong_hien_tai, b.don_vi_tinh)})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="form-group">
                  <label>Tên Gọi Lô Sơ Chế (*)</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Quýt Đường tuyển chọn size VIP"
                    value={createForm.tieu_de}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, tieu_de: e.target.value })
                    }
                  />
                </div>
                <p
                  style={{
                    fontSize: "12.5px",
                    color: "#4b5563",
                    margin: "0 0 10px",
                    lineHeight: 1.5,
                  }}
                >
                  Sơ chế làm trực tiếp trên lô đã nhận: lô giữ nguyên mã do nông
                  dân tạo, không sinh mã lô mới.
                </p>
                <div className="form-group">
                  <label>Khu Vực Sơ Chế</label>
                  <select
                    value={createForm.khu_vuc_so_che}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        khu_vuc_so_che: e.target.value,
                      })
                    }
                  >
                    <option>Dây chuyền rửa Ozon A</option>
                    <option>Khu đóng thùng lạnh B</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Quy Cách & Tiêu Chuẩn</label>
                  <textarea
                    rows={3}
                    placeholder="Phân loại kích thước > 250g, khử khuẩn ozon..."
                    value={createForm.quy_cach_tieu_chuan}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        quy_cach_tieu_chuan: e.target.value,
                      })
                    }
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn-cancel"
                  onClick={() => setShowCreateModal(false)}
                >
                  Hủy
                </button>
                <button className="btn-save" onClick={handleSubmitCreate}>
                  Xác Nhận Bắt Đầu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL: SỬA THÔNG TIN LÔ SƠ CHẾ ================= */}
        {showEditModal && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h3>
                  <Edit3 size={18} color="#2e8b57" /> Sửa Thông Tin Lô Sơ Chế
                </h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setShowEditModal(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <p style={{ color: "#4b5563", marginBottom: "12px" }}>
                  Lô sơ chế{" "}
                  <strong style={{ color: "#2e8b57" }}>
                    {editForm.ma_so_che}
                  </strong>{" "}
                  (mã lô {editForm.ma_lo_moi}). Khối lượng không sửa được ở đây;
                  nếu nhập sai, hãy xóa lô và tạo lại.
                </p>
                <div className="form-group">
                  <label>Tên Gọi Lô Sơ Chế (*)</label>
                  <input
                    type="text"
                    maxLength={255}
                    value={editForm.tieu_de}
                    onChange={(e) =>
                      setEditForm({ ...editForm, tieu_de: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Khu Vực Sơ Chế</label>
                  <input
                    type="text"
                    list="danh-sach-khu-vuc-so-che"
                    maxLength={150}
                    placeholder="Dây chuyền rửa Ozon A"
                    value={editForm.khu_vuc_so_che}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        khu_vuc_so_che: e.target.value,
                      })
                    }
                  />
                  <datalist id="danh-sach-khu-vuc-so-che">
                    <option value="Dây chuyền rửa Ozon A" />
                    <option value="Khu đóng thùng lạnh B" />
                  </datalist>
                </div>
                <div className="form-group">
                  <label>Quy Cách & Tiêu Chuẩn</label>
                  <textarea
                    rows={3}
                    maxLength={2000}
                    placeholder="Phân loại kích thước > 250g, khử khuẩn ozon..."
                    value={editForm.quy_cach_tieu_chuan}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        quy_cach_tieu_chuan: e.target.value,
                      })
                    }
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn-cancel"
                  onClick={() => setShowEditModal(false)}
                >
                  Hủy
                </button>
                <button className="btn-save" onClick={handleSubmitEdit}>
                  Lưu Thay Đổi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL: CẬP NHẬT TRẠNG THÁI SƠ CHẾ ================= */}
        {showStatusModal && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h3>
                  <Check size={18} color="#2e8b57" /> Cập Nhật Trạng Thái
                </h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setShowStatusModal(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <p style={{ color: "#4b5563", marginBottom: "12px" }}>
                  Đang cập nhật cho mã lô:{" "}
                  <strong style={{ color: "#2e8b57" }}>
                    {selectedBatchId}
                  </strong>
                </p>
                <div className="form-group">
                  <label>Giai Đoạn Sơ Chế</label>
                  <select
                    value={newStage}
                    onChange={(e) => setNewStage(e.target.value)}
                  >
                    {Object.entries(PROCESSING_STAGE_LABEL).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn-cancel"
                  onClick={() => setShowStatusModal(false)}
                >
                  Đóng
                </button>
                <button className="btn-save" onClick={handleSubmitStatus}>
                  Cập Nhật
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL: TÁCH LÔ ================= */}
        {showSplitModal && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h3>
                  <Split size={18} color="#2e8b57" /> Tách Lô Hàng
                </h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setShowSplitModal(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Chọn Lô Gốc Cần Tách</label>
                  {splitMergeLots.length === 0 ? (
                    <p style={{ fontSize: "12.5px", color: "#9ca3af" }}>
                      Chưa có lô nào khả dụng để tách.
                    </p>
                  ) : (
                    <select
                      value={splitForm.ma_lo_goc}
                      onChange={(e) =>
                        setSplitForm({
                          ...splitForm,
                          ma_lo_goc: e.target.value,
                        })
                      }
                    >
                      {splitMergeLots.map((l) => (
                        <option key={l.ma_lo_nong_san} value={l.ma_lo_nong_san}>
                          {l.ma_lo_nong_san} - {l.ten_san_pham} (
                          {formatWeight(l.so_luong_hien_tai, l.don_vi_tinh)} còn
                          lại)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Lô con 1 (kg):</label>
                    <input
                      type="number"
                      value={splitForm.child1Weight}
                      onChange={(e) =>
                        setSplitForm({
                          ...splitForm,
                          child1Weight: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Phẩm cấp:</label>
                    <input
                      type="text"
                      value={splitForm.child1Grade}
                      onChange={(e) =>
                        setSplitForm({
                          ...splitForm,
                          child1Grade: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Lô con 2 (kg):</label>
                    <input
                      type="number"
                      value={splitForm.child2Weight}
                      onChange={(e) =>
                        setSplitForm({
                          ...splitForm,
                          child2Weight: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Phẩm cấp:</label>
                    <input
                      type="text"
                      value={splitForm.child2Grade}
                      onChange={(e) =>
                        setSplitForm({
                          ...splitForm,
                          child2Grade: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn-cancel"
                  onClick={() => setShowSplitModal(false)}
                >
                  Hủy
                </button>
                <button className="btn-save" onClick={handleSubmitSplit}>
                  Tách Lô Ngay
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL: GỘP LÔ ================= */}
        {showMergeModal && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h3>
                  <Combine size={18} color="#2e8b57" /> Gộp Các Lô Nông Sản
                </h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setShowMergeModal(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>
                    Chọn Các Lô Cần Gộp (cùng loại sản phẩm, chọn từ 2 lô trở
                    lên)
                  </label>
                  {splitMergeLots.length === 0 ? (
                    <p style={{ fontSize: "12.5px", color: "#9ca3af" }}>
                      Chưa có lô nào khả dụng để gộp.
                    </p>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      {splitMergeLots.map((l) => (
                        <label
                          key={l.ma_lo_nong_san}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "13px",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={mergeSelected.includes(l.ma_lo_nong_san)}
                            onChange={() =>
                              handleToggleMergeSelect(l.ma_lo_nong_san)
                            }
                          />
                          {l.ma_lo_nong_san} - {l.ten_san_pham} (
                          {formatWeight(l.so_luong_hien_tai, l.don_vi_tinh)})
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>Ghi chú / Tên lô gộp</label>
                  <input
                    type="text"
                    placeholder="VD: Gộp cho đơn hàng xuất khẩu"
                    value={mergeTitle}
                    onChange={(e) => setMergeTitle(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Dự kiến tổng khối lượng</label>
                  <input
                    type="text"
                    readOnly
                    value={`${mergeTotalWeight.toLocaleString("vi-VN")} kg (${mergeSelected.length} lô đã chọn)`}
                    style={{
                      backgroundColor: "#f3f4f6",
                      fontWeight: "700",
                      color: "#065f46",
                    }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn-cancel"
                  onClick={() => setShowMergeModal(false)}
                >
                  Hủy
                </button>
                <button className="btn-save" onClick={handleSubmitMerge}>
                  Tạo Lô Gộp
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessingPage;
