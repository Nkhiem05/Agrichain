-- Migration: yêu cầu cấp tài khoản (đăng ký nông trại / cơ sở sơ chế / đơn vị vận chuyển...)
-- Bảng này được server/controller/registerController.js dùng để lưu đơn đăng ký,
-- và được admin (server/controller/adminController.js) dùng để duyệt / từ chối.
-- Chạy sau khi đã import truy_xuat_nong_san.sql:
--   mysql -u <user> -p truy_xuat_nong_san < server/migration/yeu_cau_cap_tai_khoan.sql

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `yeu_cau_cap_tai_khoan` (
  `ma_yeu_cau` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `vai_tro_yeu_cau` enum('FARMER_COOP','PROCESSOR','TRANSPORTER','DISTRIBUTOR','CERT_AUTHORITY') NOT NULL,
  `ho_ten` varchar(150) NOT NULL,
  `so_dien_thoai` varchar(20) NOT NULL,
  `email` varchar(150) NOT NULL,
  `ten_co_so` varchar(150) NOT NULL,
  `dia_chi` varchar(255) NOT NULL,
  `thong_tin_bo_sung` text NOT NULL,
  `trang_thai_duyet` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `ma_nguoi_dung_tao` varchar(50) DEFAULT NULL,
  `ly_do_tu_choi` text DEFAULT NULL,
  `ma_nguoi_duyet` varchar(50) DEFAULT NULL,
  `ngay_duyet` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`ma_yeu_cau`),
  KEY `idx_yeu_cau_trang_thai` (`trang_thai_duyet`),
  CONSTRAINT `fk_yeu_cau_nguoi_duyet` FOREIGN KEY (`ma_nguoi_duyet`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_yeu_cau_nguoi_dung_tao` FOREIGN KEY (`ma_nguoi_dung_tao`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
