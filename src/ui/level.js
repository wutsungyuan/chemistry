// 學習階段(🌱 國小 / 🔭 國中 / 🎓 高中):電子雲與「原子核與同位素」共用,換頁時保留使用者上次選的。
export const LEVELS = ['kid', 'teen', 'high'];
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
export const getLevel = () => { const v = store.get('level') ?? store.get('cloudLevel'); return LEVELS.includes(v) ? v : 'kid'; };   // cloudLevel:舊版電子雲分別存的值
export const setLevel = l => { if (LEVELS.includes(l)) store.set('level', l); };
