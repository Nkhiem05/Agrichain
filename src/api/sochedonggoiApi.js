const API_URL = "http://localhost:3000/api/so-che";

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

// 1. Tiếp nhận lô nông sản
export const fetchIncomingShipments = async () => {
  const res = await fetch(`${API_URL}/tiep-nhan`, { headers: authHeaders() });
  return parseJson(res);
};

export const confirmReceiveShipment = async (maVanDon, khoiLuongThucTe) => {
  const res = await fetch(`${API_URL}/tiep-nhan/${maVanDon}/xac-nhan`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify({ khoi_luong_thuc_te: khoiLuongThucTe }),
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

// 2. Sơ chế & đóng gói
export const fetchAvailableRawLots = async () => {
  const res = await fetch(`${API_URL}/lo-kha-dung`, { headers: authHeaders() });
  return parseJson(res);
};

export const fetchProcessingBatches = async () => {
  const res = await fetch(`${API_URL}/so-che`, { headers: authHeaders() });
  return parseJson(res);
};

export const createProcessingBatch = async (payload) => {
  const res = await fetch(`${API_URL}/so-che`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
};

export const updateProcessingStage = async (maSoChe, giaiDoan) => {
  const res = await fetch(`${API_URL}/so-che/${maSoChe}/giai-doan`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify({ giai_doan: giaiDoan }),
  });
  return parseJson(res);
};

export const deleteProcessingBatch = async (maSoChe) => {
  const res = await fetch(`${API_URL}/so-che/${maSoChe}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return parseJson(res);
};

export const fetchProcessingBatchDetail = async (maSoChe) => {
  const res = await fetch(`${API_URL}/so-che/${maSoChe}/chi-tiet`, {
    headers: authHeaders(),
  });
  return parseJson(res);
};

// 3. Tách / gộp lô
export const fetchSplitMergeLots = async () => {
  const res = await fetch(`${API_URL}/tach-gop/lo-kha-dung`, {
    headers: authHeaders(),
  });
  return parseJson(res);
};

export const fetchSplitMergeLog = async () => {
  const res = await fetch(`${API_URL}/tach-gop`, { headers: authHeaders() });
  return parseJson(res);
};

export const splitBatch = async (maLoGoc, children) => {
  const res = await fetch(`${API_URL}/tach-gop/tach`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ ma_lo_goc: maLoGoc, children }),
  });
  return parseJson(res);
};

export const mergeBatch = async (maLoNguonList, tieuDe) => {
  const res = await fetch(`${API_URL}/tach-gop/gop`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ ma_lo_nguon_list: maLoNguonList, tieu_de: tieuDe }),
  });
  return parseJson(res);
};

// 4. Bàn giao vận chuyển
export const fetchReadyToShip = async () => {
  const res = await fetch(`${API_URL}/san-sang-ban-giao`, {
    headers: authHeaders(),
  });
  return parseJson(res);
};

export const fetchTransporters = async () => {
  const res = await fetch(`${API_URL}/don-vi-van-chuyen`, {
    headers: authHeaders(),
  });
  return parseJson(res);
};

export const fetchShipments = async () => {
  const res = await fetch(`${API_URL}/ban-giao`, { headers: authHeaders() });
  return parseJson(res);
};

export const fetchShipmentById = async (maVanDon) => {
  const res = await fetch(`${API_URL}/ban-giao/${maVanDon}`, {
    headers: authHeaders(),
  });
  return parseJson(res);
};

export const createShipment = async (payload) => {
  const res = await fetch(`${API_URL}/ban-giao`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
};
