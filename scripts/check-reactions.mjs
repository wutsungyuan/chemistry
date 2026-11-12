// 檢查所有反應的原子守恆(用實際結構的原子數)。直接用 reactions.js 現成的 checkBalance。
// 圖鑑裡的晶體小塊(例如 Fe2O3 的 20 顆原子)不能拿來當反應動畫的單元,要用專用的 hidden 分子(如 Fe2O3p)。
import { REACTIONS, checkBalance } from '../src/data/reactions.js';

const bad = REACTIONS.filter(r => !checkBalance(r)).map(r => r.id);
if (bad.length) { console.error(`\n反應檢查失敗:這些反應的原子不守恆:${bad.join('、')}\n`); process.exit(1); }
console.log(`反應檢查 OK:${REACTIONS.length} 個反應都原子守恆`);
