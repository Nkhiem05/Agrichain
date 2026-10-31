import { kyCacSuKienDangCho, dichLoiBlockchain } from "../../api/blockchainApi";

// Sau một thao tác nghiệp vụ có sinh sự kiện blockchain (xuất kho, nhận hàng, từ chối, bán hết...): mở MetaMask
// để người thực hiện ký ngay, rồi báo kết quả bằng một hộp thoại.
//  - thanhCong: câu báo khi đã ký xong (bước đã có hiệu lực).
//  - Chưa ký được (từ chối trong MetaMask, ví chưa duyệt, chờ bước trước...): bước CHƯA có hiệu lực, yêu cầu nằm ở tab
//    "Ký blockchain" để ký sau; hộp thoại nói rõ lý do.
export const kyNgay = async (loiBao, { taiLai, thanhCong } = {}) => {
  let thongBao;
  try {
    const kq = await kyCacSuKienDangCho();
    thongBao =
      kq.soDaKy > 0
        ? `${thanhCong || loiBao}\nĐã ký ${kq.soDaKy} sự kiện lên blockchain${
            kq.soChoXacNhan > 0 ? ", đang chờ blockchain xác nhận (hệ thống tự cập nhật)" : ""
          }.`
        : `${loiBao}\nChưa ký blockchain: ${kq.lyDo}.\nBước này chỉ có hiệu lực sau khi bạn ký: bấm lại nút hoặc vào tab "Ký blockchain".`;
  } catch (loi) {
    const lyDo = dichLoiBlockchain(loi);
    thongBao = `${loiBao}\nChưa ký blockchain (${lyDo}).\nBước này chỉ có hiệu lực sau khi bạn ký: bấm lại nút hoặc vào tab "Ký blockchain".`;
  }
  alert(thongBao);
  if (taiLai) await taiLai();
};

// Báo kết quả của một API có thể cần ký: res.cho_ky = server đã tạo sự kiện chờ ký (mở MetaMask ngay);
// không có cho_ky = bước đã có hiệu lực luôn (chưa bật blockchain hoặc lô cũ không được theo dõi).
export const baoKetQua = async (res, { thanhCong, taiLai } = {}) => {
  if (res?.cho_ky) {
    await kyNgay(res.message || thanhCong || "Đã gửi yêu cầu.", { thanhCong, taiLai });
    return;
  }
  alert(thanhCong || res?.message || "Đã thực hiện.");
  if (taiLai) await taiLai();
};
