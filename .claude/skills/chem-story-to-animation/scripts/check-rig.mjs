#!/usr/bin/env node
// 骨架逐格掃描:開一個有 window.__proto.sweep() 的動畫頁面(例如審稿頁的 HTML 檔),掃過每個實驗與中英文,
// 回報最大的關節超限次數、手離目標最遠的距離。要求:超限 0、手離目標 ≤ 0.2 單位。
// 用法:node check-rig.mjs <動畫頁面.html 或 http 網址>   (用專案的 scripts/lib/cdp.mjs 開無頭 Chrome,不需要額外套件)
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const { launchChrome } = await import(pathToFileURL(path.join(root, 'scripts/lib/cdp.mjs')).href);
const target = process.argv[2];
if (!target) { console.error('用法:node check-rig.mjs <動畫頁面.html 或網址>'); process.exit(2); }
const url = /^https?:|^file:/.test(target) ? target : pathToFileURL(path.resolve(target)).href;
const chrome = await launchChrome(); let code = 0;
try {
  const page = await chrome.newPage(); await page.viewport(800, 760, false); await page.goto(url, 3500);
  const has = await page.eval(`typeof window.__proto !== 'undefined' && typeof window.__proto.sweep === 'function'`);
  if (!has) { console.error('頁面沒有 window.__proto.sweep()(動畫沒載入,或瀏覽器沒開 WebGL)'); code = 2; }
  else {
    const res = JSON.parse(await page.eval(`JSON.stringify(window.__proto.sweep())`));
    for (const r of res) {
      const ok = r.maxViolations === 0 && r.maxReachErr <= 0.2; if (!ok) code = 1;
      console.log(`${ok ? '✔' : '✗'} 場景 ${r.scene} ${r.lang} 長 ${r.total}s  關節超限 ${r.maxViolations}${r.lastViolation ? '(' + r.lastViolation + ')' : ''}  手離目標最遠 ${r.maxReachErr}(${r.where} @ ${r.at}s)`);
    }
  }
} finally { await chrome.close(); }
process.exit(code);
