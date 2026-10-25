const db = require("../config/db");
const { ghiSuKienVanDon, ghiSuKienTuChoiNhanHang } = require("../services/blockchain/hook");

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
    return res.status(err.status).json({ success: false, message: err.message });
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

const confirmReceive = async (req, res) => {
  const { maVanDon } = req.params;

  try {
    const maNpp = getDistributorId(req);
    const khoiLuongThucTe = toPositiveNumber(req.body?.khoi_luong_thuc_te);
    const viTriKho = cleanText(req.body?.vi_tri_luu_kho);
    const hanLuuKho = cleanText(req.body?.han_luu_kho);

    if (!khoiLuongThucTe) {
      throw new ApiError(400, "Vui lòng nhập khối lượng cân thực tế hợp lệ");
    }
    if (!viTriKho) {
      throw new ApiError(400, "Vui lòng nhập vị trí lưu kho");
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
        [maVanDon, maNpp],
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
      await ghiSuKienVanDon(connection, maVanDon, "STOCK_IN_CONFIRMED", maNpp);

      await connection.execute(
        `
        UPDATE lo_nong_san
        SET ma_nguoi_quan_ly = ?,
            so_luong_hien_tai = ?,
            giai_doan_hien_tai = 'RECEIVED',
            vi_tri_luu_kho = ?,
            han_luu_kho = ?
        WHERE ma_lo_nong_san = ?
        `,
        [maNpp, khoiLuongThucTe, viTriKho, hanLuuKho, rows[0].ma_lo_nong_san],
      );
    });

    return res.json({ success: true, message: "Đã nhập kho lô hàng" });
  } catch (err) {
    return sendError(res, err, "Lỗi xác nhận nhập kho:", "Không thể xác nhận nhập kho");
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

    await withTransaction(async (connection) => {
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
        throw new ApiError(409, "Lệnh vận chuyển không ở trạng thái có thể từ chối");
      }

      await connection.execute(
        `UPDATE lenh_van_chuyen SET trang_thai = 'TU_CHOI', ghi_chu = ? WHERE ma_van_don = ?`,
        [`Nhà phân phối từ chối tiếp nhận: ${lyDo}`, maVanDon],
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
        kd.ket_luan AS kiem_dinh_ket_luan
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
      ORDER BY (lo.han_luu_kho IS NULL), lo.han_luu_kho ASC
      `,
      [maNpp],
    );

    const data = rows.map((r) => ({
      ...r,
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
    return sendError(res, err, "Lỗi lấy danh sách kho hàng:", "Không thể lấy danh sách kho hàng");
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
    DATE_FORMAT(p.thoi_gian_xuat, '%Y-%m-%d %H:%i') AS thoi_gian_xuat,
    DATE_FORMAT(p.thoi_gian_giao, '%Y-%m-%d %H:%i') AS thoi_gian_giao,
    p.created_at
  FROM phieu_xuat_kho p
  JOIN dai_ly dl ON p.ma_dai_ly = dl.ma_dai_ly
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

    return res.json({ success: true, data: rows });
  } catch (err) {
    return sendError(res, err, "Lỗi lấy danh sách phiếu xuất kho:", "Không thể lấy danh sách phiếu xuất kho");
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
      return res.status(404).json({ success: false, message: "Không tìm thấy phiếu xuất kho" });
    }

    const [dealerRows] = await db.execute(
      `SELECT ten, nguoi_lien_he, so_dien_thoai, dia_chi FROM dai_ly WHERE ma_dai_ly = ? LIMIT 1`,
      [rows[0].ma_dai_ly],
    );

    return res.json({ success: true, data: { ...rows[0], dai_ly: dealerRows[0] || null } });
  } catch (err) {
    return sendError(res, err, "Lỗi lấy chi tiết phiếu xuất kho:", "Không thể lấy chi tiết phiếu xuất kho");
  }
};

const createDispatch = async (req, res) => {
  try {
    const maNpp = getDistributorId(req);

    const ma_dai_ly = cleanText(req.body?.ma_dai_ly);
    const ma_lo_nong_san = cleanText(req.body?.ma_lo_nong_san);
    const so_luong_xuat = toPositiveNumber(req.body?.so_luong_xuat);
    const hinh_thuc = cleanText(req.body?.hinh_thuc) || "TU_GIAO";
    const ten_don_vi_van_chuyen = cleanText(req.body?.ten_don_vi_van_chuyen);
    const ten_tai_xe = cleanText(req.body?.ten_tai_xe);
    const bien_so_xe = cleanText(req.body?.bien_so_xe);
    const ghi_chu = cleanText(req.body?.ghi_chu);

    if (!ma_dai_ly) throw new ApiError(400, "Vui lòng chọn đại lý nhận hàng");
    if (!ma_lo_nong_san) throw new ApiError(400, "Vui lòng chọn lô hàng cần xuất");
    if (!so_luong_xuat) throw new ApiError(400, "Số lượng xuất phải lớn hơn 0");
    if (!["TU_GIAO", "DV_VAN_CHUYEN"].includes(hinh_thuc)) {
      throw new ApiError(400, "Hình thức giao hàng không hợp lệ");
    }

    let maPhieu;

    for (let attempt = 1; ; attempt++) {
      try {
        maPhieu = await withTransaction(async (connection) => {
          const [dealers] = await connection.execute(
            `SELECT ma_dai_ly FROM dai_ly WHERE ma_dai_ly = ? AND ma_nha_phan_phoi = ? AND trang_thai = 'HOAT_DONG'`,
            [ma_dai_ly, maNpp],
          );
          if (dealers.length === 0) {
            throw new ApiError(404, "Không tìm thấy đại lý đang hoạt động");
          }

          const [lots] = await connection.execute(
            `
            SELECT so_luong_hien_tai, don_vi_tinh, tinh_trang_su_dung, han_luu_kho
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
          if (lots[0].tinh_trang_su_dung !== "ACTIVE") {
            throw new ApiError(409, "Lô hàng không còn khả dụng");
          }
          if (so_luong_xuat > Number(lots[0].so_luong_hien_tai)) {
            throw new ApiError(409, `Số lượng vượt quá tồn kho khả dụng (${lots[0].so_luong_hien_tai} ${lots[0].don_vi_tinh})`);
          }
          if (lots[0].han_luu_kho && new Date(lots[0].han_luu_kho) < new Date()) {
            throw new ApiError(409, "Lô hàng đã hết hạn lưu kho, không thể xuất bán");
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
          if (kiemDinh.length > 0 && kiemDinh[0].trang_thai_ho_so === "THU_HOI") {
            throw new ApiError(409, "Lô hàng đã bị thu hồi chứng thư kiểm định, không thể xuất bán");
          }

          const newCode = await generateCode(connection, "phieu_xuat_kho", "ma_phieu", "PXK-", 4);

          await connection.execute(
            `
            INSERT INTO phieu_xuat_kho
            (ma_phieu, ma_nha_phan_phoi, ma_dai_ly, ma_lo_nong_san, so_luong_xuat, don_vi_tinh, hinh_thuc, ten_don_vi_van_chuyen, ten_tai_xe, bien_so_xe, ghi_chu)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              newCode,
              maNpp,
              ma_dai_ly,
              ma_lo_nong_san,
              so_luong_xuat,
              lots[0].don_vi_tinh,
              hinh_thuc,
              ten_don_vi_van_chuyen,
              ten_tai_xe,
              bien_so_xe,
              ghi_chu,
            ],
          );

          await connection.execute(
            `UPDATE lo_nong_san SET so_luong_hien_tai = so_luong_hien_tai - ? WHERE ma_lo_nong_san = ?`,
            [so_luong_xuat, ma_lo_nong_san],
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
      message: "Đã lập phiếu xuất kho",
      data: { ma_phieu: maPhieu },
    });
  } catch (err) {
    return sendError(res, err, "Lỗi lập phiếu xuất kho:", "Không thể lập phiếu xuất kho");
  }
};

const markDispatchShipped = async (req, res) => {
  const { maPhieu } = req.params;

  try {
    const maNpp = getDistributorId(req);

    await withTransaction(async (connection) => {
      const [rows] = await connection.execute(
        `SELECT trang_thai FROM phieu_xuat_kho WHERE ma_phieu = ? AND ma_nha_phan_phoi = ? LIMIT 1 FOR UPDATE`,
        [maPhieu, maNpp],
      );
      if (rows.length === 0) throw new ApiError(404, "Không tìm thấy phiếu xuất kho");
      if (rows[0].trang_thai !== "CHO_XUAT") {
        throw new ApiError(409, "Phiếu không ở trạng thái chờ xuất kho");
      }

      await connection.execute(
        `UPDATE phieu_xuat_kho SET trang_thai = 'DANG_GIAO', thoi_gian_xuat = NOW() WHERE ma_phieu = ?`,
        [maPhieu],
      );
    });

    return res.json({ success: true, message: "Đã xuất kho, đang trên đường giao" });
  } catch (err) {
    return sendError(res, err, "Lỗi xác nhận xuất kho:", "Không thể xác nhận xuất kho");
  }
};

const markDispatchDelivered = async (req, res) => {
  const { maPhieu } = req.params;

  try {
    const maNpp = getDistributorId(req);

    await withTransaction(async (connection) => {
      const [rows] = await connection.execute(
        `SELECT trang_thai, ma_lo_nong_san FROM phieu_xuat_kho WHERE ma_phieu = ? AND ma_nha_phan_phoi = ? LIMIT 1 FOR UPDATE`,
        [maPhieu, maNpp],
      );
      if (rows.length === 0) throw new ApiError(404, "Không tìm thấy phiếu xuất kho");
      if (rows[0].trang_thai !== "DANG_GIAO") {
        throw new ApiError(409, "Phiếu không ở trạng thái đang giao");
      }

      await connection.execute(
        `UPDATE phieu_xuat_kho SET trang_thai = 'DA_GIAO', thoi_gian_giao = NOW() WHERE ma_phieu = ?`,
        [maPhieu],
      );

      await connection.execute(
        `UPDATE lo_nong_san SET giai_doan_hien_tai = 'DISTRIBUTED' WHERE ma_lo_nong_san = ? AND giai_doan_hien_tai != 'DISTRIBUTED'`,
        [rows[0].ma_lo_nong_san],
      );
    });

    return res.json({ success: true, message: "Đã xác nhận giao hàng thành công" });
  } catch (err) {
    return sendError(res, err, "Lỗi xác nhận giao hàng:", "Không thể xác nhận giao hàng");
  }
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
      `SELECT ma_dai_ly, ten, nguoi_lien_he, so_dien_thoai, dia_chi, trang_thai FROM dai_ly WHERE ma_nha_phan_phoi = ? ORDER BY created_at DESC`,
      [maNpp],
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    return sendError(res, err, "Lỗi lấy danh sách đại lý:", "Không thể lấy danh sách đại lý");
  }
};

const createDealer = async (req, res) => {
  try {
    const maNpp = getDistributorId(req);

    const ten = cleanText(req.body?.ten);
    const nguoi_lien_he = cleanText(req.body?.nguoi_lien_he);
    const so_dien_thoai = cleanText(req.body?.so_dien_thoai);
    const dia_chi = cleanText(req.body?.dia_chi);

    if (!ten) throw new ApiError(400, "Vui lòng nhập tên đại lý");
    if (!so_dien_thoai) throw new ApiError(400, "Vui lòng nhập số điện thoại");

    const maDaiLy = await withTransaction(async (connection) => {
      const newCode = await generateCode(connection, "dai_ly", "ma_dai_ly", "DL", 3);

      await connection.execute(
        `INSERT INTO dai_ly (ma_dai_ly, ma_nha_phan_phoi, ten, nguoi_lien_he, so_dien_thoai, dia_chi) VALUES (?, ?, ?, ?, ?, ?)`,
        [newCode, maNpp, ten, nguoi_lien_he, so_dien_thoai, dia_chi],
      );

      return newCode;
    });

    return res.status(201).json({ success: true, message: "Đã thêm đại lý mới", data: { ma_dai_ly: maDaiLy } });
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

    if (!ten) throw new ApiError(400, "Vui lòng nhập tên đại lý");
    if (!so_dien_thoai) throw new ApiError(400, "Vui lòng nhập số điện thoại");

    const [result] = await db.execute(
      `UPDATE dai_ly SET ten = ?, nguoi_lien_he = ?, so_dien_thoai = ?, dia_chi = ? WHERE ma_dai_ly = ? AND ma_nha_phan_phoi = ?`,
      [ten, nguoi_lien_he, so_dien_thoai, dia_chi, maDaiLy, maNpp],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đại lý" });
    }

    return res.json({ success: true, message: "Đã cập nhật đại lý" });
  } catch (err) {
    return sendError(res, err, "Lỗi cập nhật đại lý:", "Không thể cập nhật đại lý");
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
      return res.status(404).json({ success: false, message: "Không tìm thấy đại lý" });
    }

    const newStatus = rows[0].trang_thai === "HOAT_DONG" ? "NGUNG" : "HOAT_DONG";
    await db.execute(`UPDATE dai_ly SET trang_thai = ? WHERE ma_dai_ly = ?`, [newStatus, maDaiLy]);

    return res.json({ success: true, message: "Đã cập nhật trạng thái đại lý", data: { trang_thai: newStatus } });
  } catch (err) {
    return sendError(res, err, "Lỗi đổi trạng thái đại lý:", "Không thể đổi trạng thái đại lý");
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
      return res.status(404).json({ success: false, message: "Không tìm thấy đại lý" });
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
    return sendError(res, err, "Lỗi lấy lịch sử giao dịch đại lý:", "Không thể lấy lịch sử giao dịch");
  }
};

module.exports = {
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
};
