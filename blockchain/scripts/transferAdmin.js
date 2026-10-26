import { network } from "hardhat";
import fs from "node:fs";

// Chuyển quyền admin của hợp đồng AgriChain sang ví mới (dùng khi đổi ví admin / khóa ví cũ bị lộ).
// Ví ký = ví admin HIỆN TẠI (PRIVATE_KEY trong .env). Ví mới truyền qua biến môi trường NEW_ADMIN:
//   PowerShell: $env:NEW_ADMIN="0xVíMới"; npx hardhat run scripts/transferAdmin.js --network monadTestnet
//   cmd:        set NEW_ADMIN=0xVíMới&& npx hardhat run scripts/transferAdmin.js --network monadTestnet
const { ethers } = await network.getOrCreate();

const moi = (process.env.NEW_ADMIN || "").trim();
if (!ethers.isAddress(moi)) {
  console.error("Thiếu hoặc sai NEW_ADMIN (địa chỉ ví mới dạng 0x + 40 ký tự).");
  process.exit(1);
}

const [ky] = await ethers.getSigners();
if (!ky) {
  console.error("Chưa có ví ký: kiểm tra PRIVATE_KEY (khóa của ví admin hiện tại) trong .env.");
  process.exit(1);
}

const chainId = String((await ethers.provider.getNetwork()).chainId);
const daDeploy = fs.existsSync("deployed-agrichain.json")
  ? JSON.parse(fs.readFileSync("deployed-agrichain.json", "utf8"))
  : {};
const diaChi = process.env.BLOCKCHAIN_CONTRACT_ADDRESS || daDeploy[chainId];
if (!diaChi) {
  console.error(`Không tìm thấy địa chỉ hợp đồng cho chainId ${chainId}.`);
  process.exit(1);
}

const hopDong = await ethers.getContractAt("AgriChain", diaChi);
const adminCu = await hopDong.admin();
console.log("Hợp đồng:", diaChi, "| chainId:", chainId);
console.log("Admin hiện tại:", adminCu, "| ví đang ký:", ky.address);

if (adminCu.toLowerCase() === moi.toLowerCase()) {
  console.log("Ví mới đã là admin rồi, không cần chuyển.");
  process.exit(0);
}
if (adminCu.toLowerCase() !== ky.address.toLowerCase()) {
  console.error("PRIVATE_KEY trong .env không phải khóa của ví admin hiện tại, không chuyển được.");
  process.exit(1);
}

const tx = await hopDong.transferAdmin(moi);
console.log("Đã gửi giao dịch:", tx.hash);
await tx.wait();
console.log("Xong. Admin mới:", await hopDong.admin());
