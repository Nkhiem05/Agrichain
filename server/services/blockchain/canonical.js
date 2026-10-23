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

module.exports = { canonicalJson, hashNoiDung, hashSuKien, batchIdCuaLo };
