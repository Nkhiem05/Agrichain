-- Migration: Nhà phân phối (vai trò DISTRIBUTOR)
-- Chạy: mysql -u <user> -p truy_xuat_nong_san < server/migration/nha_phan_phoi.sql
--
-- Luồng nghiệp vụ:
--   1. Nhập kho: dùng lại bảng lenh_van_chuyen có sẵn (cơ sở sơ chế -> nhà
--      phân phối, nếu cơ sở sơ chế chọn 1 tài khoản DISTRIBUTOR làm bên
--      nhận). Khi nhà phân phối xác nhận tiếp nhận, lô được chuyển quyền
--      quản lý (ma_nguoi_quan_ly) sang nhà phân phối, lưu vị trí/kho thực tế.
--   2. Kho hàng: là các lô lo_nong_san đang do nhà phân phối quản lý
--      (ma_nguoi_quan_ly), không cần bảng riêng.
--   3. Phân phối cho đại lý: bảng phieu_xuat_kho mới - đại lý không có tài
--      khoản trong hệ thống (không quét/xác nhận được) nên đây chỉ là sổ
--      sách nội bộ của nhà phân phối, không dùng lại lenh_van_chuyen (vốn
--      cần tài khoản bên vận chuyển xác nhận từng bước).
--   4. Đại lý: bảng dai_ly mới, do nhà phân phối tự quản lý (không phải tài
--      khoản đăng nhập hệ thống).

SET NAMES utf8mb4;

-- 1. Vị trí lưu kho + hạn lưu kho thực tế khi nhập kho (dùng chung lo_nong_san)
ALTER TABLE `lo_nong_san`
  ADD COLUMN IF NOT EXISTS `vi_tri_luu_kho` varchar(150) DEFAULT NULL AFTER `ghi_chu`,
  ADD COLUMN IF NOT EXISTS `han_luu_kho` date DEFAULT NULL AFTER `vi_tri_luu_kho`;

-- 2. Đại lý do nhà phân phối quản lý (không phải tài khoản đăng nhập)
CREATE TABLE IF NOT EXISTS `dai_ly` (
  `ma_dai_ly` varchar(50) NOT NULL,
  `ma_nha_phan_phoi` varchar(50) NOT NULL COMMENT 'Người dùng vai trò DISTRIBUTOR sở hữu đại lý này',
  `ten` varchar(255) NOT NULL,
  `nguoi_lien_he` varchar(150) DEFAULT NULL,
  `so_dien_thoai` varchar(20) DEFAULT NULL,
  `dia_chi` varchar(255) DEFAULT NULL,
  `trang_thai` enum('HOAT_DONG','NGUNG') NOT NULL DEFAULT 'HOAT_DONG',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`ma_dai_ly`),
  KEY `idx_dai_ly_npp` (`ma_nha_phan_phoi`),
  CONSTRAINT `fk_dai_ly_npp` FOREIGN KEY (`ma_nha_phan_phoi`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Phiếu xuất kho: nhà phân phối giao hàng cho đại lý
CREATE TABLE IF NOT EXISTS `phieu_xuat_kho` (
  `ma_phieu` varchar(64) NOT NULL,
  `ma_nha_phan_phoi` varchar(50) NOT NULL,
  `ma_dai_ly` varchar(50) NOT NULL,
  `ma_lo_nong_san` varchar(64) NOT NULL,
  `so_luong_xuat` decimal(12,3) NOT NULL,
  `don_vi_tinh` varchar(20) NOT NULL,
  `hinh_thuc` enum('TU_GIAO','DV_VAN_CHUYEN') NOT NULL DEFAULT 'TU_GIAO',
  `ten_don_vi_van_chuyen` varchar(255) DEFAULT NULL,
  `ten_tai_xe` varchar(150) DEFAULT NULL,
  `bien_so_xe` varchar(20) DEFAULT NULL,
  `trang_thai` enum('CHO_XUAT','DANG_GIAO','DA_GIAO','DA_HUY') NOT NULL DEFAULT 'CHO_XUAT',
  `ghi_chu` varchar(500) DEFAULT NULL,
  `thoi_gian_xuat` datetime DEFAULT NULL,
  `thoi_gian_giao` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`ma_phieu`),
  KEY `idx_pxk_npp` (`ma_nha_phan_phoi`, `trang_thai`),
  KEY `idx_pxk_dai_ly` (`ma_dai_ly`),
  KEY `idx_pxk_lo` (`ma_lo_nong_san`),
  CONSTRAINT `fk_pxk_npp` FOREIGN KEY (`ma_nha_phan_phoi`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE,
  CONSTRAINT `fk_pxk_dai_ly` FOREIGN KEY (`ma_dai_ly`) REFERENCES `dai_ly` (`ma_dai_ly`) ON UPDATE CASCADE,
  CONSTRAINT `fk_pxk_lo` FOREIGN KEY (`ma_lo_nong_san`) REFERENCES `lo_nong_san` (`ma_lo_nong_san`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
