// Kiểm tra nhanh AgriChain.sol (hợp đồng v2) trên mạng giả lập của Hardhat (không cần chain thật, không tốn gì):
//   npx hardhat run scripts/smoke.js
// Đi trọn 1 lô: thu hoạch -> kiểm định -> nông dân giao sơ chế -> sơ chế -> giao nhà phân phối
// -> tách lô -> giao đại lý -> đại lý bán hết; kèm các trường hợp phải bị chặn.
import { network } from "hardhat";
import assert from "node:assert/strict";
import { id, solidityPacked, keccak256, ZeroHash, ZeroAddress } from "ethers";

const { ethers } = await network.getOrCreate();
const [
  admin,
  farmer,
  certA,
  certB,
  truck,
  factory,
  shop,
  agent,
  outsider,
  farmer2,
] = await ethers.getSigners();

const ROLE = {
  NONE: 0,
  FARMER_COOP: 1,
  PROCESSOR: 2,
  TRANSPORTER: 3,
  DISTRIBUTOR: 4,
  CERT_AUTHORITY: 5,
  RETAILER: 6,
};
const T = {
  HARVEST: 1,
  CERT_ISSUED: 2,
  CERT_FAILED: 3,
  CERT_REVOKED: 4,
  ORDERED: 5,
  PICKUP: 6,
  ARRIVE: 7,
  STOCK_IN: 8,
  REJECTED: 9,
  RELATION: 10,
  PROCESSING_DONE: 11,
  PACKAGING_DONE: 12,
  DISPATCHED: 13,
  SAMPLING: 15,
  COMPLETE: 16,
};
const BATCH = { ACTIVE: 1n, CONSUMED: 2n, CLOSED: 3n };

const c = await ethers.deployContract("AgriChain");
await c.waitForDeployment();
const addr = (s) => s.getAddress();

// Tính hash giống backend: eventHash = keccak256(prevHash, payloadHash)
const chain = {}; // batchId -> hash mới nhất
let n = 0;
const next = (batchId) => {
  const payloadHash = id(`payload-${n++}`);
  const prev = chain[batchId] ?? ZeroHash;
  const eventHash = keccak256(
    solidityPacked(["bytes32", "bytes32"], [prev, payloadHash]),
  );
  return {
    prev,
    eventHash,
    commit: () => {
      chain[batchId] = eventHash;
    },
  };
};
// Ký 1 sự kiện nối chuỗi của lô: fn(prev, eventHash) trả về transaction
const sign = async (batchId, fn) => {
  const e = next(batchId);
  await (await fn(e.prev, e.eventHash)).wait();
  e.commit();
};
// Lô mới (harvest / createChild) bắt đầu chuỗi từ hash 0
const first = (batchId) => {
  const e = next(batchId);
  return { eventHash: e.eventHash, commit: e.commit };
};
const rejects = (p, text) =>
  assert.rejects(
    p,
    (e) => String(e.message).includes(text),
    `phải bị từ chối: ${text}`,
  );
const ok = async (p) => (await p).wait();
const batch = (b) => c.getBatch(b);

let passed = 0;
const check = (name) => {
  passed++;
  console.log("  ok -", name);
};

const L1 = id("LO-001"),
  L2 = id("LO-002"),
  L3 = id("LO-003"),
  L4 = id("LO-004");
const XOAI = id("SP002"),
  LUA = id("SP001");
const NGUONG = id("bang-nguong-v1");

// 1. Quản trị: gán vai trò nhiều ví 1 lần, khóa ví, phiên bản ngưỡng
await ok(
  c.setRoles(
    [
      await addr(farmer),
      await addr(farmer2),
      await addr(certA),
      await addr(certB),
      await addr(truck),
      await addr(factory),
      await addr(shop),
      await addr(agent),
    ],
    [
      ROLE.FARMER_COOP,
      ROLE.FARMER_COOP,
      ROLE.CERT_AUTHORITY,
      ROLE.CERT_AUTHORITY,
      ROLE.TRANSPORTER,
      ROLE.PROCESSOR,
      ROLE.DISTRIBUTOR,
      ROLE.RETAILER,
    ],
  ),
);
await rejects(
  c.connect(farmer).setRole(await addr(outsider), ROLE.FARMER_COOP),
  "chi admin",
);
await rejects(c.connect(certA).setThreshold(NGUONG), "chi admin");
await ok(c.setThreshold(NGUONG));
check("admin gán vai trò nhiều ví, chỉ admin được ghi bộ ngưỡng");

// 2. Thu hoạch (lưu khối lượng gram)
for (const [lot, who, sp, gram] of [
  [L1, farmer, XOAI, 1_000_000n],
  [L2, farmer, XOAI, 500_000n],
  [L3, farmer, LUA, 300_000n],
  [L4, farmer2, XOAI, 200_000n],
]) {
  const f = first(lot);
  await ok(c.connect(who).harvest(lot, sp, gram, f.eventHash));
  f.commit();
}
await rejects(
  c.connect(farmer).harvest(L1, XOAI, 1n, id("x")),
  "lo da ton tai",
);
await rejects(
  c.connect(factory).harvest(id("LO-X"), XOAI, 1n, id("x")),
  "sai vai tro",
);
await rejects(
  c.connect(farmer).harvest(id("LO-Z"), XOAI, 0n, id("x")),
  "khoi luong phai > 0",
);
assert.equal((await batch(L1)).quantity, 1_000_000n);
check(
  "nông dân tạo lô kèm khối lượng; chặn trùng mã, sai vai trò, khối lượng 0",
);

await ok(c.setLocked(await addr(farmer), true));
await rejects(
  c.connect(farmer).harvest(id("LO-K"), XOAI, 1n, id("x")),
  "vi bi khoa",
);
await ok(c.setLocked(await addr(farmer), false));
check("ví bị khóa không ký được, mở lại thì ký được");

// 3. Kiểm định: niêm phong -> chủ lô ký biên bản -> công bố (đúng cơ quan, đúng bộ ngưỡng)
const KD1 = id("KD-001");
await sign(L1, (p, e) =>
  c.connect(certA).certify(L1, KD1, T.SAMPLING, 0, ZeroHash, p, e),
);
{
  const e = next(L1);
  await rejects(
    c
      .connect(certA)
      .certify(L1, KD1, T.CERT_ISSUED, 0, NGUONG, e.prev, e.eventHash),
    "chu lo chua ky",
  );
  await rejects(
    c.connect(farmer2).confirmSampling(L1, KD1, e.prev, e.eventHash),
    "chi chu lo",
  );
}
await sign(L1, (p, e) => c.connect(farmer).confirmSampling(L1, KD1, p, e));
{
  const e = next(L1);
  await rejects(
    c
      .connect(certA)
      .certify(L1, KD1, T.CERT_ISSUED, 0, id("nguong-la"), e.prev, e.eventHash),
    "bo nguong chua duoc ghi",
  );
  await rejects(
    c
      .connect(certB)
      .certify(L1, KD1, T.CERT_ISSUED, 0, NGUONG, e.prev, e.eventHash),
    "chi co quan da niem phong",
  );
}
await sign(L1, (p, e) =>
  c.connect(certA).certify(L1, KD1, T.CERT_ISSUED, 4102444800, NGUONG, p, e),
);
{
  const e = next(L1);
  await rejects(
    c
      .connect(certB)
      .certify(L1, KD1, T.CERT_REVOKED, 0, ZeroHash, e.prev, e.eventHash),
    "chi co quan da niem phong",
  );
}
assert.equal(await c.isCertValid(L1), true);
check(
  "kiểm định: chủ lô phải ký biên bản, đúng bộ ngưỡng, cơ quan khác không công bố / thu hồi được",
);

const kiemDinh = async (lot, ma, cq, chu, dat) => {
  const kd = id(ma);
  await sign(lot, (p, e) =>
    c.connect(cq).certify(lot, kd, T.SAMPLING, 0, ZeroHash, p, e),
  );
  await sign(lot, (p, e) => c.connect(chu).confirmSampling(lot, kd, p, e));
  await sign(lot, (p, e) =>
    c
      .connect(cq)
      .certify(
        lot,
        kd,
        dat ? T.CERT_ISSUED : T.CERT_FAILED,
        dat ? 4102444800 : 0,
        NGUONG,
        p,
        e,
      ),
  );
};
await kiemDinh(L2, "KD-002", certA, farmer, true);
await kiemDinh(L3, "KD-003", certB, farmer, false);
await kiemDinh(L4, "KD-004", certB, farmer2, true);
assert.equal(await c.isCertValid(L3), false);
check("lô Không đạt bị đánh dấu, không có chứng nhận hợp lệ");

// 4. Bàn giao nông dân -> sơ chế (bên nhận bắt buộc, khối lượng thực nhận)
{
  const e = next(L1);
  await rejects(
    c
      .connect(farmer)
      .orderTransport(L1, await addr(truck), ZeroAddress, e.prev, e.eventHash),
    "ben nhan khong hop le",
  );
  await rejects(
    c
      .connect(farmer)
      .orderTransport(
        L1,
        await addr(truck),
        await addr(agent),
        e.prev,
        e.eventHash,
      ),
    "chang van chuyen khong hop le",
  );
  await rejects(
    c
      .connect(farmer)
      .orderTransport(
        L1,
        await addr(outsider),
        await addr(factory),
        e.prev,
        e.eventHash,
      ),
    "don vi van chuyen chua duoc duyet",
  );
  const e3 = next(L3);
  await rejects(
    c
      .connect(farmer)
      .orderTransport(
        L3,
        await addr(truck),
        await addr(factory),
        e3.prev,
        e3.eventHash,
      ),
    "lo chua co chung nhan dat",
  );
}
await sign(L1, async (p, e) =>
  c
    .connect(farmer)
    .orderTransport(L1, await addr(truck), await addr(factory), p, e),
);
await sign(L1, (p, e) => c.connect(truck).pickup(L1, p, e));
{
  const e = next(L1);
  await rejects(
    c.connect(factory).confirmReceive(L1, 1n, e.prev, e.eventHash),
    "hang chua den noi",
  );
}
await sign(L1, (p, e) => c.connect(truck).arrive(L1, p, e));
{
  const e = next(L1);
  await rejects(
    c.connect(factory).confirmReceive(L1, 1_000_001n, e.prev, e.eventHash),
    "khoi luong nhan khong hop le",
  );
  await rejects(
    c.connect(truck).confirmReceive(L1, 990_000n, e.prev, e.eventHash),
    "khong phai ben nhan cua lenh",
  );
  await rejects(
    c.connect(factory).confirmReceive(L1, 990_000n, id("sai"), e.eventHash),
    "prev hash sai",
  );
}
await sign(L1, (p, e) => c.connect(factory).confirmReceive(L1, 990_000n, p, e));
{
  const b = await batch(L1);
  assert.equal(b.owner, await addr(factory));
  assert.equal(b.quantity, 990_000n);
  assert.equal(b.orderStage, 0n);
}
check(
  "bàn giao 4 bước: không có bên nhận / sai chặng / lô Không đạt bị chặn; bên nhận ký kèm khối lượng thực nhận",
);

// 5. Bên nhận từ chối -> vận chuyển chở về -> bên gửi nhận lại; chủ lô hủy lệnh
await sign(L2, async (p, e) =>
  c
    .connect(farmer)
    .orderTransport(L2, await addr(truck), await addr(factory), p, e),
);
await sign(L2, (p, e) => c.connect(truck).pickup(L2, p, e));
await sign(L2, (p, e) => c.connect(truck).arrive(L2, p, e));
await sign(L2, (p, e) => c.connect(factory).rejectHandover(L2, p, e));
{
  const e = next(L2);
  await rejects(
    c.connect(farmer).returnReceive(L2, e.prev, e.eventHash),
    "van chuyen chua ky tra hang",
  );
}
await sign(L2, (p, e) => c.connect(truck).returnShip(L2, p, e));
await sign(L2, (p, e) => c.connect(farmer).returnReceive(L2, p, e));
assert.equal((await batch(L2)).orderStage, 0n);
assert.equal((await batch(L2)).owner, await addr(farmer));
await sign(L2, async (p, e) =>
  c
    .connect(farmer)
    .orderTransport(L2, await addr(truck), await addr(factory), p, e),
);
await sign(L2, (p, e) => c.connect(farmer).rejectHandover(L2, p, e));
check(
  "từ chối nhận -> chở trả về -> bên gửi nhận lại; chủ lô hủy lệnh khi chưa lấy hàng",
);

// 6. Sơ chế: lô nguồn bị trừ khối lượng, hết thì "đã dùng", không dùng lại được
await sign(L1, (p, e) => c.connect(factory).step(L1, T.PROCESSING_DONE, p, e));
const P1 = id("LO-P1");
{
  const f = first(P1);
  await ok(
    c
      .connect(factory)
      .createChild(
        P1,
        [L1],
        [chain[L1]],
        [990_000n],
        950_000n,
        XOAI,
        f.eventHash,
      ),
  );
  f.commit();
}
assert.equal((await batch(L1)).status, BATCH.CONSUMED);
await rejects(
  c
    .connect(factory)
    .createChild(id("LO-P1b"), [L1], [chain[L1]], [1n], 1n, XOAI, id("x")),
  "lo nguon khong dung duoc",
);
{
  const e = next(L1);
  await rejects(
    c
      .connect(factory)
      .orderTransport(
        L1,
        await addr(truck),
        await addr(shop),
        e.prev,
        e.eventHash,
      ),
    "lo khong con hang",
  );
}
await rejects(
  c
    .connect(factory)
    .createChild(id("LO-PX"), [P1], [chain[P1]], [100n], 101n, XOAI, id("x")),
  "khoi luong lo con khong hop le",
);
await sign(P1, (p, e) => c.connect(factory).step(P1, T.PACKAGING_DONE, p, e));
assert.equal(await c.isCertValid(P1), true);
check(
  "sơ chế: lô nguồn đã dùng không tạo lô con / không gửi được lần 2; lô con thừa hưởng chứng nhận",
);

// 7. Sơ chế -> nhà phân phối, rồi tách lô (tổng khối lượng được kiểm)
await sign(P1, async (p, e) =>
  c
    .connect(factory)
    .orderTransport(P1, await addr(truck), await addr(shop), p, e),
);
await sign(P1, (p, e) => c.connect(truck).pickup(P1, p, e));
await sign(P1, (p, e) => c.connect(truck).arrive(P1, p, e));
await sign(P1, (p, e) => c.connect(shop).confirmReceive(P1, 950_000n, p, e));
const D1 = id("LO-D1"),
  D2 = id("LO-D2");
{
  const f = first(D1);
  await ok(
    c
      .connect(shop)
      .createChild(
        D1,
        [P1],
        [chain[P1]],
        [600_000n],
        600_000n,
        XOAI,
        f.eventHash,
      ),
  );
  f.commit();
}
await rejects(
  c
    .connect(shop)
    .createChild(D2, [P1], [chain[P1]], [400_000n], 400_000n, XOAI, id("x")),
  "khoi luong lay tu lo nguon khong hop le",
);
{
  const f = first(D2);
  await ok(
    c
      .connect(shop)
      .createChild(
        D2,
        [P1],
        [chain[P1]],
        [350_000n],
        350_000n,
        XOAI,
        f.eventHash,
      ),
  );
  f.commit();
}
assert.equal((await batch(P1)).status, BATCH.CONSUMED);
check(
  "nhà phân phối tách lô: không lấy quá phần còn lại, lấy hết thì lô nguồn đã dùng",
);

// 8. Nhà phân phối -> ĐẠI LÝ (tự giao), đại lý tự ký nhận, đính chính, đóng lô
{
  const e = next(D1);
  await rejects(
    c
      .connect(shop)
      .orderTransport(
        D1,
        await addr(shop),
        await addr(factory),
        e.prev,
        e.eventHash,
      ),
    "chang van chuyen khong hop le",
  );
}
await sign(D1, async (p, e) =>
  c.connect(shop).orderTransport(D1, await addr(shop), await addr(agent), p, e),
);
await sign(D1, (p, e) => c.connect(shop).pickup(D1, p, e));
await sign(D1, (p, e) => c.connect(shop).arrive(D1, p, e));
{
  const e = next(D1);
  await rejects(
    c.connect(shop).confirmReceive(D1, 600_000n, e.prev, e.eventHash),
    "khong phai ben nhan cua lenh",
  );
}
await sign(D1, (p, e) => c.connect(agent).confirmReceive(D1, 600_000n, p, e));
assert.equal((await batch(D1)).owner, await addr(agent));
{
  const e = next(D1);
  await rejects(
    c.connect(agent).step(D1, T.PROCESSING_DONE, e.prev, e.eventHash),
    "chi co so so che",
  );
  await rejects(
    c.connect(agent).step(D1, T.DISPATCHED, e.prev, e.eventHash),
    "loai su kien khong hop le",
  );
}
await sign(D1, (p, e) => c.connect(agent).correct(D1, p, e));
await sign(D1, (p, e) => c.connect(agent).step(D1, T.COMPLETE, p, e));
assert.equal((await batch(D1)).status, BATCH.CLOSED);
check("đại lý tự ký nhận hàng, ghi đính chính, đóng lô khi bán hết");

// 9. Gộp lô (cùng sản phẩm), thu hồi chứng nhận gốc lan xuống lô con
for (const [lot, who, gram] of [
  [L2, farmer, 500_000n],
  [L4, farmer2, 200_000n],
]) {
  await sign(lot, async (p, e) =>
    c
      .connect(who)
      .orderTransport(lot, await addr(truck), await addr(factory), p, e),
  );
  await sign(lot, (p, e) => c.connect(truck).pickup(lot, p, e));
  await sign(lot, (p, e) => c.connect(truck).arrive(lot, p, e));
  await sign(lot, (p, e) => c.connect(factory).confirmReceive(lot, gram, p, e));
}
await rejects(
  c
    .connect(factory)
    .createChild(
      id("LO-G0"),
      [L2, L2],
      [chain[L2], chain[L2]],
      [1n, 1n],
      2n,
      XOAI,
      id("x"),
    ),
  "lo nguon bi trung",
);
const G1 = id("LO-G1");
{
  const f = first(G1);
  await ok(
    c
      .connect(factory)
      .createChild(
        G1,
        [L2, L4],
        [chain[L2], chain[L4]],
        [500_000n, 200_000n],
        700_000n,
        XOAI,
        f.eventHash,
      ),
  );
  f.commit();
}
assert.equal((await batch(G1)).certCount, 2n);
await sign(L4, (p, e) =>
  c.connect(certB).certify(L4, id("KD-004"), T.CERT_REVOKED, 0, ZeroHash, p, e),
);
assert.equal(await c.isCertValid(G1), false);
{
  const e = next(G1);
  await rejects(
    c
      .connect(factory)
      .orderTransport(
        G1,
        await addr(truck),
        await addr(shop),
        e.prev,
        e.eventHash,
      ),
    "lo chua co chung nhan dat",
  );
}
assert.equal(await c.isCertValid(D2), true);
check(
  "gộp lô thừa hưởng mọi chứng nhận; thu hồi chứng nhận gốc làm lô con mất hiệu lực ngay",
);

// 10. Hash on-chain khớp hash tính ngoài chain
for (const [k, v] of Object.entries({ L1, L2, L4, P1, D1, D2, G1 })) {
  assert.equal((await batch(v)).lastHash, chain[v], `hash cuối của ${k}`);
}
check("hash cuối trên chain khớp hash tính bằng JS");

console.log(`\nTất cả ${passed} nhóm kiểm tra đều đạt.`);
