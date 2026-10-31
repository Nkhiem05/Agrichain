// Mô tả bằng tiếng Việt thông thường cho từng sự kiện chờ ký: người ký đang xác nhận điều gì và sau khi ký thì chuyện gì xảy ra.
// Chỉ để hiển thị trong khung "Ký blockchain"; không ảnh hưởng dữ liệu hay hàm gọi trên hợp đồng.

const kg = (gram) => {
  const n = Number(gram);
  if (!Number.isFinite(n)) return null;
  return `${(n / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 3 })} kg`;
};

const soKg = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && v !== null && v !== "" ? `${n.toLocaleString("vi-VN", { maximumFractionDigits: 3 })} kg` : null;
};

const them = (ds, nhan, giaTri) => {
  if (giaTri !== null && giaTri !== undefined && giaTri !== "") ds.push({ nhan, gia_tri: String(giaTri) });
};

// nhanDien(ma) -> "Tên (MÃ)" hoặc mã nếu không biết tên
const moTaSuKien = (loai, thamSo, nhanDien) => {
  const ts = thamSo || {};
  const ap = ts.ap_dung || {};
  const chiTiet = [];
  let ketQua = "";

  switch (loai) {
    case "HARVEST_CONFIRMED":
      ketQua = "Chốt lô thu hoạch lên blockchain, làm điểm bắt đầu của chuỗi truy xuất cho lô này.";
      them(chiTiet, "Khối lượng", kg(ts.so_luong_gram));
      break;
    case "SAMPLING_SEALED":
      ketQua = "Xác nhận đã lấy mẫu và niêm phong. Sau đó chủ lô ký biên bản lấy mẫu, rồi bạn mới công bố được kết quả.";
      them(chiTiet, "Hồ sơ kiểm định", ts.ma_kiem_dinh);
      break;
    case "SAMPLING_CONFIRMED":
      ketQua = "Xác nhận biên bản lấy mẫu của cơ quan kiểm định. Sau khi bạn ký, cơ quan mới công bố được kết quả.";
      them(chiTiet, "Hồ sơ kiểm định", ts.ma_kiem_dinh);
      break;
    case "CERTIFICATE_ISSUED":
      ketQua = "Công bố lô ĐẠT và ghi chứng nhận lên blockchain. Hồ sơ chỉ chuyển sang \"đã công bố\" sau khi ký.";
      them(chiTiet, "Hồ sơ kiểm định", ts.ma_kiem_dinh);
      break;
    case "CERTIFICATE_FAILED":
      ketQua = "Công bố lô KHÔNG ĐẠT và ghi lên blockchain. Lô này không thể đi tiếp trong chuỗi.";
      them(chiTiet, "Hồ sơ kiểm định", ts.ma_kiem_dinh);
      break;
    case "CERTIFICATE_REVOKED":
      ketQua = "Thu hồi chứng nhận đã cấp và ghi lên blockchain.";
      them(chiTiet, "Hồ sơ kiểm định", ts.ma_kiem_dinh);
      break;
    case "TRANSPORT_ORDERED":
      ketQua = "Xác nhận giao lô cho xe vận chuyển lấy đi. Sau khi ký, xe mới lấy hàng được.";
      them(chiTiet, "Mã vận đơn", ts.ma_van_don);
      them(chiTiet, "Đơn vị vận chuyển", ts.ma_don_vi_van_chuyen && nhanDien(ts.ma_don_vi_van_chuyen));
      them(chiTiet, "Bên nhận", ts.ma_ben_nhan && nhanDien(ts.ma_ben_nhan));
      break;
    case "PICKUP_CONFIRMED":
      ketQua = "Xác nhận đã lấy hàng. Lô chuyển sang trạng thái đang vận chuyển sau khi ký.";
      them(chiTiet, "Mã vận đơn", ts.ma_van_don);
      break;
    case "DELIVERY_CONFIRMED":
      ketQua = "Xác nhận xe đã tới nơi giao. Bên nhận chỉ nhận hàng được sau khi bạn ký.";
      them(chiTiet, "Mã vận đơn", ts.ma_van_don);
      break;
    case "STOCK_IN_CONFIRMED":
      ketQua = "Xác nhận đã nhận hàng. Lô chỉ chuyển về bạn (và vào kho nếu có) sau khi ký.";
      them(chiTiet, "Mã vận đơn", ts.ma_van_don);
      them(chiTiet, "Khối lượng nhận", kg(ts.khoi_luong_nhan_gram) || soKg(ap.khoi_luong_nhan));
      them(chiTiet, "Vị trí lưu kho", ap.nhap_kho?.vi_tri_luu_kho);
      break;
    case "HANDOVER_REJECTED":
      ketQua = "Từ chối nhận hàng. Hàng được ghi nhận là bị từ chối và chờ chở về bên gửi sau khi bạn ký.";
      them(chiTiet, "Mã vận đơn", ts.ma_van_don);
      them(chiTiet, "Lý do", ap.ghi_chu);
      break;
    case "BATCH_RELATION": {
      const nguon = ts.ma_lo_nguon || [];
      ketQua = nguon.length > 1
        ? "Ghi lô mới được GỘP từ các lô nguồn lên blockchain. Phải ký xong mới xuất kho hoặc làm tiếp với lô mới được."
        : "Ghi lô mới được tách ra từ lô nguồn lên blockchain. Phải ký xong mới xuất kho hoặc làm tiếp với lô mới được.";
      them(chiTiet, "Lô nguồn", nguon.join(", "));
      them(chiTiet, "Khối lượng lô mới", kg(ts.so_luong_gram));
      break;
    }
    case "PROCESSING_DONE":
      ketQua = "Xác nhận đã sơ chế xong lô. Hồ sơ sơ chế chuyển giai đoạn sau khi ký.";
      break;
    case "PACKAGING_DONE":
      ketQua = "Xác nhận đã đóng gói xong lô. Hồ sơ chuyển giai đoạn sau khi ký.";
      break;
    case "COMPLETE_CONFIRMED":
      ketQua = "Xác nhận lô đã bán hết và đóng lô trên blockchain. Lô chỉ kết thúc sau khi ký.";
      break;
    case "RETURN_SHIPPED":
      ketQua = "Xác nhận đã chở hàng bị từ chối về bên gửi.";
      break;
    case "RETURN_RECEIVED":
      ketQua = "Xác nhận đã nhận lại hàng bị trả về. Lô quay lại kho của bạn.";
      break;
    case "CORRECTION":
      ketQua = "Ghi một đính chính dữ liệu của lô lên blockchain (dữ liệu cũ vẫn được giữ lại).";
      break;
    default:
      ketQua = "Ghi sự kiện này lên blockchain.";
  }
  return { ket_qua: ketQua, chi_tiet: chiTiet };
};

module.exports = { moTaSuKien };
