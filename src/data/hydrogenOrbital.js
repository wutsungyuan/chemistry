// 氫原子的電子雲(軌域):氫只有一顆電子,薛丁格方程式有精確解(解析解),所以這裡的形狀是「真的」,不是示意。
// 單位:長度用波耳半徑 a0(≈ 0.0529 nm),能量用 eV。多電子原子沒有精確解,所以只做氫。
//
// 波函數 ψ(r,θ,φ) = R_nl(r) · Y_lm(θ,φ)。這裡用「實數形式」的角度部分(m = 0),
// 例如 2p 就是朝上下(z 軸)的那一朵啞鈴;p 有三種方向、d 有五種形狀,這裡各畫其中一種。
// 機率密度 = ψ²:在某處「看到」電子的機會。

const PI = Math.PI;

/** 徑向函數 R_nl(r)(r 以 a0 為單位),已歸一化:∫ R² r² dr = 1 */
const RADIAL = {
  '1s': r => 2 * Math.exp(-r),
  '2s': r => (1 / (2 * Math.SQRT2)) * (2 - r) * Math.exp(-r / 2),
  '2p': r => (1 / (2 * Math.sqrt(6))) * r * Math.exp(-r / 2),
  '3d': r => (4 / (81 * Math.sqrt(30))) * r * r * Math.exp(-r / 3),
};

/** 角度函數(實數,m = 0),已歸一化:∫ Y² dΩ = 1。c = cosθ */
const ANGULAR = {
  s: () => 1 / Math.sqrt(4 * PI),
  p: c => Math.sqrt(3 / (4 * PI)) * c,
  d: c => Math.sqrt(5 / (16 * PI)) * (3 * c * c - 1),
};

/** 可以畫的狀態。E = −13.6/n² eV;nodesR = 徑向節點(電子「絕不出現」的球面)半徑(a0) */
export const STATES = {
  '1s': { id: '1s', n: 1, l: 0, m: 0, shape: 's', E: -13.6057, nodesR: [] },
  '2s': { id: '2s', n: 2, l: 0, m: 0, shape: 's', E: -3.4014, nodesR: [2] },
  '2p': { id: '2p', n: 2, l: 1, m: 0, shape: 'p', E: -3.4014, nodesR: [] },
  '3d': { id: '3d', n: 3, l: 2, m: 0, shape: 'd', E: -1.5117, nodesR: [] },
};
export const STATE_IDS = Object.keys(STATES);

/** 氫能階 E_n = −13.6057/n² eV(沒有精細結構) */
export const levelEV = n => -13.605693 / (n * n);

/** ψ(r,θ,φ) 在球座標 (r, cosθ) 的值(m = 0 時與 φ 無關) */
export function psiAt(id, r, cosT) {
  const s = STATES[id];
  return RADIAL[id](r) * ANGULAR[s.shape](cosT);
}
/** ψ 在直角座標 (x,y,z)(a0)的值 */
export function psiXYZ(id, x, y, z) {
  const r = Math.sqrt(x * x + y * y + z * z);
  return r === 0 ? psiAt(id, 0, 1) : psiAt(id, r, z / r);
}

/** 徑向機率密度 P(r) = r² R² (每單位 a0 找到電子在距離 r 的機率);∫P dr = 1 */
export const radialProb = (id, r) => r * r * RADIAL[id](r) ** 2;

/** 解析的平均半徑 <r> = (3n² − l(l+1)) / 2  (a0) */
export const meanRadius = id => { const { n, l } = STATES[id]; return (3 * n * n - l * (l + 1)) / 2; };

/** 數值積分(梯形),供取樣與測試用 */
export function integrate(f, a, b, steps = 4000) {
  const h = (b - a) / steps; let s = 0.5 * (f(a) + f(b));
  for (let i = 1; i < steps; i++) s += f(a + i * h);
  return s * h;
}

/** 這個狀態的雲「夠大」的半徑(包含 99.9% 機率的半徑上限,a0) */
export function cloudRadius(id) { return { '1s': 12, '2s': 32, '2p': 30, '3d': 52 }[id]; }

/** 建立「由機率反推位置」的查表(累積分布) */
function cdfTable(f, a, b, steps) {
  const xs = new Float64Array(steps + 1), cdf = new Float64Array(steps + 1), h = (b - a) / steps;
  let acc = 0; xs[0] = a; cdf[0] = 0;
  for (let i = 1; i <= steps; i++) { xs[i] = a + i * h; acc += 0.5 * (f(xs[i - 1]) + f(xs[i])) * h; cdf[i] = acc; }
  for (let i = 0; i <= steps; i++) cdf[i] /= acc;
  return { xs, cdf };
}
function invert({ xs, cdf }, u) {
  let lo = 0, hi = cdf.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cdf[mid] < u) lo = mid; else hi = mid; }
  const span = cdf[hi] - cdf[lo] || 1;
  return xs[lo] + ((u - cdf[lo]) / span) * (xs[hi] - xs[lo]);
}

const tableCache = {};
function tables(id) {
  return tableCache[id] ??= {
    rad: cdfTable(r => radialProb(id, r), 0, cloudRadius(id), 6000),
    cos: cdfTable(c => ANGULAR[STATES[id].shape](c) ** 2, -1, 1, 4000),            // cosθ 的分布:|Y|² dcosθ(φ 均勻)
  };
}

/** 簡單、可重現的亂數(測試要可重現;mulberry32) */
export function makeRng(seed = 1) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * 依 ψ² 取樣 N 個「看到電子的位置」。不是拒絕取樣的近似,而是依分布精確反推:
 * 距離 r 依徑向機率、cosθ 依角度機率、φ 均勻。傳回 { pos: Float32Array(3N)(a0), sign: Int8Array(N)(ψ 的正負) }。
 */
export function sampleCloud(id, N, rng = Math.random) {
  const t = tables(id), pos = new Float32Array(N * 3), sign = new Int8Array(N);
  for (let i = 0; i < N; i++) {
    const r = invert(t.rad, rng()), c = invert(t.cos, rng()), ph = rng() * 2 * PI, s = Math.sqrt(Math.max(0, 1 - c * c));
    pos[3 * i] = r * s * Math.cos(ph); pos[3 * i + 1] = r * s * Math.sin(ph); pos[3 * i + 2] = r * c;
    sign[i] = psiAt(id, r, c) >= 0 ? 1 : -1;
  }
  return { pos, sign };
}

/** 光譜連結:兩個能階之間的光子波長(nm,真空);3→2 約 656.1 nm,和 NIST 空氣中的 656.3 nm 差在空氣折射率 */
export const photonNm = (nHi, nLo) => 1239.84198 / (levelEV(nHi) - levelEV(nLo));
