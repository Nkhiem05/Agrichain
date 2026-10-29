const db = require("../config/db");
const { generateUniqueCode } = require("../utils/generateCode");
const { allIndicatorsPass } = require("../utils/danhGiaChiSo");
const {
  ghiSuKienKiemDinhTrong,
  daCoSuKienKiemDinh,
} = require("../services/blockchain/hook");
const { apDungKetQuaKiemDinh } = require("../services/blockchain/ghiNhan");
const { phienBanNguongHienHanh } = require("../services/blockchain/nguong");
const { layCauHinh } = require("../services/blockchain/chainClient");

// Chạy nghiệp vụ + ghi sự kiện blockchain trong cùng một transaction (lỗi thì hoàn tác cả hai)
const trongGiaoDich = async (fn) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const ketQua = await fn(connection);
    await connection.commit();
    return ketQua;
  } catch (err) {
    await connection.rollback().catch(() => {});
    throw err;
  } finally {
    connection.release();
  }
};

class LoiNghiepVu extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const CHUA_KY_LAY_MAU =
  'Biên bản lấy mẫu chưa được ký lên blockchain. Hãy vào mục "Ký blockchain" ký biên bản lấy mẫu trước, rồi mới nhập chỉ số xét nghiệm.';
const CHU_LO_CHUA_KY_XAC_NHAN =
  'Nông dân (chủ lô) chưa ký xác nhận biên bản lấy mẫu. Nông dân cần vào trang Nông dân → "Ký blockchain" để ký, sau đó bạn mới công bố được kết quả.';
const CHUA_KY_LAY_MAU_CONG_BO =
  'Biên bản lấy mẫu của cơ quan chưa được ký lên blockchain. Hãy vào mục "Ký blockchain" ký trước, rồi mới công bố được kết quả.';
const DA_GUI_CONG_BO =
  'Đã gửi yêu cầu công bố cho hồ sơ này, đang chờ cơ quan ký. Hãy vào mục "Ký blockchain" để ký; hồ sơ chỉ chuyển sang công bố sau khi ký xong.';
const DA_GUI_THU_HOI =
  'Đã gửi yêu cầu thu hồi cho hồ sơ này, đang chờ cơ quan ký. Hãy vào mục "Ký blockchain" để ký; hồ sơ chỉ bị thu hồi sau khi ký xong.';

// Trạng thái ký blockchain của hồ sơ: Map mã hồ sơ -> { theoDoi, daKyLayMau, daKyXacNhan, choKyCongBo }.
//  - daKyLayMau : SAMPLING_SEALED (cơ quan ký) đã lên chain -> mới được nhập chỉ số xét nghiệm
//  - daKyXacNhan: SAMPLING_CONFIRMED (chủ lô ký xác nhận biên bản lấy mẫu) đã lên chain -> mới được công bố
//  - choKyCongBo: đã bấm công bố (đạt / không đạt), sự kiện đang chờ cơ quan ký
// Chưa cấu hình blockchain, hoặc lô không được theo dõi (không có sự kiện niêm phong): không chặn (cả hai = true).
const trangThaiKyLayMau = async (executor, dsMaKiemDinh) => {
  const ketQua = new Map(
    dsMaKiemDinh.map((ma) => [
      ma,
      {
        theoDoi: false,
        daKyLayMau: true,
        daKyXacNhan: true,
        choKyCongBo: false,
      },
    ]),
  );
  if (dsMaKiemDinh.length === 0 || !layCauHinh().daCauHinh) return ketQua;

  const [rows] = await executor.query(
    `
    SELECT loai_hoat_dong, blockchain_sync_status,
           JSON_UNQUOTE(JSON_EXTRACT(du_lieu_chi_tiet, '$.du_lieu.ma_kiem_dinh')) AS ma_kiem_dinh
    FROM lich_su_truy_xuat_lo
    WHERE loai_hoat_dong IN ('SAMPLING_SEALED', 'SAMPLING_CONFIRMED', 'CERTIFICATE_ISSUED', 'CERTIFICATE_FAILED')
      AND JSON_UNQUOTE(JSON_EXTRACT(du_lieu_chi_tiet, '$.du_lieu.ma_kiem_dinh')) IN (?)
    `,
    [dsMaKiemDinh],
  );
  for (const ma of dsMaKiemDinh) {
    const cua = rows.filter((r) => r.ma_kiem_dinh === ma);
    const trangThai = (loai) =>
      cua.find((r) => r.loai_hoat_dong === loai)?.blockchain_sync_status;
    if (trangThai("SAMPLING_SEALED") === undefined) continue; // lô không được theo dõi
    ketQua.set(ma, {
      theoDoi: true,
      daKyLayMau: trangThai("SAMPLING_SEALED") === "CONFIRMED",
      daKyXacNhan: trangThai("SAMPLING_CONFIRMED") === "CONFIRMED",
      choKyCongBo: cua.some(
        (r) =>
          ["CERTIFICATE_ISSUED", "CERTIFICATE_FAILED"].includes(
            r.loai_hoat_dong,
          ) && r.blockchain_sync_status !== "CONFIRMED",
      ),
    });
  }
  return ketQua;
};

// Gắn cờ cho_ky_thu_hoi cho các hồ sơ: đã bấm thu hồi nhưng sự kiện thu hồi còn chờ cơ quan ký
const ganCoChoKyThuHoi = async (executor, rows) => {
  const choKy = new Set();
  if (rows.length > 0) {
    const [ev] = await executor.query(
      `
      SELECT JSON_UNQUOTE(JSON_EXTRACT(du_lieu_chi_tiet, '$.du_lieu.ma_kiem_dinh')) AS ma_kiem_dinh
      FROM lich_su_truy_xuat_lo
      WHERE loai_hoat_dong = 'CERTIFICATE_REVOKED' AND blockchain_sync_status <> 'CONFIRMED'
        AND JSON_UNQUOTE(JSON_EXTRACT(du_lieu_chi_tiet, '$.du_lieu.ma_kiem_dinh')) IN (?)
      `,
      [rows.map((r) => r.ma_kiem_dinh)],
    );
    ev.forEach((e) => choKy.add(e.ma_kiem_dinh));
  }
  rows.forEach((r) => {
    r.cho_ky_thu_hoi = choKy.has(r.ma_kiem_dinh);
  });
};

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
        kd.ket_luan,
        kd.so_chung_nhan,
        DATE_FORMAT(kd.hieu_luc_tu, '%Y-%m-%d') AS hieu_luc_tu,
        DATE_FORMAT(kd.hieu_luc_den, '%Y-%m-%d') AS hieu_luc_den,
        kd.updated_at AS ngay_cong_bo,
        kd.created_at AS ngay_nop_don,
        co_quan.ho_ten AS ten_co_quan,
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
      LEFT JOIN nguoi_dung co_quan ON kd.ma_co_quan = co_quan.ma_nguoi_dung
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
    await ganCoChoKyThuHoi(db, rows);

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
  const { status, day, time, inspector, ma_kiem_dinh_vien } = req.body;

  if (status) {
    // Kiểm định viên phải thuộc đúng cơ quan của hồ sơ và đang hoạt động
    let inspectorText = inspector || null;
    let inspectorCode = null;
    if (ma_kiem_dinh_vien) {
      const [found] = await db.query(
        `SELECT v.ma_kiem_dinh_vien, v.ho_ten, v.chuc_vu, v.trang_thai
         FROM kiem_dinh_vien v
         JOIN kiem_dinh_lo_hang kd ON kd.ma_co_quan = v.ma_co_quan
         WHERE v.ma_kiem_dinh_vien = ? AND kd.ma_kiem_dinh = ?`,
        [ma_kiem_dinh_vien, code],
      );
      if (found.length === 0) {
        return res.status(400).json({
          message: "Kiểm định viên không thuộc cơ quan này",
          status: false,
        });
      }
      if (!found[0].trang_thai) {
        return res.status(400).json({
          message: "Kiểm định viên đang tạm ngưng, vui lòng chọn người khác",
          status: false,
        });
      }
      inspectorCode = found[0].ma_kiem_dinh_vien;
      inspectorText = found[0].chuc_vu
        ? `${found[0].ho_ten} (${found[0].chuc_vu})`
        : found[0].ho_ten;
    }
    if (!inspectorText) {
      return res.status(400).json({
        message: "Vui lòng chọn kiểm định viên phụ trách",
        status: false,
      });
    }

    const qrSealCode = await generateUniqueCode(
      db,
      "kiem_dinh_lo_hang",
      "ma_niem_phong",
      "QR-Seal-",
      10,
    );
    const sql = `UPDATE kiem_dinh_lo_hang SET trang_thai_ho_so=?, ngay_hen_lay_mau=?, gio_hen_lay_mau=?, kiem_dinh_vien=?, ma_kiem_dinh_vien=?, ma_niem_phong=? WHERE ma_kiem_dinh =?`;
    const [result] = await db.query(sql, [
      "DA_HEN_LICH",
      day,
      time,
      inspectorText,
      inspectorCode,
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
        kd.chu_lo_da_xac_nhan,
        kd.da_ghi_chuoi,
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

    sql += ` ORDER BY kd.ngay_hen_lay_mau DESC, kd.gio_hen_lay_mau DESC`;
    const [rows] = await db.query(sql, params);

    // Lấy thêm danh sách chỉ số kiểm định của các hồ sơ này
    if (rows.length > 0) {
      const maKiemDinhList = rows.map((r) => r.ma_kiem_dinh);
      const [chiSoRows] = await db.query(
        `SELECT cs.ma_chi_so_kd, cs.ma_kiem_dinh, cs.loai_chi_so, cs.ma_chi_so,
                cs.ten_chi_so, cs.gia_tri, cs.thu_tu, cs.updated_at,
                nq.toan_tu_so_sanh, nq.nguong_toi_da, nq.mo_ta_nguong
         FROM chi_so_kiem_dinh cs
         LEFT JOIN nguong_kiem_dinh_chuan nq
           ON cs.ma_chi_so = nq.ma_chi_so AND cs.ten_chi_so = nq.ten_chi_tiet_chat
         WHERE cs.ma_kiem_dinh IN (?)
         GROUP BY cs.ma_chi_so_kd`,
        [maKiemDinhList],
      );

      // Nhóm chỉ số theo ma_kiem_dinh
      const chiSoMap = {};
      chiSoRows.forEach((cs) => {
        if (!chiSoMap[cs.ma_kiem_dinh]) chiSoMap[cs.ma_kiem_dinh] = [];
        chiSoMap[cs.ma_kiem_dinh].push(cs);
      });

      const kyMap = await trangThaiKyLayMau(db, maKiemDinhList);
      rows.forEach((r) => {
        r.danh_sach_chi_so = chiSoMap[r.ma_kiem_dinh] || [];
        r.tat_ca_dat = allIndicatorsPass(r.danh_sach_chi_so);
        r.da_ky_lay_mau = kyMap.get(r.ma_kiem_dinh).daKyLayMau;
        r.cho_ky_cong_bo = kyMap.get(r.ma_kiem_dinh).choKyCongBo;
        // Hồ sơ được theo dõi trên chain: chủ lô chỉ tính là đã xác nhận khi đã KÝ xác nhận lên blockchain
        if (kyMap.get(r.ma_kiem_dinh).theoDoi) {
          r.chu_lo_da_xac_nhan = kyMap.get(r.ma_kiem_dinh).daKyXacNhan ? 1 : 0;
        }
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

// Cập nhật lấy mẫu & niêm phong. Lưu xong thì biên bản được ghi vào hàng chờ ký blockchain
// (SAMPLING_SEALED, cơ quan kiểm định ký) và không sửa được nữa: chủ lô sẽ ký xác nhận đúng nội dung này.
const updateSampleDetail = async (req, res) => {
  const { code } = req.query;
  const { sealcode, sampleweight, samplemethod, visualconsition } = req.body;

  try {
    await trongGiaoDich(async (conn) => {
      const [rows] = await conn.query(
        `SELECT trang_thai_ho_so FROM kiem_dinh_lo_hang WHERE ma_kiem_dinh = ? FOR UPDATE`,
        [code],
      );
      if (rows.length === 0)
        throw new LoiNghiepVu(404, "Không tìm thấy hồ sơ kiểm định");
      if (!["DA_HEN_LICH", "CHO_LAY_MAU"].includes(rows[0].trang_thai_ho_so)) {
        throw new LoiNghiepVu(409, "Hồ sơ không còn ở bước lấy mẫu");
      }
      if (await daCoSuKienKiemDinh(conn, code, "SAMPLING_SEALED")) {
        throw new LoiNghiepVu(
          409,
          "Biên bản lấy mẫu đã niêm phong và ghi nhận lên blockchain, không sửa được nữa",
        );
      }

      await conn.query(
        `UPDATE kiem_dinh_lo_hang
         SET ma_niem_phong = ?, khoi_luong_mau = ?, phuong_phap_lay_mau = ?, tinh_trang_cam_quan = ?,
             thoi_gian_lay_mau = COALESCE(thoi_gian_lay_mau, NOW()), trang_thai_ho_so = 'CHO_LAY_MAU'
         WHERE ma_kiem_dinh = ?`,
        [sealcode, sampleweight, samplemethod, visualconsition, code],
      );
      await ghiSuKienKiemDinhTrong(conn, code, "SAMPLING_SEALED");
      // Chủ lô xác nhận biên bản này bằng chữ ký: sự kiện chờ chủ lô ký xuất hiện ở tab "Ký blockchain" của nông dân
      await ghiSuKienKiemDinhTrong(conn, code, "SAMPLING_CONFIRMED", {
        apDung: { chu_lo_xac_nhan: true },
      });
    });

    return res.status(200).json({
      status: true,
      message:
        'Đã lấy mẫu. Chờ chủ lô ký xác nhận biên bản lấy mẫu (tab "Ký blockchain" của nông dân)',
    });
  } catch (err) {
    if (err.status)
      return res.status(200).json({ status: false, message: err.message });
    console.error("Lỗi cập nhật lấy mẫu:", err);
    return res.status(200).json({
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

    // Ưu tiên hàng có tieu_chuan cụ thể hơn TAT_CA, sau đó GROUP BY ten_chi_tiet_chat
    // để mỗi chất chỉ xuất hiện đúng 1 lần trong popup nhập chỉ số
    sql += ` ORDER BY CASE WHEN tieu_chuan_ap_dung = 'TAT_CA' THEN 1 ELSE 0 END ASC, ma_nguong ASC`;
    const [rawList] = await db.query(sql, params);

    // Deduplicate: mỗi ten_chi_tiet_chat chỉ giữ lại 1 hàng (ưu tiên tieu_chuan cụ thể)
    const seen = new Set();
    const nguongList = rawList.filter((row) => {
      const key = row.ten_chi_tiet_chat;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

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

    // Kết quả đã công bố (đã vào chuỗi hash) thì không sửa chỉ số nữa
    const [hoSo] = await db.query(
      `SELECT trang_thai_ho_so, da_ghi_chuoi FROM kiem_dinh_lo_hang WHERE ma_kiem_dinh = ?`,
      [code],
    );
    if (hoSo.length === 0) {
      return res
        .status(200)
        .json({ status: false, message: "Không tìm thấy hồ sơ kiểm định" });
    }
    if (
      hoSo[0].da_ghi_chuoi ||
      ["DA_CONG_BO", "THU_HOI", "TU_CHOI"].includes(hoSo[0].trang_thai_ho_so)
    ) {
      return res.status(200).json({
        status: false,
        message:
          "Kết quả kiểm định đã công bố hoặc đang chờ ký công bố, không sửa chỉ số được nữa",
      });
    }

    // Biên bản lấy mẫu phải đã được cơ quan ký lên blockchain thì mới nhập chỉ số xét nghiệm
    const ky = (await trangThaiKyLayMau(db, [code])).get(code);
    if (!ky.daKyLayMau) {
      return res.status(200).json({ status: false, message: CHUA_KY_LAY_MAU });
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

// Sinh số chứng nhận dạng CN-2026-000001 (tăng dần theo năm, không trùng)
const generateCertificateNumber = async (executor) => {
  const year = new Date().getFullYear();
  return generateUniqueCode(
    executor,
    "kiem_dinh_lo_hang",
    "so_chung_nhan",
    `CN-${year}-`,
    6,
  );
};

// Cập nhật trạng thái công bố (đạt / không đạt) hoặc thu hồi
//   status = "accept" : công bố ĐẠT  -> cấp số chứng nhận, hiệu lực 12 tháng
//   status = "fail"   : công bố KHÔNG ĐẠT -> lưu kết luận FAILED, không cấp chứng thư
//   status khác       : yêu cầu thu hồi (kèm lý do)
const updateInspectionStatus = async (req, res) => {
  const { code } = req.query;
  const { status, message } = req.body;

  try {
    if (!code) {
      return res
        .status(400)
        .json({ status: false, message: "Thiếu mã kiểm định" });
    }

    const ketQua = await trongGiaoDich(async (conn) => {
      const [rows] = await conn.query(
        `SELECT trang_thai_ho_so, ket_luan, chu_lo_da_xac_nhan
         FROM kiem_dinh_lo_hang WHERE ma_kiem_dinh = ? FOR UPDATE`,
        [code],
      );
      if (rows.length === 0)
        throw new LoiNghiepVu(404, "Không tìm thấy hồ sơ kiểm định");
      const hoSo = rows[0];

      if (status === "accept" || status === "fail") {
        // Chỉ công bố khi hồ sơ đã lấy mẫu và nhập chỉ số (DA_LAY_MAU)
        if (hoSo.trang_thai_ho_so !== "DA_LAY_MAU") {
          throw new LoiNghiepVu(
            409,
            "Chỉ công bố được hồ sơ đã lấy mẫu và nhập chỉ số kiểm định",
          );
        }
        // Đã bấm công bố trước đó: sự kiện đang chờ ký, không tạo thêm
        if (
          (await daCoSuKienKiemDinh(conn, code, "CERTIFICATE_ISSUED")) ||
          (await daCoSuKienKiemDinh(conn, code, "CERTIFICATE_FAILED"))
        ) {
          throw new LoiNghiepVu(409, DA_GUI_CONG_BO);
        }
        // Cơ quan phải đã ký niêm phong mẫu lên blockchain, rồi chủ lô ký xác nhận biên bản lấy mẫu
        // (hợp đồng cũng chặn nếu thiếu bước chủ lô ký)
        const ky = (await trangThaiKyLayMau(conn, [code])).get(code);
        if (ky.theoDoi) {
          if (!ky.daKyLayMau)
            throw new LoiNghiepVu(409, CHUA_KY_LAY_MAU_CONG_BO);
          if (!ky.daKyXacNhan) {
            // Hồ sơ niêm phong trước khi chủ lô phải ký: bổ sung sự kiện xác nhận để chủ lô ký.
            // Trả kết quả (không ném lỗi) để sự kiện vừa tạo không bị hoàn tác.
            await ghiSuKienKiemDinhTrong(conn, code, "SAMPLING_CONFIRMED", {
              apDung: { chu_lo_xac_nhan: true },
            });
            await conn.query(
              `UPDATE kiem_dinh_lo_hang SET chu_lo_da_xac_nhan = 0 WHERE ma_kiem_dinh = ?`,
              [code],
            );
            return { khongThucHien: true, message: CHU_LO_CHUA_KY_XAC_NHAN };
          }
        } else if (!hoSo.chu_lo_da_xac_nhan) {
          throw new LoiNghiepVu(409, CHU_LO_CHUA_KY_XAC_NHAN);
        }

        // Server tự đánh giá lại các chỉ số đã lưu, không tin giao diện
        const [chiSoRows] = await conn.query(
          `SELECT cs.gia_tri, nq.toan_tu_so_sanh, nq.nguong_toi_da
           FROM chi_so_kiem_dinh cs
           LEFT JOIN nguong_kiem_dinh_chuan nq
             ON cs.ma_chi_so = nq.ma_chi_so AND cs.ten_chi_so = nq.ten_chi_tiet_chat
           WHERE cs.ma_kiem_dinh = ?
           GROUP BY cs.ma_chi_so_kd`,
          [code],
        );
        const tatCaDat = allIndicatorsPass(chiSoRows);
        if (status === "accept" && !tatCaDat) {
          throw new LoiNghiepVu(
            409,
            chiSoRows.length === 0
              ? "Hồ sơ chưa có chỉ số kiểm định để công bố"
              : "Có chỉ số không đạt ngưỡng, không thể cấp chứng nhận. Hãy công bố kết luận Không đạt.",
          );
        }
        if (status === "fail" && tatCaDat) {
          throw new LoiNghiepVu(
            409,
            "Tất cả chỉ số đều đạt, không thể công bố Không đạt. Hãy cấp chứng nhận.",
          );
        }

        // Kết quả được đánh giá theo bộ ngưỡng hiện hành; bộ ngưỡng này phải đã được admin ghi lên blockchain
        let maPhienBan = null;
        let maBamNguong = null;
        if (layCauHinh().daCauHinh) {
          const nguong = await phienBanNguongHienHanh(conn);
          if (!nguong.phienBan?.ma_giao_dich_blockchain) {
            throw new LoiNghiepVu(
              409,
              "Bộ ngưỡng kiểm định hiện hành chưa được quản trị viên ghi lên blockchain, chưa công bố được. Hãy báo quản trị viên (Quản trị → Ví blockchain → Bộ ngưỡng kiểm định).",
            );
          }
          maPhienBan = nguong.phienBan.ma_phien_ban;
          maBamNguong = nguong.maBam;
        }

        // Kết quả chỉ được ÁP DỤNG vào hồ sơ (chuyển sang công bố) sau khi cơ quan ký sự kiện lên blockchain.
        // Bây giờ chỉ giữ chỗ số chứng nhận, khóa chỉ số xét nghiệm và xếp sự kiện chờ ký kèm kết quả.
        let apDung;
        let hoSoSuKien;
        if (status === "accept") {
          const soChungNhan = await generateCertificateNumber(conn);
          const [[ngay]] = await conn.query(
            `SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS tu,
                    DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 12 MONTH), '%Y-%m-%d') AS den`,
          );
          apDung = {
            trang_thai_ho_so: "DA_CONG_BO",
            ket_luan: "PASSED",
            so_chung_nhan: soChungNhan,
            hieu_luc_tu: ngay.tu,
            hieu_luc_den: ngay.den,
            ma_phien_ban_nguong: maPhienBan,
          };
          hoSoSuKien = {
            ket_luan: "PASSED",
            so_chung_nhan: soChungNhan,
            hieu_luc_tu: ngay.tu,
            hieu_luc_den: ngay.den,
            phien_ban_nguong: maBamNguong,
          };
        } else {
          apDung = {
            trang_thai_ho_so: "DA_CONG_BO",
            ket_luan: "FAILED",
            ma_phien_ban_nguong: maPhienBan,
          };
          hoSoSuKien = { ket_luan: "FAILED", phien_ban_nguong: maBamNguong };
        }
        await conn.query(
          `UPDATE kiem_dinh_lo_hang
           SET so_chung_nhan = COALESCE(?, so_chung_nhan), da_ghi_chuoi = 1
           WHERE ma_kiem_dinh = ?`,
          [apDung.so_chung_nhan ?? null, code],
        );
        const suKien = await ghiSuKienKiemDinhTrong(
          conn,
          code,
          status === "accept" ? "CERTIFICATE_ISSUED" : "CERTIFICATE_FAILED",
          { hoSo: hoSoSuKien, apDung },
        );

        if (!layCauHinh().daCauHinh || !suKien) {
          // Không có gì để ký (chưa bật blockchain, hoặc lô không được theo dõi): áp dụng ngay như trước
          await apDungKetQuaKiemDinh(conn, code, apDung);
          return status === "accept"
            ? {
                message: `Công bố chứng nhận thành công (số chứng nhận ${apDung.so_chung_nhan})`,
                so_chung_nhan: apDung.so_chung_nhan,
              }
            : { message: "Đã công bố kết luận KHÔNG ĐẠT cho lô hàng" };
        }
        return status === "accept"
          ? {
              cho_ky: true,
              message: `Đã tạo yêu cầu công bố chứng nhận (số ${apDung.so_chung_nhan}). Hãy ký ở mục "Ký blockchain"; hồ sơ chỉ chuyển sang "Công bố chứng nhận" sau khi ký xong.`,
              so_chung_nhan: apDung.so_chung_nhan,
            }
          : {
              cho_ky: true,
              message:
                'Đã tạo yêu cầu công bố kết luận KHÔNG ĐẠT. Hãy ký ở mục "Ký blockchain"; hồ sơ chỉ được công bố sau khi ký xong.',
            };
      }

      // Thu hồi
      if (hoSo.trang_thai_ho_so === "THU_HOI") {
        throw new LoiNghiepVu(409, "Hồ sơ đã bị thu hồi trước đó");
      }
      const thuHoiChungNhan =
        hoSo.trang_thai_ho_so === "DA_CONG_BO" && hoSo.ket_luan === "PASSED";

      if (thuHoiChungNhan) {
        // Chứng nhận ĐẠT đã cấp có trên chain: chỉ thu hồi sau khi cơ quan ký sự kiện thu hồi
        if (await daCoSuKienKiemDinh(conn, code, "CERTIFICATE_REVOKED")) {
          throw new LoiNghiepVu(409, DA_GUI_THU_HOI);
        }
        const apDung = {
          trang_thai_ho_so: "THU_HOI",
          ket_luan: "REVOKED",
          ly_do_thu_hoi: message,
        };
        const suKien = await ghiSuKienKiemDinhTrong(
          conn,
          code,
          "CERTIFICATE_REVOKED",
          {
            hoSo: { ket_luan: "REVOKED", ly_do_thu_hoi: message },
            apDung,
          },
        );
        if (!layCauHinh().daCauHinh || !suKien) {
          await apDungKetQuaKiemDinh(conn, code, apDung);
          return { message: "Đã yêu cầu thu hồi chứng nhận" };
        }
        return {
          cho_ky: true,
          message:
            'Đã tạo yêu cầu thu hồi chứng nhận. Hãy ký ở mục "Ký blockchain"; chứng nhận chỉ bị thu hồi sau khi ký xong.',
        };
      }

      // Hồ sơ chưa có chứng nhận trên chain (chưa công bố hoặc kết luận không đạt): không có gì để ký
      if (
        (await daCoSuKienKiemDinh(conn, code, "CERTIFICATE_ISSUED")) ||
        (await daCoSuKienKiemDinh(conn, code, "CERTIFICATE_FAILED"))
      ) {
        if (hoSo.trang_thai_ho_so === "DA_LAY_MAU") {
          throw new LoiNghiepVu(
            409,
            "Hồ sơ đang chờ ký công bố, chưa thu hồi được. Hãy ký hoặc đợi công bố xong.",
          );
        }
      }
      await conn.query(
        `UPDATE kiem_dinh_lo_hang
         SET trang_thai_ho_so = 'THU_HOI', ket_luan = 'REVOKED', ly_do_thu_hoi = ?,
             ngay_thu_hoi = NOW(), updated_at = CURRENT_TIMESTAMP
         WHERE ma_kiem_dinh = ?`,
        [message, code],
      );
      return { message: "Đã yêu cầu thu hồi chứng nhận" };
    });

    if (ketQua.khongThucHien) {
      return res.status(409).json({ status: false, message: ketQua.message });
    }
    return res.status(200).json({ status: true, ...ketQua });
  } catch (error) {
    if (error.status) {
      return res
        .status(error.status)
        .json({ status: false, message: error.message });
    }
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
      WHERE kd.trang_thai_ho_so = 'DA_CONG_BO' AND kd.ket_luan = 'PASSED'
    `;

    const values = [];
    if (ma_co_quan) {
      sql += ` AND kd.ma_co_quan = ?`;
      values.push(ma_co_quan);
    }

    sql += ` ORDER BY kd.updated_at DESC`;
    const [rows] = await db.query(sql, values);

    await ganCoChoKyThuHoi(db, rows);

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
