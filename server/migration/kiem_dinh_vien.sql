-- Quản lý kiểm định viên của cơ quan kiểm định
-- Chạy 1 lần (chạy lại nhiều lần vẫn an toàn). Chạy trên database đang dùng, ví dụ: agrichain_main
-- Yêu cầu MariaDB 10.2+ (XAMPP mặc định đáp ứng)

CREATE TABLE IF NOT EXISTS `kiem_dinh_vien` (
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

-- Hồ sơ kiểm định lưu thêm mã kiểm định viên được phân công (cột text kiem_dinh_vien cũ vẫn giữ để hiển thị/báo cáo)
ALTER TABLE `kiem_dinh_lo_hang`
  ADD COLUMN IF NOT EXISTS `ma_kiem_dinh_vien` varchar(50) DEFAULT NULL AFTER `kiem_dinh_vien`;

-- Dữ liệu ban đầu: 2 kiểm định viên từng được gán cứng trong giao diện, tạo cho mỗi cơ quan kiểm định (chỉ khi bảng còn trống)
INSERT INTO `kiem_dinh_vien` (`ma_kiem_dinh_vien`, `ma_co_quan`, `ho_ten`, `chuc_vu`)
SELECT CONCAT('KDV', LPAD(ROW_NUMBER() OVER (ORDER BY t.ma_nguoi_dung, t.stt), 3, '0')),
       t.ma_nguoi_dung, t.ho_ten, t.chuc_vu
FROM (
  SELECT nd.ma_nguoi_dung, s.stt, s.ho_ten, s.chuc_vu
  FROM `nguoi_dung` nd
  JOIN (
    SELECT 1 AS stt, 'KS. Trần Minh Tuấn' AS ho_ten, 'Phòng Giám định Trồng trọt' AS chuc_vu
    UNION ALL
    SELECT 2, 'ThS. Lê Hoàng Yến', 'Chuyên viên vi sinh'
  ) s
  WHERE nd.vai_tro = 'CERT_AUTHORITY'
) t
WHERE NOT EXISTS (SELECT 1 FROM `kiem_dinh_vien`);

-- Gắn mã kiểm định viên cho các hồ sơ cũ có tên trùng (giữ nguyên updated_at)
UPDATE `kiem_dinh_lo_hang` kd
JOIN `kiem_dinh_vien` v
  ON v.ma_co_quan = kd.ma_co_quan
 AND kd.kiem_dinh_vien = CONCAT(v.ho_ten, ' (', v.chuc_vu, ')')
SET kd.ma_kiem_dinh_vien = v.ma_kiem_dinh_vien,
    kd.updated_at = kd.updated_at
WHERE kd.ma_kiem_dinh_vien IS NULL;
