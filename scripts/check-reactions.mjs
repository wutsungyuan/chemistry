// 驗證反應資料(db/reactions.json):欄位、分子 id、原子守恆。
// 要等 build-db 產生分子資料之後才能跑(需要實際結構的原子數),所以是 build-db 之後的第二步。
import fs from 'node:fs';
import { MOL } from '../src/data/molecules.js';
import { validateReactions } from './lib/validate-reactions.mjs';

const R = JSON.parse(fs.readFileSync(new URL('../src/data/db/reactions.json', import.meta.url), 'utf8'));
const errors = [];
validateReactions(R, MOL, { err: (id, msg) => errors.push(`✗ ${id}: ${msg}`) });
if (errors.length) { console.error(`\n反應資料驗證失敗(${errors.length} 項):\n` + errors.join('\n') + '\n'); process.exit(1); }
console.log(`反應檢查 OK:${R.reactions.length} 個反應,欄位齊全且原子守恆`);
