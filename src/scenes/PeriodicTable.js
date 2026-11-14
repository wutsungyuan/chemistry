import { ELEMENTS, CATEGORIES } from '../data/elements.js';
import { T, L, LH, render, state } from '../i18n/index.js';
import { progress } from '../game/store.js';
import { SPECTRA } from '../data/generated/spectra.js';
import { miniSpectrumSVG } from '../ui/spectrum.js';
import { setNextTab } from './AtomView.js';
import { getLevel, featureOn } from '../ui/level.js';
import { catDesc } from '../game/atomfacts.js';

export function mount(container, _arg, { go }) {
  const page = document.createElement('div');
  page.className = 'page';
  const seen = new Set(progress().elements), level = getLevel();
  let filter = null, specMode = false, planet = null, planetOn = false;
  // 預設把週期表畫成一顆星球的表皮(scenes/tablePlanet.js);可以切回平面的表格。光譜模式只有表格有。不支援 3D 的裝置只有表格。
  const can3d = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
  const pref = () => { try { return localStorage.getItem('ptview'); } catch { return null; } };

  const wrap = document.createElement('div');
  wrap.className = 'pt-wrap';
  wrap.innerHTML = `<h2 style="margin:4px 0 8px">${T('pt.title')}</h2><p style="margin:0 0 10px;color:var(--muted)">${T('pt.sub')}</p>`;
  const legend = document.createElement('div');
  legend.className = 'pt-legend';
  const specBtn = document.createElement('button');                      // 光譜模式開關:每一格換成該元素的光譜指紋
  specBtn.className = 'chip spec-toggle'; specBtn.innerHTML = T('pt.spec');
  specBtn.onclick = () => { specMode = !specMode; if (specMode && planetOn) setView(false); apply(); };
  const viewBtn = document.createElement('button');                      // 星球 / 表格 切換
  viewBtn.className = 'chip view-toggle'; viewBtn.onclick = () => { setView(!planetOn); try { localStorage.setItem('ptview', planetOn ? 'planet' : 'flat'); } catch { /* 不能存就算了 */ } };
  if (can3d) legend.appendChild(viewBtn);
  if (featureOn('spectrum')) legend.appendChild(specBtn);                // 國小版沒有光譜模式
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
  const phoneOnly = matchMedia('(max-width: 600px)').matches;   // 只有手機的格子小到只放符號;iPad 與桌面顯示中文名稱(含注音)
  const cells = [], holders = [];
  ELEMENTS.forEach(e => {
    const b = document.createElement('button');
    b.className = 'el';
    b.style.setProperty('--c', CATEGORIES[e.cat].color);
    b.style.gridRow = e.row; b.style.gridColumn = e.col;
    // 高中版:格子裡多一行原子量(手機的格子只放符號,不加)
    const ms = level === 'high' && !phoneOnly ? `<span class="ms">${e.mass}</span>` : '';
    b.innerHTML = `<span class="z">${e.z}</span><span class="sym">${e.sym}</span><span class="nm">${phoneOnly && level !== 'kid' ? L(e.name) : LH(e.name)}</span>${ms}`;
    if (level === 'kid' && !e.fact) b.classList.add('rare');                 // 國小:少見的元素淡一點,先看常見的
    b.onclick = () => { setNextTab(specMode && SPECTRA[e.sym]?.lines.length ? 'spec' : 'info'); go('atom', e.z); };   // 光譜模式下點元素 → 直接開光譜分頁;否則開原子資訊
    grid.appendChild(b); cells.push([e, b]);
    if (!(SPECTRA[e.sym]?.lines.length)) b.classList.add('nospec');
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
  const stage = document.createElement('div'); stage.className = 'ptp-stage'; stage.hidden = true;
  stage.innerHTML = `<p class="ptp-tip">${T('pt.planet.tip')}</p>`;
  wrap.appendChild(stage);
  wrap.appendChild(grid);
  page.appendChild(wrap);
  container.appendChild(page);

  let token = 0;
  async function setView(on) {
    planetOn = on && can3d; const my = ++token;
    wrap.classList.toggle('planet', planetOn); document.body.dataset.ptview = planetOn ? 'planet' : 'flat'; stage.hidden = !planetOn; grid.hidden = planetOn; viewBtn.innerHTML = T(planetOn ? 'pt.view.flat' : 'pt.view.planet');
    if (planetOn && specMode) { specMode = false; apply(); }
    if (!planetOn) { planet?.dispose(); planet = null; return; }
    if (planet) return;
    try {
      const { mountTablePlanet } = await import('./tablePlanet.js');
      if (my !== token || !planetOn || !page.isConnected) return;
      planet = mountTablePlanet(stage, { lang: state.lang, level, filter, onPick: e => { setNextTab('info'); go('atom', e.z); } });
    } catch (err) { console.warn('週期表星球無法使用,改用表格', err); can3d && setView(false); }
  }

  let miniBuilt = false;
  function apply() {
    grid.classList.toggle('spec-mode', specMode);
    specBtn.classList.toggle('on', specMode);
    if (specMode && !miniBuilt) {                                      // 第一次開啟才建立(118 個迷你光譜條)
      miniBuilt = true;
      cells.forEach(([e, b]) => { const l = SPECTRA[e.sym]?.lines; if (l?.length) b.insertAdjacentHTML('afterbegin', miniSpectrumSVG(l)); });
    }
    planet?.setFilter(filter);
    cells.forEach(([e, b]) => b.classList.toggle('dim', !!filter && e.cat !== filter));
    holders.forEach(([c, b]) => b.classList.toggle('dim', !!filter && c !== filter));
    info.hidden = !filter && !specMode;
    if (!filter && specMode) info.innerHTML = T('pt.spec.tip');
    if (filter) {
      const c = CATEGORIES[filter];
      info.innerHTML = `<b style="background:${c.color};color:#111;padding:1px 10px;border-radius:999px">${render(L(c))}</b> ${render(L(catDesc(c, level)))}`;
    }
  }
  // 第 8 列空白用 margin 分隔
  grid.querySelectorAll('.el').forEach(b => { if (+b.style.gridRow === 9) b.style.marginTop = '14px'; });
  setView(can3d && pref() !== 'flat');
  return { dispose() { token++; planet?.dispose(); planet = null; delete document.body.dataset.ptview; page.remove(); } };
}
