const API_URL = "http://localhost:3000/api/blockchain";

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

// Công khai
export const fetchCauHinh = async () => {
  const res = await fetch(`${API_URL}/cau-hinh`);
  return (await parseJson(res)).data;
};

export const fetchXacThuc = async (maLo) => {
  const res = await fetch(`${API_URL}/xac-thuc/${encodeURIComponent(maLo)}`);
  return (await parseJson(res)).data;
};

// Ví của người dùng đang đăng nhập
export const fetchViCuaToi = async () => {
  const res = await fetch(`${API_URL}/vi`, { headers: authHeaders() });
  return (await parseJson(res)).data;
};

export const taoNonceLienKet = async () => {
  const res = await fetch(`${API_URL}/vi/nonce`, {
    method: "POST",
    headers: jsonHeaders(),
  });
  return (await parseJson(res)).data;
};

export const lienKetVi = async (address, signature) => {
  const res = await fetch(`${API_URL}/vi/lien-ket`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ address, signature }),
  });
  return parseJson(res);
};

// Sự kiện chờ ký
export const fetchChoKy = async () => {
  const res = await fetch(`${API_URL}/cho-ky`, { headers: authHeaders() });
  return (await parseJson(res)).data;
};

export const xacNhanSuKien = async (maLichSu, txHash) => {
  const res = await fetch(
    `${API_URL}/su-kien/${encodeURIComponent(maLichSu)}/xac-nhan`,
    {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ txHash }),
    },
  );
  return parseJson(res);
};

// Quản trị viên duyệt ví
export const fetchViChoDuyet = async () => {
  const res = await fetch(`${API_URL}/admin/vi-cho-duyet`, {
    headers: authHeaders(),
  });
  return (await parseJson(res)).data;
};

export const duyetVi = async (diaChi, txHash) => {
  const res = await fetch(`${API_URL}/admin/vi/${diaChi}/duyet`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ txHash }),
  });
  return parseJson(res);
};

export const tuChoiVi = async (diaChi) => {
  const res = await fetch(`${API_URL}/admin/vi/${diaChi}/tu-choi`, {
    method: "POST",
    headers: jsonHeaders(),
  });
  return parseJson(res);
};
