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

// Khóa trên chain của một mã trong database. Mã (lô, hồ sơ kiểm định) chỉ ghi được MỘT lần trên mỗi hợp đồng,
// nên nhiều database dùng chung một hợp đồng, hoặc một database nạp lại từ bản cũ, sẽ sinh lại mã đã dùng
// và bị hợp đồng từ chối ("lo da ton tai", "ho so kiem dinh da ton tai").
// BLOCKCHAIN_NAMESPACE (trong .env) tách các mã đó thành các "không gian tên" riêng: mỗi database một tên,
// hoặc đổi tên mới mỗi khi nạp lại database sạch, là có khoảng mã hoàn toàn trống mà không cần deploy hợp đồng mới.
// Để trống = cách tính cũ keccak256(mã), nên dữ liệu đã ghi trước đây vẫn tra được. Không đổi tên khi database đã có dữ liệu đã ký.
const khoaTrenChain = (ma) => {
  const khongGian = (process.env.BLOCKCHAIN_NAMESPACE || "").trim();
  return id(khongGian ? `${khongGian}:${ma}` : String(ma));
};

// batchId trên chain = keccak256([không gian tên:]mã lô)
const batchIdCuaLo = (maLo) => khoaTrenChain(maLo);

// certId (cách cũ) = keccak256([không gian tên:]mã kiểm định). Chỉ còn dùng cho hồ sơ có sự kiện được tạo trước đây.
const certIdCuaHoSo = (maKiemDinh) => khoaTrenChain(maKiemDinh);

// certId của hồ sơ MỚI gắn thêm mã lô: hai database dùng chung hợp đồng (hoặc database nạp lại bản cũ) có thể
// sinh cùng mã hồ sơ (KD006...), nhưng trùng cả mã hồ sơ lẫn mã lô thì hiếm hơn nhiều. lanThu > 0 dùng khi cần đổi id
// vì id này cũng đã có trên chain. Id được lưu vào tham_so.cert_id của sự kiện nên mọi bước sau của hồ sơ dùng lại đúng id đó.
const certIdMoiCuaHoSo = (maKiemDinh, maLo, lanThu = 0) =>
  khoaTrenChain(`cert:${maKiemDinh}:${maLo}${lanThu > 0 ? `:${lanThu}` : ""}`);

// productId = keccak256(mã sản phẩm)
const productIdCuaSanPham = (maSanPham) => id(String(maSanPham ?? ""));

// Khối lượng trên chain tính bằng gram (số nguyên) để không dùng số thập phân.
// Trả về chuỗi số nguyên để gửi qua JSON (MetaMask/ethers nhận chuỗi cho uint128).
const sangGram = (soLuong, donVi = "kg") => {
  const so = Number(soLuong);
  if (!Number.isFinite(so) || so < 0) return "0";
  const dv = String(donVi || "kg")
    .trim()
    .toLowerCase();
  const heSo =
    dv === "g" || dv === "gram"
      ? 1
      : dv === "tấn" || dv === "tan" || dv === "t"
        ? 1_000_000
        : 1000;
  return String(Math.round(so * heSo));
};

module.exports = {
  canonicalJson,
  hashNoiDung,
  hashSuKien,
  batchIdCuaLo,
  certIdCuaHoSo,
  certIdMoiCuaHoSo,
  productIdCuaSanPham,
  sangGram,
};
