// 小測驗的出題:純函式(不碰畫面),依階段(國小/國中/高中)決定題型與難度。
// 回傳 { kind, q:{key, vars?, raw?, html?, block?}, opts:[{html, ok}], answerText, brightest? },畫面由 scenes/Quiz.js 負責。
import { ELEMENTS, CATEGORIES } from '../data/elements.js';
import { GALLERY } from '../data/molecules.js';
import { L, render, formulaHTML } from '../i18n/index.js';
import { isMainGroupEl, valenceOf } from './atomfacts.js';
import { pick, shuffle } from '../ui/util.js';
import { SPECTRA } from '../data/generated/spectra.js';
import { spectrumSVG } from '../ui/spectrum.js';
import { spectrumPool, makeSpectrumQuestion } from './spectrumQuiz.js';

const COMMON = ELEMENTS.filter(e => e.fact);                  // 有「生活小知識」的常見元素(國小、國中用)
const HS = ELEMENTS.filter(e => e.z <= 54);                   // 高中:前 54 號都可以出
const SPEC_POOL = spectrumPool(SPECTRA, ELEMENTS);
const MOLS = GALLERY.filter(x => !x.display && !x.extra);

/** 價電子題只出前 54 號的主族元素(主族判斷與價電子數在 game/atomfacts.js) */
export const isMainGroup = e => e.z <= 54 && isMainGroupEl(e);
export { valenceOf };

/** 各階段的題型(重複的題型 = 出現機率較高) */
export const KINDS = {
  kid: ['sym2name', 'name2sym', 'formula', 'count', 'fact'],
  teen: ['sym2name', 'name2sym', 'formula', 'count', 'fact', 'z2sym', 'cat', 'spectrum'],
  high: ['z2sym', 'cat', 'period', 'valence', 'formula', 'count', 'spectrum', 'spectrum'],
};

function distract(pool, correct, n, key) {
  const out = new Set([key(correct)]);
  const res = [correct];
  for (const x of shuffle(pool)) { if (res.length >= n) break; if (!out.has(key(x))) { out.add(key(x)); res.push(x); } }
  return shuffle(res);
}
const numOpts = (n, min, max) => {
  const set = new Set([n]);
  for (const d of shuffle([1, -1, 2, -2, 3])) { if (set.size >= 4) break; const v = n + d; if (v >= min && v <= max) set.add(v); }
  return shuffle([...set]).map(x => ({ html: String(x), ok: x === n }));
};

export function makeQuestion(level = 'kid') {
  const kind = pick(KINDS[level] || KINDS.kid);
  const elPool = level === 'high' ? HS : COMMON;
  const molPool = level === 'kid' ? MOLS.filter(m => m.atoms.length <= 6) : MOLS;

  if (kind === 'spectrum') {                                            // 光譜偵探:看光譜指紋,猜是哪個元素
    const s = makeSpectrumQuestion(SPEC_POOL, SPECTRA);
    return {
      kind, q: { key: 'quiz.q.spectrum', block: spectrumSVG(s.lines, { mode: 'emit', width: 360, height: 70, uid: 'qz' }) },
      opts: s.options.map(o => ({ html: `${o.sym} ${render(L(o.name))}`, ok: o === s.answer })), answerText: L(s.answer.name), brightest: s.brightest,
    };
  }
  if (kind === 'sym2name') {
    const e = pick(elPool), opts = distract(elPool, e, 4, x => x.sym);
    return { kind, q: { key: 'quiz.q.sym2name', vars: { s: e.sym } }, opts: opts.map(o => ({ html: render(L(o.name)), ok: o === e })), answerText: L(e.name) };
  }
  if (kind === 'name2sym') {
    const e = pick(elPool), opts = distract(elPool, e, 4, x => x.sym);
    return { kind, q: { key: 'quiz.q.name2sym', vars: { n: L(e.name) } }, opts: opts.map(o => ({ html: o.sym, ok: o === e })), answerText: e.sym };
  }
  if (kind === 'fact') {
    const e = pick(COMMON), opts = distract(COMMON, e, 4, x => x.sym);
    return { kind, q: { raw: L(e.fact), key: 'quiz.q.fact' }, opts: opts.map(o => ({ html: `${o.sym} ${render(L(o.name))}`, ok: o === e })), answerText: L(e.name) };
  }
  if (kind === 'z2sym') {                                               // 國中、高中:用原子序找元素
    const e = pick(elPool), opts = distract(elPool, e, 4, x => x.sym);
    return { kind, q: { key: 'quiz.q.z2sym', vars: { z: e.z } }, opts: opts.map(o => ({ html: `${o.sym} ${render(L(o.name))}`, ok: o === e })), answerText: `${e.sym} ${L(e.name)}` };
  }
  if (kind === 'cat') {                                                 // 屬於哪一類(金屬、非金屬、稀有氣體…)
    const e = pick(elPool), cats = Object.keys(CATEGORIES), others = shuffle(cats.filter(c => c !== e.cat)).slice(0, 3);
    const opts = shuffle([e.cat, ...others]).map(c => ({ html: render(L(CATEGORIES[c])), ok: c === e.cat }));
    return { kind, q: { key: 'quiz.q.cat', vars: { n: L(e.name) } }, opts, answerText: L(CATEGORIES[e.cat]) };
  }
  if (kind === 'period') {                                              // 高中:電子殼層數 = 週期
    const e = pick(HS), n = e.shells.length;
    return { kind, q: { key: 'quiz.q.period', vars: { n: L(e.name) } }, opts: numOpts(n, 1, 7), answerText: String(n) };
  }
  if (kind === 'valence') {                                             // 高中:主族元素的價電子(最外層電子)數
    const e = pick(HS.filter(isMainGroup)), n = valenceOf(e);
    return { kind, q: { key: 'quiz.q.valence', vars: { n: L(e.name) } }, opts: numOpts(n, 1, 8), answerText: String(n) };
  }
  if (kind === 'formula') {
    const m = pick(molPool), opts = distract(molPool, m, 4, x => x.id);
    return { kind, q: { key: 'quiz.q.formula', vars: {}, html: formulaHTML(m.formula) }, opts: opts.map(o => ({ html: render(L(o.name)), ok: o === m })), answerText: L(m.name) };
  }
  // count
  const cm = pick(molPool.filter(x => x.atoms.length <= (level === 'kid' ? 6 : 12) && x.atoms.length >= 2));
  const syms = [...new Set(cm.atoms.map(a => a[0]))];
  const s = pick(syms), n = cm.atoms.filter(a => a[0] === s).length;
  const nums = shuffle([...new Set([n, n + 1, Math.max(1, n - 1), n + 2])]).slice(0, 4);
  if (!nums.includes(n)) nums[0] = n;
  return { kind, q: { key: 'quiz.q.count', vars: { m: L(cm.name), s } }, opts: shuffle(nums).map(x => ({ html: String(x), ok: x === n })), answerText: String(n) };
}
