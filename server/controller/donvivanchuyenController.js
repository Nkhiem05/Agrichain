const db = require("../config/db");
const {
  ghiSuKienVanDon,
  chuaCoViDuyet,
} = require("../services/blockchain/hook");
const { apDungKetQuaVanDon } = require("../services/blockchain/ghiNhan");
const { layCauHinh } = require("../services/blockchain/chainClient");

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
Có blockchain: mỗi bước của đơn vị vận chuyển (từ chối / lấy hàng / đến nơi) chỉ tạo sự kiện chờ ký; chuyến chỉ chuyển
sang bước sau khi đơn vị vận chuyển ký xong (xem ghiNhan.js). Và các bước này chỉ làm được sau khi bên gửi đã ký lệnh.
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
    return res
      .status(err.status)
      .json({ success: false, message: err.message });
  }

  if (err.code === "ER_NO_SUCH_TABLE" && /lenh_van_chuyen/.test(err.message)) {
    console.error("Thiếu bảng lenh_van_chuyen:", err.message);
    return res.status(500).json({
      success: false,
      message:
        "CSDL chưa có bảng lệnh vận chuyển (chạy file server/migration/lenh_van_chuyen.sql)",
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
    throw new ApiError(
      403,
      "Chỉ đơn vị vận chuyển mới được dùng chức năng này",
    );
  }

  return user.ma_nguoi_dung;
};

const CHUA_KY_LENH =
  "Bên gửi chưa ký lệnh vận chuyển lên blockchain. Hãy chờ bên gửi ký xong rồi mới thực hiện bước này.";

// Trạng thái ký của sự kiện tạo lệnh (bên gửi ký): null = lệnh chưa có sự kiện (lệnh cũ), hoặc trạng thái đồng bộ của nó
const trangThaiKyLenh = async (executor, maVanDon) => {
  const [rows] = await executor.query(
    `
    SELECT blockchain_sync_status AS st FROM lich_su_truy_xuat_lo
    WHERE loai_hoat_dong = 'TRANSPORT_ORDERED'
      AND JSON_UNQUOTE(JSON_EXTRACT(du_lieu_chi_tiet, '$.du_lieu.ma_van_don')) = ?
    LIMIT 1
    `,
    [maVanDon],
  );
  return rows.length > 0 ? rows[0].st : null;
};

// Các bước của đơn vị vận chuyển chỉ làm được sau khi bên gửi đã ký lệnh lên chain
const canBenGuiDaKy = async (executor, maVanDon) => {
  if (!layCauHinh().daCauHinh) return;
  const st = await trangThaiKyLenh(executor, maVanDon);
  if (st && st !== "CONFIRMED") throw new ApiError(409, CHUA_KY_LENH);
};

// Một bước vận chuyển có ký: tạo sự kiện chờ ký kèm thay đổi sẽ áp dụng sau khi ký (apDung).
// Trả true nếu đang chờ ký (chuyến chưa đổi trạng thái); false nếu không có gì để ký và đã áp dụng ngay.
const thucHienBuocCoKy = async (
  connection,
  maVanDon,
  loai,
  maNguoiKy,
  duLieuThem,
  apDung,
) => {
  const [dangCho] = await connection.query(
    `
    SELECT ma_lich_su FROM lich_su_truy_xuat_lo
    WHERE loai_hoat_dong = ? AND blockchain_sync_status <> 'CONFIRMED'
      AND JSON_UNQUOTE(JSON_EXTRACT(du_lieu_chi_tiet, '$.du_lieu.ma_van_don')) = ?
    LIMIT 1
    `,
    [loai, maVanDon],
  );
  if (dangCho.length > 0) return true; // đã gửi yêu cầu trước đó, đang chờ ký

  const suKien = await ghiSuKienVanDon(
    connection,
    maVanDon,
    loai,
    maNguoiKy,
    duLieuThem,
    apDung,
  );
  if (!layCauHinh().daCauHinh || !suKien) {
    await apDungKetQuaVanDon(connection, maVanDon, apDung);
    return false;
  }
  return true;
};

// Gắn cờ cho mỗi chuyến: cho_ky = bước đã bấm đang chờ ký (LAY_HANG | DEN_NOI | TU_CHOI);
// chua_ky_lenh = bên gửi chưa ký lệnh vận chuyển
const ganCoKy = async (executor, rows, maDonVi) => {
  rows.forEach((r) => {
    r.cho_ky = null;
    r.chua_ky_lenh = false;
    r.ly_do_chua_ky_lenh = "";
  });
  if (rows.length === 0 || !layCauHinh().daCauHinh) return;
  const [ev] = await executor.query(
    `
    SELECT ls.loai_hoat_dong AS loai,
           JSON_UNQUOTE(JSON_EXTRACT(ls.du_lieu_chi_tiet, '$.du_lieu.ma_van_don')) AS ma_van_don,
           JSON_UNQUOTE(JSON_EXTRACT(o.payload, '$.tham_so.ap_dung.hanh_dong')) AS hanh_dong
    FROM lich_su_truy_xuat_lo ls
    JOIN blockchain_outbox o ON o.event_id = ls.ma_lich_su
    WHERE ls.blockchain_sync_status <> 'CONFIRMED'
      AND ls.loai_hoat_dong IN ('TRANSPORT_ORDERED', 'PICKUP_CONFIRMED', 'DELIVERY_CONFIRMED', 'HANDOVER_REJECTED')
      AND JSON_UNQUOTE(JSON_EXTRACT(ls.du_lieu_chi_tiet, '$.du_lieu.ma_van_don')) IN (?)
    `,
    [rows.map((r) => r.ma_van_don)],
  );
  rows.forEach((r) => {
    ev.filter((e) => e.ma_van_don === r.ma_van_don).forEach((e) => {
      if (e.loai === "TRANSPORT_ORDERED") r.chua_ky_lenh = true;
      else if (e.hanh_dong) r.cho_ky = e.hanh_dong;
    });
  });

  // Lệnh chưa ký: thường do bên gửi chưa ký được vì một bên (nhất là bên nhận) chưa có ví được duyệt
  const canXet = rows.filter((r) => r.chua_ky_lenh);
  if (canXet.length > 0) {
    const thieu = new Set(
      await chuaCoViDuyet(
        executor,
        canXet.flatMap((r) => [r.ma_nguoi_gui, r.ma_ben_nhan, maDonVi]),
      ),
    );
    canXet.forEach((r) => {
      const ten = (ma, tenHienThi) => `${tenHienThi || ma} (${ma})`;
      const ds = [];
      if (thieu.has(r.ma_ben_nhan))
        ds.push(`bên nhận ${ten(r.ma_ben_nhan, r.ten_ben_nhan)}`);
      if (thieu.has(r.ma_nguoi_gui))
        ds.push(`bên gửi ${ten(r.ma_nguoi_gui, r.ten_nguoi_gui)}`);
      if (thieu.has(maDonVi)) ds.push("đơn vị vận chuyển (bạn)");
      if (ds.length > 0) {
        r.ly_do_chua_ky_lenh = `Lệnh chưa ký được vì ${ds.join(", ")} chưa liên kết ví hoặc chưa được quản trị viên duyệt ví blockchain.`;
      }
    });
  }
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

    await ganCoKy(db, rows, maDonVi);

    return res.json({ success: true, data: rows });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy danh sách chuyến vận chuyển:",
      "Không thể lấy danh sách chuyến",
    );
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
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy chuyến vận chuyển" });
    }

    await ganCoKy(db, rows, maDonVi);

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy chi tiết chuyến vận chuyển:",
      "Không thể lấy chi tiết chuyến",
    );
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

      if (rows.length === 0)
        throw new ApiError(404, "Không tìm thấy chuyến vận chuyển");
      if (rows[0].trang_thai !== "CHO_CHAP_NHAN") {
        throw new ApiError(409, "Chuyến không ở trạng thái chờ chấp nhận");
      }
      await canBenGuiDaKy(connection, maVanDon);

      const finalTaiXe = tenTaiXe || rows[0].ten_tai_xe;
      const finalBienSo = bienSoXe || rows[0].bien_so_xe;

      if (!finalTaiXe || !finalBienSo) {
        throw new ApiError(
          400,
          "Vui lòng nhập tên tài xế và biển số xe phụ trách",
        );
      }

      await connection.execute(
        `UPDATE lenh_van_chuyen SET trang_thai = 'CHO_LAY_HANG', ten_tai_xe = ?, bien_so_xe = ? WHERE ma_van_don = ?`,
        [finalTaiXe, finalBienSo, maVanDon],
      );
    });

    return res.json({
      success: true,
      message: "Đã chấp nhận chuyến vận chuyển",
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi chấp nhận chuyến vận chuyển:",
      "Không thể chấp nhận chuyến",
    );
  }
};

const rejectTrip = async (req, res) => {
  const { maVanDon } = req.params;

  try {
    const maDonVi = getTransporterId(req);
    const lyDo = cleanText(req.body?.ly_do);

    if (!lyDo) throw new ApiError(400, "Vui lòng nhập lý do từ chối");
    if (lyDo.length > MAX_GHI_CHU)
      throw new ApiError(400, `Lý do tối đa ${MAX_GHI_CHU} ký tự`);

    const choKy = await withTransaction(async (connection) => {
      const [rows] = await connection.execute(
        `SELECT trang_thai FROM lenh_van_chuyen WHERE ma_van_don = ? AND ma_don_vi_van_chuyen = ? LIMIT 1 FOR UPDATE`,
        [maVanDon, maDonVi],
      );

      if (rows.length === 0)
        throw new ApiError(404, "Không tìm thấy chuyến vận chuyển");
      if (rows[0].trang_thai !== "CHO_CHAP_NHAN") {
        throw new ApiError(409, "Chuyến không ở trạng thái chờ chấp nhận");
      }
      await canBenGuiDaKy(connection, maVanDon);

      // Blockchain: đơn vị vận chuyển ký từ chối chuyến (lô ở lại bên gửi). Chuyến chỉ bị từ chối sau khi ký xong.
      return thucHienBuocCoKy(
        connection,
        maVanDon,
        "HANDOVER_REJECTED",
        maDonVi,
        { ben_tu_choi: "VAN_CHUYEN", ly_do: lyDo },
        { hanh_dong: "TU_CHOI", ghi_chu: `Đơn vị vận chuyển từ chối: ${lyDo}` },
      );
    });

    return res.json({
      success: true,
      cho_ky: choKy,
      message: choKy
        ? "Đã tạo yêu cầu từ chối chuyến. Hãy ký bằng MetaMask; chuyến chỉ bị từ chối sau khi ký xong."
        : "Đã từ chối chuyến vận chuyển",
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi từ chối chuyến vận chuyển:",
      "Không thể từ chối chuyến",
    );
  }
};

const confirmPickup = async (req, res) => {
  const { maVanDon } = req.params;

  try {
    const maDonVi = getTransporterId(req);
    const khoiLuongThucTe = req.body?.khoi_luong_thuc_te
      ? toPositiveNumber(req.body.khoi_luong_thuc_te)
      : null;

    const choKy = await withTransaction(async (connection) => {
      const [rows] = await connection.execute(
        `SELECT trang_thai FROM lenh_van_chuyen WHERE ma_van_don = ? AND ma_don_vi_van_chuyen = ? LIMIT 1 FOR UPDATE`,
        [maVanDon, maDonVi],
      );

      if (rows.length === 0)
        throw new ApiError(404, "Không tìm thấy chuyến vận chuyển");
      if (rows[0].trang_thai !== "CHO_LAY_HANG") {
        throw new ApiError(409, "Chuyến không ở trạng thái chờ lấy hàng");
      }
      await canBenGuiDaKy(connection, maVanDon);

      // Blockchain: đơn vị vận chuyển ký đã lấy hàng. Chuyến chỉ bắt đầu vận chuyển sau khi ký xong.
      return thucHienBuocCoKy(
        connection,
        maVanDon,
        "PICKUP_CONFIRMED",
        maDonVi,
        khoiLuongThucTe ? { khoi_luong: khoiLuongThucTe.toFixed(3) } : {},
        { hanh_dong: "LAY_HANG", khoi_luong: khoiLuongThucTe },
      );
    });

    return res.json({
      success: true,
      cho_ky: choKy,
      message: choKy
        ? "Đã tạo yêu cầu xác nhận lấy hàng. Hãy ký bằng MetaMask; chuyến chỉ bắt đầu vận chuyển sau khi ký xong."
        : "Đã xác nhận lấy hàng, chuyến bắt đầu vận chuyển",
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi xác nhận lấy hàng:",
      "Không thể xác nhận lấy hàng",
    );
  }
};

const confirmArrival = async (req, res) => {
  const { maVanDon } = req.params;

  try {
    const maDonVi = getTransporterId(req);

    const choKy = await withTransaction(async (connection) => {
      const [rows] = await connection.execute(
        `SELECT trang_thai FROM lenh_van_chuyen WHERE ma_van_don = ? AND ma_don_vi_van_chuyen = ? LIMIT 1 FOR UPDATE`,
        [maVanDon, maDonVi],
      );

      if (rows.length === 0)
        throw new ApiError(404, "Không tìm thấy chuyến vận chuyển");
      if (rows[0].trang_thai !== "DANG_VAN_CHUYEN") {
        throw new ApiError(409, "Chuyến không ở trạng thái đang vận chuyển");
      }

      // Blockchain: đơn vị vận chuyển ký đã giao tới nơi. Bên nhận chỉ xác nhận được sau khi ký xong.
      return thucHienBuocCoKy(
        connection,
        maVanDon,
        "DELIVERY_CONFIRMED",
        maDonVi,
        {},
        { hanh_dong: "DEN_NOI" },
      );
    });

    return res.json({
      success: true,
      cho_ky: choKy,
      message: choKy
        ? "Đã tạo yêu cầu xác nhận đến nơi. Hãy ký bằng MetaMask; bên nhận chỉ xác nhận được sau khi ký xong."
        : "Đã xác nhận đến nơi, chờ bên nhận xác nhận bàn giao",
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi xác nhận đến nơi:",
      "Không thể xác nhận đến nơi",
    );
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
