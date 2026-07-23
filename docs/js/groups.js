/* 分組模型：支援「切換分組欄位」(#5) 與「每個分類值自訂顏色/形狀」(#6)。
   顏色/形狀綁定在「(目前分組欄, 分類值)」上，切換欄位即載入該欄各自的設定，
   因此兩功能不衝突。自訂存在記憶體（本次瀏覽有效）。 */
(function (global) {
  "use strict";
  var Store = global.FrogDash.Store;

  var OKABE = ["#0072B2", "#E69F00", "#009E73", "#CC79A7", "#D55E00", "#56B4E9", "#F0E442", "#111111"];
  var SHAPES = ["circle", "square", "triangle-up", "diamond", "star", "cross", "triangle-down", "pentagon"];

  var G = {
    model: null,
    field: null,        // 目前分組欄位（taxa 欄名）
    candidates: [],     // 可用於分組的欄位
    _curated: {},       // 預設欄位的策展配色（來自 manifest.groups）
    _overrides: {},     // { field: { value: {color?, symbol?} } }

    init: function (model) {
      this.model = model;
      this._overrides = {};
      // 預設欄位的策展配色（manifest.groups）
      this._curated = {};
      var gm = model.groups || [];
      gm.forEach(function (m) { G._curated[m.value] = { color: m.color, symbol: m.symbol, label: m.label }; });
      this.defaultField = model.groupField || "clade";

      // 候選分組欄位：排除 id / 顯示名稱 / 圖片，且需為「類別型」（相異值不過多）
      var exclude = {};
      exclude[model.idCol] = 1; exclude[model.displayLabelCol] = 1; exclude[model.imageCol] = 1;
      if (model.outlineCol) exclude[model.outlineCol] = 1;
      if (model.imageCaptionCol) exclude[model.imageCaptionCol] = 1;
      var cols = Object.keys((model.taxa[model.taxaOrder[0]] || {}));
      var n = model.taxaOrder.length;
      this.candidates = cols.filter(function (c) {
        if (exclude[c]) return false;
        var vals = {}, nonEmpty = 0, numeric = 0;
        model.taxaOrder.forEach(function (sid) {
          var v = model.taxa[sid][c];
          if (v != null && v !== "") { vals[v] = 1; nonEmpty++; if (!isNaN(parseFloat(v)) && isFinite(v)) numeric++; }
        });
        var d = Object.keys(vals).length;
        // 純數值欄位（計數/年代/ID）不適合當分組著色；近乎唯一（>85% 相異）者也排除
        if (nonEmpty > 0 && numeric === nonEmpty) return false;
        if (d > Math.max(2, 0.85 * nonEmpty)) return false;
        return nonEmpty > 0 && d >= 1 && d <= Math.max(2, Math.min(40, n));
      });
      if (this.candidates.indexOf(this.defaultField) < 0 && this.candidates.length)
        this.defaultField = this.candidates[0];
      this.field = this.defaultField;
    },

    setField: function (f) {
      if (f === this.field) return;
      this.field = f;
      Store.disabledGroups = new Set();      // 欄位換了，重置隱藏狀態
      Store.emit("groupschanged", this.members());
    },

    distinctValues: function (f) {
      var seen = [], set = {}, model = this.model;
      model.taxaOrder.forEach(function (sid) {
        var v = model.taxa[sid][f];
        if (v == null || v === "") v = "（未分類）";
        if (!set[v]) { set[v] = 1; seen.push(v); }
      });
      return seen;
    },

    // 目前欄位的分組清單（含策展/自動配色 + 使用者覆寫）
    members: function () {
      var f = this.field, self = this;
      var ov = this._overrides[f] || {};
      return this.distinctValues(f).map(function (v, i) {
        var base = (f === self.defaultField && self._curated[v])
          ? self._curated[v]
          : { color: OKABE[i % OKABE.length], symbol: SHAPES[i % SHAPES.length], label: v };
        var o = ov[v] || {};
        return {
          value: v,
          label: base.label || v,
          color: o.color || base.color,
          symbol: o.symbol || base.symbol
        };
      });
    },

    memberMap: function () {
      var m = {};
      this.members().forEach(function (x) { m[x.value] = x; });
      return m;
    },

    styleOf: function (sid) {
      var v = (this.model.taxa[sid] || {})[this.field];
      if (v == null || v === "") v = "（未分類）";
      return this.memberMap()[v] || null;
    },
    valueOf: function (sid) {
      var v = (this.model.taxa[sid] || {})[this.field];
      return (v == null || v === "") ? "（未分類）" : v;
    },

    setOverride: function (value, patch) {
      var f = this.field;
      this._overrides[f] = this._overrides[f] || {};
      this._overrides[f][value] = Object.assign({}, this._overrides[f][value], patch);
      Store.emit("groupschanged", this.members());
    },
    resetOverrides: function () {
      delete this._overrides[this.field];
      Store.emit("groupschanged", this.members());
    },

    palette: OKABE, shapes: SHAPES
  };

  Store.on("data", function (model) { G.init(model); });

  global.FrogDash = global.FrogDash || {};
  global.FrogDash.Groups = G;
})(window);
