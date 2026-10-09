-- Migration: lệnh vận chuyển & bàn giao lô nông sản
-- Chạy sau khi đã import truy_xuat_nong_san.sql:
--   mysql -u <user> -p truy_xuat_nong_san < server/migration/lenh_van_chuyen.sql
--
-- Luồng trạng thái:
--   CHO_CHAP_NHAN    nông dân vừa tạo lệnh, chờ đơn vị vận chuyển chấp nhận
--   CHO_LAY_HANG     đơn vị vận chuyển đã chấp nhận, chờ xe đến lấy hàng
--   DANG_VAN_CHUYEN  đã nhận hàng, đang trên đường
--   CHO_TIEP_NHAN    đã đến nơi, chờ bên nhận xác nhận bàn giao
--   HOAN_THANH       bên nhận đã xác nhận
--   TU_CHOI          đơn vị vận chuyển từ chối lệnh
--   DA_HUY           nông dân hủy lệnh trước khi lấy hàng

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `lenh_van_chuyen` (
  `ma_van_don` varchar(64) NOT NULL,
  `ma_lo_nong_san` varchar(64) NOT NULL,
  `ma_nguoi_gui` varchar(50) NOT NULL COMMENT 'Nông dân tạo lệnh',
  `ma_don_vi_van_chuyen` varchar(50) NOT NULL COMMENT 'Người dùng vai trò TRANSPORTER',
  `ma_ben_nhan` varchar(50) NOT NULL COMMENT 'Người dùng vai trò PROCESSOR',
  `khoi_luong` decimal(18,3) NOT NULL COMMENT 'Khối lượng lô tại thời điểm tạo lệnh',
  `don_vi_tinh` varchar(30) NOT NULL,
  `thoi_gian_xuat` datetime NOT NULL COMMENT 'Thời gian xuất hàng (dự kiến, đơn vị vận chuyển có thể cập nhật khi lấy hàng)',
  `ten_tai_xe` varchar(150) DEFAULT NULL COMMENT 'Đơn vị vận chuyển điền khi phân công',
  `bien_so_xe` varchar(30) DEFAULT NULL,
  `ghi_chu` varchar(500) DEFAULT NULL,
  `trang_thai` enum('CHO_CHAP_NHAN','CHO_LAY_HANG','DANG_VAN_CHUYEN','CHO_TIEP_NHAN','HOAN_THANH','TU_CHOI','DA_HUY') NOT NULL DEFAULT 'CHO_CHAP_NHAN',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`ma_van_don`),
  KEY `idx_lvc_lo` (`ma_lo_nong_san`, `trang_thai`),
  KEY `idx_lvc_nguoi_gui` (`ma_nguoi_gui`, `trang_thai`),
  KEY `idx_lvc_don_vi` (`ma_don_vi_van_chuyen`, `trang_thai`),
  KEY `idx_lvc_ben_nhan` (`ma_ben_nhan`, `trang_thai`),
  CONSTRAINT `fk_lvc_lo` FOREIGN KEY (`ma_lo_nong_san`) REFERENCES `lo_nong_san` (`ma_lo_nong_san`) ON UPDATE CASCADE,
  CONSTRAINT `fk_lvc_nguoi_gui` FOREIGN KEY (`ma_nguoi_gui`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE,
  CONSTRAINT `fk_lvc_don_vi` FOREIGN KEY (`ma_don_vi_van_chuyen`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE,
  CONSTRAINT `fk_lvc_ben_nhan` FOREIGN KEY (`ma_ben_nhan`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
