// 朗讀用的「挑聲音、整理文字、切句子」純函式(不碰瀏覽器 API,方便測試)。
// 目標:不要用傳統那種機械感很重的聲音(例如桌機 Chrome 預設的 Google 英文聲音),盡量挑裝置上最自然的。
//   優先順序:神經網路/自然聲音(Microsoft「Natural / Online」)> 高品質/增強版(Apple「Enhanced / Premium」、Siri)>
//   裝置內建的好聲音(Microsoft 的 Hanhan / Yating 等、Apple 的 Mei-Jia)> Google 的雲端聲音 > eSpeak 之類的合成聲(最後)。

/** 一個聲音的分數(越高越好);語言不符回傳 -Infinity */
export function scoreVoice(v, lang) {
  const want = lang.toLowerCase(), have = String(v.lang || '').toLowerCase().replace('_', '-');
  const wantBase = want.split('-')[0];
  if (have.split('-')[0] !== wantBase) return -Infinity;
  const name = String(v.name || '');
  let s = 0;
  s += have === want ? 100 : 40;                                                   // 完全同語言/地區 vs 只有語言相同(例如 zh-CN 對 zh-TW、en-GB 對 en-US)
  if (/natural|neural|online|自然|神經/i.test(name)) s += 90;                       // Microsoft 的自然/神經網路聲音
  if (/premium|enhanced|高品質|增強|擴充/i.test(name)) s += 60;                      // Apple 下載的高品質聲音
  if (/siri/i.test(name)) s += 55;
  if (/^microsoft /i.test(name)) s += 25;                                           // Windows 內建的 Hanhan、Yating、Zhiwei、Zira…
  if (/mei-?jia|美佳|ting-?ting|sin-?ji|samantha|karen|daniel|moira|tessa|ava|allison/i.test(name)) s += 25;   // Apple 的常見好聲音
  if (v.localService) s += 10;                                                      // 本機聲音:離線也能用、聲音一致
  if (/google/i.test(name)) s -= 70;                                                // 機械感重的雲端聲音(使用者明確不要)
  if (/compact|espeak|festival|pico/i.test(name)) s -= 90;                          // 簡易/開源合成聲
  if (/novelty|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|organ|trinoids|whisper|wobble|zarvox|albert|fred|junior|kathy|ralph/i.test(name)) s -= 200;   // macOS 的趣味聲音
  return s;
}

/** 從聲音清單挑出最適合的;沒有同語言的聲音就回傳 null(讓瀏覽器自己用 utterance.lang 決定) */
export function pickVoice(voices, lang) {
  let best = null, bestScore = -Infinity;
  for (const v of voices || []) { const sc = scoreVoice(v, lang); if (sc > bestScore) { best = v; bestScore = sc; } }
  return bestScore === -Infinity ? null : best;
}

/** 各階段的語速與音高。國小的兩組是使用者在審稿頁的試聽台聽過後親自選的(中文:美佳 .85 / 1.00;英文:英式 Daniel .70 / .95);國中、高中沿用較快的正式旁白 */
export const PROSODY = {
  kid: { zh: { rate: 0.85, pitch: 1.0 }, en: { rate: 0.7, pitch: 0.95 } },
  teen: { zh: { rate: 0.95, pitch: 1.0 }, en: { rate: 0.95, pitch: 0.95 } },
  high: { zh: { rate: 1.0, pitch: 0.96 }, en: { rate: 1.0, pitch: 0.94 } },
};
/** 朗讀用的語言代碼:中文用台灣國語;英文用英式(使用者選的是 en-GB;沒有時 scoreVoice 會退到其他英文聲音) */
export const SPEECH_LANG = { zh: 'zh-TW', en: 'en-GB' };
export const prosodyFor = (level, lang = 'zh') => (PROSODY[level] || PROSODY.kid)[lang === 'en' ? 'en' : 'zh'];

const SUB = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9', '⁺': '+', '⁻': '-' };
const SUPER = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };

/** 「重」讀ㄓㄨㄥˋ(重量、很重、半重。)的情況;「重新、重複」讀ㄔㄨㄥˊ,不在內 */
const HEAVY = /重(?=[。，！？；、：,.!?;:\s]|$|了|的|量|力|要|一點|一些|一倍)|(?<=[很太半輕變好更最較麼氫])重/g;
/**
 * 把畫面上的文字整理成適合念的文字:下標數字、箭頭、單位、希臘字母等,不讓語音引擎自己亂念符號。
 * 例:'2H₂ + O₂ → 2H₂O'(中文)→ '2 H2 加 O2 變成 2 H2O'
 */
export function speakable(text, lang = 'zh-TW') {
  const zh = lang.toLowerCase().startsWith('zh');
  let s = String(text ?? '');
  s = s.replace(/<[^>]*>/g, ' ');                                                  // 萬一混進 HTML 標籤
  if (!zh) s = s.replace(/。/g, '. ').replace(/，/g, ', ').replace(/！/g, '! ').replace(/？/g, '? ');   // 英文朗讀:程式拼接時用的全形標點(。，！？)換成英文標點
  s = s.replace(/[₀-₉⁺⁻]/g, c => SUB[c] || c).replace(/[⁰¹²³⁴-⁹]/g, c => SUPER[c] || c);
  s = s.replace(/([A-Za-z\)])(\d)/g, '$1 $2').replace(/(\d)([A-Za-z])/g, '$1 $2');  // H2O → H 2 O(逐字念,不會念成「H 二十」)
  const R = zh
    ? [[/→/g, ' 變成 '], [/⇌/g, ' 可逆反應 '], [/≈/g, ' 約 '], [/±/g, ' 正負 '], [/×/g, ' 乘 '], [/−/g, ' 負 '], [/°C|℃/g, ' 度 '], [/°/g, ' 度 '], [/Å/g, ' 埃 '], [/Δ/g, ' 變化量 '], [/\+/g, ' 加 '], [/=/g, ' 等於 '], [/%/g, ' % ']]
    : [[/→/g, ' yields '], [/⇌/g, ' is in equilibrium with '], [/≈/g, ' about '], [/±/g, ' plus or minus '], [/×/g, ' times '], [/−/g, ' minus '], [/°C|℃/g, ' degrees Celsius '], [/°/g, ' degrees '], [/Å/g, ' angstroms '], [/Δ/g, ' delta '], [/\+/g, ' plus '], [/=/g, ' equals '], [/%/g, ' percent ']];
  for (const [re, to] of R) s = s.replace(re, to);
  if (zh) s = s.replace(HEAVY, '仲');                                            // 「重」當「很重」念時(ㄓㄨㄥˋ):有些聲音會唸成ㄔㄨㄥˊ,換成同音的「仲」
  s = s.replace(/[•·●]/g, ' ').replace(/[🎉✅💡🏠📊📚🔊🧮📐🎯⭐✨💫]/gu, ' ');
  return s.replace(/\s+/g, ' ').replace(/\s+([,。!?;:、,.!?;:])/g, '$1').trim();         // 標點前面不留空白
}

/** 把長文字切成一句一句(語音引擎對很長的一段容易中途停掉,尤其 iOS 與 Chrome);每段盡量不超過 max 個字 */
export function chunkText(text, max = 110) {
  const parts = String(text).split(/(?<=[。!?!?;;…\n])|(?<=[.!?]\s)/u).map(x => x.trim()).filter(Boolean);
  const out = [];
  for (const p of parts) {
    if (p.length <= max) { out.push(p); continue; }
    let rest = p;
    while (rest.length > max) {                                                      // 句子本身太長:找最近的逗號/空白切開
      let cut = Math.max(rest.lastIndexOf(',', max), rest.lastIndexOf(',', max), rest.lastIndexOf('、', max), rest.lastIndexOf(' ', max));
      if (cut < max * 0.4) cut = max;
      out.push(rest.slice(0, cut + 1).trim()); rest = rest.slice(cut + 1);
    }
    if (rest.trim()) out.push(rest.trim());
  }
  return out;
}

/** 標點後的停頓(毫秒):逗號 250;句號、分號、頓號、問號、驚嘆號 300(使用者指定) */
export const PAUSE = { comma: 250, stop: 300 };
const SOFT = new Set(['，', ',', '：', ':']);                       // 逗號、冒號 → comma
const HARD = new Set(['。', '；', ';', '、', '！', '？', '!', '?', '…', '\n']);   // 句號、分號、頓號… → stop
const CLOSERS = new Set(['」', '』', '）', ')', '”', '’', '"']);
/** 依標點把文字切成短句,並記下每句念完後要停多久:[{ t, gap }]。英文的 . 只在後面是空白或結尾時才算句號(避免切到 4.2) */
export function chunkWithPauses(text, max = 110) { return chunkSpans(text, max).map(({ t, gap }) => ({ t, gap })); }

/** 同上,但每句多帶 s、e:這句在原文裡的起訖位置(text.slice(s, e) === t),給「念到哪、哪裡亮起來」用 */
export function chunkSpans(text, max = 110) {
  const s = String(text), out = [];
  let buf = '', start = 0;
  const push = gap => {
    const t = buf.trim(), at = start + (buf.length - buf.trimStart().length);
    start += buf.length; buf = '';
    if (t) out.push({ t, gap, s: at, e: at + t.length });
  };
  for (let i = 0; i < s.length; i++) {
    const c = s[i]; buf += c;
    const end = i + 1 >= s.length || /\s/.test(s[i + 1]);
    let gap = 0;
    if (SOFT.has(c)) gap = (c === ',' || c === ':') && !end ? 0 : PAUSE.comma;
    else if (HARD.has(c)) gap = (c === ';' || c === '!' || c === '?') && !end ? 0 : PAUSE.stop;
    else if (c === '.' && end) gap = PAUSE.stop;
    if (!gap) continue;
    while (i + 1 < s.length && CLOSERS.has(s[i + 1])) buf += s[++i];
    push(gap);
  }
  push(0);
  // 太長的一段(幾乎不會發生)再用 chunkText 的老辦法切
  return out.flatMap(o => {
    if (o.t.length <= max) return [o];
    let from = o.s;
    return chunkText(o.t, max).map((t, k, a) => {
      const at = s.indexOf(t, from); from = at + t.length;
      return { t, gap: k === a.length - 1 ? o.gap : 0, s: at, e: from };
    });
  });
}
