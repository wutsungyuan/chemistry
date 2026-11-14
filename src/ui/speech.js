// 語音朗讀(Web Speech API):挑裝置上最自然的聲音、依階段調整語速與音高、把符號整理成好念的文字、長文切成一句一句。
// 挑聲音與整理文字的邏輯在 ui/voice.js(純函式,有測試);這裡只負責和瀏覽器溝通。
// 用法:speak(text) 開始朗讀;同一段正在念時再按一次 = 停止;換頁時呼叫 stopSpeaking()。
import { state } from '../i18n/index.js';
import { getLevel } from './level.js';
import { pickVoice, prosodyFor, speakable, chunkText, SPEECH_LANG } from './voice.js';

const synth = () => (typeof window !== 'undefined' && window.speechSynthesis) || null;
export const canSpeak = () => !!synth();

let voices = [], current = null, token = 0;
const loadVoices = () => { voices = synth()?.getVoices() || []; };
if (synth()) { loadVoices(); synth().addEventListener?.('voiceschanged', loadVoices); }     // 聲音清單常常是非同步載入的

export function stopSpeaking() { token++; current = null; synth()?.cancel(); }
export const isSpeaking = () => current !== null;

/** 目前語言會用哪個聲音(給除錯或之後的設定畫面用) */
export const currentVoice = () => pickVoice(voices.length ? voices : synth()?.getVoices() || [], SPEECH_LANG[state.lang] || SPEECH_LANG.zh);

export function speak(text, id = text) {
  const s = synth(); if (!s) return;
  if (current === id) { stopSpeaking(); return; }                     // 再按一次 = 停止
  stopSpeaking();
  const lang = SPEECH_LANG[state.lang] || SPEECH_LANG.zh;
  const chunks = chunkText(speakable(text, lang)); if (!chunks.length) return;
  const my = ++token; current = id;
  const voice = pickVoice(voices.length ? voices : s.getVoices(), lang);
  const { rate, pitch } = prosodyFor(getLevel(), state.lang);
  chunks.forEach((c, i) => {
    const u = new SpeechSynthesisUtterance(c);
    u.lang = voice?.lang || lang; if (voice) u.voice = voice;
    u.rate = rate; u.pitch = pitch;
    u.onend = u.onerror = () => { if (token === my && i === chunks.length - 1) current = null; };
    s.speak(u);
  });
}
