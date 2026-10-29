// Toàn bộ phần giao tiếp với backend của trang Nông dân (nongdan.jsx chỉ gọi các hàm ở đây).
// Mỗi hàm trả về { ok, data }: ok là response.ok, data là JSON backend trả về.
// Lỗi mạng hoặc phản hồi không phải JSON sẽ ném lỗi để giao diện bắt trong catch.

const API_URL = "http://localhost:3000";

// Header gửi kèm token đăng nhập (token được lưu ở trang đăng nhập)
const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const jsonAuthHeaders = () => ({
  "Content-Type": "application/json",
  ...authHeaders(),
});

// Đường dẫn file lưu trên server (ảnh nông trại, mùa vụ, đại diện) -> URL đầy đủ
const fileUrl = (path) => `${API_URL}${path}`;

const request = async (path, options) => {
  const response = await fetch(`${API_URL}${path}`, options);
  const data = await response.json();
  return { ok: response.ok, data };
};

/* =========================================================
   NÔNG TRẠI
========================================================= */

const dungFormNongTrai = (form, anhNongTrai) => {
  const formData = new FormData();
  formData.append("ma_nguoi_dung", form.ma_nguoi_dung);
  formData.append("ten_nong_trai", form.ten_nong_trai.trim());
  formData.append("dia_diem_nong_trai", form.dia_diem_nong_trai.trim());
  formData.append("dien_tich_nong_trai", form.dien_tich_nong_trai);

  if (anhNongTrai) {
    formData.append("anh_nong_trai", anhNongTrai);
  }
  return formData;
};

const fetchNongTrai = (maNguoiDung) =>
  request(`/api/farmer/farms/user/${maNguoiDung}`);

const themNongTrai = (form, anhNongTrai) =>
  request("/api/farmer/farms", {
    method: "POST",
    body: dungFormNongTrai(form, anhNongTrai),
  });

const capNhatNongTrai = (maNongTrai, form, anhNongTrai) =>
  request(`/api/farmer/farms/${maNongTrai}`, {
    method: "PUT",
    body: dungFormNongTrai(form, anhNongTrai),
  });

const xoaNongTrai = (maNongTrai) =>
  request(`/api/farmer/farms/${maNongTrai}`, { method: "DELETE" });

/* =========================================================
   MÙA VỤ
========================================================= */

// Danh sách mùa vụ + thống kê (maNongTrai rỗng = tất cả nông trại). Trả về [danhSach, thongKe]
const fetchMuaVuVaThongKe = (maNguoiDung, maNongTrai) => {
  const query = maNongTrai
    ? `?ma_nong_trai=${encodeURIComponent(maNongTrai)}`
    : "";

  return Promise.all([
    request(`/api/mua-vu/user/${maNguoiDung}${query}`),
    request(`/api/mua-vu/thong-ke/user/${maNguoiDung}${query}`),
  ]);
};

const fetchDanhMucVatTu = () => request("/api/mua-vu/vat-tu");

const fetchThuaDat = (maNongTrai) =>
  request(`/api/farmer/plots/farm/${maNongTrai}`);

const fetchChiTietMuaVu = (maMuaVu) => request(`/api/mua-vu/${maMuaVu}`);

// maMuaVuDangSua rỗng = thêm mới (POST), có giá trị = cập nhật (PUT)
const luuMuaVu = (maMuaVuDangSua, { maNongTrai, form, vatTu, anhMuaVu }) => {
  const formData = new FormData();
  formData.append("ma_nong_trai", maNongTrai);
  formData.append("ma_thua_dat", form.ma_thua_dat);
  formData.append("loai_cay_trong", form.loai_cay_trong.trim());
  formData.append("giong_cay", form.giong_cay.trim());
  formData.append("ngay_gieo_trong", form.ngay_gieo_trong);
  formData.append("ngay_thu_hoach_du_kien", form.ngay_thu_hoach_du_kien);
  formData.append(
    "vat_tu",
    JSON.stringify(
      vatTu.map((row) => ({
        ma_vat_tu: row.ma_vat_tu,
        lieu_luong: Number(row.lieu_luong),
        ngay_su_dung: row.ngay_su_dung,
      })),
    ),
  );

  if (anhMuaVu) {
    formData.append("anh_mua_vu", anhMuaVu);
  }

  return request(
    maMuaVuDangSua ? `/api/mua-vu/${maMuaVuDangSua}` : "/api/mua-vu",
    {
      method: maMuaVuDangSua ? "PUT" : "POST",
      body: formData,
    },
  );
};

const xoaMuaVu = (maMuaVu) =>
  request(`/api/mua-vu/${maMuaVu}`, { method: "DELETE" });

const danhDauMuaVuSanSang = (maMuaVu) =>
  request(`/api/mua-vu/${maMuaVu}/danh-dau-san-sang`, { method: "PATCH" });

/* =========================================================
   LÔ THU HOẠCH
========================================================= */

// Danh sách lô + thống kê. Trả về [danhSach, thongKe]
const fetchLoThuHoachVaThongKe = (maNguoiDung) =>
  Promise.all([
    request(`/api/lo-thu-hoach/user/${maNguoiDung}`),
    request(`/api/lo-thu-hoach/thong-ke/user/${maNguoiDung}`),
  ]);

// Mùa vụ đã đánh dấu "sẵn sàng thu hoạch" để chọn khi tạo lô
const fetchMuaVuSanSang = (maNguoiDung) =>
  request(`/api/mua-vu/user/${maNguoiDung}?san_sang=1`);

// maLoDangSua rỗng = tạo lô mới (POST), có giá trị = cập nhật (PUT)
const luuLoThuHoach = (maLoDangSua, { maMuaVu, soLuong, ngayThuHoach }) =>
  request(
    maLoDangSua ? `/api/lo-thu-hoach/${maLoDangSua}` : "/api/lo-thu-hoach",
    {
      method: maLoDangSua ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ma_mua_vu: maMuaVu,
        so_luong: Number(soLuong),
        ngay_thu_hoach: ngayThuHoach,
      }),
    },
  );

const xoaLoThuHoach = (maLo) =>
  request(`/api/lo-thu-hoach/${maLo}`, { method: "DELETE" });

/* =========================================================
   KIỂM ĐỊNH
========================================================= */

const fetchYeuCauKiemDinh = () =>
  request("/api/kiem-dinh/yeu-cau/cua-toi", { headers: authHeaders() });

const fetchCoQuanKiemDinh = () =>
  request("/api/kiem-dinh/co-quan", { headers: authHeaders() });

const guiYeuCauKiemDinh = (maLo, form) =>
  request("/api/kiem-dinh/yeu-cau", {
    method: "POST",
    headers: jsonAuthHeaders(),
    body: JSON.stringify({
      ma_lo_nong_san: maLo,
      ...form,
    }),
  });

/* =========================================================
   BLOCKCHAIN
========================================================= */

// Các sự kiện của người dùng đang chờ ký lên blockchain (kể cả sự kiện chưa sẵn sàng để ký)
const fetchSuKienChoKy = () =>
  request("/api/blockchain/cho-ky", { headers: authHeaders() });

/* =========================================================
   VẬN CHUYỂN & BÀN GIAO
========================================================= */

const fetchLenhVanChuyen = () =>
  request("/api/van-chuyen/cua-toi", { headers: authHeaders() });

// Lô sẵn sàng + đơn vị vận chuyển và cơ sở nhận hàng. Trả về [loSanSang, doiTac]
const fetchTuyChonVanChuyen = () =>
  Promise.all([
    request("/api/van-chuyen/lo-san-sang", { headers: authHeaders() }),
    request("/api/van-chuyen/doi-tac", { headers: authHeaders() }),
  ]);

const taoLenhVanChuyen = (form) =>
  request("/api/van-chuyen", {
    method: "POST",
    headers: jsonAuthHeaders(),
    body: JSON.stringify(form),
  });

const fetchChiTietVanChuyen = (maVanDon) =>
  request(`/api/van-chuyen/${maVanDon}`, { headers: authHeaders() });

const huyLenhVanChuyen = (maVanDon) =>
  request(`/api/van-chuyen/${maVanDon}/huy`, {
    method: "PUT",
    headers: authHeaders(),
  });

export {
  fileUrl,
  fetchNongTrai,
  themNongTrai,
  capNhatNongTrai,
  xoaNongTrai,
  fetchMuaVuVaThongKe,
  fetchDanhMucVatTu,
  fetchThuaDat,
  fetchChiTietMuaVu,
  luuMuaVu,
  xoaMuaVu,
  danhDauMuaVuSanSang,
  fetchLoThuHoachVaThongKe,
  fetchMuaVuSanSang,
  luuLoThuHoach,
  xoaLoThuHoach,
  fetchYeuCauKiemDinh,
  fetchCoQuanKiemDinh,
  guiYeuCauKiemDinh,
  fetchSuKienChoKy,
  fetchLenhVanChuyen,
  fetchTuyChonVanChuyen,
  taoLenhVanChuyen,
  fetchChiTietVanChuyen,
  huyLenhVanChuyen,
};
