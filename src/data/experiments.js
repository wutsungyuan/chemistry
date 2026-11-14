// 實驗動畫腳本(國小版化學故事):資料在 db/experiments.json,驗證在 scripts/lib/validate-experiments.mjs(npm run dev / build 前會自動執行)。
// 每個實驗對應一則故事(storyId);步驟、字幕(中英)與故事原文的對照都在這份資料裡。動畫引擎在 anim/engine.js(按需載入)。
import DB from './db/experiments.json' with { type: 'json' };

export const EXPERIMENTS = DB.experiments;
export const EXPERIMENTS_META = DB.meta;
/** 故事 id → { key, ...腳本 }(沒有動畫的故事沒有這一筆) */
export const EXPERIMENT_BY_STORY = Object.fromEntries(Object.entries(DB.experiments).map(([key, e]) => [e.storyId, { key, ...e }]));
