// Ghi nhận kết quả ký vào MySQL. Dùng chung cho API xác nhận (trình duyệt báo về) và Outbox worker (tự đối soát).

// Lô "CONFIRMED" khi mọi sự kiện của lô đã lên chain
const capNhatTrangThaiLo = async (executor, maLo) => {
  const [r] = await executor.query(
    `SELECT COUNT(*) AS con FROM lich_su_truy_xuat_lo WHERE ma_lo_nong_san = ? AND blockchain_sync_status <> 'CONFIRMED'`,
    [maLo],
  );
  await executor.query(
    `UPDATE lo_nong_san SET blockchain_sync_status = ? WHERE ma_lo_nong_san = ?`,
    [Number(r[0].con) === 0 ? "CONFIRMED" : "QUEUED", maLo],
  );
};

// Áp dụng kết quả kiểm định vào hồ sơ. Công bố / không đạt / thu hồi chỉ được áp dụng SAU KHI cơ quan kiểm định đã ký
// sự kiện tương ứng lên blockchain: lúc bấm nút, kết quả mới được lưu kèm sự kiện chờ ký (tham_so.ap_dung).
// Có điều kiện theo trạng thái hiện tại nên gọi lại nhiều lần vẫn an toàn.
const apDungKetQuaKiemDinh = async (executor, maKiemDinh, ap) => {
  if (!maKiemDinh || !ap) return;
  if (ap.chu_lo_xac_nhan) {
    // Chủ lô đã ký xác nhận biên bản lấy mẫu lên blockchain
    await executor.query(
      `UPDATE kiem_dinh_lo_hang SET chu_lo_da_xac_nhan = 1 WHERE ma_kiem_dinh = ?`,
      [maKiemDinh],
    );
    return;
  }
  if (ap.trang_thai_ho_so === "DA_CONG_BO") {
    await executor.query(
      `
      UPDATE kiem_dinh_lo_hang
      SET trang_thai_ho_so = 'DA_CONG_BO', ket_luan = ?,
          so_chung_nhan = COALESCE(?, so_chung_nhan),
          hieu_luc_tu = COALESCE(?, hieu_luc_tu),
          hieu_luc_den = COALESCE(?, hieu_luc_den),
          ma_phien_ban_nguong = ?, da_ghi_chuoi = 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE ma_kiem_dinh = ? AND trang_thai_ho_so = 'DA_LAY_MAU'
      `,
      [
        ap.ket_luan,
        ap.so_chung_nhan ?? null,
        ap.hieu_luc_tu ?? null,
        ap.hieu_luc_den ?? null,
        ap.ma_phien_ban_nguong ?? null,
        maKiemDinh,
      ],
    );
  } else if (ap.trang_thai_ho_so === "THU_HOI") {
    await executor.query(
      `
      UPDATE kiem_dinh_lo_hang
      SET trang_thai_ho_so = 'THU_HOI', ket_luan = 'REVOKED', ly_do_thu_hoi = ?,
          ngay_thu_hoi = NOW(), updated_at = CURRENT_TIMESTAMP
      WHERE ma_kiem_dinh = ? AND trang_thai_ho_so = 'DA_CONG_BO'
      `,
      [ap.ly_do_thu_hoi ?? null, maKiemDinh],
    );
  }
};

// Áp dụng bước vận chuyển vào lệnh. Đơn vị vận chuyển bấm lấy hàng / đến nơi / từ chối chỉ tạo sự kiện chờ ký;
// chuyến chỉ chuyển sang bước sau khi sự kiện đã lên blockchain. Có điều kiện theo trạng thái nên gọi lại vẫn an toàn.
const apDungKetQuaVanDon = async (executor, maVanDon, ap) => {
  if (!maVanDon || !ap) return;
  if (ap.hanh_dong === "LAY_HANG") {
    await executor.query(
      `UPDATE lenh_van_chuyen SET trang_thai = 'DANG_VAN_CHUYEN', khoi_luong = COALESCE(?, khoi_luong)
       WHERE ma_van_don = ? AND trang_thai = 'CHO_LAY_HANG'`,
      [ap.khoi_luong ?? null, maVanDon],
    );
    // Phiếu xuất kho cho đại lý (nếu có) chuyển sang đang giao
    await executor.query(
      `UPDATE phieu_xuat_kho SET trang_thai = 'DANG_GIAO', thoi_gian_xuat = COALESCE(thoi_gian_xuat, NOW())
       WHERE ma_van_don = ? AND trang_thai = 'CHO_XUAT'`,
      [maVanDon],
    );
  } else if (ap.hanh_dong === "DEN_NOI") {
    await executor.query(
      `UPDATE lenh_van_chuyen SET trang_thai = 'CHO_TIEP_NHAN' WHERE ma_van_don = ? AND trang_thai = 'DANG_VAN_CHUYEN'`,
      [maVanDon],
    );
  } else if (ap.hanh_dong === "NHAN_HANG") {
    // Bên nhận (cơ sở sơ chế) đã ký nhận hàng: lệnh hoàn thành, lô chuyển sang kho bên nhận với khối lượng thực nhận
    const [kq] = await executor.query(
      `UPDATE lenh_van_chuyen SET trang_thai = 'HOAN_THANH', khoi_luong_nhan = ? WHERE ma_van_don = ? AND trang_thai = 'CHO_TIEP_NHAN'`,
      [ap.khoi_luong_nhan, maVanDon],
    );
    if (kq.affectedRows > 0) {
      await executor.query(
        `
        UPDATE lo_nong_san lo
        JOIN lenh_van_chuyen v ON v.ma_lo_nong_san = lo.ma_lo_nong_san
        SET lo.ma_nguoi_quan_ly = v.ma_ben_nhan, lo.so_luong_hien_tai = ?, lo.giai_doan_hien_tai = 'RECEIVED'
        WHERE v.ma_van_don = ?
        `,
        [ap.khoi_luong_nhan, maVanDon],
      );
    }
  } else if (ap.hanh_dong === "BEN_NHAN_TU_CHOI") {
    // Bên nhận đã ký từ chối khi hàng đến nơi
    await executor.query(
      `UPDATE lenh_van_chuyen SET trang_thai = 'TU_CHOI', ghi_chu = ? WHERE ma_van_don = ? AND trang_thai = 'CHO_TIEP_NHAN'`,
      [ap.ghi_chu ?? null, maVanDon],
    );
  } else if (ap.hanh_dong === "TU_CHOI") {
    await executor.query(
      `UPDATE lenh_van_chuyen SET trang_thai = 'TU_CHOI', ghi_chu = ? WHERE ma_van_don = ? AND trang_thai = 'CHO_CHAP_NHAN'`,
      [ap.ghi_chu ?? null, maVanDon],
    );
    // Phiếu xuất kho cho đại lý (nếu có) bị hủy theo; lô xuất ở lại kho nhà phân phối
    await executor.query(
      `UPDATE phieu_xuat_kho SET trang_thai = 'DA_HUY' WHERE ma_van_don = ? AND trang_thai = 'CHO_XUAT'`,
      [maVanDon],
    );
  }
};

// Giai đoạn sơ chế: đổi sang "đang đóng gói" / "hoàn tất" chỉ có hiệu lực sau khi cơ sở đã ký sự kiện sơ chế / đóng gói xong.
// Chỉ tiến lên (không lùi) nên gọi lại vẫn an toàn.
const THU_TU_GIAI_DOAN_SO_CHE = [
  "DANG_RUA_KHU_KHUAN",
  "DANG_PHAN_LOAI",
  "DANG_DONG_GOI",
  "DA_HOAN_TAT",
];
const apDungGiaiDoanSoChe = async (executor, ap) => {
  if (!ap?.ma_so_che || !THU_TU_GIAI_DOAN_SO_CHE.includes(ap.giai_doan)) return;
  const [kq] = await executor.query(
    `
    UPDATE so_che_lo_hang
    SET giai_doan_so_che = ?, ngay_hoan_tat = IF(? = 'DA_HOAN_TAT', COALESCE(ngay_hoan_tat, CURDATE()), ngay_hoan_tat)
    WHERE ma_so_che = ? AND FIELD(giai_doan_so_che, ?) < FIELD(?, ?)
    `,
    [
      ap.giai_doan,
      ap.giai_doan,
      ap.ma_so_che,
      THU_TU_GIAI_DOAN_SO_CHE,
      ap.giai_doan,
      THU_TU_GIAI_DOAN_SO_CHE,
    ],
  );
  if (kq.affectedRows > 0 && ap.giai_doan === "DA_HOAN_TAT") {
    await executor.query(
      `UPDATE lo_nong_san lo JOIN so_che_lo_hang sc ON sc.ma_lo_moi = lo.ma_lo_nong_san
       SET lo.giai_doan_hien_tai = 'PACKAGED' WHERE sc.ma_so_che = ?`,
      [ap.ma_so_che],
    );
  }
};

// Sự kiện vừa lên chain mang kết quả kiểm định chờ áp dụng thì áp dụng ngay (trong cùng transaction xác nhận)
const apDungKetQuaKhiXacNhan = async (executor, maLichSu) => {
  const [rows] = await executor.query(
    `SELECT payload FROM blockchain_outbox WHERE event_id = ? LIMIT 1`,
    [maLichSu],
  );
  if (rows.length === 0) return;
  const payload =
    typeof rows[0].payload === "string"
      ? JSON.parse(rows[0].payload)
      : rows[0].payload;
  const ts = payload?.tham_so || {};
  if (ts.ap_dung?.hanh_dong === "SO_CHE_GIAI_DOAN") {
    await apDungGiaiDoanSoChe(executor, ts.ap_dung);
  } else if (ts.ap_dung?.hanh_dong) {
    await apDungKetQuaVanDon(executor, ts.ma_van_don, ts.ap_dung);
  } else {
    await apDungKetQuaKiemDinh(executor, ts.ma_kiem_dinh, ts.ap_dung);
  }
};

// Sự kiện đã có trên chain. txHash / signer / soBlock có thể null khi worker đối soát
// mà không tìm lại được giao dịch (chỉ biết hash mới nhất trên chain đã vượt qua sự kiện này).
const ghiNhanDaXacNhan = async (
  executor,
  {
    maLichSu,
    maLo,
    txHash = null,
    signer = null,
    soBlock = null,
    ghiChu = null,
  },
) => {
  await executor.query(
    `
    UPDATE lich_su_truy_xuat_lo
    SET blockchain_sync_status = 'CONFIRMED',
        ma_giao_dich_blockchain = COALESCE(?, ma_giao_dich_blockchain),
        dia_chi_vi_ky = COALESCE(?, dia_chi_vi_ky),
        so_block = COALESCE(?, so_block)
    WHERE ma_lich_su = ?
    `,
    [txHash, signer, soBlock, maLichSu],
  );
  await executor.query(
    `
    UPDATE blockchain_outbox
    SET status = 'CONFIRMED', tx_hash = COALESCE(?, tx_hash), last_error = ?, next_retry_at = NULL,
        submitted_at = COALESCE(submitted_at, NOW()), confirmed_at = NOW()
    WHERE event_id = ?
    `,
    [txHash, ghiChu, maLichSu],
  );
  await capNhatTrangThaiLo(executor, maLo);
  await apDungKetQuaKhiXacNhan(executor, maLichSu);
};

// Giao dịch đã gửi từ MetaMask (chưa chắc vào khối): worker sẽ theo dõi tiếp
const ghiNhanDaGui = async (executor, { maLichSu, txHash }) => {
  await executor.query(
    `
    UPDATE lich_su_truy_xuat_lo
    SET blockchain_sync_status = 'SUBMITTED', ma_giao_dich_blockchain = ?
    WHERE ma_lich_su = ? AND blockchain_sync_status <> 'CONFIRMED'
    `,
    [txHash, maLichSu],
  );
  await executor.query(
    `
    UPDATE blockchain_outbox
    SET status = 'SUBMITTED', tx_hash = ?, submitted_at = NOW(), next_retry_at = NULL, last_error = NULL
    WHERE event_id = ? AND status <> 'CONFIRMED'
    `,
    [txHash, maLichSu],
  );
};

// Giao dịch hỏng / mất: đưa về hàng chờ ký lại, ghi lý do để người ký thấy
const traVeHangCho = async (executor, { maLichSu, lyDo }) => {
  await executor.query(
    `
    UPDATE lich_su_truy_xuat_lo
    SET blockchain_sync_status = 'QUEUED', ma_giao_dich_blockchain = NULL
    WHERE ma_lich_su = ? AND blockchain_sync_status <> 'CONFIRMED'
    `,
    [maLichSu],
  );
  await executor.query(
    `
    UPDATE blockchain_outbox
    SET status = 'QUEUED', tx_hash = NULL, last_error = ?, retry_count = retry_count + 1, next_retry_at = NULL
    WHERE event_id = ? AND status <> 'CONFIRMED'
    `,
    [lyDo, maLichSu],
  );
};

module.exports = {
  apDungKetQuaKiemDinh,
  apDungKetQuaVanDon,
  apDungGiaiDoanSoChe,
  capNhatTrangThaiLo,
  ghiNhanDaXacNhan,
  ghiNhanDaGui,
  traVeHangCho,
};
