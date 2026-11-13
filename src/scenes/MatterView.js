import { T, Tp, L, LH, formulaText, state } from '../i18n/index.js';
import { getLevel } from '../ui/level.js';
import { levelChipsHTML, bindLevelChips } from '../ui/levelBar.js';
import { createParticleBox } from '../ui/particles.js';
import { SUBSTANCES, HEAT_VALID_MAX_C, substance, phases, stateAt, positionOf, heatNeeded, changeKind, pickRound } from '../data/matter.js';
import { update } from '../game/store.js';
import { toast } from '../ui/toast.js';

// 物質的變化:① 三態(高中再加電漿)與溫度:拉滑桿加熱/冷卻,看粒子怎麼動;② 物理變化還是化學變化?的判斷遊戲。
// 國小:只有水、三態、粒子動畫。國中:選物質、熔點沸點、加熱曲線(平台)、吸熱/放熱。高中:電漿、水的加熱能量、其他狀態。
const ROUND = 8;
const ROOM_C = 20;

export function mount(container, arg) {
  const wrap = document.createElement('div'); wrap.className = 'canvas-wrap';
  container.appendChild(wrap);
  const box = createParticleBox(wrap);
  const side = document.createElement('div'); side.className = 'side mat-side'; container.appendChild(side);

  let level = getLevel(), tab = arg === 'quiz' ? 'quiz' : 'states', sub = substance(SUBSTANCES.some(s => s.id === arg) ? arg : 'water');
  let s = 0, quiz = null;                                              // s:滑桿位置 0~1;quiz:{items, i, right, answer}
  const plasma = () => level === 'high';
  const cur = () => stateAt(sub, s, plasma());
  const resetSlider = () => { s = positionOf(sub, ROOM_C, plasma()); };
  resetSlider(); box.setGlyph(sub);

  // ---------- 畫面 ----------
  function render() {
    side.dataset.level = level; side.dataset.tab = tab;
    const tabs = ['states', 'quiz'].map(k => `<button class="chip${k === tab ? ' on' : ''}" data-tab="${k}">${T('matter.tab.' + k)}</button>`).join('');
    side.innerHTML = `<h2>🧊 ${T('matter.title')}</h2>
      <div class="cl-bar">${levelChipsHTML(level)}</div><div class="cl-bar mat-tabs">${tabs}</div>
      <section class="mat-body">${tab === 'states' ? statesHTML() : quizHTML()}</section>`;
    bindLevelChips(side, l => { level = l; if (level === 'kid') sub = substance('water'); box.setGlyph(sub); resetSlider(); quiz = null; render(); });
    side.querySelectorAll('[data-tab]').forEach(b => { b.onclick = () => { tab = b.dataset.tab; if (tab === 'quiz' && !quiz) newRound(); render(); }; });
    if (tab === 'states') bindStates(); else bindQuiz();
  }

  // ----- ① 三態與溫度 -----
  function statesHTML() {
    const chips = level === 'kid' ? '' : `<div><b>${T('matter.pick')}</b><div class="mat-subs">${SUBSTANCES.map(x => `<button class="chip${x.id === sub.id ? ' on' : ''}" data-sub="${x.id}">${LH(x.name)}</button>`).join('')}</div></div>`;
    const table = level === 'kid' ? '' : `<div class="mat-box"><b>${T('matter.table.t')}</b><div class="mat-kinds">${[['solid', 'liquid'], ['liquid', 'solid'], ['liquid', 'gas'], ['gas', 'liquid'], ['solid', 'gas'], ['gas', 'solid']].map(([a, b]) => { const k = changeKind(a, b); return `<span>${T('matter.kind.' + k.kind)} <em class="${k.heat}">${T('matter.' + (k.heat === 'absorb' ? 'absorb' : 'release'))}</em></span>`; }).join('')}</div><p class="mat-note">${T('matter.table.note')}</p></div>`;
    const info = level === 'kid' ? '' : `<p>${sub.sub != null ? T('matter.sub', { t: sub.sub }) : T('matter.mpbp', { mp: sub.mp, bp: sub.bp })}</p>`;
    return `<p class="mat-lead">${T('matter.lead.' + level)}</p>${chips}${info}
      <label class="mat-slider">${T('matter.slider')}<input type="range" min="0" max="1000" step="1" value="${Math.round(s * 1000)}" aria-label="${Tp('matter.slider')}"></label>
      ${marksHTML()}
      <div class="mat-read"></div>
      ${level !== 'kid' ? `<div class="mat-box"><b>${T('matter.curve.t')}</b><div class="mat-curve"></div><p class="mat-note">${T('matter.curve.note')}</p></div>` : ''}
      ${table}<div class="mat-energy"></div>
      ${level === 'high' ? `<p class="mat-note">${T('matter.plasma.rough')}</p><p class="mat-note">${T('matter.others')}</p>` : ''}
      <p class="mat-note">${T('matter.honest')}</p><p class="mat-src">${T('matter.source')}</p>`;
  }
  /** 滑桿下面標出「變化點」(熔點/沸點/升華點/電漿)的位置和溫度,不用猜在哪裡會變 */
  function marksHTML() {
    const ph = phases(sub, plasma()), n = ph.length;
    const marks = ph.slice(0, -1).map((p, k) => {
      const kind = changeKind(p.phase, ph[k + 1].phase).kind;
      const key = { melt: 'mp', vaporize: 'bp', sublime: 'sub', ionize: 'plasma' }[kind];
      const c = key === 'plasma' ? '≈' + Math.round(p.hi) : String(Math.round(p.hi * 10) / 10);
      const e = (k + 1) / n;
      return `<div class="mat-mark" style="left:calc(${(e * 100).toFixed(2)}% + ${((0.5 - e) * 24).toFixed(1)}px)"><i></i><span>${T('matter.mark.' + key)}</span>${key === 'mp' ? `<span class="alt">${T('matter.mark.mp2')}</span>` : ''}<span>${c} °C</span></div>`;
    });
    return `<div class="mat-marks">${marks.join('')}</div>`;
  }
  function bindStates() {
    side.querySelectorAll('[data-sub]').forEach(b => { b.onclick = () => { sub = substance(b.dataset.sub); box.setGlyph(sub); resetSlider(); render(); }; });
    side.querySelector('.mat-slider input').oninput = e => { s = e.target.value / 1000; paint(); };
    paint();
  }
  /** 滑桿動的時候只更新讀數、曲線上的點、粒子(不重畫整個面板,才不會打斷拖曳) */
  function paint() {
    const st = cur(), ph = phases(sub, plasma()), idx = ph.findIndex(p => p.phase === st.phase), p0 = ph[idx];
    box.setState({ phase: st.phase, to: st.to, progress: st.progress, heat: st.to ? 1 : (st.tempC - p0.lo) / (p0.hi - p0.lo) });
    const f = formulaText(sub.formula), tc = Math.round(st.tempC * 10) / 10;
    const kind = st.to ? changeKind(st.phase, st.to) : null;
    const name = st.to ? T('matter.kind.' + kind.kind) : '';
    side.querySelector('.mat-read').innerHTML = `
      <div class="mat-phase"><span>${T('matter.now')}</span> <span class="ph ph-${st.phase}">${T('matter.phase.' + st.phase)}</span>${st.to ? ` → <span class="ph ph-${st.to}">${T('matter.phase.' + st.to)}</span>` : ''}</div>
      <div class="mat-temp">${T('matter.temp', { c: tc })}${level === 'high' ? ' ' + T('matter.kelvin', { k: Math.round(st.tempC + 273.15) }) : ''}</div>
      <p>${st.to ? `<b>${T('matter.changing', { name: Tp('matter.kind.' + kind.kind), pct: Math.round(st.progress * 100) })}</b> <em class="${kind.heat}">${T('matter.' + kind.heat)}</em>` : T('matter.desc.' + st.phase)}</p>
      ${st.to && level !== 'kid' ? `<p class="mat-plateau">${T('matter.plateau', { c: tc })}</p>` : ''}
      ${st.phase === 'plasma' || st.to === 'plasma' ? '' : `<p class="mat-note">${T('matter.same', { f })}</p>`}`;
    if (level !== 'kid') drawCurve(st);
    const e = level === 'high' ? heatNeeded(sub, st) : null;
    const hot = level === 'high' && sub.heat && !e && st.tempC > HEAT_VALID_MAX_C;
    side.querySelector('.mat-energy').innerHTML = hot ? `<p class="mat-note">${T('matter.energy.hot')}</p>` : e ? `<div class="mat-box"><p>${T('matter.energy', { j: Math.round(e.total) })}</p><ul>${e.parts.map(q => `<li>${T('matter.part.' + q.key)}:${Math.round(q.J)} J</li>`).join('')}</ul><p class="mat-note">${T('matter.energy.note')}</p></div>` : '';
  }
  /** 加熱曲線:橫軸是加熱的時間(大約),縱軸是溫度(每個狀態占一樣高,所以變化時的平台一目了然) */
  function drawCurve(st) {
    const ph = phases(sub, plasma()), n = ph.length, W = 240, H = 120, padL = 40, padR = 10, padT = 20, padB = 24;
    const X = x => padL + x * (W - padL - padR), Y = y => H - padB - y * (H - padB - padT);
    const yOf = x => { const q = stateAt(sub, x, plasma()), i = ph.findIndex(p => p.phase === q.phase); return (i + (q.tempC - ph[i].lo) / (ph[i].hi - ph[i].lo)) / n; };
    const pts = Array.from({ length: 101 }, (_, i) => { const x = i / 100; return `${X(x).toFixed(1)},${Y(yOf(x)).toFixed(1)}`; }).join(' ');
    const cx = X(s), cy = Y(yOf(s));
    // 縱軸的數字:每個狀態的交界溫度(平台就在這裡),加上最下面和最上面
    const fmt = c => String(Math.round(c));
    const ticks = [{ y: 0, c: ph[0].lo }, ...ph.map((p, k) => ({ y: (k + 1) / n, c: p.hi }))];
    const grid = ticks.map(t => `<line x1="${padL}" x2="${W - padR}" y1="${Y(t.y).toFixed(1)}" y2="${Y(t.y).toFixed(1)}" stroke="#fff" stroke-opacity="${t.y > 0 && t.y < 1 ? .28 : .15}" stroke-dasharray="${t.y > 0 && t.y < 1 ? '3 3' : ''}"/><text x="${padL - 4}" y="${(Y(t.y) + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#dfe6ff">${fmt(t.c)}</text>`).join('');
    const axes = `<line x1="${padL}" x2="${padL}" y1="${padT - 4}" y2="${H - padB}" stroke="#fff" stroke-opacity=".7"/><line x1="${padL}" x2="${W - padR + 4}" y1="${H - padB}" y2="${H - padB}" stroke="#fff" stroke-opacity=".7"/>`;
    const labels = `<text x="${padL - 4}" y="${padT - 9}" text-anchor="end" font-size="8.5" fill="#ffe9a8">${Tp('matter.curve.y')}</text><text x="${(padL + W - padR) / 2}" y="${H - 6}" text-anchor="middle" font-size="9" fill="#dfe6ff">${Tp('matter.curve.x')}</text>`;
    side.querySelector('.mat-curve').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${Tp('matter.curve.t')}">${grid}${axes}${labels}<polyline points="${pts}" fill="none" stroke="#7aa2ff" stroke-width="2.2"/><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="5" fill="#ffd23f" stroke="#fff" stroke-width="1.5"/></svg>`;
  }

  // ----- ② 物理變化還是化學變化? -----
  function newRound() { quiz = { items: pickRound(level, ROUND), i: 0, right: 0, answer: null }; }
  function quizHTML() {
    if (!quiz) newRound();
    const q = quiz, c = q.items[q.i];
    if (q.i >= q.items.length) {
      return `<p class="mat-lead">${T('matter.quiz.done', { r: q.right, n: q.items.length })}</p><div class="mat-row"><button class="btn" data-q="again">↺ ${T('matter.quiz.again')}</button></div><p class="mat-note">${T('matter.quiz.note')}</p>`;
    }
    const ans = q.answer, ok = ans && ans === c.answer;
    return `<p class="mat-note">${T('matter.quiz.rule')}</p>
      <div class="mat-card"><small>${T('matter.quiz.q', { i: q.i + 1, n: q.items.length })}</small><p class="mat-q">${LH(c.text)}</p></div>
      <div class="mat-row">${['physical', 'chemical'].map(k => `<button class="btn${ans ? (k === c.answer ? ' good' : k === ans ? ' bad' : ' alt') : ''}" data-a="${k}"${ans ? ' disabled' : ''}>${T('matter.quiz.' + k)}</button>`).join('')}</div>
      ${ans ? `<div class="mat-fb ${ok ? 'ok' : 'no'}"><b>${ok ? '✅ ' + T('matter.quiz.right') : '❌ ' + T('matter.quiz.wrong', { ans: Tp('matter.quiz.' + c.answer) })}</b><p>${LH(c.why)}</p><p class="mat-clue">🔎 ${T('matter.quiz.clue.' + c.answer)}</p>
        <button class="btn" data-q="next">➜ ${T(q.i + 1 >= q.items.length ? 'matter.quiz.finish' : 'matter.quiz.next')}</button></div>` : ''}`;
  }
  function bindQuiz() {
    box.setState({ phase: 'liquid', to: null, progress: 0, heat: 0.5 });      // 小測驗時背景放一杯水
    side.querySelectorAll('[data-a]').forEach(b => {
      b.onclick = () => {
        const c = quiz.items[quiz.i]; quiz.answer = b.dataset.a;
        const right = quiz.answer === c.answer; if (right) quiz.right++;
        update(d => { if (right) d.changeRight = (d.changeRight || 0) + 1; }).forEach(bd => toast(`${bd.icon} ${Tp('badge.new')}${L(bd.name)}`));
        render();
      };
    });
    side.querySelector('[data-q=next]')?.addEventListener('click', () => { quiz.i++; quiz.answer = null; render(); });
    side.querySelector('[data-q=again]')?.addEventListener('click', () => { newRound(); render(); });
  }

  render();
  return { dispose() { box.dispose(); wrap.remove(); side.remove(); } };
}
