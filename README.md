# Frog PCA Dashboard — 無伺服器互動式 PCA Dashboard 產生器

把科學論文的 PCA 分析做成「可永久保存、可離線開啟」的互動式 Dashboard。
範例資料：**Sherratt et al. 2017**（澳洲青蛙與蝌蚪，166 物種，Dryad
[doi:10.5061/dryad.23j6t](https://doi.org/10.5061/dryad.23j6t)）。科學重點是
**蝌蚪與成體的形態演化方向各自獨立**，因此核心呈現是「蝌蚪 PCA」「成體 PCA」
與「親緣關係樹」三者連動。

## 最高原則
1. **無伺服器**：最終成品是純靜態網站，可直接放 GitHub Pages 永久運作，開啟不需後端、
   不需重新上傳資料。
2. **永久保存**：所有 JS 函式庫一律 vendor 到 repo 本地並鎖版本，**禁用 CDN**。
3. **直覺好用**：物種搜尋、清楚圖例、色盲友善（顏色＋形狀）、下載按鈕、載入/錯誤狀態。

## 架構分界
**所有統計（GPA、PCA、log-shape ratio…）都在「產生統一 Zip」階段由 R/Python 完成**；
瀏覽器端不做任何統計，只讀取算好的結果作圖。三種輸入（R / Python / 純 CSV）各自產出
**同一種統一 Zip**；Dashboard 只認這個格式。格式契約見
[`docs/unified_zip_format.md`](docs/unified_zip_format.md)。

```
原始資料 ──(R / Python / CSV 匯出器)──▶ 統一 Zip ──▶ Dashboard（靜態網站）
        統計都在這裡完成                  契約          只讀結果、互動呈現
```

## 四個階段

| 階段 | 內容 | 產出 |
|------|------|------|
| 一 | 重現論文分析、建立基準（修檔名 bug、GPA+PCA、join key 驗證） | `scripts/`, `baseline/` |
| 二 | 三個匯出器（R/Python/CSV）→ 同一統一 Zip + 驗證器 | `exporters/`, `build/*.zip` |
| 三 | 無伺服器 Dashboard（三視圖連動、vendored、離線） | `docs/` |
| 四 | 靜態匯出 + GitHub Pages（烤入資料、自包含包） | `docs/data/baked.js`, `build/frog-dashboard-site.zip` |

### 數值重現（檢查點②）
| 視圖 | 本專案 | 論文 |
|------|--------|------|
| 成體 4 PC 累積 | **82.479%** | 82.479%（完全吻合）|
| 蝌蚪 4 PC 累積 | 80.634% | 80.091%（差 +0.54pp，源於 geomorph 版本）|

## 快速開始
```bash
# 0) 一次性環境（Ubuntu）：R + geomorph
bash scripts/setup_r_env.sh

# 1) 重現分析、建立基準
R_LIBS_USER=~/Rlib Rscript scripts/phase1_reproduce.R

# 2) 產生三種統一 Zip 並驗證
R_LIBS_USER=~/Rlib Rscript exporters/r/export_r.R
python3 exporters/python/export_python.py
python3 exporters/csv/export_csv.py exporters/csv/example_frog/config.json
python3 tests/test_exporters.py

# 3) 本地預覽 Dashboard
cd docs && python3 -m http.server 8099   # 開 http://127.0.0.1:8099/

# 4) 烤入資料、產生自包含靜態包
scripts/bake_site.sh build/frog_R.zip    # -> docs/data/baked.js, build/frog-dashboard-site.zip
```

## 部署
見 [`docs/deploy_github_pages.md`](docs/deploy_github_pages.md)。`docs/` 已可直接作為
GitHub Pages 站台（/docs 資料夾），或下載 `build/frog-dashboard-site.zip` 解壓後離線雙擊。

## 函式庫（全本地，禁 CDN）
plotly.js 2.35.2 · JSZip 3.10.1 · phylocanvas.gl 1.64.0（含 deck.gl/luma.gl，
esbuild 打包）。重建：`scripts/vendor_libs.sh`。

## 目錄
```
data/         Dryad 原始檔
scripts/      環境安裝、階段一重現、vendoring、烤站
baseline/     階段一基準輸出（PC 分數、變異解釋）
exporters/    R / Python / CSV 匯出器 + 共用驗證器
build/        產出的統一 Zip 與靜態包
docs/         Dashboard 靜態網站（GitHub Pages 根）
tests/        匯出器等價測試、Dashboard e2e
```
