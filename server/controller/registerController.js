const db = require("../config/db");

const register = async (req, res) => {
  try {
    const { role, dulieu } = req.body;

    console.log("Dữ liệu nhận từ Client:");
    console.log("- Role:", role);
    console.log("- dulieu:", dulieu);

    // 1. Kiểm tra tồn tại dữ liệu
    if (!role || !dulieu) {
      return res.status(400).json({
        ok: false,
        message: "Thiếu dữ liệu gửi lên",
      });
    }

    const { fullName, phone, email, facilityName, address } = dulieu;

    // 2. Validate các trường bắt buộc
    if (!fullName || !phone || !email || !facilityName || !address) {
      return res.status(400).json({
        ok: false,
        message: "Vui lòng điền đầy đủ tất cả các trường thông tin",
      });
    }

    // 3. Khớp role từ React ('FARMER') sang ENUM database ('FARMER_COOP')
    let vaiTro = role;
    if (role === "FARMER") {
      vaiTro = "FARMER_COOP";
    }

    const validRoles = ["FARMER_COOP", "TRANSPORTER", "DISTRIBUTOR"];
    if (!validRoles.includes(vaiTro)) {
      return res.status(400).json({
        ok: false,
        message: "Vai trò không hợp lệ",
      });
    }

    // 4. Ghi vào database (cột thong_tin_bo_sung là NOT NULL nên gán chuỗi rỗng '')
    const query = `
      INSERT INTO yeu_cau_cap_tai_khoan (
        vai_tro_yeu_cau,
        ho_ten,
        so_dien_thoai,
        email,
        ten_co_so,
        dia_chi,
        thong_tin_bo_sung,
        trang_thai_duyet
      ) VALUES (?, ?, ?, ?, ?, ?, '', 'PENDING')
    `;

    const values = [
      vaiTro,
      fullName.trim(),
      phone.trim(),
      email.trim(),
      facilityName.trim(),
      address.trim(),
    ];

    const [result] = await db.execute(query, values);

    // 5. Trả về đúng format để res.ok phía client nhận diện
    return res.status(200).json({
      ok: true,
      message: "Gửi yêu cầu cấp tài khoản thành công",
      maYeuCau: result.insertId,
    });
  } catch (error) {
    console.error("Lỗi khi lưu yêu cầu đăng ký:", error);
    return res.status(500).json({
      ok: false,
      message: "Lỗi máy chủ nội bộ",
    });
  }
};

module.exports = {
  register,
};
