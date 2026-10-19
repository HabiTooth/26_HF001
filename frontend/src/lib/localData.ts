const PREFIX = 'habitooth.';

// 로그아웃 시 전부 삭제. 계정 전환 시 데이터 잔류 방지
export function clearAppData() {
  if (typeof window === 'undefined') return;
  [localStorage, sessionStorage].forEach((store) => {
    Object.keys(store)
      .filter((key) => key.startsWith(PREFIX))
      .forEach((key) => store.removeItem(key));
  });
}
