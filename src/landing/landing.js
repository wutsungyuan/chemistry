// 入口頁(原型):選擇國小 / 國中 / 高中版本。
// 背景的化學動態、三張風格卡片、選定後的轉場。選擇寫入 localStorage['level'],再進入主程式。
import { state, setLang } from '../i18n/index.js';
import { rubyHTML } from '../i18n/zhuyin.js';
import { setLevel, hasLevel, getLevel, LEVELS } from '../ui/level.js';
import { mountFace, trackPupils, startIdleMoods, setMood } from '../ui/mascotFace.js';
import { createBackground } from './bg.js';
import { logoSVG } from '../ui/logo.js';

const TEXT = {
  zh: {
    title: '元素星球', sub: '選一顆星球,出發探索原子與分子的宇宙!', pick: '選擇星球', lang: 'EN', back: '重選星球', hint: '點一顆星球,出發!',
    kid: { name: '國小星', grade: '國小 · 約 7~12 歲', line: '水是由兩個氫和一個氧手牽手變成的!', cta: '出發!' },
    teen: { name: '國中星', grade: '國中 · 約 13~15 歲', line: '水分子由 2 個氫原子與 1 個氧原子以共價鍵結合而成。', cta: '開始學習' },
    high: { name: '高中星', grade: '高中 · 約 16~18 歲', line: 'H₂O:極性共價分子,鍵角 104.5°,O–H 鍵長約 96 pm。', cta: '進入' },
  },
  en: {
    title: 'Planet Element', sub: 'Pick a planet and set off to explore the universe of atoms and molecules!', pick: 'Choose a planet', lang: '中文', back: 'Back', hint: 'Tap a planet to set off',
    kid: { name: 'Elementary Planet', grade: 'Ages 7–12', line: 'Water is made when two hydrogens and one oxygen hold hands!', cta: "Let's go!" },
    teen: { name: 'Junior High Planet', grade: 'Ages 13–15', line: 'A water molecule consists of 2 hydrogen atoms and 1 oxygen atom joined by covalent bonds.', cta: 'Start learning' },
    high: { name: 'Senior High Planet', grade: 'Ages 16–18', line: 'H₂O: a polar covalent molecule; bond angle 104.5°, O–H bond length ≈ 96 pm.', cta: 'Enter' },
  },
};

// 三張卡片上的水分子小圖(各自風格)
const ART = {
  kid: `<svg viewBox="0 0 120 84" aria-hidden="true"><defs>
      <radialGradient id="ko" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#ffc2cb"/><stop offset="1" stop-color="#ff6b81"/></radialGradient>
      <radialGradient id="kh" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#fff3b0"/><stop offset="1" stop-color="#ffc21f"/></radialGradient></defs>
    <path d="M60 30 L28 58 M60 30 L92 58" stroke="#fff" stroke-width="9" stroke-linecap="round"/>
    <circle cx="28" cy="58" r="14" fill="url(#kh)"/><circle cx="92" cy="58" r="14" fill="url(#kh)"/><circle cx="60" cy="30" r="21" fill="url(#ko)"/>
    <circle cx="53" cy="23" r="5" fill="#fff" opacity=".7"/><path d="M52 34 Q60 42 68 34" stroke="#7a1f3d" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="54" cy="30" r="2.4" fill="#7a1f3d"/><circle cx="66" cy="30" r="2.4" fill="#7a1f3d"/></svg>`,
  teen: `<svg viewBox="0 0 120 84" aria-hidden="true">
    <path d="M60 30 L28 58 M60 30 L92 58" stroke="#46597a" stroke-width="3" stroke-linecap="round"/>
    <circle cx="28" cy="58" r="11" fill="#dfe6ee" stroke="#46597a" stroke-width="1.5"/><circle cx="92" cy="58" r="11" fill="#dfe6ee" stroke="#46597a" stroke-width="1.5"/>
    <circle cx="60" cy="30" r="16" fill="#d9645b" stroke="#46597a" stroke-width="1.5"/>
    <text x="60" y="35" text-anchor="middle" font-size="14" font-weight="700" fill="#fff" font-family="system-ui,sans-serif">O</text>
    <text x="28" y="62" text-anchor="middle" font-size="11" font-weight="700" fill="#46597a" font-family="system-ui,sans-serif">H</text><text x="92" y="62" text-anchor="middle" font-size="11" font-weight="700" fill="#46597a" font-family="system-ui,sans-serif">H</text></svg>`,
  high: `<svg viewBox="0 0 120 84" aria-hidden="true" font-family="ui-monospace,Menlo,Consolas,monospace">
    <path d="M60 30 L28 58 M60 30 L92 58" stroke="#8fc8ff" stroke-width="1.2"/>
    <path d="M44 44 A22 22 0 0 0 76 44" fill="none" stroke="#8fc8ff" stroke-width=".8" stroke-dasharray="2 2" opacity=".8"/>
    <circle cx="28" cy="58" r="9" fill="#0a1634" stroke="#8fc8ff" stroke-width="1.2"/><circle cx="92" cy="58" r="9" fill="#0a1634" stroke="#8fc8ff" stroke-width="1.2"/><circle cx="60" cy="30" r="13" fill="#0a1634" stroke="#8fc8ff" stroke-width="1.2"/>
    <text x="60" y="34" text-anchor="middle" font-size="11" fill="#cfe8ff">O</text><text x="28" y="62" text-anchor="middle" font-size="9" fill="#cfe8ff">H</text><text x="92" y="62" text-anchor="middle" font-size="9" fill="#cfe8ff">H</text>
    <text x="60" y="64" text-anchor="middle" font-size="7.5" fill="#8fc8ff">104.5°</text></svg>`,
};

const lt = document.querySelector('.lp-loader-txt'); if (lt) lt.textContent = state.lang === 'en' ? 'Heading to Planet Element…' : '正在前往元素星球…';
const root = document.getElementById('lp');
const bgEls = [...document.querySelectorAll('.lp-bg-layer')];
const bg = createBackground(document.querySelector('.lp-canvas'), bgEls);
const THEME_COLOR = { kid: '#fff8e8', teen: '#f3f6fb', high: '#070e22' };
let hover = -1, auto = 0, mascotEl = null, stopIdle = null, stopTrack = null;

function activate(i) {
  if (document.documentElement.classList.contains('sp-pre') || document.body.classList.contains('lp-space')) { bg.setTarget(i); return; }   // 3D 入口:畫面是深色太空,不套用卡片的主題色
  bg.setTarget(i);
  const th = LEVELS[i];
  document.body.dataset.active = th;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', THEME_COLOR[th]);
}

function build() {
  mascotEl?._m?.dispose();
  const L = TEXT[state.lang], zh = state.lang === 'zh';
  const kidR = s => (zh ? rubyHTML(s) : s);
  const card = (lv, nameHtml, gradeHtml, lineHtml, ctaHtml, extra = '') => `
    <button class="lp-card lp-${lv}" data-level="${lv}" aria-label="${L[lv].name} — ${L[lv].grade}">
      ${extra}
      <span class="lp-art">${ART[lv]}</span>
      <span class="lp-txt">
        <span class="lp-name">${nameHtml}</span>
        <span class="lp-grade">${gradeHtml}</span>
        <span class="lp-line">${lineHtml}</span>
      </span>
      <span class="lp-cta">${ctaHtml}<i aria-hidden="true">›</i></span>
    </button>`;
  root.innerHTML = `
    <header class="lp-head">
      <button class="lp-lang" aria-label="Language">${L.lang}</button>
      <span class="lp-logo">${logoSVG(84, 'lp')}</span>
      <h1>${L.title}</h1>
      <p>${L.sub}</p>
    </header>
    <section class="lp-cards" aria-label="${L.pick}">
      ${card('kid', kidR(L.kid.name), kidR(L.kid.grade), kidR(L.kid.line), kidR(L.kid.cta), `<span class="lp-mascot"></span>`)}
      ${card('teen', L.teen.name, L.teen.grade, L.teen.line, L.teen.cta)}
      ${card('high', L.high.name, L.high.grade, L.high.line, L.high.cta)}
    </section>`;
  document.documentElement.lang = zh ? 'zh-Hant' : 'en';
  document.title = L.title;
  space?.setLabels(['kid', 'teen', 'high'].map(lv => ({ level: lv, nameHtml: lv === 'kid' ? kidR(L.kid.name) : L[lv].name, gradeHtml: lv === 'kid' ? kidR(L.kid.grade) : L[lv].grade, lineHtml: lv === 'kid' ? kidR(L.kid.line) : L[lv].line, ctaHtml: lv === 'kid' ? kidR(L.kid.cta) : L[lv].cta, aria: `${L[lv].name} — ${L[lv].grade}` })), L);

  root.querySelector('.lp-lang').onclick = () => { setLang(state.lang === 'zh' ? 'en' : 'zh'); build(); };
  root.querySelectorAll('.lp-card').forEach((c, i) => {
    c.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hover = i; activate(i); } });
    c.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { hover = -1; } });
    c.addEventListener('focus', () => { hover = i; activate(i); });
    c.addEventListener('blur', () => { hover = -1; });
    c.addEventListener('click', e => choose(c.dataset.level, e));
  });

  stopIdle?.(); stopTrack?.();
  mascotEl = root.querySelector('.lp-mascot'); mountFace(mascotEl);
  stopTrack = trackPupils(mascotEl);
  stopIdle = startIdleMoods(mascotEl);
  root.querySelector('.lp-kid').addEventListener('pointerenter', () => setMood(mascotEl, 'cheer', 1600));
}

// 3D 宇宙入口:動態載入(three.js 比較大),準備好才把三張卡片換成三顆星球;不支援 WebGL 或網址加 ?space=0 就維持原本的卡片
let space = null;
async function initSpace() {
  if (new URLSearchParams(location.search).get('space') === '0') return;
  const host = document.createElement('div'); host.className = 'sp-host'; document.body.appendChild(host);
  try {
    const { mountSpace } = await import('./space.js');
    const L = TEXT[state.lang];
    space = mountSpace(host, { labels: [], texts: L, onPick: (lv, e) => choose(lv, e) });
    document.body.classList.add('lp-space'); document.documentElement.classList.remove('sp-pre'); document.querySelector('meta[name=theme-color]')?.setAttribute('content', '#050a1c');
    build();
  } catch (err) { console.warn('3D 入口無法使用,改用卡片', err); host.remove(); space = null; document.documentElement.classList.remove('sp-pre'); activate(auto); }   // 只有不支援 3D 時才顯示卡片
}

function choose(level, e) {
  setLevel(level);
  const wipe = document.querySelector('.lp-wipe');
  wipe.dataset.to = level;
  if (space) {                                                    // 3D 入口:鏡頭先飛進星球(space.js 的 dive),快到的時候才淡入目標版本的底色,再進入主程式
    wipe.classList.add('fade'); void wipe.offsetWidth; wipe.classList.add('on');
    setTimeout(() => { location.href = './index.html#table'; }, 1100);
    return;
  }
  const x = e.clientX || innerWidth / 2, y = e.clientY || innerHeight / 2;
  wipe.style.setProperty('--x', x + 'px'); wipe.style.setProperty('--y', y + 'px');
  wipe.classList.add('on');
  setTimeout(() => { location.href = './index.html#table'; }, 650);
}

// 沒有指到任何卡片時,背景自動輪流展示三種風格(手機沒有 hover,靠這個讓使用者看到差異)
setInterval(() => {
  if (hover >= 0 || document.hidden || space || document.documentElement.classList.contains('sp-pre')) return;   // 3D 入口(或正在載入)時不輪播卡片的主題
  auto = (auto + 1) % 3; activate(auto);
}, 4500);

// 已經選過版本、而且不是從「換版本」進來 → 直接進主程式
if (hasLevel() && !new URLSearchParams(location.search).has('change')) location.replace('./index.html');
else { build(); initSpace(); activate(Math.max(0, LEVELS.indexOf(getLevel()))); auto = Math.max(0, LEVELS.indexOf(getLevel())); }
