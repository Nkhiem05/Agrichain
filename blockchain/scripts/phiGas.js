// Tính phí gas của một hành trình lô hàng đầy đủ (nông dân -> sơ chế -> phân phối -> đại lý) theo GIÁ GAS HIỆN TẠI của mạng.
//
// Chạy:  node scripts/phiGas.js            (đọc giá gas từ BLOCKCHAIN_RPC_URL trong .env, mặc định Monad Testnet)
//
// Cách tính:  phí (MON) = gas x giá gas.  Monad tính phí theo GAS LIMIT của giao dịch, không phải gas đã dùng,
// nên bảng dùng "gas limit tối thiểu" (kết quả estimateGas) làm mốc.
// Số gas bên dưới ĐO bằng cách chạy đủ hành trình trên Hardhat (luật gas của Ethereum) với hợp đồng v3.
// "Cận trên Monad" cộng thêm 6.000 gas cho mỗi ô nhớ chạm lần đầu trong giao dịch (Monad tính 8.100 thay vì 2.100)
// và coi như không có ô nào chung trang nhớ, nên số thật nằm giữa hai cột. Muốn chính xác tuyệt đối: đọc "Gas used"
// của giao dịch thật trên trang xem blockchain.
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { FetchRequest, JsonRpcProvider, formatUnits } from "ethers";

dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });

// [bước, người ký, gas limit tối thiểu, số ô nhớ chạm lần đầu, số lần trong một hành trình đầy đủ]
const BUOC = [
  ["Chốt thu hoạch (harvest)", "Nông dân", 118960, 6, 1],
  ["Chủ lô ký biên bản lấy mẫu (confirmSampling)", "Nông dân", 109082, 8, 1],
  ["Cơ quan niêm phong mẫu (certify)", "Cơ quan kiểm định", 52865, 8, 1],
  ["Cơ quan công bố đạt (certify)", "Cơ quan kiểm định", 119993, 11, 1],
  ["Tạo lệnh bàn giao (orderTransport)", "Bên gửi", 124500, 15, 3],
  ["Vận chuyển lấy hàng (pickup)", "Vận chuyển", 44750, 6, 3],
  ["Bên nhận ký nhận (confirmReceive)", "Bên nhận", 61380, 8, 3],
  ["Sơ chế hoàn tất (step)", "Sơ chế", 40451, 5, 1],
  ["Đại lý đóng lô (step)", "Đại lý", 43505, 5, 1],
];
const GAS_MOI_O_NHO_THEM = 6000;

const rpc = process.env.BLOCKCHAIN_RPC_URL || "https://testnet-rpc.monad.xyz";
const chainId = Number(process.env.BLOCKCHAIN_CHAIN_ID) || 10143;
const req = new FetchRequest(rpc);
req.setHeader(
  "User-Agent",
  process.env.BLOCKCHAIN_RPC_USER_AGENT ||
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
);
const provider = new JsonRpcProvider(req, chainId, { staticNetwork: true, batchMaxCount: 1 });

const fee = await provider.getFeeData();
const giaGas = fee.maxFeePerGas ?? fee.gasPrice;
if (!giaGas) throw new Error("Không đọc được giá gas từ RPC " + rpc);
const mon = (gas) => Number(formatUnits(BigInt(gas) * giaGas, 18));

console.log(`RPC: ${rpc}`);
console.log(`Giá gas hiện tại: ${formatUnits(giaGas, "gwei")} gwei (maxFeePerGas ${fee.maxFeePerGas ?? "—"}, gasPrice ${fee.gasPrice ?? "—"})\n`);
console.log("Bước".padEnd(48), "Người ký".padEnd(18), "Gas", "\t", "Phí (MON)", "\t", "Cận trên (MON)");
let tongGas = 0, tongTren = 0, tongTx = 0;
for (const [ten, nguoi, gas, o, lan] of BUOC) {
  const tren = gas + o * GAS_MOI_O_NHO_THEM;
  tongGas += gas * lan; tongTren += tren * lan; tongTx += lan;
  console.log(ten.padEnd(48), nguoi.padEnd(18), String(gas).padStart(7), "\t", mon(gas).toFixed(5), "\t", mon(tren).toFixed(5), lan > 1 ? `  (x${lan})` : "");
}
console.log(`\nMột hành trình đầy đủ: ${tongTx} giao dịch (hợp đồng v3)`);
console.log(`  Tổng gas limit: ${tongGas}  ->  ${mon(tongGas).toFixed(4)} MON`);
console.log(`  Cận trên Monad: ${tongGas + (tongTren - tongGas)}  ->  ${mon(tongTren).toFixed(4)} MON`);
console.log(`  Trung bình mỗi giao dịch: ${(mon(tongGas) / tongTx).toFixed(5)} MON`);
