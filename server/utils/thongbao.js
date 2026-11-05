// Thông báo dùng chung (toast) thay cho alert() ở mọi trang.
//
// Cách dùng:
//   import { thongBao } from "../../utils/thongbao";
//   thongBao.thanhCong("Đã lưu phương tiện");
//   thongBao.loi("Không thể lưu tài xế", "Lưu thất bại");   // (nội dung, tiêu đề tùy chọn)
//   thongBao.canhBao("Vui lòng chọn đơn vị vận chuyển!");     // vàng (thongTin là tên khác của canhBao)
//   thongBao("Nội dung bất kỳ");                               // tự đoán loại giống alert()
//
// 3 trạng thái: thành công = xanh lá, thất bại = đỏ, thông báo / cảnh báo = vàng.
//   thongBao("Nội dung", { loai: "loi", tieuDe: "Lỗi", thoiGian: 6000 });
//
// Gọi caiDatThayAlert() một lần ở main.jsx: từ đó mọi alert("...") sẵn có trong dự án
// (kể cả file api, hook) tự hiện bằng toast, không cần sửa từng nơi.
// Không phụ thuộc React nên gọi được ở bất kỳ file nào.

const THOI_GIAN_MAC_DINH = 4000;
const TOI_DA_HIEN = 5;

const LOAI = {
  thanhCong: {
    tieuDe: "Thành công",
    mau: "#16a34a",
    icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>',
  },
  loi: {
    tieuDe: "Có lỗi xảy ra",
    mau: "#dc2626",
    icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>',
  },
  canhBao: {
    tieuDe: "Thông báo",
    mau: "#f59e0b",
    icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 7v6m0 4h.01"/>',
  },
};

const CSS = `
.tb-container {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 2147483000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
  pointer-events: none;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}
.tb-container .tb-toast {
  pointer-events: auto;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 340px;
  max-width: calc(100vw - 32px);
  padding: 12px 12px 15px 20px;
  background-color: #f4f5f7;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1);
  animation: tb-vao 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.tb-container .tb-toast::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  background-color: var(--tb-mau);
}
.tb-container .tb-toast.tb-dong {
  animation: tb-ra 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.tb-container .tb-icon {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  margin-top: 1px;
  border-radius: 50%;
  background-color: var(--tb-mau);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tb-container .tb-icon svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
}
.tb-container .tb-noidung {
  flex: 1;
  min-width: 0;
  padding-right: 4px;
}
.tb-container .tb-tieude {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.35;
  color: #0f172a;
}
.tb-container .tb-mota {
  margin: 2px 0 0;
  font-size: 12.5px;
  line-height: 1.45;
  color: #64748b;
  white-space: pre-line;
  overflow-wrap: anywhere;
  max-height: 40vh;
  overflow-y: auto;
}
.tb-container .tb-x {
  flex-shrink: 0;
  margin: -2px 0 0;
  padding: 4px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #94a3b8;
  line-height: 0;
  cursor: pointer;
  transition: all 0.2s ease;
}
.tb-container .tb-x:hover {
  background-color: rgba(203, 213, 225, 0.6);
  color: #334155;
}
.tb-container .tb-x svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
}
.tb-container .tb-tientrinh {
  position: absolute;
  left: 6px;
  right: 0;
  bottom: 0;
  height: 3px;
  background-color: #e2e8f0;
}
.tb-container .tb-tientrinh > div {
  height: 100%;
  background-color: var(--tb-mau);
  animation: tb-chay linear forwards;
}
@keyframes tb-vao {
  from { opacity: 0; transform: translateX(110%); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes tb-ra {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(110%); }
}
@keyframes tb-chay {
  from { width: 100%; }
  to { width: 0%; }
}
@media (max-width: 520px) {
  .tb-container { top: 12px; right: 16px; }
}
`;

let khung = null;
const dangHien = new Map(); // khóa "loai|noidung" -> { gioiHan() } để không chồng nhiều thông báo giống hệt

const layKhung = () => {
  if (khung && document.body.contains(khung)) return khung;
  if (!document.getElementById("tb-style")) {
    const style = document.createElement("style");
    style.id = "tb-style";
    style.textContent = CSS;
    document.head.appendChild(style);
  }
  khung = document.createElement("div");
  khung.className = "tb-container";
  document.body.appendChild(khung);
  return khung;
};

// Đoán loại từ câu chữ khi gọi kiểu alert("...")
export const doanLoai = (noiDung) => {
  const s = String(noiDung).toLowerCase();
  // Nhắc "chờ bên khác ký / bạn cần ký" là thông báo (vàng), không phải lỗi, kể cả khi câu có chữ "chưa ký được"
  if (
    /chưa ký|chờ .{0,80}ký|cần ký|hãy ký|vui lòng ký|ký ở tab|tab "ký blockchain"/.test(
      s,
    ) &&
    !/thất bại|không thể|\blỗi\b|không kết nối/.test(s)
  )
    return "canhBao";
  if (
    /thất bại|không thể|\blỗi\b|không kết nối|chưa ký được|không tìm thấy|không xác định được|không hợp lệ|không đổi được|không thành công/.test(
      s,
    )
  )
    return "loi";
  if (/^\s*đã(\s|$)/.test(s)) return "thanhCong";
  if (/thành công|hoàn tất|\bxong\b/.test(s) && !/nhưng|vui lòng|chưa /.test(s))
    return "thanhCong";
  return "canhBao"; // còn lại là thông báo chung (vàng)
};

const hienThi = (loai, noiDung, tuyChon = {}) => {
  if (typeof document === "undefined") return null;
  const van = noiDung == null ? "" : String(noiDung).trim();
  if (!van) return null;
  if (loai === "thongTin" || !LOAI[loai]) loai = "canhBao";

  const cauHinh = typeof tuyChon === "string" ? { tieuDe: tuyChon } : tuyChon;
  const tieuDe = cauHinh.tieuDe || LOAI[loai].tieuDe;
  // Nội dung dài thì cho đọc lâu hơn (tối đa 9 giây)
  const thoiGian =
    cauHinh.thoiGian ||
    Math.min(9000, THOI_GIAN_MAC_DINH + Math.max(0, van.length - 60) * 40);
  const khoa = `${loai}|${tieuDe}|${van}`;

  // Cùng nội dung đang hiện: chỉ làm mới thời gian, không xếp chồng
  if (dangHien.has(khoa)) {
    dangHien.get(khoa).lamMoi();
    return dangHien.get(khoa).dong;
  }

  const cha = layKhung();
  const toast = document.createElement("div");
  toast.className = "tb-toast";
  toast.style.setProperty("--tb-mau", LOAI[loai].mau);
  toast.setAttribute("role", loai === "thanhCong" ? "status" : "alert");
  toast.innerHTML =
    `<div class="tb-icon"><svg viewBox="0 0 24 24">${LOAI[loai].icon}</svg></div>` +
    '<div class="tb-noidung"><h4 class="tb-tieude"></h4><p class="tb-mota"></p></div>' +
    '<button type="button" class="tb-x" aria-label="Đóng thông báo"><svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>' +
    '<div class="tb-tientrinh"><div></div></div>';
  toast.querySelector(".tb-tieude").textContent = tieuDe;
  toast.querySelector(".tb-mota").textContent = van;

  const thanh = toast.querySelector(".tb-tientrinh > div");
  let hen = null;
  let daDong = false;

  const dong = () => {
    if (daDong) return;
    daDong = true;
    clearTimeout(hen);
    dangHien.delete(khoa);
    toast.classList.add("tb-dong");
    setTimeout(() => toast.remove(), 300);
  };

  const chay = (ms) => {
    clearTimeout(hen);
    thanh.style.animation = "none";
    void thanh.offsetWidth; // chạy lại hiệu ứng thanh tiến trình
    thanh.style.animation = "";
    thanh.style.animationDuration = `${ms}ms`;
    thanh.style.animationPlayState = "running";
    hen = setTimeout(dong, ms);
  };

  toast.querySelector(".tb-x").addEventListener("click", dong);
  // Rê chuột vào thì giữ lại để đọc; rời chuột 1,2 giây sau thì đóng
  toast.addEventListener("mouseenter", () => {
    clearTimeout(hen);
    thanh.style.animationPlayState = "paused";
  });
  toast.addEventListener("mouseleave", () => {
    thanh.style.animationPlayState = "running";
    clearTimeout(hen);
    hen = setTimeout(dong, 1200);
  });

  cha.appendChild(toast);
  chay(thoiGian);
  dangHien.set(khoa, { dong, lamMoi: () => chay(thoiGian) });

  // Quá nhiều thông báo cùng lúc thì bỏ cái cũ nhất
  const cacToast = cha.querySelectorAll(".tb-toast:not(.tb-dong)");
  if (cacToast.length > TOI_DA_HIEN) cacToast[0].querySelector(".tb-x").click();

  return dong;
};

// thongBao("nội dung") tự đoán loại; thongBao("nội dung", { loai, tieuDe, thoiGian })
export const thongBao = (noiDung, tuyChon = {}) => {
  const cauHinh = typeof tuyChon === "string" ? { tieuDe: tuyChon } : tuyChon;
  return hienThi(cauHinh.loai || doanLoai(noiDung), noiDung, cauHinh);
};

thongBao.thanhCong = (noiDung, tuyChon) =>
  hienThi("thanhCong", noiDung, tuyChon);
thongBao.loi = (noiDung, tuyChon) => hienThi("loi", noiDung, tuyChon);
thongBao.canhBao = (noiDung, tuyChon) => hienThi("canhBao", noiDung, tuyChon);
thongBao.thongTin = thongBao.canhBao; // tên khác: thông báo chung (vàng)

export const caiDatThayAlert = () => {
  if (typeof window === "undefined" || window.__alertGoc) return;
  window.__alertGoc = window.alert;
  window.alert = (noiDung) => {
    thongBao(noiDung);
  };
};

export default thongBao;
