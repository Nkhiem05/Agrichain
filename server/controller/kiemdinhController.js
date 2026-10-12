const db = require("../config/db");
const { generateUniqueCode } = require("../utils/generateCode");

// Hàm tải danh sách yêu cầu kiểm định
const taidlyeucaukiemdinh = async (req, res) => {
  try {
    const { ma_co_quan, tieu_chuan, trang_thai } = req.query;
    let sql = `
      SELECT 
        kd.ma_kiem_dinh,
        kd.ma_ho_so,
        kd.ma_lo_nong_san,
        kd.ma_co_quan,
        kd.tieu_chuan_dang_ky,
        kd.noi_dung_de_nghi,
        kd.trang_thai_ho_so,
        kd.created_at AS ngay_nop_don,
        lo.so_luong_hien_tai,
        lo.don_vi_tinh,
        sp.ten_san_pham,
        nt.ma_nong_trai,
        nt.ten_nong_trai,
        nt.dia_diem_nong_trai,
        td.ten_thua_dat,
        nd.ho_ten AS ten_chu_vuon,
        nd.so_dien_thoai AS sdt_chu_vuon
      FROM kiem_dinh_lo_hang kd
      INNER JOIN lo_nong_san lo ON kd.ma_lo_nong_san = lo.ma_lo_nong_san
      INNER JOIN san_pham_nong_san sp ON lo.ma_san_pham = sp.ma_san_pham
      LEFT JOIN mua_vu mv ON lo.ma_mua_vu = mv.ma_mua_vu
      LEFT JOIN nong_trai nt ON mv.ma_nong_trai = nt.ma_nong_trai
      LEFT JOIN thua_dat td ON mv.ma_thua_dat = td.ma_thua_dat
      LEFT JOIN nguoi_dung nd ON lo.ma_nguoi_quan_ly = nd.ma_nguoi_dung
      WHERE 1=1
    `;

    const values = [];

    if (ma_co_quan) {
      sql += ` AND kd.ma_co_quan = ?`;
      values.push(ma_co_quan);
    }

    if (trang_thai) {
      sql += ` AND kd.trang_thai_ho_so = ?`;
      values.push(trang_thai);
    } else {
      sql += ` AND kd.trang_thai_ho_so = 'CHO_TIEP_NHAN'`;
    }

    if (tieu_chuan) {
      sql += ` AND kd.tieu_chuan_dang_ky = ?`;
      values.push(tieu_chuan.toUpperCase());
    }

    sql += ` ORDER BY kd.created_at DESC`;

    const [rows] = await db.query(sql, values);

    return res.status(200).json({
      ok: true,
      message: "Lấy danh sách yêu cầu kiểm định thành công",
      data: rows,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách yêu cầu kiểm định:", error);
    return res.status(500).json({
      ok: false,
      message: "Lỗi máy chủ nội bộ",
    });
  }
};

// Chấp nhận yêu cầu kiểm định
const accepauthority = async (req, res) => {
  const { code } = req.query;
  const { status, day, time, inspector } = req.body;

  if (status) {
    const qrSealCode = await generateUniqueCode(
      db,
      "kiem_dinh_lo_hang",
      "ma_niem_phong",
      "QR-Seal-",
      10,
    );
    const sql = `UPDATE kiem_dinh_lo_hang SET trang_thai_ho_so=?, ngay_hen_lay_mau=?, gio_hen_lay_mau=?, kiem_dinh_vien=?, ma_niem_phong=? WHERE ma_kiem_dinh =?`;
    const [result] = await db.query(sql, [
      "DA_HEN_LICH",
      day,
      time,
      inspector,
      qrSealCode,
      code,
    ]);

    if (result.affectedRows > 0) {
      return res.status(200).json({
        message: "đã chấp nhận yêu cầu kiểm định",
        status: true,
      });
    } else {
      return res.status(404).json({ message: "đã có lỗi xảy ra" });
    }
  } else {
    const sql = `UPDATE kiem_dinh_lo_hang SET trang_thai_ho_so=? WHERE ma_kiem_dinh =?`;
    const [result] = await db.query(sql, ["TU_CHOI", code]);

    if (result.affectedRows > 0) {
      return res.status(200).json({
        message: "đã từ chối yêu cầu kiểm định",
        status: true,
      });
    } else {
      return res.status(404).json({ message: "đã có lỗi xảy ra" });
    }
  }
};

// Lấy danh sách lịch hẹn và lấy mẫu kèm theo các chỉ số đã lưu để kiểm tra đạt/không đạt
const getSamplingScheduleList = async (req, res) => {
  try {
    const { ma_co_quan } = req.query;
    let sql = `
      SELECT 
        kd.ma_kiem_dinh,
        kd.ma_niem_phong,
        kd.ma_ho_so,
        kd.ma_lo_nong_san,
        kd.tieu_chuan_dang_ky,
        kd.ngay_hen_lay_mau,
        kd.gio_hen_lay_mau,
        kd.kiem_dinh_vien,
        kd.khoi_luong_mau,
        kd.phuong_phap_lay_mau,
        kd.tinh_trang_cam_quan,
        kd.thoi_gian_lay_mau,
        kd.trang_thai_ho_so,
        sp.ma_san_pham,
        sp.ten_san_pham,
        lo.so_luong_hien_tai,
        lo.don_vi_tinh,
        nt.ma_nong_trai,
        nt.ten_nong_trai,
        nt.dia_diem_nong_trai,
        nd.ho_ten AS ten_chu_vuon,
        nd.so_dien_thoai AS sdt_chu_vuon
      FROM kiem_dinh_lo_hang kd
      JOIN lo_nong_san lo ON kd.ma_lo_nong_san = lo.ma_lo_nong_san
      JOIN san_pham_nong_san sp ON lo.ma_san_pham = sp.ma_san_pham
      LEFT JOIN mua_vu mv ON lo.ma_mua_vu = mv.ma_mua_vu
      LEFT JOIN nong_trai nt ON mv.ma_nong_trai = nt.ma_nong_trai
      LEFT JOIN nguoi_dung nd ON nt.ma_nguoi_dung = nd.ma_nguoi_dung
      WHERE kd.trang_thai_ho_so IN ('DA_HEN_LICH', 'CHO_LAY_MAU', 'DA_LAY_MAU')
    `;

    const params = [];
    if (ma_co_quan) {
      sql += ` AND kd.ma_co_quan = ?`;
      params.push(ma_co_quan);
    }

    sql += ` ORDER BY kd.ngay_hen_lay_mau ASC, kd.gio_hen_lay_mau ASC`;
    const [rows] = await db.query(sql, params);

    // Lấy thêm danh sách chỉ số kiểm định của các hồ sơ này
    if (rows.length > 0) {
      const maKiemDinhList = rows.map((r) => r.ma_kiem_dinh);
      const [chiSoRows] = await db.query(
        `SELECT cs.*, nq.toan_tu_so_sanh, nq.nguong_toi_da, nq.mo_ta_nguong
         FROM chi_so_kiem_dinh cs
         LEFT JOIN nguong_kiem_dinh_chuan nq ON (cs.ma_chi_so = nq.ma_chi_so OR cs.ten_chi_so = nq.ten_chi_tiet_chat)
         WHERE cs.ma_kiem_dinh IN (?)`,
        [maKiemDinhList],
      );

      // Nhóm chỉ số theo ma_kiem_dinh
      const chiSoMap = {};
      chiSoRows.forEach((cs) => {
        if (!chiSoMap[cs.ma_kiem_dinh]) chiSoMap[cs.ma_kiem_dinh] = [];
        chiSoMap[cs.ma_kiem_dinh].push(cs);
      });

      rows.forEach((r) => {
        r.danh_sach_chi_so = chiSoMap[r.ma_kiem_dinh] || [];
      });
    }

    return res.status(200).json({
      ok: true,
      data: rows,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách lịch hẹn và lấy mẫu:", error);
    return res.status(500).json({
      ok: false,
      message: "Lỗi máy chủ nội bộ",
      error: error.message,
    });
  }
};

// Cập nhật lấy mẫu
const updateSampleDetail = async (req, res) => {
  const { code } = req.query;
  const { sealcode, sampleweight, samplemethod, visualconsition } = req.body;

  const sql = `UPDATE kiem_dinh_lo_hang SET ma_niem_phong =?, khoi_luong_mau=?, phuong_phap_lay_mau =?, tinh_trang_cam_quan=?, trang_thai_ho_so='CHO_LAY_MAU' WHERE ma_kiem_dinh =?`;
  const [result] = await db.query(sql, [
    sealcode,
    sampleweight,
    samplemethod,
    visualconsition,
    code,
  ]);

  if (result.affectedRows) {
    res.status(200).json({
      status: true,
      message: "đã lấy mẫu",
    });
  } else {
    res.status(200).json({
      status: false,
      message: "có lỗi xảy ra vui lòng thử lại",
    });
  }
};

// API: Tải các tiêu chuẩn từ bảng nguong_kiem_dinh_chuan và các chỉ số đã lưu (nếu có)
const getNguongKiemDinh = async (req, res) => {
  try {
    const { code, tieu_chuan, ma_san_pham } = req.query;

    let sql = `
      SELECT ma_nguong, ma_chi_so, ten_chi_tiet_chat, phuong_phap_thu, 
             tieu_chuan_ap_dung, toan_tu_so_sanh, nguong_toi_da, don_vi_tinh, mo_ta_nguong
      FROM nguong_kiem_dinh_chuan
      WHERE trang_thai = 1
    `;
    const params = [];

    if (tieu_chuan) {
      sql += ` AND (tieu_chuan_ap_dung = 'TAT_CA' OR tieu_chuan_ap_dung = ?)`;
      params.push(tieu_chuan.toUpperCase());
    }

    if (ma_san_pham) {
      sql += ` AND (ma_san_pham IS NULL OR ma_san_pham = ?)`;
      params.push(ma_san_pham);
    }

    sql += ` ORDER BY ma_nguong ASC`;
    const [nguongList] = await db.query(sql, params);

    // Nếu có mã kiểm định, lấy kèm các chỉ số đã lưu trước đó
    let savedIndicators = [];
    if (code) {
      const [saved] = await db.query(
        `SELECT ma_chi_so_kd, ma_chi_so, ten_chi_so, gia_tri, thu_tu 
         FROM chi_so_kiem_dinh 
         WHERE ma_kiem_dinh = ? 
         ORDER BY thu_tu ASC`,
        [code],
      );
      savedIndicators = saved;
    }

    return res.status(200).json({
      ok: true,
      data: {
        standards: nguongList,
        savedIndicators: savedIndicators,
      },
    });
  } catch (error) {
    console.error("Lỗi lấy ngưỡng kiểm định chuẩn:", error);
    return res.status(500).json({ ok: false, message: "Lỗi máy chủ nội bộ" });
  }
};

// API: Lưu chỉ số kiểm định - XÓA CŨ VÀ INSERT LẠI TOÀN BỘ
const saveTestIndicators = async (req, res) => {
  try {
    const { code } = req.query;
    const { indicators } = req.body;
    const now = new Date();

    const rows = (indicators || [])
      .filter((i) => i.ten?.trim() && i.val?.toString().trim())
      .map((i, idx) => [
        code,
        i.loai || "CO_DINH",
        i.ma || null,
        i.ten.trim(),
        i.val.toString().trim(),
        idx + 1,
        now,
      ]);

    if (!code || rows.length === 0) {
      return res.status(200).json({
        status: false,
        message: "Vui lòng nhập đầy đủ các chỉ số kiểm định",
      });
    }

    // 1. Xóa toàn bộ chỉ số kiểm định cũ của mã kiểm định này
    await db.query(`DELETE FROM chi_so_kiem_dinh WHERE ma_kiem_dinh = ?`, [
      code,
    ]);

    // 2. Insert lại toàn bộ dữ liệu chỉ số mới
    await db.query(
      `INSERT INTO chi_so_kiem_dinh (ma_kiem_dinh, loai_chi_so, ma_chi_so, ten_chi_so, gia_tri, thu_tu, updated_at) VALUES ?`,
      [rows],
    );

    // 3. Cập nhật trạng thái hồ sơ kiểm định sang DA_LAY_MAU và cập nhật thời gian
    await db.query(
      `UPDATE kiem_dinh_lo_hang SET trang_thai_ho_so = 'DA_LAY_MAU', thoi_gian_lay_mau = COALESCE(thoi_gian_lay_mau, NOW()), updated_at = NOW() WHERE ma_kiem_dinh = ?`,
      [code],
    );

    return res.status(200).json({
      status: true,
      message:
        "Đã lưu toàn bộ chỉ số kiểm định chuẩn và cập nhật hồ sơ thành công",
    });
  } catch (error) {
    console.error("Lỗi khi lưu chỉ số kiểm định:", error);
    return res.status(500).json({
      status: false,
      message: "Có lỗi xảy ra khi lưu chỉ số xét nghiệm",
    });
  }
};

// Cập nhật trạng thái công bố hoặc thu hồi
const updateInspectionStatus = async (req, res) => {
  const { code } = req.query;
  const { status, message } = req.body;

  try {
    if (status === "accept") {
      const sql = `UPDATE kiem_dinh_lo_hang SET trang_thai_ho_so = 'DA_CONG_BO', ket_luan = 'PASSED', updated_at = CURRENT_TIMESTAMP WHERE ma_kiem_dinh = ?;`;
      const [result] = await db.query(sql, [code]);
      if (result.affectedRows > 0) {
        return res.status(200).json({
          message: "Công bố chứng nhận thành công",
          status: true,
        });
      }
    } else {
      const sql = `UPDATE kiem_dinh_lo_hang SET trang_thai_ho_so = 'THU_HOI', ket_luan = 'REVOKED', ly_do_thu_hoi = ?, ngay_thu_hoi = NOW(), updated_at = CURRENT_TIMESTAMP WHERE ma_kiem_dinh = ?;`;
      const [result] = await db.query(sql, [message, code]);
      if (result.affectedRows > 0) {
        return res.status(200).json({
          message: "Đã yêu cầu thu hồi chứng nhận",
          status: true,
        });
      }
    }
  } catch (error) {
    console.error("Lỗi cập nhật trạng thái kiểm định:", error);
    return res.status(500).json({ status: false, message: "Lỗi hệ thống" });
  }
};

const getPublishedCertificates = async (req, res) => {
  try {
    const { ma_co_quan } = req.query;
    let sql = `
      SELECT 
        kd.ma_kiem_dinh,
        kd.ma_ho_so,
        kd.ma_lo_nong_san,
        kd.tieu_chuan_dang_ky,
        kd.so_chung_nhan,
        kd.hieu_luc_tu,
        kd.hieu_luc_den,
        kd.updated_at AS ngay_cong_bo,
        sp.ten_san_pham,
        lo.so_luong_hien_tai,
        lo.don_vi_tinh,
        nt.ten_nong_trai,
        nd.ho_ten AS ten_chu_vuon
      FROM kiem_dinh_lo_hang kd
      INNER JOIN lo_nong_san lo ON kd.ma_lo_nong_san = lo.ma_lo_nong_san
      INNER JOIN san_pham_nong_san sp ON lo.ma_san_pham = sp.ma_san_pham
      LEFT JOIN mua_vu mv ON lo.ma_mua_vu = mv.ma_mua_vu
      LEFT JOIN nong_trai nt ON mv.ma_nong_trai = nt.ma_nong_trai
      LEFT JOIN nguoi_dung nd ON lo.ma_nguoi_quan_ly = nd.ma_nguoi_dung
      WHERE kd.trang_thai_ho_so = 'DA_CONG_BO'
    `;

    const values = [];
    if (ma_co_quan) {
      sql += ` AND kd.ma_co_quan = ?`;
      values.push(ma_co_quan);
    }

    sql += ` ORDER BY kd.updated_at DESC`;
    const [rows] = await db.query(sql, values);

    return res.status(200).json({
      ok: true,
      message: "Lấy danh sách công bố thành công",
      data: rows,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách công bố:", error);
    return res.status(500).json({ ok: false, message: "Lỗi máy chủ nội bộ" });
  }
};

const getRevokedCertificates = async (req, res) => {
  try {
    const { ma_co_quan } = req.query;
    let sql = `
      SELECT 
        kd.ma_kiem_dinh,
        kd.ma_ho_so,
        kd.ma_lo_nong_san,
        kd.tieu_chuan_dang_ky,
        kd.ly_do_thu_hoi,
        kd.updated_at AS ngay_thu_hoi,
        sp.ten_san_pham,
        lo.so_luong_hien_tai,
        lo.don_vi_tinh,
        nt.ten_nong_trai,
        nd.ho_ten AS ten_chu_vuon
      FROM kiem_dinh_lo_hang kd
      INNER JOIN lo_nong_san lo ON kd.ma_lo_nong_san = lo.ma_lo_nong_san
      INNER JOIN san_pham_nong_san sp ON lo.ma_san_pham = sp.ma_san_pham
      LEFT JOIN mua_vu mv ON lo.ma_mua_vu = mv.ma_mua_vu
      LEFT JOIN nong_trai nt ON mv.ma_nong_trai = nt.ma_nong_trai
      LEFT JOIN nguoi_dung nd ON lo.ma_nguoi_quan_ly = nd.ma_nguoi_dung
      WHERE kd.trang_thai_ho_so = 'THU_HOI'
    `;

    const values = [];
    if (ma_co_quan) {
      sql += ` AND kd.ma_co_quan = ?`;
      values.push(ma_co_quan);
    }

    sql += ` ORDER BY kd.updated_at DESC`;
    const [rows] = await db.query(sql, values);

    return res.status(200).json({
      ok: true,
      message: "Lấy danh sách thu hồi thành công",
      data: rows,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách thu hồi:", error);
    return res.status(500).json({ ok: false, message: "Lỗi máy chủ nội bộ" });
  }
};

module.exports = {
  taidlyeucaukiemdinh,
  accepauthority,
  getSamplingScheduleList,
  updateSampleDetail,
  getNguongKiemDinh,
  saveTestIndicators,
  updateInspectionStatus,
  getPublishedCertificates,
  getRevokedCertificates,
};
