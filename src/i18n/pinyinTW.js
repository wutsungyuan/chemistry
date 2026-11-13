// 台灣國語的破音字與輕聲覆寫:pinyin-pro 預設是中國大陸的讀法,有些字在國小課本的注音不一樣(例如「還」ㄏㄞˊ、「只有」ㄓˇ、「乾淨」ㄍㄢ)。
// 這裡列出「詞 → 拼音」,載入時註冊給 pinyin-pro;單字的預設放在最後面。新增內容時,若發現某個詞的注音錯了,加在這裡並補上 tests/zhuyincover.test.mjs 的對照。
// 格式:拼音用「帶聲調符號」寫法,每個字一個音節,以空白隔開;輕聲寫成沒有聲調的音節(例如 de)。
const W = {
  // 還:hái(副詞)為主;huán(歸還、還錢…)另外列
  還有: 'hái yǒu', 還能: 'hái néng', 還會: 'hái huì', 還很: 'hái hěn', 還沒: 'hái méi', 還是: 'hái shì', 還要: 'hái yào', 還可以: 'hái kě yǐ', 還不: 'hái bù', 還在: 'hái zài',
  還算: 'hái suàn', 還好: 'hái hǎo', 還真: 'hái zhēn', 還更: 'hái gèng', 還少: 'hái shǎo', 歸還: 'guī huán', 還給: 'huán gěi', 還錢: 'huán qián', 償還: 'cháng huán', 還原: 'huán yuán',
  // 幾:jǐ(問數量)為主;幾乎 jī hū
  好幾: 'hǎo jǐ', 幾個: 'jǐ ge', 幾年: 'jǐ nián', 幾次: 'jǐ cì', 幾種: 'jǐ zhǒng', 幾層: 'jǐ céng', 幾顆: 'jǐ kē', 幾天: 'jǐ tiān', 幾條: 'jǐ tiáo', 幾十: 'jǐ shí', 幾百: 'jǐ bǎi', 幾千: 'jǐ qiān', 幾點: 'jǐ diǎn', 幾歲: 'jǐ suì', 幾乎: 'jī hū', 幾何: 'jǐ hé',
  // 只:zhǐ(只有、只要…)
  只有: 'zhǐ yǒu', 只用: 'zhǐ yòng', 只會: 'zhǐ huì', 只能: 'zhǐ néng', 只好: 'zhǐ hǎo', 只要: 'zhǐ yào', 只是: 'zhǐ shì', 不只: 'bù zhǐ', 只剩: 'zhǐ shèng', 只見: 'zhǐ jiàn', 只需: 'zhǐ xū', 只管: 'zhǐ guǎn', 只因: 'zhǐ yīn', 只可: 'zhǐ kě',
  // 調:tiáo(調色、調味…)為主;diào(調查、聲調…)另外列
  調出: 'tiáo chū', 調色: 'tiáo sè', 調味: 'tiáo wèi', 調整: 'tiáo zhěng', 調皮: 'tiáo pí', 調和: 'tiáo hé', 調配: 'tiáo pèi', 調成: 'tiáo chéng',
  調查: 'diào chá', 調動: 'diào dòng', 單調: 'dān diào', 聲調: 'shēng diào', 語調: 'yǔ diào', 調度: 'diào dù', 強調: 'qiáng diào',
  // 著:輕聲 zhe 為主;著火 zháo;著名 zhù;著色 zhuó
  著火: 'zháo huǒ', 睡著: 'shuì zháo', 著涼: 'zháo liáng', 著急: 'zháo jí', 著名: 'zhù míng', 著作: 'zhù zuò', 顯著: 'xiǎn zhù', 著色: 'zhuó sè', 著眼: 'zhuó yǎn',
  跟著: 'gēn zhe', 接著: 'jiē zhe', 溶著: 'róng zhe', 帶著: 'dài zhe', 拿著: 'ná zhe', 看著: 'kàn zhe', 穿著: 'chuān zhe', 圍著: 'wéi zhe', 抓著: 'zhuā zhe', 躺著: 'tǎng zhe', 坐著: 'zuò zhe', 站著: 'zhàn zhe', 藏著: 'cáng zhe', 含著: 'hán zhe', 連著: 'lián zhe', 背著: 'bēi zhe', 走著: 'zǒu zhe',
  // 得:放在動詞或形容詞後面是輕聲 de;得到、獲得仍是 dé
  變得: 'biàn de', 洗得: 'xǐ de', 覺得: 'jué de', 做得: 'zuò de', 跑得: 'pǎo de', 長得: 'zhǎng de', 吃得: 'chī de', 記得: 'jì de', 值得: 'zhí de', 懂得: 'dǒng de', 曉得: 'xiǎo de', 顯得: 'xiǎn de', 使得: 'shǐ de', 弄得: 'nòng de', 看得: 'kàn de', 聽得: 'tīng de', 說得: 'shuō de', 寫得: 'xiě de', 玩得: 'wán de', 走得: 'zǒu de', 飛得: 'fēi de', 來得: 'lái de',
  // 了:輕聲 le 為主;了解、了不起 liǎo
  了解: 'liǎo jiě', 了不起: 'liǎo bù qǐ', 受不了: 'shòu bù liǎo', 吃不了: 'chī bù liǎo', 忍不了: 'rěn bù liǎo', 來不了: 'lái bù liǎo', 做不了: 'zuò bù liǎo',
  // 的:輕聲 de 為主;目的、的確
  目的: 'mù dì', 的確: 'dí què', 標的: 'biāo dì',
  // 單字的預設
  嗎啡: 'mǎ fēi', 呢喃: 'ní nán',
  // 麼:什麼、怎麼、那麼、這麼的「麼」是輕聲 me(ㄇㄜ˙)
  什麼: 'shén me', 怎麼: 'zěn me', 那麼: 'nà me', 這麼: 'zhè me', 多麼: 'duō me', 甚麼: 'shén me', 為什麼: 'wèi shén me', 怎麼樣: 'zěn me yàng',
  // 為:wèi(因為、為了)與 wéi(成為、以為、為止)
  因為: 'yīn wèi', 為了: 'wèi le', 為何: 'wèi hé', 為止: 'wéi zhǐ', 成為: 'chéng wéi', 以為: 'yǐ wéi', 認為: 'rèn wéi', 作為: 'zuò wéi', 行為: 'xíng wéi', 為人: 'wéi rén',
  // 間:房間、一間是第一聲 jiān;間隔、離間是第四聲 jiàn
  房間: 'fáng jiān', 一間: 'yì jiān', 時間: 'shí jiān', 空間: 'kōng jiān', 中間: 'zhōng jiān', 之間: 'zhī jiān', 世間: 'shì jiān', 間隔: 'jiàn gé', 間諜: 'jiàn dié',
  還: 'hái', 幾: 'jǐ', 只: 'zhǐ', 乾: 'gān', 調: 'tiáo', 著: 'zhe', 了: 'le', 的: 'de', 嗎: 'ma', 呢: 'ne', 吧: 'ba',
};
export const PINYIN_TW = W;
