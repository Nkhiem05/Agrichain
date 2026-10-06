const db = require("../../server/config/db");

/*
==================================================
NGƯỜI QUẢN LÝ
==================================================
*/

const getManagers = async (req, res) => {
  const sql = `
    SELECT
      ma_nguoi_dung,
      ho_ten,
      ten_dang_nhap,
      so_dien_thoai
    FROM nguoi_dung
    WHERE vai_tro = 'FARMER_COOP'
      AND trang_thai = 1
    ORDER BY ho_ten ASC
  `;

  try {
    const [results] = await db.query(sql);
    return res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    console.error("Lỗi lấy người quản lý:", err);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách người quản lý",
    });
  }
};

/*
==================================================
NÔNG TRẠI
==================================================
*/

const getFarms = async (req, res) => {
  const { maNguoiDung } = req.params;

  const sql = `
    SELECT
      nt.*,
      nd.ho_ten AS nguoi_quan_ly
    FROM nong_trai nt
    JOIN nguoi_dung nd
      ON nt.ma_nguoi_dung = nd.ma_nguoi_dung
    WHERE nt.ma_nguoi_dung = ?
      AND nt.trang_thai = 1
    ORDER BY nt.created_at DESC
  `;

  try {
    const [results] = await db.execute(sql, [maNguoiDung]);
    return res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    console.error("Lỗi lấy nông trại:", err);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách nông trại",
    });
  }
};

const getFarmById = async (req, res) => {
  const { maNongTrai } = req.params;

  const sql = `
    SELECT
      nt.*,
      nd.ho_ten AS nguoi_quan_ly
    FROM nong_trai nt
    JOIN nguoi_dung nd
      ON nt.ma_nguoi_dung = nd.ma_nguoi_dung
    WHERE nt.ma_nong_trai = ?
    LIMIT 1
  `;

  try {
    const [results] = await db.execute(sql, [maNongTrai]);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nông trại",
      });
    }

    return res.json({
      success: true,
      data: results[0],
    });
  } catch (err) {
    console.error("Lỗi lấy nông trại theo id:", err);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy thông tin nông trại",
    });
  }
};

const getFarmDetail = async (req, res) => {
  const { maNongTrai } = req.params;

  const sql = `
    SELECT
      nt.ma_nong_trai,
      nt.ma_nguoi_dung,
      nt.ten_nong_trai,
      nt.dia_diem_nong_trai,
      nt.dien_tich_nong_trai,
      nt.anh_nong_trai,
      nt.trang_thai,
      nd.ho_ten AS nguoi_quan_ly
    FROM nong_trai nt
    JOIN nguoi_dung nd
      ON nt.ma_nguoi_dung = nd.ma_nguoi_dung
    WHERE nt.ma_nong_trai = ?
    LIMIT 1
  `;

  try {
    const [results] = await db.execute(sql, [maNongTrai]);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nông trại",
      });
    }

    return res.json({
      success: true,
      data: results[0],
    });
  } catch (err) {
    console.error("Lỗi lấy chi tiết nông trại:", err);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy chi tiết nông trại",
    });
  }
};

const createFarm = async (req, res) => {
  const {
    ma_nong_trai,
    ma_nguoi_dung,
    ten_nong_trai,
    dia_diem_nong_trai,
    dien_tich_nong_trai,
  } = req.body;

  if (
    !ma_nong_trai ||
    !ma_nguoi_dung ||
    !ten_nong_trai ||
    !dia_diem_nong_trai
  ) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng nhập đầy đủ thông tin nông trại",
    });
  }

  let anh_nong_trai = null;
  if (req.file) {
    anh_nong_trai = "/uploads/farms/" + req.file.filename;
  }

  const sql = `
    INSERT INTO nong_trai
    (
      ma_nong_trai,
      ma_nguoi_dung,
      ten_nong_trai,
      dia_diem_nong_trai,
      dien_tich_nong_trai,
      anh_nong_trai
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  try {
    await db.execute(sql, [
      ma_nong_trai,
      ma_nguoi_dung,
      ten_nong_trai,
      dia_diem_nong_trai,
      dien_tich_nong_trai || null,
      anh_nong_trai,
    ]);

    return res.status(201).json({
      success: true,
      message: "Thêm nông trại thành công",
    });
  } catch (err) {
    console.error("Lỗi thêm nông trại:", err);
    return res.status(500).json({
      success: false,
      message: "Không thể thêm nông trại",
      error: err.message,
    });
  }
};

const updateFarm = async (req, res) => {
  const { maNongTrai } = req.params;
  const {
    ma_nguoi_dung,
    ten_nong_trai,
    dia_diem_nong_trai,
    dien_tich_nong_trai,
  } = req.body;

  const findSql = `
    SELECT anh_nong_trai
    FROM nong_trai
    WHERE ma_nong_trai = ?
    LIMIT 1
  `;

  try {
    const [results] = await db.execute(findSql, [maNongTrai]);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nông trại",
      });
    }

    let anh_nong_trai = results[0].anh_nong_trai;
    if (req.file) {
      anh_nong_trai = "/uploads/farms/" + req.file.filename;
    }

    const sql = `
      UPDATE nong_trai
      SET
        ma_nguoi_dung = ?,
        ten_nong_trai = ?,
        dia_diem_nong_trai = ?,
        dien_tich_nong_trai = ?,
        anh_nong_trai = ?
      WHERE ma_nong_trai = ?
    `;

    await db.execute(sql, [
      ma_nguoi_dung,
      ten_nong_trai,
      dia_diem_nong_trai,
      dien_tich_nong_trai || null,
      anh_nong_trai,
      maNongTrai,
    ]);

    return res.json({
      success: true,
      message: "Cập nhật nông trại thành công",
    });
  } catch (err) {
    console.error("Lỗi cập nhật nông trại:", err);
    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật nông trại",
    });
  }
};

const deleteFarm = async (req, res) => {
  const { maNongTrai } = req.params;

  const sql = `
    UPDATE nong_trai
    SET trang_thai = 0
    WHERE ma_nong_trai = ?
  `;

  try {
    const [result] = await db.execute(sql, [maNongTrai]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nông trại",
      });
    }

    return res.json({
      success: true,
      message: "Xóa nông trại thành công",
    });
  } catch (err) {
    console.error("Lỗi xóa nông trại:", err);
    return res.status(500).json({
      success: false,
      message: "Không thể xóa nông trại",
    });
  }
};

/*
==================================================
THỬA ĐẤT
==================================================
*/

const getPlots = async (req, res) => {
  const { maNongTrai } = req.params;

  const sql = `
    SELECT
      td.ma_thua_dat,
      td.ma_nong_trai,
      td.ten_thua_dat,
      td.dien_tich,
      td.loai_dat,
      td.trang_thai,
      mv.ma_mua_vu,
      mv.loai_cay_trong,
      mv.ngay_gieo_trong
    FROM thua_dat td
    LEFT JOIN mua_vu mv
      ON td.ma_thua_dat = mv.ma_thua_dat
      AND mv.trang_thai = 1
    WHERE td.ma_nong_trai = ?
    ORDER BY td.created_at DESC
  `;

  try {
    const [results] = await db.execute(sql, [maNongTrai]);
    return res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    console.error("Lỗi lấy thửa đất:", err);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách thửa đất",
    });
  }
};

const createPlot = async (req, res) => {
  const { ma_thua_dat, ma_nong_trai, ten_thua_dat, dien_tich, loai_dat } =
    req.body;

  if (!ma_thua_dat || !ma_nong_trai || !ten_thua_dat) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng nhập đầy đủ thông tin thửa đất",
    });
  }

  const sql = `
    INSERT INTO thua_dat
    (
      ma_thua_dat,
      ma_nong_trai,
      ten_thua_dat,
      dien_tich,
      loai_dat
    )
    VALUES (?, ?, ?, ?, ?)
  `;

  try {
    await db.execute(sql, [
      ma_thua_dat,
      ma_nong_trai,
      ten_thua_dat,
      dien_tich || null,
      loai_dat || null,
    ]);

    return res.status(201).json({
      success: true,
      message: "Thêm thửa đất thành công",
    });
  } catch (err) {
    console.error("Lỗi thêm thửa đất:", err);
    return res.status(500).json({
      success: false,
      message: "Không thể thêm thửa đất",
      error: err.message,
    });
  }
};

const updatePlot = async (req, res) => {
  const { maThuaDat } = req.params;
  const { ten_thua_dat, dien_tich, loai_dat, trang_thai } = req.body;

  const sql = `
    UPDATE thua_dat
    SET
      ten_thua_dat = ?,
      dien_tich = ?,
      loai_dat = ?,
      trang_thai = ?
    WHERE ma_thua_dat = ?
  `;

  try {
    const [result] = await db.execute(sql, [
      ten_thua_dat,
      dien_tich || null,
      loai_dat || null,
      trang_thai || "DAT_TRONG",
      maThuaDat,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thửa đất",
      });
    }

    return res.json({
      success: true,
      message: "Cập nhật thửa đất thành công",
    });
  } catch (err) {
    console.error("Lỗi cập nhật thửa đất:", err);
    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật thửa đất",
    });
  }
};

const deletePlot = async (req, res) => {
  const { maThuaDat } = req.params;

  const sql = `
    DELETE FROM thua_dat
    WHERE ma_thua_dat = ?
  `;

  try {
    const [result] = await db.execute(sql, [maThuaDat]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thửa đất",
      });
    }

    return res.json({
      success: true,
      message: "Xóa thửa đất thành công",
    });
  } catch (err) {
    console.error("Lỗi xóa thửa đất:", err);
    return res.status(500).json({
      success: false,
      message:
        "Không thể xóa thửa đất. Thửa đất có thể đang được mùa vụ sử dụng.",
    });
  }
};

/*
==================================================
MÙA VỤ
==================================================
*/

const getSeasons = async (req, res) => {
  const { maNongTrai } = req.params;

  const sql = `
    SELECT *
    FROM mua_vu
    WHERE ma_nong_trai = ?
      AND trang_thai = 1
    ORDER BY created_at DESC
  `;

  try {
    const [results] = await db.execute(sql, [maNongTrai]);
    return res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    console.error("Lỗi lấy mùa vụ:", err);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy mùa vụ",
    });
  }
};

const getSeasonById = async (req, res) => {
  const { maMuaVu } = req.params;

  const sql = `
    SELECT *
    FROM mua_vu
    WHERE ma_mua_vu = ?
    LIMIT 1
  `;

  try {
    const [results] = await db.execute(sql, [maMuaVu]);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy mùa vụ",
      });
    }

    return res.json({
      success: true,
      data: results[0],
    });
  } catch (err) {
    console.error("Lỗi lấy mùa vụ theo id:", err);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy thông tin mùa vụ",
    });
  }
};

const createSeason = async (req, res) => {
  const {
    ma_mua_vu,
    ma_nong_trai,
    ma_thua_dat,
    loai_cay_trong,
    ngay_gieo_trong,
  } = req.body;

  const sql = `
    INSERT INTO mua_vu
    (
      ma_mua_vu,
      ma_nong_trai,
      ma_thua_dat,
      loai_cay_trong,
      ngay_gieo_trong
    )
    VALUES (?, ?, ?, ?, ?)
  `;

  try {
    await db.execute(sql, [
      ma_mua_vu,
      ma_nong_trai,
      ma_thua_dat || null,
      loai_cay_trong,
      ngay_gieo_trong,
    ]);

    return res.status(201).json({
      success: true,
      message: "Thêm mùa vụ thành công",
    });
  } catch (err) {
    console.error("Lỗi tạo mùa vụ:", err);
    return res.status(500).json({
      success: false,
      message: "Không thể thêm mùa vụ",
      error: err.message,
    });
  }
};

const updateSeason = async (req, res) => {
  const { maMuaVu } = req.params;
  const { ma_thua_dat, loai_cay_trong, ngay_gieo_trong } = req.body;

  const sql = `
    UPDATE mua_vu
    SET
      ma_thua_dat = ?,
      loai_cay_trong = ?,
      ngay_gieo_trong = ?
    WHERE ma_mua_vu = ?
  `;

  try {
    const [result] = await db.execute(sql, [
      ma_thua_dat || null,
      loai_cay_trong,
      ngay_gieo_trong,
      maMuaVu,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy mùa vụ",
      });
    }

    return res.json({
      success: true,
      message: "Cập nhật mùa vụ thành công",
    });
  } catch (err) {
    console.error("Lỗi cập nhật mùa vụ:", err);
    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật mùa vụ",
    });
  }
};

const deleteSeason = async (req, res) => {
  const { maMuaVu } = req.params;

  const sql = `
    UPDATE mua_vu
    SET trang_thai = 0
    WHERE ma_mua_vu = ?
  `;

  try {
    const [result] = await db.execute(sql, [maMuaVu]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy mùa vụ",
      });
    }

    return res.json({
      success: true,
      message: "Xóa mùa vụ thành công",
    });
  } catch (err) {
    console.error("Lỗi xóa mùa vụ:", err);
    return res.status(500).json({
      success: false,
      message: "Không thể xóa mùa vụ",
    });
  }
};

/*
==================================================
LÔ NÔNG SẢN
==================================================
*/

const getBatches = async (req, res) => {
  const { maNguoiDung } = req.params;

  const sql = `
    SELECT
      l.*,
      sp.ten_san_pham,
      mv.loai_cay_trong,
      nt.ten_nong_trai
    FROM lo_nong_san l
    LEFT JOIN san_pham_nong_san sp
      ON l.ma_san_pham = sp.ma_san_pham
    LEFT JOIN mua_vu mv
      ON l.ma_mua_vu = mv.ma_mua_vu
    LEFT JOIN nong_trai nt
      ON mv.ma_nong_trai = nt.ma_nong_trai
    WHERE l.ma_nguoi_quan_ly = ?
    ORDER BY l.created_at DESC
  `;

  try {
    const [results] = await db.execute(sql, [maNguoiDung]);
    return res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    console.error("Lỗi lấy lô nông sản:", err);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách lô nông sản",
    });
  }
};

const getBatchById = async (req, res) => {
  const { maLo } = req.params;

  const sql = `
    SELECT *
    FROM lo_nong_san
    WHERE ma_lo_nong_san = ?
    LIMIT 1
  `;

  try {
    const [results] = await db.execute(sql, [maLo]);

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
    console.error("Lỗi lấy lô theo id:", err);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy thông tin lô nông sản",
    });
  }
};

const createBatch = async (req, res) => {
  const {
    ma_lo_nong_san,
    ma_mua_vu,
    ma_san_pham,
    ma_nguoi_quan_ly,
    ngay_thu_hoach,
    so_luong_hien_tai,
    don_vi_tinh,
  } = req.body;

  const sql = `
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
  `;

  try {
    await db.execute(sql, [
      ma_lo_nong_san,
      ma_mua_vu || null,
      ma_san_pham,
      ma_nguoi_quan_ly,
      ngay_thu_hoach || null,
      so_luong_hien_tai,
      don_vi_tinh,
    ]);

    return res.status(201).json({
      success: true,
      message: "Tạo lô thành công",
    });
  } catch (err) {
    console.error("Lỗi tạo lô:", err);
    return res.status(500).json({
      success: false,
      message: "Không thể tạo lô",
      error: err.message,
    });
  }
};

const updateBatch = async (req, res) => {
  const { maLo } = req.params;
  const { ngay_thu_hoach, so_luong_hien_tai, don_vi_tinh } = req.body;

  const sql = `
    UPDATE lo_nong_san
    SET
      ngay_thu_hoach = ?,
      so_luong_hien_tai = ?,
      don_vi_tinh = ?
    WHERE ma_lo_nong_san = ?
  `;

  try {
    const [result] = await db.execute(sql, [
      ngay_thu_hoach || null,
      so_luong_hien_tai,
      don_vi_tinh,
      maLo,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lô nông sản",
      });
    }

    return res.json({
      success: true,
      message: "Cập nhật lô thành công",
    });
  } catch (err) {
    console.error("Lỗi cập nhật lô:", err);
    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật lô",
    });
  }
};

const deleteBatch = async (req, res) => {
  const { maLo } = req.params;

  const sql = `
    UPDATE lo_nong_san
    SET tinh_trang_su_dung = 'CANCELLED'
    WHERE ma_lo_nong_san = ?
  `;

  try {
    const [result] = await db.execute(sql, [maLo]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lô nông sản",
      });
    }

    return res.json({
      success: true,
      message: "Hủy lô thành công",
    });
  } catch (err) {
    console.error("Lỗi hủy lô:", err);
    return res.status(500).json({
      success: false,
      message: "Không thể hủy lô",
    });
  }
};

module.exports = {
  getManagers,

  getFarms,
  getFarmById,
  getFarmDetail,
  createFarm,
  updateFarm,
  deleteFarm,

  getPlots,
  createPlot,
  updatePlot,
  deletePlot,

  getSeasons,
  getSeasonById,
  createSeason,
  updateSeason,
  deleteSeason,

  getBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch,
};
