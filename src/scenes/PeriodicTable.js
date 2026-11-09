import { ELEMENTS, CATEGORIES } from '../data/elements.js';
import { isNarrow } from '../ui/layout.js';
import { T, L, LH, render } from '../i18n/index.js';
import { progress } from '../game/store.js';

export function mount(container, _arg, { go }) {
  const page = document.createElement('div');
  page.className = 'page';
  const seen = new Set(progress().elements);
  let filter = null;

  const wrap = document.createElement('div');
  wrap.className = 'pt-wrap';
  wrap.innerHTML = `<h2 style="margin:4px 0 8px">${T('pt.title')}</h2><p style="margin:0 0 10px;color:var(--muted)">${T('pt.sub')}</p>`;
  const legend = document.createElement('div');
  legend.className = 'pt-legend';
  Object.entries(CATEGORIES).forEach(([k, c]) => {
    const chip = document.createElement('span');
    chip.className = 'chip'; chip.style.background = c.color; chip.innerHTML = render(L(c));
    chip.onclick = () => { filter = filter === k ? null : k; apply(); };
    legend.appendChild(chip);
  });
  wrap.appendChild(legend);
  const info = document.createElement('div');
  info.className = 'tipbox cat-info';
  info.hidden = true;
  wrap.appendChild(info);

  const grid = document.createElement('div');
  grid.className = 'pt-grid';
  const cells = [], holders = [];
  ELEMENTS.forEach(e => {
    const b = document.createElement('button');
    b.className = 'el';
    b.style.setProperty('--c', CATEGORIES[e.cat].color);
    b.style.gridRow = e.row; b.style.gridColumn = e.col;
    b.innerHTML = `<span class="z">${e.z}</span><span class="sym">${e.sym}</span><span class="nm">${isNarrow() ? L(e.name) : LH(e.name)}</span>`;
    b.onclick = () => go('atom', e.z);
    grid.appendChild(b); cells.push([e, b]);
  });
  // 鑭系/錒系的「指向」格:外觀與一般元素一致(虛線框),點擊可標示該系列
  [[6, '57–71', 'lanthanide'], [7, '89–103', 'actinide']].forEach(([row, txt, cat]) => {
    const p = document.createElement('button');
    p.className = 'el placeholder';
    p.style.gridRow = row; p.style.gridColumn = 3;
    p.style.setProperty('--c', CATEGORIES[cat].color);
    p.innerHTML = `<span class="sym" style="font-size:1rem">${txt}</span><span class="nm">${render(L(CATEGORIES[cat]))}</span>`;
    p.onclick = () => { filter = filter === cat ? null : cat; apply(); };
    grid.appendChild(p); holders.push([cat, p]);
  });
  wrap.appendChild(grid);
  page.appendChild(wrap);
  container.appendChild(page);

  function apply() {
    cells.forEach(([e, b]) => b.classList.toggle('dim', !!filter && e.cat !== filter));
    holders.forEach(([c, b]) => b.classList.toggle('dim', !!filter && c !== filter));
    info.hidden = !filter;
    if (filter) {
      const c = CATEGORIES[filter];
      info.innerHTML = `<b style="background:${c.color};color:#111;padding:1px 10px;border-radius:999px">${render(L(c))}</b> ${render(L(c.desc))}`;
    }
  }
  // 第 8 列空白用 margin 分隔
  grid.querySelectorAll('.el').forEach(b => { if (+b.style.gridRow === 9) b.style.marginTop = '14px'; });
  return { dispose() { page.remove(); } };
}
