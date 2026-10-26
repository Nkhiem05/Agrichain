// Giao tiếp với backend của trang Chi tiết mùa vụ (chitietmuavu.jsx chỉ gọi các hàm ở đây).
// Mỗi hàm trả về { ok, data }: ok là response.ok, data là JSON backend trả về.
// Lỗi mạng hoặc phản hồi không phải JSON sẽ ném lỗi để giao diện bắt trong catch.

const API_URL = "http://localhost:3000";

const request = async (path, options) => {
  const response = await fetch(`${API_URL}${path}`, options);
  const data = await response.json();
  return { ok: response.ok, data };
};

// Chi tiết mùa vụ kèm danh sách lô thu hoạch và vật tư đã dùng
const fetchChiTietMuaVu = (maMuaVu) =>
  request(`/api/mua-vu/${encodeURIComponent(maMuaVu)}`);

// Cập nhật sản lượng và ngày thu hoạch của một lô
const capNhatLoThuHoach = (maLo, { soLuong, ngayThuHoach }) =>
  request(`/api/lo-thu-hoach/${encodeURIComponent(maLo)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      so_luong: Number(soLuong),
      ngay_thu_hoach: ngayThuHoach,
    }),
  });

export { fetchChiTietMuaVu, capNhatLoThuHoach };
