import { useMemo, useState } from "react";
import "../public/css/nongdan-dashboard.css";

const plots = [
  {
    name: "Ruộng lúa Đông Xuân",
    area: "2,4 ha",
    crop: "Lúa ST25",
    stage: "Giai đoạn sinh trưởng",
    progress: 68,
    harvest: "Còn 32 ngày",
    image:
      "https://images.unsplash.com/photo-1536054868622-2e336e6c9d49?auto=format&fit=crop&w=900&q=85",
    tone: "rice",
  },
  {
    name: "Vườn xoài Cát Chu",
    area: "1,8 ha",
    crop: "Xoài Cát Chu",
    stage: "Đang ra hoa",
    progress: 42,
    harvest: "Còn 54 ngày",
    image:
      "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=900&q=85",
    tone: "mango",
  },
  {
    name: "Vườn rau nhà lưới",
    area: "0,6 ha",
    crop: "Rau cải hữu cơ",
    stage: "Sắp thu hoạch",
    progress: 91,
    harvest: "Còn 6 ngày",
    image:
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=85",
    tone: "greens",
  },
];

const navigation = [
  { label: "Tổng quan", icon: "grid" },
  { label: "Thửa canh tác", icon: "field" },
  { label: "Mùa vụ", icon: "calendar" },
  { label: "Thu hoạch", icon: "harvest" },
  { label: "Đơn hàng", icon: "orders", count: "3" },
];

function Icon({ name, size = 20 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const paths = {
    grid: (
      <>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
      </>
    ),
    field: (
      <>
        <path d="M4 20c4-1 6-3.5 8-7s4-5 8-6" />
        <path d="M4 15c2-.5 3.5-1.5 5-3" />
        <path d="M12 20c1-2 2-3.5 4-5" />
        <path d="M4 6c2 0 3.5.5 5 2" />
        <path d="M4 6v4" />
      </>
    ),
    calendar: (
      <>
        <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
        <path d="M7.5 3v4M16.5 3v4M3.5 9.5h17" />
        <path d="m8 14 2 2 5-5" />
      </>
    ),
    harvest: (
      <>
        <path d="M12 21V11" />
        <path d="M12 14c-5 0-8-2.5-8-7 5 0 8 2.5 8 7Z" />
        <path d="M12 11c0-4.5 3-7 8-7 0 4.5-3 7-8 7Z" />
        <path d="M7 21h10" />
      </>
    ),
    orders: (
      <>
        <path d="M5 4h14v16H5z" />
        <path d="M8 8h8M8 12h8M8 16h4" />
      </>
    ),
    bell: (
      <>
        <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    search: (
      <>
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
      </>
    ),
    drop: (
      <>
        <path d="M12 3s7 7.1 7 12a7 7 0 0 1-14 0c0-4.9 7-12 7-12Z" />
        <path d="M9 16a3 3 0 0 0 3 2" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    pin: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
  };

  return <svg {...common}>{paths[name] || paths.grid}</svg>;
}

function FarmPage() {
  const [activePage, setActivePage] = useState("Tổng quan");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [plotList, setPlotList] = useState(plots);
  const [plotName, setPlotName] = useState("");
  const filteredPlots = useMemo(
    () =>
      plotList.filter((plot) =>
        `${plot.name} ${plot.crop}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [plotList, search],
  );

  function addPlot(event) {
    event.preventDefault();
    if (!plotName.trim()) return;
    setPlotList((current) => [
      ...current,
      {
        name: plotName.trim(),
        area: "Chưa cập nhật",
        crop: "Chưa chọn cây trồng",
        stage: "Chưa bắt đầu",
        progress: 0,
        harvest: "Chưa có lịch",
        image:
          "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=85",
        tone: "rice",
      },
    ]);
    setPlotName("");
    setShowForm(false);
  }

  return (
    <div className="farmer-app">
      <aside className="farmer-sidebar">
        <a
          className="brand-lockup"
          href="#overview"
          aria-label="AgriChain trang chủ"
        >
          <span className="brand-mark">
            <Icon name="field" size={24} />
          </span>
          <span>
            agri<span>chain</span>
            <small>NÔNG TRẠI SỐ</small>
          </span>
        </a>

        <div className="farm-switcher">
          <span className="farm-switcher-icon">A</span>
          <span>
            <strong>Nông trại An Phú</strong>
            <small>Đồng Tháp, Việt Nam</small>
          </span>
          <span className="switcher-chevron">⌄</span>
        </div>

        <p className="nav-caption">KHÔNG GIAN LÀM VIỆC</p>
        <nav className="farmer-nav" aria-label="Điều hướng chính">
          {navigation.map((item) => (
            <button
              className={`nav-link ${activePage === item.label ? "is-active" : ""}`}
              key={item.label}
              onClick={() => setActivePage(item.label)}
              type="button"
            >
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
              {item.count && <span className="nav-count">{item.count}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-season">
          <div className="season-orbit">
            <span>↗</span>
          </div>
          <p>VỤ MÙA HIỆN TẠI</p>
          <strong>Đông Xuân 2025–26</strong>
          <div className="season-progress">
            <span />
          </div>
          <small>
            Ngày thứ 48 <span>•</span> Còn 72 ngày
          </small>
        </div>

        <button
          className="profile-button"
          type="button"
          onClick={() => setActivePage("Hồ sơ nông trại")}
        >
          <span className="profile-avatar">NT</span>
          <span>
            <strong>Nguyễn Văn Tám</strong>
            <small>Nông dân</small>
          </span>
          <span className="profile-more">···</span>
        </button>
      </aside>

      <main className="farmer-main" id="overview">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Không gian làm việc</span>
            <b>/</b>
            <strong>{activePage}</strong>
          </div>
          <div className="topbar-actions">
            <label className="global-search">
              <Icon name="search" size={18} />
              <input
                aria-label="Tìm kiếm thửa canh tác"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm thửa, cây trồng..."
                value={search}
              />
              <kbd>⌘ K</kbd>
            </label>
            <button
              className="icon-button notification-button"
              aria-label="Thông báo"
              type="button"
            >
              <Icon name="bell" size={19} />
              <i />
            </button>
            <span className="topbar-divider" />
            <button
              className="topbar-user"
              type="button"
              onClick={() => setActivePage("Hồ sơ nông trại")}
            >
              <span className="profile-avatar small-avatar">NT</span>
              <span>Chào, anh Tám</span>
              <b>⌄</b>
            </button>
          </div>
        </header>

        <div className="dashboard-content">
          <section className="welcome-row">
            <div>
              <p className="eyebrow">
                <span className="eyebrow-dot" /> THỨ HAI, 28 THÁNG 9, 2026
              </p>
              <h1>
                {activePage === "Tổng quan"
                  ? "Chào buổi sáng, anh Tám"
                  : activePage}
                <span className="heading-period">.</span>
              </h1>
              <p className="welcome-copy">
                Nông trại của anh đang có một ngày thật tốt. Đây là tình hình
                hôm nay.
              </p>
            </div>
            <button
              className="primary-button"
              type="button"
              onClick={() => setShowForm(true)}
            >
              <Icon name="plus" size={18} /> Thêm thửa mới
            </button>
          </section>

          <section className="metric-grid" aria-label="Tổng quan nông trại">
            <article className="metric-card metric-green">
              <div className="metric-top">
                <span>Diện tích canh tác</span>
                <span className="metric-icon">
                  <Icon name="field" size={19} />
                </span>
              </div>
              <div className="metric-value">
                4,8 <small>ha</small>
              </div>
              <div className="metric-foot">
                <span className="trend-up">↗ 12%</span>
                <span>so với vụ trước</span>
              </div>
              <span className="metric-spark spark-green" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>
            </article>
            <article className="metric-card metric-gold">
              <div className="metric-top">
                <span>Thửa đang canh tác</span>
                <span className="metric-icon">
                  <Icon name="harvest" size={19} />
                </span>
              </div>
              <div className="metric-value">
                08 <small>thửa</small>
              </div>
              <div className="metric-foot">
                <span className="metric-neutral">06 cây trồng</span>
                <span>trên 3 khu vực</span>
              </div>
              <span className="metric-spark spark-gold" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>
            </article>
            <article className="metric-card metric-blue">
              <div className="metric-top">
                <span>Sản lượng dự kiến</span>
                <span className="metric-icon">
                  <Icon name="orders" size={19} />
                </span>
              </div>
              <div className="metric-value">
                12,6 <small>tấn</small>
              </div>
              <div className="metric-foot">
                <span className="trend-up">↗ 8,4%</span>
                <span>so với vụ trước</span>
              </div>
              <span className="metric-spark spark-blue" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>
            </article>
            <article className="metric-card metric-coral">
              <div className="metric-top">
                <span>Doanh thu mùa vụ</span>
                <span className="metric-icon">
                  <span className="currency-icon">₫</span>
                </span>
              </div>
              <div className="metric-value">
                86,4 <small>tr.đ</small>
              </div>
              <div className="metric-foot">
                <span className="trend-up">↗ 6,2%</span>
                <span>so với vụ trước</span>
              </div>
              <span className="metric-spark spark-coral" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>
            </article>
          </section>

          <section className="insight-grid">
            <article className="panel production-panel">
              <div className="panel-heading">
                <div>
                  <h2>Sản lượng theo mùa vụ</h2>
                  <p>Theo dõi tiến độ thu hoạch của nông trại</p>
                </div>
                <button className="select-button" type="button">
                  Đông Xuân 2025–26 <span>⌄</span>
                </button>
              </div>
              <div className="chart-legend">
                <span>
                  <i className="legend-current" />
                  Sản lượng thực tế
                </span>
                <span>
                  <i className="legend-forecast" />
                  Dự kiến
                </span>
              </div>
              <div className="chart-wrap">
                <div className="chart-y-labels">
                  <span>15 t</span>
                  <span>10 t</span>
                  <span>5 t</span>
                  <span>0</span>
                </div>
                <svg
                  className="production-chart"
                  viewBox="0 0 720 194"
                  role="img"
                  aria-label="Biểu đồ sản lượng tăng từ tháng 5 đến tháng 10"
                >
                  <defs>
                    <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#6a9f70" stopOpacity=".23" />
                      <stop offset="100%" stopColor="#6a9f70" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    className="chart-gridline"
                    d="M0 15H720M0 66H720M0 117H720M0 168H720"
                  />
                  <path
                    d="M0 154 C45 149 54 135 102 140 S162 121 205 126 S265 105 308 111 S367 90 410 98 S470 76 513 84 S572 55 616 67 S674 38 720 46 V168 H0Z"
                    fill="url(#chart-fill)"
                  />
                  <path
                    className="chart-line"
                    d="M0 154 C45 149 54 135 102 140 S162 121 205 126 S265 105 308 111 S367 90 410 98 S470 76 513 84 S572 55 616 67 S674 38 720 46"
                  />
                  <path
                    className="forecast-line"
                    d="M513 84 C558 67 575 54 616 67 S674 38 720 46"
                  />
                  <circle className="chart-point" cx="513" cy="84" r="4.5" />
                  <circle className="chart-point" cx="616" cy="67" r="4.5" />
                  <circle
                    className="chart-point latest-point"
                    cx="720"
                    cy="46"
                    r="5.5"
                  />
                </svg>
                <div className="chart-x-labels">
                  <span>Th. 5</span>
                  <span>Th. 6</span>
                  <span>Th. 7</span>
                  <span>Th. 8</span>
                  <span>Th. 9</span>
                  <span>Th. 10</span>
                </div>
              </div>
              <div className="chart-summary">
                <span>
                  <i />
                  Tổng dự kiến <strong>12.600 kg</strong>
                </span>
                <span>
                  Vụ trước <strong>11.420 kg</strong>
                </span>
              </div>
            </article>

            <aside className="panel weather-panel">
              <div className="weather-heading">
                <div>
                  <span className="panel-kicker">THỜI TIẾT HÔM NAY</span>
                  <h2>Đồng Tháp</h2>
                </div>
                <span className="weather-location">
                  <Icon name="pin" size={16} />
                </span>
              </div>
              <div className="weather-now">
                <div className="sun-disc">
                  <Icon name="sun" size={31} />
                </div>
                <div>
                  <strong>32°</strong>
                  <span>Nắng nhẹ</span>
                </div>
              </div>
              <p className="weather-note">
                Thời tiết thuận lợi cho việc chăm sóc cây trồng.
              </p>
              <div className="weather-details">
                <span>
                  <Icon name="drop" size={17} />
                  <small>Độ ẩm</small>
                  <strong>72%</strong>
                </span>
                <span>
                  <Icon name="field" size={17} />
                  <small>Gió</small>
                  <strong>12 km/h</strong>
                </span>
              </div>
              <div className="weather-advice">
                <span>GỢI Ý HÔM NAY</span>
                <p>Thời điểm tốt để bón phân cho ruộng lúa.</p>
              </div>
            </aside>
          </section>

          <section className="plots-section">
            <div className="plots-heading">
              <div>
                <div className="section-title-row">
                  <h2>Thửa canh tác</h2>
                  <span className="plot-total">
                    {filteredPlots.length.toString().padStart(2, "0")}
                  </span>
                </div>
                <p>Cập nhật tình hình các khu vực sản xuất</p>
              </div>
              <button
                className="text-button"
                type="button"
                onClick={() => setActivePage("Thửa canh tác")}
              >
                Xem tất cả <Icon name="arrow" size={16} />
              </button>
            </div>
            {filteredPlots.length ? (
              <div className="plot-grid">
                {filteredPlots.map((plot) => (
                  <article
                    className={`plot-card plot-${plot.tone}`}
                    key={`${plot.name}-${plot.crop}`}
                  >
                    <div className="plot-image-wrap">
                      <img src={plot.image} alt={plot.crop} />
                      <span className="plot-area">
                        <Icon name="field" size={14} />
                        {plot.area}
                      </span>
                      <button
                        className="plot-menu"
                        type="button"
                        aria-label={`Tùy chọn ${plot.name}`}
                      >
                        ···
                      </button>
                    </div>
                    <div className="plot-info">
                      <div className="plot-title-line">
                        <h3>{plot.name}</h3>
                        <span className="plot-status">
                          <i />
                          Đang tốt
                        </span>
                      </div>
                      <p className="plot-crop">
                        {plot.crop}
                        <span>·</span>
                        {plot.stage}
                      </p>
                      <div className="plot-progress-label">
                        <span>Tiến độ mùa vụ</span>
                        <strong>{plot.progress}%</strong>
                      </div>
                      <div className="plot-progress">
                        <span style={{ width: `${plot.progress}%` }} />
                      </div>
                      <div className="plot-footer">
                        <span>
                          <Icon name="clock" size={15} />
                          {plot.harvest}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActivePage(plot.name)}
                        >
                          Chi tiết <Icon name="arrow" size={14} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                Không tìm thấy thửa canh tác phù hợp.
              </div>
            )}
          </section>

          <section className="bottom-grid">
            <article className="panel task-panel">
              <div className="compact-panel-heading">
                <div>
                  <span className="panel-kicker">CẦN LÀM HÔM NAY</span>
                  <h2>Lịch công việc</h2>
                </div>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => setActivePage("Mùa vụ")}
                >
                  Mở lịch <Icon name="arrow" size={15} />
                </button>
              </div>
              <div className="task-row">
                <span className="task-time">08:30</span>
                <span className="task-marker task-marker-green" />
                <span className="task-description">
                  <strong>Bón phân lần 2</strong>
                  <small>
                    Ruộng lúa Đông Xuân <i>•</i> 2,4 ha
                  </small>
                </span>
                <span className="task-tag">Đang chờ</span>
              </div>
              <div className="task-row">
                <span className="task-time">14:00</span>
                <span className="task-marker task-marker-gold" />
                <span className="task-description">
                  <strong>Kiểm tra hệ thống tưới</strong>
                  <small>
                    Vườn xoài Cát Chu <i>•</i> 1,8 ha
                  </small>
                </span>
                <span className="task-tag task-tag-later">Sắp tới</span>
              </div>
            </article>
            <article className="harvest-callout">
              <div className="callout-icon">
                <Icon name="harvest" size={22} />
              </div>
              <div>
                <span className="panel-kicker">MÙA THU HOẠCH KẾ TIẾP</span>
                <h2>Rau cải hữu cơ</h2>
                <p>
                  Vườn rau nhà lưới <span>·</span> 0,6 ha
                </p>
              </div>
              <div className="harvest-count">
                <strong>06</strong>
                <span>ngày nữa</span>
              </div>
            </article>
          </section>
          <footer className="dashboard-footer">
            <span>© 2026 AgriChain</span>
            <span>Phát triển bền vững, mùa màng bội thu.</span>
            <a href="#support">Trung tâm hỗ trợ</a>
          </footer>
        </div>
      </main>

      {showForm && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowForm(false);
          }}
        >
          <section
            aria-labelledby="add-plot-title"
            aria-modal="true"
            className="plot-modal"
            role="dialog"
          >
            <div className="modal-heading">
              <div>
                <span className="panel-kicker">QUẢN LÝ SẢN XUẤT</span>
                <h2 id="add-plot-title">Thêm thửa canh tác</h2>
              </div>
              <button
                aria-label="Đóng"
                className="icon-button"
                onClick={() => setShowForm(false)}
                type="button"
              >
                <Icon name="close" size={19} />
              </button>
            </div>
            <form onSubmit={addPlot}>
              <label htmlFor="plot-name">Tên thửa canh tác</label>
              <input
                autoFocus
                id="plot-name"
                onChange={(event) => setPlotName(event.target.value)}
                placeholder="Ví dụ: Ruộng lúa sau nhà"
                required
                value={plotName}
              />
              <p>Thông tin diện tích và cây trồng có thể cập nhật sau.</p>
              <div className="modal-actions">
                <button
                  className="secondary-button"
                  onClick={() => setShowForm(false)}
                  type="button"
                >
                  Hủy
                </button>
                <button className="primary-button" type="submit">
                  <Icon name="plus" size={17} />
                  Tạo thửa
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default FarmPage;
