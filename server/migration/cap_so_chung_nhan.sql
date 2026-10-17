-- Bổ sung dữ liệu cho chứng thư kiểm định (chạy 1 lần, TRƯỚC khi chạy bản code mới):
--  1. Hồ sơ đã công bố nhưng chưa có kết luận (ket_luan = 'PENDING') là dữ liệu mẫu cũ,
--     coi là đã công bố ĐẠT (đúng với luồng cũ khi bấm "Công bố").
--  2. Cấp số chứng nhận dạng CN-<năm>-<6 số> và thời hạn 12 tháng cho các hồ sơ ĐẠT chưa có số.
--     Từ nay hệ thống tự cấp số này mỗi khi cơ quan kiểm định bấm "Công bố".

UPDATE kiem_dinh_lo_hang
SET ket_luan = 'PASSED',
    updated_at = updated_at          -- giữ nguyên ngày công bố cũ
WHERE trang_thai_ho_so = 'DA_CONG_BO'
  AND ket_luan = 'PENDING';

SET @n := (
  SELECT COALESCE(MAX(CAST(SUBSTRING(so_chung_nhan, 9) AS UNSIGNED)), 0)
  FROM kiem_dinh_lo_hang
  WHERE so_chung_nhan REGEXP '^CN-[0-9]{4}-[0-9]{6}$'
);

UPDATE kiem_dinh_lo_hang
SET so_chung_nhan = CONCAT('CN-', YEAR(updated_at), '-', LPAD(@n := @n + 1, 6, '0')),
    hieu_luc_tu   = COALESCE(hieu_luc_tu, DATE(updated_at)),
    hieu_luc_den  = COALESCE(hieu_luc_den, DATE_ADD(DATE(updated_at), INTERVAL 12 MONTH)),
    updated_at    = updated_at       -- giữ nguyên ngày công bố cũ
WHERE trang_thai_ho_so = 'DA_CONG_BO'
  AND ket_luan = 'PASSED'
  AND so_chung_nhan IS NULL
ORDER BY updated_at, ma_kiem_dinh;
