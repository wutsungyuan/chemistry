// 小測驗(scenes/Quiz.js、game/questions.js)的階段用語:同一題在國小/國中/高中的說法不同(key@kid / key@teen / key@high),
// 沒有 @ 的 key 三個階段共用。中英文放在一起,才不會漏翻。
export default {
  zh: {
    // 國小:親切;國中:平實;高中:正式精確
    'quiz.q.sym2name@kid': '元素符號 {s} 是哪一個元素呢?', 'quiz.q.sym2name@teen': '元素符號 {s} 代表哪一個元素?', 'quiz.q.sym2name@high': '元素符號 {s} 所代表的元素是?',
    'quiz.q.name2sym@kid': '「{n}」的元素符號是什麼呢?', 'quiz.q.name2sym@teen': '「{n}」的元素符號是?', 'quiz.q.name2sym@high': '{n}的元素符號為何?',
    'quiz.q.fact@kid': '猜猜看,這是哪個元素?', 'quiz.q.fact@teen': '這是哪個元素?',
    'quiz.q.formula@kid': '猜猜看,它的化學式是', 'quiz.q.formula@high': '下列化學式所表示的物質是',
    'quiz.q.count@kid': '{m}分子裡有幾個 {s} 原子呢?', 'quiz.q.count@high': '一個{m}分子含有幾個 {s} 原子?',
    'quiz.q.z2sym': '原子序 {z} 是哪一個元素?',
    'quiz.q.z2sym@kid': '原子序 {z} 是哪一個元素呢?', 'quiz.q.z2sym@high': '原子序為 {z} 的元素是?',
    'quiz.q.cat': '{n}屬於哪一類元素?', 'quiz.q.cat@high': '依常見的週期表分類,{n}屬於',
    'quiz.q.period': '{n}的原子有幾層電子殼層(位於第幾週期)?',
    'quiz.q.valence': '{n}原子的最外層(價)電子有幾個?',
    'quiz.right@kid': '答對了!太棒了!', 'quiz.right@teen': '答對了!', 'quiz.right@high': '正確。',
    'quiz.wrong@kid': '沒關係!正確答案是', 'quiz.wrong@teen': '答錯了,正確答案是', 'quiz.wrong@high': '正確答案:',
  },
  en: {
    'quiz.q.sym2name@kid': 'Which element has the symbol {s}?', 'quiz.q.sym2name@teen': 'Which element is represented by the symbol {s}?', 'quiz.q.sym2name@high': 'Identify the element with the symbol {s}.',
    'quiz.q.name2sym@kid': 'What is the symbol for {n}?', 'quiz.q.name2sym@teen': 'What is the chemical symbol of {n}?', 'quiz.q.name2sym@high': 'Give the chemical symbol of {n}.',
    'quiz.q.fact@kid': 'Can you guess which element this is?', 'quiz.q.fact@teen': 'Which element is this?',
    'quiz.q.formula@kid': 'Can you guess the formula?', 'quiz.q.formula@high': 'The substance with the formula',
    'quiz.q.count@kid': 'How many {s} atoms are in a {m} molecule?', 'quiz.q.count@high': 'How many {s} atoms does one molecule of {m} contain?',
    'quiz.q.z2sym': 'Which element has atomic number {z}?',
    'quiz.q.z2sym@kid': 'Which element is number {z}?', 'quiz.q.z2sym@high': 'Identify the element with atomic number {z}.',
    'quiz.q.cat': 'Which group of elements does {n} belong to?', 'quiz.q.cat@high': 'By the usual periodic-table classification, {n} is a',
    'quiz.q.period': 'How many electron shells does an atom of {n} have (which period is it in)?',
    'quiz.q.valence': 'How many valence (outermost) electrons does an atom of {n} have?',
    'quiz.right@kid': 'Correct! Great job!', 'quiz.right@teen': 'Correct!', 'quiz.right@high': 'Correct.',
    'quiz.wrong@kid': 'No worries! The answer is', 'quiz.wrong@teen': 'Not quite. The answer is', 'quiz.wrong@high': 'Answer:',
  },
};
