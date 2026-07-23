# CLAUDE.md — Morphospace PCA Dashboard（多案例）

給 Claude Code 的專案記憶。**每次開場先讀這份**，再動工。全程用繁體中文與使用者對話。

## 這是什麼
無伺服器、純靜態的互動式 **PCA 形態空間 Dashboard**，一個網站可放**多個論文案例**，
用資料集選單切換。線上版部署在 GitHub Pages。

- 公開站：`https://eddielss96.github.io/frog-pca-dashboard/`
- 目前案例：`frogs`（Sherratt 2017，青蛙/蝌蚪，含物種級樹）、`trilobites`（Drage & Pates 2025，三葉蟲，無樹）、`fishes`（Torgersen 2023，內陸魚類體型，含**科級樹**：一個科 tip 對應該科所有標本，clade 分色）、`otoliths`（Van Damme 2024，魚類耳石，**側視＋背視雙形態空間**＋物種級樹，GPA+PCA 由 R geomorph 匯出時算，10 生態欄位可切換分組）、`turtles`（Stayton 2018，龜殼，2722 標本 53 個 3D 地標→物種平均→PCA，物種級樹，依棲地水生/陸生分色）、`forams`（Kahanamoku 2024，聖塔芭芭拉盆地底棲有孔蟲，AutoMorph 2D 屬性→每物種平均→相關矩陣 PCA，無樹，依屬分色；另 `forams-objects` 逐物件 2.3 萬點）、`characiforms`（Burns & Sidlauskas 2019，脂鯉目魚類體型，PC1-5 已算好＋物種級樹，依科分色 13 科）

## 最高原則（不可妥協）
1. **無伺服器**：最終是純靜態網站，能直接放 GitHub Pages，開啟不需後端。
2. **永久保存**：所有 JS 函式庫 vendor 在 `docs/vendor/`、鎖版本，**禁用 CDN**。
3. **瀏覽器端不做統計**：所有 PCA/GPA/log-shape 等都在「產生統一 Zip」時算好；
   Dashboard 只讀結果作圖。
4. **UI/UX**：色盲友善（顏色＋形狀）、搜尋、清楚圖例、載入/錯誤提示。

## 架構：統一 Zip 是唯一契約
所有案例都收斂成同一種「統一 Zip」，Dashboard 只認它。格式見
`docs/unified_zip_format.md`。重點：
- `manifest.json`：dataset、views[]（每個 PCA 視圖）、taxa、groups、**tree 可選**。
- `species_id` 是 join key，必須在 scores／taxa／(樹 crosswalk) 三方一致。
- 三種產生方式：R / Python 匯出器（`exporters/`）或瀏覽器內**建立精靈**（`docs/builder.html`）。

## 多資料集 gallery（重要）
- `docs/data/catalog.json` 列出所有案例（id、title、short、description、zip 路徑）。
- 每個案例一個統一 Zip：`docs/data/<id>.zip`。
- Dashboard 右上「資料集」選單切換；網址 `#dataset=<id>` 可記憶/分享。
- 載入優先序（`docs/js/app.js`）：烤入資料(單站) → `catalog.json`(gallery) → 上傳畫面。

## 新增一個資料集（標準流程）
1. 準備該論文「已算好的 PC 分數 CSV」（每列一物種：id 欄 + PC1..PCn）+ 分類欄位；
   若有親緣樹再加 Newick（tip 標籤需等於 species_id）。
2. 產生統一 Zip（二選一）：
   - **建立精靈**：`docs/builder.html` 上傳 → 預覽 → 下載統一 Zip；或
   - **腳本**：仿 `exporters/csv/export_csv.py`（純 CSV 打包）產生。
3. 放進 gallery：把 zip 複製到 `docs/data/<id>.zip`，在 `docs/data/catalog.json`
   的 `datasets` 加一筆。
4. 驗證：`python3 exporters/common/unified_zip.py validate docs/data/<id>.zip`；
   本地開站測試載入與切換。
5. commit、push；Pages 自動部署。

慣例：`species_id` 檔名安全（用底線）；分組欄位取類別型欄位（相異值 ≤ ~40）；
著色若論文有指定調色盤就沿用（可在 `groups` 塊指定 color/symbol，或 UI 內自訂）。

## 常用指令
```bash
# R 環境（Ubuntu，一次性）
bash scripts/setup_r_env.sh
# 重現分析、產生統一 Zip
R_LIBS_USER=~/Rlib Rscript exporters/r/export_r.R
python3 exporters/csv/export_csv.py <config.json>
# 驗證與測試
python3 exporters/common/unified_zip.py validate build/<x>.zip
python3 tests/test_exporters.py
# 本地預覽
cd docs && python3 -m http.server 8000
# 直出可部署網站
python3 scripts/make_site.py build/<x>.zip
```

## Dashboard 前端（`docs/js/`）
- `state.js` 中央狀態/事件；`zip-loader.js` 解析統一 Zip（tree 可選）；
- `groups.js` 分組模型（切換欄位 + 自訂色/形）；`pca-view.js` Plotly 散佈圖（固定軸、hover）；
- `tree-view.js` phylocanvas.gl（可選、淺層收合）；`legend.js`/`search.js`/`info-panel.js`（hover 卡+側邊面板）；
- `app.js` 整合 + gallery 選單；`builder.js`/`unified-build.js` 建立精靈。

## 部署
`docs/` 由 `.github/workflows/deploy-pages.yml` 發佈到 Pages（Source 選 **GitHub Actions**）。
只部署 `docs/`，不碰整個 repo。詳見 `docs/deploy_github_pages.md`。

## 測試前先確認
- 改前端後：`tests/e2e_dashboard.js`（Playwright，需本地 http + swiftshader WebGL）。
- 改匯出器後：`tests/test_exporters.py`（三匯出器等價 + 驗證器）。
- 每次都要求「無 console 錯誤」。
