# PCA Dashboards — 無伺服器互動式 PCA 形態空間 Dashboard（多案例）

把科學論文的 PCA 分析做成「可永久保存、可離線開啟」的互動式 Dashboard。
**一個網站可放多個論文案例**，用右上角「資料集」選單切換；網址 `#dataset=<id>`
可記憶/分享。線上版部署在 GitHub Pages。

- 公開站：**<https://eddielss96.github.io/PCA-Dashboards/>**
- 目前案例：
  | id | 論文 | 內容 |
  |----|------|------|
  | `frogs` | Sherratt et al. 2017 | 澳洲青蛙與蝌蚪，166 物種，蝌蚪 PCA + 成體 PCA + 親緣樹（三視圖連動）。Dryad [doi:10.5061/dryad.23j6t](https://doi.org/10.5061/dryad.23j6t) |
  | `trilobites` | Drage & Pates 2025 | 三葉蟲頭部形態空間，762 物種，單一 PCA、無樹，依 Order 著色（viridis） |

## 最高原則
1. **無伺服器**：最終成品是純靜態網站，可直接放 GitHub Pages 永久運作，開啟不需後端、
   不需重新上傳資料。
2. **永久保存**：所有 JS 函式庫一律 vendor 到 repo 本地並鎖版本，**禁用 CDN**。
3. **瀏覽器端不做統計**：所有 GPA、PCA、log-shape ratio… 都在「產生統一 Zip」階段算好；
   Dashboard 只讀結果作圖。
4. **直覺好用**：物種搜尋、清楚圖例、色盲友善（顏色＋形狀）、下載按鈕、載入/錯誤狀態。

## 架構：統一 Zip 是唯一契約
所有案例都收斂成同一種**統一 Zip**；Dashboard 只認這個格式。三種輸入（R / Python /
純 CSV）各自產出同一種統一 Zip。格式契約見
[`docs/unified_zip_format.md`](docs/unified_zip_format.md)。

```
原始資料 ──(R / Python / CSV 匯出器)──▶ 統一 Zip ──▶ Dashboard（靜態網站）
        統計都在這裡完成                  契約          只讀結果、互動呈現
```

統一 Zip 重點：`manifest.json`（dataset、views[] 每個 PCA 視圖、taxa、groups、
**tree 可選**）＋ `scores.csv` ＋ `taxa.csv`（＋可選 `tree.nwk` / 影像）。
`species_id` 是 join key，必須在 scores／taxa／(樹 crosswalk) 三方一致。

**建立精靈（`docs/builder.html`）**：對已算好的 PCA（CSV）而言，整個「上傳 → 互動預覽 →
打包成 GitHub Pages 網站」可**全程在瀏覽器內**完成，不需任何後端。需要跑統計的原始
資料（尤其 R/geomorph）則先用本機匯出器產生統一 Zip，再用精靈預覽/打包。

## 多案例 gallery
- `docs/data/catalog.json` 列出所有案例（id、title、short、description、zip 路徑）。
- 每個案例一個統一 Zip：`docs/data/<id>.zip`。
- Dashboard 右上「資料集」選單切換；網址 `#dataset=<id>` 可記憶/分享。
- 載入優先序（`docs/js/app.js`）：烤入資料（單站自包含）→ `catalog.json`（gallery）→ 上傳畫面。

### 新增一個資料集（標準流程）
1. 準備「已算好的 PC 分數 CSV」（每列一物種：id 欄 + PC1..PCn）+ 分類欄位；有樹再加
   Newick（tip 標籤 = species_id）。
2. 產生統一 Zip：用**建立精靈**（`docs/builder.html`）或仿 `exporters/csv/export_csv.py` 腳本。
3. 放進 gallery：zip 複製到 `docs/data/<id>.zip`，在 `docs/data/catalog.json` 的
   `datasets` 加一筆。
4. 驗證：`python3 exporters/common/unified_zip.py validate docs/data/<id>.zip`；本地開站測試切換。
5. commit、push；Pages 自動部署。

## 快速開始
```bash
# 0) 一次性環境（Ubuntu）：R + geomorph
bash scripts/setup_r_env.sh

# 1) 重現分析、建立基準（青蛙案例）
R_LIBS_USER=~/Rlib Rscript scripts/phase1_reproduce.R

# 2) 產生統一 Zip 並驗證
R_LIBS_USER=~/Rlib Rscript exporters/r/export_r.R
python3 exporters/python/export_python.py
python3 exporters/csv/export_csv.py exporters/csv/example_frog/config.json
python3 tests/test_exporters.py

# 3) 本地預覽 Dashboard（含 gallery 切換）
cd docs && python3 -m http.server 8099   # 開 http://127.0.0.1:8099/

# 4)（可選）烤入單一資料集、產生自包含靜態包
scripts/bake_site.sh build/frog_R.zip    # -> docs/data/baked.js, build/*-site.zip
```

## 數值重現（青蛙案例，檢查點②）
| 視圖 | 本專案 | 論文 |
|------|--------|------|
| 成體 4 PC 累積 | **82.479%** | 82.479%（完全吻合）|
| 蝌蚪 4 PC 累積 | 80.634% | 80.091%（差 +0.54pp，源於 geomorph 版本）|

## 部署
見 [`docs/deploy_github_pages.md`](docs/deploy_github_pages.md)。`docs/` 由
`.github/workflows/deploy-pages.yml` 發佈到 Pages（Source 選 **GitHub Actions**），只部署
`docs/`，不碰整個 repo。

## 函式庫（全本地，禁 CDN）
plotly.js 2.35.2 · JSZip 3.10.1 · phylocanvas.gl 1.64.0（含 deck.gl/luma.gl，
esbuild 打包）。重建：`scripts/vendor_libs.sh`。

## 目錄
```
data/         原始檔（各案例）
scripts/      環境安裝、階段一重現、vendoring、烤站
baseline/     階段一基準輸出（PC 分數、變異解釋）
exporters/    R / Python / CSV 匯出器 + 共用驗證器
build/        產出的統一 Zip 與靜態包
docs/         Dashboard 靜態網站（GitHub Pages 根）
  docs/data/  catalog.json（gallery 目錄）+ 各案例 <id>.zip
tests/        匯出器等價測試、Dashboard e2e
```
