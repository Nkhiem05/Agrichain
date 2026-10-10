import { Await } from "react-router-dom";

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

    const res = await fetchaccept.json();
    if (res) {
      console.log(res);
    }
  } catch {}
};

//tài dữ liệu cho lịch hẹn
const fetchSamplingListApi = async (maCoQuan) => {
  const params = new URLSearchParams();
  if (maCoQuan) params.append("ma_co_quan", maCoQuan);

  const res = await fetch(
    `${API_URL}getSamplingScheduleList?${params.toString()}`,
  );
  const data = await res.json();
  return data;
};

// đặt thời gian lấy mẫu
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

    const res = await fetchupdatesampledetail.json();
    if (res.status) {
      console.log(res.message);
    } else {
      console.log("có lỗi xảy ra vui lòng thử lại!!!");
    }
  } catch (err) {
    console.log(err);
  }
};

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
    console.log(err);
  }
};
export {
  accepauthority,
  updateSampleDetail,
  fetchSamplingListApi,
  saveTestIndicators,
};
