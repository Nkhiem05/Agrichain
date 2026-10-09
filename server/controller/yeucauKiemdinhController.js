const db = require("../config/db");

/*
==================================================
YÊU CẦU KIỂM ĐỊNH (phía nông dân)
Nông dân gửi hồ sơ kiểm định cho một lô nông sản tới cơ quan kiểm định.
Danh tính nông dân lấy từ token đăng nhập (req.user, do checkAuth gắn vào).
==================================================
*/

// Lỗi nghiệp vụ: ném ra trong transaction để trả về đúng mã HTTP
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const TIEU_CHUAN = ["VIETGAP", "GLOBALGAP", "ORGANIC"];
const MAX_NOI_DUNG = 1000;

// Lô đã rời nông trại thì không còn kiểm định tại nông trại được nữa
const GIAI_DOAN_KHONG_KIEM_DINH = [
  "IN_TRANSIT",
  "RECEIVED",
  "DISTRIBUTED",
  "COMPLETED",
];

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

// Chỉ nông dân/hợp tác xã mới được gửi và xem yêu cầu của mình
const getFarmerId = (req) => {
  const user = req.user;

  if (!user?.ma_nguoi_dung) {
    throw new ApiError(401, "Vui lòng đăng nhập để thực hiện chức năng này");
  }

  if (user.vai_tro !== "FARMER_COOP") {
    throw new ApiError(403, "Chỉ nông dân/hợp tác xã mới được gửi yêu cầu kiểm định");
  }

  return user.ma_nguoi_dung;
};

// Sinh mã dạng PREFIX001... (mã kiểm định) hoặc PREFIX-1001... (mã hồ sơ)
const generateCode = async (connection, column, prefix, minDigits, floor = 0) => {
  const [rows] = await connection.query(
    `
    SELECT COALESCE(MAX(CAST(SUBSTRING(${column}, ?) AS UNSIGNED)), 0) AS max_no
    FROM kiem_dinh_lo_hang
    WHERE ${column} REGEXP ?
    `,
    [prefix.length + 1, `^${prefix}[0-9]+$`],
  );

  const next = Math.max(Number(rows[0].max_no), floor) + 1;
  return prefix + String(next).padStart(minDigits, "0");
};

/*
==================================================
DANH SÁCH CƠ QUAN KIỂM ĐỊNH (cho ô chọn cơ quan)
==================================================
*/

const getAuthorities = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `
      SELECT ma_nguoi_dung AS ma_co_quan, ho_ten AS ten_co_quan
      FROM nguoi_dung
      WHERE vai_tro = 'CERT_AUTHORITY'
        AND trang_thai = 1
      ORDER BY ho_ten ASC
      `,
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    return sendError(
      res,
      err,
      "Lỗi lấy danh sách cơ quan kiểm định:",
      "Không thể lấy danh sách cơ quan kiểm định",
    );
  }
};

/*
==================================================
GỬI YÊU CẦU KIỂM ĐỊNH
==================================================
*/

const createRequest = async (req, res) => {
  try {
    const maNguoiDung = getFarmerId(req);

    const ma_lo_nong_san = cleanText(req.body?.ma_lo_nong_san);
    const ma_co_quan = cleanText(req.body?.ma_co_quan);
    const tieu_chuan = (
      cleanText(req.body?.tieu_chuan_dang_ky) || "VIETGAP"
    ).toUpperCase();
    const noi_dung_de_nghi = cleanText(req.body?.noi_dung_de_nghi);

    if (!ma_lo_nong_san) {
      throw new ApiError(400, "Vui lòng chọn lô nông sản cần kiểm định");
    }

    if (!ma_co_quan) {
      throw new ApiError(400, "Vui lòng chọn cơ quan kiểm định");
    }

    if (!TIEU_CHUAN.includes(tieu_chuan)) {
      throw new ApiError(400, "Tiêu chuẩn phải là VIETGAP, GLOBALGAP hoặc ORGANIC");
    }

    if (noi_dung_de_nghi && noi_dung_de_nghi.length > MAX_NOI_DUNG) {
      throw new ApiError(
        400,
        `Nội dung đề nghị tối đa ${MAX_NOI_DUNG} ký tự`,
      );
    }

    // Mã kiểm định/hồ sơ do server sinh; thử lại nếu 2 request cùng lúc sinh trùng mã
    let result;

    for (let attempt = 1; ; attempt++) {
      try {
        result = await withTransaction(async (connection) => {
          // Khóa dòng lô để 2 yêu cầu cùng lúc cho một lô xếp hàng nhau
          const [lots] = await connection.execute(
            `
            SELECT
              lo.giai_doan_hien_tai,
              lo.tinh_trang_su_dung,
              lo.ma_nguoi_quan_ly,
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
            GIAI_DOAN_KHONG_KIEM_DINH.includes(lot.giai_doan_hien_tai)
          ) {
            throw new ApiError(
              409,
              "Lô đã rời nông trại hoặc không còn hoạt động nên không thể gửi kiểm định",
            );
          }

          // Lô đang có lệnh vận chuyển còn hiệu lực thì không còn ở nông trại để lấy mẫu
          try {
            const [shipments] = await connection.execute(
              `
              SELECT ma_van_don
              FROM lenh_van_chuyen
              WHERE ma_lo_nong_san = ?
                AND trang_thai NOT IN ('TU_CHOI', 'DA_HUY')
              LIMIT 1
              `,
              [ma_lo_nong_san],
            );

            if (shipments.length > 0) {
              throw new ApiError(
                409,
                `Lô đang có lệnh vận chuyển ${shipments[0].ma_van_don} nên không thể gửi kiểm định`,
              );
            }
          } catch (err) {
            // Bảng lệnh vận chuyển có thể chưa được tạo trong CSDL
            if (err.code !== "ER_NO_SUCH_TABLE") throw err;
          }

          const [authorities] = await connection.execute(
            `
            SELECT ma_nguoi_dung
            FROM nguoi_dung
            WHERE ma_nguoi_dung = ?
              AND vai_tro = 'CERT_AUTHORITY'
              AND trang_thai = 1
            LIMIT 1
            `,
            [ma_co_quan],
          );

          if (authorities.length === 0) {
            throw new ApiError(404, "Không tìm thấy cơ quan kiểm định");
          }

          // Còn hồ sơ đang xử lý, hoặc lô đã được công bố đạt chuẩn thì không gửi thêm
          const [existing] = await connection.execute(
            `
            SELECT ma_ho_so, trang_thai_ho_so, ket_luan
            FROM kiem_dinh_lo_hang
            WHERE ma_lo_nong_san = ?
              AND (
                trang_thai_ho_so IN ('CHO_TIEP_NHAN', 'DA_HEN_LICH', 'DA_LAY_MAU')
                OR (trang_thai_ho_so = 'DA_CONG_BO' AND ket_luan = 'PASSED')
              )
            LIMIT 1
            `,
            [ma_lo_nong_san],
          );

          if (existing.length > 0) {
            throw new ApiError(
              409,
              existing[0].trang_thai_ho_so === "DA_CONG_BO"
                ? `Lô đã được kiểm định đạt chuẩn (hồ sơ ${existing[0].ma_ho_so})`
                : `Lô đang có hồ sơ kiểm định ${existing[0].ma_ho_so} chưa hoàn tất`,
            );
          }

          const ma_kiem_dinh = await generateCode(
            connection,
            "ma_kiem_dinh",
            "KD",
            3,
          );
          const ma_ho_so = await generateCode(
            connection,
            "ma_ho_so",
            "HS-KD-",
            4,
            1000,
          );

          await connection.execute(
            `
            INSERT INTO kiem_dinh_lo_hang
            (
              ma_kiem_dinh,
              ma_ho_so,
              ma_lo_nong_san,
              ma_co_quan,
              tieu_chuan_dang_ky,
              noi_dung_de_nghi
            )
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
              ma_kiem_dinh,
              ma_ho_so,
              ma_lo_nong_san,
              ma_co_quan,
              tieu_chuan,
              noi_dung_de_nghi,
            ],
          );

          return { ma_kiem_dinh, ma_ho_so };
        });

        break;
      } catch (err) {
        if (err.code === "ER_DUP_ENTRY" && attempt < 3) continue;
        throw err;
      }
    }

    return res.status(201).json({
      success: true,
      message: "Gửi yêu cầu kiểm định thành công",
      data: result,
    });
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") {
      console.error("Thiếu bảng kiem_dinh_lo_hang:", err.message);
      return res.status(500).json({
        success: false,
        message: "CSDL chưa có bảng kiểm định (kiem_dinh_lo_hang)",
      });
    }

    return sendError(
      res,
      err,
      "Lỗi gửi yêu cầu kiểm định:",
      "Không thể gửi yêu cầu kiểm định",
    );
  }
};

/*
==================================================
DANH SÁCH YÊU CẦU KIỂM ĐỊNH CỦA TÔI (tab "Lịch hẹn kiểm định")
==================================================
*/

const getMyRequests = async (req, res) => {
  try {
    const maNguoiDung = getFarmerId(req);

    const [rows] = await db.execute(
      `
      SELECT
        kd.ma_kiem_dinh,
        kd.ma_ho_so,
        kd.ma_lo_nong_san,
        kd.ma_co_quan,
        co_quan.ho_ten AS ten_co_quan,
        kd.tieu_chuan_dang_ky,
        kd.noi_dung_de_nghi,
        DATE_FORMAT(kd.ngay_hen_lay_mau, '%Y-%m-%d') AS ngay_hen_lay_mau,
        TIME_FORMAT(kd.gio_hen_lay_mau, '%H:%i') AS gio_hen_lay_mau,
        kd.ghi_chu_chuan_bi,
        kd.trang_thai_ho_so,
        kd.ket_luan,
        kd.created_at,
        mv.loai_cay_trong,
        lo.so_luong_hien_tai,
        lo.don_vi_tinh
      FROM kiem_dinh_lo_hang kd
      JOIN lo_nong_san lo
        ON kd.ma_lo_nong_san = lo.ma_lo_nong_san
      LEFT JOIN mua_vu mv
        ON lo.ma_mua_vu = mv.ma_mua_vu
      LEFT JOIN nong_trai nt
        ON mv.ma_nong_trai = nt.ma_nong_trai
      LEFT JOIN nguoi_dung co_quan
        ON kd.ma_co_quan = co_quan.ma_nguoi_dung
      WHERE (nt.ma_nguoi_dung = ? OR lo.ma_nguoi_quan_ly = ?)
      ORDER BY kd.created_at DESC, kd.ma_kiem_dinh DESC
      `,
      [maNguoiDung, maNguoiDung],
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    // Chưa có bảng kiểm định thì coi như chưa có yêu cầu nào
    if (err.code === "ER_NO_SUCH_TABLE") {
      return res.json({ success: true, data: [] });
    }

    return sendError(
      res,
      err,
      "Lỗi lấy yêu cầu kiểm định:",
      "Không thể lấy danh sách yêu cầu kiểm định",
    );
  }
};

module.exports = {
  getAuthorities,
  createRequest,
  getMyRequests,
};
