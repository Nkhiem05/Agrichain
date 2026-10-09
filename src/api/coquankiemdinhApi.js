const accepauthority = async (status, code, day, time, inspector) => {
  if (status && (!code || !day || !time || !inspector)) {
    alert("vui lòng nhập đủ dữ liệu");
    return;
  }
  const param = new URLSearchParams();
  param.append("code", code);
  const API_URL = "http://localhost:3000/api/kiem-dinh/accept-authority/";
  try {
    const fetchaccept = await fetch(`${API_URL}?${param.toString()}`, {
      headers: { "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify({
        status: status,
        code: code,
        day: day,
        time: time,
        inspector: inspector,
      }),
    });

    const res = await fetchaccept.json();
    if (res) {
      console.log(res);
    }
  } catch {}
};

export { accepauthority };
