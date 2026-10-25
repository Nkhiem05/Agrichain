const fs = require("fs");
const path = require("path");
const { JsonRpcProvider, Contract, Interface, getAddress } = require("ethers");
const { ABI } = require("./eventTypes");
const { batchIdCuaLo } = require("./canonical");

// Cấu hình đọc từ .env (mặc định: Monad Testnet). Địa chỉ contract lấy từ
// BLOCKCHAIN_CONTRACT_ADDRESS, hoặc từ blockchain/deployed-agrichain.json (do deploy-agrichain.js ghi).
const MAC_DINH = {
  chainId: 10143,
  tenMang: "Monad Testnet",
  rpcUrl: "https://testnet-rpc.monad.xyz",
  explorerUrl: "https://testnet.monadexplorer.com",
  tienTe: "MON",
};

const docDiaChiTuFile = (chainId) => {
  try {
    const file = path.join(
      __dirname,
      "../../../blockchain/deployed-agrichain.json",
    );
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return data[String(chainId)] || null;
  } catch {
    return null;
  }
};

const layCauHinh = () => {
  const chainId = Number(process.env.BLOCKCHAIN_CHAIN_ID) || MAC_DINH.chainId;
  const contractAddress =
    process.env.BLOCKCHAIN_CONTRACT_ADDRESS || docDiaChiTuFile(chainId) || null;
  return {
    chainId,
    tenMang: process.env.BLOCKCHAIN_NETWORK_NAME || MAC_DINH.tenMang,
    rpcUrl: process.env.BLOCKCHAIN_RPC_URL || MAC_DINH.rpcUrl,
    explorerUrl: process.env.BLOCKCHAIN_EXPLORER_URL || MAC_DINH.explorerUrl,
    tienTe: process.env.BLOCKCHAIN_CURRENCY || MAC_DINH.tienTe,
    contractAddress,
    daCauHinh: Boolean(contractAddress),
  };
};

let cache = null;
const layContract = () => {
  const cfg = layCauHinh();
  if (!cfg.contractAddress) return null;
  const key = `${cfg.rpcUrl}|${cfg.chainId}|${cfg.contractAddress}`;
  if (!cache || cache.key !== key) {
    const provider = new JsonRpcProvider(cfg.rpcUrl, cfg.chainId, {
      staticNetwork: true,
    });
    cache = {
      key,
      provider,
      contract: new Contract(cfg.contractAddress, ABI, provider),
      cfg,
    };
  }
  return cache;
};

const layTrangThaiLoTrenChain = async (maLo) => {
  const c = layContract();
  if (!c) return null;
  const batchId = batchIdCuaLo(maLo);
  const [b, chungNhanHopLe] = await Promise.all([
    c.contract.getBatch(batchId),
    c.contract.isCertValid(batchId),
  ]);
  return {
    tonTai: b.exists,
    trangThai: Number(b.status), // 1 còn hàng, 2 đã dùng, 3 đã đóng
    khongDat: b.failed,
    chuLo: b.owner,
    khoiLuongGram: b.quantity.toString(),
    lastHash: b.lastHash,
    orderStage: Number(b.orderStage),
    soChungNhan: Number(b.certCount),
    chungNhanHopLe,
  };
};

// Ví admin của hợp đồng (ví đã deploy hoặc ví được transferAdmin)
const adminTrenChain = async () => {
  const c = layContract();
  if (!c) return null;
  return getAddress(await c.contract.admin());
};

// Tìm lý do không đọc được hợp đồng: sai RPC, sai chainId, sai địa chỉ, hay địa chỉ là hợp đồng cũ (không phải v2)
const chanDoanHopDong = async () => {
  const c = layContract();
  if (!c) return "Chưa cấu hình địa chỉ hợp đồng (BLOCKCHAIN_CONTRACT_ADDRESS hoặc blockchain/deployed-agrichain.json)";
  const { provider, contract, cfg } = c;
  let chainIdRpc;
  try {
    chainIdRpc = Number(await provider.send("eth_chainId", []));
  } catch (err) {
    return `Không kết nối được RPC ${cfg.rpcUrl}: ${err.shortMessage || err.message}`;
  }
  if (chainIdRpc !== cfg.chainId) {
    return `RPC ${cfg.rpcUrl} là mạng chainId ${chainIdRpc}, nhưng cấu hình đang là ${cfg.chainId} (BLOCKCHAIN_CHAIN_ID)`;
  }
  const code = await provider.getCode(cfg.contractAddress);
  if (code === "0x") {
    return `Không có hợp đồng nào ở địa chỉ ${cfg.contractAddress} trên ${cfg.tenMang}. Kiểm tra BLOCKCHAIN_CONTRACT_ADDRESS trong .env`;
  }
  try {
    await contract.admin();
    await contract.isCertValid("0x" + "00".repeat(32)); // hàm chỉ có ở AgriChain v2
  } catch {
    return `Hợp đồng ở ${cfg.contractAddress} không phải AgriChain v2 (có thể .env vẫn trỏ tới hợp đồng cũ). Đổi BLOCKCHAIN_CONTRACT_ADDRESS sang địa chỉ vừa deploy rồi khởi động lại server`;
  }
  return null;
};

// Bộ ngưỡng kiểm định (mã băm) đã được admin ghi lên hợp đồng chưa. null = chưa cấu hình hợp đồng.
const nguongTrenChain = async (maBam) => {
  const c = layContract();
  if (!c) return null;
  return Boolean(await c.contract.thresholds(maBam));
};

// Giao dịch đã vào khối và thành công, gửi tới đúng hợp đồng
const kiemTraGiaoDichHopDong = async (txHash) => {
  const c = layContract();
  if (!c) return { ok: false, lyDo: "Chưa cấu hình contract blockchain trên server" };
  const receipt = await c.provider.getTransactionReceipt(txHash);
  if (!receipt) return { ok: false, lyDo: "Chưa thấy giao dịch trên blockchain, hãy thử lại sau vài giây" };
  if (receipt.status !== 1) return { ok: false, lyDo: "Giao dịch thất bại trên blockchain" };
  if (!receipt.to || getAddress(receipt.to) !== getAddress(c.cfg.contractAddress))
    return { ok: false, lyDo: "Giao dịch không gửi tới hợp đồng AgriChain đang cấu hình" };
  return { ok: true };
};

const vaiTroTrenChain = async (diaChi) => {
  const c = layContract();
  if (!c) return null;
  return Number(await c.contract.roleOf(getAddress(diaChi)));
};

// Biên lai giao dịch (null nếu chưa vào khối / không tồn tại)
const docBienLai = async (txHash) => {
  const c = layContract();
  if (!c) return null;
  return c.provider.getTransactionReceipt(txHash);
};

// Tìm lại giao dịch đã ghi một sự kiện trong các khối gần đây (dùng khi đối soát mà không có mã giao dịch).
// Nhiều RPC giới hạn eth_getLogs ~100 khối mỗi lần, nên chỉ quét một khoảng ngắn.
const timGiaoDichSuKien = async (maLo, eventHash, soKhoi = 100) => {
  const c = layContract();
  if (!c) return null;
  const moiNhat = await c.provider.getBlockNumber();
  const logs = await c.contract.queryFilter(
    c.contract.filters.Recorded(batchIdCuaLo(maLo)),
    Math.max(0, moiNhat - soKhoi + 1),
    moiNhat,
  );
  const log = logs.find((l) => String(l.args.eventHash).toLowerCase() === eventHash.toLowerCase());
  return log
    ? { txHash: log.transactionHash.toLowerCase(), signer: String(log.args.signer).toLowerCase(), soBlock: log.blockNumber }
    : null;
};

// Kiểm tra giao dịch người dùng gửi lên có thật sự ghi đúng sự kiện đó không.
const kiemTraGiaoDichSuKien = async (txHash, { maLo, eventHash }) => {
  const c = layContract();
  if (!c) {
    const err = new Error("Chưa cấu hình contract blockchain trên server");
    err.status = 503;
    throw err;
  }
  const receipt = await c.provider.getTransactionReceipt(txHash);
  if (!receipt) {
    const err = new Error(
      "Chưa thấy giao dịch trên blockchain, hãy thử lại sau vài giây",
    );
    err.status = 404;
    throw err;
  }
  if (receipt.status !== 1) {
    const err = new Error("Giao dịch trên blockchain đã thất bại");
    err.status = 409;
    throw err;
  }

  const iface = new Interface(ABI);
  const batchId = batchIdCuaLo(maLo).toLowerCase();
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== c.cfg.contractAddress.toLowerCase())
      continue;
    let parsed;
    try {
      parsed = iface.parseLog(log);
    } catch {
      continue;
    }
    if (
      parsed?.name === "Recorded" &&
      String(parsed.args.batchId).toLowerCase() === batchId &&
      String(parsed.args.eventHash).toLowerCase() === eventHash.toLowerCase()
    ) {
      return {
        signer: String(parsed.args.signer).toLowerCase(),
        blockNumber: receipt.blockNumber,
      };
    }
  }
  const err = new Error("Giao dịch không chứa sự kiện này của lô");
  err.status = 409;
  throw err;
};

module.exports = {
  layCauHinh,
  layContract,
  layTrangThaiLoTrenChain,
  adminTrenChain,
  chanDoanHopDong,
  nguongTrenChain,
  kiemTraGiaoDichHopDong,
  vaiTroTrenChain,
  kiemTraGiaoDichSuKien,
  docBienLai,
  timGiaoDichSuKien,
};
