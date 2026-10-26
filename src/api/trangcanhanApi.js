const API_URL = "http://localhost:3000";

const LOI_KET_NOI = "Không thể kết nối tới backend";

// Header gửi kèm token đăng nhập (token được lưu ở trang đăng nhập)
const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Đường dẫn ảnh đại diện lưu trong DB -> URL đầy đủ của backend
export const avatarUrl = (path) => (path ? `${API_URL}${path}` : null);

// Gọi API trang cá nhân. Trả về data khi thành công, ném Error(message) khi thất bại
// (message lấy từ backend, hoặc LOI_KET_NOI khi không gọi được server).
const request = async (options, loiMacDinh) => {
  let data;
  try {
    const res = await fetch(`${API_URL}/api/trang-ca-nhan`, {
      ...options,
      headers: authHeaders(),
    });
    data = await res.json();
  } catch {
    throw new Error(LOI_KET_NOI);
  }

  if (!data.success) {
    throw new Error(data.message || loiMacDinh);
  }
  return data.data;
};

// Lấy hồ sơ cá nhân của người đang đăng nhập
export const fetchHoSo = () => request({}, "Không thể lấy hồ sơ cá nhân");

// Lưu hồ sơ (kèm ảnh đại diện mới nếu có) rồi đồng bộ tên/ảnh vào localStorage
// để header các trang khác cập nhật theo mà không cần đăng nhập lại.
export const capNhatHoSo = async (form, avatarFile) => {
  const formData = new FormData();
  formData.append("ho_ten", form.ho_ten.trim());
  formData.append("so_dien_thoai", form.so_dien_thoai.trim());
  formData.append("email", form.email.trim());
  formData.append("dia_chi", form.dia_chi.trim());
  if (avatarFile) formData.append("anh_dai_dien", avatarFile);

  const data = await request(
    { method: "PUT", body: formData },
    "Không thể lưu hồ sơ",
  );

  if (data) {
    try {
      const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...savedUser, ...data }));
    } catch {
      // Bỏ qua nếu dữ liệu user cũ bị lỗi định dạng
    }
  }
  return data;
};
