// 「跟著唸」:朗讀時,念到哪個字,畫面上那個字就亮起來(中文、英文都可以)。
// prepare(el) 把一個元素裡的字拆成一格一格(中文一個字一格、英文一個字詞一格;已經有注音的 .zy 一個字就是一格,注音不算),
// 回傳 { text, line(a,b), mark(a,b), clear() }:text 是這個元素念出來的完整文字(位置以它為準)。
// line = 目前這一句(淡淡的底色),mark = 目前念到的字(明顯亮起來)。

const TOKEN = /([　-〿㐀-鿿＀-￯])|(\s+)|([^\s　-〿㐀-鿿＀-￯]+)/g;

export function prepare(root) {
  const units = [];                                    // { el: 元素, t: 文字, at: 起始位置 }(英文的空白也是一格,這樣整句的底色是連續的)
  let pos = 0;
  const add = (el, t) => { units.push({ el, t, at: pos }); pos += t.length; };

  const walk = node => {
    for (const n of [...node.childNodes]) {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        for (const m of n.data.matchAll(TOKEN)) {
          const sp = document.createElement('span'); sp.className = 'rd-u'; sp.textContent = m[0];
          frag.append(sp); add(sp, m[0]);
        }
        n.replaceWith(frag);
      } else if (n.nodeType === 1) {
        if (n.matches('.zp, rt, rp')) continue;        // 注音:不念、不亮
        if (n.classList.contains('zy')) { add(n, n.querySelector('.zh')?.textContent ?? ''); continue; }
        walk(n);
      }
    }
  };
  walk(root);

  const text = units.map(u => u.t).join('');
  let lineEls = [], markEls = [];
  const set = (arr, cls, a, b) => {
    arr.forEach(e => e.classList.remove(cls));
    const out = units.filter(u => u.el && u.at < b && u.at + u.t.length > a).map(u => u.el);
    out.forEach(e => e.classList.add(cls));
    return out;
  };
  return {
    text,
    line(a, b) { lineEls = set(lineEls, 'rd-line', a, b); return lineEls[0] || null; },
    mark(a, b) { markEls = set(markEls, 'rd-now', a, b); return markEls[0] || null; },
    clear() { lineEls.forEach(e => e.classList.remove('rd-line')); markEls.forEach(e => e.classList.remove('rd-now')); lineEls = []; markEls = []; },
  };
}

/** 若元素快要跑出畫面(太上面或太下面),慢慢捲到畫面中間 */
export function keepInView(el) {
  if (!el?.getBoundingClientRect) return;
  const r = el.getBoundingClientRect(), h = window.innerHeight || 0;
  if (r.top < 90 || r.bottom > h - 110) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
