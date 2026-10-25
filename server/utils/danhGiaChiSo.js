// Công thức duy nhất đánh giá 1 chỉ số kiểm định Đạt / Không đạt.
// Dùng chung cho trang chi tiết hồ sơ, danh sách lịch hẹn, tra cứu người dùng và bước công bố chứng nhận.
// Nguồn quy tắc: bảng nguong_kiem_dinh_chuan (toan_tu_so_sanh, nguong_toi_da); giá trị đo: chi_so_kiem_dinh.gia_tri

// Lấy số đầu chuỗi; chấp nhận dấu phẩy thập phân kiểu Việt Nam ("0,1" = 0.1)
function parseMeasured(valStr) {
  const m = valStr.replace(",", ".").match(/^-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function evaluateResult(rawValue, rule) {
  if (!rule) return true;

  const valStr = String(rawValue ?? "")
    .trim()
    .toLowerCase();
  if (valStr === "") return false;

  const operator = rule.toan_tu_so_sanh;
  const threshold =
    rule.nguong_toi_da !== null && rule.nguong_toi_da !== undefined
      ? Number(rule.nguong_toi_da)
      : null;
  const measuredVal = parseMeasured(valStr);

  // ÂM TÍNH (hoạt chất cấm, Salmonella,...): đạt khi ghi âm tính / không phát hiện / <ngưỡng, hoặc số đo <= ngưỡng
  if (operator === "AM_TINH") {
    if (
      valStr.includes("âm tính") ||
      valStr.includes("không phát hiện") ||
      valStr.includes("khong phat hien") ||
      valStr.includes("negative") ||
      valStr.startsWith("<")
    ) {
      return true;
    }
    if (measuredVal !== null) {
      if (measuredVal === 0) return true;
      if (threshold !== null && !isNaN(threshold)) {
        return measuredVal <= threshold;
      }
    }
    return false;
  }

  // Định tính (không có số): chỉ coi là đạt khi ghi rõ đạt / âm tính
  if (measuredVal === null) {
    if (/kh[oô]ng\s*(đạt|dat)|dương|duong|positive/.test(valStr)) return false;
    return (
      valStr.includes("đạt") ||
      valStr.includes("dat") ||
      valStr.includes("âm") ||
      valStr.includes("am")
    );
  }

  if (threshold === null || isNaN(threshold)) return true;

  switch (operator) {
    case "<=":
      return measuredVal <= threshold;
    case "<":
      return measuredVal < threshold;
    case ">=":
      return measuredVal >= threshold;
    case ">":
      return measuredVal > threshold;
    case "BANG":
      return Math.abs(measuredVal - threshold) < 0.0001;
    default:
      return measuredVal <= threshold;
  }
}

// Một hồ sơ đạt khi có ít nhất 1 chỉ số và mọi chỉ số có ngưỡng đều đạt
function allIndicatorsPass(indicators) {
  if (!indicators || indicators.length === 0) return false;
  return indicators.every(
    (cs) =>
      !cs.toan_tu_so_sanh ||
      evaluateResult(cs.gia_tri, {
        toan_tu_so_sanh: cs.toan_tu_so_sanh,
        nguong_toi_da: cs.nguong_toi_da,
      }),
  );
}

module.exports = { evaluateResult, allIndicatorsPass };
