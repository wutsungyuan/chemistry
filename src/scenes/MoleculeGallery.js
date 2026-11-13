import * as THREE from 'three';
import { isNarrow } from '../ui/layout.js';
import { GALLERY, MOL } from '../data/molecules.js';
import { createStage } from '../three/stage.js';
import { buildMolecule, setStyle, molRadius } from '../three/mol.js';
import { T, Tp, L, LH, formulaHTML, state } from '../i18n/index.js';
import { getLevel, forLevel } from '../ui/level.js';
import { molFacts, factFor, useFor } from '../game/molfacts.js';
import { progress } from '../game/store.js';
import { speak, canSpeak } from '../ui/speech.js';
import { escapeHtml } from '../ui/util.js';

/** 結構是「簡化示意」或「晶體的一小塊」時,誠實地告訴小朋友 */
function schemNote(m) {
  if (m.schem) return m.schem;
  if (m.crystal) return { zh: '這是依真實晶體資料畫出來的一小塊,最外圍的原子其實還連著更多原子,沒有全部畫出來。', en: 'A small piece drawn from real crystal data; atoms at the edge really bond to more atoms that are not shown.' };
  if (['NaCl', 'NaF', 'KCl', 'KI', 'AgCl', 'AgBr', 'MgO', 'CaO'].includes(m.id)) return { zh: '這是晶體的一小塊:正負離子像棋盤一樣交錯排列,真實的晶體是這樣重複很多很多次。', en: 'A small piece of the crystal: ions alternate like a chessboard, repeated many, many times.' };
  if (m.id === 'NaHCO3') return { zh: '由真實晶體取出一個碳酸氫根和一個鈉離子。真實晶體裡鈉離子被更多氧原子圍住。', en: 'One bicarbonate and one sodium taken from the real crystal. In the crystal, sodium is surrounded by more oxygens.' };
  return null;
}

export function mount(container, startId) {
  const stage = createStage(container, { camPos: [0, 2, 9] });
  let current = null, style = 'ball', labels = true;
  let id = startId && MOL[startId] && !MOL[startId].hidden ? startId : 'H2O';
  const built = new Set(progress().built);
  // 清單依階段:國小只有生活中常見的、國中多一些、高中全部;從別頁連結過來的分子即使超出階段也會放進清單
  const level = getLevel(), items = forLevel(GALLERY, level);
  if (!items.some(m => m.id === id)) items.push(MOL[id]);

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
    // 距離依分子大小自動算,讓分子佔滿畫面;下限避免小分子(H2、O2)被拉得太近(手機的 3D 區域小,下限更低)
    const minDist = desk ? 6 : 2.3, pad = desk ? 0.6 : 0.4, margin = desk ? 1.15 : 1.05;   // 手機:留白小一點,分子更滿版
    let dist = ((R + pad) / fit) * margin;
    if (!desk) {                       // 手機:3D 區域是寬扁的,橫向與縱向分開算(分子繞 y 軸旋轉,橫向取 x-z 平面的半徑)
      const t = Math.tan((stage.camera.fov * Math.PI) / 360), aspect = stage.el.clientWidth / Math.max(1, stage.el.clientHeight);
      let rxz = 0, ry = 0;
      current.userData.atoms.forEach(m => { rxz = Math.max(rxz, Math.hypot(m.position.x, m.position.z) + m.scale.x); ry = Math.max(ry, Math.abs(m.position.y) + m.scale.x); });
      dist = Math.max((ry + pad) / t, (rxz + pad) / (t * Math.min(aspect, 1.6))) * margin;   // 橫向最多只利用 1.6 倍高度,留一點邊
    }
    stage.camera.position.set(0, R * 0.3, Math.max(minDist, dist));
    if (stage.controls) {
      stage.controls.target.set(0, 0, 0);
      stage.controls.autoRotate = true; stage.controls.autoRotateSpeed = 1.2;
    }
    renderSide(); renderList();
  }

  /** 國中/高中:由結構座標算出的數據(分子量、鍵種類、鍵長、鍵角);國小不顯示 */
  function factsHTML(m) {
    if (level === 'kid') return '';
    const f = molFacts(m); if (!f) return '';
    const hi = level === 'high', rows = [];
    if (f.mass != null) rows.push(T(f.kind === 'formula' ? 'gal.facts.fmass' : 'gal.facts.mass', { m: f.mass.toFixed(hi ? 2 : 1) }));
    if (f.bonds.length) rows.push(T('gal.facts.bonds', { list: f.bonds.map(b => hi ? `${b.a}${b.sign}${b.b} ${b.length.toFixed(2)} Å${b.count > 1 ? ' × ' + b.count : ''}` : `${b.a}${b.sign}${b.b} ${Tp('gal.order.' + b.order)}${b.count > 1 ? ' × ' + b.count : ''}`).join(hi ? ';' : '、') }));
    if (hi && f.angles.length) rows.push(T('gal.facts.angles', { list: f.angles.slice(0, 4).map(a => `${a.a}–${a.center}–${a.b} ${a.deg.toFixed(1)}°`).join(';') }));
    return `<p class="gal-facts">${rows.map(r => '📊 ' + r).join('<br>')}</p>`;
  }
  function renderSide() {
    const m = MOL[id];
    const src = state.lang === 'en' && m.sourceEn ? m.sourceEn : m.source;      // 資料出處(來自外部 CIF 的文字,顯示前一定要跳脫)
    const counts = {};
    m.atoms.forEach(a => { counts[a[0]] = (counts[a[0]] || 0) + 1; });
    side.innerHTML = `
      <h2>${LH(m.name)}</h2>
      <p style="font-size:1.6rem;margin:0"><b>${formulaHTML(m.display || m.formula)}</b></p>
      ${m.crystal ? '' : `<p>${Object.entries(counts).map(([s, n]) => `<span class="chip">${s} × ${n}</span>`).join('')}</p>`}
      <p>💡 ${LH(factFor(m, level))}</p>
      ${factsHTML(m)}
      <p>🏠 ${LH(useFor(m, level))}</p>
      ${schemNote(m) ? `<p class="schem">📐 ${LH(schemNote(m))}</p>` : ''}
      ${m.source ? `<p class="schem">📚 ${T('gal.source')}:${escapeHtml(src)}</p>` : ''}
      <div>
        <button class="btn ${style === 'ball' ? '' : 'alt'}" id="s-ball">${T('gal.ball')}</button>
        <button class="btn ${style === 'space' ? '' : 'alt'}" id="s-space">${T('gal.space')}</button>
        <button class="btn ${labels ? '' : 'alt'}" id="s-lab">${T('gal.labels')}</button>
        ${canSpeak() ? '<button class="btn alt" id="say">🔊</button>' : ''}
      </div>`;
    side.querySelector('#s-ball').onclick = () => { style = 'ball'; setStyle(current, style); renderSide(); };
    side.querySelector('#s-space').onclick = () => { style = 'space'; setStyle(current, style); renderSide(); };
    side.querySelector('#s-lab').onclick = () => { labels = !labels; show(id); };
    side.querySelector('#say')?.addEventListener('click', () => speak(`${L(m.name)}。${L(factFor(m, level))}${L(useFor(m, level))}`));
  }
  let listShown = false;
  /** 把目前選的分子捲到清單中間(手機是橫向清單、桌面是直向清單,兩個方向都處理) */
  function centerActive(behavior) {
    const el = list.querySelector('.active');
    if (!el) return;
    const lr = list.getBoundingClientRect(), br = el.getBoundingClientRect();
    list.scrollTo({
      left: Math.max(0, list.scrollLeft + (br.left - lr.left) - (list.clientWidth - br.width) / 2),
      top: Math.max(0, list.scrollTop + (br.top - lr.top) - (list.clientHeight - br.height) / 2),
      behavior,
    });
  }
  function renderList() {
    const keep = { left: list.scrollLeft, top: list.scrollTop };
    list.innerHTML = '';
    items.forEach(m => {
      const b = document.createElement('button');
      if (m.id === id) b.className = 'active';
      b.innerHTML = `${built.has(m.id) ? '⭐ ' : ''}${LH(m.name)}<br><small>${formulaHTML(m.display || m.formula)}</small>`;
      b.onclick = () => show(m.id);
      list.appendChild(b);
    });
    list.scrollLeft = keep.left; list.scrollTop = keep.top;      // 重畫後保持原位置,不要跳回最前面
    // 等版面套用完成再置中(換頁時 body[data-scene] 在場景掛載後才更新,手機版的橫向清單樣式那時才生效)
    const first = !listShown; listShown = true;
    requestAnimationFrame(() => requestAnimationFrame(() => centerActive(first ? 'auto' : 'smooth')));
  }
  stage.setCenterShift(() => (!isNarrow() ? (side.offsetWidth - list.offsetWidth) / 2 : 0));
  show(id);
  return { dispose() { window.speechSynthesis?.cancel?.(); stage.dispose(); side.remove(); list.remove(); } };
}
