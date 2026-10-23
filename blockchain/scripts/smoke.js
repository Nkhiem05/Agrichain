// Kiểm tra nhanh AgriChain.sol trên mạng giả lập của Hardhat (không cần chain thật, không tốn gì):
//   npx hardhat run scripts/smoke-agrichain.js
import { network } from "hardhat";
import assert from "node:assert/strict";
import { id, solidityPacked, keccak256, ZeroHash } from "ethers";

const { ethers } = await network.getOrCreate();
const [admin, farmer, cert, truck, factory, shop, outsider] =
  await ethers.getSigners();

const ROLE = {
  FARMER_COOP: 1,
  PROCESSOR: 2,
  TRANSPORTER: 3,
  DISTRIBUTOR: 4,
  CERT_AUTHORITY: 5,
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
  TO_AGENT: 14,
  SAMPLING: 15,
  COMPLETE: 16,
};

const c = await ethers.deployContract("AgriChain");
await c.waitForDeployment();
for (const [s, r] of [
  [farmer, "FARMER_COOP"],
  [cert, "CERT_AUTHORITY"],
  [truck, "TRANSPORTER"],
  [factory, "PROCESSOR"],
  [shop, "DISTRIBUTOR"],
]) {
  await (await c.setRole(await s.getAddress(), ROLE[r])).wait();
}

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
const rejects = (p, text) =>
  assert.rejects(
    p,
    (e) => String(e.message).includes(text),
    `phải bị từ chối: ${text}`,
  );
const ok = async (p) => (await p).wait();

let passed = 0;
const check = (name) => {
  passed++;
  console.log("  ok -", name);
};

const LOT = id("LO-001");
const CHILD = id("LO-002");
const LATE = id("LO-003");

// 1. Thu hoạch
let e = next(LOT);
await rejects(c.connect(outsider).harvest(LOT, e.eventHash), "chi nong dan");
check("ví lạ không được chốt thu hoạch");
await ok(c.connect(farmer).harvest(LOT, e.eventHash));
e.commit();
await rejects(c.connect(farmer).harvest(LOT, e.eventHash), "lo da ton tai");
check("nông dân chốt thu hoạch, không chốt lại lần hai");

// 2. Chưa kiểm định thì không được gửi hàng
e = next(LOT);
await rejects(
  c
    .connect(farmer)
    .orderTransport(LOT, truck, factory, chain[LOT], e.eventHash),
  "chua co chung nhan dat",
);
check("chưa có chứng nhận thì không tạo được lệnh vận chuyển");

// 3. Chỉ cơ quan kiểm định mới công bố; prevHash phải khớp
e = next(LOT);
await rejects(
  c.connect(farmer).certify(LOT, T.CERT_ISSUED, 0, chain[LOT], e.eventHash),
  "chi co quan kiem dinh",
);
await rejects(
  c.connect(cert).certify(LOT, T.CERT_ISSUED, 0, id("sai"), e.eventHash),
  "prev hash sai",
);
await ok(
  c.connect(cert).certify(LOT, T.CERT_ISSUED, 0, chain[LOT], e.eventHash),
);
e.commit();
check("chỉ cơ quan kiểm định ký chứng nhận, prevHash sai bị từ chối");

// 4. Tạo lệnh bàn giao
e = next(LOT);
await rejects(
  c
    .connect(outsider)
    .orderTransport(LOT, truck, factory, chain[LOT], e.eventHash),
  "khong phai nguoi giu lo",
);
await rejects(
  c
    .connect(farmer)
    .orderTransport(LOT, outsider, factory, chain[LOT], e.eventHash),
  "van chuyen chua duoc duyet",
);
await ok(
  c
    .connect(farmer)
    .orderTransport(LOT, truck, factory, chain[LOT], e.eventHash),
);
e.commit();
check("chỉ chủ lô tạo lệnh, vận chuyển phải là ví đã duyệt");

// 5. Vận chuyển lấy hàng - đến nơi - bên nhận xác nhận
e = next(LOT);
await rejects(
  c.connect(outsider).pickup(LOT, chain[LOT], e.eventHash),
  "khong phai don vi van chuyen",
);
await rejects(
  c.connect(truck).arrive(LOT, chain[LOT], e.eventHash),
  "dang van chuyen",
);
await ok(c.connect(truck).pickup(LOT, chain[LOT], e.eventHash));
e.commit();
e = next(LOT);
await rejects(
  c.connect(factory).confirmReceive(LOT, chain[LOT], e.eventHash),
  "chua den noi",
);
await ok(c.connect(truck).arrive(LOT, chain[LOT], e.eventHash));
e.commit();
e = next(LOT);
await rejects(
  c.connect(shop).confirmReceive(LOT, chain[LOT], e.eventHash),
  "khong phai ben nhan",
);
await ok(c.connect(factory).confirmReceive(LOT, chain[LOT], e.eventHash));
e.commit();
assert.equal((await c.batches(LOT)).owner, await factory.getAddress());
check("lấy hàng, đến nơi, bên nhận ký: lô đổi chủ sang cơ sở sơ chế");

// 6. Chủ cũ không còn quyền; chủ mới sơ chế
e = next(LOT);
await rejects(
  c.connect(farmer).orderTransport(LOT, truck, shop, chain[LOT], e.eventHash),
  "khong phai nguoi giu lo",
);
check("chủ cũ hết quyền sau khi bàn giao");

e = next(CHILD);
await rejects(
  c.connect(farmer).createChild(CHILD, [LOT], [chain[LOT]], e.eventHash),
  "chi co so so che",
);
await rejects(
  c.connect(shop).createChild(CHILD, [LOT], [chain[LOT]], e.eventHash),
  "chi co so so che",
);
await rejects(
  c
    .connect(factory)
    .createChild(CHILD, [id("khong-co")], [chain[LOT]], e.eventHash),
  "lo khong ton tai",
);
await ok(
  c.connect(factory).createChild(CHILD, [LOT], [chain[LOT]], e.eventHash),
);
e.commit();
const child = await c.batches(CHILD);
assert.equal(child.certState, 1n);
assert.equal(child.owner, await factory.getAddress());
check("lô con tạo từ lô nguồn của mình, kế thừa chứng nhận đạt");

e = next(CHILD);
await ok(
  c.connect(factory).step(CHILD, T.PACKAGING_DONE, chain[CHILD], e.eventHash),
);
e.commit();
e = next(CHILD);
await rejects(
  c.connect(shop).step(CHILD, T.DISPATCHED, chain[CHILD], e.eventHash),
  "khong phai nguoi giu lo",
);
await rejects(
  c.connect(factory).step(CHILD, T.DISPATCHED, chain[CHILD], e.eventHash),
  "chi nha phan phoi",
);
check("đóng gói do cơ sở sơ chế ký, xuất kho chỉ nhà phân phối");

// 7. Bàn giao sang nhà phân phối + bên nhận từ chối
e = next(CHILD);
await ok(
  c
    .connect(factory)
    .orderTransport(CHILD, truck, shop, chain[CHILD], e.eventHash),
);
e.commit();
e = next(CHILD);
await rejects(
  c.connect(factory).step(CHILD, T.PROCESSING_DONE, chain[CHILD], e.eventHash),
  "ban giao",
);
await ok(c.connect(truck).pickup(CHILD, chain[CHILD], e.eventHash));
e.commit();
e = next(CHILD);
await ok(c.connect(truck).arrive(CHILD, chain[CHILD], e.eventHash));
e.commit();
e = next(CHILD);
await rejects(
  c.connect(truck).rejectHandover(CHILD, chain[CHILD], e.eventHash),
  "khong the huy",
);
await ok(c.connect(shop).rejectHandover(CHILD, chain[CHILD], e.eventHash));
e.commit();
let st = await c.batches(CHILD);
assert.equal(st.owner, await factory.getAddress());
assert.equal(st.orderStage, 0n);
check("bên nhận từ chối: lô vẫn ở chủ cũ, lệnh được đóng");

e = next(CHILD);
await ok(
  c
    .connect(factory)
    .orderTransport(CHILD, truck, shop, chain[CHILD], e.eventHash),
);
e.commit();
for (const [signer, fn] of [
  [truck, "pickup"],
  [truck, "arrive"],
  [shop, "confirmReceive"],
]) {
  e = next(CHILD);
  await ok(c.connect(signer)[fn](CHILD, chain[CHILD], e.eventHash));
  e.commit();
}
e = next(CHILD);
await ok(c.connect(shop).step(CHILD, T.DISPATCHED, chain[CHILD], e.eventHash));
e.commit();
e = next(CHILD);
await ok(c.connect(shop).step(CHILD, T.TO_AGENT, chain[CHILD], e.eventHash));
e.commit();
check("bàn giao lần hai thành công, nhà phân phối xuất kho và giao đại lý");

// 8. Chứng nhận bị thu hồi / hết hạn thì chặn vận chuyển
e = next(LATE);
await ok(c.connect(farmer).harvest(LATE, e.eventHash));
e.commit();
e = next(LATE);
const past = BigInt(Math.floor(Date.now() / 1000) - 3600);
await ok(
  c.connect(cert).certify(LATE, T.CERT_ISSUED, past, chain[LATE], e.eventHash),
);
e.commit();
assert.equal(await c.isCertValid(LATE), false);
check(
  "isCertValid trả false khi chứng nhận đã quá hạn (backend mới là nơi chặn theo hạn)",
);

e = next(LATE);
const future = BigInt(Math.floor(Date.now() / 1000) + 86400 * 365);
await ok(
  c
    .connect(cert)
    .certify(LATE, T.CERT_ISSUED, future, chain[LATE], e.eventHash),
);
e.commit();
e = next(LATE);
await ok(
  c.connect(cert).certify(LATE, T.CERT_REVOKED, 0, chain[LATE], e.eventHash),
);
e.commit();
e = next(LATE);
await rejects(
  c
    .connect(farmer)
    .orderTransport(LATE, truck, factory, chain[LATE], e.eventHash),
  "chua co chung nhan dat",
);
check("chứng nhận bị thu hồi thì chặn vận chuyển");

// 9. Chủ lô hủy lệnh khi chưa lấy hàng
e = next(LATE);
await ok(
  c.connect(cert).certify(LATE, T.CERT_ISSUED, 0, chain[LATE], e.eventHash),
);
e.commit();
e = next(LATE);
await ok(
  c
    .connect(farmer)
    .orderTransport(LATE, truck, factory, chain[LATE], e.eventHash),
);
e.commit();
e = next(LATE);
await ok(c.connect(farmer).rejectHandover(LATE, chain[LATE], e.eventHash));
e.commit();
assert.equal((await c.batches(LATE)).orderStage, 0n);
check("chủ lô hủy lệnh khi vận chuyển chưa lấy hàng");

// 10. Hash on-chain khớp hash tính ngoài chain
for (const [k, v] of Object.entries({ LOT, CHILD, LATE })) {
  assert.equal((await c.batches(v)).lastHash, chain[v], `hash cuối của ${k}`);
}
check("hash cuối trên chain khớp hash tính bằng JS");

console.log(`\nTất cả ${passed} nhóm kiểm tra đều đạt.`);
