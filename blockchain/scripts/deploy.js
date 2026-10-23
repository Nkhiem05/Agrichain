import { network } from "hardhat";
import fs from "node:fs";

const { ethers } = await network.getOrCreate();

const [deployer] = await ethers.getSigners();
if (!deployer) {
  console.error(
    "Chưa có ví để deploy. Kiểm tra PRIVATE_KEY trong file .env (dạng 0x + 64 ký tự).",
  );
  process.exit(1);
}
const chainId = String((await ethers.provider.getNetwork()).chainId);
console.log("chainId:", chainId, "| ví deploy:", deployer.address);

const nhatKy = await ethers.deployContract("NhatKy");
await nhatKy.waitForDeployment();
const address = await nhatKy.getAddress();

// deployed.json lưu địa chỉ contract theo từng mạng: { "31337": "0x...", "10143": "0x..." }
const file = "deployed.json";
const daDeploy = fs.existsSync(file)
  ? JSON.parse(fs.readFileSync(file, "utf8"))
  : {};
daDeploy[chainId] = address;
fs.writeFileSync(file, JSON.stringify(daDeploy, null, 2));
console.log("Đã deploy NhatKy tại:", address);
