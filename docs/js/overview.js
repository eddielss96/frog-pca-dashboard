/* 概覽頭部：hero + 統計量規 + 資料集摘要 + 近期物種。全部依「真實載入的資料」動態產生。
   實作 Claude Design 稿的深色編輯風概覽版面；無假資料。 */
(function (global) {
  "use strict";
  var FD = global.FrogDash, Store = FD.Store;
  var head, recentSection, recentGrid, recent = [];
  var GAUGE_COLORS = ["#d4fb3c", "#56B4E9", "#009E73", "#E69F00", "#CC79A7"];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function pct(x) { return (x * 100).toFixed(1); }

  function groupCounts(model) {
    var G = FD.Groups, field = G.field, members = G.members(), by = {};
    members.forEach(function (m) { by[m.value] = { value: m.value, label: m.label, color: m.color, count: 0 }; });
    model.taxaOrder.forEach(function (sid) {
      var v = (model.taxa[sid] || {})[field];
      if (v != null && by[v]) by[v].count++;
    });
    return members.map(function (m) { return by[m.value]; })
      .filter(function (x) { return x.count > 0; })
      .sort(function (a, b) { return b.count - a.count; });
  }

  function cum4(view) {
    var v = (view.variance && view.variance.length) ? view.variance
          : Object.keys(view.varianceExplained || {}).map(function (k) { return view.varianceExplained[k]; });
    return v.slice(0, 4).reduce(function (a, b) { return a + b; }, 0);
  }

  function gaugeSVG(p, color) {
    var C = 2 * Math.PI * 40, track = (0.75 * C).toFixed(1) + " " + C.toFixed(1),
        val = (0.75 * C * p).toFixed(1) + " " + C.toFixed(1);
    return '<div class="gauge-wrap"><svg viewBox="0 0 100 100">' +
      '<circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + track + '" transform="rotate(135 50 50)"/>' +
      '<circle cx="50" cy="50" r="40" fill="none" stroke="' + color + '" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + val + '" transform="rotate(135 50 50)"/>' +
      '</svg><div class="gauge-center"><div class="g-val">' + pct(p) + '<span style="font-size:15px;">%</span></div><div class="g-cap">前 4 主成分</div></div></div>';
  }

  function iconLayers() {
    return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/></svg>';
  }
  function iconBars() {
    return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20v-6M6 20v-4M18 20v-9"/></svg>';
  }

  function render(model) {
    if (!head) return;
    var ds = model.dataset || {}, G = FD.Groups;
    var n = model.taxaOrder.length;
    var unit = n > 1500 ? "物件" : "物種";
    var counts = groupCounts(model);
    var views = model.viewOrder.map(function (id) { return model.views[id]; });
    var authorYear = (ds.title && /\(([^)]*\d{4}[^)]*)\)/.exec(ds.title)) ? RegExp.$1 : (ds.title || "");
    var field = G.field;

    // hero source insight = 累積解釋最高的視圖
    var best = views.slice().sort(function (a, b) { return cum4(b) - cum4(a); })[0];
    var bestCum = best ? cum4(best) : 0;

    // 群組色條
    var totalCount = counts.reduce(function (a, c) { return a + c.count; }, 0) || 1;
    var bar = counts.map(function (c) {
      return '<span style="flex:' + c.count + ';background:' + c.color + ';"></span>';
    }).join("");

    // 統計卡：物種總數 + 每視圖一個量規
    var gauges = views.map(function (v, i) {
      return '<div class="stat-card"><div class="stat-label">' + iconBars() +
        esc(v.label || v.id) + ' 累積</div>' + gaugeSVG(cum4(v), GAUGE_COLORS[i % GAUGE_COLORS.length]) + '</div>';
    }).join("");

    // 摘要：變異解釋（第一視圖前 4）
    var v0 = views[0];
    var v0var = (v0.variance && v0.variance.length) ? v0.variance
      : Object.keys(v0.varianceExplained || {}).map(function (k) { return v0.varianceExplained[k]; });
    var vmax = v0var[0] || 1;
    var varBars = v0var.slice(0, 4).map(function (x, i) {
      return '<div class="sp-var"><div class="vrow"><span class="pc">PC' + (i + 1) + '</span><span class="pct">' + pct(x) + '%</span></div>' +
        '<div class="vbar"><i style="width:' + (x / vmax * 100).toFixed(1) + '%;"></i></div></div>';
    }).join("");

    var grpRows = counts.map(function (c) {
      return '<div class="sp-grp"><span class="sw" style="background:' + c.color + ';"></span>' +
        '<span class="nm">' + esc(c.label) + '</span><span class="ct">' + c.count + '</span></div>';
    }).join("");

    var doiHTML = ds.doi
      ? '<a class="doi" href="' + esc(ds.source_url || ("https://doi.org/" + ds.doi)) + '" target="_blank" rel="noopener">DOI · ' + esc(ds.doi) +
        ' <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg></a>'
      : "";

    head.innerHTML =
      '<div class="hero"><div class="hero-inner"><div>' +
        '<div class="hero-word"><b>MORPHO</b><span>/ PCA</span></div>' +
        '<div class="hero-src">— 基於 ' + n + ' 個' + unit + (authorYear ? ' · ' + esc(authorYear) : '') + '</div>' +
        '<div class="hero-title">形態空間總覽</div>' +
        '<div class="hero-chips">' +
          '<span class="hero-chip">' + esc(dsShort(ds)) + '</span>' +
          '<span class="hero-chip">分組：' + esc(field) + '</span>' +
          '<span class="hero-chip">' + views.length + ' 個視圖 · ' + counts.length + ' 組</span>' +
        '</div>' +
      '</div>' +
      '<div class="hero-insight"><div class="ins-card">' +
        '<div class="ins-head"><svg width="18" height="18" viewBox="0 0 24 24" fill="#181b0a"><path d="M13 2 3 14h7l-1 8 10-12h-7z"/></svg>資料洞察</div>' +
        '<div class="ins-sep"></div>' +
        '<div class="ins-body">' + (best ? esc(best.label || best.id) + ' 的前 4 個主成分累積解釋 <b>' + pct(bestCum) + '%</b> 的形態變異。' : '互動式形態空間，點擊任一點高亮。') + '</div>' +
      '</div></div></div></div>' +

      '<div class="ov-grid"><div class="stat-row">' +
        '<div class="stat-card"><div class="stat-label">' + iconLayers() + (n > 1500 ? '資料點總數' : '物種總數') + '</div>' +
          '<div class="stat-big">' + n + '</div>' +
          '<div class="stat-sub"><span>' + esc(field) + '</span><span>' + counts.length + ' 組</span></div>' +
          '<div class="stat-bar">' + bar + '</div></div>' +
        gauges +
      '</div>' +

      '<aside class="summary-panel">' +
        '<div class="sp-title"><span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d4fb3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 7v6c0 4 3.4 6.9 8 8 4.6-1.1 8-4 8-8V7z"/></svg>資料集摘要</span></div>' +
        '<div class="sp-src"><div class="k">來源論文</div><div class="v">' + esc(authorYear || ds.title || "—") + '</div>' + doiHTML + '</div>' +
        '<div class="sp-sec">主成分變異解釋 · ' + esc(v0.label || v0.id) + '</div><div class="sp-vars">' + varBars + '</div>' +
        '<div class="sp-divider"></div>' +
        '<div class="sp-sec">各' + esc(field) + '項目數</div><div class="sp-groups">' + grpRows + '</div>' +
        '<div style="flex:1;"></div>' +
        '<div class="sp-live"><span class="pl"></span>' + (model.hasTree ? '樹與形態空間已連動 · 點擊任一點高亮' : '形態空間互動 · 點擊任一點高亮') + '</div>' +
      '</aside></div>';
  }

  function dsShort(ds) {
    // 取資料集標題括號前的主名（去掉作者年份）
    var t = ds.title || "資料集";
    return t.replace(/\s*\([^)]*\)\s*$/, "").trim() || t;
  }

  // 近期檢視物種
  function pushRecent(sid) {
    var model = Store.data; if (!model) return;
    var t = model.taxa[sid]; if (!t) return;
    recent = recent.filter(function (r) { return r.sid !== sid; });
    recent.unshift({ sid: sid, t: t });
    recent = recent.slice(0, 3);
    renderRecent();
  }
  function renderRecent() {
    if (!recentGrid) return;
    var model = Store.data, G = FD.Groups;
    if (!recent.length) { recentSection.hidden = true; return; }
    recentSection.hidden = false;
    recentGrid.innerHTML = recent.map(function (r) {
      var t = r.t, label = t[model.displayLabelCol] || r.sid;
      var st = G.styleOf(r.sid) || {}; var color = st.color || "#d4fb3c";
      var sub = t.family || t.clade || t.genus || (G.field && t[G.field]) || "";
      var mono = (label || "?").trim().charAt(0).toUpperCase();
      return '<div class="recent-card" data-sid="' + esc(r.sid) + '">' +
        '<div class="mono" style="background:' + hexA(color, .16) + ';color:' + color + ';">' + esc(mono) + '</div>' +
        '<div style="flex:1;min-width:0;"><div class="rc-sp">' + esc(label) + '</div><div class="rc-fam">' + esc(sub) + '</div></div>' +
        '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#8f9184" stroke-width="2" stroke-linecap="round"><path d="M7 17 17 7M9 7h8v8"/></svg></div>';
    }).join("");
  }
  function hexA(hex, a) {
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return "rgba(212,251,60," + a + ")";
    return "rgba(" + parseInt(m[1], 16) + "," + parseInt(m[2], 16) + "," + parseInt(m[3], 16) + "," + a + ")";
  }

  function init() {
    head = document.getElementById("overview-head");
    recentSection = document.getElementById("recent-section");
    recentGrid = document.getElementById("recent-grid");
    Store.on("data", function (m) { recent = []; if (recentSection) recentSection.hidden = true; render(m); });
    Store.on("groupschanged", function () { if (Store.data) { render(Store.data); renderRecent(); } });
    Store.on("focus", function (p) { if (p && p.speciesId) pushRecent(p.speciesId); });
    if (recentGrid) recentGrid.addEventListener("click", function (e) {
      var card = e.target.closest(".recent-card"); if (!card) return;
      Store.focus(card.dataset.sid, "recent");
    });
  }

  FD.initOverview = init;
})(window);
