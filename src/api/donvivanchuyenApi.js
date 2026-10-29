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

const fetchMyTrips = async () => {
  const res = await fetch(`${API_URL}/cua-toi`, { headers: authHeaders() });
  return parseJson(res);
};

const fetchTripById = async (maVanDon) => {
  const res = await fetch(`${API_URL}/${maVanDon}`, { headers: authHeaders() });
  return parseJson(res);
};

// Chọn tài xế + phương tiện từ danh sách của đơn vị (không nhập tay)
const acceptTrip = async (maVanDon, maTaiXe, maPhuongTien) => {
  const res = await fetch(`${API_URL}/${maVanDon}/chap-nhan`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify({ ma_tai_xe: maTaiXe, ma_phuong_tien: maPhuongTien }),
  });
  return parseJson(res);
};

const rejectTrip = async (maVanDon, lyDo) => {
  const res = await fetch(`${API_URL}/${maVanDon}/tu-choi`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify({ ly_do: lyDo }),
  });
  return parseJson(res);
};

const confirmPickup = async (maVanDon, khoiLuongThucTe) => {
  const res = await fetch(`${API_URL}/${maVanDon}/lay-hang`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify({ khoi_luong_thuc_te: khoiLuongThucTe || null }),
  });
  return parseJson(res);
};

const confirmArrival = async (maVanDon) => {
  const res = await fetch(`${API_URL}/${maVanDon}/den-noi`, {
    method: "PUT",
    headers: jsonHeaders(),
  });
  return parseJson(res);
};

// Quản lý tài xế
const fetchDrivers = async () => {
  const res = await fetch(`${API_URL}/tai-xe`, { headers: authHeaders() });
  return parseJson(res);
};

const createDriver = async (payload) => {
  const res = await fetch(`${API_URL}/tai-xe`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
};

const updateDriver = async (maTaiXe, payload) => {
  const res = await fetch(`${API_URL}/tai-xe/${encodeURIComponent(maTaiXe)}`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
};

const deleteDriver = async (maTaiXe) => {
  const res = await fetch(`${API_URL}/tai-xe/${encodeURIComponent(maTaiXe)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return parseJson(res);
};

// Quản lý phương tiện
const fetchVehicles = async () => {
  const res = await fetch(`${API_URL}/phuong-tien`, { headers: authHeaders() });
  return parseJson(res);
};

const createVehicle = async (payload) => {
  const res = await fetch(`${API_URL}/phuong-tien`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
};

const updateVehicle = async (maPhuongTien, payload) => {
  const res = await fetch(
    `${API_URL}/phuong-tien/${encodeURIComponent(maPhuongTien)}`,
    {
      method: "PUT",
      headers: jsonHeaders(),
      body: JSON.stringify(payload),
    },
  );
  return parseJson(res);
};

const deleteVehicle = async (maPhuongTien) => {
  const res = await fetch(
    `${API_URL}/phuong-tien/${encodeURIComponent(maPhuongTien)}`,
    {
      method: "DELETE",
      headers: authHeaders(),
    },
  );
  return parseJson(res);
};

export {
  fetchMyTrips,
  fetchTripById,
  acceptTrip,
  rejectTrip,
  confirmPickup,
  confirmArrival,
  fetchDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
  fetchVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
};
