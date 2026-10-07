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
  // DỮ LIỆU LÔ HÀNG ĐỂ CHỌN KHI TẠO LỆNH VẬN CHUYỂN
  // =========================================================
  const availableBatches = [
    {
      ma_lo: "LA1-11111111",
      ten_lo: "Quýt đường loại 1 đợt 1",
      ma_nong_trai: "FARM11111111",
      ten_nong_san: "Quýt Đường Mọng Nước",
      san_luong: "5.000 kg",
      ngay_thu_hoach: "25/12/2026",
    },
    {
      ma_lo: "LA2-22091104",
      ten_lo: "Xoài Cát Hòa Lộc xuất khẩu",
      ma_nong_trai: "FARM22091104",
      ten_nong_san: "Xoài Cát Hòa Lộc",
      san_luong: "3.500 kg",
      ngay_thu_hoach: "15/11/2026",
    },
  ];

  const [selectedBatchCode, setSelectedBatchCode] = useState("");
  const selectedBatchInfo = availableBatches.find(
    (b) => b.ma_lo === selectedBatchCode,
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
    // Mùa vụ thuộc về 1 nông trại: lấy từ bộ lọc, hoặc nông trại duy nhất
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
    try {
      const response = await fetch(
        `${API_URL}/api/mua-vu/${season.ma_mua_vu}`,
      );
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

        // Đổi loại vật tư thì phải chọn lại tên phân/thuốc
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
          !row.ma_vat_tu ||
          !(Number(row.lieu_luong) > 0) ||
          !row.ngay_su_dung,
      )
    ) {
      alert(
        "Vui lòng chọn loại, tên, liều lượng và ngày sử dụng cho mỗi vật tư",
      );
      return;
    }

    // Gửi multipart/form-data để kèm được file ảnh
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
                    <button
                      className="btn-outline-green"
                      onClick={() => handleEditSeason(season)}
                    >
                      ✏️ cập nhật mùa vụ
                    </button>

                    <div className="dropdown-container">
                      <button
                        className="btn-more"
                        onClick={() => handleToggleDropdown(season.ma_mua_vu)}
                      >
                        ⋮
                      </button>

                      {openDropdown === season.ma_mua_vu && (
                        <div className="dropdown-menu">
                          <div
                            className="dropdown-item"
                            onClick={(e) =>
                              handlechitietmuavu(e, season.ma_mua_vu)
                            }
                          >
                            Xem chi tiết
                          </div>
                          <div className="dropdown-divider"></div>
                          <div className="dropdown-item">
                            Đánh dấu sẵn sàng
                          </div>
                          <div className="dropdown-divider"></div>
                          <div
                            className="dropdown-item danger"
                            onClick={() => handleDeleteSeason(season.ma_mua_vu)}
                          >
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
                  <div className="metric-number">{batchStats.cho_thu_hoach}</div>
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

                    {batches.map((batch) => (
                      <tr key={batch.ma_lo_nong_san}>
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
                            <span
                              className={`status-icon ${
                                batch.giai_doan_hien_tai === "CREATED"
                                  ? "empty"
                                  : "success"
                              }`}
                              title={
                                BATCH_STAGE_LABELS[batch.giai_doan_hien_tai] ||
                                batch.giai_doan_hien_tai
                              }
                            >
                              {batch.giai_doan_hien_tai === "CREATED" ? "" : "✓"}
                            </span>
                            <div className="dropdown-container">
                              <button
                                className="btn-more"
                                onClick={() =>
                                  handleToggleDropdown(
                                    `batch-${batch.ma_lo_nong_san}`,
                                  )
                                }
                              >
                                ⋮
                              </button>

                              {openDropdown ===
                                `batch-${batch.ma_lo_nong_san}` && (
                                <div className="dropdown-menu">
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
                                    Xem chi tiết
                                  </div>
                                  <div className="dropdown-divider"></div>
                                  <div
                                    className="dropdown-item"
                                    onClick={() => handleEditBatch(batch)}
                                  >
                                    Cập nhật
                                  </div>
                                  <div className="dropdown-divider"></div>
                                  <div className="dropdown-item">
                                    Yêu cầu kiểm định
                                  </div>
                                  <div className="dropdown-divider"></div>
                                  <div
                                    className="dropdown-item danger"
                                    onClick={() =>
                                      handleDeleteBatch(batch.ma_lo_nong_san)
                                    }
                                  >
                                    Xóa
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =================================================
              TAB LỊCH HẸN KIỂM ĐỊNH (TỰ FIT KHUNG, KHÔNG TRÀN)
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
                    <tr>
                      <td className="col-code tracking-code">LH-2026-001</td>
                      <td className="nowrap-cell">
                        <span className="batch-code-badge">LA1-11111111</span>
                      </td>
                      <td className="agency-name">
                        Trung tâm Kiểm nghiệm Nông nghiệp Vùng 2
                      </td>
                      <td className="inspection-date">12/10/2026 (08:30)</td>
                      <td className="inspection-note">
                        Kiểm định dư lượng thuốc BVTV tại vườn
                      </td>
                      <td className="nowrap-cell">
                        <span className="status-pill success">
                          <CheckCircle2 size={14} />
                          Đã chấp nhận
                        </span>
                      </td>
                      <td className="col-actions">
                        <button type="button" className="btn-action-view">
                          <Eye size={14} />
                          Xem phiếu
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="col-code tracking-code">LH-2026-002</td>
                      <td className="nowrap-cell">
                        <span className="batch-code-badge">LA2-22091104</span>
                      </td>
                      <td className="agency-name">
                        Viện Tiêu chuẩn Chất lượng AgriCheck
                      </td>
                      <td className="inspection-date">16/10/2026 (14:00)</td>
                      <td className="inspection-note">
                        Lấy mẫu test độ ngọt và chuẩn VietGAP
                      </td>
                      <td className="nowrap-cell">
                        <span className="status-pill warning">
                          <Clock size={14} />
                          Chờ phê duyệt
                        </span>
                      </td>
                      <td className="col-actions">
                        <button type="button" className="btn-action-edit">
                          Sửa lịch
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="col-code tracking-code">LH-2026-003</td>
                      <td className="nowrap-cell">
                        <span className="batch-code-badge">LA1-09091801</span>
                      </td>
                      <td className="agency-name">
                        Chi cục Trồng trọt & BVTV Tỉnh
                      </td>
                      <td className="inspection-date">02/10/2026 (09:00)</td>
                      <td className="inspection-note">
                        Hồ sơ canh tác chưa cập nhật đủ nhật ký
                      </td>
                      <td className="nowrap-cell">
                        <span className="status-pill danger">Từ chối</span>
                      </td>
                      <td className="col-actions">
                        <button type="button" className="btn-action-retry">
                          Gửi lại đơn
                        </button>
                      </td>
                    </tr>
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
                    2<span className="metric-unit">CHUYẾN</span>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-title">Đã bàn giao thành công</div>
                  <div className="metric-number">12</div>
                </div>

                <div className="metric-card">
                  <div className="metric-title">Khối lượng đã xuất</div>
                  <div className="metric-number">
                    24.5<span className="metric-unit">TẤN</span>
                  </div>
                </div>

                <div className="actions-box">
                  <button
                    className="btn-primary-action"
                    onClick={() => {
                      setSelectedBatchCode("");
                      setShowShippingModal(true);
                    }}
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
                    {/* DÒNG 1 */}
                    <tr>
                      <td className="col-code tracking-code">VD-LOG-9901</td>
                      <td>
                        <span className="batch-code-badge">#SC-2026-002</span>
                      </td>
                      <td className="product-name">Cam Sành Đóng Thùng 10kg</td>
                      <td>
                        <div className="carrier-name">
                          Mekong Cold Logistics
                        </div>
                        <div className="carrier-sub">
                          Võ Minh Toàn (51D-891.22)
                        </div>
                      </td>
                      <td className="package-weight">800 kg</td>
                      <td className="export-time">04/10/2026 - 16:30</td>
                      <td>
                        <span className="status-pill info">
                          <Truck size={14} />
                          Đang vận chuyển
                        </span>
                      </td>
                      <td className="col-actions">
                        <button type="button" className="btn-action-detail">
                          <Eye size={14} />
                          Chi tiết
                        </button>
                      </td>
                    </tr>

                    {/* DÒNG 2 */}
                    <tr>
                      <td className="col-code tracking-code">VD-LOG-8812</td>
                      <td>
                        <span className="batch-code-badge">#SC-2026-000</span>
                      </td>
                      <td className="product-name">Xoài Cát Hòa Lộc Hộp Quà</td>
                      <td>
                        <div className="carrier-name">
                          Giao Hàng Nhanh AgriShip
                        </div>
                        <div className="carrier-sub">
                          Phạm Quốc Bảo (64A-012.89)
                        </div>
                      </td>
                      <td className="package-weight">1,200 kg</td>
                      <td className="export-time">02/10/2026 - 09:15</td>
                      <td>
                        <span className="status-pill success">
                          <CheckCircle2 size={14} />
                          Đã hoàn thành
                        </span>
                      </td>
                      <td className="col-actions">
                        <button type="button" className="btn-action-detail">
                          <Eye size={14} />
                          Chi tiết
                        </button>
                      </td>
                    </tr>

                    {/* DÒNG 3 */}
                    <tr>
                      <td className="col-code tracking-code">VD-LOG-7721</td>
                      <td>
                        <span className="batch-code-badge">#SC-2026-003</span>
                      </td>
                      <td className="product-name">Bưởi Năm Roi Xuất Khẩu</td>
                      <td>
                        <div className="carrier-name">
                          Vận Tải Lạnh Miền Tây
                        </div>
                        <div className="carrier-sub">
                          Lê Hoàng Phúc (65C-112.56)
                        </div>
                      </td>
                      <td className="package-weight">2,000 kg</td>
                      <td className="export-time">04/10/2026 - 17:00</td>
                      <td>
                        <span className="status-pill warning">
                          <Clock size={14} />
                          Chờ chấp nhận
                        </span>
                      </td>
                      <td className="col-actions">
                        <button type="button" className="btn-action-detail">
                          <Eye size={14} />
                          Chi tiết
                        </button>
                      </td>
                    </tr>

                    {/* DÒNG 4 */}
                    <tr>
                      <td className="col-code tracking-code">VD-LOG-6655</td>
                      <td>
                        <span className="batch-code-badge">#SC-2026-004</span>
                      </td>
                      <td className="product-name">
                        Chanh Không Hạt Đóng Thùng
                      </td>
                      <td>
                        <div className="carrier-name">Mekong Logistics</div>
                        <div className="carrier-sub">
                          Nguyễn Văn Hưng (66B-098.33)
                        </div>
                      </td>
                      <td className="package-weight">650 kg</td>
                      <td className="export-time">04/10/2026 - 17:30</td>
                      <td>
                        <span className="status-pill purple">
                          <Clock size={14} />
                          Chờ tiếp nhận
                        </span>
                      </td>
                      <td className="col-actions">
                        <button type="button" className="btn-action-detail">
                          <Eye size={14} />
                          Chi tiết
                        </button>
                      </td>
                    </tr>
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
                  <label>{seasonImage ? "Ảnh xem trước" : "Ảnh hiện tại"}</label>
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
                              <option key={item.ma_vat_tu} value={item.ma_vat_tu}>
                                {item.ten_vat_tu}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label>
                            Liều lượng{selected ? ` (${selected.don_vi_tinh})` : ""}
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
                // Thông tin mùa vụ đang chọn (hoặc mùa vụ của lô đang sửa)
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
                        <span>{info?.ma_nong_trai || "Chưa có dữ liệu"}</span>
                      </div>

                      <div className="readonly-item">
                        <label>Thửa đất</label>
                        <span>{info?.ten_thua_dat || "Chưa có dữ liệu"}</span>
                      </div>

                      <div className="readonly-item">
                        <label>Mùa vụ</label>
                        <span>{info?.loai_cay_trong || "Chưa có dữ liệu"}</span>
                      </div>

                      <div className="readonly-item">
                        <label>Giống cây</label>
                        <span>{info?.giong_cay || "Chưa có dữ liệu"}</span>
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
          POPUP TẠO LỆNH VẬN CHUYỂN & BÀN GIAO
      ====================================================== */}
      {showShippingModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Tạo Lệnh Vận Chuyển & Bàn Giao</h3>
            </div>

            <div className="modal-body">
              {/* CHỌN LÔ */}
              <div className="form-group">
                <label>Chọn lô nông sản</label>
                <select
                  value={selectedBatchCode}
                  onChange={(e) => setSelectedBatchCode(e.target.value)}
                >
                  <option value="">-- Chọn lô thu hoạch --</option>
                  {availableBatches.map((item) => (
                    <option key={item.ma_lo} value={item.ma_lo}>
                      {item.ma_lo} - {item.ten_lo}
                    </option>
                  ))}
                </select>
              </div>

              {/* TỰ ĐỘNG CẬP NHẬT THÔNG TIN HOẶC ĐỂ CHƯA CÓ THÔNG TIN */}
              <div className="form-grid-2 readonly-grid">
                <div className="readonly-item">
                  <label>Mã lô</label>
                  <span
                    style={{
                      color: selectedBatchInfo ? "#1f2937" : "#9ca3af",
                      fontWeight: selectedBatchInfo ? 600 : 400,
                    }}
                  >
                    {selectedBatchInfo?.ma_lo || "Chưa có thông tin"}
                  </span>
                </div>

                <div className="readonly-item">
                  <label>Nông trại</label>
                  <span
                    style={{
                      color: selectedBatchInfo ? "#1f2937" : "#9ca3af",
                      fontWeight: selectedBatchInfo ? 600 : 400,
                    }}
                  >
                    {selectedBatchInfo?.ma_nong_trai || "Chưa có thông tin"}
                  </span>
                </div>

                <div className="readonly-item">
                  <label>Tên nông sản</label>
                  <span
                    style={{
                      color: selectedBatchInfo ? "#1f2937" : "#9ca3af",
                      fontWeight: selectedBatchInfo ? 600 : 400,
                    }}
                  >
                    {selectedBatchInfo?.ten_nong_san || "Chưa có thông tin"}
                  </span>
                </div>

                <div className="readonly-item">
                  <label>Sản lượng</label>
                  <span
                    style={{
                      color: selectedBatchInfo ? "#1f2937" : "#9ca3af",
                      fontWeight: selectedBatchInfo ? 600 : 400,
                    }}
                  >
                    {selectedBatchInfo?.san_luong || "Chưa có thông tin"}
                  </span>
                </div>

                <div className="readonly-item">
                  <label>Ngày thu hoạch</label>
                  <span
                    style={{
                      color: selectedBatchInfo ? "#1f2937" : "#9ca3af",
                      fontWeight: selectedBatchInfo ? 600 : 400,
                    }}
                  >
                    {selectedBatchInfo?.ngay_thu_hoach || "Chưa có thông tin"}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowShippingModal(false)}
              >
                Hủy
              </button>

              <button
                type="button"
                className="btn-save"
                onClick={() => {
                  alert("Đã tạo lệnh vận chuyển & bàn giao thành công");
                  setShowShippingModal(false);
                }}
              >
                Tạo lệnh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
