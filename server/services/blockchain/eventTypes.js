// Danh sách loại sự kiện truy xuất và hàm tương ứng trên contract AgriChain.
// Mã số (ma) PHẢI khớp các hằng số trong blockchain/contracts/AgriChain.sol.
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
  DISPATCHED: { ma: 13, ham: "step" },
  DELIVERED_TO_AGENT: { ma: 14, ham: "step" },
  SAMPLING_SEALED: { ma: 15, ham: "certify" },
  COMPLETE_CONFIRMED: { ma: 16, ham: "step" },
};

// nguoi_dung.vai_tro -> Role trên contract. ADMIN và CONSUMER không cần vai trò on-chain.
const VAI_TRO_ON_CHAIN = {
  FARMER_COOP: 1,
  PROCESSOR: 2,
  TRANSPORTER: 3,
  DISTRIBUTOR: 4,
  CERT_AUTHORITY: 5,
};

const ABI = [
  "function admin() view returns (address)",
  "function roleOf(address) view returns (uint8)",
  "function setRole(address wallet, uint8 role)",
  "function harvest(bytes32 batchId, bytes32 eventHash)",
  "function certify(bytes32 batchId, uint8 eventType, uint64 expiry, bytes32 prevHash, bytes32 eventHash)",
  "function orderTransport(bytes32 batchId, address transporter, address receiver, bytes32 prevHash, bytes32 eventHash)",
  "function pickup(bytes32 batchId, bytes32 prevHash, bytes32 eventHash)",
  "function arrive(bytes32 batchId, bytes32 prevHash, bytes32 eventHash)",
  "function confirmReceive(bytes32 batchId, bytes32 prevHash, bytes32 eventHash)",
  "function rejectHandover(bytes32 batchId, bytes32 prevHash, bytes32 eventHash)",
  "function createChild(bytes32 childId, bytes32[] sources, bytes32[] sourceHashes, bytes32 eventHash)",
  "function step(bytes32 batchId, uint8 eventType, bytes32 prevHash, bytes32 eventHash)",
  "function batches(bytes32) view returns (bool exists, address owner, bytes32 lastHash, uint8 certState, uint64 certExpiry, address orderTransporter, address orderReceiver, uint8 orderStage)",
  "event Recorded(bytes32 indexed batchId, uint8 indexed eventType, bytes32 prevHash, bytes32 eventHash, address indexed signer)",
];

module.exports = { ZERO_HASH, EVENT_TYPES, VAI_TRO_ON_CHAIN, ABI };
