/**
 * Hàm sinh mã duy nhất tổng quát cho mọi bảng trong CSDL truy xuất nông sản
 * @param {string} tableName - Tên bảng (ví dụ: 'nguoi_dung', 'kiem_dinh_lo_hang', 'san_pham_nong_san')
 * @param {string} columnName - Tên cột mã (ví dụ: 'ma_nguoi_dung', 'ma_niem_phong', 'ma_kiem_dinh')
 * @param {string} prefix - Tiền tố quy định (ví dụ: 'CQKD', 'SEAL-QR-', 'KD-2026-', 'SP')
 * @param {number} padLength - Số chữ số padding (mặc định là 3 số: 001, 002...)
 * @param {boolean} isRandom - false: tự tăng lớn nhất + 1, true: sinh ngẫu nhiên và check trùng
 */
const generateUniqueCode = async (
  db,
  tableName,
  columnName,
  prefix,
  padLength = 3,
  isRandom = false,
) => {
  // ---------------------------------------------------------------
  // CHẾ ĐỘ 1: TỰ TĂNG TUẦN TỰ (Sequential)
  // Phù hợp: ma_co_quan, ma_kiem_dinh, ma_san_pham, ma_nong_trai,...
  // ---------------------------------------------------------------
  if (!isRandom) {
    // Sắp xếp theo độ dài chuỗi và giá trị để lấy mã số cao nhất chính xác
    const sql = `
      SELECT ${columnName} AS maxCode 
      FROM ${tableName} 
      WHERE ${columnName} LIKE ? 
      ORDER BY LENGTH(${columnName}) DESC, ${columnName} DESC 
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [`${prefix}%`]);

    let nextNumber = 1;
    if (rows.length > 0 && rows[0].maxCode) {
      const currentCode = rows[0].maxCode;
      // Cắt bỏ phần tiền tố để lấy phần số nguyên
      const numericPart = currentCode.substring(prefix.length);
      const parsedNum = parseInt(numericPart, 10);
      if (!isNaN(parsedNum)) {
        nextNumber = parsedNum + 1;
      }
    }

    // Đệm 0 theo độ dài padLength (ví dụ: 1 -> "001", 12 -> "012")
    return `${prefix}${String(nextNumber).padStart(padLength, "0")}`;
  }

  // ---------------------------------------------------------------
  // CHẾ ĐỘ 2: SINH NGẪU NHIÊN CÓ KIỂM TRA TRÙNG (Random & Verify)
  // Phù hợp: ma_niem_phong (sealCode), OTP, mã xác thực QR,...
  // ---------------------------------------------------------------
  let isUnique = false;
  let candidateCode = "";
  let attempts = 0;
  const maxAttempts = 10;

  const min = Math.pow(10, padLength - 1);
  const max = Math.pow(10, padLength) - 1;

  while (!isUnique && attempts < maxAttempts) {
    const randomNum = Math.floor(min + Math.random() * (max - min + 1));
    candidateCode = `${prefix}${randomNum}`;

    // Kiểm tra trực tiếp vào bảng xem mã đã tồn tại chưa
    const checkSql = `SELECT COUNT(*) AS total FROM ${tableName} WHERE ${columnName} = ?`;
    const [checkRows] = await db.query(checkSql, [candidateCode]);

    if (checkRows[0].total === 0) {
      isUnique = true;
      return candidateCode;
    }
    attempts++;
  }

  // Phương án dự phòng an toàn tuyệt đối: nếu ngẫu nhiên bị trùng, lấy đuôi timestamp
  return `${prefix}${Date.now().toString().slice(-padLength)}`;
};

module.exports = { generateUniqueCode };
