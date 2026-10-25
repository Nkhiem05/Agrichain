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

// Sự kiện đã có trên chain. txHash / signer / soBlock có thể null khi worker đối soát
// mà không tìm lại được giao dịch (chỉ biết hash mới nhất trên chain đã vượt qua sự kiện này).
const ghiNhanDaXacNhan = async (
  executor,
  { maLichSu, maLo, txHash = null, signer = null, soBlock = null, ghiChu = null },
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
  capNhatTrangThaiLo,
  ghiNhanDaXacNhan,
  ghiNhanDaGui,
  traVeHangCho,
};
