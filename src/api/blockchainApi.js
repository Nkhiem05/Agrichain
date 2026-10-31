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

// Quản trị: gỡ lô kẹt
export const fetchLoKet = async () => {
  const res = await fetch(`${API_URL}/admin/lo-ket`, { headers: authHeaders() });
  return (await parseJson(res)).data;
};

export const datLaiSuKien = async (maLichSu) => {
  const res = await fetch(`${API_URL}/admin/lo-ket/su-kien/${encodeURIComponent(maLichSu)}/dat-lai`, {
    method: "POST",
    headers: jsonHeaders(),
  });
  return parseJson(res);
};

export const huySuKienChoKy = async (maLichSu) => {
  const res = await fetch(`${API_URL}/admin/lo-ket/su-kien/${encodeURIComponent(maLichSu)}/huy`, {
    method: "POST",
    headers: jsonHeaders(),
  });
  return parseJson(res);
};

// Quản trị: đổi ví người dùng
export const fetchViDoiDuoc = async () => {
  const res = await fetch(`${API_URL}/admin/doi-vi`, { headers: authHeaders() });
  return (await parseJson(res)).data;
};

export const kiemTraDoiVi = async (maNguoiDung) => {
  const res = await fetch(`${API_URL}/admin/doi-vi/${encodeURIComponent(maNguoiDung)}`, { headers: authHeaders() });
  return (await parseJson(res)).data;
};

export const goLienKetViNguoiDung = async (maNguoiDung, lyDo, chapNhanMatLo = false) => {
  const res = await fetch(`${API_URL}/admin/doi-vi/${encodeURIComponent(maNguoiDung)}/go`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ ly_do: lyDo, chap_nhan_mat_lo: chapNhanMatLo }),
  });
  return parseJson(res);
};

// Lịch sử các sự kiện đã ký và xác nhận trên blockchain của người dùng đang đăng nhập
export const fetchLichSuKy = async () => {
  const res = await fetch(`${API_URL}/lich-su-ky`, { headers: authHeaders() });
  return (await parseJson(res)).data;
};

// Lý do hợp đồng từ chối (chuỗi cố định trong AgriChain.sol) -> câu tiếng Việt nói rõ cần làm gì.
// Khóa viết thường, không dấu như trong hợp đồng; khớp theo "chứa chuỗi".
const LOI_HOP_DONG = [
  ["bo nguong chua duoc ghi", "Bộ ngưỡng kiểm định chưa được ghi lên hợp đồng blockchain đang dùng. Nhờ quản trị viên vào Quản trị → Ví blockchain → Bộ ngưỡng kiểm định, bấm \"Ghi bộ ngưỡng\", rồi bạn ký lại. Sự kiện của bạn vẫn nằm trong danh sách chờ ký."],
  ["vi chua duoc duyet hoac bi khoa", "Ví của bạn chưa được gán vai trò trên hợp đồng này hoặc đang bị khóa. Nhờ quản trị viên duyệt lại ví (Quản trị → Ví blockchain)."],
  ["ben nhan chua duoc duyet hoac bi khoa", "Ví của bên nhận chưa được gán vai trò trên hợp đồng này hoặc đang bị khóa. Nhờ quản trị viên duyệt lại ví của họ."],
  ["sai vai tro", "Vai trò của ví bạn trên hợp đồng không được phép làm bước này. Nhờ quản trị viên kiểm tra lại vai trò ví (Quản trị → Ví blockchain)."],
  ["vi bi khoa", "Ví của bạn đang bị khóa trên hợp đồng nên không ký được."],
  ["chi admin", "Chỉ ví quản trị của hợp đồng mới làm được việc này. Hãy chọn đúng ví admin trong MetaMask."],
  ["prev hash sai", "Chuỗi sự kiện của lô đã thay đổi trên blockchain (có bước khác đã được ký trước). Tải lại trang, hệ thống sẽ đối soát và cập nhật lại danh sách."],
  ["event hash khong hop le", "Mã băm sự kiện không hợp lệ. Hãy báo quản trị viên."],
  ["lo da ton tai", "Mã lô này đã có trên hợp đồng blockchain (hợp đồng dùng chung hoặc dữ liệu từ lần chạy trước). Hãy báo quản trị viên."],
  ["lo con da ton tai", "Mã lô con đã có trên hợp đồng blockchain (hợp đồng dùng chung hoặc dữ liệu từ lần chạy trước). Hãy báo quản trị viên."],
  ["lo khong ton tai", "Lô này chưa có trên hợp đồng blockchain đang dùng (có thể đã đổi sang hợp đồng mới). Hãy báo quản trị viên."],
  ["lo khong con hang", "Lô này không còn hàng trên blockchain."],
  ["lo khong o trang thai nay", "Lô đang ở trạng thái không cho phép bước này. Tải lại trang để xem trạng thái mới nhất."],
  ["lo khong o trang thai lay mau duoc", "Lô đang ở trạng thái không lấy mẫu được."],
  ["lo dang co lenh ban giao", "Lô đang có một lệnh bàn giao chưa xong, hãy hoàn tất lệnh đó trước."],
  ["lo chua co chung nhan dat", "Lô chưa có chứng nhận kiểm định ĐẠT trên blockchain nên chưa làm bước này được."],
  ["lo nguon chua co chung nhan dat", "Lô nguồn chưa có chứng nhận kiểm định ĐẠT trên blockchain."],
  ["lo nguon khong dung duoc", "Lô nguồn không dùng được để tách / gộp (đã dùng hết, đã đóng hoặc không đạt)."],
  ["lo nguon bi trung", "Một lô nguồn xuất hiện hai lần trong lệnh gộp."],
  ["khong phai nguoi giu lo nguon", "Lô nguồn hiện không thuộc ví của bạn trên blockchain."],
  ["khong phai nguoi giu lo", "Lô này hiện không thuộc ví của bạn trên blockchain. Kiểm tra bạn đang chọn đúng ví trong MetaMask."],
  ["chi chu lo luc lay mau duoc ky", "Chỉ chủ lô tại thời điểm lấy mẫu mới được ký biên bản này. Hãy chọn đúng ví của chủ lô."],
  ["chu lo chua ky bien ban lay mau", "Chủ lô chưa ký biên bản lấy mẫu nên chưa công bố được kết quả."],
  ["khong o buoc xac nhan lay mau", "Hồ sơ không còn ở bước xác nhận lấy mẫu."],
  ["ho so khong o buoc cho cong bo", "Hồ sơ kiểm định không còn ở bước chờ công bố."],
  ["ho so kiem dinh da ton tai", "Hồ sơ kiểm định này đã có trên blockchain."],
  ["ho so kiem dinh khong ton tai", "Hồ sơ kiểm định này chưa có trên blockchain."],
  ["chi co quan da niem phong / da cap", "Chỉ cơ quan đã niêm phong mẫu / đã cấp chứng nhận mới làm được bước này."],
  ["chung nhan khong o trang thai dat", "Chứng nhận không ở trạng thái ĐẠT nên không thu hồi được."],
  ["qua so chung nhan", "Lô đã có quá nhiều chứng nhận trên blockchain."],
  ["khong phai ben gui", "Bước này chỉ bên gửi hàng của lệnh mới ký được. Kiểm tra bạn đang chọn đúng ví."],
  ["khong phai ben nhan cua lenh", "Bước này chỉ bên nhận hàng của lệnh mới ký được. Kiểm tra bạn đang chọn đúng ví."],
  ["khong phai don vi van chuyen cua lenh", "Bước này chỉ đơn vị vận chuyển của lệnh mới ký được. Kiểm tra bạn đang chọn đúng ví."],
  ["ben nhan khong hop le", "Ví bên nhận không hợp lệ cho lệnh này."],
  ["chang van chuyen khong hop le", "Lệnh vận chuyển không hợp lệ (bên gửi và bên nhận không phù hợp với loại lô)."],
  ["lenh khong o buoc cho lay hang", "Lệnh vận chuyển chưa ở bước chờ lấy hàng. Tải lại trang để xem trạng thái mới nhất."],
  ["lenh khong o buoc dang van chuyen", "Lệnh vận chuyển chưa ở bước đang vận chuyển. Tải lại trang để xem trạng thái mới nhất."],
  ["lenh khong bi tu choi", "Lệnh này không ở trạng thái bị từ chối."],
  ["hang chua den noi", "Xe chưa ký xác nhận tới nơi nên bên nhận chưa nhận / từ chối được."],
  ["van chuyen chua ky tra hang", "Đơn vị vận chuyển chưa ký bước chở hàng trả về."],
  ["khong the huy/tu choi o buoc nay", "Không thể hủy / từ chối ở bước này của lệnh."],
  ["khoi luong nhan khong hop le", "Khối lượng nhận không hợp lệ (phải lớn hơn 0 và không vượt quá khối lượng lô)."],
  ["khoi luong lo con khong hop le", "Khối lượng lô mới không hợp lệ."],
  ["khoi luong lay tu lo nguon khong hop le", "Khối lượng lấy từ lô nguồn không hợp lệ."],
  ["khoi luong phai > 0", "Khối lượng phải lớn hơn 0."],
  ["chi gop cac lo cung san pham", "Chỉ gộp được các lô cùng loại sản phẩm."],
  ["chi co so so che / nha phan phoi", "Chỉ cơ sở sơ chế hoặc nhà phân phối mới làm được bước này."],
  ["chi co so so che", "Chỉ cơ sở sơ chế mới làm được bước này."],
  ["chi dai ly", "Chỉ đại lý mới làm được bước này."],
  ["loai su kien khong hop le", "Loại sự kiện không hợp lệ cho bước này."],
  ["danh sach khong khop", "Danh sách gửi lên không khớp nhau. Hãy báo quản trị viên."],
];

// Rút câu lỗi dễ hiểu từ lỗi của ethers / MetaMask / hợp đồng
export const dichLoiBlockchain = (e) => {
  if (e?.code === "ACTION_REJECTED" || e?.code === 4001 || e?.info?.error?.code === 4001) {
    return "Bạn đã từ chối trong MetaMask. Sự kiện vẫn nằm trong danh sách chờ, bấm ký lại khi sẵn sàng.";
  }
  if (e?.code === -32002 || e?.info?.error?.code === -32002) {
    return "MetaMask đang có một yêu cầu chưa xử lý. Hãy mở MetaMask, xử lý yêu cầu đó rồi thử lại.";
  }
  const nguon = [e?.reason, e?.revert?.args?.[0], e?.info?.error?.message, e?.error?.message, e?.data?.message, e?.shortMessage, e?.message]
    .filter((x) => typeof x === "string")
    .join(" | ");
  const thap = nguon.toLowerCase();
  for (const [khoa, cau] of LOI_HOP_DONG) {
    if (thap.includes(khoa)) return cau;
  }
  if (/insufficient funds|insufficient balance|exceeds balance/.test(thap)) {
    return "Ví không đủ tiền trả phí giao dịch (MON). Hãy nạp thêm từ faucet của mạng rồi ký lại.";
  }
  if (/failed to fetch|network error|could not detect network|timeout|econn|bad gateway|missing response/.test(thap)) {
    return "Không kết nối được mạng blockchain hoặc máy chủ. Kiểm tra mạng rồi thử lại.";
  }
  if (/nonce too low|replacement transaction underpriced|already known/.test(thap)) {
    return "MetaMask còn một giao dịch cũ đang chờ. Hãy đợi nó xong (hoặc hủy trong MetaMask) rồi ký lại.";
  }
  if (/execution reverted|call_exception|missing revert data/.test(thap)) {
    return `Hợp đồng từ chối giao dịch này. Chi tiết kỹ thuật: ${e?.reason || e?.shortMessage || e?.message || "không rõ"}`;
  }
  return e?.reason || e?.shortMessage || e?.message || "Có lỗi xảy ra";
};

// Đọc trạng thái MetaMask mà KHÔNG bật popup: có cài chưa, đang chọn tài khoản nào, mạng nào, số dư
export const docTrangThaiMetaMask = async () => {
  if (!window.ethereum) return { coMetaMask: false };
  try {
    const [tk, chainHex] = await Promise.all([
      window.ethereum.request({ method: "eth_accounts" }),
      window.ethereum.request({ method: "eth_chainId" }),
    ]);
    const diaChi = tk?.[0] || null;
    let soDu = null;
    if (diaChi) {
      try {
        const hex = await window.ethereum.request({ method: "eth_getBalance", params: [diaChi, "latest"] });
        soDu = Number(BigInt(hex)) / 1e18;
      } catch {
        soDu = null;
      }
    }
    return { coMetaMask: true, diaChi, chainId: chainHex ? parseInt(chainHex, 16) : null, soDu };
  } catch {
    return { coMetaMask: true, diaChi: null, chainId: null, soDu: null };
  }
};

// Sau khi admin ký setRoles gán lại vai trò cho các ví đã duyệt (hợp đồng mới): báo server kiểm tra trên chain
export const dongBoVaiTro = async (diaChi, txHash) => {
  const res = await fetch(`${API_URL}/admin/vi/dong-bo-vai-tro`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ dia_chi: diaChi, txHash }),
  });
  return parseJson(res);
};
