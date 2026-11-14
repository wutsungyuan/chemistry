# 參考實作

已通過審稿的兩個實驗預覽(蠟燭蓋玻璃杯、紫色高麗菜變色)。新實驗從這裡複製。

- `anim-proto.js`:單檔預覽(three r128,UMD)。內容依序是:環境與燈光 → 房間與桌子 → **骨架人偶**(`makeRig`、`hopState`)→ 圓滑道具 → 場景 1(蠟燭)→ 場景 2(紫色高麗菜)→ 英文字幕與時長 → 播放器介面(含 `window.__proto.seek / sweep / dbg`)。
  - 讀取 `window.__EXP`(= `exp-scripts.json` 的內容);頁面需要有:`#proto` 容器、`#p-cap`、`#p-ttl`、`#p-leg`、`#p-tl`、`#p-seek`、`#p-play`、`#p-re`、`#p-tm`、`[data-sc]`、`[data-lang]` 等元素(審稿頁的 HTML 產生器已不在專案內,見下)。
  - 場景是「資料 + 動作程式」:步驟與字幕來自 `exp-scripts.json`;每個實驗的動作(關鍵影格、手的目標、道具狀態)寫在各自的 `update(t, time)`。
- `exp-scripts.json`:兩個實驗的步驟、字幕(中英)、與故事的對照(refs、uncovered、forbidden)。

## 關於審稿頁
審稿頁(Artifact)是由暫存資料夾裡的幾個腳本產生的(故事審稿頁、小實驗總覽、動畫企劃、故事 ↔ 動畫對照表),沒有放進專案。要重做時:
1. 讀 `stories.json`;
2. 載入 `exp-scripts.json`,先跑 `scripts/check-sync.mjs`;
3. 把 `window.__EXP = <exp-scripts 的 JSON>` 與 `anim-proto.js` 放進頁面,頁面外加 three r128:`https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`;
4. 用 `scripts/check-rig.mjs`、`scripts/contact-sheet.mjs` 檢查。

## 接進 App 時要改的地方
- 改用專案的 three 0.187.0(模組),`T.Color` 的 `setHex` 補丁拿掉,改用色彩管理;`outputEncoding` → `outputColorSpace`;貼圖 `encoding` → `colorSpace`;`MeshPhysicalMaterial`、`PMREMGenerator`、`CapsuleGeometry` 在新版可直接用。
- 動畫程式碼另外打包(動態 `import()`),按「看動畫」才下載;進入畫面才建立、離開釋放(`stage.js` 的 `dispose`)。
- 字幕改用 App 的 i18n 與注音(`rubyHTML`)與朗讀(`speak`)的「跟著唸」。
- 把 `window.__proto` 換成模組匯出的 API(`seek`、`sweep`、`total`),給 E2E 測試用。
