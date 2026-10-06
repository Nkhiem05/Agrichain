-- 1. Thêm vai trò Cơ quan kiểm định vào bảng người dùng
ALTER TABLE `nguoi_dung` 
  MODIFY `vai_tro` ENUM(
    'ADMIN',
    'FARMER_COOP',
    'PROCESSOR',
    'TRANSPORTER',
    'DISTRIBUTOR',
    'CONSUMER',
    'CERT_AUTHORITY'
  ) NOT NULL;

-- 2. Bổ sung các loại hoạt động kiểm định vào lịch sử truy xuất lô (để sync on-chain)
ALTER TABLE `lich_su_truy_xuat_lo` 
  MODIFY `loai_hoat_dong` ENUM(
    'HARVEST_CONFIRMED',
    'PROCESSING_DONE',
    'PACKAGING_DONE',
    'PICKUP_CONFIRMED',
    'DELIVERY_CONFIRMED',
    'STOCK_IN_CONFIRMED',
    'COMPLETE_CONFIRMED',
    'SAMPLING_SEALED',      -- Lấy mẫu & niêm phong túi
    'CERTIFICATE_ISSUED',   -- Công bố chứng nhận đạt chuẩn
    'CERTIFICATE_REVOKED'   -- Thu hồi / hủy chứng nhận
  ) NOT NULL;

-- 3. Tạo bảng quản lý toàn bộ vòng đời hồ sơ kiểm định
CREATE TABLE `kiem_dinh_lo_hang` (
  `ma_kiem_dinh` VARCHAR(64) NOT NULL,
  `ma_ho_so` VARCHAR(50) NOT NULL UNIQUE,          -- VD: #HS-KD-9041
  `ma_lo_nong_san` VARCHAR(64) NOT NULL,
  `ma_co_quan` VARCHAR(50) NOT NULL,               -- Tham chiếu nguoi_dung (vai_tro: CERT_AUTHORITY)
  `tieu_chuan_dang_ky` ENUM('VIETGAP', 'GLOBALGAP', 'ORGANIC') NOT NULL DEFAULT 'VIETGAP',
  `noi_dung_de_nghi` TEXT DEFAULT NULL,
  
  -- Lịch hẹn lấy mẫu thực địa
  `ngay_hen_lay_mau` DATE DEFAULT NULL,
  `gio_hen_lay_mau` TIME DEFAULT NULL,
  `kiem_dinh_vien` VARCHAR(150) DEFAULT NULL,      -- KS. Trần Minh Tuấn
  `ghi_chu_chuan_bi` TEXT DEFAULT NULL,

  -- Biên bản lấy mẫu & niêm phong
  `ma_niem_phong` VARCHAR(100) DEFAULT NULL,       -- SEAL-QR-9901
  `khoi_luong_mau` VARCHAR(50) DEFAULT NULL,       -- VD: 3.0 kg (10 quả)
  `phuong_phap_lay_mau` VARCHAR(255) DEFAULT NULL,
  `tinh_trang_cam_quan` VARCHAR(255) DEFAULT NULL,
  `thoi_gian_lay_mau` DATETIME DEFAULT NULL,

  -- Kết quả kiểm nghiệm Lab & Chứng nhận
  `chi_so_xet_nghiem` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`chi_so_xet_nghiem`)), -- Lưu JSON mảng chỉ số
  `so_chung_nhan` VARCHAR(100) DEFAULT NULL,       -- VG-2026-9921
  `ket_luan` ENUM('PENDING', 'PASSED', 'FAILED', 'REVOKED') NOT NULL DEFAULT 'PENDING',
  `hieu_luc_tu` DATE DEFAULT NULL,
  `hieu_luc_den` DATE DEFAULT NULL,
  
  -- Thu hồi & vi phạm
  `ly_do_thu_hoi` TEXT DEFAULT NULL,
  `ngay_thu_hoi` DATETIME DEFAULT NULL,

  -- Trạng thái quy trình
  `trang_thai_ho_so` ENUM(
    'CHO_TIEP_NHAN',    -- Nông dân mới gửi
    'DA_HEN_LICH',      -- Đã chấp thuận và hẹn ngày lấy mẫu
    'DA_LAY_MAU',       -- Đã niêm phong mang về lab
    'DA_CONG_BO',       -- Đã công bố kết quả lên hệ thống
    'TU_CHOI',          -- Bị từ chối tiếp nhận
    'THU_HOI'           -- Đã bị đình chỉ/thu hồi tem
  ) NOT NULL DEFAULT 'CHO_TIEP_NHAN',

  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`ma_kiem_dinh`),
  KEY `idx_kd_lo` (`ma_lo_nong_san`),
  KEY `idx_kd_co_quan` (`ma_co_quan`),
  KEY `idx_kd_trang_thai` (`trang_thai_ho_so`),
  CONSTRAINT `fk_kd_lo_nong_san` FOREIGN KEY (`ma_lo_nong_san`) REFERENCES `lo_nong_san` (`ma_lo_nong_san`) ON UPDATE CASCADE,
  CONSTRAINT `fk_kd_co_quan` FOREIGN KEY (`ma_co_quan`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;