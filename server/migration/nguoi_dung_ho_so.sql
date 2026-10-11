-- Migration: hồ sơ cá nhân (email, địa chỉ, ảnh đại diện) cho mọi tài khoản
-- Chạy sau khi đã import truy_xuat_nong_san.sql:
--   mysql -u <user> -p truy_xuat_nong_san < server/migration/nguoi_dung_ho_so.sql

SET NAMES utf8mb4;

ALTER TABLE `nguoi_dung`
  ADD COLUMN IF NOT EXISTS `email` varchar(150) DEFAULT NULL AFTER `so_dien_thoai`,
  ADD COLUMN IF NOT EXISTS `dia_chi` varchar(255) DEFAULT NULL AFTER `email`,
  ADD COLUMN IF NOT EXISTS `anh_dai_dien` varchar(500) DEFAULT NULL AFTER `dia_chi`;
