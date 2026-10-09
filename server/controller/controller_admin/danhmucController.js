const db = require("../../config/db");

/*
==================================================
TIỆN ÍCH
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

/*
==================================================
DANH MỤC DÙNG CHUNG
==================================================
*/

const getCatalog = async (req, res) => {
  try {
    const [products] = await db.query(
      `SELECT ma_san_pham, ten_san_pham, loai_san_pham, don_vi_tinh_mac_dinh, trang_thai
       FROM san_pham_nong_san ORDER BY ten_san_pham ASC`,
    );
    const [materials] = await db.query(
      `SELECT ma_vat_tu, loai_vat_tu, ten_vat_tu, don_vi_tinh, trang_thai
       FROM danh_muc_vat_tu ORDER BY loai_vat_tu ASC, ten_vat_tu ASC`,
    );

    return res.json({
      success: true,
      data: {
        giong_cay_trong: products,
        vat_tu: materials,
      },
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy danh mục dùng chung:",
      "Không thể lấy danh mục dùng chung",
    );
  }
};

const createProductCatalogItem = async (req, res) => {
  try {
    const ten_san_pham = cleanText(req.body?.ten_san_pham);
    const loai_san_pham = cleanText(req.body?.loai_san_pham) || "Khác";
    const don_vi_tinh_mac_dinh = cleanText(req.body?.don_vi_tinh_mac_dinh) || "kg";

    if (!ten_san_pham) throw new ApiError(400, "Vui lòng nhập tên giống cây trồng");

    const result = await withTransaction(async (connection) => {
      const [duplicates] = await connection.execute(
        `SELECT ma_san_pham FROM san_pham_nong_san WHERE LOWER(ten_san_pham) = LOWER(?) LIMIT 1`,
        [ten_san_pham],
      );

      if (duplicates.length > 0) {
        throw new ApiError(409, "Giống cây trồng này đã có trong danh mục");
      }

      const ma_san_pham = await generateCode(
        connection,
        "san_pham_nong_san",
        "ma_san_pham",
        "SP",
      );

      await connection.execute(
        `
        INSERT INTO san_pham_nong_san
        (ma_san_pham, ten_san_pham, loai_san_pham, don_vi_tinh_mac_dinh)
        VALUES (?, ?, ?, ?)
        `,
        [ma_san_pham, ten_san_pham, loai_san_pham, don_vi_tinh_mac_dinh],
      );

      return { ma_san_pham };
    });

    return res.status(201).json({
      success: true,
      message: "Đã thêm giống cây trồng",
      data: result,
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi thêm giống cây trồng:",
      "Không thể thêm giống cây trồng",
    );
  }
};

const toggleProductCatalogItem = async (req, res) => {
  const { maSanPham } = req.params;

  try {
    const [rows] = await db.execute(
      `SELECT trang_thai FROM san_pham_nong_san WHERE ma_san_pham = ? LIMIT 1`,
      [maSanPham],
    );

    if (rows.length === 0) throw new ApiError(404, "Không tìm thấy giống cây trồng");

    const next = rows[0].trang_thai ? 0 : 1;

    await db.execute(
      `UPDATE san_pham_nong_san SET trang_thai = ? WHERE ma_san_pham = ?`,
      [next, maSanPham],
    );

    return res.json({
      success: true,
      message: next ? "Đã bật lại danh mục" : "Đã ẩn danh mục",
      data: { trang_thai: next },
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi ẩn/hiện giống cây trồng:",
      "Không thể đổi trạng thái",
    );
  }
};

const MATERIAL_TYPES = ["PHAN_BON", "THUOC_BVTV"];

const createMaterialCatalogItem = async (req, res) => {
  try {
    const ten_vat_tu = cleanText(req.body?.ten_vat_tu);
    const loai_vat_tu = cleanText(req.body?.loai_vat_tu);
    const don_vi_tinh = cleanText(req.body?.don_vi_tinh) || "kg";

    if (!ten_vat_tu) throw new ApiError(400, "Vui lòng nhập tên vật tư");
    if (!MATERIAL_TYPES.includes(loai_vat_tu)) {
      throw new ApiError(400, "Loại vật tư không hợp lệ (PHAN_BON hoặc THUOC_BVTV)");
    }

    const result = await withTransaction(async (connection) => {
      const [duplicates] = await connection.execute(
        `SELECT ma_vat_tu FROM danh_muc_vat_tu WHERE LOWER(ten_vat_tu) = LOWER(?) LIMIT 1`,
        [ten_vat_tu],
      );

      if (duplicates.length > 0) {
        throw new ApiError(409, "Vật tư này đã có trong danh mục");
      }

      const prefix = loai_vat_tu === "PHAN_BON" ? "PB" : "TB";
      const ma_vat_tu = await generateCode(
        connection,
        "danh_muc_vat_tu",
        "ma_vat_tu",
        prefix,
      );

      await connection.execute(
        `
        INSERT INTO danh_muc_vat_tu
        (ma_vat_tu, loai_vat_tu, ten_vat_tu, don_vi_tinh)
        VALUES (?, ?, ?, ?)
        `,
        [ma_vat_tu, loai_vat_tu, ten_vat_tu, don_vi_tinh],
      );

      return { ma_vat_tu };
    });

    return res.status(201).json({
      success: true,
      message: "Đã thêm vật tư",
      data: result,
    });
  } catch (err) {
    return sendError(res, err, "Lỗi thêm vật tư:", "Không thể thêm vật tư");
  }
};

const toggleMaterialCatalogItem = async (req, res) => {
  const { maVatTu } = req.params;

  try {
    const [rows] = await db.execute(
      `SELECT trang_thai FROM danh_muc_vat_tu WHERE ma_vat_tu = ? LIMIT 1`,
      [maVatTu],
    );

    if (rows.length === 0) throw new ApiError(404, "Không tìm thấy vật tư");

    const next = rows[0].trang_thai ? 0 : 1;

    await db.execute(`UPDATE danh_muc_vat_tu SET trang_thai = ? WHERE ma_vat_tu = ?`, [
      next,
      maVatTu,
    ]);

    return res.json({
      success: true,
      message: next ? "Đã bật lại vật tư" : "Đã ẩn vật tư",
      data: { trang_thai: next },
    });
  } catch (err) {
    return sendError(res, err, "Lỗi ẩn/hiện vật tư:", "Không thể đổi trạng thái");
  }
};

module.exports = {
  getCatalog,
  createProductCatalogItem,
  toggleProductCatalogItem,
  createMaterialCatalogItem,
  toggleMaterialCatalogItem,
};
