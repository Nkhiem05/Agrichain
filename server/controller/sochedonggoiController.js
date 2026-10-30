const db = require("../config/db");
const {
  ghiSuKienVanDon,
  ghiSuKienTuChoiNhanHang,
  ghiSuKienLoCon,
  ghiSuKienGiaiDoanSoChe,
  xoaSuKienChuaKy,
  goSuKienSoCheChuaKy,
  suKienChuaKyCuaLo,
  chuaCoViDuyet,
} = require("../services/blockchain/hook");
const { apDungKetQuaVanDon } = require("../services/blockchain/ghiNhan");
const {
  layCauHinh,
  timMaLoChuaCoTrenChain,
} = require("../services/blockchain/chainClient");

/*
==================================================
CƠ SỞ SƠ CHẾ / ĐÓNG GÓI (vai trò PROCESSOR)
4 chức năng: tiếp nhận lô -> sơ chế đóng gói -> tách/gộp lô -> bàn giao vận chuyển.
Danh tính cơ sở lấy từ token đăng nhập (req.user, do checkAuth gắn vào).
Có blockchain: mỗi bước của cơ sở tạo một sự kiện chờ ký và chỉ có hiệu lực sau khi cơ sở ký xong (tab Ký blockchain):
  - tiếp nhận / từ chối lô: lệnh chỉ đổi trạng thái, lô chỉ vào kho sau khi ký (xem ghiNhan.js)
  - đổi giai đoạn sơ chế (đóng gói / hoàn tất): giai đoạn chỉ đổi sau khi ký
  - sơ chế làm ngay trên lô đã nhận, GIỮ NGUYÊN MÃ LÔ do nông dân tạo (không sinh mã lô mới)
  - tách / gộp lô: lô mới phải ký xong thì mới sơ chế tiếp, tách, gộp hay bàn giao được
  - tạo lệnh bàn giao: đơn vị vận chuyển chỉ thực hiện được sau khi cơ sở ký lệnh
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

const cleanText = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
};

const toPositiveNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.round(num * 1000) / 1000 : null;
};

// Trả về { status, message } cho lỗi nghiệp vụ, còn lại là lỗi 500
const sendError = (res, err, logMessage, fallbackMessage) => {
  if (err instanceof ApiError) {
    return res
      .status(err.status)
      .json({ success: false, message: err.message });
  }

  if (err.code === "ER_NO_SUCH_TABLE") {
    console.error("Thiếu bảng dữ liệu sơ chế:", err.message);
    return res.status(500).json({
      success: false,
      message:
        "CSDL chưa có bảng sơ chế đóng gói (chạy file server/migration/so_che_dong_goi.sql)",
    });
  }

  console.error(logMessage, err);
  return res.status(500).json({ success: false, message: fallbackMessage });
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

// Chỉ cơ sở sơ chế mới dùng các chức năng này
const getProcessorId = (req) => {
  const user = req.user;

  if (!user?.ma_nguoi_dung) {
    throw new ApiError(401, "Vui lòng đăng nhập để thực hiện chức năng này");
  }

  if (user.vai_tro !== "PROCESSOR") {
    throw new ApiError(
      403,
      "Chỉ cơ sở sơ chế / đóng gói mới được dùng chức năng này",
    );
  }

  return user.ma_nguoi_dung;
};

// Mã dạng PREFIXnnn, tự tăng dần, không trùng với mã đã có
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
1. TIẾP NHẬN LÔ NÔNG SẢN
Dùng lại lenh_van_chuyen: ma_ben_nhan = cơ sở sơ chế hiện tại.
==================================================
*/

const INCOMING_SELECT = `
  SELECT
    v.ma_van_don,
    v.ma_lo_nong_san,
    sp.ten_san_pham,
    nt.ten_nong_trai,
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
  LEFT JOIN mua_vu mv ON lo.ma_mua_vu = mv.ma_mua_vu
  LEFT JOIN nong_trai nt ON mv.ma_nong_trai = nt.ma_nong_trai
`;

// Cơ sở chỉ tiếp nhận/từ chối khi đơn vị vận chuyển đã báo "đã đến nơi"
// (CHO_TIEP_NHAN). Các bước trước đó (chấp nhận lệnh, lấy hàng, đang vận
// chuyển) do đơn vị vận chuyển tự điều khiển ở trang riêng của họ.
const TRANG_THAI_CO_THE_XU_LY = ["CHO_TIEP_NHAN"];

// Lệnh bàn giao đang chạy của lô (chưa hoàn thành / hủy / từ chối). Lô đang trên đường giao thì
// không sơ chế / tách / gộp / đổi giai đoạn được (trên chain lô đang có lệnh cũng bị chặn các thao tác này).
const lenhDangChayCuaLo = async (connection, maLo) => {
  const [rows] = await connection.query(
    `SELECT ma_van_don FROM lenh_van_chuyen WHERE ma_lo_nong_san = ? AND trang_thai NOT IN ('TU_CHOI', 'DA_HUY', 'HOAN_THANH') LIMIT 1`,
    [maLo],
  );
  return rows[0]?.ma_van_don || null;
};

// Tên bước (loại sự kiện) để báo người dùng đang vướng bước nào chưa ký
const TEN_BUOC_KY = {
  HARVEST_CONFIRMED: "chốt thu hoạch",
  SAMPLING_SEALED: "niêm phong mẫu kiểm định",
  SAMPLING_CONFIRMED: "xác nhận lấy mẫu",
  CERTIFICATE_ISSUED: "công bố chứng nhận",
  CERTIFICATE_FAILED: "công bố không đạt",
  CERTIFICATE_REVOKED: "thu hồi chứng nhận",
  TRANSPORT_ORDERED: "tạo lệnh bàn giao",
  PICKUP_CONFIRMED: "xác nhận lấy hàng",
  DELIVERY_CONFIRMED: "xác nhận đến nơi",
  STOCK_IN_CONFIRMED: "xác nhận nhận hàng",
  HANDOVER_REJECTED: "từ chối nhận hàng",
  RETURN_SHIPPED: "xác nhận chở hàng trả về",
  RETURN_RECEIVED: "xác nhận nhận lại hàng",
  BATCH_RELATION: "tạo lô (sơ chế / tách / gộp)",
  PROCESSING_DONE: "hoàn tất sơ chế",
  PACKAGING_DONE: "hoàn tất đóng gói",
  CORRECTION: "đính chính",
};

// Lý do lô chưa đi tiếp được vì còn sự kiện chưa ký blockchain (null nếu không vướng gì).
// Các sự kiện của một lô phải ký đúng thứ tự nên mọi bước tiếp theo của lô đều chờ sự kiện này.
const lyDoLoChuaKy = async (executor, maLo, maCoSo) => {
  if (!layCauHinh().daCauHinh) return null;
  const sk = await suKienChuaKyCuaLo(executor, maLo);
  if (!sk) return null;
  const buoc = TEN_BUOC_KY[sk.loai] || sk.loai;
  return sk.ma_nguoi_ky === maCoSo
    ? `Lô ${maLo} còn bước "${buoc}" chưa ký blockchain. Hãy vào tab "Ký blockchain" ký xong bước này trước`
    : `Lô ${maLo} đang chờ ${sk.ma_nguoi_ky} ký bước "${buoc}" trên blockchain`;
};

// Chặn thao tác khi lô còn sự kiện chưa ký
const canLoDaKy = async (executor, maLo, maCoSo, hanhDong) => {
  const lyDo = await lyDoLoChuaKy(executor, maLo, maCoSo);
  if (lyDo) throw new ApiError(409, `${lyDo}, rồi mới ${hanhDong} được.`);
};

// Gắn cờ ký cho từng dòng (mỗi dòng có mã lô ở trường `truong`):
//   chua_ky_lo       lô còn sự kiện chưa ký blockchain
//   ly_do_chua_ky    nói rõ bước nào, ai phải ký
//   cho_ky_giai_doan giai đoạn sơ chế đang chờ ký mới áp dụng (nếu có)
const ganTrangThaiKy = async (executor, rows, truong, maCoSo) => {
  rows.forEach((r) => {
    r.chua_ky_lo = false;
    r.ly_do_chua_ky = "";
    r.cho_ky_giai_doan = null;
  });
  if (rows.length === 0 || !layCauHinh().daCauHinh) return;
  const [ev] = await executor.query(
    `
    SELECT ls.ma_lo_nong_san, ls.loai_hoat_dong AS loai, ls.ma_nguoi_dung AS ma_nguoi_ky,
           JSON_UNQUOTE(JSON_EXTRACT(o.payload, '$.tham_so.ap_dung.giai_doan')) AS giai_doan
    FROM lich_su_truy_xuat_lo ls
    JOIN blockchain_outbox o ON o.event_id = ls.ma_lich_su
    WHERE ls.blockchain_sync_status <> 'CONFIRMED' AND ls.ma_lo_nong_san IN (?)
    ORDER BY ls.ma_lo_nong_san, ls.so_thu_tu_su_kien
    `,
    [[...new Set(rows.map((r) => r[truong]))]],
  );
  rows.forEach((r) => {
    const cua = ev.filter((e) => e.ma_lo_nong_san === r[truong]);
    if (cua.length === 0) return;
    const dau = cua[0];
    const buoc = TEN_BUOC_KY[dau.loai] || dau.loai;
    r.chua_ky_lo = true;
    r.ly_do_chua_ky =
      dau.ma_nguoi_ky === maCoSo
        ? `Lô ${r[truong]} còn bước "${buoc}" chưa ký blockchain. Hãy vào tab "Ký blockchain" ký xong bước này trước.`
        : `Lô ${r[truong]} đang chờ ${dau.ma_nguoi_ky} ký bước "${buoc}" trên blockchain.`;
    r.cho_ky_giai_doan = cua.find((e) => e.giai_doan)?.giai_doan || null;
  });
};

// Lệnh vận chuyển có đang chờ cơ sở ký bước nào không (cho_ky = NHAN_HANG | TU_CHOI_NHAN; cho_ky_lenh = lệnh bàn giao chưa ký)
const ganChoKyVanDon = async (executor, rows) => {
  rows.forEach((r) => {
    r.cho_ky = null;
    r.cho_ky_lenh = false;
  });
  if (rows.length === 0 || !layCauHinh().daCauHinh) return;
  const [ev] = await executor.query(
    `
    SELECT ls.loai_hoat_dong AS loai,
           JSON_UNQUOTE(JSON_EXTRACT(ls.du_lieu_chi_tiet, '$.du_lieu.ma_van_don')) AS ma_van_don
    FROM lich_su_truy_xuat_lo ls
    WHERE ls.blockchain_sync_status <> 'CONFIRMED'
      AND ls.loai_hoat_dong IN ('TRANSPORT_ORDERED', 'STOCK_IN_CONFIRMED', 'HANDOVER_REJECTED')
      AND JSON_UNQUOTE(JSON_EXTRACT(ls.du_lieu_chi_tiet, '$.du_lieu.ma_van_don')) IN (?)
    `,
    [rows.map((r) => r.ma_van_don)],
  );
  rows.forEach((r) => {
    ev.filter((e) => e.ma_van_don === r.ma_van_don).forEach((e) => {
      if (e.loai === "STOCK_IN_CONFIRMED") r.cho_ky = "NHAN_HANG";
      else if (e.loai === "HANDOVER_REJECTED") r.cho_ky = "TU_CHOI_NHAN";
      else if (e.loai === "TRANSPORT_ORDERED") r.cho_ky_lenh = true;
    });
  });
};

// Bước của lệnh vận chuyển đã bấm và đang chờ ký (tránh tạo trùng sự kiện khi bấm lại)
const daCoBuocChoKy = async (executor, maVanDon, loai) => {
  const [rows] = await executor.query(
    `
    SELECT ma_lich_su FROM lich_su_truy_xuat_lo
    WHERE loai_hoat_dong = ? AND blockchain_sync_status <> 'CONFIRMED'
      AND JSON_UNQUOTE(JSON_EXTRACT(du_lieu_chi_tiet, '$.du_lieu.ma_van_don')) = ?
    LIMIT 1
    `,
    [loai, maVanDon],
  );
  return rows.length > 0;
};

// Cơ sở chưa có ví blockchain được duyệt thì không ký được: nhắc ngay khi tạo yêu cầu ký
const nhacViCoSo = async (maCoSo) => {
  try {
    const thieu = await chuaCoViDuyet(db, [maCoSo]);
    return thieu.length > 0
      ? " Lưu ý: tài khoản của bạn chưa có ví blockchain được duyệt, hãy liên kết ví ở Trang cá nhân và chờ quản trị viên duyệt để ký được."
      : "";
  } catch {
    return "";
  }
};

const getIncomingShipments = async (req, res) => {
  try {
    const maCoSo = getProcessorId(req);

    const [rows] = await db.execute(
      `
      ${INCOMING_SELECT}
      WHERE v.ma_ben_nhan = ?
        AND v.trang_thai != 'DA_HUY'
      ORDER BY v.created_at DESC, v.ma_van_don DESC
      `,
      [maCoSo],
    );
    await ganChoKyVanDon(db, rows);

    return res.json({ success: true, data: rows });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy danh sách lô chờ tiếp nhận:",
      "Không thể lấy danh sách lô chờ tiếp nhận",
    );
  }
};

const confirmReceive = async (req, res) => {
  const { maVanDon } = req.params;

  try {
    const maCoSo = getProcessorId(req);
    const khoiLuongThucTe = toPositiveNumber(req.body?.khoi_luong_thuc_te);

    if (!khoiLuongThucTe) {
      throw new ApiError(400, "Vui lòng nhập khối lượng cân thực tế hợp lệ");
    }

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
        [maVanDon, maCoSo],
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
      // Lệnh chỉ hoàn thành và lô chỉ vào kho sau khi cơ sở ký xong (ghiNhan.js áp dụng ap_dung).
      if (await daCoBuocChoKy(connection, maVanDon, "HANDOVER_REJECTED")) {
        throw new ApiError(
          409,
          'Bạn đã gửi yêu cầu từ chối lô này và đang chờ ký ở tab "Ký blockchain", không tiếp nhận được nữa',
        );
      }
      if (await daCoBuocChoKy(connection, maVanDon, "STOCK_IN_CONFIRMED"))
        return true;
      const apDung = {
        hanh_dong: "NHAN_HANG",
        khoi_luong_nhan: khoiLuongThucTe,
      };
      const suKien = await ghiSuKienVanDon(
        connection,
        maVanDon,
        "STOCK_IN_CONFIRMED",
        maCoSo,
        { khoi_luong_nhan: String(khoiLuongThucTe) },
        apDung,
      );
      if (!layCauHinh().daCauHinh || !suKien) {
        // Không có blockchain hoặc lô cũ không được theo dõi: tiếp nhận ngay
        await apDungKetQuaVanDon(connection, maVanDon, apDung);
        return false;
      }
      return true;
    });

    if (choKy) {
      return res.json({
        success: true,
        cho_ky: true,
        message: `Đã gửi yêu cầu xác nhận nhận hàng. Lô chỉ vào kho của bạn sau khi bạn ký ở tab "Ký blockchain".${await nhacViCoSo(maCoSo)}`,
      });
    }
    return res.json({ success: true, message: "Đã tiếp nhận lô hàng vào kho" });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi xác nhận tiếp nhận lô:",
      "Không thể xác nhận tiếp nhận",
    );
  }
};

const rejectReceive = async (req, res) => {
  const { maVanDon } = req.params;

  try {
    const maCoSo = getProcessorId(req);
    const lyDo = cleanText(req.body?.ly_do);

    if (!lyDo) {
      throw new ApiError(400, "Vui lòng nhập lý do từ chối");
    }
    if (lyDo.length > MAX_GHI_CHU) {
      throw new ApiError(400, `Lý do tối đa ${MAX_GHI_CHU} ký tự`);
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
        [maVanDon, maCoSo],
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
      // Lệnh chỉ chuyển sang "từ chối" sau khi cơ sở ký xong bước từ chối của mình.
      if (await daCoBuocChoKy(connection, maVanDon, "STOCK_IN_CONFIRMED")) {
        throw new ApiError(
          409,
          'Bạn đã gửi yêu cầu tiếp nhận lô này và đang chờ ký ở tab "Ký blockchain", không từ chối được nữa',
        );
      }
      if (await daCoBuocChoKy(connection, maVanDon, "HANDOVER_REJECTED"))
        return true;
      const apDung = {
        hanh_dong: "BEN_NHAN_TU_CHOI",
        ghi_chu: `Cơ sở từ chối tiếp nhận: ${lyDo}`,
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
        message: `Đã gửi yêu cầu từ chối tiếp nhận. Lệnh chỉ chuyển sang "Từ chối" sau khi bạn ký ở tab "Ký blockchain".${await nhacViCoSo(maCoSo)}`,
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
2. SƠ CHẾ & ĐÓNG GÓI
1 lô vừa tiếp nhận (RECEIVED) được "biến đổi" (TRANSFORM) thành 1 lô mới.
==================================================
*/

const getAvailableRawLots = async (req, res) => {
  try {
    const maCoSo = getProcessorId(req);

    const [rows] = await db.execute(
      `
      SELECT lo.ma_lo_nong_san, sp.ten_san_pham, lo.so_luong_hien_tai, lo.don_vi_tinh
      FROM lo_nong_san lo
      JOIN san_pham_nong_san sp ON lo.ma_san_pham = sp.ma_san_pham
      WHERE lo.ma_nguoi_quan_ly = ?
        AND lo.tinh_trang_su_dung = 'ACTIVE'
        AND lo.giai_doan_hien_tai = 'RECEIVED'
      ORDER BY lo.updated_at DESC
      `,
      [maCoSo],
    );
    await ganTrangThaiKy(db, rows, "ma_lo_nong_san", maCoSo);

    return res.json({ success: true, data: rows });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy danh sách lô đã tiếp nhận:",
      "Không thể lấy danh sách lô đã tiếp nhận",
    );
  }
};

const PROCESSING_SELECT = `
  SELECT
    sc.ma_so_che,
    sc.ma_lo_moi,
    sc.tieu_de,
    sc.khu_vuc_so_che,
    sc.quy_cach_tieu_chuan,
    sc.giai_doan_so_che,
    sc.ngay_bat_dau,
    sc.ngay_hoan_tat,
    sc.created_at,
    lo.so_luong_hien_tai,
    lo.don_vi_tinh,
    sp.ten_san_pham,
    nguon.ma_lo_nguon,
    loNguon.so_luong_hien_tai AS khoi_luong_nguon_con_lai
  FROM so_che_lo_hang sc
  JOIN lo_nong_san lo ON sc.ma_lo_moi = lo.ma_lo_nong_san
  JOIN san_pham_nong_san sp ON lo.ma_san_pham = sp.ma_san_pham
  LEFT JOIN lien_ket_nguon_goc_lo nguon
    ON nguon.ma_lo_duoc_tao_ra = sc.ma_lo_moi AND nguon.loai_lien_ket = 'TRANSFORM'
  LEFT JOIN lo_nong_san loNguon ON nguon.ma_lo_nguon = loNguon.ma_lo_nong_san
`;

const getProcessingBatches = async (req, res) => {
  try {
    const maCoSo = getProcessorId(req);

    const [rows] = await db.execute(
      `
      ${PROCESSING_SELECT}
      WHERE sc.ma_co_so = ?
      ORDER BY sc.created_at DESC
      `,
      [maCoSo],
    );
    await ganTrangThaiKy(db, rows, "ma_lo_moi", maCoSo);

    return res.json({ success: true, data: rows });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy danh sách lô sơ chế:",
      "Không thể lấy danh sách lô sơ chế",
    );
  }
};

// Sơ chế làm ngay trên lô đã tiếp nhận: lô GIỮ NGUYÊN MÃ do nông dân tạo, không sinh lô mới, không trừ khối lượng,
// không có sự kiện tạo lô trên blockchain. so_che_lo_hang.ma_lo_moi chính là mã lô đó.
const createProcessingBatch = async (req, res) => {
  try {
    const maCoSo = getProcessorId(req);

    const ma_lo = cleanText(req.body?.ma_lo_nguon);
    // Không còn nhập tên lô mới: mặc định lấy tên lô hiện tại ("Tên sản phẩm (mã lô)"); vẫn nhận tieu_de nếu client gửi
    let tieu_de = cleanText(req.body?.tieu_de);
    const khu_vuc_so_che = cleanText(req.body?.khu_vuc_so_che);
    const quy_cach_tieu_chuan = cleanText(req.body?.quy_cach_tieu_chuan);

    if (!ma_lo) throw new ApiError(400, "Vui lòng chọn lô đã tiếp nhận");

    let maSoChe;

    for (let attempt = 1; ; attempt++) {
      try {
        maSoChe = await withTransaction(async (connection) => {
          const [lots] = await connection.execute(
            `
            SELECT lo.tinh_trang_su_dung, lo.giai_doan_hien_tai, sp.ten_san_pham
            FROM lo_nong_san lo
            JOIN san_pham_nong_san sp ON sp.ma_san_pham = lo.ma_san_pham
            WHERE lo.ma_lo_nong_san = ? AND lo.ma_nguoi_quan_ly = ?
            LIMIT 1
            FOR UPDATE
            `,
            [ma_lo, maCoSo],
          );

          if (lots.length === 0) {
            throw new ApiError(404, "Không tìm thấy lô thuộc cơ sở của bạn");
          }
          const tenHoSo = tieu_de || `${lots[0].ten_san_pham} (${ma_lo})`;
          if (lots[0].tinh_trang_su_dung !== "ACTIVE") {
            throw new ApiError(409, "Lô này đã được sử dụng hết");
          }

          const [daCo] = await connection.execute(
            `SELECT ma_so_che FROM so_che_lo_hang WHERE ma_lo_moi = ? LIMIT 1`,
            [ma_lo],
          );
          if (daCo.length > 0) {
            throw new ApiError(
              409,
              `Lô ${ma_lo} đã có hồ sơ sơ chế ${daCo[0].ma_so_che}`,
            );
          }
          if (lots[0].giai_doan_hien_tai !== "RECEIVED") {
            throw new ApiError(
              409,
              "Chỉ sơ chế được lô đã tiếp nhận về kho của bạn",
            );
          }

          const lenhLo = await lenhDangChayCuaLo(connection, ma_lo);
          if (lenhLo) {
            throw new ApiError(
              409,
              `Lô đang có lệnh bàn giao ${lenhLo}, chưa sơ chế được`,
            );
          }

          // Lô phải ký xong các bước trước (vd nhận hàng) mới sơ chế được
          await canLoDaKy(connection, ma_lo, maCoSo, "sơ chế");

          const newMaSoChe = await generateCode(
            connection,
            "so_che_lo_hang",
            "ma_so_che",
            "SC",
          );

          await connection.execute(
            `
            INSERT INTO so_che_lo_hang
            (ma_so_che, ma_co_so, ma_lo_moi, tieu_de, khu_vuc_so_che, quy_cach_tieu_chuan, ngay_bat_dau)
            VALUES (?, ?, ?, ?, ?, ?, CURDATE())
            `,
            [
              newMaSoChe,
              maCoSo,
              ma_lo,
              tenHoSo,
              khu_vuc_so_che,
              quy_cach_tieu_chuan,
            ],
          );
          await connection.execute(
            `UPDATE lo_nong_san SET giai_doan_hien_tai = 'PROCESSED' WHERE ma_lo_nong_san = ?`,
            [ma_lo],
          );

          return newMaSoChe;
        });

        break;
      } catch (err) {
        if (err.code === "ER_DUP_ENTRY" && attempt < 3) continue;
        throw err;
      }
    }

    return res.status(201).json({
      success: true,
      message: `Đã bắt đầu sơ chế trên lô ${ma_lo} (giữ nguyên mã lô, không tạo mã mới)`,
      data: { ma_so_che: maSoChe, ma_lo },
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi tạo lô sơ chế:",
      "Không thể bắt đầu sơ chế",
    );
  }
};

const GIAI_DOAN_SO_CHE_HOP_LE = [
  "DANG_RUA_KHU_KHUAN",
  "DANG_PHAN_LOAI",
  "DANG_DONG_GOI",
  "DA_HOAN_TAT",
];

const updateProcessingStage = async (req, res) => {
  const { maSoChe } = req.params;

  try {
    const maCoSo = getProcessorId(req);
    const giaiDoan = cleanText(req.body?.giai_doan);

    if (!GIAI_DOAN_SO_CHE_HOP_LE.includes(giaiDoan)) {
      throw new ApiError(400, "Giai đoạn sơ chế không hợp lệ");
    }

    const choKy = await withTransaction(async (connection) => {
      const [rows] = await connection.execute(
        `SELECT ma_lo_moi FROM so_che_lo_hang WHERE ma_so_che = ? AND ma_co_so = ? LIMIT 1 FOR UPDATE`,
        [maSoChe, maCoSo],
      );

      if (rows.length === 0) {
        throw new ApiError(404, "Không tìm thấy lô sơ chế");
      }

      // Lô phải ký xong các bước trước (tạo lô, giai đoạn trước) mới đổi giai đoạn tiếp được
      await canLoDaKy(
        connection,
        rows[0].ma_lo_moi,
        maCoSo,
        "đổi giai đoạn sơ chế",
      );

      const lenh = await lenhDangChayCuaLo(connection, rows[0].ma_lo_moi);
      if (lenh) {
        throw new ApiError(
          409,
          `Lô đã có lệnh bàn giao ${lenh}, không đổi giai đoạn sơ chế được nữa`,
        );
      }

      // Blockchain: "đang đóng gói" -> ký sơ chế xong; "hoàn tất" -> ký sơ chế xong + đóng gói xong.
      // Giai đoạn chỉ đổi sau khi cơ sở ký xong; các giai đoạn không có sự kiện (rửa, phân loại) đổi ngay.
      const apDung = {
        hanh_dong: "SO_CHE_GIAI_DOAN",
        ma_so_che: maSoChe,
        giai_doan: giaiDoan,
      };
      const daGhi = await ghiSuKienGiaiDoanSoChe(
        connection,
        maSoChe,
        giaiDoan,
        apDung,
      );
      if (daGhi.length > 0 && layCauHinh().daCauHinh) return true;

      await connection.execute(
        `
        UPDATE so_che_lo_hang
        SET giai_doan_so_che = ?,
            ngay_hoan_tat = IF(? = 'DA_HOAN_TAT', CURDATE(), ngay_hoan_tat)
        WHERE ma_so_che = ?
        `,
        [giaiDoan, giaiDoan, maSoChe],
      );

      if (giaiDoan === "DA_HOAN_TAT") {
        await connection.execute(
          `UPDATE lo_nong_san SET giai_doan_hien_tai = 'PACKAGED' WHERE ma_lo_nong_san = ?`,
          [rows[0].ma_lo_moi],
        );
      }
      return false;
    });

    if (choKy) {
      return res.json({
        success: true,
        cho_ky: true,
        message: `Đã gửi yêu cầu ký. Giai đoạn sơ chế chỉ đổi sang bước mới sau khi bạn ký ở tab "Ký blockchain".${await nhacViCoSo(maCoSo)}`,
      });
    }
    return res.json({
      success: true,
      message: "Đã cập nhật trạng thái sơ chế",
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi cập nhật trạng thái sơ chế:",
      "Không thể cập nhật trạng thái",
    );
  }
};

// Sửa thông tin mô tả của lô sơ chế (tên gọi, khu vực, quy cách). Không sửa khối lượng:
// khối lượng gắn với lô nguồn và liên kết nguồn gốc, muốn đổi thì xóa lô rồi tạo lại.
const MAX_TIEU_DE = 255;
const MAX_KHU_VUC = 150;
const MAX_QUY_CACH = 2000;

const updateProcessingBatch = async (req, res) => {
  const { maSoChe } = req.params;

  try {
    const maCoSo = getProcessorId(req);
    const tieu_de = cleanText(req.body?.tieu_de);
    const khu_vuc_so_che = cleanText(req.body?.khu_vuc_so_che);
    const quy_cach_tieu_chuan = cleanText(req.body?.quy_cach_tieu_chuan);

    if (!tieu_de) throw new ApiError(400, "Vui lòng nhập tên gọi lô sơ chế");
    if (tieu_de.length > MAX_TIEU_DE) {
      throw new ApiError(400, `Tên gọi tối đa ${MAX_TIEU_DE} ký tự`);
    }
    if (khu_vuc_so_che && khu_vuc_so_che.length > MAX_KHU_VUC) {
      throw new ApiError(400, `Khu vực sơ chế tối đa ${MAX_KHU_VUC} ký tự`);
    }
    if (quy_cach_tieu_chuan && quy_cach_tieu_chuan.length > MAX_QUY_CACH) {
      throw new ApiError(400, `Quy cách tối đa ${MAX_QUY_CACH} ký tự`);
    }

    await withTransaction(async (connection) => {
      const [rows] = await connection.execute(
        `
        SELECT sc.ma_lo_moi, lo.tinh_trang_su_dung
        FROM so_che_lo_hang sc
        JOIN lo_nong_san lo ON sc.ma_lo_moi = lo.ma_lo_nong_san
        WHERE sc.ma_so_che = ? AND sc.ma_co_so = ?
        LIMIT 1
        FOR UPDATE
        `,
        [maSoChe, maCoSo],
      );

      if (rows.length === 0) {
        throw new ApiError(404, "Không tìm thấy lô sơ chế");
      }

      // Lô đã bị tách/gộp/hủy thì thông tin gốc đã nằm trong truy vết, không sửa nữa
      if (rows[0].tinh_trang_su_dung !== "ACTIVE") {
        throw new ApiError(
          409,
          "Lô đã được tách/gộp hoặc không còn khả dụng, không thể sửa thông tin",
        );
      }

      // Đã bàn giao vận chuyển thì các bên khác đã nhìn thấy thông tin này (chỉ tính lệnh do chính cơ sở gửi đi:
      // lô giữ nguyên mã nên còn lệnh cũ nông dân gửi tới cơ sở)
      const [shipped] = await connection.execute(
        `SELECT ma_van_don FROM lenh_van_chuyen WHERE ma_lo_nong_san = ? AND ma_nguoi_gui = ? AND trang_thai NOT IN ('TU_CHOI', 'DA_HUY') LIMIT 1`,
        [rows[0].ma_lo_moi, maCoSo],
      );

      if (shipped.length > 0) {
        throw new ApiError(
          409,
          "Lô đã có lệnh bàn giao vận chuyển, không thể sửa thông tin",
        );
      }

      await connection.execute(
        `
        UPDATE so_che_lo_hang
        SET tieu_de = ?, khu_vuc_so_che = ?, quy_cach_tieu_chuan = ?
        WHERE ma_so_che = ?
        `,
        [tieu_de, khu_vuc_so_che, quy_cach_tieu_chuan, maSoChe],
      );
    });

    return res.json({
      success: true,
      message: "Đã cập nhật thông tin lô sơ chế",
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi sửa thông tin lô sơ chế:",
      "Không thể sửa thông tin lô sơ chế",
    );
  }
};

const deleteProcessingBatch = async (req, res) => {
  const { maSoChe } = req.params;

  try {
    const maCoSo = getProcessorId(req);

    await withTransaction(async (connection) => {
      const [rows] = await connection.execute(
        `SELECT ma_lo_moi FROM so_che_lo_hang WHERE ma_so_che = ? AND ma_co_so = ? LIMIT 1 FOR UPDATE`,
        [maSoChe, maCoSo],
      );

      if (rows.length === 0) {
        throw new ApiError(404, "Không tìm thấy lô sơ chế");
      }

      const maLoMoi = rows[0].ma_lo_moi;

      // Lệnh do chính cơ sở gửi đi (lô giữ nguyên mã nên còn lệnh cũ nông dân gửi tới cơ sở)
      const [shipped] = await connection.execute(
        `SELECT ma_van_don FROM lenh_van_chuyen WHERE ma_lo_nong_san = ? AND ma_nguoi_gui = ? AND trang_thai != 'DA_HUY' LIMIT 1`,
        [maLoMoi, maCoSo],
      );

      if (shipped.length > 0) {
        throw new ApiError(
          409,
          "Lô đã có lệnh bàn giao vận chuyển, không thể xóa",
        );
      }

      const [nguon] = await connection.execute(
        `SELECT ma_lo_nguon, so_luong_tham_gia FROM lien_ket_nguon_goc_lo WHERE ma_lo_duoc_tao_ra = ? AND loai_lien_ket = 'TRANSFORM'`,
        [maLoMoi],
      );

      if (nguon.length === 0) {
        // Sơ chế làm trên chính lô đã nhận: chỉ gỡ hồ sơ sơ chế và các sự kiện sơ chế chưa ký, lô quay về "đã tiếp nhận"
        if (!(await goSuKienSoCheChuaKy(connection, maLoMoi))) {
          throw new ApiError(
            409,
            "Lô đã ký bước sơ chế / đóng gói lên blockchain, không thể xóa hồ sơ sơ chế",
          );
        }
        await connection.execute(
          `DELETE FROM so_che_lo_hang WHERE ma_so_che = ?`,
          [maSoChe],
        );
        await connection.execute(
          `UPDATE lo_nong_san SET giai_doan_hien_tai = 'RECEIVED' WHERE ma_lo_nong_san = ?`,
          [maLoMoi],
        );
        return;
      }

      // Hồ sơ cũ (tạo từ bản trước khi giữ nguyên mã lô): lô sơ chế là lô riêng, xóa lô đó và hoàn khối lượng cho lô nguồn.
      // Đã gửi / ký lên blockchain thì không xóa (trên chain lô sơ chế đã tồn tại và đã trừ khối lượng lô nguồn)
      if (!(await xoaSuKienChuaKy(connection, maLoMoi))) {
        throw new ApiError(
          409,
          "Lô sơ chế đã được ký lên blockchain, không thể xóa",
        );
      }

      await connection.execute(
        `DELETE FROM so_che_lo_hang WHERE ma_so_che = ?`,
        [maSoChe],
      );
      await connection.execute(
        `DELETE FROM lien_ket_nguon_goc_lo WHERE ma_lo_duoc_tao_ra = ?`,
        [maLoMoi],
      );
      await connection.execute(
        `DELETE FROM lo_nong_san WHERE ma_lo_nong_san = ?`,
        [maLoMoi],
      );

      // Hoàn lại khối lượng cho lô nguồn (TRANSFORM luôn có đúng 1 nguồn)
      await connection.execute(
        `
        UPDATE lo_nong_san
        SET so_luong_hien_tai = so_luong_hien_tai + ?,
            tinh_trang_su_dung = 'ACTIVE'
        WHERE ma_lo_nong_san = ?
        `,
        [nguon[0].so_luong_tham_gia, nguon[0].ma_lo_nguon],
      );
    });

    return res.json({ success: true, message: "Đã xóa hồ sơ sơ chế" });
  } catch (err) {
    return sendError(res, err, "Lỗi xóa lô sơ chế:", "Không thể xóa lô sơ chế");
  }
};

/*
==================================================
3. TÁCH / GỘP LÔ
Dùng lại lien_ket_nguon_goc_lo (SPLIT / MERGE) đã có sẵn trong CSDL.
==================================================
*/

const getSplitMergeLots = async (req, res) => {
  try {
    const maCoSo = getProcessorId(req);

    const [rows] = await db.execute(
      `
      SELECT lo.ma_lo_nong_san, sp.ten_san_pham, lo.so_luong_hien_tai, lo.don_vi_tinh, lo.giai_doan_hien_tai, lo.ghi_chu
      FROM lo_nong_san lo
      JOIN san_pham_nong_san sp ON lo.ma_san_pham = sp.ma_san_pham
      WHERE lo.ma_nguoi_quan_ly = ? AND lo.tinh_trang_su_dung = 'ACTIVE'
      ORDER BY lo.updated_at DESC
      `,
      [maCoSo],
    );
    await ganTrangThaiKy(db, rows, "ma_lo_nong_san", maCoSo);

    return res.json({ success: true, data: rows });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy danh sách lô khả dụng:",
      "Không thể lấy danh sách lô",
    );
  }
};

const getSplitMergeLog = async (req, res) => {
  try {
    const maCoSo = getProcessorId(req);

    const [rows] = await db.execute(
      `
      SELECT
        lk.relation_group_id,
        lk.loai_lien_ket,
        lk.ma_lo_nguon,
        spNguon.ten_san_pham AS ten_san_pham_nguon,
        lk.ma_lo_duoc_tao_ra,
        spMoi.ten_san_pham AS ten_san_pham_moi,
        lk.so_luong_tham_gia,
        lk.don_vi_tinh,
        lk.thoi_diem_tao_lien_ket,
        loMoi.ghi_chu AS pham_cap_lo_moi,
        loMoi.so_luong_hien_tai AS so_luong_lo_moi,
        loMoi.tinh_trang_su_dung AS tinh_trang_lo_moi,
        (
          SELECT v.ma_van_don FROM lenh_van_chuyen v
          WHERE v.ma_lo_nong_san = lk.ma_lo_duoc_tao_ra AND v.trang_thai != 'DA_HUY'
          ORDER BY v.created_at DESC LIMIT 1
        ) AS ma_van_don_lo_moi
      FROM lien_ket_nguon_goc_lo lk
      JOIN lo_nong_san loMoi ON lk.ma_lo_duoc_tao_ra = loMoi.ma_lo_nong_san
      LEFT JOIN san_pham_nong_san spMoi ON loMoi.ma_san_pham = spMoi.ma_san_pham
      LEFT JOIN lo_nong_san loNguon ON lk.ma_lo_nguon = loNguon.ma_lo_nong_san
      LEFT JOIN san_pham_nong_san spNguon ON loNguon.ma_san_pham = spNguon.ma_san_pham
      WHERE lk.loai_lien_ket IN ('SPLIT', 'MERGE')
        AND loMoi.ma_nguoi_quan_ly = ?
      ORDER BY lk.thoi_diem_tao_lien_ket DESC
      `,
      [maCoSo],
    );
    await ganTrangThaiKy(db, rows, "ma_lo_duoc_tao_ra", maCoSo);

    return res.json({ success: true, data: rows });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy nhật ký tách/gộp lô:",
      "Không thể lấy nhật ký tách/gộp lô",
    );
  }
};

const splitBatch = async (req, res) => {
  try {
    const maCoSo = getProcessorId(req);

    const ma_lo_goc = cleanText(req.body?.ma_lo_goc);
    const children = Array.isArray(req.body?.children) ? req.body.children : [];

    if (!ma_lo_goc) throw new ApiError(400, "Vui lòng chọn lô gốc cần tách");
    if (children.length < 2)
      throw new ApiError(400, "Cần ít nhất 2 lô con để tách");

    const parsedChildren = children.map((c) => ({
      khoi_luong: toPositiveNumber(c.khoi_luong),
      pham_cap: cleanText(c.pham_cap),
    }));

    if (parsedChildren.some((c) => !c.khoi_luong)) {
      throw new ApiError(400, "Khối lượng mỗi lô con phải lớn hơn 0");
    }

    const tongKhoiLuong =
      Math.round(
        parsedChildren.reduce((sum, c) => sum + c.khoi_luong, 0) * 1000,
      ) / 1000;

    let canKy = false;
    await withTransaction(async (connection) => {
      const [lots] = await connection.execute(
        `
        SELECT ma_san_pham, ma_mua_vu, so_luong_hien_tai, don_vi_tinh, giai_doan_hien_tai, tinh_trang_su_dung
        FROM lo_nong_san
        WHERE ma_lo_nong_san = ? AND ma_nguoi_quan_ly = ?
        LIMIT 1
        FOR UPDATE
        `,
        [ma_lo_goc, maCoSo],
      );

      if (lots.length === 0)
        throw new ApiError(404, "Không tìm thấy lô gốc thuộc cơ sở của bạn");

      const lot = lots[0];
      if (lot.tinh_trang_su_dung !== "ACTIVE") {
        throw new ApiError(409, "Lô gốc đã được sử dụng hết");
      }
      const lenhGoc = await lenhDangChayCuaLo(connection, ma_lo_goc);
      if (lenhGoc) {
        throw new ApiError(
          409,
          `Lô gốc đang có lệnh bàn giao ${lenhGoc}, chưa tách được`,
        );
      }
      // Lô gốc phải ký xong các bước trước mới tách được
      await canLoDaKy(connection, ma_lo_goc, maCoSo, "tách lô");
      if (tongKhoiLuong > Number(lot.so_luong_hien_tai)) {
        throw new ApiError(
          400,
          `Tổng khối lượng tách vượt quá khối lượng còn lại của lô gốc (${lot.so_luong_hien_tai} ${lot.don_vi_tinh})`,
        );
      }

      const relationGroupId = await generateCode(
        connection,
        "lien_ket_nguon_goc_lo",
        "relation_group_id",
        "REL",
      );

      for (const child of parsedChildren) {
        const newMaLo = await timMaLoChuaCoTrenChain(
          await generateCode(connection, "lo_nong_san", "ma_lo_nong_san", "LO"),
        );

        await connection.execute(
          `
          INSERT INTO lo_nong_san
          (ma_lo_nong_san, ma_mua_vu, ma_san_pham, ma_nguoi_quan_ly, so_luong_hien_tai, don_vi_tinh, giai_doan_hien_tai, ghi_chu)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            newMaLo,
            lot.ma_mua_vu,
            lot.ma_san_pham,
            maCoSo,
            child.khoi_luong,
            lot.don_vi_tinh,
            lot.giai_doan_hien_tai,
            child.pham_cap,
          ],
        );

        const maLienKet = await generateCode(
          connection,
          "lien_ket_nguon_goc_lo",
          "ma_lien_ket",
          "LK",
        );

        await connection.execute(
          `
          INSERT INTO lien_ket_nguon_goc_lo
          (ma_lien_ket, relation_group_id, ma_lo_nguon, ma_lo_duoc_tao_ra, loai_lien_ket, so_luong_tham_gia, don_vi_tinh)
          VALUES (?, ?, ?, ?, 'SPLIT', ?, ?)
          `,
          [
            maLienKet,
            relationGroupId,
            ma_lo_goc,
            newMaLo,
            child.khoi_luong,
            lot.don_vi_tinh,
          ],
        );

        // Blockchain: mỗi lô con một lần ký createChild (lấy đúng phần khối lượng của nó từ lô gốc)
        if (await ghiSuKienLoCon(connection, newMaLo))
          canKy = layCauHinh().daCauHinh;
      }

      const conLai =
        Math.round((Number(lot.so_luong_hien_tai) - tongKhoiLuong) * 1000) /
        1000;

      await connection.execute(
        `
        UPDATE lo_nong_san
        SET so_luong_hien_tai = ?,
            tinh_trang_su_dung = IF(? <= 0, 'CONSUMED_BY_SPLIT', tinh_trang_su_dung)
        WHERE ma_lo_nong_san = ?
        `,
        [conLai, conLai, ma_lo_goc],
      );
    });

    return res.status(201).json({
      success: true,
      cho_ky: canKy,
      message: canKy
        ? `Đã tách lô. Hãy ký bước tạo các lô con ở tab "Ký blockchain", ký xong mới sơ chế tiếp, tách / gộp hay bàn giao được.${await nhacViCoSo(maCoSo)}`
        : "Đã tách lô thành công",
    });
  } catch (err) {
    return sendError(res, err, "Lỗi tách lô:", "Không thể tách lô");
  }
};

const mergeBatch = async (req, res) => {
  try {
    const maCoSo = getProcessorId(req);

    const maLoNguonList = Array.isArray(req.body?.ma_lo_nguon_list)
      ? [...new Set(req.body.ma_lo_nguon_list.map(cleanText).filter(Boolean))]
      : [];
    const tieu_de = cleanText(req.body?.tieu_de);

    if (maLoNguonList.length < 2)
      throw new ApiError(400, "Cần chọn ít nhất 2 lô để gộp");

    let canKy = false;
    await withTransaction(async (connection) => {
      const [lots] = await connection.query(
        `
        SELECT ma_lo_nong_san, ma_san_pham, ma_mua_vu, so_luong_hien_tai, don_vi_tinh, giai_doan_hien_tai, tinh_trang_su_dung
        FROM lo_nong_san
        WHERE ma_lo_nong_san IN (?) AND ma_nguoi_quan_ly = ?
        FOR UPDATE
        `,
        [maLoNguonList, maCoSo],
      );

      if (lots.length !== maLoNguonList.length) {
        throw new ApiError(
          404,
          "Có lô không tồn tại hoặc không thuộc cơ sở của bạn",
        );
      }

      if (lots.some((l) => l.tinh_trang_su_dung !== "ACTIVE")) {
        throw new ApiError(409, "Có lô đã được sử dụng hết, không thể gộp");
      }
      for (const l of lots) {
        const lenh = await lenhDangChayCuaLo(connection, l.ma_lo_nong_san);
        if (lenh)
          throw new ApiError(
            409,
            `Lô ${l.ma_lo_nong_san} đang có lệnh bàn giao ${lenh}, chưa gộp được`,
          );
      }

      // Các lô nguồn phải ký xong các bước trước mới gộp được
      for (const l of lots) {
        await canLoDaKy(connection, l.ma_lo_nong_san, maCoSo, "gộp lô");
      }

      const maSanPham = lots[0].ma_san_pham;
      if (lots.some((l) => l.ma_san_pham !== maSanPham)) {
        throw new ApiError(400, "Chỉ có thể gộp các lô cùng loại sản phẩm");
      }

      const donViTinh = lots[0].don_vi_tinh;
      const tongKhoiLuong =
        Math.round(
          lots.reduce((sum, l) => sum + Number(l.so_luong_hien_tai), 0) * 1000,
        ) / 1000;

      const newMaLo = await timMaLoChuaCoTrenChain(
        await generateCode(connection, "lo_nong_san", "ma_lo_nong_san", "LO"),
      );

      await connection.execute(
        `
        INSERT INTO lo_nong_san
        (ma_lo_nong_san, ma_mua_vu, ma_san_pham, ma_nguoi_quan_ly, so_luong_hien_tai, don_vi_tinh, giai_doan_hien_tai, ghi_chu)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          newMaLo,
          lots[0].ma_mua_vu,
          maSanPham,
          maCoSo,
          tongKhoiLuong,
          donViTinh,
          lots[0].giai_doan_hien_tai,
          tieu_de,
        ],
      );

      const relationGroupId = await generateCode(
        connection,
        "lien_ket_nguon_goc_lo",
        "relation_group_id",
        "REL",
      );

      for (const lot of lots) {
        const maLienKet = await generateCode(
          connection,
          "lien_ket_nguon_goc_lo",
          "ma_lien_ket",
          "LK",
        );

        await connection.execute(
          `
          INSERT INTO lien_ket_nguon_goc_lo
          (ma_lien_ket, relation_group_id, ma_lo_nguon, ma_lo_duoc_tao_ra, loai_lien_ket, so_luong_tham_gia, don_vi_tinh)
          VALUES (?, ?, ?, ?, 'MERGE', ?, ?)
          `,
          [
            maLienKet,
            relationGroupId,
            lot.ma_lo_nong_san,
            newMaLo,
            lot.so_luong_hien_tai,
            donViTinh,
          ],
        );

        await connection.execute(
          `UPDATE lo_nong_san SET so_luong_hien_tai = 0, tinh_trang_su_dung = 'CONSUMED_BY_MERGE' WHERE ma_lo_nong_san = ?`,
          [lot.ma_lo_nong_san],
        );
      }

      // Blockchain: cơ sở ký tạo lô gộp từ các lô nguồn (createChild với nhiều lô nguồn cùng sản phẩm)
      canKy =
        Boolean(await ghiSuKienLoCon(connection, newMaLo)) &&
        layCauHinh().daCauHinh;
    });

    return res.status(201).json({
      success: true,
      cho_ky: canKy,
      message: canKy
        ? `Đã gộp lô. Hãy ký bước tạo lô gộp ở tab "Ký blockchain", ký xong mới sơ chế tiếp, tách / gộp hay bàn giao được.${await nhacViCoSo(maCoSo)}`
        : "Đã gộp lô thành công",
    });
  } catch (err) {
    return sendError(res, err, "Lỗi gộp lô:", "Không thể gộp lô");
  }
};

/*
==================================================
4. BÀN GIAO VẬN CHUYỂN
Dùng lại lenh_van_chuyen; ma_ben_nhan có thể để trống khi chưa có tài khoản
bên nhận chính thức (dùng dia_chi_giao_hang dạng text thay thế).
==================================================
*/

const getReadyToShip = async (req, res) => {
  try {
    const maCoSo = getProcessorId(req);

    const [rows] = await db.execute(
      `
      SELECT * FROM (
        SELECT sc.ma_so_che, sc.ma_lo_moi, sc.tieu_de, lo.so_luong_hien_tai, lo.don_vi_tinh,
               'SO_CHE' AS nguon, sc.ngay_hoan_tat AS thoi_diem
        FROM so_che_lo_hang sc
        JOIN lo_nong_san lo ON sc.ma_lo_moi = lo.ma_lo_nong_san
        WHERE sc.ma_co_so = ?
          AND sc.giai_doan_so_che = 'DA_HOAN_TAT'
          AND lo.tinh_trang_su_dung = 'ACTIVE'
          AND lo.ma_nguoi_quan_ly = sc.ma_co_so
          AND NOT EXISTS (
            SELECT 1 FROM lenh_van_chuyen v
            WHERE v.ma_lo_nong_san = sc.ma_lo_moi AND v.trang_thai NOT IN ('DA_HUY', 'TU_CHOI', 'HOAN_THANH')
          )

        UNION ALL

        -- Lô tạo ra từ tách / gộp lô cũng được bàn giao trực tiếp (không cần qua sơ chế lại)
        SELECT NULL AS ma_so_che, lo.ma_lo_nong_san AS ma_lo_moi,
               COALESCE(NULLIF(lo.ghi_chu, ''),
                        CONCAT(sp.ten_san_pham, IF(MAX(lk.loai_lien_ket) = 'MERGE', ' - Lô gộp', ' - Lô tách'))) AS tieu_de,
               lo.so_luong_hien_tai, lo.don_vi_tinh,
               MAX(lk.loai_lien_ket) AS nguon, MAX(lk.thoi_diem_tao_lien_ket) AS thoi_diem
        FROM lien_ket_nguon_goc_lo lk
        JOIN lo_nong_san lo ON lk.ma_lo_duoc_tao_ra = lo.ma_lo_nong_san
        JOIN san_pham_nong_san sp ON lo.ma_san_pham = sp.ma_san_pham
        WHERE lk.loai_lien_ket IN ('SPLIT', 'MERGE')
          AND lo.ma_nguoi_quan_ly = ?
          AND lo.tinh_trang_su_dung = 'ACTIVE'
          AND lo.so_luong_hien_tai > 0
          AND NOT EXISTS (
            SELECT 1 FROM lenh_van_chuyen v
            WHERE v.ma_lo_nong_san = lo.ma_lo_nong_san AND v.trang_thai NOT IN ('DA_HUY', 'TU_CHOI', 'HOAN_THANH')
          )
          AND NOT EXISTS (SELECT 1 FROM so_che_lo_hang sc2 WHERE sc2.ma_lo_moi = lo.ma_lo_nong_san)
        GROUP BY lo.ma_lo_nong_san, lo.ghi_chu, sp.ten_san_pham, lo.so_luong_hien_tai, lo.don_vi_tinh
      ) ready
      ORDER BY thoi_diem DESC
      `,
      [maCoSo, maCoSo],
    );
    await ganTrangThaiKy(db, rows, "ma_lo_moi", maCoSo);

    return res.json({ success: true, data: rows });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy danh sách lô sẵn sàng bàn giao:",
      "Không thể lấy danh sách lô sẵn sàng bàn giao",
    );
  }
};

const getTransporters = async (req, res) => {
  try {
    getProcessorId(req);

    const [rows] = await db.execute(
      `SELECT ma_nguoi_dung, ho_ten, so_dien_thoai FROM nguoi_dung WHERE vai_tro = 'TRANSPORTER' AND trang_thai = 1 ORDER BY ho_ten ASC`,
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy danh sách đơn vị vận chuyển:",
      "Không thể lấy danh sách đơn vị vận chuyển",
    );
  }
};

// Nhà phân phối có tài khoản chính thức để chọn làm bên nhận (tùy chọn,
// thay cho nhập địa chỉ tự do khi chưa rõ ai nhận).
const getDistributors = async (req, res) => {
  try {
    getProcessorId(req);

    const [rows] = await db.execute(
      `SELECT ma_nguoi_dung, ho_ten, dia_chi FROM nguoi_dung WHERE vai_tro = 'DISTRIBUTOR' AND trang_thai = 1 ORDER BY ho_ten ASC`,
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy danh sách nhà phân phối:",
      "Không thể lấy danh sách nhà phân phối",
    );
  }
};

const SHIPMENT_SELECT = `
  SELECT
    v.ma_van_don,
    v.ma_lo_nong_san,
    sp.ten_san_pham,
    v.ma_don_vi_van_chuyen,
    dv.ho_ten AS ten_don_vi_van_chuyen,
    v.ten_tai_xe,
    v.bien_so_xe,
    v.ma_ben_nhan,
    bn.ho_ten AS ten_ben_nhan,
    v.dia_chi_giao_hang,
    v.khoi_luong,
    v.don_vi_tinh,
    DATE_FORMAT(v.thoi_gian_xuat, '%Y-%m-%d %H:%i') AS thoi_gian_xuat,
    v.ghi_chu,
    v.trang_thai,
    v.created_at
  FROM lenh_van_chuyen v
  JOIN lo_nong_san lo ON v.ma_lo_nong_san = lo.ma_lo_nong_san
  JOIN san_pham_nong_san sp ON lo.ma_san_pham = sp.ma_san_pham
  JOIN nguoi_dung dv ON v.ma_don_vi_van_chuyen = dv.ma_nguoi_dung
  LEFT JOIN nguoi_dung bn ON v.ma_ben_nhan = bn.ma_nguoi_dung
`;

const getShipments = async (req, res) => {
  try {
    const maCoSo = getProcessorId(req);

    const [rows] = await db.execute(
      `
      ${SHIPMENT_SELECT}
      WHERE v.ma_nguoi_gui = ?
      ORDER BY v.created_at DESC, v.ma_van_don DESC
      `,
      [maCoSo],
    );
    await ganChoKyVanDon(db, rows);

    return res.json({ success: true, data: rows });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy danh sách bàn giao:",
      "Không thể lấy danh sách bàn giao",
    );
  }
};

const getShipmentById = async (req, res) => {
  const { maVanDon } = req.params;

  try {
    const maCoSo = getProcessorId(req);

    const [rows] = await db.execute(
      `
      ${SHIPMENT_SELECT}
      WHERE v.ma_van_don = ? AND v.ma_nguoi_gui = ?
      LIMIT 1
      `,
      [maVanDon, maCoSo],
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy vận đơn" });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy chi tiết vận đơn:",
      "Không thể lấy chi tiết vận đơn",
    );
  }
};

const generateShipmentCode = async (connection) => {
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

const createShipment = async (req, res) => {
  try {
    const maCoSo = getProcessorId(req);

    const ma_lo_nong_san = cleanText(req.body?.ma_lo_nong_san);
    const ma_don_vi_van_chuyen = cleanText(req.body?.ma_don_vi_van_chuyen);
    const ma_ben_nhan = cleanText(req.body?.ma_ben_nhan);
    let dia_chi_giao_hang = cleanText(req.body?.dia_chi_giao_hang);
    const ghi_chu = cleanText(req.body?.ghi_chu);

    if (!ma_lo_nong_san)
      throw new ApiError(400, "Vui lòng chọn lô hàng cần bàn giao");
    if (!ma_don_vi_van_chuyen)
      throw new ApiError(400, "Vui lòng chọn đơn vị vận chuyển");
    if (!ma_ben_nhan && !dia_chi_giao_hang)
      throw new ApiError(
        400,
        "Vui lòng chọn nhà phân phối nhận hàng hoặc nhập điểm giao hàng",
      );
    // Có blockchain thì bên nhận phải là tài khoản (ký nhận hàng bằng ví), không giao tới địa chỉ tự do
    if (!ma_ben_nhan && layCauHinh().daCauHinh)
      throw new ApiError(
        400,
        "Lô được truy xuất trên blockchain nên phải chọn nhà phân phối có tài khoản (bên nhận phải ký nhận hàng)",
      );
    // Tài xế và phương tiện do đơn vị vận chuyển chọn từ danh sách của họ khi chấp nhận lệnh, bên gửi không nhập

    let maVanDon;
    let canKy = false;

    for (let attempt = 1; ; attempt++) {
      try {
        maVanDon = await withTransaction(async (connection) => {
          const [lots] = await connection.execute(
            `
            SELECT so_luong_hien_tai, don_vi_tinh, tinh_trang_su_dung
            FROM lo_nong_san
            WHERE ma_lo_nong_san = ? AND ma_nguoi_quan_ly = ?
            LIMIT 1
            FOR UPDATE
            `,
            [ma_lo_nong_san, maCoSo],
          );

          if (lots.length === 0) {
            throw new ApiError(
              404,
              "Không tìm thấy lô hàng thuộc cơ sở của bạn",
            );
          }

          if (lots[0].tinh_trang_su_dung !== "ACTIVE") {
            throw new ApiError(409, "Lô hàng không còn khả dụng");
          }

          // Lô phải ký xong các bước trước (tạo lô, sơ chế, đóng gói) mới bàn giao được
          await canLoDaKy(
            connection,
            ma_lo_nong_san,
            maCoSo,
            "tạo lệnh bàn giao",
          );

          // Lô giữ nguyên mã nên còn lệnh cũ đã hoàn thành (nông dân gửi tới cơ sở): chỉ chặn khi đang có lệnh chạy dở
          const dangChay = await lenhDangChayCuaLo(connection, ma_lo_nong_san);
          if (dangChay) {
            throw new ApiError(409, `Lô đã có lệnh bàn giao ${dangChay}`);
          }

          const [transporters] = await connection.execute(
            `SELECT ma_nguoi_dung FROM nguoi_dung WHERE ma_nguoi_dung = ? AND vai_tro = 'TRANSPORTER' AND trang_thai = 1`,
            [ma_don_vi_van_chuyen],
          );

          if (transporters.length === 0) {
            throw new ApiError(404, "Không tìm thấy đơn vị vận chuyển");
          }

          if (ma_ben_nhan) {
            const [distributors] = await connection.execute(
              `SELECT ma_nguoi_dung, dia_chi FROM nguoi_dung WHERE ma_nguoi_dung = ? AND vai_tro = 'DISTRIBUTOR' AND trang_thai = 1`,
              [ma_ben_nhan],
            );

            if (distributors.length === 0) {
              throw new ApiError(404, "Không tìm thấy nhà phân phối nhận hàng");
            }

            if (!dia_chi_giao_hang) {
              dia_chi_giao_hang = distributors[0].dia_chi || null;
            }
          }

          const newCode = await generateShipmentCode(connection);

          await connection.execute(
            `
            INSERT INTO lenh_van_chuyen
            (ma_van_don, ma_lo_nong_san, ma_nguoi_gui, ma_don_vi_van_chuyen, ma_ben_nhan, dia_chi_giao_hang, ten_tai_xe, bien_so_xe, khoi_luong, don_vi_tinh, thoi_gian_xuat, ghi_chu)
            VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, NOW(), ?)
            `,
            [
              newCode,
              ma_lo_nong_san,
              maCoSo,
              ma_don_vi_van_chuyen,
              ma_ben_nhan || null,
              dia_chi_giao_hang,
              lots[0].so_luong_hien_tai,
              lots[0].don_vi_tinh,
              ghi_chu,
            ],
          );

          // Blockchain: cơ sở sơ chế ký tạo lệnh bàn giao (gắn ví vận chuyển + ví nhà phân phối)
          canKy =
            Boolean(
              await ghiSuKienVanDon(
                connection,
                newCode,
                "TRANSPORT_ORDERED",
                maCoSo,
              ),
            ) && layCauHinh().daCauHinh;

          return newCode;
        });

        break;
      } catch (err) {
        if (err.code === "ER_DUP_ENTRY" && attempt < 3) continue;
        throw err;
      }
    }

    // Các bước ký của lệnh sẽ chờ tới khi các bên có ví được admin duyệt
    let canhBaoVi = "";
    try {
      const [[lenh]] = await db.query(
        `SELECT ma_nguoi_gui, ma_don_vi_van_chuyen, ma_ben_nhan FROM lenh_van_chuyen WHERE ma_van_don = ?`,
        [maVanDon],
      );
      const thieu = await chuaCoViDuyet(db, [
        lenh.ma_nguoi_gui,
        lenh.ma_don_vi_van_chuyen,
        lenh.ma_ben_nhan,
      ]);
      if (thieu.length > 0) {
        canhBaoVi = `. Lưu ý: ${thieu.join(", ")} chưa có ví blockchain được duyệt nên các bước ký của lệnh này sẽ chờ`;
      }
    } catch {
      canhBaoVi = "";
    }

    return res.status(201).json({
      success: true,
      cho_ky: false,
      message: canKy
        ? `Đã tạo lệnh bàn giao vận chuyển. Không cần ký lúc này: sau khi đơn vị vận chuyển chấp nhận, bạn ký xác nhận lấy hàng đi (nút "Ký xác nhận lấy hàng đi" ở lệnh đó hoặc tab Ký blockchain) rồi xe mới lấy hàng được${canhBaoVi}`
        : `Đã tạo lệnh bàn giao vận chuyển${canhBaoVi}`,
      data: { ma_van_don: maVanDon },
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi tạo lệnh bàn giao:",
      "Không thể tạo lệnh bàn giao",
    );
  }
};

/*
==================================================
5. CHI TIẾT 1 LÔ SƠ CHẾ (trang chi tiết)
Truy ngược nguồn gốc tối đa 2 bước (TRANSFORM -> SPLIT/MERGE nếu có) +
dữ liệu kiểm định thật (nếu có) của các lô liên quan. Không có dữ liệu
blockchain thật nên không hiển thị mã băng/chứng chỉ giả.
==================================================
*/

const getBatchDetail = async (req, res) => {
  const { maSoChe } = req.params;

  try {
    const maCoSo = getProcessorId(req);

    const [scRows] = await db.execute(
      `
      ${PROCESSING_SELECT}
      WHERE sc.ma_so_che = ? AND sc.ma_co_so = ?
      LIMIT 1
      `,
      [maSoChe, maCoSo],
    );

    if (scRows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy lô sơ chế" });
    }

    const batch = scRows[0];

    // Bước 1: lô nguồn trực tiếp (TRANSFORM)
    const [transformLink] = await db.execute(
      `SELECT ma_lo_nguon FROM lien_ket_nguon_goc_lo WHERE ma_lo_duoc_tao_ra = ? AND loai_lien_ket = 'TRANSFORM' LIMIT 1`,
      [batch.ma_lo_moi],
    );

    let lineageType = "ORIGINAL";
    let lineageSources = [];
    // Hồ sơ sơ chế làm trên chính lô đã nhận (không có lô nguồn riêng): xét nguồn gốc ngay từ lô đó
    const directSource = transformLink[0]?.ma_lo_nguon || null;
    const loXetNguon = directSource || batch.ma_lo_moi;

    if (loXetNguon) {
      // Bước 2: lô nguồn đó có phải kết quả tách/gộp trước đó không
      const [upstream] = await db.execute(
        `
        SELECT lk.loai_lien_ket, lk.ma_lo_nguon, lk.so_luong_tham_gia, lk.don_vi_tinh,
               lo.ma_nguoi_quan_ly, sp.ten_san_pham
        FROM lien_ket_nguon_goc_lo lk
        LEFT JOIN lo_nong_san lo ON lk.ma_lo_nguon = lo.ma_lo_nong_san
        LEFT JOIN san_pham_nong_san sp ON lo.ma_san_pham = sp.ma_san_pham
        WHERE lk.ma_lo_duoc_tao_ra = ? AND lk.loai_lien_ket IN ('SPLIT', 'MERGE')
        `,
        [loXetNguon],
      );

      if (upstream.length > 0) {
        lineageType =
          upstream[0].loai_lien_ket === "MERGE" ? "MERGED" : "SPLIT";
        lineageSources = upstream;
      } else {
        lineageType = "ORIGINAL";
        lineageSources = directSource ? [{ ma_lo_nguon: directSource }] : [];
      }
    }

    const maLoCanTraCuu = [
      batch.ma_lo_moi,
      directSource,
      ...lineageSources.map((s) => s.ma_lo_nguon),
    ].filter(Boolean);

    let inspections = [];
    if (maLoCanTraCuu.length > 0) {
      const [rows] = await db.query(
        `
        SELECT kd.ma_lo_nong_san, kd.tieu_chuan_dang_ky, kd.so_chung_nhan, kd.ket_luan, kd.trang_thai_ho_so,
               csk.ten_chi_so, csk.gia_tri
        FROM kiem_dinh_lo_hang kd
        LEFT JOIN chi_so_kiem_dinh csk ON csk.ma_kiem_dinh = kd.ma_kiem_dinh
        WHERE kd.ma_lo_nong_san IN (?)
        ORDER BY kd.updated_at DESC
        `,
        [maLoCanTraCuu],
      );
      inspections = rows;
    }

    return res.json({
      success: true,
      data: {
        ...batch,
        lineage_type: lineageType,
        lineage_direct_source:
          directSource || (lineageType === "ORIGINAL" ? null : batch.ma_lo_moi),
        lineage_sources: lineageSources,
        inspections,
      },
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy chi tiết lô sơ chế:",
      "Không thể lấy chi tiết lô sơ chế",
    );
  }
};

module.exports = {
  getIncomingShipments,
  confirmReceive,
  rejectReceive,
  getAvailableRawLots,
  getProcessingBatches,
  createProcessingBatch,
  updateProcessingStage,
  updateProcessingBatch,
  deleteProcessingBatch,
  getSplitMergeLots,
  getSplitMergeLog,
  splitBatch,
  mergeBatch,
  getReadyToShip,
  getTransporters,
  getDistributors,
  getShipments,
  getShipmentById,
  createShipment,
  getBatchDetail,
};
