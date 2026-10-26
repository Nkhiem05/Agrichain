const db = require("../config/db");
const {
  ghiSuKienVanDon,
  ghiSuKienTuChoiNhanHang,
  ghiSuKienLoCon,
  ghiSuKienGiaiDoanSoChe,
  xoaSuKienChuaKy,
  chuaCoViDuyet,
} = require("../services/blockchain/hook");
const { layCauHinh } = require("../services/blockchain/chainClient");

/*
==================================================
CƠ SỞ SƠ CHẾ / ĐÓNG GÓI (vai trò PROCESSOR)
4 chức năng: tiếp nhận lô -> sơ chế đóng gói -> tách/gộp lô -> bàn giao vận chuyển.
Danh tính cơ sở lấy từ token đăng nhập (req.user, do checkAuth gắn vào).
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
    return res.status(err.status).json({ success: false, message: err.message });
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
    throw new ApiError(403, "Chỉ cơ sở sơ chế / đóng gói mới được dùng chức năng này");
  }

  return user.ma_nguoi_dung;
};

// Mã dạng PREFIXnnn, tự tăng dần, không trùng với mã đã có
const generateCode = async (connection, table, column, prefix, padLength = 3) => {
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
        [maVanDon, maCoSo],
      );

      if (rows.length === 0) {
        throw new ApiError(404, "Không tìm thấy lệnh vận chuyển");
      }

      if (!TRANG_THAI_CO_THE_XU_LY.includes(rows[0].trang_thai)) {
        throw new ApiError(409, "Lệnh vận chuyển không ở trạng thái có thể tiếp nhận");
      }

      // Không nhận nhiều hơn khối lượng lô gửi đi (hợp đồng cũng chặn: hao hụt chỉ được giảm)
      if (khoiLuongThucTe > Number(rows[0].so_luong_hien_tai) + 1e-9) {
        throw new ApiError(
          400,
          `Khối lượng thực nhận không được lớn hơn khối lượng lô gửi đi (${Number(rows[0].so_luong_hien_tai)} ${rows[0].don_vi_tinh})`,
        );
      }

      await connection.execute(
        `UPDATE lenh_van_chuyen SET trang_thai = 'HOAN_THANH', khoi_luong_nhan = ? WHERE ma_van_don = ?`,
        [khoiLuongThucTe, maVanDon],
      );
      // Blockchain: bên nhận ký nhận hàng kèm khối lượng thực nhận; lô đổi chủ trên chain
      await ghiSuKienVanDon(connection, maVanDon, "STOCK_IN_CONFIRMED", maCoSo);

      await connection.execute(
        `
        UPDATE lo_nong_san
        SET ma_nguoi_quan_ly = ?,
            so_luong_hien_tai = ?,
            giai_doan_hien_tai = 'RECEIVED'
        WHERE ma_lo_nong_san = ?
        `,
        [maCoSo, khoiLuongThucTe, rows[0].ma_lo_nong_san],
      );
    });

    return res.json({ success: true, message: "Đã tiếp nhận lô hàng vào kho" });
  } catch (err) {
    return sendError(res, err, "Lỗi xác nhận tiếp nhận lô:", "Không thể xác nhận tiếp nhận");
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

    await withTransaction(async (connection) => {
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
        throw new ApiError(409, "Lệnh vận chuyển không ở trạng thái có thể từ chối");
      }

      await connection.execute(
        `UPDATE lenh_van_chuyen SET trang_thai = 'TU_CHOI', ghi_chu = ? WHERE ma_van_don = ?`,
        [`Cơ sở từ chối tiếp nhận: ${lyDo}`, maVanDon],
      );
      // Blockchain: bên nhận ký từ chối, kèm 2 bước trả hàng (vận chuyển ký đã chở về, bên gửi ký đã nhận lại)
      await ghiSuKienTuChoiNhanHang(connection, maVanDon);
    });

    return res.json({ success: true, message: "Đã từ chối tiếp nhận lô hàng" });
  } catch (err) {
    return sendError(res, err, "Lỗi từ chối tiếp nhận lô:", "Không thể từ chối tiếp nhận");
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

const createProcessingBatch = async (req, res) => {
  try {
    const maCoSo = getProcessorId(req);

    const ma_lo_nguon = cleanText(req.body?.ma_lo_nguon);
    const tieu_de = cleanText(req.body?.tieu_de);
    const khu_vuc_so_che = cleanText(req.body?.khu_vuc_so_che);
    const quy_cach_tieu_chuan = cleanText(req.body?.quy_cach_tieu_chuan);
    const khoiLuongDauVao = toPositiveNumber(req.body?.khoi_luong_dau_vao);

    if (!ma_lo_nguon) throw new ApiError(400, "Vui lòng chọn lô thu hoạch tiếp nhận");
    if (!tieu_de) throw new ApiError(400, "Vui lòng nhập tên gọi lô sơ chế");
    if (!khoiLuongDauVao) throw new ApiError(400, "Khối lượng đưa vào phải lớn hơn 0");

    let maSoChe;

    for (let attempt = 1; ; attempt++) {
      try {
        maSoChe = await withTransaction(async (connection) => {
          const [lots] = await connection.execute(
            `
            SELECT ma_san_pham, ma_mua_vu, so_luong_hien_tai, don_vi_tinh, tinh_trang_su_dung
            FROM lo_nong_san
            WHERE ma_lo_nong_san = ? AND ma_nguoi_quan_ly = ?
            LIMIT 1
            FOR UPDATE
            `,
            [ma_lo_nguon, maCoSo],
          );

          if (lots.length === 0) {
            throw new ApiError(404, "Không tìm thấy lô nguồn thuộc cơ sở của bạn");
          }

          const lot = lots[0];

          if (lot.tinh_trang_su_dung !== "ACTIVE") {
            throw new ApiError(409, "Lô nguồn đã được sử dụng hết");
          }

          const lenhNguon = await lenhDangChayCuaLo(connection, ma_lo_nguon);
          if (lenhNguon) {
            throw new ApiError(409, `Lô nguồn đang có lệnh bàn giao ${lenhNguon}, chưa sơ chế được`);
          }

          if (khoiLuongDauVao > Number(lot.so_luong_hien_tai)) {
            throw new ApiError(
              400,
              `Khối lượng đưa vào vượt quá khối lượng còn lại của lô nguồn (${lot.so_luong_hien_tai} ${lot.don_vi_tinh})`,
            );
          }

          const newMaLo = await generateCode(connection, "lo_nong_san", "ma_lo_nong_san", "LO");

          await connection.execute(
            `
            INSERT INTO lo_nong_san
            (ma_lo_nong_san, ma_mua_vu, ma_san_pham, ma_nguoi_quan_ly, so_luong_hien_tai, don_vi_tinh, giai_doan_hien_tai)
            VALUES (?, ?, ?, ?, ?, ?, 'PROCESSED')
            `,
            [newMaLo, lot.ma_mua_vu, lot.ma_san_pham, maCoSo, khoiLuongDauVao, lot.don_vi_tinh],
          );

          const conLai = Math.round((Number(lot.so_luong_hien_tai) - khoiLuongDauVao) * 1000) / 1000;

          await connection.execute(
            `
            UPDATE lo_nong_san
            SET so_luong_hien_tai = ?,
                tinh_trang_su_dung = IF(? <= 0, 'CONSUMED_BY_TRANSFORM', tinh_trang_su_dung)
            WHERE ma_lo_nong_san = ?
            `,
            [conLai, conLai, ma_lo_nguon],
          );

          const maLienKet = await generateCode(connection, "lien_ket_nguon_goc_lo", "ma_lien_ket", "LK");
          const relationGroupId = await generateCode(
            connection,
            "lien_ket_nguon_goc_lo",
            "relation_group_id",
            "REL",
          );

          await connection.execute(
            `
            INSERT INTO lien_ket_nguon_goc_lo
            (ma_lien_ket, relation_group_id, ma_lo_nguon, ma_lo_duoc_tao_ra, loai_lien_ket, so_luong_tham_gia, don_vi_tinh)
            VALUES (?, ?, ?, ?, 'TRANSFORM', ?, ?)
            `,
            [maLienKet, relationGroupId, ma_lo_nguon, newMaLo, khoiLuongDauVao, lot.don_vi_tinh],
          );

          const newMaSoChe = await generateCode(connection, "so_che_lo_hang", "ma_so_che", "SC");

          await connection.execute(
            `
            INSERT INTO so_che_lo_hang
            (ma_so_che, ma_co_so, ma_lo_moi, tieu_de, khu_vuc_so_che, quy_cach_tieu_chuan, ngay_bat_dau)
            VALUES (?, ?, ?, ?, ?, ?, CURDATE())
            `,
            [newMaSoChe, maCoSo, newMaLo, tieu_de, khu_vuc_so_che, quy_cach_tieu_chuan],
          );

          // Blockchain: cơ sở ký tạo lô sơ chế từ lô nguồn (createChild, trừ khối lượng lô nguồn trên chain)
          await ghiSuKienLoCon(connection, newMaLo);

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
      message: "Tạo lô sơ chế thành công",
      data: { ma_so_che: maSoChe },
    });
  } catch (err) {
    return sendError(res, err, "Lỗi tạo lô sơ chế:", "Không thể tạo lô sơ chế");
  }
};

const GIAI_DOAN_SO_CHE_HOP_LE = ["DANG_RUA_KHU_KHUAN", "DANG_PHAN_LOAI", "DANG_DONG_GOI", "DA_HOAN_TAT"];

const updateProcessingStage = async (req, res) => {
  const { maSoChe } = req.params;

  try {
    const maCoSo = getProcessorId(req);
    const giaiDoan = cleanText(req.body?.giai_doan);

    if (!GIAI_DOAN_SO_CHE_HOP_LE.includes(giaiDoan)) {
      throw new ApiError(400, "Giai đoạn sơ chế không hợp lệ");
    }

    await withTransaction(async (connection) => {
      const [rows] = await connection.execute(
        `SELECT ma_lo_moi FROM so_che_lo_hang WHERE ma_so_che = ? AND ma_co_so = ? LIMIT 1 FOR UPDATE`,
        [maSoChe, maCoSo],
      );

      if (rows.length === 0) {
        throw new ApiError(404, "Không tìm thấy lô sơ chế");
      }

      const lenh = await lenhDangChayCuaLo(connection, rows[0].ma_lo_moi);
      if (lenh) {
        throw new ApiError(409, `Lô đã có lệnh bàn giao ${lenh}, không đổi giai đoạn sơ chế được nữa`);
      }

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

      // Blockchain: "đang đóng gói" -> ký sơ chế xong; "hoàn tất" -> ký sơ chế xong + đóng gói xong
      await ghiSuKienGiaiDoanSoChe(connection, maSoChe, giaiDoan);
    });

    return res.json({ success: true, message: "Đã cập nhật trạng thái sơ chế" });
  } catch (err) {
    return sendError(res, err, "Lỗi cập nhật trạng thái sơ chế:", "Không thể cập nhật trạng thái");
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
        throw new ApiError(409, "Lô đã được tách/gộp hoặc không còn khả dụng, không thể sửa thông tin");
      }

      // Đã bàn giao vận chuyển thì các bên khác đã nhìn thấy thông tin này
      const [shipped] = await connection.execute(
        `SELECT ma_van_don FROM lenh_van_chuyen WHERE ma_lo_nong_san = ? AND trang_thai NOT IN ('TU_CHOI', 'DA_HUY') LIMIT 1`,
        [rows[0].ma_lo_moi],
      );

      if (shipped.length > 0) {
        throw new ApiError(409, "Lô đã có lệnh bàn giao vận chuyển, không thể sửa thông tin");
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

    return res.json({ success: true, message: "Đã cập nhật thông tin lô sơ chế" });
  } catch (err) {
    return sendError(res, err, "Lỗi sửa thông tin lô sơ chế:", "Không thể sửa thông tin lô sơ chế");
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

      const [shipped] = await connection.execute(
        `SELECT ma_van_don FROM lenh_van_chuyen WHERE ma_lo_nong_san = ? AND trang_thai != 'DA_HUY' LIMIT 1`,
        [maLoMoi],
      );

      if (shipped.length > 0) {
        throw new ApiError(409, "Lô đã có lệnh bàn giao vận chuyển, không thể xóa");
      }

      // Đã gửi / ký lên blockchain thì không xóa (trên chain lô sơ chế đã tồn tại và đã trừ khối lượng lô nguồn)
      if (!(await xoaSuKienChuaKy(connection, maLoMoi))) {
        throw new ApiError(409, "Lô sơ chế đã được ký lên blockchain, không thể xóa");
      }

      const [nguon] = await connection.execute(
        `SELECT ma_lo_nguon, so_luong_tham_gia FROM lien_ket_nguon_goc_lo WHERE ma_lo_duoc_tao_ra = ? AND loai_lien_ket = 'TRANSFORM'`,
        [maLoMoi],
      );

      await connection.execute(`DELETE FROM so_che_lo_hang WHERE ma_so_che = ?`, [maSoChe]);
      await connection.execute(`DELETE FROM lien_ket_nguon_goc_lo WHERE ma_lo_duoc_tao_ra = ?`, [maLoMoi]);
      await connection.execute(`DELETE FROM lo_nong_san WHERE ma_lo_nong_san = ?`, [maLoMoi]);

      // Hoàn lại khối lượng cho lô nguồn (TRANSFORM luôn có đúng 1 nguồn)
      if (nguon.length > 0) {
        await connection.execute(
          `
          UPDATE lo_nong_san
          SET so_luong_hien_tai = so_luong_hien_tai + ?,
              tinh_trang_su_dung = 'ACTIVE'
          WHERE ma_lo_nong_san = ?
          `,
          [nguon[0].so_luong_tham_gia, nguon[0].ma_lo_nguon],
        );
      }
    });

    return res.json({ success: true, message: "Đã xóa lô sơ chế" });
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

    return res.json({ success: true, data: rows });
  } catch (err) {
    return sendError(res, err, "Lỗi lấy danh sách lô khả dụng:", "Không thể lấy danh sách lô");
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

    return res.json({ success: true, data: rows });
  } catch (err) {
    return sendError(res, err, "Lỗi lấy nhật ký tách/gộp lô:", "Không thể lấy nhật ký tách/gộp lô");
  }
};

const splitBatch = async (req, res) => {
  try {
    const maCoSo = getProcessorId(req);

    const ma_lo_goc = cleanText(req.body?.ma_lo_goc);
    const children = Array.isArray(req.body?.children) ? req.body.children : [];

    if (!ma_lo_goc) throw new ApiError(400, "Vui lòng chọn lô gốc cần tách");
    if (children.length < 2) throw new ApiError(400, "Cần ít nhất 2 lô con để tách");

    const parsedChildren = children.map((c) => ({
      khoi_luong: toPositiveNumber(c.khoi_luong),
      pham_cap: cleanText(c.pham_cap),
    }));

    if (parsedChildren.some((c) => !c.khoi_luong)) {
      throw new ApiError(400, "Khối lượng mỗi lô con phải lớn hơn 0");
    }

    const tongKhoiLuong =
      Math.round(parsedChildren.reduce((sum, c) => sum + c.khoi_luong, 0) * 1000) / 1000;

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

      if (lots.length === 0) throw new ApiError(404, "Không tìm thấy lô gốc thuộc cơ sở của bạn");

      const lot = lots[0];
      if (lot.tinh_trang_su_dung !== "ACTIVE") {
        throw new ApiError(409, "Lô gốc đã được sử dụng hết");
      }
      const lenhGoc = await lenhDangChayCuaLo(connection, ma_lo_goc);
      if (lenhGoc) {
        throw new ApiError(409, `Lô gốc đang có lệnh bàn giao ${lenhGoc}, chưa tách được`);
      }
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
        const newMaLo = await generateCode(connection, "lo_nong_san", "ma_lo_nong_san", "LO");

        await connection.execute(
          `
          INSERT INTO lo_nong_san
          (ma_lo_nong_san, ma_mua_vu, ma_san_pham, ma_nguoi_quan_ly, so_luong_hien_tai, don_vi_tinh, giai_doan_hien_tai, ghi_chu)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [newMaLo, lot.ma_mua_vu, lot.ma_san_pham, maCoSo, child.khoi_luong, lot.don_vi_tinh, lot.giai_doan_hien_tai, child.pham_cap],
        );

        const maLienKet = await generateCode(connection, "lien_ket_nguon_goc_lo", "ma_lien_ket", "LK");

        await connection.execute(
          `
          INSERT INTO lien_ket_nguon_goc_lo
          (ma_lien_ket, relation_group_id, ma_lo_nguon, ma_lo_duoc_tao_ra, loai_lien_ket, so_luong_tham_gia, don_vi_tinh)
          VALUES (?, ?, ?, ?, 'SPLIT', ?, ?)
          `,
          [maLienKet, relationGroupId, ma_lo_goc, newMaLo, child.khoi_luong, lot.don_vi_tinh],
        );

        // Blockchain: mỗi lô con một lần ký createChild (lấy đúng phần khối lượng của nó từ lô gốc)
        await ghiSuKienLoCon(connection, newMaLo);
      }

      const conLai = Math.round((Number(lot.so_luong_hien_tai) - tongKhoiLuong) * 1000) / 1000;

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

    return res.status(201).json({ success: true, message: "Đã tách lô thành công" });
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

    if (maLoNguonList.length < 2) throw new ApiError(400, "Cần chọn ít nhất 2 lô để gộp");

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
        throw new ApiError(404, "Có lô không tồn tại hoặc không thuộc cơ sở của bạn");
      }

      if (lots.some((l) => l.tinh_trang_su_dung !== "ACTIVE")) {
        throw new ApiError(409, "Có lô đã được sử dụng hết, không thể gộp");
      }
      for (const l of lots) {
        const lenh = await lenhDangChayCuaLo(connection, l.ma_lo_nong_san);
        if (lenh) throw new ApiError(409, `Lô ${l.ma_lo_nong_san} đang có lệnh bàn giao ${lenh}, chưa gộp được`);
      }

      const maSanPham = lots[0].ma_san_pham;
      if (lots.some((l) => l.ma_san_pham !== maSanPham)) {
        throw new ApiError(400, "Chỉ có thể gộp các lô cùng loại sản phẩm");
      }

      const donViTinh = lots[0].don_vi_tinh;
      const tongKhoiLuong =
        Math.round(lots.reduce((sum, l) => sum + Number(l.so_luong_hien_tai), 0) * 1000) / 1000;

      const newMaLo = await generateCode(connection, "lo_nong_san", "ma_lo_nong_san", "LO");

      await connection.execute(
        `
        INSERT INTO lo_nong_san
        (ma_lo_nong_san, ma_mua_vu, ma_san_pham, ma_nguoi_quan_ly, so_luong_hien_tai, don_vi_tinh, giai_doan_hien_tai, ghi_chu)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [newMaLo, lots[0].ma_mua_vu, maSanPham, maCoSo, tongKhoiLuong, donViTinh, lots[0].giai_doan_hien_tai, tieu_de],
      );

      const relationGroupId = await generateCode(
        connection,
        "lien_ket_nguon_goc_lo",
        "relation_group_id",
        "REL",
      );

      for (const lot of lots) {
        const maLienKet = await generateCode(connection, "lien_ket_nguon_goc_lo", "ma_lien_ket", "LK");

        await connection.execute(
          `
          INSERT INTO lien_ket_nguon_goc_lo
          (ma_lien_ket, relation_group_id, ma_lo_nguon, ma_lo_duoc_tao_ra, loai_lien_ket, so_luong_tham_gia, don_vi_tinh)
          VALUES (?, ?, ?, ?, 'MERGE', ?, ?)
          `,
          [maLienKet, relationGroupId, lot.ma_lo_nong_san, newMaLo, lot.so_luong_hien_tai, donViTinh],
        );

        await connection.execute(
          `UPDATE lo_nong_san SET so_luong_hien_tai = 0, tinh_trang_su_dung = 'CONSUMED_BY_MERGE' WHERE ma_lo_nong_san = ?`,
          [lot.ma_lo_nong_san],
        );
      }

      // Blockchain: cơ sở ký tạo lô gộp từ các lô nguồn (createChild với nhiều lô nguồn cùng sản phẩm)
      await ghiSuKienLoCon(connection, newMaLo);
    });

    return res.status(201).json({ success: true, message: "Đã gộp lô thành công" });
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
          AND NOT EXISTS (
            SELECT 1 FROM lenh_van_chuyen v
            WHERE v.ma_lo_nong_san = sc.ma_lo_moi AND v.trang_thai != 'DA_HUY'
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
            WHERE v.ma_lo_nong_san = lo.ma_lo_nong_san AND v.trang_thai != 'DA_HUY'
          )
          AND NOT EXISTS (SELECT 1 FROM so_che_lo_hang sc2 WHERE sc2.ma_lo_moi = lo.ma_lo_nong_san)
        GROUP BY lo.ma_lo_nong_san, lo.ghi_chu, sp.ten_san_pham, lo.so_luong_hien_tai, lo.don_vi_tinh
      ) ready
      ORDER BY thoi_diem DESC
      `,
      [maCoSo, maCoSo],
    );

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

    return res.json({ success: true, data: rows });
  } catch (err) {
    return sendError(res, err, "Lỗi lấy danh sách bàn giao:", "Không thể lấy danh sách bàn giao");
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
      return res.status(404).json({ success: false, message: "Không tìm thấy vận đơn" });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return sendError(res, err, "Lỗi lấy chi tiết vận đơn:", "Không thể lấy chi tiết vận đơn");
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
    const ten_tai_xe = cleanText(req.body?.ten_tai_xe);
    const bien_so_xe = cleanText(req.body?.bien_so_xe);
    const ma_ben_nhan = cleanText(req.body?.ma_ben_nhan);
    let dia_chi_giao_hang = cleanText(req.body?.dia_chi_giao_hang);
    const ghi_chu = cleanText(req.body?.ghi_chu);

    if (!ma_lo_nong_san) throw new ApiError(400, "Vui lòng chọn lô hàng cần bàn giao");
    if (!ma_don_vi_van_chuyen) throw new ApiError(400, "Vui lòng chọn đơn vị vận chuyển");
    if (!ma_ben_nhan && !dia_chi_giao_hang)
      throw new ApiError(400, "Vui lòng chọn nhà phân phối nhận hàng hoặc nhập điểm giao hàng");
    // Có blockchain thì bên nhận phải là tài khoản (ký nhận hàng bằng ví), không giao tới địa chỉ tự do
    if (!ma_ben_nhan && layCauHinh().daCauHinh)
      throw new ApiError(400, "Lô được truy xuất trên blockchain nên phải chọn nhà phân phối có tài khoản (bên nhận phải ký nhận hàng)");
    if (!ten_tai_xe) throw new ApiError(400, "Vui lòng nhập tên tài xế tiếp nhận");
    if (!bien_so_xe) throw new ApiError(400, "Vui lòng nhập biển số xe");

    let maVanDon;

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
            throw new ApiError(404, "Không tìm thấy lô hàng thuộc cơ sở của bạn");
          }

          if (lots[0].tinh_trang_su_dung !== "ACTIVE") {
            throw new ApiError(409, "Lô hàng không còn khả dụng");
          }

          const [existing] = await connection.execute(
            `SELECT ma_van_don FROM lenh_van_chuyen WHERE ma_lo_nong_san = ? AND trang_thai != 'DA_HUY' LIMIT 1`,
            [ma_lo_nong_san],
          );

          if (existing.length > 0) {
            throw new ApiError(409, `Lô đã có lệnh bàn giao ${existing[0].ma_van_don}`);
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
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
            `,
            [
              newCode,
              ma_lo_nong_san,
              maCoSo,
              ma_don_vi_van_chuyen,
              ma_ben_nhan || null,
              dia_chi_giao_hang,
              ten_tai_xe,
              bien_so_xe,
              lots[0].so_luong_hien_tai,
              lots[0].don_vi_tinh,
              ghi_chu,
            ],
          );

          // Blockchain: cơ sở sơ chế ký tạo lệnh bàn giao (gắn ví vận chuyển + ví nhà phân phối)
          await ghiSuKienVanDon(connection, newCode, "TRANSPORT_ORDERED", maCoSo);

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
      const thieu = await chuaCoViDuyet(db, [lenh.ma_nguoi_gui, lenh.ma_don_vi_van_chuyen, lenh.ma_ben_nhan]);
      if (thieu.length > 0) {
        canhBaoVi = `. Lưu ý: ${thieu.join(", ")} chưa có ví blockchain được duyệt nên các bước ký của lệnh này sẽ chờ`;
      }
    } catch {
      canhBaoVi = "";
    }

    return res.status(201).json({
      success: true,
      message: `Đã tạo lệnh bàn giao vận chuyển${canhBaoVi}`,
      data: { ma_van_don: maVanDon },
    });
  } catch (err) {
    return sendError(res, err, "Lỗi tạo lệnh bàn giao:", "Không thể tạo lệnh bàn giao");
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
      return res.status(404).json({ success: false, message: "Không tìm thấy lô sơ chế" });
    }

    const batch = scRows[0];

    // Bước 1: lô nguồn trực tiếp (TRANSFORM)
    const [transformLink] = await db.execute(
      `SELECT ma_lo_nguon FROM lien_ket_nguon_goc_lo WHERE ma_lo_duoc_tao_ra = ? AND loai_lien_ket = 'TRANSFORM' LIMIT 1`,
      [batch.ma_lo_moi],
    );

    let lineageType = "ORIGINAL";
    let lineageSources = [];
    const directSource = transformLink[0]?.ma_lo_nguon || null;

    if (directSource) {
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
        [directSource],
      );

      if (upstream.length > 0) {
        lineageType = upstream[0].loai_lien_ket === "MERGE" ? "MERGED" : "SPLIT";
        lineageSources = upstream;
      } else {
        lineageType = "ORIGINAL";
        lineageSources = [{ ma_lo_nguon: directSource }];
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
        lineage_direct_source: directSource,
        lineage_sources: lineageSources,
        inspections,
      },
    });
  } catch (err) {
    return sendError(res, err, "Lỗi lấy chi tiết lô sơ chế:", "Không thể lấy chi tiết lô sơ chế");
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
