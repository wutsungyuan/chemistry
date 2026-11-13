import zh from './zh.js';
import en from './en.js';
import nuc from './packs/nuc.js';
import matter from './packs/matter.js';
import quiz from './packs/quiz.js';
import lab from './packs/lab.js';
import atom from './packs/atom.js';
import gallery from './packs/gallery.js';
import reaction from './packs/reaction.js';
import spectrum from './packs/spectrum.js';
import ui from './packs/ui.js';
import { rubyHTML } from './zhuyin.js';
import { escapeHtml as esc } from '../ui/util.js';
import { getLevel } from '../ui/level.js';

// 基本文字 + 各功能自己的文字包(packs/*.js,每包 {zh, en})。新功能的文字請放進新的 pack,不要再往 zh.js/en.js 堆。
const PACKS = [nuc, matter, quiz, lab, atom, gallery, reaction, spectrum, ui];
const dict = { zh: Object.assign({}, zh, ...PACKS.map(p => p.zh)), en: Object.assign({}, en, ...PACKS.map(p => p.en)) };
const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
export const state = {
  lang: store.get('lang', 'zh'),
  /** 注音由階段決定:只有國小版顯示(中文介面),沒有開關 */
  get zhuyin() { return getLevel() === 'kid'; },
};
const listeners = new Set();
export const onLangChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export function setLang(l) { state.lang = l; store.set('lang', l); listeners.forEach(f => f()); }

/** 把純文字轉為 HTML(中文+注音開啟時加上 ruby) */
export function render(text) {
  text = String(text ?? '');
  return state.lang === 'zh' && state.zhuyin ? rubyHTML(text) : esc(text);
}
/**
 * 依階段取字:先找 'key@kid' / 'key@teen' / 'key@high'(目前語言),再找 'key'(目前語言),最後退回中文。
 * 只有需要依階段換說法的才寫 @level 版本,其餘共用同一個 key。
 */
export function raw(key, lang = state.lang, level = getLevel()) {
  return dict[lang][`${key}@${level}`] ?? dict[lang][key] ?? dict.zh[`${key}@${level}`] ?? dict.zh[key] ?? key;
}
/** UI 文字(依 key);可帶變數 {n} */
export function T(key, vars) {
  let s = raw(key);
  if (vars) for (const k in vars) s = s.split(`{${k}}`).join(vars[k]);
  return render(s);
}
/** 純文字版(給 toast 等) */
export function Tp(key, vars) {
  let s = raw(key);
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
/** 化學式的純文字版(下標用 Unicode 小數字,給放進 T()/toast 的變數用:H2O → H₂O) */
export const formulaText = f => String(f).replace(/\d/g, d => '₀₁₂₃₄₅₆₇₈₉'[d]);
