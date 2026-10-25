/**
 * Ràng buộc diện tích giữa nông trại và các thửa đất (đơn vị: ha).
 * Tổng diện tích các thửa đất của một nông trại không được vượt diện tích nông trại.
 * Nông trại chưa nhập diện tích thì chưa thể đối chiếu nên không chặn.
 * Các hàm trả về chuỗi thông báo lỗi, hoặc null nếu hợp lệ.
 */

// Sai số làm tròn: cột diện tích lưu 2 chữ số thập phân
const EPS = 0.005;

const fmt = (n) =>
  Number(n).toLocaleString("vi-VN", { maximumFractionDigits: 2 });

const getFarmArea = async (executor, maNongTrai) => {
  const [rows] = await executor.execute(
    `SELECT dien_tich_nong_trai FROM nong_trai WHERE ma_nong_trai = ? LIMIT 1`,
    [maNongTrai],
  );

  if (rows.length === 0 || rows[0].dien_tich_nong_trai === null) return null;

  const area = Number(rows[0].dien_tich_nong_trai);
  return Number.isFinite(area) && area > 0 ? area : null;
};

const getPlotsTotal = async (executor, maNongTrai, boQuaMaThua = null) => {
  const [rows] = await executor.execute(
    `
    SELECT COALESCE(SUM(dien_tich), 0) AS tong
    FROM thua_dat
    WHERE ma_nong_trai = ?
      AND (? IS NULL OR ma_thua_dat <> ?)
    `,
    [maNongTrai, boQuaMaThua, boQuaMaThua],
  );

  return Number(rows[0].tong) || 0;
};

// Thêm / sửa một thửa đất (boQuaMaThua = mã thửa đang sửa, không tính vào tổng đã chia)
const kiemTraDienTichThua = async (
  executor,
  maNongTrai,
  dienTichThua,
  boQuaMaThua = null,
) => {
  if (dienTichThua === null || dienTichThua === undefined) return null;

  const dienTichNongTrai = await getFarmArea(executor, maNongTrai);
  if (dienTichNongTrai === null) return null;

  if (Number(dienTichThua) > dienTichNongTrai + EPS) {
    return `Diện tích thửa đất (${fmt(dienTichThua)} ha) không được lớn hơn diện tích nông trại (${fmt(dienTichNongTrai)} ha)`;
  }

  const daChia = await getPlotsTotal(executor, maNongTrai, boQuaMaThua);

  if (daChia + Number(dienTichThua) > dienTichNongTrai + EPS) {
    const conLai = Math.max(0, dienTichNongTrai - daChia);
    return `Tổng diện tích các thửa đất sẽ vượt diện tích nông trại (${fmt(dienTichNongTrai)} ha). Các thửa khác đã dùng ${fmt(daChia)} ha, chỉ còn tối đa ${fmt(conLai)} ha`;
  }

  return null;
};

// Sửa diện tích nông trại: không được nhỏ hơn tổng diện tích các thửa đã chia
const kiemTraDienTichNongTrai = async (executor, maNongTrai, dienTichMoi) => {
  if (dienTichMoi === null || dienTichMoi === undefined) return null;

  const daChia = await getPlotsTotal(executor, maNongTrai);

  if (daChia > Number(dienTichMoi) + EPS) {
    return `Diện tích nông trại (${fmt(dienTichMoi)} ha) không được nhỏ hơn tổng diện tích các thửa đất đã chia (${fmt(daChia)} ha)`;
  }

  return null;
};

module.exports = { kiemTraDienTichThua, kiemTraDienTichNongTrai };
