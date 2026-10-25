const db = require("../config/db"); // Kết nối MySQL pool/promise[cite: 6]

// Công thức đánh giá Đạt / Không đạt dùng chung: server/utils/danhGiaChiSo.js
const { evaluateResult } = require("../utils/danhGiaChiSo");

/**
 * Lấy chi tiết hồ sơ kiểm định và so sánh ngưỡng (không tải bảng vật tư)[cite: 6]
 */
const getChiTietKiemDinh = async (req, res) => {
  try {
    const { maKiemDinh } = req.params; //[cite: 6]

    // 1. Truy vấn thông tin kiểm định, lô hàng, mùa vụ, thửa đất / nông trại[cite: 6]
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
    ); //[cite: 6]

    if (kdRows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy hồ sơ kiểm định" }); //[cite: 6]
    }

    const data = kdRows[0]; //[cite: 6]

    // 2. Truy vấn chỉ số kiểm định và liên kết với bảng ngưỡng chuẩn[cite: 6]
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
          AND cs.ten_chi_so = n.ten_chi_tiet_chat
          AND (n.tieu_chuan_ap_dung = ? OR n.tieu_chuan_ap_dung = 'TAT_CA')
          AND (n.ma_san_pham IS NULL OR n.ma_san_pham = ?)
          AND n.trang_thai = 1
       WHERE cs.ma_kiem_dinh = ?
       ORDER BY cs.thu_tu ASC, cs.ma_chi_so_kd ASC,
                CASE WHEN n.tieu_chuan_ap_dung = 'TAT_CA' THEN 1 ELSE 0 END ASC,
                n.ma_nguong ASC`,
      [data.tieu_chuan_dang_ky, data.ma_san_pham, data.ma_kiem_dinh],
    ); //[cite: 6]

    // 3. Lọc trùng lặp (Unique) và kiểm tra Đạt / Không đạt
    const uniqueChiSoMap = new Map();
    for (const item of chiSoRows) {
      const key = item.ma_chi_so_kd || item.ma_chi_so || item.ten_chi_so;
      if (!uniqueChiSoMap.has(key)) {
        uniqueChiSoMap.set(key, item);
      }
    }
    const uniqueRows = Array.from(uniqueChiSoMap.values());

    let coChiSoHong = false; //[cite: 6]
    const danhSachChiSo = uniqueRows.map((item) => {
      let isPass = true; //[cite: 6]
      let nguongHienThi = item.mo_ta_nguong || "Theo đánh giá kiểm định viên"; //[cite: 6]
      let pphuongPhap = item.phuong_phap_thu || "TCVN"; //[cite: 6]

      if (item.loai_chi_so === "CO_DINH" && item.toan_tu_so_sanh) {
        isPass = evaluateResult(item.gia_tri, {
          toan_tu_so_sanh: item.toan_tu_so_sanh,
          nguong_toi_da: item.nguong_toi_da,
        }); //[cite: 6]
        if (!isPass) coChiSoHong = true; //[cite: 6]
      } else {
        nguongHienThi = "KĐV tự thẩm định"; //[cite: 6]
        pphuongPhap = "Phương pháp thực địa"; //[cite: 6]
      }

      return {
        ma_chi_so_kd: item.ma_chi_so_kd, //[cite: 6]
        loai_chi_so: item.loai_chi_so, //[cite: 6]
        ma_chi_so: item.ma_chi_so, //[cite: 6]
        ten_chi_so: item.ten_chi_so, //[cite: 6]
        phuong_phap_thu: pphuongPhap, //[cite: 6]
        gia_tri: item.gia_tri, //[cite: 6]
        nguong_tieu_chuan: nguongHienThi, //[cite: 6]
        is_pass: isPass, //[cite: 6]
        danh_gia: isPass ? "Đạt" : "Không đạt", //[cite: 6]
      };
    });

    // 4. Lấy lịch sử truy xuất lô hàng từ nhật ký blockchain[cite: 6]
    const [timelineRows] = await db.query(
      `SELECT ma_lich_su, loai_hoat_dong, thoi_diem_xay_ra, du_lieu_chi_tiet, 
              ma_bam_su_kien_hien_tai, ma_giao_dich_blockchain, blockchain_sync_status
       FROM lich_su_truy_xuat_lo
       WHERE ma_lo_nong_san = ?
       ORDER BY so_thu_tu_su_kien DESC`,
      [data.ma_lo_nong_san],
    ); //[cite: 6]

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
    }); //[cite: 6]
  } catch (error) {
    console.error("Lỗi khi tải chi tiết kiểm định:", error); //[cite: 6]
    return res
      .status(500)
      .json({ success: false, message: "Lỗi máy chủ nội bộ" }); //[cite: 6]
  }
};

module.exports = {
  getChiTietKiemDinh,
  evaluateResult,
};
