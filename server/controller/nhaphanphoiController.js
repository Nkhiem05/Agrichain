const db = require("../config/db");
const {
  ghiSuKienVanDon,
  ghiSuKienTuChoiNhanHang,
  chuaCoViDuyet,
  suKienChuaKyCuaLo,
} = require("../services/blockchain/hook");
const {
  daCoBuocChoKy,
  thucHienBuocCoKy,
} = require("../services/blockchain/buocCoKy");
const { apDungKetQuaVanDon } = require("../services/blockchain/ghiNhan");
const { layCauHinh } = require("../services/blockchain/chainClient");

/*
==================================================
NHÀ PHÂN PHỐI (vai trò DISTRIBUTOR)
4 chức năng: tiếp nhận hàng từ cơ sở sơ chế -> quản lý kho -> phân phối cho
đại lý -> quản lý đại lý. Đại lý không có tài khoản đăng nhập trong hệ
thống nên phần "phân phối cho đại lý" chỉ là sổ sách nội bộ của nhà phân
phối (không có bên thứ 2 xác nhận số thực nhận qua hệ thống).
==================================================
*/

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

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

  if (err.code === "ER_NO_SUCH_TABLE") {
    console.error("Thiếu bảng dữ liệu nhà phân phối:", err.message);
    return res.status(500).json({
      success: false,
      message:
        "CSDL chưa có bảng nhà phân phối (chạy file server/migration/nha_phan_phoi.sql)",
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

const getDistributorId = (req) => {
  const user = req.user;

  if (!user?.ma_nguoi_dung) {
    throw new ApiError(401, "Vui lòng đăng nhập để thực hiện chức năng này");
  }

  if (user.vai_tro !== "DISTRIBUTOR") {
    throw new ApiError(403, "Chỉ nhà phân phối mới được dùng chức năng này");
  }

  return user.ma_nguoi_dung;
};

const generateCode = async (
  connection,
  table,
  column,
  prefix,
  padLength = 3,
) => {
  const [rows] = await connection.query(
    `
    SELECT COALESCE(MAX(CAST(SUBSTRING(${column}, ?) AS UNSIGNED)), 0) AS max_no
    FROM ${table}
    WHERE ${column} REGEXP ?
    `,
    [prefix.length + 1, `^${prefix}[0-9]+$`],
  );

  return prefix + String(Number(rows[0].max_no) + 1).padStart(padLength, "0");
};

/*
==================================================
1. TIẾP NHẬN HÀNG TỪ CƠ SỞ SƠ CHẾ
Dùng lại lenh_van_chuyen: ma_ben_nhan = nhà phân phối hiện tại.
==================================================
*/

const INCOMING_SELECT = `
  SELECT
    v.ma_van_don,
    v.ma_lo_nong_san,
    sp.ten_san_pham,
    gui.ho_ten AS ten_nguoi_gui,
    gui.so_dien_thoai AS sdt_nguoi_gui,
    v.ma_don_vi_van_chuyen,
    dv.ho_ten AS ten_don_vi_van_chuyen,
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
  JOIN nguoi_dung gui ON v.ma_nguoi_gui = gui.ma_nguoi_dung
  JOIN nguoi_dung dv ON v.ma_don_vi_van_chuyen = dv.ma_nguoi_dung
`;

// Nhà phân phối chỉ tiếp nhận/từ chối khi đơn vị vận chuyển đã báo "đã đến
// nơi" (CHO_TIEP_NHAN), giống hệt cơ chế của cơ sở sơ chế.
const TRANG_THAI_CO_THE_XU_LY = ["CHO_TIEP_NHAN"];

// Gắn cờ cho từng dòng có ma_van_don: cho_ky = bước nhà phân phối đã bấm và đang chờ ký (hồ sơ chỉ đổi sau khi ký xong).
//   NHAP_KHO | TU_CHOI (nhận hàng từ sơ chế), XUAT_KHO | TOI_NOI (giao cho đại lý), TAO_PHIEU (lệnh giao chưa ký xong)
const gioChoKy = async (rows) => {
  rows.forEach((r) => {
    r.cho_ky = null;
  });
  const dsVanDon = rows.map((r) => r.ma_van_don).filter(Boolean);
  if (dsVanDon.length === 0 || !layCauHinh().daCauHinh) return;
  const [ev] = await db.query(
    `
    SELECT ls.loai_hoat_dong AS loai,
           JSON_UNQUOTE(JSON_EXTRACT(ls.du_lieu_chi_tiet, '$.du_lieu.ma_van_don')) AS ma_van_don
    FROM lich_su_truy_xuat_lo ls
    WHERE ls.blockchain_sync_status <> 'CONFIRMED'
      AND ls.loai_hoat_dong IN ('STOCK_IN_CONFIRMED', 'HANDOVER_REJECTED', 'PICKUP_CONFIRMED', 'DELIVERY_CONFIRMED', 'TRANSPORT_ORDERED')
      AND JSON_UNQUOTE(JSON_EXTRACT(ls.du_lieu_chi_tiet, '$.du_lieu.ma_van_don')) IN (?)
    `,
    [dsVanDon],
  );
  const TEN = {
    STOCK_IN_CONFIRMED: "NHAP_KHO",
    HANDOVER_REJECTED: "TU_CHOI",
    PICKUP_CONFIRMED: "XUAT_KHO",
    DELIVERY_CONFIRMED: "TOI_NOI",
    TRANSPORT_ORDERED: "TAO_PHIEU",
  };
  rows.forEach((r) => {
    const cua = ev.filter((e) => e.ma_van_don === r.ma_van_don);
    // ưu tiên bước muộn nhất đang chờ
    const thuTu = ["TOI_NOI", "XUAT_KHO", "NHAP_KHO", "TU_CHOI", "TAO_PHIEU"];
    const co = cua.map((e) => TEN[e.loai]).sort((x, y) => thuTu.indexOf(x) - thuTu.indexOf(y))[0];
    if (co) r.cho_ky = co;
  });
};

const getIncomingShipments = async (req, res) => {
  try {
    const maNpp = getDistributorId(req);

    const [rows] = await db.execute(
      `
      ${INCOMING_SELECT}
      WHERE v.ma_ben_nhan = ?
        AND v.trang_thai != 'DA_HUY'
      ORDER BY v.created_at DESC, v.ma_van_don DESC
      `,
      [maNpp],
    );
    await gioChoKy(rows);

    return res.json({ success: true, data: rows });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy danh sách lô chờ nhập kho:",
      "Không thể lấy danh sách lô chờ nhập kho",
    );
  }
};

/*
==================================================
QUẢN LÝ KHO CỦA NHÀ PHÂN PHỐI
Bảng kho_phan_phoi tự tạo ở lần dùng đầu tiên (không cần chạy migration). CSDL gốc chỉ lưu tên kho dạng chữ trong
lo_nong_san.vi_tri_luu_kho nên lúc tạo bảng lần đầu, các tên kho đã dùng ở các lô cũ được nhập sẵn vào danh sách.
Nhập kho chỉ chọn kho trong danh sách này; tên kho được lưu vào lo_nong_san.vi_tri_luu_kho như trước nên màn hình
Kho hàng, bộ lọc kho và phiếu xuất không đổi.
==================================================
*/

let daBaoDamBangKho = null;

const taoMaKho = async (executor) =>
  generateCode(executor, "kho_phan_phoi", "ma_kho", "KHO", 3);

const baoDamBangKho = () => {
  if (!daBaoDamBangKho) {
    daBaoDamBangKho = (async () => {
      const [co] = await db.query(
        `SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'kho_phan_phoi'`,
      );
      const daCoBang = Number(co[0].c) > 0;
      await db.query(
        `
        CREATE TABLE IF NOT EXISTS kho_phan_phoi (
          ma_kho varchar(32) NOT NULL,
          ma_nha_phan_phoi varchar(50) NOT NULL COMMENT 'Nhà phân phối sở hữu kho',
          ten_kho varchar(150) NOT NULL,
          dia_chi varchar(255) DEFAULT NULL,
          ghi_chu varchar(255) DEFAULT NULL,
          created_at datetime NOT NULL DEFAULT current_timestamp(),
          updated_at datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
          PRIMARY KEY (ma_kho),
          UNIQUE KEY uq_kho_ten (ma_nha_phan_phoi, ten_kho)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `,
      );
      if (!daCoBang) {
        try {
          const [cu] = await db.query(
            `
            SELECT DISTINCT ma_nguoi_quan_ly AS ma_npp, TRIM(vi_tri_luu_kho) AS ten
            FROM lo_nong_san
            WHERE vi_tri_luu_kho IS NOT NULL AND TRIM(vi_tri_luu_kho) <> ''
              AND ma_nguoi_quan_ly IN (SELECT ma_nguoi_dung FROM nguoi_dung WHERE vai_tro = 'DISTRIBUTOR')
            ORDER BY ma_nguoi_quan_ly, ten
            `,
          );
          for (const r of cu) {
            await db.query(
              `INSERT IGNORE INTO kho_phan_phoi (ma_kho, ma_nha_phan_phoi, ten_kho) VALUES (?, ?, ?)`,
              [await taoMaKho(db), r.ma_npp, r.ten],
            );
          }
        } catch (err) {
          console.error(
            "Không nhập được các kho có sẵn từ lô cũ:",
            err.message,
          );
        }
      }
    })().catch((err) => {
      daBaoDamBangKho = null; // lần sau thử lại
      throw err;
    });
  }
  return daBaoDamBangKho;
};

const docThongTinKho = (body) => {
  const ten = cleanText(body?.ten_kho);
  const diaChi = cleanText(body?.dia_chi);
  const ghiChu = cleanText(body?.ghi_chu);
  if (!ten) throw new ApiError(400, "Vui lòng nhập tên kho");
  if (ten.length > 150) throw new ApiError(400, "Tên kho tối đa 150 ký tự");
  if (diaChi && diaChi.length > 255)
    throw new ApiError(400, "Địa chỉ kho tối đa 255 ký tự");
  if (ghiChu && ghiChu.length > 255)
    throw new ApiError(400, "Ghi chú tối đa 255 ký tự");
  return { ten, diaChi, ghiChu };
};

const getWarehouses = async (req, res) => {
  try {
    const maNpp = getDistributorId(req);
    await baoDamBangKho();
    const [rows] = await db.query(
      `
      SELECT k.ma_kho, k.ten_kho, k.dia_chi, k.ghi_chu,
             (SELECT COUNT(*) FROM lo_nong_san lo
               WHERE lo.ma_nguoi_quan_ly = k.ma_nha_phan_phoi AND lo.vi_tri_luu_kho = k.ten_kho
                 AND lo.tinh_trang_su_dung = 'ACTIVE' AND lo.so_luong_hien_tai > 0) AS so_lo,
             (SELECT COALESCE(SUM(lo.so_luong_hien_tai), 0) FROM lo_nong_san lo
               WHERE lo.ma_nguoi_quan_ly = k.ma_nha_phan_phoi AND lo.vi_tri_luu_kho = k.ten_kho
                 AND lo.tinh_trang_su_dung = 'ACTIVE' AND lo.so_luong_hien_tai > 0) AS tong_khoi_luong
      FROM kho_phan_phoi k
      WHERE k.ma_nha_phan_phoi = ?
      ORDER BY k.ten_kho ASC
      `,
      [maNpp],
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy danh sách kho:",
      "Không thể lấy danh sách kho",
    );
  }
};

const createWarehouse = async (req, res) => {
  try {
    const maNpp = getDistributorId(req);
    await baoDamBangKho();
    const t = docThongTinKho(req.body);

    let ma;
    for (let lan = 1; ; lan++) {
      try {
        ma = await taoMaKho(db);
        await db.query(
          `INSERT INTO kho_phan_phoi (ma_kho, ma_nha_phan_phoi, ten_kho, dia_chi, ghi_chu) VALUES (?, ?, ?, ?, ?)`,
          [ma, maNpp, t.ten, t.diaChi, t.ghiChu],
        );
        break;
      } catch (err) {
        if (err.code === "ER_DUP_ENTRY" && /uq_kho_ten/.test(err.message)) {
          throw new ApiError(409, `Kho "${t.ten}" đã có trong danh sách`);
        }
        if (err.code === "ER_DUP_ENTRY" && lan < 3) continue;
        throw err;
      }
    }
    return res
      .status(201)
      .json({ success: true, message: "Đã tạo kho", data: { ma_kho: ma } });
  } catch (err) {
    return sendError(res, err, "Lỗi tạo kho:", "Không thể tạo kho");
  }
};

const updateWarehouse = async (req, res) => {
  const { maKho } = req.params;
  try {
    const maNpp = getDistributorId(req);
    await baoDamBangKho();
    const t = docThongTinKho(req.body);

    await withTransaction(async (connection) => {
      const [rows] = await connection.query(
        `SELECT ten_kho FROM kho_phan_phoi WHERE ma_kho = ? AND ma_nha_phan_phoi = ? LIMIT 1 FOR UPDATE`,
        [maKho, maNpp],
      );
      if (rows.length === 0) throw new ApiError(404, "Không tìm thấy kho");
      try {
        await connection.query(
          `UPDATE kho_phan_phoi SET ten_kho = ?, dia_chi = ?, ghi_chu = ? WHERE ma_kho = ?`,
          [t.ten, t.diaChi, t.ghiChu, maKho],
        );
      } catch (err) {
        if (err.code === "ER_DUP_ENTRY")
          throw new ApiError(409, `Kho "${t.ten}" đã có trong danh sách`);
        throw err;
      }
      // Đổi tên kho thì các lô đang lưu ở kho đó đổi theo (tên kho được lưu trong từng lô)
      if (rows[0].ten_kho !== t.ten) {
        await connection.query(
          `UPDATE lo_nong_san SET vi_tri_luu_kho = ? WHERE ma_nguoi_quan_ly = ? AND vi_tri_luu_kho = ?`,
          [t.ten, maNpp, rows[0].ten_kho],
        );
      }
    });
    return res.json({ success: true, message: "Đã cập nhật kho" });
  } catch (err) {
    return sendError(res, err, "Lỗi sửa kho:", "Không thể cập nhật kho");
  }
};

const deleteWarehouse = async (req, res) => {
  const { maKho } = req.params;
  try {
    const maNpp = getDistributorId(req);
    await baoDamBangKho();
    const [rows] = await db.query(
      `SELECT ten_kho FROM kho_phan_phoi WHERE ma_kho = ? AND ma_nha_phan_phoi = ? LIMIT 1`,
      [maKho, maNpp],
    );
    if (rows.length === 0) throw new ApiError(404, "Không tìm thấy kho");
    const [lo] = await db.query(
      `
      SELECT COUNT(*) AS c FROM lo_nong_san
      WHERE ma_nguoi_quan_ly = ? AND vi_tri_luu_kho = ? AND tinh_trang_su_dung = 'ACTIVE' AND so_luong_hien_tai > 0
      `,
      [maNpp, rows[0].ten_kho],
    );
    if (Number(lo[0].c) > 0) {
      throw new ApiError(
        409,
        `Kho đang chứa ${lo[0].c} lô hàng, hãy xuất hết hàng khỏi kho trước khi xóa`,
      );
    }
    await db.query(
      `DELETE FROM kho_phan_phoi WHERE ma_kho = ? AND ma_nha_phan_phoi = ?`,
      [maKho, maNpp],
    );
    return res.json({ success: true, message: "Đã xóa kho" });
  } catch (err) {
    return sendError(res, err, "Lỗi xóa kho:", "Không thể xóa kho");
  }
};

const confirmReceive = async (req, res) => {
  const { maVanDon } = req.params;

  try {
    const maNpp = getDistributorId(req);
    const khoiLuongThucTe = toPositiveNumber(req.body?.khoi_luong_thuc_te);
    const maKho = cleanText(req.body?.ma_kho);
    const tenKhoGui = cleanText(req.body?.vi_tri_luu_kho);
    const hanLuuKho = cleanText(req.body?.han_luu_kho);

    if (!khoiLuongThucTe) {
      throw new ApiError(400, "Vui lòng nhập khối lượng cân thực tế hợp lệ");
    }
    if (!maKho && !tenKhoGui) {
      throw new ApiError(400, "Vui lòng chọn kho lưu hàng");
    }

    // Kho phải là kho đã tạo ở mục Quản lý kho của chính nhà phân phối này
    await baoDamBangKho();
    const [khoRows] = await db.query(
      maKho
        ? `SELECT ten_kho FROM kho_phan_phoi WHERE ma_kho = ? AND ma_nha_phan_phoi = ? LIMIT 1`
        : `SELECT ten_kho FROM kho_phan_phoi WHERE ten_kho = ? AND ma_nha_phan_phoi = ? LIMIT 1`,
      [maKho || tenKhoGui, maNpp],
    );
    if (khoRows.length === 0) {
      throw new ApiError(
        400,
        'Kho không có trong danh sách. Hãy tạo kho ở mục "Quản lý kho" rồi chọn kho đó',
      );
    }
    const viTriKho = khoRows[0].ten_kho;

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
        [maVanDon, maNpp],
      );

      if (rows.length === 0) {
        throw new ApiError(404, "Không tìm thấy lệnh vận chuyển");
      }

      if (!TRANG_THAI_CO_THE_XU_LY.includes(rows[0].trang_thai)) {
        throw new ApiError(
          409,
          "Lệnh vận chuyển không ở trạng thái có thể tiếp nhận",
        );
      }

      // Không nhận nhiều hơn khối lượng lô gửi đi (hợp đồng cũng chặn: hao hụt chỉ được giảm)
      if (khoiLuongThucTe > Number(rows[0].so_luong_hien_tai) + 1e-9) {
        throw new ApiError(
          400,
          `Khối lượng thực nhận không được lớn hơn khối lượng lô gửi đi (${Number(rows[0].so_luong_hien_tai)} ${rows[0].don_vi_tinh})`,
        );
      }

      // Blockchain: bên nhận ký nhận hàng kèm khối lượng thực nhận; lô đổi chủ trên chain.
      // Lệnh chỉ hoàn thành và lô chỉ vào kho sau khi nhà phân phối ký xong (ghiNhan.js áp dụng ap_dung).
      if (await daCoBuocChoKy(connection, maVanDon, "HANDOVER_REJECTED")) {
        throw new ApiError(
          409,
          'Bạn đã gửi yêu cầu từ chối lô này và đang chờ ký ở tab "Ký blockchain", không nhập kho được nữa',
        );
      }
      return thucHienBuocCoKy(
        connection,
        maVanDon,
        "STOCK_IN_CONFIRMED",
        maNpp,
        { khoi_luong_nhan: String(khoiLuongThucTe) },
        {
          hanh_dong: "NHAN_HANG",
          khoi_luong_nhan: khoiLuongThucTe,
          nhap_kho: { vi_tri_luu_kho: viTriKho, han_luu_kho: hanLuuKho || null },
        },
      );
    });
    if (choKy) {
      return res.json({
        success: true,
        cho_ky: true,
        message:
          'Đã gửi yêu cầu xác nhận nhập kho. Lô chỉ vào kho của bạn sau khi bạn ký ở tab "Ký blockchain".',
      });
    }
    return res.json({ success: true, message: "Đã nhập kho lô hàng" });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi xác nhận nhập kho:",
      "Không thể xác nhận nhập kho",
    );
  }
};

const rejectReceive = async (req, res) => {
  const { maVanDon } = req.params;

  try {
    const maNpp = getDistributorId(req);
    const lyDo = cleanText(req.body?.ly_do);

    if (!lyDo) {
      throw new ApiError(400, "Vui lòng nhập lý do từ chối");
    }

    const choKy = await withTransaction(async (connection) => {
      const [rows] = await connection.execute(
        `
        SELECT trang_thai
        FROM lenh_van_chuyen
        WHERE ma_van_don = ? AND ma_ben_nhan = ?
        LIMIT 1
        FOR UPDATE
        `,
        [maVanDon, maNpp],
      );

      if (rows.length === 0) {
        throw new ApiError(404, "Không tìm thấy lệnh vận chuyển");
      }

      if (!TRANG_THAI_CO_THE_XU_LY.includes(rows[0].trang_thai)) {
        throw new ApiError(
          409,
          "Lệnh vận chuyển không ở trạng thái có thể từ chối",
        );
      }

      // Blockchain: bên nhận ký từ chối, kèm 2 bước trả hàng (vận chuyển ký đã chở về, bên gửi ký đã nhận lại).
      // Lệnh chỉ chuyển sang "từ chối" sau khi nhà phân phối ký xong bước từ chối của mình.
      if (await daCoBuocChoKy(connection, maVanDon, "STOCK_IN_CONFIRMED")) {
        throw new ApiError(
          409,
          'Bạn đã gửi yêu cầu nhập kho lô này và đang chờ ký ở tab "Ký blockchain", không từ chối được nữa',
        );
      }
      if (await daCoBuocChoKy(connection, maVanDon, "HANDOVER_REJECTED"))
        return true;
      const apDung = {
        hanh_dong: "BEN_NHAN_TU_CHOI",
        ghi_chu: `Nhà phân phối từ chối tiếp nhận: ${lyDo}`,
      };
      const suKien = await ghiSuKienTuChoiNhanHang(
        connection,
        maVanDon,
        apDung,
      );
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
          'Đã gửi yêu cầu từ chối tiếp nhận. Lệnh chỉ chuyển sang "Từ chối" sau khi bạn ký ở tab "Ký blockchain".',
      });
    }
    return res.json({ success: true, message: "Đã từ chối tiếp nhận lô hàng" });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi từ chối tiếp nhận lô:",
      "Không thể từ chối tiếp nhận",
    );
  }
};

/*
==================================================
2. KHO HÀNG
Các lô lo_nong_san đang do nhà phân phối này quản lý. Trạng thái chứng thư
lấy từ hồ sơ kiểm định thật gần nhất của lô (không tự suy diễn).
==================================================
*/

const getInventory = async (req, res) => {
  try {
    const maNpp = getDistributorId(req);

    const [rows] = await db.execute(
      `
      SELECT
        lo.ma_lo_nong_san,
        sp.ten_san_pham,
        lo.vi_tri_luu_kho,
        lo.so_luong_hien_tai,
        lo.don_vi_tinh,
        DATE_FORMAT(lo.han_luu_kho, '%Y-%m-%d') AS han_luu_kho,
        kd.trang_thai_ho_so AS kiem_dinh_trang_thai,
        kd.ket_luan AS kiem_dinh_ket_luan,
        EXISTS (
          SELECT 1 FROM lich_su_truy_xuat_lo ls
          WHERE ls.ma_lo_nong_san = lo.ma_lo_nong_san AND ls.blockchain_sync_status <> 'CONFIRMED'
        ) AS cho_ky
      FROM lo_nong_san lo
      JOIN san_pham_nong_san sp ON lo.ma_san_pham = sp.ma_san_pham
      LEFT JOIN (
        SELECT k1.ma_lo_nong_san, k1.trang_thai_ho_so, k1.ket_luan
        FROM kiem_dinh_lo_hang k1
        INNER JOIN (
          SELECT ma_lo_nong_san, MAX(updated_at) AS max_updated
          FROM kiem_dinh_lo_hang
          GROUP BY ma_lo_nong_san
        ) k2 ON k1.ma_lo_nong_san = k2.ma_lo_nong_san AND k1.updated_at = k2.max_updated
      ) kd ON kd.ma_lo_nong_san = lo.ma_lo_nong_san
      WHERE lo.ma_nguoi_quan_ly = ?
        AND lo.tinh_trang_su_dung = 'ACTIVE'
        AND lo.so_luong_hien_tai > 0
        -- lô xuất đang trên đường giao cho đại lý không còn là tồn kho
        AND NOT EXISTS (
          SELECT 1 FROM lenh_van_chuyen v
          WHERE v.ma_lo_nong_san = lo.ma_lo_nong_san AND v.trang_thai NOT IN ('TU_CHOI', 'DA_HUY', 'HOAN_THANH')
        )
      ORDER BY (lo.han_luu_kho IS NULL), lo.han_luu_kho ASC
      `,
      [maNpp],
    );

    const coChuoi = layCauHinh().daCauHinh;
    const data = rows.map((r) => ({
      ...r,
      cho_ky: coChuoi && Boolean(Number(r.cho_ky)),
      trang_thai_chung_thu:
        r.kiem_dinh_trang_thai === "THU_HOI"
          ? "REVOKED"
          : r.kiem_dinh_trang_thai === "DA_CONG_BO" &&
              r.kiem_dinh_ket_luan === "PASSED"
            ? "VALID"
            : "NONE",
    }));

    return res.json({ success: true, data });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy danh sách kho hàng:",
      "Không thể lấy danh sách kho hàng",
    );
  }
};

/*
==================================================
3. PHÂN PHỐI CHO ĐẠI LÝ
Bảng phieu_xuat_kho riêng (đại lý không có tài khoản để tự xác nhận).
==================================================
*/

const DISPATCH_SELECT = `
  SELECT
    p.ma_phieu,
    p.ma_dai_ly,
    dl.ten AS ten_dai_ly,
    p.ma_lo_nong_san,
    sp.ten_san_pham,
    p.so_luong_xuat,
    p.don_vi_tinh,
    p.hinh_thuc,
    p.ten_don_vi_van_chuyen,
    p.ten_tai_xe,
    p.bien_so_xe,
    p.trang_thai,
    p.ghi_chu,
    p.ma_lo_xuat,
    p.ma_van_don,
    lvc.trang_thai AS trang_thai_van_don,
    lvc.ma_don_vi_van_chuyen,
    dl.ma_nguoi_dung AS tai_khoan_dai_ly,
    DATE_FORMAT(p.thoi_gian_xuat, '%Y-%m-%d %H:%i') AS thoi_gian_xuat,
    DATE_FORMAT(p.thoi_gian_giao, '%Y-%m-%d %H:%i') AS thoi_gian_giao,
    p.created_at
  FROM phieu_xuat_kho p
  JOIN dai_ly dl ON p.ma_dai_ly = dl.ma_dai_ly
  LEFT JOIN lenh_van_chuyen lvc ON lvc.ma_van_don = p.ma_van_don
  JOIN lo_nong_san lo ON p.ma_lo_nong_san = lo.ma_lo_nong_san
  JOIN san_pham_nong_san sp ON lo.ma_san_pham = sp.ma_san_pham
`;

const getDispatchOrders = async (req, res) => {
  try {
    const maNpp = getDistributorId(req);

    const [rows] = await db.execute(
      `
      ${DISPATCH_SELECT}
      WHERE p.ma_nha_phan_phoi = ?
      ORDER BY p.created_at DESC, p.ma_phieu DESC
      `,
      [maNpp],
    );
    await gioChoKy(rows);

    return res.json({ success: true, data: rows });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy danh sách phiếu xuất kho:",
      "Không thể lấy danh sách phiếu xuất kho",
    );
  }
};

const getDispatchDetail = async (req, res) => {
  const { maPhieu } = req.params;

  try {
    const maNpp = getDistributorId(req);

    const [rows] = await db.execute(
      `
      ${DISPATCH_SELECT}
      WHERE p.ma_phieu = ? AND p.ma_nha_phan_phoi = ?
      LIMIT 1
      `,
      [maPhieu, maNpp],
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy phiếu xuất kho" });
    }

    const [dealerRows] = await db.execute(
      `SELECT ten, nguoi_lien_he, so_dien_thoai, dia_chi FROM dai_ly WHERE ma_dai_ly = ? LIMIT 1`,
      [rows[0].ma_dai_ly],
    );

    await gioChoKy([rows[0]]);

    return res.json({
      success: true,
      data: { ...rows[0], dai_ly: dealerRows[0] || null },
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy chi tiết phiếu xuất kho:",
      "Không thể lấy chi tiết phiếu xuất kho",
    );
  }
};

// Lập phiếu xuất kho cho đại lý.
// Có blockchain: GIAO NGUYÊN LÔ đã chọn (không tự tách lô, mã lô giữ nguyên suốt chuỗi) bằng một lệnh bàn giao
// (ma_van_don) tới TÀI KHOẢN đại lý: tự giao thì nhà phân phối là bên vận chuyển, thuê vận chuyển thì chọn tài khoản
// đơn vị vận chuyển. Ai muốn chia nhỏ lô thì tự tách trước. Đại lý ký nhận hàng ở trang của mình.
// Không có blockchain: giữ cách cũ (trừ tồn kho, nhà phân phối tự xác nhận đã giao).
const createDispatch = async (req, res) => {
  try {
    const maNpp = getDistributorId(req);

    const ma_dai_ly = cleanText(req.body?.ma_dai_ly);
    const ma_lo_nong_san = cleanText(req.body?.ma_lo_nong_san);
    let so_luong_xuat = toPositiveNumber(req.body?.so_luong_xuat);
    const hinh_thuc = cleanText(req.body?.hinh_thuc) || "DV_VAN_CHUYEN";
    const ma_don_vi_van_chuyen = cleanText(req.body?.ma_don_vi_van_chuyen);
    let ten_don_vi_van_chuyen = cleanText(req.body?.ten_don_vi_van_chuyen);
    const ten_tai_xe = cleanText(req.body?.ten_tai_xe);
    const bien_so_xe = cleanText(req.body?.bien_so_xe);
    const ghi_chu = cleanText(req.body?.ghi_chu);
    const coChuoi = layCauHinh().daCauHinh;

    if (!ma_dai_ly) throw new ApiError(400, "Vui lòng chọn đại lý nhận hàng");
    if (!ma_lo_nong_san)
      throw new ApiError(400, "Vui lòng chọn lô hàng cần xuất");
    // Có blockchain: giao nguyên lô nên số lượng lấy theo tồn của lô, không cần nhập
    if (!coChuoi && !so_luong_xuat) throw new ApiError(400, "Số lượng xuất phải lớn hơn 0");
    if (!["TU_GIAO", "DV_VAN_CHUYEN"].includes(hinh_thuc)) {
      throw new ApiError(400, "Hình thức giao hàng không hợp lệ");
    }
    if (coChuoi && hinh_thuc === "DV_VAN_CHUYEN" && !ma_don_vi_van_chuyen) {
      throw new ApiError(
        400,
        "Vui lòng chọn đơn vị vận chuyển có tài khoản (họ ký lấy hàng và giao hàng)",
      );
    }

    let maPhieu;

    for (let attempt = 1; ; attempt++) {
      try {
        maPhieu = await withTransaction(async (connection) => {
          const [dealers] = await connection.execute(
            `SELECT ma_dai_ly, ten, dia_chi, ma_nguoi_dung FROM dai_ly WHERE ma_dai_ly = ? AND ma_nha_phan_phoi = ? AND trang_thai = 'HOAT_DONG'`,
            [ma_dai_ly, maNpp],
          );
          if (dealers.length === 0) {
            throw new ApiError(404, "Không tìm thấy đại lý đang hoạt động");
          }
          const dealer = dealers[0];
          if (coChuoi && !dealer.ma_nguoi_dung) {
            throw new ApiError(
              409,
              "Đại lý chưa gắn tài khoản đại lý nên không ký nhận hàng trên blockchain được. Hãy sửa đại lý và chọn tài khoản",
            );
          }

          const [lots] = await connection.execute(
            `
            SELECT ma_mua_vu, ma_san_pham, so_luong_hien_tai, don_vi_tinh, giai_doan_hien_tai, tinh_trang_su_dung,
                   han_luu_kho, vi_tri_luu_kho
            FROM lo_nong_san
            WHERE ma_lo_nong_san = ? AND ma_nguoi_quan_ly = ?
            LIMIT 1
            FOR UPDATE
            `,
            [ma_lo_nong_san, maNpp],
          );
          if (lots.length === 0) {
            throw new ApiError(404, "Không tìm thấy lô hàng thuộc kho của bạn");
          }
          const lot = lots[0];
          if (lot.tinh_trang_su_dung !== "ACTIVE") {
            throw new ApiError(409, "Lô hàng không còn khả dụng");
          }
          if (coChuoi) so_luong_xuat = Number(lot.so_luong_hien_tai);
          // Lô còn bước chưa ký blockchain (ví dụ nhập kho đã bấm nhưng chưa ký) thì chưa lập phiếu phân phối được
          if (coChuoi) {
            const chuaKy = await suKienChuaKyCuaLo(connection, ma_lo_nong_san);
            if (chuaKy) {
              throw new ApiError(
                409,
                `Lô ${ma_lo_nong_san} còn bước "${chuaKy.loai}" chưa ký blockchain. Hãy ký xong ở tab "Ký blockchain" rồi mới lập phiếu phân phối được`,
              );
            }
          }
          if (so_luong_xuat > Number(lot.so_luong_hien_tai)) {
            throw new ApiError(
              409,
              `Số lượng vượt quá tồn kho khả dụng (${lot.so_luong_hien_tai} ${lot.don_vi_tinh})`,
            );
          }
          if (lot.han_luu_kho && new Date(lot.han_luu_kho) < new Date()) {
            throw new ApiError(
              409,
              "Lô hàng đã hết hạn lưu kho, không thể xuất bán",
            );
          }
          const [dangGiao] = await connection.execute(
            `SELECT ma_van_don FROM lenh_van_chuyen WHERE ma_lo_nong_san = ? AND trang_thai NOT IN ('TU_CHOI', 'DA_HUY', 'HOAN_THANH') LIMIT 1`,
            [ma_lo_nong_san],
          );
          if (dangGiao.length > 0) {
            throw new ApiError(
              409,
              `Lô đang trên đường giao (${dangGiao[0].ma_van_don}), không xuất tiếp được`,
            );
          }

          const [kiemDinh] = await connection.execute(
            `
            SELECT trang_thai_ho_so FROM kiem_dinh_lo_hang
            WHERE ma_lo_nong_san = ?
            ORDER BY updated_at DESC
            LIMIT 1
            `,
            [ma_lo_nong_san],
          );
          if (
            kiemDinh.length > 0 &&
            kiemDinh[0].trang_thai_ho_so === "THU_HOI"
          ) {
            throw new ApiError(
              409,
              "Lô hàng đã bị thu hồi chứng thư kiểm định, không thể xuất bán",
            );
          }

          let maVanDon = null;
          let maLoXuat = null;
          if (coChuoi) {
            // Đơn vị vận chuyển: tự giao = chính nhà phân phối; thuê = tài khoản TRANSPORTER
            let donViVc = maNpp;
            if (hinh_thuc === "DV_VAN_CHUYEN") {
              const [vc] = await connection.execute(
                `SELECT ma_nguoi_dung, ho_ten FROM nguoi_dung WHERE ma_nguoi_dung = ? AND vai_tro = 'TRANSPORTER' AND trang_thai = 1`,
                [ma_don_vi_van_chuyen],
              );
              if (vc.length === 0)
                throw new ApiError(404, "Không tìm thấy đơn vị vận chuyển");
              donViVc = vc[0].ma_nguoi_dung;
              ten_don_vi_van_chuyen = vc[0].ho_ten;
            }

            // Giao nguyên lô: lệnh bàn giao đặt trực tiếp trên lô đang chọn, không sinh mã lô mới
            maLoXuat = ma_lo_nong_san;

            maVanDon = await generateCode(
              connection,
              "lenh_van_chuyen",
              "ma_van_don",
              "VD-DL-",
              4,
            );
            await connection.execute(
              `
              INSERT INTO lenh_van_chuyen
              (ma_van_don, ma_lo_nong_san, ma_nguoi_gui, ma_don_vi_van_chuyen, ma_ben_nhan, dia_chi_giao_hang,
               khoi_luong, don_vi_tinh, thoi_gian_xuat, ten_tai_xe, bien_so_xe, ghi_chu, trang_thai)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)
              `,
              [
                maVanDon,
                maLoXuat,
                maNpp,
                donViVc,
                dealer.ma_nguoi_dung,
                dealer.dia_chi,
                so_luong_xuat,
                lot.don_vi_tinh,
                ten_tai_xe,
                bien_so_xe,
                ghi_chu,
                // tự giao: không cần chờ đơn vị vận chuyển chấp nhận chuyến
                hinh_thuc === "TU_GIAO" ? "CHO_LAY_HANG" : "CHO_CHAP_NHAN",
              ],
            );
            // Blockchain: nhà phân phối ký tạo lệnh giao cho đại lý
            await ghiSuKienVanDon(
              connection,
              maVanDon,
              "TRANSPORT_ORDERED",
              maNpp,
            );
          }

          const newCode = await generateCode(
            connection,
            "phieu_xuat_kho",
            "ma_phieu",
            "PXK-",
            4,
          );

          await connection.execute(
            `
            INSERT INTO phieu_xuat_kho
            (ma_phieu, ma_nha_phan_phoi, ma_dai_ly, ma_lo_nong_san, ma_lo_xuat, ma_van_don, so_luong_xuat, don_vi_tinh,
             hinh_thuc, ten_don_vi_van_chuyen, ten_tai_xe, bien_so_xe, ghi_chu)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              newCode,
              maNpp,
              ma_dai_ly,
              ma_lo_nong_san,
              maLoXuat,
              maVanDon,
              so_luong_xuat,
              lot.don_vi_tinh,
              hinh_thuc,
              ten_don_vi_van_chuyen,
              ten_tai_xe,
              bien_so_xe,
              ghi_chu,
            ],
          );

          // Không có blockchain: trừ tồn kho như cách cũ. Có blockchain: lô được giao nguyên, đổi chủ khi đại lý ký nhận
          if (!coChuoi) {
            const conLai =
              Math.round((Number(lot.so_luong_hien_tai) - so_luong_xuat) * 1000) /
              1000;
            await connection.execute(
              `UPDATE lo_nong_san SET so_luong_hien_tai = ? WHERE ma_lo_nong_san = ?`,
              [conLai, ma_lo_nong_san],
            );
          }

          return { maPhieu: newCode, maVanDon };
        });

        break;
      } catch (err) {
        if (err.code === "ER_DUP_ENTRY" && attempt < 3) continue;
        throw err;
      }
    }

    // Các bước ký của lệnh sẽ chờ tới khi các bên có ví được admin duyệt
    let canhBaoVi = "";
    if (maPhieu.maVanDon) {
      try {
        const [[lenh]] = await db.query(
          `SELECT ma_nguoi_gui, ma_don_vi_van_chuyen, ma_ben_nhan FROM lenh_van_chuyen WHERE ma_van_don = ?`,
          [maPhieu.maVanDon],
        );
        const thieu = await chuaCoViDuyet(db, [
          lenh.ma_nguoi_gui,
          lenh.ma_don_vi_van_chuyen,
          lenh.ma_ben_nhan,
        ]);
        if (thieu.length > 0) {
          canhBaoVi = `. Lưu ý: ${thieu.join(", ")} chưa có ví blockchain được duyệt nên các bước ký sẽ chờ`;
        }
      } catch {
        canhBaoVi = "";
      }
    }

    return res.status(201).json({
      success: true,
      // cho_ky: có sự kiện (tách lô, tạo lệnh) cần nhà phân phối ký; xuất kho chỉ làm được sau khi ký xong
      cho_ky: Boolean(maPhieu.maVanDon) && layCauHinh().daCauHinh,
      message: `Đã lập phiếu xuất kho${canhBaoVi}`,
      data: { ma_phieu: maPhieu.maPhieu, ma_van_don: maPhieu.maVanDon },
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lập phiếu xuất kho:",
      "Không thể lập phiếu xuất kho",
    );
  }
};

// Phiếu có vận đơn (blockchain): bước giao do bên vận chuyển ký. Tự giao = nhà phân phối ký ở đây,
// thuê vận chuyển thì đơn vị vận chuyển ký trên trang của họ.
const layPhieu = async (connection, maPhieu, maNpp) => {
  const [rows] = await connection.execute(
    `
    SELECT p.trang_thai, p.ma_lo_nong_san, p.hinh_thuc, p.ma_van_don, lvc.trang_thai AS trang_thai_van_don,
           lvc.ma_lo_nong_san AS ma_lo_van_don
    FROM phieu_xuat_kho p
    LEFT JOIN lenh_van_chuyen lvc ON lvc.ma_van_don = p.ma_van_don
    WHERE p.ma_phieu = ? AND p.ma_nha_phan_phoi = ?
    LIMIT 1
    FOR UPDATE
    `,
    [maPhieu, maNpp],
  );
  if (rows.length === 0)
    throw new ApiError(404, "Không tìm thấy phiếu xuất kho");
  const p = rows[0];
  if (p.ma_van_don && p.hinh_thuc === "DV_VAN_CHUYEN") {
    throw new ApiError(
      409,
      "Phiếu thuê đơn vị vận chuyển: họ xác nhận lấy hàng / giao hàng trên trang Vận chuyển",
    );
  }
  return p;
};

// Lô của phiếu còn sự kiện chưa ký (tách lô, tạo lệnh...) thì chưa xuất kho / giao được: chuỗi của lô ký đúng thứ tự
const canLoDaKy = async (executor, p, loaiBuoc) => {
  if (!p.ma_van_don || !layCauHinh().daCauHinh) return;
  const chua = await suKienChuaKyCuaLo(executor, p.ma_lo_van_don);
  if (chua && chua.loai !== loaiBuoc) {
    throw new ApiError(
      409,
      `Lô ${p.ma_lo_van_don} còn bước "${chua.loai}" chưa ký blockchain. Hãy ký xong bước này ở tab "Ký blockchain" rồi mới làm tiếp được`,
    );
  }
};

const markDispatchShipped = async (req, res) => {
  const { maPhieu } = req.params;

  try {
    const maNpp = getDistributorId(req);

    const choKy = await withTransaction(async (connection) => {
      const p = await layPhieu(connection, maPhieu, maNpp);
      if (p.trang_thai !== "CHO_XUAT") {
        throw new ApiError(409, "Phiếu không ở trạng thái chờ xuất kho");
      }

      if (!p.ma_van_don) {
        // Phiếu cũ (không có lệnh vận chuyển, không ghi blockchain)
        await connection.execute(
          `UPDATE phieu_xuat_kho SET trang_thai = 'DANG_GIAO', thoi_gian_xuat = NOW() WHERE ma_phieu = ?`,
          [maPhieu],
        );
        return false;
      }

      // Blockchain: tự giao nên nhà phân phối ký "đã lấy hàng". Phiếu chỉ chuyển sang "đang giao" sau khi ký xong.
      await canLoDaKy(connection, p, "PICKUP_CONFIRMED");
      return thucHienBuocCoKy(
        connection,
        p.ma_van_don,
        "PICKUP_CONFIRMED",
        maNpp,
        {},
        { hanh_dong: "LAY_HANG" },
      );
    });

    return res.json(
      choKy
        ? {
            success: true,
            cho_ky: true,
            message:
              'Đã gửi yêu cầu xác nhận xuất kho. Phiếu chỉ chuyển sang "đang giao" sau khi bạn ký ở tab "Ký blockchain".',
          }
        : { success: true, message: "Đã xuất kho, đang trên đường giao" },
    );
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi xác nhận xuất kho:",
      "Không thể xác nhận xuất kho",
    );
  }
};

const markDispatchDelivered = async (req, res) => {
  const { maPhieu } = req.params;

  try {
    const maNpp = getDistributorId(req);
    let choDaiLy = false;
    let choKy = false;

    await withTransaction(async (connection) => {
      const p = await layPhieu(connection, maPhieu, maNpp);
      if (p.trang_thai !== "DANG_GIAO") {
        throw new ApiError(409, "Phiếu không ở trạng thái đang giao");
      }

      if (p.ma_van_don) {
        // Có blockchain: hàng tới nơi, đại lý tự ký nhận hàng ở trang đại lý (phiếu hoàn tất khi đó).
        // Lệnh chỉ sang "chờ đại lý nhận" sau khi nhà phân phối ký xong bước "đã tới nơi".
        if (p.trang_thai_van_don === "CHO_TIEP_NHAN") {
          throw new ApiError(
            409,
            "Hàng đã tới nơi, đang chờ đại lý xác nhận nhận hàng",
          );
        }
        if (p.trang_thai_van_don !== "DANG_VAN_CHUYEN") {
          throw new ApiError(409, "Chuyến chưa ở bước đang vận chuyển");
        }
        await canLoDaKy(connection, p, "DELIVERY_CONFIRMED");
        choKy = await thucHienBuocCoKy(
          connection,
          p.ma_van_don,
          "DELIVERY_CONFIRMED",
          maNpp,
          {},
          { hanh_dong: "DEN_NOI" },
        );
        choDaiLy = true;
        return;
      }

      await connection.execute(
        `UPDATE phieu_xuat_kho SET trang_thai = 'DA_GIAO', thoi_gian_giao = NOW() WHERE ma_phieu = ?`,
        [maPhieu],
      );

      await connection.execute(
        `UPDATE lo_nong_san SET giai_doan_hien_tai = 'DISTRIBUTED' WHERE ma_lo_nong_san = ? AND giai_doan_hien_tai != 'DISTRIBUTED'`,
        [p.ma_lo_nong_san],
      );
    });

    if (choKy) {
      return res.json({
        success: true,
        cho_ky: true,
        message:
          'Đã gửi yêu cầu xác nhận tới nơi. Đại lý chỉ nhận hàng được sau khi bạn ký ở tab "Ký blockchain".',
      });
    }
    return res.json({
      success: true,
      message: choDaiLy
        ? "Đã giao tới nơi, chờ đại lý xác nhận nhận hàng"
        : "Đã xác nhận giao hàng thành công",
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi xác nhận giao hàng:",
      "Không thể xác nhận giao hàng",
    );
  }
};

// Đơn vị vận chuyển (tài khoản) để thuê giao cho đại lý
const getTransporters = async (req, res) => {
  try {
    getDistributorId(req);
    const [rows] = await db.execute(
      `SELECT ma_nguoi_dung, ho_ten, so_dien_thoai FROM nguoi_dung WHERE vai_tro = 'TRANSPORTER' AND trang_thai = 1 ORDER BY ho_ten`,
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy đơn vị vận chuyển:",
      "Không thể lấy danh sách đơn vị vận chuyển",
    );
  }
};

// Tài khoản đại lý (RETAILER) chưa gắn với đại lý nào, cộng tài khoản đang gắn với đại lý đang sửa
const getDealerAccounts = async (req, res) => {
  try {
    getDistributorId(req);
    const [rows] = await db.execute(
      `
      SELECT nd.ma_nguoi_dung, nd.ho_ten, nd.ten_dang_nhap, dl.ma_dai_ly
      FROM nguoi_dung nd
      LEFT JOIN dai_ly dl ON dl.ma_nguoi_dung = nd.ma_nguoi_dung
      WHERE nd.vai_tro = 'RETAILER' AND nd.trang_thai = 1
      ORDER BY nd.ho_ten
      `,
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy tài khoản đại lý:",
      "Không thể lấy danh sách tài khoản đại lý",
    );
  }
};

// Kiểm tra tài khoản gắn cho đại lý: phải là RETAILER đang hoạt động và chưa gắn với đại lý khác
const kiemTraTaiKhoanDaiLy = async (
  executor,
  maNguoiDung,
  maDaiLyHienTai = null,
) => {
  if (!maNguoiDung) return null;
  const [rows] = await executor.execute(
    `
    SELECT nd.ma_nguoi_dung, dl.ma_dai_ly
    FROM nguoi_dung nd
    LEFT JOIN dai_ly dl ON dl.ma_nguoi_dung = nd.ma_nguoi_dung
    WHERE nd.ma_nguoi_dung = ? AND nd.vai_tro = 'RETAILER' AND nd.trang_thai = 1
    LIMIT 1
    `,
    [maNguoiDung],
  );
  if (rows.length === 0)
    throw new ApiError(404, "Không tìm thấy tài khoản đại lý đang hoạt động");
  if (rows[0].ma_dai_ly && rows[0].ma_dai_ly !== maDaiLyHienTai) {
    throw new ApiError(409, "Tài khoản này đã gắn với một đại lý khác");
  }
  return maNguoiDung;
};

/*
==================================================
4. ĐẠI LÝ
Do nhà phân phối tự quản lý, không phải tài khoản đăng nhập hệ thống.
==================================================
*/

const getDealers = async (req, res) => {
  try {
    const maNpp = getDistributorId(req);

    const [rows] = await db.execute(
      `
      SELECT dl.ma_dai_ly, dl.ten, dl.nguoi_lien_he, dl.so_dien_thoai, dl.dia_chi, dl.trang_thai,
             dl.ma_nguoi_dung, nd.ten_dang_nhap AS tai_khoan
      FROM dai_ly dl
      LEFT JOIN nguoi_dung nd ON nd.ma_nguoi_dung = dl.ma_nguoi_dung
      WHERE dl.ma_nha_phan_phoi = ?
      ORDER BY dl.created_at DESC
      `,
      [maNpp],
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy danh sách đại lý:",
      "Không thể lấy danh sách đại lý",
    );
  }
};

const createDealer = async (req, res) => {
  try {
    const maNpp = getDistributorId(req);

    const ten = cleanText(req.body?.ten);
    const nguoi_lien_he = cleanText(req.body?.nguoi_lien_he);
    const so_dien_thoai = cleanText(req.body?.so_dien_thoai);
    const dia_chi = cleanText(req.body?.dia_chi);
    const ma_nguoi_dung = cleanText(req.body?.ma_nguoi_dung);

    if (!ten) throw new ApiError(400, "Vui lòng nhập tên đại lý");
    if (!so_dien_thoai) throw new ApiError(400, "Vui lòng nhập số điện thoại");

    const maDaiLy = await withTransaction(async (connection) => {
      await kiemTraTaiKhoanDaiLy(connection, ma_nguoi_dung);
      const newCode = await generateCode(
        connection,
        "dai_ly",
        "ma_dai_ly",
        "DL",
        3,
      );

      await connection.execute(
        `INSERT INTO dai_ly (ma_dai_ly, ma_nha_phan_phoi, ten, nguoi_lien_he, so_dien_thoai, dia_chi, ma_nguoi_dung) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          newCode,
          maNpp,
          ten,
          nguoi_lien_he,
          so_dien_thoai,
          dia_chi,
          ma_nguoi_dung,
        ],
      );

      return newCode;
    });

    return res.status(201).json({
      success: true,
      message: "Đã thêm đại lý mới",
      data: { ma_dai_ly: maDaiLy },
    });
  } catch (err) {
    return sendError(res, err, "Lỗi thêm đại lý:", "Không thể thêm đại lý");
  }
};

const updateDealer = async (req, res) => {
  const { maDaiLy } = req.params;

  try {
    const maNpp = getDistributorId(req);

    const ten = cleanText(req.body?.ten);
    const nguoi_lien_he = cleanText(req.body?.nguoi_lien_he);
    const so_dien_thoai = cleanText(req.body?.so_dien_thoai);
    const dia_chi = cleanText(req.body?.dia_chi);
    const ma_nguoi_dung = cleanText(req.body?.ma_nguoi_dung);

    if (!ten) throw new ApiError(400, "Vui lòng nhập tên đại lý");
    if (!so_dien_thoai) throw new ApiError(400, "Vui lòng nhập số điện thoại");
    await kiemTraTaiKhoanDaiLy(db, ma_nguoi_dung, maDaiLy);

    const [result] = await db.execute(
      `UPDATE dai_ly SET ten = ?, nguoi_lien_he = ?, so_dien_thoai = ?, dia_chi = ?, ma_nguoi_dung = ? WHERE ma_dai_ly = ? AND ma_nha_phan_phoi = ?`,
      [
        ten,
        nguoi_lien_he,
        so_dien_thoai,
        dia_chi,
        ma_nguoi_dung,
        maDaiLy,
        maNpp,
      ],
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đại lý" });
    }

    return res.json({ success: true, message: "Đã cập nhật đại lý" });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi cập nhật đại lý:",
      "Không thể cập nhật đại lý",
    );
  }
};

const toggleDealerStatus = async (req, res) => {
  const { maDaiLy } = req.params;

  try {
    const maNpp = getDistributorId(req);

    const [rows] = await db.execute(
      `SELECT trang_thai FROM dai_ly WHERE ma_dai_ly = ? AND ma_nha_phan_phoi = ? LIMIT 1`,
      [maDaiLy, maNpp],
    );
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đại lý" });
    }

    const newStatus =
      rows[0].trang_thai === "HOAT_DONG" ? "NGUNG" : "HOAT_DONG";
    await db.execute(`UPDATE dai_ly SET trang_thai = ? WHERE ma_dai_ly = ?`, [
      newStatus,
      maDaiLy,
    ]);

    return res.json({
      success: true,
      message: "Đã cập nhật trạng thái đại lý",
      data: { trang_thai: newStatus },
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi đổi trạng thái đại lý:",
      "Không thể đổi trạng thái đại lý",
    );
  }
};

const getDealerHistory = async (req, res) => {
  const { maDaiLy } = req.params;

  try {
    const maNpp = getDistributorId(req);

    const [dealerRows] = await db.execute(
      `SELECT ma_dai_ly FROM dai_ly WHERE ma_dai_ly = ? AND ma_nha_phan_phoi = ? LIMIT 1`,
      [maDaiLy, maNpp],
    );
    if (dealerRows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đại lý" });
    }

    const [rows] = await db.execute(
      `
      ${DISPATCH_SELECT}
      WHERE p.ma_dai_ly = ? AND p.ma_nha_phan_phoi = ?
      ORDER BY p.created_at DESC
      `,
      [maDaiLy, maNpp],
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy lịch sử giao dịch đại lý:",
      "Không thể lấy lịch sử giao dịch",
    );
  }
};

module.exports = {
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getIncomingShipments,
  confirmReceive,
  rejectReceive,
  getInventory,
  getDispatchOrders,
  getDispatchDetail,
  createDispatch,
  markDispatchShipped,
  markDispatchDelivered,
  getDealers,
  createDealer,
  updateDealer,
  toggleDealerStatus,
  getDealerHistory,
  getTransporters,
  getDealerAccounts,
};
