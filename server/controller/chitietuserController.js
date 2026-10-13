const db = require("../config/db");

/**
 * Hàm so sánh giá trị thực tế với ngưỡng chuẩn trong CSDL
 */
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

  // Tách giá trị số từ chuỗi nhập vào
  const numericMatch = valStr.match(/^-?\d+(\.\d+)?/);
  const measuredVal = numericMatch ? parseFloat(numericMatch[0]) : null;

  // Kiểm tra trường hợp ÂM TÍNH (hoạt chất cấm, salmonella,...)
  if (operator === "AM_TINH") {
    if (
      valStr.includes("âm tính") ||
      valStr.includes("am tinh") ||
      valStr.includes("âm") ||
      valStr.includes("am") ||
      valStr.includes("không phát hiện") ||
      valStr.includes("khong phat hien") ||
      valStr.includes("negative") ||
      valStr.startsWith("<")
    ) {
      return true;
    }

    if (measuredVal !== null) {
      // Nhập bằng 0 hoặc 0.00... thì luôn đạt
      if (measuredVal === 0) return true;
      // Khi ngưỡng chuẩn = 0 hoặc null, giá trị dương nhỏ được coi là LOD của thiết bị đo
      if (threshold === null || isNaN(threshold) || threshold === 0) return true;
      return measuredVal <= threshold;
    }
    return false;
  }

  // Trường hợp so sánh định lượng thông thường không chứa số
  if (measuredVal === null) {
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

/**
 * Controller lấy chi tiết kiểm định cho User (quét mã QR / tra cứu)
 * Hỗ trợ tra cứu theo mã kiểm định, mã hồ sơ, số chứng nhận hoặc mã lô hàng (cả lô gốc lẫn lô chế biến/sơ chế)
 */
const getChiTietKiemDinh = async (req, res) => {
  try {
    const { makiemdinh, malohang } = req.query;
    const searchCode = (makiemdinh || malohang || "").trim();

    if (!searchCode) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp mã kiểm định hoặc mã lô hàng để tra cứu.",
      });
    }

    // 1. Truy vấn thông tin kiểm định và lô hàng
    let sqlKd = `
      SELECT 
        kd.ma_kiem_dinh,
        kd.ma_ho_so,
        kd.ma_lo_nong_san,
        kd.tieu_chuan_dang_ky,
        kd.so_chung_nhan,
        kd.hieu_luc_tu,
        kd.hieu_luc_den,
        kd.ngay_hen_lay_mau,
        kd.gio_hen_lay_mau,
        kd.kiem_dinh_vien,
        kd.ma_niem_phong,
        kd.khoi_luong_mau,
        kd.thoi_gian_lay_mau,
        kd.ket_luan,
        kd.trang_thai_ho_so,
        kd.created_at AS ngay_tao_kd,
        kd.updated_at AS ngay_cap_nhat_kd,
        lo_hientai.ma_lo_nong_san AS ma_lo_hien_tai,
        lo_hientai.so_luong_hien_tai,
        lo_hientai.don_vi_tinh AS dvt_lo,
        sp.ma_san_pham,
        sp.ten_san_pham,
        sp.loai_san_pham,
        mv.ma_mua_vu,
        td.ten_thua_dat,
        nt.ma_nong_trai,
        nt.ten_nong_trai,
        nt.dia_diem_nong_trai,
        nd.ho_ten AS ten_chu_nong_trai,
        nd.so_dien_thoai AS sdt_chu_nong_trai
      FROM kiem_dinh_lo_hang kd
      JOIN lo_nong_san lo_goc ON kd.ma_lo_nong_san = lo_goc.ma_lo_nong_san
      LEFT JOIN lien_ket_nguon_goc_lo lk ON kd.ma_lo_nong_san = lk.ma_lo_nguon
      JOIN lo_nong_san lo_hientai ON (
        lo_hientai.ma_lo_nong_san = kd.ma_lo_nong_san 
        OR lo_hientai.ma_lo_nong_san = lk.ma_lo_duoc_tao_ra
      )
      JOIN san_pham_nong_san sp ON lo_hientai.ma_san_pham = sp.ma_san_pham
      LEFT JOIN mua_vu mv ON (lo_goc.ma_mua_vu = mv.ma_mua_vu OR lo_hientai.ma_mua_vu = mv.ma_mua_vu)
      LEFT JOIN thua_dat td ON mv.ma_thua_dat = td.ma_thua_dat
      LEFT JOIN nong_trai nt ON mv.ma_nong_trai = nt.ma_nong_trai
      LEFT JOIN nguoi_dung nd ON nt.ma_nguoi_dung = nd.ma_nguoi_dung
      WHERE 
        kd.ma_kiem_dinh = ? 
        OR kd.so_chung_nhan = ? 
        OR kd.ma_ho_so = ?
        OR kd.ma_lo_nong_san = ?
        OR lo_hientai.ma_lo_nong_san = ?
        OR lk.ma_lo_duoc_tao_ra = ?
      ORDER BY kd.created_at DESC 
      LIMIT 1
    `;

    const [rowsKd] = await db.query(sqlKd, [
      searchCode,
      searchCode,
      searchCode,
      searchCode,
      searchCode,
      searchCode,
    ]);

    if (rowsKd.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy hồ sơ kiểm định tương ứng với mã "${searchCode}".`,
      });
    }

    const kiemDinhData = rowsKd[0];
    const maKiemDinhActual = kiemDinhData.ma_kiem_dinh;
    const maLoTruyVet = kiemDinhData.ma_lo_hien_tai || kiemDinhData.ma_lo_nong_san;

    // 2. Truy vấn danh sách chỉ số kiểm định và đối chiếu ngưỡng chuẩn
    const sqlChiSo = `
      SELECT 
        cs.ma_chi_so_kd,
        cs.loai_chi_so,
        cs.ma_chi_so,
        cs.ten_chi_so,
        cs.gia_tri,
        cs.thu_tu,
        n.phuong_phap_thu,
        n.toan_tu_so_sanh,
        n.nguong_toi_da,
        n.don_vi_tinh,
        n.mo_ta_nguong
      FROM chi_so_kiem_dinh cs
      LEFT JOIN nguong_kiem_dinh_chuan n 
        ON (cs.ma_chi_so = n.ma_chi_so OR cs.ten_chi_so = n.ten_chi_tiet_chat)
        AND (n.tieu_chuan_ap_dung = ? OR n.tieu_chuan_ap_dung = 'TAT_CA')
        AND (n.ma_san_pham IS NULL OR n.ma_san_pham = ?)
        AND n.trang_thai = 1
      WHERE cs.ma_kiem_dinh = ?
      ORDER BY cs.thu_tu ASC, cs.ma_chi_so_kd ASC
    `;

    const [chiSoRows] = await db.query(sqlChiSo, [
      kiemDinhData.tieu_chuan_dang_ky,
      kiemDinhData.ma_san_pham,
      maKiemDinhActual,
    ]);

    // Lọc loại bỏ trùng lặp (giữ dòng có thông tin ngưỡng chuẩn cụ thể)
    const uniqueChiSoMap = new Map();
    for (const item of chiSoRows) {
      const key = item.ma_chi_so_kd || item.ma_chi_so || item.ten_chi_so;
      if (!uniqueChiSoMap.has(key)) {
        uniqueChiSoMap.set(key, item);
      } else {
        const existing = uniqueChiSoMap.get(key);
        // Ưu tiên dòng có toan_tu_so_sanh
        if (!existing.toan_tu_so_sanh && item.toan_tu_so_sanh) {
          uniqueChiSoMap.set(key, item);
        }
      }
    }
    const uniqueRows = Array.from(uniqueChiSoMap.values());

    // Đánh giá từng chỉ số
    let coChiSoHong = false;
    const danhSachChiSo = uniqueRows.map((item) => {
      let isPass = true;
      let nguongHienThi = item.mo_ta_nguong || "Theo quy chuẩn an toàn";
      let pPhuongPhap = item.phuong_phap_thu || "Phương pháp chuẩn TCVN";

      if (item.toan_tu_so_sanh) {
        isPass = evaluateResult(item.gia_tri, {
          toan_tu_so_sanh: item.toan_tu_so_sanh,
          nguong_toi_da: item.nguong_toi_da,
        });
        if (!isPass) coChiSoHong = true;
      } else {
        // Nếu không có công thức so sánh tự động, kiểm tra các từ khóa đạt chuẩn thông dụng
        const strVal = String(item.gia_tri || "").toLowerCase();
        if (
          strVal.includes("không đạt") ||
          strVal.includes("khong dat") ||
          strVal.includes("positive") ||
          strVal.includes("dương tính")
        ) {
          isPass = false;
          coChiSoHong = true;
        }
      }

      return {
        ma_chi_so_kd: item.ma_chi_so_kd,
        loai_chi_so: item.loai_chi_so,
        ma_chi_so: item.ma_chi_so,
        ten_chi_so: item.ten_chi_so,
        phuong_phap_thu: pPhuongPhap,
        gia_tri: item.gia_tri,
        nguong_tieu_chuan: nguongHienThi,
        is_pass: isPass ? 1 : 0,
        danh_gia: isPass ? "Đạt" : "Không đạt",
      };
    });

    // Xác định tổng kết lab
    const ketLuanCu = (kiemDinhData.ket_luan || "").toUpperCase();
    const tongKetLab =
      ketLuanCu === "PASSED" || (!coChiSoHong && danhSachChiSo.length > 0)
        ? "DAT"
        : "KHONG_DAT";

    kiemDinhData.tong_ket_lab = tongKetLab;

    // 3. Lấy dòng sự kiện lịch sử (Timeline)
    const sqlTimeline = `
      SELECT 
        ma_lich_su,
        loai_hoat_dong,
        thoi_diem_xay_ra,
        du_lieu_chi_tiet,
        ma_bam_su_kien_hien_tai,
        ma_giao_dich_blockchain,
        blockchain_sync_status
      FROM lich_su_truy_xuat_lo
      WHERE ma_lo_nong_san IN (?, ?)
      ORDER BY so_thu_tu_su_kien DESC, thoi_diem_xay_ra DESC
    `;

    const [rowsTimeline] = await db.query(sqlTimeline, [
      kiemDinhData.ma_lo_nong_san,
      maLoTruyVet,
    ]);

    return res.status(200).json({
      success: true,
      data: {
        kiem_dinh: kiemDinhData,
        chi_so: danhSachChiSo,
        lich_su: rowsTimeline,
      },
    });
  } catch (error) {
    console.error("Lỗi getChiTietKiemDinh trong chitietuserController:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ",
      error: error.message,
    });
  }
};

module.exports = {
  getChiTietKiemDinh,
};
