// 反應劇場(scenes/ReactionTheater.js)國中/高中版多出來的資訊:原子守恆、吸放熱、反應類型、條件、反應熱。
// 國小只看動畫與故事,不顯示這些。key@teen / key@high 的語氣不同;沒有 @ 的共用。中英文放在一起,才不會漏翻。
export default {
  zh: {
    'rx.cons@teen': '原子守恆:反應前 {l};反應後 {r}。種類和數量都沒變,只是重新組合。',
    'rx.cons@high': '原子守恆(反應前 → 反應後):{l} → {r}。',
    'rx.heat.exo': '放熱反應', 'rx.heat.endo': '吸熱反應',
    'rx.heat@teen': '這是{h}:{d}',
    'rx.heat.d.exo': '反應時會放出熱量。', 'rx.heat.d.endo': '反應時需要吸收能量。',
    'rx.type': '反應類型:{t}',
    'rx.cond': '條件:{c}',
    'rx.dH': '反應熱 ΔH ≈ {v} kJ(標準狀態,水為液態;依上式的係數)',
    'rx.heat@high': '{h}',
  },
  en: {
    'rx.cons@teen': 'Atoms conserved: before {l}; after {r}. The kinds and numbers are unchanged; they just rearrange.',
    'rx.cons@high': 'Conservation of atoms (before → after): {l} → {r}.',
    'rx.heat.exo': 'exothermic reaction', 'rx.heat.endo': 'endothermic reaction',
    'rx.heat@teen': 'This is an {h}: {d}',
    'rx.heat.d.exo': 'it gives off heat.', 'rx.heat.d.endo': 'it has to take in energy.',
    'rx.type': 'Reaction type: {t}',
    'rx.cond': 'Conditions: {c}',
    'rx.dH': 'Enthalpy change ΔH ≈ {v} kJ (standard state, water as liquid; for the equation as written)',
    'rx.heat@high': '{h}',
  },
};
