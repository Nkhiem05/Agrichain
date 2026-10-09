-- Migration: vật tư (phân bón / thuốc BVTV) sử dụng trong mùa vụ
-- Chạy sau khi đã import truy_xuat_nong_san.sql:
--   mysql -u <user> -p truy_xuat_nong_san < server/migration/mua_vu_vat_tu.sql

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `danh_muc_vat_tu` (
  `ma_vat_tu` varchar(50) NOT NULL,
  `loai_vat_tu` enum('PHAN_BON','THUOC_BVTV') NOT NULL,
  `ten_vat_tu` varchar(150) NOT NULL,
  `don_vi_tinh` varchar(30) NOT NULL,
  `trang_thai` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`ma_vat_tu`),
  KEY `idx_vat_tu_loai` (`loai_vat_tu`, `trang_thai`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mua_vu_vat_tu` (
  `ma_su_dung` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `ma_mua_vu` varchar(50) NOT NULL,
  `ma_vat_tu` varchar(50) NOT NULL,
  `lieu_luong` decimal(12,3) NOT NULL,
  `ngay_su_dung` date NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`ma_su_dung`),
  KEY `idx_mua_vu_vat_tu_mua_vu` (`ma_mua_vu`),
  KEY `idx_mua_vu_vat_tu_vat_tu` (`ma_vat_tu`),
  CONSTRAINT `fk_mua_vu_vat_tu_mua_vu` FOREIGN KEY (`ma_mua_vu`) REFERENCES `mua_vu` (`ma_mua_vu`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_mua_vu_vat_tu_vat_tu` FOREIGN KEY (`ma_vat_tu`) REFERENCES `danh_muc_vat_tu` (`ma_vat_tu`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ảnh mùa vụ (đường dẫn dạng /uploads/seasons/xxx.jpg)
-- Dùng MariaDB (XAMPP). Nếu dùng MySQL, bỏ "IF NOT EXISTS" và chỉ chạy 1 lần.
ALTER TABLE `mua_vu`
  ADD COLUMN IF NOT EXISTS `anh_mua_vu` varchar(500) DEFAULT NULL AFTER `ngay_thu_hoach_du_kien`;

-- Danh mục mẫu để có dữ liệu cho ô "Tên phân thuốc" (thêm/sửa tuỳ nhu cầu)
INSERT IGNORE INTO `danh_muc_vat_tu` (`ma_vat_tu`, `loai_vat_tu`, `ten_vat_tu`, `don_vi_tinh`) VALUES
('PB001', 'PHAN_BON', 'Phân Urê', 'kg'),
('PB002', 'PHAN_BON', 'Phân NPK 16-16-8', 'kg'),
('PB003', 'PHAN_BON', 'Phân DAP', 'kg'),
('PB004', 'PHAN_BON', 'Phân Kali clorua (KCl)', 'kg'),
('PB005', 'PHAN_BON', 'Phân hữu cơ vi sinh', 'kg'),
('TB001', 'THUOC_BVTV', 'Abamectin', 'lít'),
('TB002', 'THUOC_BVTV', 'Mancozeb', 'kg'),
('TB003', 'THUOC_BVTV', 'Imidacloprid', 'lít'),
('TB004', 'THUOC_BVTV', 'Hexaconazole', 'lít'),
('TB005', 'THUOC_BVTV', 'Đồng oxychloride', 'kg');
