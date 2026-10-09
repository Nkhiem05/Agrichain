const db = require("../config/db");

/*
==================================================
TIỆN ÍCH
==================================================
*/

// Lỗi nghiệp vụ: ném ra trong transaction để trả về đúng mã HTTP
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Sản lượng nhập theo kg
const DON_VI_TINH = "kg";
const MAX_SAN_LUONG = 999999999;

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

// Trả về { status, message } cho lỗi nghiệp vụ, còn lại là lỗi 500
const sendError = (res, err, logMessage, fallbackMessage) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
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

/*
Kiểm tra và chuẩn hóa sản lượng + ngày thu hoạch từ request body.
Ném ApiError(400) nếu dữ liệu sai.
*/
const parseHarvestBody = (body = {}) => {
  const so_luong = Number(body.so_luong);
  const ngay_thu_hoach = cleanText(body.ngay_thu_hoach);

  if (!Number.isFinite(so_luong) || so_luong <= 0) {
    throw new ApiError(400, "Sản lượng phải lớn hơn 0");
  }

  if (so_luong > MAX_SAN_LUONG) {
    throw new ApiError(400, "Sản lượng quá lớn");
  }

  if (!ngay_thu_hoach || !isValidDate(ngay_thu_hoach)) {
    throw new ApiError(400, "Ngày thu hoạch không hợp lệ");
  }

  // DB lưu 3 chữ số thập phân
  return { so_luong: Math.round(so_luong * 1000) / 1000, ngay_thu_hoach };
};

const BATCH_SELECT = `
  SELECT
    lo.ma_lo_nong_san,
    lo.ma_mua_vu,
    mv.loai_cay_trong,
    mv.giong_cay,
    mv.ma_nong_trai,
    nt.ten_nong_trai,
    mv.ma_thua_dat,
    td.ten_thua_dat,
    lo.ma_san_pham,
    sp.ten_san_pham,
    lo.so_luong_hien_tai,
    lo.don_vi_tinh,
    DATE_FORMAT(lo.ngay_thu_hoach, '%Y-%m-%d') AS ngay_thu_hoach,
    lo.giai_doan_hien_tai,
    lo.tinh_trang_su_dung,
    lo.blockchain_sync_status,
    lo.created_at,
    lo.updated_at
  FROM lo_nong_san lo
  LEFT JOIN mua_vu mv
    ON lo.ma_mua_vu = mv.ma_mua_vu
  LEFT JOIN nong_trai nt
    ON mv.ma_nong_trai = nt.ma_nong_trai
  LEFT JOIN thua_dat td
    ON mv.ma_thua_dat = td.ma_thua_dat
  LEFT JOIN san_pham_nong_san sp
    ON lo.ma_san_pham = sp.ma_san_pham
`;

// Sinh mã dạng PREFIX001, PREFIX002, ... (không trùng với mã đã có)
const generateCode = async (connection, table, column, prefix) => {
  const [rows] = await connection.query(
    `
    SELECT COALESCE(MAX(CAST(SUBSTRING(${column}, ?) AS UNSIGNED)), 0) AS max_no
    FROM ${table}
    WHERE ${column} REGEXP ?
    `,
    [prefix.length + 1, `^${prefix}[0-9]+$`],
  );

  return prefix + String(Number(rows[0].max_no) + 1).padStart(3, "0");
};

// Lô chỉ được sửa/xóa khi chưa có sự kiện truy xuất và chưa gửi kiểm định
const assertBatchEditable = async (connection, maLo) => {
  const [rows] = await connection.execute(
    `
    SELECT giai_doan_hien_tai, tinh_trang_su_dung, latest_event_sequence
    FROM lo_nong_san
    WHERE ma_lo_nong_san = ?
    LIMIT 1
    FOR UPDATE
    `,
    [maLo],
  );

  if (rows.length === 0 || rows[0].tinh_trang_su_dung === "CANCELLED") {
    throw new ApiError(404, "Không tìm thấy lô nông sản");
  }

  const lo = rows[0];

  if (
    lo.tinh_trang_su_dung !== "ACTIVE" ||
    lo.giai_doan_hien_tai !== "CREATED" ||
    Number(lo.latest_event_sequence) > 0
  ) {
    throw new ApiError(
      409,
      "Lô đã có sự kiện truy xuất nguồn gốc nên không thể thay đổi",
    );
  }

  // Bảng kiểm định có thể chưa được tạo trong CSDL
  try {
    const [inspections] = await connection.execute(
      `
      SELECT ma_ho_so
      FROM kiem_dinh_lo_hang
      WHERE ma_lo_nong_san = ?
        AND trang_thai_ho_so <> 'TU_CHOI'
      LIMIT 1
      `,
      [maLo],
    );

    if (inspections.length > 0) {
      throw new ApiError(
        409,
        `Lô đã có hồ sơ kiểm định ${inspections[0].ma_ho_so} nên không thể thay đổi`,
      );
    }
  } catch (err) {
    if (err.code !== "ER_NO_SUCH_TABLE") throw err;
  }

  // Lô đang có lệnh vận chuyển còn hiệu lực thì không đổi số liệu (bảng có thể chưa được tạo)
  try {
    const [shipments] = await connection.execute(
      `
      SELECT ma_van_don
      FROM lenh_van_chuyen
      WHERE ma_lo_nong_san = ?
        AND trang_thai NOT IN ('TU_CHOI', 'DA_HUY')
      LIMIT 1
      `,
      [maLo],
    );

    if (shipments.length > 0) {
      throw new ApiError(
        409,
        `Lô đang có lệnh vận chuyển ${shipments[0].ma_van_don} nên không thể thay đổi`,
      );
    }
  } catch (err) {
    if (err.code !== "ER_NO_SUCH_TABLE") throw err;
  }
};

// Lô nông sản cần có sản phẩm: dùng sản phẩm trùng tên cây trồng, chưa có thì tạo mới.
// So khớp chính xác (phân biệt dấu): collation unicode_ci coi "Xoài" = "Xoải" = "Xoai"
const findOrCreateProduct = async (connection, tenSanPham) => {
  const [found] = await connection.execute(
    `
    SELECT ma_san_pham
    FROM san_pham_nong_san
    WHERE LOWER(ten_san_pham) COLLATE utf8mb4_bin = ?
      AND trang_thai = 1
    LIMIT 1
    `,
    [tenSanPham.toLowerCase()],
  );

  if (found.length > 0) return found[0].ma_san_pham;

  const maSanPham = await generateCode(
    connection,
    "san_pham_nong_san",
    "ma_san_pham",
    "SP",
  );

  await connection.execute(
    `
    INSERT INTO san_pham_nong_san
    (ma_san_pham, ten_san_pham, loai_san_pham, don_vi_tinh_mac_dinh)
    VALUES (?, ?, 'Nông sản', ?)
    `,
    [maSanPham, tenSanPham, DON_VI_TINH],
  );

  return maSanPham;
};

/*
==================================================
THỐNG KÊ (3 ô số liệu đầu trang)
==================================================
*/

const getBatchStats = async (req, res) => {
  const { maNguoiDung } = req.params;

  try {
    // Mùa vụ đang triển khai nhưng chưa tạo lô thu hoạch nào
    const [waitingRows] = await db.execute(
      `
      SELECT COUNT(*) AS cho_thu_hoach
      FROM mua_vu mv
      JOIN nong_trai nt
        ON mv.ma_nong_trai = nt.ma_nong_trai
      WHERE nt.ma_nguoi_dung = ?
        AND nt.trang_thai = 1
        AND mv.trang_thai = 1
        AND NOT EXISTS (
          SELECT 1
          FROM lo_nong_san lo
          WHERE lo.ma_mua_vu = mv.ma_mua_vu
            AND lo.tinh_trang_su_dung <> 'CANCELLED'
        )
      `,
      [maNguoiDung],
    );

    const [plotRows] = await db.execute(
      `
      SELECT COUNT(*) AS so_lo_canh_tac
      FROM thua_dat td
      JOIN nong_trai nt
        ON td.ma_nong_trai = nt.ma_nong_trai
      WHERE nt.ma_nguoi_dung = ?
        AND nt.trang_thai = 1
        AND td.trang_thai = 'DANG_CANH_TAC'
      `,
      [maNguoiDung],
    );

    const [batchRows] = await db.execute(
      `
      SELECT COUNT(*) AS tong_so_lo
      FROM lo_nong_san lo
      LEFT JOIN mua_vu mv
        ON lo.ma_mua_vu = mv.ma_mua_vu
      LEFT JOIN nong_trai nt
        ON mv.ma_nong_trai = nt.ma_nong_trai
      WHERE (nt.ma_nguoi_dung = ? OR lo.ma_nguoi_quan_ly = ?)
        AND lo.tinh_trang_su_dung <> 'CANCELLED'
      `,
      [maNguoiDung, maNguoiDung],
    );

    return res.json({
      success: true,
      data: {
        cho_thu_hoach: Number(waitingRows[0].cho_thu_hoach),
        so_lo_canh_tac: Number(plotRows[0].so_lo_canh_tac),
        tong_so_lo: Number(batchRows[0].tong_so_lo),
      },
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi thống kê lô thu hoạch:",
      "Không thể lấy thống kê lô thu hoạch",
    );
  }
};

/*
==================================================
LÔ THU HOẠCH
==================================================
*/

const getBatches = async (req, res) => {
  const { maNguoiDung } = req.params;
  const { ma_nong_trai } = req.query;

  // Lô thuộc nông trại của nông dân, hoặc lô do nông dân quản lý
  let sql = `
    ${BATCH_SELECT}
    WHERE (nt.ma_nguoi_dung = ? OR lo.ma_nguoi_quan_ly = ?)
      AND lo.tinh_trang_su_dung <> 'CANCELLED'
  `;
  const params = [maNguoiDung, maNguoiDung];

  if (ma_nong_trai) {
    sql += ` AND mv.ma_nong_trai = ?`;
    params.push(ma_nong_trai);
  }

  sql += ` ORDER BY lo.created_at DESC, lo.ma_lo_nong_san DESC`;

  try {
    const [results] = await db.execute(sql, params);
    return res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy lô thu hoạch:",
      "Không thể lấy danh sách lô thu hoạch",
    );
  }
};

const getBatchById = async (req, res) => {
  const { maLo } = req.params;

  try {
    const [results] = await db.execute(
      `
      ${BATCH_SELECT}
      WHERE lo.ma_lo_nong_san = ?
      LIMIT 1
      `,
      [maLo],
    );

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lô nông sản",
      });
    }

    return res.json({
      success: true,
      data: results[0],
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy lô theo id:",
      "Không thể lấy thông tin lô nông sản",
    );
  }
};

const createBatch = async (req, res) => {
  try {
    const ma_mua_vu = cleanText(req.body?.ma_mua_vu);

    if (!ma_mua_vu) {
      throw new ApiError(400, "Vui lòng chọn mùa vụ thu hoạch");
    }

    const harvest = parseHarvestBody(req.body);

    // Mã lô/mã sản phẩm do server sinh; thử lại nếu 2 request cùng lúc sinh trùng mã
    let ma_lo_nong_san;

    for (let attempt = 1; ; attempt++) {
      try {
        ma_lo_nong_san = await withTransaction(async (connection) => {
          const [seasons] = await connection.execute(
            `
            SELECT
              mv.loai_cay_trong,
              DATE_FORMAT(mv.ngay_gieo_trong, '%Y-%m-%d') AS ngay_gieo_trong,
              nt.ma_nguoi_dung
            FROM mua_vu mv
            JOIN nong_trai nt
              ON mv.ma_nong_trai = nt.ma_nong_trai
            WHERE mv.ma_mua_vu = ?
              AND mv.trang_thai = 1
              AND nt.trang_thai = 1
            LIMIT 1
            `,
            [ma_mua_vu],
          );

          if (seasons.length === 0) {
            throw new ApiError(404, "Không tìm thấy mùa vụ");
          }

          const season = seasons[0];
          if (harvest.ngay_thu_hoach < season.ngay_gieo_trong) {
            throw new ApiError(
              400,
              "Ngày thu hoạch không được trước ngày bắt đầu mùa vụ",
            );
          }

          const maSanPham = await findOrCreateProduct(
            connection,
            season.loai_cay_trong,
          );

          const newCode = await generateCode(
            connection,
            "lo_nong_san",
            "ma_lo_nong_san",
            "LO",
          );

          await connection.execute(
            `
            INSERT INTO lo_nong_san
            (
              ma_lo_nong_san,
              ma_mua_vu,
              ma_san_pham,
              ma_nguoi_quan_ly,
              ngay_thu_hoach,
              so_luong_hien_tai,
              don_vi_tinh,
              giai_doan_hien_tai
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'CREATED')
            `,
            [
              newCode,
              ma_mua_vu,
              maSanPham,
              season.ma_nguoi_dung,
              harvest.ngay_thu_hoach,
              harvest.so_luong,
              DON_VI_TINH,
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
      message: "Tạo lô thu hoạch thành công",
      data: { ma_lo_nong_san },
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi tạo lô thu hoạch:",
      "Không thể tạo lô thu hoạch",
    );
  }
};

const updateBatch = async (req, res) => {
  const { maLo } = req.params;

  try {
    const harvest = parseHarvestBody(req.body);

    await withTransaction(async (connection) => {
      await assertBatchEditable(connection, maLo);

      await connection.execute(
        `
        UPDATE lo_nong_san
        SET
          ngay_thu_hoach = ?,
          so_luong_hien_tai = ?,
          don_vi_tinh = ?
        WHERE ma_lo_nong_san = ?
        `,
        [harvest.ngay_thu_hoach, harvest.so_luong, DON_VI_TINH, maLo],
      );
    });

    return res.json({
      success: true,
      message: "Cập nhật lô thu hoạch thành công",
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi cập nhật lô thu hoạch:",
      "Không thể cập nhật lô thu hoạch",
    );
  }
};

const deleteBatch = async (req, res) => {
  const { maLo } = req.params;

  try {
    await withTransaction(async (connection) => {
      await assertBatchEditable(connection, maLo);

      await connection.execute(
        `
        UPDATE lo_nong_san
        SET tinh_trang_su_dung = 'CANCELLED'
        WHERE ma_lo_nong_san = ?
        `,
        [maLo],
      );
    });

    return res.json({
      success: true,
      message: "Xóa lô thu hoạch thành công",
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi xóa lô thu hoạch:",
      "Không thể xóa lô thu hoạch",
    );
  }
};

module.exports = {
  getBatchStats,
  getBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch,
};
