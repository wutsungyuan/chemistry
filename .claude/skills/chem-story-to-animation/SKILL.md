---
name: chem-story-to-animation
description: 把「兒童化學樂園」的一則化學故事,做成有科學根據、與故事文字一致的 3D 實驗動畫(骨架人偶 + 圓滑物件、中英字幕、依內容自動算長度)。當使用者要為某則故事新增、修改或檢查實驗動畫,或要檢查動畫與故事是否一致時使用。
---

# 化學故事 → 實驗動畫

專案:兒童化學樂園(Vite + 原生 JS + three.js,繁體中文為主、可注音、可英文)。故事資料在 `src/data/db/stories.json`(只在國小版)。
這個技能把「故事 → 實驗動畫」固定成一條有關卡的流程。**先讀完下面的鐵則,再開始。**

## 鐵則(使用者已決定,不要再問)
1. **人物**:方塊(體素)風,但一定是**骨架人偶**:先建骨架與關節活動範圍,動作只作用在骨架,最後才套外皮。**其他物件**(杯、燒杯、液體、火焰、煙…)一律圓滑精緻,不用方塊。不使用 Minecraft 的角色、皮膚、貼圖、名稱。
2. **兩層規則**:物品「出場 / 離場 / 轉場」可以是影片效果(彈出、淡入),不必符合物理;出場之後跟實驗有關的一切(燃燒、分子、液體、顏色、因果)**必須符合科學**,並附事實清單。
3. **人體動作符合解剖與物理**:手肘/膝是單軸鉸鏈(只能彎、不反折);肩/髖是球窩關節(仰角、運動面、軸向旋轉);揮手由大臂帶動前臂;重力、重心平衡、腳踩地、最小急跳軌跡。細節見 `references/rig-spec.md`。
4. **動畫與故事要對得起來**:字幕與動作都要能在故事原文找到根據;有衝突就改(改故事或改動畫,由科學事實決定),不能放著。用 `scripts/check-sync.mjs` 檢查。
5. **安全**:只有大人碰火與熱水;不做危險反應(鈉入水、磷、放射性)的動畫;安全提醒要出現在開頭或結尾。
6. 國小版有注音;中英文字幕都要有;動畫長度 = 開頭 + Σ max(動作最短秒數, 字幕讀完秒數) + 結尾,中英文各算各的。
7. 不新增 npm 套件、不連外部服務、不放外部圖檔(貼圖與模型都用程式產生)。
8. 使用者說「提交」才 commit,說「推送」才 push;`docs/` 不進 repo。
9. 使用者在 iPhone 上看(Tailscale 開發伺服器),不要用 GitHub 連結當交付;審稿頁用 Artifact 發布。

## 流程(每關都要有產出與檢查,全部通過才給使用者看)
1. **選材**:讀 stories.json,列出故事裡的「實驗 / 活動」並分類(動手做 / 觀察 / 思考題 / 歷史實驗);只為「動手做」與挑選過的「觀察」做動畫,歷史與危險實驗不做。
2. **抽取**:把實驗的句子依序抄進實驗腳本(`templates/exp-script.template.json`)的 `steps`,每步寫 `refs`(故事第幾段、**原文引用**)。不要自己改寫故事的意思。
3. **對稿**:逐句比對故事與步驟,標 `match / extra / diff / missing`;把「故事有、動畫沒有」列進 `uncovered` 並寫原因;有矛盾的字眼放進 `forbidden`。有衝突先解決(見鐵則 4)。
4. **科學事實表**:動畫裡每個跟實驗有關的元素寫「內容、依據、簡化的地方」;檢查原子守恆、數量比例、因果順序;時間壓縮要標示。清單見 `references/science-checklist.md`。
5. **分鏡**:從 `references/prop-catalog.md` 選道具與角色;新道具先寫規格;決定哪些是「場景效果」(可以像影片)、哪些是「實驗過程」(要符合科學)。
6. **字幕與時長**:每步一句中文(≤ 30 字)、一句英文(≤ 20 個字);用公式算長度;接上朗讀與「跟著唸」(`src/ui/speech.js`、`src/ui/readalong.js`)。
7. **建置**:腳本資料驅動(`reference-impl/anim-proto.js` 就是這樣做的:步驟與字幕都讀 `exp-scripts.json`);動作寫成「關鍵影格 + 手要碰到的目標」,先確認目標在手臂可及範圍內(手臂長 = 1.0 骨架單位 × 人物縮放)。
8. **自動檢查**(全部要過):
   - `node .claude/skills/chem-story-to-animation/scripts/check-sync.mjs --script <exp-scripts.json>`:故事 ↔ 動畫對照、字幕長度與雙語、矛盾字眼。
   - `node .claude/skills/chem-story-to-animation/scripts/check-rig.mjs <動畫頁面.html>`:逐格掃描,關節超限必須 0、手離目標 ≤ 0.2 單位。
   - `node .claude/skills/chem-story-to-animation/scripts/contact-sheet.mjs <動畫頁面.html> --scene 0 --lang zh`:無頭瀏覽器截圖成接觸表,人工逐格看(手有沒有蓋到臉、東西有沒有穿模或出畫面)。
   - 效能預算:繪製呼叫與多邊形數(`renderer.info`),見 `references/style-guide.md`。
9. **審稿**:更新審稿頁(對照表、科學事實表、預覽);使用者在 iPhone 上看;把意見寫回 `references/style-guide.md` 與 `references/lessons.md`。
10. **整合**:按需載入(按「看動畫」才下載)、單一 3D 畫面、不支援 3D 時退回 SVG 插圖(`src/data/storyArt.js`);跑 `npm test` 與 `npm run e2e`;故事文字有改要重跑 `npm test`(注音、標點、長度測試)。

## 檔案
- `references/style-guide.md`:已決定的風格、比例、色票、鏡頭、效能預算。
- `references/rig-spec.md`:骨架、關節活動範圍表、物理做法、IK。
- `references/prop-catalog.md`:道具零件目錄與做法(玻璃杯、燒杯、蠟燭、火焰、液體、滴管、水壺、煙…)。
- `references/science-checklist.md`:科學事實檢查清單;已做過的兩個實驗的事實表。
- `references/lessons.md`:踩過的坑與使用者給過的意見。
- `templates/exp-script.template.json`:實驗腳本範本。
- `reference-impl/`:已通過審稿的參考實作(`anim-proto.js` = three r128 單檔預覽,含兩個實驗;`exp-scripts.json` = 兩個實驗的腳本)。新實驗從這裡複製;正式版接進 App 時改用專案的 three(0.187.0,顏色空間設定名稱不同,見 lessons)。
- `scripts/`:check-sync、check-rig、contact-sheet。

## 目前已做過的實驗
| 腳本 key | 故事 | 狀態 |
|---|---|---|
| candle | fire「火是怎麼來的?」 | 預覽通過審稿(故事第 3 段已改成「氧氣變少了」) |
| cabbage | cabbage「會變色的紫色高麗菜」 | 預覽通過審稿 |
尚未接進 App(只在審稿頁預覽)。
