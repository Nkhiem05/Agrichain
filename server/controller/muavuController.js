const fs = require("fs");
const path = require("path");
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

const LOAI_VAT_TU = ["PHAN_BON", "THUOC_BVTV"];

const UPLOAD_DIR = path.join(__dirname, "../upload");

// Đường dẫn ảnh lưu trong DB, ví dụ: /uploads/seasons/abc.jpg
const toImagePath = (file) => (file ? `/uploads/seasons/${file.filename}` : null);

// Xóa file ảnh trên đĩa (bỏ qua nếu không có hoặc nằm ngoài thư mục upload)
const removeImageFile = async (imagePath) => {
  if (!imagePath || !imagePath.startsWith("/uploads/")) return;

  const fullPath = path.join(UPLOAD_DIR, imagePath.slice("/uploads/".length));
  if (!fullPath.startsWith(UPLOAD_DIR + path.sep)) return;

  try {
    await fs.promises.unlink(fullPath);
  } catch (err) {
    if (err.code !== "ENOENT") console.error("Không xóa được ảnh:", err.message);
  }
};

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

// Các cột ngày trả về dạng YYYY-MM-DD để tránh lệch múi giờ khi JSON hóa
const SEASON_SELECT = `
  SELECT
    mv.ma_mua_vu,
    mv.ma_nong_trai,
    nt.ten_nong_trai,
    mv.ma_thua_dat,
    td.ten_thua_dat,
    td.loai_dat,
    mv.loai_cay_trong,
    mv.giong_cay,
    mv.anh_mua_vu,
    DATE_FORMAT(mv.ngay_gieo_trong, '%Y-%m-%d') AS ngay_gieo_trong,
    DATE_FORMAT(mv.ngay_thu_hoach_du_kien, '%Y-%m-%d') AS ngay_thu_hoach_du_kien,
    mv.trang_thai,
    mv.created_at,
    mv.updated_at
  FROM mua_vu mv
  JOIN nong_trai nt
    ON mv.ma_nong_trai = nt.ma_nong_trai
  LEFT JOIN thua_dat td
    ON mv.ma_thua_dat = td.ma_thua_dat
`;

const getSeasonMaterials = async (executor, maMuaVu) => {
  const [rows] = await executor.execute(
    `
    SELECT
      m.ma_su_dung,
      m.ma_vat_tu,
      v.loai_vat_tu,
      v.ten_vat_tu,
      v.don_vi_tinh,
      m.lieu_luong,
      DATE_FORMAT(m.ngay_su_dung, '%Y-%m-%d') AS ngay_su_dung
    FROM mua_vu_vat_tu m
    JOIN danh_muc_vat_tu v
      ON m.ma_vat_tu = v.ma_vat_tu
    WHERE m.ma_mua_vu = ?
    ORDER BY m.ngay_su_dung ASC, m.ma_su_dung ASC
    `,
    [maMuaVu],
  );

  return rows;
};

// Tiến trình của lô trên trang chi tiết: 1 Yêu cầu kiểm định, 2 Lấy mẫu, 3 Kết quả,
// 4 Vận chuyển, 5 Hoàn thành. Suy ra từ hồ sơ kiểm định và giai đoạn của lô.
const INSPECTION_STEP = {
  CHO_TIEP_NHAN: 1,
  DA_HEN_LICH: 2,
  DA_LAY_MAU: 3,
  DA_CONG_BO: 3,
};
const STAGE_STEP = {
  IN_TRANSIT: 4,
  RECEIVED: 5,
  DISTRIBUTED: 5,
  COMPLETED: 5,
};

// Các lô thu hoạch (chưa hủy) của mùa vụ, mới nhất trước, kèm bước tiến trình
const getSeasonBatches = async (executor, maMuaVu) => {
  const [batches] = await executor.execute(
    `
    SELECT
      ma_lo_nong_san,
      so_luong_hien_tai,
      don_vi_tinh,
      DATE_FORMAT(ngay_thu_hoach, '%Y-%m-%d') AS ngay_thu_hoach,
      giai_doan_hien_tai
    FROM lo_nong_san
    WHERE ma_mua_vu = ?
      AND tinh_trang_su_dung <> 'CANCELLED'
    ORDER BY created_at DESC, ma_lo_nong_san DESC
    `,
    [maMuaVu],
  );

  // Hồ sơ kiểm định mới nhất (không tính hồ sơ bị từ chối) của từng lô.
  // Bảng kiểm định có thể chưa được tạo trong CSDL.
  const inspectionByBatch = {};

  if (batches.length > 0) {
    try {
      const [inspections] = await executor.query(
        `
        SELECT ma_lo_nong_san, trang_thai_ho_so
        FROM kiem_dinh_lo_hang
        WHERE ma_lo_nong_san IN (?)
          AND trang_thai_ho_so <> 'TU_CHOI'
        ORDER BY created_at DESC
        `,
        [batches.map((batch) => batch.ma_lo_nong_san)],
      );

      for (const item of inspections) {
        if (!inspectionByBatch[item.ma_lo_nong_san]) {
          inspectionByBatch[item.ma_lo_nong_san] = item.trang_thai_ho_so;
        }
      }
    } catch (err) {
      if (err.code !== "ER_NO_SUCH_TABLE") throw err;
    }
  }

  return batches.map((batch) => ({
    ...batch,
    buoc_hien_tai: Math.max(
      1,
      INSPECTION_STEP[inspectionByBatch[batch.ma_lo_nong_san]] || 1,
      STAGE_STEP[batch.giai_doan_hien_tai] || 1,
    ),
  }));
};

// Sinh mã mùa vụ dạng MV001, MV002, ... (không bị trùng với mã đã có)
const generateSeasonCode = async (connection) => {
  const [rows] = await connection.query(
    `
    SELECT COALESCE(MAX(CAST(SUBSTRING(ma_mua_vu, 3) AS UNSIGNED)), 0) AS max_no
    FROM mua_vu
    WHERE ma_mua_vu REGEXP '^MV[0-9]+$'
    `,
  );

  return "MV" + String(Number(rows[0].max_no) + 1).padStart(3, "0");
};

/*
Kiểm tra và chuẩn hóa dữ liệu mùa vụ từ request body.
Ném ApiError(400) nếu dữ liệu sai.
*/
const parseSeasonBody = (body = {}) => {
  const loai_cay_trong = cleanText(body.loai_cay_trong);
  const giong_cay = cleanText(body.giong_cay);
  const ma_thua_dat = cleanText(body.ma_thua_dat);
  const ngay_gieo_trong = cleanText(body.ngay_gieo_trong);
  const ngay_thu_hoach_du_kien = cleanText(body.ngay_thu_hoach_du_kien);

  if (!loai_cay_trong) {
    throw new ApiError(400, "Vui lòng nhập tên mùa vụ / loại cây trồng");
  }

  if (!ngay_gieo_trong || !isValidDate(ngay_gieo_trong)) {
    throw new ApiError(400, "Ngày bắt đầu không hợp lệ");
  }

  if (ngay_thu_hoach_du_kien) {
    if (!isValidDate(ngay_thu_hoach_du_kien)) {
      throw new ApiError(400, "Ngày thu hoạch dự kiến không hợp lệ");
    }

    if (ngay_thu_hoach_du_kien < ngay_gieo_trong) {
      throw new ApiError(
        400,
        "Ngày thu hoạch dự kiến phải sau hoặc bằng ngày bắt đầu",
      );
    }
  }

  // Gửi multipart/form-data (có ảnh) thì vat_tu là chuỗi JSON
  let rawMaterials = body.vat_tu === undefined ? [] : body.vat_tu;

  if (typeof rawMaterials === "string") {
    try {
      rawMaterials = rawMaterials.trim() ? JSON.parse(rawMaterials) : [];
    } catch {
      throw new ApiError(400, "Danh sách vật tư không hợp lệ");
    }
  }

  if (!Array.isArray(rawMaterials)) {
    throw new ApiError(400, "Danh sách vật tư không hợp lệ");
  }

  const vat_tu = rawMaterials.map((item, index) => {
    const stt = index + 1;
    const ma_vat_tu = cleanText(item?.ma_vat_tu);
    const lieu_luong = Number(item?.lieu_luong);
    const ngay_su_dung = cleanText(item?.ngay_su_dung);

    if (!ma_vat_tu) {
      throw new ApiError(400, `Vật tư thứ ${stt}: vui lòng chọn phân/thuốc`);
    }

    if (!Number.isFinite(lieu_luong) || lieu_luong <= 0) {
      throw new ApiError(400, `Vật tư thứ ${stt}: liều lượng phải lớn hơn 0`);
    }

    if (!ngay_su_dung || !isValidDate(ngay_su_dung)) {
      throw new ApiError(400, `Vật tư thứ ${stt}: ngày sử dụng không hợp lệ`);
    }

    return { ma_vat_tu, lieu_luong, ngay_su_dung };
  });

  return {
    loai_cay_trong,
    giong_cay,
    ma_thua_dat,
    ngay_gieo_trong,
    ngay_thu_hoach_du_kien,
    vat_tu,
  };
};

// Thửa đất phải thuộc nông trại và chưa có mùa vụ nào đang triển khai
const assertPlotAvailable = async (
  connection,
  maThuaDat,
  maNongTrai,
  excludeMaMuaVu = null,
) => {
  // Khóa dòng thửa đất để 2 request cùng lúc không chọn trùng 1 thửa
  const [plots] = await connection.execute(
    `
    SELECT ma_nong_trai
    FROM thua_dat
    WHERE ma_thua_dat = ?
    LIMIT 1
    FOR UPDATE
    `,
    [maThuaDat],
  );

  if (plots.length === 0) {
    throw new ApiError(404, "Không tìm thấy thửa đất");
  }

  if (plots[0].ma_nong_trai !== maNongTrai) {
    throw new ApiError(400, "Thửa đất không thuộc nông trại đã chọn");
  }

  const [used] = await connection.execute(
    `
    SELECT ma_mua_vu
    FROM mua_vu
    WHERE ma_thua_dat = ?
      AND trang_thai = 1
      AND ma_mua_vu <> ?
    LIMIT 1
    `,
    [maThuaDat, excludeMaMuaVu || ""],
  );

  if (used.length > 0) {
    throw new ApiError(
      409,
      `Thửa đất đang được dùng cho mùa vụ ${used[0].ma_mua_vu}`,
    );
  }
};

// Mỗi vật tư phải có trong danh mục và còn hoạt động
const assertMaterialsValid = async (connection, vatTu) => {
  if (vatTu.length === 0) return;

  const ids = [...new Set(vatTu.map((item) => item.ma_vat_tu))];

  const [rows] = await connection.query(
    `
    SELECT ma_vat_tu
    FROM danh_muc_vat_tu
    WHERE ma_vat_tu IN (?)
      AND trang_thai = 1
    `,
    [ids],
  );

  const found = new Set(rows.map((row) => row.ma_vat_tu));
  const missing = ids.filter((id) => !found.has(id));

  if (missing.length > 0) {
    throw new ApiError(400, `Vật tư không tồn tại: ${missing.join(", ")}`);
  }
};

const insertMaterials = async (connection, maMuaVu, vatTu) => {
  if (vatTu.length === 0) return;

  await connection.query(
    `
    INSERT INTO mua_vu_vat_tu
    (ma_mua_vu, ma_vat_tu, lieu_luong, ngay_su_dung)
    VALUES ?
    `,
    [
      vatTu.map((item) => [
        maMuaVu,
        item.ma_vat_tu,
        item.lieu_luong,
        item.ngay_su_dung,
      ]),
    ],
  );
};

// Thửa đất không còn mùa vụ nào đang triển khai -> trả về đất trống
const releasePlotIfIdle = async (connection, maThuaDat) => {
  if (!maThuaDat) return;

  const [active] = await connection.execute(
    `
    SELECT ma_mua_vu
    FROM mua_vu
    WHERE ma_thua_dat = ?
      AND trang_thai = 1
    LIMIT 1
    `,
    [maThuaDat],
  );

  if (active.length === 0) {
    await connection.execute(
      `UPDATE thua_dat SET trang_thai = 'DAT_TRONG' WHERE ma_thua_dat = ?`,
      [maThuaDat],
    );
  }
};

/*
==================================================
DANH MỤC VẬT TƯ (phân bón / thuốc BVTV)
==================================================
*/

const getMaterials = async (req, res) => {
  const { loai } = req.query;

  if (loai && !LOAI_VAT_TU.includes(loai)) {
    return res.status(400).json({
      success: false,
      message: "Loại vật tư phải là PHAN_BON hoặc THUOC_BVTV",
    });
  }

  let sql = `
    SELECT
      ma_vat_tu,
      loai_vat_tu,
      ten_vat_tu,
      don_vi_tinh
    FROM danh_muc_vat_tu
    WHERE trang_thai = 1
  `;
  const params = [];

  if (loai) {
    sql += ` AND loai_vat_tu = ?`;
    params.push(loai);
  }

  sql += ` ORDER BY ten_vat_tu ASC`;

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
      "Lỗi lấy danh mục vật tư:",
      "Không thể lấy danh mục vật tư",
    );
  }
};

/*
==================================================
THỐNG KÊ (3 ô số liệu đầu trang)
==================================================
*/

const getSeasonStats = async (req, res) => {
  const { maNguoiDung } = req.params;
  const { ma_nong_trai } = req.query;

  const farmFilter = ma_nong_trai ? "AND nt.ma_nong_trai = ?" : "";
  const farmParams = ma_nong_trai ? [ma_nong_trai] : [];

  try {
    const [seasonRows] = await db.execute(
      `
      SELECT
        COUNT(*) AS dang_trien_khai,
        COALESCE(SUM(
          mv.ngay_thu_hoach_du_kien IS NOT NULL
          AND mv.ngay_thu_hoach_du_kien BETWEEN CURDATE()
            AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        ), 0) AS sap_thu_hoach
      FROM mua_vu mv
      JOIN nong_trai nt
        ON mv.ma_nong_trai = nt.ma_nong_trai
      WHERE nt.ma_nguoi_dung = ?
        AND nt.trang_thai = 1
        AND mv.trang_thai = 1
        ${farmFilter}
      `,
      [maNguoiDung, ...farmParams],
    );

    const [plotRows] = await db.execute(
      `
      SELECT
        COUNT(*) AS tong_so_lo,
        COALESCE(SUM(td.trang_thai = 'DANG_CANH_TAC'), 0) AS dang_canh_tac
      FROM thua_dat td
      JOIN nong_trai nt
        ON td.ma_nong_trai = nt.ma_nong_trai
      WHERE nt.ma_nguoi_dung = ?
        AND nt.trang_thai = 1
        ${farmFilter}
      `,
      [maNguoiDung, ...farmParams],
    );

    return res.json({
      success: true,
      data: {
        dang_trien_khai: Number(seasonRows[0].dang_trien_khai),
        sap_thu_hoach: Number(seasonRows[0].sap_thu_hoach),
        so_lo_dang_canh_tac: Number(plotRows[0].dang_canh_tac),
        tong_so_lo: Number(plotRows[0].tong_so_lo),
      },
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi thống kê mùa vụ:",
      "Không thể lấy thống kê mùa vụ",
    );
  }
};

/*
==================================================
MÙA VỤ
==================================================
*/

const getSeasons = async (req, res) => {
  const { maNguoiDung } = req.params;
  const { ma_nong_trai, keyword } = req.query;

  let sql = `
    ${SEASON_SELECT}
    WHERE nt.ma_nguoi_dung = ?
      AND nt.trang_thai = 1
      AND mv.trang_thai = 1
  `;
  const params = [maNguoiDung];

  if (ma_nong_trai) {
    sql += ` AND mv.ma_nong_trai = ?`;
    params.push(ma_nong_trai);
  }

  if (keyword && keyword.trim()) {
    sql += ` AND (mv.loai_cay_trong LIKE ? OR mv.giong_cay LIKE ? OR mv.ma_mua_vu LIKE ?)`;
    const like = `%${keyword.trim()}%`;
    params.push(like, like, like);
  }

  sql += ` ORDER BY mv.created_at DESC, mv.ma_mua_vu DESC`;

  try {
    const [results] = await db.execute(sql, params);
    return res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    return sendError(res, err, "Lỗi lấy mùa vụ:", "Không thể lấy mùa vụ");
  }
};

const getSeasonById = async (req, res) => {
  const { maMuaVu } = req.params;

  try {
    const [results] = await db.execute(
      `
      ${SEASON_SELECT}
      WHERE mv.ma_mua_vu = ?
        AND mv.trang_thai = 1
      LIMIT 1
      `,
      [maMuaVu],
    );

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy mùa vụ",
      });
    }

    const vat_tu = await getSeasonMaterials(db, maMuaVu);
    const lo_thu_hoach = await getSeasonBatches(db, maMuaVu);

    return res.json({
      success: true,
      data: { ...results[0], vat_tu, lo_thu_hoach },
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy mùa vụ theo id:",
      "Không thể lấy thông tin mùa vụ",
    );
  }
};

const createSeason = async (req, res) => {
  try {
    const ma_nong_trai = cleanText(req.body?.ma_nong_trai);

    if (!ma_nong_trai) {
      throw new ApiError(400, "Vui lòng chọn nông trại");
    }

    const season = parseSeasonBody(req.body);

    // Mã mùa vụ do server sinh; thử lại nếu 2 request cùng lúc sinh trùng mã
    let ma_mua_vu;

    for (let attempt = 1; ; attempt++) {
      try {
        ma_mua_vu = await withTransaction(async (connection) => {
          const [farms] = await connection.execute(
            `
            SELECT ma_nong_trai
            FROM nong_trai
            WHERE ma_nong_trai = ?
              AND trang_thai = 1
            LIMIT 1
            `,
            [ma_nong_trai],
          );

          if (farms.length === 0) {
            throw new ApiError(404, "Không tìm thấy nông trại");
          }

          if (season.ma_thua_dat) {
            await assertPlotAvailable(
              connection,
              season.ma_thua_dat,
              ma_nong_trai,
            );
          }

          await assertMaterialsValid(connection, season.vat_tu);

          const newCode = await generateSeasonCode(connection);

          await connection.execute(
            `
            INSERT INTO mua_vu
            (
              ma_mua_vu,
              ma_nong_trai,
              ma_thua_dat,
              loai_cay_trong,
              giong_cay,
              ngay_gieo_trong,
              ngay_thu_hoach_du_kien,
              anh_mua_vu
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              newCode,
              ma_nong_trai,
              season.ma_thua_dat,
              season.loai_cay_trong,
              season.giong_cay,
              season.ngay_gieo_trong,
              season.ngay_thu_hoach_du_kien,
              toImagePath(req.file),
            ],
          );

          await insertMaterials(connection, newCode, season.vat_tu);

          if (season.ma_thua_dat) {
            await connection.execute(
              `UPDATE thua_dat SET trang_thai = 'DANG_CANH_TAC' WHERE ma_thua_dat = ?`,
              [season.ma_thua_dat],
            );
          }

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
      message: "Thêm mùa vụ thành công",
      data: { ma_mua_vu },
    });
  } catch (err) {
    // Lưu thất bại thì bỏ ảnh vừa upload để không để file rác
    await removeImageFile(toImagePath(req.file));
    return sendError(res, err, "Lỗi tạo mùa vụ:", "Không thể thêm mùa vụ");
  }
};

const updateSeason = async (req, res) => {
  const { maMuaVu } = req.params;
  const newImage = toImagePath(req.file);
  let oldImage = null;

  try {
    const season = parseSeasonBody(req.body);

    await withTransaction(async (connection) => {
      const [current] = await connection.execute(
        `
        SELECT ma_nong_trai, ma_thua_dat, anh_mua_vu
        FROM mua_vu
        WHERE ma_mua_vu = ?
          AND trang_thai = 1
        LIMIT 1
        FOR UPDATE
        `,
        [maMuaVu],
      );

      if (current.length === 0) {
        throw new ApiError(404, "Không tìm thấy mùa vụ");
      }

      const { ma_nong_trai, ma_thua_dat: oldPlot } = current[0];
      oldImage = current[0].anh_mua_vu;

      if (season.ma_thua_dat) {
        await assertPlotAvailable(
          connection,
          season.ma_thua_dat,
          ma_nong_trai,
          maMuaVu,
        );
      }

      await assertMaterialsValid(connection, season.vat_tu);

      await connection.execute(
        `
        UPDATE mua_vu
        SET
          ma_thua_dat = ?,
          loai_cay_trong = ?,
          giong_cay = ?,
          ngay_gieo_trong = ?,
          ngay_thu_hoach_du_kien = ?,
          anh_mua_vu = COALESCE(?, anh_mua_vu)
        WHERE ma_mua_vu = ?
        `,
        [
          season.ma_thua_dat,
          season.loai_cay_trong,
          season.giong_cay,
          season.ngay_gieo_trong,
          season.ngay_thu_hoach_du_kien,
          newImage,
          maMuaVu,
        ],
      );

      // Danh sách vật tư gửi lên là danh sách đầy đủ -> thay thế toàn bộ
      await connection.execute(`DELETE FROM mua_vu_vat_tu WHERE ma_mua_vu = ?`, [
        maMuaVu,
      ]);
      await insertMaterials(connection, maMuaVu, season.vat_tu);

      if (season.ma_thua_dat) {
        await connection.execute(
          `UPDATE thua_dat SET trang_thai = 'DANG_CANH_TAC' WHERE ma_thua_dat = ?`,
          [season.ma_thua_dat],
        );
      }

      if (oldPlot && oldPlot !== season.ma_thua_dat) {
        await releasePlotIfIdle(connection, oldPlot);
      }
    });

    // Đã có ảnh mới thì xóa ảnh cũ
    if (newImage) await removeImageFile(oldImage);

    return res.json({
      success: true,
      message: "Cập nhật mùa vụ thành công",
    });
  } catch (err) {
    // Lưu thất bại thì bỏ ảnh vừa upload để không để file rác
    await removeImageFile(newImage);
    return sendError(
      res,
      err,
      "Lỗi cập nhật mùa vụ:",
      "Không thể cập nhật mùa vụ",
    );
  }
};

const deleteSeason = async (req, res) => {
  const { maMuaVu } = req.params;

  try {
    await withTransaction(async (connection) => {
      const [current] = await connection.execute(
        `
        SELECT ma_thua_dat
        FROM mua_vu
        WHERE ma_mua_vu = ?
          AND trang_thai = 1
        LIMIT 1
        FOR UPDATE
        `,
        [maMuaVu],
      );

      if (current.length === 0) {
        throw new ApiError(404, "Không tìm thấy mùa vụ");
      }

      // Đã tạo lô thu hoạch từ mùa vụ này thì không cho xóa để giữ truy xuất nguồn gốc
      const [batches] = await connection.execute(
        `
        SELECT ma_lo_nong_san
        FROM lo_nong_san
        WHERE ma_mua_vu = ?
          AND tinh_trang_su_dung <> 'CANCELLED'
        LIMIT 1
        `,
        [maMuaVu],
      );

      if (batches.length > 0) {
        throw new ApiError(
          409,
          `Không thể xóa mùa vụ vì đã có lô nông sản ${batches[0].ma_lo_nong_san}`,
        );
      }

      await connection.execute(
        `UPDATE mua_vu SET trang_thai = 0 WHERE ma_mua_vu = ?`,
        [maMuaVu],
      );

      await releasePlotIfIdle(connection, current[0].ma_thua_dat);
    });

    return res.json({
      success: true,
      message: "Xóa mùa vụ thành công",
    });
  } catch (err) {
    return sendError(res, err, "Lỗi xóa mùa vụ:", "Không thể xóa mùa vụ");
  }
};

module.exports = {
  getMaterials,
  getSeasonStats,
  getSeasons,
  getSeasonById,
  createSeason,
  updateSeason,
  deleteSeason,
};
