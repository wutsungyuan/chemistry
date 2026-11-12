// 讀取 src/data/db/cif/*.cif(COD 的原始 CIF 檔),用 crystcif-parse 解析並套用對稱操作。
// crystcif-parse 要求原子表有純元素符號的 _atom_site_type_symbol 欄,但 COD 的 CIF 常常:
//   (a) 只有標籤、沒有這一欄(來自礦物資料庫 AMCSD),或 (b) 寫成帶電荷的 "Sn4+"、"O-2"。
// 所以解析前先把這一欄「補上或正規化」(元素符號取自標籤/原值開頭,例如 "O-H3"→O、"Cu1"→Cu、"Sn4+"→Sn)。其餘完全交給套件。
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { Vector3 } from 'three';
import { BY_SYMBOL } from '../../src/data/elements.js';

const require = createRequire(import.meta.url);
const { parseCifStructures, parseCif } = require('crystcif-parse');

// 元素符號:優先取兩個字母(大小寫不拘,例如 "AL1"→Al、"Cl"→Cl),不是元素就取一個字母;元素表直接用專案的 elements.js
const symbolOf = s => {
  const m = /^([A-Za-z])([A-Za-z]?)/.exec(s.replace(/^[^A-Za-z]+/, ''));
  if (!m) throw new Error(`無法從 "${s}" 判斷元素`);
  const two = m[1].toUpperCase() + m[2].toLowerCase();
  return m[2] && BY_SYMBOL[two] ? two : m[1].toUpperCase();
};

/** 補上(或正規化)原子表的 _atom_site_type_symbol 欄 */
export function withTypeSymbols(text) {
  const lines = text.split('\n');
  const head = lines.findIndex(l => l.trim() === '_atom_site_label');
  if (head < 0) return text;
  let h = head;
  const cols = [];
  while (/^_atom_site_/.test((lines[h] || '').trim())) { cols.push(lines[h].trim()); h++; }   // h = 第一列資料
  const iLabel = cols.indexOf('_atom_site_label'), iType = cols.indexOf('_atom_site_type_symbol');
  const out = lines.slice(0, h);
  if (iType < 0) out.splice(head + 1, 0, '_atom_site_type_symbol');
  let i = h;
  for (; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim() || /^(loop_|_|#)/.test(l.trim())) break;
    const tok = l.trim().split(/\s+/);
    if (iType < 0) tok.splice(iLabel + 1, 0, symbolOf(tok[iLabel]));      // 插在標籤後面
    else tok[iType] = symbolOf(tok[iType]);                               // 去掉電荷
    out.push(tok.join(' '));
  }
  return out.concat(lines.slice(i)).join('\n');
}

const item = (block, tag) => { const v = block[tag]; if (!v) return undefined; return v.type === 'loop' ? v.value.map(x => x.get_value()) : v.value.get_value(); };

/**
 * 讀一個 CIF → {
 *   cell: [Vector3×3] 晶格向量(Å),
 *   atoms: [{label,type,pos(單位晶胞內、已套對稱操作的 Å 座標),frac}],
 *   meta: {cod, authors, year, journal, title, temperature, pressure}
 * }
 */
export function loadCif(dir, id) {
  const text = fs.readFileSync(path.join(dir, `${id}.cif`), 'utf8');
  const fixed = withTypeSymbols(text);
  const A = Object.values(parseCifStructures(fixed))[0];
  if (!A) throw new Error(`${id}.cif 裡找不到原子表`);
  const labels = A.get_array('labels'), syms = A.get_chemical_symbols(), pos = A.get_positions(), frac = A.get_scaled_positions();
  const block = Object.values(parseCif(fixed))[0];
  const authors = [].concat(item(block, '_publ_author_name') || []);
  return {
    cell: A.get_cell().map(v => new Vector3(v[0], v[1], v[2])),
    atoms: pos.map((p, i) => ({ label: labels[i], type: syms[i], pos: new Vector3(p[0], p[1], p[2]), frac: frac[i] })),
    meta: {
      cod: String(item(block, '_cod_database_code') ?? ''), authors, year: item(block, '_journal_year'), journal: item(block, '_journal_name_full'),
      title: item(block, '_publ_section_title'), temperature: item(block, '_diffrn_ambient_temperature'), pressure: item(block, '_diffrn_ambient_pressure'),
    },
  };
}
