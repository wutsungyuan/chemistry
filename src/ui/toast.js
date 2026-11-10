let timer;
export function toast(msg, ms = 2600) {
  const el = document.getElementById('toast');
  el.innerHTML = msg;
  // 顯示在頁首(含原子博士的話)與彩旗的下方,避免蓋住博士說的話
  const head = document.getElementById('head');
  if (head) el.style.top = Math.round(head.getBoundingClientRect().bottom + 34) + 'px';
  el.classList.add('show');
  clearTimeout(timer);
  timer = setTimeout(() => el.classList.remove('show'), ms);
}
