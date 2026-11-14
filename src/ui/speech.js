// 語音朗讀(Web Speech API):挑裝置上最自然的聲音、依階段調整語速與音高、把符號整理成好念的文字、長文切成一句一句。
// 挑聲音與整理文字的邏輯在 ui/voice.js(純函式,有測試);這裡只負責和瀏覽器溝通。
// 用法:speak(text) 開始朗讀;同一段正在念時再按一次 = 停止;換頁時呼叫 stopSpeaking()。
import { state } from '../i18n/index.js';
import { getLevel } from './level.js';
import { pickVoice, prosodyFor, speakable, chunkWithPauses, SPEECH_LANG } from './voice.js';

const synth = () => (typeof window !== 'undefined' && window.speechSynthesis) || null;
export const canSpeak = () => !!synth();

let voices = [], current = null, token = 0;
const loadVoices = () => { voices = synth()?.getVoices() || []; };
if (synth()) { loadVoices(); synth().addEventListener?.('voiceschanged', loadVoices); }     // 聲音清單常常是非同步載入的

export function stopSpeaking() { token++; current = null; synth()?.cancel(); }
export const isSpeaking = () => current !== null;

/** 目前語言會用哪個聲音(給除錯或之後的設定畫面用) */
export const currentVoice = () => pickVoice(voices.length ? voices : synth()?.getVoices() || [], SPEECH_LANG[state.lang] || SPEECH_LANG.zh);

/** text 可以是字串,或「段落陣列」:段落之間(例如標題與內文之間)會停一下,聽起來才有頓挫。gaps[i] = 第 i 段念完後的停頓毫秒數 */
export function speak(text, id = Array.isArray(text) ? text.join('|') : text, gaps = []) {
  const s = synth(); if (!s) return;
  if (current === id) { stopSpeaking(); return; }                     // 再按一次 = 停止
  stopSpeaking();
  const lang = SPEECH_LANG[state.lang] || SPEECH_LANG.zh;
  const items = [];                                                    // { t: 要念的字, gap: 念完後停幾毫秒 }
  (Array.isArray(text) ? text : [text]).forEach((seg, si) => {
    const cs = chunkWithPauses(speakable(seg, lang));                // 逗號 250、句號/分號/頓號 300(見 voice.js 的 PAUSE)
    cs.forEach((c, ci) => items.push({ t: c.t, gap: ci === cs.length - 1 && gaps[si] != null ? gaps[si] : c.gap }));
  });
  if (!items.length) return;
  const my = ++token; current = id;
  const voice = pickVoice(voices.length ? voices : s.getVoices(), lang);
  const { rate, pitch } = prosodyFor(getLevel(), state.lang);
  const play = i => {
    if (token !== my) return;
    if (i >= items.length) { current = null; return; }
    const u = new SpeechSynthesisUtterance(items[i].t);
    u.lang = voice?.lang || lang; if (voice) u.voice = voice;
    u.rate = rate; u.pitch = pitch;
    let done = false;
    u.onend = u.onerror = () => { if (done) return; done = true; setTimeout(() => play(i + 1), items[i].gap); };
    s.speak(u);
  };
  play(0);
}
