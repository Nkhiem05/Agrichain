const db = require("../config/db");
const { generateUniqueCode } = require("../utils/generateCode");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\-\s().]{8,20}$/;

// Chuẩn hóa + kiểm tra dữ liệu nhập; trả về { error } hoặc { value }
const validateInput = (body) => {
  const hoTen = String(body.ho_ten || "").trim();
  const chucVu = String(body.chuc_vu || "").trim();
  const soDienThoai = String(body.so_dien_thoai || "").trim();
  const email = String(body.email || "").trim();

  if (!hoTen) return { error: "Vui lòng nhập họ tên kiểm định viên" };
  if (hoTen.length > 150) return { error: "Họ tên không được quá 150 ký tự" };
  if (chucVu.length > 150) return { error: "Chức vụ không được quá 150 ký tự" };
  if (soDienThoai && !PHONE_REGEX.test(soDienThoai)) {
    return { error: "Số điện thoại không hợp lệ" };
  }
  if (email && (email.length > 150 || !EMAIL_REGEX.test(email))) {
    return { error: "Email không hợp lệ" };
  }

  return {
    value: {
      ho_ten: hoTen,
      chuc_vu: chucVu || null,
      so_dien_thoai: soDienThoai || null,
      email: email || null,
    },
  };
};

// Danh sách kiểm định viên của cơ quan đang đăng nhập, kèm số hồ sơ đang phụ trách / tổng số hồ sơ đã nhận
const getInspectors = async (req, res) => {
  try {
    const maCoQuan = req.user.ma_nguoi_dung;
    const [rows] = await db.query(
      `SELECT
         v.ma_kiem_dinh_vien, v.ho_ten, v.chuc_vu, v.so_dien_thoai, v.email, v.trang_thai,
         COALESCE(SUM(kd.trang_thai_ho_so IN ('DA_HEN_LICH','CHO_LAY_MAU','DA_LAY_MAU')), 0) AS dang_phu_trach,
         COUNT(kd.ma_kiem_dinh) AS tong_ho_so
       FROM kiem_dinh_vien v
       LEFT JOIN kiem_dinh_lo_hang kd ON kd.ma_kiem_dinh_vien = v.ma_kiem_dinh_vien
       WHERE v.ma_co_quan = ?
       GROUP BY v.ma_kiem_dinh_vien
       ORDER BY v.trang_thai DESC, v.ho_ten ASC`,
      [maCoQuan],
    );

    return res.status(200).json({
      ok: true,
      data: rows.map((r) => ({
        ...r,
        trang_thai: Number(r.trang_thai),
        dang_phu_trach: Number(r.dang_phu_trach),
        tong_ho_so: Number(r.tong_ho_so),
      })),
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách kiểm định viên:", error);
    return res.status(500).json({ ok: false, message: "Lỗi máy chủ nội bộ" });
  }
};

const createInspector = async (req, res) => {
  try {
    const maCoQuan = req.user.ma_nguoi_dung;
    const { error, value } = validateInput(req.body);
    if (error) return res.status(400).json({ ok: false, message: error });

    const [dup] = await db.query(
      "SELECT 1 FROM kiem_dinh_vien WHERE ma_co_quan = ? AND ho_ten = ? LIMIT 1",
      [maCoQuan, value.ho_ten],
    );
    if (dup.length > 0) {
      return res
        .status(409)
        .json({ ok: false, message: "Kiểm định viên này đã có trong danh sách" });
    }

    const ma = await generateUniqueCode(
      db,
      "kiem_dinh_vien",
      "ma_kiem_dinh_vien",
      "KDV",
      3,
    );
    await db.query(
      `INSERT INTO kiem_dinh_vien (ma_kiem_dinh_vien, ma_co_quan, ho_ten, chuc_vu, so_dien_thoai, email)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ma, maCoQuan, value.ho_ten, value.chuc_vu, value.so_dien_thoai, value.email],
    );

    return res
      .status(201)
      .json({ ok: true, message: "Đã thêm kiểm định viên", ma_kiem_dinh_vien: ma });
  } catch (error) {
    console.error("Lỗi khi thêm kiểm định viên:", error);
    return res.status(500).json({ ok: false, message: "Lỗi máy chủ nội bộ" });
  }
};

const updateInspector = async (req, res) => {
  try {
    const maCoQuan = req.user.ma_nguoi_dung;
    const { id } = req.params;
    const { error, value } = validateInput(req.body);
    if (error) return res.status(400).json({ ok: false, message: error });

    const [cur] = await db.query(
      "SELECT ma_kiem_dinh_vien FROM kiem_dinh_vien WHERE ma_kiem_dinh_vien = ? AND ma_co_quan = ?",
      [id, maCoQuan],
    );
    if (cur.length === 0) {
      return res
        .status(404)
        .json({ ok: false, message: "Không tìm thấy kiểm định viên" });
    }

    const [dup] = await db.query(
      "SELECT 1 FROM kiem_dinh_vien WHERE ma_co_quan = ? AND ho_ten = ? AND ma_kiem_dinh_vien <> ? LIMIT 1",
      [maCoQuan, value.ho_ten, id],
    );
    if (dup.length > 0) {
      return res
        .status(409)
        .json({ ok: false, message: "Đã có kiểm định viên khác trùng họ tên" });
    }

    await db.query(
      `UPDATE kiem_dinh_vien SET ho_ten = ?, chuc_vu = ?, so_dien_thoai = ?, email = ?
       WHERE ma_kiem_dinh_vien = ? AND ma_co_quan = ?`,
      [value.ho_ten, value.chuc_vu, value.so_dien_thoai, value.email, id, maCoQuan],
    );

    return res.status(200).json({ ok: true, message: "Đã cập nhật kiểm định viên" });
  } catch (error) {
    console.error("Lỗi khi cập nhật kiểm định viên:", error);
    return res.status(500).json({ ok: false, message: "Lỗi máy chủ nội bộ" });
  }
};

// Bật / tắt hoạt động (không xóa để giữ lịch sử phân công)
const setInspectorStatus = async (req, res) => {
  try {
    const maCoQuan = req.user.ma_nguoi_dung;
    const { id } = req.params;
    const active = req.body.trang_thai ? 1 : 0;

    const [result] = await db.query(
      "UPDATE kiem_dinh_vien SET trang_thai = ? WHERE ma_kiem_dinh_vien = ? AND ma_co_quan = ?",
      [active, id, maCoQuan],
    );
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ ok: false, message: "Không tìm thấy kiểm định viên" });
    }

    return res.status(200).json({
      ok: true,
      message: active ? "Đã kích hoạt kiểm định viên" : "Đã tạm ngưng kiểm định viên",
    });
  } catch (error) {
    console.error("Lỗi khi đổi trạng thái kiểm định viên:", error);
    return res.status(500).json({ ok: false, message: "Lỗi máy chủ nội bộ" });
  }
};

module.exports = {
  getInspectors,
  createInspector,
  updateInspector,
  setInspectorStatus,
};
