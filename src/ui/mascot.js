import { state, render } from '../i18n/index.js';
import { pick } from './util.js';
import { getLevel } from './level.js';
import { mountFace, setMood, trackPupils } from './mascotFace.js';

// 原子小博士:住在標題列下方的「提示列」裡(版面中固定保留的一條,不蓋住任何功能)。
// 他說的話就是各頁的操作提示;點他會換下一句,答對/做出分子時會跳出來慶祝。
// 各頁提示;可以依階段換說法:'zh@teen' / 'zh@high' / 'en@teen' / 'en@high' 優先,沒有就用 zh / en(國小)
const TIPS = {
  table: {
    zh: ['點一格元素,看看它的原子長什麼樣子!', '點上面的顏色標籤,可以找出同一家族,還有說明喔!', '氫(H)是第 1 號元素,宇宙裡最多的就是它!'],
    en: ['Tap a square to see its atom!', 'Tap a color tag to find a whole family - with a little story!', 'Hydrogen (H) is number 1 - the most common element in the universe!'],
  },
  atom: {
    zh: ['紅球是質子,灰球是中子,藍球是電子!', '拖曳可以轉動原子,右邊的滑桿可以放大縮小。', '黃球是最外層電子,它們決定這個元素愛跟誰牽手!', '點「原子序」「原子量」旁邊的小圖示,有簡單的說明喔!'],
    en: ['Red = proton, gray = neutron, blue = electron!', 'Drag to spin the atom. Use the slider to zoom!', 'Yellow balls are the outer electrons - they decide who the atom holds hands with!', 'Tap the little info icons for simple explanations!'],
  },
  cloud: {
    zh: ['按「拍照」,電子可能出現的地方會亮一個點!', '拍越多張,雲的形狀就越清楚,不同的能階形狀不一樣喔!', '電子不是繞圈圈的小球,而是一團機率的雲!'],
    en: ['Tap "Snap" and a dot lights up where the electron might be!', 'The more you snap, the clearer the shape!', 'An electron is not a little ball going round - it is a cloud of probability!'],
  },
  matter: {
    zh: ['拉動滑桿加熱或冷卻,看看分子怎麼動!', '變成冰、水、水蒸氣,每個分子都還是 H₂O 喔!', '正在融化或沸騰的時候,溫度會停住不上升。', '判斷物理還是化學變化:有沒有產生新的物質?'],
    en: ['Drag the slider to heat or cool and watch the molecules!', 'Ice, water and steam: every molecule is still H2O!', 'While melting or boiling, the temperature stops rising.', 'Physical or chemical? Ask: is a new substance made?'],
  },
  nucleus: {
    zh: ['紅球是質子,灰球是中子。質子數一樣、中子數不一樣的,就是同位素!', '按「看它變身」,看看不穩定的原子核會發生什麼事!', '半衰期:一大堆原子裡,有一半變身掉所要的時間。', '點上面的數字,換一種同位素看看!'],
    en: ['Red = proton, gray = neutron. Same protons, different neutrons: isotopes!', 'Press "Watch it change" to see what an unstable nucleus does!', 'Half-life: the time for half of a big pile of atoms to change.', 'Tap a number above to try another isotope!'],
  },
  gallery: {
    zh: ['用手指或滑鼠拖曳可以旋轉,點一下原子它會彈跳喔!', '試試切換「球棍模型」和「空間填充」,長得不一樣呢!', '點右邊的名字,認識生活中的分子!'],
    en: ['Drag to rotate, and tap an atom to make it bounce!', 'Try switching between ball-and-stick and space-filling!', 'Pick a name on the right to meet everyday molecules!'],
  },
  lab: {
    zh: ['點下方的原子加進來,把它們拖到一起就會牽手!', 'H 想牽 1 隻手,O 想牽 2 隻手,N 想牽 3 隻手,C 想牽 4 隻手喔!', '黃色光圈表示「還想牽手」。做錯了沒關係,用剪刀剪開再試一次!'],
    en: ['Tap atoms below, then drag them together to hold hands!', 'H wants 1 hand, O wants 2, N wants 3, and C wants 4!', 'A yellow glow means "still wants a hand". Made a mistake? Use the scissors!'],
    'zh@teen': ['點下方的原子加進來,把它們拖到一起就會形成共價鍵!', 'H 能形成 1 個鍵,O 能形成 2 個,N 能形成 3 個,C 能形成 4 個。', '黃色光圈表示這個原子還能再形成鍵。做錯了沒關係,用剪刀拆開再試一次!'],
    'zh@high': ['選取原子並拖曳靠近,依價電子數形成共價鍵。', '常見價數:H 1、O 2、N 3、C 4(八隅體規則;H 為二隅體)。', '黃色光圈表示價數尚未飽和;可用剪刀斷鍵後重新組合。'],
    'en@teen': ['Tap atoms below, then drag them together to form covalent bonds!', 'H forms 1 bond, O forms 2, N forms 3 and C forms 4.', 'A yellow glow means the atom can still form a bond. Made a mistake? Use the scissors to break bonds!'],
    'en@high': ['Select atoms and drag them together; bonds form according to valence electrons.', 'Usual valences: H 1, O 2, N 3, C 4 (octet rule; duet for H).', 'A yellow glow marks unsaturated valence; break bonds with the scissors to reassemble.'],
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


const reduced = false;   // 不理會系統的「減少動態效果」(遠端桌面常會自動開啟),動畫照常呈現

let bar, bubble, body, scene = 'table', holdTimer, holding = false, asleep = false, lastMove = Date.now();
const idx = {};

function show(html) {
  bubble.classList.remove('swap'); void bubble.offsetWidth;
  bubble.innerHTML = html; bubble.classList.add('swap');
}
/** 顯示該頁目前這一句提示(advance=true 換下一句) */
function tip(advance) {
  const list = TIPS[scene]?.[`${state.lang}@${getLevel()}`] || TIPS[scene]?.[state.lang] || TIPS[scene]?.zh;
  if (!list) return;
  if (advance) idx[scene] = ((idx[scene] ?? -1) + 1) % list.length;
  const s = list[idx[scene] ?? (idx[scene] = 0)];
  show(render(s));
  if (advance && body && !asleep) setMood(body, 'talk', talkMs(s));
}
/** 臨時說一句話(慶祝等),幾秒後回到該頁提示 */
const talkMs = s => Math.max(1200, Math.min(3500, String(s).length * 70));
function say(text, ms = 5000, mood = 'talk') {
  clearTimeout(holdTimer);
  if (body) setMood(body, mood, mood === 'talk' ? talkMs(text) : 2400);
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
  bar.innerHTML = `<button class="m-body" aria-label="原子小博士"></button><div class="m-bubble"></div>`;
  body = bar.querySelector('.m-body'); mountFace(body);
  bubble = bar.querySelector('.m-bubble');

  body.onclick = () => { act('jump'); clearTimeout(holdTimer); holding = false; tip(true); };

  // 眼睛跟著指標走
  const wake = () => {
    lastMove = Date.now();
    if (asleep) { asleep = false; bar.classList.remove('sleep'); act('jump'); say(state.lang === 'zh' ? '哈啾~我醒啦!' : 'Yawn... I am awake!', 2500); setMood(body, 'wow', 900); }
  };
  trackPupils(body);
  addEventListener('pointermove', wake, { passive: true });
  addEventListener('pointerdown', wake, { passive: true });
  addEventListener('keydown', wake);

  // 閒著時:偶爾跳一下、轉圈,每 14 秒換一句提示;45 秒沒人操作就睡著
  setInterval(() => {
    if (document.hidden) return;
    if (!asleep && Date.now() - lastMove > 45000) { asleep = true; bar.classList.add('sleep'); show('Zzz… Zzz…'); setMood(body, 'sleep'); return; }
    if (asleep) return;
    if (holding) return;
    if (!reduced) { const r = Math.random(); if (r < 0.35) act('jump'); else if (r < 0.5) act('twirl'); }
    tip(true);
  }, 14000);

  // 沒在說話時,偶爾眨單眼、露出驚訝的表情,讓他看起來是活的
  setInterval(() => {
    if (document.hidden || asleep || holding || body.dataset.mood !== 'happy') return;
    const r = Math.random();
    if (r < 0.45) setMood(body, 'wink', 500); else if (r < 0.6) setMood(body, 'wow', 900);
  }, 4500);

  // 回應遊戲事件
  addEventListener('mascot', e => {
    const t = e.detail?.type, lang = state.lang;
    if (t === 'cheer') { act('twirl'); say(e.detail.text || pick(PRAISE[lang] || PRAISE.zh), e.detail.text ? 8000 : 4000, 'cheer'); }
    else if (t === 'say') say(e.detail.text, e.detail.ms || 7000);
    else if (t === 'oops') say(pick(OOPS[lang] || OOPS.zh), 4000, 'oops');
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
