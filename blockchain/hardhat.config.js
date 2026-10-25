import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { defineConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";

// Đọc .env ở thư mục cha (Agrichain/.env), rồi thử .env ngay trong thư mục này làm dự phòng.
// Đường dẫn tính theo vị trí file config nên chạy lệnh ở đâu cũng đúng.
dotenv.config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
  quiet: true,
});
dotenv.config({
  path: fileURLToPath(new URL("./.env", import.meta.url)),
  quiet: true,
});

// Ví dùng để deploy lên Monad (key nằm trong .env, KHÔNG commit)
const accounts = process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [];

export default defineConfig({
  plugins: [hardhatEthers],
  // Bật optimizer: hợp đồng v2 khi không tối ưu dài ~26,9 KB, vượt giới hạn 24 KB của EVM
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    localhost: { type: "http", url: "http://127.0.0.1:8545" },
    monadTestnet: {
      type: "http",
      url: "https://testnet-rpc.monad.xyz",
      chainId: 10143,
      accounts,
    },
  },
});
