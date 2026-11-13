import { badgesFor, update, progress, badgeIds, badgeName } from '../game/store.js';
import { T, Tp, L, render } from '../i18n/index.js';
import { toast } from '../ui/toast.js';
import { colorKey } from '../ui/spectrum.js';
import { makeQuestion } from '../game/questions.js';
import { getLevel } from '../ui/level.js';

export function mount(container) {
  const page = document.createElement('div');
  page.className = 'page';
  container.appendChild(page);
  let streak = 0, score = 0, asked = 0, qn = null;

  function badgesHTML() {
    const got = new Set(badgeIds());
    return `<div class="badges">${badgesFor(getLevel()).map(b => `<span class="badge ${got.has(b.id) ? 'got' : ''}" title="${L(b.desc).replace(/"/g, '&quot;')}">${got.has(b.id) ? b.icon : '🔒'} ${render(L(badgeName(b, getLevel())))}</span>`).join('')}</div>`;
  }

  function next() {
    qn = makeQuestion(getLevel());
    const p = progress();
    const qHtml = qn.q.block
      ? `${T(qn.q.key)}<div class="quiz-spec">${qn.q.block}</div>`
      : qn.q.raw
      ? `${render(qn.q.raw)}<br><small>${T(qn.q.key)}</small>`
      : qn.q.html
        ? `${T(qn.q.key)} <b style="font-size:2rem">${qn.q.html}</b>`
        : T(qn.q.key, qn.q.vars);
    page.innerHTML = `<div class="quiz">
      <div>🔥 ${T('quiz.streak')} <b>${streak}</b> &nbsp; ⭐ ${T('quiz.score')} <b>${score}/${asked}</b> &nbsp; 🏅 ${T('quiz.best')} <b>${p.bestStreak}</b></div>
      <div class="q">${qHtml}</div>
      <div class="opts">${qn.opts.map((o, i) => `<button data-i="${i}">${o.html}</button>`).join('')}</div>
      <div id="fb" style="margin-top:14px;min-height:2em"></div>
      <h3>${T('quiz.badges')}</h3>${badgesHTML()}</div>`;
    page.querySelectorAll('.opts button').forEach(b => { b.onclick = () => answer(+b.dataset.i, b); });
  }
  function answer(i, btn) {
    const o = qn.opts[i];
    asked++;
    page.querySelectorAll('.opts button').forEach((b, k) => { b.disabled = true; if (qn.opts[k].ok) b.classList.add('right'); });
    const fb = page.querySelector('#fb');
    if (o.ok) {
      streak++; score++;
      fb.innerHTML = `🎉 ${T('quiz.right')}`;
      dispatchEvent(new CustomEvent('mascot', { detail: { type: 'cheer' } }));
      const news = update(d => { d.quizRight++; d.bestStreak = Math.max(d.bestStreak, streak); if (qn.kind === 'spectrum') d.spectrumRight++; });
      news.forEach(b => toast(`${b.icon} ${Tp('badge.new')}${L(badgeName(b, getLevel()))}`, 3000));
    } else {
      btn.classList.add('wrong'); streak = 0;
      dispatchEvent(new CustomEvent('mascot', { detail: { type: 'oops' } }));
      fb.innerHTML = `💪 ${T('quiz.wrong')} <b>${render(qn.answerText)}</b>`;
    }
    if (qn.kind === 'spectrum') fb.innerHTML += `<br><small>${T('quiz.spec.hint', { nm: qn.brightest.toFixed(1), c: Tp(colorKey(qn.brightest)) })}</small><br>`;
    fb.innerHTML += ` <button class="btn" id="nx">${T('quiz.next')}</button>`;
    fb.querySelector('#nx').onclick = next;
  }
  next();
  return { dispose() { page.remove(); } };
}
