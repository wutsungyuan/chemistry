// 「元素星球」標誌:星球和原子都是球體,所以合在一起——中間一顆有光澤的星球(像原子核),外面兩圈電子軌道,軌道上的電子是小球
// (黃、粉紅、薄荷綠,沿用 CPK 元素色的習慣)。軌道分「後半圈(在星球後面)」與「前半圈(在星球前面)」,才有立體感。
// 一份 SVG 給入口頁與標題列共用;三個版本(國小、國中、高中)的背景都看得清楚。
// uid:同一頁出現多個標誌時,漸層的 id 不能重複。
export function logoSVG(size = 32, uid = 'lg') {
  const back = 'M5 32 A27 9 0 0 1 59 32', front = 'M59 32 A27 9 0 0 1 5 32';
  const ring = 'fill="none" stroke="#cfe8ff" stroke-width="2" stroke-linecap="round"';
  return `<svg class="logo" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true" focusable="false">
  <defs>
    <radialGradient id="${uid}p" cx=".34" cy=".3" r=".85"><stop offset="0" stop-color="#9fe8ff"/><stop offset=".55" stop-color="#3f8cff"/><stop offset="1" stop-color="#2b3fb8"/></radialGradient>
    <radialGradient id="${uid}y" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#fff3b0"/><stop offset="1" stop-color="#ffc21f"/></radialGradient>
    <radialGradient id="${uid}r" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#ffc2cb"/><stop offset="1" stop-color="#ff5d78"/></radialGradient>
    <radialGradient id="${uid}g" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#c8ffe6"/><stop offset="1" stop-color="#2fd6a0"/></radialGradient>
  </defs>
  <g transform="rotate(-24 32 32)"><path d="${back}" ${ring} opacity=".8"/></g>
  <g transform="rotate(38 32 32)"><path d="${back}" ${ring} opacity=".8"/></g>
  <circle cx="32" cy="32" r="14" fill="url(#${uid}p)"/>
  <ellipse cx="27" cy="26" rx="5.2" ry="3.2" fill="#fff" opacity=".45" transform="rotate(-30 27 26)"/>
  <g transform="rotate(-24 32 32)"><path d="${front}" ${ring}/><circle cx="6.6" cy="35.1" r="4.4" fill="url(#${uid}y)"/><circle cx="57.4" cy="35.1" r="5" fill="url(#${uid}r)"/></g>
  <g transform="rotate(38 32 32)"><path d="${front}" ${ring}/><circle cx="27.3" cy="40.9" r="4" fill="url(#${uid}g)"/></g>
</svg>`;
}
