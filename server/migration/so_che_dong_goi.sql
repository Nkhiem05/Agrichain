-- Migration: Sơ chế & đóng gói (vai trò PROCESSOR)
-- Chạy: mysql -u <user> -p truy_xuat_nong_san < server/migration/so_che_dong_goi.sql
--
-- Luồng nghiệp vụ:
--   1. Tiếp nhận: dùng lại bảng lenh_van_chuyen có sẵn (nông dân -> cơ sở sơ chế).
--      Khi cơ sở xác nhận tiếp nhận, lô được chuyển quyền quản lý
--      (ma_nguoi_quan_ly) sang cơ sở sơ chế và giai_doan_hien_tai = 'RECEIVED'.
--   2. Sơ chế & đóng gói: 1 lô nhận (RECEIVED) được "biến đổi" (TRANSFORM) thành
--      1 lô mới qua bảng so_che_lo_hang mới. Lô mới dùng chung bảng lo_nong_san.
--   3. Tách / gộp lô: dùng lại bảng lien_ket_nguon_goc_lo có sẵn (SPLIT / MERGE).
--   4. Bàn giao vận chuyển: dùng lại bảng lenh_van_chuyen, nhưng bên nhận lúc
--      này có thể chưa có tài khoản chính thức (chưa có vai trò DISTRIBUTOR nào
--      được admin tạo) nên ma_ben_nhan được nới NULL-able và thêm cột địa chỉ
--      giao hàng dạng text tự do.

SET NAMES utf8mb4;

-- 1. Cho phép bàn giao tới nơi chưa có tài khoản "bên nhận" chính thức
ALTER TABLE `lenh_van_chuyen`
  MODIFY COLUMN `ma_ben_nhan` varchar(50) DEFAULT NULL COMMENT 'Người dùng vai trò PROCESSOR/DISTRIBUTOR, có thể để trống nếu giao tới nơi chưa có tài khoản',
  ADD COLUMN `dia_chi_giao_hang` varchar(255) DEFAULT NULL COMMENT 'Địa chỉ/kho nhận hàng dạng text khi chưa có tài khoản bên nhận' AFTER `ma_ben_nhan`;

-- 2. Thêm cột ghi chú dùng chung cho lô nông sản (vd: phẩm cấp khi tách lô)
ALTER TABLE `lo_nong_san`
  ADD COLUMN `ghi_chu` varchar(255) DEFAULT NULL AFTER `so_luong_hien_tai`;

-- 3. Bảng ghi nhận các lô sơ chế / đóng gói
CREATE TABLE IF NOT EXISTS `so_che_lo_hang` (
  `ma_so_che` varchar(64) NOT NULL,
  `ma_co_so` varchar(50) NOT NULL COMMENT 'Người dùng vai trò PROCESSOR thực hiện',
  `ma_lo_moi` varchar(64) NOT NULL COMMENT 'Lô sơ chế/đóng gói, tham chiếu lo_nong_san',
  `tieu_de` varchar(255) NOT NULL,
  `khu_vuc_so_che` varchar(150) DEFAULT NULL,
  `quy_cach_tieu_chuan` text DEFAULT NULL,
  `giai_doan_so_che` enum('DANG_RUA_KHU_KHUAN','DANG_PHAN_LOAI','DANG_DONG_GOI','DA_HOAN_TAT') NOT NULL DEFAULT 'DANG_RUA_KHU_KHUAN',
  `ngay_bat_dau` date NOT NULL,
  `ngay_hoan_tat` date DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`ma_so_che`),
  UNIQUE KEY `uq_soche_lo_moi` (`ma_lo_moi`),
  KEY `idx_soche_co_so` (`ma_co_so`, `giai_doan_so_che`),
  CONSTRAINT `fk_soche_co_so` FOREIGN KEY (`ma_co_so`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE,
  CONSTRAINT `fk_soche_lo_moi` FOREIGN KEY (`ma_lo_moi`) REFERENCES `lo_nong_san` (`ma_lo_nong_san`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
