const { ghiSuKienVanDon } = require("./hook");
const { apDungKetQuaVanDon } = require("./ghiNhan");
const { layCauHinh } = require("./chainClient");

// Bước của lệnh vận chuyển đã bấm và đang chờ ký (tránh tạo trùng sự kiện khi bấm lại)
const daCoBuocChoKy = async (executor, maVanDon, loai) => {
  const [rows] = await executor.query(
    `
    SELECT ma_lich_su FROM lich_su_truy_xuat_lo
    WHERE loai_hoat_dong = ? AND blockchain_sync_status <> 'CONFIRMED'
      AND JSON_UNQUOTE(JSON_EXTRACT(du_lieu_chi_tiet, '$.du_lieu.ma_van_don')) = ?
    LIMIT 1
    `,
    [loai, maVanDon],
  );
  return rows.length > 0;
};

// Một bước có ký của lệnh vận chuyển (nhập kho, từ chối, xuất kho, tới nơi, đại lý nhận...): tạo sự kiện chờ ký kèm thay đổi
// sẽ áp dụng sau khi ký (apDung). Trả true nếu đang chờ ký (hồ sơ chưa đổi); false nếu không có gì để ký và đã áp dụng ngay
// (chưa cấu hình blockchain hoặc lô cũ không được theo dõi). Gọi lại khi đã có yêu cầu chờ ký thì không tạo thêm.
const thucHienBuocCoKy = async (
  connection,
  maVanDon,
  loai,
  maNguoiKy,
  duLieuThem,
  apDung,
) => {
  if (await daCoBuocChoKy(connection, maVanDon, loai)) return true;

  const suKien = await ghiSuKienVanDon(
    connection,
    maVanDon,
    loai,
    maNguoiKy,
    duLieuThem,
    apDung,
  );
  if (!layCauHinh().daCauHinh || !suKien) {
    await apDungKetQuaVanDon(connection, maVanDon, apDung);
    return false;
  }
  return true;
};

module.exports = { daCoBuocChoKy, thucHienBuocCoKy };
