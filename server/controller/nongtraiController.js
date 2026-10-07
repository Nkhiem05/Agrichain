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

const MAX_DIEN_TICH = 999999999;

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

// Kiểm tra tên, diện tích, loại đất của thửa đất từ request body.
// Ném ApiError(400) nếu dữ liệu sai.
const parsePlotFields = (body = {}) => {
  const ten_thua_dat = cleanText(body.ten_thua_dat);
  const loai_dat = cleanText(body.loai_dat);

  if (!ten_thua_dat) {
    throw new ApiError(400, "Vui lòng nhập tên thửa đất");
  }

  if (ten_thua_dat.length > 150) {
    throw new ApiError(400, "Tên thửa đất tối đa 150 ký tự");
  }

  if (loai_dat && loai_dat.length > 100) {
    throw new ApiError(400, "Loại đất tối đa 100 ký tự");
  }

  let dien_tich = null;
  const rawArea = cleanText(body.dien_tich);

  if (rawArea !== null) {
    dien_tich = Number(rawArea);

    if (
      !Number.isFinite(dien_tich) ||
      dien_tich <= 0 ||
      dien_tich > MAX_DIEN_TICH
    ) {
      throw new ApiError(400, "Diện tích phải lớn hơn 0");
    }

    dien_tich = Math.round(dien_tich * 100) / 100;
  }

  return { ten_thua_dat, loai_dat, dien_tich };
};

/*
==================================================
CHI TIẾT NÔNG TRẠI
==================================================
*/

const getFarmDetail = async (req, res) => {
  const { maNongTrai } = req.params;

  try {
    const [farms] = await db.execute(
      `
      SELECT
        nt.ma_nong_trai,
        nt.ma_nguoi_dung,
        nt.ten_nong_trai,
        nt.dia_diem_nong_trai,
        nt.dien_tich_nong_trai,
        nt.anh_nong_trai,
        nd.ho_ten AS nguoi_quan_ly
      FROM nong_trai nt
      JOIN nguoi_dung nd
        ON nt.ma_nguoi_dung = nd.ma_nguoi_dung
      WHERE nt.ma_nong_trai = ?
        AND nt.trang_thai = 1
      LIMIT 1
      `,
      [maNongTrai],
    );

    if (farms.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nông trại",
      });
    }

    // Mỗi thửa kèm mùa vụ đang triển khai (nếu có) và số ngày đã canh tác (tính cả ngày bắt đầu)
    const [plots] = await db.execute(
      `
      SELECT
        td.ma_thua_dat,
        td.ten_thua_dat,
        td.dien_tich,
        td.loai_dat,
        td.trang_thai,
        mv.ma_mua_vu,
        mv.loai_cay_trong,
        DATE_FORMAT(mv.ngay_gieo_trong, '%Y-%m-%d') AS ngay_gieo_trong,
        IF(mv.ngay_gieo_trong > CURDATE(), 0, DATEDIFF(CURDATE(), mv.ngay_gieo_trong) + 1) AS so_ngay
      FROM thua_dat td
      LEFT JOIN mua_vu mv
        ON mv.ma_thua_dat = td.ma_thua_dat
        AND mv.trang_thai = 1
      WHERE td.ma_nong_trai = ?
      ORDER BY td.created_at ASC, td.ma_thua_dat ASC
      `,
      [maNongTrai],
    );

    // Cây trồng chủ yếu: các mùa vụ đang triển khai của nông trại (kể cả chưa gắn thửa)
    const [crops] = await db.execute(
      `
      SELECT DISTINCT loai_cay_trong
      FROM mua_vu
      WHERE ma_nong_trai = ?
        AND trang_thai = 1
      ORDER BY loai_cay_trong ASC
      `,
      [maNongTrai],
    );

    const soils = [
      ...new Set(plots.map((plot) => plot.loai_dat).filter(Boolean)),
    ];

    return res.json({
      success: true,
      data: {
        ...farms[0],
        loai_dat: soils,
        cay_trong_chu_yeu: crops.map((crop) => crop.loai_cay_trong),
        thua_dat: plots.map((plot) => ({
          ...plot,
          so_ngay: Number(plot.so_ngay || 0),
        })),
      },
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy chi tiết nông trại:",
      "Không thể lấy chi tiết nông trại",
    );
  }
};

/*
Thêm thửa đất vào nông trại.
Nếu chọn "đang canh tác" (bat_dau_canh_tac = true) thì tạo luôn mùa vụ bắt đầu từ hôm nay
cho loại cây đã nhập và đánh dấu thửa đang canh tác.
*/
const createPlot = async (req, res) => {
  const { maNongTrai } = req.params;

  try {
    const { ten_thua_dat, loai_dat, dien_tich } = parsePlotFields(req.body);
    const loai_cay_trong = cleanText(req.body?.loai_cay_trong);
    const bat_dau_canh_tac =
      req.body?.bat_dau_canh_tac === true ||
      req.body?.bat_dau_canh_tac === "true";

    if (bat_dau_canh_tac) {
      if (!loai_cay_trong) {
        throw new ApiError(400, "Vui lòng nhập loại cây trồng");
      }

      if (loai_cay_trong.length > 100) {
        throw new ApiError(400, "Loại cây trồng tối đa 100 ký tự");
      }
    }

    // Mã thửa/mùa vụ do server sinh; thử lại nếu 2 request cùng lúc sinh trùng mã
    let result;

    for (let attempt = 1; ; attempt++) {
      try {
        result = await withTransaction(async (connection) => {
          // Khóa dòng nông trại để các request thêm thửa cùng lúc xếp hàng nhau
          const [farms] = await connection.execute(
            `
            SELECT ma_nong_trai
            FROM nong_trai
            WHERE ma_nong_trai = ?
              AND trang_thai = 1
            LIMIT 1
            FOR UPDATE
            `,
            [maNongTrai],
          );

          if (farms.length === 0) {
            throw new ApiError(404, "Không tìm thấy nông trại");
          }

          const [duplicates] = await connection.execute(
            `
            SELECT ma_thua_dat
            FROM thua_dat
            WHERE ma_nong_trai = ?
              AND ten_thua_dat = ?
            LIMIT 1
            `,
            [maNongTrai, ten_thua_dat],
          );

          if (duplicates.length > 0) {
            throw new ApiError(409, "Nông trại đã có thửa đất cùng tên");
          }

          const ma_thua_dat = await generateCode(
            connection,
            "thua_dat",
            "ma_thua_dat",
            "TD",
          );

          await connection.execute(
            `
            INSERT INTO thua_dat
            (ma_thua_dat, ma_nong_trai, ten_thua_dat, dien_tich, loai_dat, trang_thai)
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
              ma_thua_dat,
              maNongTrai,
              ten_thua_dat,
              dien_tich,
              loai_dat,
              bat_dau_canh_tac ? "DANG_CANH_TAC" : "DAT_TRONG",
            ],
          );

          let ma_mua_vu = null;

          if (bat_dau_canh_tac) {
            ma_mua_vu = await generateCode(
              connection,
              "mua_vu",
              "ma_mua_vu",
              "MV",
            );

            await connection.execute(
              `
              INSERT INTO mua_vu
              (ma_mua_vu, ma_nong_trai, ma_thua_dat, loai_cay_trong, ngay_gieo_trong)
              VALUES (?, ?, ?, ?, CURDATE())
              `,
              [ma_mua_vu, maNongTrai, ma_thua_dat, loai_cay_trong],
            );
          }

          return { ma_thua_dat, ma_mua_vu };
        });

        break;
      } catch (err) {
        if (err.code === "ER_DUP_ENTRY" && attempt < 3) continue;
        throw err;
      }
    }

    return res.status(201).json({
      success: true,
      message: "Thêm thửa đất thành công",
      data: result,
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi thêm thửa đất:",
      "Không thể thêm thửa đất",
    );
  }
};

// Thửa phải thuộc đúng nông trại trên đường dẫn; trả về mùa vụ đang triển khai (nếu có)
const getPlotForUpdate = async (connection, maNongTrai, maThuaDat) => {
  const [plots] = await connection.execute(
    `
    SELECT ma_thua_dat, trang_thai
    FROM thua_dat
    WHERE ma_thua_dat = ?
      AND ma_nong_trai = ?
    LIMIT 1
    FOR UPDATE
    `,
    [maThuaDat, maNongTrai],
  );

  if (plots.length === 0) {
    throw new ApiError(404, "Không tìm thấy thửa đất");
  }

  const [seasons] = await connection.execute(
    `
    SELECT ma_mua_vu
    FROM mua_vu
    WHERE ma_thua_dat = ?
      AND trang_thai = 1
    LIMIT 1
    `,
    [maThuaDat],
  );

  return {
    trang_thai: plots[0].trang_thai,
    mua_vu_dang_chay: seasons.length > 0 ? seasons[0].ma_mua_vu : null,
  };
};

/*
Sửa thửa đất: tên, diện tích, loại đất.
Trạng thái chỉ đổi được giữa "đất trống" và "tạm ngưng" khi thửa không có mùa vụ đang chạy;
thửa đang canh tác do mùa vụ quyết định (đổi ở tab Quản lý mùa vụ).
*/
const updatePlot = async (req, res) => {
  const { maNongTrai, maThuaDat } = req.params;

  try {
    const { ten_thua_dat, loai_dat, dien_tich } = parsePlotFields(req.body);
    const trang_thai = cleanText(req.body?.trang_thai);

    if (trang_thai && !["DAT_TRONG", "TAM_NGUNG"].includes(trang_thai)) {
      throw new ApiError(400, "Trạng thái chỉ có thể là Đất trống hoặc Tạm ngưng");
    }

    await withTransaction(async (connection) => {
      const plot = await getPlotForUpdate(connection, maNongTrai, maThuaDat);

      if (plot.mua_vu_dang_chay && trang_thai) {
        throw new ApiError(
          409,
          `Thửa đang canh tác mùa vụ ${plot.mua_vu_dang_chay}, không đổi trạng thái được`,
        );
      }

      const [duplicates] = await connection.execute(
        `
        SELECT ma_thua_dat
        FROM thua_dat
        WHERE ma_nong_trai = ?
          AND ten_thua_dat = ?
          AND ma_thua_dat <> ?
        LIMIT 1
        `,
        [maNongTrai, ten_thua_dat, maThuaDat],
      );

      if (duplicates.length > 0) {
        throw new ApiError(409, "Nông trại đã có thửa đất cùng tên");
      }

      await connection.execute(
        `
        UPDATE thua_dat
        SET
          ten_thua_dat = ?,
          dien_tich = ?,
          loai_dat = ?,
          trang_thai = COALESCE(?, trang_thai)
        WHERE ma_thua_dat = ?
        `,
        [ten_thua_dat, dien_tich, loai_dat, trang_thai, maThuaDat],
      );
    });

    return res.json({
      success: true,
      message: "Cập nhật thửa đất thành công",
    });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi cập nhật thửa đất:",
      "Không thể cập nhật thửa đất",
    );
  }
};

/*
Xóa thửa đất.
- Đang có mùa vụ chạy: không cho xóa.
- Chỉ còn mùa vụ đã xóa tham chiếu: gỡ liên kết thửa khỏi các mùa vụ đó rồi xóa thửa.
*/
const deletePlot = async (req, res) => {
  const { maNongTrai, maThuaDat } = req.params;

  try {
    await withTransaction(async (connection) => {
      const plot = await getPlotForUpdate(connection, maNongTrai, maThuaDat);

      if (plot.mua_vu_dang_chay) {
        throw new ApiError(
          409,
          `Thửa đang có mùa vụ ${plot.mua_vu_dang_chay}. Hãy xóa mùa vụ đó ở tab Quản lý mùa vụ trước`,
        );
      }

      await connection.execute(
        `UPDATE mua_vu SET ma_thua_dat = NULL WHERE ma_thua_dat = ? AND trang_thai = 0`,
        [maThuaDat],
      );

      await connection.execute(`DELETE FROM thua_dat WHERE ma_thua_dat = ?`, [
        maThuaDat,
      ]);
    });

    return res.json({
      success: true,
      message: "Xóa thửa đất thành công",
    });
  } catch (err) {
    return sendError(res, err, "Lỗi xóa thửa đất:", "Không thể xóa thửa đất");
  }
};

module.exports = {
  getFarmDetail,
  createPlot,
  updatePlot,
  deletePlot,
};
