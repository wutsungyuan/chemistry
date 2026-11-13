// 驗證元素資料(db/elements.json)與元素用途(db/element-uses.json)。
// 這裡不 import src/data/elements.js:驗證的就是它讀進去的那份原始資料,避免自己驗自己。
const isText = o => o && typeof o.zh === 'string' && o.zh.trim() && typeof o.en === 'string' && o.en.trim();
const HEX = /^#[0-9a-f]{6}$/i;

export function validateElements(E, { err }) {
  const m = E.meta || {};
  for (const k of ['source', 'note', 'retrieved']) if (!m[k]) err('elements', `meta 缺少 ${k}(必須標示資料出處與限制)`);

  const cats = E.categories || {};
  for (const [k, c] of Object.entries(cats)) {
    if (!HEX.test(c.color || '')) err('elements:cat:' + k, 'color 要是 #rrggbb');
    if (!isText(c.name) || !isText(c.desc)) err('elements:cat:' + k, 'name/desc 要有中英文');
    for (const f of ['descTeen', 'descHigh']) if (!isText(c[f])) err('elements:cat:' + k, `${f}(國中/高中版的分類說明)要有中英文`);
  }

  const list = E.elements || [], syms = new Set(), pos = new Set();
  if (list.length !== 118) err('elements', `應有 118 個元素,實際 ${list.length}`);
  list.forEach((e, i) => {
    const id = 'elements:' + (e.sym ?? '#' + (i + 1));
    if (e.z !== i + 1) err(id, `原子序要從 1 連續排到 118(第 ${i + 1} 筆是 ${e.z})`);
    if (!/^[A-Z][a-z]?$/.test(e.sym || '')) err(id, '符號格式不對');
    if (syms.has(e.sym)) err(id, '符號重複'); syms.add(e.sym);
    if (!isText(e.name)) err(id, 'name 要有中英文');
    if (!(e.mass > 0) || e.mass < e.z || e.mass > e.z * 3.1) err(id, `原子量 ${e.mass} 不合理`);
    if (!cats[e.cat]) err(id, `分類 ${e.cat} 不存在`);
    const sum = (e.shells || []).reduce((a, b) => a + b, 0);
    if (sum !== e.z) err(id, `電子殼層加起來是 ${sum},應等於原子序 ${e.z}`);
    if ((e.shells || []).length < 1 || e.shells.length > 7 || e.shells.some(n => !(n >= 0 && n <= 32))) err(id, '電子殼層數不合理');
    if (!(e.row >= 1 && e.row <= 10) || !(e.col >= 1 && e.col <= 18)) err(id, `版面位置 ${e.row},${e.col} 超出範圍`);
    const key = e.row + ',' + e.col;
    if (pos.has(key)) err(id, `版面位置 ${key} 和別的元素重疊`); pos.add(key);
    if (e.color !== undefined && !HEX.test(e.color)) err(id, 'color 要是 #rrggbb');
    if (e.radius !== undefined && !(e.radius > 0.2 && e.radius < 2)) err(id, 'radius 要在 0.2~2 之間(畫面示意大小)');
    if (e.fact !== undefined && !isText(e.fact)) err(id, 'fact 要有中英文');
    if (e.use !== undefined && !(typeof e.use.zh === 'string' && e.use.zh.trim())) err(id, 'use.zh 不能是空的');
    if (e.use !== undefined && e.fact === undefined) err(id, '有 use 就要有 fact');
  });
  // 錨點:大家都知道的值
  const by = Object.fromEntries(list.map(e => [e.sym, e]));
  if (by.O?.z !== 8 || by.O?.shells?.join() !== '2,6') err('elements', '氧應為原子序 8、電子殼層 2,6');
  if (by.Fe?.z !== 26 || by.Cu?.shells?.join() !== '2,8,18,1') err('elements', '鐵應為 26、銅的電子殼層應為 2,8,18,1(例外排列)');
}

export function validateElementUses(U, E, { err }) {
  const m = U.meta || {};
  for (const k of ['source', 'note', 'retrieved']) if (!m[k]) err('element-uses', `meta 缺少 ${k}(必須標示資料出處與限制)`);
  const syms = new Set((E.elements || []).map(e => e.sym)), seen = new Set();
  for (const u of U.uses || []) {
    const id = 'element-uses:' + u.sym;
    if (!syms.has(u.sym)) err(id, '元素符號不存在');
    if (seen.has(u.sym)) err(id, '同一個元素寫了兩次'); seen.add(u.sym);
    if (!Array.isArray(u.items) || !u.items.length) err(id, 'items 不能是空的');
    for (const it of u.items || []) if (!it.mol || !isText(it)) err(id, `每筆要有 mol 與中英文(${JSON.stringify(it)})`);
  }
}
