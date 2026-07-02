/* PCA 散佈圖（Plotly）：分群著色＋形狀、軸切換、scree、hover 輕提示、
   click 開資訊視窗、跨視圖連動高亮。 */
(function (global) {
  "use strict";
  var Store = global.FrogDash.Store;

  function PCAView(opts) {
    this.viewId = opts.viewId;
    this.plotEl = document.getElementById(opts.plotId);
    this.screeEl = document.getElementById(opts.screeId);
    this.xSel = document.getElementById(opts.xId);
    this.ySel = document.getElementById(opts.yId);
    this.titleEl = document.getElementById(opts.titleId);
    this.view = null;
    this.traces = [];           // 每群一條 trace
    this.groupOfTrace = [];      // trace index -> group value
    var self = this;
    this.xSel.addEventListener("change", function () { self.draw(); });
    this.ySel.addEventListener("change", function () { self.draw(); });
  }

  PCAView.prototype.setData = function (model) {
    this.model = model;
    this.view = model.views[this.viewId];
    if (!this.view) return;
    this.titleEl.textContent = this.view.label;
    // 軸選單
    var pcs = this.view.pcs, self = this;
    [this.xSel, this.ySel].forEach(function (sel) {
      sel.innerHTML = "";
      pcs.forEach(function (p) {
        var pct = self.view.varianceExplained[p];
        var opt = document.createElement("option");
        opt.value = p;
        opt.textContent = p + (pct != null ? " (" + (pct * 100).toFixed(1) + "%)" : "");
        sel.appendChild(opt);
      });
    });
    this.xSel.value = this.view.defaultAxes[0] || pcs[0];
    this.ySel.value = this.view.defaultAxes[1] || pcs[1] || pcs[0];
    this.buildTraces();
    this.draw();
    this.drawScree();
  };

  PCAView.prototype.buildTraces = function () {
    var model = this.model, view = this.view;
    var groups = model.groups.slice();
    // 未列入 groups 的物種歸到「其他」
    var byGroup = {};
    groups.forEach(function (g) { byGroup[g.value] = { g: g, ids: [] }; });
    var others = { g: { value: "__other__", label: "其他", color: "#888888", symbol: "circle" }, ids: [] };
    view.ids.forEach(function (sid) {
      var gv = (model.taxa[sid] || {})[model.groupField];
      if (byGroup[gv]) byGroup[gv].ids.push(sid);
      else others.ids.push(sid);
    });
    var order = groups.map(function (g) { return byGroup[g.value]; });
    if (others.ids.length) order.push(others);

    this.traces = [];
    this.groupOfTrace = [];
    this.speciesIndexInTrace = {}; // species_id -> {trace, idx}
    var self = this;
    order.forEach(function (entry, ti) {
      entry.ids.forEach(function (sid, idx) {
        self.speciesIndexInTrace[sid] = { trace: ti, idx: idx };
      });
      self.traces.push({
        type: "scattergl",
        mode: "markers",
        name: entry.g.label,
        ids: entry.ids,
        customdata: entry.ids,
        text: entry.ids.map(function (sid) {
          return (model.taxa[sid] || {})[model.displayLabelCol] || sid;
        }),
        hovertemplate: "%{text}<extra></extra>",
        marker: {
          color: entry.g.color, symbol: entry.g.symbol, size: 9,
          line: { color: "#33404d", width: 0.6 }, opacity: 0.95
        },
        selected: { marker: { size: 15, opacity: 1 } },
        unselected: { marker: { opacity: 0.12 } },
        x: [], y: []
      });
      self.groupOfTrace.push(entry.g.value);
    });
  };

  PCAView.prototype.draw = function () {
    if (!this.view) return;
    var px = this.xSel.value, py = this.ySel.value, model = this.model, view = this.view;
    this.traces.forEach(function (tr) {
      tr.x = tr.ids.map(function (sid) { return view.scores[sid][px]; });
      tr.y = tr.ids.map(function (sid) { return view.scores[sid][py]; });
    });
    var layout = {
      margin: { l: 44, r: 10, t: 8, b: 38 },
      xaxis: { title: { text: axisTitle(view, px), font: { size: 11 } }, zeroline: true, zerolinecolor: "#e2e6eb" },
      yaxis: { title: { text: axisTitle(view, py), font: { size: 11 } }, scaleanchor: "x", scaleratio: 1, zeroline: true, zerolinecolor: "#e2e6eb" },
      showlegend: false, hovermode: "closest", dragmode: "pan",
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)"
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
      }
      self.applyHighlight(Store.highlight);
      self.applyGroups(Store.disabledGroups);
    });
  };

  PCAView.prototype.drawScree = function () {
    var view = this.view, n = Math.min(view.variance.length, 12);
    var xs = [], ys = [];
    for (var i = 0; i < n; i++) { xs.push("PC" + (i + 1)); ys.push(view.variance[i] * 100); }
    var cur = [this.xSel.value, this.ySel.value];
    var colors = xs.map(function (p) { return cur.indexOf(p) >= 0 ? "#0072B2" : "#c2ccd6"; });
    Plotly.react(this.screeEl, [{
      type: "bar", x: xs, y: ys, marker: { color: colors },
      hovertemplate: "%{x}: %{y:.1f}%<extra></extra>"
    }], {
      margin: { l: 30, r: 6, t: 4, b: 18 }, height: 84,
      xaxis: { tickfont: { size: 8 } }, yaxis: { tickfont: { size: 8 }, ticksuffix: "%" },
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)"
    }, { displayModeBar: false, responsive: true, staticPlot: true });
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
    var vis = this.groupOfTrace.map(function (gv) {
      return disabled.has(gv) ? "legendonly" : true; // 用 visible:false 隱藏
    }).map(function (v) { return v === "legendonly" ? false : true; });
    Plotly.restyle(this.plotEl, { visible: vis });
  };

  function axisTitle(view, pc) {
    return view.axisLabels[pc] || pc;
  }

  // 依 manifest 動態建立每個視圖的面板 DOM
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
      '<div id="' + vid + '-plot" class="plot"></div>' +
      '<div class="scree-wrap"><span class="scree-label">各 PC 變異解釋</span><div id="' + vid + '-scree" class="scree"></div></div>';
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
      // 視圖數量 1~2 個並排；更多則自動換行（CSS grid 已處理）
      row.style.gridTemplateColumns = model.viewOrder.length === 1 ? "1fr" : "1fr 1fr";
      model.viewOrder.forEach(function (vid) {
        buildPanel(row, model.views[vid]);
      });
      model.viewOrder.forEach(function (vid) {
        views[vid] = new PCAView({ viewId: vid, plotId: vid + "-plot", screeId: vid + "-scree",
                                   xId: vid + "-x", yId: vid + "-y", titleId: vid + "-title" });
        views[vid].setData(model);
      });
      global.FrogDash.pcaViews = views;
    });
    Store.on("highlight", function (p) {
      Object.keys(views).forEach(function (k) { views[k].applyHighlight(p.ids); });
    });
    Store.on("groups", function (disabled) {
      Object.keys(views).forEach(function (k) { views[k].applyGroups(disabled); });
    });
  }

  global.FrogDash = global.FrogDash || {};
  global.FrogDash.initPCA = init;
  global.FrogDash.pcaViews = views;
})(window);
