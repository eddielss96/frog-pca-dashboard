# Frog PCA Dashboard

無伺服器、純靜態的互動式 **PCA Dashboard**，呈現澳洲青蛙與蝌蚪的形態空間與親緣關係。
範例資料：Sherratt et al. 2017（166 物種，Dryad [doi:10.5061/dryad.23j6t](https://doi.org/10.5061/dryad.23j6t)）。

**線上版**：https://eddielss96.github.io/frog-pca-dashboard/

## 功能
- 蝌蚪 PCA、成體 PCA、親緣關係樹三視圖**連動**（點一處，另兩處同步高亮）。
- 滑鼠移到物種點即浮出資訊卡（含蝌蚪地標圖），點擊釘選到側邊面板。
- 可**切換分組欄位**、**自訂顏色/形狀**（色盲友善）、物種搜尋、PC 軸切換、下載 PNG。
- 所有函式庫皆本地 vendored（plotly.js、phylocanvas.gl、JSZip），**無 CDN、可離線開啟**。
- 內建**建立精靈**（`builder.html`）：上傳自己的 PCA 資料（分數 CSV + 分類 + 樹），
  即時預覽並一鍵打包成同樣的無伺服器網站。

## 目錄
- `docs/` — 可直接部署的靜態網站（GitHub Pages 根）。

## 部署
本 repo 以 GitHub Actions 將 `docs/` 發佈到 GitHub Pages
（`.github/workflows/deploy-pages.yml`；設定見 `docs/deploy_github_pages.md`）。
Settings → Pages → Source 選 **GitHub Actions** 即可。

## 授權與資料
- 範例資料版權屬原作者，來源見上方 Dryad DOI。
- 產生此網站的完整資料管線（R / Python / CSV 匯出器、統計重現、測試）另行維護，本 repo 僅保留可部署的成品網站。
