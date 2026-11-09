import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { BY_SYMBOL } from '../data/elements.js';

export const POS = 1.6; // 埃 → 場景單位
export const sphereGeo = new THREE.SphereGeometry(1, 32, 20);
export const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 12, 1, true);
const matCache = new Map();
export function atomMaterial(color) {
  if (!matCache.has(color)) matCache.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.05 }));
  return matCache.get(color);
}
export const bondMat = new THREE.MeshStandardMaterial({ color: 0xd8dcf0, roughness: 0.5 });
export const ionicMat = new THREE.MeshStandardMaterial({ color: 0x7fe0ff, transparent: true, opacity: 0.45, roughness: 0.5 });

export function atomRadius(sym, style = 'ball') {
  const r = (BY_SYMBOL[sym]?.radius ?? 0.7);
  return style === 'space' ? r * 1.1 : r * 0.5;
}

const UP = new THREE.Vector3(0, 1, 0);
/** 在 a,b 之間建立一根(或多根)圓柱 */
export function makeBond(a, b, order = 1, ionic = false) {
  const g = new THREE.Group();
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  if (len < 1e-4) return g;
  dir.normalize();
  const side = new THREE.Vector3().crossVectors(dir, Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : UP).normalize();
  const n = ionic ? 1 : order;
  const radius = ionic ? 0.05 : (n === 1 ? 0.09 : 0.065);
  const gap = 0.14;
  for (let k = 0; k < n; k++) {
    const m = new THREE.Mesh(cylGeo, ionic ? ionicMat : bondMat);
    const off = (k - (n - 1) / 2) * gap;
    m.position.copy(a).add(b).multiplyScalar(0.5).addScaledVector(side, off);
    m.quaternion.setFromUnitVectors(UP, dir);
    m.scale.set(radius, len, radius);
    g.add(m);
  }
  return g;
}

/**
 * 依分子資料建立 3D 群組
 * opts: style 'ball' | 'space', labels (顯示元素符號)
 */
export function buildMolecule(mol, { style = 'ball', labels = false } = {}) {
  const root = new THREE.Group();
  root.userData = { mol, style };
  // 置中
  const c = new THREE.Vector3();
  mol.atoms.forEach(a => c.add(new THREE.Vector3(a[1], a[2], a[3])));
  c.divideScalar(mol.atoms.length || 1);

  const atoms = [];
  mol.atoms.forEach(([sym, x, y, z], i) => {
    const el = BY_SYMBOL[sym];
    const m = new THREE.Mesh(sphereGeo, atomMaterial(el.color));
    m.position.set((x - c.x) * POS, (y - c.y) * POS, (z - c.z) * POS);
    m.scale.setScalar(atomRadius(sym, style));
    m.userData = { sym, index: i, kind: 'atom' };
    if (labels) {
      const div = document.createElement('div');
      div.className = 'label3d'; div.textContent = sym;
      if (sym === 'H' || sym === 'Na') div.style.color = '#fff';
      const lab = new CSS2DObject(div);
      lab.position.set(0, 0, 0);
      m.add(lab);
      m.userData.label = lab;
    }
    root.add(m); atoms.push(m);
  });
  const bondGroup = new THREE.Group();
  mol.bonds.forEach(([i, j, order, kind]) => {
    bondGroup.add(makeBond(atoms[i].position, atoms[j].position, order, kind === 'ionic'));
  });
  root.add(bondGroup);
  root.userData.atoms = atoms;
  root.userData.bonds = bondGroup;
  setStyle(root, style);
  return root;
}

export function setStyle(root, style) {
  root.userData.style = style;
  root.userData.atoms.forEach(m => m.scale.setScalar(atomRadius(m.userData.sym, style)));
  root.userData.bonds.visible = style !== 'space';
}

export function molRadius(root) {
  let r = 0;
  root.userData.atoms.forEach(m => { r = Math.max(r, m.position.length() + m.scale.x); });
  return r;
}

/** 小爆炸粒子效果 */
export function burst(scene, pos, color = 0xffd23f, count = 40) {
  const geo = new THREE.BufferGeometry();
  const arr = new Float32Array(count * 3);
  const vel = [];
  for (let i = 0; i < count; i++) {
    vel.push(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(1 + Math.random() * 2.5));
    arr.set([pos.x, pos.y, pos.z], i * 3);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const mat = new THREE.PointsMaterial({ color, size: 0.18, transparent: true, opacity: 1, depthWrite: false });
  const pts = new THREE.Points(geo, mat);
  scene.add(pts);
  let life = 0;
  return {
    pts,
    update(dt) {
      life += dt;
      const p = geo.attributes.position;
      for (let i = 0; i < count; i++) {
        p.setXYZ(i, p.getX(i) + vel[i].x * dt, p.getY(i) + vel[i].y * dt, p.getZ(i) + vel[i].z * dt);
      }
      p.needsUpdate = true;
      mat.opacity = Math.max(0, 1 - life / 1.2);
      if (life > 1.2) { scene.remove(pts); geo.dispose(); mat.dispose(); return false; }
      return true;
    },
  };
}
