import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  WidthType,
  BorderStyle,
} from "docx";
import { saveAs } from "file-saver";

const API_URL = "http://localhost:3000/api/kiem-dinh/";

const accepauthority = async (status, code, day, time, inspector) => {
  if (status && (!code || !day || !time || !inspector)) {
    alert("vui lòng nhập đủ dữ liệu");
    return;
  }
  const param = new URLSearchParams();
  param.append("code", code);

  try {
    const fetchaccept = await fetch(
      `${API_URL}accept-authority?${param.toString()}`,
      {
        headers: { "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify({
          status: status,
          code: code,
          day: day,
          time: time,
          inspector: inspector,
        }),
      },
    );
    return await fetchaccept.json();
  } catch (err) {
    console.error(err);
  }
};

// Tải dữ liệu cho lịch hẹn
const fetchSamplingListApi = async (maCoQuan) => {
  const params = new URLSearchParams();
  if (maCoQuan) params.append("ma_co_quan", maCoQuan);

  const res = await fetch(
    `${API_URL}getSamplingScheduleList?${params.toString()}`,
  );
  const data = await res.json();
  return data;
};

// Đặt thời gian lấy mẫu
const updateSampleDetail = async (
  code,
  sealcode,
  sampleweight,
  samplemethod,
  visualconsition,
) => {
  if (
    !code ||
    !sealcode ||
    !samplemethod ||
    !sampleweight ||
    !visualconsition
  ) {
    console.log("vui lòng nhập đầy đủ thông tin");
    return;
  }
  const param = new URLSearchParams();
  param.append("code", code);

  try {
    const fetchupdatesampledetail = await fetch(
      `${API_URL}updatesampledetail?${param.toString()}`,
      {
        headers: { "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify({
          sealcode: sealcode,
          sampleweight: sampleweight,
          samplemethod: samplemethod,
          visualconsition: visualconsition,
        }),
      },
    );
    return await fetchupdatesampledetail.json();
  } catch (err) {
    console.error(err);
  }
};

// Tải danh sách các ngưỡng kiểm định chuẩn từ server
const fetchNguongKiemDinhApi = async (code, tieuChuan, maSanPham) => {
  const params = new URLSearchParams();
  if (code) params.append("code", code);
  if (tieuChuan) params.append("tieu_chuan", tieuChuan);
  if (maSanPham) params.append("ma_san_pham", maSanPham);

  try {
    const res = await fetch(`${API_URL}nguong-kiem-dinh?${params.toString()}`);
    return await res.json();
  } catch (err) {
    console.error("Lỗi nạp ngưỡng kiểm định:", err);
    return { ok: false, data: { standards: [], savedIndicators: [] } };
  }
};

// Lưu chỉ số kiểm định
const saveTestIndicators = async (code, indicators) => {
  const param = new URLSearchParams();
  param.append("code", code);

  try {
    const res = await fetch(`${API_URL}save-indicators?${param.toString()}`, {
      headers: { "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify({ indicators }),
    });
    return await res.json();
  } catch (err) {
    console.error(err);
  }
};

const updateInspectionStatus = async (code, status, message) => {
  const param = new URLSearchParams();
  param.append("code", code);
  try {
    const fetchupdateInspectionStatus = await fetch(
      `${API_URL}updateInspectionStatus?${param.toString()}`,
      {
        headers: { "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify({
          status: status,
          message: message,
        }),
      },
    );
    return await fetchupdateInspectionStatus.json();
  } catch (err) {
    console.error(err);
  }
};

const fetchPublishedCertificatesApi = async (maCoQuan) => {
  const params = new URLSearchParams();
  if (maCoQuan) params.append("ma_co_quan", maCoQuan);

  try {
    const res = await fetch(
      `${API_URL}published-certificates?${params.toString()}`,
    );
    const data = await res.json();
    console.log("dữ liêu", data);

    return data;
  } catch (error) {
    console.error("Lỗi kết nối tải danh sách công bố:", error);
    return { ok: false, data: [] };
  }
};

const fetchRevokedCertificatesApi = async (maCoQuan) => {
  const params = new URLSearchParams();
  if (maCoQuan) params.append("ma_co_quan", maCoQuan);

  try {
    const res = await fetch(
      `${API_URL}revoked-certificates?${params.toString()}`,
    );
    return await res.json();
  } catch (error) {
    console.error("Lỗi kết nối tải danh sách thu hồi:", error);
    return { ok: false, data: [] };
  }
};

const exportInspectionCertificateWord = async (item) => {
  if (!item) {
    alert("Không tìm thấy thông tin lô hàng để xuất báo cáo!");
    return;
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "Độc lập - Tự do - Hạnh phúc",
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "-----------------------------------",
                size: 20,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "BÁO CÁO KẾT QUẢ KIỂM ĐỊNH NÔNG SẢN",
                bold: true,
                size: 32,
                color: "047857",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Tiêu chuẩn chứng nhận: ${item.tieu_chuan_dang_ky || "VIETGAP"}`,
                italics: true,
                size: 24,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({
                text: "I. THÔNG TIN CHUNG VỀ LÔ HÀNG",
                bold: true,
                size: 26,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "• Mã hồ sơ kiểm định: ", bold: true }),
              new TextRun(item.ma_ho_so || "N/A"),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "• Mã kiểm định: ", bold: true }),
              new TextRun(item.ma_kiem_dinh || "N/A"),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "• Tên sản phẩm: ", bold: true }),
              new TextRun(item.ten_san_pham || "N/A"),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "• Mã lô nông sản: ", bold: true }),
              new TextRun(item.ma_lo_nong_san || "N/A"),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "• Khối lượng lô: ", bold: true }),
              new TextRun(
                `${item.so_luong_hien_tai || "0"} ${item.don_vi_tinh || "kg"}`,
              ),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "• Đơn vị sản xuất (Nông trại): ",
                bold: true,
              }),
              new TextRun(item.ten_nong_trai || "Chưa cập nhật"),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "• Chủ nông trại: ", bold: true }),
              new TextRun(item.ten_chu_vuon || "N/A"),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({
                text: "II. KẾT LUẬN & CHỨNG NHẬN",
                bold: true,
                size: 26,
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 35, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: "Số chứng nhận", bold: true }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 65, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph(item.so_chung_nhan || "VG-2026-8812"),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: "Kết quả đánh giá", bold: true }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "ĐẠT CHUẨN AN TOÀN CHẤT LƯỢNG",
                            bold: true,
                            color: "047857",
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Thời gian hiệu lực",
                            bold: true,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph(
                        item.hieu_luc_tu && item.hieu_luc_den
                          ? `${new Date(item.hieu_luc_tu).toLocaleDateString("vi-VN")} - ${new Date(item.hieu_luc_den).toLocaleDateString("vi-VN")}`
                          : "12 tháng kể từ ngày cấp",
                      ),
                    ],
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "" }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                    },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: "ĐẠI DIỆN NÔNG DÂN",
                            bold: true,
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: "(Ký và ghi rõ họ tên)",
                            italics: true,
                            size: 20,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                    },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: "TRUNG TÂM GIÁM ĐỊNH",
                            bold: true,
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: "(Đã ký số điện tử trên AgriChain)",
                            italics: true,
                            size: 20,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `BaoCao_KiemDinh_${item.ma_lo_nong_san || Date.now()}.docx`);
};

export {
  accepauthority,
  updateSampleDetail,
  fetchSamplingListApi,
  fetchNguongKiemDinhApi,
  saveTestIndicators,
  updateInspectionStatus,
  fetchPublishedCertificatesApi,
  fetchRevokedCertificatesApi,
  exportInspectionCertificateWord,
};
