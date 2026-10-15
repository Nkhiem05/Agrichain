-- Thêm trạng thái "sẵn sàng thu hoạch" cho mùa vụ, phục vụ luồng:
-- nông dân đánh dấu mùa vụ sẵn sàng -> chỉ mùa vụ sẵn sàng mới chọn được khi
-- tạo lô thu hoạch -> sau khi tạo lô thành công, mùa vụ chuyển sang DA_TAO_LO
-- và biến mất khỏi danh sách "Quản lý mùa vụ".
ALTER TABLE mua_vu
  ADD COLUMN trang_thai_thu_hoach
    ENUM('CHUA_SAN_SANG', 'DA_SAN_SANG', 'DA_TAO_LO')
    NOT NULL DEFAULT 'CHUA_SAN_SANG'
    AFTER trang_thai;
