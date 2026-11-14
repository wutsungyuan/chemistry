// 入口頁的 3D 宇宙:三顆星球沿著真正的三體 8 字軌道互相追逐(orbit.js),原子寶寶的飛船在星球之間穿梭(ship.js),背景漂浮著化學元素與分子(cosmos.js)。
// 點一顆星球 → 鏡頭飛過去跟著它轉,下方出現這個版本的說明與「出發」;其他兩顆繼續照軌道運動。再點一次星球或按「出發」就進入。
// 星球上的文字(名稱、說明)都是 HTML 蓋在 3D 上面:注音才清楚,螢幕閱讀器與鍵盤也能用;每顆星球是一顆真正的按鈕。
import * as THREE from 'three';
import { createFigureEight, T0 } from './orbit.js';
import { buildPlanet } from './planets.js';
import { buildShip } from './ship.js';
import { buildCosmos, buildStar } from './cosmos.js';

const LEVELS = ['kid', 'teen', 'high'];
const S = 3, R = 0.21 * S;            // 軌道放大倍數;星球半徑(8 字軌道上三顆最近 0.69*S,含星環也不會碰到)
const PERIOD = 54;                     // 三顆星球繞完一圈 8 字要幾秒
const TILT = -0.95, YAW = 0.42;        // 軌道平面往後傾 54°,再水平轉 24°:8 字的長軸一頭朝向鏡頭、一頭遠離,星球的前後距離差很多(近大遠小)
const FOV_LAND = 54, FOV_PORT = 70;     // 鏡頭的垂直視角:視角廣、站得近,近大遠小才明顯;直式畫面窄,要更廣才有同樣的效果
let TAN = Math.tan(FOV_LAND / 2 * Math.PI / 180);
const EXT_LAND = [4.3, 1.95], EXT_PORT = [1.95, 4.3];      // 軌道範圍的半寬、半高(世界單位,含星球與星環)
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

/** labels: [{ level, nameHtml, gradeHtml, lineHtml, ctaHtml, aria }];texts: { back, hint };onPick(level, event):選定版本(之後的轉場由呼叫端做) */
export function mountSpace(host, { labels, texts, onPick }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });   // 不支援 WebGL 會在這裡丟錯,由呼叫端退回 2D 卡片
  let pr = Math.min(devicePixelRatio || 1, 2); renderer.setPixelRatio(pr);
  renderer.setClearColor(0x050a1c, 1);
  const canvas = renderer.domElement; canvas.className = 'sp-canvas'; canvas.setAttribute('aria-hidden', 'true'); host.prepend(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV_LAND, 1, 0.1, 200);
  // 光源:場景裡有一顆真正的恆星(左上方的背景深處),主光就是從它的方向來;星球的明暗、星環上的影子都照這個方向算。
  // 恆星在星球後方,星球朝向我們的那一面會偏暗(像弦月),所以環境補光(星雲與星光的散射)給得比較多,顏色才看得清楚。
  scene.add(new THREE.HemisphereLight(0xc4d4ff, 0x4a4078, 2.1));
  const sun = new THREE.DirectionalLight(0xfff1d6, 3.6), sunDir = new THREE.Vector3(0, 0, 1), star = buildStar(1.3), STAR_DEPTH = 16; scene.add(sun, star.group);

  const low = Math.min(innerWidth, innerHeight) < 500 && (navigator.hardwareConcurrency || 4) <= 4;
  const cosmos = buildCosmos({ count: low ? 26 : 42, stars: low ? 700 : 1200 }); scene.add(cosmos.group);

  // 軌道:外層旋轉(直式手機把 8 字轉成直的)→ 傾斜 → 星球
  const orbitRoot = new THREE.Group(), tilt = new THREE.Group(); tilt.rotation.set(TILT, YAW, 0); orbitRoot.add(tilt); scene.add(orbitRoot);
  const sim = createFigureEight(), planets = LEVELS.map(lv => { const p = buildPlanet(lv, R, { low }); scene.add(p); return p; });   // 星球直接放在場景裡:位置照軌道算,但自轉軸固定在空間裡,不跟著軌道的擺放(直式手機會把 8 字轉 90°)一起轉
  const ship = buildShip(), SHIP_SCALE = 0.7; ship.scale.setScalar(SHIP_SCALE); scene.add(ship);

  // ---- 疊在 3D 上面的 HTML:每顆星球一顆按鈕(含名稱)、選取後的說明面板、返回鈕、提示 ----
  const layer = document.createElement('div'); layer.className = 'sp-layer'; host.appendChild(layer);
  const btns = LEVELS.map(lv => { const b = document.createElement('button'); b.type = 'button'; b.className = `sp-planet sp-${lv}`; b.dataset.level = lv; layer.appendChild(b); return b; });
  const panel = document.createElement('div'); panel.className = 'sp-panel'; layer.appendChild(panel);
  const back = document.createElement('button'); back.type = 'button'; back.className = 'sp-back'; layer.appendChild(back);
  const hint = document.createElement('p'); hint.className = 'sp-hint'; layer.appendChild(hint);
  function setLabels(ls, tx) {
    ls.forEach((l, i) => { btns[i].setAttribute('aria-label', l.aria); btns[i].innerHTML = `<span class="sp-label"><span class="sp-name">${l.nameHtml}</span></span>`; });
    labelData = ls; back.innerHTML = `<i aria-hidden="true">‹</i> ${tx.back}`; hint.textContent = tx.hint; if (selected >= 0) fillPanel();
  }
  let labelData = [];
  function fillPanel() {
    const l = labelData[selected], lv = LEVELS[selected];
    panel.className = `sp-panel sp-${lv} on`;
    panel.innerHTML = `<div class="sp-pname">${l.nameHtml}</div><div class="sp-pgrade">${l.gradeHtml}</div><div class="sp-pline">${l.lineHtml}</div><button type="button" class="sp-go">${l.ctaHtml}<i aria-hidden="true">›</i></button>`;
    panel.querySelector('.sp-go').onclick = e => pick(lv, e);
  }

  // ---- 狀態 ----
  let selected = -1, diving = false, tNow = 0, W = 1, H = 1, portrait = false, quality = 2, slow = 0, frames = 0;
  const cam = { x: 0, y: 0, z: 14, shift: 0, shiftX: 0 }, wp = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  function select(i) { selected = i; document.body.classList.toggle('sp-sel', i >= 0); btns.forEach((b, k) => b.classList.toggle('on', k === i)); if (i >= 0) fillPanel(); else panel.classList.remove('on'); if (i >= 0) ship.userData.focus?.(i); layoutSoon(); }
  function pick(lv, e) { if (diving) return; diving = true; document.body.classList.add('sp-dive'); onPick(lv, e); }
  btns.forEach((b, i) => { b.onclick = e => { if (diving) return; if (selected === i) pick(LEVELS[i], e); else select(i); }; });
  back.onclick = () => select(-1);
  canvas.addEventListener('pointerdown', () => { if (selected >= 0 && !diving) select(-1); });             // 點一下空白處 = 回到三顆星球
  addEventListener('keydown', e => { if (e.key === 'Escape' && selected >= 0 && !diving) select(-1); });

  // ---- 版面:星球的可用範圍(標題以下、面板以上) ----
  let area = { top: 0, bottom: 1, left: 0, right: 1 }, layoutTimer = 0;
  function layout() {
    W = host.clientWidth || innerWidth; H = host.clientHeight || innerHeight;
    camera.fov = W < H ? FOV_PORT : FOV_LAND; TAN = Math.tan(camera.fov / 2 * Math.PI / 180);
    renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
    const head = document.querySelector('.lp-head'), headB = head ? head.getBoundingClientRect().bottom : 0;
    const side = matchMedia('(max-height:520px) and (orientation:landscape)').matches;                 // 橫式手機:星球在左、說明面板在右(上下放不下)
    if (selected < 0) area = { top: headB + 4, bottom: H - 96, left: 0, right: W };                      // 底部留給星球名稱與提示
    else if (side) area = { top: 8, bottom: H - 8, left: 0, right: Math.max(200, W - Math.min(W * 0.48, 440) - 24) };
    else { const pt = panel.getBoundingClientRect().top; area = { top: 54, bottom: Math.max(180, pt - 8), left: 0, right: W }; }
    portrait = ((area.right - area.left) / Math.max(1, area.bottom - area.top)) < 1.05;
    // 恆星的位置:固定在星球後方 STAR_DEPTH 的深處;水平與垂直位置依「看三顆星球全景時」的視野決定(左上方、不擋到標題),所以直式、橫式都看得到。
    // 只有視窗大小改變時才重算;選取星球、鏡頭移動時它留在原地(是場景裡的一個真實物體)。
    const availH0 = Math.max(120, H - headB - 100), port0 = W / availH0 < 1.05, [ew, eh] = port0 ? EXT_PORT : EXT_LAND;
    const d0 = (H / 2) / (Math.min(W / (2 * ew), availH0 / (2 * eh)) * TAN), hh = (d0 + STAR_DEPTH) * TAN, hw = hh * W / H;
    star.group.position.set((port0 ? -0.6 : -0.66) * hw, (port0 ? 0.16 : 0.4) * hh, -STAR_DEPTH);
    sun.position.copy(star.group.position); sunDir.copy(star.group.position).normalize(); planets.forEach(p => p.userData.setSun(sunDir));
  }
  const layoutSoon = () => { clearTimeout(layoutTimer); layoutTimer = setTimeout(layout, 30); requestAnimationFrame(layout); };
  new ResizeObserver(layout).observe(host);

  /** 這一格的相機目標:overview 是把整個 8 字放進可用範圍;選取是把那顆星球放大放在可用範圍中央 */
  function camTarget() {
    const availW = Math.max(120, area.right - area.left), availH = Math.max(120, area.bottom - area.top);
    let ppu, cx = 0, cy = 0, cz = 0;
    if (diving && selected >= 0) { ppu = Math.max(W, H) * 0.95 / R; }
    else if (selected >= 0) { const rpx = clamp(Math.min(availW * 0.3, availH * 0.36), 56, 200); ppu = rpx / R; }
    else { const [ew, eh] = portrait ? EXT_PORT : EXT_LAND; ppu = Math.min(availW / (2 * ew), availH / (2 * eh)); }
    if (selected >= 0) { const p = wp[selected]; cx = p.x; cy = p.y; cz = p.z; }
    return { x: cx, y: cy, z: cz + (H / 2) / (ppu * TAN), shift: (area.top + availH / 2) - H / 2, shiftX: (area.left + availW / 2) - W / 2 };
  }

  // ---- 飛船(真正的 3D 軌道) ----
  //   繞行:沿著一個傾斜的圓形軌道繞星球(會真的繞到星球前面與後面,被擋住時由深度緩衝處理)。
  //   繞行 3~5 圈之後,下一站選「當下離得最遠」的那一顆(同兩顆之間不連續來回,所以三顆都會去到)。
  //   轉移:在「切線方向正好指向下一站」的那一點離開,沿一條三次 Hermite 曲線飛到下一顆星球的繞行軌道。
  //        出發與抵達的位置都在軌道上、速度都等於軌道的切線速度(相對於各自的星球),所以「繞行 → 轉移 → 繞行」的位置與速度都連續,沒有折角或跳動。
  //        兩端的星球一直在動,所以曲線的兩個端點每一格都跟著星球重算。
  //   選了星球:從目前的位置與速度直接開一條轉移軌道過去,留在它身邊;取消選取後從那一顆接著照順序走。 ----
  const OMEGA = 1.5, ORBIT_TILT = 0.9, RO = R * 1.9, LAPS = [3, 4, 5];                              // 繞行角速度、軌道面繞 x 軸的傾斜(約 51°)、繞行半徑
  const U = new THREE.Vector3(1, 0, 0), V = new THREE.Vector3(0, Math.cos(ORBIT_TILT), Math.sin(ORBIT_TILT)), ZERO = new THREE.Vector3();
  const WRAP = a => Math.atan2(Math.sin(a), Math.cos(a));
  const ringPoint = (P, th, out) => out.copy(U).multiplyScalar(Math.cos(th) * RO).addScaledVector(V, Math.sin(th) * RO).add(P);
  const tangentAngle = d => Math.atan2(-d.dot(U), d.dot(V));                       // 軌道上哪個角度的切線方向最接近 d
  const sh = { pos: new THREE.Vector3(), prev: new THREE.Vector3(), vel: new THREE.Vector3(1, 0, 0), mode: 'orbit', target: 0, th: 0, sweep: 0, prevDiff: NaN, tr: null, init: false, arrived: false, flip: 0, stay: 0, next: -1, from: -1, hops: [] };
  const pvel = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], wpPrev = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const tmp = new THREE.Vector3(), ref = new THREE.Vector3(), fwd = new THREE.Vector3(), side = new THREE.Vector3(), up = new THREE.Vector3(), upF = new THREE.Vector3(), basis = new THREE.Matrix4(), qT = new THREE.Quaternion();
  const acc = new THREE.Vector3(), accS = new THREE.Vector3(), lastVel = new THREE.Vector3();
  /** 從目前的位置與速度,開一條到星球 B 繞行軌道的轉移軌道 */
  function startTransfer(B) {
    let A = 0, best = Infinity; for (let i = 0; i < 3; i++) { const d = sh.pos.distanceTo(wp[i]); if (d < best) { best = d; A = i; } }
    const thIn = tangentAngle(tmp.copy(wp[B]).sub(sh.pos));                         // 抵達點:切線方向順著飛過去的方向,到了就直接接著繞
    const r1 = ringPoint(ZERO, thIn, new THREE.Vector3()), v1 = new THREE.Vector3().copy(U).multiplyScalar(-Math.sin(thIn)).addScaledVector(V, Math.cos(thIn)).multiplyScalar(RO * OMEGA);
    const dist = tmp.copy(wp[B]).add(r1).distanceTo(sh.pos);
    sh.tr = { A, B, r0: sh.pos.clone().sub(wp[A]), m0: sh.vel.clone().sub(pvel[A]), r1, v1, thIn, T: clamp(dist / (2 * RO * OMEGA), 2.4, 5), s: 0 };   // 時間比「等速飛過去」短:出發時加速、中途較快、入軌前要減速
    sh.from = A; sh.next = -1; sh.mode = 'fly'; sh.target = B;
  }
  ship.userData.focus = i => { if (sh.init && !(sh.target === i)) startTransfer(i); };
  function stepShip(dt) {
    for (let i = 0; i < 3; i++) { if (sh.init) pvel[i].copy(wp[i]).sub(wpPrev[i]).divideScalar(dt); wpPrev[i].copy(wp[i]); }   // 星球的速度(轉移軌道兩端要用)
    const P = wp[sh.target];
    if (sh.mode === 'fly') {
      const tr = sh.tr, raw = tr.s + dt / tr.T, left = Math.max(0, raw - 1) * tr.T; tr.s = Math.min(1, raw);   // left:這一格裡轉移軌道結束後剩下的時間,接著拿去繞行
      const u = tr.s, u2 = u * u, u3 = u2 * u, h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;       // 三次 Hermite 基底
      sh.pos.copy(wp[tr.A]).add(tr.r0).multiplyScalar(h00).addScaledVector(tr.m0, h10 * tr.T);
      sh.pos.addScaledVector(tmp.copy(wp[tr.B]).add(tr.r1), h01).addScaledVector(tr.v1, h11 * tr.T);
      for (let j = 0; j < 3; j++) {                                                // 途中如果太靠近某顆星球,平滑地繞開(推開的量與速度在邊界都是 0,不會突然彈開)
        tmp.copy(sh.pos).sub(wp[j]); const d = tmp.length(), lim = R * 1.45;
        if (d < lim && d > 1e-4) sh.pos.addScaledVector(tmp.divideScalar(d), (lim - d) * (lim - d) / lim);
      }
      if (tr.s >= 1) { sh.mode = 'orbit'; sh.th = tr.thIn + left * OMEGA; sh.sweep = left * OMEGA; sh.prevDiff = NaN; sh.arrived = true; ringPoint(wp[tr.B], sh.th, sh.pos); }
    } else {
      sh.th += dt * OMEGA; sh.sweep += dt * OMEGA; ringPoint(P, sh.th, sh.pos);
    }
    if (sh.init) sh.vel.copy(sh.pos).sub(sh.prev).divideScalar(dt); sh.prev.copy(sh.pos); sh.init = true;
    if (sh.mode === 'orbit' && selected < 0 && sh.sweep > Math.PI * 2 * LAPS[sh.stay % LAPS.length]) {   // 繞滿 3~5 圈(依序 3、4、5 圈輪流)之後準備出發
      if (sh.next < 0) {                                                           // 下一站:當下離得最遠的那一顆(飛得遠、飛得快,入軌前的煞車減速才明顯)。
        const [a, b] = [0, 1, 2].filter(i => i !== sh.target), far = P.distanceTo(wp[a]) >= P.distanceTo(wp[b]) ? a : b, other = far === a ? b : a;
        const pingPong = far === sh.from && sh.hops.length >= 2 && sh.hops[sh.hops.length - 2].from === sh.target;      // 已經在同兩顆之間來回一趟了 → 這次換去第三顆,三顆才都會去到
        sh.next = pingPong ? other : far; sh.hops.push({ from: sh.target, to: sh.next, rule: pingPong ? 'other' : 'far' }); if (sh.hops.length > 12) sh.hops.shift();
        sh.prevDiff = NaN;
      }
      const diff = WRAP(sh.th - tangentAngle(tmp.copy(wp[sh.next]).sub(P)));       // 在切線正好指向下一站的那一刻出發
      if (sh.prevDiff < 0 && diff >= 0 && diff < 0.5) { sh.stay++; startTransfer(sh.next); }
      sh.prevDiff = diff;
    }
    // 姿態(完整的 3D 旋轉):機頭朝速度方向,腹部朝向星球、背部朝外(轉移途中,參考點從出發的星球平滑地換到要去的星球)。
    // 所以繞到星球靠鏡頭這一側時看到背部與原子寶寶,繞到另一側時看到腹部的隔熱瓦。
    if (sh.mode === 'fly') { const k = sh.tr.s * sh.tr.s * (3 - 2 * sh.tr.s); ref.copy(wp[sh.tr.A]).lerp(wp[sh.tr.B], k); } else ref.copy(P);
    fwd.copy(sh.vel); if (fwd.lengthSq() < 1e-4) fwd.set(1, 0, 0); fwd.normalize();
    tmp.copy(sh.pos).sub(ref); tmp.addScaledVector(fwd, -tmp.dot(fwd));            // 背部方向 = 遠離星球(去掉沿機身的分量)
    if (tmp.lengthSq() > 0.04) up.copy(tmp).normalize();                             // 正對著星球飛的時候這個方向不明確,就沿用上一格的背部方向
    else { up.addScaledVector(fwd, -up.dot(fwd)); if (up.lengthSq() < 1e-4) up.set(0, 1, 0).addScaledVector(fwd, -fwd.y); up.normalize(); }
    side.crossVectors(fwd, up).normalize(); up.crossVectors(side, fwd);
    // 入軌前掉頭(像真的 Starship):轉移軌道中段滑行時,用姿態控制噴氣水平掉頭 180°,讓引擎朝著前進方向;入軌時引擎朝前點火減速;
    // 進入軌道後再慢慢翻回機頭朝前。flip:0 = 機頭朝前,1 = 機尾朝前。掉頭是垂直翻(俯仰):機頭往背部的方向翻過去,像 Starship 有名的翻轉動作。
    const sm = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
    const flip = sh.mode === 'fly' ? sm(0.36, 0.66, sh.tr.s) : (sh.arrived ? 1 - sm(0.15, 1.4, sh.sweep) : 0), rcs = flip > sh.flip + 1e-4 ? 1 : flip < sh.flip - 1e-4 ? -1 : 0; sh.flip = flip;
    const ca = Math.cos(flip * Math.PI), sa = Math.sin(flip * Math.PI); upF.copy(up).multiplyScalar(ca).addScaledVector(fwd, -sa); fwd.multiplyScalar(ca).addScaledVector(up, sa).normalize(); upF.normalize();
    basis.makeBasis(fwd, upF, side); qT.setFromRotationMatrix(basis);
    ship.quaternion.slerp(qT, 1 - Math.exp(-9 * dt)); ship.position.copy(sh.pos); ship.scale.setScalar(SHIP_SCALE);
    // 引擎:繞行時熄火滑行(軌道運動不需要推力);離開軌道(轉移的前段)與進入下一個軌道(轉移的後段)時重新點火,中途滑行。
    // 噴口擺角由這一格實際的橫向加速度決定:軌道要往哪邊彎,推力就往哪邊偏(噴口與火焰往反方向擺)。
    acc.copy(sh.vel).sub(lastVel).divideScalar(Math.max(dt, 1e-3)); lastVel.copy(sh.vel); accS.lerp(acc, Math.min(1, dt * 8));
    const burn = sh.mode === 'fly' && (sh.tr.s < 0.28 || sh.tr.s > 0.7);                   // 0.7 之後已經掉頭完成,引擎朝前:這次點火是減速入軌
    ship.userData.update(tNow, dt, { burn, rcs, gy: burn ? clamp(accS.dot(upF) * 0.16, -0.32, 0.32) : 0, gz: burn ? clamp(accS.dot(side) * 0.16, -0.32, 0.32) : 0 });
  }

  // ---- 每一格 ----
  let last = performance.now(), raf = 0, alive = true;
  function frame(now) {
    if (!alive) return; raf = requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now; tNow += dt;
    // 畫質:平均每格太慢就降低像素比(只降不升)
    slow = slow * 0.95 + dt * 1000 * 0.05; if (++frames > 120 && slow > 30 && quality > 0) { quality--; pr = quality === 1 ? Math.min(pr, 1.25) : 1; renderer.setPixelRatio(pr); layout(); frames = 0; slow = 0; }
    sim.step(dt * T0 / PERIOD);
    orbitRoot.rotation.z = damp(orbitRoot.rotation.z, portrait ? Math.PI / 2 : 0, 3, dt);
    orbitRoot.updateMatrixWorld();
    planets.forEach((p, i) => { wp[i].set(sim.pos(i)[0] * S, sim.pos(i)[1] * S, 0).applyMatrix4(tilt.matrixWorld); p.position.copy(wp[i]); p.userData.update(dt * (i === selected ? 1.6 : 1)); });
    const tg = camTarget(), fast = selected >= 0 && !diving ? 6 : 2.4;
    cam.x = damp(cam.x, tg.x, fast, dt); cam.y = damp(cam.y, tg.y, fast, dt); cam.z = damp(cam.z, tg.z, diving ? 5 : 2.4, dt); cam.shift = damp(cam.shift, tg.shift, 3, dt); cam.shiftX = damp(cam.shiftX, tg.shiftX, 3, dt);
    const sx = Math.sin(tNow * 0.23) * 0.22, sy = Math.cos(tNow * 0.17) * 0.12;                  // 鏡頭微微飄動,透視感更明顯
    camera.position.set(cam.x + sx, cam.y + sy, cam.z); camera.lookAt(cam.x + sx, cam.y + sy, cam.z - 10);
    camera.setViewOffset(W, H, -cam.shiftX, -cam.shift, W, H);
    stepShip(dt); cosmos.update(dt); star.update(tNow); cosmos.tint(selected >= 0 ? LEVELS[selected] : null, Math.min(1, dt * 1.4));
    renderer.render(scene, camera);
    // 把按鈕放到各星球目前的螢幕位置(大小跟著透視)
    const half = H / 2;
    for (let i = 0; i < 3; i++) {
      tmp.copy(wp[i]); const dz = camera.position.z - tmp.z, rpx = R / (Math.max(0.5, dz) * TAN) * half;
      tmp.project(camera); const x = (tmp.x * 0.5 + 0.5) * W, y = (1 - (tmp.y * 0.5 + 0.5)) * H, d = Math.max(56, rpx * 2.3), b = btns[i];
      b.style.width = b.style.height = d + 'px'; b.style.transform = `translate3d(${(x - d / 2).toFixed(1)}px,${(y - d / 2).toFixed(1)}px,0)`;
      b.style.zIndex = String(Math.round(100 - dz * 3)); b.style.setProperty('--r', rpx.toFixed(1) + 'px');
      scr[i][0] = x; scr[i][1] = y; scr[i][2] = rpx; scr[i][3] = dz;
    }
    // 星球會前後互相遮擋:如果某顆星球的名稱(在星球正下方)落在一顆比較近的星球上,就先淡出,免得後面星球的名字蓋在前面的星球上
    for (let i = 0; i < 3; i++) {
      let hid = false; const lx = scr[i][0], ly = scr[i][1] + scr[i][2] + 14;
      for (let j = 0; j < 3; j++) if (j !== i && scr[j][3] < scr[i][3] && Math.hypot(lx - scr[j][0], ly - scr[j][1]) < scr[j][2] * 1.05) hid = true;
      if (hid !== hidden[i]) { hidden[i] = hid; btns[i].classList.toggle('behind', hid); }
    }
  }
  const scr = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], hidden = [false, false, false];
  canvas.__api = { shipState: () => ({ target: sh.target, mode: sh.mode, selected, t: tNow, throttle: ship.userData.throttle, flip: sh.flip, hops: sh.hops, pos: sh.pos.toArray(), vel: sh.vel.toArray() }) };                  // 給 E2E 與除錯用
  setLabels(labels, texts); layout(); { const t0 = camTarget(); cam.z = t0.z + 6; cam.shift = t0.shift; cam.shiftX = t0.shiftX; } raf = requestAnimationFrame(frame);

  return {
    setLabels, select,
    get selected() { return selected; },
    dispose() { alive = false; cancelAnimationFrame(raf); clearTimeout(layoutTimer); cosmos.dispose(); star.dispose(); planets.forEach(p => p.userData.dispose()); ship.userData.dispose(); renderer.dispose(); canvas.remove(); layer.remove(); document.body.classList.remove('sp-sel', 'sp-dive'); },
  };
}
