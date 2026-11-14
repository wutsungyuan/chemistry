import { T, L, LH, render, state, formulaHTML } from '../i18n/index.js';
import { STORIES, STORY_BY_ID } from '../data/stories.js';
import { BY_SYMBOL } from '../data/elements.js';
import { ILLUS } from '../data/storyArt.js';
import { speak, canSpeak, stopSpeaking } from '../ui/speech.js';

// 化學故事(國小版):列表 → 一則故事(朗讀、安全提醒、三選一小問題、連到元素與圖鑑)。
// 網址:#stories(列表)、#stories/fire(單一故事)。資料見 data/db/stories.json。
const ICON = { fire: '🔥', iron: '🛠️', phosphorus: '✨', lavoisier: '⚖️', soda: '🫧', salt: '🧂', soap: '🧼', mendeleev: '🃏', curie: '☢️', fireworks: '🎆' };
const LETTERS = 'ABC';

export function mount(container, arg, { go }) {
  const page = document.createElement('div');
  page.className = 'page';
  container.appendChild(page);
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
    const say = [L(s.title), ...body, s.safety ? L(s.safety) : ''].filter(Boolean).join('\n');
    const idx = STORIES.findIndex(x => x.id === s.id), nxt = STORIES[(idx + 1) % STORIES.length];
    const els = s.elements.map(sym => BY_SYMBOL[sym]).filter(Boolean);
    const links = [...els.map(e => `<button class="chip" data-atom="${e.z}">${e.sym} ${LH(e.name)}</button>`), ...s.molecules.map(m => `<button class="chip" data-mol="${m}">${formulaHTML(m)}</button>`)].join('');
    page.innerHTML = `<article class="quiz story">
      <button class="btn alt" id="back">← ${T('stories.back')}</button>
      <h2>${ICON[s.id] || '📖'} ${LH(s.title)}</h2>
      <figure class="story-art">${ILLUS[s.id] || ''}</figure>
      ${canSpeak() ? `<button class="btn" id="say">🔊 ${T('stories.say')}</button>` : ''}
      ${body.map(p => `<p class="story-p">${render(p)}</p>`).join('')}
      ${s.safety ? `<p class="story-safety">⚠️ ${LH(s.safety)}</p>` : ''}
      <div class="story-q"><h3>${T('stories.quiz')}</h3><div class="q">${LH(s.quiz.q)}</div>
        <div class="opts">${s.quiz.options.map((o, i) => `<button data-i="${i}">${LETTERS[i]}. ${LH(o)}</button>`).join('')}</div>
        <div class="story-fb" aria-live="polite"></div></div>
      ${links ? `<h3>${T('stories.links')}</h3><div class="story-links">${links}</div>` : ''}
      <button class="btn alt" id="next">${T('stories.next')} →</button></article>`;
    page.querySelector('#back').onclick = () => go('stories');
    page.querySelector('#next').onclick = () => go('stories', nxt.id);
    page.querySelector('#say')?.addEventListener('click', () => speak(say, 'story-' + s.id));
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
  return { dispose() { stopSpeaking(); page.remove(); } };
}
