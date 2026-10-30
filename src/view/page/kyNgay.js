import { kyCacSuKienDangCho } from "../../api/blockchainApi";

// Sau một thao tác nghiệp vụ có sinh sự kiện blockchain (xuất kho, nhận hàng, từ chối, bán hết...): mở MetaMask
// để người thực hiện ký ngay, rồi báo kết quả bằng một hộp thoại. Chưa ký được (từ chối trong MetaMask, ví chưa
// duyệt, chờ bước trước...) thì dữ liệu nghiệp vụ vẫn giữ và sự kiện nằm ở tab "Ký blockchain" để ký sau.
export const kyNgay = async (loiBao, { taiLai } = {}) => {
  let thongBao;
  try {
    const kq = await kyCacSuKienDangCho();
    thongBao =
      kq.soDaKy > 0
        ? `${loiBao}\nĐã ký ${kq.soDaKy} sự kiện lên blockchain.`
        : `${loiBao}\nChưa ký blockchain: ${kq.lyDo}.\nBạn có thể ký sau ở tab "Ký blockchain".`;
  } catch (loi) {
    const lyDo =
      loi?.code === "ACTION_REJECTED" || loi?.code === 4001
        ? "bạn đã từ chối trong MetaMask"
        : loi?.reason || loi?.shortMessage || loi?.message;
    thongBao = `${loiBao}\nChưa ký blockchain (${lyDo}).\nBạn có thể ký lại ở tab "Ký blockchain".`;
  }
  alert(thongBao);
  if (taiLai) await taiLai();
};
