const API_URL = "http://localhost:3000/api/don-vi-van-chuyen";

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

export const fetchMyTrips = async () => {
  const res = await fetch(`${API_URL}/cua-toi`, { headers: authHeaders() });
  return parseJson(res);
};

export const fetchTripById = async (maVanDon) => {
  const res = await fetch(`${API_URL}/${maVanDon}`, { headers: authHeaders() });
  return parseJson(res);
};

export const acceptTrip = async (maVanDon, tenTaiXe, bienSoXe) => {
  const res = await fetch(`${API_URL}/${maVanDon}/chap-nhan`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify({ ten_tai_xe: tenTaiXe, bien_so_xe: bienSoXe }),
  });
  return parseJson(res);
};

export const rejectTrip = async (maVanDon, lyDo) => {
  const res = await fetch(`${API_URL}/${maVanDon}/tu-choi`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify({ ly_do: lyDo }),
  });
  return parseJson(res);
};

export const confirmPickup = async (maVanDon, khoiLuongThucTe) => {
  const res = await fetch(`${API_URL}/${maVanDon}/lay-hang`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify({ khoi_luong_thuc_te: khoiLuongThucTe || null }),
  });
  return parseJson(res);
};

export const confirmArrival = async (maVanDon) => {
  const res = await fetch(`${API_URL}/${maVanDon}/den-noi`, {
    method: "PUT",
    headers: jsonHeaders(),
  });
  return parseJson(res);
};
