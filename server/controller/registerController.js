// server/controller/authController.js

const register = async (req, res) => {
  try {
    const { role, dulieu } = req.body;

    // In log kiểm tra dữ liệu gửi lên từ frontend
    console.log("Đã nhận request login:");
    console.log("- Role:", role);
    console.log("- Dulieu:", dulieu);

    // Trả về { ok: true } đúng với logic kiểm tra của frontend (res.ok)
    return res.status(200).json({
      ok: true,
      message: "Thành công",
      data: { role },
    });
  } catch (error) {
    console.error("Lỗi login:", error);
    return res.status(500).json({
      ok: false,
      message: "Lỗi server nội bộ",
    });
  }
};

module.exports = {
  register,
};
