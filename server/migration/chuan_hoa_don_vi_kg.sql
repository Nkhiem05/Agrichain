-- Chuẩn hóa toàn bộ dữ liệu khối lượng về đơn vị "kg".
-- Chỉ cần chạy 1 LẦN DUY NHẤT, và chỉ nếu bạn có lô/vận đơn nào đang bị gắn
-- nhầm đơn vị "Tấn" (hoặc "Tấn" bị lỗi font thành "T?n") do lỗ hổng cũ ở
-- API /api/farmer/batches (đã được khóa lại trong code, xem farmerController.js).
--
-- An toàn để chạy nhiều lần: sau lần đầu, không còn dòng nào khớp điều kiện
-- WHERE nữa nên các lần chạy sau sẽ không đổi gì thêm.
--
-- Trước khi chạy, nên backup database.

START TRANSACTION;

-- Lô nông sản
UPDATE lo_nong_san
SET so_luong_hien_tai = so_luong_hien_tai * 1000,
    don_vi_tinh = 'kg'
WHERE don_vi_tinh IN ('Tấn', 'T?n', 'tấn', 'TẤN');

-- Liên kết nguồn gốc lô (lịch sử tách/gộp/biến đổi)
UPDATE lien_ket_nguon_goc_lo
SET so_luong_tham_gia = so_luong_tham_gia * 1000,
    don_vi_tinh = 'kg'
WHERE don_vi_tinh IN ('Tấn', 'T?n', 'tấn', 'TẤN');

-- Lệnh vận chuyển / bàn giao
UPDATE lenh_van_chuyen
SET khoi_luong = khoi_luong * 1000,
    don_vi_tinh = 'kg'
WHERE don_vi_tinh IN ('Tấn', 'T?n', 'tấn', 'TẤN');

-- Phiếu xuất kho (nhà phân phối giao cho đại lý)
UPDATE phieu_xuat_kho
SET so_luong_xuat = so_luong_xuat * 1000,
    don_vi_tinh = 'kg'
WHERE don_vi_tinh IN ('Tấn', 'T?n', 'tấn', 'TẤN');

COMMIT;

-- Kiểm tra lại sau khi chạy: cả 4 câu dưới đây phải trả về 0 dòng.
-- SELECT * FROM lo_nong_san WHERE don_vi_tinh <> 'kg';
-- SELECT * FROM lien_ket_nguon_goc_lo WHERE don_vi_tinh <> 'kg';
-- SELECT * FROM lenh_van_chuyen WHERE don_vi_tinh <> 'kg';
-- SELECT * FROM phieu_xuat_kho WHERE don_vi_tinh <> 'kg';
