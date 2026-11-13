// 原子小博士的 3D 版本(three.js):有光澤的藍色球身、立體的眼睛/眉毛/嘴巴、繞著轉的電子環(有前後遮擋)。
// 頭會轉向指標,表情用 mood 切換(見 mascotFace.js)。一個實例 = 一個小 canvas;看不到或分頁隱藏時停止繪製。
import * as THREE from 'three';

const DARK = 0x1b2a5c;
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .45, metalness: 0, ...o });
const lerp = (a, b, k) => a + (b - a) * k;

/** 把物件放在球面上的 (x,y) 位置並朝外 */
function onSphere(obj, x, y, r = 1) {
  const z = Math.sqrt(Math.max(0, r * r - x * x - y * y));
  obj.position.set(x, y, z);
  obj.lookAt(x * 3, y * 3, z * 3);
  return obj;
}

export function createMascot3D(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;pointer-events:none';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 50);
  camera.position.set(0, .05, 6.1); camera.lookAt(0, -.05, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x5a96f0, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 1.05); key.position.set(-2, 2.2, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fe0ff, .7); rim.position.set(3, 1, -2); scene.add(rim);

  const root = new THREE.Group(); scene.add(root);
  const head = new THREE.Group(); root.add(head);        // 會跟著指標轉的部分(身體 + 臉)

  // ---- 身體 ----
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshStandardMaterial({ color: 0x4cb8ff, roughness: .72, metalness: 0, emissive: 0x1b5fb0, emissiveIntensity: .35 }));
  head.add(body);

  // ---- 小白袍與領結(在身體下方,不跟著轉頭) ----
  const coat = new THREE.Mesh(new THREE.SphereGeometry(.8, 32, 20), std(0xffffff, { roughness: .7 }));
  coat.scale.set(1.05, .6, .85); coat.position.set(0, -1.02, -.02); root.add(coat);
  const bowMat = std(0xff4d63, { roughness: .4 });
  const bow = new THREE.Group();
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(.16, .3, 16), bowMat); c.rotation.z = s * Math.PI / 2; c.position.x = s * .15; bow.add(c); }
  bow.add(new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 10), bowMat));
  bow.position.set(0, -.84, .72); root.add(bow);
  const handMat = std(0x7fe3ff);
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.SphereGeometry(.2, 20, 14), handMat); h.position.set(s * 1.0, -.95, .3); root.add(h); }

  // ---- 電子環(整組慢慢轉) ----
  const orbit = new THREE.Group(); root.add(orbit);
  const ringMat = std(0xbfe6ff, { roughness: .3, emissive: 0x3a7fb0, emissiveIntensity: .35 });
  const electrons = [];
  [0xffd23f, 0xff7aa8, 0x6fdc8c].forEach((col, i) => {
    const g = new THREE.Group(); g.rotation.set(1.15, 0, i * Math.PI / 3 * 2 + .3);
    g.add(new THREE.Mesh(new THREE.TorusGeometry(1.5, .03, 8, 72), ringMat));
    const e = new THREE.Mesh(new THREE.SphereGeometry(.11, 16, 12), std(col, { emissive: col, emissiveIntensity: .35 }));
    g.add(e); electrons.push({ e, ph: i * 2.1, sp: .9 + i * .2 }); orbit.add(g);
  });

  // ---- 臉 ----
  const mkEye = side => {
    const g = new THREE.Group(); head.add(g); onSphere(g, side * .37, .12);
    const eye = new THREE.Group(); g.add(eye);
    const white = new THREE.Mesh(new THREE.SphereGeometry(.21, 24, 16), std(0xffffff, { roughness: .5 })); white.userData.o = 10; white.scale.z = .5; white.position.z = .02; eye.add(white);
    const pupil = new THREE.Group(); pupil.position.z = .1; eye.add(pupil);
    const p = new THREE.Mesh(new THREE.SphereGeometry(.125, 20, 14), std(DARK, { roughness: .2 })); p.scale.z = .5; pupil.add(p);
    const h1 = new THREE.Mesh(new THREE.SphereGeometry(.045, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); h1.userData.o = 13; h1.position.set(-.045, .05, .07); pupil.add(h1);
    const h2 = new THREE.Mesh(new THREE.SphereGeometry(.022, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); h2.userData.o = 13; h2.position.set(.05, -.05, .07); pupil.add(h2);
    const arcMat = std(DARK, { roughness: .4 });
    const happy = new THREE.Mesh(new THREE.TorusGeometry(.17, .032, 8, 20, Math.PI), arcMat); happy.position.set(0, -.04, .08); g.add(happy);       // ∩
    const closed = new THREE.Mesh(new THREE.TorusGeometry(.15, .028, 8, 20, Math.PI), arcMat); closed.rotation.z = Math.PI; closed.position.set(0, .05, .08); g.add(closed); // ∪
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(.03, .2, 4, 8), arcMat); brow.rotation.z = Math.PI / 2;
    const browG = new THREE.Group(); browG.add(brow); head.add(browG); onSphere(browG, side * .37, .43);
    return { g, eye, pupil, happy, closed, browG, side };
  };
  const eyes = [mkEye(-1), mkEye(1)];

  const cheekMat = new THREE.MeshBasicMaterial({ color: 0xff8fb1, transparent: true, opacity: .75 });
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.CircleGeometry(.12, 20), cheekMat); c.scale.y = .65; c.userData.o = 9; head.add(onSphere(c, s * .64, -.14, 1.005)); }

  const mouth = new THREE.Group(); head.add(mouth); onSphere(mouth, 0, -.3, 1.0);
  const mArc = std(DARK, { roughness: .4 }), mIn = new THREE.MeshBasicMaterial({ color: 0x7a1f3d }), mTongue = new THREE.MeshBasicMaterial({ color: 0xff7a96 });
  const smile = new THREE.Mesh(new THREE.TorusGeometry(.17, .032, 8, 24, Math.PI), mArc); smile.rotation.z = Math.PI; smile.position.y = .08; mouth.add(smile);          // ∪
  const sad = new THREE.Mesh(new THREE.TorusGeometry(.14, .032, 8, 24, Math.PI), mArc); sad.position.y = -.06; mouth.add(sad);                                          // ∩
  const openG = new THREE.Group(); mouth.add(openG);
  const openD = new THREE.Mesh(new THREE.CircleGeometry(.14, 28), mIn); openG.add(openD);
  const tongue = new THREE.Mesh(new THREE.CircleGeometry(.075, 16), mTongue); tongue.userData.o = 12; tongue.scale.y = .6; tongue.position.set(0, -.07, .005); openG.add(tongue);
  const bigG = new THREE.Group(); mouth.add(bigG);                                                                                                                        // 大笑(半圓 D)
  const bigD = new THREE.Mesh(new THREE.CircleGeometry(.2, 28, Math.PI, Math.PI), mIn); bigD.position.y = .1; bigG.add(bigD);
  const bigT = new THREE.Mesh(new THREE.CircleGeometry(.09, 16, Math.PI, Math.PI), mTongue); bigT.userData.o = 12; bigT.position.set(0, -.04, .005); bigG.add(bigT);
  const bigRim = new THREE.Mesh(new THREE.TorusGeometry(.2, .026, 8, 24, Math.PI), mArc); bigRim.rotation.z = Math.PI; bigRim.position.y = .1; bigG.add(bigRim);

  // 五官永遠畫在電子環前面(環橫過臉時不會擋住眼睛);順序:臉頰 < 眼白 < 其他五官 < 高光
  head.traverse(o => { if (o.isMesh && o !== body) { o.material.depthTest = false; o.renderOrder = o.userData.o ?? 11; } });

  // ---- 狀態 ----
  let mood = 'happy', t = 0, blink = 0, nextBlink = 2.5, lx = 0, ly = 0, tx = 0, ty = 0;
  const cur = { browY: 0, browRot: 0, eyeS: 1, openX: 1, openY: 1 };
  const MOODS = {
    happy: { brow: 0, rot: 0, eyeS: 1 },
    talk: { brow: 0, rot: 0, eyeS: 1 },
    wow: { brow: .07, rot: 0, eyeS: 1.14 },
    cheer: { brow: .06, rot: 0, eyeS: 1 },
    wink: { brow: 0, rot: 0, eyeS: 1 },
    oops: { brow: .02, rot: .32, eyeS: 1 },
    sleep: { brow: -.03, rot: 0, eyeS: 1 },
  };

  function layout() {
    const w = container.clientWidth || 52, h = container.clientHeight || 56, dpr = Math.min(2, devicePixelRatio || 1);
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // 內容寬約 3.3、高約 3.3:視窗比較窄時拉遠
    camera.position.z = camera.aspect < 1 ? 6.1 / camera.aspect * .93 : 6.1;
    camera.updateProjectionMatrix();
  }

  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now; t += dt;
    const M = MOODS[mood] || MOODS.happy, k = 1 - Math.exp(-dt * 14);

    // 轉頭與眼珠
    lx = lerp(lx, tx, k * .6); ly = lerp(ly, ty, k * .6);
    head.rotation.y = lx * .38; head.rotation.x = -ly * .26;
    for (const E of eyes) E.pupil.position.set(lx * .07, ly * .06, .1);
    root.position.y = Math.sin(t * 2.2) * .05;
    orbit.rotation.y = t * .5;
    for (const { e, ph, sp } of electrons) { const a = t * sp + ph; e.position.set(Math.cos(a) * 1.5, Math.sin(a) * 1.5, 0); }

    // 眨眼(只在眼睛是圓的時候)
    nextBlink -= dt; if (nextBlink <= 0) { blink = .13; nextBlink = 2.4 + Math.random() * 2.8; }
    const bl = blink > 0 ? 0.1 : 1; blink = Math.max(0, blink - dt);

    // 表情目標
    cur.browY = lerp(cur.browY, M.brow, k); cur.browRot = lerp(cur.browRot, M.rot, k); cur.eyeS = lerp(cur.eyeS, M.eyeS, k);
    const eyeShown = (E, i) => mood === 'cheer' ? 'happy' : mood === 'sleep' ? 'closed' : mood === 'wink' && E.side === 1 ? 'happy' : 'round';
    eyes.forEach((E, i) => {
      const s = eyeShown(E, i);
      E.eye.visible = s === 'round'; E.happy.visible = s === 'happy'; E.closed.visible = s === 'closed';
      E.eye.scale.set(cur.eyeS, cur.eyeS * bl, cur.eyeS);
      E.browG.children[0].position.y = cur.browY;
      E.browG.children[0].rotation.z = Math.PI / 2 + (E.side === -1 ? 1 : -1) * cur.browRot;   // 擔心:內側(靠近鼻樑)那端抬高
    });
    smile.visible = mood === 'happy' || mood === 'wink' || mood === 'sleep';
    smile.scale.setScalar(mood === 'sleep' ? .7 : 1);
    sad.visible = mood === 'oops';
    openG.visible = mood === 'talk' || mood === 'wow';
    bigG.visible = mood === 'cheer';
    if (mood === 'talk') openG.scale.set(1, .4 + .75 * Math.abs(Math.sin(t * 10)), 1);
    else if (mood === 'wow') openG.scale.set(.75, 1.25, 1);

    renderer.render(scene, camera);
  }

  let raf = 0, last = 0, running = false, onScreen = true;
  const sync = () => {
    const want = onScreen && !document.hidden;
    if (want && !running) { running = true; last = 0; raf = requestAnimationFrame(frame); }
    else if (!want && running) { running = false; cancelAnimationFrame(raf); }
  };
  const ro = new ResizeObserver(layout); ro.observe(container);
  const io = new IntersectionObserver(es => { onScreen = es[es.length - 1].isIntersecting; sync(); }); io.observe(container);
  document.addEventListener('visibilitychange', sync);
  layout(); sync();

  return {
    setMood(m) { if (MOODS[m]) mood = m; },
    /** nx, ny:-1~1(右、上為正) */
    look(nx, ny) { tx = Math.max(-1, Math.min(1, nx)); ty = Math.max(-1, Math.min(1, ny)); },
    dispose() {
      running = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', sync);
      scene.traverse(o => { o.geometry?.dispose?.(); const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach(x => x.dispose()); });
      renderer.dispose(); renderer.forceContextLoss?.(); renderer.domElement.remove();
    },
  };
}
