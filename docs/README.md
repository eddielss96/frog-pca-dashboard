# Dashboard（階段三）

無伺服器、純靜態的互動式 PCA Dashboard。讀取「統一 Zip」（由 R / Python / CSV
匯出器產生），呈現**蝌蚪 PCA、成體 PCA、親緣關係樹**三視圖並連動。
**瀏覽器端不做任何統計**，只讀取算好的結果作圖。

## 功能
- **三視圖連動**：
  - 點 PCA 任一點 → 彈出資訊視窗（物種名 / 圖片或佔位圖 / 中介資料），並在另一張
    PCA 與樹同步高亮。
  - 點親緣樹的分支（clade）→ 兩張 PCA 同步高亮整個 clade 的所有物種。
  - hover 顯示輕量物種名提示；click 才彈出完整資訊。
- **色盲友善**：顏色 + 形狀雙重編碼（Okabe–Ito 配色），圖例可切換群組顯示。
- **物種搜尋**、**PC 軸可切換**、各 PCA 的 **scree plot**。
- **下載**：每張 PCA 與樹皆可匯出 PNG。
- **載入 / 錯誤狀態**提示；瀏覽器端再次驗證 join key 一致性。
- **非 WebGL 環境**：親緣樹顯示 fallback 提示，PCA 仍可用。

## 函式庫（全部 vendor 在本地，禁用 CDN）
- `vendor/plotly/plotly-2.35.2.min.js`
- `vendor/jszip/jszip-3.10.1.min.js`
- `vendor/phylocanvas/phylocanvas.gl-1.64.0.bundle.js`（含 deck.gl/luma.gl，
  以 esbuild 打包成單一 IIFE；重建見 `scripts/vendor_libs.sh`）

## 建立精靈（builder.html）— 用自己的資料做一個
`builder.html` 讓使用者**在瀏覽器內**把自己的 PCA 資料變成一個無伺服器互動網站，
全程不需後端：
1. 上傳「物種 × PC 分數 CSV」（每個視圖一份）、分類 CSV（自動偵測 species_id／
   顯示名稱／分組欄）、以及可選的 Newick 樹檔。
2. 按「建立預覽」即時看到互動式 PCA（＋樹）。
3. 按「打包成 GitHub Pages 網站」→ 瀏覽器內產生一包自包含站台 zip，並彈出圖文教學，
   引導把 zip 內檔案上傳到 GitHub、啟用 Pages，即成為自己的永久網頁。

> 統計不在瀏覽器做：CSV 路徑的前提是 PCA 分數已算好。需要跑 GPA/PCA 的原始資料
> （尤其 R/geomorph）請用 `exporters/` 的本機匯出器先產生統一 Zip，再用本精靈預覽/打包。

## 本地預覽
```
cd docs && python3 -m http.server 8099
# 開 http://127.0.0.1:8099/ ，點「載入青蛙範例資料」
```
或用右上角「載入統一 Zip」上傳任一統一 Zip（亦支援拖放）。

> 註：以 `file://` 雙擊開啟時，瀏覽器會擋住對本地檔案的 `fetch`，故「載入範例」需經
> http 伺服器或 GitHub Pages。上傳 Zip 的方式則在 `file://` 下也可用。階段四會提供
> 把資料「烤入」的自包含離線包，讓雙擊即看。

## 程式結構（`docs/js/`）
- `state.js`：中央狀態與發布訂閱（連動核心）
- `zip-loader.js`：解析統一 Zip、建立資料模型、驗證 join key
- `pca-view.js`：Plotly 散佈圖（著色＋形狀、軸切換、scree、連動高亮）
- `tree-view.js`：phylocanvas.gl 親緣樹（點 clade、連動、非 WebGL fallback）
- `legend.js` / `search.js` / `info-panel.js` / `app.js`
