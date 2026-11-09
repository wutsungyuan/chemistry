import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

/** 建立一個含相機/燈光/控制器/標籤層的 3D 舞台。 */
export function createStage(container, { camPos = [0, 2, 9], bg = 0x0f1530, controls = true } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'canvas-wrap';
  container.appendChild(wrap);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  wrap.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  Object.assign(labelRenderer.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
  wrap.appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();
  // 背景透明,由 CSS(.canvas-wrap)提供漸層與星點
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.set(...camPos);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x445577, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(5, 8, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x88aaff, 0.9);
  rim.position.set(-6, -3, -5);
  scene.add(rim);

  let orbit = null;
  if (controls) {
    orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.08;
  }

  let shiftFn = null, lastShift = null, lastW = 0, lastH = 0;
  const frameFns = new Set();
  const clock = new THREE.Clock();
  let raf = 0, alive = true;

  function resize() {
    const w = wrap.clientWidth || 1, h = wrap.clientHeight || 1;
    renderer.setSize(w, h);
    labelRenderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(wrap);
  resize();

  function loop() {
    if (!alive) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    frameFns.forEach(f => f(dt, t));
    if (shiftFn) { // 把畫面中心平移,讓 3D 物件落在不被面板遮住的區域(不影響旋轉中心)
      const w = wrap.clientWidth, h = wrap.clientHeight, r = shiftFn();
      const sx = Math.round(Array.isArray(r) ? r[0] : r), sy = Math.round(Array.isArray(r) ? r[1] : 0);
      const key = sx + ',' + sy;
      if (key !== lastShift || w !== lastW || h !== lastH) {
        lastShift = key; lastW = w; lastH = h;
        if (sx || sy) camera.setViewOffset(w, h, -sx, sy, w, h); else camera.clearViewOffset();
      }
    }
    orbit?.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }
  loop();

  return {
    scene, camera, renderer, labelRenderer, controls: orbit, el: renderer.domElement,
    setCenterShift(fn) { shiftFn = fn; },
    onFrame(fn) { frameFns.add(fn); return () => frameFns.delete(fn); },
    dispose() {
      alive = false; cancelAnimationFrame(raf); ro.disconnect();
      orbit?.dispose();
      scene.traverse(o => { if (o.isMesh) { o.geometry?.dispose?.(); } });
      renderer.dispose();
      wrap.remove();
    },
  };
}
