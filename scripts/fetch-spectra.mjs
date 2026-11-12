// 從 NIST 原子光譜資料庫(ASD)取得每個元素(中性原子)的可見光譜線,精簡後寫入 src/data/db/spectra.json。
// 只在「更新光譜資料」時手動執行(需要網路),不屬於 npm run build / dev:
//     node scripts/fetch-spectra.mjs [快取資料夾]
// 原始回應會存在快取資料夾(預設:系統暫存區的 asd-cache),下次執行直接用快取,不會重複打擾 NIST 的伺服器。
// 專案只收錄「每個元素最強的約 40 條線」的衍生資料並標示出處,不收錄 NIST 的原始資料。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ELEMENTS } from '../src/data/elements.js';
import { parseAsd, deriveSpectrum, calibrateTemperature, VISIBLE } from './lib/asd.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'asd-cache'));
fs.mkdirSync(cache, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const URL_OF = sym => `https://physics.nist.gov/cgi-bin/ASD/lines1.pl?spectra=${sym}+I&limits_type=0&low_w=${VISIBLE[0]}&upp_w=${VISIBLE[1]}&unit=1&submit=Retrieve+Data&de=0&format=3&line_out=0&en_unit=0&output=0&bibrefs=1&page_size=15&show_obs_wl=1&show_calc_wl=1&unc_out=1&order_out=0&max_low_enrg=&show_av=2&max_upp_enrg=&tsb_value=0&min_str=&A_out=0&intens_out=on&max_str=&allowed_out=1&forbid_out=1&min_accur=&min_intens=&conf_out=on&term_out=on&enrg_out=on&J_out=on`;

const raw = {};
let fetched = 0;
for (const { sym } of ELEMENTS) {
  const f = path.join(cache, sym + '.tsv');
  if (!fs.existsSync(f)) {
    const res = await fetch(URL_OF(sym), { signal: AbortSignal.timeout(60000) });
    if (!res.ok) throw new Error(`${sym}: HTTP ${res.status}`);
    fs.writeFileSync(f, await res.text()); fetched++;
    await sleep(500);                                           // 禮貌:每次請求之間停半秒
  }
  raw[sym] = parseAsd(fs.readFileSync(f, 'utf8'));              // 沒有資料的元素(NIST 回「No lines」)會是 null
}
const cal = calibrateTemperature(raw);
const elements = {};
for (const { sym } of ELEMENTS) {
  const d = deriveSpectrum(raw[sym], { T: cal.T, labelMode: sym === 'H' ? 'n' : 'nl' });
  elements[sym] = d.lines.length ? d : { lines: [] };
}
const withLines = Object.values(elements).filter(e => e.lines.length).length;
const out = {
  meta: {
    source: 'NIST Atomic Spectra Database (ASD) v5.12 — Kramida, Ralchenko, Reader & NIST ASD Team',
    url: 'https://physics.nist.gov/asd', doi: '10.18434/T4W30F', retrieved: new Date().toISOString().slice(0, 10),
    note: '中性原子在空氣中的可見光(380–780 nm)譜線;每個元素只保留最強的約 40 條(相對強度 0~1)。沒有實測強度的元素,強度由 g·A·exp(−E/kT)/λ 估算(estimated=true)。',
    wavelengthRange: VISIBLE, temperatureK: cal.T, calibration: { medianSpearman: cal.medianRho, elements: cal.n, table: cal.table },
  },
  elements,
};
const file = path.join(root, 'src/data/db/spectra.json');
fs.writeFileSync(file, JSON.stringify(out));
console.log(`完成:新抓 ${fetched} 個元素;${withLines}/${ELEMENTS.length} 個元素有可見光譜線;校準溫度 ${cal.T} K(ρ=${cal.medianRho},${cal.n} 個元素);檔案 ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
