-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Máy chủ: 127.0.0.1
-- Thời gian đã tạo: Th10 25, 2026 lúc 02:46 PM
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

--
-- Đang đổ dữ liệu cho bảng `blockchain_outbox`
--

INSERT INTO `blockchain_outbox` (`outbox_id`, `event_id`, `aggregate_type`, `aggregate_id`, `payload`, `status`, `retry_count`, `next_retry_at`, `last_error`, `tx_hash`, `created_at`, `submitted_at`, `confirmed_at`) VALUES
(1, 'EV-LO015-1', 'BATCH', 'LO015', '{\"ma_lo\":\"LO015\",\"loai\":\"HARVEST_CONFIRMED\",\"loai_ma\":1,\"ham\":\"harvest\",\"batch_id\":\"0x7478882c03643e93b9cc9563c3b580569c6550469e6531400cf9c79404bc2077\",\"prev_hash\":\"0x0000000000000000000000000000000000000000000000000000000000000000\",\"event_hash\":\"0x911ace1a79b018aaaf9c1033bbfc4995d1ae915c450216f2e5db3a05ac49bac2\",\"tham_so\":{\"ma_san_pham\":\"SP007\",\"so_luong_gram\":\"1000000\"}}', 'CONFIRMED', 0, NULL, NULL, '0xaa2494ebd770ede6824d17f879b3931abc24587bba240728255fc80fec615db6', '2026-10-25 13:21:54', '2026-10-25 13:22:34', '2026-10-25 13:22:34'),
(2, 'EV-LO015-2', 'TRACE_EVENT', 'LO015', '{\"ma_lo\":\"LO015\",\"loai\":\"SAMPLING_SEALED\",\"loai_ma\":15,\"ham\":\"certify\",\"batch_id\":\"0x7478882c03643e93b9cc9563c3b580569c6550469e6531400cf9c79404bc2077\",\"prev_hash\":\"0x911ace1a79b018aaaf9c1033bbfc4995d1ae915c450216f2e5db3a05ac49bac2\",\"event_hash\":\"0x919eef55b90796a0799d1a15946c2d0419741c4e7e878d7cafc1382d9c69415f\",\"tham_so\":{\"ma_kiem_dinh\":\"KD006\"}}', 'CONFIRMED', 0, NULL, NULL, '0x33eadf7cce830ecd19494ec06351a20397948e43335b65c0717447270c502e93', '2026-10-25 13:47:46', '2026-10-25 13:48:55', '2026-10-25 13:48:55'),
(3, 'EV-LO015-3', 'TRACE_EVENT', 'LO015', '{\"ma_lo\":\"LO015\",\"loai\":\"SAMPLING_CONFIRMED\",\"loai_ma\":17,\"ham\":\"confirmSampling\",\"batch_id\":\"0x7478882c03643e93b9cc9563c3b580569c6550469e6531400cf9c79404bc2077\",\"prev_hash\":\"0x919eef55b90796a0799d1a15946c2d0419741c4e7e878d7cafc1382d9c69415f\",\"event_hash\":\"0xa20b4879280849cd4d827b45594e3ca35efe07109d02f962930cb8f8a49239e9\",\"tham_so\":{\"ma_kiem_dinh\":\"KD006\"}}', 'CONFIRMED', 0, NULL, NULL, '0x379592bf6afffedfb6050c819ad955a51d54daef05addea0af855f815b7faac4', '2026-10-25 14:01:16', '2026-10-25 14:01:47', '2026-10-25 14:01:47'),
(4, 'EV-LO015-4', 'TRACE_EVENT', 'LO015', '{\"ma_lo\":\"LO015\",\"loai\":\"CERTIFICATE_ISSUED\",\"loai_ma\":2,\"ham\":\"certify\",\"batch_id\":\"0x7478882c03643e93b9cc9563c3b580569c6550469e6531400cf9c79404bc2077\",\"prev_hash\":\"0xa20b4879280849cd4d827b45594e3ca35efe07109d02f962930cb8f8a49239e9\",\"event_hash\":\"0xf3e50f745eccec8a301628d840bfa6ea11ef88994f465cfab1b1e389feb4c957\",\"tham_so\":{\"ma_kiem_dinh\":\"KD006\",\"het_han\":1824483599,\"phien_ban_nguong\":\"0x42c7c9489673dab800bfed3490056e1f79b1921072cbc51461e5dc3e518ff893\"}}', 'CONFIRMED', 0, NULL, NULL, '0x8f15bc2206912502779b8996f7d9ed0d10038af87372f38e132dbb9801f1e4c3', '2026-10-25 14:05:51', '2026-10-25 14:06:31', '2026-10-25 14:06:31');

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
(10, 'KD001', 'CO_DINH', 'DU_LUONG_BVTV', 'Dư lượng BVTV (Hóa chất cấm)', '2', 1, '2026-10-12 19:17:48', '2026-10-12 19:17:48'),
(11, 'KD001', 'CO_DINH', 'KIM_LOAI_NANG', 'Kim loại nặng (Chì, Cadimi)', '1', 2, '2026-10-12 19:17:48', '2026-10-12 19:17:48'),
(12, 'KD001', 'CO_DINH', 'VI_SINH', 'Vi sinh (E.coli, Salmonella)', '1', 3, '2026-10-12 19:17:48', '2026-10-12 19:17:48'),
(13, 'KD001', 'CO_DINH', 'NITRATE', 'Dư lượng Nitrate (NO3-)', '1', 4, '2026-10-12 19:17:48', '2026-10-12 19:17:48'),
(92, 'KD-2026-001', 'CO_DINH', 'DU_LUONG_BVTV', 'Dư lượng hoạt chất BVTV cấm', '0', 1, '2026-10-13 00:19:29', '2026-10-13 00:19:29'),
(93, 'KD-2026-001', 'CO_DINH', 'KIM_LOAI_NANG', 'Chì (Pb)', '0', 2, '2026-10-13 00:19:29', '2026-10-13 00:19:29'),
(94, 'KD-2026-001', 'CO_DINH', 'KIM_LOAI_NANG', 'Cadimi (Cd)', '0', 3, '2026-10-13 00:19:29', '2026-10-13 00:19:29'),
(95, 'KD-2026-001', 'CO_DINH', 'VI_SINH', 'Vi khuẩn E.coli', '0', 4, '2026-10-13 00:19:29', '2026-10-13 00:19:29'),
(96, 'KD-2026-001', 'CO_DINH', 'VI_SINH', 'Salmonella', '0', 5, '2026-10-13 00:19:29', '2026-10-13 00:19:29'),
(97, 'KD-2026-001', 'CO_DINH', 'NITRATE', 'Hàm lượng Nitrate (NO3-)', '0', 6, '2026-10-13 00:19:29', '2026-10-13 00:19:29'),
(122, 'KD003', 'CO_DINH', 'DU_LUONG_BVTV', 'Dư lượng hoạt chất BVTV cấm', '0', 1, '2026-10-17 12:25:09', '2026-10-17 12:25:09'),
(123, 'KD003', 'CO_DINH', 'KIM_LOAI_NANG', 'Chì (Pb)', '0', 2, '2026-10-17 12:25:09', '2026-10-17 12:25:09'),
(124, 'KD003', 'CO_DINH', 'KIM_LOAI_NANG', 'Cadimi (Cd)', '0', 3, '2026-10-17 12:25:09', '2026-10-17 12:25:09'),
(125, 'KD003', 'CO_DINH', 'VI_SINH', 'Vi khuẩn E.coli', '0', 4, '2026-10-17 12:25:09', '2026-10-17 12:25:09'),
(126, 'KD003', 'CO_DINH', 'VI_SINH', 'Salmonella', '-5', 5, '2026-10-17 12:25:09', '2026-10-17 12:25:09'),
(127, 'KD003', 'CO_DINH', 'NITRATE', 'Hàm lượng Nitrate (NO3-)', '100', 6, '2026-10-17 12:25:09', '2026-10-17 12:25:09'),
(134, 'DEMOKD-HS02', 'CO_DINH', 'DU_LUONG_BVTV', 'Dư lượng hoạt chất BVTV cấm', '-1', 1, '2026-10-17 13:12:56', '2026-10-17 13:12:56'),
(135, 'DEMOKD-HS02', 'CO_DINH', 'KIM_LOAI_NANG', 'Chì (Pb)', '0', 2, '2026-10-17 13:12:56', '2026-10-17 13:12:56'),
(136, 'DEMOKD-HS02', 'CO_DINH', 'KIM_LOAI_NANG', 'Cadimi (Cd)', '0', 3, '2026-10-17 13:12:56', '2026-10-17 13:12:56'),
(137, 'DEMOKD-HS02', 'CO_DINH', 'VI_SINH', 'Vi khuẩn E.coli', '5', 4, '2026-10-17 13:12:56', '2026-10-17 13:12:56'),
(138, 'DEMOKD-HS02', 'CO_DINH', 'VI_SINH', 'Salmonella', '-1', 5, '2026-10-17 13:12:56', '2026-10-17 13:12:56'),
(139, 'DEMOKD-HS02', 'CO_DINH', 'NITRATE', 'Hàm lượng Nitrate (NO3-)', '100', 6, '2026-10-17 13:12:56', '2026-10-17 13:12:56'),
(146, 'KD004', 'CO_DINH', 'DU_LUONG_BVTV', 'Dư lượng hoạt chất BVTV cấm', '10', 1, '2026-10-17 15:34:44', '2026-10-17 15:34:44'),
(147, 'KD004', 'CO_DINH', 'KIM_LOAI_NANG', 'Chì (Pb)', '0', 2, '2026-10-17 15:34:44', '2026-10-17 15:34:44'),
(148, 'KD004', 'CO_DINH', 'KIM_LOAI_NANG', 'Cadimi (Cd)', '0', 3, '2026-10-17 15:34:44', '2026-10-17 15:34:44'),
(149, 'KD004', 'CO_DINH', 'VI_SINH', 'Vi khuẩn E.coli', '0', 4, '2026-10-17 15:34:44', '2026-10-17 15:34:44'),
(150, 'KD004', 'CO_DINH', 'VI_SINH', 'Salmonella', '0', 5, '2026-10-17 15:34:44', '2026-10-17 15:34:44'),
(151, 'KD004', 'CO_DINH', 'NITRATE', 'Hàm lượng Nitrate (NO3-)', '0', 6, '2026-10-17 15:34:44', '2026-10-17 15:34:44'),
(152, 'KD005', 'CO_DINH', 'DU_LUONG_BVTV', 'Dư lượng hoạt chất BVTV cấm', '0', 1, '2026-10-17 16:45:20', '2026-10-17 16:45:20'),
(153, 'KD005', 'CO_DINH', 'KIM_LOAI_NANG', 'Chì (Pb)', '0', 2, '2026-10-17 16:45:20', '2026-10-17 16:45:20'),
(154, 'KD005', 'CO_DINH', 'KIM_LOAI_NANG', 'Cadimi (Cd)', '0', 3, '2026-10-17 16:45:20', '2026-10-17 16:45:20'),
(155, 'KD005', 'CO_DINH', 'VI_SINH', 'Vi khuẩn E.coli', '0', 4, '2026-10-17 16:45:20', '2026-10-17 16:45:20'),
(156, 'KD005', 'CO_DINH', 'VI_SINH', 'Salmonella', '0', 5, '2026-10-17 16:45:20', '2026-10-17 16:45:20'),
(157, 'KD005', 'CO_DINH', 'NITRATE', 'Hàm lượng Nitrate (NO3-)', '0', 6, '2026-10-17 16:45:20', '2026-10-17 16:45:20'),
(158, 'KD006', 'CO_DINH', 'DU_LUONG_BVTV', 'Dư lượng hoạt chất BVTV cấm', '0', 1, '2026-10-25 13:48:30', '2026-10-25 13:48:30'),
(159, 'KD006', 'CO_DINH', 'KIM_LOAI_NANG', 'Chì (Pb)', '0', 2, '2026-10-25 13:48:30', '2026-10-25 13:48:30'),
(160, 'KD006', 'CO_DINH', 'KIM_LOAI_NANG', 'Cadimi (Cd)', '0.01', 3, '2026-10-25 13:48:30', '2026-10-25 13:48:30'),
(161, 'KD006', 'CO_DINH', 'VI_SINH', 'Vi khuẩn E.coli', '5', 4, '2026-10-25 13:48:30', '2026-10-25 13:48:30'),
(162, 'KD006', 'CO_DINH', 'VI_SINH', 'Salmonella', '-1', 5, '2026-10-25 13:48:30', '2026-10-25 13:48:30'),
(163, 'KD006', 'CO_DINH', 'NITRATE', 'Hàm lượng Nitrate (NO3-)', '100', 6, '2026-10-25 13:48:30', '2026-10-25 13:48:30');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `dai_ly`
--

CREATE TABLE `dai_ly` (
  `ma_dai_ly` varchar(50) NOT NULL,
  `ma_nha_phan_phoi` varchar(50) NOT NULL COMMENT 'Người dùng vai trò DISTRIBUTOR sở hữu đại lý này',
  `ma_nguoi_dung` varchar(50) DEFAULT NULL,
  `ten` varchar(255) NOT NULL,
  `nguoi_lien_he` varchar(150) DEFAULT NULL,
  `so_dien_thoai` varchar(20) DEFAULT NULL,
  `dia_chi` varchar(255) DEFAULT NULL,
  `trang_thai` enum('HOAT_DONG','NGUNG') NOT NULL DEFAULT 'HOAT_DONG',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `dai_ly`
--

INSERT INTO `dai_ly` (`ma_dai_ly`, `ma_nha_phan_phoi`, `ma_nguoi_dung`, `ten`, `nguoi_lien_he`, `so_dien_thoai`, `dia_chi`, `trang_thai`, `created_at`, `updated_at`) VALUES
('DEMODL01', 'DEMONPP01', 'DEMODL01', 'Siêu Thị Demo Mart', 'Trần Thị Demo', '0911000001', '123 Đường Demo, Q.1, TP.HCM', 'HOAT_DONG', '2026-10-15 00:18:12', '2026-10-15 00:18:12'),
('DEMODL02', 'DEMONPP01', 'DEMODL02', 'Cửa Hàng Demo Fresh', 'Lê Văn Demo', '0911000002', '456 Đường Demo, Q.3, TP.HCM', 'HOAT_DONG', '2026-10-15 00:18:12', '2026-10-15 00:18:12');

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
  `ma_kiem_dinh_vien` varchar(50) DEFAULT NULL,
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
  `trang_thai_ho_so` enum('CHO_TIEP_NHAN','DA_HEN_LICH','DA_LAY_MAU','DA_CONG_BO','TU_CHOI','THU_HOI','CHO_LAY_MAU') NOT NULL DEFAULT 'CHO_TIEP_NHAN',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `chu_lo_da_xac_nhan` tinyint(1) NOT NULL DEFAULT 0,
  `ma_phien_ban_nguong` int(10) UNSIGNED DEFAULT NULL,
  `da_ghi_chuoi` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = kết quả đã ký lên chuỗi: không sửa chỉ số nữa, chỉ đính chính'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `kiem_dinh_lo_hang`
--

INSERT INTO `kiem_dinh_lo_hang` (`ma_kiem_dinh`, `ma_ho_so`, `ma_lo_nong_san`, `ma_co_quan`, `tieu_chuan_dang_ky`, `noi_dung_de_nghi`, `ngay_hen_lay_mau`, `gio_hen_lay_mau`, `kiem_dinh_vien`, `ma_kiem_dinh_vien`, `ghi_chu_chuan_bi`, `ma_niem_phong`, `khoi_luong_mau`, `phuong_phap_lay_mau`, `tinh_trang_cam_quan`, `thoi_gian_lay_mau`, `chi_so_xet_nghiem`, `so_chung_nhan`, `ket_luan`, `hieu_luc_tu`, `hieu_luc_den`, `ly_do_thu_hoi`, `ngay_thu_hoi`, `trang_thai_ho_so`, `created_at`, `updated_at`, `chu_lo_da_xac_nhan`, `ma_phien_ban_nguong`, `da_ghi_chuoi`) VALUES
('DEMOKD-HS02', 'DEMO-HS-02', 'DEMOLO02', 'DEMOKD01', 'VIETGAP', 'Đề nghị kiểm định chất lượng trước khi xuất bán.', '2026-10-17', '13:09:00', 'ThS. Lê Hoàng Yến (Chuyên viên vi sinh)', 'KDV004', NULL, 'QR-Seal-0000000012', '10', 'Lấy chéo góc 5 điểm ngẫu nhiên trên liếp vườn', 'bjj', '2026-10-17 13:12:21', NULL, 'CN-2026-000005', 'PASSED', '2026-10-17', '2027-10-17', NULL, NULL, 'DA_CONG_BO', '2026-10-15 00:18:12', '2026-10-17 15:36:36', 0, NULL, 0),
('DEMOKD-HS03', 'DEMO-HS-03', 'DEMOLO03', 'DEMOKD01', 'VIETGAP', NULL, NULL, NULL, 'Nguyễn Văn Kiểm (Demo)', NULL, NULL, NULL, NULL, NULL, NULL, '2026-10-06 08:30:00', NULL, 'DEMO-CERT-03', 'PASSED', '2026-10-07', '2027-10-07', NULL, NULL, 'DA_CONG_BO', '2026-10-15 00:18:12', '2026-10-15 00:18:12', 0, NULL, 0),
('DEMOKD-HS04', 'DEMO-HS-04', 'DEMOLO04', 'DEMOKD01', 'VIETGAP', NULL, NULL, NULL, 'Nguyễn Văn Kiểm (Demo)', NULL, NULL, NULL, NULL, NULL, NULL, '2026-10-03 09:00:00', NULL, NULL, 'FAILED', NULL, NULL, NULL, NULL, 'DA_CONG_BO', '2026-10-15 00:18:12', '2026-10-15 00:18:12', 0, NULL, 0),
('KD-2026-001', 'HS-KD-9041', 'LH-8824', 'CQKD001', 'VIETGAP', 'Đề nghị kiểm tra dư lượng thuốc BVTV và kim loại nặng để phục vụ đóng gói phân phối siêu thị.', '2026-10-12', '19:12:00', 'ThS. Lê Hoàng Yến (Chuyên viên vi sinh)', 'KDV002', NULL, 'QR-Seal-0000000009', '12', 'Lấy ngẫu nhiên trên khay chứa tại kho đệm', '12', '2026-10-12 17:45:15', NULL, NULL, 'PASSED', NULL, NULL, NULL, NULL, 'DA_LAY_MAU', '2026-10-05 08:30:00', '2026-10-13 00:19:29', 0, NULL, 0),
('KD-2026-002', 'HS-KD-9042', 'LH-8825', 'CQKD001', 'GLOBALGAP', 'Lô xoài xuất khẩu đợt 1, đề nghị kiểm tra dư lượng hóa chất cấm theo tiêu chuẩn GlobalGAP.', '2026-10-06', '17:34:00', 'ThS. Lê Hoàng Yến (Chuyên viên vi sinh)', 'KDV002', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CN-2026-000001', 'PASSED', '2026-10-11', '2027-10-11', NULL, NULL, 'DA_CONG_BO', '2026-10-06 09:15:00', '2026-10-11 22:41:26', 0, NULL, 0),
('KD-2026-003', 'HS-KD-9043', 'LH-8821', 'CQKD001', 'ORGANIC', 'Đề nghị giám định vi sinh và cấp tem chứng nhận Organic cho nông trại hữu cơ.', '2026-10-12', '19:14:00', 'ThS. Lê Hoàng Yến (Chuyên viên vi sinh)', 'KDV002', NULL, 'QR-Seal-0000000010', '12', 'Lấy ngẫu nhiên trên khay chứa tại kho đệm', '12', NULL, NULL, NULL, 'PENDING', NULL, NULL, '', NULL, 'CHO_LAY_MAU', '2026-10-07 14:00:00', '2026-10-12 19:20:49', 0, NULL, 0),
('KD001', 'HS-KD-9044', 'LO001', 'CQKD001', 'VIETGAP', 'kiểm định dư lượng thuốc', '2026-10-12', '19:17:00', 'ThS. Lê Hoàng Yến (Chuyên viên vi sinh)', 'KDV002', NULL, 'QR-Seal-0000000003', '10 quả', 'Lấy chéo góc 5 điểm ngẫu nhiên trên liếp vườn', 'đạt yêu cầu', NULL, NULL, 'CN-2026-000003', 'PASSED', '2026-10-12', '2027-10-12', NULL, NULL, 'DA_CONG_BO', '2026-10-12 19:09:27', '2026-10-12 19:25:52', 0, NULL, 0),
('KD002', 'HS-KD-9045', 'LO003', 'CQKD001', 'VIETGAP', 'yêu cầu kiểm định các  chất trong sản phẩm lúa', '2026-10-14', '05:20:00', 'KS. Trần Minh Tuấn (Phòng Giám định Trồng trọt)', 'KDV001', NULL, 'QR-Seal-0000000001', 'test', 'Lấy ngẫu nhiên trên khay chứa tại kho đệm', '123', NULL, NULL, 'CN-2026-000002', 'PASSED', '2026-10-11', '2027-10-11', NULL, NULL, 'DA_CONG_BO', '2026-10-11 19:31:41', '2026-10-11 23:33:53', 0, NULL, 0),
('KD003', 'HS-KD-9046', 'LO007', 'DEMOKD01', 'VIETGAP', 'kiểm định dư lượng phân bón', '2026-10-17', '12:05:00', 'KS. Trần Minh Tuấn (Phòng Giám định Trồng trọt)', 'KDV003', NULL, 'QR-Seal-0000000011', '10 quả', 'Lấy chéo góc 5 điểm ngẫu nhiên trên liếp vườn', 'đạt yêu cầu', '2026-10-17 12:07:10', NULL, 'CN-2026-000004', 'PASSED', '2026-10-17', '2027-10-17', NULL, NULL, 'DA_CONG_BO', '2026-10-17 11:55:22', '2026-10-17 12:25:24', 0, NULL, 0),
('KD004', 'HS-KD-9047', 'LO010', 'DEMOKD01', 'VIETGAP', NULL, '2026-10-17', '08:30:00', 'ThS. Lê Hoàng Yến (Chuyên viên vi sinh)', 'KDV004', NULL, 'QR-Seal-0000000013', '2kg', 'Lấy ngẫu nhiên trên khay chứa tại kho đệm', 'tốt', '2026-10-17 15:33:06', NULL, NULL, 'FAILED', NULL, NULL, NULL, NULL, 'DA_CONG_BO', '2026-10-17 15:30:36', '2026-10-17 15:35:21', 0, NULL, 0),
('KD005', 'HS-KD-9048', 'LO014', 'DEMOKD01', 'GLOBALGAP', NULL, '2026-10-17', '07:46:00', 'KS. Trần Minh Tuấn (Phòng Giám định Trồng trọt)', 'KDV003', NULL, 'QR-Seal-0000000014', '1kg', 'Lấy ngẫu nhiên trên khay chứa tại kho đệm', 'tốt', '2026-10-17 16:45:20', NULL, 'CN-2026-000006', 'PASSED', '2026-10-17', '2027-10-17', NULL, NULL, 'DA_CONG_BO', '2026-10-17 16:44:14', '2026-10-17 16:45:27', 0, NULL, 0),
('KD006', 'HS-KD-9049', 'LO015', 'DEMOKD01', 'VIETGAP', NULL, '2026-10-25', '13:47:00', 'ThS. Lê Hoàng Yến (Chuyên viên vi sinh)', 'KDV004', NULL, 'QR-Seal-0000000015', '20', 'Lấy chéo góc 5 điểm ngẫu nhiên trên liếp vườn', 'tốt', '2026-10-25 13:47:46', NULL, 'CN-2026-000007', 'PASSED', '2026-10-25', '2027-10-25', NULL, NULL, 'DA_CONG_BO', '2026-10-25 13:46:51', '2026-10-25 14:05:51', 1, 1, 1);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `kiem_dinh_vien`
--

CREATE TABLE `kiem_dinh_vien` (
  `ma_kiem_dinh_vien` varchar(50) NOT NULL,
  `ma_co_quan` varchar(50) NOT NULL,
  `ho_ten` varchar(150) NOT NULL,
  `chuc_vu` varchar(150) DEFAULT NULL,
  `so_dien_thoai` varchar(20) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `trang_thai` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `kiem_dinh_vien`
--

INSERT INTO `kiem_dinh_vien` (`ma_kiem_dinh_vien`, `ma_co_quan`, `ho_ten`, `chuc_vu`, `so_dien_thoai`, `email`, `trang_thai`, `created_at`, `updated_at`) VALUES
('KDV001', 'CQKD001', 'KS. Trần Minh Tuấn', 'Phòng Giám định Trồng trọt', NULL, NULL, 1, '2026-10-17 12:17:56', '2026-10-17 12:17:56'),
('KDV002', 'CQKD001', 'ThS. Lê Hoàng Yến', 'Chuyên viên vi sinh', NULL, NULL, 1, '2026-10-17 12:17:56', '2026-10-17 12:17:56'),
('KDV003', 'DEMOKD01', 'KS. Trần Minh Tuấn', 'Phòng Giám định Trồng trọt', NULL, NULL, 1, '2026-10-17 12:17:56', '2026-10-17 12:17:56'),
('KDV004', 'DEMOKD01', 'ThS. Lê Hoàng Yến', 'Chuyên viên vi sinh', NULL, NULL, 1, '2026-10-17 12:17:56', '2026-10-17 12:17:56');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `lenh_van_chuyen`
--

CREATE TABLE `lenh_van_chuyen` (
  `ma_van_don` varchar(64) NOT NULL,
  `ma_lo_nong_san` varchar(64) NOT NULL,
  `ma_nguoi_gui` varchar(50) NOT NULL COMMENT 'Nông dân tạo lệnh',
  `ma_don_vi_van_chuyen` varchar(50) NOT NULL COMMENT 'Người dùng vai trò TRANSPORTER',
  `ma_ben_nhan` varchar(50) DEFAULT NULL COMMENT 'Người dùng vai trò PROCESSOR/DISTRIBUTOR, có thể để trống nếu giao tới nơi chưa có tài khoản',
  `dia_chi_giao_hang` varchar(255) DEFAULT NULL COMMENT 'Địa chỉ/kho nhận hàng dạng text khi chưa có tài khoản bên nhận',
  `khoi_luong` decimal(18,3) NOT NULL COMMENT 'Khối lượng lô tại thời điểm tạo lệnh',
  `khoi_luong_nhan` decimal(18,3) DEFAULT NULL,
  `don_vi_tinh` varchar(30) NOT NULL,
  `thoi_gian_xuat` datetime NOT NULL COMMENT 'Thời gian xuất hàng (dự kiến, đơn vị vận chuyển có thể cập nhật khi lấy hàng)',
  `ten_tai_xe` varchar(150) DEFAULT NULL COMMENT 'Đơn vị vận chuyển điền khi phân công',
  `bien_so_xe` varchar(30) DEFAULT NULL,
  `ghi_chu` varchar(500) DEFAULT NULL,
  `trang_thai` enum('CHO_CHAP_NHAN','CHO_LAY_HANG','DANG_VAN_CHUYEN','CHO_TIEP_NHAN','HOAN_THANH','TU_CHOI','DANG_TRA_HANG','DA_TRA_LAI','DA_HUY') NOT NULL DEFAULT 'CHO_CHAP_NHAN',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `lenh_van_chuyen`
--

INSERT INTO `lenh_van_chuyen` (`ma_van_don`, `ma_lo_nong_san`, `ma_nguoi_gui`, `ma_don_vi_van_chuyen`, `ma_ben_nhan`, `dia_chi_giao_hang`, `khoi_luong`, `khoi_luong_nhan`, `don_vi_tinh`, `thoi_gian_xuat`, `ten_tai_xe`, `bien_so_xe`, `ghi_chu`, `trang_thai`, `created_at`, `updated_at`) VALUES
('DEMOVD03', 'DEMOLO03', 'DEMOND01', 'DEMOVC01', 'DEMOSC01', NULL, 1200.000, NULL, 'kg', '2026-10-13 08:00:00', 'Tài Xế Demo 1', '51C-00001', NULL, 'CHO_CHAP_NHAN', '2026-10-15 00:18:12', '2026-10-15 00:18:12'),
('DEMOVD05', 'DEMOLO05', 'DEMOND01', 'DEMOVC01', 'DEMOSC01', NULL, 3000.000, NULL, 'kg', '2026-10-13 06:00:00', 'Tài Xế Demo 2', '51C-00002', NULL, 'DANG_VAN_CHUYEN', '2026-10-15 00:18:12', '2026-10-15 00:18:12'),
('DEMOVD06', 'DEMOLO06', 'DEMOND01', 'DEMOVC01', 'DEMOSC01', NULL, 2500.000, NULL, 'kg', '2026-09-29 08:00:00', 'Tài Xế Demo 3', '51C-00003', NULL, 'HOAN_THANH', '2026-10-15 00:18:12', '2026-10-15 00:18:12'),
('DEMOVD07B', 'DEMOLO07B', 'DEMOSC01', 'DEMOVC01', 'DEMONPP01', NULL, 3500.000, NULL, 'kg', '2026-09-28 07:00:00', 'Tài Xế Demo 4', '51C-00004', NULL, 'HOAN_THANH', '2026-10-15 00:18:12', '2026-10-15 00:18:12'),
('DEMOVD08B', 'DEMOLO08B', 'DEMOSC01', 'DEMOVC01', 'DEMONPP01', NULL, 1800.000, NULL, 'kg', '2026-09-27 07:00:00', 'Tài Xế Demo 6', '51C-00006', NULL, 'HOAN_THANH', '2026-10-15 00:18:12', '2026-10-15 00:18:12'),
('VD-LOG-1001', 'LH-8825', 'ND001', 'VC001', 'SC001', NULL, 8500.000, NULL, 'kg', '2026-10-18 02:01:00', NULL, NULL, NULL, 'HOAN_THANH', '2026-10-11 14:02:10', '2026-10-14 23:39:59'),
('VD-LOG-1002', 'LO001', 'ND001', 'VC001', 'SC001', NULL, 1000.000, NULL, 'kg', '2026-10-12 19:35:00', 'Nguyễn Văn A', '65C-12345', NULL, 'HOAN_THANH', '2026-10-12 19:32:20', '2026-10-12 19:35:16'),
('VD-LOG-1003', 'LO002', 'SC001', 'VC001', NULL, 'Kho trung tâm vận chuyển metro', 1000.000, NULL, 'kg', '2026-10-12 19:38:00', 'Nguyễn Văn A', '65C-12345', NULL, 'CHO_TIEP_NHAN', '2026-10-12 19:38:00', '2026-10-12 19:38:31'),
('VD-LOG-1004', 'LO007', 'DEMOND01', 'DEMOVC01', 'DEMOSC01', NULL, 1000.000, NULL, 'kg', '2026-10-17 12:30:00', 'Nguyễn Văn A', '65C12345', NULL, 'HOAN_THANH', '2026-10-17 12:26:53', '2026-10-17 12:29:32'),
('VD-LOG-1005', 'DEMOLO02', 'DEMOND01', 'DEMOVC01', 'DEMOSC01', NULL, 800.000, NULL, 'kg', '2026-10-17 15:36:00', 'Nguyễn Văn A', 'ABC', NULL, 'HOAN_THANH', '2026-10-17 15:36:54', '2026-10-17 15:38:28'),
('VD-LOG-1006', 'LO011', 'DEMOSC01', 'DEMOVC01', 'DEMONPP01', 'TP.HCM', 800.000, NULL, 'kg', '2026-10-17 15:41:08', 'Nguyễn Văn A', '65c', NULL, 'HOAN_THANH', '2026-10-17 15:41:08', '2026-10-17 15:43:14'),
('VD-LOG-1007', 'LO014', 'DEMOND01', 'DEMOVC01', 'DEMOSC01', NULL, 1000.000, NULL, 'kg', '2026-10-17 16:45:00', NULL, NULL, NULL, 'CHO_CHAP_NHAN', '2026-10-17 16:47:23', '2026-10-17 16:47:23');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `lich_su_truy_xuat_lo`
--

CREATE TABLE `lich_su_truy_xuat_lo` (
  `ma_lich_su` varchar(64) NOT NULL,
  `ma_lo_nong_san` varchar(64) NOT NULL,
  `ma_nguoi_dung` varchar(50) NOT NULL,
  `so_thu_tu_su_kien` bigint(20) UNSIGNED NOT NULL,
  `loai_hoat_dong` enum('HARVEST_CONFIRMED','PROCESSING_DONE','PACKAGING_DONE','PICKUP_CONFIRMED','DELIVERY_CONFIRMED','STOCK_IN_CONFIRMED','COMPLETE_CONFIRMED','SAMPLING_SEALED','CERTIFICATE_ISSUED','CERTIFICATE_REVOKED','CERTIFICATE_FAILED','TRANSPORT_ORDERED','HANDOVER_REJECTED','BATCH_RELATION','DISPATCHED','DELIVERED_TO_AGENT','SAMPLING_CONFIRMED','RETURN_SHIPPED','RETURN_RECEIVED','CORRECTION') NOT NULL,
  `loai_doi_tuong` enum('LO','KIEM_DINH','VAN_DON') NOT NULL DEFAULT 'LO',
  `ma_doi_tuong` varchar(64) DEFAULT NULL,
  `thoi_diem_xay_ra` datetime(3) NOT NULL,
  `du_lieu_chi_tiet` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`du_lieu_chi_tiet`)),
  `ma_bam_du_lieu` char(66) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `ma_bam_su_kien_truoc` char(66) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `ma_bam_su_kien_hien_tai` char(66) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `ma_giao_dich_blockchain` char(66) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `so_block` bigint(20) UNSIGNED DEFAULT NULL,
  `dia_chi_vi_ky` char(42) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `vai_tro_ky` enum('NONG_DAN','CHU_LO','KIEM_DINH','BEN_GUI','VAN_CHUYEN','BEN_NHAN','SO_CHE','PHAN_PHOI','DAI_LY') DEFAULT NULL,
  `blockchain_sync_status` enum('QUEUED','SUBMITTED','CONFIRMED','FAILED') NOT NULL DEFAULT 'QUEUED',
  `integrity_status` enum('NOT_CHECKED','VERIFIED','MISMATCH','INCOMPLETE','BROKEN_CHAIN') NOT NULL DEFAULT 'NOT_CHECKED',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `ma_su_kien_goc` varchar(64) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `lich_su_truy_xuat_lo`
--

INSERT INTO `lich_su_truy_xuat_lo` (`ma_lich_su`, `ma_lo_nong_san`, `ma_nguoi_dung`, `so_thu_tu_su_kien`, `loai_hoat_dong`, `loai_doi_tuong`, `ma_doi_tuong`, `thoi_diem_xay_ra`, `du_lieu_chi_tiet`, `ma_bam_du_lieu`, `ma_bam_su_kien_truoc`, `ma_bam_su_kien_hien_tai`, `ma_giao_dich_blockchain`, `so_block`, `dia_chi_vi_ky`, `vai_tro_ky`, `blockchain_sync_status`, `integrity_status`, `created_at`, `ma_su_kien_goc`) VALUES
('EV-LO015-1', 'LO015', 'DEMOND01', 1, 'HARVEST_CONFIRMED', 'LO', NULL, '2026-10-25 06:21:54.451', '{\"du_lieu\":{\"ban_chup_mua_vu\":{\"mua_vu\":{\"giong_cay\":\"Sầu riêng thái\",\"loai_cay_trong\":\"Mùa vụ Sầu Riêng Thái\",\"ma_mua_vu\":\"MV009\",\"ma_nong_trai\":\"NT009\",\"ma_thua_dat\":\"TD007\",\"ngay_gieo_trong\":\"2026-10-23\"},\"vat_tu\":[]},\"don_vi_tinh\":\"kg\",\"hash_ban_chup\":\"0xa47936560d2b076d1d6cb02372257361c68a90210825ebab05337d173591cbea\",\"ma_mua_vu\":\"MV009\",\"ma_san_pham\":\"SP007\",\"ngay_thu_hoach\":\"2026-10-25\",\"so_luong\":\"1000.000\"},\"loai\":\"HARVEST_CONFIRMED\",\"ma_lo\":\"LO015\",\"nguoi_ky\":\"DEMOND01\",\"salt\":\"8d6c3ae464640841297d5742f63958f0\",\"stt\":1,\"thoi_diem\":\"2026-10-25T06:21:54.451Z\",\"v\":1}', '0xc42cff91e32d87e566128fbf2ec0719f1339e2e339f03867436866f5bc4581b1', '0x0000000000000000000000000000000000000000000000000000000000000000', '0x911ace1a79b018aaaf9c1033bbfc4995d1ae915c450216f2e5db3a05ac49bac2', '0xaa2494ebd770ede6824d17f879b3931abc24587bba240728255fc80fec615db6', NULL, '0xa28815779e90bd5b39a35c12cb841957818d137b', NULL, 'CONFIRMED', 'NOT_CHECKED', '2026-10-25 13:21:54', NULL),
('EV-LO015-2', 'LO015', 'DEMOKD01', 2, 'SAMPLING_SEALED', 'LO', NULL, '2026-10-25 06:47:46.757', '{\"du_lieu\":{\"khoi_luong_mau\":\"20\",\"kiem_dinh_vien\":\"ThS. Lê Hoàng Yến (Chuyên viên vi sinh)\",\"ma_ho_so\":\"HS-KD-9049\",\"ma_kiem_dinh\":\"KD006\",\"ma_niem_phong\":\"QR-Seal-0000000015\",\"phuong_phap_lay_mau\":\"Lấy chéo góc 5 điểm ngẫu nhiên trên liếp vườn\",\"thoi_gian_lay_mau\":\"2026-10-25 13:47:46\",\"tieu_chuan_dang_ky\":\"VIETGAP\",\"tinh_trang_cam_quan\":\"tốt\"},\"loai\":\"SAMPLING_SEALED\",\"ma_lo\":\"LO015\",\"nguoi_ky\":\"DEMOKD01\",\"salt\":\"e67c05cda188cf681c1b3b60fcd1b554\",\"stt\":2,\"thoi_diem\":\"2026-10-25T06:47:46.757Z\",\"v\":1}', '0x361d0ae03a6c31b8a2cf329e1314bbf395d3b8380ea6340a650e57b9f70a9af0', '0x911ace1a79b018aaaf9c1033bbfc4995d1ae915c450216f2e5db3a05ac49bac2', '0x919eef55b90796a0799d1a15946c2d0419741c4e7e878d7cafc1382d9c69415f', '0x33eadf7cce830ecd19494ec06351a20397948e43335b65c0717447270c502e93', NULL, '0x4a316754f289fa75dd242360372730b61d1d169f', NULL, 'CONFIRMED', 'NOT_CHECKED', '2026-10-25 13:47:46', NULL),
('EV-LO015-3', 'LO015', 'DEMOND01', 3, 'SAMPLING_CONFIRMED', 'LO', NULL, '2026-10-25 07:01:16.681', '{\"du_lieu\":{\"khoi_luong_mau\":\"20\",\"kiem_dinh_vien\":\"ThS. Lê Hoàng Yến (Chuyên viên vi sinh)\",\"ma_ho_so\":\"HS-KD-9049\",\"ma_kiem_dinh\":\"KD006\",\"ma_niem_phong\":\"QR-Seal-0000000015\",\"phuong_phap_lay_mau\":\"Lấy chéo góc 5 điểm ngẫu nhiên trên liếp vườn\",\"thoi_gian_lay_mau\":\"2026-10-25 13:47:46\",\"tieu_chuan_dang_ky\":\"VIETGAP\",\"tinh_trang_cam_quan\":\"tốt\"},\"loai\":\"SAMPLING_CONFIRMED\",\"ma_lo\":\"LO015\",\"nguoi_ky\":\"DEMOND01\",\"salt\":\"71cfc5aa2f4417fa7a72489631cc58a1\",\"stt\":3,\"thoi_diem\":\"2026-10-25T07:01:16.681Z\",\"v\":1}', '0x5c40ae96a97d4ee8aad8bc9153ab858276d52f122d67bd0d02f5b944274ed55c', '0x919eef55b90796a0799d1a15946c2d0419741c4e7e878d7cafc1382d9c69415f', '0xa20b4879280849cd4d827b45594e3ca35efe07109d02f962930cb8f8a49239e9', '0x379592bf6afffedfb6050c819ad955a51d54daef05addea0af855f815b7faac4', NULL, '0xa28815779e90bd5b39a35c12cb841957818d137b', NULL, 'CONFIRMED', 'NOT_CHECKED', '2026-10-25 14:01:16', NULL),
('EV-LO015-4', 'LO015', 'DEMOKD01', 4, 'CERTIFICATE_ISSUED', 'LO', NULL, '2026-10-25 07:05:51.365', '{\"du_lieu\":{\"chi_so\":[{\"gia_tri\":\"0\",\"loai_chi_so\":\"CO_DINH\",\"ma_chi_so\":\"DU_LUONG_BVTV\",\"ten_chi_so\":\"Dư lượng hoạt chất BVTV cấm\"},{\"gia_tri\":\"0\",\"loai_chi_so\":\"CO_DINH\",\"ma_chi_so\":\"KIM_LOAI_NANG\",\"ten_chi_so\":\"Chì (Pb)\"},{\"gia_tri\":\"0.01\",\"loai_chi_so\":\"CO_DINH\",\"ma_chi_so\":\"KIM_LOAI_NANG\",\"ten_chi_so\":\"Cadimi (Cd)\"},{\"gia_tri\":\"5\",\"loai_chi_so\":\"CO_DINH\",\"ma_chi_so\":\"VI_SINH\",\"ten_chi_so\":\"Vi khuẩn E.coli\"},{\"gia_tri\":\"-1\",\"loai_chi_so\":\"CO_DINH\",\"ma_chi_so\":\"VI_SINH\",\"ten_chi_so\":\"Salmonella\"},{\"gia_tri\":\"100\",\"loai_chi_so\":\"CO_DINH\",\"ma_chi_so\":\"NITRATE\",\"ten_chi_so\":\"Hàm lượng Nitrate (NO3-)\"}],\"hash_chi_so\":\"0x35737fbba850aaf4ba0b49b6f6d18b3f7dc9ca3d1cb904d91168d9494c88697e\",\"hieu_luc_den\":\"2027-10-25\",\"hieu_luc_tu\":\"2026-10-25\",\"ket_luan\":\"PASSED\",\"khoi_luong_mau\":\"20\",\"kiem_dinh_vien\":\"ThS. Lê Hoàng Yến (Chuyên viên vi sinh)\",\"ly_do_thu_hoi\":null,\"ma_ho_so\":\"HS-KD-9049\",\"ma_kiem_dinh\":\"KD006\",\"ma_niem_phong\":\"QR-Seal-0000000015\",\"phien_ban_nguong\":\"0x42c7c9489673dab800bfed3490056e1f79b1921072cbc51461e5dc3e518ff893\",\"phuong_phap_lay_mau\":\"Lấy chéo góc 5 điểm ngẫu nhiên trên liếp vườn\",\"so_chung_nhan\":\"CN-2026-000007\",\"thoi_gian_lay_mau\":\"2026-10-25 13:47:46\",\"tieu_chuan_dang_ky\":\"VIETGAP\",\"tinh_trang_cam_quan\":\"tốt\"},\"loai\":\"CERTIFICATE_ISSUED\",\"ma_lo\":\"LO015\",\"nguoi_ky\":\"DEMOKD01\",\"salt\":\"368ba699f488f1fe43fdfe12b701ccdf\",\"stt\":4,\"thoi_diem\":\"2026-10-25T07:05:51.365Z\",\"v\":1}', '0x0c49e6743d6699e4ee48fd8f7050ee0d526d64dc7f61fe13fa8ac60d0266f13e', '0xa20b4879280849cd4d827b45594e3ca35efe07109d02f962930cb8f8a49239e9', '0xf3e50f745eccec8a301628d840bfa6ea11ef88994f465cfab1b1e389feb4c957', '0x8f15bc2206912502779b8996f7d9ed0d10038af87372f38e132dbb9801f1e4c3', NULL, '0x4a316754f289fa75dd242360372730b61d1d169f', NULL, 'CONFIRMED', 'NOT_CHECKED', '2026-10-25 14:05:51', NULL);

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

--
-- Đang đổ dữ liệu cho bảng `lien_ket_nguon_goc_lo`
--

INSERT INTO `lien_ket_nguon_goc_lo` (`ma_lien_ket`, `relation_group_id`, `ma_lo_nguon`, `ma_lo_duoc_tao_ra`, `loai_lien_ket`, `so_luong_tham_gia`, `don_vi_tinh`, `thoi_diem_tao_lien_ket`) VALUES
('DEMOLK07', 'DEMOREL07', 'DEMOLO07', 'DEMOLO07B', 'TRANSFORM', 3500.000, 'kg', '2026-10-15 00:18:12'),
('DEMOLK08', 'DEMOREL08', 'DEMOLO08', 'DEMOLO08B', 'TRANSFORM', 1800.000, 'kg', '2026-10-15 00:18:12'),
('DEMOLK09', 'DEMOREL09', 'DEMOLO09', 'DEMOLO09B', 'TRANSFORM', 1000.000, 'kg', '2026-10-15 00:24:28'),
('LK001', 'REL001', 'LO001', 'LO002', 'TRANSFORM', 1000.000, 'kg', '2026-10-12 19:35:53'),
('LK002', 'REL002', 'LH-8825', 'LO004', 'TRANSFORM', 900.000, 'kg', '2026-10-14 23:40:20'),
('LK003', 'REL003', 'DEMOLO07', 'LO005', 'TRANSFORM', 500.000, 'kg', '2026-10-15 07:27:53'),
('LK004', 'REL004', 'DEMOLO06', 'LO006', 'TRANSFORM', 2300.000, 'kg', '2026-10-15 07:28:37'),
('LK005', 'REL005', 'LO007', 'LO008', 'TRANSFORM', 1000.000, 'kg', '2026-10-17 12:30:34'),
('LK006', 'REL006', 'DEMOLO06', 'LO009', 'MERGE', 200.000, 'kg', '2026-10-17 12:33:51'),
('LK007', 'REL006', 'LO006', 'LO009', 'MERGE', 2300.000, 'kg', '2026-10-17 12:33:51'),
('LK008', 'REL007', 'DEMOLO02', 'LO011', 'TRANSFORM', 800.000, 'kg', '2026-10-17 15:39:33'),
('LK009', 'REL008', 'LO011', 'LO012', 'SPLIT', 400.000, 'kg', '2026-10-17 15:42:07'),
('LK010', 'REL008', 'LO011', 'LO013', 'SPLIT', 400.000, 'kg', '2026-10-17 15:42:07');

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
  `ghi_chu` varchar(255) DEFAULT NULL,
  `vi_tri_luu_kho` varchar(150) DEFAULT NULL,
  `han_luu_kho` date DEFAULT NULL,
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

INSERT INTO `lo_nong_san` (`ma_lo_nong_san`, `ma_mua_vu`, `ma_san_pham`, `ma_nguoi_quan_ly`, `ngay_thu_hoach`, `so_luong_hien_tai`, `ghi_chu`, `vi_tri_luu_kho`, `han_luu_kho`, `don_vi_tinh`, `giai_doan_hien_tai`, `tinh_trang_su_dung`, `latest_event_sequence`, `latest_event_hash`, `blockchain_sync_status`, `integrity_status`, `created_at`, `updated_at`) VALUES
('DEMOLO01', 'DEMOMV01', 'DEMOSP01', 'DEMOND01', '2026-10-12', 500.000, NULL, NULL, NULL, 'kg', 'CREATED', 'ACTIVE', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-10-15 00:18:12', '2026-10-15 00:18:12'),
('DEMOLO02', 'DEMOMV01', 'DEMOSP01', 'DEMOSC01', '2026-10-08', 0.000, NULL, NULL, NULL, 'kg', 'RECEIVED', 'CONSUMED_BY_TRANSFORM', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-10-15 00:18:12', '2026-10-17 15:39:33'),
('DEMOLO03', 'DEMOMV01', 'DEMOSP01', 'DEMOND01', '2026-10-05', 1200.000, NULL, NULL, NULL, 'kg', 'HARVESTED', 'ACTIVE', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-10-15 00:18:12', '2026-10-15 00:18:12'),
('DEMOLO04', 'DEMOMV02', 'DEMOSP01', 'DEMOND01', '2026-10-02', 600.000, NULL, NULL, NULL, 'kg', 'HARVESTED', 'ACTIVE', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-10-15 00:18:12', '2026-10-15 00:18:12'),
('DEMOLO05', 'DEMOMV02', 'DEMOSP01', 'DEMOND01', '2026-10-10', 3000.000, NULL, NULL, NULL, 'kg', 'IN_TRANSIT', 'ACTIVE', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-10-15 00:18:12', '2026-10-15 00:18:12'),
('DEMOLO06', 'DEMOMV01', 'DEMOSP01', 'DEMOSC01', '2026-09-28', 0.000, NULL, NULL, NULL, 'kg', 'RECEIVED', 'CONSUMED_BY_MERGE', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-10-15 00:18:12', '2026-10-17 12:33:51'),
('DEMOLO07', 'DEMOMV01', 'DEMOSP01', 'DEMOSC01', '2026-09-20', 0.000, NULL, NULL, NULL, 'kg', 'RECEIVED', 'CONSUMED_BY_TRANSFORM', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-10-15 00:18:12', '2026-10-15 07:27:53'),
('DEMOLO07B', 'DEMOMV01', 'DEMOSP01', 'DEMONPP01', '2026-09-20', 3500.000, NULL, NULL, NULL, 'kg', 'DISTRIBUTED', 'ACTIVE', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-10-15 00:18:12', '2026-10-15 00:18:12'),
('DEMOLO08', 'DEMOMV02', 'DEMOSP01', 'DEMOSC01', '2026-09-22', 0.000, NULL, NULL, NULL, 'kg', 'RECEIVED', 'CONSUMED_BY_TRANSFORM', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-10-15 00:18:12', '2026-10-15 00:18:12'),
('DEMOLO08B', 'DEMOMV02', 'DEMOSP01', 'DEMONPP01', '2026-09-22', 1300.000, NULL, 'Kho Mát B - Pallet 05', '2026-11-20', 'kg', 'RECEIVED', 'ACTIVE', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-10-15 00:18:12', '2026-10-17 15:43:44'),
('DEMOLO09', NULL, 'DEMOSP01', 'DEMOSC01', '2026-10-01', 0.000, NULL, NULL, NULL, 'kg', 'RECEIVED', 'CONSUMED_BY_TRANSFORM', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-10-15 00:24:28', '2026-10-15 00:24:28'),
('DEMOLO09B', NULL, 'DEMOSP01', 'DEMOSC01', '2026-10-01', 1000.000, NULL, NULL, NULL, 'kg', 'PACKAGED', 'ACTIVE', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-10-15 00:24:28', '2026-10-15 00:24:28'),
('LH-8821', 'MV002', 'SP002', 'ND001', '2026-09-28', 3500.000, NULL, NULL, NULL, 'kg', 'HARVESTED', 'ACTIVE', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-10-07 23:28:35', '2026-10-07 23:28:35'),
('LH-8824', 'MV002', 'SP002', 'ND001', '2026-10-01', 5000.000, NULL, NULL, NULL, 'kg', 'HARVESTED', 'ACTIVE', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-10-07 23:28:35', '2026-10-07 23:28:35'),
('LH-8825', 'MV001', 'SP001', 'SC001', '2026-10-05', 8100.000, NULL, NULL, NULL, 'kg', 'RECEIVED', 'ACTIVE', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-10-07 23:28:35', '2026-10-14 23:40:20'),
('LO001', 'MV002', 'SP002', 'SC001', '2026-10-12', 0.000, NULL, NULL, NULL, 'kg', 'RECEIVED', 'CONSUMED_BY_TRANSFORM', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-10-12 19:08:43', '2026-10-12 19:35:53'),
('LO002', 'MV002', 'SP002', 'SC001', NULL, 1000.000, NULL, NULL, NULL, 'kg', 'PACKAGED', 'ACTIVE', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-10-12 19:35:53', '2026-10-12 19:37:21'),
('LO003', 'MV004', 'SP003', 'ND001', '2027-02-11', 1000.000, NULL, NULL, NULL, 'kg', 'CREATED', 'ACTIVE', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-10-11 19:12:20', '2026-10-11 19:12:20'),
('LO004', 'MV001', 'SP001', 'SC001', NULL, 900.000, NULL, NULL, NULL, 'kg', 'PROCESSED', 'ACTIVE', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-10-14 23:40:20', '2026-10-14 23:40:20'),
('LO005', 'DEMOMV01', 'DEMOSP01', 'DEMOSC01', NULL, 500.000, NULL, NULL, NULL, 'kg', 'PROCESSED', 'ACTIVE', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-10-15 07:27:53', '2026-10-15 07:27:53'),
('LO006', 'DEMOMV01', 'DEMOSP01', 'DEMOSC01', NULL, 0.000, NULL, NULL, NULL, 'kg', 'PROCESSED', 'CONSUMED_BY_MERGE', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-10-15 07:28:37', '2026-10-17 12:33:51'),
('LO007', 'MV006', 'SP004', 'DEMOSC01', '2026-10-17', 0.000, NULL, NULL, NULL, 'kg', 'RECEIVED', 'CONSUMED_BY_TRANSFORM', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-10-17 11:48:34', '2026-10-17 12:30:34'),
('LO008', 'MV006', 'SP004', 'DEMOSC01', NULL, 1000.000, NULL, NULL, NULL, 'kg', 'PACKAGED', 'ACTIVE', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-10-17 12:30:34', '2026-10-17 12:31:15'),
('LO009', 'DEMOMV01', 'DEMOSP01', 'DEMOSC01', NULL, 2500.000, 'xuất khẩu', NULL, NULL, 'kg', 'RECEIVED', 'ACTIVE', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-10-17 12:33:51', '2026-10-17 12:33:51'),
('LO010', 'MV008', 'SP005', 'DEMOND01', '2026-10-17', 1000.000, NULL, NULL, NULL, 'kg', 'CREATED', 'ACTIVE', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-10-17 15:30:12', '2026-10-17 15:30:12'),
('LO011', 'DEMOMV01', 'DEMOSP01', 'DEMONPP01', NULL, 800.000, NULL, 'A', '2026-10-17', 'kg', 'RECEIVED', 'CONSUMED_BY_SPLIT', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-10-17 15:39:33', '2026-10-17 15:43:14'),
('LO012', 'DEMOMV01', 'DEMOSP01', 'DEMOSC01', NULL, 400.000, 'Loại 1 Xuất Khẩu', NULL, NULL, 'kg', 'PACKAGED', 'ACTIVE', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-10-17 15:42:07', '2026-10-17 15:42:07'),
('LO013', 'DEMOMV01', 'DEMOSP01', 'DEMOSC01', NULL, 400.000, 'Loại 2 Nội Địa', NULL, NULL, 'kg', 'PACKAGED', 'ACTIVE', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-10-17 15:42:07', '2026-10-17 15:42:07'),
('LO014', 'MV005', 'SP006', 'DEMOND01', '2026-10-17', 1000.000, NULL, NULL, NULL, 'kg', 'CREATED', 'ACTIVE', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-10-17 16:43:56', '2026-10-17 16:43:56'),
('LO015', 'MV009', 'SP007', 'DEMOND01', '2026-10-25', 1000.000, NULL, NULL, NULL, 'kg', 'CREATED', 'ACTIVE', 4, '0xf3e50f745eccec8a301628d840bfa6ea11ef88994f465cfab1b1e389feb4c957', 'CONFIRMED', 'VERIFIED', '2026-10-25 13:21:54', '2026-10-25 20:44:58'),
('LOXOAI001', 'MV001', 'SP001', 'ADMIN001', '2026-09-26', 10000.000, NULL, NULL, NULL, 'kg', 'CREATED', 'ACTIVE', 0, NULL, 'QUEUED', 'NOT_CHECKED', '2026-09-27 05:57:38', '2026-10-14 23:39:59');

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
  `trang_thai_thu_hoach` enum('CHUA_SAN_SANG','DA_SAN_SANG','DA_TAO_LO') NOT NULL DEFAULT 'CHUA_SAN_SANG',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `mua_vu`
--

INSERT INTO `mua_vu` (`ma_mua_vu`, `ma_nong_trai`, `ma_thua_dat`, `loai_cay_trong`, `giong_cay`, `thua_dat`, `ngay_gieo_trong`, `ngay_thu_hoach_du_kien`, `anh_mua_vu`, `trang_thai`, `trang_thai_thu_hoach`, `created_at`, `updated_at`) VALUES
('DEMOMV01', 'DEMOFARM01', 'DEMOLAND01', 'Xoài Cát Chu Demo', 'Cát Chu', NULL, '2026-06-01', '2026-10-01', NULL, 1, 'CHUA_SAN_SANG', '2026-10-15 00:18:12', '2026-10-15 00:18:12'),
('DEMOMV02', 'DEMOFARM01', 'DEMOLAND02', 'Xoài Cát Chu Demo', 'Cát Chu', NULL, '2026-06-15', '2026-10-10', NULL, 1, 'CHUA_SAN_SANG', '2026-10-15 00:18:12', '2026-10-15 00:18:12'),
('MV001', 'NT001', NULL, 'Xoài Cát Chu', NULL, NULL, '2026-08-27', NULL, NULL, 1, 'CHUA_SAN_SANG', '2026-09-27 05:40:08', '2026-09-27 05:40:08'),
('MV002', 'NT001', 'TD002', 'Quýt Đường', 'Quýt Đường', NULL, '2025-06-18', '2026-11-30', NULL, 1, 'CHUA_SAN_SANG', '2026-10-07 09:55:12', '2026-10-07 09:55:12'),
('MV003', 'NT002', 'TD003', 'Quýt Đường', NULL, NULL, '2026-10-07', NULL, NULL, 1, 'CHUA_SAN_SANG', '2026-10-07 11:35:01', '2026-10-07 11:35:01'),
('MV004', 'NT002', NULL, 'Lúa vụ đông xuân 2026', 'Lúa ST25', NULL, '2026-10-11', '2027-02-11', '/uploads/seasons/1791720596116-937843900.png', 1, 'CHUA_SAN_SANG', '2026-10-11 19:09:56', '2026-10-11 19:09:56'),
('MV005', 'NT003', 'TD004', 'quýt sành', 'Quýt Sành', NULL, '2026-10-17', NULL, NULL, 1, 'DA_TAO_LO', '2026-10-17 11:18:47', '2026-10-17 16:43:56'),
('MV006', 'NT003', 'TD005', 'Mùa vụ Quýt Đường', 'Quýt Đường', NULL, '2026-10-17', '2026-10-18', '/uploads/seasons/1792212277144-974080154.jpg', 1, 'DA_TAO_LO', '2026-10-17 11:44:37', '2026-10-17 11:48:34'),
('MV007', 'NT004', 'TD006', 'Quýt Đường', 'Quýt Đường', NULL, '2026-10-17', '2026-10-25', NULL, 1, 'CHUA_SAN_SANG', '2026-10-17 13:07:09', '2026-10-17 13:07:09'),
('MV008', 'NT003', 'TD005', 'Mùa vụ Quýt Đường 2025', 'Quýt Đường', NULL, '2026-10-17', '2026-10-18', NULL, 1, 'DA_TAO_LO', '2026-10-17 15:28:17', '2026-10-17 15:30:12'),
('MV009', 'NT009', 'TD007', 'Mùa vụ Sầu Riêng Thái', 'Sầu riêng thái', NULL, '2026-10-23', '2026-10-25', NULL, 1, 'DA_TAO_LO', '2026-10-25 13:21:34', '2026-10-25 13:21:54');

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
(2, 'MV002', 'TB001', 1.500, '2025-08-01', '2026-10-07 09:55:12'),
(3, 'MV004', 'PB005', 5.000, '2026-10-13', '2026-10-11 19:11:11'),
(4, 'MV006', 'PB003', 5.000, '2026-10-17', '2026-10-17 11:46:36'),
(5, 'MV006', 'TB001', 50.000, '2026-10-17', '2026-10-17 11:46:36'),
(6, 'MV008', 'PB003', 50.000, '2026-10-17', '2026-10-17 15:29:31');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `nguoi_dung`
--

CREATE TABLE `nguoi_dung` (
  `ma_nguoi_dung` varchar(50) NOT NULL,
  `ho_ten` varchar(150) NOT NULL,
  `ten_dang_nhap` varchar(50) DEFAULT NULL,
  `mat_khau` varchar(255) DEFAULT NULL,
  `vai_tro` enum('ADMIN','FARMER_COOP','PROCESSOR','TRANSPORTER','DISTRIBUTOR','CONSUMER','CERT_AUTHORITY','RETAILER') NOT NULL,
  `so_dien_thoai` varchar(20) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `dia_chi` varchar(255) DEFAULT NULL,
  `anh_dai_dien` varchar(500) DEFAULT NULL,
  `trang_thai` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `nguoi_dung`
--

INSERT INTO `nguoi_dung` (`ma_nguoi_dung`, `ho_ten`, `ten_dang_nhap`, `mat_khau`, `vai_tro`, `so_dien_thoai`, `email`, `dia_chi`, `anh_dai_dien`, `trang_thai`, `created_at`, `updated_at`) VALUES
('ADMIN001', 'Quản trị viên', 'admin', '$2y$12$KIo6BpxLVK3shWMVfEMaFuiY8lzBhUTCscGVacQVFqxHjVLnHhQxa', 'ADMIN', '0900000000', NULL, NULL, NULL, 1, '2026-09-27 05:29:46', '2026-10-11 13:57:17'),
('CQKD001', 'Trung Tâm Giám Định Nông Nghiệp Vùng 2', 'kiemdinhvung2', '$2y$12$KIo6BpxLVK3shWMVfEMaFuiY8lzBhUTCscGVacQVFqxHjVLnHhQxa', 'CERT_AUTHORITY', '02923888999', NULL, NULL, NULL, 1, '2026-10-07 23:28:13', '2026-10-07 23:53:35'),
('DEMODL01', 'Siêu Thị Demo Mart', 'demo_daily01', '$2b$10$gBgVFG15UiCALSUXYN.eDe96LXDGkfcPAk2TQC0cfpKPVvWmH1wbu', 'RETAILER', '0911000001', NULL, '123 Đường Demo, Q.1, TP.HCM', NULL, 1, '2026-10-24 12:27:02', '2026-10-24 12:27:02'),
('DEMODL02', 'Cửa Hàng Demo Fresh', 'demo_daily02', '$2b$10$gBgVFG15UiCALSUXYN.eDe96LXDGkfcPAk2TQC0cfpKPVvWmH1wbu', 'RETAILER', '0911000002', NULL, '456 Đường Demo, Q.3, TP.HCM', NULL, 1, '2026-10-24 12:27:02', '2026-10-24 12:27:02'),
('DEMOKD01', 'Cơ Quan Kiểm Định Demo', 'demo_kiemdinh', '$2b$10$gBgVFG15UiCALSUXYN.eDe96LXDGkfcPAk2TQC0cfpKPVvWmH1wbu', 'CERT_AUTHORITY', '0900000002', 'demo.kiemdinh@agrichain.test', 'Cần Thơ', NULL, 1, '2026-10-15 00:18:12', '2026-10-15 00:18:12'),
('DEMOND01', 'Nông Dân Demo', 'demo_nongdan', '$2b$10$gBgVFG15UiCALSUXYN.eDe96LXDGkfcPAk2TQC0cfpKPVvWmH1wbu', 'FARMER_COOP', '0900000001', 'demo.nongdan@agrichain.test', 'cần Thơ', '/uploads/avatars/1792225413535-626706960.jpg', 1, '2026-10-15 00:18:12', '2026-10-17 15:23:33'),
('DEMONPP01', 'Nhà Phân Phối Demo', 'demo_nhaphanphoi', '$2b$10$gBgVFG15UiCALSUXYN.eDe96LXDGkfcPAk2TQC0cfpKPVvWmH1wbu', 'DISTRIBUTOR', '0900000005', 'demo.phanphoi@agrichain.test', 'TP.HCM', NULL, 1, '2026-10-15 00:18:12', '2026-10-15 00:18:12'),
('DEMOSC01', 'Cơ Sở Sơ Chế Demo', 'demo_soche', '$2b$10$gBgVFG15UiCALSUXYN.eDe96LXDGkfcPAk2TQC0cfpKPVvWmH1wbu', 'PROCESSOR', '0900000004', 'demo.soche@agrichain.test', 'Vĩnh Long', NULL, 1, '2026-10-15 00:18:12', '2026-10-15 00:18:12'),
('DEMOVC01', 'Đơn Vị Vận Chuyển Demo', 'demo_vanchuyen', '$2b$10$gBgVFG15UiCALSUXYN.eDe96LXDGkfcPAk2TQC0cfpKPVvWmH1wbu', 'TRANSPORTER', '0900000003', 'demo.vanchuyen@agrichain.test', 'TP.HCM', NULL, 1, '2026-10-15 00:18:12', '2026-10-15 00:18:12'),
('ND001', 'Nguyễn Hoàng', 'nongdan01', '$2y$12$KIo6BpxLVK3shWMVfEMaFuiY8lzBhUTCscGVacQVFqxHjVLnHhQxa', 'FARMER_COOP', '0901234567', 'hoang114890@gmail.com', 'cần thơ', '/uploads/avatars/1791701746523-617612690.jpg', 1, '2026-09-27 05:29:24', '2026-10-11 13:55:46'),
('ND002', 'Hoàng Nguyễn', 'hoptacxanongnghiepxa', '$2b$12$eMYAvNJau8n/7OVYyW25N.viwsOG9PtiOmBksiCwLrLwT8pOfhYvK', 'FARMER_COOP', '0393194321', NULL, NULL, NULL, 1, '2026-10-17 15:23:01', '2026-10-17 15:23:01'),
('ND003', 'Nguyễn Văn B', 'demo123', '$2b$12$7S/wr.7l1Qwp92qxrgOedO58r6zrnZNFdXZqcBrK2MSBGHZjMEWK.', 'FARMER_COOP', '0943000221', NULL, NULL, NULL, 1, '2026-10-17 15:49:58', '2026-10-17 15:50:39'),
('PP001', 'Trương Thị Phương Anh', 'phanphoi01', '$2y$12$KIo6BpxLVK3shWMVfEMaFuiY8lzBhUTCscGVacQVFqxHjVLnHhQxa', 'DISTRIBUTOR', '0111111111', NULL, NULL, NULL, 1, '2026-10-14 01:14:19', '2026-10-14 01:16:14'),
('SC001', 'Khu Sơ Chế Chế Biến Mekong', 'sochemekong', '$2y$12$KIo6BpxLVK3shWMVfEMaFuiY8lzBhUTCscGVacQVFqxHjVLnHhQxa', 'PROCESSOR', '0977777777', NULL, NULL, NULL, 1, '2026-10-08 19:38:08', '2026-10-08 19:38:08'),
('VC001', 'Mekong Cold Logistics', 'vanchuyen01', '$2y$12$KIo6BpxLVK3shWMVfEMaFuiY8lzBhUTCscGVacQVFqxHjVLnHhQxa', 'TRANSPORTER', '0944444444', NULL, NULL, NULL, 1, '2026-10-08 19:38:08', '2026-10-08 19:38:08');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `nguong_kiem_dinh_chuan`
--

CREATE TABLE `nguong_kiem_dinh_chuan` (
  `ma_nguong` bigint(20) UNSIGNED NOT NULL,
  `ma_chi_so` varchar(50) NOT NULL COMMENT 'Mã định danh khớp với ma_chi_so cố định (DU_LUONG_BVTV, KIM_LOAI_NANG,...)',
  `ten_chi_tiet_chat` varchar(150) NOT NULL COMMENT 'Tên hoạt chất cụ thể (vd: Chì (Pb), Cadimi (Cd), E.coli)',
  `phuong_phap_thu` varchar(100) DEFAULT NULL COMMENT 'Tiêu chuẩn test (vd: TCVN 10780:2015, AOAC 2015.01)',
  `tieu_chuan_ap_dung` enum('TAT_CA','VIETGAP','GLOBALGAP','ORGANIC') NOT NULL DEFAULT 'TAT_CA',
  `ma_san_pham` varchar(50) DEFAULT NULL COMMENT 'NULL nếu áp dụng chung cho mọi nông sản, hoặc gắn mã SP cụ thể',
  `toan_tu_so_sanh` enum('<=','<','>=','>','AM_TINH','BANG') NOT NULL DEFAULT '<=',
  `nguong_toi_da` decimal(12,4) DEFAULT NULL COMMENT 'Giá trị số để so sánh tự động (NULL nếu là kiểm tra âm tính/cảm quan)',
  `don_vi_tinh` varchar(30) NOT NULL COMMENT 'Đơn vị đo (mg/kg, CFU/g, Brix,...)',
  `mo_ta_nguong` varchar(100) NOT NULL COMMENT 'Chuỗi hiển thị (vd: <= 0.01 mg/kg, Âm tính, >= 10 Brix)',
  `trang_thai` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `nguong_kiem_dinh_chuan`
--

INSERT INTO `nguong_kiem_dinh_chuan` (`ma_nguong`, `ma_chi_so`, `ten_chi_tiet_chat`, `phuong_phap_thu`, `tieu_chuan_ap_dung`, `ma_san_pham`, `toan_tu_so_sanh`, `nguong_toi_da`, `don_vi_tinh`, `mo_ta_nguong`, `trang_thai`, `created_at`, `updated_at`) VALUES
(1, 'DU_LUONG_BVTV', 'Dư lượng hoạt chất BVTV cấm', 'TCVN 10780:2015', 'VIETGAP', NULL, 'AM_TINH', 0.0100, 'mg/kg', 'Không phát hiện (< 0.01 mg/kg)', 1, '2026-10-12 16:45:10', '2026-10-12 16:45:10'),
(2, 'KIM_LOAI_NANG', 'Chì (Pb)', 'AOAC 2015.01', 'VIETGAP', NULL, '<=', 0.1000, 'mg/kg', '<= 0.1 mg/kg', 1, '2026-10-12 16:45:10', '2026-10-12 16:45:10'),
(3, 'KIM_LOAI_NANG', 'Cadimi (Cd)', 'AOAC 2015.01', 'VIETGAP', NULL, '<=', 0.0500, 'mg/kg', '<= 0.05 mg/kg', 1, '2026-10-12 16:45:10', '2026-10-12 16:45:10'),
(4, 'VI_SINH', 'Vi khuẩn E.coli', 'ISO 16649-2', 'VIETGAP', NULL, '<=', 10.0000, 'CFU/g', '<= 10 CFU/g', 1, '2026-10-12 16:45:10', '2026-10-12 16:45:10'),
(5, 'VI_SINH', 'Salmonella', 'ISO 6579-1', 'VIETGAP', NULL, 'AM_TINH', 0.0000, 'CFU/25g', 'Âm tính / 25g', 1, '2026-10-12 16:45:10', '2026-10-12 16:45:10'),
(6, 'NITRATE', 'Hàm lượng Nitrate (NO3-)', 'TCVN 5247:1990', 'VIETGAP', NULL, '<=', 150.0000, 'mg/kg', '<= 150 mg/kg', 1, '2026-10-12 16:45:10', '2026-10-12 16:45:10'),
(7, 'DU_LUONG_BVTV', 'Dư lượng hoạt chất BVTV cấm', 'TCVN 10780:2015', 'TAT_CA', NULL, 'AM_TINH', 0.0100, 'mg/kg', 'Không phát hiện (< 0.01 mg/kg)', 1, '2026-10-13 00:35:07', '2026-10-13 00:35:07'),
(8, 'KIM_LOAI_NANG', 'Chì (Pb)', 'AOAC 2015.01', 'TAT_CA', NULL, '<=', 0.1000, 'mg/kg', '<= 0.1 mg/kg', 1, '2026-10-13 00:35:07', '2026-10-13 00:35:07'),
(9, 'KIM_LOAI_NANG', 'Cadimi (Cd)', 'AOAC 2015.01', 'TAT_CA', NULL, '<=', 0.0500, 'mg/kg', '<= 0.05 mg/kg', 1, '2026-10-13 00:35:07', '2026-10-13 00:35:07'),
(10, 'VI_SINH', 'Vi khuẩn E.coli', 'ISO 16649-2', 'TAT_CA', NULL, '<=', 10.0000, 'CFU/g', '<= 10 CFU/g', 1, '2026-10-13 00:35:07', '2026-10-13 00:35:07'),
(11, 'VI_SINH', 'Salmonella', 'ISO 6579-1', 'TAT_CA', NULL, 'AM_TINH', 0.0000, 'CFU/25g', 'Âm tính / 25g', 1, '2026-10-13 00:35:07', '2026-10-13 00:35:07'),
(12, 'NITRATE', 'Hàm lượng Nitrate (NO3-)', 'TCVN 5247:1990', 'TAT_CA', NULL, '<=', 150.0000, 'mg/kg', '<= 150 mg/kg', 1, '2026-10-13 00:35:07', '2026-10-13 00:35:07');

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
('123', 'ND001', '123', '123', 123.00, '/uploads/farms/1791483268394-340621062.png', 1, '2026-10-09 01:14:28', '2026-10-11 13:58:34'),
('DEMOFARM01', 'DEMOND01', 'Nông Trại Demo Xanh', 'Xã Demo, Huyện Demo, Hậu Giang', 15.50, NULL, 1, '2026-10-15 00:18:12', '2026-10-15 00:18:12'),
('NT001', 'ND001', 'Nông Trại Hoàng Ngọc', 'Hậu Giang', 100.00, NULL, 1, '2026-09-27 05:35:19', '2026-10-07 10:02:24'),
('NT002', 'ND001', 'Nông Trại Hoàng Nguyễn', 'Cần Thơ', 200.00, '/uploads/farms/1791004710307-248307264.jpg', 1, '2026-10-03 12:18:30', '2026-10-03 12:18:30'),
('NT003', 'DEMOND01', 'Nông trại mùa xuân', 'Bình Thủy, Cần Thơ', 1000.00, '/uploads/farms/1792210585605-94129001.jpeg', 1, '2026-10-17 11:16:25', '2026-10-17 15:26:33'),
('NT004', 'DEMOND01', 'sjubjfs', 'áubhsbfac', 100.00, NULL, 0, '2026-10-17 13:03:40', '2026-10-17 15:25:08'),
('NT005', 'ND002', 'Hợp Tác Xã Nông Nghiệp Xannh', 'cần Thơ', NULL, NULL, 1, '2026-10-17 15:23:01', '2026-10-17 15:23:01'),
('NT006', 'DEMOND01', 'Nông trại Nguyễn Hoàng123', 'Bình Thủy, Cần Thơ', 5.00, NULL, 0, '2026-10-17 15:24:27', '2026-10-17 15:25:03'),
('NT007', 'ND002', 'Nông trại xanh', 'Cần Thơ', NULL, NULL, 1, '2026-10-17 15:48:41', '2026-10-17 15:48:46'),
('NT008', 'ND003', 'Nông trại xanh', 'Cần Thơ', NULL, NULL, 1, '2026-10-17 15:49:58', '2026-10-17 15:49:58'),
('NT009', 'DEMOND01', 'Nông trại mùa đông', 'Bình Thủy, Cần Thơ', 1000.00, NULL, 1, '2026-10-25 13:20:28', '2026-10-25 13:20:28');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `phien_ban_nguong`
--

CREATE TABLE `phien_ban_nguong` (
  `ma_phien_ban` int(10) UNSIGNED NOT NULL,
  `ma_bam` char(66) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `noi_dung` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`noi_dung`)),
  `ghi_chu` varchar(255) DEFAULT NULL,
  `ma_giao_dich_blockchain` char(66) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `phien_ban_nguong`
--

INSERT INTO `phien_ban_nguong` (`ma_phien_ban`, `ma_bam`, `noi_dung`, `ghi_chu`, `ma_giao_dich_blockchain`, `created_at`) VALUES
(1, '0x42c7c9489673dab800bfed3490056e1f79b1921072cbc51461e5dc3e518ff893', '{\"nguong\":[{\"don_vi_tinh\":\"mg/kg\",\"ma_chi_so\":\"DU_LUONG_BVTV\",\"ma_san_pham\":null,\"nguong_toi_da\":\"0.0100\",\"phuong_phap_thu\":\"TCVN 10780:2015\",\"ten_chi_tiet_chat\":\"Dư lượng hoạt chất BVTV cấm\",\"tieu_chuan_ap_dung\":\"TAT_CA\",\"toan_tu_so_sanh\":\"AM_TINH\"},{\"don_vi_tinh\":\"mg/kg\",\"ma_chi_so\":\"DU_LUONG_BVTV\",\"ma_san_pham\":null,\"nguong_toi_da\":\"0.0100\",\"phuong_phap_thu\":\"TCVN 10780:2015\",\"ten_chi_tiet_chat\":\"Dư lượng hoạt chất BVTV cấm\",\"tieu_chuan_ap_dung\":\"VIETGAP\",\"toan_tu_so_sanh\":\"AM_TINH\"},{\"don_vi_tinh\":\"mg/kg\",\"ma_chi_so\":\"KIM_LOAI_NANG\",\"ma_san_pham\":null,\"nguong_toi_da\":\"0.0500\",\"phuong_phap_thu\":\"AOAC 2015.01\",\"ten_chi_tiet_chat\":\"Cadimi (Cd)\",\"tieu_chuan_ap_dung\":\"TAT_CA\",\"toan_tu_so_sanh\":\"<=\"},{\"don_vi_tinh\":\"mg/kg\",\"ma_chi_so\":\"KIM_LOAI_NANG\",\"ma_san_pham\":null,\"nguong_toi_da\":\"0.0500\",\"phuong_phap_thu\":\"AOAC 2015.01\",\"ten_chi_tiet_chat\":\"Cadimi (Cd)\",\"tieu_chuan_ap_dung\":\"VIETGAP\",\"toan_tu_so_sanh\":\"<=\"},{\"don_vi_tinh\":\"mg/kg\",\"ma_chi_so\":\"KIM_LOAI_NANG\",\"ma_san_pham\":null,\"nguong_toi_da\":\"0.1000\",\"phuong_phap_thu\":\"AOAC 2015.01\",\"ten_chi_tiet_chat\":\"Chì (Pb)\",\"tieu_chuan_ap_dung\":\"TAT_CA\",\"toan_tu_so_sanh\":\"<=\"},{\"don_vi_tinh\":\"mg/kg\",\"ma_chi_so\":\"KIM_LOAI_NANG\",\"ma_san_pham\":null,\"nguong_toi_da\":\"0.1000\",\"phuong_phap_thu\":\"AOAC 2015.01\",\"ten_chi_tiet_chat\":\"Chì (Pb)\",\"tieu_chuan_ap_dung\":\"VIETGAP\",\"toan_tu_so_sanh\":\"<=\"},{\"don_vi_tinh\":\"mg/kg\",\"ma_chi_so\":\"NITRATE\",\"ma_san_pham\":null,\"nguong_toi_da\":\"150.0000\",\"phuong_phap_thu\":\"TCVN 5247:1990\",\"ten_chi_tiet_chat\":\"Hàm lượng Nitrate (NO3-)\",\"tieu_chuan_ap_dung\":\"TAT_CA\",\"toan_tu_so_sanh\":\"<=\"},{\"don_vi_tinh\":\"mg/kg\",\"ma_chi_so\":\"NITRATE\",\"ma_san_pham\":null,\"nguong_toi_da\":\"150.0000\",\"phuong_phap_thu\":\"TCVN 5247:1990\",\"ten_chi_tiet_chat\":\"Hàm lượng Nitrate (NO3-)\",\"tieu_chuan_ap_dung\":\"VIETGAP\",\"toan_tu_so_sanh\":\"<=\"},{\"don_vi_tinh\":\"CFU/25g\",\"ma_chi_so\":\"VI_SINH\",\"ma_san_pham\":null,\"nguong_toi_da\":\"0.0000\",\"phuong_phap_thu\":\"ISO 6579-1\",\"ten_chi_tiet_chat\":\"Salmonella\",\"tieu_chuan_ap_dung\":\"TAT_CA\",\"toan_tu_so_sanh\":\"AM_TINH\"},{\"don_vi_tinh\":\"CFU/25g\",\"ma_chi_so\":\"VI_SINH\",\"ma_san_pham\":null,\"nguong_toi_da\":\"0.0000\",\"phuong_phap_thu\":\"ISO 6579-1\",\"ten_chi_tiet_chat\":\"Salmonella\",\"tieu_chuan_ap_dung\":\"VIETGAP\",\"toan_tu_so_sanh\":\"AM_TINH\"},{\"don_vi_tinh\":\"CFU/g\",\"ma_chi_so\":\"VI_SINH\",\"ma_san_pham\":null,\"nguong_toi_da\":\"10.0000\",\"phuong_phap_thu\":\"ISO 16649-2\",\"ten_chi_tiet_chat\":\"Vi khuẩn E.coli\",\"tieu_chuan_ap_dung\":\"TAT_CA\",\"toan_tu_so_sanh\":\"<=\"},{\"don_vi_tinh\":\"CFU/g\",\"ma_chi_so\":\"VI_SINH\",\"ma_san_pham\":null,\"nguong_toi_da\":\"10.0000\",\"phuong_phap_thu\":\"ISO 16649-2\",\"ten_chi_tiet_chat\":\"Vi khuẩn E.coli\",\"tieu_chuan_ap_dung\":\"VIETGAP\",\"toan_tu_so_sanh\":\"<=\"}],\"v\":1}', '12 chỉ tiêu đang áp dụng', '0x53bebade992bd87b119c8223470254da068d6041be6bb449222802bbc71477d3', '2026-10-25 14:05:22');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `phieu_xuat_kho`
--

CREATE TABLE `phieu_xuat_kho` (
  `ma_phieu` varchar(64) NOT NULL,
  `ma_nha_phan_phoi` varchar(50) NOT NULL,
  `ma_dai_ly` varchar(50) NOT NULL,
  `ma_lo_nong_san` varchar(64) NOT NULL,
  `ma_lo_xuat` varchar(64) DEFAULT NULL,
  `ma_van_don` varchar(64) DEFAULT NULL,
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
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `phieu_xuat_kho`
--

INSERT INTO `phieu_xuat_kho` (`ma_phieu`, `ma_nha_phan_phoi`, `ma_dai_ly`, `ma_lo_nong_san`, `ma_lo_xuat`, `ma_van_don`, `so_luong_xuat`, `don_vi_tinh`, `hinh_thuc`, `ten_don_vi_van_chuyen`, `ten_tai_xe`, `bien_so_xe`, `trang_thai`, `ghi_chu`, `thoi_gian_xuat`, `thoi_gian_giao`, `created_at`, `updated_at`) VALUES
('DEMOPXK01', 'DEMONPP01', 'DEMODL01', 'DEMOLO07B', NULL, NULL, 3500.000, 'kg', 'DV_VAN_CHUYEN', NULL, 'Tài Xế Demo 5', '51C-00005', 'DA_GIAO', NULL, '2026-09-30 08:00:00', '2026-09-30 14:00:00', '2026-10-15 00:18:12', '2026-10-15 00:18:12'),
('DEMOPXK02', 'DEMONPP01', 'DEMODL02', 'DEMOLO08B', NULL, NULL, 900.000, 'kg', 'TU_GIAO', NULL, NULL, NULL, 'CHO_XUAT', NULL, NULL, NULL, '2026-10-15 00:18:12', '2026-10-15 00:18:12'),
('PXK-0001', 'DEMONPP01', 'DEMODL01', 'DEMOLO08B', NULL, NULL, 500.000, 'kg', 'DV_VAN_CHUYEN', 'GHTK', 'Nguyên', NULL, 'CHO_XUAT', NULL, NULL, NULL, '2026-10-17 15:43:44', '2026-10-17 15:43:44');

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
('DEMOSP01', 'Xoài Cát Chu Demo', 'Trái cây', NULL, 'kg', 1, '2026-10-15 00:18:12', '2026-10-15 00:18:12'),
('SP001', 'Xoải Cát Chu', 'Trái Cây', NULL, 'tan', 1, '2026-09-27 05:56:50', '2026-09-27 05:56:50'),
('SP002', 'Quýt Đường', 'Trái Cây', 'Quýt đường ngọt mọng nước miền Tây', 'kg', 1, '2026-10-07 23:28:35', '2026-10-07 23:28:35'),
('SP003', 'Lúa vụ đông xuân 2026', 'Nông sản', NULL, 'kg', 1, '2026-10-11 19:12:20', '2026-10-17 15:51:03'),
('SP004', 'Mùa vụ Quýt Đường', 'Nông sản', NULL, 'kg', 1, '2026-10-17 11:48:34', '2026-10-17 11:48:34'),
('SP005', 'Mùa vụ Quýt Đường 2025', 'Nông sản', NULL, 'kg', 1, '2026-10-17 15:30:12', '2026-10-17 15:30:12'),
('SP006', 'quýt sành', 'Nông sản', NULL, 'kg', 1, '2026-10-17 16:43:56', '2026-10-17 16:43:56'),
('SP007', 'Mùa vụ Sầu Riêng Thái', 'Nông sản', NULL, 'kg', 1, '2026-10-25 13:21:54', '2026-10-25 13:21:54');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `so_che_lo_hang`
--

CREATE TABLE `so_che_lo_hang` (
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
  `da_ghi_chuoi` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `so_che_lo_hang`
--

INSERT INTO `so_che_lo_hang` (`ma_so_che`, `ma_co_so`, `ma_lo_moi`, `tieu_de`, `khu_vuc_so_che`, `quy_cach_tieu_chuan`, `giai_doan_so_che`, `ngay_bat_dau`, `ngay_hoan_tat`, `created_at`, `updated_at`, `da_ghi_chuoi`) VALUES
('DEMOSC-LOT07', 'DEMOSC01', 'DEMOLO07B', 'Xoài Cát Chu Demo - Đóng thùng xuất khẩu', 'Khu đóng thùng lạnh B', 'Phân loại size > 250g, khử khuẩn ozon, đóng thùng 20kg', 'DA_HOAN_TAT', '2026-09-25', '2026-09-27', '2026-10-15 00:18:12', '2026-10-15 00:18:12', 0),
('DEMOSC-LOT08', 'DEMOSC01', 'DEMOLO08B', 'Xoài Cát Chu Demo - Túi lưới bán lẻ', 'Dây chuyền rửa Ozon A', 'Phân loại size > 200g, đóng túi lưới 2kg', 'DA_HOAN_TAT', '2026-09-24', '2026-09-26', '2026-10-15 00:18:12', '2026-10-15 00:18:12', 0),
('DEMOSC-LOT09', 'DEMOSC01', 'DEMOLO09B', 'Xoài Cát Chu Demo - Sẵn sàng bàn giao', 'Khu đóng thùng lạnh B', 'Phân loại size > 250g, đóng thùng 20kg', 'DA_HOAN_TAT', '2026-10-12', '2026-10-13', '2026-10-15 00:24:28', '2026-10-15 00:24:28', 0),
('SC001', 'SC001', 'LO002', 'Quýt đường loại 1', 'Dây chuyền rửa Ozon A', NULL, 'DA_HOAN_TAT', '2026-10-12', '2026-10-12', '2026-10-12 19:35:53', '2026-10-12 19:37:21', 0),
('SC002', 'SC001', 'LO004', 'quýt loại 1', 'Dây chuyền rửa Ozon A', NULL, 'DANG_RUA_KHU_KHUAN', '2026-10-14', NULL, '2026-10-14 23:40:20', '2026-10-14 23:40:20', 0),
('SC003', 'DEMOSC01', 'LO005', 'Xoài Cát Chu Loại 1', 'Dây chuyền rửa Ozon A', NULL, 'DANG_RUA_KHU_KHUAN', '2026-10-15', NULL, '2026-10-15 07:27:53', '2026-10-15 07:27:53', 0),
('SC004', 'DEMOSC01', 'LO006', 'Xoài', 'Dây chuyền rửa Ozon A', NULL, 'DANG_PHAN_LOAI', '2026-10-15', NULL, '2026-10-15 07:28:37', '2026-10-17 12:31:01', 0),
('SC005', 'DEMOSC01', 'LO008', 'Quýt đường size L', 'Dây chuyền rửa Ozon A', NULL, 'DA_HOAN_TAT', '2026-10-17', '2026-10-17', '2026-10-17 12:30:34', '2026-10-17 12:31:15', 0),
('SC006', 'DEMOSC01', 'LO011', 'Xoài cát', 'Dây chuyền rửa Ozon A', NULL, 'DA_HOAN_TAT', '2026-10-17', '2026-10-17', '2026-10-17 15:39:33', '2026-10-17 15:40:27', 0);

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
('DEMOLAND01', 'DEMOFARM01', 'Thửa Demo A1', 6.00, 'Đất phù sa', 'DANG_CANH_TAC', '2026-10-15 00:18:12', '2026-10-15 00:18:12'),
('DEMOLAND02', 'DEMOFARM01', 'Thửa Demo A2', 4.50, 'Đất phù sa', 'DANG_CANH_TAC', '2026-10-15 00:18:12', '2026-10-15 00:18:12'),
('TD001', 'NT001', 'Thửa A1-1', 2.50, 'Đất phù sa', 'DANG_CANH_TAC', '2026-10-03 12:39:50', '2026-10-03 12:39:50'),
('TD002', 'NT001', 'Thửa A1-2', 2.50, 'Đất phù sa', 'DANG_CANH_TAC', '2026-10-03 12:39:50', '2026-10-07 09:55:12'),
('TD003', 'NT002', 'A1-3', 100.00, 'Đất phù sa', 'DANG_CANH_TAC', '2026-10-07 11:35:01', '2026-10-07 11:35:01'),
('TD004', 'NT003', 'A1-3', 50.00, 'phù sa', 'DAT_TRONG', '2026-10-17 11:18:47', '2026-10-17 16:43:56'),
('TD005', 'NT003', 'A1-2', 50.00, 'Đất phù sa', 'DAT_TRONG', '2026-10-17 11:43:20', '2026-10-17 15:30:12'),
('TD006', 'NT004', 'ùtgf', 20.00, 'ghigu', 'DANG_CANH_TAC', '2026-10-17 13:05:38', '2026-10-17 13:07:09'),
('TD007', 'NT009', 'A1', 20.00, 'phù sa', 'DAT_TRONG', '2026-10-25 13:20:47', '2026-10-25 13:21:54');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `vi_blockchain`
--

CREATE TABLE `vi_blockchain` (
  `dia_chi_vi` char(42) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `ma_nguoi_dung` varchar(50) NOT NULL,
  `thoi_diem_dang_ky` datetime NOT NULL DEFAULT current_timestamp(),
  `trang_thai` tinyint(1) NOT NULL DEFAULT 1,
  `trang_thai_duyet` enum('CHO_DUYET','DA_DUYET','TU_CHOI') NOT NULL DEFAULT 'CHO_DUYET',
  `tx_gan_vai_tro` char(66) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `thoi_diem_duyet` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `vi_blockchain`
--

INSERT INTO `vi_blockchain` (`dia_chi_vi`, `ma_nguoi_dung`, `thoi_diem_dang_ky`, `trang_thai`, `trang_thai_duyet`, `tx_gan_vai_tro`, `thoi_diem_duyet`) VALUES
('0x4a316754f289fa75dd242360372730b61d1d169f', 'DEMOKD01', '2026-10-25 13:29:20', 1, 'DA_DUYET', '0xae45a8ab8debc816513f32e2bfb1caeafdbbd3e886df51bc4757bfc65f7eef45', '2026-10-25 13:30:14'),
('0x53eb661793d797bfbfada2e9a42a678caf80d62f', 'ADMIN001', '2026-10-25 13:07:03', 1, 'DA_DUYET', NULL, '2026-10-25 13:07:03'),
('0xa28815779e90bd5b39a35c12cb841957818d137b', 'DEMOND01', '2026-10-25 12:08:48', 1, 'DA_DUYET', '0x4f4a3bd8c6b63935762692a762c4d9e9aac5c947b27be1dcdc60c6ae2a8f55d7', '2026-10-25 13:17:48');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `vi_blockchain_nonce`
--

CREATE TABLE `vi_blockchain_nonce` (
  `ma_nguoi_dung` varchar(50) NOT NULL,
  `nonce` char(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `het_han` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `yeu_cau_cap_tai_khoan`
--

CREATE TABLE `yeu_cau_cap_tai_khoan` (
  `ma_yeu_cau` bigint(20) UNSIGNED NOT NULL,
  `vai_tro_yeu_cau` enum('FARMER_COOP','PROCESSOR','TRANSPORTER','DISTRIBUTOR','CERT_AUTHORITY','RETAILER') NOT NULL,
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
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `yeu_cau_cap_tai_khoan`
--

INSERT INTO `yeu_cau_cap_tai_khoan` (`ma_yeu_cau`, `vai_tro_yeu_cau`, `ho_ten`, `so_dien_thoai`, `email`, `ten_co_so`, `dia_chi`, `thong_tin_bo_sung`, `trang_thai_duyet`, `ma_nguoi_dung_tao`, `ly_do_tu_choi`, `ma_nguoi_duyet`, `ngay_duyet`, `created_at`, `updated_at`) VALUES
(1, 'FARMER_COOP', 'Hoàng Nguyễn', '0393194321', 'hoang114890@gmail.com', 'Hợp Tác Xã Nông Nghiệp Xannh', 'cần Thơ', '', 'APPROVED', 'ND002', NULL, 'ADMIN001', '2026-10-17 15:23:01', '2026-10-17 15:22:33', '2026-10-17 15:23:01');

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
-- Chỉ mục cho bảng `dai_ly`
--
ALTER TABLE `dai_ly`
  ADD PRIMARY KEY (`ma_dai_ly`),
  ADD UNIQUE KEY `uq_dai_ly_nguoi_dung` (`ma_nguoi_dung`),
  ADD KEY `idx_dai_ly_npp` (`ma_nha_phan_phoi`);

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
  ADD KEY `idx_kd_trang_thai` (`trang_thai_ho_so`),
  ADD KEY `fk_kiem_dinh_phien_ban_nguong` (`ma_phien_ban_nguong`);

--
-- Chỉ mục cho bảng `kiem_dinh_vien`
--
ALTER TABLE `kiem_dinh_vien`
  ADD PRIMARY KEY (`ma_kiem_dinh_vien`),
  ADD UNIQUE KEY `uq_kdv_co_quan_ho_ten` (`ma_co_quan`,`ho_ten`);

--
-- Chỉ mục cho bảng `lenh_van_chuyen`
--
ALTER TABLE `lenh_van_chuyen`
  ADD PRIMARY KEY (`ma_van_don`),
  ADD KEY `idx_lvc_lo` (`ma_lo_nong_san`,`trang_thai`),
  ADD KEY `idx_lvc_nguoi_gui` (`ma_nguoi_gui`,`trang_thai`),
  ADD KEY `idx_lvc_don_vi` (`ma_don_vi_van_chuyen`,`trang_thai`),
  ADD KEY `idx_lvc_ben_nhan` (`ma_ben_nhan`,`trang_thai`);

--
-- Chỉ mục cho bảng `lich_su_truy_xuat_lo`
--
ALTER TABLE `lich_su_truy_xuat_lo`
  ADD PRIMARY KEY (`ma_lich_su`),
  ADD UNIQUE KEY `uq_lich_su_lo_sequence` (`ma_lo_nong_san`,`so_thu_tu_su_kien`),
  ADD UNIQUE KEY `uq_lich_su_event_hash` (`ma_bam_su_kien_hien_tai`),
  ADD KEY `idx_lich_su_nguoi_dung` (`ma_nguoi_dung`),
  ADD KEY `idx_lich_su_tx_hash` (`ma_giao_dich_blockchain`),
  ADD KEY `idx_lich_su_sync_status` (`blockchain_sync_status`),
  ADD KEY `idx_lich_su_doi_tuong` (`loai_doi_tuong`,`ma_doi_tuong`),
  ADD KEY `fk_lich_su_su_kien_goc` (`ma_su_kien_goc`);

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
-- Chỉ mục cho bảng `nguong_kiem_dinh_chuan`
--
ALTER TABLE `nguong_kiem_dinh_chuan`
  ADD PRIMARY KEY (`ma_nguong`),
  ADD KEY `idx_nguong_ma_chi_so` (`ma_chi_so`),
  ADD KEY `idx_nguong_tieu_chuan` (`tieu_chuan_ap_dung`),
  ADD KEY `fk_nguong_san_pham` (`ma_san_pham`);

--
-- Chỉ mục cho bảng `nong_trai`
--
ALTER TABLE `nong_trai`
  ADD PRIMARY KEY (`ma_nong_trai`),
  ADD KEY `idx_nong_trai_nguoi_dung` (`ma_nguoi_dung`);

--
-- Chỉ mục cho bảng `phien_ban_nguong`
--
ALTER TABLE `phien_ban_nguong`
  ADD PRIMARY KEY (`ma_phien_ban`),
  ADD UNIQUE KEY `uq_phien_ban_nguong_bam` (`ma_bam`);

--
-- Chỉ mục cho bảng `phieu_xuat_kho`
--
ALTER TABLE `phieu_xuat_kho`
  ADD PRIMARY KEY (`ma_phieu`),
  ADD KEY `idx_pxk_npp` (`ma_nha_phan_phoi`,`trang_thai`),
  ADD KEY `idx_pxk_dai_ly` (`ma_dai_ly`),
  ADD KEY `idx_pxk_lo` (`ma_lo_nong_san`),
  ADD KEY `fk_phieu_xuat_lo_xuat` (`ma_lo_xuat`),
  ADD KEY `fk_phieu_xuat_van_don` (`ma_van_don`);

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
-- Chỉ mục cho bảng `so_che_lo_hang`
--
ALTER TABLE `so_che_lo_hang`
  ADD PRIMARY KEY (`ma_so_che`),
  ADD UNIQUE KEY `uq_soche_lo_moi` (`ma_lo_moi`),
  ADD KEY `idx_soche_co_so` (`ma_co_so`,`giai_doan_so_che`);

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
-- Chỉ mục cho bảng `vi_blockchain_nonce`
--
ALTER TABLE `vi_blockchain_nonce`
  ADD PRIMARY KEY (`ma_nguoi_dung`);

--
-- Chỉ mục cho bảng `yeu_cau_cap_tai_khoan`
--
ALTER TABLE `yeu_cau_cap_tai_khoan`
  ADD PRIMARY KEY (`ma_yeu_cau`),
  ADD KEY `idx_yeu_cau_trang_thai` (`trang_thai_duyet`),
  ADD KEY `fk_yeu_cau_nguoi_duyet` (`ma_nguoi_duyet`),
  ADD KEY `fk_yeu_cau_nguoi_dung_tao` (`ma_nguoi_dung_tao`);

--
-- AUTO_INCREMENT cho các bảng đã đổ
--

--
-- AUTO_INCREMENT cho bảng `blockchain_outbox`
--
ALTER TABLE `blockchain_outbox`
  MODIFY `outbox_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `chi_so_kiem_dinh`
--
ALTER TABLE `chi_so_kiem_dinh`
  MODIFY `ma_chi_so_kd` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=164;

--
-- AUTO_INCREMENT cho bảng `mua_vu_vat_tu`
--
ALTER TABLE `mua_vu_vat_tu`
  MODIFY `ma_su_dung` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT cho bảng `nguong_kiem_dinh_chuan`
--
ALTER TABLE `nguong_kiem_dinh_chuan`
  MODIFY `ma_nguong` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT cho bảng `phien_ban_nguong`
--
ALTER TABLE `phien_ban_nguong`
  MODIFY `ma_phien_ban` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT cho bảng `quyen_thao_tac_lo`
--
ALTER TABLE `quyen_thao_tac_lo`
  MODIFY `ma_quyen` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `yeu_cau_cap_tai_khoan`
--
ALTER TABLE `yeu_cau_cap_tai_khoan`
  MODIFY `ma_yeu_cau` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

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
-- Các ràng buộc cho bảng `dai_ly`
--
ALTER TABLE `dai_ly`
  ADD CONSTRAINT `fk_dai_ly_nguoi_dung` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dai_ly_npp` FOREIGN KEY (`ma_nha_phan_phoi`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `kiem_dinh_lo_hang`
--
ALTER TABLE `kiem_dinh_lo_hang`
  ADD CONSTRAINT `fk_kd_co_quan` FOREIGN KEY (`ma_co_quan`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_kd_lo_nong_san` FOREIGN KEY (`ma_lo_nong_san`) REFERENCES `lo_nong_san` (`ma_lo_nong_san`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_kiem_dinh_phien_ban_nguong` FOREIGN KEY (`ma_phien_ban_nguong`) REFERENCES `phien_ban_nguong` (`ma_phien_ban`) ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `kiem_dinh_vien`
--
ALTER TABLE `kiem_dinh_vien`
  ADD CONSTRAINT `fk_kdv_co_quan` FOREIGN KEY (`ma_co_quan`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON DELETE CASCADE;

--
-- Các ràng buộc cho bảng `lenh_van_chuyen`
--
ALTER TABLE `lenh_van_chuyen`
  ADD CONSTRAINT `fk_lvc_ben_nhan` FOREIGN KEY (`ma_ben_nhan`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_lvc_don_vi` FOREIGN KEY (`ma_don_vi_van_chuyen`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_lvc_lo` FOREIGN KEY (`ma_lo_nong_san`) REFERENCES `lo_nong_san` (`ma_lo_nong_san`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_lvc_nguoi_gui` FOREIGN KEY (`ma_nguoi_gui`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `lich_su_truy_xuat_lo`
--
ALTER TABLE `lich_su_truy_xuat_lo`
  ADD CONSTRAINT `fk_lich_su_lo_nong_san` FOREIGN KEY (`ma_lo_nong_san`) REFERENCES `lo_nong_san` (`ma_lo_nong_san`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_lich_su_nguoi_dung` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_lich_su_su_kien_goc` FOREIGN KEY (`ma_su_kien_goc`) REFERENCES `lich_su_truy_xuat_lo` (`ma_lich_su`) ON UPDATE CASCADE;

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
-- Các ràng buộc cho bảng `nguong_kiem_dinh_chuan`
--
ALTER TABLE `nguong_kiem_dinh_chuan`
  ADD CONSTRAINT `fk_nguong_san_pham` FOREIGN KEY (`ma_san_pham`) REFERENCES `san_pham_nong_san` (`ma_san_pham`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `nong_trai`
--
ALTER TABLE `nong_trai`
  ADD CONSTRAINT `fk_nong_trai_nguoi_dung` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `phieu_xuat_kho`
--
ALTER TABLE `phieu_xuat_kho`
  ADD CONSTRAINT `fk_phieu_xuat_lo_xuat` FOREIGN KEY (`ma_lo_xuat`) REFERENCES `lo_nong_san` (`ma_lo_nong_san`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_phieu_xuat_van_don` FOREIGN KEY (`ma_van_don`) REFERENCES `lenh_van_chuyen` (`ma_van_don`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pxk_dai_ly` FOREIGN KEY (`ma_dai_ly`) REFERENCES `dai_ly` (`ma_dai_ly`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pxk_lo` FOREIGN KEY (`ma_lo_nong_san`) REFERENCES `lo_nong_san` (`ma_lo_nong_san`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pxk_npp` FOREIGN KEY (`ma_nha_phan_phoi`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `quyen_thao_tac_lo`
--
ALTER TABLE `quyen_thao_tac_lo`
  ADD CONSTRAINT `fk_quyen_lo_nong_san` FOREIGN KEY (`ma_lo_nong_san`) REFERENCES `lo_nong_san` (`ma_lo_nong_san`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_quyen_nguoi_dung` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `so_che_lo_hang`
--
ALTER TABLE `so_che_lo_hang`
  ADD CONSTRAINT `fk_soche_co_so` FOREIGN KEY (`ma_co_so`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_soche_lo_moi` FOREIGN KEY (`ma_lo_moi`) REFERENCES `lo_nong_san` (`ma_lo_nong_san`) ON UPDATE CASCADE;

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

--
-- Các ràng buộc cho bảng `vi_blockchain_nonce`
--
ALTER TABLE `vi_blockchain_nonce`
  ADD CONSTRAINT `fk_vi_nonce_nguoi_dung` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON DELETE CASCADE;

--
-- Các ràng buộc cho bảng `yeu_cau_cap_tai_khoan`
--
ALTER TABLE `yeu_cau_cap_tai_khoan`
  ADD CONSTRAINT `fk_yeu_cau_nguoi_dung_tao` FOREIGN KEY (`ma_nguoi_dung_tao`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_yeu_cau_nguoi_duyet` FOREIGN KEY (`ma_nguoi_duyet`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
