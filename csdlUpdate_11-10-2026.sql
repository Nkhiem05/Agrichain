-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Máy chủ: 127.0.0.1
-- Thời gian đã tạo: Th10 10, 2026 lúc 09:05 PM
-- Phiên bản máy phục vụ: 10.4.32-MariaDB
-- Phiên bản PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Cơ sở dữ liệu: `truy_xuat_nong_san`
--

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `blockchain_outbox`
--

CREATE TABLE `blockchain_outbox` (
  `outbox_id` bigint(20) UNSIGNED NOT NULL,
  `event_id` varchar(64) DEFAULT NULL,
  `aggregate_type` enum('BATCH','TRACE_EVENT','BATCH_RELATION') NOT NULL,
  `aggregate_id` varchar(64) NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`payload`)),
  `status` enum('QUEUED','SUBMITTED','CONFIRMED','FAILED') NOT NULL DEFAULT 'QUEUED',
  `retry_count` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `next_retry_at` datetime DEFAULT NULL,
  `last_error` text DEFAULT NULL,
  `tx_hash` char(66) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `submitted_at` datetime DEFAULT NULL,
  `confirmed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `chi_so_kiem_dinh`
--

CREATE TABLE `chi_so_kiem_dinh` (
  `ma_chi_so_kd` bigint(20) UNSIGNED NOT NULL,
  `ma_kiem_dinh` varchar(64) NOT NULL,
  `loai_chi_so` enum('CO_DINH','TUY_CHINH') NOT NULL DEFAULT 'TUY_CHINH',
  `ma_chi_so` varchar(50) DEFAULT NULL,
  `ten_chi_so` varchar(150) NOT NULL,
  `gia_tri` varchar(255) NOT NULL,
  `thu_tu` smallint(5) UNSIGNED NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `chi_so_kiem_dinh`
--

INSERT INTO `chi_so_kiem_dinh` (`ma_chi_so_kd`, `ma_kiem_dinh`, `loai_chi_so`, `ma_chi_so`, `ten_chi_so`, `gia_tri`, `thu_tu`, `created_at`, `updated_at`) VALUES
(1, 'KD-2026-001', 'CO_DINH', 'DU_LUONG_BVTV', 'Dư lượng BVTV (Hóa chất cấm)', 'Âm tính', 1, '2026-10-11 02:05:37', '2026-10-11 02:05:37'),
(2, 'KD-2026-001', 'CO_DINH', 'KIM_LOAI_NANG', 'Kim loại nặng (Chì, Cadimi)', '< 0.05 mg/kg (Đạt)', 2, '2026-10-11 02:05:37', '2026-10-11 02:05:37'),
(3, 'KD-2026-001', 'CO_DINH', 'VI_SINH', 'Vi sinh (E.coli, Salmonella)', 'Không phát hiện', 3, '2026-10-11 02:05:37', '2026-10-11 02:05:37'),
(4, 'KD-2026-001', 'CO_DINH', 'NITRATE', 'Dư lượng Nitrate (NO3-)', '0.02 mg/kg', 4, '2026-10-11 02:05:37', '2026-10-11 02:05:37'),
(5, 'KD-2026-001', 'TUY_CHINH', NULL, 'Độ ngọt Brix', '12.5', 5, '2026-10-11 02:05:37', '2026-10-11 02:05:37');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `danh_muc_vat_tu`
--

CREATE TABLE `danh_muc_vat_tu` (
  `ma_vat_tu` varchar(50) NOT NULL,
  `loai_vat_tu` enum('PHAN_BON','THUOC_BVTV') NOT NULL,
  `ten_vat_tu` varchar(150) NOT NULL,
  `don_vi_tinh` varchar(30) NOT NULL,
  `trang_thai` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `danh_muc_vat_tu`
--

INSERT INTO `danh_muc_vat_tu` (`ma_vat_tu`, `loai_vat_tu`, `ten_vat_tu`, `don_vi_tinh`, `trang_thai`, `created_at`, `updated_at`) VALUES
('PB001', 'PHAN_BON', 'Phân Urê', 'kg', 1, '2026-10-07 09:25:36', '2026-10-07 09:25:36'),
('PB002', 'PHAN_BON', 'Phân NPK 16-16-8', 'kg', 1, '2026-10-07 09:25:36', '2026-10-07 09:25:36'),
('PB003', 'PHAN_BON', 'Phân DAP', 'kg', 1, '2026-10-07 09:25:36', '2026-10-07 09:25:36'),
('PB004', 'PHAN_BON', 'Phân Kali clorua (KCl)', 'kg', 1, '2026-10-07 09:25:36', '2026-10-07 09:25:36'),
('PB005', 'PHAN_BON', 'Phân hữu cơ vi sinh', 'kg', 1, '2026-10-07 09:25:36', '2026-10-07 09:25:36'),
('TB001', 'THUOC_BVTV', 'Abamectin', 'lít', 1, '2026-10-07 09:25:36', '2026-10-07 09:25:36'),
('TB002', 'THUOC_BVTV', 'Mancozeb', 'kg', 1, '2026-10-07 09:25:36', '2026-10-07 09:25:36'),
('TB003', 'THUOC_BVTV', 'Imidacloprid', 'lít', 1, '2026-10-07 09:25:36', '2026-10-07 09:25:36'),
('TB004', 'THUOC_BVTV', 'Hexaconazole', 'lít', 1, '2026-10-07 09:25:36', '2026-10-07 09:25:36'),
('TB005', 'THUOC_BVTV', 'Đồng oxychloride', 'kg', 1, '2026-10-07 09:25:36', '2026-10-07 09:25:36');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `kiem_dinh_lo_hang`
--

CREATE TABLE `kiem_dinh_lo_hang` (
  `ma_kiem_dinh` varchar(64) NOT NULL,
  `ma_ho_so` varchar(50) NOT NULL,
  `ma_lo_nong_san` varchar(64) NOT NULL,
  `ma_co_quan` varchar(50) NOT NULL,
  `tieu_chuan_dang_ky` enum('VIETGAP','GLOBALGAP','ORGANIC') NOT NULL DEFAULT 'VIETGAP',
  `noi_dung_de_nghi` text DEFAULT NULL,
  `ngay_hen_lay_mau` date DEFAULT NULL,
  `gio_hen_lay_mau` time DEFAULT NULL,
  `kiem_dinh_vien` varchar(150) DEFAULT NULL,
  `ghi_chu_chuan_bi` text DEFAULT NULL,
  `ma_niem_phong` varchar(100) DEFAULT NULL,
  `khoi_luong_mau` varchar(50) DEFAULT NULL,
  `phuong_phap_lay_mau` varchar(255) DEFAULT NULL,
  `tinh_trang_cam_quan` varchar(255) DEFAULT NULL,
  `thoi_gian_lay_mau` datetime DEFAULT NULL,
  `chi_so_xet_nghiem` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`chi_so_xet_nghiem`)),
  `so_chung_nhan` varchar(100) DEFAULT NULL,
  `ket_luan` enum('PENDING','PASSED','FAILED','REVOKED') NOT NULL DEFAULT 'PENDING',
  `hieu_luc_tu` date DEFAULT NULL,
  `hieu_luc_den` date DEFAULT NULL,
  `ly_do_thu_hoi` text DEFAULT NULL,
  `ngay_thu_hoi` datetime DEFAULT NULL,
  `trang_thai_ho_so` enum('CHO_TIEP_NHAN','DA_HEN_LICH','DA_LAY_MAU','DA_CONG_BO','TU_CHOI','THU_HOI') NOT NULL DEFAULT 'CHO_TIEP_NHAN',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `kiem_dinh_lo_hang`
--

INSERT INTO `kiem_dinh_lo_hang` (`ma_kiem_dinh`, `ma_ho_so`, `ma_lo_nong_san`, `ma_co_quan`, `tieu_chuan_dang_ky`, `noi_dung_de_nghi`, `ngay_hen_lay_mau`, `gio_hen_lay_mau`, `kiem_dinh_vien`, `ghi_chu_chuan_bi`, `ma_niem_phong`, `khoi_luong_mau`, `phuong_phap_lay_mau`, `tinh_trang_cam_quan`, `thoi_gian_lay_mau`, `chi_so_xet_nghiem`, `so_chung_nhan`, `ket_luan`, `hieu_luc_tu`, `hieu_luc_den`, `ly_do_thu_hoi`, `ngay_thu_hoi`, `trang_thai_ho_so`, `created_at`, `updated_at`) VALUES
('KD-2026-001', 'HS-KD-9041', 'LH-8824', 'CQKD001', 'VIETGAP', 'Đề nghị kiểm tra dư lượng thuốc BVTV và kim loại nặng để phục vụ đóng gói phân phối siêu thị.', '2026-10-08', '16:31:00', 'ThS. Lê Hoàng Yến (Chuyên viên vi sinh)', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PENDING', NULL, NULL, NULL, NULL, 'DA_HEN_LICH', '2026-10-05 08:30:00', '2026-10-10 16:28:56'),
('KD-2026-002', 'HS-KD-9042', 'LH-8825', 'CQKD001', 'GLOBALGAP', 'Lô xoài xuất khẩu đợt 1, đề nghị kiểm tra dư lượng hóa chất cấm theo tiêu chuẩn GlobalGAP.', '2026-10-06', '17:34:00', 'ThS. Lê Hoàng Yến (Chuyên viên vi sinh)', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PENDING', NULL, NULL, NULL, NULL, 'TU_CHOI', '2026-10-06 09:15:00', '2026-10-10 01:48:22'),
('KD-2026-003', 'HS-KD-9043', 'LH-8821', 'CQKD001', 'ORGANIC', 'Đề nghị giám định vi sinh và cấp tem chứng nhận Organic cho nông trại hữu cơ.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PENDING', NULL, NULL, NULL, NULL, 'DA_HEN_LICH', '2026-10-07 14:00:00', '2026-10-10 01:24:27');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `lich_su_truy_xuat_lo`
--

CREATE TABLE `lich_su_truy_xuat_lo` (
  `ma_lich_su` varchar(64) NOT NULL,
  `ma_lo_nong_san` varchar(64) NOT NULL,
  `ma_nguoi_dung` varchar(50) NOT NULL,
  `so_thu_tu_su_kien` bigint(20) UNSIGNED NOT NULL,
  `loai_hoat_dong` enum('HARVEST_CONFIRMED','PROCESSING_DONE','PACKAGING_DONE','PICKUP_CONFIRMED','DELIVERY_CONFIRMED','STOCK_IN_CONFIRMED','COMPLETE_CONFIRMED','SAMPLING_SEALED','CERTIFICATE_ISSUED','CERTIFICATE_REVOKED') NOT NULL,
  `thoi_diem_xay_ra` datetime(3) NOT NULL,
  `du_lieu_chi_tiet` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`du_lieu_chi_tiet`)),
  `ma_bam_du_lieu` char(66) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `ma_bam_su_kien_truoc` char(66) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `ma_bam_su_kien_hien_tai` char(66) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `ma_giao_dich_blockchain` char(66) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `blockchain_sync_status` enum('QUEUED','SUBMITTED','CONFIRMED','FAILED') NOT NULL DEFAULT 'QUEUED',
  `integrity_status` enum('NOT_CHECKED','VERIFIED','MISMATCH','INCOMPLETE','BROKEN_CHAIN') NOT NULL DEFAULT 'NOT_CHECKED',
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `lien_ket_nguon_goc_lo`
--

CREATE TABLE `lien_ket_nguon_goc_lo` (
  `ma_lien_ket` varchar(64) NOT NULL,
  `relation_group_id` varchar(64) NOT NULL,
  `ma_lo_nguon` varchar(64) NOT NULL,
  `ma_lo_duoc_tao_ra` varchar(64) NOT NULL,
  `loai_lien_ket` enum('SPLIT','MERGE','TRANSFORM') NOT NULL,
  `so_luong_tham_gia` decimal(18,3) NOT NULL,
  `don_vi_tinh` varchar(30) NOT NULL,
  `thoi_diem_tao_lien_ket` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `lo_nong_san`
--

CREATE TABLE `lo_nong_san` (
  `ma_lo_nong_san` varchar(64) NOT NULL,
  `ma_mua_vu` varchar(50) DEFAULT NULL,
  `ma_san_pham` varchar(50) NOT NULL,
  `ma_nguoi_quan_ly` varchar(50) NOT NULL,
  `ngay_thu_hoach` date DEFAULT NULL,
  `so_luong_hien_tai` decimal(18,3) NOT NULL,
  `don_vi_tinh` varchar(30) NOT NULL,
  `giai_doan_hien_tai` enum('CREATED','HARVESTED','PROCESSED','PACKAGED','IN_TRANSIT','RECEIVED','DISTRIBUTED','COMPLETED') NOT NULL DEFAULT 'CREATED',
  `tinh_trang_su_dung` enum('ACTIVE','CONSUMED_BY_SPLIT','CONSUMED_BY_MERGE','CONSUMED_BY_TRANSFORM','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  `latest_event_sequence` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `latest_event_hash` char(66) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `blockchain_sync_status` enum('QUEUED','SUBMITTED','CONFIRMED','FAILED') NOT NULL DEFAULT 'QUEUED',
  `integrity_status` enum('NOT_CHECKED','VERIFIED','MISMATCH','INCOMPLETE','BROKEN_CHAIN') NOT NULL DEFAULT 'NOT_CHECKED',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `lo_nong_san`
--

INSERT INTO `lo_nong_san` (`ma_lo_nong_san`, `ma_mua_vu`, `ma_san_pham`, `ma_nguoi_quan_ly`, `ngay_thu_hoach`, `so_luong_hien_tai`, `don_vi_tinh`, `giai_doan_hien_tai`, `tinh_trang_su_dung`, `latest_event_sequence`, `latest_event_hash`, `blockchain_sync_status`, `integrity_status`, `created_at`, `updated_at`) VALUES
('LH-8821', 'MV002', 'SP002', 'ND001', '2026-09-28', 3500.000, 'kg', 'HARVESTED', 'ACTIVE', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-10-07 23:28:35', '2026-10-07 23:28:35'),
('LH-8824', 'MV002', 'SP002', 'ND001', '2026-10-01', 5000.000, 'kg', 'HARVESTED', 'ACTIVE', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-10-07 23:28:35', '2026-10-07 23:28:35'),
('LH-8825', 'MV001', 'SP001', 'ND001', '2026-10-05', 8.500, 'Tấn', 'HARVESTED', 'ACTIVE', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-10-07 23:28:35', '2026-10-07 23:28:35'),
('LOXOAI001', 'MV001', 'SP001', 'ADMIN001', '2026-09-26', 10.000, 'Tấn', 'CREATED', 'ACTIVE', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-09-27 05:57:38', '2026-09-27 05:57:38');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `mua_vu`
--

CREATE TABLE `mua_vu` (
  `ma_mua_vu` varchar(50) NOT NULL,
  `ma_nong_trai` varchar(50) NOT NULL,
  `ma_thua_dat` varchar(50) DEFAULT NULL,
  `loai_cay_trong` varchar(100) NOT NULL,
  `giong_cay` varchar(100) DEFAULT NULL,
  `thua_dat` varchar(100) DEFAULT NULL,
  `ngay_gieo_trong` date NOT NULL,
  `ngay_thu_hoach_du_kien` date DEFAULT NULL,
  `anh_mua_vu` varchar(500) DEFAULT NULL,
  `trang_thai` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `mua_vu`
--

INSERT INTO `mua_vu` (`ma_mua_vu`, `ma_nong_trai`, `ma_thua_dat`, `loai_cay_trong`, `giong_cay`, `thua_dat`, `ngay_gieo_trong`, `ngay_thu_hoach_du_kien`, `anh_mua_vu`, `trang_thai`, `created_at`, `updated_at`) VALUES
('MV001', 'NT001', NULL, 'Xoài Cát Chu', NULL, NULL, '2026-08-27', NULL, NULL, 1, '2026-09-27 05:40:08', '2026-09-27 05:40:08'),
('MV002', 'NT001', 'TD002', 'Quýt Đường', 'Quýt Đường', NULL, '2025-06-18', '2026-11-30', NULL, 1, '2026-10-07 09:55:12', '2026-10-07 09:55:12'),
('MV003', 'NT002', 'TD003', 'Quýt Đường', NULL, NULL, '2026-10-07', NULL, NULL, 1, '2026-10-07 11:35:01', '2026-10-07 11:35:01');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `mua_vu_vat_tu`
--

CREATE TABLE `mua_vu_vat_tu` (
  `ma_su_dung` bigint(20) UNSIGNED NOT NULL,
  `ma_mua_vu` varchar(50) NOT NULL,
  `ma_vat_tu` varchar(50) NOT NULL,
  `lieu_luong` decimal(12,3) NOT NULL,
  `ngay_su_dung` date NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `mua_vu_vat_tu`
--

INSERT INTO `mua_vu_vat_tu` (`ma_su_dung`, `ma_mua_vu`, `ma_vat_tu`, `lieu_luong`, `ngay_su_dung`, `created_at`) VALUES
(1, 'MV002', 'PB001', 50.000, '2025-07-01', '2026-10-07 09:55:12'),
(2, 'MV002', 'TB001', 1.500, '2025-08-01', '2026-10-07 09:55:12');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `nguoi_dung`
--

CREATE TABLE `nguoi_dung` (
  `ma_nguoi_dung` varchar(50) NOT NULL,
  `ho_ten` varchar(150) NOT NULL,
  `ten_dang_nhap` varchar(50) DEFAULT NULL,
  `mat_khau` varchar(255) DEFAULT NULL,
  `vai_tro` enum('ADMIN','FARMER_COOP','PROCESSOR','TRANSPORTER','DISTRIBUTOR','CONSUMER','CERT_AUTHORITY') NOT NULL,
  `so_dien_thoai` varchar(20) DEFAULT NULL,
  `trang_thai` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `nguoi_dung`
--

INSERT INTO `nguoi_dung` (`ma_nguoi_dung`, `ho_ten`, `ten_dang_nhap`, `mat_khau`, `vai_tro`, `so_dien_thoai`, `trang_thai`, `created_at`, `updated_at`) VALUES
('ADMIN001', 'Quản trị viên', 'admin', '$2b$12$JiobVJRGTmb.9Dhw1yYd0.RyTU3vtSHkml1A/NzmJRX/qCt0zXwIG', 'ADMIN', '0900000000', 1, '2026-09-27 05:29:46', '2026-10-03 11:44:35'),
('CQKD001', 'Trung Tâm Giám Định Nông Nghiệp Vùng 2', 'kiemdinhvung2', '$2y$12$KIo6BpxLVK3shWMVfEMaFuiY8lzBhUTCscGVacQVFqxHjVLnHhQxa', 'CERT_AUTHORITY', '02923888999', 1, '2026-10-07 23:28:13', '2026-10-07 23:53:35'),
('ND001', 'Nguyễn Hoàng', 'nongdan01', '$2y$12$KIo6BpxLVK3shWMVfEMaFuiY8lzBhUTCscGVacQVFqxHjVLnHhQxa', 'FARMER_COOP', '0901234567', 1, '2026-09-27 05:29:24', '2026-10-03 12:35:19'),
('SC001', 'Khu Sơ Chế Chế Biến Mekong', 'sochemekong', '$2y$12$KIo6BpxLVK3shWMVfEMaFuiY8lzBhUTCscGVacQVFqxHjVLnHhQxa', 'PROCESSOR', '0977777777', 1, '2026-10-08 19:38:08', '2026-10-08 19:38:08'),
('VC001', 'Mekong Cold Logistics', 'vanchuyen01', '$2y$12$KIo6BpxLVK3shWMVfEMaFuiY8lzBhUTCscGVacQVFqxHjVLnHhQxa', 'TRANSPORTER', '0944444444', 1, '2026-10-08 19:38:08', '2026-10-08 19:38:08');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `nong_trai`
--

CREATE TABLE `nong_trai` (
  `ma_nong_trai` varchar(50) NOT NULL,
  `ma_nguoi_dung` varchar(50) NOT NULL,
  `ten_nong_trai` varchar(150) NOT NULL,
  `dia_diem_nong_trai` varchar(255) NOT NULL,
  `dien_tich_nong_trai` decimal(12,2) DEFAULT NULL,
  `anh_nong_trai` varchar(500) DEFAULT NULL,
  `trang_thai` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `nong_trai`
--

INSERT INTO `nong_trai` (`ma_nong_trai`, `ma_nguoi_dung`, `ten_nong_trai`, `dia_diem_nong_trai`, `dien_tich_nong_trai`, `anh_nong_trai`, `trang_thai`, `created_at`, `updated_at`) VALUES
('123', 'ND001', '123', '123', 123.00, '/uploads/farms/1791483268394-340621062.png', 1, '2026-10-09 01:14:28', '2026-10-09 01:14:28'),
('NT001', 'ND001', 'Nông Trại Hoàng Ngọc', 'Hậu Giang', 100.00, NULL, 1, '2026-09-27 05:35:19', '2026-10-07 10:02:24'),
('NT002', 'ND001', 'Nông Trại Hoàng Nguyễn', 'Cần Thơ', 200.00, '/uploads/farms/1791004710307-248307264.jpg', 1, '2026-10-03 12:18:30', '2026-10-03 12:18:30');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `quyen_thao_tac_lo`
--

CREATE TABLE `quyen_thao_tac_lo` (
  `ma_quyen` bigint(20) UNSIGNED NOT NULL,
  `ma_nguoi_dung` varchar(50) NOT NULL,
  `ma_lo_nong_san` varchar(64) NOT NULL,
  `loai_quyen_duoc_cap` enum('WRITE_EVENT','TRANSFER','LINK_RELATION') NOT NULL,
  `trang_thai_quyen` tinyint(1) NOT NULL DEFAULT 1,
  `thoi_diem_cap_quyen` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `san_pham_nong_san`
--

CREATE TABLE `san_pham_nong_san` (
  `ma_san_pham` varchar(50) NOT NULL,
  `ten_san_pham` varchar(150) NOT NULL,
  `loai_san_pham` varchar(100) NOT NULL,
  `mo_ta_san_pham` text DEFAULT NULL,
  `don_vi_tinh_mac_dinh` varchar(30) NOT NULL,
  `trang_thai` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `san_pham_nong_san`
--

INSERT INTO `san_pham_nong_san` (`ma_san_pham`, `ten_san_pham`, `loai_san_pham`, `mo_ta_san_pham`, `don_vi_tinh_mac_dinh`, `trang_thai`, `created_at`, `updated_at`) VALUES
('SP001', 'Xoải Cát Chu', 'Trái Cây', NULL, 'tan', 1, '2026-09-27 05:56:50', '2026-09-27 05:56:50'),
('SP002', 'Quýt Đường', 'Trái Cây', 'Quýt đường ngọt mọng nước miền Tây', 'kg', 1, '2026-10-07 23:28:35', '2026-10-07 23:28:35');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `thua_dat`
--

CREATE TABLE `thua_dat` (
  `ma_thua_dat` varchar(50) NOT NULL,
  `ma_nong_trai` varchar(50) NOT NULL,
  `ten_thua_dat` varchar(150) NOT NULL,
  `dien_tich` decimal(12,2) DEFAULT NULL,
  `loai_dat` varchar(100) DEFAULT NULL,
  `trang_thai` enum('DAT_TRONG','DANG_CANH_TAC','TAM_NGUNG') NOT NULL DEFAULT 'DAT_TRONG',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `thua_dat`
--

INSERT INTO `thua_dat` (`ma_thua_dat`, `ma_nong_trai`, `ten_thua_dat`, `dien_tich`, `loai_dat`, `trang_thai`, `created_at`, `updated_at`) VALUES
('TD001', 'NT001', 'Thửa A1-1', 2.50, 'Đất phù sa', 'DANG_CANH_TAC', '2026-10-03 12:39:50', '2026-10-03 12:39:50'),
('TD002', 'NT001', 'Thửa A1-2', 2.50, 'Đất phù sa', 'DANG_CANH_TAC', '2026-10-03 12:39:50', '2026-10-07 09:55:12'),
('TD003', 'NT002', 'A1-3', 100.00, 'Đất phù sa', 'DANG_CANH_TAC', '2026-10-07 11:35:01', '2026-10-07 11:35:01');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `vi_blockchain`
--

CREATE TABLE `vi_blockchain` (
  `dia_chi_vi` char(42) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `ma_nguoi_dung` varchar(50) NOT NULL,
  `thoi_diem_dang_ky` datetime NOT NULL DEFAULT current_timestamp(),
  `trang_thai` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Chỉ mục cho các bảng đã đổ
--

--
-- Chỉ mục cho bảng `blockchain_outbox`
--
ALTER TABLE `blockchain_outbox`
  ADD PRIMARY KEY (`outbox_id`),
  ADD UNIQUE KEY `uq_blockchain_outbox_event` (`event_id`),
  ADD KEY `idx_blockchain_outbox_worker` (`status`,`next_retry_at`),
  ADD KEY `idx_blockchain_outbox_aggregate` (`aggregate_type`,`aggregate_id`);

--
-- Chỉ mục cho bảng `chi_so_kiem_dinh`
--
ALTER TABLE `chi_so_kiem_dinh`
  ADD PRIMARY KEY (`ma_chi_so_kd`),
  ADD UNIQUE KEY `uq_chi_so_kd_ten` (`ma_kiem_dinh`,`ten_chi_so`),
  ADD KEY `idx_chi_so_kd_kiem_dinh` (`ma_kiem_dinh`,`thu_tu`);

--
-- Chỉ mục cho bảng `danh_muc_vat_tu`
--
ALTER TABLE `danh_muc_vat_tu`
  ADD PRIMARY KEY (`ma_vat_tu`),
  ADD KEY `idx_vat_tu_loai` (`loai_vat_tu`,`trang_thai`);

--
-- Chỉ mục cho bảng `kiem_dinh_lo_hang`
--
ALTER TABLE `kiem_dinh_lo_hang`
  ADD PRIMARY KEY (`ma_kiem_dinh`),
  ADD UNIQUE KEY `ma_ho_so` (`ma_ho_so`),
  ADD KEY `idx_kd_lo` (`ma_lo_nong_san`),
  ADD KEY `idx_kd_co_quan` (`ma_co_quan`),
  ADD KEY `idx_kd_trang_thai` (`trang_thai_ho_so`);

--
-- Chỉ mục cho bảng `lich_su_truy_xuat_lo`
--
ALTER TABLE `lich_su_truy_xuat_lo`
  ADD PRIMARY KEY (`ma_lich_su`),
  ADD UNIQUE KEY `uq_lich_su_lo_sequence` (`ma_lo_nong_san`,`so_thu_tu_su_kien`),
  ADD UNIQUE KEY `uq_lich_su_event_hash` (`ma_bam_su_kien_hien_tai`),
  ADD KEY `idx_lich_su_nguoi_dung` (`ma_nguoi_dung`),
  ADD KEY `idx_lich_su_tx_hash` (`ma_giao_dich_blockchain`),
  ADD KEY `idx_lich_su_sync_status` (`blockchain_sync_status`);

--
-- Chỉ mục cho bảng `lien_ket_nguon_goc_lo`
--
ALTER TABLE `lien_ket_nguon_goc_lo`
  ADD PRIMARY KEY (`ma_lien_ket`),
  ADD UNIQUE KEY `uq_lien_ket_group_edge` (`relation_group_id`,`ma_lo_nguon`,`ma_lo_duoc_tao_ra`),
  ADD KEY `idx_lien_ket_lo_nguon` (`ma_lo_nguon`),
  ADD KEY `idx_lien_ket_lo_duoc_tao_ra` (`ma_lo_duoc_tao_ra`),
  ADD KEY `idx_lien_ket_relation_group` (`relation_group_id`);

--
-- Chỉ mục cho bảng `lo_nong_san`
--
ALTER TABLE `lo_nong_san`
  ADD PRIMARY KEY (`ma_lo_nong_san`),
  ADD KEY `idx_lo_mua_vu` (`ma_mua_vu`),
  ADD KEY `idx_lo_san_pham` (`ma_san_pham`),
  ADD KEY `idx_lo_nguoi_quan_ly` (`ma_nguoi_quan_ly`),
  ADD KEY `idx_lo_giai_doan` (`giai_doan_hien_tai`),
  ADD KEY `idx_lo_tinh_trang_su_dung` (`tinh_trang_su_dung`);

--
-- Chỉ mục cho bảng `mua_vu`
--
ALTER TABLE `mua_vu`
  ADD PRIMARY KEY (`ma_mua_vu`),
  ADD KEY `idx_mua_vu_nong_trai` (`ma_nong_trai`),
  ADD KEY `fk_mua_vu_thua_dat` (`ma_thua_dat`);

--
-- Chỉ mục cho bảng `mua_vu_vat_tu`
--
ALTER TABLE `mua_vu_vat_tu`
  ADD PRIMARY KEY (`ma_su_dung`),
  ADD KEY `idx_mua_vu_vat_tu_mua_vu` (`ma_mua_vu`),
  ADD KEY `idx_mua_vu_vat_tu_vat_tu` (`ma_vat_tu`);

--
-- Chỉ mục cho bảng `nguoi_dung`
--
ALTER TABLE `nguoi_dung`
  ADD PRIMARY KEY (`ma_nguoi_dung`),
  ADD UNIQUE KEY `uq_ten_dang_nhap` (`ten_dang_nhap`);

--
-- Chỉ mục cho bảng `nong_trai`
--
ALTER TABLE `nong_trai`
  ADD PRIMARY KEY (`ma_nong_trai`),
  ADD KEY `idx_nong_trai_nguoi_dung` (`ma_nguoi_dung`);

--
-- Chỉ mục cho bảng `quyen_thao_tac_lo`
--
ALTER TABLE `quyen_thao_tac_lo`
  ADD PRIMARY KEY (`ma_quyen`),
  ADD UNIQUE KEY `uq_quyen_nguoi_lo_loai` (`ma_nguoi_dung`,`ma_lo_nong_san`,`loai_quyen_duoc_cap`),
  ADD KEY `idx_quyen_lo` (`ma_lo_nong_san`,`trang_thai_quyen`),
  ADD KEY `idx_quyen_nguoi` (`ma_nguoi_dung`,`trang_thai_quyen`);

--
-- Chỉ mục cho bảng `san_pham_nong_san`
--
ALTER TABLE `san_pham_nong_san`
  ADD PRIMARY KEY (`ma_san_pham`);

--
-- Chỉ mục cho bảng `thua_dat`
--
ALTER TABLE `thua_dat`
  ADD PRIMARY KEY (`ma_thua_dat`),
  ADD KEY `fk_thua_dat_nong_trai` (`ma_nong_trai`);

--
-- Chỉ mục cho bảng `vi_blockchain`
--
ALTER TABLE `vi_blockchain`
  ADD PRIMARY KEY (`dia_chi_vi`),
  ADD UNIQUE KEY `uq_vi_blockchain_nguoi_dung` (`ma_nguoi_dung`);

--
-- AUTO_INCREMENT cho các bảng đã đổ
--

--
-- AUTO_INCREMENT cho bảng `blockchain_outbox`
--
ALTER TABLE `blockchain_outbox`
  MODIFY `outbox_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `chi_so_kiem_dinh`
--
ALTER TABLE `chi_so_kiem_dinh`
  MODIFY `ma_chi_so_kd` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT cho bảng `mua_vu_vat_tu`
--
ALTER TABLE `mua_vu_vat_tu`
  MODIFY `ma_su_dung` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT cho bảng `quyen_thao_tac_lo`
--
ALTER TABLE `quyen_thao_tac_lo`
  MODIFY `ma_quyen` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Các ràng buộc cho các bảng đã đổ
--

--
-- Các ràng buộc cho bảng `blockchain_outbox`
--
ALTER TABLE `blockchain_outbox`
  ADD CONSTRAINT `fk_blockchain_outbox_event` FOREIGN KEY (`event_id`) REFERENCES `lich_su_truy_xuat_lo` (`ma_lich_su`) ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `chi_so_kiem_dinh`
--
ALTER TABLE `chi_so_kiem_dinh`
  ADD CONSTRAINT `fk_chi_so_kd_kiem_dinh` FOREIGN KEY (`ma_kiem_dinh`) REFERENCES `kiem_dinh_lo_hang` (`ma_kiem_dinh`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `kiem_dinh_lo_hang`
--
ALTER TABLE `kiem_dinh_lo_hang`
  ADD CONSTRAINT `fk_kd_co_quan` FOREIGN KEY (`ma_co_quan`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_kd_lo_nong_san` FOREIGN KEY (`ma_lo_nong_san`) REFERENCES `lo_nong_san` (`ma_lo_nong_san`) ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `lich_su_truy_xuat_lo`
--
ALTER TABLE `lich_su_truy_xuat_lo`
  ADD CONSTRAINT `fk_lich_su_lo_nong_san` FOREIGN KEY (`ma_lo_nong_san`) REFERENCES `lo_nong_san` (`ma_lo_nong_san`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_lich_su_nguoi_dung` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `lien_ket_nguon_goc_lo`
--
ALTER TABLE `lien_ket_nguon_goc_lo`
  ADD CONSTRAINT `fk_lien_ket_lo_duoc_tao_ra` FOREIGN KEY (`ma_lo_duoc_tao_ra`) REFERENCES `lo_nong_san` (`ma_lo_nong_san`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_lien_ket_lo_nguon` FOREIGN KEY (`ma_lo_nguon`) REFERENCES `lo_nong_san` (`ma_lo_nong_san`) ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `lo_nong_san`
--
ALTER TABLE `lo_nong_san`
  ADD CONSTRAINT `fk_lo_nong_san_mua_vu` FOREIGN KEY (`ma_mua_vu`) REFERENCES `mua_vu` (`ma_mua_vu`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_lo_nong_san_nguoi_quan_ly` FOREIGN KEY (`ma_nguoi_quan_ly`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_lo_nong_san_san_pham` FOREIGN KEY (`ma_san_pham`) REFERENCES `san_pham_nong_san` (`ma_san_pham`) ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `mua_vu`
--
ALTER TABLE `mua_vu`
  ADD CONSTRAINT `fk_mua_vu_nong_trai` FOREIGN KEY (`ma_nong_trai`) REFERENCES `nong_trai` (`ma_nong_trai`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_mua_vu_thua_dat` FOREIGN KEY (`ma_thua_dat`) REFERENCES `thua_dat` (`ma_thua_dat`) ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `mua_vu_vat_tu`
--
ALTER TABLE `mua_vu_vat_tu`
  ADD CONSTRAINT `fk_mua_vu_vat_tu_mua_vu` FOREIGN KEY (`ma_mua_vu`) REFERENCES `mua_vu` (`ma_mua_vu`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_mua_vu_vat_tu_vat_tu` FOREIGN KEY (`ma_vat_tu`) REFERENCES `danh_muc_vat_tu` (`ma_vat_tu`) ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `nong_trai`
--
ALTER TABLE `nong_trai`
  ADD CONSTRAINT `fk_nong_trai_nguoi_dung` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `quyen_thao_tac_lo`
--
ALTER TABLE `quyen_thao_tac_lo`
  ADD CONSTRAINT `fk_quyen_lo_nong_san` FOREIGN KEY (`ma_lo_nong_san`) REFERENCES `lo_nong_san` (`ma_lo_nong_san`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_quyen_nguoi_dung` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `thua_dat`
--
ALTER TABLE `thua_dat`
  ADD CONSTRAINT `fk_thua_dat_nong_trai` FOREIGN KEY (`ma_nong_trai`) REFERENCES `nong_trai` (`ma_nong_trai`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `vi_blockchain`
--
ALTER TABLE `vi_blockchain`
  ADD CONSTRAINT `fk_vi_blockchain_nguoi_dung` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
