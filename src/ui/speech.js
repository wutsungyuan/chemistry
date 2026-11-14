// 語音朗讀(Web Speech API):挑裝置上最自然的聲音、依階段調整語速與音高、把符號整理成好念的文字、長文切成一句一句。
// 挑聲音與整理文字的邏輯在 ui/voice.js(純函式,有測試);這裡只負責和瀏覽器溝通。
// 用法:speak(text) 開始朗讀;同一段正在念時再按一次 = 停止;換頁時呼叫 stopSpeaking()。
import { state } from '../i18n/index.js';
import { getLevel } from './level.js';
import { pickVoice, prosodyFor, speakable, chunkSpans, SPEECH_LANG } from './voice.js';

const synth = () => (typeof window !== 'undefined' && window.speechSynthesis) || null;
export const canSpeak = () => !!synth();

let voices = [], current = null, token = 0, cleanup = null;
const loadVoices = () => { voices = synth()?.getVoices() || []; };
if (synth()) { loadVoices(); synth().addEventListener?.('voiceschanged', loadVoices); }     // 聲音清單常常是非同步載入的

export function stopSpeaking() { token++; current = null; synth()?.cancel(); const c = cleanup; cleanup = null; c?.(); }
export const isSpeaking = () => current !== null;

/** 目前語言會用哪個聲音(給除錯或之後的設定畫面用) */
export const currentVoice = () => pickVoice(voices.length ? voices : synth()?.getVoices() || [], SPEECH_LANG[state.lang] || SPEECH_LANG.zh);

/** 這個字從 at 開始,「一個詞」到哪裡結束(沒有詞長資訊時用):中文一個字,英文一串非空白 */
const wordEnd = (t, at) => {
  if (at >= t.length) return t.length;
  if (/[　-〿㐀-鿿＀-￯]/.test(t[at])) return at + 1;
  let e = at; while (e < t.length && !/\s/.test(t[e])) e++;
  return Math.max(e, at + 1);
};
const EST_MS = { zh: 270, en: 380 };                                  // 引擎不回報「念到哪」時,每個字(英文每個字詞)大約的毫秒數(rate = 1)

/** text 可以是字串,或「段落陣列」:段落之間(例如標題與內文之間)會停一下,聽起來才有頓挫。gaps[i] = 第 i 段念完後的停頓毫秒數。
 *  hooks(可省略,給「念到哪、哪裡亮起來」用):onLine(si, s, e) 開始念第 si 段的 [s,e) 這一句;onWord(si, s, e) 念到這個字/詞;onDone() 念完或被停止。
 *  位置都是那一段文字的字元位置。 */
export function speak(text, id = Array.isArray(text) ? text.join('|') : text, gaps = [], hooks = {}) {
  const s = synth(); if (!s) return;
  if (current === id) { stopSpeaking(); return; }                     // 再按一次 = 停止
  stopSpeaking();
  const lang = SPEECH_LANG[state.lang] || SPEECH_LANG.zh;
  const items = [];                                                    // { si, t 原文, s, e 在該段的位置, say 要念的字, gap 念完後停幾毫秒 }
  (Array.isArray(text) ? text : [text]).forEach((seg, si) => {
    const cs = chunkSpans(seg);                                        // 逗號 250、句號/分號/頓號 300(見 voice.js 的 PAUSE)
    cs.forEach((c, ci) => items.push({ si, t: c.t, s: c.s, e: c.e, say: speakable(c.t, lang), gap: ci === cs.length - 1 && gaps[si] != null ? gaps[si] : c.gap }));
  });
  if (!items.length) return;
  const my = ++token; current = id;
  const voice = pickVoice(voices.length ? voices : s.getVoices(), lang);
  const { rate, pitch } = prosodyFor(getLevel(), state.lang);
  let est = null;
  const stopEst = () => { clearInterval(est); est = null; };
  cleanup = () => { stopEst(); hooks.onDone?.(); cleanup = null; };
  const play = i => {
    if (token !== my) return;
    if (i >= items.length) { const c = cleanup; current = null; c?.(); return; }
    const it = items[i];
    const u = new SpeechSynthesisUtterance(it.say);
    u.lang = voice?.lang || lang; if (voice) u.voice = voice;
    u.rate = rate; u.pitch = pitch;
    let done = false, gotBoundary = false;
    const at = idx => it.say.length === it.t.length ? idx : Math.round(idx / it.say.length * it.t.length);   // 念的字和畫面上的字不一樣長(例如 → 變成 yields)時按比例換算
    u.onstart = () => {
      if (token !== my) return;
      hooks.onLine?.(it.si, it.s, it.e);
      stopEst();
      setTimeout(() => {                                               // 0.5 秒後還沒收到任何「念到哪」的訊息(有些 iPhone 聲音不會送)→ 依時間估算
        if (token !== my || done || gotBoundary || !hooks.onWord) return;
        let pos = 0;
        const step = () => { const e = wordEnd(it.t, pos); hooks.onWord(it.si, it.s + pos, it.s + e); pos = e; if (pos >= it.t.length) stopEst(); };
        step();
        est = setInterval(step, EST_MS[state.lang === 'en' ? 'en' : 'zh'] / rate);
      }, 500);
    };
    u.onboundary = ev => {
      if (token !== my || (ev.name && ev.name !== 'word')) return;
      gotBoundary = true; stopEst();
      const a = Math.min(at(ev.charIndex), it.t.length - 1);
      const b = ev.charLength ? Math.max(a + 1, at(ev.charIndex + ev.charLength)) : wordEnd(it.t, a);
      hooks.onWord?.(it.si, it.s + a, it.s + Math.min(b, it.t.length));
    };
    u.onend = u.onerror = () => { if (done) return; done = true; stopEst(); setTimeout(() => play(i + 1), it.gap); };
    s.speak(u);
  };
  play(0);
}
