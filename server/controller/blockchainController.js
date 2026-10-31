const crypto = require("crypto");
const { verifyMessage, isAddress, getAddress } = require("ethers");
const db = require("../config/db");
const {
  ABI,
  VAI_TRO_ON_CHAIN,
  ZERO_HASH,
} = require("../services/blockchain/eventTypes");
const {
  canonicalJson,
  hashNoiDung,
  hashSuKien,
  batchIdCuaLo,
  certIdCuaHoSo,
  productIdCuaSanPham,
} = require("../services/blockchain/canonical");
const {
  layBanChupMuaVu,
  layChiSoKiemDinh,
} = require("../services/blockchain/traceEvent");
const chain = require("../services/blockchain/chainClient");
const { phienBanNguongHienHanh } = require("../services/blockchain/nguong");
const {
  ghiNhanDaXacNhan,
  ghiNhanDaGui,
} = require("../services/blockchain/ghiNhan");
const outboxWorker = require("../services/blockchain/outboxWorker");
const { moTaSuKien } = require("../services/blockchain/moTaKy");

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const sendError = (res, err, fallback) => {
  if (err instanceof ApiError || err.status) {
    return res
      .status(err.status)
      .json({ success: false, message: err.message });
  }
  console.error(fallback, err);
  return res.status(500).json({ success: false, message: fallback });
};

const withTransaction = async (callback) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

// Cột JSON (longtext + json_valid) có thể được driver trả về dạng chuỗi hoặc đã parse thành object
const docJson = (value) =>
  typeof value === "string" ? JSON.parse(value) : value;

const thongDiepLienKet = (maNguoiDung, nonce) =>
  `Agrichain xac nhan lien ket vi\nTai khoan: ${maNguoiDung}\nNonce: ${nonce}`;

const chuanHoaDiaChi = (value) => {
  if (typeof value !== "string" || !isAddress(value)) {
    throw new ApiError(400, "Địa chỉ ví không hợp lệ");
  }
  return value.toLowerCase();
};

/* ======================= Cấu hình và ví ======================= */

const layCauHinhCongKhai = (req, res) => {
  const cfg = chain.layCauHinh();
  return res.json({
    success: true,
    data: {
      chainId: cfg.chainId,
      tenMang: cfg.tenMang,
      rpcUrl: cfg.rpcUrl,
      explorerUrl: cfg.explorerUrl,
      tienTe: cfg.tienTe,
      contractAddress: cfg.contractAddress,
      daCauHinh: cfg.daCauHinh,
      abi: ABI,
    },
  });
};

const viCuaToi = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT dia_chi_vi, trang_thai, trang_thai_duyet, thoi_diem_dang_ky
      FROM vi_blockchain
      WHERE ma_nguoi_dung = ?
      LIMIT 1
      `,
      [req.user.ma_nguoi_dung],
    );
    return res.json({
      success: true,
      data: {
        vi: rows[0]
          ? { ...rows[0], dia_chi_vi: getAddress(rows[0].dia_chi_vi) }
          : null,
        vai_tro: req.user.vai_tro,
        can_vi:
          Boolean(VAI_TRO_ON_CHAIN[req.user.vai_tro]) ||
          req.user.vai_tro === "ADMIN",
      },
    });
  } catch (err) {
    return sendError(res, err, "Không thể lấy thông tin ví");
  }
};

const taoNonce = async (req, res) => {
  try {
    const nonce = crypto.randomBytes(16).toString("hex");
    await db.query(
      `
      REPLACE INTO vi_blockchain_nonce (ma_nguoi_dung, nonce, het_han)
      VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))
      `,
      [req.user.ma_nguoi_dung, nonce],
    );
    return res.json({
      success: true,
      data: {
        nonce,
        thong_diep: thongDiepLienKet(req.user.ma_nguoi_dung, nonce),
      },
    });
  } catch (err) {
    return sendError(res, err, "Không thể tạo nonce");
  }
};

const lienKetVi = async (req, res) => {
  try {
    const maNguoiDung = req.user.ma_nguoi_dung;
    const diaChi = chuanHoaDiaChi(req.body?.address);
    const chuKy = req.body?.signature;
    if (typeof chuKy !== "string") throw new ApiError(400, "Thiếu chữ ký");

    if (!VAI_TRO_ON_CHAIN[req.user.vai_tro] && req.user.vai_tro !== "ADMIN") {
      throw new ApiError(400, "Vai trò này không cần ví blockchain");
    }

    const trangThai = await withTransaction(async (connection) => {
      const [nonceRows] = await connection.query(
        `SELECT nonce FROM vi_blockchain_nonce WHERE ma_nguoi_dung = ? AND het_han > NOW() FOR UPDATE`,
        [maNguoiDung],
      );
      if (nonceRows.length === 0)
        throw new ApiError(400, "Phiên liên kết đã hết hạn, hãy thử lại");

      let nguoiKy;
      try {
        nguoiKy = verifyMessage(
          thongDiepLienKet(maNguoiDung, nonceRows[0].nonce),
          chuKy,
        );
      } catch {
        throw new ApiError(400, "Chữ ký không hợp lệ");
      }
      if (nguoiKy.toLowerCase() !== diaChi) {
        throw new ApiError(400, "Chữ ký không khớp với địa chỉ ví");
      }
      await connection.query(
        `DELETE FROM vi_blockchain_nonce WHERE ma_nguoi_dung = ?`,
        [maNguoiDung],
      );

      const [dungRoi] = await connection.query(
        `SELECT ma_nguoi_dung FROM vi_blockchain WHERE dia_chi_vi = ? LIMIT 1 FOR UPDATE`,
        [diaChi],
      );
      if (dungRoi.length > 0 && dungRoi[0].ma_nguoi_dung !== maNguoiDung) {
        throw new ApiError(409, "Ví này đã được liên kết với tài khoản khác");
      }

      const [cu] = await connection.query(
        `SELECT dia_chi_vi, trang_thai_duyet FROM vi_blockchain WHERE ma_nguoi_dung = ? FOR UPDATE`,
        [maNguoiDung],
      );
      // Tài khoản thường đã có ví được duyệt thì phải nhờ admin đổi. Admin thì được tự đổi ví: ví admin không có vai trò
      // trên contract, và cần đổi khi deploy lại hợp đồng bằng ví mới (nếu chặn thì không ai đổi được ví admin)
      if (
        cu.length > 0 &&
        cu[0].trang_thai_duyet === "DA_DUYET" &&
        cu[0].dia_chi_vi !== diaChi &&
        req.user.vai_tro !== "ADMIN"
      ) {
        throw new ApiError(
          409,
          "Tài khoản đã có ví được duyệt, hãy liên hệ quản trị viên để đổi ví",
        );
      }

      // Ví của admin không cần vai trò trên contract nên được duyệt luôn
      const duyet = req.user.vai_tro === "ADMIN" ? "DA_DUYET" : "CHO_DUYET";
      await connection.query(
        `DELETE FROM vi_blockchain WHERE ma_nguoi_dung = ?`,
        [maNguoiDung],
      );
      await connection.query(
        `
        INSERT INTO vi_blockchain (dia_chi_vi, ma_nguoi_dung, trang_thai, trang_thai_duyet, thoi_diem_duyet)
        VALUES (?, ?, 1, ?, IF(? = 'DA_DUYET', NOW(), NULL))
        `,
        [diaChi, maNguoiDung, duyet, duyet],
      );
      return duyet;
    });

    return res.json({
      success: true,
      message:
        trangThai === "DA_DUYET"
          ? "Đã liên kết ví"
          : "Đã liên kết ví, vui lòng chờ quản trị viên duyệt vai trò trên blockchain",
      data: { dia_chi_vi: getAddress(diaChi), trang_thai_duyet: trangThai },
    });
  } catch (err) {
    return sendError(res, err, "Không thể liên kết ví");
  }
};

/* ======================= Quản trị viên duyệt ví ======================= */

const danhSachViChoDuyet = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT v.dia_chi_vi, v.ma_nguoi_dung, v.trang_thai_duyet, nd.ho_ten, nd.vai_tro
      FROM vi_blockchain v
      JOIN nguoi_dung nd ON nd.ma_nguoi_dung = v.ma_nguoi_dung
      WHERE v.trang_thai_duyet = 'CHO_DUYET'
      ORDER BY v.thoi_diem_dang_ky
      `,
    );
    return res.json({
      success: true,
      data: rows.map((r) => ({
        ...r,
        dia_chi_vi: getAddress(r.dia_chi_vi),
        vai_tro_on_chain: VAI_TRO_ON_CHAIN[r.vai_tro] || null,
      })),
    });
  } catch (err) {
    return sendError(res, err, "Không thể lấy danh sách ví chờ duyệt");
  }
};

// Danh sách ví cho trang quản trị (lọc theo trạng thái duyệt) + ví admin của hợp đồng để đối chiếu
const danhSachVi = async (req, res) => {
  try {
    const trangThai = ["CHO_DUYET", "DA_DUYET", "TU_CHOI"].includes(
      req.query?.trang_thai,
    )
      ? req.query.trang_thai
      : null;
    const [rows] = await db.query(
      `
      SELECT v.dia_chi_vi, v.ma_nguoi_dung, v.trang_thai, v.trang_thai_duyet, v.tx_gan_vai_tro,
             v.thoi_diem_dang_ky, v.thoi_diem_duyet, nd.ho_ten, nd.ten_dang_nhap, nd.vai_tro
      FROM vi_blockchain v
      JOIN nguoi_dung nd ON nd.ma_nguoi_dung = v.ma_nguoi_dung
      ${trangThai ? "WHERE v.trang_thai_duyet = ?" : ""}
      ORDER BY FIELD(v.trang_thai_duyet, 'CHO_DUYET', 'DA_DUYET', 'TU_CHOI'), v.thoi_diem_dang_ky DESC
      `,
      trangThai ? [trangThai] : [],
    );

    let adminHopDong = null;
    let loiHopDong = null;
    try {
      loiHopDong = await chain.chanDoanHopDong();
      if (!loiHopDong) adminHopDong = await chain.adminTrenChain();
    } catch (err) {
      console.error("Lỗi đọc admin của contract:", err);
      loiHopDong = err.shortMessage || err.message;
    }
    if (loiHopDong) console.warn("Hợp đồng blockchain:", loiHopDong);

    return res.json({
      success: true,
      data: {
        admin_hop_dong: adminHopDong,
        hop_dong: {
          dia_chi: chain.layCauHinh().contractAddress,
          loi: loiHopDong,
        },
        vi: await Promise.all(
          rows.map(async (r) => {
            const mongDoi = VAI_TRO_ON_CHAIN[r.vai_tro] || null;
            // Ví đã duyệt trong CSDL nhưng hợp đồng đang dùng chưa gán đúng vai trò (thường do deploy hợp đồng mới)
            let lech = false;
            if (!loiHopDong && mongDoi && r.trang_thai_duyet === "DA_DUYET") {
              try {
                const thucTe = await chain.vaiTroTrenChain(r.dia_chi_vi);
                lech = thucTe !== null && thucTe !== mongDoi;
              } catch {
                lech = false;
              }
            }
            return {
              ...r,
              dia_chi_vi: getAddress(r.dia_chi_vi),
              vai_tro_on_chain: mongDoi,
              lech_vai_tro: lech,
            };
          }),
        ),
      },
    });
  } catch (err) {
    return sendError(res, err, "Không thể lấy danh sách ví");
  }
};

// Sau khi admin ký setRole bằng ví của mình, server kiểm tra lại trực tiếp trên chain rồi mới đánh dấu đã duyệt
const duyetVi = async (req, res) => {
  try {
    const diaChi = chuanHoaDiaChi(req.params.diaChi);
    const [rows] = await db.query(
      `
      SELECT v.dia_chi_vi, nd.vai_tro
      FROM vi_blockchain v JOIN nguoi_dung nd ON nd.ma_nguoi_dung = v.ma_nguoi_dung
      WHERE v.dia_chi_vi = ? LIMIT 1
      `,
      [diaChi],
    );
    if (rows.length === 0) throw new ApiError(404, "Không tìm thấy ví");

    const vaiTroMongDoi = VAI_TRO_ON_CHAIN[rows[0].vai_tro];
    if (!vaiTroMongDoi)
      throw new ApiError(
        400,
        "Vai trò của tài khoản này không cần ví on-chain",
      );

    let vaiTroThucTe;
    try {
      vaiTroThucTe = await chain.vaiTroTrenChain(diaChi);
    } catch (err) {
      console.error("Lỗi đọc vai trò on-chain:", err);
      throw new ApiError(502, "Không đọc được blockchain, thử lại sau");
    }
    if (vaiTroThucTe === null)
      throw new ApiError(503, "Chưa cấu hình contract blockchain trên server");
    if (vaiTroThucTe !== vaiTroMongDoi) {
      throw new ApiError(
        409,
        "Trên blockchain, ví này chưa được gán đúng vai trò (hãy ký setRole trước)",
      );
    }

    const txHash =
      typeof req.body?.txHash === "string" &&
      /^0x[0-9a-fA-F]{64}$/.test(req.body.txHash)
        ? req.body.txHash.toLowerCase()
        : null;
    await db.query(
      `UPDATE vi_blockchain SET trang_thai_duyet = 'DA_DUYET', tx_gan_vai_tro = ?, thoi_diem_duyet = NOW() WHERE dia_chi_vi = ?`,
      [txHash, diaChi],
    );
    return res.json({ success: true, message: "Đã duyệt ví" });
  } catch (err) {
    return sendError(res, err, "Không thể duyệt ví");
  }
};

// Sau khi admin ký setRoles để gán lại vai trò cho các ví đã duyệt (hợp đồng mới chưa có vai trò nào), server kiểm tra từng ví
// trên chain rồi ghi lại mã giao dịch gán vai trò. Không đổi trạng thái duyệt: các ví này vốn đã được duyệt.
const dongBoVaiTro = async (req, res) => {
  try {
    const txHash = txHashHopLe(req.body?.txHash);
    if (!txHash) throw new ApiError(400, "Thiếu mã giao dịch hợp lệ");
    const ds = Array.isArray(req.body?.dia_chi) ? req.body.dia_chi.map(chuanHoaDiaChi) : [];
    if (ds.length === 0) throw new ApiError(400, "Thiếu danh sách ví");

    let gd;
    try {
      gd = await chain.kiemTraGiaoDichHopDong(txHash);
    } catch (err) {
      console.error("Lỗi đọc giao dịch:", err);
      throw new ApiError(502, "Không đọc được blockchain, thử lại sau");
    }
    if (!gd.ok) throw new ApiError(409, gd.lyDo);

    const [rows] = await db.query(
      `
      SELECT v.dia_chi_vi, nd.vai_tro
      FROM vi_blockchain v JOIN nguoi_dung nd ON nd.ma_nguoi_dung = v.ma_nguoi_dung
      WHERE v.dia_chi_vi IN (?) AND v.trang_thai_duyet = 'DA_DUYET'
      `,
      [ds],
    );
    const daDongBo = [];
    const conLech = [];
    for (const r of rows) {
      const mongDoi = VAI_TRO_ON_CHAIN[r.vai_tro];
      let thucTe = null;
      try {
        thucTe = await chain.vaiTroTrenChain(r.dia_chi_vi);
      } catch (err) {
        throw new ApiError(502, "Không đọc được blockchain, thử lại sau");
      }
      if (mongDoi && thucTe === mongDoi) {
        await db.query(`UPDATE vi_blockchain SET tx_gan_vai_tro = ? WHERE dia_chi_vi = ?`, [txHash, r.dia_chi_vi]);
        daDongBo.push(getAddress(r.dia_chi_vi));
      } else {
        conLech.push(getAddress(r.dia_chi_vi));
      }
    }
    return res.json({
      success: true,
      message:
        conLech.length === 0
          ? `Đã gán lại vai trò cho ${daDongBo.length} ví trên hợp đồng đang dùng`
          : `Đã đồng bộ ${daDongBo.length} ví, còn ${conLech.length} ví chưa đúng vai trò trên chain`,
      data: { da_dong_bo: daDongBo, con_lech: conLech },
    });
  } catch (err) {
    return sendError(res, err, "Không thể đồng bộ vai trò");
  }
};

const tuChoiVi = async (req, res) => {
  try {
    const diaChi = chuanHoaDiaChi(req.params.diaChi);
    const [result] = await db.query(
      `UPDATE vi_blockchain SET trang_thai_duyet = 'TU_CHOI' WHERE dia_chi_vi = ? AND trang_thai_duyet = 'CHO_DUYET'`,
      [diaChi],
    );
    if (result.affectedRows === 0)
      throw new ApiError(404, "Không có ví nào đang chờ duyệt với địa chỉ này");
    return res.json({ success: true, message: "Đã từ chối ví" });
  } catch (err) {
    return sendError(res, err, "Không thể từ chối ví");
  }
};

/* ======================= Bộ ngưỡng kiểm định ======================= */

const txHashHopLe = (v) =>
  typeof v === "string" && /^0x[0-9a-fA-F]{64}$/.test(v)
    ? v.toLowerCase()
    : null;

// Bộ ngưỡng đang áp dụng: mã băm, đã ghi lên hợp đồng chưa, các phiên bản đã lưu
const thongTinNguong = async (req, res) => {
  try {
    const hienHanh = await phienBanNguongHienHanh(db);
    let trenChain = null;
    let loiChain = null;
    try {
      trenChain = await chain.nguongTrenChain(hienHanh.maBam);
    } catch (err) {
      loiChain = err.shortMessage || err.message;
    }
    const [lichSu] = await db.query(
      `
      SELECT ma_phien_ban, ma_bam, ghi_chu, ma_giao_dich_blockchain, created_at,
             JSON_LENGTH(noi_dung, '$.nguong') AS so_chi_tieu
      FROM phien_ban_nguong
      ORDER BY ma_phien_ban DESC
      LIMIT 20
      `,
    );
    return res.json({
      success: true,
      data: {
        ma_bam: hienHanh.maBam,
        so_chi_tieu: hienHanh.soChiTieu,
        phien_ban: hienHanh.phienBan,
        tren_chain: trenChain,
        loi_chain: loiChain,
        lich_su: lichSu,
      },
    });
  } catch (err) {
    return sendError(res, err, "Không thể lấy thông tin bộ ngưỡng");
  }
};

// Admin đã ký setThreshold(mã băm): server đọc lại trên chain rồi lưu phiên bản để cơ quan kiểm định dùng khi công bố
const xacNhanNguong = async (req, res) => {
  try {
    const txHash = txHashHopLe(req.body?.txHash);
    if (!txHash) throw new ApiError(400, "Thiếu mã giao dịch hợp lệ");

    const hienHanh = await phienBanNguongHienHanh(db);
    if (req.body?.ma_bam && req.body.ma_bam !== hienHanh.maBam) {
      throw new ApiError(
        409,
        "Bộ ngưỡng vừa thay đổi trong lúc ký, hãy tải lại và ký lại",
      );
    }

    let gd;
    let daGhi;
    try {
      gd = await chain.kiemTraGiaoDichHopDong(txHash);
      daGhi = await chain.nguongTrenChain(hienHanh.maBam);
    } catch (err) {
      console.error("Lỗi đọc bộ ngưỡng trên chain:", err);
      throw new ApiError(502, "Không đọc được blockchain, thử lại sau");
    }
    if (!gd.ok) throw new ApiError(409, gd.lyDo);
    if (!daGhi)
      throw new ApiError(
        409,
        "Trên blockchain chưa có bộ ngưỡng này (giao dịch không phải setThreshold đúng mã băm)",
      );

    await db.query(
      `
      INSERT INTO phien_ban_nguong (ma_bam, noi_dung, ghi_chu, ma_giao_dich_blockchain)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE ma_giao_dich_blockchain = VALUES(ma_giao_dich_blockchain)
      `,
      [
        hienHanh.maBam,
        hienHanh.noiDungJson,
        `${hienHanh.soChiTieu} chỉ tiêu đang áp dụng`,
        txHash,
      ],
    );
    return res.json({
      success: true,
      message: "Đã ghi nhận bộ ngưỡng trên blockchain",
    });
  } catch (err) {
    return sendError(res, err, "Không thể xác nhận bộ ngưỡng");
  }
};

/* ======================= Outbox (hàng chờ ghi blockchain) ======================= */

const thongTinOutbox = async (req, res) => {
  try {
    const [dem] = await db.query(
      `SELECT status, COUNT(*) AS so FROM blockchain_outbox GROUP BY status`,
    );
    const [ganDay] = await db.query(
      `
      SELECT o.event_id, o.status, o.tx_hash, o.retry_count, o.last_error, o.submitted_at, o.confirmed_at,
             ls.ma_lo_nong_san, ls.loai_hoat_dong, ls.ma_nguoi_dung, nd.ho_ten
      FROM blockchain_outbox o
      JOIN lich_su_truy_xuat_lo ls ON ls.ma_lich_su = o.event_id
      JOIN nguoi_dung nd ON nd.ma_nguoi_dung = ls.ma_nguoi_dung
      WHERE o.status <> 'CONFIRMED' OR o.last_error IS NOT NULL
      ORDER BY (o.status = 'CONFIRMED'), o.created_at DESC
      LIMIT 30
      `,
    );
    const w = outboxWorker.trangThai;
    return res.json({
      success: true,
      data: {
        dem: Object.fromEntries(dem.map((d) => [d.status, Number(d.so)])),
        gan_day: ganDay,
        worker: {
          dang_bat: w.dangBat,
          chu_ky_giay: w.chuKyGiay,
          lan_chay_cuoi: w.lanChayCuoi,
          ket_qua_cuoi: w.ketQuaCuoi,
          loi_cuoi: w.loiCuoi,
        },
      },
    });
  } catch (err) {
    return sendError(res, err, "Không thể lấy tình trạng hàng chờ blockchain");
  }
};

const chayOutboxNgay = async (req, res) => {
  try {
    const kq = await outboxWorker.chayMotLan();
    return res.json({ success: true, data: kq, message: "Đã chạy đối soát" });
  } catch (err) {
    return sendError(res, err, "Không thể chạy đối soát");
  }
};

/* ======================= Danh sách sự kiện chờ ký ======================= */

const layViDaDuyet = async (maNguoiDungs) => {
  if (maNguoiDungs.length === 0) return new Map();
  const [rows] = await db.query(
    `
    SELECT ma_nguoi_dung, dia_chi_vi
    FROM vi_blockchain
    WHERE ma_nguoi_dung IN (?) AND trang_thai = 1 AND trang_thai_duyet = 'DA_DUYET'
    `,
    [maNguoiDungs],
  );
  return new Map(rows.map((r) => [r.ma_nguoi_dung, getAddress(r.dia_chi_vi)]));
};

// Dựng tham số gọi hàm contract (v2) cho một sự kiện. Trả { args }, { thieuVi: [...] } hoặc { loi }.
// Số lượng (gram) gửi dạng chuỗi để đi qua JSON; ethers tự đổi sang uint128.
const dungThamSoGoiHam = (o, viCua) => {
  const {
    batch_id: batchId,
    prev_hash: prev,
    event_hash: ev,
    loai_ma: loaiMa,
    tham_so: ts = {},
  } = o;
  switch (o.ham) {
    case "harvest":
      if (!ts.so_luong_gram || ts.so_luong_gram === "0")
        return {
          loi: "Sự kiện thu hoạch thiếu khối lượng (tạo trước khi nâng cấp hợp đồng v2)",
        };
      return {
        args: [
          batchId,
          productIdCuaSanPham(ts.ma_san_pham),
          String(ts.so_luong_gram),
          ev,
        ],
      };
    case "certify":
      if (!ts.ma_kiem_dinh) return { loi: "Sự kiện kiểm định thiếu mã hồ sơ" };
      if (
        (o.loai === "CERTIFICATE_ISSUED" || o.loai === "CERTIFICATE_FAILED") &&
        !ts.phien_ban_nguong
      )
        return {
          loi: "Kết quả kiểm định chưa gắn bộ ngưỡng đã ghi trên blockchain",
        };
      return {
        args: [
          batchId,
          ts.cert_id || certIdCuaHoSo(ts.ma_kiem_dinh),
          loaiMa,
          ts.het_han || 0,
          ts.phien_ban_nguong || ZERO_HASH,
          prev,
          ev,
        ],
      };
    case "confirmSampling":
      if (!ts.ma_kiem_dinh)
        return { loi: "Sự kiện xác nhận lấy mẫu thiếu mã hồ sơ" };
      return {
        args: [batchId, ts.cert_id || certIdCuaHoSo(ts.ma_kiem_dinh), prev, ev],
      };
    case "orderTransport": {
      if (!ts.ma_ben_nhan)
        return {
          loi: "Lệnh vận chuyển không có bên nhận có tài khoản, không ký lên blockchain được",
        };
      const thieuVi = [];
      const vanChuyen = viCua.get(ts.ma_don_vi_van_chuyen);
      if (!vanChuyen) thieuVi.push(ts.ma_don_vi_van_chuyen);
      const benNhan = viCua.get(ts.ma_ben_nhan);
      if (!benNhan) thieuVi.push(ts.ma_ben_nhan);
      if (thieuVi.length > 0) return { thieuVi };
      return { args: [batchId, vanChuyen, benNhan, prev, ev] };
    }
    case "confirmReceive":
      if (!ts.khoi_luong_nhan_gram || ts.khoi_luong_nhan_gram === "0")
        return { loi: "Sự kiện nhận hàng thiếu khối lượng thực nhận" };
      return { args: [batchId, String(ts.khoi_luong_nhan_gram), prev, ev] };
    case "pickup":
    case "arrive":
    case "rejectHandover":
    case "returnShip":
    case "returnReceive":
    case "correct":
      return { args: [batchId, prev, ev] };
    case "createChild":
      if (!ts.so_luong_con_gram || !(ts.so_luong_nguon_gram || []).length)
        return { loi: "Sự kiện tạo lô con thiếu khối lượng" };
      return {
        args: [
          batchId,
          (ts.ma_lo_nguon || []).map(batchIdCuaLo),
          ts.hash_lo_nguon || [],
          ts.so_luong_nguon_gram.map(String),
          String(ts.so_luong_con_gram),
          productIdCuaSanPham(ts.ma_san_pham),
          ev,
        ],
      };
    case "step":
      return { args: [batchId, loaiMa, prev, ev] };
    default:
      return { args: null };
  }
};

const choKy = async (req, res) => {
  try {
    const maNguoiDung = req.user.ma_nguoi_dung;
    const [rows] = await db.query(
      `
      SELECT ls.ma_lich_su, ls.ma_lo_nong_san, ls.so_thu_tu_su_kien, ls.loai_hoat_dong,
             ls.blockchain_sync_status, ls.thoi_diem_xay_ra, o.payload,
             o.tx_hash, o.last_error
      FROM lich_su_truy_xuat_lo ls
      JOIN blockchain_outbox o ON o.event_id = ls.ma_lich_su
      WHERE ls.ma_nguoi_dung = ? AND ls.blockchain_sync_status <> 'CONFIRMED'
      ORDER BY ls.thoi_diem_xay_ra, ls.so_thu_tu_su_kien
      LIMIT 200
      `,
      [maNguoiDung],
    );

    const items = rows.map((r) => ({
      ...r,
      outbox: docJson(r.payload),
    }));

    // Sự kiện chưa xác nhận nhỏ nhất của từng lô liên quan (lô của sự kiện + các lô nguồn)
    const cacLo = new Set();
    const cacNguoi = new Set();
    for (const it of items) {
      cacLo.add(it.ma_lo_nong_san);
      (it.outbox.tham_so?.ma_lo_nguon || []).forEach((l) => cacLo.add(l));
      if (it.outbox.tham_so?.ma_don_vi_van_chuyen)
        cacNguoi.add(it.outbox.tham_so.ma_don_vi_van_chuyen);
      if (it.outbox.tham_so?.ma_ben_nhan)
        cacNguoi.add(it.outbox.tham_so.ma_ben_nhan);
    }
    cacNguoi.add(maNguoiDung);

    const minChuaXacNhan = new Map();
    if (cacLo.size > 0) {
      const [mins] = await db.query(
        `
        SELECT ma_lo_nong_san, MIN(so_thu_tu_su_kien) AS min_stt
        FROM lich_su_truy_xuat_lo
        WHERE blockchain_sync_status <> 'CONFIRMED' AND ma_lo_nong_san IN (?)
        GROUP BY ma_lo_nong_san
        `,
        [[...cacLo]],
      );
      mins.forEach((m) =>
        minChuaXacNhan.set(m.ma_lo_nong_san, Number(m.min_stt)),
      );
    }

    // Sự kiện đang chặn các sự kiện sau của từng lô (người ký, loại, trạng thái): để báo rõ ai cần ký trước
    const chanBoi = new Map();
    if (minChuaXacNhan.size > 0) {
      const [bs] = await db.query(
        `
        SELECT ls.ma_lo_nong_san, ls.so_thu_tu_su_kien, ls.loai_hoat_dong, ls.ma_nguoi_dung,
               ls.blockchain_sync_status, nd.ho_ten
        FROM lich_su_truy_xuat_lo ls
        LEFT JOIN nguoi_dung nd ON nd.ma_nguoi_dung = ls.ma_nguoi_dung
        WHERE (ls.ma_lo_nong_san, ls.so_thu_tu_su_kien) IN (?)
        `,
        [[...minChuaXacNhan.entries()]],
      );
      bs.forEach((b) =>
        chanBoi.set(b.ma_lo_nong_san, {
          stt: Number(b.so_thu_tu_su_kien),
          loai: b.loai_hoat_dong,
          ma_nguoi_ky: b.ma_nguoi_dung,
          ten_nguoi_ky: b.ho_ten || null,
          trang_thai: b.blockchain_sync_status,
        }),
      );
    }

    // Trạng thái lệnh vận chuyển của các sự kiện tạo lệnh: bên gửi chỉ ký sau khi đơn vị vận chuyển đã chấp nhận
    const trangThaiLenh = new Map();
    const dsVanDon = [
      ...new Set(
        items
          .filter((it) => it.outbox.ham === "orderTransport")
          .map((it) => it.outbox.tham_so?.ma_van_don)
          .filter(Boolean),
      ),
    ];
    if (dsVanDon.length > 0) {
      const [lenh] = await db.query(
        `SELECT ma_van_don, trang_thai FROM lenh_van_chuyen WHERE ma_van_don IN (?)`,
        [dsVanDon],
      );
      lenh.forEach((l) => trangThaiLenh.set(l.ma_van_don, l.trang_thai));
    }

    const viCua = await layViDaDuyet([...cacNguoi]);
    const viCuaToiAddr = viCua.get(maNguoiDung) || null;

    // Tên người dùng để báo rõ ai đang thiếu ví (vd "Cơ Sở Sơ Chế Demo (DEMOSC01)")
    const tenNguoi = new Map();
    const vaiTroNguoi = new Map();
    if (cacNguoi.size > 0) {
      const [ns] = await db.query(
        `SELECT ma_nguoi_dung, ho_ten, vai_tro FROM nguoi_dung WHERE ma_nguoi_dung IN (?)`,
        [[...cacNguoi]],
      );
      ns.forEach((n) => {
        tenNguoi.set(n.ma_nguoi_dung, n.ho_ten);
        vaiTroNguoi.set(n.ma_nguoi_dung, n.vai_tro);
      });
    }
    const nhanDien = (ma) =>
      tenNguoi.get(ma) ? `${tenNguoi.get(ma)} (${ma})` : ma;

    // Ví "Đã duyệt" trong database nhưng hợp đồng đang dùng chưa gán đúng vai trò (vd hợp đồng đã được triển khai lại)
    // thì giao dịch chắc chắn bị từ chối. Kiểm tra trước để báo đúng nguyên nhân thay vì mở MetaMask rồi lỗi.
    const lechVaiTro = new Set();
    await Promise.all(
      [...viCua.entries()].map(async ([ma, diaChi]) => {
        const mongDoi = VAI_TRO_ON_CHAIN[vaiTroNguoi.get(ma)];
        if (!mongDoi) return;
        try {
          const thucTe = await chain.vaiTroTrenChain(diaChi);
          if (thucTe !== null && thucTe !== mongDoi) lechVaiTro.add(ma);
        } catch (err) {
          console.error(
            "Không đọc được vai trò on-chain của",
            ma,
            err.shortMessage || err.message,
          );
        }
      }),
    );

    const data = items.map((it) => {
      const stt = Number(it.so_thu_tu_su_kien);
      let lyDo = null;

      if (it.blockchain_sync_status === "SUBMITTED")
        lyDo =
          "Đã gửi giao dịch, đang chờ blockchain xác nhận (hệ thống tự kiểm tra)";
      else if (!viCuaToiAddr) lyDo = "Bạn chưa có ví được duyệt";
      else if (lechVaiTro.has(maNguoiDung))
        lyDo =
          "Ví của bạn đã được duyệt trong hệ thống nhưng hợp đồng blockchain hiện tại chưa gán vai trò cho ví này (hợp đồng có thể đã được triển khai lại). Hãy nhờ quản trị viên duyệt lại ví (Quản trị → Ví blockchain)";
      else if (minChuaXacNhan.get(it.ma_lo_nong_san) !== stt)
        lyDo = "Đang chờ sự kiện trước của lô được ký";

      const ts = it.outbox.tham_so || {};
      if (!lyDo && it.outbox.ham === "createChild") {
        const seqs = ts.seq_lo_nguon || [];
        (ts.ma_lo_nguon || []).forEach((lo, i) => {
          const min = minChuaXacNhan.get(lo);
          if (min !== undefined && min <= seqs[i])
            lyDo = `Đang chờ lô nguồn ${lo} được ký xong`;
        });
      }

      // Tạo lệnh vận chuyển: bên gửi chỉ ký xác nhận lấy hàng đi sau khi đơn vị vận chuyển đã chấp nhận lệnh
      if (
        !lyDo &&
        it.outbox.ham === "orderTransport" &&
        trangThaiLenh.get(ts.ma_van_don) === "CHO_CHAP_NHAN"
      ) {
        lyDo = `Chờ ${nhanDien(ts.ma_don_vi_van_chuyen)} chấp nhận lệnh vận chuyển, sau đó bạn mới ký xác nhận lấy hàng đi`;
      }

      const dung = dungThamSoGoiHam(it.outbox, viCua);
      if (!lyDo && dung.loi) lyDo = dung.loi;
      if (!lyDo && dung.thieuVi) {
        lyDo = `Chờ ${dung.thieuVi.map(nhanDien).join(", ")} liên kết ví và được quản trị viên duyệt ví`;
      }
      if (!lyDo && it.outbox.ham === "orderTransport") {
        const lech = [ts.ma_don_vi_van_chuyen, ts.ma_ben_nhan].filter((ma) =>
          lechVaiTro.has(ma),
        );
        if (lech.length > 0)
          lyDo = `Ví của ${lech.map(nhanDien).join(", ")} đã duyệt trong hệ thống nhưng chưa có vai trò trên hợp đồng blockchain hiện tại. Quản trị viên cần duyệt lại ví (Quản trị → Ví blockchain)`;
      }

      const mo = moTaSuKien(it.loai_hoat_dong, ts, nhanDien);
      return {
        ma_lich_su: it.ma_lich_su,
        ma_lo: it.ma_lo_nong_san,
        ket_qua: mo.ket_qua,
        chi_tiet: mo.chi_tiet,
        dau_hang_lo: minChuaXacNhan.get(it.ma_lo_nong_san) === stt,
        stt,
        loai: it.loai_hoat_dong,
        thoi_diem: it.thoi_diem_xay_ra,
        trang_thai: it.blockchain_sync_status,
        san_sang: !lyDo,
        ly_do: lyDo,
        tx_hash: it.blockchain_sync_status === "SUBMITTED" ? it.tx_hash : null,
        loi_truoc:
          it.blockchain_sync_status === "SUBMITTED"
            ? null
            : it.last_error || null,
        ham: it.outbox.ham,
        args: lyDo ? null : dung.args,
        // Khi đang chờ sự kiện trước của lô: sự kiện nào, ai phải ký
        chan_boi:
          lyDo === "Đang chờ sự kiện trước của lô được ký"
            ? chanBoi.get(it.ma_lo_nong_san) || null
            : null,
      };
    });

    return res.json({
      success: true,
      data: { vi: viCuaToiAddr, su_kien: data },
    });
  } catch (err) {
    return sendError(res, err, "Không thể lấy danh sách sự kiện chờ ký");
  }
};

// Các sự kiện người dùng đã ký và đã xác nhận trên blockchain (mới nhất trước), để tra lại giao dịch
const lichSuDaKy = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT ma_lich_su, ma_lo_nong_san AS ma_lo, so_thu_tu_su_kien AS stt, loai_hoat_dong AS loai,
             thoi_diem_xay_ra AS thoi_diem, ma_giao_dich_blockchain AS tx_hash, so_block, dia_chi_vi_ky,
             ma_bam_su_kien_hien_tai AS event_hash
      FROM lich_su_truy_xuat_lo
      WHERE ma_nguoi_dung = ? AND blockchain_sync_status = 'CONFIRMED'
      ORDER BY created_at DESC, so_thu_tu_su_kien DESC
      LIMIT 20
      `,
      [req.user.ma_nguoi_dung],
    );
    return res.json({ success: true, data: { su_kien: rows } });
  } catch (err) {
    return sendError(res, err, "Không thể lấy lịch sử đã ký");
  }
};

/* ======================= Xác nhận giao dịch ======================= */

// Trình duyệt báo "đã gửi giao dịch" ngay khi MetaMask trả mã giao dịch (trước khi vào khối).
// Nếu sau đó trình duyệt bị đóng, Outbox worker vẫn theo dõi giao dịch này tới khi xác nhận.
const daGuiSuKien = async (req, res) => {
  try {
    const { maLichSu } = req.params;
    const txHash = txHashHopLe(req.body?.txHash);
    if (!txHash) throw new ApiError(400, "Mã giao dịch không hợp lệ");
    const [rows] = await db.query(
      `SELECT ma_nguoi_dung, blockchain_sync_status FROM lich_su_truy_xuat_lo WHERE ma_lich_su = ? LIMIT 1`,
      [maLichSu],
    );
    const ev = rows[0];
    if (!ev || ev.ma_nguoi_dung !== req.user.ma_nguoi_dung) {
      throw new ApiError(404, "Không tìm thấy sự kiện cần ký của bạn");
    }
    if (ev.blockchain_sync_status !== "CONFIRMED") {
      await withTransaction((connection) =>
        ghiNhanDaGui(connection, { maLichSu, txHash }),
      );
    }
    return res.json({
      success: true,
      message: "Đã ghi nhận giao dịch, đang chờ blockchain xác nhận",
    });
  } catch (err) {
    return sendError(res, err, "Không thể ghi nhận giao dịch đã gửi");
  }
};

const xacNhanSuKien = async (req, res) => {
  try {
    const { maLichSu } = req.params;
    const txHash = req.body?.txHash;
    if (typeof txHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
      throw new ApiError(400, "Mã giao dịch không hợp lệ");
    }

    const [rows] = await db.query(
      `
      SELECT ma_lich_su, ma_lo_nong_san, ma_nguoi_dung, ma_bam_su_kien_hien_tai, blockchain_sync_status
      FROM lich_su_truy_xuat_lo WHERE ma_lich_su = ? LIMIT 1
      `,
      [maLichSu],
    );
    const ev = rows[0];
    if (!ev || ev.ma_nguoi_dung !== req.user.ma_nguoi_dung) {
      throw new ApiError(404, "Không tìm thấy sự kiện cần ký của bạn");
    }
    if (ev.blockchain_sync_status === "CONFIRMED") {
      return res.json({
        success: true,
        message: "Sự kiện đã được xác nhận trước đó",
      });
    }

    const kq = await chain.kiemTraGiaoDichSuKien(txHash, {
      maLo: ev.ma_lo_nong_san,
      eventHash: ev.ma_bam_su_kien_hien_tai,
    });

    // Ví ký phải là ví đã được duyệt của chính người dùng này
    const [vi] = await db.query(
      `SELECT dia_chi_vi FROM vi_blockchain WHERE ma_nguoi_dung = ? AND trang_thai_duyet = 'DA_DUYET' LIMIT 1`,
      [req.user.ma_nguoi_dung],
    );
    if (vi.length === 0 || vi[0].dia_chi_vi.toLowerCase() !== kq.signer) {
      throw new ApiError(403, "Giao dịch không do ví đã duyệt của bạn ký");
    }

    await withTransaction((connection) =>
      ghiNhanDaXacNhan(connection, {
        maLichSu,
        maLo: ev.ma_lo_nong_san,
        txHash: txHash.toLowerCase(),
        signer: kq.signer,
        soBlock: kq.blockNumber,
      }),
    );

    return res.json({
      success: true,
      message: "Đã xác nhận sự kiện trên blockchain",
    });
  } catch (err) {
    return sendError(res, err, "Không thể xác nhận sự kiện");
  }
};

/* ======================= Xác thực (công khai cho người tiêu dùng) ======================= */

// Đối chiếu một lô: chuỗi hash trong MySQL, dữ liệu gốc (mùa vụ, chỉ số kiểm định, lô nguồn) và hash trên chain.
// Dùng cho trang xác thực công khai và cho đối soát toàn bộ của admin.
const xacThucMotLo = async (maLoVao) => {
  const maLo = String(maLoVao || "")
    .replace(/^#/, "")
    .trim();
  const [loRows] = await db.query(
    `SELECT ma_lo_nong_san, latest_event_sequence, latest_event_hash FROM lo_nong_san WHERE ma_lo_nong_san = ?`,
    [maLo],
  );
  if (loRows.length === 0) throw new ApiError(404, "Không tìm thấy lô hàng");
  const lo = loRows[0];

  const [events] = await db.query(
    `
    SELECT ls.so_thu_tu_su_kien, ls.loai_hoat_dong, ls.thoi_diem_xay_ra, ls.du_lieu_chi_tiet,
           ls.ma_bam_du_lieu, ls.ma_bam_su_kien_truoc, ls.ma_bam_su_kien_hien_tai,
           ls.ma_giao_dich_blockchain, ls.dia_chi_vi_ky, ls.blockchain_sync_status,
           nd.ho_ten, nd.vai_tro
    FROM lich_su_truy_xuat_lo ls
    JOIN nguoi_dung nd ON nd.ma_nguoi_dung = ls.ma_nguoi_dung
    WHERE ls.ma_lo_nong_san = ?
    ORDER BY ls.so_thu_tu_su_kien
    `,
    [maLo],
  );

  const cfg = chain.layCauHinh();
  let trangThai = "VERIFIED";
  const lyDo = [];
  const danger = (status, text) => {
    // mức nghiêm trọng: BROKEN_CHAIN > MISMATCH > INCOMPLETE > VERIFIED
    const bac = { VERIFIED: 0, INCOMPLETE: 1, MISMATCH: 2, BROKEN_CHAIN: 3 };
    if (bac[status] > bac[trangThai]) trangThai = status;
    lyDo.push(text);
  };

  if (events.length === 0) {
    return {
      trang_thai: "NOT_CHECKED",
      ly_do: ["Lô chưa có sự kiện truy xuất nào được ghi nhận lên blockchain"],
      so_su_kien: 0,
      da_xac_nhan: 0,
      hash_moi_nhat: null,
      tren_chain: null,
      explorer_url: cfg.explorerUrl,
      contract_address: cfg.contractAddress,
      ten_mang: cfg.tenMang,
      chain_id: cfg.chainId,
      su_kien: [],
    };
  }

  // 1. Chuỗi hash trong MySQL phải liền mạch và đúng nội dung
  let prev = ZERO_HASH;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const stt = i + 1;
    if (
      Number(e.so_thu_tu_su_kien) !== stt ||
      e.ma_bam_su_kien_truoc !== prev
    ) {
      danger("BROKEN_CHAIN", `Chuỗi sự kiện bị đứt tại bước ${stt}`);
      break;
    }
    let payload;
    try {
      payload = docJson(e.du_lieu_chi_tiet);
    } catch {
      danger("MISMATCH", `Nội dung sự kiện ${stt} không đọc được`);
      break;
    }
    const hashND = hashNoiDung(payload);
    if (
      hashND !== e.ma_bam_du_lieu ||
      hashSuKien(prev, hashND) !== e.ma_bam_su_kien_hien_tai
    ) {
      danger(
        "MISMATCH",
        `Nội dung sự kiện ${stt} (${e.loai_hoat_dong}) đã bị thay đổi sau khi ghi`,
      );
      break;
    }

    // Thu hoạch: snapshot mùa vụ và vật tư hiện tại phải trùng snapshot đã chốt
    if (
      e.loai_hoat_dong === "HARVEST_CONFIRMED" &&
      payload.du_lieu?.ma_mua_vu &&
      payload.du_lieu?.hash_ban_chup
    ) {
      const snap = await layBanChupMuaVu(db, payload.du_lieu.ma_mua_vu);
      if (!snap || snap.hash !== payload.du_lieu.hash_ban_chup) {
        danger(
          "MISMATCH",
          "Thông tin mùa vụ hoặc vật tư (phân bón, thuốc BVTV) đã bị thay đổi sau khi chốt thu hoạch",
        );
      }
    }

    // Kiểm định: chỉ số xét nghiệm hiện tại phải trùng chỉ số lúc công bố
    if (payload.du_lieu?.ma_kiem_dinh && payload.du_lieu?.hash_chi_so) {
      const chiSo = await layChiSoKiemDinh(db, payload.du_lieu.ma_kiem_dinh);
      if (hashNoiDung(chiSo) !== payload.du_lieu.hash_chi_so) {
        danger(
          "MISMATCH",
          "Chỉ số xét nghiệm của hồ sơ kiểm định đã bị thay đổi sau khi công bố",
        );
      }
    }

    // Lô con: hash lô nguồn đã cam kết phải đúng với chuỗi của lô nguồn
    if (e.loai_hoat_dong === "BATCH_RELATION") {
      for (const n of payload.du_lieu?.nguon || []) {
        const [src] = await db.query(
          `SELECT ma_bam_su_kien_hien_tai FROM lich_su_truy_xuat_lo WHERE ma_lo_nong_san = ? AND so_thu_tu_su_kien = ?`,
          [n.ma_lo, n.seq],
        );
        if (src.length === 0 || src[0].ma_bam_su_kien_hien_tai !== n.hash) {
          danger(
            "MISMATCH",
            `Lô nguồn ${n.ma_lo} không khớp với cam kết khi tạo lô`,
          );
        }
      }
    }
    prev = e.ma_bam_su_kien_hien_tai;
  }
  if (
    events.length > 0 &&
    lo.latest_event_hash !== events[events.length - 1].ma_bam_su_kien_hien_tai
  ) {
    danger("BROKEN_CHAIN", "Hash mới nhất của lô không khớp lịch sử sự kiện");
  }

  // 2. Đối chiếu với blockchain
  let tren = null;
  if (
    events.length > 0 &&
    trangThai !== "BROKEN_CHAIN" &&
    trangThai !== "MISMATCH"
  ) {
    if (!cfg.daCauHinh) {
      danger("INCOMPLETE", "Server chưa cấu hình contract blockchain");
    } else {
      try {
        tren = await chain.layTrangThaiLoTrenChain(maLo);
      } catch (err) {
        console.error("Lỗi đọc blockchain:", err);
        danger(
          "INCOMPLETE",
          "Không đọc được blockchain lúc này, hãy thử lại sau",
        );
      }
      if (tren) {
        if (!tren.tonTai) {
          danger(
            "INCOMPLETE",
            "Chưa có sự kiện nào của lô được ký lên blockchain",
          );
        } else {
          const idx = events.findIndex(
            (e) => e.ma_bam_su_kien_hien_tai === tren.lastHash,
          );
          if (idx === -1) {
            danger(
              "MISMATCH",
              "Hash trên blockchain không khớp bất kỳ sự kiện nào trong hệ thống",
            );
          } else if (idx < events.length - 1) {
            danger(
              "INCOMPLETE",
              `Mới có ${idx + 1}/${events.length} sự kiện được ký lên blockchain`,
            );
          }
        }
      }
    }
  }

  await db.query(
    `UPDATE lo_nong_san SET integrity_status = ? WHERE ma_lo_nong_san = ?`,
    [trangThai, maLo],
  );

  return {
    trang_thai: trangThai,
    ly_do: lyDo,
    so_su_kien: events.length,
    da_xac_nhan: events.filter((e) => e.blockchain_sync_status === "CONFIRMED")
      .length,
    hash_moi_nhat: lo.latest_event_hash,
    tren_chain: tren,
    explorer_url: cfg.explorerUrl,
    contract_address: cfg.contractAddress,
    ten_mang: cfg.tenMang,
    chain_id: cfg.chainId,
    su_kien: events.map((e) => ({
      stt: Number(e.so_thu_tu_su_kien),
      loai: e.loai_hoat_dong,
      thoi_diem: e.thoi_diem_xay_ra,
      nguoi_ky: e.ho_ten,
      vai_tro: e.vai_tro,
      dia_chi_vi_ky: e.dia_chi_vi_ky ? getAddress(e.dia_chi_vi_ky) : null,
      tx_hash: e.ma_giao_dich_blockchain,
      trang_thai: e.blockchain_sync_status,
    })),
  };
};

/* ======================= Đối soát toàn bộ (admin) ======================= */

// Kết quả lần đối soát gần nhất (lý do chi tiết từng lô); trạng thái tổng thì lưu ở lo_nong_san.integrity_status
const doiSoatCuoi = {
  thoiDiem: null,
  soLo: 0,
  thoiGianMs: 0,
  nguoiChay: null,
  lyDo: new Map(),
};
let dangDoiSoat = false;

const tongQuanDoiSoat = async () => {
  const [los] = await db.query(
    `
    SELECT lo.ma_lo_nong_san, sp.ten_san_pham, lo.integrity_status, lo.blockchain_sync_status,
           lo.latest_event_sequence AS so_su_kien, nd.ho_ten AS nguoi_giu, nd.vai_tro AS vai_tro_nguoi_giu,
           (SELECT COUNT(*) FROM lich_su_truy_xuat_lo ls
             WHERE ls.ma_lo_nong_san = lo.ma_lo_nong_san AND ls.blockchain_sync_status = 'CONFIRMED') AS da_ky
    FROM lo_nong_san lo
    LEFT JOIN san_pham_nong_san sp ON sp.ma_san_pham = lo.ma_san_pham
    LEFT JOIN nguoi_dung nd ON nd.ma_nguoi_dung = lo.ma_nguoi_quan_ly
    WHERE lo.latest_event_sequence > 0
    ORDER BY FIELD(lo.integrity_status, 'BROKEN_CHAIN', 'MISMATCH', 'INCOMPLETE', 'NOT_CHECKED', 'VERIFIED'),
             lo.ma_lo_nong_san DESC
    LIMIT 500
    `,
  );
  const [[{ chua_theo_doi: chuaTheoDoi }]] = await db.query(
    `SELECT COUNT(*) AS chua_theo_doi FROM lo_nong_san WHERE latest_event_sequence = 0`,
  );
  const [nhatKy] = await db.query(
    `
    SELECT ls.ma_lich_su, ls.thoi_diem_xay_ra, ls.loai_hoat_dong, ls.ma_lo_nong_san, nd.ho_ten, nd.vai_tro,
           ls.dia_chi_vi_ky, ls.ma_giao_dich_blockchain, ls.so_block, ls.blockchain_sync_status
    FROM lich_su_truy_xuat_lo ls
    JOIN nguoi_dung nd ON nd.ma_nguoi_dung = ls.ma_nguoi_dung
    ORDER BY ls.thoi_diem_xay_ra DESC, ls.so_thu_tu_su_kien DESC
    LIMIT 30
    `,
  );
  const thongKe = {
    VERIFIED: 0,
    INCOMPLETE: 0,
    MISMATCH: 0,
    BROKEN_CHAIN: 0,
    NOT_CHECKED: 0,
  };
  los.forEach((l) => {
    thongKe[l.integrity_status] = (thongKe[l.integrity_status] || 0) + 1;
  });
  const cfg = chain.layCauHinh();
  return {
    thong_ke: {
      ...thongKe,
      tong: los.length,
      chua_theo_doi: Number(chuaTheoDoi),
    },
    lo: los.map((l) => ({
      ...l,
      so_su_kien: Number(l.so_su_kien),
      da_ky: Number(l.da_ky),
      ly_do: doiSoatCuoi.lyDo.get(l.ma_lo_nong_san) || [],
    })),
    nhat_ky: nhatKy.map((e) => ({
      ...e,
      dia_chi_vi_ky: e.dia_chi_vi_ky ? getAddress(e.dia_chi_vi_ky) : null,
    })),
    lan_chay_cuoi: doiSoatCuoi.thoiDiem
      ? {
          thoi_diem: doiSoatCuoi.thoiDiem,
          so_lo: doiSoatCuoi.soLo,
          thoi_gian_ms: doiSoatCuoi.thoiGianMs,
          nguoi_chay: doiSoatCuoi.nguoiChay,
        }
      : null,
    dang_chay: dangDoiSoat,
    explorer_url: cfg.explorerUrl,
    contract_address: cfg.contractAddress,
    ten_mang: cfg.tenMang,
  };
};

const thongTinDoiSoat = async (req, res) => {
  try {
    return res.json({ success: true, data: await tongQuanDoiSoat() });
  } catch (err) {
    return sendError(res, err, "Không thể lấy kết quả đối soát");
  }
};

// Chạy lại xác thực cho mọi lô có sự kiện: chuỗi hash MySQL, dữ liệu gốc, và hash mới nhất trên chain
const chayDoiSoat = async (req, res) => {
  if (dangDoiSoat) {
    return res
      .status(409)
      .json({ success: false, message: "Đang có lượt đối soát chạy, hãy đợi" });
  }
  dangDoiSoat = true;
  const batDau = Date.now();
  try {
    const [los] = await db.query(
      `SELECT ma_lo_nong_san FROM lo_nong_san WHERE latest_event_sequence > 0 ORDER BY ma_lo_nong_san LIMIT 500`,
    );
    const lyDo = new Map();
    for (const { ma_lo_nong_san: maLo } of los) {
      try {
        const kq = await xacThucMotLo(maLo);
        lyDo.set(maLo, kq.ly_do);
      } catch (err) {
        lyDo.set(maLo, [`Lỗi khi đối soát: ${err.message}`]);
      }
    }
    Object.assign(doiSoatCuoi, {
      thoiDiem: new Date(),
      soLo: los.length,
      thoiGianMs: Date.now() - batDau,
      nguoiChay: req.user?.ma_nguoi_dung || null,
      lyDo,
    });
    dangDoiSoat = false;
    const data = await tongQuanDoiSoat();
    const t = data.thong_ke;
    return res.json({
      success: true,
      message: `Đã đối soát ${los.length} lô: ${t.VERIFIED} khớp, ${t.INCOMPLETE} chờ đủ chữ ký, ${t.MISMATCH + t.BROKEN_CHAIN} có sai lệch`,
      data,
    });
  } catch (err) {
    dangDoiSoat = false;
    return sendError(res, err, "Không thể chạy đối soát");
  }
};

// Dòng dõi của lô: lô nguồn (đi ngược về nông trại, mỗi lô được xác thực chuỗi riêng) và lô con (tách / gộp / sơ chế ra từ lô này).
// Khi một lô tách thành nhiều lô, mỗi lô con vẫn lần ngược được tới lô gốc qua các liên kết này.
const TOI_DA_LO_DONG_DOI = 15;
const MUC_NGHIEM_TRONG = { VERIFIED: 0, NOT_CHECKED: 0, INCOMPLETE: 1, MISMATCH: 2, BROKEN_CHAIN: 3 };

const layDongDoi = async (maLo) => {
  const nguon = [];
  const daThay = new Set([maLo]);
  let bac = [{ ma: maLo, tang: 0 }];
  while (bac.length > 0 && nguon.length < TOI_DA_LO_DONG_DOI) {
    const ke = [];
    for (const { ma, tang } of bac) {
      const [rows] = await db.query(
        `
        SELECT ma_lo_nguon, loai_lien_ket, CAST(so_luong_tham_gia AS CHAR) AS so_luong, don_vi_tinh
        FROM lien_ket_nguon_goc_lo WHERE ma_lo_duoc_tao_ra = ? ORDER BY ma_lo_nguon
        `,
        [ma],
      );
      for (const r of rows) {
        if (daThay.has(r.ma_lo_nguon) || nguon.length >= TOI_DA_LO_DONG_DOI) continue;
        daThay.add(r.ma_lo_nguon);
        let xacThuc = null;
        try {
          xacThuc = await xacThucMotLo(r.ma_lo_nguon);
        } catch {
          xacThuc = null;
        }
        nguon.push({
          ma_lo: r.ma_lo_nguon,
          tang: tang + 1,
          tao_ra_lo: ma,
          loai_lien_ket: r.loai_lien_ket,
          so_luong: r.so_luong,
          don_vi_tinh: r.don_vi_tinh,
          xac_thuc: xacThuc,
        });
        ke.push({ ma: r.ma_lo_nguon, tang: tang + 1 });
      }
    }
    bac = ke;
  }

  const con = [];
  const daThayCon = new Set([maLo]);
  bac = [{ ma: maLo, tang: 0 }];
  while (bac.length > 0 && con.length < TOI_DA_LO_DONG_DOI) {
    const ke = [];
    for (const { ma, tang } of bac) {
      const [rows] = await db.query(
        `
        SELECT k.ma_lo_duoc_tao_ra AS ma_lo, k.loai_lien_ket, CAST(k.so_luong_tham_gia AS CHAR) AS so_luong, k.don_vi_tinh,
               lo.giai_doan_hien_tai, lo.latest_event_sequence AS so_su_kien, nd.ho_ten AS nguoi_giu, nd.vai_tro AS vai_tro_nguoi_giu,
               (SELECT COUNT(*) FROM lich_su_truy_xuat_lo ls WHERE ls.ma_lo_nong_san = lo.ma_lo_nong_san AND ls.blockchain_sync_status = 'CONFIRMED') AS da_ky
        FROM lien_ket_nguon_goc_lo k
        JOIN lo_nong_san lo ON lo.ma_lo_nong_san = k.ma_lo_duoc_tao_ra
        JOIN nguoi_dung nd ON nd.ma_nguoi_dung = lo.ma_nguoi_quan_ly
        WHERE k.ma_lo_nguon = ? ORDER BY k.ma_lo_duoc_tao_ra
        `,
        [ma],
      );
      for (const r of rows) {
        if (daThayCon.has(r.ma_lo) || con.length >= TOI_DA_LO_DONG_DOI) continue;
        daThayCon.add(r.ma_lo);
        con.push({
          ma_lo: r.ma_lo,
          tang: tang + 1,
          tao_tu_lo: ma,
          loai_lien_ket: r.loai_lien_ket,
          so_luong: r.so_luong,
          don_vi_tinh: r.don_vi_tinh,
          giai_doan: r.giai_doan_hien_tai,
          nguoi_giu: r.nguoi_giu,
          vai_tro_nguoi_giu: r.vai_tro_nguoi_giu,
          so_su_kien: Number(r.so_su_kien),
          da_ky: Number(r.da_ky),
        });
        ke.push({ ma: r.ma_lo, tang: tang + 1 });
      }
    }
    bac = ke;
  }
  return { lo_nguon: nguon, lo_con: con };
};

const xacThucLo = async (req, res) => {
  try {
    const data = await xacThucMotLo(req.params.maLo);
    // Dòng dõi là phần thêm: lỗi ở đây không được làm hỏng kết quả xác thực của chính lô này
    try {
      const maLo = String(req.params.maLo || "").replace(/^#/, "").trim();
      data.dong_doi = await layDongDoi(maLo);
      let toanChuoi = data.trang_thai;
      for (const n of data.dong_doi.lo_nguon) {
        const tt = n.xac_thuc?.trang_thai;
        if (tt && MUC_NGHIEM_TRONG[tt] > MUC_NGHIEM_TRONG[toanChuoi]) toanChuoi = tt;
      }
      data.trang_thai_toan_chuoi = toanChuoi;
    } catch (err) {
      console.error("Không lấy được dòng dõi của lô:", err);
      data.dong_doi = { lo_nguon: [], lo_con: [] };
      data.trang_thai_toan_chuoi = data.trang_thai;
    }
    return res.json({ success: true, data });
  } catch (err) {
    return sendError(res, err, "Không thể xác thực lô hàng");
  }
};

module.exports = {
  layCauHinhCongKhai,
  viCuaToi,
  taoNonce,
  lienKetVi,
  danhSachViChoDuyet,
  danhSachVi,
  duyetVi,
  tuChoiVi,
  dongBoVaiTro,
  thongTinNguong,
  xacNhanNguong,
  thongTinOutbox,
  chayOutboxNgay,
  thongTinDoiSoat,
  chayDoiSoat,
  choKy,
  lichSuDaKy,
  daGuiSuKien,
  xacNhanSuKien,
  xacThucLo,
};
