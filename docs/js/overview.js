/* 概覽：hero（含資料洞察卡）內嵌於主畫面；統計卡 / 量規 / 資料集摘要收進「資料總覽」抽屜。
   全部依真實載入資料動態產生，並支援雙語（FD.t）。無假資料。 */
(function (global) {
  "use strict";
  var FD = global.FrogDash, Store = FD.Store;
  var head, drawer, drawerBody, drawerBackdrop, recentSection, recentGrid, recent = [];
  var GAUGE_COLORS = ["var(--accent)", "#56B4E9", "#009E73", "#E69F00", "#CC79A7"];
  function t(k, p) { return FD.t ? FD.t(k, p) : k; }

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
      '<circle cx="50" cy="50" r="40" fill="none" style="stroke:var(--track)" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + track + '" transform="rotate(135 50 50)"/>' +
      '<circle cx="50" cy="50" r="40" fill="none" style="stroke:' + color + '" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + val + '" transform="rotate(135 50 50)"/>' +
      '</svg><div class="gauge-center"><div class="g-val">' + pct(p) + '<span style="font-size:15px;">%</span></div><div class="g-cap">' + esc(t("ov.first4")) + '</div></div></div>';
  }

  function iconLayers() {
    return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/></svg>';
  }
  function iconBars() {
    return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20v-6M6 20v-4M18 20v-9"/></svg>';
  }

  function ctx(model) {
    var ds = model.dataset || {}, G = FD.Groups;
    var n = model.taxaOrder.length;
    var big = n > 1500;
    var counts = groupCounts(model);
    var views = model.viewOrder.map(function (id) { return model.views[id]; });
    var authorYear = (ds.title && /\(([^)]*\d{4}[^)]*)\)/.exec(ds.title)) ? RegExp.$1 : (ds.title || "");
    return { ds: ds, G: G, n: n, big: big, counts: counts, views: views, authorYear: authorYear, field: G.field };
  }

  function dsShort(ds) {
    var s = ds.title || "資料集";
    return s.replace(/\s*\([^)]*\)\s*$/, "").trim() || s;
  }

  // ---- Hero（內嵌主畫面）----
  function renderHero(model) {
    if (!head) return;
    var c = ctx(model);
    var best = c.views.slice().sort(function (a, b) { return cum4(b) - cum4(a); })[0];
    var bestCum = best ? cum4(best) : 0;
    var unit = c.big ? t("unit.objects") : t("unit.species");
    var author = c.authorYear ? " · " + esc(c.authorYear) : "";

    head.innerHTML =
      '<div class="hero"><div class="hero-inner"><div>' +
        '<div class="hero-word"><b>MORPHO</b><span>/ PCA</span></div>' +
        '<div class="hero-src">' + t("ov.basedOn", { n: c.n, unit: esc(unit), author: author }) + '</div>' +
        '<div class="hero-title">' + esc(t("ov.title")) + '</div>' +
        '<div class="hero-chips">' +
          '<span class="hero-chip">' + esc(dsShort(c.ds)) + '</span>' +
          '<span class="hero-chip">' + esc(t("ov.groupChip", { field: c.field })) + '</span>' +
          '<span class="hero-chip">' + esc(t("ov.viewsChip", { v: c.views.length, g: c.counts.length })) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="hero-insight"><div class="ins-card">' +
        '<div class="ins-head"><svg width="18" height="18" viewBox="0 0 24 24" fill="#181b0a"><path d="M13 2 3 14h7l-1 8 10-12h-7z"/></svg>' + esc(t("ov.insightTitle")) + '</div>' +
        '<div class="ins-sep"></div>' +
        '<div class="ins-body">' + (best ? t("ov.insightText", { label: esc(best.label || best.id), p: pct(bestCum) }) : esc(t("ov.insightFallback"))) + '</div>' +
      '</div></div></div></div>';
  }

  // ---- 抽屜：統計卡 + 量規 + 摘要 ----
  function renderDrawer(model) {
    if (!drawerBody) return;
    var c = ctx(model);
    var counts = c.counts, views = c.views, ds = c.ds, field = c.field;

    var bar = counts.map(function (x) {
      return '<span style="flex:' + x.count + ';background:' + x.color + ';"></span>';
    }).join("");

    var gauges = views.map(function (v, i) {
      return '<div class="stat-card"><div class="stat-label">' + iconBars() +
        esc(t("ov.gaugeCum", { label: v.label || v.id })) + '</div>' +
        gaugeSVG(cum4(v), GAUGE_COLORS[i % GAUGE_COLORS.length]) + '</div>';
    }).join("");

    var v0 = views[0];
    var v0var = (v0.variance && v0.variance.length) ? v0.variance
      : Object.keys(v0.varianceExplained || {}).map(function (k) { return v0.varianceExplained[k]; });
    var vmax = v0var[0] || 1;
    var varBars = v0var.slice(0, 4).map(function (x, i) {
      return '<div class="sp-var"><div class="vrow"><span class="pc">PC' + (i + 1) + '</span><span class="pct">' + pct(x) + '%</span></div>' +
        '<div class="vbar"><i style="width:' + (x / vmax * 100).toFixed(1) + '%;"></i></div></div>';
    }).join("");

    var grpRows = counts.map(function (x) {
      return '<div class="sp-grp"><span class="sw" style="background:' + x.color + ';"></span>' +
        '<span class="nm">' + esc(x.label) + '</span><span class="ct">' + x.count + '</span></div>';
    }).join("");

    var doiHTML = ds.doi
      ? '<a class="doi" href="' + esc(ds.source_url || ("https://doi.org/" + ds.doi)) + '" target="_blank" rel="noopener">DOI · ' + esc(ds.doi) +
        ' <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg></a>'
      : "";

    drawerBody.innerHTML =
      '<div class="drawer-stats">' +
        '<div class="stat-card"><div class="stat-label">' + iconLayers() + esc(c.big ? t("ov.statTotalPts") : t("ov.statTotal")) + '</div>' +
          '<div class="stat-big">' + c.n + '</div>' +
          '<div class="stat-sub"><span>' + esc(field) + '</span><span>' + esc(t("ov.groupsN", { g: counts.length })) + '</span></div>' +
          '<div class="stat-bar">' + bar + '</div></div>' +
        '<div class="drawer-gauges">' + gauges + '</div>' +
        '<aside class="summary-panel">' +
          '<div class="sp-title"><span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="stroke:var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 7v6c0 4 3.4 6.9 8 8 4.6-1.1 8-4 8-8V7z"/></svg>' + esc(t("ov.summary")) + '</span></div>' +
          '<div class="sp-src"><div class="k">' + esc(t("ov.srcPaper")) + '</div><div class="v">' + esc(c.authorYear || ds.title || "—") + '</div>' + doiHTML + '</div>' +
          '<div class="sp-sec">' + esc(t("ov.varTitle", { label: v0.label || v0.id })) + '</div><div class="sp-vars">' + varBars + '</div>' +
          '<div class="sp-divider"></div>' +
          '<div class="sp-sec">' + esc(t("ov.perGroup", { field: field })) + '</div><div class="sp-groups">' + grpRows + '</div>' +
          '<div class="sp-live"><span class="pl"></span>' + esc(model.hasTree ? t("ov.linkedTree") : t("ov.linked")) + '</div>' +
        '</aside>' +
      '</div>';
  }

  function render(model) { renderHero(model); renderDrawer(model); }

  // ---- 抽屜開關 ----
  function openDrawer() {
    if (!drawer) return;
    drawer.hidden = false; if (drawerBackdrop) drawerBackdrop.hidden = false;
    var btn = document.getElementById("overview-toggle"); if (btn) btn.classList.add("active");
  }
  function closeDrawer() {
    if (!drawer) return;
    drawer.hidden = true; if (drawerBackdrop) drawerBackdrop.hidden = true;
    var btn = document.getElementById("overview-toggle"); if (btn) btn.classList.remove("active");
  }
  function toggleDrawer() { if (drawer && drawer.hidden) openDrawer(); else closeDrawer(); }

  // ---- 近期檢視物種 ----
  function pushRecent(sid) {
    var model = Store.data; if (!model) return;
    var tx = model.taxa[sid]; if (!tx) return;
    recent = recent.filter(function (r) { return r.sid !== sid; });
    recent.unshift({ sid: sid, t: tx });
    recent = recent.slice(0, 3);
    renderRecent();
  }
  function renderRecent() {
    if (!recentGrid) return;
    var model = Store.data, G = FD.Groups;
    if (!recent.length) { recentSection.hidden = true; return; }
    recentSection.hidden = false;
    recentGrid.innerHTML = recent.map(function (r) {
      var tx = r.t, label = tx[model.displayLabelCol] || r.sid;
      var st = G.styleOf(r.sid) || {}; var color = st.color || "#d4fb3c";
      var sub = tx.family || tx.clade || tx.genus || (G.field && tx[G.field]) || "";
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
    drawer = document.getElementById("overview-drawer");
    drawerBody = document.getElementById("overview-drawer-body");
    drawerBackdrop = document.getElementById("overview-drawer-backdrop");
    recentSection = document.getElementById("recent-section");
    recentGrid = document.getElementById("recent-grid");

    var tog = document.getElementById("overview-toggle");
    if (tog) tog.addEventListener("click", toggleDrawer);
    var cl = document.getElementById("overview-drawer-close");
    if (cl) cl.addEventListener("click", closeDrawer);
    if (drawerBackdrop) drawerBackdrop.addEventListener("click", closeDrawer);

    Store.on("data", function (m) { recent = []; if (recentSection) recentSection.hidden = true; render(m); });
    Store.on("groupschanged", function () { if (Store.data) { render(Store.data); renderRecent(); } });
    Store.on("focus", function (p) { if (p && p.speciesId) pushRecent(p.speciesId); });
    if (recentGrid) recentGrid.addEventListener("click", function (e) {
      var card = e.target.closest(".recent-card"); if (!card) return;
      Store.focus(card.dataset.sid, "recent");
    });
  }

  FD.initOverview = init;
  FD.renderOverview = function (m) { render(m); renderRecent(); };  // 語言切換時重繪
})(window);
