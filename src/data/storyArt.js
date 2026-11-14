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
};
