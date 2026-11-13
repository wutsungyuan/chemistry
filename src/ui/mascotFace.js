// 原子小博士的長相與表情。
// 角色:圓滾滾的藍色原子寶寶,穿小白袍打紅領結,身後有電子繞著轉。
// 預設用 three.js 畫成立體(mascot3d.js);沒有 WebGL 時退回 2D 的 SVG 版(下面的 MASCOT_SVG,表情靠 mascot.css 的 data-mood)。
// 表情(mood):happy 微笑 | talk 說話 | wow 驚訝 | cheer 開心大笑 | wink 眨單眼 | oops 擔心 | sleep 睡覺
import './mascot.css';

export const MASCOT_SVG = `<svg viewBox="0 0 120 130" width="100%" height="100%" aria-hidden="true">
  <g class="m-orbits">
    <g fill="none" stroke="#bfe6ff" stroke-width="2.6" opacity=".95">
      <ellipse cx="60" cy="62" rx="56" ry="18"/><ellipse cx="60" cy="62" rx="56" ry="18" transform="rotate(60 60 62)"/><ellipse cx="60" cy="62" rx="56" ry="18" transform="rotate(120 60 62)"/>
    </g>
    <circle cx="116" cy="62" r="5.5" fill="#ffd23f"/><circle cx="32" cy="110.5" r="5.5" fill="#ff7aa8"/><circle cx="32" cy="13.5" r="5.5" fill="#6fdc8c"/>
  </g>
  <path d="M30 128 Q30 104 60 102 Q90 104 90 128 Z" fill="#fff" stroke="#cfd6ff" stroke-width="2"/>
  <path d="M60 102 L50 114 L60 111 L70 114 Z" fill="#fff" stroke="#cfd6ff" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M60 108 L51 103 L51 113 Z M60 108 L69 103 L69 113 Z" fill="#ff5a6e"/><circle cx="60" cy="108" r="3" fill="#e63a52"/>
  <g class="m-arm"><circle cx="97" cy="114" r="7" fill="#7fe3ff" stroke="#1e6fd0" stroke-width="2"/></g>
  <circle cx="23" cy="114" r="7" fill="#7fe3ff" stroke="#1e6fd0" stroke-width="2"/>
  <defs><radialGradient id="mg" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#b8f0ff"/><stop offset=".55" stop-color="#5fc8ff"/><stop offset="1" stop-color="#3a8cf0"/></radialGradient></defs>
  <circle cx="60" cy="62" r="42" fill="url(#mg)" stroke="#1e6fd0" stroke-width="2.6"/>
  <ellipse cx="42" cy="38" rx="13" ry="7" fill="#fff" opacity=".5" transform="rotate(-28 42 38)"/>
  <ellipse cx="34" cy="74" rx="8" ry="5" fill="#ff8fb1" opacity=".75" class="m-cheek"/><ellipse cx="86" cy="74" rx="8" ry="5" fill="#ff8fb1" opacity=".75" class="m-cheek"/>
  <g class="br br-l"><path d="M37 45 Q47 39 57 45" fill="none" stroke="#1b2a5c" stroke-width="3.2" stroke-linecap="round"/></g>
  <g class="br br-r"><path d="M63 45 Q73 39 83 45" fill="none" stroke="#1b2a5c" stroke-width="3.2" stroke-linecap="round"/></g>
  <g class="m-eyes">
    <g class="en enl"><circle cx="47" cy="60" r="11" fill="#fff" stroke="#1b2a5c" stroke-width="2.4"/><g class="m-pl"><circle cx="47" cy="61" r="6.2" fill="#1b2a5c"/><circle cx="44.6" cy="58.6" r="2.3" fill="#fff"/><circle cx="49.6" cy="63.4" r="1.2" fill="#fff"/></g></g>
    <g class="en enr"><circle cx="73" cy="60" r="11" fill="#fff" stroke="#1b2a5c" stroke-width="2.4"/><g class="m-pr"><circle cx="73" cy="61" r="6.2" fill="#1b2a5c"/><circle cx="70.6" cy="58.6" r="2.3" fill="#fff"/><circle cx="75.6" cy="63.4" r="1.2" fill="#fff"/></g></g>
  </g>
  <g class="eh ehl"><path d="M36 63 Q47 49 58 63" fill="none" stroke="#1b2a5c" stroke-width="4" stroke-linecap="round"/></g>
  <g class="eh ehr"><path d="M62 63 Q73 49 84 63" fill="none" stroke="#1b2a5c" stroke-width="4" stroke-linecap="round"/></g>
  <g class="ec"><path d="M37 61 Q47 68 57 61 M63 61 Q73 68 83 61" fill="none" stroke="#1b2a5c" stroke-width="3.4" stroke-linecap="round"/></g>
  <g class="mo mo-smile"><path d="M50 78 Q60 88 70 78" fill="none" stroke="#1b2a5c" stroke-width="3.4" stroke-linecap="round"/></g>
  <g class="mo mo-talk"><ellipse cx="60" cy="81" rx="7.5" ry="6" fill="#7a1f3d" stroke="#1b2a5c" stroke-width="2.4"/><ellipse cx="60" cy="84" rx="4.2" ry="2.4" fill="#ff7a96"/></g>
  <g class="mo mo-o"><ellipse cx="60" cy="83" rx="5.2" ry="7" fill="#7a1f3d" stroke="#1b2a5c" stroke-width="2.4"/></g>
  <g class="mo mo-big"><path d="M46 76 Q60 102 74 76 Z" fill="#7a1f3d" stroke="#1b2a5c" stroke-width="2.6" stroke-linejoin="round"/><path d="M53 88 Q60 82 67 88 Q60 95 53 88Z" fill="#ff7a96"/></g>
  <g class="mo mo-sad"><path d="M51 85 Q60 76 69 85" fill="none" stroke="#1b2a5c" stroke-width="3.4" stroke-linecap="round"/></g>
  <g class="mo mo-z"><path d="M54 81 Q60 84 66 81" fill="none" stroke="#1b2a5c" stroke-width="3" stroke-linecap="round"/></g>
</svg>`;

/**
 * 把原子小博士放進 container(一個有大小的元素)。
 * 先試 3D;失敗(沒有 WebGL 等)就放 2D SVG。回傳 container 本身,之後用 setMood / trackPupils / startIdleMoods。
 */
export async function mountFace(container) {
  container.dataset.mood = 'happy';
  try {
    const { createMascot3D } = await import('./mascot3d.js');
    container._m = createMascot3D(container);
  } catch (err) {
    console.warn('3D mascot unavailable, using SVG', err);
    container.innerHTML = MASCOT_SVG;
  }
  return container;
}

/** 換表情;ms>0 時過一會兒自動回到微笑(sleep 不會被自動蓋掉) */
export function setMood(el, mood, ms = 0) {
  if (!el) return;
  clearTimeout(el._moodT);
  el.dataset.mood = mood; el._m?.setMood(mood);
  if (ms > 0) el._moodT = setTimeout(() => { if (el.dataset.mood !== 'sleep') { el.dataset.mood = 'happy'; el._m?.setMood('happy'); } }, ms);
}

/** 眼珠(3D 版連頭)跟著指標走;回傳取消函式 */
export function trackPupils(root) {
  const on = e => {
    const r = root.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height * 0.45);
    if (root._m) { root._m.look(dx / 260, -dy / 260); return; }
    const pl = root.querySelector('.m-pl'), pr = root.querySelector('.m-pr'); if (!pl) return;
    const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 200) * 3.6;
    pl.style.transform = pr.style.transform = `translate(${(dx / d) * k}px,${(dy / d) * k}px)`;
  };
  addEventListener('pointermove', on, { passive: true });
  return () => removeEventListener('pointermove', on);
}

/** 閒著時隨機換表情(給入口頁用);回傳停止函式 */
export function startIdleMoods(root, { moods = ['wink', 'talk', 'cheer', 'wow', 'wink'] } = {}) {
  let t;
  const step = () => {
    if (!document.hidden && root.dataset.mood !== 'sleep') setMood(root, moods[Math.floor(Math.random() * moods.length)], 1100 + Math.random() * 900);
    t = setTimeout(step, 2200 + Math.random() * 2200);
  };
  t = setTimeout(step, 1200);
  return () => clearTimeout(t);
}
