import * as THREE from 'three';
import { isNarrow } from '../ui/layout.js';
import { GALLERY, MOL } from '../data/molecules.js';
import { createStage } from '../three/stage.js';
import { buildMolecule, setStyle, molRadius } from '../three/mol.js';
import { T, L, LH, formulaHTML } from '../i18n/index.js';
import { progress } from '../game/store.js';
import { speak, canSpeak } from '../ui/speech.js';

export function mount(container, startId) {
  const stage = createStage(container, { camPos: [0, 2, 9] });
  let current = null, style = 'ball', labels = true;
  let id = startId && MOL[startId] && !MOL[startId].hidden ? startId : 'H2O';
  const built = new Set(progress().built);

  const side = document.createElement('div');
  side.className = 'side';
  const list = document.createElement('div');
  list.className = 'list';
  container.append(side, list);

  const raycaster = new THREE.Raycaster(), ptr = new THREE.Vector2();
  stage.el.addEventListener('pointerdown', ev => {
    const r = stage.el.getBoundingClientRect();
    ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ptr, stage.camera);
    const hit = current && raycaster.intersectObjects(current.userData.atoms)[0];
    if (hit) { // 點原子 → 彈跳一下
      const m = hit.object, s0 = m.scale.x, t0 = performance.now();
      const stop = stage.onFrame(() => {
        const k = (performance.now() - t0) / 400;
        m.scale.setScalar(k >= 1 ? s0 : s0 * (1 + 0.35 * Math.sin(k * Math.PI)));
        if (k >= 1) stop();
      });
    }
  });

  function show(newId) {
    id = newId;
    if (current) { current.userData.atoms.forEach(m => m.userData.label?.element.remove()); stage.scene.remove(current); }
    const mol = MOL[id];
    current = buildMolecule(mol, { style, labels });
    stage.scene.add(current);
    const R = molRadius(current);
    const desk = !isNarrow();
    const usableW = stage.el.clientWidth - (desk ? side.offsetWidth + list.offsetWidth + 40 : 0);
    const fit = Math.tan((stage.camera.fov * Math.PI) / 360) * Math.min(1, usableW / Math.max(1, stage.el.clientHeight));
    stage.camera.position.set(0, R * 0.3, Math.max(9, ((R + 0.6) / fit) * 1.15));
    if (stage.controls) {
      stage.controls.target.set(0, 0, 0);
      stage.controls.autoRotate = true; stage.controls.autoRotateSpeed = 1.2;
    }
    renderSide(); renderList();
  }

  function renderSide() {
    const m = MOL[id];
    const counts = {};
    m.atoms.forEach(a => { counts[a[0]] = (counts[a[0]] || 0) + 1; });
    side.innerHTML = `
      <h2>${LH(m.name)}</h2>
      <p style="font-size:1.6rem;margin:0"><b>${formulaHTML(m.display || m.formula)}</b></p>
      <p>${Object.entries(counts).map(([s, n]) => `<span class="chip">${s} × ${n}</span>`).join('')}</p>
      <p>💡 ${LH(m.fact)}</p>
      <p>🏠 ${LH(m.use)}</p>
      <div>
        <button class="btn ${style === 'ball' ? '' : 'alt'}" id="s-ball">${T('gal.ball')}</button>
        <button class="btn ${style === 'space' ? '' : 'alt'}" id="s-space">${T('gal.space')}</button>
        <button class="btn ${labels ? '' : 'alt'}" id="s-lab">${T('gal.labels')}</button>
        ${canSpeak() ? '<button class="btn alt" id="say">🔊</button>' : ''}
      </div>`;
    side.querySelector('#s-ball').onclick = () => { style = 'ball'; setStyle(current, style); renderSide(); };
    side.querySelector('#s-space').onclick = () => { style = 'space'; setStyle(current, style); renderSide(); };
    side.querySelector('#s-lab').onclick = () => { labels = !labels; show(id); };
    side.querySelector('#say')?.addEventListener('click', () => speak(`${L(m.name)}。${L(m.fact)}${L(m.use)}`));
  }
  function renderList() {
    list.innerHTML = '';
    GALLERY.forEach(m => {
      const b = document.createElement('button');
      if (m.id === id) b.className = 'active';
      b.innerHTML = `${built.has(m.id) ? '⭐ ' : ''}${LH(m.name)}<br><small>${formulaHTML(m.display || m.formula)}</small>`;
      b.onclick = () => show(m.id);
      list.appendChild(b);
    });
  }
  stage.setCenterShift(() => (!isNarrow() ? (side.offsetWidth - list.offsetWidth) / 2 : 0));
  show(id);
  return { dispose() { window.speechSynthesis?.cancel?.(); stage.dispose(); side.remove(); list.remove(); } };
}
