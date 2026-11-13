// 核種的純函式(不碰畫面):半衰期的人話、衰變後的子核、夸克組成、原子量的加權平均、一堆原子的衰變。
// 數據來自 src/data/generated/nuclides.js(IAEA LiveChart);這裡只做換算,測試會用精確值檢查。
import { makeRng } from './hydrogenOrbital.js';

export const MODES = ['B-', 'B+', 'A', 'SF', 'IT', 'P', 'N'];
export const SEC = { min: 60, h: 3600, d: 86400, y: 365.25 * 86400 };

/** 一筆核種 → 物件。row = [n, 半衰期秒(0=穩定), 豐度%, 衰變代碼, 該衰變%, 原子質量u] */
export const nuclide = (z, row) => ({ z, n: row[0], a: z + row[0], hl: row[1], stable: row[1] === 0, ab: row[2], mode: row[3], pct: row[4], mass: row[5] });

/** 衰變後的子核(質量數與電荷都守恆)。B-:n→p;B+:p→n;A:放出 He-4;P/N:放出一個質子/中子;SF 與 IT 沒有單一子核 → null */
export function daughter(z, n, mode) {
  switch (mode) {
    case 'B-': return { z: z + 1, n: n - 1 };
    case 'B+': return { z: z - 1, n: n + 1 };
    case 'A': return { z: z - 2, n: n - 2 };
    case 'P': return { z: z - 1, n };
    case 'N': return { z, n: n - 1 };
    default: return null;
  }
}

/** 夸克組成:質子 uud、中子 udd → 上夸克 u = 2Z + N,下夸克 d = Z + 2N;電荷 = (2u − d)/3 = Z */
export function quarks(z, n) {
  const u = 2 * z + n, d = z + 2 * n;
  return { u, d, total: u + d, charge: (2 * u - d) / 3 };
}

/** 原子量 = Σ(質量 × 天然豐度%) / Σ豐度%(只用有天然豐度的核種) */
export function averageMass(list) {
  let s = 0, w = 0;
  for (const x of list) if (x.ab != null && x.mass != null) { s += x.mass * x.ab; w += x.ab; }
  return w ? s / w : null;
}

/** 剩下的比例:經過 t 個半衰期後 (1/2)^t */
export const fractionLeft = t => Math.pow(0.5, t);
/** 衰變常數 λ(每秒)與平均壽命 τ(秒):λ = ln2 / T½,τ = 1/λ = T½ / ln2 */
export const lambda = hl => Math.LN2 / hl;
export const meanLife = hl => hl / Math.LN2;

/** n 顆原子各自「撐到第幾個半衰期」:t = −log₂(U)(U 是 0~1 的亂數),是指數分布。種子固定 → 每次畫面一樣,滑桿來回拉結果前後一致 */
export function decayTimes(count, seed = 7) {
  const r = makeRng(seed);
  return Array.from({ length: count }, () => -Math.log2(1 - r()));
}
export const countLeft = (times, t) => times.filter(x => x > t).length;

const fmt = (x, d = 3) => { const p = +x.toPrecision(d); return p >= 1e5 ? p.toLocaleString('en-US') : String(p); };
/** 半衰期的人話(zh / en)。穩定 → null */
export function humanHalfLife(sec, lang = 'zh') {
  if (!(sec > 0)) return null;
  const zh = lang === 'zh', y = sec / SEC.y;
  if (y >= 1e9) return zh ? `${fmt(y / 1e8, 3)} 億年` : `${fmt(y / 1e9, 3)} billion years`;
  if (y >= 1e6) return zh ? `${fmt(y / 1e4, 3)} 萬年` : `${fmt(y / 1e6, 3)} million years`;
  if (y >= 1e4 && zh) return `${fmt(y / 1e4, 3)} 萬年`;
  if (y >= 1) return zh ? `${fmt(y, 4)} 年` : `${fmt(y, 4)} years`;
  if (sec >= SEC.d) return zh ? `${fmt(sec / SEC.d, 4)} 天` : `${fmt(sec / SEC.d, 4)} days`;
  if (sec >= SEC.h) return zh ? `${fmt(sec / SEC.h, 4)} 小時` : `${fmt(sec / SEC.h, 4)} hours`;
  if (sec >= SEC.min) return zh ? `${fmt(sec / SEC.min, 4)} 分鐘` : `${fmt(sec / SEC.min, 4)} minutes`;
  if (sec >= 1) return zh ? `${fmt(sec, 4)} 秒` : `${fmt(sec, 4)} seconds`;
  if (sec >= 1e-3) return zh ? `${fmt(sec * 1e3, 3)} 毫秒` : `${fmt(sec * 1e3, 3)} milliseconds`;
  return zh ? `${fmt(sec * 1e6, 3)} 微秒` : `${fmt(sec * 1e6, 3)} microseconds`;
}

/** 國小版只列「看得到、有意義」的核種:穩定的,以及半衰期 ≥ 1 天的;一個都沒有時列半衰期最長的 3 個 */
export function listFor(level, all) {
  if (level === 'high') return all;
  const keep = level === 'teen' ? all.filter(x => x.stable || x.hl >= 1) : all.filter(x => x.stable || x.hl >= SEC.d);
  if (keep.length) return keep;
  return [...all].sort((p, q) => q.hl - p.hl).slice(0, 3).sort((p, q) => p.n - q.n);
}

/** 一個比較有代表性的(穩定的最豐富者,或沒有穩定核種時半衰期最長者),給進入頁面的預設選擇 */
export function defaultNuclide(all) {
  const st = all.filter(x => x.stable);
  if (st.length) return st.reduce((a, b) => ((b.ab ?? 0) > (a.ab ?? 0) ? b : a));
  return all.reduce((a, b) => (b.hl > a.hl ? b : a));
}

/** 知名核種的用途(zh/en 各一句,只放確定的事實) */
export const USES = {
  '1-3': { zh: '氚:氫的放射性同位素,核融合的燃料之一。', en: 'Tritium: radioactive hydrogen, one of the fuels for fusion.' },
  '1-2': { zh: '氘:重氫,水裡約有萬分之一點五的氫是它,核融合的燃料之一。', en: 'Deuterium ("heavy hydrogen"): about 0.015% of hydrogen. A fusion fuel.' },
  '6-11': { zh: '正子斷層造影(PET)掃描會用它,半衰期只有約 20 分鐘。', en: 'Used in PET scans. Half-life only about 20 minutes.' },
  '6-14': { zh: '考古學用它判斷古物年代(碳-14 定年法)。', en: 'Archaeologists use it to date old objects (radiocarbon dating).' },
  '19-40': { zh: '鉀-40:天然就有,香蕉、人體裡都有一點點。', en: 'Potassium-40: natural, found in bananas and in your body.' },
  '27-60': { zh: '鈷-60:放射治療、食品與醫材殺菌會用到。', en: 'Cobalt-60: used in radiotherapy and for sterilising food and medical tools.' },
  '53-131': { zh: '碘-131:醫院用來診斷與治療甲狀腺。', en: 'Iodine-131: used to diagnose and treat thyroid problems.' },
  '55-137': { zh: '銫-137:核分裂的產物之一,半衰期約 30 年。', en: 'Caesium-137: a fission product with a half-life of about 30 years.' },
  '88-226': { zh: '鐳-226:居禮夫人發現的元素之一。', en: 'Radium-226: one of the elements discovered by Marie Curie.' },
  '92-235': { zh: '鈾-235:核分裂發電廠的燃料。', en: 'Uranium-235: the fuel of fission power plants.' },
  '92-238': { zh: '鈾-238:天然鈾裡最多的一種,半衰期約 45 億年,和地球的年紀差不多。', en: 'Uranium-238: the most common natural uranium. Half-life ~4.5 billion years, close to the age of the Earth.' },
  '94-239': { zh: '鈈-239:人造的,核反應爐裡會產生。', en: 'Plutonium-239: man-made, produced in nuclear reactors.' },
  '95-241': { zh: '鋂-241:家用煙霧偵測器裡有極微量。', en: 'Americium-241: a tiny amount sits inside household smoke detectors.' },
};
export const useOf = (z, a) => USES[`${z}-${a}`] ?? null;
