// 朗讀:挑聲音(不要機械的 Google 聲音)、依階段的語速、符號整理、切句子。
import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreVoice, pickVoice, prosodyFor, SPEECH_LANG, speakable, chunkText, chunkWithPauses } from '../src/ui/voice.js';

const V = (name, lang, localService = true) => ({ name, lang, localService });
// 這台 Windows 電腦實際列出來的聲音(中文 3 個 Microsoft 本機聲音,英文只有 Google 的雲端聲音)
const WINDOWS = [V('Microsoft Hanhan - Chinese (Traditional, Taiwan)', 'zh-TW'), V('Microsoft Yating - Chinese (Traditional, Taiwan)', 'zh-TW'), V('Microsoft Zhiwei - Chinese (Traditional, Taiwan)', 'zh-TW'),
  V('Google US English', 'en-US', false), V('Google UK English Female', 'en-GB', false), V('Google 日本語', 'ja-JP', false)];
const IPHONE = [V('Mei-Jia', 'zh-TW'), V('Ting-Ting', 'zh-CN'), V('Samantha', 'en-US'), V('Daniel', 'en-GB'), V('Samantha (Enhanced)', 'en-US'), V('Bad News', 'en-US'), V('Zarvox', 'en-US')];
const ANDROID = [V('Google 國語 (臺灣)', 'zh-TW', false), V('Google US English', 'en-US', false)];

test('Windows:中文挑 Microsoft 的本機聲音;英文只有 Google 時仍能用(不會回傳 null),有 Microsoft 英文聲音就改用它', () => {
  assert.match(pickVoice(WINDOWS, 'zh-TW').name, /^Microsoft /);
  assert.equal(pickVoice(WINDOWS, 'en-US').name, 'Google US English');                         // 沒得選就用它
  const withMs = [...WINDOWS, V('Microsoft Zira - English (United States)', 'en-US'), V('Microsoft Aria Online (Natural) - English (United States)', 'en-US', false)];
  assert.match(pickVoice(withMs, 'en-US').name, /Aria Online \(Natural\)/);                    // 自然聲音優先,即使是雲端的
  assert.match(pickVoice(withMs.filter(v => !/Aria/.test(v.name)), 'en-US').name, /Zira/);     // 沒有自然聲音 → Microsoft 本機聲音,而不是 Google
});

test('iPhone:挑增強版與好聲音,避開 macOS/iOS 的趣味聲音;中文 zh-TW 優先於 zh-CN', () => {
  assert.equal(pickVoice(IPHONE, 'zh-TW').name, 'Mei-Jia');
  assert.equal(pickVoice(IPHONE, 'en-US').name, 'Samantha (Enhanced)');
  for (const bad of ['Bad News', 'Zarvox']) assert.ok(scoreVoice(V(bad, 'en-US'), 'en-US') < scoreVoice(V('Samantha', 'en-US'), 'en-US'));
  assert.equal(pickVoice([V('Ting-Ting', 'zh-CN')], 'zh-TW').name, 'Ting-Ting');               // 只有簡體聲音時退而求其次,也比沒聲音好
});

test('Android(只有 Google 聲音)與沒有聲音、語言不符:不會出錯', () => {
  assert.equal(pickVoice(ANDROID, 'zh-TW').name, 'Google 國語 (臺灣)');
  assert.equal(pickVoice([], 'zh-TW'), null); assert.equal(pickVoice(undefined, 'en-US'), null);
  assert.equal(pickVoice([V('Google 日本語', 'ja-JP')], 'zh-TW'), null);
  assert.equal(scoreVoice(V('x', 'ja-JP'), 'zh-TW'), -Infinity);
});

test('排名順序:自然 > 增強 > 本機內建 > Google > 簡易合成聲', () => {
  const s = n => scoreVoice(V(n, 'en-US', !/google|natural/i.test(n)), 'en-US');
  assert.ok(s('Microsoft Jenny Online (Natural)') > s('Samantha (Enhanced)'));
  assert.ok(s('Samantha (Enhanced)') > s('Microsoft Zira'));
  assert.ok(s('Microsoft Zira') > s('Google US English'));
  assert.ok(s('Google US English') > s('eSpeak English'));
});

test('英式英文:有 en-GB 的 Daniel 時,國小英文朗讀會選它(使用者的選擇),沒有時退到其他英文聲音', () => {
  assert.equal(pickVoice(IPHONE, 'en-GB').name, 'Daniel');
  assert.equal(pickVoice(WINDOWS, 'en-GB')?.lang.startsWith('en'), true);
  assert.equal(SPEECH_LANG.en, 'en-GB'); assert.equal(SPEECH_LANG.zh, 'zh-TW');
  assert.equal(pickVoice([V('美佳', 'zh-TW'), V('美佳(增強音質)', 'zh-TW')], 'zh-TW').name, '美佳(增強音質)');
});

test('語速與音高:國小慢而活潑、國中平穩、高中接近正式旁白;未知階段用國小', () => {
  for (const lang of ['zh', 'en']) {
    const k = prosodyFor('kid', lang), t = prosodyFor('teen', lang), h = prosodyFor('high', lang);
    assert.ok(k.rate < t.rate && t.rate <= h.rate && k.pitch >= t.pitch && t.pitch >= h.pitch, lang);
    assert.deepEqual(prosodyFor('x', lang), k);
  }
  assert.deepEqual(prosodyFor('kid', 'zh'), { rate: 0.85, pitch: 1.0 });      // 使用者在試聽台選定的值
  assert.deepEqual(prosodyFor('kid', 'en'), { rate: 0.7, pitch: 0.95 });
});

test('speakable:下標、箭頭、單位、希臘字母都整理成好念的文字(中英文)', () => {
  assert.equal(speakable('2H₂ + O₂ → 2H₂O', 'zh-TW'), '2 H 2 加 O 2 變成 2 H 2 O');
  assert.equal(speakable('2H₂ + O₂ → 2H₂O', 'en-US'), '2 H 2 plus O 2 yields 2 H 2 O');
  assert.equal(speakable('鍵角 104.5°,O–H 0.96 Å', 'zh-TW'), '鍵角 104.5 度,O–H 0.96 埃');
  assert.match(speakable('ΔH ≈ −890 kJ', 'zh-TW'), /變化量 H 約 負 890 kJ/);
  assert.equal(speakable('🎉 做出了水!💡', 'zh-TW'), '做出了水!');
  assert.equal(speakable('<b>水</b>分子', 'zh-TW'), '水 分子');                                  // 不會把標籤念出來
  assert.equal(speakable(null), '');
});

test('chunkText:一句一段;很長的句子在逗號或空白處再切;每段不超過上限;內容不遺失', () => {
  assert.deepEqual(chunkText('第一句。第二句!第三句?'), ['第一句。', '第二句!', '第三句?']);
  assert.deepEqual(chunkText('Hello there. How are you? Fine.'), ['Hello there.', 'How are you?', 'Fine.']);
  const long = '這是一個很長很長的句子,' .repeat(20) + '結束。';
  const parts = chunkText(long, 60);
  assert.ok(parts.length > 3 && parts.every(p => p.length <= 61), parts.map(p => p.length).join(','));
  assert.equal(parts.join('').replace(/\s/g, ''), long.replace(/\s/g, ''));
  assert.deepEqual(chunkText(''), []);
});

test('chunkWithPauses:逗號停 250、句號/分號/頓號停 300;英文的小數點不切', () => {
  assert.deepEqual(chunkWithPauses('鈉，是金屬；會冒泡、爆炸。'), [
    { t: '鈉，', gap: 250 }, { t: '是金屬；', gap: 300 }, { t: '會冒泡、', gap: 300 }, { t: '爆炸。', gap: 300 }]);
  assert.deepEqual(chunkWithPauses('Hello, it is 4.2 K. Bye'), [
    { t: 'Hello,', gap: 250 }, { t: 'it is 4.2 K.', gap: 300 }, { t: 'Bye', gap: 0 }]);
  assert.deepEqual(chunkWithPauses('他說「好」。'), [{ t: '他說「好」。', gap: 300 }]);
});
