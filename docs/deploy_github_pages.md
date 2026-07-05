# 部署到 GitHub Pages

本 Dashboard 是純靜態網站，`docs/` 內已是可直接部署的自包含網站（函式庫全本地、
資料已烤入 `docs/data/baked.js`，開啟即看、不需後端、不需再上傳）。

## 方式一：GitHub Actions 部署（建議）
repo 內已附 `.github/workflows/deploy-pages.yml`，它**只上傳 `docs/`** 作為網站，
乾淨小巧、跳過 Jekyll、網站落在網址根目錄，並使用最新 action 版本。

1. 把含此 workflow 的分支合併到 **`main`**。
2. GitHub repo → **Settings → Pages** → **Build and deployment** → **Source** 選
   **GitHub Actions**（不是 Deploy from a branch）。
3. 每次 push 到 `main`（且動到 `docs/`）就會自動部署；也可到 **Actions** 分頁手動
   執行「Deploy dashboard to GitHub Pages」。
4. 完成後網址形如 `https://<帳號>.github.io/<repo>/`，打開即自動載入資料。

> 只有「在 Settings → Pages 把 Source 切成 GitHub Actions」這一步需要你在網頁操作。

### 為什麼不要用「Deploy from a branch: main /（root）」
那會讓 GitHub 內建流程用 Jekyll 處理**整個 repo 根目錄**（含 4.5MB 的 plotly、
`build/` 大檔、`data/` 原始檔…），容易在 deploy 階段**逾時（Timeout reached, aborting!）**，
且網站會落在 `/docs/` 子路徑。改用上面的 Actions 方式即可避免。

## 方式二：Deploy from a branch（僅在不想用 Actions 時）
Source 選 **Deploy from a branch**、Branch 選 `main`、**Folder 選 `/docs`**（不要選 root）。
因 `docs/.nojekyll` 已存在會跳過 Jekyll，網站也落在根目錄。若之前用 root 發佈導致逾時，
改成 `/docs` 或改用方式一即可。

## 方式三：完全離線（不需 GitHub）
下載 `build/frog-dashboard-site.zip`，解壓後直接雙擊 `index.html` 即可離線開啟
（資料已內嵌，零外部請求）。

## 換成你自己的資料
1. 用任一匯出器產生統一 Zip（見 `exporters/README.md`）。
2. 重新烤入並打包：
   ```
   scripts/bake_site.sh path/to/your.zip
   ```
   這會更新 `docs/data/baked.js` 與 `build/frog-dashboard-site.zip`。
3. commit、push，Pages 會自動更新。

## 備註
- `docs/.nojekyll` 已建立，避免 GitHub Pages 以 Jekyll 處理 `vendor/` 等檔案。
- 站台不依賴任何 CDN：plotly.js、JSZip、phylocanvas.gl 皆 vendor 在 `docs/vendor/`。
