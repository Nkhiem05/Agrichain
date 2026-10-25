const db = require("../config/db");
const { ghiSuKienVanDon } = require("../services/blockchain/hook");

/*
==================================================
ĐƠN VỊ VẬN CHUYỂN (vai trò TRANSPORTER)
Thao tác trên các lệnh vận chuyển (lenh_van_chuyen) mà nông dân hoặc cơ sở
sơ chế đã chỉ định cho đơn vị này (ma_don_vi_van_chuyen).
Luồng trạng thái do đơn vị vận chuyển điều khiển:
  CHO_CHAP_NHAN -> (chấp nhận) -> CHO_LAY_HANG
  CHO_LAY_HANG  -> (xác nhận lấy hàng) -> DANG_VAN_CHUYEN
  DANG_VAN_CHUYEN -> (xác nhận đã đến nơi) -> CHO_TIEP_NHAN
  CHO_TIEP_NHAN -> (bên nhận tự xác nhận, không phải đơn vị vận chuyển) -> HOAN_THANH
==================================================
*/

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const MAX_GHI_CHU = 500;

const cleanText = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
};

const toPositiveNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.round(num * 1000) / 1000 : null;
};

const sendError = (res, err, logMessage, fallbackMessage) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ success: false, message: err.message });
  }

  if (err.code === "ER_NO_SUCH_TABLE" && /lenh_van_chuyen/.test(err.message)) {
    console.error("Thiếu bảng lenh_van_chuyen:", err.message);
    return res.status(500).json({
      success: false,
      message: "CSDL chưa có bảng lệnh vận chuyển (chạy file server/migration/lenh_van_chuyen.sql)",
    });
  }

  console.error(logMessage, err);
  return res.status(500).json({ success: false, message: fallbackMessage });
};

const withTransaction = async (callback) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

const getTransporterId = (req) => {
  const user = req.user;

  if (!user?.ma_nguoi_dung) {
    throw new ApiError(401, "Vui lòng đăng nhập để thực hiện chức năng này");
  }

  if (user.vai_tro !== "TRANSPORTER") {
    throw new ApiError(403, "Chỉ đơn vị vận chuyển mới được dùng chức năng này");
  }

  return user.ma_nguoi_dung;
};

const TRIP_SELECT = `
  SELECT
    v.ma_van_don,
    v.ma_lo_nong_san,
    sp.ten_san_pham,
    v.ma_nguoi_gui,
    gui.ho_ten AS ten_nguoi_gui,
    gui.so_dien_thoai AS sdt_nguoi_gui,
    v.ma_ben_nhan,
    ben.ho_ten AS ten_ben_nhan,
    v.dia_chi_giao_hang,
    v.ten_tai_xe,
    v.bien_so_xe,
    v.khoi_luong,
    v.don_vi_tinh,
    DATE_FORMAT(v.thoi_gian_xuat, '%Y-%m-%d %H:%i') AS thoi_gian_xuat,
    v.ghi_chu,
    v.trang_thai,
    v.created_at,
    v.updated_at
  FROM lenh_van_chuyen v
  JOIN lo_nong_san lo ON v.ma_lo_nong_san = lo.ma_lo_nong_san
  JOIN san_pham_nong_san sp ON lo.ma_san_pham = sp.ma_san_pham
  LEFT JOIN nguoi_dung gui ON v.ma_nguoi_gui = gui.ma_nguoi_dung
  LEFT JOIN nguoi_dung ben ON v.ma_ben_nhan = ben.ma_nguoi_dung
`;

const getMyTrips = async (req, res) => {
  try {
    const maDonVi = getTransporterId(req);

    const [rows] = await db.execute(
      `
      ${TRIP_SELECT}
      WHERE v.ma_don_vi_van_chuyen = ?
      ORDER BY v.created_at DESC, v.ma_van_don DESC
      `,
      [maDonVi],
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    return sendError(res, err, "Lỗi lấy danh sách chuyến vận chuyển:", "Không thể lấy danh sách chuyến");
  }
};

const getTripById = async (req, res) => {
  const { maVanDon } = req.params;

  try {
    const maDonVi = getTransporterId(req);

    const [rows] = await db.execute(
      `
      ${TRIP_SELECT}
      WHERE v.ma_van_don = ? AND v.ma_don_vi_van_chuyen = ?
      LIMIT 1
      `,
      [maVanDon, maDonVi],
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy chuyến vận chuyển" });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return sendError(res, err, "Lỗi lấy chi tiết chuyến vận chuyển:", "Không thể lấy chi tiết chuyến");
  }
};

const acceptTrip = async (req, res) => {
  const { maVanDon } = req.params;

  try {
    const maDonVi = getTransporterId(req);
    const tenTaiXe = cleanText(req.body?.ten_tai_xe);
    const bienSoXe = cleanText(req.body?.bien_so_xe);

    await withTransaction(async (connection) => {
      const [rows] = await connection.execute(
        `SELECT trang_thai, ten_tai_xe, bien_so_xe FROM lenh_van_chuyen WHERE ma_van_don = ? AND ma_don_vi_van_chuyen = ? LIMIT 1 FOR UPDATE`,
        [maVanDon, maDonVi],
      );

      if (rows.length === 0) throw new ApiError(404, "Không tìm thấy chuyến vận chuyển");
      if (rows[0].trang_thai !== "CHO_CHAP_NHAN") {
        throw new ApiError(409, "Chuyến không ở trạng thái chờ chấp nhận");
      }

      const finalTaiXe = tenTaiXe || rows[0].ten_tai_xe;
      const finalBienSo = bienSoXe || rows[0].bien_so_xe;

      if (!finalTaiXe || !finalBienSo) {
        throw new ApiError(400, "Vui lòng nhập tên tài xế và biển số xe phụ trách");
      }

      await connection.execute(
        `UPDATE lenh_van_chuyen SET trang_thai = 'CHO_LAY_HANG', ten_tai_xe = ?, bien_so_xe = ? WHERE ma_van_don = ?`,
        [finalTaiXe, finalBienSo, maVanDon],
      );
    });

    return res.json({ success: true, message: "Đã chấp nhận chuyến vận chuyển" });
  } catch (err) {
    return sendError(res, err, "Lỗi chấp nhận chuyến vận chuyển:", "Không thể chấp nhận chuyến");
  }
};

const rejectTrip = async (req, res) => {
  const { maVanDon } = req.params;

  try {
    const maDonVi = getTransporterId(req);
    const lyDo = cleanText(req.body?.ly_do);

    if (!lyDo) throw new ApiError(400, "Vui lòng nhập lý do từ chối");
    if (lyDo.length > MAX_GHI_CHU) throw new ApiError(400, `Lý do tối đa ${MAX_GHI_CHU} ký tự`);

    await withTransaction(async (connection) => {
      const [rows] = await connection.execute(
        `SELECT trang_thai FROM lenh_van_chuyen WHERE ma_van_don = ? AND ma_don_vi_van_chuyen = ? LIMIT 1 FOR UPDATE`,
        [maVanDon, maDonVi],
      );

      if (rows.length === 0) throw new ApiError(404, "Không tìm thấy chuyến vận chuyển");
      if (rows[0].trang_thai !== "CHO_CHAP_NHAN") {
        throw new ApiError(409, "Chuyến không ở trạng thái chờ chấp nhận");
      }

      await connection.execute(
        `UPDATE lenh_van_chuyen SET trang_thai = 'TU_CHOI', ghi_chu = ? WHERE ma_van_don = ?`,
        [`Đơn vị vận chuyển từ chối: ${lyDo}`, maVanDon],
      );
      // Blockchain: đơn vị vận chuyển ký từ chối chuyến (lô ở lại bên gửi)
      await ghiSuKienVanDon(connection, maVanDon, "HANDOVER_REJECTED", maDonVi, {
        ben_tu_choi: "VAN_CHUYEN",
        ly_do: lyDo,
      });
    });

    return res.json({ success: true, message: "Đã từ chối chuyến vận chuyển" });
  } catch (err) {
    return sendError(res, err, "Lỗi từ chối chuyến vận chuyển:", "Không thể từ chối chuyến");
  }
};

const confirmPickup = async (req, res) => {
  const { maVanDon } = req.params;

  try {
    const maDonVi = getTransporterId(req);
    const khoiLuongThucTe = req.body?.khoi_luong_thuc_te
      ? toPositiveNumber(req.body.khoi_luong_thuc_te)
      : null;

    await withTransaction(async (connection) => {
      const [rows] = await connection.execute(
        `SELECT trang_thai FROM lenh_van_chuyen WHERE ma_van_don = ? AND ma_don_vi_van_chuyen = ? LIMIT 1 FOR UPDATE`,
        [maVanDon, maDonVi],
      );

      if (rows.length === 0) throw new ApiError(404, "Không tìm thấy chuyến vận chuyển");
      if (rows[0].trang_thai !== "CHO_LAY_HANG") {
        throw new ApiError(409, "Chuyến không ở trạng thái chờ lấy hàng");
      }

      await connection.execute(
        `UPDATE lenh_van_chuyen SET trang_thai = 'DANG_VAN_CHUYEN', khoi_luong = COALESCE(?, khoi_luong) WHERE ma_van_don = ?`,
        [khoiLuongThucTe, maVanDon],
      );
      // Blockchain: đơn vị vận chuyển ký đã lấy hàng
      await ghiSuKienVanDon(connection, maVanDon, "PICKUP_CONFIRMED", maDonVi);
    });

    return res.json({ success: true, message: "Đã xác nhận lấy hàng, chuyến bắt đầu vận chuyển" });
  } catch (err) {
    return sendError(res, err, "Lỗi xác nhận lấy hàng:", "Không thể xác nhận lấy hàng");
  }
};

const confirmArrival = async (req, res) => {
  const { maVanDon } = req.params;

  try {
    const maDonVi = getTransporterId(req);

    await withTransaction(async (connection) => {
      const [rows] = await connection.execute(
        `SELECT trang_thai FROM lenh_van_chuyen WHERE ma_van_don = ? AND ma_don_vi_van_chuyen = ? LIMIT 1 FOR UPDATE`,
        [maVanDon, maDonVi],
      );

      if (rows.length === 0) throw new ApiError(404, "Không tìm thấy chuyến vận chuyển");
      if (rows[0].trang_thai !== "DANG_VAN_CHUYEN") {
        throw new ApiError(409, "Chuyến không ở trạng thái đang vận chuyển");
      }

      await connection.execute(
        `UPDATE lenh_van_chuyen SET trang_thai = 'CHO_TIEP_NHAN' WHERE ma_van_don = ?`,
        [maVanDon],
      );
      // Blockchain: đơn vị vận chuyển ký đã giao tới nơi
      await ghiSuKienVanDon(connection, maVanDon, "DELIVERY_CONFIRMED", maDonVi);
    });

    return res.json({
      success: true,
      message: "Đã xác nhận đến nơi, chờ bên nhận xác nhận bàn giao",
    });
  } catch (err) {
    return sendError(res, err, "Lỗi xác nhận đến nơi:", "Không thể xác nhận đến nơi");
  }
};

module.exports = {
  getMyTrips,
  getTripById,
  acceptTrip,
  rejectTrip,
  confirmPickup,
  confirmArrival,
};
