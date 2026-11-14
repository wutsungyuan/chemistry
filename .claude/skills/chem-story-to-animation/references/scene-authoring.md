# 場景撰寫指南(src/anim/scenes/<key>.js)

每個實驗動畫是一個場景模組,匯出 `build(ctx, E)`。引擎(`src/anim/engine.js`)負責:3D 舞台、燈光、環境反射、骨架人偶、播放器(時間軸、字幕、中英文、暫停、釋放)。場景只負責「這個實驗的物件與動作」。

## 必讀
`SKILL.md`(鐵則與流程)、`references/style-guide.md`、`references/rig-spec.md`、`references/prop-catalog.md`、`references/science-checklist.md`、`references/lessons.md`,以及已完成的範例:`src/anim/engine.js` 裡的 `buildS1`(蠟燭)與 `buildS2`(紫色高麗菜)。

## 契約
```js
export function build(ctx, E) {            // E = experiments.json 裡這個實驗的資料(steps、titleZh…)
  const { T, scene } = ctx;                 // T = three 命名空間(0.187.0)
  const grp = new T.Group(); scene.add(grp);
  const SEG = E.steps.map(s => ({ n: s.nZh, d: s.d0, io: s.io, cap: s.capZh }));   // d 先放 d0,引擎會依字幕長度(中/英各自)覆寫 SEG[k].d
  const ST = []; SEG.reduce((a, s) => { ST.push(a); return a + s.d; }, 0);          // 各步開始時間;引擎會重算 ST,所以 update 裡一律現場讀 ST 與 SEG
  function update(t, time) { /* t = 動畫時間(秒,可任意跳轉,所以要寫成 t 的函式,不能累積狀態);time = 牆上時鐘(給閒置動作、閃爍用) */ }
  return { grp, SEG, ST, update, title: E.titleZh, leg: E.legZh, room: true, people: true };
}
```
- `update(t, time)` 必須是**純函式式**:同一個 t 畫出同一個畫面(播放、暫停、拖動進度都靠這點)。不要累積狀態、不要依賴上一格。
- 取目前步驟:`const k = ctx.h.segIdx({ SEG, ST }, t), u = ctx.h.clamp((t - ST[k]) / SEG[k].d, 0, 1);`
- `room`:false 表示不要桌子與房間(夜空、週期表…);要自己畫背景(`scene.background = new T.Color(...)` 或大平面)。`people`:false 表示這個場景不用人物(引擎會把兩個人偶隱藏)。
- 每格都要設定攝影機(`ctx.cam.position.set(...)`、`ctx.cam.lookAt(...)`)與燈光強度(`ctx.hemi.intensity = 0.85 * ctx.LI` 等;預設 hemi 0.85、key 2.0、rim 0.7,都要乘 `ctx.LI`)。手機窄畫面引擎會自動把 `cam.zoom` 設成 1.3。
- 標籤、字幕:字幕由播放器顯示,場景裡不要放中文字幕;場景裡的 3D 標籤要中英兩張貼圖,用 `ctx.lang()` 選(見 `buildS2` 的 `label`)。

## ctx 工具箱
- `ctx.T`、`ctx.scene`、`ctx.cam`、`ctx.renderer`、`ctx.hemi`/`ctx.key`/`ctx.rim`(燈)、`ctx.LI`(= π)、`ctx.EXP`(全部實驗腳本)、`ctx.BENCH`(桌面高 1.75)、`ctx.G`(重力 ≈ 21.3 單位/s²;1 單位 ≈ 0.46 m)、`ctx.D2R`。
- `ctx.room(false)`:關掉桌子與房間(也可以回傳 `room:false`)。`ctx.env()`:環境反射貼圖(給玻璃、液體、金屬的 `envMap`)。`ctx.lang()`:'zh' / 'en'。
- `ctx.h`:`clamp(v,a,b)`、`lerp(a,b,u)`、`ease(u)`(smoothstep)、`mj(u)`(最小急跳 0→1)、`seg01(t,a,b)`、`kf(t,[[秒,值],…])`(關鍵影格內插)、`ramp(t,a,b,c,d)`(a~b 升到 1、c~d 降回 0)、`pop(obj,tt)`/`popS(tt)`(物品「彈出來」出場,tt = 出場後經過的秒數)、`lerp3(out,a,b,u)`、`V(x,y,z)`(新的 Vector3)、`canvasTex(w,h,draw,srgb)`(畫布貼圖;色彩圖要 srgb=true)、`segIdx`。
- `ctx.props`:`lathe(點列[[半徑,高],…], 段數)`、`glassMat(不透明度)`、`streak(…)`、`tumbler(h)`(原點在中心)、`beaker(h,rad)`、`liquid(h,rad)`(`setState(液位,舊色,新色,進度)`)、`flameMesh(core)`(`userData.u` 有 uAlpha/uAmp/uDying)、`candle(h,rad)`、`dropper(len)`、`sphereMesh(色,半徑)`、`puffs(n)`(柔軟煙霧精靈圖,自己設位置、縮放、`material.opacity`)、`glowTex`、`puffTex`、`flameU`(`uTime` 要每格更新)。
- 人物:`ctx.adult`(縮放 1.55)、`ctx.kid`(0.95)、`ctx.hopState(time, 跳高)`。人偶用法(參考 `buildS1`):
  - `R.root.position.set(x,0,z); R.root.rotation.y = …;`(腳踩地,站在桌子後面約 z=-0.8;桌面 y=1.75)
  - `R.solve(function () { R.base(time, 0); R.root.updateMatrixWorld(true); …動作… }, {crouch, lift, footL, footR});` 動作寫在這個函式裡(會被呼叫兩次做重心平衡):`R.wave(s,time)`、`R.chest(s)`、`R.cheer(s,time)`、`R.reach(s, 目標Vector3, 權重0~1)`(手臂 IK,s = -1 畫面左側的手 / +1 右側的手)。手臂長 = 1.0 × 縮放(adult 1.55、kid 0.95),目標要在可及範圍內(離肩膀 ≤ 臂長)。
  - 之後:`R.hand(s,out)`(手的世界座標,需先 `R.root.updateMatrixWorld(true)`)、`R.shoulder(s,out)`、`R.look(目標,權重)`、`R.mouth('smile'|'oh')`。
  - 關節超限與手離目標由引擎掃描檢查(`ctx.viol`、`ctx.REACH`):必須 0 與 ≤ 0.2。

## 規則(都是使用者決定的)
1. 人物是方塊風(用現成人偶);其他物件圓滑精緻(`LatheGeometry`、球、圓柱、環…),不要用方塊(除非真實物體就是方塊,例如鹽的結晶是立方體)。
2. 兩層規則:物品出場/離場可以是影片效果(`pop`、淡入);出場之後跟實驗有關的一切要符合科學(守恆、比例、因果、物理)。人物動作符合解剖與物理(用人偶 API 就自動符合)。
3. 故事是真相來源:每個步驟都要有故事原文引用(`refs`),動畫不能演與故事相反的事;與科學衝突時**不要改 stories.json**,把衝突與建議的文字寫在回報裡。
4. 只有大人碰火、熱水、玻璃碎片等有風險的東西;不做危險示範。
5. 中英文字幕各一句(中文 ≤ 30 字、英文 ≤ 20 個字);一步一句;步驟名稱要短(中 ≤ 5 字、英 ≤ 12 字,步驟列放得下)。第一步與最後一步標 `io: 1`。總長(中英文各自)不超過 45 秒。
6. 效能預算:整個畫面繪製呼叫 < 400(目前蠟燭與高麗菜約 225~252)、三角形 < 10 萬。粒子用 `Points` 或少量精靈圖,不要幾千個獨立 Mesh。
7. 不新增 npm 套件、不連網、不放外部圖檔;貼圖用 `canvasTex` 現場畫。不要改引擎(`engine.js`)、播放器、`stories.json`、測試;需要的零件放在自己的場景檔裡。

## 交付(每個場景)
1. `src/anim/scenes/<key>.js`(取代施工中的骨架)。
2. 實驗腳本:單一實驗的 JSON(格式見 `templates/exp-script.template.json` 裡的一個實驗;必須保留 `storyId`、`afterPara`),用 `node .claude/skills/chem-story-to-animation/scripts/set-exp.mjs <key> <你的json>` 寫進 `src/data/db/experiments.json`;再跑 `node .claude/skills/chem-story-to-animation/scripts/check-sync.mjs --script <你的json>` 確認引用都在故事原文裡。
3. 科學事實表:`.claude/skills/chem-story-to-animation/references/science/<key>.md`(內容 / 依據 / 簡化處;數據要有依據,不確定就標「待對照文獻」)。
4. 用 `scripts/app-shot.mjs` 在真的 App 裡截圖檢查(手機 390x780m 與桌機 1280x800、中文與英文、開頭 / 動作最大 / 結果 / 結尾各一張),跑 `--sweep`;看過截圖,不要只相信程式沒報錯。
5. 回報:做了什麼、每一步的重點、科學上的簡化、與故事的衝突(如果有)、還沒做好的地方。
