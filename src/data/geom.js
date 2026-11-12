// 原子座標的幾何小工具:一律用 three.js 的 Vector3 / Matrix3 / MathUtils,不自己寫向量運算。
// 原子格式 [符號, x, y, z]。
import { Vector3, MathUtils } from 'three';

/** 原子 → Vector3 */
export const vec = a => new Vector3(a[1], a[2], a[3]);

/** 兩個原子(索引)之間的距離 */
export const bondLength = (atoms, i, j) => vec(atoms[i]).distanceTo(vec(atoms[j]));

/** 以 c 為中心,a–c–b 的夾角(度) */
export const angleAt = (c, a, b) => MathUtils.radToDeg(vec(a).sub(vec(c)).angleTo(vec(b).sub(vec(c))));

/** 原子清單的幾何中心 */
export const centroid = atoms => atoms.reduce((s, a) => s.add(vec(a)), new Vector3()).divideScalar(atoms.length || 1);

/** 把原子整體平移,使幾何中心在原點,座標取到 0.001 Å */
export function centered(atoms) {
  const c = centroid(atoms);
  return atoms.map(a => [a[0], +(a[1] - c.x).toFixed(3), +(a[2] - c.y).toFixed(3), +(a[3] - c.z).toFixed(3)]);
}
