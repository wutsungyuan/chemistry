// 可選的語音朗讀(Web Speech API)
import { state } from '../i18n/index.js';
export function speak(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = state.lang === 'zh' ? 'zh-TW' : 'en-US';
  u.rate = 0.9;
  speechSynthesis.speak(u);
}
export const canSpeak = () => 'speechSynthesis' in window;
