const API_URL = "http://localhost:3000/api/chi-tiet-kiem-dinh";

/**
 * Gọi API lấy thông tin chi tiết hồ sơ kiểm định theo mã
 * @param {string} maKiemDinh
 * @returns {Promise<any>}
 */
export const fetchChiTietKiemDinh = async (maKiemDinh) => {
  if (!maKiemDinh) {
    throw new Error("Mã kiểm định không được để trống");
  }

  const response = await fetch(`${API_URL}/${encodeURIComponent(maKiemDinh)}`);
  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Không thể tải dữ liệu chi tiết kiểm định");
  }

  return data;
};

export const fetchChiTietUser = fetchChiTietKiemDinh;
export default fetchChiTietKiemDinh;
