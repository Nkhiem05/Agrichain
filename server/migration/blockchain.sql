-- Truy xuất nguồn gốc bằng blockchain (giai đoạn 1: neo hash sự kiện lên chain).
-- Chạy một lần trên database truy_xuat_nong_san (XAMPP/MariaDB). Chạy lại không lỗi.

-- 1. Thêm các loại sự kiện còn thiếu so với luồng thật của hệ thống.
--    (Chỉ thêm giá trị mới vào cuối danh sách, giữ nguyên các giá trị cũ.)
ALTER TABLE `lich_su_truy_xuat_lo`
  MODIFY `loai_hoat_dong` ENUM(
    'HARVEST_CONFIRMED',
    'PROCESSING_DONE',
    'PACKAGING_DONE',
    'PICKUP_CONFIRMED',
    'DELIVERY_CONFIRMED',
    'STOCK_IN_CONFIRMED',
    'COMPLETE_CONFIRMED',
    'SAMPLING_SEALED',
    'CERTIFICATE_ISSUED',
    'CERTIFICATE_REVOKED',
    'CERTIFICATE_FAILED',
    'TRANSPORT_ORDERED',
    'HANDOVER_REJECTED',
    'BATCH_RELATION',
    'DISPATCHED',
    'DELIVERED_TO_AGENT'
  ) NOT NULL;

-- 2. Ghi lại ví nào đã ký sự kiện (hiển thị ở trang tra cứu).
ALTER TABLE `lich_su_truy_xuat_lo`
  ADD COLUMN IF NOT EXISTS `dia_chi_vi_ky` char(42)
    CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL
    AFTER `ma_giao_dich_blockchain`;

-- 3. Ví blockchain: thêm bước admin duyệt vai trò của ví trên contract.
ALTER TABLE `vi_blockchain`
  ADD COLUMN IF NOT EXISTS `trang_thai_duyet`
    ENUM('CHO_DUYET', 'DA_DUYET', 'TU_CHOI') NOT NULL DEFAULT 'CHO_DUYET'
    AFTER `trang_thai`,
  ADD COLUMN IF NOT EXISTS `tx_gan_vai_tro` char(66)
    CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL
    AFTER `trang_thai_duyet`,
  ADD COLUMN IF NOT EXISTS `thoi_diem_duyet` datetime DEFAULT NULL
    AFTER `tx_gan_vai_tro`;

-- 4. Nonce dùng một lần để người dùng ký chứng minh sở hữu ví.
CREATE TABLE IF NOT EXISTS `vi_blockchain_nonce` (
  `ma_nguoi_dung` varchar(50) NOT NULL,
  `nonce` char(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `het_han` datetime NOT NULL,
  PRIMARY KEY (`ma_nguoi_dung`),
  CONSTRAINT `fk_vi_nonce_nguoi_dung`
    FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
