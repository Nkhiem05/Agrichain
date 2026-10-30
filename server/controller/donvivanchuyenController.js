const db = require("../config/db");
const {
  ghiSuKienVanDon,
  goSuKienLenhChuaKy,
  chuaCoViDuyet,
} = require("../services/blockchain/hook");
const { apDungKetQuaVanDon } = require("../services/blockchain/ghiNhan");
const { layCauHinh } = require("../services/blockchain/chainClient");

/*
==================================================
ĐƠN VỊ VẬN CHUYỂN (vai trò TRANSPORTER)
Thao tác trên các lệnh vận chuyển (lenh_van_chuyen) mà nông dân hoặc cơ sở
sơ chế đã chỉ định cho đơn vị này (ma_don_vi_van_chuyen).
Đơn vị vận chuyển quản lý danh sách tài xế (tai_xe) và phương tiện (phuong_tien) của mình; khi chấp nhận chuyến chỉ cần
chọn tài xế + phương tiện từ danh sách, không nhập tay (bên gửi cũng không còn nhập tài xế / biển số).
Luồng trạng thái do đơn vị vận chuyển điều khiển:
  CHO_CHAP_NHAN -> (chấp nhận, chọn tài xế + phương tiện) -> CHO_LAY_HANG
  CHO_LAY_HANG  -> (xác nhận lấy hàng) -> DANG_VAN_CHUYEN
  DANG_VAN_CHUYEN -> (xác nhận đã đến nơi) -> CHO_TIEP_NHAN
  CHO_TIEP_NHAN -> (bên nhận tự xác nhận, không phải đơn vị vận chuyển) -> HOAN_THANH
Có blockchain: bên gửi KHÔNG ký lúc tạo lệnh. Đơn vị vận chuyển chấp nhận (hoặc từ chối) không cần chữ ký nào; sau khi chấp nhận,
bên gửi ký xác nhận lấy hàng đi (sự kiện tạo lệnh), rồi đơn vị vận chuyển mới bấm lấy hàng đi: bước lấy hàng / đến nơi chỉ tạo
sự kiện chờ ký, chuyến chỉ chuyển sang bước sau khi đơn vị vận chuyển ký xong (xem ghiNhan.js).
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
  "Bên gửi chưa ký xác nhận lấy hàng đi lên blockchain. Hãy chờ bên gửi ký xong rồi mới thực hiện bước này.";

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
      // Lệnh còn chờ chấp nhận thì bên gửi chưa phải ký; chỉ sau khi chấp nhận mới là "chờ bên gửi ký xác nhận lấy hàng đi"
      if (e.loai === "TRANSPORT_ORDERED")
        r.chua_ky_lenh = r.trang_thai !== "CHO_CHAP_NHAN";
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

/*
==================================================
TÀI XẾ & PHƯƠNG TIỆN CỦA ĐƠN VỊ VẬN CHUYỂN
CSDL gốc chỉ có hai cột chép tay ten_tai_xe / bien_so_xe trong lenh_van_chuyen (chưa có bảng danh sách), nên hai bảng này
tự tạo ở lần dùng đầu tiên (CREATE TABLE IF NOT EXISTS), không cần chạy migration thủ công. Lúc tạo bảng lần đầu, tài xế và
biển số đã có sẵn trong các chuyến cũ của từng đơn vị được nhập vào danh sách để không phải gõ lại.
Chuyến vận chuyển vẫn lưu bản sao tên tài xế / biển số (lenh_van_chuyen.ten_tai_xe, bien_so_xe) nên sửa hay xóa danh sách
không làm đổi dữ liệu các chuyến đã có.
==================================================
*/

let daBaoDamBang = null;

const bangDaCo = async (ten) => {
  const [r] = await db.query(
    `SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?`,
    [ten],
  );
  return Number(r[0].c) > 0;
};

const baoDamBangTaiXePhuongTien = () => {
  if (!daBaoDamBang) {
    daBaoDamBang = (async () => {
      const coBangTaiXe = await bangDaCo("tai_xe");
      const coBangXe = await bangDaCo("phuong_tien");
      await db.query(
        `
        CREATE TABLE IF NOT EXISTS tai_xe (
          ma_tai_xe varchar(32) NOT NULL,
          ma_don_vi varchar(50) NOT NULL COMMENT 'Đơn vị vận chuyển sở hữu danh sách này',
          ho_ten varchar(150) NOT NULL,
          so_dien_thoai varchar(20) DEFAULT NULL,
          so_giay_phep varchar(50) DEFAULT NULL COMMENT 'Số giấy phép lái xe',
          hang_bang varchar(10) DEFAULT NULL,
          created_at datetime NOT NULL DEFAULT current_timestamp(),
          updated_at datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
          PRIMARY KEY (ma_tai_xe),
          KEY idx_tai_xe_don_vi (ma_don_vi)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `,
      );
      await db.query(
        `
        CREATE TABLE IF NOT EXISTS phuong_tien (
          ma_phuong_tien varchar(32) NOT NULL,
          ma_don_vi varchar(50) NOT NULL COMMENT 'Đơn vị vận chuyển sở hữu danh sách này',
          bien_so varchar(30) NOT NULL,
          loai_xe varchar(100) DEFAULT NULL,
          tai_trong_kg decimal(12,2) DEFAULT NULL,
          created_at datetime NOT NULL DEFAULT current_timestamp(),
          updated_at datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
          PRIMARY KEY (ma_phuong_tien),
          UNIQUE KEY uq_phuong_tien_bien_so (ma_don_vi, bien_so)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `,
      );

      // Bảng vừa được tạo: nhập tài xế / biển số đã có sẵn trong các chuyến cũ của từng đơn vị (chỉ làm một lần)
      try {
        if (!coBangTaiXe) {
          const [cu] = await db.query(
            `
            SELECT DISTINCT ma_don_vi_van_chuyen AS ma_don_vi, TRIM(ten_tai_xe) AS ten
            FROM lenh_van_chuyen
            WHERE ten_tai_xe IS NOT NULL AND TRIM(ten_tai_xe) <> ''
            ORDER BY ma_don_vi_van_chuyen, ten
            `,
          );
          for (const r of cu) {
            const ma = await taoMaMoi(db, "tai_xe", "ma_tai_xe", "TX");
            await db.query(
              `INSERT IGNORE INTO tai_xe (ma_tai_xe, ma_don_vi, ho_ten) VALUES (?, ?, ?)`,
              [ma, r.ma_don_vi, r.ten],
            );
          }
        }
        if (!coBangXe) {
          const [cu] = await db.query(
            `
            SELECT DISTINCT ma_don_vi_van_chuyen AS ma_don_vi, UPPER(TRIM(bien_so_xe)) AS bien_so
            FROM lenh_van_chuyen
            WHERE bien_so_xe IS NOT NULL AND TRIM(bien_so_xe) <> ''
            ORDER BY ma_don_vi_van_chuyen, bien_so
            `,
          );
          for (const r of cu) {
            const ma = await taoMaMoi(
              db,
              "phuong_tien",
              "ma_phuong_tien",
              "PT",
            );
            await db.query(
              `INSERT IGNORE INTO phuong_tien (ma_phuong_tien, ma_don_vi, bien_so) VALUES (?, ?, ?)`,
              [ma, r.ma_don_vi, r.bien_so],
            );
          }
        }
      } catch (err) {
        console.error(
          "Không nhập được tài xế / biển số có sẵn từ các chuyến cũ:",
          err.message,
        );
      }
    })().catch((err) => {
      daBaoDamBang = null; // lần sau thử lại
      throw err;
    });
  }
  return daBaoDamBang;
};

const taoMaMoi = async (executor, bang, cot, tienTo) => {
  const [rows] = await executor.query(
    `
    SELECT COALESCE(MAX(CAST(SUBSTRING(${cot}, ?) AS UNSIGNED)), 0) AS max_no
    FROM ${bang}
    WHERE ${cot} REGEXP ?
    `,
    [tienTo.length + 1, `^${tienTo}[0-9]+$`],
  );
  return tienTo + String(Number(rows[0].max_no) + 1).padStart(3, "0");
};

// Chuyến đang chạy (đã chấp nhận, chưa tới nơi) của từng tài xế / biển số để báo "đang bận"
const CHUYEN_DANG_CHAY = ["CHO_LAY_HANG", "DANG_VAN_CHUYEN"];
const chuyenDangChay = async (executor, maDonVi) => {
  const [rows] = await executor.query(
    `
    SELECT ma_van_don, ten_tai_xe, bien_so_xe FROM lenh_van_chuyen
    WHERE ma_don_vi_van_chuyen = ? AND trang_thai IN (?)
    `,
    [maDonVi, CHUYEN_DANG_CHAY],
  );
  return rows;
};

const SDT_HOP_LE = /^[0-9+][0-9 .-]{6,18}$/;

const docThongTinTaiXe = (body) => {
  const hoTen = cleanText(body?.ho_ten);
  const soDienThoai = cleanText(body?.so_dien_thoai);
  const soGiayPhep = cleanText(body?.so_giay_phep);
  const hangBang = cleanText(body?.hang_bang);
  if (!hoTen) throw new ApiError(400, "Vui lòng nhập họ tên tài xế");
  if (hoTen.length > 150) throw new ApiError(400, "Họ tên tối đa 150 ký tự");
  if (soDienThoai && !SDT_HOP_LE.test(soDienThoai))
    throw new ApiError(400, "Số điện thoại không hợp lệ");
  if (soGiayPhep && soGiayPhep.length > 50)
    throw new ApiError(400, "Số giấy phép tối đa 50 ký tự");
  if (hangBang && hangBang.length > 10)
    throw new ApiError(400, "Hạng bằng tối đa 10 ký tự");
  return {
    hoTen,
    soDienThoai,
    soGiayPhep,
    hangBang: hangBang ? hangBang.toUpperCase() : null,
  };
};

const docThongTinPhuongTien = (body) => {
  const bienSo = cleanText(body?.bien_so);
  const loaiXe = cleanText(body?.loai_xe);
  const taiTrong =
    body?.tai_trong_kg === "" ||
    body?.tai_trong_kg === undefined ||
    body?.tai_trong_kg === null
      ? null
      : toPositiveNumber(body.tai_trong_kg);
  if (!bienSo) throw new ApiError(400, "Vui lòng nhập biển số xe");
  if (bienSo.length > 30) throw new ApiError(400, "Biển số tối đa 30 ký tự");
  if (loaiXe && loaiXe.length > 100)
    throw new ApiError(400, "Loại xe tối đa 100 ký tự");
  if (
    body?.tai_trong_kg !== "" &&
    body?.tai_trong_kg !== undefined &&
    body?.tai_trong_kg !== null &&
    !taiTrong
  ) {
    throw new ApiError(400, "Tải trọng phải là số lớn hơn 0 (kg)");
  }
  return { bienSo: bienSo.toUpperCase(), loaiXe, taiTrong };
};

const getDrivers = async (req, res) => {
  try {
    const maDonVi = getTransporterId(req);
    await baoDamBangTaiXePhuongTien();
    const [rows] = await db.query(
      `SELECT ma_tai_xe, ho_ten, so_dien_thoai, so_giay_phep, hang_bang FROM tai_xe WHERE ma_don_vi = ? ORDER BY ho_ten ASC, ma_tai_xe ASC`,
      [maDonVi],
    );
    const dangChay = await chuyenDangChay(db, maDonVi);
    rows.forEach((r) => {
      r.dang_chay_chuyen =
        dangChay.find((c) => c.ten_tai_xe === r.ho_ten)?.ma_van_don || null;
    });
    return res.json({ success: true, data: rows });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy danh sách tài xế:",
      "Không thể lấy danh sách tài xế",
    );
  }
};

const createDriver = async (req, res) => {
  try {
    const maDonVi = getTransporterId(req);
    await baoDamBangTaiXePhuongTien();
    const t = docThongTinTaiXe(req.body);

    let ma;
    for (let lan = 1; ; lan++) {
      try {
        ma = await taoMaMoi(db, "tai_xe", "ma_tai_xe", "TX");
        await db.query(
          `INSERT INTO tai_xe (ma_tai_xe, ma_don_vi, ho_ten, so_dien_thoai, so_giay_phep, hang_bang) VALUES (?, ?, ?, ?, ?, ?)`,
          [ma, maDonVi, t.hoTen, t.soDienThoai, t.soGiayPhep, t.hangBang],
        );
        break;
      } catch (err) {
        if (err.code === "ER_DUP_ENTRY" && lan < 3) continue;
        throw err;
      }
    }
    return res
      .status(201)
      .json({
        success: true,
        message: "Đã thêm tài xế",
        data: { ma_tai_xe: ma },
      });
  } catch (err) {
    return sendError(res, err, "Lỗi thêm tài xế:", "Không thể thêm tài xế");
  }
};

const updateDriver = async (req, res) => {
  const { maTaiXe } = req.params;
  try {
    const maDonVi = getTransporterId(req);
    await baoDamBangTaiXePhuongTien();
    const t = docThongTinTaiXe(req.body);
    const [kq] = await db.query(
      `UPDATE tai_xe SET ho_ten = ?, so_dien_thoai = ?, so_giay_phep = ?, hang_bang = ? WHERE ma_tai_xe = ? AND ma_don_vi = ?`,
      [t.hoTen, t.soDienThoai, t.soGiayPhep, t.hangBang, maTaiXe, maDonVi],
    );
    if (kq.affectedRows === 0) throw new ApiError(404, "Không tìm thấy tài xế");
    return res.json({ success: true, message: "Đã cập nhật tài xế" });
  } catch (err) {
    return sendError(res, err, "Lỗi sửa tài xế:", "Không thể cập nhật tài xế");
  }
};

const deleteDriver = async (req, res) => {
  const { maTaiXe } = req.params;
  try {
    const maDonVi = getTransporterId(req);
    await baoDamBangTaiXePhuongTien();
    const [rows] = await db.query(
      `SELECT ho_ten FROM tai_xe WHERE ma_tai_xe = ? AND ma_don_vi = ? LIMIT 1`,
      [maTaiXe, maDonVi],
    );
    if (rows.length === 0) throw new ApiError(404, "Không tìm thấy tài xế");
    const dangChay = (await chuyenDangChay(db, maDonVi)).find(
      (c) => c.ten_tai_xe === rows[0].ho_ten,
    );
    if (dangChay) {
      throw new ApiError(
        409,
        `Tài xế đang phụ trách chuyến ${dangChay.ma_van_don}, chưa xóa được`,
      );
    }
    await db.query(`DELETE FROM tai_xe WHERE ma_tai_xe = ? AND ma_don_vi = ?`, [
      maTaiXe,
      maDonVi,
    ]);
    return res.json({ success: true, message: "Đã xóa tài xế" });
  } catch (err) {
    return sendError(res, err, "Lỗi xóa tài xế:", "Không thể xóa tài xế");
  }
};

const getVehicles = async (req, res) => {
  try {
    const maDonVi = getTransporterId(req);
    await baoDamBangTaiXePhuongTien();
    const [rows] = await db.query(
      `SELECT ma_phuong_tien, bien_so, loai_xe, tai_trong_kg FROM phuong_tien WHERE ma_don_vi = ? ORDER BY bien_so ASC`,
      [maDonVi],
    );
    const dangChay = await chuyenDangChay(db, maDonVi);
    rows.forEach((r) => {
      r.dang_chay_chuyen =
        dangChay.find((c) => c.bien_so_xe === r.bien_so)?.ma_van_don || null;
    });
    return res.json({ success: true, data: rows });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy danh sách phương tiện:",
      "Không thể lấy danh sách phương tiện",
    );
  }
};

const createVehicle = async (req, res) => {
  try {
    const maDonVi = getTransporterId(req);
    await baoDamBangTaiXePhuongTien();
    const t = docThongTinPhuongTien(req.body);

    let ma;
    for (let lan = 1; ; lan++) {
      try {
        ma = await taoMaMoi(db, "phuong_tien", "ma_phuong_tien", "PT");
        await db.query(
          `INSERT INTO phuong_tien (ma_phuong_tien, ma_don_vi, bien_so, loai_xe, tai_trong_kg) VALUES (?, ?, ?, ?, ?)`,
          [ma, maDonVi, t.bienSo, t.loaiXe, t.taiTrong],
        );
        break;
      } catch (err) {
        if (
          err.code === "ER_DUP_ENTRY" &&
          /uq_phuong_tien_bien_so/.test(err.message)
        ) {
          throw new ApiError(
            409,
            `Biển số ${t.bienSo} đã có trong danh sách phương tiện`,
          );
        }
        if (err.code === "ER_DUP_ENTRY" && lan < 3) continue;
        throw err;
      }
    }
    return res
      .status(201)
      .json({
        success: true,
        message: "Đã thêm phương tiện",
        data: { ma_phuong_tien: ma },
      });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi thêm phương tiện:",
      "Không thể thêm phương tiện",
    );
  }
};

const updateVehicle = async (req, res) => {
  const { maPhuongTien } = req.params;
  try {
    const maDonVi = getTransporterId(req);
    await baoDamBangTaiXePhuongTien();
    const t = docThongTinPhuongTien(req.body);
    try {
      const [kq] = await db.query(
        `UPDATE phuong_tien SET bien_so = ?, loai_xe = ?, tai_trong_kg = ? WHERE ma_phuong_tien = ? AND ma_don_vi = ?`,
        [t.bienSo, t.loaiXe, t.taiTrong, maPhuongTien, maDonVi],
      );
      if (kq.affectedRows === 0)
        throw new ApiError(404, "Không tìm thấy phương tiện");
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY")
        throw new ApiError(
          409,
          `Biển số ${t.bienSo} đã có trong danh sách phương tiện`,
        );
      throw err;
    }
    return res.json({ success: true, message: "Đã cập nhật phương tiện" });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi sửa phương tiện:",
      "Không thể cập nhật phương tiện",
    );
  }
};

const deleteVehicle = async (req, res) => {
  const { maPhuongTien } = req.params;
  try {
    const maDonVi = getTransporterId(req);
    await baoDamBangTaiXePhuongTien();
    const [rows] = await db.query(
      `SELECT bien_so FROM phuong_tien WHERE ma_phuong_tien = ? AND ma_don_vi = ? LIMIT 1`,
      [maPhuongTien, maDonVi],
    );
    if (rows.length === 0)
      throw new ApiError(404, "Không tìm thấy phương tiện");
    const dangChay = (await chuyenDangChay(db, maDonVi)).find(
      (c) => c.bien_so_xe === rows[0].bien_so,
    );
    if (dangChay) {
      throw new ApiError(
        409,
        `Phương tiện đang chạy chuyến ${dangChay.ma_van_don}, chưa xóa được`,
      );
    }
    await db.query(
      `DELETE FROM phuong_tien WHERE ma_phuong_tien = ? AND ma_don_vi = ?`,
      [maPhuongTien, maDonVi],
    );
    return res.json({ success: true, message: "Đã xóa phương tiện" });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi xóa phương tiện:",
      "Không thể xóa phương tiện",
    );
  }
};

const acceptTrip = async (req, res) => {
  const { maVanDon } = req.params;

  try {
    const maDonVi = getTransporterId(req);
    await baoDamBangTaiXePhuongTien();
    const maTaiXe = cleanText(req.body?.ma_tai_xe);
    const maPhuongTien = cleanText(req.body?.ma_phuong_tien);
    if (!maTaiXe || !maPhuongTien) {
      throw new ApiError(
        400,
        'Hãy chọn tài xế và phương tiện từ danh sách. Nếu chưa có, thêm ở mục "Tài xế & phương tiện"',
      );
    }

    await withTransaction(async (connection) => {
      const [rows] = await connection.execute(
        `SELECT trang_thai FROM lenh_van_chuyen WHERE ma_van_don = ? AND ma_don_vi_van_chuyen = ? LIMIT 1 FOR UPDATE`,
        [maVanDon, maDonVi],
      );

      if (rows.length === 0)
        throw new ApiError(404, "Không tìm thấy chuyến vận chuyển");
      if (rows[0].trang_thai !== "CHO_CHAP_NHAN") {
        throw new ApiError(409, "Chuyến không ở trạng thái chờ chấp nhận");
      }
      // Chấp nhận không cần chữ ký: bên gửi ký xác nhận lấy hàng đi SAU khi đơn vị vận chuyển chấp nhận

      // Tài xế / phương tiện phải thuộc danh sách của chính đơn vị này
      const [taiXe] = await connection.execute(
        `SELECT ho_ten FROM tai_xe WHERE ma_tai_xe = ? AND ma_don_vi = ? LIMIT 1`,
        [maTaiXe, maDonVi],
      );
      if (taiXe.length === 0)
        throw new ApiError(
          404,
          "Không tìm thấy tài xế trong danh sách của bạn",
        );
      const [xe] = await connection.execute(
        `SELECT bien_so FROM phuong_tien WHERE ma_phuong_tien = ? AND ma_don_vi = ? LIMIT 1`,
        [maPhuongTien, maDonVi],
      );
      if (xe.length === 0)
        throw new ApiError(
          404,
          "Không tìm thấy phương tiện trong danh sách của bạn",
        );

      await connection.execute(
        `UPDATE lenh_van_chuyen SET trang_thai = 'CHO_LAY_HANG', ten_tai_xe = ?, bien_so_xe = ? WHERE ma_van_don = ?`,
        [taiXe[0].ho_ten, xe[0].bien_so, maVanDon],
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

      // Bên gửi chưa ký lệnh (luồng mới: chỉ ký sau khi chấp nhận) thì chưa có gì trên chain: từ chối ngay, gỡ sự kiện tạo lệnh
      // chờ ký, không ai phải ký gì.
      const trangThaiKy = layCauHinh().daCauHinh
        ? await trangThaiKyLenh(connection, maVanDon)
        : null;
      if (!trangThaiKy || trangThaiKy !== "CONFIRMED") {
        if (trangThaiKy === "SUBMITTED") {
          throw new ApiError(
            409,
            "Bên gửi vừa ký lệnh, đang chờ blockchain xác nhận. Hãy thử lại sau ít phút",
          );
        }
        if (trangThaiKy && !(await goSuKienLenhChuaKy(connection, maVanDon))) {
          throw new ApiError(
            409,
            "Không gỡ được lệnh đang chờ ký vì lô còn sự kiện khác chờ ký phía sau",
          );
        }
        await apDungKetQuaVanDon(connection, maVanDon, {
          hanh_dong: "TU_CHOI",
          ghi_chu: `Đơn vị vận chuyển từ chối: ${lyDo}`,
        });
        return false;
      }

      // Lệnh đã ký lên chain (lệnh tạo từ bản cũ): đơn vị vận chuyển ký từ chối chuyến (lô ở lại bên gửi).
      // Chuyến chỉ bị từ chối sau khi ký xong.
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
  getDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  acceptTrip,
  rejectTrip,
  confirmPickup,
  confirmArrival,
};
