#!/usr/bin/env node
// 在「真的 App」裡播放某一則故事的實驗動畫,並在指定的時間截圖(給你自己檢查畫面用)。需要開發伺服器已經在 http://127.0.0.1:5174(npm run dev)。
// 用法:node app-shot.mjs --story iron --lang zh --times 1,4,8 --viewport 390x780m --out <資料夾> [--sweep] [--base http://127.0.0.1:5174/]
//   --viewport WxH 後面加 m 表示手機模擬(例如 390x780m);沒有 m 是桌機(例如 1280x800)
//   --quality 2  固定畫質等級(預設會自動降級,軟體渲染的截圖環境會被降成 0)
//   --sweep      另外跑骨架逐格掃描(關節超限、手離目標)
// 印出:卡片與 3D 畫面是否存在、繪製呼叫與三角形數、主控台錯誤。截圖存成 <out>/<story>-<lang>-<時間>.png。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const story = opt('story'), lang = opt('lang', 'zh'), base = opt('base', 'http://127.0.0.1:5174/');
const times = String(opt('times', '1,5,9')).split(',').map(Number);
const vp = String(opt('viewport', '390x780m')), m = vp.match(/^(\d+)x(\d+)(m?)$/);
if (!story || !m) { console.error('用法:node app-shot.mjs --story <故事id> [--lang zh|en] [--times 1,5,9] [--viewport 390x780m] [--out 資料夾] [--sweep]'); process.exit(2); }
const out = opt('out', fs.mkdtempSync(path.join(os.tmpdir(), 'appshot-'))); fs.mkdirSync(out, { recursive: true });
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const { launchChrome } = await import(pathToFileURL(path.join(root, 'scripts/lib/cdp.mjs')).href);
const chrome = await launchChrome(); let code = 0;
try {
  const page = await chrome.newPage(); await page.viewport(+m[1], +m[2], !!m[3]);
  await page.goto(base + 'landing.html?change=1', 300);
  await page.eval(`localStorage.clear(); localStorage.setItem('level','kid'); localStorage.setItem('lang','${lang}'); 0`);
  const q = opt('quality');                                    // --quality 0|1|2:固定畫質等級(不讓自動降級影響截圖);軟體渲染下建議用 2
  await page.goto(base + 'index.html' + (q != null ? '?animq=' + q : '') + '#stories/' + story, 1500);
  const has = await page.eval(`!!document.querySelector('.anim-card .anim-poster')`);
  console.log('動畫卡片:', has); if (!has) { code = 1; throw new Error('這則故事沒有動畫卡片(experiments.json 沒有這則故事,或這個瀏覽器沒有 WebGL)'); }
  await page.eval(`(document.querySelector('.anim-poster').click(), 0)`); await page.sleep(2500);
  console.log('3D 畫面:', await page.eval(`!!document.querySelector('.anim-stage canvas')`));
  await page.eval(`(document.querySelector('.anim-card').scrollIntoView({block:'center'}), 0)`);
  for (const t of times) {
    await page.eval(`(document.querySelector('.anim-stage canvas').__api.seekTime(${t}), 0)`); await page.sleep(700);
    const f = path.join(out, `${story}-${lang}-${String(Math.round(t * 10)).padStart(4, '0')}.png`); await page.screenshot(f); console.log('截圖', f);
  }
  console.log('總長(秒):', await page.eval(`document.querySelector('.anim-stage canvas').__api.total()`));
  console.log('畫質等級(2 全開 / 1 / 0 最省):', await page.eval(`document.querySelector('.anim-stage canvas').__api.quality()`));
  console.log('效能:', await page.eval(`JSON.stringify(document.querySelector('.anim-stage canvas').__api.info())`));
  if (args.includes('--sweep')) console.log('逐格掃描:', await page.eval(`JSON.stringify(document.querySelector('.anim-stage canvas').__api.sweep())`));
  const errs = (await page.errors?.splice?.(0)) || []; console.log('主控台錯誤:', JSON.stringify(errs)); if (errs.length) code = 1;
} catch (e) { console.error(String(e.message || e)); code = code || 1; } finally { await chrome.close(); }
process.exit(code);
