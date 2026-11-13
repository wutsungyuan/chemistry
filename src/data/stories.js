// 化學故事(國小版):資料在 db/stories.json,驗證在 scripts/lib/validate-stories.mjs(npm run dev / build 前會自動執行)。
import DB from './db/stories.json' with { type: 'json' };

export const STORIES = DB.stories;
export const STORY_BY_ID = Object.fromEntries(STORIES.map(s => [s.id, s]));
export const STORIES_META = DB.meta;
