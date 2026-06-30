/* 全域命名空間與中央狀態（發布訂閱）。三個視圖透過它連動。 */
(function (global) {
  "use strict";

  function Emitter() { this._h = {}; }
  Emitter.prototype.on = function (evt, fn) {
    (this._h[evt] = this._h[evt] || []).push(fn); return this;
  };
  Emitter.prototype.emit = function (evt, payload) {
    (this._h[evt] || []).forEach(function (fn) {
      try { fn(payload); } catch (e) { console.error("[listener]", evt, e); }
    });
  };

  var Store = new Emitter();

  // 載入後的資料模型（由 zip-loader 填入）
  Store.data = null;

  // 目前高亮的物種集合（連動核心）
  Store.highlight = new Set();
  Store.highlightSource = null;   // 觸發來源：'tadpole' | 'adult' | 'tree' | 'search'

  Store.setData = function (model) {
    this.data = model;
    this.highlight = new Set();
    this.highlightSource = null;
    this.emit("data", model);
  };

  /**
   * 設定高亮物種集合並通知所有視圖。
   * @param {Iterable<string>} ids  species_id 清單
   * @param {string} source  觸發來源（避免來源視圖重複套用）
   */
  Store.setHighlight = function (ids, source) {
    this.highlight = new Set(ids);
    this.highlightSource = source || null;
    this.emit("highlight", { ids: this.highlight, source: this.highlightSource });
  };

  Store.clearHighlight = function () {
    this.highlight = new Set();
    this.highlightSource = null;
    this.emit("highlight", { ids: this.highlight, source: null });
  };

  // 點擊某點 → 開資訊視窗（單一物種聚焦）
  Store.focus = function (speciesId, source) {
    this.emit("focus", { speciesId: speciesId, source: source || null });
  };

  // 工具：取得某物種所屬群組成員（color/symbol/label）
  Store.groupOf = function (speciesId) {
    if (!this.data) return null;
    var clade = (this.data.taxa[speciesId] || {})[this.data.groupField];
    return this.data.groupByValue[clade] || null;
  };

  global.FrogDash = { Store: Store, Emitter: Emitter };
})(window);
