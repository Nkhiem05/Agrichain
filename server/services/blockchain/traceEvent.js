const crypto = require("crypto");
const { EVENT_TYPES, ZERO_HASH } = require("./eventTypes");
const {
  canonicalJson,
  hashNoiDung,
  hashSuKien,
  batchIdCuaLo,
  sangGram,
} = require("./canonical");

// Ghi sự kiện truy xuất vào MySQL (chuỗi hash nối tiếp) và xếp hàng chờ ký lên blockchain.
// Luôn gọi bên trong cùng transaction với thao tác nghiệp vụ để dữ liệu và hash không lệch nhau:
//   await ghiSuKien(connection, { maLo, loai: "PICKUP_CONFIRMED", maNguoiKy, duLieu: {...} });

const MAX_DO_SAU_DONG_DOI = 10;
// Giai đoạn lô còn ở nông trại (lô gốc chỉ bắt đầu được theo dõi khi còn ở đây)
const GIAI_DOAN_TAI_NONG_TRAI = ["CREATED", "HARVESTED"];

const isoSangSql = (iso) => iso.replace("T", " ").replace("Z", "");

const khoaLo = async (executor, maLo) => {
  const [rows] = await executor.query(
    `
    SELECT
      ma_lo_nong_san, ma_mua_vu, ma_san_pham, ma_nguoi_quan_ly, so_luong_hien_tai, don_vi_tinh,
      giai_doan_hien_tai,
      DATE_FORMAT(ngay_thu_hoach, '%Y-%m-%d') AS ngay_thu_hoach,
      latest_event_sequence, latest_event_hash, created_at
    FROM lo_nong_san
    WHERE ma_lo_nong_san = ?
    LIMIT 1
    FOR UPDATE
    `,
    [maLo],
  );
  if (rows.length === 0) {
    throw new Error(`Không tìm thấy lô ${maLo} để ghi sự kiện truy xuất`);
  }
  return rows[0];
};

// Ảnh chụp (snapshot) mùa vụ + toàn bộ vật tư (phân bón, thuốc BVTV) đã dùng.
// Hash của snapshot nằm trong sự kiện thu hoạch; mùa vụ bị sửa sau đó sẽ làm hash lệch.
const layBanChupMuaVu = async (executor, maMuaVu) => {
  const [mv] = await executor.query(
    `
    SELECT
      m.ma_mua_vu, m.ma_nong_trai, m.ma_thua_dat, m.loai_cay_trong, m.giong_cay,
      DATE_FORMAT(m.ngay_gieo_trong, '%Y-%m-%d') AS ngay_gieo_trong,
      nt.ma_nguoi_dung AS ma_chu_nong_trai
    FROM mua_vu m
    JOIN nong_trai nt ON nt.ma_nong_trai = m.ma_nong_trai
    WHERE m.ma_mua_vu = ?
    LIMIT 1
    `,
    [maMuaVu],
  );
  if (mv.length === 0) return null;

  const [vatTu] = await executor.query(
    `
    SELECT
      mvv.ma_vat_tu,
      vt.loai_vat_tu,
      CAST(mvv.lieu_luong AS CHAR) AS lieu_luong,
      DATE_FORMAT(mvv.ngay_su_dung, '%Y-%m-%d') AS ngay_su_dung
    FROM mua_vu_vat_tu mvv
    JOIN danh_muc_vat_tu vt ON vt.ma_vat_tu = mvv.ma_vat_tu
    WHERE mvv.ma_mua_vu = ?
    ORDER BY mvv.ngay_su_dung, mvv.ma_vat_tu, mvv.lieu_luong
    `,
    [maMuaVu],
  );

  const { ma_chu_nong_trai: maChu, ...muaVu } = mv[0];
  const banChup = { mua_vu: muaVu, vat_tu: vatTu };
  return { banChup, hash: hashNoiDung(banChup), maChuNongTrai: maChu };
};

// Chỉ số xét nghiệm của một hồ sơ kiểm định (dùng cả khi ghi sự kiện và khi xác thực lại)
const layChiSoKiemDinh = async (executor, maKiemDinh) => {
  const [rows] = await executor.query(
    `
    SELECT loai_chi_so, ma_chi_so, ten_chi_so, gia_tri
    FROM chi_so_kiem_dinh
    WHERE ma_kiem_dinh = ?
    ORDER BY thu_tu, ma_chi_so_kd
    `,
    [maKiemDinh],
  );
  return rows.map((r) => ({
    loai_chi_so: r.loai_chi_so,
    ma_chi_so: r.ma_chi_so,
    ten_chi_so: r.ten_chi_so,
    gia_tri: r.gia_tri,
  }));
};

// Lô tạo trước ngày BLOCKCHAIN_CHI_LO_TU (hoặc có lô nguồn như vậy) không được theo dõi,
// vì các bước đã xảy ra trước đó không có chữ ký để đưa lên chain.
const boQuaLoCu = async (executor, lot, doSau = 0) => {
  const moc = process.env.BLOCKCHAIN_CHI_LO_TU;
  if (!moc) return false;
  const mocMs = Date.parse(moc);
  if (Number.isNaN(mocMs)) return false;
  if (new Date(lot.created_at).getTime() < mocMs) return true;
  if (doSau >= MAX_DO_SAU_DONG_DOI) return false;

  const [nguon] = await executor.query(
    `SELECT ma_lo_nguon FROM lien_ket_nguon_goc_lo WHERE ma_lo_duoc_tao_ra = ?`,
    [lot.ma_lo_nong_san],
  );
  for (const n of nguon) {
    const src = await khoaLo(executor, n.ma_lo_nguon);
    if (await boQuaLoCu(executor, src, doSau + 1)) return true;
  }
  return false;
};

const taoSuKien = async (
  executor,
  lot,
  { loai, maNguoiKy, duLieu, thamSo },
) => {
  const info = EVENT_TYPES[loai];
  if (!info) throw new Error(`Loại sự kiện không hợp lệ: ${loai}`);

  const stt = Number(lot.latest_event_sequence) + 1;
  const prevHash = lot.latest_event_hash || ZERO_HASH;
  const thoiDiem = new Date().toISOString();

  const payload = {
    v: 1,
    loai,
    ma_lo: lot.ma_lo_nong_san,
    stt,
    thoi_diem: thoiDiem,
    nguoi_ky: maNguoiKy,
    salt: crypto.randomBytes(16).toString("hex"), // chống dò ngược dữ liệu ít biến thể (biển số, SĐT...)
    du_lieu: duLieu || {},
  };
  const payloadHash = hashNoiDung(payload);
  const eventHash = hashSuKien(prevHash, payloadHash);
  const maLichSu = `EV-${lot.ma_lo_nong_san}-${stt}`;
  const batchId = batchIdCuaLo(lot.ma_lo_nong_san);

  await executor.query(
    `
    INSERT INTO lich_su_truy_xuat_lo
      (ma_lich_su, ma_lo_nong_san, ma_nguoi_dung, so_thu_tu_su_kien, loai_hoat_dong,
       thoi_diem_xay_ra, du_lieu_chi_tiet, ma_bam_du_lieu, ma_bam_su_kien_truoc,
       ma_bam_su_kien_hien_tai, blockchain_sync_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'QUEUED')
    `,
    [
      maLichSu,
      lot.ma_lo_nong_san,
      maNguoiKy,
      stt,
      loai,
      isoSangSql(thoiDiem),
      canonicalJson(payload),
      payloadHash,
      prevHash,
      eventHash,
    ],
  );

  const aggregate =
    loai === "HARVEST_CONFIRMED"
      ? "BATCH"
      : loai === "BATCH_RELATION"
        ? "BATCH_RELATION"
        : "TRACE_EVENT";

  // Thông tin để người ký gọi đúng hàm trên contract (ví của các bên được tra cứu lúc ký)
  const outbox = {
    ma_lo: lot.ma_lo_nong_san,
    loai,
    loai_ma: info.ma,
    ham: info.ham,
    batch_id: batchId,
    prev_hash: prevHash,
    event_hash: eventHash,
    tham_so: thamSo || {},
  };
  await executor.query(
    `
    INSERT INTO blockchain_outbox (event_id, aggregate_type, aggregate_id, payload, status)
    VALUES (?, ?, ?, ?, 'QUEUED')
    `,
    [maLichSu, aggregate, lot.ma_lo_nong_san, JSON.stringify(outbox)],
  );

  await executor.query(
    `
    UPDATE lo_nong_san
    SET latest_event_sequence = ?, latest_event_hash = ?,
        blockchain_sync_status = 'QUEUED', integrity_status = 'NOT_CHECKED'
    WHERE ma_lo_nong_san = ?
    `,
    [stt, eventHash, lot.ma_lo_nong_san],
  );

  return { maLichSu, stt, eventHash, prevHash };
};

// Sự kiện đầu tiên của một lô:
//   - lô gốc từ nông trại  -> HARVEST_CONFIRMED (kèm snapshot mùa vụ và vật tư)
//   - lô tạo từ sơ chế/chia/gộp -> BATCH_RELATION (cam kết với hash của các lô nguồn)
// Gọi tự động trước mọi sự kiện khác; gọi trực tiếp ngay sau khi tạo lô con.
const baoDamSuKienGoc = async (executor, maLo, doSau = 0) => {
  if (doSau > MAX_DO_SAU_DONG_DOI)
    throw new Error(`Dòng dõi lô ${maLo} quá sâu hoặc bị vòng lặp`);

  const lot = await khoaLo(executor, maLo);
  if (Number(lot.latest_event_sequence) > 0) return lot;
  if (await boQuaLoCu(executor, lot)) return null;

  const [nguon] = await executor.query(
    `
    SELECT ma_lo_nguon, loai_lien_ket, CAST(so_luong_tham_gia AS CHAR) AS so_luong_tham_gia, don_vi_tinh
    FROM lien_ket_nguon_goc_lo
    WHERE ma_lo_duoc_tao_ra = ?
    ORDER BY ma_lo_nguon
    `,
    [maLo],
  );

  if (nguon.length > 0) {
    const chiTietNguon = [];
    const gramNguon = [];
    for (const n of nguon) {
      await baoDamSuKienGoc(executor, n.ma_lo_nguon, doSau + 1);
      const src = await khoaLo(executor, n.ma_lo_nguon);
      if (Number(src.latest_event_sequence) === 0) return null;
      chiTietNguon.push({
        ma_lo: n.ma_lo_nguon,
        seq: Number(src.latest_event_sequence),
        hash: src.latest_event_hash,
        so_luong_tham_gia: n.so_luong_tham_gia,
      });
      gramNguon.push(sangGram(n.so_luong_tham_gia, n.don_vi_tinh));
    }

    await taoSuKien(executor, lot, {
      loai: "BATCH_RELATION",
      maNguoiKy: lot.ma_nguoi_quan_ly,
      duLieu: {
        loai_lien_ket: nguon[0].loai_lien_ket,
        ma_san_pham: lot.ma_san_pham,
        don_vi_tinh: lot.don_vi_tinh,
        nguon: chiTietNguon,
      },
      thamSo: {
        ma_lo_nguon: chiTietNguon.map((n) => n.ma_lo),
        hash_lo_nguon: chiTietNguon.map((n) => n.hash),
        seq_lo_nguon: chiTietNguon.map((n) => n.seq),
        // hợp đồng v2: khối lượng lấy từ từng lô nguồn và khối lượng lô con (gram), sản phẩm của lô con
        so_luong_nguon_gram: gramNguon,
        so_luong_con_gram: sangGram(lot.so_luong_hien_tai, lot.don_vi_tinh),
        ma_san_pham: lot.ma_san_pham,
      },
    });
    return khoaLo(executor, maLo);
  }

  // Lô gốc chưa có sự kiện nào mà đã rời nông trại (lô cũ, trước khi bật blockchain): không theo dõi.
  // Nếu ghi "thu hoạch" bây giờ thì trên chain chủ lô là nông dân trong khi hàng đã ở bên khác,
  // mọi bước sau (sơ chế, bàn giao...) sẽ bị hợp đồng từ chối và kẹt vĩnh viễn.
  if (!GIAI_DOAN_TAI_NONG_TRAI.includes(lot.giai_doan_hien_tai)) return null;

  // Lô gốc: người ký là chủ nông trại của mùa vụ
  const snap = lot.ma_mua_vu
    ? await layBanChupMuaVu(executor, lot.ma_mua_vu)
    : null;
  await taoSuKien(executor, lot, {
    loai: "HARVEST_CONFIRMED",
    maNguoiKy: snap?.maChuNongTrai || lot.ma_nguoi_quan_ly,
    duLieu: {
      ma_san_pham: lot.ma_san_pham,
      ma_mua_vu: lot.ma_mua_vu,
      ngay_thu_hoach: lot.ngay_thu_hoach,
      so_luong: String(lot.so_luong_hien_tai),
      don_vi_tinh: lot.don_vi_tinh,
      ban_chup_mua_vu: snap?.banChup ?? null,
      hash_ban_chup: snap?.hash ?? null,
    },
    // hợp đồng v2: khối lượng (gram) và sản phẩm được lưu trên chain
    thamSo: {
      ma_san_pham: lot.ma_san_pham,
      so_luong_gram: sangGram(lot.so_luong_hien_tai, lot.don_vi_tinh),
    },
  });
  return khoaLo(executor, maLo);
};

const ghiSuKien = async (
  executor,
  { maLo, loai, maNguoiKy, duLieu, thamSo },
) => {
  if (loai !== "HARVEST_CONFIRMED" && loai !== "BATCH_RELATION") {
    await baoDamSuKienGoc(executor, maLo);
  }
  const lot = await khoaLo(executor, maLo);
  if (
    loai !== "HARVEST_CONFIRMED" &&
    loai !== "BATCH_RELATION" &&
    Number(lot.latest_event_sequence) === 0
  ) {
    return null; // lô cũ không được theo dõi (xem boQuaLoCu)
  }
  if (
    Number(lot.latest_event_sequence) === 0 &&
    (await boQuaLoCu(executor, lot))
  )
    return null;
  return taoSuKien(executor, lot, { loai, maNguoiKy, duLieu, thamSo });
};

module.exports = {
  ghiSuKien,
  baoDamSuKienGoc,
  layBanChupMuaVu,
  layChiSoKiemDinh,
};
