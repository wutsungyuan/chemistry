// 實驗動畫播放器(故事頁用):按「看實驗動畫」才下載引擎(anim/engine.js),在卡片裡畫 3D 動畫、字幕(國小有注音)、播放控制與步驟列。
// 字幕、步驟名稱跟著 App 的語言;離開頁面、換語言(換語言時整頁會重新建立)、畫面捲出視窗都會釋放或暫停,一次只會有一個 3D 畫面。
import { T, render, state } from '../i18n/index.js';
import { EXPERIMENTS } from '../data/experiments.js';
import { SCENE_LOADERS } from './registry.js';

/** 這個裝置能不能畫 3D(不能就不顯示動畫卡片,故事照常能看) */
export function canAnimate() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** 動畫卡片(尚未載入):一個海報按鈕。實際播放由 startAnim 做。 */
export function animPosterHTML(key) {
  const e = EXPERIMENTS[key];
  return `<div class="anim-card" data-key="${key}"><button class="anim-poster" type="button"><span class="ap-ico">🎬</span><span class="ap-txt">${T('anim.watch')}</span><span class="ap-sub">${render(state.lang === 'en' ? e.titleEn : e.titleZh)}</span></button><p class="anim-note">${T('anim.note')}</p></div>`;
}

const plain = k => T(k).replace(/<[^>]*>/g, '').replace(/"/g, '&quot;');   // 給 aria-label 用(T() 在國小版會帶注音的 HTML)
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

/** 在 card 裡建立播放器並開始播放;回傳 { dispose } */
export async function startAnim(card, key) {
  card.classList.add('on');
  card.innerHTML = `<p class="anim-loading">${T('anim.loading')}</p>`;
  let mod;
  let build = null;
  try { mod = await import('./engine.js'); if (SCENE_LOADERS[key]) build = (await SCENE_LOADERS[key]()).build; } catch (e) { card.innerHTML = `<p class="anim-note">${T('anim.error')}</p>`; throw e; }
  card.innerHTML = `<div class="anim-stage" role="img"></div>
    <div class="anim-leg"></div>
    <div class="anim-cap" aria-live="polite"></div>
    <div class="anim-bar"><button class="anim-play" type="button" aria-label="${plain('anim.playpause')}">⏸</button><button class="anim-re" type="button" aria-label="${plain('anim.replay')}">↻</button><button class="anim-full" type="button" aria-label="${plain('anim.full')}">⛶</button><input class="anim-seek" type="range" min="0" max="1000" value="0" aria-label="${plain('anim.seek')}"><span class="anim-tm"></span></div>
    <div class="anim-steps"></div><p class="anim-note">${T('anim.note')}</p>`;
  const q = s => card.querySelector(s), stage = q('.anim-stage'), cap = q('.anim-cap'), leg = q('.anim-leg'), play = q('.anim-play'), seek = q('.anim-seek'), tm = q('.anim-tm'), stepsEl = q('.anim-steps');
  let sig = '', dragging = false, lastTm = '';
  const onFrame = (info, eng) => {
    const s = info.k + '|' + info.lang + '|' + state.zhuyin;
    if (s !== sig) {                                          // 步驟、語言或注音改變才重畫文字(注音很貴,不要每格都重畫)
      sig = s; const st = eng.steps();
      cap.innerHTML = render(st[info.k].cap); leg.innerHTML = render(eng.legend()); stage.setAttribute('aria-label', eng.title().replace(/^[^p{L}p{N}]+/u, ''));
      stepsEl.innerHTML = st.map((x, i) => `<button type="button" class="${i === info.k ? 'on' : ''}${x.io ? ' io' : ''}" style="flex:${x.d}" data-i="${i}">${esc(x.n)}</button>`).join('');
    }
    play.textContent = info.playing ? '⏸' : '▶';
    const t = fmt(info.t) + ' / ' + fmt(info.total); if (t !== lastTm) { lastTm = t; tm.textContent = t; }
    if (!dragging) seek.value = Math.round(info.t / info.total * 1000);
  };
  let eng;
  try { eng = mod.createEngine(stage, EXPERIMENTS, { key, lang: state.lang, build, quality: new URLSearchParams(location.search).get('animq'), hooks: { onFrame } }); }
  catch (e) { card.innerHTML = `<p class="anim-note">${T('anim.error')}</p>`; throw e; }
  eng.canvas.__api = eng;                                     // 給 E2E 測試用
  play.onclick = () => eng.toggle(); q('.anim-re').onclick = () => eng.replay();
  // 放大模式(劇院模式):動畫撐滿整個視窗,畫面比例跟著視窗(直式、橫式、桌機都可以);Esc 或再按一次離開
  // 放大時把卡片搬到 <body>(父層如果有 transform,position:fixed 會被困在父層裡),原位留一個同高的佔位;離開時搬回來。
  let holder = null;
  const setFull = on => {
    if (on && !holder) { holder = document.createElement('div'); holder.style.height = card.offsetHeight + 'px'; card.replaceWith(holder); document.body.appendChild(card); }
    else if (!on && holder) { holder.replaceWith(card); holder = null; }
    card.classList.toggle('full', on); document.documentElement.classList.toggle('anim-lock', on); fullBtn.textContent = on ? '✕' : '⛶';
    if (on) document.addEventListener('keydown', onKey); else { document.removeEventListener('keydown', onKey); card.scrollIntoView({ block: 'center' }); }
    eng.resize();
  };
  const onKey = ev => { if (ev.key === 'Escape') setFull(false); };
  const fullBtn = q('.anim-full'); fullBtn.onclick = () => setFull(!card.classList.contains('full'));
  seek.oninput = () => { dragging = true; eng.seek(seek.value / 1000); }; seek.onchange = () => { dragging = false; };
  stepsEl.onclick = ev => { const b = ev.target.closest('button[data-i]'); if (b) { eng.seekTime(eng.stepStart(+b.dataset.i)); eng.play(); } };
  let vis = true, inView = true;
  const sync = () => eng.setActive(vis && inView);
  const onVis = () => { vis = document.visibilityState === 'visible'; sync(); };
  document.addEventListener('visibilitychange', onVis);
  const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(es => { inView = es[0].isIntersecting; sync(); }, { threshold: 0.05 }) : null; io?.observe(card);
  eng.play();
  return { eng, dispose() { if (holder) { card.remove(); holder.remove(); holder = null; } document.documentElement.classList.remove('anim-lock'); document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis); io?.disconnect(); eng.dispose(); } };
}
