import React, { useEffect, useState } from "react";
import {
  Sprout,
  Wheat,
  PackageCheck,
  CalendarCheck,
  Truck,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  MoreVertical,
  Pencil,
} from "lucide-react";
import "../../css/nongdan.css";
import { useNavigate } from "react-router-dom";

const DEFAULT_FARM_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790604174/bc300a15ff78093fb0042758aec26846_ldrct6.jpg";

const DEFAULT_LOGO_IMG =
  "https://res.cloudinary.com/dfnssx2gm/image/upload/v1790660244/Agrichain_3_lnxgb2.png";

const API_URL = "http://localhost:3000";

const EMPTY_SEASON_FORM = {
  loai_cay_trong: "",
  giong_cay: "",
  ma_thua_dat: "",
  ngay_gieo_trong: "",
  ngay_thu_hoach_du_kien: "",
};

const newMaterialRow = (row = {}) => ({
  key: `${Date.now()}-${Math.random()}`,
  loai_vat_tu: "",
  ma_vat_tu: "",
  lieu_luong: "",
  ngay_su_dung: "",
  ...row,
});

// "2025-06-18" -> "18/06/2025"
const formatDate = (value) => {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

const EMPTY_BATCH_FORM = {
  ma_mua_vu: "",
  so_luong: "",
  ngay_thu_hoach: "",
};

// Ngày hôm nay dạng YYYY-MM-DD theo giờ máy (không lệch múi giờ như toISOString)
const todayText = () => {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
};

// "12000.500", "kg" -> "12.000,5 kg"
const formatQuantity = (value, unit) =>
  `${Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 3 })} ${unit || ""}`.trim();

const BATCH_STAGE_LABELS = {
  CREATED: "Mới tạo, chờ xác nhận thu hoạch",
  HARVESTED: "Đã thu hoạch",
  PROCESSED: "Đã sơ chế",
  PACKAGED: "Đã đóng gói",
  IN_TRANSIT: "Đang vận chuyển",
  RECEIVED: "Đã nhận hàng",
  DISTRIBUTED: "Đã phân phối",
  COMPLETED: "Hoàn tất",
};

// Header gửi kèm token đăng nhập (token được lưu ở trang đăng nhập)
const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Giá trị chỉ-đọc trong popup: đậm khi đã có dữ liệu, xám khi chưa có
const readonlyValueStyle = (hasValue) => ({
  color: hasValue ? "#1f2937" : "#9ca3af",
  fontWeight: hasValue ? 600 : 400,
});

// "2026-10-04 16:30" -> "04/10/2026 - 16:30"
const formatDateTime = (value) => {
  if (!value) return "—";
  const [date, time] = value.split(" ");
  return `${formatDate(date)}${time ? ` - ${time}` : ""}`;
};

// Giờ hiện tại dạng YYYY-MM-DDTHH:mm cho ô datetime-local (giờ máy, không lệch múi giờ)
const nowLocalInput = () => {
  const now = new Date();
  return `${todayText()}T${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}`;
};

const EMPTY_SHIPPING_FORM = {
  ma_lo_nong_san: "",
  ma_don_vi_van_chuyen: "",
  ma_ben_nhan: "",
  thoi_gian_xuat: "",
  ghi_chu: "",
};

// Trạng thái lệnh vận chuyển -> nhãn + kiểu hiển thị + icon ở tab Vận chuyển & Bàn giao
const SHIPPING_STATUS = {
  CHO_CHAP_NHAN: { label: "Chờ chấp nhận", tone: "warning", icon: "clock" },
  CHO_LAY_HANG: { label: "Chờ lấy hàng", tone: "warning", icon: "clock" },
  DANG_VAN_CHUYEN: { label: "Đang vận chuyển", tone: "info", icon: "truck" },
  CHO_TIEP_NHAN: { label: "Chờ tiếp nhận", tone: "purple", icon: "clock" },
  HOAN_THANH: { label: "Đã hoàn thành", tone: "success", icon: "check" },
  TU_CHOI: { label: "Bị từ chối", tone: "danger", icon: "none" },
  DA_HUY: { label: "Đã hủy", tone: "danger", icon: "none" },
};

const EMPTY_INSPECTION_FORM = {
  ma_co_quan: "",
  tieu_chuan_dang_ky: "VIETGAP",
  noi_dung_de_nghi: "",
};

// Trạng thái hồ sơ kiểm định -> nhãn + kiểu hiển thị ở tab Lịch hẹn kiểm định
const getInspectionStatus = (item) => {
  switch (item.trang_thai_ho_so) {
    case "CHO_TIEP_NHAN":
      return { label: "Chờ phê duyệt", tone: "warning" };
    case "DA_HEN_LICH":
      return { label: "Đã hẹn lịch", tone: "success" };
    case "DA_LAY_MAU":
      return { label: "Đã lấy mẫu", tone: "success" };
    case "DA_CONG_BO":
      return item.ket_luan === "PASSED"
        ? { label: "Đạt chuẩn", tone: "success" }
        : { label: "Không đạt", tone: "danger" };
    case "TU_CHOI":
      return { label: "Từ chối", tone: "danger" };
    case "THU_HOI":
      return { label: "Đã thu hồi", tone: "danger" };
    default:
      return { label: item.trang_thai_ho_so, tone: "warning" };
  }
};

const DashboardPage = () => {
  const navigate = useNavigate();

  // =========================================================
  // TAB
  // =========================================================
  const [activeTab, setActiveTab] = useState("farm");

  // =========================================================
  // POPUP
  // =========================================================
  const [showFarmModal, setShowFarmModal] = useState(false);
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);

  // =========================================================
  // DROPDOWN
  // =========================================================
  const [openDropdown, setOpenDropdown] = useState(null);

  // =========================================================
  // USER ĐANG ĐĂNG NHẬP
  // =========================================================
  const [user, setUser] = useState(null);

  // =========================================================
  // NÔNG TRẠI
  // =========================================================
  const [farms, setFarms] = useState([]);
  const [loadingFarms, setLoadingFarms] = useState(false);
  const [farmError, setFarmError] = useState("");

  // =========================================================
  // DANH SÁCH NGƯỜI QUẢN LÝ
  // =========================================================
  const [managers, setManagers] = useState([]);

  // =========================================================
  // NÔNG TRẠI ĐANG SỬA
  // =========================================================
  const [editingFarm, setEditingFarm] = useState(null);

  // =========================================================
  // FORM NÔNG TRẠI
  // =========================================================
  const [farmForm, setFarmForm] = useState({
    ma_nong_trai: "",
    ma_nguoi_dung: "",
    ten_nong_trai: "",
    dia_diem_nong_trai: "",
    dien_tich_nong_trai: "",
  });

  // =========================================================
  // ẢNH NÔNG TRẠI
  // =========================================================
  const [anhNongTrai, setAnhNongTrai] = useState(null);
  const [farmImagePreview, setFarmImagePreview] = useState(null);

  // =========================================================
  // TRẠNG THÁI LƯU
  // =========================================================
  const [savingFarm, setSavingFarm] = useState(false);

  // =========================================================
  // MÙA VỤ
  // =========================================================
  const [seasons, setSeasons] = useState([]);
  const [seasonStats, setSeasonStats] = useState({
    dang_trien_khai: 0,
    sap_thu_hoach: 0,
    so_lo_dang_canh_tac: 0,
    tong_so_lo: 0,
  });
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [seasonError, setSeasonError] = useState("");

  // Nông trại đang lọc ở tab mùa vụ ("" = tất cả)
  const [seasonFarmId, setSeasonFarmId] = useState("");

  // Mùa vụ đang sửa và nông trại của form
  const [editingSeason, setEditingSeason] = useState(null);
  const [seasonModalFarmId, setSeasonModalFarmId] = useState("");

  const [seasonForm, setSeasonForm] = useState(EMPTY_SEASON_FORM);
  const [seasonMaterials, setSeasonMaterials] = useState([]);
  const [savingSeason, setSavingSeason] = useState(false);

  // Ảnh mùa vụ: file mới chọn + ảnh xem trước (ảnh cũ trên server hoặc blob)
  const [seasonImage, setSeasonImage] = useState(null);
  const [seasonImagePreview, setSeasonImagePreview] = useState(null);

  // Dữ liệu cho dropdown trong popup
  const [plots, setPlots] = useState([]);
  const [materialCatalog, setMaterialCatalog] = useState([]);

  // =========================================================
  // LÔ THU HOẠCH
  // =========================================================
  const [batches, setBatches] = useState([]);
  const [batchStats, setBatchStats] = useState({
    cho_thu_hoach: 0,
    so_lo_canh_tac: 0,
    tong_so_lo: 0,
  });
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [batchError, setBatchError] = useState("");

  const [editingBatch, setEditingBatch] = useState(null);
  const [batchForm, setBatchForm] = useState(EMPTY_BATCH_FORM);
  const [savingBatch, setSavingBatch] = useState(false);

  // Mùa vụ đang triển khai để chọn khi tạo lô
  const [batchSeasons, setBatchSeasons] = useState([]);

  // =========================================================
  // MENU THAO TÁC CỦA BẢNG LÔ (hiển thị cố định để không bị bảng cắt)
  // =========================================================
  const [batchMenuPos, setBatchMenuPos] = useState({
    right: 0,
    top: 0,
    bottom: 0,
    up: false,
  });

  // =========================================================
  // YÊU CẦU KIỂM ĐỊNH
  // =========================================================
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [inspectionBatch, setInspectionBatch] = useState(null);
  const [inspectionForm, setInspectionForm] = useState(EMPTY_INSPECTION_FORM);
  const [authorities, setAuthorities] = useState([]);
  const [authorityError, setAuthorityError] = useState("");
  const [savingInspection, setSavingInspection] = useState(false);

  const [inspections, setInspections] = useState([]);
  const [loadingInspections, setLoadingInspections] = useState(false);
  const [inspectionError, setInspectionError] = useState("");

  // =========================================================
  // VẬN CHUYỂN & BÀN GIAO
  // =========================================================
  const [shippingOrders, setShippingOrders] = useState([]);
  const [shippingStats, setShippingStats] = useState({
    dang_van_chuyen: 0,
    da_ban_giao: 0,
    khoi_luong_da_xuat_tan: 0,
  });
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [shippingError, setShippingError] = useState("");

  const [shippingForm, setShippingForm] = useState(EMPTY_SHIPPING_FORM);
  const [readyBatches, setReadyBatches] = useState([]);
  const [partners, setPartners] = useState({
    don_vi_van_chuyen: [],
    ben_nhan: [],
  });
  const [partnerError, setPartnerError] = useState("");
  const [savingShipping, setSavingShipping] = useState(false);

  // Lệnh đang xem chi tiết (null = đóng popup)
  const [shippingDetail, setShippingDetail] = useState(null);

  const selectedBatchInfo = readyBatches.find(
    (b) => b.ma_lo_nong_san === shippingForm.ma_lo_nong_san,
  );

  // =========================================================
  // LẤY USER TỪ LOCAL STORAGE
  // =========================================================
  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      navigate("/");
      return;
    }

    try {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
    } catch (error) {
      console.error("Không đọc được thông tin người dùng:", error);
      localStorage.removeItem("user");
      navigate("/");
    }
  }, [navigate]);

  // =========================================================
  // LẤY DANH SÁCH NÔNG TRẠI
  // =========================================================
  const fetchFarms = async (maNguoiDung) => {
    if (!maNguoiDung) return;

    setLoadingFarms(true);
    setFarmError("");

    try {
      const response = await fetch(
        `${API_URL}/api/farmer/farms/user/${maNguoiDung}`,
      );
      const data = await response.json();

      if (!response.ok) {
        setFarmError(data.message || "Không thể lấy danh sách nông trại");
        return;
      }

      setFarms(data.data || []);
    } catch (error) {
      console.error("Lỗi lấy danh sách nông trại:", error);
      setFarmError("Không thể kết nối tới backend");
    } finally {
      setLoadingFarms(false);
    }
  };

  // =========================================================
  // LẤY DANH SÁCH NGƯỜI QUẢN LÝ
  // =========================================================
  const fetchManagers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/farmer/managers`);
      const data = await response.json();

      if (!response.ok) {
        console.error(data.message || "Không thể lấy danh sách người quản lý");
        return;
      }

      setManagers(data.data || []);
    } catch (error) {
      console.error("Lỗi lấy danh sách người quản lý:", error);
    }
  };

  useEffect(() => {
    if (user?.ma_nguoi_dung) {
      fetchFarms(user.ma_nguoi_dung);
    }
  }, [user]);

  useEffect(() => {
    fetchManagers();
  }, []);

  // =========================================================
  // DROPDOWN
  // =========================================================
  const handleToggleDropdown = (id) => {
    if (openDropdown === id) {
      setOpenDropdown(null);
    } else {
      setOpenDropdown(id);
    }
  };

  // Menu của bảng lô đặt theo toạ độ màn hình (position: fixed) nên không bị
  // vùng cuộn của bảng cắt mất; mở lên phía trên nếu bên dưới không đủ chỗ
  const handleToggleBatchMenu = (e, id) => {
    if (openDropdown === id) {
      setOpenDropdown(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const MENU_HEIGHT = 230;

    setBatchMenuPos({
      right: window.innerWidth - rect.right,
      top: rect.bottom + 6,
      bottom: window.innerHeight - rect.top + 6,
      up: window.innerHeight - rect.bottom < MENU_HEIGHT,
    });
    setOpenDropdown(id);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".dropdown-container")) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  // Menu cố định không đi theo khi cuộn/đổi cỡ cửa sổ nên đóng lại
  useEffect(() => {
    if (openDropdown === null) return;

    const close = () => setOpenDropdown(null);

    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);

    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [openDropdown]);

  // =========================================================
  // CHUYỂN TRANG CHI TIẾT
  // =========================================================
  const handlechitietnongtrai = (e, maNongTrai) => {
    e.preventDefault();
    navigate(`/chi-tiet-nong-trai/${maNongTrai}`);
  };

  // maLo (tuỳ chọn): mở thẳng lô đó trên trang chi tiết mùa vụ
  const handlechitietmuavu = (e, maMuaVu, maLo) => {
    e.preventDefault();
    setOpenDropdown(null);

    if (!maMuaVu) {
      alert("Lô này chưa gắn với mùa vụ nào");
      return;
    }

    navigate(
      `/chi-tiet-mua-vu/${maMuaVu}${maLo ? `?lo=${encodeURIComponent(maLo)}` : ""}`,
    );
  };

  // =========================================================
  // INPUT FORM NÔNG TRẠI
  // =========================================================
  const handleFarmInputChange = (e) => {
    const { name, value } = e.target;
    setFarmForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =========================================================
  // CHỌN ẢNH
  // =========================================================
  const handleFarmImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setAnhNongTrai(null);
      return;
    }

    setAnhNongTrai(file);

    if (farmImagePreview && farmImagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(farmImagePreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setFarmImagePreview(previewUrl);
  };

  // =========================================================
  // RESET FORM
  // =========================================================
  const resetFarmForm = () => {
    setFarmForm({
      ma_nong_trai: "",
      ma_nguoi_dung: "",
      ten_nong_trai: "",
      dia_diem_nong_trai: "",
      dien_tich_nong_trai: "",
    });

    setAnhNongTrai(null);

    if (farmImagePreview && farmImagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(farmImagePreview);
    }

    setFarmImagePreview(null);
    setEditingFarm(null);
  };

  // =========================================================
  // MỞ POPUP THÊM NÔNG TRẠI
  // =========================================================
  const handleOpenAddFarm = () => {
    setEditingFarm(null);
    setFarmForm({
      ma_nong_trai: "",
      ma_nguoi_dung: user?.ma_nguoi_dung || "",
      ten_nong_trai: "",
      dia_diem_nong_trai: "",
      dien_tich_nong_trai: "",
    });

    setAnhNongTrai(null);
    setFarmImagePreview(null);
    setShowFarmModal(true);
  };

  // =========================================================
  // ĐÓNG POPUP
  // =========================================================
  const handleCloseFarmModal = () => {
    setShowFarmModal(false);
    resetFarmForm();
  };

  // =========================================================
  // THÊM NÔNG TRẠI
  // =========================================================
  const handleAddFarm = async (e) => {
    e.preventDefault();

    if (
      !farmForm.ma_nong_trai.trim() ||
      !farmForm.ma_nguoi_dung ||
      !farmForm.ten_nong_trai.trim() ||
      !farmForm.dia_diem_nong_trai.trim()
    ) {
      alert("Vui lòng nhập đầy đủ mã, tên, người quản lý và địa chỉ");
      return;
    }

    setSavingFarm(true);

    try {
      const formData = new FormData();
      formData.append("ma_nong_trai", farmForm.ma_nong_trai.trim());
      formData.append("ma_nguoi_dung", farmForm.ma_nguoi_dung);
      formData.append("ten_nong_trai", farmForm.ten_nong_trai.trim());
      formData.append("dia_diem_nong_trai", farmForm.dia_diem_nong_trai.trim());
      formData.append("dien_tich_nong_trai", farmForm.dien_tich_nong_trai);

      if (anhNongTrai) {
        formData.append("anh_nong_trai", anhNongTrai);
      }

      const response = await fetch(`${API_URL}/api/farmer/farms`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Thêm nông trại thất bại");
        return;
      }

      alert("Thêm nông trại thành công");
      handleCloseFarmModal();
      await fetchFarms(user.ma_nguoi_dung);
    } catch (error) {
      console.error("Lỗi thêm nông trại:", error);
      alert("Không thể kết nối tới backend");
    } finally {
      setSavingFarm(false);
    }
  };

  // =========================================================
  // MỞ POPUP SỬA NÔNG TRẠI
  // =========================================================
  const handleEditFarm = (farm) => {
    setEditingFarm(farm);
    setFarmForm({
      ma_nong_trai: farm.ma_nong_trai || "",
      ma_nguoi_dung: farm.ma_nguoi_dung || "",
      ten_nong_trai: farm.ten_nong_trai || "",
      dia_diem_nong_trai: farm.dia_diem_nong_trai || "",
      dien_tich_nong_trai: farm.dien_tich_nong_trai || "",
    });

    setAnhNongTrai(null);

    if (farm.anh_nong_trai) {
      setFarmImagePreview(`${API_URL}${farm.anh_nong_trai}`);
    } else {
      setFarmImagePreview(null);
    }

    setShowFarmModal(true);
  };

  // =========================================================
  // CẬP NHẬT NÔNG TRẠI
  // =========================================================
  const handleUpdateFarm = async (e) => {
    e.preventDefault();

    if (!editingFarm) return;

    if (
      !farmForm.ma_nguoi_dung ||
      !farmForm.ten_nong_trai.trim() ||
      !farmForm.dia_diem_nong_trai.trim()
    ) {
      alert("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    setSavingFarm(true);

    try {
      const formData = new FormData();
      formData.append("ma_nguoi_dung", farmForm.ma_nguoi_dung);
      formData.append("ten_nong_trai", farmForm.ten_nong_trai.trim());
      formData.append("dia_diem_nong_trai", farmForm.dia_diem_nong_trai.trim());
      formData.append("dien_tich_nong_trai", farmForm.dien_tich_nong_trai);

      if (anhNongTrai) {
        formData.append("anh_nong_trai", anhNongTrai);
      }

      const response = await fetch(
        `${API_URL}/api/farmer/farms/${editingFarm.ma_nong_trai}`,
        {
          method: "PUT",
          body: formData,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Cập nhật nông trại thất bại");
        return;
      }

      alert("Cập nhật nông trại thành công");
      handleCloseFarmModal();
      await fetchFarms(user.ma_nguoi_dung);
    } catch (error) {
      console.error("Lỗi cập nhật nông trại:", error);
      alert("Không thể kết nối tới backend");
    } finally {
      setSavingFarm(false);
    }
  };

  // =========================================================
  // XÓA NÔNG TRẠI
  // =========================================================
  const handleDeleteFarm = async (maNongTrai) => {
    const confirmDelete = window.confirm("Bạn có chắc muốn xóa nông trại này?");

    if (!confirmDelete) return;

    try {
      const response = await fetch(
        `${API_URL}/api/farmer/farms/${maNongTrai}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Xóa nông trại thất bại");
        return;
      }

      alert("Xóa nông trại thành công");
      await fetchFarms(user.ma_nguoi_dung);
    } catch (error) {
      console.error("Lỗi xóa nông trại:", error);
      alert("Không thể kết nối tới backend");
    }
  };

  // =========================================================
  // TÌM TÊN NGƯỜI QUẢN LÝ
  // =========================================================
  const getManagerName = (maNguoiDung) => {
    const manager = managers.find((item) => item.ma_nguoi_dung === maNguoiDung);

    if (manager) return manager.ho_ten;
    if (user?.ma_nguoi_dung === maNguoiDung) return user.ho_ten;

    return maNguoiDung;
  };

  // =========================================================
  // TỔNG DIỆN TÍCH
  // =========================================================
  const tongDienTich = farms.reduce((total, farm) => {
    return total + Number(farm.dien_tich_nong_trai || 0);
  }, 0);

  // =========================================================
  // LẤY DANH SÁCH MÙA VỤ + THỐNG KÊ
  // =========================================================
  const fetchSeasons = async () => {
    if (!user?.ma_nguoi_dung) return;

    setLoadingSeasons(true);
    setSeasonError("");

    const query = seasonFarmId
      ? `?ma_nong_trai=${encodeURIComponent(seasonFarmId)}`
      : "";

    try {
      const [listRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/mua-vu/user/${user.ma_nguoi_dung}${query}`),
        fetch(
          `${API_URL}/api/mua-vu/thong-ke/user/${user.ma_nguoi_dung}${query}`,
        ),
      ]);
      const listData = await listRes.json();
      const statsData = await statsRes.json();

      if (!listRes.ok) {
        setSeasonError(listData.message || "Không thể lấy danh sách mùa vụ");
        return;
      }

      setSeasons(listData.data || []);
      if (statsRes.ok) setSeasonStats(statsData.data);
    } catch (error) {
      console.error("Lỗi lấy danh sách mùa vụ:", error);
      setSeasonError("Không thể kết nối tới backend");
    } finally {
      setLoadingSeasons(false);
    }
  };

  const fetchMaterialCatalog = async () => {
    try {
      const response = await fetch(`${API_URL}/api/mua-vu/vat-tu`);
      const data = await response.json();

      if (response.ok) setMaterialCatalog(data.data || []);
    } catch (error) {
      console.error("Lỗi lấy danh mục vật tư:", error);
    }
  };

  const fetchPlots = async (maNongTrai) => {
    try {
      const response = await fetch(
        `${API_URL}/api/farmer/plots/farm/${maNongTrai}`,
      );
      const data = await response.json();

      setPlots(response.ok ? data.data || [] : []);
    } catch (error) {
      console.error("Lỗi lấy danh sách thửa đất:", error);
      setPlots([]);
    }
  };

  useEffect(() => {
    if (activeTab === "season") {
      fetchSeasons();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeTab, seasonFarmId]);

  useEffect(() => {
    fetchMaterialCatalog();
  }, []);

  // =========================================================
  // POPUP MÙA VỤ
  // =========================================================
  const resetSeasonImage = (preview = null) => {
    if (seasonImagePreview && seasonImagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(seasonImagePreview);
    }

    setSeasonImage(null);
    setSeasonImagePreview(preview);
  };

  const handleCloseSeasonModal = () => {
    setShowSeasonModal(false);
    setEditingSeason(null);
    setSeasonModalFarmId("");
    setSeasonForm(EMPTY_SEASON_FORM);
    setSeasonMaterials([]);
    setPlots([]);
    resetSeasonImage();
  };

  const handleSeasonImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      resetSeasonImage(
        editingSeason?.anh_mua_vu
          ? `${API_URL}${editingSeason.anh_mua_vu}`
          : null,
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Ảnh không được vượt quá 5MB");
      e.target.value = "";
      return;
    }

    if (seasonImagePreview && seasonImagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(seasonImagePreview);
    }

    setSeasonImage(file);
    setSeasonImagePreview(URL.createObjectURL(file));
  };

  const handleOpenAddSeason = () => {
    const maNongTrai =
      seasonFarmId || (farms.length === 1 ? farms[0].ma_nong_trai : "");

    if (!maNongTrai) {
      alert("Vui lòng chọn nông trại trước khi thêm mùa vụ");
      return;
    }

    setEditingSeason(null);
    setSeasonModalFarmId(maNongTrai);
    setSeasonForm(EMPTY_SEASON_FORM);
    setSeasonMaterials([]);
    resetSeasonImage();
    fetchPlots(maNongTrai);
    setShowSeasonModal(true);
  };

  const handleEditSeason = async (season) => {
    setOpenDropdown(null);
    try {
      const response = await fetch(`${API_URL}/api/mua-vu/${season.ma_mua_vu}`);
      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Không thể lấy thông tin mùa vụ");
        return;
      }

      const detail = data.data;

      setEditingSeason(detail);
      setSeasonModalFarmId(detail.ma_nong_trai);
      setSeasonForm({
        loai_cay_trong: detail.loai_cay_trong || "",
        giong_cay: detail.giong_cay || "",
        ma_thua_dat: detail.ma_thua_dat || "",
        ngay_gieo_trong: detail.ngay_gieo_trong || "",
        ngay_thu_hoach_du_kien: detail.ngay_thu_hoach_du_kien || "",
      });
      setSeasonMaterials(
        (detail.vat_tu || []).map((item) =>
          newMaterialRow({
            loai_vat_tu: item.loai_vat_tu,
            ma_vat_tu: item.ma_vat_tu,
            lieu_luong: item.lieu_luong,
            ngay_su_dung: item.ngay_su_dung,
          }),
        ),
      );
      resetSeasonImage(
        detail.anh_mua_vu ? `${API_URL}${detail.anh_mua_vu}` : null,
      );
      fetchPlots(detail.ma_nong_trai);
      setShowSeasonModal(true);
    } catch (error) {
      console.error("Lỗi lấy chi tiết mùa vụ:", error);
      alert("Không thể kết nối tới backend");
    }
  };

  const handleSeasonInputChange = (e) => {
    const { name, value } = e.target;
    setSeasonForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =========================================================
  // PHÂN BÓN / THUỐC BVTV TRONG MÙA VỤ
  // =========================================================
  const handleAddMaterial = () => {
    setSeasonMaterials((prev) => [...prev, newMaterialRow()]);
  };

  const handleRemoveMaterial = (key) => {
    setSeasonMaterials((prev) => prev.filter((row) => row.key !== key));
  };

  const handleMaterialChange = (key, field, value) => {
    setSeasonMaterials((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row;

        if (field === "loai_vat_tu") {
          return { ...row, loai_vat_tu: value, ma_vat_tu: "" };
        }

        return { ...row, [field]: value };
      }),
    );
  };

  // =========================================================
  // LƯU MÙA VỤ (THÊM / CẬP NHẬT)
  // =========================================================
  const handleSaveSeason = async () => {
    if (!seasonForm.loai_cay_trong.trim() || !seasonForm.ngay_gieo_trong) {
      alert("Vui lòng nhập tên mùa vụ và ngày bắt đầu");
      return;
    }

    if (
      seasonMaterials.some(
        (row) =>
          !row.ma_vat_tu || !(Number(row.lieu_luong) > 0) || !row.ngay_su_dung,
      )
    ) {
      alert(
        "Vui lòng chọn loại, tên, liều lượng và ngày sử dụng cho mỗi vật tư",
      );
      return;
    }

    const formData = new FormData();
    formData.append("ma_nong_trai", seasonModalFarmId);
    formData.append("ma_thua_dat", seasonForm.ma_thua_dat);
    formData.append("loai_cay_trong", seasonForm.loai_cay_trong.trim());
    formData.append("giong_cay", seasonForm.giong_cay.trim());
    formData.append("ngay_gieo_trong", seasonForm.ngay_gieo_trong);
    formData.append(
      "ngay_thu_hoach_du_kien",
      seasonForm.ngay_thu_hoach_du_kien,
    );
    formData.append(
      "vat_tu",
      JSON.stringify(
        seasonMaterials.map((row) => ({
          ma_vat_tu: row.ma_vat_tu,
          lieu_luong: Number(row.lieu_luong),
          ngay_su_dung: row.ngay_su_dung,
        })),
      ),
    );

    if (seasonImage) {
      formData.append("anh_mua_vu", seasonImage);
    }

    setSavingSeason(true);

    try {
      const response = await fetch(
        editingSeason
          ? `${API_URL}/api/mua-vu/${editingSeason.ma_mua_vu}`
          : `${API_URL}/api/mua-vu`,
        {
          method: editingSeason ? "PUT" : "POST",
          body: formData,
        },
      );
      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Lưu mùa vụ thất bại");
        return;
      }

      alert(data.message);
      handleCloseSeasonModal();
      await fetchSeasons();
    } catch (error) {
      console.error("Lỗi lưu mùa vụ:", error);
      alert("Không thể kết nối tới backend");
    } finally {
      setSavingSeason(false);
    }
  };

  // =========================================================
  // XÓA MÙA VỤ
  // =========================================================
  const handleDeleteSeason = async (maMuaVu) => {
    setOpenDropdown(null);

    if (!window.confirm("Bạn có chắc muốn xóa mùa vụ này?")) return;

    try {
      const response = await fetch(`${API_URL}/api/mua-vu/${maMuaVu}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Xóa mùa vụ thất bại");
        return;
      }

      alert(data.message);
      await fetchSeasons();
    } catch (error) {
      console.error("Lỗi xóa mùa vụ:", error);
      alert("Không thể kết nối tới backend");
    }
  };

  // =========================================================
  // LẤY DANH SÁCH LÔ THU HOẠCH + THỐNG KÊ
  // =========================================================
  const fetchBatches = async () => {
    if (!user?.ma_nguoi_dung) return;

    setLoadingBatches(true);
    setBatchError("");

    try {
      const [listRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/lo-thu-hoach/user/${user.ma_nguoi_dung}`),
        fetch(
          `${API_URL}/api/lo-thu-hoach/thong-ke/user/${user.ma_nguoi_dung}`,
        ),
      ]);
      const listData = await listRes.json();
      const statsData = await statsRes.json();

      if (!listRes.ok) {
        setBatchError(listData.message || "Không thể lấy danh sách lô");
        return;
      }

      setBatches(listData.data || []);
      if (statsRes.ok) setBatchStats(statsData.data);
    } catch (error) {
      console.error("Lỗi lấy danh sách lô thu hoạch:", error);
      setBatchError("Không thể kết nối tới backend");
    } finally {
      setLoadingBatches(false);
    }
  };

  const fetchBatchSeasons = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/mua-vu/user/${user.ma_nguoi_dung}`,
      );
      const data = await response.json();

      setBatchSeasons(response.ok ? data.data || [] : []);
    } catch (error) {
      console.error("Lỗi lấy danh sách mùa vụ:", error);
      setBatchSeasons([]);
    }
  };

  useEffect(() => {
    if (activeTab === "batch") {
      fetchBatches();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeTab]);

  // =========================================================
  // POPUP LÔ THU HOẠCH
  // =========================================================
  const handleCloseBatchModal = () => {
    setShowBatchModal(false);
    setEditingBatch(null);
    setBatchForm(EMPTY_BATCH_FORM);
  };

  const handleOpenAddBatch = () => {
    setEditingBatch(null);
    setBatchForm({ ...EMPTY_BATCH_FORM, ngay_thu_hoach: todayText() });
    fetchBatchSeasons();
    setShowBatchModal(true);
  };

  const handleEditBatch = (batch) => {
    setOpenDropdown(null);
    setEditingBatch(batch);
    setBatchForm({
      ma_mua_vu: batch.ma_mua_vu || "",
      so_luong: batch.so_luong_hien_tai,
      ngay_thu_hoach: batch.ngay_thu_hoach || "",
    });
    fetchBatchSeasons();
    setShowBatchModal(true);
  };

  const handleBatchInputChange = (e) => {
    const { name, value } = e.target;
    setBatchForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =========================================================
  // LƯU LÔ THU HOẠCH (THÊM / CẬP NHẬT)
  // =========================================================
  const handleSaveBatch = async () => {
    if (!editingBatch && !batchForm.ma_mua_vu) {
      alert("Vui lòng chọn mùa vụ thu hoạch");
      return;
    }

    if (!(Number(batchForm.so_luong) > 0)) {
      alert("Sản lượng phải lớn hơn 0");
      return;
    }

    if (!batchForm.ngay_thu_hoach) {
      alert("Vui lòng chọn ngày thu hoạch");
      return;
    }

    setSavingBatch(true);

    try {
      const response = await fetch(
        editingBatch
          ? `${API_URL}/api/lo-thu-hoach/${editingBatch.ma_lo_nong_san}`
          : `${API_URL}/api/lo-thu-hoach`,
        {
          method: editingBatch ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ma_mua_vu: batchForm.ma_mua_vu,
            so_luong: Number(batchForm.so_luong),
            ngay_thu_hoach: batchForm.ngay_thu_hoach,
          }),
        },
      );
      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Lưu lô thu hoạch thất bại");
        return;
      }

      alert(data.message);
      handleCloseBatchModal();
      await fetchBatches();
    } catch (error) {
      console.error("Lỗi lưu lô thu hoạch:", error);
      alert("Không thể kết nối tới backend");
    } finally {
      setSavingBatch(false);
    }
  };

  // =========================================================
  // YÊU CẦU KIỂM ĐỊNH
  // =========================================================
  const fetchInspections = async () => {
    setLoadingInspections(true);
    setInspectionError("");

    try {
      const response = await fetch(`${API_URL}/api/kiem-dinh/yeu-cau/cua-toi`, {
        headers: authHeaders(),
      });
      const data = await response.json();

      if (!response.ok) {
        setInspectionError(data.message || "Không thể lấy danh sách kiểm định");
        return;
      }

      setInspections(data.data || []);
    } catch (error) {
      console.error("Lỗi lấy danh sách yêu cầu kiểm định:", error);
      setInspectionError("Không thể kết nối tới backend");
    } finally {
      setLoadingInspections(false);
    }
  };

  useEffect(() => {
    if (activeTab === "inspection") {
      fetchInspections();
    }
  }, [activeTab]);

  const fetchAuthorities = async () => {
    setAuthorityError("");

    try {
      const response = await fetch(`${API_URL}/api/kiem-dinh/co-quan`, {
        headers: authHeaders(),
      });
      const data = await response.json();

      if (!response.ok) {
        // Thường do chưa có token (cần đăng nhập lại) hoặc token hết hạn
        setAuthorityError(
          `${data.message || "Không thể lấy danh sách cơ quan kiểm định"}. Vui lòng đăng nhập lại.`,
        );
      }

      const list = response.ok ? data.data || [] : [];
      setAuthorities(list);

      // Chỉ có một cơ quan thì chọn sẵn
      if (list.length === 1) {
        setInspectionForm((prev) => ({
          ...prev,
          ma_co_quan: prev.ma_co_quan || list[0].ma_co_quan,
        }));
      }
    } catch (error) {
      console.error("Lỗi lấy danh sách cơ quan kiểm định:", error);
      setAuthorityError("Không thể kết nối tới backend");
      setAuthorities([]);
    }
  };

  // lot: { ma_lo_nong_san, loai_cay_trong, so_luong_hien_tai, don_vi_tinh }
  const handleOpenInspection = (lot) => {
    setOpenDropdown(null);
    setInspectionBatch(lot);
    setInspectionForm(EMPTY_INSPECTION_FORM);
    fetchAuthorities();
    setShowInspectionModal(true);
  };

  const handleCloseInspectionModal = () => {
    setShowInspectionModal(false);
    setInspectionBatch(null);
    setInspectionForm(EMPTY_INSPECTION_FORM);
  };

  const handleInspectionInputChange = (e) => {
    const { name, value } = e.target;
    setInspectionForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmitInspection = async () => {
    if (!inspectionForm.ma_co_quan) {
      alert("Vui lòng chọn cơ quan kiểm định");
      return;
    }

    setSavingInspection(true);

    try {
      const response = await fetch(`${API_URL}/api/kiem-dinh/yeu-cau`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          ma_lo_nong_san: inspectionBatch.ma_lo_nong_san,
          ...inspectionForm,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Gửi yêu cầu kiểm định thất bại");
        return;
      }

      alert(`${data.message}. Mã hồ sơ: #${data.data.ma_ho_so}`);
      handleCloseInspectionModal();
      setActiveTab("inspection");
      // Đang ở sẵn tab này (gửi lại đơn) thì không có gì tự tải lại danh sách
      await fetchInspections();
    } catch (error) {
      console.error("Lỗi gửi yêu cầu kiểm định:", error);
      alert("Không thể kết nối tới backend");
    } finally {
      setSavingInspection(false);
    }
  };

  // =========================================================
  // VẬN CHUYỂN & BÀN GIAO
  // =========================================================
  const fetchShippingOrders = async () => {
    setLoadingShipping(true);
    setShippingError("");

    try {
      const response = await fetch(`${API_URL}/api/van-chuyen/cua-toi`, {
        headers: authHeaders(),
      });
      const data = await response.json();

      if (!response.ok) {
        setShippingError(data.message || "Không thể lấy danh sách vận chuyển");
        return;
      }

      setShippingOrders(data.data.lenh || []);
      setShippingStats(data.data.thong_ke);
    } catch (error) {
      console.error("Lỗi lấy danh sách lệnh vận chuyển:", error);
      setShippingError("Không thể kết nối tới backend");
    } finally {
      setLoadingShipping(false);
    }
  };

  useEffect(() => {
    if (activeTab === "shipping") {
      fetchShippingOrders();
    }
  }, [activeTab]);

  // Lô sẵn sàng + đơn vị vận chuyển + cơ sở nhận hàng cho popup tạo lệnh
  const fetchShippingOptions = async () => {
    setPartnerError("");

    try {
      const [batchRes, partnerRes] = await Promise.all([
        fetch(`${API_URL}/api/van-chuyen/lo-san-sang`, {
          headers: authHeaders(),
        }),
        fetch(`${API_URL}/api/van-chuyen/doi-tac`, { headers: authHeaders() }),
      ]);
      const batchData = await batchRes.json();
      const partnerData = await partnerRes.json();

      if (!batchRes.ok || !partnerRes.ok) {
        setPartnerError(
          `${(!batchRes.ok ? batchData : partnerData).message || "Không thể tải dữ liệu"}. Vui lòng đăng nhập lại.`,
        );
      }

      const batchList = batchRes.ok ? batchData.data || [] : [];
      const partnerList = partnerRes.ok
        ? partnerData.data
        : { don_vi_van_chuyen: [], ben_nhan: [] };

      setReadyBatches(batchList);
      setPartners(partnerList);

      // Chỉ có một lựa chọn thì chọn sẵn
      setShippingForm((prev) => ({
        ...prev,
        ma_don_vi_van_chuyen:
          prev.ma_don_vi_van_chuyen ||
          (partnerList.don_vi_van_chuyen.length === 1
            ? partnerList.don_vi_van_chuyen[0].ma_nguoi_dung
            : ""),
        ma_ben_nhan:
          prev.ma_ben_nhan ||
          (partnerList.ben_nhan.length === 1
            ? partnerList.ben_nhan[0].ma_nguoi_dung
            : ""),
      }));
    } catch (error) {
      console.error("Lỗi tải dữ liệu tạo lệnh vận chuyển:", error);
      setPartnerError("Không thể kết nối tới backend");
    }
  };

  const handleOpenShipping = () => {
    setShippingForm({ ...EMPTY_SHIPPING_FORM, thoi_gian_xuat: nowLocalInput() });
    setReadyBatches([]);
    fetchShippingOptions();
    setShowShippingModal(true);
  };

  const handleCloseShippingModal = () => {
    setShowShippingModal(false);
    setShippingForm(EMPTY_SHIPPING_FORM);
    setPartnerError("");
  };

  const handleShippingInputChange = (e) => {
    const { name, value } = e.target;
    setShippingForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmitShipping = async () => {
    if (!shippingForm.ma_lo_nong_san) {
      alert("Vui lòng chọn lô nông sản cần vận chuyển");
      return;
    }

    if (!shippingForm.ma_don_vi_van_chuyen) {
      alert("Vui lòng chọn đơn vị vận chuyển");
      return;
    }

    if (!shippingForm.ma_ben_nhan) {
      alert("Vui lòng chọn cơ sở nhận hàng");
      return;
    }

    setSavingShipping(true);

    try {
      const response = await fetch(`${API_URL}/api/van-chuyen`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(shippingForm),
      });
      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Tạo lệnh vận chuyển thất bại");
        return;
      }

      alert(`${data.message}. Mã vận đơn: ${data.data.ma_van_don}`);
      handleCloseShippingModal();
      await fetchShippingOrders();
    } catch (error) {
      console.error("Lỗi tạo lệnh vận chuyển:", error);
      alert("Không thể kết nối tới backend");
    } finally {
      setSavingShipping(false);
    }
  };

  const handleOpenShippingDetail = async (maVanDon) => {
    try {
      const response = await fetch(`${API_URL}/api/van-chuyen/${maVanDon}`, {
        headers: authHeaders(),
      });
      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Không thể lấy chi tiết lệnh vận chuyển");
        return;
      }

      setShippingDetail(data.data);
    } catch (error) {
      console.error("Lỗi lấy chi tiết lệnh vận chuyển:", error);
      alert("Không thể kết nối tới backend");
    }
  };

  const handleCancelShipping = async (maVanDon) => {
    if (!window.confirm("Bạn có chắc muốn hủy lệnh vận chuyển này?")) return;

    try {
      const response = await fetch(
        `${API_URL}/api/van-chuyen/${maVanDon}/huy`,
        { method: "PUT", headers: authHeaders() },
      );
      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Hủy lệnh vận chuyển thất bại");
        return;
      }

      alert(data.message);
      setShippingDetail(null);
      await fetchShippingOrders();
    } catch (error) {
      console.error("Lỗi hủy lệnh vận chuyển:", error);
      alert("Không thể kết nối tới backend");
    }
  };

  // =========================================================
  // XÓA LÔ THU HOẠCH
  // =========================================================
  const handleDeleteBatch = async (maLo) => {
    setOpenDropdown(null);

    if (!window.confirm("Bạn có chắc muốn xóa lô thu hoạch này?")) return;

    try {
      const response = await fetch(`${API_URL}/api/lo-thu-hoach/${maLo}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Xóa lô thu hoạch thất bại");
        return;
      }

      alert(data.message);
      await fetchBatches();
    } catch (error) {
      console.error("Lỗi xóa lô thu hoạch:", error);
      alert("Không thể kết nối tới backend");
    }
  };

  return (
    <div className="nongdan dashboard-layout">
      {/* =====================================================
          HEADER
      ====================================================== */}
      <header className="dashboard-header">
        <div className="header-left">
          <img src={DEFAULT_LOGO_IMG} alt="Logo" className="header-logo-icon" />
          <span className="header-brand-title">AGRICHAIN</span>
        </div>

        <div className="header-search-bar">
          <input type="text" placeholder="Tìm kiếm lô canh tác ..." />
        </div>

        <div className="header-profile">
          <div className="avatar-circle"></div>
          <div className="profile-meta">
            <span className="profile-name">{user?.ho_ten || "Nông dân"}</span>
            <span className="profile-role">Nông dân</span>
          </div>
        </div>
      </header>

      {/* =====================================================
          BODY
      ====================================================== */}
      <div className="dashboard-body">
        {/* ===================================================
            SIDEBAR
        ==================================================== */}
        <aside className="dashboard-sidebar">
          <div>
            <div className="sidebar-heading">Chức năng canh tác</div>
            <nav className="sidebar-nav">
              <button
                type="button"
                onClick={() => setActiveTab("farm")}
                className={`nav-item-btn ${
                  activeTab === "farm" ? "active" : ""
                }`}
              >
                <Sprout size={20} />
                <span>Quản lý nông trại</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("season")}
                className={`nav-item-btn ${
                  activeTab === "season" ? "active" : ""
                }`}
              >
                <Wheat size={20} />
                <span>Quản lý mùa vụ</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("batch")}
                className={`nav-item-btn ${
                  activeTab === "batch" ? "active" : ""
                }`}
              >
                <PackageCheck size={20} />
                <span>Quản lý lô thu hoạch</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("inspection")}
                className={`nav-item-btn ${
                  activeTab === "inspection" ? "active" : ""
                }`}
              >
                <CalendarCheck size={20} />
                <span>Lịch hẹn kiểm định</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("shipping")}
                className={`nav-item-btn ${
                  activeTab === "shipping" ? "active" : ""
                }`}
              >
                <Truck size={20} />
                <span>Vận chuyển & Bàn giao</span>
              </button>
            </nav>
          </div>

          <div className="sidebar-footer">
            <span className="pulse-dot"></span>
            <span>
              Node nông dân: <b>Agri-Farm-Node</b>
            </span>
          </div>
        </aside>

        {/* ===================================================
            CONTENT
        ==================================================== */}
        <main className="dashboard-content">
          {/* =================================================
              TAB NÔNG TRẠI
          ================================================== */}
          {activeTab === "farm" && (
            <div>
              <div className="metrics-row">
                <div className="metric-card">
                  <div className="metric-title">Tổng diện tích canh tác</div>
                  <div className="metric-number">
                    {tongDienTich.toFixed(2)}
                    <span className="metric-unit">Hecta</span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-title">Số lô canh tác</div>
                  <div className="metric-number">0</div>
                </div>

                <div className="metric-card">
                  <div className="metric-title">Số nông trại</div>
                  <div className="metric-number">{farms.length}</div>
                </div>

                <div className="actions-box">
                  <button
                    className="btn-primary-action"
                    onClick={handleOpenAddFarm}
                  >
                    + Thêm nông trại
                  </button>
                  <div className="action-tip">
                    <span>🚜</span>
                    Thêm nông trại mới để bắt đầu quản lý mùa vụ
                  </div>
                </div>
              </div>

              {loadingFarms && <p>Đang tải danh sách nông trại...</p>}

              {farmError && <p style={{ color: "red" }}>{farmError}</p>}

              {!loadingFarms && !farmError && farms.length === 0 && (
                <p>Chưa có nông trại nào.</p>
              )}

              {farms.map((farm) => {
                const imageUrl = farm.anh_nong_trai
                  ? `${API_URL}${farm.anh_nong_trai}`
                  : DEFAULT_FARM_IMG;

                return (
                  <div className="farm-card" key={farm.ma_nong_trai}>
                    <img
                      src={imageUrl}
                      alt={farm.ten_nong_trai}
                      className="farm-image"
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_FARM_IMG;
                      }}
                    />

                    <div className="farm-details">
                      <div>
                        <h3 className="farm-name">{farm.ten_nong_trai}</h3>
                        <span className="tag-badge green">
                          {farm.ma_nong_trai}
                        </span>

                        <div className="farm-info-grid">
                          <div>
                            <div className="info-label">Diện tích</div>
                            <div className="info-val">
                              {farm.dien_tich_nong_trai || 0} ha
                            </div>
                          </div>

                          <div>
                            <div className="info-label">Địa chỉ</div>
                            <div className="info-val">
                              {farm.dia_diem_nong_trai}
                            </div>
                          </div>

                          <div>
                            <div className="info-label">Người quản lý</div>
                            <div className="info-val">
                              {getManagerName(farm.ma_nguoi_dung)}
                            </div>
                          </div>

                          <div>
                            <div className="info-label">Trạng thái</div>
                            <div className="info-val">
                              {farm.trang_thai === 1
                                ? "Đang hoạt động"
                                : "Ngưng hoạt động"}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="farm-card-buttons">
                        <button
                          className="btn-update"
                          onClick={(e) =>
                            handlechitietnongtrai(e, farm.ma_nong_trai)
                          }
                        >
                          Xem chi tiết
                        </button>

                        <button
                          className="btn-update"
                          onClick={() => handleEditFarm(farm)}
                        >
                          Sửa
                        </button>

                        <button
                          className="btn-map"
                          onClick={() => handleDeleteFarm(farm.ma_nong_trai)}
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* =================================================
              TAB MÙA VỤ
          ================================================== */}
          {activeTab === "season" && (
            <div>
              <div className="metrics-row">
                <div className="metric-card">
                  <div className="metric-title">Mùa vụ đang triển khai</div>
                  <div className="metric-number">
                    {seasonStats.dang_trien_khai}
                    <span className="metric-unit">MÙA VỤ</span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-title">Số lô đang canh tác</div>
                  <div className="metric-number">
                    {seasonStats.so_lo_dang_canh_tac}/{seasonStats.tong_so_lo}
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-title">Lô sắp thu hoạch</div>
                  <div className="metric-number">
                    {seasonStats.sap_thu_hoach}
                  </div>
                </div>

                <div className="actions-box">
                  <select
                    className="filter-select"
                    value={seasonFarmId}
                    onChange={(e) => setSeasonFarmId(e.target.value)}
                  >
                    <option value="">-- chọn nông trại --</option>
                    {farms.map((farm) => (
                      <option key={farm.ma_nong_trai} value={farm.ma_nong_trai}>
                        {farm.ten_nong_trai}
                      </option>
                    ))}
                  </select>

                  <button
                    className="btn-primary-action"
                    onClick={handleOpenAddSeason}
                  >
                    + Thêm Mùa Vụ
                  </button>
                </div>
              </div>

              {loadingSeasons && <p>Đang tải danh sách mùa vụ...</p>}

              {seasonError && <p>{seasonError}</p>}

              {!loadingSeasons && !seasonError && seasons.length === 0 && (
                <p>Chưa có mùa vụ nào. Bấm "+ Thêm Mùa Vụ" để bắt đầu.</p>
              )}

              {seasons.map((season) => (
                <div className="season-card" key={season.ma_mua_vu}>
                  <img
                    src={
                      season.anh_mua_vu
                        ? `${API_URL}${season.anh_mua_vu}`
                        : DEFAULT_FARM_IMG
                    }
                    alt="Crop"
                    className="season-thumbnail"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = DEFAULT_FARM_IMG;
                    }}
                  />

                  <div className="season-body">
                    <div className="season-header">
                      <h3 className="season-title">{season.loai_cay_trong}</h3>
                      <div className="season-tags">
                        <span className="tag-badge gray">
                          #{season.ma_mua_vu}
                        </span>
                        <span className="tag-badge green">
                          {season.ten_nong_trai}
                        </span>
                      </div>
                    </div>

                    <div className="season-row-info">
                      <span>
                        <strong>Giống:</strong> {season.giong_cay || "—"}
                      </span>
                      <span>
                        <strong>Thửa:</strong>{" "}
                        {season.ten_thua_dat || "Chưa chọn"}
                      </span>
                      <span>
                        <strong>Ngày bắt đầu:</strong>{" "}
                        {formatDate(season.ngay_gieo_trong)}
                      </span>
                      {season.ngay_thu_hoach_du_kien && (
                        <span>
                          <strong>Dự kiến thu hoạch:</strong>{" "}
                          {formatDate(season.ngay_thu_hoach_du_kien)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="season-actions">
                    <div className="dropdown-container">
                      <button
                        className="btn-more-dots"
                        title="Tùy chọn"
                        onClick={() => handleToggleDropdown(season.ma_mua_vu)}
                      >
                        <MoreVertical size={18} />
                      </button>

                      {openDropdown === season.ma_mua_vu && (
                        <div className="dropdown-menu">
                          <div
                            className="dropdown-item"
                            onClick={(e) =>
                              handlechitietmuavu(e, season.ma_mua_vu)
                            }
                          >
                            <Eye size={15} />
                            Xem chi tiết
                          </div>
                          <div
                            className="dropdown-item"
                            onClick={() => handleEditSeason(season)}
                          >
                            <Pencil size={15} />
                            Cập nhật mùa vụ
                          </div>
                          <div className="dropdown-divider"></div>
                          <div className="dropdown-item">
                            <CheckCircle2 size={15} />
                            Đánh dấu sẵn sàng
                          </div>
                          <div className="dropdown-divider"></div>
                          <div
                            className="dropdown-item danger"
                            onClick={() => handleDeleteSeason(season.ma_mua_vu)}
                          >
                            <XCircle size={15} />
                            Xóa
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* =================================================
              TAB LÔ THU HOẠCH
          ================================================== */}
          {activeTab === "batch" && (
            <div>
              <div className="metrics-row">
                <div className="metric-card">
                  <div className="metric-title">Số lô chờ thu hoạch</div>
                  <div className="metric-number">
                    {batchStats.cho_thu_hoach}
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-title">Số lô canh tác</div>
                  <div className="metric-number">
                    {batchStats.so_lo_canh_tac}
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-title">Số nông trại</div>
                  <div className="metric-number">{farms.length}</div>
                </div>

                <div className="actions-box">
                  <button
                    className="btn-primary-action"
                    onClick={handleOpenAddBatch}
                  >
                    + Tạo lô thu hoạch
                  </button>
                  <div className="action-tip">
                    <span>🌾</span>
                    Tạo lô thu hoạch nông sản của bạn
                  </div>
                </div>
              </div>

              {loadingBatches && <p>Đang tải danh sách lô thu hoạch...</p>}

              {batchError && <p>{batchError}</p>}

              <div className="table-container custom-scrollbar">
                <table className="batch-table">
                  <thead>
                    <tr>
                      <th>Mã lô</th>
                      <th>Mã nông trại</th>
                      <th>Mùa vụ</th>
                      <th>Thửa đất</th>
                      <th>Sản lượng</th>
                      <th>Ngày thu hoạch</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!loadingBatches && !batchError && batches.length === 0 && (
                      <tr>
                        <td colSpan={7}>
                          Chưa có lô thu hoạch nào. Bấm "+ Tạo lô thu hoạch" để
                          bắt đầu.
                        </td>
                      </tr>
                    )}

                    {batches.map((batch) => {
                      const isDropdownActive =
                        openDropdown === `batch-${batch.ma_lo_nong_san}`;

                      return (
                        <tr
                          key={batch.ma_lo_nong_san}
                          className={
                            isDropdownActive ? "row-has-open-menu" : ""
                          }
                        >
                          <td>{batch.ma_lo_nong_san}</td>
                          <td>{batch.ma_nong_trai || "—"}</td>
                          <td>{batch.loai_cay_trong || "—"}</td>
                          <td>{batch.ten_thua_dat || "—"}</td>
                          <td>
                            {formatQuantity(
                              batch.so_luong_hien_tai,
                              batch.don_vi_tinh,
                            )}
                          </td>
                          <td>{formatDate(batch.ngay_thu_hoach) || "—"}</td>
                          <td>
                            <div className="status-icon-cell">
                              {batch.giai_doan_hien_tai === "CREATED" ? (
                                <span
                                  className="status-icon-modern empty"
                                  title={
                                    BATCH_STAGE_LABELS[
                                      batch.giai_doan_hien_tai
                                    ] || batch.giai_doan_hien_tai
                                  }
                                >
                                  <span className="empty-indicator"></span>
                                </span>
                              ) : (
                                <span
                                  className="status-icon-modern success"
                                  title={
                                    BATCH_STAGE_LABELS[
                                      batch.giai_doan_hien_tai
                                    ] || batch.giai_doan_hien_tai
                                  }
                                >
                                  <CheckCircle2 size={16} />
                                </span>
                              )}

                              <div className="dropdown-container">
                                <button
                                  className="btn-more-dots"
                                  title="Tùy chọn"
                                  onClick={(e) =>
                                    handleToggleBatchMenu(
                                      e,
                                      `batch-${batch.ma_lo_nong_san}`,
                                    )
                                  }
                                >
                                  <MoreVertical size={18} />
                                </button>

                                {isDropdownActive && (
                                  <div
                                    className={`dropdown-menu dropdown-fixed ${
                                      batchMenuPos.up ? "dropdown-up" : ""
                                    }`}
                                    style={{
                                      right: batchMenuPos.right,
                                      ...(batchMenuPos.up
                                        ? { bottom: batchMenuPos.bottom }
                                        : { top: batchMenuPos.top }),
                                    }}
                                  >
                                    <div
                                      className="dropdown-item"
                                      onClick={(e) =>
                                        handlechitietmuavu(
                                          e,
                                          batch.ma_mua_vu,
                                          batch.ma_lo_nong_san,
                                        )
                                      }
                                    >
                                      <Eye size={15} />
                                      Xem chi tiết
                                    </div>
                                    <div className="dropdown-divider"></div>
                                    <div
                                      className="dropdown-item"
                                      onClick={() => handleEditBatch(batch)}
                                    >
                                      <Pencil size={15} />
                                      Cập nhật
                                    </div>
                                    <div className="dropdown-divider"></div>
                                    <div
                                      className="dropdown-item"
                                      onClick={() =>
                                        handleOpenInspection({
                                          ma_lo_nong_san: batch.ma_lo_nong_san,
                                          loai_cay_trong: batch.loai_cay_trong,
                                          so_luong_hien_tai:
                                            batch.so_luong_hien_tai,
                                          don_vi_tinh: batch.don_vi_tinh,
                                        })
                                      }
                                    >
                                      <CalendarCheck size={15} />
                                      Yêu cầu kiểm định
                                    </div>
                                    <div className="dropdown-divider"></div>
                                    <div
                                      className="dropdown-item danger"
                                      onClick={() =>
                                        handleDeleteBatch(batch.ma_lo_nong_san)
                                      }
                                    >
                                      <XCircle size={15} />
                                      Xóa
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =================================================
              TAB LỊCH HẸN KIỂM ĐỊNH
          ================================================== */}
          {activeTab === "inspection" && (
            <div className="inspection-view-wrapper">
              <div className="inspection-table-card">
                <table className="inspection-table">
                  <thead>
                    <tr>
                      <th className="col-code">Mã lịch</th>
                      <th>Mã lô kiểm định</th>
                      <th>Cơ quan kiểm định</th>
                      <th>Ngày hẹn kiểm tra</th>
                      <th>Ghi chú / Địa điểm</th>
                      <th>Trạng thái phê duyệt</th>
                      <th className="col-actions">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingInspections && (
                      <tr>
                        <td colSpan={7}>Đang tải danh sách kiểm định...</td>
                      </tr>
                    )}

                    {inspectionError && (
                      <tr>
                        <td colSpan={7}>{inspectionError}</td>
                      </tr>
                    )}

                    {!loadingInspections &&
                      !inspectionError &&
                      inspections.length === 0 && (
                        <tr>
                          <td colSpan={7}>
                            Chưa có yêu cầu kiểm định nào. Vào tab Quản lý lô
                            thu hoạch, bấm ⋮ rồi chọn "Yêu cầu kiểm định".
                          </td>
                        </tr>
                      )}

                    {inspections.map((item) => {
                      const status = getInspectionStatus(item);
                      const canResend =
                        item.trang_thai_ho_so === "TU_CHOI" ||
                        (item.trang_thai_ho_so === "DA_CONG_BO" &&
                          item.ket_luan !== "PASSED");

                      return (
                        <tr key={item.ma_kiem_dinh}>
                          <td className="col-code tracking-code">
                            {item.ma_ho_so}
                          </td>
                          <td className="nowrap-cell">
                            <span className="batch-code-badge">
                              {item.ma_lo_nong_san}
                            </span>
                          </td>
                          <td className="agency-name">
                            {item.ten_co_quan || item.ma_co_quan}
                          </td>
                          <td className="inspection-date">
                            {item.ngay_hen_lay_mau
                              ? `${formatDate(item.ngay_hen_lay_mau)}${
                                  item.gio_hen_lay_mau
                                    ? ` (${item.gio_hen_lay_mau})`
                                    : ""
                                }`
                              : "Chưa hẹn"}
                          </td>
                          <td className="inspection-note">
                            {item.ghi_chu_chuan_bi ||
                              item.noi_dung_de_nghi ||
                              item.tieu_chuan_dang_ky}
                          </td>
                          <td className="nowrap-cell">
                            <span className={`status-pill ${status.tone}`}>
                              {status.tone === "success" && (
                                <CheckCircle2 size={15} />
                              )}
                              {status.tone === "warning" && <Clock size={15} />}
                              {status.tone === "danger" && <XCircle size={15} />}
                              {status.label}
                            </span>
                          </td>
                          <td className="col-actions">
                            {canResend ? (
                              <button
                                type="button"
                                className="btn-action-retry"
                                onClick={() =>
                                  handleOpenInspection({
                                    ma_lo_nong_san: item.ma_lo_nong_san,
                                    loai_cay_trong: item.loai_cay_trong,
                                    so_luong_hien_tai: item.so_luong_hien_tai,
                                    don_vi_tinh: item.don_vi_tinh,
                                  })
                                }
                              >
                                <Clock size={15} />
                                Gửi lại đơn
                              </button>
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
          )}

          {/* =================================================
              TAB VẬN CHUYỂN & BÀN GIAO
          ================================================== */}
          {activeTab === "shipping" && (
            <div>
              <div className="metrics-row">
                <div className="metric-card">
                  <div className="metric-title">Đơn đang vận chuyển</div>
                  <div className="metric-number">
                    {shippingStats.dang_van_chuyen}
                    <span className="metric-unit">CHUYẾN</span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-title">Đã bàn giao thành công</div>
                  <div className="metric-number">{shippingStats.da_ban_giao}</div>
                </div>

                <div className="metric-card">
                  <div className="metric-title">Khối lượng đã xuất</div>
                  <div className="metric-number">
                    {shippingStats.khoi_luong_da_xuat_tan.toLocaleString(
                      "vi-VN",
                    )}
                    <span className="metric-unit">TẤN</span>
                  </div>
                </div>

                <div className="actions-box">
                  <button
                    className="btn-primary-action"
                    onClick={handleOpenShipping}
                  >
                    + Tạo lệnh bàn giao
                  </button>
                  <div className="action-tip">
                    <span>🚛</span>
                    Theo dõi hành trình nông sản từ kho tới đơn vị sơ chế đóng
                    gói
                  </div>
                </div>
              </div>

              <div className="shipping-table-card custom-scrollbar">
                <table className="shipping-table">
                  <thead>
                    <tr>
                      <th className="col-code">Mã vận đơn</th>
                      <th>Mã lô hàng</th>
                      <th>Tên sản phẩm</th>
                      <th>Đơn vị vận chuyển</th>
                      <th>Khối lượng</th>
                      <th>Thời gian xuất</th>
                      <th>Trạng thái</th>
                      <th className="col-actions">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingShipping && (
                      <tr>
                        <td colSpan={8}>Đang tải danh sách vận chuyển...</td>
                      </tr>
                    )}

                    {shippingError && (
                      <tr>
                        <td colSpan={8}>{shippingError}</td>
                      </tr>
                    )}

                    {!loadingShipping &&
                      !shippingError &&
                      shippingOrders.length === 0 && (
                        <tr>
                          <td colSpan={8}>
                            Chưa có lệnh vận chuyển nào. Bấm "+ Tạo lệnh bàn
                            giao" để bắt đầu.
                          </td>
                        </tr>
                      )}

                    {shippingOrders.map((order) => {
                      const status = SHIPPING_STATUS[order.trang_thai] || {
                        label: order.trang_thai,
                        tone: "warning",
                        icon: "none",
                      };

                      return (
                        <tr key={order.ma_van_don}>
                          <td className="col-code tracking-code">
                            {order.ma_van_don}
                          </td>
                          <td>
                            <span className="batch-code-badge">
                              {order.ma_lo_nong_san}
                            </span>
                          </td>
                          <td className="product-name">{order.ten_san_pham}</td>
                          <td>
                            <div className="carrier-name">
                              {order.ten_don_vi_van_chuyen}
                            </div>
                            <div className="carrier-sub">
                              {order.ten_tai_xe
                                ? `${order.ten_tai_xe}${
                                    order.bien_so_xe
                                      ? ` (${order.bien_so_xe})`
                                      : ""
                                  }`
                                : "Chưa phân công"}
                            </div>
                          </td>
                          <td className="package-weight">
                            {formatQuantity(order.khoi_luong, order.don_vi_tinh)}
                          </td>
                          <td className="export-time">
                            {formatDateTime(order.thoi_gian_xuat)}
                          </td>
                          <td>
                            <span className={`status-pill ${status.tone}`}>
                              {status.icon === "truck" && <Truck size={15} />}
                              {status.icon === "clock" && <Clock size={15} />}
                              {status.icon === "check" && (
                                <CheckCircle2 size={15} />
                              )}
                              {status.label}
                            </span>
                          </td>
                          <td className="col-actions">
                            <button
                              type="button"
                              className="btn-action-detail"
                              onClick={() =>
                                handleOpenShippingDetail(order.ma_van_don)
                              }
                            >
                              <Eye size={15} />
                              Chi tiết
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* =====================================================
          POPUP THÊM / SỬA NÔNG TRẠI
      ====================================================== */}
      {showFarmModal && (
        <div className="modal-overlay">
          <form
            className="modal-container"
            onSubmit={editingFarm ? handleUpdateFarm : handleAddFarm}
          >
            <div className="modal-header">
              <h3>
                {editingFarm ? "Cập nhật nông trại" : "Thông tin nông trại"}
              </h3>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Mã nông trại</label>
                <input
                  type="text"
                  name="ma_nong_trai"
                  value={farmForm.ma_nong_trai}
                  onChange={handleFarmInputChange}
                  placeholder="VD: NT002"
                  readOnly={!!editingFarm}
                />
              </div>

              <div className="form-group">
                <label>Tên nông trại</label>
                <input
                  type="text"
                  name="ten_nong_trai"
                  value={farmForm.ten_nong_trai}
                  onChange={handleFarmInputChange}
                  placeholder="Nhập tên nông trại của bạn"
                />
              </div>

              <div className="form-group">
                <label>Người quản lý</label>
                <select
                  name="ma_nguoi_dung"
                  value={farmForm.ma_nguoi_dung}
                  onChange={handleFarmInputChange}
                >
                  <option value="">-- Chọn người quản lý --</option>
                  {managers.map((manager) => (
                    <option
                      key={manager.ma_nguoi_dung}
                      value={manager.ma_nguoi_dung}
                    >
                      {manager.ho_ten}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Địa chỉ</label>
                <input
                  type="text"
                  name="dia_diem_nong_trai"
                  value={farmForm.dia_diem_nong_trai}
                  onChange={handleFarmInputChange}
                  placeholder="Xã/phường, tỉnh/thành phố"
                />
              </div>

              <div className="form-group">
                <label>Diện tích (ha)</label>
                <input
                  type="number"
                  name="dien_tich_nong_trai"
                  value={farmForm.dien_tich_nong_trai}
                  onChange={handleFarmInputChange}
                  placeholder="VD: 5.5"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label>Ảnh của nông trại</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFarmImageChange}
                />
              </div>

              {farmImagePreview && (
                <div className="form-group">
                  <label>Ảnh hiện tại</label>
                  <img
                    src={farmImagePreview}
                    alt="Xem trước"
                    style={{
                      width: "100%",
                      maxHeight: "220px",
                      objectFit: "cover",
                      borderRadius: "8px",
                    }}
                  />
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={handleCloseFarmModal}
                disabled={savingFarm}
              >
                Hủy
              </button>

              <button type="submit" className="btn-save" disabled={savingFarm}>
                {savingFarm
                  ? "Đang lưu..."
                  : editingFarm
                    ? "Cập nhật"
                    : "Lưu thông tin"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================
          POPUP MÙA VỤ
      ====================================================== */}
      {showSeasonModal && (
        <div className="modal-overlay">
          <div className="modal-container modal-lg">
            <div className="modal-header">
              <h3>Thông Tin Mùa Vụ</h3>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Tên mùa vụ</label>
                <input
                  type="text"
                  name="loai_cay_trong"
                  placeholder="Nhập tên mùa vụ / loại cây trồng"
                  value={seasonForm.loai_cay_trong}
                  onChange={handleSeasonInputChange}
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Giống cây</label>
                  <input
                    type="text"
                    name="giong_cay"
                    placeholder="Nhập tên giống cây"
                    value={seasonForm.giong_cay}
                    onChange={handleSeasonInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>Thửa đất</label>
                  <select
                    name="ma_thua_dat"
                    value={seasonForm.ma_thua_dat}
                    onChange={handleSeasonInputChange}
                  >
                    <option value="">-- Chọn thửa đất --</option>
                    {plots
                      .filter(
                        (plot) =>
                          !plot.ma_mua_vu ||
                          plot.ma_thua_dat === seasonForm.ma_thua_dat,
                      )
                      .map((plot) => (
                        <option key={plot.ma_thua_dat} value={plot.ma_thua_dat}>
                          {plot.ten_thua_dat}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Ngày bắt đầu</label>
                  <input
                    type="date"
                    name="ngay_gieo_trong"
                    value={seasonForm.ngay_gieo_trong}
                    onChange={handleSeasonInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>Ngày thu hoạch dự kiến</label>
                  <input
                    type="date"
                    name="ngay_thu_hoach_du_kien"
                    min={seasonForm.ngay_gieo_trong || undefined}
                    value={seasonForm.ngay_thu_hoach_du_kien}
                    onChange={handleSeasonInputChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Ảnh mùa vụ</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleSeasonImageChange}
                />
              </div>

              {seasonImagePreview && (
                <div className="form-group">
                  <label>
                    {seasonImage ? "Ảnh xem trước" : "Ảnh hiện tại"}
                  </label>
                  <img
                    src={seasonImagePreview}
                    alt="Xem trước"
                    style={{
                      width: "100%",
                      maxHeight: "220px",
                      objectFit: "cover",
                      borderRadius: "8px",
                    }}
                  />
                </div>
              )}

              <div className="material-section">
                <div className="material-header">
                  <h4>Phân bón và thuốc BVTV sử dụng</h4>
                  <button
                    type="button"
                    className="btn-add-small"
                    onClick={handleAddMaterial}
                  >
                    + Thêm
                  </button>
                </div>

                {seasonMaterials.map((row) => {
                  const options = materialCatalog.filter(
                    (item) => item.loai_vat_tu === row.loai_vat_tu,
                  );
                  const selected = materialCatalog.find(
                    (item) => item.ma_vat_tu === row.ma_vat_tu,
                  );

                  return (
                    <div
                      className="material-box"
                      key={row.key}
                      style={{ marginBottom: 12 }}
                    >
                      <button
                        type="button"
                        className="btn-remove-material"
                        onClick={() => handleRemoveMaterial(row.key)}
                      >
                        ✕
                      </button>

                      <div className="form-grid-2">
                        <div className="form-group radio-group-container">
                          <label>Loại vật tư</label>
                          <div className="radio-group">
                            <label>
                              <input
                                type="radio"
                                name={`vattu-${row.key}`}
                                checked={row.loai_vat_tu === "PHAN_BON"}
                                onChange={() =>
                                  handleMaterialChange(
                                    row.key,
                                    "loai_vat_tu",
                                    "PHAN_BON",
                                  )
                                }
                              />
                              Phân bón
                            </label>
                            <label>
                              <input
                                type="radio"
                                name={`vattu-${row.key}`}
                                checked={row.loai_vat_tu === "THUOC_BVTV"}
                                onChange={() =>
                                  handleMaterialChange(
                                    row.key,
                                    "loai_vat_tu",
                                    "THUOC_BVTV",
                                  )
                                }
                              />
                              Thuốc BVTV
                            </label>
                          </div>
                        </div>

                        <div className="form-group">
                          <label>Tên phân thuốc</label>
                          <select
                            value={row.ma_vat_tu}
                            disabled={!row.loai_vat_tu}
                            onChange={(e) =>
                              handleMaterialChange(
                                row.key,
                                "ma_vat_tu",
                                e.target.value,
                              )
                            }
                          >
                            <option value="">-- Chọn vật tư --</option>
                            {options.map((item) => (
                              <option
                                key={item.ma_vat_tu}
                                value={item.ma_vat_tu}
                              >
                                {item.ten_vat_tu}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label>
                            Liều lượng
                            {selected ? ` (${selected.don_vi_tinh})` : ""}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={row.lieu_luong}
                            onChange={(e) =>
                              handleMaterialChange(
                                row.key,
                                "lieu_luong",
                                e.target.value,
                              )
                            }
                          />
                        </div>

                        <div className="form-group">
                          <label>Ngày sử dụng</label>
                          <input
                            type="date"
                            value={row.ngay_su_dung}
                            onChange={(e) =>
                              handleMaterialChange(
                                row.key,
                                "ngay_su_dung",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={handleCloseSeasonModal}
              >
                Hủy
              </button>

              <button
                type="button"
                className="btn-save"
                onClick={handleSaveSeason}
                disabled={savingSeason}
              >
                {savingSeason ? "Đang lưu..." : "Lưu thông tin"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          POPUP LÔ THU HOẠCH
      ====================================================== */}
      {showBatchModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Thông Tin Thu Hoạch</h3>
            </div>

            <div className="modal-body">
              {(() => {
                const season = batchSeasons.find(
                  (item) => item.ma_mua_vu === batchForm.ma_mua_vu,
                );
                const info = season || editingBatch;

                return (
                  <>
                    <div className="form-group">
                      <label>Mùa vụ thu hoạch</label>
                      <select
                        name="ma_mua_vu"
                        value={batchForm.ma_mua_vu}
                        onChange={handleBatchInputChange}
                        disabled={!!editingBatch}
                      >
                        <option value="">-- Chọn mùa vụ --</option>
                        {batchSeasons.map((item) => (
                          <option key={item.ma_mua_vu} value={item.ma_mua_vu}>
                            {item.ma_mua_vu} - {item.loai_cay_trong} (
                            {item.ten_nong_trai})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-grid-2 readonly-grid">
                      <div className="readonly-item">
                        <label>Mã nông trại</label>
                        <span style={readonlyValueStyle(!!info?.ma_nong_trai)}>
                          {info?.ma_nong_trai || "Chưa có dữ liệu"}
                        </span>
                      </div>

                      <div className="readonly-item">
                        <label>Thửa đất</label>
                        <span style={readonlyValueStyle(!!info?.ten_thua_dat)}>
                          {info?.ten_thua_dat || "Chưa có dữ liệu"}
                        </span>
                      </div>

                      <div className="readonly-item">
                        <label>Mùa vụ</label>
                        <span style={readonlyValueStyle(!!info?.loai_cay_trong)}>
                          {info?.loai_cay_trong || "Chưa có dữ liệu"}
                        </span>
                      </div>

                      <div className="readonly-item">
                        <label>Giống cây</label>
                        <span style={readonlyValueStyle(!!info?.giong_cay)}>
                          {info?.giong_cay || "Chưa có dữ liệu"}
                        </span>
                      </div>
                    </div>
                  </>
                );
              })()}

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Sản lượng (kg)</label>
                  <input
                    type="number"
                    name="so_luong"
                    min="0"
                    step="any"
                    value={batchForm.so_luong}
                    onChange={handleBatchInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>Ngày thu hoạch</label>
                  <input
                    type="date"
                    name="ngay_thu_hoach"
                    value={batchForm.ngay_thu_hoach}
                    onChange={handleBatchInputChange}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={handleCloseBatchModal}
              >
                Hủy
              </button>

              <button
                type="button"
                className="btn-save"
                onClick={handleSaveBatch}
                disabled={savingBatch}
              >
                {savingBatch ? "Đang lưu..." : "Lưu thông tin"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          POPUP YÊU CẦU KIỂM ĐỊNH
      ====================================================== */}
      {showInspectionModal && inspectionBatch && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Yêu Cầu Kiểm Định</h3>
            </div>

            <div className="modal-body">
              <div className="form-grid-2 readonly-grid">
                <div className="readonly-item">
                  <label>Mã lô</label>
                  <span style={readonlyValueStyle(true)}>
                    {inspectionBatch.ma_lo_nong_san}
                  </span>
                </div>

                <div className="readonly-item">
                  <label>Mùa vụ</label>
                  <span
                    style={readonlyValueStyle(!!inspectionBatch.loai_cay_trong)}
                  >
                    {inspectionBatch.loai_cay_trong || "—"}
                  </span>
                </div>

                <div className="readonly-item">
                  <label>Sản lượng</label>
                  <span style={readonlyValueStyle(true)}>
                    {formatQuantity(
                      inspectionBatch.so_luong_hien_tai,
                      inspectionBatch.don_vi_tinh,
                    )}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label>Cơ quan kiểm định</label>
                <select
                  name="ma_co_quan"
                  value={inspectionForm.ma_co_quan}
                  onChange={handleInspectionInputChange}
                >
                  <option value="">-- Chọn cơ quan kiểm định --</option>
                  {authorities.map((item) => (
                    <option key={item.ma_co_quan} value={item.ma_co_quan}>
                      {item.ten_co_quan}
                    </option>
                  ))}
                </select>
                {authorityError && (
                  <p style={{ color: "#dc2626", fontSize: 12, marginTop: 6 }}>
                    {authorityError}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label>Tiêu chuẩn đăng ký</label>
                <select
                  name="tieu_chuan_dang_ky"
                  value={inspectionForm.tieu_chuan_dang_ky}
                  onChange={handleInspectionInputChange}
                >
                  <option value="VIETGAP">VietGAP</option>
                  <option value="GLOBALGAP">GlobalGAP</option>
                  <option value="ORGANIC">Hữu cơ (Organic)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Nội dung đề nghị</label>
                <textarea
                  name="noi_dung_de_nghi"
                  rows={4}
                  maxLength={1000}
                  placeholder="Ví dụ: Kiểm định dư lượng thuốc BVTV tại vườn"
                  value={inspectionForm.noi_dung_de_nghi}
                  onChange={handleInspectionInputChange}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={handleCloseInspectionModal}
              >
                Hủy
              </button>

              <button
                type="button"
                className="btn-save"
                onClick={handleSubmitInspection}
                disabled={savingInspection}
              >
                {savingInspection ? "Đang gửi..." : "Gửi yêu cầu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          POPUP TẠO LỆNH VẬN CHUYỂN & BÀN GIAO
      ====================================================== */}
      {showShippingModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Tạo Lệnh Vận Chuyển & Bàn Giao</h3>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Chọn lô nông sản</label>
                <select
                  name="ma_lo_nong_san"
                  value={shippingForm.ma_lo_nong_san}
                  onChange={handleShippingInputChange}
                >
                  <option value="">-- Chọn lô thu hoạch --</option>
                  {readyBatches.map((item) => (
                    <option key={item.ma_lo_nong_san} value={item.ma_lo_nong_san}>
                      {item.ma_lo_nong_san} - {item.ten_san_pham}
                    </option>
                  ))}
                </select>
                {!partnerError && readyBatches.length === 0 && (
                  <p style={{ color: "#6b7280", fontSize: 12, marginTop: 6 }}>
                    Chưa có lô nào sẵn sàng. Lô phải còn ở nông trại, chưa có
                    lệnh vận chuyển và không chờ kiểm định.
                  </p>
                )}
              </div>

              <div className="form-grid-2 readonly-grid">
                <div className="readonly-item">
                  <label>Mã lô</label>
                  <span style={readonlyValueStyle(!!selectedBatchInfo)}>
                    {selectedBatchInfo?.ma_lo_nong_san || "Chưa có thông tin"}
                  </span>
                </div>

                <div className="readonly-item">
                  <label>Nông trại</label>
                  <span style={readonlyValueStyle(!!selectedBatchInfo)}>
                    {selectedBatchInfo?.ma_nong_trai || "Chưa có thông tin"}
                  </span>
                </div>

                <div className="readonly-item">
                  <label>Tên nông sản</label>
                  <span style={readonlyValueStyle(!!selectedBatchInfo)}>
                    {selectedBatchInfo?.ten_san_pham || "Chưa có thông tin"}
                  </span>
                </div>

                <div className="readonly-item">
                  <label>Sản lượng</label>
                  <span style={readonlyValueStyle(!!selectedBatchInfo)}>
                    {selectedBatchInfo
                      ? formatQuantity(
                          selectedBatchInfo.so_luong_hien_tai,
                          selectedBatchInfo.don_vi_tinh,
                        )
                      : "Chưa có thông tin"}
                  </span>
                </div>

                <div className="readonly-item">
                  <label>Ngày thu hoạch</label>
                  <span style={readonlyValueStyle(!!selectedBatchInfo)}>
                    {selectedBatchInfo
                      ? formatDate(selectedBatchInfo.ngay_thu_hoach) || "—"
                      : "Chưa có thông tin"}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label>Đơn vị vận chuyển</label>
                <select
                  name="ma_don_vi_van_chuyen"
                  value={shippingForm.ma_don_vi_van_chuyen}
                  onChange={handleShippingInputChange}
                >
                  <option value="">-- Chọn đơn vị vận chuyển --</option>
                  {partners.don_vi_van_chuyen.map((item) => (
                    <option key={item.ma_nguoi_dung} value={item.ma_nguoi_dung}>
                      {item.ho_ten}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Cơ sở nhận hàng (sơ chế / đóng gói)</label>
                <select
                  name="ma_ben_nhan"
                  value={shippingForm.ma_ben_nhan}
                  onChange={handleShippingInputChange}
                >
                  <option value="">-- Chọn cơ sở nhận hàng --</option>
                  {partners.ben_nhan.map((item) => (
                    <option key={item.ma_nguoi_dung} value={item.ma_nguoi_dung}>
                      {item.ho_ten}
                    </option>
                  ))}
                </select>
                {partnerError && (
                  <p style={{ color: "#dc2626", fontSize: 12, marginTop: 6 }}>
                    {partnerError}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label>Thời gian xuất hàng</label>
                <input
                  type="datetime-local"
                  name="thoi_gian_xuat"
                  value={shippingForm.thoi_gian_xuat}
                  onChange={handleShippingInputChange}
                />
              </div>

              <div className="form-group">
                <label>Ghi chú (không bắt buộc)</label>
                <textarea
                  name="ghi_chu"
                  rows={3}
                  maxLength={500}
                  placeholder="Ví dụ: Giao trước 18h, giữ lạnh 8-10°C"
                  value={shippingForm.ghi_chu}
                  onChange={handleShippingInputChange}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={handleCloseShippingModal}
              >
                Hủy
              </button>

              <button
                type="button"
                className="btn-save"
                onClick={handleSubmitShipping}
                disabled={savingShipping}
              >
                {savingShipping ? "Đang tạo..." : "Tạo lệnh"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          POPUP CHI TIẾT LỆNH VẬN CHUYỂN
      ====================================================== */}
      {shippingDetail && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Chi Tiết Vận Chuyển {shippingDetail.ma_van_don}</h3>
            </div>

            <div className="modal-body">
              <div className="form-grid-2 readonly-grid">
                <div className="readonly-item">
                  <label>Trạng thái</label>
                  <span style={readonlyValueStyle(true)}>
                    {SHIPPING_STATUS[shippingDetail.trang_thai]?.label ||
                      shippingDetail.trang_thai}
                  </span>
                </div>

                <div className="readonly-item">
                  <label>Mã lô</label>
                  <span style={readonlyValueStyle(true)}>
                    {shippingDetail.ma_lo_nong_san}
                  </span>
                </div>

                <div className="readonly-item">
                  <label>Nông sản</label>
                  <span style={readonlyValueStyle(true)}>
                    {shippingDetail.ten_san_pham}
                  </span>
                </div>

                <div className="readonly-item">
                  <label>Khối lượng</label>
                  <span style={readonlyValueStyle(true)}>
                    {formatQuantity(
                      shippingDetail.khoi_luong,
                      shippingDetail.don_vi_tinh,
                    )}
                  </span>
                </div>

                <div className="readonly-item">
                  <label>Điểm nhận hàng</label>
                  <span style={readonlyValueStyle(!!shippingDetail.ten_nong_trai)}>
                    {shippingDetail.ten_nong_trai
                      ? `${shippingDetail.ten_nong_trai} (${shippingDetail.dia_diem_nong_trai})`
                      : "—"}
                  </span>
                </div>

                <div className="readonly-item">
                  <label>Điểm giao hàng</label>
                  <span style={readonlyValueStyle(true)}>
                    {shippingDetail.ten_ben_nhan}
                  </span>
                </div>

                <div className="readonly-item">
                  <label>Đơn vị vận chuyển</label>
                  <span style={readonlyValueStyle(true)}>
                    {shippingDetail.ten_don_vi_van_chuyen}
                    {shippingDetail.sdt_don_vi_van_chuyen
                      ? ` - ${shippingDetail.sdt_don_vi_van_chuyen}`
                      : ""}
                  </span>
                </div>

                <div className="readonly-item">
                  <label>Tài xế / Biển số</label>
                  <span style={readonlyValueStyle(!!shippingDetail.ten_tai_xe)}>
                    {shippingDetail.ten_tai_xe
                      ? `${shippingDetail.ten_tai_xe}${
                          shippingDetail.bien_so_xe
                            ? ` (${shippingDetail.bien_so_xe})`
                            : ""
                        }`
                      : "Chưa phân công"}
                  </span>
                </div>

                <div className="readonly-item">
                  <label>Thời gian xuất</label>
                  <span style={readonlyValueStyle(true)}>
                    {formatDateTime(shippingDetail.thoi_gian_xuat)}
                  </span>
                </div>

                <div className="readonly-item">
                  <label>Ghi chú</label>
                  <span style={readonlyValueStyle(!!shippingDetail.ghi_chu)}>
                    {shippingDetail.ghi_chu || "Không có"}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShippingDetail(null)}
              >
                Đóng
              </button>

              {shippingDetail.co_the_huy && (
                <button
                  type="button"
                  className="btn-save btn-danger-solid"
                  onClick={() => handleCancelShipping(shippingDetail.ma_van_don)}
                >
                  Hủy lệnh
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
