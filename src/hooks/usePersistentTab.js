import { useEffect, useState } from "react";

const PREFIX = "agrichain.tab.";

/**
 * State của tab đang chọn, nhớ trong sessionStorage theo từng trang.
 * Vào trang chi tiết rồi quay lại thì trang danh sách mở đúng tab cũ
 * thay vì về tab đầu tiên. Đóng tab trình duyệt hoặc đăng nhập lại thì về mặc định.
 */
export default function usePersistentTab(pageKey, defaultTab, validTabs) {
  const storageKey = PREFIX + pageKey;

  const [tab, setTab] = useState(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved && (!validTabs || validTabs.includes(saved))) return saved;
    } catch {
      // sessionStorage bị chặn: dùng tab mặc định
    }
    return defaultTab;
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, tab);
    } catch {
      // bỏ qua
    }
  }, [storageKey, tab]);

  return [tab, setTab];
}

// Gọi khi đăng nhập để mỗi phiên làm việc bắt đầu từ tab đầu tiên
export const clearSavedTabs = () => {
  try {
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith(PREFIX))
      .forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // bỏ qua
  }
};
