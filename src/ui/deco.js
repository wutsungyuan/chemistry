// 背景裝飾:底部的「實驗桌」小場景(有順序、有故事)+ 點擊閃光。純視覺,不影響操作。
// 故事:顯微鏡觀察 → 燒瓶冒泡做實驗 → 試管 → 「氫+氫+氧=水」→ 點子燈泡 → 望遠鏡探索更遠
const item = (emoji, bubbles = false) =>
  `<div class="it">${bubbles ? '<i class="b b1"></i><i class="b b2"></i><i class="b b3"></i>' : ''}<span>${emoji}</span></div>`;
const atom = (sym, c) => `<i class="at" style="--c:${c}">${sym}</i>`;

export function mountDeco() {
  const root = document.getElementById('deco');
  if (!root) return;
  root.innerHTML = `
    <div class="bench">
      ${item('🔬')}
      ${item('⚗️', true)}
      ${item('🧪', true)}
      <div class="eq">${atom('H', '#e8f0ff')}<b>+</b>${atom('H', '#e8f0ff')}<b>+</b>${atom('O', '#ff5a5a')}<b>=</b><span>💧</span></div>
      ${item('💡')}
      ${item('🔭')}
    </div>`;

  // 點按鈕時冒出閃光
  document.addEventListener('click', e => {
    if (!e.target.closest?.('button')) return;
    for (let i = 0; i < 5; i++) {
      const s = document.createElement('span');
      s.className = 'spark';
      s.textContent = ['✨', '⭐', '💫'][i % 3];
      const a = (i / 5) * Math.PI * 2 + 0.6, r = 44 + (i % 3) * 12;
      s.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;--dx:${Math.cos(a) * r}px;--dy:${Math.sin(a) * r}px`;
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 750);
    }
  }, true);
}
