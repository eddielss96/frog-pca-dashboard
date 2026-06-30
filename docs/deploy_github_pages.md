# 部署到 GitHub Pages

本 Dashboard 是純靜態網站，`docs/` 內已是可直接部署的自包含網站（函式庫全本地、
資料已烤入 `docs/data/baked.js`，開啟即看、不需後端、不需再上傳）。

## 方式一：用 /docs 資料夾發佈（建議）
1. 推送本分支到 GitHub。
2. GitHub repo → **Settings → Pages**。
3. **Source** 選 **Deploy from a branch**。
4. **Branch** 選要發佈的分支（例如 `main`，或本功能分支
   `claude/pca-dashboard-serverless-i00715`），**Folder** 選 **/docs**，按 **Save**。
5. 等 1～2 分鐘，頁面網址形如
   `https://<帳號>.github.io/<repo>/`。打開即自動載入青蛙資料。

> 只有「在 Settings → Pages 按下啟用」這一步需要你在 GitHub 網頁操作（我無法代按）。
> 其餘檔案都已就緒並推送。

## 方式二：用 root 發佈
若想用 root（/）而非 /docs：把 `docs/` 內容移到 repo 根，Pages 的 Folder 選 **/(root)**。
本專案預設用 /docs 以保持原始碼與網站分離。

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
