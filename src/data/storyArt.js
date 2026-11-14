// 化學故事的插圖(自己畫的向量圖,無版權問題):id → SVG 字串,viewBox 320x200,自帶背景。
const star = (x, y, r = 2) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff6c8"/>`;
const burst = (cx, cy, r, col, n = 12) => {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, x1 = cx + Math.cos(a) * r * 0.35, y1 = cy + Math.sin(a) * r * 0.35, x2 = cx + Math.cos(a) * r, y2 = cy + Math.sin(a) * r;
    s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${col}" stroke-width="3" stroke-linecap="round"/><circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="3.2" fill="${col}"/>`;
  }
  return s;
};
const wrap = (bg, inner) => `<svg viewBox="0 0 320 200" role="img" xmlns="http://www.w3.org/2000/svg"><rect width="320" height="200" rx="14" fill="${bg}"/>${inner}</svg>`;

export const ILLUS = {
  // 火:夜空下的營火
  fire: wrap('#1d2447', `${star(40, 30)}${star(90, 55, 1.6)}${star(250, 35)}${star(285, 80, 1.6)}${star(200, 20, 1.4)}
    <ellipse cx="160" cy="176" rx="110" ry="12" fill="#2a3158"/>
    <path d="M160 40 C190 80 215 100 205 135 C198 160 175 168 160 168 C145 168 122 160 115 135 C108 105 135 85 160 40Z" fill="#ff7a1a"/>
    <path d="M160 78 C178 104 192 118 186 140 C182 156 170 162 160 162 C150 162 138 156 134 140 C128 120 146 104 160 78Z" fill="#ffc233"/>
    <path d="M160 116 C170 130 174 140 170 150 C167 158 163 160 160 160 C157 160 153 158 150 150 C146 140 152 130 160 116Z" fill="#fff3b0"/>
    <rect x="96" y="160" width="128" height="14" rx="7" fill="#7a4a2a" transform="rotate(-8 160 167)"/>
    <rect x="96" y="160" width="128" height="14" rx="7" fill="#9a6238" transform="rotate(8 160 167)"/>
    <circle cx="118" cy="70" r="3" fill="#ffb347"/><circle cx="210" cy="60" r="2.4" fill="#ffb347"/><circle cx="226" cy="96" r="2" fill="#ff9a3c"/>`),
  // 鐵:生鏽的鐵釘和水滴
  iron: wrap('#e8eef5', `<rect x="0" y="150" width="320" height="50" fill="#cfd9e6"/>
    <g transform="rotate(-28 160 100)"><rect x="60" y="92" width="190" height="16" rx="8" fill="#8d97a3"/><rect x="42" y="82" width="30" height="36" rx="10" fill="#8d97a3"/><path d="M250 92 L286 100 L250 108Z" fill="#8d97a3"/>
    <ellipse cx="120" cy="100" rx="22" ry="9" fill="#c0612b"/><ellipse cx="176" cy="101" rx="30" ry="9" fill="#a8501f"/><ellipse cx="230" cy="100" rx="14" ry="7" fill="#c0612b"/><circle cx="56" cy="96" r="9" fill="#b9582a"/></g>
    <path d="M236 36 C250 58 258 66 252 78 C248 88 224 88 220 78 C214 66 226 58 236 36Z" fill="#59b7ff"/><path d="M232 66 C230 72 232 76 236 78" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M70 40 C78 52 82 56 78 63 C75 69 62 69 60 63 C56 56 64 52 70 40Z" fill="#59b7ff"/>`),
  // 磷:暗室裡發光的瓶子
  phosphorus: wrap('#0e1730', `<circle cx="160" cy="112" r="78" fill="#6bffb8" opacity=".12"/><circle cx="160" cy="112" r="52" fill="#6bffb8" opacity=".16"/>
    <path d="M144 50 H176 V86 C200 104 214 124 214 146 C214 170 190 182 160 182 C130 182 106 170 106 146 C106 124 120 104 144 86Z" fill="#b8ffe0" opacity=".9"/>
    <path d="M144 50 H176 V60 H144Z" fill="#8bd9b5"/>
    <path d="M118 150 C130 138 190 138 202 150 C204 168 186 178 160 178 C134 178 116 168 118 150Z" fill="#6bffb8"/>
    ${star(60, 40)}${star(260, 50, 2.4)}${star(86, 130, 1.6)}${star(246, 150, 2)}${star(210, 30, 1.4)}
    <path d="M62 78 l4 -10 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4z" fill="#6bffb8"/><path d="M252 100 l3 -8 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3z" fill="#6bffb8"/>`),
  // 拉瓦節:天平
  lavoisier: wrap('#f6ecd9', `<rect x="0" y="168" width="320" height="32" fill="#e3d3b3"/>
    <rect x="152" y="40" width="16" height="128" rx="5" fill="#8a6a3d"/><rect x="108" y="160" width="104" height="14" rx="6" fill="#7a5c33"/>
    <rect x="62" y="48" width="196" height="9" rx="4.5" fill="#a98b57"/><circle cx="160" cy="44" r="10" fill="#c9a96a"/>
    <line x1="72" y1="56" x2="46" y2="116" stroke="#8a6a3d" stroke-width="2.5"/><line x1="72" y1="56" x2="98" y2="116" stroke="#8a6a3d" stroke-width="2.5"/>
    <line x1="248" y1="56" x2="222" y2="116" stroke="#8a6a3d" stroke-width="2.5"/><line x1="248" y1="56" x2="274" y2="116" stroke="#8a6a3d" stroke-width="2.5"/>
    <path d="M38 116 H106 C104 130 92 136 72 136 C52 136 40 130 38 116Z" fill="#c9a96a"/><path d="M214 116 H282 C280 130 268 136 248 136 C228 136 216 130 214 116Z" fill="#c9a96a"/>
    <path d="M58 116 V92 H86 V116" fill="#cfe9f5" stroke="#6aa6c4" stroke-width="2"/><path d="M62 104 H82 V114 H62Z" fill="#ffb347"/>
    <rect x="232" y="94" width="32" height="22" rx="5" fill="#5f7fb0"/><text x="248" y="110" font-size="13" font-family="sans-serif" fill="#fff" text-anchor="middle" font-weight="700">=</text>`),
  // 小蘇打:瓶子冒泡泡
  soda: wrap('#e5f3fb', `<rect x="0" y="168" width="320" height="32" fill="#cfe6f3"/>
    <path d="M124 62 H196 V92 L224 160 C226 170 220 176 210 176 H110 C100 176 94 170 96 160 L124 92Z" fill="#bfe3f7" stroke="#6aa6c4" stroke-width="3"/>
    <path d="M104 142 C130 132 190 150 216 142 L224 160 C226 170 220 176 210 176 H110 C100 176 94 170 96 160Z" fill="#8fd0f0"/>
    <circle cx="140" cy="118" r="9" fill="#fff" opacity=".85"/><circle cx="168" cy="104" r="12" fill="#fff" opacity=".85"/><circle cx="188" cy="128" r="7" fill="#fff" opacity=".85"/>
    <circle cx="150" cy="70" r="14" fill="#fff" stroke="#9cc9e0" stroke-width="2"/><circle cx="178" cy="52" r="10" fill="#fff" stroke="#9cc9e0" stroke-width="2"/><circle cx="196" cy="30" r="16" fill="#fff" stroke="#9cc9e0" stroke-width="2"/><circle cx="140" cy="36" r="8" fill="#fff" stroke="#9cc9e0" stroke-width="2"/><circle cx="220" cy="62" r="7" fill="#fff" stroke="#9cc9e0" stroke-width="2"/>
    <rect x="256" y="120" width="40" height="48" rx="6" fill="#f4f1ea" stroke="#c9c3b3" stroke-width="2"/><text x="276" y="150" font-size="12" font-family="sans-serif" fill="#7a7466" text-anchor="middle" font-weight="700">NaHCO₃</text>`),
  // 鹽:海浪與鹽的小方塊
  salt: wrap('#dff2fb', `<path d="M0 138 C40 120 80 156 120 138 C160 120 200 156 240 138 C280 120 300 140 320 134 V200 H0Z" fill="#7cc8ee"/><path d="M0 164 C40 148 80 180 120 164 C160 148 200 180 240 164 C280 148 300 166 320 160 V200 H0Z" fill="#4fb0e0"/>
    <circle cx="262" cy="40" r="24" fill="#ffd966"/>
    <path d="M70 86 H110 L104 56 H76Z" fill="#fff" stroke="#b8c4cf" stroke-width="2.5"/><rect x="66" y="86" width="48" height="52" rx="10" fill="#fff" stroke="#b8c4cf" stroke-width="2.5"/><circle cx="82" cy="66" r="2" fill="#8895a3"/><circle cx="90" cy="62" r="2" fill="#8895a3"/><circle cx="98" cy="66" r="2" fill="#8895a3"/>
    <g fill="#fff" stroke="#c4cdd6" stroke-width="2"><rect x="150" y="92" width="22" height="22" rx="3" transform="rotate(12 161 103)"/><rect x="180" y="74" width="16" height="16" rx="3" transform="rotate(-10 188 82)"/><rect x="198" y="102" width="20" height="20" rx="3" transform="rotate(20 208 112)"/></g>
    ${star(30, 40, 1.4)}`),
  // 肥皂:肥皂和泡泡
  soap: wrap('#f3ecfb', `<g fill="#fff" stroke="#b9a7dd" stroke-width="2.5"><circle cx="82" cy="70" r="30" fill-opacity=".7"/><circle cx="248" cy="62" r="22" fill-opacity=".7"/><circle cx="214" cy="110" r="14" fill-opacity=".7"/><circle cx="120" cy="38" r="12" fill-opacity=".7"/><circle cx="46" cy="124" r="14" fill-opacity=".7"/></g>
    <g fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><path d="M68 56 C72 50 80 48 86 50"/><path d="M240 54 C243 50 248 49 252 50"/></g>
    <rect x="102" y="116" width="116" height="56" rx="18" fill="#ff9ec7"/><rect x="112" y="124" width="96" height="14" rx="7" fill="#ffc2dc"/>
    <circle cx="150" cy="150" r="7" fill="#fff" opacity=".9"/><circle cx="176" cy="156" r="5" fill="#fff" opacity=".9"/><circle cx="132" cy="158" r="4" fill="#fff" opacity=".9"/>`),
  // 門得列夫:元素卡片排排站
  mendeleev: wrap('#e9f1e4', (() => {
    const cols = ['#ffd166', '#ef8354', '#06d6a0', '#118ab2', '#c77dff', '#ff8fab'];
    let s = '';
    for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) {
      const x = 30 + c * 44, y = 34 + r * 48, miss = r === 1 && c === 3;
      s += miss ? `<rect x="${x}" y="${y}" width="38" height="42" rx="6" fill="none" stroke="#6a7f5e" stroke-width="2.5" stroke-dasharray="5 4"/><text x="${x + 19}" y="${y + 29}" font-size="22" font-family="sans-serif" fill="#6a7f5e" text-anchor="middle" font-weight="700">?</text>`
        : `<rect x="${x}" y="${y}" width="38" height="42" rx="6" fill="${cols[(c + r * 2) % 6]}"/><rect x="${x + 6}" y="${y + 8}" width="26" height="5" rx="2.5" fill="#fff" opacity=".7"/><rect x="${x + 6}" y="${y + 19}" width="18" height="5" rx="2.5" fill="#fff" opacity=".5"/>`;
    }
    return s + `<rect x="30" y="182" width="252" height="4" rx="2" fill="#c5d4bb"/>`;
  })()),
  // 居禮夫人:發出微光的小瓶子
  curie: wrap('#12182b', `<circle cx="160" cy="108" r="86" fill="#7df3ff" opacity=".10"/><circle cx="160" cy="108" r="58" fill="#7df3ff" opacity=".14"/>
    <path d="M142 54 H178 V92 L204 148 C208 160 200 170 188 170 H132 C120 170 112 160 116 148 L142 92Z" fill="#cdf6ff" opacity=".92"/>
    <path d="M122 140 C142 130 178 150 198 140 L204 150 C208 162 200 170 188 170 H132 C120 170 112 162 116 150Z" fill="#7df3ff"/>
    <rect x="140" y="46" width="40" height="10" rx="4" fill="#8fb4c0"/>
    <g stroke="#7df3ff" stroke-width="3" stroke-linecap="round"><line x1="160" y1="22" x2="160" y2="34"/><line x1="96" y1="52" x2="104" y2="60"/><line x1="224" y1="52" x2="216" y2="60"/><line x1="70" y1="104" x2="82" y2="104"/><line x1="250" y1="104" x2="238" y2="104"/></g>
    ${star(40, 30)}${star(282, 40, 2.4)}${star(60, 160, 1.6)}${star(268, 152, 2)}`),
  // 煙火:夜空裡四種顏色
  fireworks: wrap('#141a3a', `${star(30, 24)}${star(292, 30, 1.6)}${star(160, 14, 1.4)}${star(40, 160, 1.6)}${star(286, 150, 2)}
    ${burst(76, 82, 44, '#ffd23f')}${burst(164, 62, 38, '#ff4d5e', 14)}${burst(248, 90, 46, '#44e08c')}${burst(160, 138, 34, '#4cc3ff', 10)}
    <path d="M0 200 V184 H24 V170 H40 V184 H72 V176 H90 V184 H320 V200Z" fill="#0a0e24"/>`),
  // 光合作用:太陽、盆栽、進出的氣體
  photosynthesis: wrap('#e3f4e1', `<circle cx="262" cy="42" r="22" fill="#ffd23f"/><g stroke="#ffd23f" stroke-width="4" stroke-linecap="round"><line x1="262" y1="8" x2="262" y2="1"/><line x1="296" y1="42" x2="304" y2="42"/><line x1="238" y1="18" x2="232" y2="12"/><line x1="286" y1="18" x2="292" y2="12"/><line x1="228" y1="42" x2="220" y2="42"/></g>
    <path d="M130 150 H190 L182 186 H138Z" fill="#c2693c"/><rect x="126" y="144" width="68" height="10" rx="4" fill="#d9794a"/>
    <path d="M160 146 V72" stroke="#3f9b4a" stroke-width="6" stroke-linecap="round" fill="none"/>
    <path d="M160 112 C120 102 100 72 108 56 C140 58 160 82 160 112Z" fill="#4cc05a"/><path d="M160 98 C200 88 222 62 214 46 C180 48 160 70 160 98Z" fill="#3aa84a"/><path d="M160 72 C146 60 148 44 160 34 C172 44 174 60 160 72Z" fill="#66d174"/>
    <g font-family="sans-serif" font-size="15" font-weight="700" fill="#2d6a4f"><text x="24" y="104">CO₂</text><text x="256" y="148">O₂</text></g>
    <g stroke="#2d6a4f" stroke-width="3" stroke-linecap="round" fill="none"><path d="M62 98 L96 88"/><path d="M88 84 L97 88 L91 96"/><path d="M216 104 L248 136"/><path d="M240 134 L249 137 L246 128"/></g>`),
  // 麵包:切開的麵包與小洞洞
  bread: wrap('#fbe9cf', `<ellipse cx="160" cy="174" rx="122" ry="11" fill="#e3cfae"/>
    <path d="M50 130 C40 80 90 48 160 48 C230 48 280 80 270 130 C268 150 250 160 230 160 H90 C70 160 52 150 50 130Z" fill="#c0762a"/>
    <path d="M62 128 C54 88 98 62 160 62 C222 62 266 88 258 128 C256 142 244 150 228 150 H92 C76 150 64 142 62 128Z" fill="#f7dca0"/>
    <g fill="#e6bd74"><circle cx="110" cy="100" r="7"/><circle cx="150" cy="86" r="5"/><circle cx="196" cy="104" r="9"/><circle cx="230" cy="122" r="5"/><circle cx="130" cy="126" r="6"/><circle cx="170" cy="126" r="8"/><circle cx="96" cy="132" r="4"/><circle cx="212" cy="84" r="4"/><circle cx="244" cy="100" r="3.5"/></g>
    <g stroke="#b9852f" stroke-width="3" stroke-linecap="round" fill="none"><path d="M40 40 C44 24 40 14 46 4"/><path d="M52 44 C58 30 54 20 60 10"/></g>`),
  // 碳:鑽石與鉛筆
  carbon: wrap('#eef0f6', `<path d="M82 82 L106 50 H152 L176 82 L129 138Z" fill="#8fd8f5"/><path d="M82 82 H176 M106 50 L120 82 L129 138 M152 50 L138 82 L129 138" stroke="#fff" stroke-width="2.5" fill="none" stroke-linejoin="round"/><path d="M106 50 L120 82 H138 L152 50Z" fill="#bdeafc"/>
    <g transform="rotate(-32 245 118)"><rect x="190" y="106" width="96" height="24" fill="#f2c230"/><rect x="190" y="106" width="96" height="6" fill="#f7d45e"/><polygon points="190,106 164,118 190,130" fill="#f1d3a0"/><polygon points="173,114 164,118 173,122" fill="#2f3138"/><rect x="286" y="106" width="8" height="24" fill="#b8bcc6"/><rect x="294" y="106" width="16" height="24" rx="4" fill="#ef7b8b"/></g>
    <text x="112" y="180" font-family="sans-serif" font-size="26" font-weight="700" text-anchor="middle" fill="#4a5163">C</text>
    <g fill="#fff"><circle cx="64" cy="44" r="3"/><circle cx="194" cy="52" r="2.4"/></g>`),
  // 氦:氣球
  helium: wrap('#d8efff', `<g fill="#fff"><ellipse cx="60" cy="150" rx="40" ry="14"/><ellipse cx="86" cy="140" rx="26" ry="16"/><ellipse cx="260" cy="48" rx="38" ry="12"/><ellipse cx="284" cy="40" rx="20" ry="12"/></g>
    <g fill="none" stroke="#6b7a8c" stroke-width="2"><path d="M112 112 C114 144 150 150 160 184"/><path d="M160 94 C160 130 160 150 160 184"/><path d="M208 116 C206 146 170 152 160 184"/></g>
    <ellipse cx="112" cy="82" rx="26" ry="32" fill="#ff5d73"/><ellipse cx="160" cy="62" rx="26" ry="32" fill="#ffd23f"/><ellipse cx="208" cy="86" rx="26" ry="32" fill="#4cc3ff"/>
    <g fill="#fff" opacity=".6"><ellipse cx="102" cy="68" rx="5" ry="9"/><ellipse cx="150" cy="48" rx="5" ry="9"/><ellipse cx="198" cy="72" rx="5" ry="9"/></g>
    <path d="M107 114 L112 108 L117 114Z" fill="#ff5d73"/><path d="M155 94 L160 88 L165 94Z" fill="#ffd23f"/><path d="M203 118 L208 112 L213 118Z" fill="#4cc3ff"/>
    <text x="160" y="70" font-family="sans-serif" font-size="20" font-weight="700" text-anchor="middle" fill="#7a5a00">He</text>`),
  // 冰:玻璃杯裡浮著的冰塊
  ice: wrap('#e3f2fb', `<rect x="0" y="176" width="320" height="24" fill="#cfe4f1"/>
    <path d="M100 38 H220 L206 172 H114Z" fill="#d6f0ff" fill-opacity=".7" stroke="#7fb6d6" stroke-width="3"/>
    <path d="M106 90 H214 L206 172 H114Z" fill="#8fd0f0" fill-opacity=".85"/>
    <g stroke="#bfe0f0" stroke-width="2" fill="#fff" fill-opacity=".92"><rect x="120" y="66" width="38" height="38" rx="6" transform="rotate(-9 139 85)"/><rect x="164" y="62" width="40" height="40" rx="6" transform="rotate(8 184 82)"/></g>
    <g fill="#fff" opacity=".8"><circle cx="140" cy="140" r="4"/><circle cx="178" cy="150" r="3"/><circle cx="160" cy="124" r="2.6"/></g>
    <g stroke="#59b7ff" stroke-width="3" stroke-linecap="round" fill="none"><path d="M258 80 V50"/><path d="M248 60 L258 48 L268 60"/></g>`),
  // 黃金:金條與金幣
  gold: wrap('#fff4d6', `<ellipse cx="160" cy="178" rx="120" ry="10" fill="#ead9a8"/>
    <path d="M70 168 L92 132 H228 L250 168Z" fill="#e0a500"/><path d="M92 132 H228 L222 140 H98Z" fill="#ffd54a"/>
    <path d="M110 130 L128 98 H192 L210 130Z" fill="#f2b705"/><path d="M128 98 H192 L188 105 H132Z" fill="#ffe27a"/>
    <text x="160" y="124" font-family="sans-serif" font-size="17" font-weight="700" text-anchor="middle" fill="#8a5a00">Au</text>
    <g><ellipse cx="270" cy="160" rx="24" ry="8" fill="#e0a500"/><ellipse cx="270" cy="154" rx="24" ry="8" fill="#ffd54a"/><ellipse cx="270" cy="146" rx="24" ry="8" fill="#e0a500"/><ellipse cx="270" cy="140" rx="24" ry="8" fill="#ffd54a"/></g>
    <g fill="#fff"><path d="M70 60 l4 -12 l4 12 l12 4 l-12 4 l-4 12 l-4 -12 l-12 -4z"/><path d="M248 54 l3 -9 l3 9 l9 3 l-9 3 l-3 9 l-3 -9 l-9 -3z"/><path d="M160 56 l2.5 -7 l2.5 7 l7 2.5 l-7 2.5 l-2.5 7 l-2.5 -7 l-7 -2.5z"/></g>`),
  // 空氣:天空與組成比例
  air: wrap('#d9efff', `<g fill="#fff"><ellipse cx="70" cy="46" rx="40" ry="14"/><ellipse cx="96" cy="38" rx="26" ry="16"/><ellipse cx="240" cy="62" rx="44" ry="14"/><ellipse cx="270" cy="52" rx="24" ry="14"/></g>
    <g stroke="#7fb6e0" stroke-width="3" stroke-linecap="round" fill="none"><path d="M40 96 H120 C134 96 134 80 122 80"/><path d="M80 112 H190 C206 112 206 94 192 94"/></g>
    <rect x="30" y="140" width="260" height="30" rx="8" fill="#4c8bf5"/><rect x="232.8" y="140" width="54.6" height="30" fill="#ff6b6b"/><rect x="287.4" y="140" width="2.6" height="30" fill="#7a8394"/>
    <rect x="30" y="140" width="260" height="30" rx="8" fill="none" stroke="#fff" stroke-width="3"/>
    <g font-family="sans-serif" font-weight="700" fill="#fff" font-size="15"><text x="130" y="161" text-anchor="middle">N₂ 78%</text><text x="260" y="161" text-anchor="middle" font-size="13">O₂ 21%</text></g>`),
  // 乾冰:冒白霧的小塊乾冰
  dryice: wrap('#1c2b4a', `<g fill="#fff"><circle cx="120" cy="86" r="22" opacity=".55"/><circle cx="150" cy="64" r="26" opacity=".5"/><circle cx="188" cy="76" r="24" opacity=".5"/><circle cx="214" cy="52" r="20" opacity=".4"/><circle cx="166" cy="38" r="18" opacity=".35"/><circle cx="104" cy="58" r="16" opacity=".35"/></g>
    <polygon points="110,118 150,102 220,102 250,118" fill="#f1fbff"/><polygon points="110,118 250,118 250,168 110,168" fill="#cfeaf7"/><polygon points="250,118 220,102 220,152 250,168" fill="#a9d3e6"/>
    <text x="180" y="150" font-family="sans-serif" font-size="20" font-weight="700" text-anchor="middle" fill="#3a6f8a">CO₂</text>
    <text x="290" y="190" font-family="sans-serif" font-size="13" font-weight="700" text-anchor="end" fill="#9fd6f2">−78 °C</text>
    <g fill="#cfeaf7"><circle cx="46" cy="40" r="2.4"/><circle cx="288" cy="30" r="2"/><circle cx="40" cy="120" r="1.6"/></g>`),
  // 紫色高麗菜汁:三杯不同顏色
  cabbage: wrap('#f3edf8', `<g><path d="M50 82 H100 L94 168 H56Z" fill="#fff" fill-opacity=".7" stroke="#b6a4cc" stroke-width="3"/><path d="M53 112 H98 L94 168 H56Z" fill="#ff7fa8"/>
    <path d="M135 82 H185 L179 168 H141Z" fill="#fff" fill-opacity=".7" stroke="#b6a4cc" stroke-width="3"/><path d="M138 112 H183 L179 168 H141Z" fill="#9a5cc6"/>
    <path d="M220 82 H270 L264 168 H226Z" fill="#fff" fill-opacity=".7" stroke="#b6a4cc" stroke-width="3"/><path d="M223 112 H268 L264 168 H226Z" fill="#3fbfa8"/></g>
    <circle cx="160" cy="40" r="24" fill="#8e4aa8"/><g stroke="#c58fd9" stroke-width="3" fill="none" stroke-linecap="round"><path d="M160 18 C146 30 146 50 160 62"/><path d="M160 18 C174 30 174 50 160 62"/><path d="M138 40 C150 36 170 36 182 40"/></g>
    <g fill="#fff" opacity=".8"><circle cx="66" cy="132" r="3"/><circle cx="84" cy="146" r="2.4"/><circle cx="152" cy="134" r="3"/><circle cx="170" cy="150" r="2.4"/><circle cx="238" cy="136" r="3"/><circle cx="252" cy="150" r="2.4"/></g>`),
  // 牙膏與牙齒
  fluoride: wrap('#e4f7fb', `<path d="M112 46 C132 36 152 52 172 46 C198 40 214 60 208 92 C203 120 200 158 184 162 C170 164 170 130 156 130 C142 130 142 164 128 162 C112 158 110 120 104 92 C98 62 98 54 112 46Z" fill="#fff" stroke="#a8d4e0" stroke-width="3"/>
    <path d="M124 60 C132 56 140 58 146 62" stroke="#d9eef5" stroke-width="4" fill="none" stroke-linecap="round"/>
    <g fill="#8fe3f5"><path d="M236 50 l3 -9 l3 9 l9 3 l-9 3 l-3 9 l-3 -9 l-9 -3z"/><path d="M70 66 l2.5 -7 l2.5 7 l7 2.5 l-7 2.5 l-2.5 7 l-2.5 -7 l-7 -2.5z"/></g>
    <g transform="rotate(-18 250 150)"><rect x="210" y="144" width="86" height="14" rx="7" fill="#4c8bf5"/><rect x="170" y="136" width="46" height="26" rx="5" fill="#fff" stroke="#c4d6e0" stroke-width="2"/><ellipse cx="192" cy="136" rx="16" ry="7" fill="#5fd0a0"/><g stroke="#e8f0f4" stroke-width="3" stroke-linecap="round"><path d="M178 162 v6"/><path d="M188 162 v6"/><path d="M198 162 v6"/><path d="M208 162 v6"/></g></g>`),
};
