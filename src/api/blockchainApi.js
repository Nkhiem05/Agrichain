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
      {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ txHash }),
      },
    );
    return await parseJson(res);
  } catch (e) {
    console.warn("Không báo được giao dịch đã gửi:", e.message);
    return null;
  }
};

// Chờ biên lai tối đa chừng này; quá hạn thì không treo nút ký nữa mà để worker tự xác nhận
const THOI_GIAN_CHO_BIEN_LAI_MS = 90_000;

// Ký một sự kiện bằng contract (đã gắn signer MetaMask): gửi -> báo đã gửi -> chờ vào khối -> báo xác nhận.
// Trả "da-xac-nhan", hoặc "cho-xac-nhan" khi chưa xác nhận xong ngay (Outbox worker sẽ tự đối soát sau).
// Lỗi ở bước gửi (từ chối trong MetaMask, hợp đồng từ chối lúc ước lượng gas...) nghĩa là chưa có giao dịch nào:
// sự kiện vẫn chờ ký. Từ lúc MetaMask đã gửi, sự kiện chuyển sang "đã gửi" và chỉ quay lại hàng chờ khi
// worker thấy giao dịch hỏng hoặc mất, nên lỗi mạng khi chờ biên lai không được coi là ký thất bại.
export const guiVaXacNhanSuKien = async (contract, item) => {
  const tx = await contract[item.ham](...item.args);
  let txHash = tx.hash;
  await baoDaGui(item.ma_lich_su, txHash);

  try {
    await tx.wait(1, THOI_GIAN_CHO_BIEN_LAI_MS);
  } catch (e) {
    if (e?.code === "TRANSACTION_REPLACED") {
      // Tăng tốc (đổi mã giao dịch) vẫn thành công; hủy trong MetaMask thì phải ký lại
      if (e.reason === "cancelled" || e.receipt?.status !== 1) {
        throw new Error(
          "Giao dịch đã bị hủy trong MetaMask. Sự kiện sẽ quay lại danh sách chờ ký sau ít phút, khi đó bạn ký lại",
        );
      }
      txHash = e.replacement.hash;
      await baoDaGui(item.ma_lich_su, txHash);
    } else if (e?.code === "CALL_EXCEPTION" || e?.receipt?.status === 0) {
      throw new Error(
        "Hợp đồng từ chối giao dịch này. Hệ thống sẽ đưa sự kiện về danh sách chờ ký trong vài giây, khi đó bạn ký lại",
      );
    } else {
      // Mất kết nối / nút RPC chậm: giao dịch đã gửi, worker sẽ tự xác nhận
      return "cho-xac-nhan";
    }
  }

  try {
    await xacNhanSuKien(item.ma_lich_su, txHash);
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
  const res = await fetch(`${API_URL}/admin/vi${q}`, {
    headers: authHeaders(),
  });
  return (await parseJson(res)).data;
};

// Bộ ngưỡng kiểm định trên blockchain (admin ký setThreshold)
export const fetchNguong = async () => {
  const res = await fetch(`${API_URL}/admin/nguong`, {
    headers: authHeaders(),
  });
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
  const res = await fetch(`${API_URL}/admin/outbox`, {
    headers: authHeaders(),
  });
  return (await parseJson(res)).data;
};

export const chayOutboxNgay = async () => {
  const res = await fetch(`${API_URL}/admin/outbox/chay`, {
    method: "POST",
    headers: jsonHeaders(),
  });
  return parseJson(res);
};

// Đối soát toàn bộ lô với blockchain (tab "Nhật ký & toàn vẹn" của admin)
export const fetchDoiSoat = async () => {
  const res = await fetch(`${API_URL}/admin/doi-soat`, {
    headers: authHeaders(),
  });
  return (await parseJson(res)).data;
};

export const chayDoiSoat = async () => {
  const res = await fetch(`${API_URL}/admin/doi-soat/chay`, {
    method: "POST",
    headers: jsonHeaders(),
  });
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
// Truyền { maLo } để chỉ ký các sự kiện của lô đó (vd bấm Công bố một hồ sơ thì chỉ ký sự kiện công bố của lô ấy).
// Trả về { soDaKy, soChoXacNhan, lyDo }: soDaKy = 0 kèm lyDo khi chưa ký được vì thiếu điều kiện;
// soChoXacNhan = số sự kiện đã gửi nhưng blockchain chưa xác nhận xong (hệ thống tự cập nhật sau).
// Ném lỗi khi người dùng từ chối trong MetaMask hoặc giao dịch thất bại.
export const kyCacSuKienDangCho = async ({ maLo = null } = {}) => {
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

  const locLo = (ds) => (maLo ? ds.filter((x) => x.ma_lo === maLo) : ds);
  const choKy = locLo((await fetchChoKy()).su_kien);
  let dsSanSang = choKy.filter((x) => x.san_sang);
  if (dsSanSang.length === 0) {
    // Nói rõ vì sao chưa ký được: không có sự kiện nào (lô không được theo dõi trên chain), hoặc có nhưng đang chờ bước trước
    return {
      soDaKy: 0,
      lyDo:
        choKy.length === 0
          ? "không có sự kiện nào cần ký (lô này không được theo dõi trên blockchain)"
          : `sự kiện của bạn chưa ký được: ${choKy[0].ly_do || "đang chờ điều kiện"}`,
    };
  }

  const { signer, diaChi } = await ketNoiMetaMask(cauHinh);
  if (diaChi.toLowerCase() !== vi.dia_chi_vi.toLowerCase()) {
    throw new Error(
      `Hãy chọn đúng ví ${vi.dia_chi_vi.slice(0, 6)}...${vi.dia_chi_vi.slice(-4)} trong MetaMask`,
    );
  }
  const contract = new Contract(cauHinh.contractAddress, cauHinh.abi, signer);

  let soDaKy = 0;
  let soChoXacNhan = 0;
  for (let vong = 0; vong < 30 && dsSanSang.length > 0; vong++) {
    for (const item of dsSanSang) {
      const kq = await guiVaXacNhanSuKien(contract, item);
      soDaKy++;
      if (kq === "cho-xac-nhan") soChoXacNhan++;
    }
    dsSanSang = locLo((await fetchChoKy()).su_kien).filter((x) => x.san_sang);
  }
  return { soDaKy, soChoXacNhan };
};
