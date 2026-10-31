const db = require("../config/db");
const { ghiSuKien } = require("../services/blockchain/traceEvent");
const {
  ghiSuKienTuChoiNhanHang,
} = require("../services/blockchain/hook");
const {
  daCoBuocChoKy,
  thucHienBuocCoKy,
} = require("../services/blockchain/buocCoKy");
const {
  apDungKetQuaVanDon,
  apDungBanHet,
} = require("../services/blockchain/ghiNhan");
const { layCauHinh } = require("../services/blockchain/chainClient");

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
    // cho_ky = bước đại lý đã bấm và đang chờ ký (NHAN_HANG | TU_CHOI_NHAN): hàng chỉ đổi trạng thái sau khi ký xong
    rows.forEach((r) => {
      r.cho_ky = null;
    });
    if (rows.length > 0 && layCauHinh().daCauHinh) {
      const [ev] = await db.query(
        `
        SELECT ls.loai_hoat_dong AS loai,
               JSON_UNQUOTE(JSON_EXTRACT(ls.du_lieu_chi_tiet, '$.du_lieu.ma_van_don')) AS ma_van_don
        FROM lich_su_truy_xuat_lo ls
        WHERE ls.blockchain_sync_status <> 'CONFIRMED'
          AND ls.loai_hoat_dong IN ('STOCK_IN_CONFIRMED', 'HANDOVER_REJECTED')
          AND JSON_UNQUOTE(JSON_EXTRACT(ls.du_lieu_chi_tiet, '$.du_lieu.ma_van_don')) IN (?)
        `,
        [rows.map((r) => r.ma_van_don)],
      );
      rows.forEach((r) => {
        const e = ev.find((x) => x.ma_van_don === r.ma_van_don);
        if (e) r.cho_ky = e.loai === "STOCK_IN_CONFIRMED" ? "NHAN_HANG" : "TU_CHOI_NHAN";
      });
    }
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

    const choKy = await withTransaction(async (connection) => {
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

      // Blockchain: đại lý ký nhận hàng kèm khối lượng thực nhận; lô đổi chủ sang đại lý trên chain.
      // Lệnh / phiếu chỉ hoàn tất và lô chỉ vào cửa hàng sau khi đại lý ký xong (ghiNhan.js áp dụng ap_dung).
      if (await daCoBuocChoKy(connection, maVanDon, "HANDOVER_REJECTED")) {
        throw new ApiError(
          409,
          'Bạn đã gửi yêu cầu từ chối lô này và đang chờ ký ở tab "Ký blockchain", không nhận hàng được nữa',
        );
      }
      return thucHienBuocCoKy(
        connection,
        maVanDon,
        "STOCK_IN_CONFIRMED",
        maDaiLy,
        { khoi_luong_nhan: String(khoiLuong) },
        {
          hanh_dong: "NHAN_HANG",
          khoi_luong_nhan: khoiLuong,
          giai_doan: "DISTRIBUTED",
          phieu_da_giao: true,
        },
      );
    });

    if (choKy) {
      return res.json({
        success: true,
        cho_ky: true,
        message:
          'Đã gửi yêu cầu xác nhận nhận hàng. Lô chỉ vào cửa hàng của bạn sau khi bạn ký ở tab "Ký blockchain".',
      });
    }
    return res.json({ success: true, message: "Đã nhận hàng." });
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

    const choKy = await withTransaction(async (connection) => {
      const [rows] = await connection.execute(
        `SELECT trang_thai FROM lenh_van_chuyen WHERE ma_van_don = ? AND ma_ben_nhan = ? LIMIT 1 FOR UPDATE`,
        [maVanDon, maDaiLy],
      );
      if (rows.length === 0) throw new ApiError(404, "Không tìm thấy chuyến hàng giao cho bạn");
      if (rows[0].trang_thai !== "CHO_TIEP_NHAN") {
        throw new ApiError(409, "Chỉ từ chối được khi hàng đã tới nơi");
      }
      // Blockchain: đại lý ký từ chối; bên giao ký chở trả về, nhà phân phối ký đã nhận lại.
      // Lệnh / phiếu chỉ chuyển sang "từ chối / hủy" sau khi đại lý ký xong bước từ chối của mình.
      if (await daCoBuocChoKy(connection, maVanDon, "STOCK_IN_CONFIRMED")) {
        throw new ApiError(
          409,
          'Bạn đã gửi yêu cầu nhận lô này và đang chờ ký ở tab "Ký blockchain", không từ chối được nữa',
        );
      }
      if (await daCoBuocChoKy(connection, maVanDon, "HANDOVER_REJECTED"))
        return true;
      const apDung = {
        hanh_dong: "BEN_NHAN_TU_CHOI",
        ghi_chu: `Đại lý từ chối nhận: ${lyDo}`,
      };
      const suKien = await ghiSuKienTuChoiNhanHang(connection, maVanDon, apDung);
      if (!layCauHinh().daCauHinh || !suKien) {
        await apDungKetQuaVanDon(connection, maVanDon, apDung);
        return false;
      }
      return true;
    });

    if (choKy) {
      return res.json({
        success: true,
        cho_ky: true,
        message:
          'Đã gửi yêu cầu từ chối nhận hàng. Hàng chỉ được ghi là bị từ chối sau khi bạn ký ở tab "Ký blockchain".',
      });
    }
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
    // cho_ky = "BAN_HET": đã bấm bán hết và đang chờ đại lý ký (lô chỉ kết thúc sau khi ký xong)
    rows.forEach((r) => {
      r.cho_ky = null;
    });
    if (rows.length > 0 && layCauHinh().daCauHinh) {
      const [ev] = await db.query(
        `
        SELECT ma_lo_nong_san FROM lich_su_truy_xuat_lo
        WHERE loai_hoat_dong = 'COMPLETE_CONFIRMED' AND blockchain_sync_status <> 'CONFIRMED'
          AND ma_lo_nong_san IN (?)
        `,
        [rows.map((r) => r.ma_lo_nong_san)],
      );
      const cho = new Set(ev.map((e) => e.ma_lo_nong_san));
      rows.forEach((r) => {
        if (cho.has(r.ma_lo_nong_san)) r.cho_ky = "BAN_HET";
      });
    }
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

    const choKy = await withTransaction(async (connection) => {
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

      // Blockchain: đại lý ký "Hoàn tất" (hàm step, COMPLETE_CONFIRMED). Lô chỉ kết thúc vòng đời (hết hàng,
      // "đã bán hết") sau khi đại lý ký xong (ghiNhan.js áp dụng ap_dung).
      const [dangCho] = await connection.query(
        `SELECT ma_lich_su FROM lich_su_truy_xuat_lo
         WHERE ma_lo_nong_san = ? AND loai_hoat_dong = 'COMPLETE_CONFIRMED' AND blockchain_sync_status <> 'CONFIRMED' LIMIT 1`,
        [maLo],
      );
      if (dangCho.length > 0) return true; // đã gửi yêu cầu trước đó, đang chờ ký

      const apDung = { hanh_dong: "BAN_HET", ma_lo: maLo };
      const suKien = await ghiSuKien(connection, {
        maLo,
        loai: "COMPLETE_CONFIRMED",
        maNguoiKy: maDaiLy,
        duLieu: {
          so_luong_truoc_khi_ban_het: String(lo.so_luong_hien_tai),
          don_vi_tinh: lo.don_vi_tinh,
          ghi_chu: ghiChu,
        },
        thamSo: { ap_dung: apDung },
      });
      if (!layCauHinh().daCauHinh || !suKien) {
        // Không có blockchain hoặc lô cũ không được theo dõi: kết thúc lô ngay
        await apDungBanHet(connection, apDung);
        return false;
      }
      return true;
    });

    if (choKy) {
      return res.json({
        success: true,
        cho_ky: true,
        message:
          'Đã gửi yêu cầu xác nhận bán hết. Lô chỉ kết thúc sau khi bạn ký ở tab "Ký blockchain".',
      });
    }
    return res.json({ success: true, message: "Đã xác nhận bán hết lô." });
  } catch (err) {
    return sendError(res, err, "Lỗi xác nhận bán hết:", "Không thể xác nhận bán hết lô");
  }
};

module.exports = { getIncoming, confirmReceive, rejectReceive, getStock, completeLot };
