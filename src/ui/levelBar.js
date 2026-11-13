import { T } from '../i18n/index.js';
import { LEVELS, setLevel } from './level.js';

// 「🌱 國小 / 🔭 國中 / 🎓 高中」三個階段的選擇鈕:電子雲、原子核與同位素、物質的變化共用。
// 用法:innerHTML 放 levelChipsHTML(level);再 bindLevelChips(容器, 新階段 => 重畫)。選擇會存起來(ui/level.js)。
export const levelChipsHTML = level =>
  `<span class="cl-levels">${LEVELS.map(l => `<button class="chip${l === level ? ' on' : ''}" data-level="${l}">${T('level.' + l)}</button>`).join('')}</span>`;

export function bindLevelChips(root, onChange) {
  root.querySelectorAll('[data-level]').forEach(b => { b.onclick = () => { setLevel(b.dataset.level); onChange(b.dataset.level); }; });
}
