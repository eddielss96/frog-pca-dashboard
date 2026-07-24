/* 雙語（繁中 / English）。靜態 DOM 以 data-i18n / data-i18n-ph / data-i18n-title 標記；
   動態字串由各模組呼叫 FD.t(key, params)。切換語言時重譯 DOM 並重繪動態內容。純 vanilla。 */
(function (global) {
  "use strict";
  var FD = global.FrogDash = global.FrogDash || {};

  var DICT = {
    zh: {
      "nav.overview": "概覽", "nav.analytics": "分析", "nav.load": "載入資料", "nav.builder": "建立精靈",
      "btn.panel": "側邊面板", "btn.summary": "資料總覽", "btn.clear": "清除選取", "btn.close": "關閉",
      "search.ph": "搜尋物種…",
      "set.title": "設定", "set.theme": "主題 / Theme", "set.light": "淺色", "set.dark": "深色", "set.auto": "自動",
      "set.accent": "主視覺色 / Accent", "set.lang": "語言 / Language",
      "dataset.label": "資料集",
      "welcome.title": "載入資料以開始",
      "welcome.body": "本工具讀取「統一 Zip」格式（由 R / Python / CSV 匯出器產生）。所有統計已在匯出端算好，瀏覽器端只負責互動式呈現。",
      "welcome.drop": "拖放 .zip 到此處，或用上方「載入資料」。",
      "welcome.demo": "載入青蛙範例資料",
      "welcome.demoHint": "（範例：Sherratt et al. 2017，澳洲青蛙與蝌蚪，166 物種）",
      "welcome.ownQ": "想用自己的 PCA 資料做一個像這樣的網頁？",
      "welcome.buildLink": "用建立精靈打包成自己的網站 →",
      "group.by": "分組依", "group.settings": "顏色/形狀", "group.customTitle": "自訂顏色與形狀", "group.reset": "重設為預設",
      "tree.title": "親緣關係樹", "tree.sub": "（點分支高亮整個 clade）",
      "tree.rect": "矩形", "tree.circ": "環狀", "tree.clado": "整齊對齊", "tree.phylo": "分支長度",
      "tree.labels": "標籤", "tree.collapse": "收合深層", "tree.expandAll": "展開全部", "tree.fit": "自動縮放", "tree.png": "PNG",
      "tree.fallback1": "⚠️ 此環境無法使用 WebGL，無法繪製互動式親緣樹。",
      "tree.fallback2": "PCA 圖仍可正常使用；點擊樹分支高亮 clade 的功能在此環境停用。",
      "tree.titleTip": "矩形佈局（適合小樹、便於閱讀標籤）", "tree.circTip": "環狀佈局（適合大樹、一眼看全貌）",
      "tree.cladoTip": "對齊 tips、依拓樸均勻鋪滿，最易辨認", "tree.phyloTip": "依實際演化分支長度繪製（時間樹）",
      "recent.title": "近期檢視的物種", "recent.sub": "最近在形態空間中點選 / 釘選的物種 — 點卡片開啟側邊詳細資訊",
      "side.title": "物種資訊", "drawer.title": "資料集總覽",
      "ov.title": "形態空間總覽",
      "ov.basedOn": "— 基於 {n} 個{unit}{author}", "unit.species": "物種", "unit.objects": "物件",
      "ov.groupChip": "分組：{field}", "ov.viewsChip": "{v} 個視圖 · {g} 組",
      "ov.insightTitle": "資料洞察",
      "ov.insightText": "{label} 的前 4 個主成分累積解釋 <b>{p}%</b> 的形態變異。",
      "ov.insightFallback": "互動式形態空間，點擊任一點高亮。",
      "ov.statTotal": "物種總數", "ov.statTotalPts": "資料點總數", "ov.groupsN": "{g} 組",
      "ov.gaugeCum": "{label} 累積", "ov.first4": "前 4 主成分",
      "ov.summary": "資料集摘要", "ov.srcPaper": "來源論文",
      "ov.varTitle": "主成分變異解釋 · {label}", "ov.perGroup": "各{field}項目數",
      "ov.linkedTree": "樹與形態空間已連動 · 點擊任一點高亮", "ov.linked": "形態空間互動 · 點擊任一點高亮",
      "st.loadingDefault": "載入中",
      "st.loading": "{label}…",
      "st.loaded": "已載入：{n} 物種、{v} 個 PCA 視圖、{tree} 個樹葉（join key 一致 ✓）",
      "st.failed": "載入失敗：{msg}",
      "meta.source": "原始資料來源", "meta.madeWith": "產生方式：{w}",
      "legend.hidden": "（隱藏）"
    },
    en: {
      "nav.overview": "Overview", "nav.analytics": "Analytics", "nav.load": "Load data", "nav.builder": "Builder",
      "btn.panel": "Panel", "btn.summary": "Summary", "btn.clear": "Clear", "btn.close": "Close",
      "search.ph": "Search species name or ID…",
      "set.title": "Settings", "set.theme": "主題 / Theme", "set.light": "Light", "set.dark": "Dark", "set.auto": "Auto",
      "set.accent": "主視覺色 / Accent", "set.lang": "語言 / Language",
      "dataset.label": "Dataset",
      "welcome.title": "Load data to begin",
      "welcome.body": "This tool reads the “unified Zip” format (produced by the R / Python / CSV exporters). All statistics are computed at export time; the browser only handles interactive display.",
      "welcome.drop": "Drop a .zip here, or use “Load data” above.",
      "welcome.demo": "Load frog sample data",
      "welcome.demoHint": "(Sample: Sherratt et al. 2017, Australian frogs & tadpoles, 166 species)",
      "welcome.ownQ": "Want to build a page like this from your own PCA data?",
      "welcome.buildLink": "Package your own site with the Builder →",
      "group.by": "Group by", "group.settings": "Colors/shapes", "group.customTitle": "Customize colors & shapes", "group.reset": "Reset to defaults",
      "tree.title": "Phylogenetic tree", "tree.sub": "(click a branch to highlight a clade)",
      "tree.rect": "Rect", "tree.circ": "Circular", "tree.clado": "Aligned", "tree.phylo": "Branch length",
      "tree.labels": "Labels", "tree.collapse": "Collapse", "tree.expandAll": "Expand all", "tree.fit": "Fit", "tree.png": "PNG",
      "tree.fallback1": "⚠️ WebGL is unavailable here, so the interactive tree can’t be drawn.",
      "tree.fallback2": "The PCA plots still work; clade-highlighting by clicking branches is disabled in this environment.",
      "tree.titleTip": "Rectangular layout (good for small trees, readable labels)", "tree.circTip": "Circular layout (good for large trees, see it all at once)",
      "tree.cladoTip": "Align tips, spread evenly by topology — easiest to read", "tree.phyloTip": "Draw by actual evolutionary branch lengths (time tree)",
      "recent.title": "Recently viewed species", "recent.sub": "Species you recently clicked / pinned in the morphospace — click a card to open details",
      "side.title": "Species info", "drawer.title": "Dataset summary",
      "ov.title": "Morphospace Overview",
      "ov.basedOn": "— Based on {n} {unit}{author}", "unit.species": "species", "unit.objects": "objects",
      "ov.groupChip": "Grouped: {field}", "ov.viewsChip": "{v} views · {g} groups",
      "ov.insightTitle": "Data insight",
      "ov.insightText": "The first 4 PCs of {label} explain <b>{p}%</b> of shape variance.",
      "ov.insightFallback": "Interactive morphospace — click any point to highlight.",
      "ov.statTotal": "Total species", "ov.statTotalPts": "Total points", "ov.groupsN": "{g} groups",
      "ov.gaugeCum": "{label} cumulative", "ov.first4": "First 4 PCs",
      "ov.summary": "Dataset summary", "ov.srcPaper": "Source paper",
      "ov.varTitle": "PC variance explained · {label}", "ov.perGroup": "Count per {field}",
      "ov.linkedTree": "Tree linked to morphospace · click a point to highlight", "ov.linked": "Interactive morphospace · click a point to highlight",
      "st.loadingDefault": "Loading",
      "st.loading": "{label}…",
      "st.loaded": "Loaded: {n} species, {v} PCA views, {tree} tree leaves (join keys consistent ✓)",
      "st.failed": "Load failed: {msg}",
      "meta.source": "Data source", "meta.madeWith": "Made with: {w}",
      "legend.hidden": " (hidden)"
    }
  };

  var lang = "zh";
  try { var s = localStorage.getItem("mp-lang"); if (s === "zh" || s === "en") lang = s; } catch (e) {}

  function t(key, params) {
    var s = (DICT[lang] && DICT[lang][key]);
    if (s == null) s = (DICT.zh[key] != null ? DICT.zh[key] : key);
    if (params) s = s.replace(/\{(\w+)\}/g, function (_, k) { return params[k] != null ? params[k] : ""; });
    return s;
  }

  function translateDom(rootEl) {
    var root = rootEl || document;
    root.querySelectorAll("[data-i18n]").forEach(function (el) { el.textContent = t(el.getAttribute("data-i18n")); });
    root.querySelectorAll("[data-i18n-ph]").forEach(function (el) { el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph"))); });
    root.querySelectorAll("[data-i18n-title]").forEach(function (el) { el.setAttribute("title", t(el.getAttribute("data-i18n-title"))); });
  }

  function setLang(l) {
    if (l !== "zh" && l !== "en") return;
    lang = l;
    try { localStorage.setItem("mp-lang", l); } catch (e) {}
    document.documentElement.setAttribute("lang", l === "zh" ? "zh-Hant" : "en");
    document.documentElement.setAttribute("data-lang", l);
    translateDom();
    // 重繪動態內容
    var Store = FD.Store;
    if (Store && Store.data) {
      if (FD.renderOverview) try { FD.renderOverview(Store.data); } catch (e) {}
      if (FD.Legend && FD.Legend.rerender) try { FD.Legend.rerender(); } catch (e) {}
    }
    if (FD.syncLangUI) FD.syncLangUI();
  }

  FD.i18n = { t: t, setLang: setLang, get lang() { return lang; }, translateDom: translateDom };
  FD.t = t;

  // 初次套用語言屬性 + 翻譯（DOM ready 後）
  document.documentElement.setAttribute("data-lang", lang);
  document.documentElement.setAttribute("lang", lang === "zh" ? "zh-Hant" : "en");
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { translateDom(); });
  else translateDom();
})(window);
