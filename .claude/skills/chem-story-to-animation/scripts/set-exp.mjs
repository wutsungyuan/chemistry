#!/usr/bin/env node
// 把一份實驗腳本(單一實驗的 JSON)寫進 src/data/db/experiments.json 的指定 key(取代原本那一筆)。
// 用法:node set-exp.mjs <key> <fragment.json>
// 一次讀、一次寫(幾毫秒),多個人同時用也不容易互相覆蓋;寫完會印出該 key 的步驟數。之後請用 check-sync.mjs 檢查。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const [key, frag] = process.argv.slice(2);
if (!key || !frag) { console.error('用法:node set-exp.mjs <key> <fragment.json>'); process.exit(2); }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const file = path.join(root, 'src/data/db/experiments.json');
const E = JSON.parse(fs.readFileSync(frag, 'utf8'));
const X = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!X.experiments[key]) { console.error(`experiments.json 沒有 key「${key}」(新增 key 要請主程式處理 registry)`); process.exit(1); }
X.experiments[key] = E;
fs.writeFileSync(file, JSON.stringify(X, null, 2) + '\n');
console.log(`已更新 ${key}:${E.steps.length} 步`);
