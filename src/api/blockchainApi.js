import { BrowserProvider, Contract } from "ethers";

const API_URL = "http://localhost:3000/api/blockchain";

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const jsonHeaders = () => ({
  "Content-Type": "application/json",
  ...authHeaders(),
});

const parseJson = async (response) => {
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    throw new Error(data?.message || "Có lỗi xảy ra, vui lòng thử lại");
  }
  return data;
};

// Công khai
export const fetchCauHinh = async () => {
  const res = await fetch(`${API_URL}/cau-hinh`);
  return (await parseJson(res)).data;
};

export const fetchXacThuc = async (maLo) => {
  const res = await fetch(`${API_URL}/xac-thuc/${encodeURIComponent(maLo)}`);
  return (await parseJson(res)).data;
};

// Ví của người dùng đang đăng nhập
export const fetchViCuaToi = async () => {
  const res = await fetch(`${API_URL}/vi`, { headers: authHeaders() });
  return (await parseJson(res)).data;
};

export const taoNonceLienKet = async () => {
  const res = await fetch(`${API_URL}/vi/nonce`, {
    method: "POST",
    headers: jsonHeaders(),
  });
  return (await parseJson(res)).data;
};

export const lienKetVi = async (address, signature) => {
  const res = await fetch(`${API_URL}/vi/lien-ket`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ address, signature }),
  });
  return parseJson(res);
};

// Sự kiện chờ ký
export const fetchChoKy = async () => {
  const res = await fetch(`${API_URL}/cho-ky`, { headers: authHeaders() });
  return (await parseJson(res)).data;
};

// Báo server mã giao dịch ngay khi MetaMask gửi đi (trước khi vào khối).
// Lỗi ở bước này không chặn việc ký: Outbox worker vẫn đối soát được với chain.
export const baoDaGui = async (maLichSu, txHash) => {
  try {
    const res = await fetch(
      `${API_URL}/su-kien/${encodeURIComponent(maLichSu)}/da-gui`,
      { method: "POST", headers: jsonHeaders(), body: JSON.stringify({ txHash }) },
    );
    return await parseJson(res);
  } catch (e) {
    console.warn("Không báo được giao dịch đã gửi:", e.message);
    return null;
  }
};

// Ký một sự kiện bằng contract (đã gắn signer MetaMask): gửi -> báo đã gửi -> chờ vào khối -> báo xác nhận.
// Trả "da-xac-nhan", hoặc "cho-xac-nhan" khi server chưa thấy giao dịch (worker sẽ tự xác nhận sau).
export const guiVaXacNhanSuKien = async (contract, item) => {
  const tx = await contract[item.ham](...item.args);
  await baoDaGui(item.ma_lich_su, tx.hash);
  await tx.wait();
  try {
    await xacNhanSuKien(item.ma_lich_su, tx.hash);
    return "da-xac-nhan";
  } catch (e) {
    if (/Chưa thấy giao dịch/.test(e.message)) return "cho-xac-nhan";
    throw e;
  }
};

export const xacNhanSuKien = async (maLichSu, txHash) => {
  const res = await fetch(
    `${API_URL}/su-kien/${encodeURIComponent(maLichSu)}/xac-nhan`,
    {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ txHash }),
    },
  );
  return parseJson(res);
};

// Quản trị viên duyệt ví
// Danh sách ví (trangThai: CHO_DUYET | DA_DUYET | TU_CHOI, bỏ trống = tất cả) + ví admin của hợp đồng
export const fetchDanhSachVi = async (trangThai = "") => {
  const q = trangThai ? `?trang_thai=${encodeURIComponent(trangThai)}` : "";
  const res = await fetch(`${API_URL}/admin/vi${q}`, { headers: authHeaders() });
  return (await parseJson(res)).data;
};

// Bộ ngưỡng kiểm định trên blockchain (admin ký setThreshold)
export const fetchNguong = async () => {
  const res = await fetch(`${API_URL}/admin/nguong`, { headers: authHeaders() });
  return (await parseJson(res)).data;
};

export const xacNhanNguong = async (maBam, txHash) => {
  const res = await fetch(`${API_URL}/admin/nguong/xac-nhan`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ ma_bam: maBam, txHash }),
  });
  return parseJson(res);
};

// Hàng chờ ghi blockchain (Outbox) và worker đối soát
export const fetchOutbox = async () => {
  const res = await fetch(`${API_URL}/admin/outbox`, { headers: authHeaders() });
  return (await parseJson(res)).data;
};

export const chayOutboxNgay = async () => {
  const res = await fetch(`${API_URL}/admin/outbox/chay`, { method: "POST", headers: jsonHeaders() });
  return parseJson(res);
};

// Đối soát toàn bộ lô với blockchain (tab "Nhật ký & toàn vẹn" của admin)
export const fetchDoiSoat = async () => {
  const res = await fetch(`${API_URL}/admin/doi-soat`, { headers: authHeaders() });
  return (await parseJson(res)).data;
};

export const chayDoiSoat = async () => {
  const res = await fetch(`${API_URL}/admin/doi-soat/chay`, { method: "POST", headers: jsonHeaders() });
  return parseJson(res);
};

export const fetchViChoDuyet = async () => {
  const res = await fetch(`${API_URL}/admin/vi-cho-duyet`, {
    headers: authHeaders(),
  });
  return (await parseJson(res)).data;
};

export const duyetVi = async (diaChi, txHash) => {
  const res = await fetch(`${API_URL}/admin/vi/${diaChi}/duyet`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ txHash }),
  });
  return parseJson(res);
};

export const tuChoiVi = async (diaChi) => {
  const res = await fetch(`${API_URL}/admin/vi/${diaChi}/tu-choi`, {
    method: "POST",
    headers: jsonHeaders(),
  });
  return parseJson(res);
};

// Mở MetaMask, chuyển đúng mạng, trả về signer (ví đang chọn)
export const ketNoiMetaMask = async (cauHinh) => {
  if (!window.ethereum) throw new Error("Chưa cài MetaMask");

  let provider = new BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);

  const mang = await provider.getNetwork();
  if (Number(mang.chainId) !== cauHinh.chainId) {
    const chainIdHex = "0x" + cauHinh.chainId.toString(16);
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }],
      });
    } catch (e) {
      // 4902: ví chưa có mạng này -> thêm mạng
      if (e?.code !== 4902 && e?.data?.originalError?.code !== 4902) throw e;
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainIdHex,
            chainName: cauHinh.tenMang,
            nativeCurrency: {
              name: cauHinh.tienTe,
              symbol: cauHinh.tienTe,
              decimals: 18,
            },
            rpcUrls: [cauHinh.rpcUrl],
            blockExplorerUrls: cauHinh.explorerUrl ? [cauHinh.explorerUrl] : [],
          },
        ],
      });
    }
    provider = new BrowserProvider(window.ethereum); // mạng đã đổi: tạo provider mới
  }

  const signer = await provider.getSigner();
  return { signer, diaChi: await signer.getAddress() };
};

// Ký (qua MetaMask) mọi sự kiện đang sẵn sàng của người dùng đang đăng nhập.
// Gọi ngay sau một thao tác nghiệp vụ (ví dụ tạo lô thu hoạch) để MetaMask hiện popup xác nhận.
// Trả về { soDaKy, lyDo }: soDaKy = 0 kèm lyDo khi chưa ký được vì thiếu điều kiện.
// Ném lỗi khi người dùng từ chối trong MetaMask hoặc giao dịch thất bại.
export const kyCacSuKienDangCho = async () => {
  const [cauHinh, thongTin] = await Promise.all([
    fetchCauHinh(),
    fetchViCuaToi(),
  ]);

  if (!cauHinh.daCauHinh) {
    return { soDaKy: 0, lyDo: "máy chủ chưa cấu hình contract blockchain" };
  }
  const vi = thongTin.vi;
  if (!vi || vi.trang_thai_duyet !== "DA_DUYET") {
    return {
      soDaKy: 0,
      lyDo: "bạn chưa có ví blockchain được duyệt (vào Trang cá nhân để liên kết)",
    };
  }

  let dsSanSang = (await fetchChoKy()).su_kien.filter((x) => x.san_sang);
  if (dsSanSang.length === 0) {
    return { soDaKy: 0, lyDo: "không có sự kiện nào sẵn sàng để ký" };
  }

  const { signer, diaChi } = await ketNoiMetaMask(cauHinh);
  if (diaChi.toLowerCase() !== vi.dia_chi_vi.toLowerCase()) {
    throw new Error(
      `Hãy chọn đúng ví ${vi.dia_chi_vi.slice(0, 6)}...${vi.dia_chi_vi.slice(-4)} trong MetaMask`,
    );
  }
  const contract = new Contract(cauHinh.contractAddress, cauHinh.abi, signer);

  // Sự kiện kế tiếp có thể sẵn sàng sau khi ký xong sự kiện trước: ký lần lượt đến khi hết
  let soDaKy = 0;
  for (let vong = 0; vong < 30 && dsSanSang.length > 0; vong++) {
    for (const item of dsSanSang) {
      await guiVaXacNhanSuKien(contract, item);
      soDaKy++;
    }
    dsSanSang = (await fetchChoKy()).su_kien.filter((x) => x.san_sang);
  }
  return { soDaKy };
};
