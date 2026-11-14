#!/usr/bin/env node
// 接觸表:在無頭 Chrome 裡每隔幾秒截一張畫面,存成 PNG 並產生一個 index.html,方便人工逐格檢查
// (手有沒有蓋到臉、東西有沒有穿模或出畫面、字幕有沒有被截斷)。
// 用法:node contact-sheet.mjs <動畫頁面.html> [--scene 0] [--lang zh] [--step 1.5] [--out <資料夾>]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const target = args.find(a => !a.startsWith('--') && !['--scene', '--lang', '--step', '--out'].some(f => args[args.indexOf(f) + 1] === a));
if (!target) { console.error('用法:node contact-sheet.mjs <動畫頁面.html> [--scene 0] [--lang zh] [--step 1.5] [--out <資料夾>]'); process.exit(2); }
const scene = +opt('scene', 0), lang = opt('lang', 'zh'), step = +opt('step', 1.5);
const out = opt('out', fs.mkdtempSync(path.join(os.tmpdir(), 'contact-')));
fs.mkdirSync(out, { recursive: true });
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const { launchChrome } = await import(pathToFileURL(path.join(root, 'scripts/lib/cdp.mjs')).href);
const url = /^https?:|^file:/.test(target) ? target : pathToFileURL(path.resolve(target)).href;
const chrome = await launchChrome(); const shots = [];
try {
  const page = await chrome.newPage(); await page.viewport(800, 760, false); await page.goto(url, 3500);
  await page.eval(`(document.querySelector('#proto').scrollIntoView({block:'start'}), 0)`);
  await page.eval(`(window.__proto.seek(0, ${scene}, '${lang}'), 0)`);
  const total = +(await page.eval(`window.__proto.total()`));
  for (let t = 0.3; t < total; t += step) {
    await page.eval(`(window.__proto.seek(${t}, ${scene}, '${lang}'), 0)`); await page.sleep(450);
    const f = `s${scene}-${lang}-${String(Math.round(t * 10)).padStart(4, '0')}.png`; await page.screenshot(path.join(out, f)); shots.push([t, f]);
  }
} finally { await chrome.close(); }
fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><meta charset="utf-8"><title>接觸表</title><style>body{font:14px system-ui;background:#111;color:#eee}div{display:inline-block;margin:6px;width:380px}img{width:100%}</style>` + shots.map(([t, f]) => `<div><img src="${f}"><br>${t.toFixed(1)} s</div>`).join(''));
console.log(`已輸出 ${shots.length} 張到 ${out}(打開 index.html 逐格檢查)`);
