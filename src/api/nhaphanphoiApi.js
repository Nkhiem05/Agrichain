const API_URL = "http://localhost:3000/api/nha-phan-phoi";

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

// 1. Tiếp nhận hàng từ cơ sở sơ chế
export const fetchIncomingShipments = async () => {
  const res = await fetch(`${API_URL}/tiep-nhan`, { headers: authHeaders() });
  return parseJson(res);
};

export const confirmReceiveShipment = async (maVanDon, payload) => {
  const res = await fetch(`${API_URL}/tiep-nhan/${maVanDon}/xac-nhan`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
};

export const rejectReceiveShipment = async (maVanDon, lyDo) => {
  const res = await fetch(`${API_URL}/tiep-nhan/${maVanDon}/tu-choi`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify({ ly_do: lyDo }),
  });
  return parseJson(res);
};

// 2. Kho hàng
export const fetchInventory = async () => {
  const res = await fetch(`${API_URL}/kho-hang`, { headers: authHeaders() });
  return parseJson(res);
};

// 3. Phân phối cho đại lý
export const fetchDispatchOrders = async () => {
  const res = await fetch(`${API_URL}/xuat-kho`, { headers: authHeaders() });
  return parseJson(res);
};

export const fetchDispatchDetail = async (maPhieu) => {
  const res = await fetch(`${API_URL}/xuat-kho/${maPhieu}`, {
    headers: authHeaders(),
  });
  return parseJson(res);
};

export const createDispatch = async (payload) => {
  const res = await fetch(`${API_URL}/xuat-kho`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
};

export const markDispatchShipped = async (maPhieu) => {
  const res = await fetch(`${API_URL}/xuat-kho/${maPhieu}/xuat-kho`, {
    method: "PUT",
    headers: authHeaders(),
  });
  return parseJson(res);
};

export const markDispatchDelivered = async (maPhieu) => {
  const res = await fetch(`${API_URL}/xuat-kho/${maPhieu}/da-giao`, {
    method: "PUT",
    headers: authHeaders(),
  });
  return parseJson(res);
};

// 4. Đại lý
export const fetchDealers = async () => {
  const res = await fetch(`${API_URL}/dai-ly`, { headers: authHeaders() });
  return parseJson(res);
};

export const createDealer = async (payload) => {
  const res = await fetch(`${API_URL}/dai-ly`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
};

export const updateDealer = async (maDaiLy, payload) => {
  const res = await fetch(`${API_URL}/dai-ly/${maDaiLy}`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
};

export const toggleDealerStatus = async (maDaiLy) => {
  const res = await fetch(`${API_URL}/dai-ly/${maDaiLy}/trang-thai`, {
    method: "PUT",
    headers: authHeaders(),
  });
  return parseJson(res);
};

export const fetchDealerHistory = async (maDaiLy) => {
  const res = await fetch(`${API_URL}/dai-ly/${maDaiLy}/lich-su`, {
    headers: authHeaders(),
  });
  return parseJson(res);
};

// 5. Danh sách chọn khi gắn đại lý (ký blockchain)
export const fetchDealerAccounts = async () => {
  const res = await fetch(`${API_URL}/tai-khoan-dai-ly`, {
    headers: authHeaders(),
  });
  return parseJson(res);
};

// 6. Quản lý kho: tạo / sửa / xóa kho, nhập kho chỉ chọn trong danh sách này
export const fetchWarehouses = async () => {
  const res = await fetch(`${API_URL}/kho`, { headers: authHeaders() });
  return parseJson(res);
};

export const createWarehouse = async (payload) => {
  const res = await fetch(`${API_URL}/kho`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
};

export const updateWarehouse = async (maKho, payload) => {
  const res = await fetch(`${API_URL}/kho/${encodeURIComponent(maKho)}`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
};

export const deleteWarehouse = async (maKho) => {
  const res = await fetch(`${API_URL}/kho/${encodeURIComponent(maKho)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return parseJson(res);
};
