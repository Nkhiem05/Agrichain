const API_URL = "http://localhost:3000/api/dai-ly";

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const jsonHeaders = () => ({
  "Content-Type": "application/json",
  ...authHeaders(),
});

const parseJson = async (response) => {
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    throw new Error(data?.message || "Có lỗi xảy ra, vui lòng thử lại");
  }
  return data;
};

// 1. Hàng đang tới cửa hàng
export const fetchHangDangToi = async () => {
  const res = await fetch(`${API_URL}/nhan-hang`, { headers: authHeaders() });
  return parseJson(res);
};

export const xacNhanNhanHang = async (maVanDon, khoiLuong) => {
  const res = await fetch(`${API_URL}/nhan-hang/${maVanDon}/xac-nhan`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify({ khoi_luong_thuc_te: khoiLuong }),
  });
  return parseJson(res);
};

export const tuChoiNhanHang = async (maVanDon, lyDo) => {
  const res = await fetch(`${API_URL}/nhan-hang/${maVanDon}/tu-choi`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify({ ly_do: lyDo }),
  });
  return parseJson(res);
};

// 2. Hàng trong cửa hàng
export const fetchKhoDaiLy = async () => {
  const res = await fetch(`${API_URL}/kho`, { headers: authHeaders() });
  return parseJson(res);
};

export const xacNhanBanHet = async (maLo, ghiChu) => {
  const res = await fetch(`${API_URL}/kho/${maLo}/hoan-tat`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify({ ghi_chu: ghiChu }),
  });
  return parseJson(res);
};
