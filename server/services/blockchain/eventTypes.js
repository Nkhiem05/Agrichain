// Danh sách loại sự kiện truy xuất và hàm tương ứng trên contract AgriChain.
// Mã số (ma) PHẢI khớp các hằng số trong blockchain/contracts/Agrichain.sol (hợp đồng v2).
const ZERO_HASH = "0x" + "0".repeat(64);

const EVENT_TYPES = {
  HARVEST_CONFIRMED: { ma: 1, ham: "harvest" },
  CERTIFICATE_ISSUED: { ma: 2, ham: "certify" },
  CERTIFICATE_FAILED: { ma: 3, ham: "certify" },
  CERTIFICATE_REVOKED: { ma: 4, ham: "certify" },
  TRANSPORT_ORDERED: { ma: 5, ham: "orderTransport" },
  PICKUP_CONFIRMED: { ma: 6, ham: "pickup" },
  DELIVERY_CONFIRMED: { ma: 7, ham: "arrive" },
  STOCK_IN_CONFIRMED: { ma: 8, ham: "confirmReceive" },
  HANDOVER_REJECTED: { ma: 9, ham: "rejectHandover" },
  BATCH_RELATION: { ma: 10, ham: "createChild" },
  PROCESSING_DONE: { ma: 11, ham: "step" },
  PACKAGING_DONE: { ma: 12, ham: "step" },
  // 13, 14: không dùng nữa từ hợp đồng v2 (phân phối -> đại lý đi qua 4 bước bàn giao, đại lý tự ký nhận)
  DISPATCHED: { ma: 13, ham: "step" },
  DELIVERED_TO_AGENT: { ma: 14, ham: "step" },
  SAMPLING_SEALED: { ma: 15, ham: "certify" },
  COMPLETE_CONFIRMED: { ma: 16, ham: "step" },
  SAMPLING_CONFIRMED: { ma: 17, ham: "confirmSampling" },
  RETURN_SHIPPED: { ma: 18, ham: "returnShip" },
  RETURN_RECEIVED: { ma: 19, ham: "returnReceive" },
  CORRECTION: { ma: 20, ham: "correct" },
};

// nguoi_dung.vai_tro -> Role trên contract. ADMIN và CONSUMER không cần vai trò on-chain.
const VAI_TRO_ON_CHAIN = {
  FARMER_COOP: 1,
  PROCESSOR: 2,
  TRANSPORTER: 3,
  DISTRIBUTOR: 4,
  CERT_AUTHORITY: 5,
  RETAILER: 6,
};

const ABI = [
  "function admin() view returns (address)",
  "function roleOf(address) view returns (uint8)",
  "function isLocked(address) view returns (bool)",
  "function thresholds(bytes32) view returns (bool)",
  "function setRole(address wallet, uint8 role)",
  "function setRoles(address[] wallets, uint8[] roles)",
  "function setLocked(address wallet, bool locked)",
  "function setThreshold(bytes32 thresholdHash)",
  "function harvest(bytes32 batchId, bytes32 productId, uint128 quantity, bytes32 eventHash)",
  "function certify(bytes32 batchId, bytes32 certId, uint8 eventType, uint64 expiry, bytes32 threshold, bytes32 prevHash, bytes32 eventHash)",
  "function confirmSampling(bytes32 batchId, bytes32 certId, bytes32 prevHash, bytes32 eventHash)",
  "function orderTransport(bytes32 batchId, address transporter, address receiver, bytes32 prevHash, bytes32 eventHash)",
  "function pickup(bytes32 batchId, bytes32 prevHash, bytes32 eventHash)",
  "function arrive(bytes32 batchId, bytes32 prevHash, bytes32 eventHash)",
  "function confirmReceive(bytes32 batchId, uint128 receivedQty, bytes32 prevHash, bytes32 eventHash)",
  "function rejectHandover(bytes32 batchId, bytes32 prevHash, bytes32 eventHash)",
  "function returnShip(bytes32 batchId, bytes32 prevHash, bytes32 eventHash)",
  "function returnReceive(bytes32 batchId, bytes32 prevHash, bytes32 eventHash)",
  "function createChild(bytes32 childId, bytes32[] sources, bytes32[] sourceHashes, uint128[] sourceQty, uint128 childQty, bytes32 productId, bytes32 eventHash)",
  "function step(bytes32 batchId, uint8 eventType, bytes32 prevHash, bytes32 eventHash)",
  "function correct(bytes32 batchId, bytes32 prevHash, bytes32 eventHash)",
  "function getBatch(bytes32 batchId) view returns (bool exists, uint8 status, bool failed, address owner, uint128 quantity, bytes32 productId, bytes32 lastHash, address orderTransporter, address orderReceiver, uint8 orderStage, uint128 orderQty, uint256 certCount)",
  "function getBatchCerts(bytes32 batchId) view returns (bytes32[])",
  "function certs(bytes32) view returns (bool exists, uint8 state, bool ownerConfirmed, address issuer, address ownerAtSeal, uint64 expiry, bytes32 batchId, bytes32 threshold)",
  "function isCertValid(bytes32 batchId) view returns (bool)",
  "event Recorded(bytes32 indexed batchId, uint8 indexed eventType, bytes32 prevHash, bytes32 eventHash, address indexed signer)",
  "event Lineage(bytes32 indexed childId, bytes32 indexed sourceId, bytes32 sourceHash, uint128 quantity)",
];

module.exports = { ZERO_HASH, EVENT_TYPES, VAI_TRO_ON_CHAIN, ABI };
