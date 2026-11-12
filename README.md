# 兒童化學樂園 (Kids Chemistry Park)

Three.js 製作的兒童化學學習網站:元素週期表 → 原子 3D → 分子圖鑑 → 分子實驗室(拖拉組合)→ 反應劇場 → 小測驗與徽章。
介面為繁體中文(可開注音)/English。

    npm install
    npm run dev       # 開發(固定 http://127.0.0.1:5174);會先自動建置並驗證結構資料庫
    npm run build     # 輸出到 dist/;會先自動建置並驗證結構資料庫
    npm run build-db  # 只建置並驗證結構資料庫,並檢查所有反應的原子守恆
    npm test          # 單元測試(Node 內建 node:test)

擴充內容:編輯 `src/data/elements.js`(元素與趣味知識)、`src/data/db/`(分子與結構,見下)、`reactions.js`(反應,需原子守恆)。

## 分子/晶體結構資料庫

所有分子的結構(座標與鍵)都放在 `src/data/db/`,**晶體直接放原始 CIF 檔**,不再手抄數字:

| 位置 | 內容 |
|---|---|
| `molecules.json` | 每個分子的名稱、說明、用途、實驗室旗標(不含結構) |
| `structures.json` | 每個分子的結構記錄(依 `kind` 分類,見下) |
| `cif/<COD 編號>.cif` | 來自 Crystallography Open Database(COD)的原始 CIF 檔(44 個:化合物、金屬、岩鹽) |

結構記錄的 `kind`:

- `explicit`:座標直接列出
- `zmat`:用鍵長、鍵角、二面角(Z-matrix)計算座標
- `crystal`:指定一個 CIF(`cif`)與規則,以某個原子為中心長出一小塊晶體(金屬、化合物、合金都用這個)
- `crystalPick`:由 CIF 晶體取出一個小單元(給實驗室任務用,保留原子順序)
- `rocksalt`:CIF 的岩鹽結構,畫成 2×2×2 小立方

### 重用的套件(不重造輪子)

- **three.js**:所有向量、矩陣、角度運算(`Vector3`、`MathUtils`),見 `src/data/geom.js`
- **crystcif-parse**(devDependency,只在建置時用):解析 CIF、套用對稱操作展開晶胞。COD 的 CIF 常缺 `_atom_site_type_symbol` 或寫成 `Sn4+`,載入前由 `scripts/lib/cif.mjs` 補上/正規化
- **node:test**:單元測試(內建,免安裝)

### 流程

`scripts/build-db.mjs`:讀 JSON 與 CIF → `src/data/structureDB.js`、`crystalBuilder.js` 展開 → **驗證** → 寫出 `src/data/generated/db.js`(自動產生,請勿手改,網頁載入時不必再計算)。
`npm run dev` / `npm run build` 會自動先執行;驗證失敗會中止並列出錯誤。

資料出處由 CIF 內容**自動組成**(作者、年份、溫度、COD 編號),圖鑑會顯示。

### 驗證項目

- id 與結構一一對應、每筆都有出處
- CIF:檔案存在、檔內 COD 編號與檔名一致、是室溫(270–320 K)常壓、沒有被遺忘的孤兒 CIF
- 元素存在、鍵與原子索引有效、沒有重複的鍵
- 鍵長合理、沒有鍵連著的原子不能重疊
- 化學式與原子數一致(整個分子類型的記錄)
- 文獻鍵長/鍵角範圍(記錄裡的 `check`):例如剛玉 Al–O 1.80–2.02 Å、金屬最近鄰距離與教科書晶格常數相符
- 實驗室配方的骨架簽章不重複,不會被誤認
- 所有反應原子守恆(`scripts/check-reactions.mjs`,用 `reactions.js` 的 `checkBalance`)

### 單元測試(`npm test`)

`tests/structures.test.mjs`:CIF 前處理與載入、Z-matrix 的鍵長鍵角、岩鹽/方解石/剛玉的配位數與鍵長、金屬(fcc 12 配位、bcc 8 配位)、合金的固定性、小蘇打的原子順序與氫位置、建置腳本整體通過、實驗室配方不重複。

### 新增或修正結構

1. 在 `molecules.json` 加(或改)名稱與說明文字。
2. 晶體:把 COD 的 CIF 放進 `cif/`,在 `structures.json` 加一筆 `kind: "crystal"` 記錄(`cif`、`label`、`rules`、`center`、`depth`、`check`)。其他:加 `explicit` 或 `zmat` 記錄並寫 `source`。
3. 執行 `npm run build-db` 與 `npm test`。

### 資料品質

- 化合物晶體(方解石、剛玉、赤鐵礦、金紅石、石英、膽礬、瀉鹽等)與金屬、岩鹽都來自 COD 的 CIF,並與文獻/教科書鍵長對照。
- 小分子(水、酒精、葡萄糖等)的鍵長鍵角來自常見的實驗/文獻值,尚未逐一對照原始資料庫。
- 次氯酸鈉(NaClO)等找不到可靠結構資料的項目,在圖鑑裡標為「簡化示意」。

## 資訊安全

- **依賴最小化**:執行時依賴只有 `three`、`pinyin-pro`;`crystcif-parse`(連同 `mathjs`、`mendeleev`)只在建置時用,**不會進網頁程式包**(有測試檢查)。
- **鎖定版本**:`package.json` 所有依賴都是確切版本(無 `^`),`package-lock.json` 每個套件都有完整性雜湊且只來自官方 registry。請用 `npm ci` 安裝(依鎖檔還原,不會升級)。
- **不執行安裝腳本**:`.npmrc` 設定 `ignore-scripts=true`。目前只有 `fsevents`(macOS 選用依賴)宣告安裝腳本,已列入白名單,新增任何會跑腳本的套件測試會失敗,需先審查。
- **建置腳本在沙盒內執行**:`npm run build-db` 用 Node 的權限模型(`--permission`)——只能讀專案、只能寫 `src/data/generated/`,不能開子程序、Worker 或原生外掛。第三方 CIF 解析器因此無法做其他事。
- **外部資料不當 HTML**:CIF 來的文字(作者等)顯示前一律經 `escapeHtml`;建置時若出處含 `<` `>` 會失敗。
- **開發伺服器只綁 127.0.0.1**,不對區網開放。
- **新增/升級套件前**:`npm audit`、看套件的安裝腳本與原始碼(有無網路、`child_process`、`eval`),用 `npm i -E` 鎖版本,最後執行 `npm test`(含 `tests/security.test.mjs`)。
