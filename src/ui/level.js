// 學習階段(🌱 國小 kid / 🔭 國中 teen / 🎓 高中 high):由入口頁(landing.html)選擇、存在 localStorage['level'],整個程式共用。
//   - 階段決定:用語(T('key') 會先找 'key@kid'/'key@teen'/'key@high')、注音(只有國小顯示)、資料難度(forLevel)、視覺主題(<html data-level>)。
//   - 場景只讀 getLevel(),不自己存、不自己切換;要換版本請回入口頁(landing.html?change=1)。
export const LEVELS = ['kid', 'teen', 'high'];
const RANK = { kid: 0, teen: 1, high: 2 };
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };

/** 使用者是否已經在入口頁選過版本 */
export const hasLevel = () => LEVELS.includes(store.get('level'));
export const getLevel = () => { const v = store.get('level') ?? store.get('cloudLevel'); return LEVELS.includes(v) ? v : 'kid'; };   // cloudLevel:舊版電子雲分別存的值
export const setLevel = l => { if (LEVELS.includes(l)) { store.set('level', l); applyLevel(); } };
/** 把目前階段寫到 <html data-level>,樣式與程式都用它判斷 */
export function applyLevel() { if (typeof document !== 'undefined') document.documentElement.dataset.level = getLevel(); }

/**
 * 資料依階段篩選:每筆資料可有 level 欄位 = 「最低適用階段」('kid' 全部階段都看得到、'teen' 國中以上、'high' 只有高中);沒寫就當 'kid'。
 * 例:forLevel(items, 'teen') → 留下 level 為 kid 或 teen 的資料。
 */
export const forLevel = (items, level = getLevel(), key = 'level') => items.filter(it => (RANK[it[key]] ?? 0) <= (RANK[level] ?? 0));
export const levelRank = l => RANK[l] ?? 0;
