// 三體 8 字形軌道(Chenciner–Montgomery 2000):三顆等質量的星球沿同一條「8」字形軌道互相追逐,是三體問題裡真正穩定、會永遠重複的解。
// 入口頁的三顆星球就照這個真實的解在動(不是隨便編的路線)。純函式、沒有畫面相依,有單元測試。
// 單位:G = 1、每顆質量 = 1;一圈的週期 T0 ≈ 6.32591398。
export const T0 = 6.32591398;
const P = [[-0.97000436, 0.24308753], [0.97000436, -0.24308753], [0, 0]];
const V = [[0.466203685, 0.43236573], [0.466203685, 0.43236573], [-0.93240737, -0.86473146]];

export function createFigureEight() {
  const p = P.map(a => a.slice()), v = V.map(a => a.slice());
  const acc = () => p.map((pi, i) => {
    let ax = 0, ay = 0;
    p.forEach((pj, j) => { if (i === j) return; const dx = pj[0] - pi[0], dy = pj[1] - pi[1], r2 = dx * dx + dy * dy, r3 = r2 * Math.sqrt(r2); ax += dx / r3; ay += dy / r3; });
    return [ax, ay];
  });
  let a = acc();
  /** 往前走 dt(模擬時間);用蛙跳法(leapfrog,保能量)分成小步 */
  function step(dt) {
    const n = Math.max(1, Math.ceil(Math.abs(dt) / 0.002)), h = dt / n;
    for (let k = 0; k < n; k++) {
      for (let i = 0; i < 3; i++) { v[i][0] += a[i][0] * h / 2; v[i][1] += a[i][1] * h / 2; p[i][0] += v[i][0] * h; p[i][1] += v[i][1] * h; }
      a = acc();
      for (let i = 0; i < 3; i++) { v[i][0] += a[i][0] * h / 2; v[i][1] += a[i][1] * h / 2; }
    }
  }
  const energy = () => {
    let e = 0;
    for (let i = 0; i < 3; i++) { e += 0.5 * (v[i][0] ** 2 + v[i][1] ** 2); for (let j = i + 1; j < 3; j++) e -= 1 / Math.hypot(p[i][0] - p[j][0], p[i][1] - p[j][1]); }
    return e;
  };
  const minSeparation = () => { let m = Infinity; for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) m = Math.min(m, Math.hypot(p[i][0] - p[j][0], p[i][1] - p[j][1])); return m; };
  return { pos: i => p[i], step, energy, minSeparation };
}
