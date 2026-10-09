const db = require("../config/db");

/*
==================================================
VẬN CHUYỂN & BÀN GIAO (phía nông dân)
Nông dân tạo lệnh vận chuyển cho một lô: chọn đơn vị vận chuyển và bên nhận (cơ sở sơ chế).
Danh tính nông dân lấy từ token đăng nhập (req.user, do checkAuth gắn vào).
Các bước nhận hàng, giao hàng, ký nhận thuộc phía đơn vị vận chuyển / bên nhận.
==================================================
*/

// Lỗi nghiệp vụ: ném ra trong transaction để trả về đúng mã HTTP
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const MAX_GHI_CHU = 500;

// Lô còn ở nông trại thì nông dân mới tạo lệnh vận chuyển được
const GIAI_DOAN_CO_THE_VAN_CHUYEN = ["CREATED", "HARVESTED"];

// Lệnh còn hiệu lực (chưa bị từ chối/hủy): chiếm lô, không tạo thêm lệnh khác
const TRANG_THAI_DONG = ["TU_CHOI", "DA_HUY"];

// Nông dân chỉ hủy được khi xe chưa lấy hàng
const TRANG_THAI_HUY_DUOC = ["CHO_CHAP_NHAN", "CHO_LAY_HANG"];

// Đã rời nông trại: tính vào số liệu "đã xuất"
const TRANG_THAI_DA_XUAT = ["DANG_VAN_CHUYEN", "CHO_TIEP_NHAN", "HOAN_THANH"];

const isValidDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

const cleanText = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
};

// "2026-10-04T16:30" hoặc "2026-10-04 16:30" -> "2026-10-04 16:30:00" (giờ địa phương, không đổi múi giờ)
const parseDateTime = (value) => {
  const text = cleanText(value);
  if (text === null) return null;

  const match = text.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::\d{2})?$/);

  if (
    !match ||
    !isValidDate(match[1]) ||
    Number(match[2]) > 23 ||
    Number(match[3]) > 59
  ) {
    throw new ApiError(400, "Thời gian xuất hàng không hợp lệ");
  }

  return `${match[1]} ${match[2]}:${match[3]}:00`;
};

// Quy đổi khối lượng ra tấn để cộng dồn (đơn vị lạ coi như kg)
const toTonnes = (amount, unit) => {
  const value = Number(amount) || 0;
  const normalized = String(unit || "").trim().toLowerCase();

  return normalized === "tấn" || normalized === "tan" ? value : value / 1000;
};

// Trả về { status, message } cho lỗi nghiệp vụ, còn lại là lỗi 500
const sendError = (res, err, logMessage, fallbackMessage) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
    });
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
  return res.status(500).json({
    success: false,
    message: fallbackMessage,
  });
};

// Chạy callback trong 1 transaction, tự rollback nếu có lỗi
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

// Chỉ nông dân/hợp tác xã mới tạo và xem lệnh của mình
const getFarmerId = (req) => {
  const user = req.user;

  if (!user?.ma_nguoi_dung) {
    throw new ApiError(401, "Vui lòng đăng nhập để thực hiện chức năng này");
  }

  if (user.vai_tro !== "FARMER_COOP") {
    throw new ApiError(
      403,
      "Chỉ nông dân/hợp tác xã mới được tạo lệnh vận chuyển",
    );
  }

  return user.ma_nguoi_dung;
};

// Mã dạng PREFIX1001, PREFIX1002, ... (không trùng với mã đã có)
const generateOrderCode = async (connection) => {
  const prefix = "VD-LOG-";

  const [rows] = await connection.query(
    `
    SELECT COALESCE(MAX(CAST(SUBSTRING(ma_van_don, ?) AS UNSIGNED)), 0) AS max_no
    FROM lenh_van_chuyen
    WHERE ma_van_don REGEXP ?
    `,
    [prefix.length + 1, `^${prefix}[0-9]+$`],
  );

  return prefix + String(Math.max(Number(rows[0].max_no), 1000) + 1);
};

// Những lô (trong danh sách) đang có hồ sơ kiểm định chưa hoàn tất.
// Bảng kiểm định có thể chưa được tạo trong CSDL -> coi như không có.
const getLotsInInspection = async (executor, lotCodes) => {
  if (lotCodes.length === 0) return new Set();

  try {
    const [rows] = await executor.query(
      `
      SELECT DISTINCT ma_lo_nong_san
      FROM kiem_dinh_lo_hang
      WHERE ma_lo_nong_san IN (?)
        AND trang_thai_ho_so IN ('CHO_TIEP_NHAN', 'DA_HEN_LICH', 'DA_LAY_MAU')
      `,
      [lotCodes],
    );

    return new Set(rows.map((row) => row.ma_lo_nong_san));
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") return new Set();
    throw err;
  }
};

const ORDER_SELECT = `
  SELECT
    v.ma_van_don,
    v.ma_lo_nong_san,
    sp.ten_san_pham,
    v.ma_don_vi_van_chuyen,
    dv.ho_ten AS ten_don_vi_van_chuyen,
    dv.so_dien_thoai AS sdt_don_vi_van_chuyen,
    v.ma_ben_nhan,
    bn.ho_ten AS ten_ben_nhan,
    bn.so_dien_thoai AS sdt_ben_nhan,
    v.ten_tai_xe,
    v.bien_so_xe,
    v.khoi_luong,
    v.don_vi_tinh,
    DATE_FORMAT(v.thoi_gian_xuat, '%Y-%m-%d %H:%i') AS thoi_gian_xuat,
    v.ghi_chu,
    v.trang_thai,
    v.created_at,
    v.updated_at,
    mv.loai_cay_trong,
    nt.ma_nong_trai,
    nt.ten_nong_trai,
    nt.dia_diem_nong_trai,
    DATE_FORMAT(lo.ngay_thu_hoach, '%Y-%m-%d') AS ngay_thu_hoach
  FROM lenh_van_chuyen v
  JOIN lo_nong_san lo
    ON v.ma_lo_nong_san = lo.ma_lo_nong_san
  JOIN san_pham_nong_san sp
    ON lo.ma_san_pham = sp.ma_san_pham
  JOIN nguoi_dung dv
    ON v.ma_don_vi_van_chuyen = dv.ma_nguoi_dung
  JOIN nguoi_dung bn
    ON v.ma_ben_nhan = bn.ma_nguoi_dung
  LEFT JOIN mua_vu mv
    ON lo.ma_mua_vu = mv.ma_mua_vu
  LEFT JOIN nong_trai nt
    ON mv.ma_nong_trai = nt.ma_nong_trai
`;

/*
==================================================
ĐỐI TÁC: đơn vị vận chuyển và bên nhận (cơ sở sơ chế)
==================================================
*/

const getPartners = async (req, res) => {
  try {
    getFarmerId(req);

    const [rows] = await db.execute(
      `
      SELECT ma_nguoi_dung, ho_ten, vai_tro
      FROM nguoi_dung
      WHERE vai_tro IN ('TRANSPORTER', 'PROCESSOR')
        AND trang_thai = 1
      ORDER BY ho_ten ASC
      `,
    );

    return res.json({
      success: true,
      data: {
        don_vi_van_chuyen: rows.filter((row) => row.vai_tro === "TRANSPORTER"),
        ben_nhan: rows.filter((row) => row.vai_tro === "PROCESSOR"),
      },
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy danh sách đối tác vận chuyển:",
      "Không thể lấy danh sách đơn vị vận chuyển",
    );
  }
};

/*
==================================================
LÔ SẴN SÀNG VẬN CHUYỂN (cho ô "Chọn lô nông sản")
==================================================
*/

const getReadyBatches = async (req, res) => {
  try {
    const maNguoiDung = getFarmerId(req);

    const [rows] = await db.execute(
      `
      SELECT
        lo.ma_lo_nong_san,
        sp.ten_san_pham,
        nt.ma_nong_trai,
        nt.ten_nong_trai,
        lo.so_luong_hien_tai,
        lo.don_vi_tinh,
        DATE_FORMAT(lo.ngay_thu_hoach, '%Y-%m-%d') AS ngay_thu_hoach
      FROM lo_nong_san lo
      JOIN san_pham_nong_san sp
        ON lo.ma_san_pham = sp.ma_san_pham
      LEFT JOIN mua_vu mv
        ON lo.ma_mua_vu = mv.ma_mua_vu
      LEFT JOIN nong_trai nt
        ON mv.ma_nong_trai = nt.ma_nong_trai
      WHERE (nt.ma_nguoi_dung = ? OR lo.ma_nguoi_quan_ly = ?)
        AND lo.tinh_trang_su_dung = 'ACTIVE'
        AND lo.giai_doan_hien_tai IN ('CREATED', 'HARVESTED')
        AND NOT EXISTS (
          SELECT 1
          FROM lenh_van_chuyen v
          WHERE v.ma_lo_nong_san = lo.ma_lo_nong_san
            AND v.trang_thai NOT IN ('TU_CHOI', 'DA_HUY')
        )
      ORDER BY lo.created_at DESC, lo.ma_lo_nong_san DESC
      `,
      [maNguoiDung, maNguoiDung],
    );

    // Lô đang chờ kiểm định thì giữ lại tại nông trại để lấy mẫu
    const inInspection = await getLotsInInspection(
      db,
      rows.map((row) => row.ma_lo_nong_san),
    );

    return res.json({
      success: true,
      data: rows.filter((row) => !inInspection.has(row.ma_lo_nong_san)),
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy lô sẵn sàng vận chuyển:",
      "Không thể lấy danh sách lô sẵn sàng vận chuyển",
    );
  }
};

/*
==================================================
TẠO LỆNH VẬN CHUYỂN & BÀN GIAO
==================================================
*/

const createOrder = async (req, res) => {
  try {
    const maNguoiDung = getFarmerId(req);

    const ma_lo_nong_san = cleanText(req.body?.ma_lo_nong_san);
    const ma_don_vi_van_chuyen = cleanText(req.body?.ma_don_vi_van_chuyen);
    const ma_ben_nhan = cleanText(req.body?.ma_ben_nhan);
    const ghi_chu = cleanText(req.body?.ghi_chu);
    const thoi_gian_xuat = parseDateTime(req.body?.thoi_gian_xuat);

    if (!ma_lo_nong_san) {
      throw new ApiError(400, "Vui lòng chọn lô nông sản cần vận chuyển");
    }

    if (!ma_don_vi_van_chuyen) {
      throw new ApiError(400, "Vui lòng chọn đơn vị vận chuyển");
    }

    if (!ma_ben_nhan) {
      throw new ApiError(400, "Vui lòng chọn bên nhận hàng");
    }

    if (ghi_chu && ghi_chu.length > MAX_GHI_CHU) {
      throw new ApiError(400, `Ghi chú tối đa ${MAX_GHI_CHU} ký tự`);
    }

    // Mã vận đơn do server sinh; thử lại nếu 2 request cùng lúc sinh trùng mã
    let ma_van_don;

    for (let attempt = 1; ; attempt++) {
      try {
        ma_van_don = await withTransaction(async (connection) => {
          // Khóa dòng lô để 2 lệnh cùng lúc cho một lô xếp hàng nhau
          const [lots] = await connection.execute(
            `
            SELECT
              lo.so_luong_hien_tai,
              lo.don_vi_tinh,
              lo.giai_doan_hien_tai,
              lo.tinh_trang_su_dung,
              lo.ma_nguoi_quan_ly,
              DATE_FORMAT(lo.ngay_thu_hoach, '%Y-%m-%d') AS ngay_thu_hoach,
              nt.ma_nguoi_dung AS ma_chu_nong_trai
            FROM lo_nong_san lo
            LEFT JOIN mua_vu mv
              ON lo.ma_mua_vu = mv.ma_mua_vu
            LEFT JOIN nong_trai nt
              ON mv.ma_nong_trai = nt.ma_nong_trai
            WHERE lo.ma_lo_nong_san = ?
            LIMIT 1
            FOR UPDATE
            `,
            [ma_lo_nong_san],
          );

          // Lô không tồn tại hoặc không thuộc nông dân này: báo chung một lỗi
          if (
            lots.length === 0 ||
            lots[0].tinh_trang_su_dung === "CANCELLED" ||
            (lots[0].ma_chu_nong_trai !== maNguoiDung &&
              lots[0].ma_nguoi_quan_ly !== maNguoiDung)
          ) {
            throw new ApiError(404, "Không tìm thấy lô nông sản");
          }

          const lot = lots[0];

          if (
            lot.tinh_trang_su_dung !== "ACTIVE" ||
            !GIAI_DOAN_CO_THE_VAN_CHUYEN.includes(lot.giai_doan_hien_tai)
          ) {
            throw new ApiError(
              409,
              "Lô không còn ở nông trại nên không thể tạo lệnh vận chuyển",
            );
          }

          if (
            thoi_gian_xuat &&
            lot.ngay_thu_hoach &&
            thoi_gian_xuat.slice(0, 10) < lot.ngay_thu_hoach
          ) {
            throw new ApiError(
              400,
              "Thời gian xuất hàng không được trước ngày thu hoạch của lô",
            );
          }

          const [existing] = await connection.execute(
            `
            SELECT ma_van_don
            FROM lenh_van_chuyen
            WHERE ma_lo_nong_san = ?
              AND trang_thai NOT IN ('TU_CHOI', 'DA_HUY')
            LIMIT 1
            `,
            [ma_lo_nong_san],
          );

          if (existing.length > 0) {
            throw new ApiError(
              409,
              `Lô đã có lệnh vận chuyển ${existing[0].ma_van_don}`,
            );
          }

          if ((await getLotsInInspection(connection, [ma_lo_nong_san])).size) {
            throw new ApiError(
              409,
              "Lô đang có hồ sơ kiểm định chưa hoàn tất, chưa thể vận chuyển",
            );
          }

          const [partners] = await connection.execute(
            `
            SELECT ma_nguoi_dung, vai_tro
            FROM nguoi_dung
            WHERE ma_nguoi_dung IN (?, ?)
              AND trang_thai = 1
            `,
            [ma_don_vi_van_chuyen, ma_ben_nhan],
          );

          const hasRole = (code, role) =>
            partners.some(
              (p) => p.ma_nguoi_dung === code && p.vai_tro === role,
            );

          if (!hasRole(ma_don_vi_van_chuyen, "TRANSPORTER")) {
            throw new ApiError(404, "Không tìm thấy đơn vị vận chuyển");
          }

          if (!hasRole(ma_ben_nhan, "PROCESSOR")) {
            throw new ApiError(404, "Không tìm thấy cơ sở nhận hàng");
          }

          const newCode = await generateOrderCode(connection);

          await connection.execute(
            `
            INSERT INTO lenh_van_chuyen
            (
              ma_van_don,
              ma_lo_nong_san,
              ma_nguoi_gui,
              ma_don_vi_van_chuyen,
              ma_ben_nhan,
              khoi_luong,
              don_vi_tinh,
              thoi_gian_xuat,
              ghi_chu
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()), ?)
            `,
            [
              newCode,
              ma_lo_nong_san,
              maNguoiDung,
              ma_don_vi_van_chuyen,
              ma_ben_nhan,
              lot.so_luong_hien_tai,
              lot.don_vi_tinh,
              thoi_gian_xuat,
              ghi_chu,
            ],
          );

          return newCode;
        });

        break;
      } catch (err) {
        if (err.code === "ER_DUP_ENTRY" && attempt < 3) continue;
        throw err;
      }
    }

    return res.status(201).json({
      success: true,
      message: "Tạo lệnh vận chuyển & bàn giao thành công",
      data: { ma_van_don },
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi tạo lệnh vận chuyển:",
      "Không thể tạo lệnh vận chuyển",
    );
  }
};

/*
==================================================
DANH SÁCH LỆNH CỦA TÔI + SỐ LIỆU 3 Ô ĐẦU TRANG
==================================================
*/

const getMyOrders = async (req, res) => {
  try {
    const maNguoiDung = getFarmerId(req);

    const [rows] = await db.execute(
      `
      ${ORDER_SELECT}
      WHERE v.ma_nguoi_gui = ?
      ORDER BY v.created_at DESC, v.ma_van_don DESC
      `,
      [maNguoiDung],
    );

    const stats = {
      dang_van_chuyen: rows.filter((row) =>
        ["DANG_VAN_CHUYEN", "CHO_TIEP_NHAN"].includes(row.trang_thai),
      ).length,
      da_ban_giao: rows.filter((row) => row.trang_thai === "HOAN_THANH").length,
      khoi_luong_da_xuat_tan:
        Math.round(
          rows
            .filter((row) => TRANG_THAI_DA_XUAT.includes(row.trang_thai))
            .reduce(
              (sum, row) => sum + toTonnes(row.khoi_luong, row.don_vi_tinh),
              0,
            ) * 100,
        ) / 100,
    };

    return res.json({ success: true, data: { lenh: rows, thong_ke: stats } });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy danh sách lệnh vận chuyển:",
      "Không thể lấy danh sách lệnh vận chuyển",
    );
  }
};

/*
==================================================
CHI TIẾT LỆNH
==================================================
*/

const getOrderById = async (req, res) => {
  const { maVanDon } = req.params;

  try {
    const maNguoiDung = getFarmerId(req);

    const [rows] = await db.execute(
      `
      ${ORDER_SELECT}
      WHERE v.ma_van_don = ?
        AND v.ma_nguoi_gui = ?
      LIMIT 1
      `,
      [maVanDon, maNguoiDung],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lệnh vận chuyển",
      });
    }

    return res.json({
      success: true,
      data: {
        ...rows[0],
        co_the_huy: TRANG_THAI_HUY_DUOC.includes(rows[0].trang_thai),
      },
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy chi tiết lệnh vận chuyển:",
      "Không thể lấy chi tiết lệnh vận chuyển",
    );
  }
};

/*
==================================================
HỦY LỆNH (khi xe chưa lấy hàng)
==================================================
*/

const cancelOrder = async (req, res) => {
  const { maVanDon } = req.params;

  try {
    const maNguoiDung = getFarmerId(req);

    await withTransaction(async (connection) => {
      const [rows] = await connection.execute(
        `
        SELECT trang_thai
        FROM lenh_van_chuyen
        WHERE ma_van_don = ?
          AND ma_nguoi_gui = ?
        LIMIT 1
        FOR UPDATE
        `,
        [maVanDon, maNguoiDung],
      );

      if (rows.length === 0) {
        throw new ApiError(404, "Không tìm thấy lệnh vận chuyển");
      }

      if (!TRANG_THAI_HUY_DUOC.includes(rows[0].trang_thai)) {
        throw new ApiError(
          409,
          TRANG_THAI_DONG.includes(rows[0].trang_thai)
            ? "Lệnh đã được đóng, không cần hủy"
            : "Xe đã lấy hàng nên không thể hủy lệnh",
        );
      }

      await connection.execute(
        `UPDATE lenh_van_chuyen SET trang_thai = 'DA_HUY' WHERE ma_van_don = ?`,
        [maVanDon],
      );
    });

    return res.json({
      success: true,
      message: "Hủy lệnh vận chuyển thành công",
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi hủy lệnh vận chuyển:",
      "Không thể hủy lệnh vận chuyển",
    );
  }
};

module.exports = {
  getPartners,
  getReadyBatches,
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
};
