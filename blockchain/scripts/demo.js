import { network } from "hardhat";
import fs from "node:fs";

const { ethers } = await network.getOrCreate();
const chainId = String((await ethers.provider.getNetwork()).chainId);

const daDeploy = JSON.parse(fs.readFileSync("deployed.json", "utf8"));
const address = daDeploy[chainId];
if (!address) {
  console.error(
    `Chưa deploy trên mạng chainId ${chainId}. Chạy deploy.js trước.`,
  );
  process.exit(1);
}
const nhatKy = await ethers.getContractAt("NhatKy", address);

const tx = await nhatKy.ghi(
  "Lô LO-001: thu hoạch 500kg cà chua lúc " +
    new Date().toLocaleString("vi-VN"),
);
console.log("Tx hash:", tx.hash);
await tx.wait();

const n = Number(await nhatKy.soMuc());
console.log(`\nNhật ký hiện có ${n} mục:`);
for (let i = 0; i < n; i++) {
  const m = await nhatKy.cacMuc(i);
  console.log(
    `#${i} | ${new Date(Number(m.thoiGian) * 1000).toLocaleString("vi-VN")} | ${m.nguoiGhi} | ${m.noiDung}`,
  );
}
