// 驗證「物質的變化」資料(src/data/db/matter.json):物質的熔點/沸點、物理/化學變化的題目。
import { BY_SYMBOL } from '../../src/data/elements.js';

const LEVELS = ['kid', 'teen', 'high'];
const isText = o => o && typeof o.zh === 'string' && o.zh.trim() && typeof o.en === 'string' && o.en.trim();

export function validateMatter(M, { err, warns }) {
  const m = M.meta || {};
  for (const k of ['source', 'note', 'retrieved']) if (!m[k]) err('matter', `meta 缺少 ${k}(必須標示資料出處與限制)`);
  if (!(M.plasmaStartC > 1000)) err('matter', 'plasmaStartC 要寫粗略的電漿起始溫度(°C)');

  const ids = new Set();
  for (const s of M.substances || []) {
    const id = 'matter:' + s.id;
    if (ids.has(s.id)) err(id, 'id 重複'); ids.add(s.id);
    if (!isText(s.name) || !isText(s.fact)) err(id, 'name/fact 要有中英文');
    const hasMelt = s.mp != null || s.bp != null, hasSub = s.sub != null;
    if (hasMelt === hasSub) err(id, '要嘛有 mp+bp(會熔化),要嘛有 sub(直接升華),不能都有或都沒有');
    if (hasMelt && !(Number.isFinite(s.mp) && Number.isFinite(s.bp) && s.mp < s.bp)) err(id, `熔點 ${s.mp} 必須低於沸點 ${s.bp}`);
    if (hasSub && !Number.isFinite(s.sub)) err(id, 'sub 不是數字');
    if (!(s.glyph?.mol || BY_SYMBOL[s.glyph?.atom])) err(id, 'glyph 要是 {mol: 分子 id} 或 {atom: 元素符號}');
    if (s.heat) for (const k of ['cpSolid', 'cpLiquid', 'cpGas', 'latentFusion', 'latentVaporization']) if (!(s.heat[k] > 0)) err(id, `heat.${k} 必須是正數`);
  }
  const water = (M.substances || []).find(s => s.id === 'water');       // 錨點:大家都知道的值
  if (!water || water.mp !== 0 || water.bp !== 100 || !water.heat) err('matter', '水的熔點應為 0、沸點 100,而且要有比熱/潛熱資料');
  if (M.substances?.length < 6) err('matter', '物質太少');

  const cids = new Set(), count = {};
  for (const c of M.changes || []) {
    const id = 'matter:' + c.id;
    if (cids.has(c.id)) err(id, 'id 重複'); cids.add(c.id);
    if (!isText(c.text) || !isText(c.why)) err(id, 'text/why 要有中英文');
    if (!['physical', 'chemical'].includes(c.answer)) err(id, `answer ${c.answer} 只能是 physical 或 chemical`);
    if (!LEVELS.includes(c.level)) err(id, `level ${c.level} 不合法`);
    (count[c.level + c.answer] = (count[c.level + c.answer] || 0) + 1);
  }
  for (const l of LEVELS) for (const a of ['physical', 'chemical']) if ((count[l + a] || 0) < 3) err('matter', `${l} 的 ${a} 題目少於 3 題`);
  warns.push(`物質變化:${M.substances.length} 種物質、${M.changes.length} 題`);
}
