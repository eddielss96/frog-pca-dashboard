/* PCA 散佈圖（Plotly）：分群著色＋形狀（可切換欄位/自訂）、軸切換、
   hover 浮出資訊卡、click 釘選、跨視圖連動高亮、固定軸比例尺。 */
(function (global) {
  "use strict";
  var Store = global.FrogDash.Store, Groups = global.FrogDash.Groups;

  function PCAView(opts) {
    this.viewId = opts.viewId;
    this.plotEl = document.getElementById(opts.plotId);
    this.xSel = document.getElementById(opts.xId);
    this.ySel = document.getElementById(opts.yId);
    this.titleEl = document.getElementById(opts.titleId);
    this.view = null;
    this.traces = [];
    this.groupOfTrace = [];
    var self = this;
    this.xSel.addEventListener("change", function () { self.draw(); });
    this.ySel.addEventListener("change", function () { self.draw(); });
  }

  PCAView.prototype.setData = function (model) {
    this.model = model;
    this.view = model.views[this.viewId];
    if (!this.view) return;
    this.titleEl.textContent = this.view.label;
    var pcs = this.view.pcs;
    [this.xSel, this.ySel].forEach(function (sel) {
      sel.innerHTML = "";
      pcs.forEach(function (p) {           // 已移除變量解釋(%)，僅列 PC 名
        var opt = document.createElement("option");
        opt.value = p; opt.textContent = p;
        sel.appendChild(opt);
      });
    });
    this.xSel.value = this.view.defaultAxes[0] || pcs[0];
    this.ySel.value = this.view.defaultAxes[1] || pcs[1] || pcs[0];
    this.buildTraces();
    this.draw();
  };

  PCAView.prototype.buildTraces = function () {
    var model = this.model, view = this.view;
    var members = Groups.members();
    var byGroup = {};
    members.forEach(function (g) { byGroup[g.value] = { g: g, ids: [] }; });
    view.ids.forEach(function (sid) {
      var v = Groups.valueOf(sid);
      (byGroup[v] || (byGroup[v] = { g: { value: v, label: v, color: "#888", symbol: "circle" }, ids: [] })).ids.push(sid);
    });
    var order = members.map(function (g) { return byGroup[g.value]; })
      .concat(Object.keys(byGroup).filter(function (v) { return !members.some(function (m) { return m.value === v; }); })
        .map(function (v) { return byGroup[v]; }));

    this.traces = [];
    this.groupOfTrace = [];
    this.speciesIndexInTrace = {};
    var self = this;
    order.forEach(function (entry, ti) {
      entry.ids.forEach(function (sid, idx) { self.speciesIndexInTrace[sid] = { trace: ti, idx: idx }; });
      self.traces.push({
        type: "scattergl", mode: "markers", name: entry.g.label,
        customdata: entry.ids,
        text: entry.ids.map(function (sid) { return (model.taxa[sid] || {})[model.displayLabelCol] || sid; }),
        hovertemplate: "%{text}<extra></extra>",
        marker: { color: entry.g.color, symbol: entry.g.symbol, size: 9, line: { color: "#33404d", width: 0.6 }, opacity: 0.95 },
        selected: { marker: { size: 15, opacity: 1 } },
        unselected: { marker: { opacity: 0.12 } },
        x: [], y: []
      });
      self.groupOfTrace.push(entry.g.value);
    });
  };

  // 以「全體資料」計算固定的方形軸範圍（等尺度），與群組顯示與否無關 (#11)
  PCAView.prototype.computeRange = function (px, py) {
    var view = this.view, minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
    view.ids.forEach(function (sid) {
      var x = view.scores[sid][px], y = view.scores[sid][py];
      if (x < minx) minx = x; if (x > maxx) maxx = x;
      if (y < miny) miny = y; if (y > maxy) maxy = y;
    });
    var cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
    var span = Math.max(maxx - minx, maxy - miny) * 1.12 || 1;
    return { x: [cx - span / 2, cx + span / 2], y: [cy - span / 2, cy + span / 2] };
  };

  PCAView.prototype.draw = function () {
    if (!this.view) return;
    var px = this.xSel.value, py = this.ySel.value, view = this.view;
    this.traces.forEach(function (tr) {
      tr.x = tr.customdata.map(function (sid) { return view.scores[sid][px]; });
      tr.y = tr.customdata.map(function (sid) { return view.scores[sid][py]; });
    });
    var rng = this.computeRange(px, py);
    var GRID = "rgba(255,255,255,.06)", ZERO = "rgba(255,255,255,.14)", FG = "#8f9184";
    var layout = {
      margin: { l: 44, r: 10, t: 8, b: 38 },
      font: { color: FG, family: "Archivo, system-ui, sans-serif", size: 11 },
      xaxis: { title: { text: px, font: { size: 11, color: FG } }, gridcolor: GRID, tickfont: { color: FG },
               zeroline: true, zerolinecolor: ZERO, autorange: false, range: rng.x.slice() },
      yaxis: { title: { text: py, font: { size: 11, color: FG } }, gridcolor: GRID, tickfont: { color: FG }, scaleanchor: "x", scaleratio: 1,
               zeroline: true, zerolinecolor: ZERO, autorange: false, range: rng.y.slice() },
      showlegend: false, hovermode: "closest", dragmode: "pan",
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
      hoverlabel: { bgcolor: "#15160f", bordercolor: "rgba(255,255,255,.15)", font: { color: "#f3f4ee", family: "Archivo" } }
    };
    var config = { displayModeBar: false, responsive: true, scrollZoom: true };
    var self = this;
    Plotly.react(this.plotEl, this.traces, layout, config).then(function () {
      if (!self._bound) {
        self._bound = true;
        self.plotEl.on("plotly_click", function (ev) {
          if (!ev.points || !ev.points.length) return;
          var sid = ev.points[0].customdata;
          Store.focus(sid, self.viewId);
          Store.setHighlight([sid], self.viewId);
        });
        self.plotEl.on("plotly_hover", function (ev) {
          if (!ev.points || !ev.points.length) return;
          var sid = ev.points[0].customdata;
          var me = ev.event || {};
          Store.hover(sid, { x: me.clientX, y: me.clientY }, self.viewId);
        });
        self.plotEl.on("plotly_unhover", function () { Store.unhover(); });
      }
      self.applyHighlight(Store.highlight);
      self.applyGroups(Store.disabledGroups);
    });
  };

  PCAView.prototype.applyHighlight = function (idSet) {
    if (!this.view) return;
    var hasSel = idSet && idSet.size > 0;
    var selByTrace = this.traces.map(function () { return null; });
    if (hasSel) {
      this.traces.forEach(function (tr, ti) { selByTrace[ti] = []; });
      var self = this;
      idSet.forEach(function (sid) {
        var loc = self.speciesIndexInTrace[sid];
        if (loc) selByTrace[loc.trace].push(loc.idx);
      });
    }
    Plotly.restyle(this.plotEl, { selectedpoints: selByTrace });
  };

  PCAView.prototype.applyGroups = function (disabled) {
    var vis = this.groupOfTrace.map(function (gv) { return !disabled.has(gv); });
    Plotly.restyle(this.plotEl, { visible: vis });   // 只改可見性，範圍不變 (#11)
  };

  PCAView.prototype.rebuild = function () {   // 分組欄位/配色改變後
    if (!this.view) return;
    this.buildTraces();
    this.draw();
  };

  // 依 manifest 動態建立每個視圖的面板 DOM（已移除 scree）
  function buildPanel(row, view) {
    var vid = view.id;
    var sec = document.createElement("section");
    sec.className = "panel pca-panel";
    sec.innerHTML =
      '<div class="panel-head">' +
        '<h2 id="' + vid + '-title">' + esc(view.label) + '</h2>' +
        '<div class="axis-ctrls">' +
          '<label>X <select id="' + vid + '-x" class="axis-select"></select></label>' +
          '<label>Y <select id="' + vid + '-y" class="axis-select"></select></label>' +
          '<button class="btn small dl" data-view="' + vid + '" title="下載此圖 PNG">↓ PNG</button>' +
        '</div>' +
      '</div>' +
      '<div id="' + vid + '-plot" class="plot"></div>';
    row.appendChild(sec);
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  var views = {};
  function init() {
    Store.on("data", function (model) {
      var row = document.getElementById("pca-row");
      row.innerHTML = "";
      views = {};
      row.style.gridTemplateColumns = model.viewOrder.length === 1 ? "1fr" : "1fr 1fr";
      model.viewOrder.forEach(function (vid) { buildPanel(row, model.views[vid]); });
      model.viewOrder.forEach(function (vid) {
        views[vid] = new PCAView({ viewId: vid, plotId: vid + "-plot", xId: vid + "-x", yId: vid + "-y", titleId: vid + "-title" });
        views[vid].setData(model);
      });
      global.FrogDash.pcaViews = views;
    });
    Store.on("highlight", function (p) { Object.keys(views).forEach(function (k) { views[k].applyHighlight(p.ids); }); });
    Store.on("groups", function (disabled) { Object.keys(views).forEach(function (k) { views[k].applyGroups(disabled); }); });
    Store.on("groupschanged", function () { Object.keys(views).forEach(function (k) { views[k].rebuild(); }); });
  }

  global.FrogDash = global.FrogDash || {};
  global.FrogDash.initPCA = init;
  global.FrogDash.pcaViews = views;
})(window);
