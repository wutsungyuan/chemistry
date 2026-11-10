import { state, render } from '../i18n/index.js';

// 原子小博士:住在標題列下方的「提示列」裡(版面中固定保留的一條,不蓋住任何功能)。
// 他說的話就是各頁的操作提示;點他會換下一句,答對/做出分子時會跳出來慶祝。
const TIPS = {
  table: {
    zh: ['點一格元素,看看它的原子長什麼樣子!', '點上面的顏色標籤,可以找出同一家族,還有說明喔!', '氫(H)是第 1 號元素,宇宙裡最多的就是它!'],
    en: ['Tap a square to see its atom!', 'Tap a color tag to find a whole family - with a little story!', 'Hydrogen (H) is number 1 - the most common element in the universe!'],
  },
  atom: {
    zh: ['紅球是質子,灰球是中子,藍球是電子!', '拖曳可以轉動原子,右邊的滑桿可以放大縮小。', '黃球是最外層電子,它們決定這個元素愛跟誰牽手!', '點「原子序」「原子量」旁邊的小圖示,有簡單的說明喔!'],
    en: ['Red = proton, gray = neutron, blue = electron!', 'Drag to spin the atom. Use the slider to zoom!', 'Yellow balls are the outer electrons - they decide who the atom holds hands with!', 'Tap the little info icons for simple explanations!'],
  },
  gallery: {
    zh: ['用手指或滑鼠拖曳可以旋轉,點一下原子它會彈跳喔!', '試試切換「球棍模型」和「空間填充」,長得不一樣呢!', '點右邊的名字,認識生活中的分子!'],
    en: ['Drag to rotate, and tap an atom to make it bounce!', 'Try switching between ball-and-stick and space-filling!', 'Pick a name on the right to meet everyday molecules!'],
  },
  lab: {
    zh: ['點下方的原子加進來,把它們拖到一起就會牽手!', 'H 想牽 1 隻手,O 想牽 2 隻手,N 想牽 3 隻手,C 想牽 4 隻手喔!', '黃色光圈表示「還想牽手」。做錯了沒關係,用剪刀剪開再試一次!'],
    en: ['Tap atoms below, then drag them together to hold hands!', 'H wants 1 hand, O wants 2, N wants 3, and C wants 4!', 'A yellow glow means "still wants a hand". Made a mistake? Use the scissors!'],
  },
  reaction: {
    zh: ['按播放,看原子怎麼重新排隊變成新東西!', '反應前後,原子的種類和數量都不會變喔!', '可以拖動下面的進度條,慢慢看每一步。'],
    en: ['Press play and watch atoms line up into something new!', 'Atoms never disappear - they just rearrange!', 'Drag the progress bar to see every step slowly.'],
  },
  quiz: {
    zh: ['答對越多,徽章越多,加油!', '不確定的話,先去週期表逛逛再回來!'],
    en: ['More right answers, more badges. You can do it!', 'Not sure? Visit the periodic table first, then come back!'],
  },
};

const PRAISE = {
  zh: ['答對了!你好厲害!', '太棒了!', '耶!你是小科學家!', '哇!完全正確!'],
  en: ['Correct! You are amazing!', 'Awesome!', 'Yay! Little scientist!', 'Wow! Perfect!'],
};
const OOPS = {
  zh: ['沒關係,再試一次就會了!', '失敗是科學家的好朋友!', '加油!下一題一定行!'],
  en: ['No worries, try again!', 'Mistakes help scientists learn!', 'Keep going, you got this!'],
};

const SVG = `<svg viewBox="0 0 120 130" width="100%" height="100%" aria-hidden="true">
  <g class="m-orbits"><g fill="none" stroke="#9fe0ff" stroke-width="2.2" opacity=".9">
    <ellipse cx="60" cy="46" rx="50" ry="17"/><ellipse cx="60" cy="46" rx="50" ry="17" transform="rotate(60 60 46)"/><ellipse cx="60" cy="46" rx="50" ry="17" transform="rotate(120 60 46)"/></g>
    <circle cx="110" cy="46" r="5" fill="#4cc9ff"/><circle cx="35" cy="89" r="5" fill="#ffd23f"/><circle cx="35" cy="3" r="5" fill="#ff7aa8"/></g>
  <path d="M26 128 Q26 82 60 80 Q94 82 94 128 Z" fill="#fff" stroke="#cfd6ff" stroke-width="2"/>
  <path d="M60 80 L50 100 L60 96 L70 100 Z" fill="#ff5a5a"/>
  <g class="m-arm"><path d="M92 96 Q108 84 104 66" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round"/><circle cx="104" cy="64" r="6" fill="#ffe0b8"/></g>
  <circle cx="60" cy="48" r="29" fill="#ffe0b8"/>
  <path d="M33 40 Q60 8 87 40 Q60 28 33 40Z" fill="#7a4a2a"/>
  <g class="m-eyes"><circle cx="49" cy="50" r="10" fill="#fff" stroke="#3a3a66" stroke-width="2.5"/><circle cx="71" cy="50" r="10" fill="#fff" stroke="#3a3a66" stroke-width="2.5"/>
    <circle class="m-pl" cx="50" cy="51" r="4" fill="#222"/><circle class="m-pr" cx="72" cy="51" r="4" fill="#222"/></g>
  <path d="M59 50 H61" stroke="#3a3a66" stroke-width="2.5"/>
  <path d="M50 64 Q60 73 70 64" fill="none" stroke="#c0453a" stroke-width="3" stroke-linecap="round"/>
  <circle cx="41" cy="62" r="4" fill="#ff9aa8" opacity=".6"/><circle cx="79" cy="62" r="4" fill="#ff9aa8" opacity=".6"/>
</svg>`;

const pick = a => a[Math.floor(Math.random() * a.length)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

let bar, bubble, body, scene = 'table', holdTimer, holding = false, asleep = false, lastMove = Date.now();
const idx = {};

function show(html) {
  bubble.classList.remove('swap'); void bubble.offsetWidth;
  bubble.innerHTML = html; bubble.classList.add('swap');
}
/** 顯示該頁目前這一句提示(advance=true 換下一句) */
function tip(advance) {
  const list = TIPS[scene]?.[state.lang] || TIPS[scene]?.zh;
  if (!list) return;
  if (advance) idx[scene] = ((idx[scene] ?? -1) + 1) % list.length;
  show(render(list[idx[scene] ?? (idx[scene] = 0)]));
}
/** 臨時說一句話(慶祝等),幾秒後回到該頁提示 */
function say(text, ms = 5000) {
  clearTimeout(holdTimer);
  holding = true;                      // 說話期間不要被自動輪播的提示蓋掉
  show(render(text));
  holdTimer = setTimeout(() => { holding = false; tip(false); }, ms);
}
const act = cls => {
  body.classList.remove(cls); void body.offsetWidth; body.classList.add(cls);
  setTimeout(() => body.classList.remove(cls), 900);
};

export function mountMascot() {
  bar = document.getElementById('tipbar');
  bar.innerHTML = `<button class="m-body" aria-label="原子小博士">${SVG}</button><div class="m-bubble"></div>`;
  body = bar.querySelector('.m-body');
  bubble = bar.querySelector('.m-bubble');
  const pl = bar.querySelector('.m-pl'), pr = bar.querySelector('.m-pr');

  body.onclick = () => { act('jump'); clearTimeout(holdTimer); holding = false; tip(true); };

  // 眼睛跟著指標走
  const wake = () => {
    lastMove = Date.now();
    if (asleep) { asleep = false; bar.classList.remove('sleep'); act('jump'); say(state.lang === 'zh' ? '哈啾~我醒啦!' : 'Yawn... I am awake!', 2500); }
  };
  addEventListener('pointermove', e => {
    wake();
    const r = body.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height * 0.4);
    const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 200) * 3;
    pl.style.transform = pr.style.transform = `translate(${(dx / d) * k}px,${(dy / d) * k}px)`;
  }, { passive: true });
  addEventListener('pointerdown', wake, { passive: true });
  addEventListener('keydown', wake);

  // 閒著時:偶爾跳一下、轉圈,每 14 秒換一句提示;45 秒沒人操作就睡著
  setInterval(() => {
    if (document.hidden) return;
    if (!asleep && Date.now() - lastMove > 45000) { asleep = true; bar.classList.add('sleep'); show('Zzz… Zzz…'); return; }
    if (asleep) return;
    if (holding) return;
    if (!reduced) { const r = Math.random(); if (r < 0.35) act('jump'); else if (r < 0.5) act('twirl'); }
    tip(true);
  }, 14000);

  // 回應遊戲事件
  addEventListener('mascot', e => {
    const t = e.detail?.type, lang = state.lang;
    if (t === 'cheer') { act('twirl'); say(e.detail.text || pick(PRAISE[lang] || PRAISE.zh), e.detail.text ? 8000 : 4000); }
    else if (t === 'say') say(e.detail.text, e.detail.ms || 7000);
    else if (t === 'oops') say(pick(OOPS[lang] || OOPS.zh), 4000);
  });
}

/** 換頁時呼叫:換成該頁的提示 */
export function mascotScene(name) {
  const changed = name !== scene;
  scene = name;
  document.body.dataset.scene = name;
  clearTimeout(holdTimer); holding = false;
  if (bubble) tip(changed);
}
