// 解析 IAEA LiveChart 的「基態」CSV,轉成精簡的核種資料。純函式,測試也會用。

/** 簡單的 CSV 解析(欄位沒有引號與逗號時足夠;有引號時照 RFC 4180 處理) */
export function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur.replace(/\r$/, '')); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const head = rows.shift();
  return rows.filter(r => r.length === head.length).map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

/** 主要衰變方式的代碼(IAEA 的寫法)→ 這個 app 用的代碼 */
export const DECAY = { 'B-': 'B-', 'EC+B+': 'B+', 'B+': 'B+', 'EC': 'B+', 'A': 'A', 'SF': 'SF', 'IT': 'IT', 'P': 'P', 'N': 'N', '2P': 'P', '2N': 'N', 'B-N': 'B-', 'B-A': 'B-', 'B+P': 'B+', 'ECP': 'B+', '2B-': 'B-', '2B+': 'B+', '2EC': 'B+', 'ECSF': 'B+', 'B-2N': 'B-' };
export const MIN_HALF_LIFE = 1e-6;     // 秒;更短的多半是「連原子核都稱不上」的共振態

/** → { [z]: [[n, 半衰期秒(0=穩定), 天然豐度%|null, 衰變代碼|'', 該衰變的%|null, 原子質量u|null], ...] }(依 n 排序) */
export function deriveNuclides(rows, zs) {
  const want = new Set(zs), byZ = {};
  let extraction = '';
  for (const r of rows) {
    const z = +r.z, n = +r.n;
    if (!want.has(z) || !Number.isFinite(n)) continue;
    extraction = extraction || r.Extraction_date || '';
    const stable = r.half_life === 'STABLE';
    const hl = stable ? 0 : parseFloat(r.half_life_sec);
    if (!stable && !(hl >= MIN_HALF_LIFE)) continue;
    const ab = r.abundance !== '' && r.abundance != null ? +r.abundance : null;
    const d1 = stable ? '' : (DECAY[r.decay_1] ?? '');
    const pct = !stable && r['decay_1_%'] !== '' && r['decay_1_%'] != null && Number.isFinite(+r['decay_1_%']) ? +r['decay_1_%'] : null;
    const mass = r.atomic_mass !== '' && Number.isFinite(+r.atomic_mass) ? Math.round(+r.atomic_mass) / 1e6 : null;
    (byZ[z] ||= []).push([n, stable ? 0 : +hl.toPrecision(6), Number.isFinite(ab) ? ab : null, d1, pct, mass]);
  }
  for (const l of Object.values(byZ)) l.sort((a, b) => a[0] - b[0]);
  return { byZ, extraction };
}
