const db = require("../config/db");
const { ghiSuKien } = require("../services/blockchain/traceEvent");
const {
  ghiSuKienVanDon,
  ghiSuKienTuChoiNhanHang,
} = require("../services/blockchain/hook");

/*
==================================================
ĐẠI LÝ (tài khoản vai trò RETAILER)
Nhận hàng từ nhà phân phối (ký nhận trên blockchain), quản lý lô trong cửa hàng,
xác nhận đã bán hết (ký "Hoàn tất", lô đóng lại trên chain).
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
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

const sendError = (res, err, logMessage, fallbackMessage) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ success: false, message: err.message });
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

const getRetailerId = (req) => {
  const user = req.user;
  if (!user?.ma_nguoi_dung) throw new ApiError(401, "Vui lòng đăng nhập");
  if (user.vai_tro !== "RETAILER") throw new ApiError(403, "Chỉ tài khoản đại lý mới dùng được chức năng này");
  return user.ma_nguoi_dung;
};

/* ======================= 1. NHẬN HÀNG ======================= */

const getIncoming = async (req, res) => {
  try {
    const maDaiLy = getRetailerId(req);
    const [rows] = await db.execute(
      `
      SELECT v.ma_van_don, v.ma_lo_nong_san, sp.ten_san_pham, v.khoi_luong, v.khoi_luong_nhan, v.don_vi_tinh,
             v.trang_thai, v.ten_tai_xe, v.bien_so_xe, v.ghi_chu,
             DATE_FORMAT(v.thoi_gian_xuat, '%Y-%m-%d %H:%i') AS thoi_gian_xuat,
             gui.ho_ten AS ten_nguoi_gui, vc.ho_ten AS ten_van_chuyen,
             (v.ma_don_vi_van_chuyen = v.ma_nguoi_gui) AS tu_giao,
             p.ma_phieu
      FROM lenh_van_chuyen v
      JOIN lo_nong_san lo ON lo.ma_lo_nong_san = v.ma_lo_nong_san
      JOIN san_pham_nong_san sp ON sp.ma_san_pham = lo.ma_san_pham
      LEFT JOIN nguoi_dung gui ON gui.ma_nguoi_dung = v.ma_nguoi_gui
      LEFT JOIN nguoi_dung vc ON vc.ma_nguoi_dung = v.ma_don_vi_van_chuyen
      LEFT JOIN phieu_xuat_kho p ON p.ma_van_don = v.ma_van_don
      WHERE v.ma_ben_nhan = ? AND v.trang_thai <> 'DA_HUY'
      ORDER BY FIELD(v.trang_thai, 'CHO_TIEP_NHAN', 'DANG_VAN_CHUYEN', 'CHO_LAY_HANG', 'CHO_CHAP_NHAN'), v.created_at DESC
      `,
      [maDaiLy],
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return sendError(res, err, "Lỗi lấy hàng đang tới:", "Không thể lấy danh sách hàng đang tới");
  }
};

// Đại lý xác nhận đã nhận hàng (kèm khối lượng cân thực tế): lô đổi chủ sang đại lý, phiếu xuất hoàn tất
const confirmReceive = async (req, res) => {
  const { maVanDon } = req.params;
  try {
    const maDaiLy = getRetailerId(req);
    const khoiLuong = toPositiveNumber(req.body?.khoi_luong_thuc_te);
    if (!khoiLuong) throw new ApiError(400, "Vui lòng nhập khối lượng nhận thực tế hợp lệ");

    await withTransaction(async (connection) => {
      const [rows] = await connection.execute(
        `
        SELECT v.trang_thai, v.ma_lo_nong_san, lo.so_luong_hien_tai, lo.don_vi_tinh
        FROM lenh_van_chuyen v
        JOIN lo_nong_san lo ON lo.ma_lo_nong_san = v.ma_lo_nong_san
        WHERE v.ma_van_don = ? AND v.ma_ben_nhan = ?
        LIMIT 1
        FOR UPDATE
        `,
        [maVanDon, maDaiLy],
      );
      if (rows.length === 0) throw new ApiError(404, "Không tìm thấy chuyến hàng giao cho bạn");
      const v = rows[0];
      if (v.trang_thai !== "CHO_TIEP_NHAN") {
        throw new ApiError(409, "Hàng chưa tới nơi (bên giao chưa xác nhận đã tới)");
      }
      if (khoiLuong > Number(v.so_luong_hien_tai) + 1e-9) {
        throw new ApiError(
          400,
          `Khối lượng nhận không được lớn hơn khối lượng gửi (${Number(v.so_luong_hien_tai)} ${v.don_vi_tinh})`,
        );
      }

      await connection.execute(
        `UPDATE lenh_van_chuyen SET trang_thai = 'HOAN_THANH', khoi_luong_nhan = ? WHERE ma_van_don = ?`,
        [khoiLuong, maVanDon],
      );
      await connection.execute(
        `UPDATE lo_nong_san SET ma_nguoi_quan_ly = ?, so_luong_hien_tai = ?, giai_doan_hien_tai = 'DISTRIBUTED' WHERE ma_lo_nong_san = ?`,
        [maDaiLy, khoiLuong, v.ma_lo_nong_san],
      );
      await connection.execute(
        `UPDATE phieu_xuat_kho SET trang_thai = 'DA_GIAO', thoi_gian_giao = NOW() WHERE ma_van_don = ?`,
        [maVanDon],
      );
      // Blockchain: đại lý ký nhận hàng kèm khối lượng thực nhận; lô đổi chủ sang đại lý
      await ghiSuKienVanDon(connection, maVanDon, "STOCK_IN_CONFIRMED", maDaiLy);
    });

    return res.json({ success: true, message: "Đã nhận hàng. Hãy ký xác nhận ở mục Ký blockchain" });
  } catch (err) {
    return sendError(res, err, "Lỗi đại lý nhận hàng:", "Không thể xác nhận nhận hàng");
  }
};

// Đại lý từ chối khi hàng đã tới: hàng quay về nhà phân phối (3 bước ký trả hàng)
const rejectReceive = async (req, res) => {
  const { maVanDon } = req.params;
  try {
    const maDaiLy = getRetailerId(req);
    const lyDo = cleanText(req.body?.ly_do);
    if (!lyDo) throw new ApiError(400, "Vui lòng nhập lý do từ chối");
    if (lyDo.length > MAX_GHI_CHU) throw new ApiError(400, `Lý do tối đa ${MAX_GHI_CHU} ký tự`);

    await withTransaction(async (connection) => {
      const [rows] = await connection.execute(
        `SELECT trang_thai FROM lenh_van_chuyen WHERE ma_van_don = ? AND ma_ben_nhan = ? LIMIT 1 FOR UPDATE`,
        [maVanDon, maDaiLy],
      );
      if (rows.length === 0) throw new ApiError(404, "Không tìm thấy chuyến hàng giao cho bạn");
      if (rows[0].trang_thai !== "CHO_TIEP_NHAN") {
        throw new ApiError(409, "Chỉ từ chối được khi hàng đã tới nơi");
      }
      await connection.execute(
        `UPDATE lenh_van_chuyen SET trang_thai = 'TU_CHOI', ghi_chu = ? WHERE ma_van_don = ?`,
        [`Đại lý từ chối nhận: ${lyDo}`, maVanDon],
      );
      await connection.execute(
        `UPDATE phieu_xuat_kho SET trang_thai = 'DA_HUY' WHERE ma_van_don = ?`,
        [maVanDon],
      );
      // Blockchain: đại lý ký từ chối; bên giao ký chở trả về, nhà phân phối ký đã nhận lại
      await ghiSuKienTuChoiNhanHang(connection, maVanDon);
    });

    return res.json({ success: true, message: "Đã từ chối nhận hàng" });
  } catch (err) {
    return sendError(res, err, "Lỗi đại lý từ chối nhận hàng:", "Không thể từ chối nhận hàng");
  }
};

/* ======================= 2. KHO CỬA HÀNG ======================= */

const getStock = async (req, res) => {
  try {
    const maDaiLy = getRetailerId(req);
    const [rows] = await db.execute(
      `
      SELECT lo.ma_lo_nong_san, sp.ten_san_pham, lo.so_luong_hien_tai, lo.don_vi_tinh, lo.giai_doan_hien_tai,
             lo.integrity_status, lo.updated_at,
             (SELECT gui.ho_ten FROM lenh_van_chuyen v JOIN nguoi_dung gui ON gui.ma_nguoi_dung = v.ma_nguoi_gui
               WHERE v.ma_lo_nong_san = lo.ma_lo_nong_san AND v.trang_thai = 'HOAN_THANH'
               ORDER BY v.updated_at DESC LIMIT 1) AS nhap_tu
      FROM lo_nong_san lo
      JOIN san_pham_nong_san sp ON sp.ma_san_pham = lo.ma_san_pham
      WHERE lo.ma_nguoi_quan_ly = ?
      ORDER BY (lo.giai_doan_hien_tai = 'COMPLETED'), lo.updated_at DESC
      `,
      [maDaiLy],
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return sendError(res, err, "Lỗi lấy kho đại lý:", "Không thể lấy danh sách hàng trong cửa hàng");
  }
};

// Đại lý xác nhận đã bán hết lô: lô kết thúc vòng đời (COMPLETE_CONFIRMED, trên chain lô đóng lại)
const completeLot = async (req, res) => {
  const { maLo } = req.params;
  try {
    const maDaiLy = getRetailerId(req);
    const ghiChu = cleanText(req.body?.ghi_chu);

    await withTransaction(async (connection) => {
      const [rows] = await connection.execute(
        `
        SELECT so_luong_hien_tai, don_vi_tinh, giai_doan_hien_tai, tinh_trang_su_dung
        FROM lo_nong_san WHERE ma_lo_nong_san = ? AND ma_nguoi_quan_ly = ? LIMIT 1 FOR UPDATE
        `,
        [maLo, maDaiLy],
      );
      if (rows.length === 0) throw new ApiError(404, "Không tìm thấy lô trong cửa hàng của bạn");
      const lo = rows[0];
      if (lo.giai_doan_hien_tai === "COMPLETED") throw new ApiError(409, "Lô đã được xác nhận bán hết");
      if (lo.tinh_trang_su_dung !== "ACTIVE") throw new ApiError(409, "Lô không còn khả dụng");

      await connection.execute(
        `UPDATE lo_nong_san SET giai_doan_hien_tai = 'COMPLETED', so_luong_hien_tai = 0 WHERE ma_lo_nong_san = ?`,
        [maLo],
      );
      // Blockchain: đại lý ký "Hoàn tất" (hàm step, COMPLETE_CONFIRMED)
      await ghiSuKien(connection, {
        maLo,
        loai: "COMPLETE_CONFIRMED",
        maNguoiKy: maDaiLy,
        duLieu: {
          so_luong_truoc_khi_ban_het: String(lo.so_luong_hien_tai),
          don_vi_tinh: lo.don_vi_tinh,
          ghi_chu: ghiChu,
        },
        thamSo: {},
      });
    });

    return res.json({ success: true, message: "Đã xác nhận bán hết lô. Hãy ký xác nhận ở mục Ký blockchain" });
  } catch (err) {
    return sendError(res, err, "Lỗi xác nhận bán hết:", "Không thể xác nhận bán hết lô");
  }
};

module.exports = { getIncoming, confirmReceive, rejectReceive, getStock, completeLot };
