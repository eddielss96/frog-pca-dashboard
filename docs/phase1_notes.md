# 階段一：分析重現與基準

## 目的
讓 Sherratt et al. 2017 的原始 R 分析能在 Dryad 資料上正確跑完，產生蝌蚪 / 成體
PCA 的基準輸出，作為後續所有階段比對的依據。**所有統計都在此完成並匯出，
瀏覽器端不做任何統計運算。**

## 修掉的坑
1. **檔名 bug**：原始 `R+code.r` 以 `read.csv("Supplementary data file 2.csv")`
   讀成體資料，但 Dryad 上成體資料實際是 **file 1.csv**（file 2 是蝌蚪 .tps 地標檔），
   直接跑會壞。已於 `scripts/phase1_reproduce.R` 改讀 file 1.csv。
2. **API 變遷**：現代 geomorph（4.0.6）移除 `plotTangentSpace`，改用等效的
   `prcomp(two.d.array(...))` 取得 PCA 分數與變異解釋比例。

## join key 一致性（重要）
四個資料源（成體測量、蝌蚪 .tps、蝌蚪 centroid size、分類表）與 Newick 樹的
166 個 tip label **逐字完全一致，166/166 全對得起來，無重複、無遺漏**。
標籤格式本身不統一（97 個帶標本編號的 `Genus.species.NN`、64 個底線式
`Genus_species`、其餘混用），但因同出一份母資料，跨源一致——可直接作為
`species_id` join key 沿用。

## 數值比對結果
| 視圖 | 本次（geomorph 4.0.6）| 論文 | 差 |
|------|------|------|----|
| 成體 4 PC 累積 | **82.479%** | 82.479% | **0.000 pp** |
| 蝌蚪 4 PC 累積 | 80.634% | 80.091% | +0.543 pp |

- **成體完全吻合**（log-shape ratio + prcomp，與原碼數學等價）。
- **蝌蚪差 +0.543 pp**：成因為 GPA 滑動半地標（彎曲能準則）在 geomorph
  3.0.2 → 4.0.6 間的數值/收斂差異。各 PC 解釋比例與排序與論文相符，差異微小。
  若要求蝌蚪逐位元吻合，需改裝 geomorph 3.0.2（連帶需較舊的 R 與 RRPP），
  成本較高——留待你裁示。

## 產出
- `scripts/setup_r_env.sh`：可重現的 R 環境安裝（Ubuntu 24.04）。
- `scripts/phase1_reproduce.R`：重現腳本（含 join key 驗證與數值比對）。
- `baseline/`：基準輸出
  - `tadpole_scores.csv` / `adult_scores.csv`（物種 × PC 分數，前 10 PC）
  - `tadpole_variance.csv` / `adult_variance.csv`（各 PC 變異解釋與累積）
  - `reproduction_summary.json`（機器可讀比對摘要）
