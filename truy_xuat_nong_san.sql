-- MariaDB dump 10.19  Distrib 10.11.14-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: truy_xuat_nong_san
-- ------------------------------------------------------
-- Server version	10.11.14-MariaDB-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `blockchain_outbox`
--

DROP TABLE IF EXISTS `blockchain_outbox`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `blockchain_outbox` (
  `outbox_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `event_id` varchar(64) DEFAULT NULL,
  `aggregate_type` enum('BATCH','TRACE_EVENT','BATCH_RELATION') NOT NULL,
  `aggregate_id` varchar(64) NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`payload`)),
  `status` enum('QUEUED','SUBMITTED','CONFIRMED','FAILED') NOT NULL DEFAULT 'QUEUED',
  `retry_count` int(10) unsigned NOT NULL DEFAULT 0,
  `next_retry_at` datetime DEFAULT NULL,
  `last_error` text DEFAULT NULL,
  `tx_hash` char(66) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `submitted_at` datetime DEFAULT NULL,
  `confirmed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`outbox_id`),
  UNIQUE KEY `uq_blockchain_outbox_event` (`event_id`),
  KEY `idx_blockchain_outbox_worker` (`status`,`next_retry_at`),
  KEY `idx_blockchain_outbox_aggregate` (`aggregate_type`,`aggregate_id`),
  CONSTRAINT `fk_blockchain_outbox_event` FOREIGN KEY (`event_id`) REFERENCES `lich_su_truy_xuat_lo` (`ma_lich_su`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blockchain_outbox`
--

LOCK TABLES `blockchain_outbox` WRITE;
/*!40000 ALTER TABLE `blockchain_outbox` DISABLE KEYS */;
/*!40000 ALTER TABLE `blockchain_outbox` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chi_so_kiem_dinh`
--

DROP TABLE IF EXISTS `chi_so_kiem_dinh`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `chi_so_kiem_dinh` (
  `ma_chi_so_kd` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `ma_kiem_dinh` varchar(64) NOT NULL,
  `loai_chi_so` enum('CO_DINH','TUY_CHINH') NOT NULL DEFAULT 'TUY_CHINH',
  `ma_chi_so` varchar(50) DEFAULT NULL,
  `ten_chi_so` varchar(150) NOT NULL,
  `gia_tri` varchar(255) NOT NULL,
  `thu_tu` smallint(5) unsigned NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`ma_chi_so_kd`),
  UNIQUE KEY `uq_chi_so_kd_ten` (`ma_kiem_dinh`,`ten_chi_so`),
  KEY `idx_chi_so_kd_kiem_dinh` (`ma_kiem_dinh`,`thu_tu`),
  CONSTRAINT `fk_chi_so_kd_kiem_dinh` FOREIGN KEY (`ma_kiem_dinh`) REFERENCES `kiem_dinh_lo_hang` (`ma_kiem_dinh`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=158 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chi_so_kiem_dinh`
--

LOCK TABLES `chi_so_kiem_dinh` WRITE;
/*!40000 ALTER TABLE `chi_so_kiem_dinh` DISABLE KEYS */;
INSERT INTO `chi_so_kiem_dinh` VALUES
(10,'KD001','CO_DINH','DU_LUONG_BVTV','Dư lượng BVTV (Hóa chất cấm)','2',1,'2026-10-12 19:17:48','2026-10-12 19:17:48'),
(11,'KD001','CO_DINH','KIM_LOAI_NANG','Kim loại nặng (Chì, Cadimi)','1',2,'2026-10-12 19:17:48','2026-10-12 19:17:48'),
(12,'KD001','CO_DINH','VI_SINH','Vi sinh (E.coli, Salmonella)','1',3,'2026-10-12 19:17:48','2026-10-12 19:17:48'),
(13,'KD001','CO_DINH','NITRATE','Dư lượng Nitrate (NO3-)','1',4,'2026-10-12 19:17:48','2026-10-12 19:17:48'),
(92,'KD-2026-001','CO_DINH','DU_LUONG_BVTV','Dư lượng hoạt chất BVTV cấm','0',1,'2026-10-13 00:19:29','2026-10-13 00:19:29'),
(93,'KD-2026-001','CO_DINH','KIM_LOAI_NANG','Chì (Pb)','0',2,'2026-10-13 00:19:29','2026-10-13 00:19:29'),
(94,'KD-2026-001','CO_DINH','KIM_LOAI_NANG','Cadimi (Cd)','0',3,'2026-10-13 00:19:29','2026-10-13 00:19:29'),
(95,'KD-2026-001','CO_DINH','VI_SINH','Vi khuẩn E.coli','0',4,'2026-10-13 00:19:29','2026-10-13 00:19:29'),
(96,'KD-2026-001','CO_DINH','VI_SINH','Salmonella','0',5,'2026-10-13 00:19:29','2026-10-13 00:19:29'),
(97,'KD-2026-001','CO_DINH','NITRATE','Hàm lượng Nitrate (NO3-)','0',6,'2026-10-13 00:19:29','2026-10-13 00:19:29'),
(122,'KD003','CO_DINH','DU_LUONG_BVTV','Dư lượng hoạt chất BVTV cấm','0',1,'2026-10-17 12:25:09','2026-10-17 12:25:09'),
(123,'KD003','CO_DINH','KIM_LOAI_NANG','Chì (Pb)','0',2,'2026-10-17 12:25:09','2026-10-17 12:25:09'),
(124,'KD003','CO_DINH','KIM_LOAI_NANG','Cadimi (Cd)','0',3,'2026-10-17 12:25:09','2026-10-17 12:25:09'),
(125,'KD003','CO_DINH','VI_SINH','Vi khuẩn E.coli','0',4,'2026-10-17 12:25:09','2026-10-17 12:25:09'),
(126,'KD003','CO_DINH','VI_SINH','Salmonella','-5',5,'2026-10-17 12:25:09','2026-10-17 12:25:09'),
(127,'KD003','CO_DINH','NITRATE','Hàm lượng Nitrate (NO3-)','100',6,'2026-10-17 12:25:09','2026-10-17 12:25:09'),
(134,'DEMOKD-HS02','CO_DINH','DU_LUONG_BVTV','Dư lượng hoạt chất BVTV cấm','-1',1,'2026-10-17 13:12:56','2026-10-17 13:12:56'),
(135,'DEMOKD-HS02','CO_DINH','KIM_LOAI_NANG','Chì (Pb)','0',2,'2026-10-17 13:12:56','2026-10-17 13:12:56'),
(136,'DEMOKD-HS02','CO_DINH','KIM_LOAI_NANG','Cadimi (Cd)','0',3,'2026-10-17 13:12:56','2026-10-17 13:12:56'),
(137,'DEMOKD-HS02','CO_DINH','VI_SINH','Vi khuẩn E.coli','5',4,'2026-10-17 13:12:56','2026-10-17 13:12:56'),
(138,'DEMOKD-HS02','CO_DINH','VI_SINH','Salmonella','-1',5,'2026-10-17 13:12:56','2026-10-17 13:12:56'),
(139,'DEMOKD-HS02','CO_DINH','NITRATE','Hàm lượng Nitrate (NO3-)','100',6,'2026-10-17 13:12:56','2026-10-17 13:12:56'),
(146,'KD004','CO_DINH','DU_LUONG_BVTV','Dư lượng hoạt chất BVTV cấm','10',1,'2026-10-17 15:34:44','2026-10-17 15:34:44'),
(147,'KD004','CO_DINH','KIM_LOAI_NANG','Chì (Pb)','0',2,'2026-10-17 15:34:44','2026-10-17 15:34:44'),
(148,'KD004','CO_DINH','KIM_LOAI_NANG','Cadimi (Cd)','0',3,'2026-10-17 15:34:44','2026-10-17 15:34:44'),
(149,'KD004','CO_DINH','VI_SINH','Vi khuẩn E.coli','0',4,'2026-10-17 15:34:44','2026-10-17 15:34:44'),
(150,'KD004','CO_DINH','VI_SINH','Salmonella','0',5,'2026-10-17 15:34:44','2026-10-17 15:34:44'),
(151,'KD004','CO_DINH','NITRATE','Hàm lượng Nitrate (NO3-)','0',6,'2026-10-17 15:34:44','2026-10-17 15:34:44'),
(152,'KD005','CO_DINH','DU_LUONG_BVTV','Dư lượng hoạt chất BVTV cấm','0',1,'2026-10-17 16:45:20','2026-10-17 16:45:20'),
(153,'KD005','CO_DINH','KIM_LOAI_NANG','Chì (Pb)','0',2,'2026-10-17 16:45:20','2026-10-17 16:45:20'),
(154,'KD005','CO_DINH','KIM_LOAI_NANG','Cadimi (Cd)','0',3,'2026-10-17 16:45:20','2026-10-17 16:45:20'),
(155,'KD005','CO_DINH','VI_SINH','Vi khuẩn E.coli','0',4,'2026-10-17 16:45:20','2026-10-17 16:45:20'),
(156,'KD005','CO_DINH','VI_SINH','Salmonella','0',5,'2026-10-17 16:45:20','2026-10-17 16:45:20'),
(157,'KD005','CO_DINH','NITRATE','Hàm lượng Nitrate (NO3-)','0',6,'2026-10-17 16:45:20','2026-10-17 16:45:20');
/*!40000 ALTER TABLE `chi_so_kiem_dinh` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dai_ly`
--

DROP TABLE IF EXISTS `dai_ly`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
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
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`ma_dai_ly`),
  UNIQUE KEY `uq_dai_ly_nguoi_dung` (`ma_nguoi_dung`),
  KEY `idx_dai_ly_npp` (`ma_nha_phan_phoi`),
  CONSTRAINT `fk_dai_ly_nguoi_dung` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_dai_ly_npp` FOREIGN KEY (`ma_nha_phan_phoi`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dai_ly`
--

LOCK TABLES `dai_ly` WRITE;
/*!40000 ALTER TABLE `dai_ly` DISABLE KEYS */;
INSERT INTO `dai_ly` VALUES
('DEMODL01','DEMONPP01','DEMODL01','Siêu Thị Demo Mart','Trần Thị Demo','0911000001','123 Đường Demo, Q.1, TP.HCM','HOAT_DONG','2026-10-15 00:18:12','2026-10-15 00:18:12'),
('DEMODL02','DEMONPP01','DEMODL02','Cửa Hàng Demo Fresh','Lê Văn Demo','0911000002','456 Đường Demo, Q.3, TP.HCM','HOAT_DONG','2026-10-15 00:18:12','2026-10-15 00:18:12');
/*!40000 ALTER TABLE `dai_ly` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `danh_muc_vat_tu`
--

DROP TABLE IF EXISTS `danh_muc_vat_tu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `danh_muc_vat_tu` (
  `ma_vat_tu` varchar(50) NOT NULL,
  `loai_vat_tu` enum('PHAN_BON','THUOC_BVTV') NOT NULL,
  `ten_vat_tu` varchar(150) NOT NULL,
  `don_vi_tinh` varchar(30) NOT NULL,
  `trang_thai` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`ma_vat_tu`),
  KEY `idx_vat_tu_loai` (`loai_vat_tu`,`trang_thai`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `danh_muc_vat_tu`
--

LOCK TABLES `danh_muc_vat_tu` WRITE;
/*!40000 ALTER TABLE `danh_muc_vat_tu` DISABLE KEYS */;
INSERT INTO `danh_muc_vat_tu` VALUES
('PB001','PHAN_BON','Phân Urê','kg',1,'2026-10-07 09:25:36','2026-10-07 09:25:36'),
('PB002','PHAN_BON','Phân NPK 16-16-8','kg',1,'2026-10-07 09:25:36','2026-10-07 09:25:36'),
('PB003','PHAN_BON','Phân DAP','kg',1,'2026-10-07 09:25:36','2026-10-07 09:25:36'),
('PB004','PHAN_BON','Phân Kali clorua (KCl)','kg',1,'2026-10-07 09:25:36','2026-10-07 09:25:36'),
('PB005','PHAN_BON','Phân hữu cơ vi sinh','kg',1,'2026-10-07 09:25:36','2026-10-07 09:25:36'),
('TB001','THUOC_BVTV','Abamectin','lít',1,'2026-10-07 09:25:36','2026-10-07 09:25:36'),
('TB002','THUOC_BVTV','Mancozeb','kg',1,'2026-10-07 09:25:36','2026-10-07 09:25:36'),
('TB003','THUOC_BVTV','Imidacloprid','lít',1,'2026-10-07 09:25:36','2026-10-07 09:25:36'),
('TB004','THUOC_BVTV','Hexaconazole','lít',1,'2026-10-07 09:25:36','2026-10-07 09:25:36'),
('TB005','THUOC_BVTV','Đồng oxychloride','kg',1,'2026-10-07 09:25:36','2026-10-07 09:25:36');
/*!40000 ALTER TABLE `danh_muc_vat_tu` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kiem_dinh_lo_hang`
--

DROP TABLE IF EXISTS `kiem_dinh_lo_hang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
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
  `ma_phien_ban_nguong` int(10) unsigned DEFAULT NULL,
  `da_ghi_chuoi` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = kết quả đã ký lên chuỗi: không sửa chỉ số nữa, chỉ đính chính',
  PRIMARY KEY (`ma_kiem_dinh`),
  UNIQUE KEY `ma_ho_so` (`ma_ho_so`),
  KEY `idx_kd_lo` (`ma_lo_nong_san`),
  KEY `idx_kd_co_quan` (`ma_co_quan`),
  KEY `idx_kd_trang_thai` (`trang_thai_ho_so`),
  KEY `fk_kiem_dinh_phien_ban_nguong` (`ma_phien_ban_nguong`),
  CONSTRAINT `fk_kd_co_quan` FOREIGN KEY (`ma_co_quan`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE,
  CONSTRAINT `fk_kd_lo_nong_san` FOREIGN KEY (`ma_lo_nong_san`) REFERENCES `lo_nong_san` (`ma_lo_nong_san`) ON UPDATE CASCADE,
  CONSTRAINT `fk_kiem_dinh_phien_ban_nguong` FOREIGN KEY (`ma_phien_ban_nguong`) REFERENCES `phien_ban_nguong` (`ma_phien_ban`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kiem_dinh_lo_hang`
--

LOCK TABLES `kiem_dinh_lo_hang` WRITE;
/*!40000 ALTER TABLE `kiem_dinh_lo_hang` DISABLE KEYS */;
INSERT INTO `kiem_dinh_lo_hang` VALUES
('DEMOKD-HS02','DEMO-HS-02','DEMOLO02','DEMOKD01','VIETGAP','Đề nghị kiểm định chất lượng trước khi xuất bán.','2026-10-17','13:09:00','ThS. Lê Hoàng Yến (Chuyên viên vi sinh)','KDV004',NULL,'QR-Seal-0000000012','10','Lấy chéo góc 5 điểm ngẫu nhiên trên liếp vườn','bjj','2026-10-17 13:12:21',NULL,'CN-2026-000005','PASSED','2026-10-17','2027-10-17',NULL,NULL,'DA_CONG_BO','2026-10-15 00:18:12','2026-10-17 15:36:36',0,NULL,0),
('DEMOKD-HS03','DEMO-HS-03','DEMOLO03','DEMOKD01','VIETGAP',NULL,NULL,NULL,'Nguyễn Văn Kiểm (Demo)',NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-06 08:30:00',NULL,'DEMO-CERT-03','PASSED','2026-10-07','2027-10-07',NULL,NULL,'DA_CONG_BO','2026-10-15 00:18:12','2026-10-15 00:18:12',0,NULL,0),
('DEMOKD-HS04','DEMO-HS-04','DEMOLO04','DEMOKD01','VIETGAP',NULL,NULL,NULL,'Nguyễn Văn Kiểm (Demo)',NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-03 09:00:00',NULL,NULL,'FAILED',NULL,NULL,NULL,NULL,'DA_CONG_BO','2026-10-15 00:18:12','2026-10-15 00:18:12',0,NULL,0),
('KD-2026-001','HS-KD-9041','LH-8824','CQKD001','VIETGAP','Đề nghị kiểm tra dư lượng thuốc BVTV và kim loại nặng để phục vụ đóng gói phân phối siêu thị.','2026-10-12','19:12:00','ThS. Lê Hoàng Yến (Chuyên viên vi sinh)','KDV002',NULL,'QR-Seal-0000000009','12','Lấy ngẫu nhiên trên khay chứa tại kho đệm','12','2026-10-12 17:45:15',NULL,NULL,'PASSED',NULL,NULL,NULL,NULL,'DA_LAY_MAU','2026-10-05 08:30:00','2026-10-13 00:19:29',0,NULL,0),
('KD-2026-002','HS-KD-9042','LH-8825','CQKD001','GLOBALGAP','Lô xoài xuất khẩu đợt 1, đề nghị kiểm tra dư lượng hóa chất cấm theo tiêu chuẩn GlobalGAP.','2026-10-06','17:34:00','ThS. Lê Hoàng Yến (Chuyên viên vi sinh)','KDV002',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'CN-2026-000001','PASSED','2026-10-11','2027-10-11',NULL,NULL,'DA_CONG_BO','2026-10-06 09:15:00','2026-10-11 22:41:26',0,NULL,0),
('KD-2026-003','HS-KD-9043','LH-8821','CQKD001','ORGANIC','Đề nghị giám định vi sinh và cấp tem chứng nhận Organic cho nông trại hữu cơ.','2026-10-12','19:14:00','ThS. Lê Hoàng Yến (Chuyên viên vi sinh)','KDV002',NULL,'QR-Seal-0000000010','12','Lấy ngẫu nhiên trên khay chứa tại kho đệm','12',NULL,NULL,NULL,'PENDING',NULL,NULL,'',NULL,'CHO_LAY_MAU','2026-10-07 14:00:00','2026-10-12 19:20:49',0,NULL,0),
('KD001','HS-KD-9044','LO001','CQKD001','VIETGAP','kiểm định dư lượng thuốc','2026-10-12','19:17:00','ThS. Lê Hoàng Yến (Chuyên viên vi sinh)','KDV002',NULL,'QR-Seal-0000000003','10 quả','Lấy chéo góc 5 điểm ngẫu nhiên trên liếp vườn','đạt yêu cầu',NULL,NULL,'CN-2026-000003','PASSED','2026-10-12','2027-10-12',NULL,NULL,'DA_CONG_BO','2026-10-12 19:09:27','2026-10-12 19:25:52',0,NULL,0),
('KD002','HS-KD-9045','LO003','CQKD001','VIETGAP','yêu cầu kiểm định các  chất trong sản phẩm lúa','2026-10-14','05:20:00','KS. Trần Minh Tuấn (Phòng Giám định Trồng trọt)','KDV001',NULL,'QR-Seal-0000000001','test','Lấy ngẫu nhiên trên khay chứa tại kho đệm','123',NULL,NULL,'CN-2026-000002','PASSED','2026-10-11','2027-10-11',NULL,NULL,'DA_CONG_BO','2026-10-11 19:31:41','2026-10-11 23:33:53',0,NULL,0),
('KD003','HS-KD-9046','LO007','DEMOKD01','VIETGAP','kiểm định dư lượng phân bón','2026-10-17','12:05:00','KS. Trần Minh Tuấn (Phòng Giám định Trồng trọt)','KDV003',NULL,'QR-Seal-0000000011','10 quả','Lấy chéo góc 5 điểm ngẫu nhiên trên liếp vườn','đạt yêu cầu','2026-10-17 12:07:10',NULL,'CN-2026-000004','PASSED','2026-10-17','2027-10-17',NULL,NULL,'DA_CONG_BO','2026-10-17 11:55:22','2026-10-17 12:25:24',0,NULL,0),
('KD004','HS-KD-9047','LO010','DEMOKD01','VIETGAP',NULL,'2026-10-17','08:30:00','ThS. Lê Hoàng Yến (Chuyên viên vi sinh)','KDV004',NULL,'QR-Seal-0000000013','2kg','Lấy ngẫu nhiên trên khay chứa tại kho đệm','tốt','2026-10-17 15:33:06',NULL,NULL,'FAILED',NULL,NULL,NULL,NULL,'DA_CONG_BO','2026-10-17 15:30:36','2026-10-17 15:35:21',0,NULL,0),
('KD005','HS-KD-9048','LO014','DEMOKD01','GLOBALGAP',NULL,'2026-10-17','07:46:00','KS. Trần Minh Tuấn (Phòng Giám định Trồng trọt)','KDV003',NULL,'QR-Seal-0000000014','1kg','Lấy ngẫu nhiên trên khay chứa tại kho đệm','tốt','2026-10-17 16:45:20',NULL,'CN-2026-000006','PASSED','2026-10-17','2027-10-17',NULL,NULL,'DA_CONG_BO','2026-10-17 16:44:14','2026-10-17 16:45:27',0,NULL,0);
/*!40000 ALTER TABLE `kiem_dinh_lo_hang` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kiem_dinh_vien`
--

DROP TABLE IF EXISTS `kiem_dinh_vien`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `kiem_dinh_vien` (
  `ma_kiem_dinh_vien` varchar(50) NOT NULL,
  `ma_co_quan` varchar(50) NOT NULL,
  `ho_ten` varchar(150) NOT NULL,
  `chuc_vu` varchar(150) DEFAULT NULL,
  `so_dien_thoai` varchar(20) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `trang_thai` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`ma_kiem_dinh_vien`),
  UNIQUE KEY `uq_kdv_co_quan_ho_ten` (`ma_co_quan`,`ho_ten`),
  CONSTRAINT `fk_kdv_co_quan` FOREIGN KEY (`ma_co_quan`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kiem_dinh_vien`
--

LOCK TABLES `kiem_dinh_vien` WRITE;
/*!40000 ALTER TABLE `kiem_dinh_vien` DISABLE KEYS */;
INSERT INTO `kiem_dinh_vien` VALUES
('KDV001','CQKD001','KS. Trần Minh Tuấn','Phòng Giám định Trồng trọt',NULL,NULL,1,'2026-10-17 12:17:56','2026-10-17 12:17:56'),
('KDV002','CQKD001','ThS. Lê Hoàng Yến','Chuyên viên vi sinh',NULL,NULL,1,'2026-10-17 12:17:56','2026-10-17 12:17:56'),
('KDV003','DEMOKD01','KS. Trần Minh Tuấn','Phòng Giám định Trồng trọt',NULL,NULL,1,'2026-10-17 12:17:56','2026-10-17 12:17:56'),
('KDV004','DEMOKD01','ThS. Lê Hoàng Yến','Chuyên viên vi sinh',NULL,NULL,1,'2026-10-17 12:17:56','2026-10-17 12:17:56');
/*!40000 ALTER TABLE `kiem_dinh_vien` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lenh_van_chuyen`
--

DROP TABLE IF EXISTS `lenh_van_chuyen`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
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
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`ma_van_don`),
  KEY `idx_lvc_lo` (`ma_lo_nong_san`,`trang_thai`),
  KEY `idx_lvc_nguoi_gui` (`ma_nguoi_gui`,`trang_thai`),
  KEY `idx_lvc_don_vi` (`ma_don_vi_van_chuyen`,`trang_thai`),
  KEY `idx_lvc_ben_nhan` (`ma_ben_nhan`,`trang_thai`),
  CONSTRAINT `fk_lvc_ben_nhan` FOREIGN KEY (`ma_ben_nhan`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE,
  CONSTRAINT `fk_lvc_don_vi` FOREIGN KEY (`ma_don_vi_van_chuyen`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE,
  CONSTRAINT `fk_lvc_lo` FOREIGN KEY (`ma_lo_nong_san`) REFERENCES `lo_nong_san` (`ma_lo_nong_san`) ON UPDATE CASCADE,
  CONSTRAINT `fk_lvc_nguoi_gui` FOREIGN KEY (`ma_nguoi_gui`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lenh_van_chuyen`
--

LOCK TABLES `lenh_van_chuyen` WRITE;
/*!40000 ALTER TABLE `lenh_van_chuyen` DISABLE KEYS */;
INSERT INTO `lenh_van_chuyen` VALUES
('DEMOVD03','DEMOLO03','DEMOND01','DEMOVC01','DEMOSC01',NULL,1200.000,NULL,'kg','2026-10-13 08:00:00','Tài Xế Demo 1','51C-00001',NULL,'CHO_CHAP_NHAN','2026-10-15 00:18:12','2026-10-15 00:18:12'),
('DEMOVD05','DEMOLO05','DEMOND01','DEMOVC01','DEMOSC01',NULL,3000.000,NULL,'kg','2026-10-13 06:00:00','Tài Xế Demo 2','51C-00002',NULL,'DANG_VAN_CHUYEN','2026-10-15 00:18:12','2026-10-15 00:18:12'),
('DEMOVD06','DEMOLO06','DEMOND01','DEMOVC01','DEMOSC01',NULL,2500.000,NULL,'kg','2026-09-29 08:00:00','Tài Xế Demo 3','51C-00003',NULL,'HOAN_THANH','2026-10-15 00:18:12','2026-10-15 00:18:12'),
('DEMOVD07B','DEMOLO07B','DEMOSC01','DEMOVC01','DEMONPP01',NULL,3500.000,NULL,'kg','2026-09-28 07:00:00','Tài Xế Demo 4','51C-00004',NULL,'HOAN_THANH','2026-10-15 00:18:12','2026-10-15 00:18:12'),
('DEMOVD08B','DEMOLO08B','DEMOSC01','DEMOVC01','DEMONPP01',NULL,1800.000,NULL,'kg','2026-09-27 07:00:00','Tài Xế Demo 6','51C-00006',NULL,'HOAN_THANH','2026-10-15 00:18:12','2026-10-15 00:18:12'),
('VD-LOG-1001','LH-8825','ND001','VC001','SC001',NULL,8500.000,NULL,'kg','2026-10-18 02:01:00',NULL,NULL,NULL,'HOAN_THANH','2026-10-11 14:02:10','2026-10-14 23:39:59'),
('VD-LOG-1002','LO001','ND001','VC001','SC001',NULL,1000.000,NULL,'kg','2026-10-12 19:35:00','Nguyễn Văn A','65C-12345',NULL,'HOAN_THANH','2026-10-12 19:32:20','2026-10-12 19:35:16'),
('VD-LOG-1003','LO002','SC001','VC001',NULL,'Kho trung tâm vận chuyển metro',1000.000,NULL,'kg','2026-10-12 19:38:00','Nguyễn Văn A','65C-12345',NULL,'CHO_TIEP_NHAN','2026-10-12 19:38:00','2026-10-12 19:38:31'),
('VD-LOG-1004','LO007','DEMOND01','DEMOVC01','DEMOSC01',NULL,1000.000,NULL,'kg','2026-10-17 12:30:00','Nguyễn Văn A','65C12345',NULL,'HOAN_THANH','2026-10-17 12:26:53','2026-10-17 12:29:32'),
('VD-LOG-1005','DEMOLO02','DEMOND01','DEMOVC01','DEMOSC01',NULL,800.000,NULL,'kg','2026-10-17 15:36:00','Nguyễn Văn A','ABC',NULL,'HOAN_THANH','2026-10-17 15:36:54','2026-10-17 15:38:28'),
('VD-LOG-1006','LO011','DEMOSC01','DEMOVC01','DEMONPP01','TP.HCM',800.000,NULL,'kg','2026-10-17 15:41:08','Nguyễn Văn A','65c',NULL,'HOAN_THANH','2026-10-17 15:41:08','2026-10-17 15:43:14'),
('VD-LOG-1007','LO014','DEMOND01','DEMOVC01','DEMOSC01',NULL,1000.000,NULL,'kg','2026-10-17 16:45:00',NULL,NULL,NULL,'CHO_CHAP_NHAN','2026-10-17 16:47:23','2026-10-17 16:47:23');
/*!40000 ALTER TABLE `lenh_van_chuyen` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lich_su_truy_xuat_lo`
--

DROP TABLE IF EXISTS `lich_su_truy_xuat_lo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `lich_su_truy_xuat_lo` (
  `ma_lich_su` varchar(64) NOT NULL,
  `ma_lo_nong_san` varchar(64) NOT NULL,
  `ma_nguoi_dung` varchar(50) NOT NULL,
  `so_thu_tu_su_kien` bigint(20) unsigned NOT NULL,
  `loai_hoat_dong` enum('HARVEST_CONFIRMED','PROCESSING_DONE','PACKAGING_DONE','PICKUP_CONFIRMED','DELIVERY_CONFIRMED','STOCK_IN_CONFIRMED','COMPLETE_CONFIRMED','SAMPLING_SEALED','CERTIFICATE_ISSUED','CERTIFICATE_REVOKED','CERTIFICATE_FAILED','TRANSPORT_ORDERED','HANDOVER_REJECTED','BATCH_RELATION','DISPATCHED','DELIVERED_TO_AGENT','SAMPLING_CONFIRMED','RETURN_SHIPPED','RETURN_RECEIVED','CORRECTION') NOT NULL,
  `loai_doi_tuong` enum('LO','KIEM_DINH','VAN_DON') NOT NULL DEFAULT 'LO',
  `ma_doi_tuong` varchar(64) DEFAULT NULL,
  `thoi_diem_xay_ra` datetime(3) NOT NULL,
  `du_lieu_chi_tiet` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`du_lieu_chi_tiet`)),
  `ma_bam_du_lieu` char(66) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `ma_bam_su_kien_truoc` char(66) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `ma_bam_su_kien_hien_tai` char(66) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `ma_giao_dich_blockchain` char(66) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `so_block` bigint(20) unsigned DEFAULT NULL,
  `dia_chi_vi_ky` char(42) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `vai_tro_ky` enum('NONG_DAN','CHU_LO','KIEM_DINH','BEN_GUI','VAN_CHUYEN','BEN_NHAN','SO_CHE','PHAN_PHOI','DAI_LY') DEFAULT NULL,
  `blockchain_sync_status` enum('QUEUED','SUBMITTED','CONFIRMED','FAILED') NOT NULL DEFAULT 'QUEUED',
  `integrity_status` enum('NOT_CHECKED','VERIFIED','MISMATCH','INCOMPLETE','BROKEN_CHAIN') NOT NULL DEFAULT 'NOT_CHECKED',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `ma_su_kien_goc` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`ma_lich_su`),
  UNIQUE KEY `uq_lich_su_lo_sequence` (`ma_lo_nong_san`,`so_thu_tu_su_kien`),
  UNIQUE KEY `uq_lich_su_event_hash` (`ma_bam_su_kien_hien_tai`),
  KEY `idx_lich_su_nguoi_dung` (`ma_nguoi_dung`),
  KEY `idx_lich_su_tx_hash` (`ma_giao_dich_blockchain`),
  KEY `idx_lich_su_sync_status` (`blockchain_sync_status`),
  KEY `idx_lich_su_doi_tuong` (`loai_doi_tuong`,`ma_doi_tuong`),
  KEY `fk_lich_su_su_kien_goc` (`ma_su_kien_goc`),
  CONSTRAINT `fk_lich_su_lo_nong_san` FOREIGN KEY (`ma_lo_nong_san`) REFERENCES `lo_nong_san` (`ma_lo_nong_san`) ON UPDATE CASCADE,
  CONSTRAINT `fk_lich_su_nguoi_dung` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE,
  CONSTRAINT `fk_lich_su_su_kien_goc` FOREIGN KEY (`ma_su_kien_goc`) REFERENCES `lich_su_truy_xuat_lo` (`ma_lich_su`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lich_su_truy_xuat_lo`
--

LOCK TABLES `lich_su_truy_xuat_lo` WRITE;
/*!40000 ALTER TABLE `lich_su_truy_xuat_lo` DISABLE KEYS */;
/*!40000 ALTER TABLE `lich_su_truy_xuat_lo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lien_ket_nguon_goc_lo`
--

DROP TABLE IF EXISTS `lien_ket_nguon_goc_lo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `lien_ket_nguon_goc_lo` (
  `ma_lien_ket` varchar(64) NOT NULL,
  `relation_group_id` varchar(64) NOT NULL,
  `ma_lo_nguon` varchar(64) NOT NULL,
  `ma_lo_duoc_tao_ra` varchar(64) NOT NULL,
  `loai_lien_ket` enum('SPLIT','MERGE','TRANSFORM') NOT NULL,
  `so_luong_tham_gia` decimal(18,3) NOT NULL,
  `don_vi_tinh` varchar(30) NOT NULL,
  `thoi_diem_tao_lien_ket` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`ma_lien_ket`),
  UNIQUE KEY `uq_lien_ket_group_edge` (`relation_group_id`,`ma_lo_nguon`,`ma_lo_duoc_tao_ra`),
  KEY `idx_lien_ket_lo_nguon` (`ma_lo_nguon`),
  KEY `idx_lien_ket_lo_duoc_tao_ra` (`ma_lo_duoc_tao_ra`),
  KEY `idx_lien_ket_relation_group` (`relation_group_id`),
  CONSTRAINT `fk_lien_ket_lo_duoc_tao_ra` FOREIGN KEY (`ma_lo_duoc_tao_ra`) REFERENCES `lo_nong_san` (`ma_lo_nong_san`) ON UPDATE CASCADE,
  CONSTRAINT `fk_lien_ket_lo_nguon` FOREIGN KEY (`ma_lo_nguon`) REFERENCES `lo_nong_san` (`ma_lo_nong_san`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lien_ket_nguon_goc_lo`
--

LOCK TABLES `lien_ket_nguon_goc_lo` WRITE;
/*!40000 ALTER TABLE `lien_ket_nguon_goc_lo` DISABLE KEYS */;
INSERT INTO `lien_ket_nguon_goc_lo` VALUES
('DEMOLK07','DEMOREL07','DEMOLO07','DEMOLO07B','TRANSFORM',3500.000,'kg','2026-10-15 00:18:12'),
('DEMOLK08','DEMOREL08','DEMOLO08','DEMOLO08B','TRANSFORM',1800.000,'kg','2026-10-15 00:18:12'),
('DEMOLK09','DEMOREL09','DEMOLO09','DEMOLO09B','TRANSFORM',1000.000,'kg','2026-10-15 00:24:28'),
('LK001','REL001','LO001','LO002','TRANSFORM',1000.000,'kg','2026-10-12 19:35:53'),
('LK002','REL002','LH-8825','LO004','TRANSFORM',900.000,'kg','2026-10-14 23:40:20'),
('LK003','REL003','DEMOLO07','LO005','TRANSFORM',500.000,'kg','2026-10-15 07:27:53'),
('LK004','REL004','DEMOLO06','LO006','TRANSFORM',2300.000,'kg','2026-10-15 07:28:37'),
('LK005','REL005','LO007','LO008','TRANSFORM',1000.000,'kg','2026-10-17 12:30:34'),
('LK006','REL006','DEMOLO06','LO009','MERGE',200.000,'kg','2026-10-17 12:33:51'),
('LK007','REL006','LO006','LO009','MERGE',2300.000,'kg','2026-10-17 12:33:51'),
('LK008','REL007','DEMOLO02','LO011','TRANSFORM',800.000,'kg','2026-10-17 15:39:33'),
('LK009','REL008','LO011','LO012','SPLIT',400.000,'kg','2026-10-17 15:42:07'),
('LK010','REL008','LO011','LO013','SPLIT',400.000,'kg','2026-10-17 15:42:07');
/*!40000 ALTER TABLE `lien_ket_nguon_goc_lo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lo_nong_san`
--

DROP TABLE IF EXISTS `lo_nong_san`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
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
  `latest_event_sequence` bigint(20) unsigned NOT NULL DEFAULT 0,
  `latest_event_hash` char(66) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `blockchain_sync_status` enum('QUEUED','SUBMITTED','CONFIRMED','FAILED') NOT NULL DEFAULT 'QUEUED',
  `integrity_status` enum('NOT_CHECKED','VERIFIED','MISMATCH','INCOMPLETE','BROKEN_CHAIN') NOT NULL DEFAULT 'NOT_CHECKED',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`ma_lo_nong_san`),
  KEY `idx_lo_mua_vu` (`ma_mua_vu`),
  KEY `idx_lo_san_pham` (`ma_san_pham`),
  KEY `idx_lo_nguoi_quan_ly` (`ma_nguoi_quan_ly`),
  KEY `idx_lo_giai_doan` (`giai_doan_hien_tai`),
  KEY `idx_lo_tinh_trang_su_dung` (`tinh_trang_su_dung`),
  CONSTRAINT `fk_lo_nong_san_mua_vu` FOREIGN KEY (`ma_mua_vu`) REFERENCES `mua_vu` (`ma_mua_vu`) ON UPDATE CASCADE,
  CONSTRAINT `fk_lo_nong_san_nguoi_quan_ly` FOREIGN KEY (`ma_nguoi_quan_ly`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE,
  CONSTRAINT `fk_lo_nong_san_san_pham` FOREIGN KEY (`ma_san_pham`) REFERENCES `san_pham_nong_san` (`ma_san_pham`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lo_nong_san`
--

LOCK TABLES `lo_nong_san` WRITE;
/*!40000 ALTER TABLE `lo_nong_san` DISABLE KEYS */;
INSERT INTO `lo_nong_san` VALUES
('DEMOLO01','DEMOMV01','DEMOSP01','DEMOND01','2026-10-12',500.000,NULL,NULL,NULL,'kg','CREATED','ACTIVE',0,NULL,'QUEUED','NOT_CHECKED','2026-10-15 00:18:12','2026-10-15 00:18:12'),
('DEMOLO02','DEMOMV01','DEMOSP01','DEMOSC01','2026-10-08',0.000,NULL,NULL,NULL,'kg','RECEIVED','CONSUMED_BY_TRANSFORM',0,NULL,'QUEUED','NOT_CHECKED','2026-10-15 00:18:12','2026-10-17 15:39:33'),
('DEMOLO03','DEMOMV01','DEMOSP01','DEMOND01','2026-10-05',1200.000,NULL,NULL,NULL,'kg','HARVESTED','ACTIVE',0,NULL,'QUEUED','NOT_CHECKED','2026-10-15 00:18:12','2026-10-15 00:18:12'),
('DEMOLO04','DEMOMV02','DEMOSP01','DEMOND01','2026-10-02',600.000,NULL,NULL,NULL,'kg','HARVESTED','ACTIVE',0,NULL,'QUEUED','NOT_CHECKED','2026-10-15 00:18:12','2026-10-15 00:18:12'),
('DEMOLO05','DEMOMV02','DEMOSP01','DEMOND01','2026-10-10',3000.000,NULL,NULL,NULL,'kg','IN_TRANSIT','ACTIVE',0,NULL,'QUEUED','NOT_CHECKED','2026-10-15 00:18:12','2026-10-15 00:18:12'),
('DEMOLO06','DEMOMV01','DEMOSP01','DEMOSC01','2026-09-28',0.000,NULL,NULL,NULL,'kg','RECEIVED','CONSUMED_BY_MERGE',0,NULL,'QUEUED','NOT_CHECKED','2026-10-15 00:18:12','2026-10-17 12:33:51'),
('DEMOLO07','DEMOMV01','DEMOSP01','DEMOSC01','2026-09-20',0.000,NULL,NULL,NULL,'kg','RECEIVED','CONSUMED_BY_TRANSFORM',0,NULL,'QUEUED','NOT_CHECKED','2026-10-15 00:18:12','2026-10-15 07:27:53'),
('DEMOLO07B','DEMOMV01','DEMOSP01','DEMONPP01','2026-09-20',3500.000,NULL,NULL,NULL,'kg','DISTRIBUTED','ACTIVE',0,NULL,'QUEUED','NOT_CHECKED','2026-10-15 00:18:12','2026-10-15 00:18:12'),
('DEMOLO08','DEMOMV02','DEMOSP01','DEMOSC01','2026-09-22',0.000,NULL,NULL,NULL,'kg','RECEIVED','CONSUMED_BY_TRANSFORM',0,NULL,'QUEUED','NOT_CHECKED','2026-10-15 00:18:12','2026-10-15 00:18:12'),
('DEMOLO08B','DEMOMV02','DEMOSP01','DEMONPP01','2026-09-22',1300.000,NULL,'Kho Mát B - Pallet 05','2026-11-20','kg','RECEIVED','ACTIVE',0,NULL,'QUEUED','NOT_CHECKED','2026-10-15 00:18:12','2026-10-17 15:43:44'),
('DEMOLO09',NULL,'DEMOSP01','DEMOSC01','2026-10-01',0.000,NULL,NULL,NULL,'kg','RECEIVED','CONSUMED_BY_TRANSFORM',0,NULL,'QUEUED','NOT_CHECKED','2026-10-15 00:24:28','2026-10-15 00:24:28'),
('DEMOLO09B',NULL,'DEMOSP01','DEMOSC01','2026-10-01',1000.000,NULL,NULL,NULL,'kg','PACKAGED','ACTIVE',0,NULL,'QUEUED','NOT_CHECKED','2026-10-15 00:24:28','2026-10-15 00:24:28'),
('LH-8821','MV002','SP002','ND001','2026-09-28',3500.000,NULL,NULL,NULL,'kg','HARVESTED','ACTIVE',0,NULL,'QUEUED','NOT_CHECKED','2026-10-07 23:28:35','2026-10-07 23:28:35'),
('LH-8824','MV002','SP002','ND001','2026-10-01',5000.000,NULL,NULL,NULL,'kg','HARVESTED','ACTIVE',0,NULL,'QUEUED','NOT_CHECKED','2026-10-07 23:28:35','2026-10-07 23:28:35'),
('LH-8825','MV001','SP001','SC001','2026-10-05',8100.000,NULL,NULL,NULL,'kg','RECEIVED','ACTIVE',0,NULL,'QUEUED','NOT_CHECKED','2026-10-07 23:28:35','2026-10-14 23:40:20'),
('LO001','MV002','SP002','SC001','2026-10-12',0.000,NULL,NULL,NULL,'kg','RECEIVED','CONSUMED_BY_TRANSFORM',0,NULL,'QUEUED','NOT_CHECKED','2026-10-12 19:08:43','2026-10-12 19:35:53'),
('LO002','MV002','SP002','SC001',NULL,1000.000,NULL,NULL,NULL,'kg','PACKAGED','ACTIVE',0,NULL,'QUEUED','NOT_CHECKED','2026-10-12 19:35:53','2026-10-12 19:37:21'),
('LO003','MV004','SP003','ND001','2027-02-11',1000.000,NULL,NULL,NULL,'kg','CREATED','ACTIVE',0,NULL,'QUEUED','NOT_CHECKED','2026-10-11 19:12:20','2026-10-11 19:12:20'),
('LO004','MV001','SP001','SC001',NULL,900.000,NULL,NULL,NULL,'kg','PROCESSED','ACTIVE',0,NULL,'QUEUED','NOT_CHECKED','2026-10-14 23:40:20','2026-10-14 23:40:20'),
('LO005','DEMOMV01','DEMOSP01','DEMOSC01',NULL,500.000,NULL,NULL,NULL,'kg','PROCESSED','ACTIVE',0,NULL,'QUEUED','NOT_CHECKED','2026-10-15 07:27:53','2026-10-15 07:27:53'),
('LO006','DEMOMV01','DEMOSP01','DEMOSC01',NULL,0.000,NULL,NULL,NULL,'kg','PROCESSED','CONSUMED_BY_MERGE',0,NULL,'QUEUED','NOT_CHECKED','2026-10-15 07:28:37','2026-10-17 12:33:51'),
('LO007','MV006','SP004','DEMOSC01','2026-10-17',0.000,NULL,NULL,NULL,'kg','RECEIVED','CONSUMED_BY_TRANSFORM',0,NULL,'QUEUED','NOT_CHECKED','2026-10-17 11:48:34','2026-10-17 12:30:34'),
('LO008','MV006','SP004','DEMOSC01',NULL,1000.000,NULL,NULL,NULL,'kg','PACKAGED','ACTIVE',0,NULL,'QUEUED','NOT_CHECKED','2026-10-17 12:30:34','2026-10-17 12:31:15'),
('LO009','DEMOMV01','DEMOSP01','DEMOSC01',NULL,2500.000,'xuất khẩu',NULL,NULL,'kg','RECEIVED','ACTIVE',0,NULL,'QUEUED','NOT_CHECKED','2026-10-17 12:33:51','2026-10-17 12:33:51'),
('LO010','MV008','SP005','DEMOND01','2026-10-17',1000.000,NULL,NULL,NULL,'kg','CREATED','ACTIVE',0,NULL,'QUEUED','NOT_CHECKED','2026-10-17 15:30:12','2026-10-17 15:30:12'),
('LO011','DEMOMV01','DEMOSP01','DEMONPP01',NULL,800.000,NULL,'A','2026-10-17','kg','RECEIVED','CONSUMED_BY_SPLIT',0,NULL,'QUEUED','NOT_CHECKED','2026-10-17 15:39:33','2026-10-17 15:43:14'),
('LO012','DEMOMV01','DEMOSP01','DEMOSC01',NULL,400.000,'Loại 1 Xuất Khẩu',NULL,NULL,'kg','PACKAGED','ACTIVE',0,NULL,'QUEUED','NOT_CHECKED','2026-10-17 15:42:07','2026-10-17 15:42:07'),
('LO013','DEMOMV01','DEMOSP01','DEMOSC01',NULL,400.000,'Loại 2 Nội Địa',NULL,NULL,'kg','PACKAGED','ACTIVE',0,NULL,'QUEUED','NOT_CHECKED','2026-10-17 15:42:07','2026-10-17 15:42:07'),
('LO014','MV005','SP006','DEMOND01','2026-10-17',1000.000,NULL,NULL,NULL,'kg','CREATED','ACTIVE',0,NULL,'QUEUED','NOT_CHECKED','2026-10-17 16:43:56','2026-10-17 16:43:56'),
('LOXOAI001','MV001','SP001','ADMIN001','2026-09-26',10000.000,NULL,NULL,NULL,'kg','CREATED','ACTIVE',0,NULL,'QUEUED','NOT_CHECKED','2026-09-27 05:57:38','2026-10-14 23:39:59');
/*!40000 ALTER TABLE `lo_nong_san` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mua_vu`
--

DROP TABLE IF EXISTS `mua_vu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
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
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`ma_mua_vu`),
  KEY `idx_mua_vu_nong_trai` (`ma_nong_trai`),
  KEY `fk_mua_vu_thua_dat` (`ma_thua_dat`),
  CONSTRAINT `fk_mua_vu_nong_trai` FOREIGN KEY (`ma_nong_trai`) REFERENCES `nong_trai` (`ma_nong_trai`) ON UPDATE CASCADE,
  CONSTRAINT `fk_mua_vu_thua_dat` FOREIGN KEY (`ma_thua_dat`) REFERENCES `thua_dat` (`ma_thua_dat`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mua_vu`
--

LOCK TABLES `mua_vu` WRITE;
/*!40000 ALTER TABLE `mua_vu` DISABLE KEYS */;
INSERT INTO `mua_vu` VALUES
('DEMOMV01','DEMOFARM01','DEMOLAND01','Xoài Cát Chu Demo','Cát Chu',NULL,'2026-06-01','2026-10-01',NULL,1,'CHUA_SAN_SANG','2026-10-15 00:18:12','2026-10-15 00:18:12'),
('DEMOMV02','DEMOFARM01','DEMOLAND02','Xoài Cát Chu Demo','Cát Chu',NULL,'2026-06-15','2026-10-10',NULL,1,'CHUA_SAN_SANG','2026-10-15 00:18:12','2026-10-15 00:18:12'),
('MV001','NT001',NULL,'Xoài Cát Chu',NULL,NULL,'2026-08-27',NULL,NULL,1,'CHUA_SAN_SANG','2026-09-27 05:40:08','2026-09-27 05:40:08'),
('MV002','NT001','TD002','Quýt Đường','Quýt Đường',NULL,'2025-06-18','2026-11-30',NULL,1,'CHUA_SAN_SANG','2026-10-07 09:55:12','2026-10-07 09:55:12'),
('MV003','NT002','TD003','Quýt Đường',NULL,NULL,'2026-10-07',NULL,NULL,1,'CHUA_SAN_SANG','2026-10-07 11:35:01','2026-10-07 11:35:01'),
('MV004','NT002',NULL,'Lúa vụ đông xuân 2026','Lúa ST25',NULL,'2026-10-11','2027-02-11','/uploads/seasons/1791720596116-937843900.png',1,'CHUA_SAN_SANG','2026-10-11 19:09:56','2026-10-11 19:09:56'),
('MV005','NT003','TD004','quýt sành','Quýt Sành',NULL,'2026-10-17',NULL,NULL,1,'DA_TAO_LO','2026-10-17 11:18:47','2026-10-17 16:43:56'),
('MV006','NT003','TD005','Mùa vụ Quýt Đường','Quýt Đường',NULL,'2026-10-17','2026-10-18','/uploads/seasons/1792212277144-974080154.jpg',1,'DA_TAO_LO','2026-10-17 11:44:37','2026-10-17 11:48:34'),
('MV007','NT004','TD006','Quýt Đường','Quýt Đường',NULL,'2026-10-17','2026-10-25',NULL,1,'CHUA_SAN_SANG','2026-10-17 13:07:09','2026-10-17 13:07:09'),
('MV008','NT003','TD005','Mùa vụ Quýt Đường 2025','Quýt Đường',NULL,'2026-10-17','2026-10-18',NULL,1,'DA_TAO_LO','2026-10-17 15:28:17','2026-10-17 15:30:12');
/*!40000 ALTER TABLE `mua_vu` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mua_vu_vat_tu`
--

DROP TABLE IF EXISTS `mua_vu_vat_tu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `mua_vu_vat_tu` (
  `ma_su_dung` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mua_vu_vat_tu`
--

LOCK TABLES `mua_vu_vat_tu` WRITE;
/*!40000 ALTER TABLE `mua_vu_vat_tu` DISABLE KEYS */;
INSERT INTO `mua_vu_vat_tu` VALUES
(1,'MV002','PB001',50.000,'2025-07-01','2026-10-07 09:55:12'),
(2,'MV002','TB001',1.500,'2025-08-01','2026-10-07 09:55:12'),
(3,'MV004','PB005',5.000,'2026-10-13','2026-10-11 19:11:11'),
(4,'MV006','PB003',5.000,'2026-10-17','2026-10-17 11:46:36'),
(5,'MV006','TB001',50.000,'2026-10-17','2026-10-17 11:46:36'),
(6,'MV008','PB003',50.000,'2026-10-17','2026-10-17 15:29:31');
/*!40000 ALTER TABLE `mua_vu_vat_tu` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `nguoi_dung`
--

DROP TABLE IF EXISTS `nguoi_dung`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
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
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`ma_nguoi_dung`),
  UNIQUE KEY `uq_ten_dang_nhap` (`ten_dang_nhap`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nguoi_dung`
--

LOCK TABLES `nguoi_dung` WRITE;
/*!40000 ALTER TABLE `nguoi_dung` DISABLE KEYS */;
INSERT INTO `nguoi_dung` VALUES
('ADMIN001','Quản trị viên','admin','$2y$12$KIo6BpxLVK3shWMVfEMaFuiY8lzBhUTCscGVacQVFqxHjVLnHhQxa','ADMIN','0900000000',NULL,NULL,NULL,1,'2026-09-27 05:29:46','2026-10-11 13:57:17'),
('CQKD001','Trung Tâm Giám Định Nông Nghiệp Vùng 2','kiemdinhvung2','$2y$12$KIo6BpxLVK3shWMVfEMaFuiY8lzBhUTCscGVacQVFqxHjVLnHhQxa','CERT_AUTHORITY','02923888999',NULL,NULL,NULL,1,'2026-10-07 23:28:13','2026-10-07 23:53:35'),
('DEMODL01','Siêu Thị Demo Mart','demo_daily01','$2b$10$gBgVFG15UiCALSUXYN.eDe96LXDGkfcPAk2TQC0cfpKPVvWmH1wbu','RETAILER','0911000001',NULL,'123 Đường Demo, Q.1, TP.HCM',NULL,1,'2026-10-24 12:27:02','2026-10-24 12:27:02'),
('DEMODL02','Cửa Hàng Demo Fresh','demo_daily02','$2b$10$gBgVFG15UiCALSUXYN.eDe96LXDGkfcPAk2TQC0cfpKPVvWmH1wbu','RETAILER','0911000002',NULL,'456 Đường Demo, Q.3, TP.HCM',NULL,1,'2026-10-24 12:27:02','2026-10-24 12:27:02'),
('DEMOKD01','Cơ Quan Kiểm Định Demo','demo_kiemdinh','$2b$10$gBgVFG15UiCALSUXYN.eDe96LXDGkfcPAk2TQC0cfpKPVvWmH1wbu','CERT_AUTHORITY','0900000002','demo.kiemdinh@agrichain.test','Cần Thơ',NULL,1,'2026-10-15 00:18:12','2026-10-15 00:18:12'),
('DEMOND01','Nông Dân Demo','demo_nongdan','$2b$10$gBgVFG15UiCALSUXYN.eDe96LXDGkfcPAk2TQC0cfpKPVvWmH1wbu','FARMER_COOP','0900000001','demo.nongdan@agrichain.test','cần Thơ','/uploads/avatars/1792225413535-626706960.jpg',1,'2026-10-15 00:18:12','2026-10-17 15:23:33'),
('DEMONPP01','Nhà Phân Phối Demo','demo_nhaphanphoi','$2b$10$gBgVFG15UiCALSUXYN.eDe96LXDGkfcPAk2TQC0cfpKPVvWmH1wbu','DISTRIBUTOR','0900000005','demo.phanphoi@agrichain.test','TP.HCM',NULL,1,'2026-10-15 00:18:12','2026-10-15 00:18:12'),
('DEMOSC01','Cơ Sở Sơ Chế Demo','demo_soche','$2b$10$gBgVFG15UiCALSUXYN.eDe96LXDGkfcPAk2TQC0cfpKPVvWmH1wbu','PROCESSOR','0900000004','demo.soche@agrichain.test','Vĩnh Long',NULL,1,'2026-10-15 00:18:12','2026-10-15 00:18:12'),
('DEMOVC01','Đơn Vị Vận Chuyển Demo','demo_vanchuyen','$2b$10$gBgVFG15UiCALSUXYN.eDe96LXDGkfcPAk2TQC0cfpKPVvWmH1wbu','TRANSPORTER','0900000003','demo.vanchuyen@agrichain.test','TP.HCM',NULL,1,'2026-10-15 00:18:12','2026-10-15 00:18:12'),
('ND001','Nguyễn Hoàng','nongdan01','$2y$12$KIo6BpxLVK3shWMVfEMaFuiY8lzBhUTCscGVacQVFqxHjVLnHhQxa','FARMER_COOP','0901234567','hoang114890@gmail.com','cần thơ','/uploads/avatars/1791701746523-617612690.jpg',1,'2026-09-27 05:29:24','2026-10-11 13:55:46'),
('ND002','Hoàng Nguyễn','hoptacxanongnghiepxa','$2b$12$eMYAvNJau8n/7OVYyW25N.viwsOG9PtiOmBksiCwLrLwT8pOfhYvK','FARMER_COOP','0393194321',NULL,NULL,NULL,1,'2026-10-17 15:23:01','2026-10-17 15:23:01'),
('ND003','Nguyễn Văn B','demo123','$2b$12$7S/wr.7l1Qwp92qxrgOedO58r6zrnZNFdXZqcBrK2MSBGHZjMEWK.','FARMER_COOP','0943000221',NULL,NULL,NULL,1,'2026-10-17 15:49:58','2026-10-17 15:50:39'),
('PP001','Trương Thị Phương Anh','phanphoi01','$2y$12$KIo6BpxLVK3shWMVfEMaFuiY8lzBhUTCscGVacQVFqxHjVLnHhQxa','DISTRIBUTOR','0111111111',NULL,NULL,NULL,1,'2026-10-14 01:14:19','2026-10-14 01:16:14'),
('SC001','Khu Sơ Chế Chế Biến Mekong','sochemekong','$2y$12$KIo6BpxLVK3shWMVfEMaFuiY8lzBhUTCscGVacQVFqxHjVLnHhQxa','PROCESSOR','0977777777',NULL,NULL,NULL,1,'2026-10-08 19:38:08','2026-10-08 19:38:08'),
('VC001','Mekong Cold Logistics','vanchuyen01','$2y$12$KIo6BpxLVK3shWMVfEMaFuiY8lzBhUTCscGVacQVFqxHjVLnHhQxa','TRANSPORTER','0944444444',NULL,NULL,NULL,1,'2026-10-08 19:38:08','2026-10-08 19:38:08');
/*!40000 ALTER TABLE `nguoi_dung` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `nguong_kiem_dinh_chuan`
--

DROP TABLE IF EXISTS `nguong_kiem_dinh_chuan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `nguong_kiem_dinh_chuan` (
  `ma_nguong` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
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
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`ma_nguong`),
  KEY `idx_nguong_ma_chi_so` (`ma_chi_so`),
  KEY `idx_nguong_tieu_chuan` (`tieu_chuan_ap_dung`),
  KEY `fk_nguong_san_pham` (`ma_san_pham`),
  CONSTRAINT `fk_nguong_san_pham` FOREIGN KEY (`ma_san_pham`) REFERENCES `san_pham_nong_san` (`ma_san_pham`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nguong_kiem_dinh_chuan`
--

LOCK TABLES `nguong_kiem_dinh_chuan` WRITE;
/*!40000 ALTER TABLE `nguong_kiem_dinh_chuan` DISABLE KEYS */;
INSERT INTO `nguong_kiem_dinh_chuan` VALUES
(1,'DU_LUONG_BVTV','Dư lượng hoạt chất BVTV cấm','TCVN 10780:2015','VIETGAP',NULL,'AM_TINH',0.0100,'mg/kg','Không phát hiện (< 0.01 mg/kg)',1,'2026-10-12 16:45:10','2026-10-12 16:45:10'),
(2,'KIM_LOAI_NANG','Chì (Pb)','AOAC 2015.01','VIETGAP',NULL,'<=',0.1000,'mg/kg','<= 0.1 mg/kg',1,'2026-10-12 16:45:10','2026-10-12 16:45:10'),
(3,'KIM_LOAI_NANG','Cadimi (Cd)','AOAC 2015.01','VIETGAP',NULL,'<=',0.0500,'mg/kg','<= 0.05 mg/kg',1,'2026-10-12 16:45:10','2026-10-12 16:45:10'),
(4,'VI_SINH','Vi khuẩn E.coli','ISO 16649-2','VIETGAP',NULL,'<=',10.0000,'CFU/g','<= 10 CFU/g',1,'2026-10-12 16:45:10','2026-10-12 16:45:10'),
(5,'VI_SINH','Salmonella','ISO 6579-1','VIETGAP',NULL,'AM_TINH',0.0000,'CFU/25g','Âm tính / 25g',1,'2026-10-12 16:45:10','2026-10-12 16:45:10'),
(6,'NITRATE','Hàm lượng Nitrate (NO3-)','TCVN 5247:1990','VIETGAP',NULL,'<=',150.0000,'mg/kg','<= 150 mg/kg',1,'2026-10-12 16:45:10','2026-10-12 16:45:10'),
(7,'DU_LUONG_BVTV','Dư lượng hoạt chất BVTV cấm','TCVN 10780:2015','TAT_CA',NULL,'AM_TINH',0.0100,'mg/kg','Không phát hiện (< 0.01 mg/kg)',1,'2026-10-13 00:35:07','2026-10-13 00:35:07'),
(8,'KIM_LOAI_NANG','Chì (Pb)','AOAC 2015.01','TAT_CA',NULL,'<=',0.1000,'mg/kg','<= 0.1 mg/kg',1,'2026-10-13 00:35:07','2026-10-13 00:35:07'),
(9,'KIM_LOAI_NANG','Cadimi (Cd)','AOAC 2015.01','TAT_CA',NULL,'<=',0.0500,'mg/kg','<= 0.05 mg/kg',1,'2026-10-13 00:35:07','2026-10-13 00:35:07'),
(10,'VI_SINH','Vi khuẩn E.coli','ISO 16649-2','TAT_CA',NULL,'<=',10.0000,'CFU/g','<= 10 CFU/g',1,'2026-10-13 00:35:07','2026-10-13 00:35:07'),
(11,'VI_SINH','Salmonella','ISO 6579-1','TAT_CA',NULL,'AM_TINH',0.0000,'CFU/25g','Âm tính / 25g',1,'2026-10-13 00:35:07','2026-10-13 00:35:07'),
(12,'NITRATE','Hàm lượng Nitrate (NO3-)','TCVN 5247:1990','TAT_CA',NULL,'<=',150.0000,'mg/kg','<= 150 mg/kg',1,'2026-10-13 00:35:07','2026-10-13 00:35:07');
/*!40000 ALTER TABLE `nguong_kiem_dinh_chuan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `nong_trai`
--

DROP TABLE IF EXISTS `nong_trai`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `nong_trai` (
  `ma_nong_trai` varchar(50) NOT NULL,
  `ma_nguoi_dung` varchar(50) NOT NULL,
  `ten_nong_trai` varchar(150) NOT NULL,
  `dia_diem_nong_trai` varchar(255) NOT NULL,
  `dien_tich_nong_trai` decimal(12,2) DEFAULT NULL,
  `anh_nong_trai` varchar(500) DEFAULT NULL,
  `trang_thai` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`ma_nong_trai`),
  KEY `idx_nong_trai_nguoi_dung` (`ma_nguoi_dung`),
  CONSTRAINT `fk_nong_trai_nguoi_dung` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nong_trai`
--

LOCK TABLES `nong_trai` WRITE;
/*!40000 ALTER TABLE `nong_trai` DISABLE KEYS */;
INSERT INTO `nong_trai` VALUES
('123','ND001','123','123',123.00,'/uploads/farms/1791483268394-340621062.png',1,'2026-10-09 01:14:28','2026-10-11 13:58:34'),
('DEMOFARM01','DEMOND01','Nông Trại Demo Xanh','Xã Demo, Huyện Demo, Hậu Giang',15.50,NULL,1,'2026-10-15 00:18:12','2026-10-15 00:18:12'),
('NT001','ND001','Nông Trại Hoàng Ngọc','Hậu Giang',100.00,NULL,1,'2026-09-27 05:35:19','2026-10-07 10:02:24'),
('NT002','ND001','Nông Trại Hoàng Nguyễn','Cần Thơ',200.00,'/uploads/farms/1791004710307-248307264.jpg',1,'2026-10-03 12:18:30','2026-10-03 12:18:30'),
('NT003','DEMOND01','Nông trại mùa xuân','Bình Thủy, Cần Thơ',1000.00,'/uploads/farms/1792210585605-94129001.jpeg',1,'2026-10-17 11:16:25','2026-10-17 15:26:33'),
('NT004','DEMOND01','sjubjfs','áubhsbfac',100.00,NULL,0,'2026-10-17 13:03:40','2026-10-17 15:25:08'),
('NT005','ND002','Hợp Tác Xã Nông Nghiệp Xannh','cần Thơ',NULL,NULL,1,'2026-10-17 15:23:01','2026-10-17 15:23:01'),
('NT006','DEMOND01','Nông trại Nguyễn Hoàng123','Bình Thủy, Cần Thơ',5.00,NULL,0,'2026-10-17 15:24:27','2026-10-17 15:25:03'),
('NT007','ND002','Nông trại xanh','Cần Thơ',NULL,NULL,1,'2026-10-17 15:48:41','2026-10-17 15:48:46'),
('NT008','ND003','Nông trại xanh','Cần Thơ',NULL,NULL,1,'2026-10-17 15:49:58','2026-10-17 15:49:58');
/*!40000 ALTER TABLE `nong_trai` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `phien_ban_nguong`
--

DROP TABLE IF EXISTS `phien_ban_nguong`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `phien_ban_nguong` (
  `ma_phien_ban` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `ma_bam` char(66) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `noi_dung` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`noi_dung`)),
  `ghi_chu` varchar(255) DEFAULT NULL,
  `ma_giao_dich_blockchain` char(66) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`ma_phien_ban`),
  UNIQUE KEY `uq_phien_ban_nguong_bam` (`ma_bam`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `phien_ban_nguong`
--

LOCK TABLES `phien_ban_nguong` WRITE;
/*!40000 ALTER TABLE `phien_ban_nguong` DISABLE KEYS */;
/*!40000 ALTER TABLE `phien_ban_nguong` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `phieu_xuat_kho`
--

DROP TABLE IF EXISTS `phieu_xuat_kho`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
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
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`ma_phieu`),
  KEY `idx_pxk_npp` (`ma_nha_phan_phoi`,`trang_thai`),
  KEY `idx_pxk_dai_ly` (`ma_dai_ly`),
  KEY `idx_pxk_lo` (`ma_lo_nong_san`),
  KEY `fk_phieu_xuat_lo_xuat` (`ma_lo_xuat`),
  KEY `fk_phieu_xuat_van_don` (`ma_van_don`),
  CONSTRAINT `fk_phieu_xuat_lo_xuat` FOREIGN KEY (`ma_lo_xuat`) REFERENCES `lo_nong_san` (`ma_lo_nong_san`) ON UPDATE CASCADE,
  CONSTRAINT `fk_phieu_xuat_van_don` FOREIGN KEY (`ma_van_don`) REFERENCES `lenh_van_chuyen` (`ma_van_don`) ON UPDATE CASCADE,
  CONSTRAINT `fk_pxk_dai_ly` FOREIGN KEY (`ma_dai_ly`) REFERENCES `dai_ly` (`ma_dai_ly`) ON UPDATE CASCADE,
  CONSTRAINT `fk_pxk_lo` FOREIGN KEY (`ma_lo_nong_san`) REFERENCES `lo_nong_san` (`ma_lo_nong_san`) ON UPDATE CASCADE,
  CONSTRAINT `fk_pxk_npp` FOREIGN KEY (`ma_nha_phan_phoi`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `phieu_xuat_kho`
--

LOCK TABLES `phieu_xuat_kho` WRITE;
/*!40000 ALTER TABLE `phieu_xuat_kho` DISABLE KEYS */;
INSERT INTO `phieu_xuat_kho` VALUES
('DEMOPXK01','DEMONPP01','DEMODL01','DEMOLO07B',NULL,NULL,3500.000,'kg','DV_VAN_CHUYEN',NULL,'Tài Xế Demo 5','51C-00005','DA_GIAO',NULL,'2026-09-30 08:00:00','2026-09-30 14:00:00','2026-10-15 00:18:12','2026-10-15 00:18:12'),
('DEMOPXK02','DEMONPP01','DEMODL02','DEMOLO08B',NULL,NULL,900.000,'kg','TU_GIAO',NULL,NULL,NULL,'CHO_XUAT',NULL,NULL,NULL,'2026-10-15 00:18:12','2026-10-15 00:18:12'),
('PXK-0001','DEMONPP01','DEMODL01','DEMOLO08B',NULL,NULL,500.000,'kg','DV_VAN_CHUYEN','GHTK','Nguyên',NULL,'CHO_XUAT',NULL,NULL,NULL,'2026-10-17 15:43:44','2026-10-17 15:43:44');
/*!40000 ALTER TABLE `phieu_xuat_kho` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quyen_thao_tac_lo`
--

DROP TABLE IF EXISTS `quyen_thao_tac_lo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `quyen_thao_tac_lo` (
  `ma_quyen` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `ma_nguoi_dung` varchar(50) NOT NULL,
  `ma_lo_nong_san` varchar(64) NOT NULL,
  `loai_quyen_duoc_cap` enum('WRITE_EVENT','TRANSFER','LINK_RELATION') NOT NULL,
  `trang_thai_quyen` tinyint(1) NOT NULL DEFAULT 1,
  `thoi_diem_cap_quyen` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`ma_quyen`),
  UNIQUE KEY `uq_quyen_nguoi_lo_loai` (`ma_nguoi_dung`,`ma_lo_nong_san`,`loai_quyen_duoc_cap`),
  KEY `idx_quyen_lo` (`ma_lo_nong_san`,`trang_thai_quyen`),
  KEY `idx_quyen_nguoi` (`ma_nguoi_dung`,`trang_thai_quyen`),
  CONSTRAINT `fk_quyen_lo_nong_san` FOREIGN KEY (`ma_lo_nong_san`) REFERENCES `lo_nong_san` (`ma_lo_nong_san`) ON UPDATE CASCADE,
  CONSTRAINT `fk_quyen_nguoi_dung` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quyen_thao_tac_lo`
--

LOCK TABLES `quyen_thao_tac_lo` WRITE;
/*!40000 ALTER TABLE `quyen_thao_tac_lo` DISABLE KEYS */;
/*!40000 ALTER TABLE `quyen_thao_tac_lo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `san_pham_nong_san`
--

DROP TABLE IF EXISTS `san_pham_nong_san`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `san_pham_nong_san` (
  `ma_san_pham` varchar(50) NOT NULL,
  `ten_san_pham` varchar(150) NOT NULL,
  `loai_san_pham` varchar(100) NOT NULL,
  `mo_ta_san_pham` text DEFAULT NULL,
  `don_vi_tinh_mac_dinh` varchar(30) NOT NULL,
  `trang_thai` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`ma_san_pham`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `san_pham_nong_san`
--

LOCK TABLES `san_pham_nong_san` WRITE;
/*!40000 ALTER TABLE `san_pham_nong_san` DISABLE KEYS */;
INSERT INTO `san_pham_nong_san` VALUES
('DEMOSP01','Xoài Cát Chu Demo','Trái cây',NULL,'kg',1,'2026-10-15 00:18:12','2026-10-15 00:18:12'),
('SP001','Xoải Cát Chu','Trái Cây',NULL,'tan',1,'2026-09-27 05:56:50','2026-09-27 05:56:50'),
('SP002','Quýt Đường','Trái Cây','Quýt đường ngọt mọng nước miền Tây','kg',1,'2026-10-07 23:28:35','2026-10-07 23:28:35'),
('SP003','Lúa vụ đông xuân 2026','Nông sản',NULL,'kg',1,'2026-10-11 19:12:20','2026-10-17 15:51:03'),
('SP004','Mùa vụ Quýt Đường','Nông sản',NULL,'kg',1,'2026-10-17 11:48:34','2026-10-17 11:48:34'),
('SP005','Mùa vụ Quýt Đường 2025','Nông sản',NULL,'kg',1,'2026-10-17 15:30:12','2026-10-17 15:30:12'),
('SP006','quýt sành','Nông sản',NULL,'kg',1,'2026-10-17 16:43:56','2026-10-17 16:43:56');
/*!40000 ALTER TABLE `san_pham_nong_san` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `so_che_lo_hang`
--

DROP TABLE IF EXISTS `so_che_lo_hang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
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
  `da_ghi_chuoi` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`ma_so_che`),
  UNIQUE KEY `uq_soche_lo_moi` (`ma_lo_moi`),
  KEY `idx_soche_co_so` (`ma_co_so`,`giai_doan_so_che`),
  CONSTRAINT `fk_soche_co_so` FOREIGN KEY (`ma_co_so`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE,
  CONSTRAINT `fk_soche_lo_moi` FOREIGN KEY (`ma_lo_moi`) REFERENCES `lo_nong_san` (`ma_lo_nong_san`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `so_che_lo_hang`
--

LOCK TABLES `so_che_lo_hang` WRITE;
/*!40000 ALTER TABLE `so_che_lo_hang` DISABLE KEYS */;
INSERT INTO `so_che_lo_hang` VALUES
('DEMOSC-LOT07','DEMOSC01','DEMOLO07B','Xoài Cát Chu Demo - Đóng thùng xuất khẩu','Khu đóng thùng lạnh B','Phân loại size > 250g, khử khuẩn ozon, đóng thùng 20kg','DA_HOAN_TAT','2026-09-25','2026-09-27','2026-10-15 00:18:12','2026-10-15 00:18:12',0),
('DEMOSC-LOT08','DEMOSC01','DEMOLO08B','Xoài Cát Chu Demo - Túi lưới bán lẻ','Dây chuyền rửa Ozon A','Phân loại size > 200g, đóng túi lưới 2kg','DA_HOAN_TAT','2026-09-24','2026-09-26','2026-10-15 00:18:12','2026-10-15 00:18:12',0),
('DEMOSC-LOT09','DEMOSC01','DEMOLO09B','Xoài Cát Chu Demo - Sẵn sàng bàn giao','Khu đóng thùng lạnh B','Phân loại size > 250g, đóng thùng 20kg','DA_HOAN_TAT','2026-10-12','2026-10-13','2026-10-15 00:24:28','2026-10-15 00:24:28',0),
('SC001','SC001','LO002','Quýt đường loại 1','Dây chuyền rửa Ozon A',NULL,'DA_HOAN_TAT','2026-10-12','2026-10-12','2026-10-12 19:35:53','2026-10-12 19:37:21',0),
('SC002','SC001','LO004','quýt loại 1','Dây chuyền rửa Ozon A',NULL,'DANG_RUA_KHU_KHUAN','2026-10-14',NULL,'2026-10-14 23:40:20','2026-10-14 23:40:20',0),
('SC003','DEMOSC01','LO005','Xoài Cát Chu Loại 1','Dây chuyền rửa Ozon A',NULL,'DANG_RUA_KHU_KHUAN','2026-10-15',NULL,'2026-10-15 07:27:53','2026-10-15 07:27:53',0),
('SC004','DEMOSC01','LO006','Xoài','Dây chuyền rửa Ozon A',NULL,'DANG_PHAN_LOAI','2026-10-15',NULL,'2026-10-15 07:28:37','2026-10-17 12:31:01',0),
('SC005','DEMOSC01','LO008','Quýt đường size L','Dây chuyền rửa Ozon A',NULL,'DA_HOAN_TAT','2026-10-17','2026-10-17','2026-10-17 12:30:34','2026-10-17 12:31:15',0),
('SC006','DEMOSC01','LO011','Xoài cát','Dây chuyền rửa Ozon A',NULL,'DA_HOAN_TAT','2026-10-17','2026-10-17','2026-10-17 15:39:33','2026-10-17 15:40:27',0);
/*!40000 ALTER TABLE `so_che_lo_hang` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `thua_dat`
--

DROP TABLE IF EXISTS `thua_dat`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `thua_dat` (
  `ma_thua_dat` varchar(50) NOT NULL,
  `ma_nong_trai` varchar(50) NOT NULL,
  `ten_thua_dat` varchar(150) NOT NULL,
  `dien_tich` decimal(12,2) DEFAULT NULL,
  `loai_dat` varchar(100) DEFAULT NULL,
  `trang_thai` enum('DAT_TRONG','DANG_CANH_TAC','TAM_NGUNG') NOT NULL DEFAULT 'DAT_TRONG',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`ma_thua_dat`),
  KEY `fk_thua_dat_nong_trai` (`ma_nong_trai`),
  CONSTRAINT `fk_thua_dat_nong_trai` FOREIGN KEY (`ma_nong_trai`) REFERENCES `nong_trai` (`ma_nong_trai`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `thua_dat`
--

LOCK TABLES `thua_dat` WRITE;
/*!40000 ALTER TABLE `thua_dat` DISABLE KEYS */;
INSERT INTO `thua_dat` VALUES
('DEMOLAND01','DEMOFARM01','Thửa Demo A1',6.00,'Đất phù sa','DANG_CANH_TAC','2026-10-15 00:18:12','2026-10-15 00:18:12'),
('DEMOLAND02','DEMOFARM01','Thửa Demo A2',4.50,'Đất phù sa','DANG_CANH_TAC','2026-10-15 00:18:12','2026-10-15 00:18:12'),
('TD001','NT001','Thửa A1-1',2.50,'Đất phù sa','DANG_CANH_TAC','2026-10-03 12:39:50','2026-10-03 12:39:50'),
('TD002','NT001','Thửa A1-2',2.50,'Đất phù sa','DANG_CANH_TAC','2026-10-03 12:39:50','2026-10-07 09:55:12'),
('TD003','NT002','A1-3',100.00,'Đất phù sa','DANG_CANH_TAC','2026-10-07 11:35:01','2026-10-07 11:35:01'),
('TD004','NT003','A1-3',50.00,'phù sa','DAT_TRONG','2026-10-17 11:18:47','2026-10-17 16:43:56'),
('TD005','NT003','A1-2',50.00,'Đất phù sa','DAT_TRONG','2026-10-17 11:43:20','2026-10-17 15:30:12'),
('TD006','NT004','ùtgf',20.00,'ghigu','DANG_CANH_TAC','2026-10-17 13:05:38','2026-10-17 13:07:09');
/*!40000 ALTER TABLE `thua_dat` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vi_blockchain`
--

DROP TABLE IF EXISTS `vi_blockchain`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `vi_blockchain` (
  `dia_chi_vi` char(42) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `ma_nguoi_dung` varchar(50) NOT NULL,
  `thoi_diem_dang_ky` datetime NOT NULL DEFAULT current_timestamp(),
  `trang_thai` tinyint(1) NOT NULL DEFAULT 1,
  `trang_thai_duyet` enum('CHO_DUYET','DA_DUYET','TU_CHOI') NOT NULL DEFAULT 'CHO_DUYET',
  `tx_gan_vai_tro` char(66) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `thoi_diem_duyet` datetime DEFAULT NULL,
  PRIMARY KEY (`dia_chi_vi`),
  UNIQUE KEY `uq_vi_blockchain_nguoi_dung` (`ma_nguoi_dung`),
  CONSTRAINT `fk_vi_blockchain_nguoi_dung` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vi_blockchain`
--

LOCK TABLES `vi_blockchain` WRITE;
/*!40000 ALTER TABLE `vi_blockchain` DISABLE KEYS */;
/*!40000 ALTER TABLE `vi_blockchain` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vi_blockchain_nonce`
--

DROP TABLE IF EXISTS `vi_blockchain_nonce`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `vi_blockchain_nonce` (
  `ma_nguoi_dung` varchar(50) NOT NULL,
  `nonce` char(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `het_han` datetime NOT NULL,
  PRIMARY KEY (`ma_nguoi_dung`),
  CONSTRAINT `fk_vi_nonce_nguoi_dung` FOREIGN KEY (`ma_nguoi_dung`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vi_blockchain_nonce`
--

LOCK TABLES `vi_blockchain_nonce` WRITE;
/*!40000 ALTER TABLE `vi_blockchain_nonce` DISABLE KEYS */;
/*!40000 ALTER TABLE `vi_blockchain_nonce` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `yeu_cau_cap_tai_khoan`
--

DROP TABLE IF EXISTS `yeu_cau_cap_tai_khoan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `yeu_cau_cap_tai_khoan` (
  `ma_yeu_cau` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
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
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`ma_yeu_cau`),
  KEY `idx_yeu_cau_trang_thai` (`trang_thai_duyet`),
  KEY `fk_yeu_cau_nguoi_duyet` (`ma_nguoi_duyet`),
  KEY `fk_yeu_cau_nguoi_dung_tao` (`ma_nguoi_dung_tao`),
  CONSTRAINT `fk_yeu_cau_nguoi_dung_tao` FOREIGN KEY (`ma_nguoi_dung_tao`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_yeu_cau_nguoi_duyet` FOREIGN KEY (`ma_nguoi_duyet`) REFERENCES `nguoi_dung` (`ma_nguoi_dung`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `yeu_cau_cap_tai_khoan`
--

LOCK TABLES `yeu_cau_cap_tai_khoan` WRITE;
/*!40000 ALTER TABLE `yeu_cau_cap_tai_khoan` DISABLE KEYS */;
INSERT INTO `yeu_cau_cap_tai_khoan` VALUES
(1,'FARMER_COOP','Hoàng Nguyễn','0393194321','hoang114890@gmail.com','Hợp Tác Xã Nông Nghiệp Xannh','cần Thơ','','APPROVED','ND002',NULL,'ADMIN001','2026-10-17 15:23:01','2026-10-17 15:22:33','2026-10-17 15:23:01');
/*!40000 ALTER TABLE `yeu_cau_cap_tai_khoan` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed
