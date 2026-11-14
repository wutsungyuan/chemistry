// 端到端(E2E)測試:用真的 Chrome 開「正式建置」的網站,走過各種使用情境並檢查畫面。
//   npm run e2e               完整:3 個階段 × 2 種語言 × 手機/桌機 × 11 個頁面 + 互動流程(約 4~5 分鐘)
//   npm run e2e -- --quick    快速:較少頁面(約 1~2 分鐘)
//   npm run e2e -- --no-build 不重新建置(沿用現有的 dist/)
//   npm run e2e -- --shots    每個組合存一張截圖到 e2e-out/(人工檢查版面用;資料夾已加入 .gitignore)
// 不需要任何額外套件:用 Node 內建的 WebSocket 連到本機的 Chrome(scripts/lib/cdp.mjs),網站由 scripts/lib/static-server.mjs 提供。
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startStaticServer } from './lib/static-server.mjs';
import { launchChrome, findChrome } from './lib/cdp.mjs';
import { forLevel, sceneAllowed } from '../src/ui/level.js';
import { GALLERY } from '../src/data/molecules.js';
import { REACTIONS } from '../src/data/reactions.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const QUICK = args.has('--quick'), SHOTS = args.has('--shots');
const LEVELS = ['kid', 'teen', 'high'], LANGS = ['zh', 'en'];
const DEVICES = { mobile: [390, 780, true], desktop: [1280, 800, false] };
const SCENES = QUICK ? ['table', 'atom/11', 'gallery', 'lab', 'reaction', 'quiz'] : ['table', 'atom/11', 'gallery', 'gallery/H2O', 'lab', 'reaction', 'reaction/methane', 'quiz', 'cloud', 'nucleus/6', 'matter'];
const THREE_D = new Set(['atom', 'gallery', 'lab', 'reaction', 'cloud', 'nucleus', 'matter']);
const CJK = /[一-鿿]/;

const failures = []; let passed = 0;
const check = (name, cond, detail = '') => { if (cond) passed++; else { failures.push(`${name}${detail ? ' → ' + detail : ''}`); console.log('  ✗ ' + name + (detail ? ' → ' + String(detail).slice(0, 200) : '')); } };

if (!findChrome()) { console.error('找不到 Chrome(或 Edge)。請安裝,或用環境變數 CHROME_PATH 指定執行檔路徑。'); process.exit(2); }

if (!args.has('--no-build')) {
  console.log('建置中(npm run build)…');
  // 固定的指令,不含任何外部輸入;Windows 上 npm 是 .cmd,要透過 cmd.exe 執行
  const r = process.platform === 'win32'
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', 'npm run build'], { cwd: root, stdio: 'inherit' })
    : spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
  if (r.status !== 0) { console.error('建置失敗'); process.exit(1); }
}
const dist = path.join(root, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html')) || !fs.existsSync(path.join(dist, 'landing.html'))) { console.error('dist/ 裡沒有 index.html 與 landing.html,請先建置'); process.exit(1); }

const server = await startStaticServer(dist);
const chrome = await launchChrome();
const page = await chrome.newPage();
const url = (p = 'index.html') => `${server.url}/${p}`;
const outDir = path.join(root, 'e2e-out');
if (SHOTS) fs.mkdirSync(outDir, { recursive: true });

/** 設定使用者的階段與語言(必須先開過同一個網站才能寫 localStorage) */
async function setup(level, lang, extra = {}) {
  await page.goto(url('landing.html?change=1'), 200);
  await page.eval(`localStorage.clear(); ${level ? `localStorage.setItem('level', '${level}');` : ''} localStorage.setItem('lang', '${lang}');` +
    Object.entries(extra).map(([k, v]) => `localStorage.setItem('${k}', ${JSON.stringify(JSON.stringify(v))});`).join(' '));
}
const SNAP = `(() => { const d = document, de = d.documentElement, m = d.querySelector('.m-body'), side = d.querySelector('.side');
  return { level: de.dataset.level, device: de.dataset.device, lang: de.lang, scene: d.body.dataset.scene, path: location.pathname, hash: location.hash,
    zp: d.querySelectorAll('.zp').length, text: d.body.innerText, overflow: de.scrollWidth > innerWidth + 1, navActive: !!d.querySelector('#nav button.active'), navCount: d.querySelectorAll('#nav button').length, specTab: !!d.querySelector('.side-tabs [data-tab=spec]'), specBtn: !!d.querySelector('.spec-toggle'),
    zhuyinBtn: !!d.getElementById('btn-zhuyin'), mascotDisplay: m ? getComputedStyle(m).display : 'none', mascotArt: !!d.querySelector('.m-body canvas, .m-body svg'),
    listCount: d.querySelectorAll('.list button').length, sideText: side ? side.innerText : '', barText: (d.querySelector('.stage-bar') || {}).innerText || '',
    canvases: d.querySelectorAll('#app canvas').length, nmVisible: [...d.querySelectorAll('.pt-grid .el .nm')].filter(n => getComputedStyle(n).display !== 'none').length, nmZp: d.querySelectorAll('.pt-grid .el:not(.placeholder) .nm .zp').length, ms: d.querySelectorAll('.pt-grid .el .ms').length, rare: d.querySelectorAll('.pt-grid .el.rare').length }; })()`;
const snap = () => page.eval(SNAP);
const errorsNow = () => page.errors.splice(0);
const eachErr = (where) => { const e = errorsNow(); check(`${where}:沒有主控台錯誤`, e.length === 0, e.join(' | ')); };

// ---------------------------------------------------------------- A. 第一次使用與換版本
console.log('A. 入口頁與換版本流程');
await page.viewport(390, 780, true);
await page.goto(url('landing.html?change=1'), 200); await page.eval('localStorage.clear()');
await page.goto(url('index.html#table'), 600);
let s = await snap();
check('第一次開啟(沒選過版本)會跳到入口頁', s.path.endsWith('landing.html'), s.path);
check('入口頁有三張卡片', (await page.eval(`document.querySelectorAll('.lp-card').length`)) === 3);
await page.eval(`document.querySelector('.lp-kid').click()`); await page.sleep(1800);
s = await snap();
check('選國小 → 進入主程式', s.path.endsWith('index.html') && s.hash === '#table', s.path + s.hash);
check('選國小後 data-level=kid、有注音、沒有舊的注音按鈕', s.level === 'kid' && s.zp > 0 && !s.zhuyinBtn);
check('國小導覽有 5 項(含化學故事)(沒有分子實驗室、反應劇場;光譜與電子雲也不提供)', s.navCount === 5, `nav=${s.navCount}`);
for (const hidden of ['lab', 'reaction', 'cloud']) { await page.goto(url('index.html#' + hidden), 700); const h = await snap(); check(`國小直接開 #${hidden} 會回到週期表`, h.scene === 'table' && h.hash === '#table', h.scene + h.hash); }
await page.goto(url('index.html#table'), 500);
await page.goto(url('landing.html'), 900); s = await snap();
check('選過版本後,入口頁直接進主程式', s.path.endsWith('index.html'), s.path);
await page.eval(`document.getElementById('btn-level').click()`); await page.sleep(900);
check('「換版本」回到入口頁且不會自動跳走', (await page.eval(`location.search + '|' + document.querySelectorAll('.lp-card').length`)) === '?change=1|3');
await page.eval(`document.querySelector('.lp-high').click()`); await page.sleep(1800); s = await snap();
check('改選高中 → 無注音、吉祥物隱藏', s.level === 'high' && s.zp === 0 && s.mascotDisplay === 'none', JSON.stringify({ l: s.level, zp: s.zp, m: s.mascotDisplay }));
eachErr('A');

// ---------------------------------------------------------------- B. 階段 × 語言 × 版面 × 頁面
console.log(`B. 頁面矩陣(${LEVELS.length} 階段 × ${LANGS.length} 語言 × ${Object.keys(DEVICES).length} 版面 × ${SCENES.length} 頁)`);
for (const [dev, [w, h, mobile]] of Object.entries(DEVICES)) {
  await page.viewport(w, h, mobile);
  for (const level of LEVELS) for (const lang of LANGS) {
    console.log(`  · ${dev} / ${level} / ${lang}`);
    await setup(level, lang);
    for (const sc of SCENES.filter(s => sceneAllowed(s.split('/')[0], level))) {          // 國小版沒有分子實驗室與反應劇場
      const id = `${level}/${lang}/${dev}/${sc}`, base = sc.split('/')[0];
      await page.goto(url('index.html#' + sc), 900);
      const x = await snap();
      check(`${id}:階段/版面/頁面屬性正確`, x.level === level && x.device === (mobile ? 'mobile' : 'desktop') && x.scene === base, JSON.stringify({ l: x.level, d: x.device, s: x.scene }));
      const wantZp = level === 'kid' && lang === 'zh';
      check(`${id}:注音${wantZp ? '有' : '沒有'}`, wantZp ? x.zp > 0 : x.zp === 0, `zp=${x.zp}`);
      check(`${id}:<html lang>`, x.lang === (lang === 'zh' ? 'zh-Hant' : 'en'), x.lang);
      check(`${id}:沒有殘留文字(undefined/NaN/{變數})`, !/undefined|NaN|\{[a-z]+\}|\[object/.test(x.text), (x.text.match(/.{0,15}(undefined|NaN|\{[a-z]+\}|\[object).{0,15}/) || [''])[0]);
      check(`${id}:沒有橫向溢出`, !x.overflow);
      check(`${id}:導覽有選中項目`, x.navActive);
      check(`${id}:導覽按鈕數(國小 5、其他 6)`, x.navCount === (level === 'kid' ? 5 : 6), `nav=${x.navCount}`);
      if (base === 'atom') check(`${id}:光譜分頁${level === 'kid' ? '(國小沒有)' : ''}`, x.specTab === (level !== 'kid'));
      if (base === 'table') check(`${id}:週期表光譜模式${level === 'kid' ? '(國小沒有)' : ''}`, x.specBtn === (level !== 'kid'));
      check(`${id}:吉祥物`, level === 'high' ? x.mascotDisplay === 'none' : (x.mascotDisplay !== 'none' && x.mascotArt), x.mascotDisplay);
      if (THREE_D.has(base)) check(`${id}:有 3D 畫面`, x.canvases >= 1, `canvas=${x.canvases}`);
      if (base === 'gallery' && sc === 'gallery') check(`${id}:圖鑑清單數量依階段`, x.listCount === forLevel(GALLERY, level).length, `${x.listCount} vs ${forLevel(GALLERY, level).length}`);
      if (base === 'reaction' && sc === 'reaction') check(`${id}:反應清單數量依階段`, x.listCount === forLevel(REACTIONS, level).length, `${x.listCount} vs ${forLevel(REACTIONS, level).length}`);
      if (base === 'atom') {
        const t = x.sideText;
        if (level === 'kid') check(`${id}:國小原子頁沒有粒子數/價電子`, !/neutrons|中子約|valence|價電子/.test(t));
        if (level === 'teen') check(`${id}:國中原子頁有粒子數`, lang === 'zh' ? /中子約/.test(t) : /neutrons/.test(t));
        if (level === 'high') check(`${id}:高中原子頁有價電子`, lang === 'zh' ? /價電子/.test(t) : /valence/.test(t));
      }
      if (base === 'table' && !mobile) { if (level === 'high') check(`${id}:高中週期表有原子量`, x.ms === 118, `ms=${x.ms}`); else check(`${id}:非高中沒有原子量`, x.ms === 0); }
      if (base === 'table' && level === 'kid') check(`${id}:國小週期表有淡化的少見元素`, x.rare > 0);
      if (base === 'table') {                                              // 國小(中文)連手機都要顯示中文名稱與注音;其他情況手機的格子只放符號
        if (level === 'kid' && lang === 'zh') check(`${id}:國小週期表每格都有中文名稱與注音`, x.nmVisible >= 118 && x.nmZp === 118, `visible=${x.nmVisible} zp=${x.nmZp}`);
        else if (mobile) check(`${id}:手機的週期表格子只放符號`, x.nmVisible === 0, `visible=${x.nmVisible}`);
      }
      if (lang === 'en' && (base === 'atom' || sc === 'gallery' || sc === 'gallery/H2O')) check(`${id}:英文版側欄沒有中文字`, !CJK.test(x.sideText), (x.sideText.match(/.{0,12}[一-鿿]+.{0,12}/) || [''])[0]);
      if (lang === 'en' && base === 'reaction') check(`${id}:英文版反應說明沒有中文字`, !CJK.test(x.barText));
      if (SHOTS) await page.screenshot(path.join(outDir, `${level}-${lang}-${dev}-${sc.replace('/', '_')}.png`));
    }
    eachErr(`B ${level}/${lang}/${dev}`);
  }
}

// ---------------------------------------------------------------- C. 互動流程(國小、手機)
console.log('C. 互動流程');
await page.viewport(390, 780, true); await setup('kid', 'zh');
await page.goto(url('index.html#table'), 900);
await page.eval(`[...document.querySelectorAll('.pt-grid .el')].find(e => e.querySelector('.sym')?.textContent === 'Fe').click()`); await page.sleep(1200);
s = await snap();
check('點週期表的 Fe → 進原子頁', s.hash === '#atom/26' && s.canvases >= 1, s.hash);
await page.eval(`document.getElementById('btn-lang').click()`); await page.sleep(1000); s = await snap();
check('切到英文:仍在原子頁、注音消失', s.lang === 'en' && s.hash === '#atom/26' && s.zp === 0);
await page.eval(`document.getElementById('btn-lang').click()`); await page.sleep(900); s = await snap();
check('切回中文:注音回來', s.lang === 'zh-Hant' && s.zp > 0);
await page.goto(url('index.html#quiz'), 800);
const q1 = await page.eval(`document.querySelector('.q').innerText`);
await page.eval(`document.querySelector('.opts button').click()`); await page.sleep(300);
check('小測驗:作答後有回饋與「下一題」', await page.eval(`!!document.querySelector('#fb #nx') && document.querySelectorAll('.opts button[disabled]').length > 0`));
await page.eval(`document.querySelector('#nx').click()`); await page.sleep(300);
check('小測驗:下一題會出新題目', (await page.eval(`document.querySelector('.q').innerText`)).length > 0 && !!(await page.eval(`document.querySelector('.opts button')`)) && q1.length > 0);
await page.goto(url('index.html#matter'), 1000);
await page.eval(`(() => { const r = document.querySelector('#app input[type=range]'); r.value = r.max; r.dispatchEvent(new Event('input', { bubbles: true })); })()`); await page.sleep(500);
check('物質變化:拉滑桿正常、沒有階段選擇鈕', await page.eval(`!!document.querySelector('#app input[type=range]') && !document.querySelector('#app .cl-levels')`));
await setup('teen', 'zh');
await page.goto(url('index.html#reaction'), 900);
const label = () => page.eval(`document.querySelector('#play').textContent.trim()`);
const l0 = await label(); await page.eval(`document.querySelector('#play').click()`); await page.sleep(200); const l1 = await label();
check('反應劇場:播放/暫停會切換', l0 !== l1, `${l0} → ${l1}`);
await page.eval(`document.querySelector('#replay').click()`); await page.sleep(300);
check('反應劇場:重播後回到播放中', (await label()).includes('⏸'));
await page.eval(`dispatchEvent(new CustomEvent('mascot', { detail: { type: 'cheer', text: 'ok' } }))`); await page.sleep(200);
check('小博士收到答對事件會大笑', (await page.eval(`document.querySelector('.m-body').dataset.mood`)) === 'cheer');
eachErr('C');

// ---------------------------------------------------------------- D. 分子實驗室的階段內容(桌機)
console.log('D. 分子實驗室(電子帳與路易斯結構)');
await page.viewport(1280, 800, false);
const progress = { built: ['H2O', 'NO2'], elements: [], reactions: [], bestStreak: 0, quizRight: 0, spectraSeen: [], spectrumRight: 0, changeRight: 0 };
for (const level of LEVELS) {
  await setup(level, 'zh', { 'chem-progress-v1': progress });
  if (level === 'kid') { await page.goto(url('index.html#lab'), 700); check('D kid:國小沒有分子實驗室(回到週期表)', (await snap()).scene === 'table'); continue; }
  await page.goto(url('index.html#lab'), 1100);
  await page.eval(`document.querySelector('[data-a=list]').click()`); await page.sleep(250);
  await page.eval(`[...document.querySelectorAll('.m-card')].find(c => c.dataset.id === 'NO2').click()`); await page.sleep(300);
  const r = await page.eval(`({ facts: document.querySelector('.mi-facts')?.innerText || '', lewis: !!document.querySelector('.lewis-svg'), open: !!document.querySelector('.mi-lewis')?.open })`);
  if (level === 'teen') check('D teen:有電子帳、沒有路易斯結構', /共用電子對/.test(r.facts) && !r.lewis, r.facts);
  if (level === 'high') check('D high:有電子帳(含未成對電子)與展開的路易斯結構', /未成對電子/.test(r.facts) && r.lewis && r.open, JSON.stringify(r));
}
eachErr('D');

// ---------------------------------------------------------------- E. 故事朗讀「跟著唸」(用假的 speechSynthesis,不需要真的出聲)
console.log('E. 故事朗讀:念到哪個字,哪個字亮起來');
const FAKE_TTS = (bound) => `(() => { window.__bound = ${bound};
  const fake = { speaking: false, cancel() {}, getVoices: () => [], addEventListener() {},
    speak(u) { setTimeout(() => { u.onstart && u.onstart(); if (window.__bound) u.onboundary && u.onboundary({ name: 'word', charIndex: 1, charLength: 1 }); setTimeout(() => u.onend && u.onend(), 4000); }, 10); } };
  Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true }); })()`;
const NOW = `[...document.querySelectorAll('.rd-now')].map(e => e.textContent.replace(/[ㄅ-ㄩˊˇˋ˙]/g, '')).join('|')`;
for (const [lang, bound] of [['zh', true], ['zh', false], ['en', true]]) {
  await setup('kid', lang);
  await page.goto(url('index.html'), 700);
  await page.eval(FAKE_TTS(bound));
  await page.eval(`location.hash = '#stories/fire'`); await page.sleep(500);
  const tag = `E ${lang}${bound ? '(引擎有回報)' : '(沒回報,用時間估算)'}`;
  check(`${tag}:有朗讀鈕`, await page.eval(`!!document.querySelector('#say')`));
  await page.eval(`document.querySelector('#say').click()`); await page.sleep(bound ? 300 : 900);
  const n1 = await page.eval(`document.querySelectorAll('.rd-line').length`), w1 = await page.eval(NOW);
  check(`${tag}:這一句有淡底色`, n1 > 0, String(n1));
  check(`${tag}:念到的字亮起來`, w1.length > 0 && !w1.includes('|') || lang === 'en', w1);
  if (!bound) { await page.sleep(700); const w2 = await page.eval(NOW); check(`${tag}:亮的字會往後移`, w2 !== w1 && w2.length > 0, `${w1} → ${w2}`); }
  await page.eval(`document.querySelector('#say').click()`); await page.sleep(200);
  check(`${tag}:再按一次停止後,亮的都消失`, await page.eval(`document.querySelectorAll('.rd-line, .rd-now').length === 0`));
  eachErr(tag);
}

// ---------------------------------------------------------------- F. 化學故事的實驗動畫(真的 3D、真的播放)
console.log('F. 化學故事的實驗動畫');
// 每一支動畫都要測一次(中英文交錯,兩種語言的字幕都會被測到);--quick 只測前兩支
const EXP_LIST = [['zh', 'candle', 'fire'], ['en', 'cabbage', 'cabbage'], ['zh', 'iron', 'iron'], ['en', 'salt', 'salt'], ['zh', 'fireworks', 'fireworks'], ['en', 'air', 'air'], ['zh', 'mendeleev', 'mendeleev']];
for (const [lang, key, story] of (QUICK ? EXP_LIST.slice(0, 2) : EXP_LIST)) {
  await page.viewport(390, 780, true);
  await setup('kid', lang);
  await page.goto(url('index.html#stories/' + story), 1200);
  const tag = `F ${lang} ${key}`;
  check(`${tag}:故事頁有動畫卡片(海報按鈕)`, await page.eval(`!!document.querySelector('.anim-card .anim-poster')`));
  check(`${tag}:動畫卡片放在實驗那一段的後面,不在故事最前面`, await page.eval(`(() => { const c = document.querySelector('.anim-card'); return !!c.previousElementSibling && c.previousElementSibling.classList.contains('story-p'); })()`));
  await page.eval(`document.querySelector('.anim-poster').click()`); await page.sleep(2500);
  check(`${tag}:按下去後有 3D 畫面`, await page.eval(`!!document.querySelector('.anim-stage canvas')`));
  check(`${tag}:動畫用的是自己的腳本(步驟數與腳本一致,不是別的實驗的)`, await page.eval(`document.querySelectorAll('.anim-steps button').length`) === await page.eval(`(() => { const a = document.querySelector('.anim-stage canvas').__api; return a.steps().length; })()`) && (await page.eval(`document.querySelector('.anim-stage canvas').__api.key`)) === key);
  check(`${tag}:字幕、播放鈕、進度條、步驟列都有`, await page.eval(`!!document.querySelector('.anim-cap')?.textContent.trim() && !!document.querySelector('.anim-play') && !!document.querySelector('.anim-seek') && document.querySelectorAll('.anim-steps button').length >= 5`));
  const sw = JSON.parse(await page.eval(`JSON.stringify(document.querySelector('.anim-stage canvas').__api.sweep())`));
  check(`${tag}:逐格掃描:關節超限 0、手離目標 ≤ 0.2`, sw.length === 2 && sw.every(r => r.maxViolations === 0 && r.maxReachErr <= 0.2), JSON.stringify(sw));
  check(`${tag}:兩種語言的動畫長度都在 45 秒內`, sw.every(r => r.total > 10 && r.total <= 45), sw.map(r => r.total).join(','));
  const info = JSON.parse(await page.eval(`JSON.stringify(document.querySelector('.anim-stage canvas').__api.info())`));
  check(`${tag}:有畫質等級(0~2),預設從全開(2)開始往下調`, [0, 1, 2].includes(await page.eval(`document.querySelector('.anim-stage canvas').__api.quality()`)));
  check(`${tag}:繪製呼叫數在預算內(< 400)`, info.calls > 0 && info.calls < 400, JSON.stringify(info));
  await page.eval(`document.querySelector('.anim-play').click()`); await page.sleep(200);
  check(`${tag}:按暫停後不再往前播`, await (async () => { const a = await page.eval(`document.querySelector('.anim-stage canvas').__api.time()`); await page.sleep(500); return Math.abs(a - await page.eval(`document.querySelector('.anim-stage canvas').__api.time()`)) < 0.05; })());
  check(`${tag}:手機沒有橫向捲動`, !(await snap()).overflow);
  eachErr(tag);
  // 放大模式:畫面撐滿視窗(比例跟著視窗),3D 畫面跟著變大;再按一次回到原位
  await page.eval(`document.querySelector('.anim-full').click()`); await page.sleep(600);
  check(`${tag}:放大模式:動畫撐滿視窗,3D 畫面與容器一樣大`, await page.eval(`(() => { const s = document.querySelector('.anim-stage'), c = s.querySelector('canvas'); return document.querySelector('.anim-card').classList.contains('full') && s.clientWidth >= innerWidth - 40 && s.clientHeight >= innerHeight * 0.3 && Math.abs(c.clientWidth - s.clientWidth) < 2 && Math.abs(c.clientHeight - s.clientHeight) < 2; })()`));
  await page.eval(`document.querySelector('.anim-full').click()`); await page.sleep(400);
  check(`${tag}:離開放大模式後回到故事裡`, await page.eval(`!document.querySelector('.anim-card.full') && !!document.querySelector('.story .anim-card')`));
  await page.eval(`document.getElementById('btn-lang').click()`); await page.sleep(900);
  check(`${tag}:切換語言後動畫會釋放(回到海報),沒有殘留的 3D 畫面`, await page.eval(`!document.querySelector('.anim-stage canvas') && !!document.querySelector('.anim-poster')`));
  eachErr(tag + ' 切換語言');
}

// F2. 不同尺寸:桌機不能是窄畫面;橫式手機放大模式也要能用(畫面比例跟著容器,鏡頭自動適應)
for (const [name, w, h, mobile, minW] of [['桌機 1280x800', 1280, 800, false, 600], ['橫式手機 844x390', 844, 390, true, 500], ['平板 820x1180', 820, 1180, true, 600]]) {
  await page.viewport(w, h, mobile); await setup('kid', 'zh');
  await page.goto(url('index.html#stories/fire'), 1200);
  await page.eval(`document.querySelector('.anim-poster').click()`); await page.sleep(2200);
  const sz = JSON.parse(await page.eval(`(() => { const s = document.querySelector('.anim-stage'), c = s.querySelector('canvas'); return JSON.stringify([s.clientWidth, s.clientHeight, c.clientWidth, c.clientHeight]); })()`));
  check(`F ${name}:動畫畫面夠大(寬 ≥ ${minW}px),3D 畫面與容器一樣大`, sz[0] >= minW && Math.abs(sz[0] - sz[2]) < 2 && Math.abs(sz[1] - sz[3]) < 2, sz.join('x'));
  await page.eval(`document.querySelector('.anim-full').click()`); await page.sleep(600);
  const fz = JSON.parse(await page.eval(`(() => { const s = document.querySelector('.anim-stage'); return JSON.stringify([s.clientWidth, s.clientHeight, innerWidth, innerHeight]); })()`));
  check(`F ${name}:放大模式撐滿視窗寬度、高度有一定大小`, fz[0] >= fz[2] - 40 && fz[1] >= fz[3] * 0.25, fz.join('x'));
  eachErr('F ' + name);
}
await page.close?.();
await chrome.close();
await server.close();
console.log(`\nE2E 完成:${passed} 項通過,${failures.length} 項失敗`);
if (failures.length) { console.log('\n失敗清單:\n' + failures.map(f => ' - ' + f).join('\n')); process.exit(1); }

process.exit(0);
