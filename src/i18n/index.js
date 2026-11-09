import zh from './zh.js';
import en from './en.js';
import { rubyHTML } from './zhuyin.js';

const dict = { zh, en };
const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
export const state = {
  lang: store.get('lang', 'zh'),
  zhuyin: store.get('zhuyin', '0') === '1',
};
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const listeners = new Set();
export const onLangChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export function setLang(l) { state.lang = l; store.set('lang', l); listeners.forEach(f => f()); }
export function setZhuyin(v) { state.zhuyin = v; store.set('zhuyin', v ? '1' : '0'); listeners.forEach(f => f()); }

/** 把純文字轉為 HTML(中文+注音開啟時加上 ruby) */
export function render(text) {
  text = String(text ?? '');
  return state.lang === 'zh' && state.zhuyin ? rubyHTML(text) : esc(text);
}
/** UI 文字(依 key);可帶變數 {n} */
export function T(key, vars) {
  let s = dict[state.lang][key] ?? dict.zh[key] ?? key;
  if (vars) for (const k in vars) s = s.split(`{${k}}`).join(vars[k]);
  return render(s);
}
/** 純文字版(給 toast 等) */
export function Tp(key, vars) {
  let s = dict[state.lang][key] ?? dict.zh[key] ?? key;
  if (vars) for (const k in vars) s = s.split(`{${k}}`).join(vars[k]);
  return s;
}
/** 資料欄位 {zh,en} → 純文字 */
export const L = o => (o && typeof o === 'object' ? (o[state.lang] ?? o.zh) : o);
/** 資料欄位 → HTML */
export const LH = o => render(L(o));
/** 化學式加下標 */
export function formulaHTML(f) {
  return esc(f).replace(/(\d+)/g, '<sub>$1</sub>');
}
