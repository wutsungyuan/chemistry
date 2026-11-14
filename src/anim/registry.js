// 實驗動畫的場景載入表:每個場景一個模組,按需載入(只在使用者按下「看實驗動畫」時才下載那一個)。
// candle、cabbage 是 engine.js 內建的場景;其他放在 scenes/<key>.js,各自匯出 build(ctx, E)。
export const SCENE_LOADERS = {
  iron: () => import('./scenes/iron.js'),
  salt: () => import('./scenes/salt.js'),
  fireworks: () => import('./scenes/fireworks.js'),
  air: () => import('./scenes/air.js'),
  mendeleev: () => import('./scenes/mendeleev.js'),
};
