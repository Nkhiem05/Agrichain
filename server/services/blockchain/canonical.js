const { id, solidityPacked, keccak256 } = require("ethers");

// JSON chuẩn hóa: khóa sắp xếp tăng dần ở mọi cấp, để cùng dữ liệu luôn cho cùng hash
// dù MySQL hay JavaScript có đổi thứ tự khóa.
const sapXepKhoa = (value) => {
  if (Array.isArray(value)) return value.map(sapXepKhoa);
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        if (value[key] !== undefined) acc[key] = sapXepKhoa(value[key]);
        return acc;
      }, {});
  }
  return value;
};

const canonicalJson = (value) => JSON.stringify(sapXepKhoa(value));

// hash của nội dung sự kiện (nội dung gồm cả salt ngẫu nhiên)
const hashNoiDung = (value) => id(canonicalJson(value));

// hash sự kiện nối tiếp: eventHash = keccak256(prevHash, payloadHash)
const hashSuKien = (prevHash, payloadHash) =>
  keccak256(solidityPacked(["bytes32", "bytes32"], [prevHash, payloadHash]));

// batchId trên chain = keccak256(mã lô)
const batchIdCuaLo = (maLo) => id(String(maLo));

// certId = keccak256(mã kiểm định), productId = keccak256(mã sản phẩm)
const certIdCuaHoSo = (maKiemDinh) => id(String(maKiemDinh));
const productIdCuaSanPham = (maSanPham) => id(String(maSanPham ?? ""));

// Khối lượng trên chain tính bằng gram (số nguyên) để không dùng số thập phân.
// Trả về chuỗi số nguyên để gửi qua JSON (MetaMask/ethers nhận chuỗi cho uint128).
const sangGram = (soLuong, donVi = "kg") => {
  const so = Number(soLuong);
  if (!Number.isFinite(so) || so < 0) return "0";
  const dv = String(donVi || "kg").trim().toLowerCase();
  const heSo =
    dv === "g" || dv === "gram" ? 1 : dv === "tấn" || dv === "tan" || dv === "t" ? 1_000_000 : 1000;
  return String(Math.round(so * heSo));
};

module.exports = {
  canonicalJson,
  hashNoiDung,
  hashSuKien,
  batchIdCuaLo,
  certIdCuaHoSo,
  productIdCuaSanPham,
  sangGram,
};
