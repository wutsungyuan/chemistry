import './style.css';
import './mobile.css';
import './themes.css';
import { mountDeco } from './ui/deco.js';
import { mountMascot, mascotScene } from './ui/mascot.js';
import { T, state, setLang, onLangChange } from './i18n/index.js';
import { applyLevel, sceneAllowed } from './ui/level.js';
import { initLayout } from './ui/layout.js';
import * as PeriodicTable from './scenes/PeriodicTable.js';
import * as AtomView from './scenes/AtomView.js';
import * as MoleculeGallery from './scenes/MoleculeGallery.js';
import * as MoleculeLab from './scenes/MoleculeLab.js';
import * as ReactionTheater from './scenes/ReactionTheater.js';
import * as Quiz from './scenes/Quiz.js';
import * as ElectronCloud from './scenes/ElectronCloud.js';
import * as NuclearView from './scenes/NuclearView.js';
import * as MatterView from './scenes/MatterView.js';
import * as Stories from './scenes/Stories.js';

const SCENES = { table: PeriodicTable, atom: AtomView, gallery: MoleculeGallery, lab: MoleculeLab, reaction: ReactionTheater, quiz: Quiz, cloud: ElectronCloud, nucleus: NuclearView, matter: MatterView, stories: Stories };
const NAV = [['table', 'nav.table', '🧪'], ['gallery', 'nav.gallery', '🔬'], ['lab', 'nav.lab', '⚗️'], ['matter', 'nav.matter', '🧊'], ['reaction', 'nav.reaction', '🔥'], ['stories', 'nav.stories', '📖'], ['quiz', 'nav.quiz', '🎯']];

const app = document.getElementById('app');
let current = null, name = 'table', arg = null;

function go(n, a = null) {
  current?.dispose?.();
  app.innerHTML = '';
  name = n; arg = a;
  current = SCENES[n].mount(app, a, { go });
  renderChrome();
  mascotScene(n);
  history.replaceState(null, '', `#${n}${a != null ? '/' + a : ''}`);
}

function renderChrome() {
  document.documentElement.lang = state.lang === 'zh' ? 'zh-Hant' : 'en';
  document.title = state.lang === 'zh' ? '兒童化學樂園' : 'Kids Chemistry Park';
  document.getElementById('brand').innerHTML = T('brand');
  const nav = document.getElementById('nav');
  nav.innerHTML = '';
  NAV.filter(([key]) => sceneAllowed(key)).forEach(([key, label, icon]) => {          // 國小版沒有分子實驗室與反應劇場
    const b = document.createElement('button');
    b.innerHTML = `<span class="ico">${icon}</span><span class="lbl">${T(label)}</span>`;
    if (key === name || (key === 'table' && (name === 'atom' || name === 'cloud' || name === 'nucleus'))) b.classList.add('active');
    b.onclick = () => go(key);
    nav.appendChild(b);
  });
  document.getElementById('btn-level').innerHTML = T('tool.level');
  document.getElementById('btn-lang').textContent = state.lang === 'zh' ? 'English' : '中文';
}

// 換版本:回入口頁(landing.html?change=1,不會自動跳回)
document.getElementById('btn-level').onclick = () => { location.href = './landing.html?change=1'; };
document.getElementById('btn-lang').onclick = () => setLang(state.lang === 'zh' ? 'en' : 'zh');
// 語言變更 → 重新載入目前頁面(實驗室進度已存檔)
onLangChange(() => go(name, arg));

function fromHash() {
  const [h, a] = location.hash.slice(1).split('/');
  return [SCENES[h] && sceneAllowed(h) ? h : 'table', a ? (isNaN(+a) ? a : +a) : null];     // 該階段沒有的頁面 → 回週期表
}
// 支援瀏覽器上一頁/下一頁與直接改網址
addEventListener('hashchange', () => {
  const [n, a] = fromHash();
  if (n !== name || a !== arg) go(n, a);
});
applyLevel();
initLayout();
mountDeco();
mountMascot();
go(...fromHash());
