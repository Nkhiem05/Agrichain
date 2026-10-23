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
  const b = await c.contract.batches(batchIdCuaLo(maLo));
  return {
    tonTai: b.exists,
    chuLo: b.owner,
    lastHash: b.lastHash,
    certState: Number(b.certState),
    certExpiry: Number(b.certExpiry),
    orderStage: Number(b.orderStage),
  };
};

const vaiTroTrenChain = async (diaChi) => {
  const c = layContract();
  if (!c) return null;
  return Number(await c.contract.roleOf(getAddress(diaChi)));
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
  vaiTroTrenChain,
  kiemTraGiaoDichSuKien,
};
