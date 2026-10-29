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

// Dùng chung nút RPC với server (BLOCKCHAIN_RPC_URL trong .env) để deploy và chạy app luôn cùng một đường mạng.
// Một số mạng/nhà mạng không phân giải được tên miền testnet-rpc.monad.xyz (lỗi ENOTFOUND): khi đó đổi
// BLOCKCHAIN_RPC_URL sang nút khác (ví dụ nút đang dùng trong MetaMask).
const monadRpcUrl =
  process.env.BLOCKCHAIN_RPC_URL || "https://testnet-rpc.monad.xyz";

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
      url: monadRpcUrl,
      chainId: 10143,
      accounts,
    },
  },
});
