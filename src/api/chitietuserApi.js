const API_BASE_URL = "http://localhost:3000/api/chi-tiet-user";

const fetchChiTietUser = async (batchCode) => {
  if (!batchCode) {
    throw new Error("Mã lô hàng không hợp lệ.");
  }

  const cleanCode = encodeURIComponent(batchCode.replace(/^#/, "").trim());
  const response = await fetch(`${API_BASE_URL}/${cleanCode}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Không thể tải dữ liệu truy xuất.");
  }

  const result = await response.json();
  return result.data;
};

export { fetchChiTietUser, fetchChiTietUser as getTraceDetailApi };