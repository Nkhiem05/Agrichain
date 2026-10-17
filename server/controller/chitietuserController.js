const db = require("../config/db");
const { evaluateResult } = require("./chitietkiemdinhController");

const getTraceDetail = async (req, res) => {
  try {
    let { batchCode } = req.params;
    const cleanBatchCode = batchCode.replace(/^#/, "").trim();

    // 1. Thông tin Lô nông sản & Sản phẩm
    const [batchRows] = await db.query(
      `SELECT 
        l.ma_lo_nong_san,
        l.ma_mua_vu,
        l.ngay_thu_hoach,
        l.so_luong_hien_tai,
        l.don_vi_tinh,
        l.giai_doan_hien_tai,
        l.integrity_status,
        l.latest_event_hash,
        sp.ten_san_pham,
        sp.loai_san_pham,
        sp.mo_ta_san_pham
      FROM lo_nong_san l
      JOIN san_pham_nong_san sp ON l.ma_san_pham = sp.ma_san_pham
      WHERE l.ma_lo_nong_san = ?`,
      [cleanBatchCode],
    );

    if (batchRows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy dữ liệu lô hàng" });
    }

    const batch = batchRows[0];

    // Xác định mã lô nguồn nếu là lô chế biến/đóng gói
    const [originRows] = await db.query(
      `SELECT ma_lo_nguon FROM lien_ket_nguon_goc_lo WHERE ma_lo_duoc_tao_ra = ? LIMIT 1`,
      [cleanBatchCode],
    );
    const sourceBatchCode =
      originRows.length > 0 ? originRows[0].ma_lo_nguon : cleanBatchCode;

    // 2. Canh tác mùa vụ & Vật tư nông nghiệp
    let farmingData = null;
    let suppliesData = [];
    const targetSeasonId = batch.ma_mua_vu;

    if (targetSeasonId) {
      const [farmRows] = await db.query(
        `SELECT 
          mv.ma_mua_vu,
          mv.loai_cay_trong,
          mv.giong_cay,
          mv.ngay_gieo_trong,
          mv.ngay_thu_hoach_du_kien,
          nt.ten_nong_trai,
          nt.dia_diem_nong_trai,
          nd.ho_ten AS ten_nong_dan
        FROM mua_vu mv
        JOIN nong_trai nt ON mv.ma_nong_trai = nt.ma_nong_trai
        JOIN nguoi_dung nd ON nt.ma_nguoi_dung = nd.ma_nguoi_dung
        WHERE mv.ma_mua_vu = ?`,
        [targetSeasonId],
      );

      if (farmRows.length > 0) {
        farmingData = farmRows[0];
        const [supplies] = await db.query(
          `SELECT 
            mvv.ngay_su_dung,
            mvv.lieu_luong,
            vt.ten_vat_tu,
            vt.loai_vat_tu,
            vt.don_vi_tinh
          FROM mua_vu_vat_tu mvv
          JOIN danh_muc_vat_tu vt ON mvv.ma_vat_tu = vt.ma_vat_tu
          WHERE mvv.ma_mua_vu = ?
          ORDER BY mvv.ngay_su_dung ASC`,
          [targetSeasonId],
        );
        suppliesData = supplies;
      }
    }

    // 3. Kiểm định chất lượng & Các chỉ số
    const [auditRows] = await db.query(
      `SELECT 
        kd.ma_kiem_dinh,
        kd.ma_ho_so,
        kd.tieu_chuan_dang_ky,
        kd.ket_luan,
        kd.trang_thai_ho_so,
        kd.so_chung_nhan,
        DATE_FORMAT(kd.hieu_luc_tu, '%Y-%m-%d') AS hieu_luc_tu,
        DATE_FORMAT(kd.hieu_luc_den, '%Y-%m-%d') AS hieu_luc_den,
        kd.kiem_dinh_vien,
        kd.thoi_gian_lay_mau,
        cq.ho_ten AS ten_co_quan
      FROM kiem_dinh_lo_hang kd
      JOIN nguoi_dung cq ON kd.ma_co_quan = cq.ma_nguoi_dung
      WHERE kd.ma_lo_nong_san IN (?, ?)
        AND kd.trang_thai_ho_so IN ('DA_CONG_BO', 'THU_HOI')
      ORDER BY kd.updated_at DESC LIMIT 1`,
      [cleanBatchCode, sourceBatchCode],
    );

    let auditData = null;
    let auditIndicators = [];
    if (auditRows.length > 0) {
      auditData = auditRows[0];
      // Chỉ số kèm ngưỡng chuẩn để đánh giá từng chỉ tiêu Đạt / Không đạt
      const [indicators] = await db.query(
        `SELECT cs.ma_chi_so_kd, cs.ten_chi_so, cs.gia_tri, cs.loai_chi_so,
                n.toan_tu_so_sanh, n.nguong_toi_da, n.mo_ta_nguong
         FROM chi_so_kiem_dinh cs
         LEFT JOIN nguong_kiem_dinh_chuan n
           ON cs.loai_chi_so = 'CO_DINH'
          AND cs.ma_chi_so = n.ma_chi_so
          AND cs.ten_chi_so = n.ten_chi_tiet_chat
          AND n.trang_thai = 1
         WHERE cs.ma_kiem_dinh = ?
         ORDER BY cs.thu_tu ASC, cs.ma_chi_so_kd ASC,
                  CASE WHEN n.tieu_chuan_ap_dung = 'TAT_CA' THEN 1 ELSE 0 END ASC,
                  n.ma_nguong ASC`,
        [auditData.ma_kiem_dinh],
      );
      const seenIndicators = new Set();
      auditIndicators = indicators
        .filter((row) => {
          if (seenIndicators.has(row.ma_chi_so_kd)) return false;
          seenIndicators.add(row.ma_chi_so_kd);
          return true;
        })
        .map((row) => ({
          ten_chi_so: row.ten_chi_so,
          gia_tri: row.gia_tri,
          nguong: row.toan_tu_so_sanh ? row.mo_ta_nguong : null,
          dat: row.toan_tu_so_sanh
            ? evaluateResult(row.gia_tri, {
                toan_tu_so_sanh: row.toan_tu_so_sanh,
                nguong_toi_da: row.nguong_toi_da,
              })
            : true,
        }));
    }

    // 4. Sơ chế & Đóng gói
    const [processRows] = await db.query(
      `SELECT 
        sc.ma_so_che,
        sc.tieu_de,
        sc.khu_vuc_so_che,
        sc.quy_cach_tieu_chuan,
        sc.giai_doan_so_che,
        sc.ngay_bat_dau,
        sc.ngay_hoan_tat,
        nd.ho_ten AS ten_co_so
      FROM so_che_lo_hang sc
      JOIN nguoi_dung nd ON sc.ma_co_so = nd.ma_nguoi_dung
      WHERE sc.ma_lo_moi = ? LIMIT 1`,
      [cleanBatchCode],
    );

    // 5. Vận chuyển & Phân phối
    const [shippingRows] = await db.query(
      `SELECT 
        vc.ma_van_don,
        vc.dia_chi_giao_hang,
        vc.thoi_gian_xuat,
        vc.ten_tai_xe,
        vc.bien_so_xe,
        vc.trang_thai,
        dv.ho_ten AS ten_don_vi_van_chuyen,
        bn.ho_ten AS ten_ben_nhan
      FROM lenh_van_chuyen vc
      JOIN nguoi_dung dv ON vc.ma_don_vi_van_chuyen = dv.ma_nguoi_dung
      LEFT JOIN nguoi_dung bn ON vc.ma_ben_nhan = bn.ma_nguoi_dung
      WHERE vc.ma_lo_nong_san IN (?, ?)
      ORDER BY vc.created_at DESC`,
      [cleanBatchCode, sourceBatchCode],
    );

    // 6. Bản ghi chuỗi khối Blockchain
    const [bcRows] = await db.query(
      `SELECT ma_giao_dich_blockchain, ma_bam_su_kien_hien_tai, so_thu_tu_su_kien 
       FROM lich_su_truy_xuat_lo 
       WHERE ma_lo_nong_san = ? AND ma_giao_dich_blockchain IS NOT NULL 
       ORDER BY so_thu_tu_su_kien DESC LIMIT 1`,
      [cleanBatchCode],
    );

    return res.status(200).json({
      success: true,
      data: {
        batch,
        blockchain: bcRows.length > 0 ? bcRows[0] : null,
        farming: farmingData
          ? { ...farmingData, supplies: suppliesData }
          : null,
        audit: auditData ? { ...auditData, indicators: auditIndicators } : null,
        processing: processRows.length > 0 ? processRows[0] : null,
        shipping: shippingRows,
      },
    });
  } catch (error) {
    console.error("Lỗi getTraceDetail:", error);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi máy chủ", error: error.message });
  }
};

module.exports = { getTraceDetail };
