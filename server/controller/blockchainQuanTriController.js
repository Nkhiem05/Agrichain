const { getAddress } = require("ethers");
const loKet = require("../services/blockchain/loKet");

const traLoi = (res, err, macDinh) => {
  if (err instanceof loKet.LoiQuanTri || err.status) {
    return res.status(err.status).json({ success: false, message: err.message, van_de: err.van_de });
  }
  console.error(macDinh, err);
  return res.status(500).json({ success: false, message: macDinh });
};

const danhSachLoKet = async (req, res) => {
  try {
    return res.json({ success: true, data: await loKet.danhSachLoKet() });
  } catch (err) {
    return traLoi(res, err, "Không thể lấy danh sách lô đang chờ ký");
  }
};

const datLaiSuKien = async (req, res) => {
  try {
    await loKet.datLaiSuKien(req.params.maLichSu);
    return res.json({ success: true, message: "Đã trả sự kiện về hàng chờ ký, người ký ký lại được ngay" });
  } catch (err) {
    return traLoi(res, err, "Không thể cho ký lại");
  }
};

const huySuKien = async (req, res) => {
  try {
    const kq = await loKet.huySuKienChoKy(req.params.maLichSu);
    return res.json({
      success: true,
      message: `Đã hủy yêu cầu chờ ký của lô ${kq.ma_lo}. Dữ liệu lô giữ nguyên như trước khi người dùng bấm, họ có thể làm lại bước này`,
    });
  } catch (err) {
    return traLoi(res, err, "Không thể hủy yêu cầu");
  }
};

const danhSachViDoiDuoc = async (req, res) => {
  try {
    const ds = await loKet.danhSachViDoiDuoc();
    return res.json({
      success: true,
      data: ds.map((v) => ({ ...v, dia_chi_vi: getAddress(v.dia_chi_vi) })),
    });
  } catch (err) {
    return traLoi(res, err, "Không thể lấy danh sách ví");
  }
};

const kiemTraDoiVi = async (req, res) => {
  try {
    const kq = await loKet.kiemTraDoiVi(req.params.maNguoiDung);
    return res.json({ success: true, data: { ...kq, dia_chi_vi: getAddress(kq.dia_chi_vi) } });
  } catch (err) {
    return traLoi(res, err, "Không thể kiểm tra việc dang dở của người dùng");
  }
};

const goLienKetVi = async (req, res) => {
  try {
    const kq = await loKet.goLienKetVi(req.params.maNguoiDung, {
      lyDo: req.body?.ly_do,
      chapNhanMatLo: req.body?.chap_nhan_mat_lo === true,
    });
    return res.json({
      success: true,
      message: `Đã gỡ ví của ${kq.ho_ten}. Họ đăng nhập, liên kết ví mới ở mục Ký blockchain, sau đó bạn duyệt lại vai trò`,
      data: { ...kq, dia_chi_cu: getAddress(kq.dia_chi_cu) },
    });
  } catch (err) {
    return traLoi(res, err, "Không thể gỡ ví");
  }
};

module.exports = { danhSachLoKet, datLaiSuKien, huySuKien, danhSachViDoiDuoc, kiemTraDoiVi, goLienKetVi };
