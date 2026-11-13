// 入口頁(原型):選擇國小 / 國中 / 高中版本。
// 背景的化學動態、三張風格卡片、選定後的轉場。選擇寫入 localStorage['level'],再進入主程式。
import { state, setLang } from '../i18n/index.js';
import { rubyHTML } from '../i18n/zhuyin.js';
import { setLevel, hasLevel, getLevel, LEVELS } from '../ui/level.js';
import { mountFace, trackPupils, startIdleMoods, setMood } from '../ui/mascotFace.js';
import { createBackground } from './bg.js';

const TEXT = {
  zh: {
    title: '兒童化學樂園', sub: '選一個適合你的版本,開始探索原子與分子!', pick: '選擇版本', lang: 'EN',
    kid: { name: '國小版', grade: '國小 · 約 7~12 歲', line: '水是由兩個氫和一個氧手牽手變成的!', cta: '出發!' },
    teen: { name: '國中版', grade: '國中 · 約 13~15 歲', line: '水分子由 2 個氫原子與 1 個氧原子以共價鍵結合而成。', cta: '開始學習' },
    high: { name: '高中版', grade: '高中 · 約 16~18 歲', line: 'H₂O:極性共價分子,鍵角 104.5°,O–H 鍵長約 96 pm。', cta: '進入' },
  },
  en: {
    title: 'Kids Chemistry Park', sub: 'Pick the version made for you and explore atoms and molecules!', pick: 'Choose a version', lang: '中文',
    kid: { name: 'Elementary', grade: 'Ages 7–12', line: 'Water is made when two hydrogens and one oxygen hold hands!', cta: "Let's go!" },
    teen: { name: 'Junior high', grade: 'Ages 13–15', line: 'A water molecule consists of 2 hydrogen atoms and 1 oxygen atom joined by covalent bonds.', cta: 'Start learning' },
    high: { name: 'Senior high', grade: 'Ages 16–18', line: 'H₂O: a polar covalent molecule; bond angle 104.5°, O–H bond length ≈ 96 pm.', cta: 'Enter' },
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

const root = document.getElementById('lp');
const bgEls = [...document.querySelectorAll('.lp-bg-layer')];
const bg = createBackground(document.querySelector('.lp-canvas'), bgEls);
const THEME_COLOR = { kid: '#fff8e8', teen: '#f3f6fb', high: '#070e22' };
let hover = -1, auto = 0, mascotEl = null, stopIdle = null, stopTrack = null;

function activate(i) {
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

function choose(level, e) {
  setLevel(level);
  const wipe = document.querySelector('.lp-wipe');
  const x = e.clientX || innerWidth / 2, y = e.clientY || innerHeight / 2;
  wipe.style.setProperty('--x', x + 'px'); wipe.style.setProperty('--y', y + 'px');
  wipe.dataset.to = level; wipe.classList.add('on');
  setTimeout(() => { location.href = './index.html#table'; }, 650);
}

// 沒有指到任何卡片時,背景自動輪流展示三種風格(手機沒有 hover,靠這個讓使用者看到差異)
setInterval(() => {
  if (hover >= 0 || document.hidden) return;
  auto = (auto + 1) % 3; activate(auto);
}, 4500);

// 已經選過版本、而且不是從「換版本」進來 → 直接進主程式
if (hasLevel() && !new URLSearchParams(location.search).has('change')) location.replace('./index.html');
else { build(); activate(Math.max(0, LEVELS.indexOf(getLevel()))); auto = Math.max(0, LEVELS.indexOf(getLevel())); }
