import { pinyin } from 'pinyin-pro';
import { escapeHtml as esc } from '../ui/util.js';

const INIT = { b:'ㄅ',p:'ㄆ',m:'ㄇ',f:'ㄈ',d:'ㄉ',t:'ㄊ',n:'ㄋ',l:'ㄌ',g:'ㄍ',k:'ㄎ',h:'ㄏ',j:'ㄐ',q:'ㄑ',x:'ㄒ',zh:'ㄓ',ch:'ㄔ',sh:'ㄕ',r:'ㄖ',z:'ㄗ',c:'ㄘ',s:'ㄙ' };
const FIN = { a:'ㄚ',o:'ㄛ',e:'ㄜ',ai:'ㄞ',ei:'ㄟ',ao:'ㄠ',ou:'ㄡ',an:'ㄢ',en:'ㄣ',ang:'ㄤ',eng:'ㄥ',er:'ㄦ',
  i:'ㄧ',ia:'ㄧㄚ',ie:'ㄧㄝ',iao:'ㄧㄠ',iu:'ㄧㄡ',ian:'ㄧㄢ',in:'ㄧㄣ',iang:'ㄧㄤ',ing:'ㄧㄥ',
  u:'ㄨ',ua:'ㄨㄚ',uo:'ㄨㄛ',uai:'ㄨㄞ',ui:'ㄨㄟ',uan:'ㄨㄢ',un:'ㄨㄣ',uang:'ㄨㄤ',ong:'ㄨㄥ',
  v:'ㄩ',ve:'ㄩㄝ',van:'ㄩㄢ',vn:'ㄩㄣ',iong:'ㄩㄥ' };
const TONE = { 1:'', 2:'ˊ', 3:'ˇ', 4:'ˋ', 5:'' };

export function toZhuyin(py) {
  const m = /^([a-züv]+)([1-5])?$/i.exec(py.replace(/ü/g, 'v'));
  if (!m) return '';
  let s = m[1].toLowerCase(); const tone = m[2] || '5';
  let ini = '';
  // y / w -> 還原成韻母
  if (s[0] === 'y') {
    const r = s.slice(1);
    if (r.startsWith('u')) s = 'v' + r.slice(1);       // yu yue yuan yun
    else if (r === 'i' || r.startsWith('in') ) s = r.startsWith('i') ? r : 'i' + r; // yi yin ying
    else s = 'i' + r;                                   // ya ye yao you yan yang yong
    if (s === 'iong') s = 'iong';
    if (s === 'iou') s = 'iu';
  } else if (s[0] === 'w') {
    const r = s.slice(1);
    s = r === 'u' ? 'u' : 'u' + r;                      // wu wa wo wai wei wan wen wang weng
    if (s === 'uei') s = 'ui';
    if (s === 'ueng') s = 'ong';
    if (s === 'uen') s = 'un';
  } else {
    const two = s.slice(0, 2);
    if (INIT[two]) { ini = two; s = s.slice(2); }
    else if (INIT[s[0]]) { ini = s[0]; s = s.slice(1); }
    if ('jqx'.includes(ini)) { if (s[0] === 'u') s = 'v' + s.slice(1); }
    if (['zh','ch','sh','r','z','c','s'].includes(ini) && s === 'i') s = '';
    if (ini && s === 'ue') s = 've';
    if (s === 'ue') s = 've';
    if (s === 'v' && 'nl'.includes(ini)) s = 'v';
    if (s === 'e' && !ini) s = 'e';
  }
  if (s === 've' || s === 'ie' ) { /* ㄝ 韻 */ }
  const fin = s === '' ? '' : (FIN[s] ?? '');
  const base = (INIT[ini] || '') + fin;
  return tone === '5' ? '˙' + base : base + TONE[tone];
}

const cache = new Map();
const isHan = c => /[一-鿿]/.test(c);
// 超重元素的罕用字不在 pinyin-pro 的字典裡(也不在基本漢字區):𨧀、𨭎、𨨏、𨭆、䥑(第 105~109 號),手動補上注音,才不會在國小版漏字
const RARE = { '𨧀': 'ㄉㄨˋ', '𨭎': 'ㄒㄧˇ', '𨨏': 'ㄅㄛ', '𨭆': 'ㄏㄟ', '䥑': 'ㄇㄞˋ' };

// 注音直式顯示在字的右側:聲調符號在最右側中間,輕聲點在注音上方
function zyHTML(c, z) {
  const neutral = z.startsWith('˙');
  const tone = /[ˊˇˋ]$/.test(z) ? z.slice(-1) : '';
  const syms = z.replace(/^˙/, '').replace(/[ˊˇˋ]$/, '');
  return `<span class="zy"><span class="zh">${c}</span><span class="zp"><span class="zs">${neutral ? '˙' : ''}${syms}</span>${tone ? `<span class="zt">${tone}</span>` : ''}</span></span>`;
}

// 注音模式下標點改全形:字寬與注音欄位一致,不會和下一個字黏在一起
const FULL = { ',': '，', '.': '。', '!': '！', '?': '？', ':': '：', ';': '；', '(': '（', ')': '）' };

export function rubyHTML(text) {
  if (cache.has(text)) return cache.get(text);
  const chars = [...text];
  let py;
  try { py = pinyin(text, { type: 'array', toneType: 'num', v: true }); } catch { py = []; }
  let out = '';
  chars.forEach((c, i) => {
    if (RARE[c]) out += zyHTML(c, RARE[c]);
    else if (isHan(c) && py[i]) out += zyHTML(c, toZhuyin(py[i]));
    else out += esc(FULL[c] && !(c === '.' && /\d/.test(chars[i - 1] || '') && /\d/.test(chars[i + 1] || '')) && /[一-鿿，。！？：；、（）「」]/.test(text) ? FULL[c] : c);
  });
  cache.set(text, out);
  return out;
}
