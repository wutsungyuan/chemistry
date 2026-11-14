import { T, L, LH, render, state, formulaHTML } from '../i18n/index.js';
import { STORIES, STORY_BY_ID } from '../data/stories.js';
import { BY_SYMBOL } from '../data/elements.js';
import { ILLUS } from '../data/storyArt.js';
import { speak, canSpeak, stopSpeaking } from '../ui/speech.js';
import { prepare, keepInView } from '../ui/readalong.js';
import { EXPERIMENT_BY_STORY } from '../data/experiments.js';
import { canAnimate, animPosterHTML, startAnim } from '../anim/player.js';

// 化學故事(國小版):列表 → 一則故事(朗讀、安全提醒、三選一小問題、連到元素與圖鑑)。
// 網址:#stories(列表)、#stories/fire(單一故事)。資料見 data/db/stories.json。
const ICON = { fire: '🔥', iron: '🛠️', phosphorus: '✨', lavoisier: '⚖️', soda: '🫧', salt: '🧂', soap: '🧼', mendeleev: '🃏', curie: '☢️', fireworks: '🎆', photosynthesis: '🌱', bread: '🍞', carbon: '💎', helium: '🎈', ice: '🧊', gold: '🥇', air: '🌬️', dryice: '☁️', cabbage: '🥬', fluoride: '🪥' };
const LETTERS = 'ABC';

export function mount(container, arg, { go }) {
  const page = document.createElement('div');
  page.className = 'page';
  container.appendChild(page);
  let player = null;                                          // 實驗動畫播放器(有按下「看實驗動畫」才會有)
  const story = typeof arg === 'string' ? STORY_BY_ID[arg] : null;

  function list() {
    page.innerHTML = `<div class="quiz story-list">
      <h2>📖 ${T('stories.title')}</h2><p>${T('stories.lead')}</p>
      <div class="story-cards">${STORIES.map(s => `<button class="story-card" data-id="${s.id}"><span class="si">${ILLUS[s.id] || ICON[s.id] || '📖'}</span><span class="st">${LH(s.title)}</span></button>`).join('')}</div>
      <p class="story-note">${T('stories.note')}</p></div>`;
    page.querySelectorAll('[data-id]').forEach(b => { b.onclick = () => go('stories', b.dataset.id); });
  }

  function show(s) {
    const body = s.body[state.lang] ?? s.body.zh;
    const idx = STORIES.findIndex(x => x.id === s.id), nxt = STORIES[(idx + 1) % STORIES.length];
    const anim = canAnimate() ? EXPERIMENT_BY_STORY[s.id] : null;          // 這則故事有實驗動畫(而且這個裝置能畫 3D)
    const els = s.elements.map(sym => BY_SYMBOL[sym]).filter(Boolean);
    const links = [...els.map(e => `<button class="chip" data-atom="${e.z}">${e.sym} ${LH(e.name)}</button>`), ...s.molecules.map(m => `<button class="chip" data-mol="${m}">${formulaHTML(m)}</button>`)].join('');
    page.innerHTML = `<article class="quiz story">
      <button class="btn alt" id="back">← ${T('stories.back')}</button>
      <h2>${ICON[s.id] || '📖'} <span class="rd-seg">${LH(s.title)}</span></h2>
      <figure class="story-art">${ILLUS[s.id] || ''}</figure>
      ${canSpeak() ? `<button class="btn" id="say">🔊 ${T('stories.say')}</button>` : ''}
      ${body.map((p, i) => `<p class="story-p"><span class="rd-seg">${render(p)}</span></p>${anim && i + 1 === anim.afterPara ? animPosterHTML(anim.key) : ''}`).join('')}
      ${s.safety ? `<p class="story-safety">⚠️ <span class="rd-seg">${LH(s.safety)}</span></p>` : ''}
      <div class="story-q"><h3>${T('stories.quiz')}</h3><div class="q">${LH(s.quiz.q)}</div>
        <div class="opts">${s.quiz.options.map((o, i) => `<button data-i="${i}">${LETTERS[i]}. ${LH(o)}</button>`).join('')}</div>
        <div class="story-fb" aria-live="polite"></div></div>
      ${links ? `<h3>${T('stories.links')}</h3><div class="story-links">${links}</div>` : ''}
      <button class="btn alt" id="next">${T('stories.next')} →</button></article>`;
    const card = page.querySelector('.anim-card');
    card?.querySelector('.anim-poster').addEventListener('click', async () => { try { player = await startAnim(card, card.dataset.key); } catch (e) { console.warn('實驗動畫無法播放', e); } });
    page.querySelector('#back').onclick = () => go('stories');
    page.querySelector('#next').onclick = () => go('stories', nxt.id);
    // 朗讀 + 跟著唸:標題、每一段、安全提醒各是一段;念到哪個字,哪個字亮起來
    let readers = null;
    page.querySelector('#say')?.addEventListener('click', () => {
      readers ||= [...page.querySelectorAll('.rd-seg')].map(prepare);
      const gaps = readers.map((_, i) => (i === 0 ? 900 : 500));      // 標題後停久一點,段落之間也停一下
      const clearAll = () => readers.forEach(r => r.clear());
      speak(readers.map(r => r.text), 'story-' + s.id, gaps, {
        onLine: (i, a, b) => { clearAll(); keepInView(readers[i].line(a, b)); },
        onWord: (i, a, b) => { readers[i].mark(a, b); },
        onDone: clearAll,
      });
    });
    page.querySelectorAll('[data-atom]').forEach(b => { b.onclick = () => go('atom', +b.dataset.atom); });
    page.querySelectorAll('[data-mol]').forEach(b => { b.onclick = () => go('gallery', b.dataset.mol); });
    const fb = page.querySelector('.story-fb');
    page.querySelectorAll('.opts button').forEach(b => {
      b.onclick = () => {
        const o = s.quiz.options[+b.dataset.i];
        page.querySelectorAll('.opts button').forEach((x, k) => { x.disabled = true; if (s.quiz.options[k].ok) x.classList.add('right'); });
        if (!o.ok) b.classList.add('wrong');
        dispatchEvent(new CustomEvent('mascot', { detail: { type: o.ok ? 'cheer' : 'oops' } }));
        fb.innerHTML = `${o.ok ? '🎉 ' + T('stories.right') : '💪 ' + T('stories.wrong')}<br>${LH(s.quiz.explain)}`;
      };
    });
  }

  if (story) show(story); else list();
  return { dispose() { stopSpeaking(); player?.dispose(); page.remove(); } };
}
