// 共用的小工具(各場景不要再自己寫一份)

/** 從陣列隨機取一個(rng 可注入,測試用) */
export const pick = (arr, rng = Math.random) => arr[Math.floor(rng() * arr.length)];

/** 洗牌(Fisher–Yates,每種排列機率相同;不改動原陣列) */
export function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** 把文字變成可安全放進 innerHTML 的內容(跳脫 & < > " ')。來自外部資料(CIF、使用者輸入)的字串一律要先經過它 */
export const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
