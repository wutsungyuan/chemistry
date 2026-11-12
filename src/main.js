import './style.css';
import './mobile.css';
import { mountDeco } from './ui/deco.js';
import { mountMascot, mascotScene } from './ui/mascot.js';
import { T, state, setLang, setZhuyin, onLangChange } from './i18n/index.js';
import * as PeriodicTable from './scenes/PeriodicTable.js';
import * as AtomView from './scenes/AtomView.js';
import * as MoleculeGallery from './scenes/MoleculeGallery.js';
import * as MoleculeLab from './scenes/MoleculeLab.js';
import * as ReactionTheater from './scenes/ReactionTheater.js';
import * as Quiz from './scenes/Quiz.js';

const SCENES = { table: PeriodicTable, atom: AtomView, gallery: MoleculeGallery, lab: MoleculeLab, reaction: ReactionTheater, quiz: Quiz };
const NAV = [['table', 'nav.table', '🧪'], ['gallery', 'nav.gallery', '🔬'], ['lab', 'nav.lab', '⚗️'], ['reaction', 'nav.reaction', '🔥'], ['quiz', 'nav.quiz', '🎯']];

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
  NAV.forEach(([key, label, icon]) => {
    const b = document.createElement('button');
    b.innerHTML = `<span class="ico">${icon}</span><span class="lbl">${T(label)}</span>`;
    if (key === name || (key === 'table' && name === 'atom')) b.classList.add('active');
    b.onclick = () => go(key);
    nav.appendChild(b);
  });
  const z = document.getElementById('btn-zhuyin');
  z.innerHTML = T('tool.zhuyin');
  z.classList.toggle('on', state.zhuyin);
  z.style.display = state.lang === 'zh' ? '' : 'none';
  document.getElementById('btn-lang').textContent = state.lang === 'zh' ? 'English' : '中文';
}

document.getElementById('btn-zhuyin').onclick = () => setZhuyin(!state.zhuyin);
document.getElementById('btn-lang').onclick = () => setLang(state.lang === 'zh' ? 'en' : 'zh');
// 語言/注音變更 → 重新載入目前頁面(實驗室進度已存檔)
onLangChange(() => go(name, arg));

function fromHash() {
  const [h, a] = location.hash.slice(1).split('/');
  return [SCENES[h] ? h : 'table', a ? (isNaN(+a) ? a : +a) : null];
}
// 支援瀏覽器上一頁/下一頁與直接改網址
addEventListener('hashchange', () => {
  const [n, a] = fromHash();
  if (n !== name || a !== arg) go(n, a);
});
mountDeco();
mountMascot();
go(...fromHash());
