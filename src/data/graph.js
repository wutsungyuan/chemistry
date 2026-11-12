// 分子「圖」的小工具(實驗室比對與資料驗證共用)

/** 化學式正規化:{H:2, O:1} */
export function composition(syms) {
  const c = {}; syms.forEach(s => { c[s] = (c[s] || 0) + 1; }); return c;
}

/** 以「骨架」(鄰居種類)做簽章,忽略鍵級 */
export function skeletonSignature(syms, bonds) {
  const nb = syms.map(() => []);
  bonds.forEach(([i, j]) => { nb[i].push(syms[j]); nb[j].push(syms[i]); });
  return syms.map((s, i) => `${s}:${nb[i].sort().join('')}`).sort().join('|');
}
