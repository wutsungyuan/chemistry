// 「光譜偵探」出題邏輯(純函式,方便測試):給一個光譜指紋,從 4 個元素中選出是誰。
// 題庫只用「小朋友學過的元素」(有 fact 的詳細介紹)且譜線夠多的元素。
// 為了讓題目公平,同一題的選項彼此的光譜不能太像(例如鐵、鎳、銅的條碼都密密麻麻,肉眼分不出來)。
import { pick, shuffle } from '../ui/util.js';
import { display, RANGE } from '../ui/spectrum.js';

export const MIN_LINES = 6;
export const MAX_SIMILARITY = 0.45;          // 選項彼此的光譜相似度上限(36 個題庫元素裡,約最像的 25% 以上會被分開)
const BIN = 10, NBINS = Math.ceil((RANGE[1] - RANGE[0]) / BIN);

/** 把譜線放進 10 nm 一格的向量(每格取最亮的線,用顯示亮度),用來比較兩個光譜「看起來」像不像 */
export function binVector(lines) {
  const v = Array(NBINS).fill(0);
  for (const [wl, I] of lines) { const b = Math.min(NBINS - 1, Math.floor((wl - RANGE[0]) / BIN)); v[b] = Math.max(v[b], display(I)); }
  return v;
}

/** 兩個光譜的相似度(餘弦相似度,0~1):線的位置與亮度越像越接近 1 */
export function similarity(linesA, linesB) {
  const a = binVector(linesA), b = binVector(linesB);
  let d = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? d / Math.sqrt(na * nb) : 0;
}

/** 可以出成題目的元素:有詳細介紹、且光譜至少 MIN_LINES 條線 */
export const spectrumPool = (spectra, elements) => elements.filter(e => e.fact && (spectra[e.sym]?.lines.length ?? 0) >= MIN_LINES);

/**
 * 出一題。回傳 {answer, options, lines, brightest}:
 *   answer = 正確元素;options = 洗牌後的 nOpts 個元素(含正確答案、不重複);lines = 該元素的譜線;brightest = 最亮那條線的波長
 * 干擾選項:優先挑「和答案、和彼此都不太像」的;湊不滿才放寬(挑相似度最低的補上)。rng 可注入(測試用固定亂數)
 */
export function makeSpectrumQuestion(pool, spectra, rng = Math.random, nOpts = 4) {
  if (pool.length < nOpts) throw new Error('題庫元素不夠');
  const answer = pick(pool, rng), lines = spectra[answer.sym].lines;
  const chosen = [answer], rest = shuffle(pool.filter(e => e.sym !== answer.sym), rng);
  for (const e of rest) {
    if (chosen.length >= nOpts) break;
    if (chosen.every(c => similarity(spectra[c.sym].lines, spectra[e.sym].lines) < MAX_SIMILARITY)) chosen.push(e);
  }
  if (chosen.length < nOpts) {                                           // 放寬:用「和已選的最不像」的補滿
    const left = rest.filter(e => !chosen.includes(e)).map(e => [Math.max(...chosen.map(c => similarity(spectra[c.sym].lines, spectra[e.sym].lines))), e]).sort((a, b) => a[0] - b[0]);
    for (const [, e] of left) { if (chosen.length >= nOpts) break; chosen.push(e); }
  }
  const brightest = lines.reduce((b, l) => (l[1] > b[1] ? l : b), lines[0])[0];
  return { answer, options: shuffle(chosen, rng), lines, brightest };
}
