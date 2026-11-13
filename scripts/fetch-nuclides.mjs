// 從 IAEA 核資料組(Nuclear Data Section)的 LiveChart 取得所有核種「基態」的半衰期、衰變方式與天然豐度,
// 精簡後寫入 src/data/db/nuclides.json。只在「更新核種資料」時手動執行(需要網路),不屬於 npm run build / dev:
//     node scripts/fetch-nuclides.mjs [快取檔案]
// 原始回應會存成快取檔(預設:系統暫存區的 iaea-ground-states.csv),下次直接用快取。
// 專案只收錄衍生欄位(中子數、半衰期、衰變方式、天然豐度、原子質量)並標示出處,不收錄整份原始資料。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ELEMENTS } from '../src/data/elements.js';
import { parseCsv, deriveNuclides } from './lib/nuclides.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'iaea-ground-states.csv'));
const URL = 'https://nds.iaea.org/relnsd/v1/data?fields=ground_states&nuclides=all';
if (!fs.existsSync(cache)) {
  const res = await fetch(URL, { signal: AbortSignal.timeout(120000), headers: { 'User-Agent': 'chemistry-playground-data-build' } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  fs.writeFileSync(cache, await res.text());
}
const rows = parseCsv(fs.readFileSync(cache, 'utf8'));
const { byZ, extraction } = deriveNuclides(rows, ELEMENTS.map(e => e.z));
const out = {
  meta: {
    source: 'IAEA Nuclear Data Section, LiveChart of Nuclides (ENSDF / NUBASE evaluated ground-state data)',
    url: 'https://nds.iaea.org/relnsd/vcharthtml/VChartHTML.html',
    retrieved: new Date().toISOString().slice(0, 10),
    extraction,
    note: '只收錄每個核種的中子數、半衰期(秒;0 = 穩定)、主要衰變方式、天然豐度(%)、原子質量(u);半衰期短於 1 微秒的共振態不收錄。',
  },
  nuclides: byZ,
};
fs.writeFileSync(path.join(root, 'src/data/db/nuclides.json'), JSON.stringify(out));
const count = Object.values(byZ).reduce((a, l) => a + l.length, 0);
console.log(`已寫入 src/data/db/nuclides.json:${Object.keys(byZ).length} 個元素、${count} 個核種(資料日期 ${extraction})`);
