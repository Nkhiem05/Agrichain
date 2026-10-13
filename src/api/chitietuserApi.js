const API_URL = "http://localhost:3000/api/chi-tiet-user";

export const fetchChiTietUser = async (params = {}) => {
  const queryParams = new URLSearchParams();

  if (typeof params === "string") {
    // Nếu truyền chuỗi trực tiếp, thử gán malohang
    queryParams.append("malohang", params);
  } else if (params && typeof params === "object") {
    if (params.malohang) queryParams.append("malohang", params.malohang);
    if (params.makiemdinh) queryParams.append("makiemdinh", params.makiemdinh);
    if (params.code && !params.malohang && !params.makiemdinh) {
      queryParams.append("malohang", params.code);
    }
  }

  const cleanUrl = API_URL.replace(/\/+$/, "");
  const fullUrl = `${cleanUrl}?${queryParams.toString()}`;

  const response = await fetch(fullUrl);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    throw new Error(
      data.message || `Lỗi tải dữ liệu (Mã lỗi: ${response.status})`,
    );
  }

  return data;
};

export const fetchChiTietKiemDinh = fetchChiTietUser;
