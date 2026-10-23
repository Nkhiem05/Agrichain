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
const ketNoiMetaMask = async (cauHinh) => {
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
      const tx = await contract[item.ham](...item.args);
      await tx.wait();
      await xacNhanSuKien(item.ma_lich_su, tx.hash);
      soDaKy++;
    }
    dsSanSang = (await fetchChoKy()).su_kien.filter((x) => x.san_sang);
  }
  return { soDaKy };
};
