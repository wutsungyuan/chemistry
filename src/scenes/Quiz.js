import { ELEMENTS } from '../data/elements.js';
import { GALLERY } from '../data/molecules.js';
import { BADGES, update, progress, badgeIds } from '../game/store.js';
import { T, Tp, L, render, formulaHTML } from '../i18n/index.js';
import { toast } from '../ui/toast.js';
import { pick, shuffle } from '../ui/util.js';
import { SPECTRA } from '../data/generated/spectra.js';
import { spectrumSVG, colorKey } from '../ui/spectrum.js';
import { spectrumPool, makeSpectrumQuestion } from '../game/spectrumQuiz.js';

const COMMON = ELEMENTS.filter(e => e.fact);
const SPEC_POOL = spectrumPool(SPECTRA, ELEMENTS);
function distract(pool, correct, n, key) {
  const out = new Set([key(correct)]);
  const res = [correct];
  for (const x of shuffle(pool)) { if (res.length >= n) break; if (!out.has(key(x))) { out.add(key(x)); res.push(x); } }
  return shuffle(res);
}

function makeQuestion() {
  const kind = pick(['sym2name', 'name2sym', 'formula', 'count', 'fact', 'spectrum', 'spectrum']);
  if (kind === 'spectrum') {                                            // 光譜偵探:看光譜指紋,猜是哪個元素
    const s = makeSpectrumQuestion(SPEC_POOL, SPECTRA);
    return {
      kind, q: { key: 'quiz.q.spectrum', block: spectrumSVG(s.lines, { mode: 'emit', width: 360, height: 70, uid: 'qz' }) },
      opts: s.options.map(o => ({ html: `${o.sym} ${render(L(o.name))}`, ok: o === s.answer })), answerText: L(s.answer.name), brightest: s.brightest,
    };
  }
  if (kind === 'sym2name') {
    const e = pick(COMMON), opts = distract(COMMON, e, 4, x => x.sym);
    return { q: { key: 'quiz.q.sym2name', vars: { s: e.sym } }, opts: opts.map(o => ({ html: render(L(o.name)), ok: o === e })), answerText: L(e.name) };
  }
  if (kind === 'name2sym') {
    const e = pick(COMMON), opts = distract(COMMON, e, 4, x => x.sym);
    return { q: { key: 'quiz.q.name2sym', vars: { n: L(e.name) } }, opts: opts.map(o => ({ html: o.sym, ok: o === e })), answerText: e.sym };
  }
  if (kind === 'fact') {
    const e = pick(COMMON), opts = distract(COMMON, e, 4, x => x.sym);
    return { q: { raw: L(e.fact), key: 'quiz.q.fact' }, opts: opts.map(o => ({ html: `${o.sym} ${render(L(o.name))}`, ok: o === e })), answerText: L(e.name) };
  }
  if (kind === 'formula') {
    const m = pick(GALLERY.filter(x => !x.display && !x.extra)), opts = distract(GALLERY.filter(x => !x.display && !x.extra), m, 4, x => x.id);
    return { q: { key: 'quiz.q.formula', vars: {}, html: formulaHTML(m.formula) }, opts: opts.map(o => ({ html: render(L(o.name)), ok: o === m })), answerText: L(m.name) };
  }
  // count
  const m = pick(GALLERY.filter(x => x.atoms.length <= 12 && x.atoms.length >= 2 && !x.display && !x.extra));
  const syms = [...new Set(m.atoms.map(a => a[0]))];
  const s = pick(syms), n = m.atoms.filter(a => a[0] === s).length;
  const nums = shuffle([...new Set([n, n + 1, Math.max(1, n - 1), n + 2])]).slice(0, 4);
  if (!nums.includes(n)) nums[0] = n;
  return { q: { key: 'quiz.q.count', vars: { m: L(m.name), s } }, opts: shuffle(nums).map(x => ({ html: String(x), ok: x === n })), answerText: String(n) };
}

export function mount(container) {
  const page = document.createElement('div');
  page.className = 'page';
  container.appendChild(page);
  let streak = 0, score = 0, asked = 0, qn = null;

  function badgesHTML() {
    const got = new Set(badgeIds());
    return `<div class="badges">${BADGES.map(b => `<span class="badge ${got.has(b.id) ? 'got' : ''}" title="${L(b.desc).replace(/"/g, '&quot;')}">${got.has(b.id) ? b.icon : '🔒'} ${render(L(b.name))}</span>`).join('')}</div>`;
  }

  function next() {
    qn = makeQuestion();
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
      news.forEach(b => toast(`${b.icon} ${Tp('badge.new')}${L(b.name)}`, 3000));
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
