const { ghiSuKien, layChiSoKiemDinh, baoDamSuKienGoc } = require("./traceEvent");
const { hashNoiDung, sangGram } = require("./canonical");

// Các hàm ghi sự kiện cho từng nghiệp vụ, để controller chỉ cần gọi một dòng.

// Đổi ngày hết hạn (YYYY-MM-DD) thành mốc unix giây cuối ngày theo giờ Việt Nam.
// Backend coi chứng nhận còn hiệu lực đến hết ngày hieu_luc_den.
const hanChungNhanUnix = (ngay) => {
  if (!ngay) return 0;
  const ms = Date.parse(`${ngay}T23:59:59+07:00`);
  return Number.isNaN(ms) ? 0 : Math.floor(ms / 1000);
};

const LOAI_SAU_LENH = [
  "PICKUP_CONFIRMED",
  "DELIVERY_CONFIRMED",
  "STOCK_IN_CONFIRMED",
  "HANDOVER_REJECTED",
  "RETURN_SHIPPED",
  "RETURN_RECEIVED",
];

// Sự kiện của một lệnh vận chuyển (lenh_van_chuyen). Gọi bên trong transaction của controller.
const ghiSuKienVanDon = async (
  executor,
  maVanDon,
  loai,
  maNguoiKy,
  duLieuThem = {},
) => {
  const [rows] = await executor.query(
    `
    SELECT ma_van_don, ma_lo_nong_san, ma_nguoi_gui, ma_don_vi_van_chuyen, ma_ben_nhan,
           CAST(khoi_luong AS CHAR) AS khoi_luong, CAST(khoi_luong_nhan AS CHAR) AS khoi_luong_nhan,
           don_vi_tinh, ten_tai_xe, bien_so_xe
    FROM lenh_van_chuyen
    WHERE ma_van_don = ?
    LIMIT 1
    `,
    [maVanDon],
  );
  if (rows.length === 0)
    throw new Error(`Không tìm thấy lệnh vận chuyển ${maVanDon}`);
  const v = rows[0];

  const duLieu = {
    ma_van_don: v.ma_van_don,
    ma_nguoi_gui: v.ma_nguoi_gui,
    ma_don_vi_van_chuyen: v.ma_don_vi_van_chuyen,
    ma_ben_nhan: v.ma_ben_nhan,
    khoi_luong: v.khoi_luong,
    don_vi_tinh: v.don_vi_tinh,
    ten_tai_xe: v.ten_tai_xe,
    bien_so_xe: v.bien_so_xe,
    ...duLieuThem,
  };
  const thamSoLenh = {
    ma_van_don: v.ma_van_don,
    ma_don_vi_van_chuyen: v.ma_don_vi_van_chuyen,
    ma_ben_nhan: v.ma_ben_nhan || null,
  };

  // Lệnh tạo trước khi bật blockchain: bổ sung sự kiện "tạo lệnh" do người gửi ký để chuỗi đủ bước
  if (LOAI_SAU_LENH.includes(loai)) {
    const [daCo] = await executor.query(
      `
      SELECT 1 FROM lich_su_truy_xuat_lo
      WHERE ma_lo_nong_san = ? AND loai_hoat_dong = 'TRANSPORT_ORDERED'
        AND JSON_UNQUOTE(JSON_EXTRACT(du_lieu_chi_tiet, '$.du_lieu.ma_van_don')) = ?
      LIMIT 1
      `,
      [v.ma_lo_nong_san, v.ma_van_don],
    );
    if (daCo.length === 0) {
      const goc = await ghiSuKien(executor, {
        maLo: v.ma_lo_nong_san,
        loai: "TRANSPORT_ORDERED",
        maNguoiKy: v.ma_nguoi_gui,
        duLieu,
        thamSo: thamSoLenh,
      });
      if (!goc) return null; // lô cũ không được theo dõi
    }
  }

  // hợp đồng v2: bên nhận ký kèm khối lượng thực nhận (gram)
  const thamSo =
    loai === "TRANSPORT_ORDERED"
      ? thamSoLenh
      : loai === "STOCK_IN_CONFIRMED"
        ? { khoi_luong_nhan_gram: sangGram(v.khoi_luong_nhan || v.khoi_luong, v.don_vi_tinh) }
        : {};

  return ghiSuKien(executor, {
    maLo: v.ma_lo_nong_san,
    loai,
    maNguoiKy,
    duLieu: loai === "STOCK_IN_CONFIRMED" ? { ...duLieu, khoi_luong_nhan: v.khoi_luong_nhan || v.khoi_luong } : duLieu,
    thamSo,
  });
};

// Bên nhận (sơ chế / phân phối) từ chối khi hàng đã đến nơi. Trên chain lô chuyển sang "bị từ chối" và
// chỉ dùng lại được sau 2 bước trả hàng, nên xếp luôn cả 3 sự kiện vào hàng chờ ký:
//   HANDOVER_REJECTED (bên nhận ký) -> RETURN_SHIPPED (vận chuyển ký khi đã chở về)
//   -> RETURN_RECEIVED (bên gửi ký khi đã nhận lại hàng).
// Mỗi bên ký đúng lúc việc đó xảy ra; chữ ký chính là xác nhận của họ.
const ghiSuKienTuChoiNhanHang = async (executor, maVanDon) => {
  const [rows] = await executor.query(
    `SELECT ma_nguoi_gui, ma_don_vi_van_chuyen, ma_ben_nhan FROM lenh_van_chuyen WHERE ma_van_don = ? LIMIT 1`,
    [maVanDon],
  );
  if (rows.length === 0) throw new Error(`Không tìm thấy lệnh vận chuyển ${maVanDon}`);
  const v = rows[0];
  const tuChoi = await ghiSuKienVanDon(executor, maVanDon, "HANDOVER_REJECTED", v.ma_ben_nhan, { ben_tu_choi: "BEN_NHAN" });
  if (!tuChoi) return null; // lô không được theo dõi trên chain
  await ghiSuKienVanDon(executor, maVanDon, "RETURN_SHIPPED", v.ma_don_vi_van_chuyen);
  await ghiSuKienVanDon(executor, maVanDon, "RETURN_RECEIVED", v.ma_nguoi_gui);
  return tuChoi;
};

// Lô mới tạo từ sơ chế / tách / gộp: ghi BATCH_RELATION (cơ sở ký createChild, lấy khối lượng từ lô nguồn).
// Trả null nếu lô nguồn không được theo dõi trên chain (lô cũ).
const ghiSuKienLoCon = async (executor, maLoMoi) => {
  const lot = await baoDamSuKienGoc(executor, maLoMoi);
  return lot && Number(lot.latest_event_sequence) > 0 ? lot : null;
};

// Sơ chế đổi giai đoạn: sang "đang đóng gói" -> PROCESSING_DONE; "hoàn tất" -> PROCESSING_DONE + PACKAGING_DONE.
// Mỗi loại chỉ ghi một lần cho mỗi lô; cơ sở sơ chế ký (hàm step trên hợp đồng).
const ghiSuKienGiaiDoanSoChe = async (executor, maSoChe, giaiDoan) => {
  const can =
    giaiDoan === "DA_HOAN_TAT"
      ? ["PROCESSING_DONE", "PACKAGING_DONE"]
      : giaiDoan === "DANG_DONG_GOI"
        ? ["PROCESSING_DONE"]
        : [];
  if (can.length === 0) return [];

  const [rows] = await executor.query(
    `
    SELECT sc.ma_so_che, sc.ma_lo_moi, sc.ma_co_so, sc.tieu_de, sc.khu_vuc_so_che, sc.quy_cach_tieu_chuan,
           DATE_FORMAT(sc.ngay_bat_dau, '%Y-%m-%d') AS ngay_bat_dau,
           CAST(lo.so_luong_hien_tai AS CHAR) AS so_luong, lo.don_vi_tinh
    FROM so_che_lo_hang sc
    JOIN lo_nong_san lo ON lo.ma_lo_nong_san = sc.ma_lo_moi
    WHERE sc.ma_so_che = ?
    LIMIT 1
    `,
    [maSoChe],
  );
  if (rows.length === 0) throw new Error(`Không tìm thấy lô sơ chế ${maSoChe}`);
  const sc = rows[0];

  const daGhi = [];
  for (const loai of can) {
    const [co] = await executor.query(
      `SELECT 1 FROM lich_su_truy_xuat_lo WHERE ma_lo_nong_san = ? AND loai_hoat_dong = ? LIMIT 1`,
      [sc.ma_lo_moi, loai],
    );
    if (co.length > 0) continue;
    const kq = await ghiSuKien(executor, {
      maLo: sc.ma_lo_moi,
      loai,
      maNguoiKy: sc.ma_co_so,
      duLieu: {
        ma_so_che: sc.ma_so_che,
        tieu_de: sc.tieu_de,
        khu_vuc_so_che: sc.khu_vuc_so_che,
        quy_cach_tieu_chuan: sc.quy_cach_tieu_chuan,
        ngay_bat_dau: sc.ngay_bat_dau,
        giai_doan: giaiDoan,
        so_luong: sc.so_luong,
        don_vi_tinh: sc.don_vi_tinh,
      },
      thamSo: {},
    });
    if (!kq) break; // lô không được theo dõi trên chain
    daGhi.push(loai);
  }
  return daGhi;
};

// Xóa các sự kiện CHƯA KÝ của một lô (dùng khi xóa lô sơ chế vừa tạo nhầm).
// Trả false nếu đã có sự kiện gửi lên chain: khi đó không được xóa lô.
const xoaSuKienChuaKy = async (executor, maLo) => {
  const [ev] = await executor.query(
    `SELECT ma_lich_su, blockchain_sync_status FROM lich_su_truy_xuat_lo WHERE ma_lo_nong_san = ?`,
    [maLo],
  );
  if (ev.some((e) => e.blockchain_sync_status !== "QUEUED")) return false;
  if (ev.length > 0) {
    const ids = ev.map((e) => e.ma_lich_su);
    await executor.query(`DELETE FROM blockchain_outbox WHERE event_id IN (?)`, [ids]);
    await executor.query(`DELETE FROM lich_su_truy_xuat_lo WHERE ma_lich_su IN (?)`, [ids]);
  }
  return true;
};

// Mã người dùng (trong danh sách) chưa có ví được duyệt: các bước họ phải ký sẽ chờ tới khi có ví
const chuaCoViDuyet = async (executor, maNguoiDungs) => {
  const ds = [...new Set(maNguoiDungs.filter(Boolean))];
  if (ds.length === 0) return [];
  const [rows] = await executor.query(
    `SELECT ma_nguoi_dung FROM vi_blockchain WHERE ma_nguoi_dung IN (?) AND trang_thai = 1 AND trang_thai_duyet = 'DA_DUYET'`,
    [ds],
  );
  const coVi = new Set(rows.map((r) => r.ma_nguoi_dung));
  return ds.filter((m) => !coVi.has(m));
};

// Hồ sơ kiểm định đã có sự kiện loại này trong chuỗi chưa (mỗi bước chỉ ghi một lần)
const daCoSuKienKiemDinh = async (executor, maKiemDinh, loai) => {
  const [rows] = await executor.query(
    `
    SELECT ma_lich_su FROM lich_su_truy_xuat_lo
    WHERE loai_hoat_dong = ?
      AND JSON_UNQUOTE(JSON_EXTRACT(du_lieu_chi_tiet, '$.du_lieu.ma_kiem_dinh')) = ?
    LIMIT 1
    `,
    [loai, maKiemDinh],
  );
  return rows.length > 0;
};

// Sự kiện kiểm định, gọi BÊN TRONG transaction của controller (lỗi sẽ ném ra để rollback cả nghiệp vụ).
// Trả null nếu sự kiện đã có hoặc lô không được theo dõi.
const ghiSuKienKiemDinhTrong = async (connection, maKiemDinh, loai) => {
  if (await daCoSuKienKiemDinh(connection, maKiemDinh, loai)) return null;

  const [rows] = await connection.query(
    `
    SELECT kd.ma_kiem_dinh, kd.ma_ho_so, kd.ma_lo_nong_san, kd.ma_co_quan, kd.tieu_chuan_dang_ky,
           kd.so_chung_nhan, kd.ket_luan, kd.kiem_dinh_vien,
           DATE_FORMAT(kd.hieu_luc_tu, '%Y-%m-%d') AS hieu_luc_tu,
           DATE_FORMAT(kd.hieu_luc_den, '%Y-%m-%d') AS hieu_luc_den,
           kd.ma_niem_phong, kd.khoi_luong_mau, kd.phuong_phap_lay_mau, kd.tinh_trang_cam_quan,
           DATE_FORMAT(kd.thoi_gian_lay_mau, '%Y-%m-%d %H:%i:%s') AS thoi_gian_lay_mau,
           kd.ly_do_thu_hoi, lo.ma_nguoi_quan_ly AS ma_chu_lo, pbn.ma_bam AS phien_ban_nguong
    FROM kiem_dinh_lo_hang kd
    JOIN lo_nong_san lo ON lo.ma_lo_nong_san = kd.ma_lo_nong_san
    LEFT JOIN phien_ban_nguong pbn ON pbn.ma_phien_ban = kd.ma_phien_ban_nguong
    WHERE kd.ma_kiem_dinh = ?
    LIMIT 1
    `,
    [maKiemDinh],
  );
  if (rows.length === 0) throw new Error(`Không tìm thấy hồ sơ kiểm định ${maKiemDinh}`);
  const kd = rows[0];

  // Biên bản lấy mẫu: cơ quan niêm phong, chủ lô ký xác nhận đúng nội dung này
  const duLieu = {
    ma_kiem_dinh: kd.ma_kiem_dinh,
    ma_ho_so: kd.ma_ho_so,
    tieu_chuan_dang_ky: kd.tieu_chuan_dang_ky,
    kiem_dinh_vien: kd.kiem_dinh_vien,
    ma_niem_phong: kd.ma_niem_phong,
    khoi_luong_mau: kd.khoi_luong_mau,
    phuong_phap_lay_mau: kd.phuong_phap_lay_mau,
    tinh_trang_cam_quan: kd.tinh_trang_cam_quan,
    thoi_gian_lay_mau: kd.thoi_gian_lay_mau,
  };
  if (loai !== "SAMPLING_SEALED" && loai !== "SAMPLING_CONFIRMED") {
    const chiSo = await layChiSoKiemDinh(connection, maKiemDinh);
    Object.assign(duLieu, {
      so_chung_nhan: kd.so_chung_nhan,
      ket_luan: kd.ket_luan,
      hieu_luc_tu: kd.hieu_luc_tu,
      hieu_luc_den: kd.hieu_luc_den,
      ly_do_thu_hoi: kd.ly_do_thu_hoi,
      phien_ban_nguong: kd.phien_ban_nguong,
      chi_so: chiSo,
      hash_chi_so: hashNoiDung(chiSo),
    });
  }

  return ghiSuKien(connection, {
    maLo: kd.ma_lo_nong_san,
    loai,
    // chủ lô ký xác nhận biên bản lấy mẫu; các bước còn lại do cơ quan kiểm định ký
    maNguoiKy: loai === "SAMPLING_CONFIRMED" ? kd.ma_chu_lo : kd.ma_co_quan,
    duLieu,
    // hợp đồng v2: chứng nhận gắn theo mã hồ sơ; công bố phải kèm bộ ngưỡng đã ghi trên chain
    thamSo: {
      ma_kiem_dinh: kd.ma_kiem_dinh,
      ...(loai === "CERTIFICATE_ISSUED"
        ? { het_han: hanChungNhanUnix(kd.hieu_luc_den) }
        : {}),
      ...(loai === "CERTIFICATE_ISSUED" || loai === "CERTIFICATE_FAILED"
        ? { phien_ban_nguong: kd.phien_ban_nguong || null }
        : {}),
    },
  });
};

// Bản tự mở transaction riêng và KHÔNG ném lỗi (dùng ở nơi nghiệp vụ đã xong, chỉ cần ghi log khi lỗi)
const ghiSuKienKiemDinh = async (db, maKiemDinh, loai) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const ketQua = await ghiSuKienKiemDinhTrong(connection, maKiemDinh, loai);
    await connection.commit();
    return ketQua;
  } catch (err) {
    if (connection) await connection.rollback().catch(() => {});
    console.error(
      `Không ghi được sự kiện ${loai} của hồ sơ ${maKiemDinh} vào hàng chờ blockchain:`,
      err,
    );
    return null;
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  ghiSuKienVanDon,
  ghiSuKienTuChoiNhanHang,
  ghiSuKienLoCon,
  ghiSuKienGiaiDoanSoChe,
  xoaSuKienChuaKy,
  chuaCoViDuyet,
  ghiSuKienKiemDinh,
  ghiSuKienKiemDinhTrong,
  daCoSuKienKiemDinh,
  hanChungNhanUnix,
};
