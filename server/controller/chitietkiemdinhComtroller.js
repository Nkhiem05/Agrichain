const db = require("../config/db"); // Kết nối MySQL pool/promise

/**
 * Hàm so sánh giá trị thực tế với ngưỡng chuẩn trong CSDL
 */
function evaluateResult(rawValue, rule) {
  if (!rule) return true;

  const valStr = String(rawValue || "")
    .trim()
    .toLowerCase();
  const operator = rule.toan_tu_so_sanh;
  const threshold = Number(rule.nguong_toi_da);

  // Kiểm tra trường hợp ÂM TÍNH (hoạt chất cấm, salmonella,...)
  if (operator === "AM_TINH") {
    return (
      valStr.includes("âm tính") ||
      valStr.includes("không phát hiện") ||
      valStr.includes("negative") ||
      valStr === "0" ||
      valStr.startsWith("<")
    );
  }

  // Tách giá trị số từ chuỗi nhập vào (ví dụ "0.02 mg/kg", "11.8 Brix")
  const numericMatch = valStr.match(/^-?\d+(\.\d+)?/);
  if (!numericMatch) {
    return false;
  }
  const measuredVal = parseFloat(numericMatch[0]);

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
      return true;
  }
}

/**
 * Lấy chi tiết hồ sơ kiểm định và so sánh ngưỡng (không tải bảng vật tư)
 */
const getChiTietKiemDinh = async (req, res) => {
  try {
    const { maKiemDinh } = req.params;

    // 1. Truy vấn thông tin kiểm định, lô hàng, mùa vụ, thửa đất / nông trại
    const [kdRows] = await db.query(
      `SELECT 
          kd.*,
          lns.ma_lo_nong_san, lns.so_luong_hien_tai, lns.don_vi_tinh AS dvt_lo,
          sp.ma_san_pham, sp.ten_san_pham, sp.loai_san_pham,
          mv.ma_mua_vu, mv.loai_cay_trong, mv.giong_cay,
          nt.ma_nong_trai, nt.ten_nong_trai, nt.dia_diem_nong_trai,
          nd.ho_ten AS ten_chu_nong_trai,
          td.ma_thua_dat, td.ten_thua_dat,
          COALESCE(td.dien_tich, nt.dien_tich_nong_trai, 0) AS dien_tich_canh_tac
       FROM kiem_dinh_lo_hang kd
       JOIN lo_nong_san lns ON kd.ma_lo_nong_san = lns.ma_lo_nong_san
       LEFT JOIN san_pham_nong_san sp ON lns.ma_san_pham = sp.ma_san_pham
       LEFT JOIN mua_vu mv ON lns.ma_mua_vu = mv.ma_mua_vu
       LEFT JOIN thua_dat td ON mv.ma_thua_dat = td.ma_thua_dat
       LEFT JOIN nong_trai nt ON mv.ma_nong_trai = nt.ma_nong_trai
       LEFT JOIN nguoi_dung nd ON nt.ma_nguoi_dung = nd.ma_nguoi_dung
       WHERE kd.ma_kiem_dinh = ? OR kd.so_chung_nhan = ?`,
      [maKiemDinh, maKiemDinh],
    );

    if (kdRows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy hồ sơ kiểm định" });
    }

    const data = kdRows[0];

    // 2. Truy vấn chỉ số kiểm định và liên kết với bảng ngưỡng chuẩn
    const [chiSoRows] = await db.query(
      `SELECT 
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
          ON cs.loai_chi_so = 'CO_DINH' 
          AND cs.ma_chi_so = n.ma_chi_so
          AND (n.tieu_chuan_ap_dung = ? OR n.tieu_chuan_ap_dung = 'TAT_CA')
          AND (n.ma_san_pham IS NULL OR n.ma_san_pham = ?)
          AND n.trang_thai = 1
       WHERE cs.ma_kiem_dinh = ?
       ORDER BY cs.thu_tu ASC, cs.ma_chi_so_kd ASC`,
      [data.tieu_chuan_dang_ky, data.ma_san_pham, data.ma_kiem_dinh],
    );

    // 3. Tự động kiểm tra Đạt / Không đạt từng chỉ số
    let coChiSoHong = false;
    const danhSachChiSo = chiSoRows.map((item) => {
      let isPass = true;
      let nguongHienThi = item.mo_ta_nguong || "Theo đánh giá kiểm định viên";
      let pphuongPhap = item.phuong_phap_thu || "TCVN";

      if (item.loai_chi_so === "CO_DINH" && item.toan_tu_so_sanh) {
        isPass = evaluateResult(item.gia_tri, {
          toan_tu_so_sanh: item.toan_tu_so_sanh,
          nguong_toi_da: item.nguong_toi_da,
        });
        if (!isPass) coChiSoHong = true;
      } else {
        nguongHienThi = "KĐV tự thẩm định";
        pphuongPhap = "Phương pháp thực địa";
      }

      return {
        ma_chi_so_kd: item.ma_chi_so_kd,
        loai_chi_so: item.loai_chi_so,
        ma_chi_so: item.ma_chi_so,
        ten_chi_so: item.ten_chi_so,
        phuong_phap_thu: pphuongPhap,
        gia_tri: item.gia_tri,
        nguong_tieu_chuan: nguongHienThi,
        is_pass: isPass,
        danh_gia: isPass ? "Đạt" : "Không đạt",
      };
    });

    // 4. Lấy lịch sử truy xuất lô hàng từ nhật ký blockchain
    const [timelineRows] = await db.query(
      `SELECT ma_lich_su, loai_hoat_dong, thoi_diem_xay_ra, du_lieu_chi_tiet, 
              ma_bam_su_kien_hien_tai, ma_giao_dich_blockchain, blockchain_sync_status
       FROM lich_su_truy_xuat_lo
       WHERE ma_lo_nong_san = ?
       ORDER BY so_thu_tu_su_kien DESC`,
      [data.ma_lo_nong_san],
    );

    return res.status(200).json({
      success: true,
      data: {
        kiem_dinh: {
          ...data,
          tong_ket_lab: coChiSoHong ? "KHONG_DAT" : "DAT",
        },
        chi_so: danhSachChiSo,
        lich_su: timelineRows,
      },
    });
  } catch (error) {
    console.error("Lỗi khi tải chi tiết kiểm định:", error);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi máy chủ nội bộ" });
  }
};

// ================= XUẤT HÀM Ở CUỐI FILE =================
module.exports = {
  getChiTietKiemDinh,
};
