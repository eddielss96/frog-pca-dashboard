/* 親緣樹（phylocanvas.gl，WebGL）。點葉=高亮該物種；點內部分支=高亮整個 clade。
   非 WebGL 環境顯示 fallback 提示，PCA 仍可用。 */
(function (global) {
  "use strict";
  var Store = global.FrogDash.Store;

  function hasWebGL() {
    try {
      var c = document.createElement("canvas");
      return !!(global.WebGLRenderingContext &&
        (c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) { return false; }
  }

  var TreeView = {
    tree: null, el: null, host: null, model: null,
    nodeIdByTip: {}, // tip_label -> phylocanvas node id
    supported: true,
    _suppress: false,
    mode: "clado",          // "clado"=等距（忽略分支長度，鋪滿全寬）| "phylo"=依分支長度
    sourcePhylo: null, sourceClado: null,

    init: function () {
      this.el = document.getElementById("tree-view");
      this.host = this.el.parentElement; // .tree-host：CSS 控尺寸、不被 phylocanvas 釘住
      this.fallbackEl = document.getElementById("tree-fallback");
      this.supported = hasWebGL() && global.PhylocanvasModule && global.PhylocanvasModule.PhylocanvasGL;
      var self = this;
      Store.on("data", function (m) { self.setData(m); });
      Store.on("highlight", function (p) {
        if (p.source === "tree") return; // 來源是自己就不重複套用
        self.applyHighlight(p.ids);
      });
      if (this.supported) {
        if (global.ResizeObserver) {
          this._ro = new ResizeObserver(function () { self.resize(); });
        }
        // 視窗縮放時自動重新貼合（debounce）
        global.addEventListener("resize", function () {
          clearTimeout(self._wt); self._wt = setTimeout(function () { self.resize(); }, 120);
        });
      }
    },

    // 切換「等距 / 分支長度」並重新貼合
    setMode: function (mode) {
      if (mode === this.mode || !this.tree) { this.mode = mode; return; }
      this.mode = mode;
      var src = (mode === "phylo") ? this.sourcePhylo : this.sourceClado;
      var self = this;
      try { this.tree.setProps({ source: src }); } catch (e) { return this.build(); }
      // 來源改變後重建映射/著色、重新貼合、復原目前高亮
      this.buildMapsAndStyles();
      requestAnimationFrame(function () { self.resize(); self.applyHighlight(Store.highlight); });
      setTimeout(function () { self.resize(); }, 120);
    },

    setData: function (model) {
      this.model = model;
      var panel = this.host && this.host.closest(".tree-panel");
      // 沒有樹的純 PCA 資料集：整個樹面板隱藏
      if (!model.hasTree || !model.treeNewick) {
        if (panel) panel.hidden = true;
        if (this.tree) { try { this.tree.destroy(); } catch (e) {} this.tree = null; }
        return;
      }
      if (panel) panel.hidden = false;
      if (!this.supported) {
        this.el.hidden = true;
        this.fallbackEl.hidden = false;
        return;
      }
      this.fallbackEl.hidden = true;
      this.el.hidden = false;
      this.sourcePhylo = model.treeNewick;
      this.sourceClado = buildAlignedCladogram(model.treeNewick); // 對齊型 cladogram
      try {
        this.build();
      } catch (e) {
        console.error("親緣樹建構失敗，改用 fallback：", e);
        this.tree = null;
        this.el.hidden = true;
        this.fallbackEl.hidden = false;
      }
    },

    build: function () {
      var PhylocanvasGL = global.PhylocanvasModule.PhylocanvasGL;
      var TreeTypes = global.PhylocanvasModule.TreeTypes || {};
      if (this.tree) { try { this.tree.destroy(); } catch (e) {} this.tree = null; }
      this.el.innerHTML = "";
      var rect = this.host.getBoundingClientRect();
      var size = { width: Math.max(280, Math.round(rect.width) || 280),
                   height: Math.max(420, Math.round(rect.height) || 480) };

      var self = this, model = this.model;
      var source = (this.mode === "phylo") ? this.sourcePhylo : this.sourceClado;
      this.tree = new PhylocanvasGL(this.el, {
        source: source || model.treeNewick,
        size: size,
        type: TreeTypes.Rectangular || "rc",
        showLabels: false,
        showLeafLabels: false,
        interactive: true,
        nodeSize: 7,
        highlightColour: [255, 165, 0, 255],
        padding: 12
      });

      // 建立 tip_label -> node id 映射，並依群組著色
      this.buildMapsAndStyles();

      // 包裝 selectNode 取得點擊節點（phylocanvas 本身無 click callback）
      var origSelect = this.tree.selectNode.bind(this.tree);
      this.tree.selectNode = function (node, append) {
        try { origSelect(node, append); } catch (e) {}
        if (!self._suppress) self.onPick(node);
      };

      if (this._ro) { try { this._ro.disconnect(); this._ro.observe(this.host); } catch (e) {} }
      // 待容器尺寸穩定後填滿畫面（避免只佔左側一小塊 / 上下被裁切）
      requestAnimationFrame(function () { self.resize(); self.applyHighlight(Store.highlight); });
      setTimeout(function () { self.resize(); }, 120);
    },

    // 讓整棵樹縮放到剛好填滿容器
    fit: function () {
      if (!this.tree) return;
      try { this.tree.fitInCanvas(); } catch (e) { /* 某些版本可能無此方法 */ }
    },

    buildMapsAndStyles: function () {
      this.nodeIdByTip = {};
      var styles = {}, model = this.model, self = this;
      var nodes = this.allNodes();
      nodes.forEach(function (node) {
        if (node.isLeaf) {
          var tip = node.label != null ? node.label : node.id;
          self.nodeIdByTip[tip] = node.id;
          var sid = model.tipToSpecies[tip] || tip;
          var g = self.groupOf(sid);
          if (g) styles[node.id] = { fillColour: hexToRgba(g.color), shape: mapShape(g.symbol) };
        }
      });
      try { this.tree.setProps({ styles: styles }); } catch (e) {}
    },

    allNodes: function () {
      // 取得 layout 後的所有節點（相容不同回傳形態）
      var g;
      try { g = this.tree.getGraphAfterLayout(); } catch (e) { g = null; }
      if (!g) return [];
      if (Array.isArray(g.preorderTraversal)) return g.preorderTraversal;
      if (Array.isArray(g)) return g;
      if (g.nodeById) return Object.keys(g.nodeById).map(function (k) { return g.nodeById[k]; });
      // 後備：自行前序走訪
      var out = [];
      (function walk(n) { if (!n) return; out.push(n); (n.children || []).forEach(walk); })(g.root || g);
      return out;
    },

    groupOf: function (sid) {
      var clade = (this.model.taxa[sid] || {})[this.model.groupField];
      return this.model.groupByValue[clade] || null;
    },

    onPick: function (picked) {
      if (!picked) { Store.clearHighlight(); return; }
      var full = picked;
      try { if (picked.id != null) full = this.tree.findNodeById(picked.id) || picked; } catch (e) {}
      var leaves = collectLeaves(full);
      var model = this.model;
      var species = leaves.map(function (l) {
        var tip = l.label != null ? l.label : l.id;
        return model.tipToSpecies[tip] || tip;
      }).filter(Boolean);
      if (!species.length) return;
      if (species.length === 1) Store.focus(species[0], "tree");
      Store.setHighlight(species, "tree");
    },

    applyHighlight: function (idSet) {
      if (!this.tree) return;
      var ids = [], model = this.model, self = this;
      (idSet || new Set()).forEach(function (sid) {
        var tip = model.speciesToTip[sid] || sid;
        var nid = self.nodeIdByTip[tip];
        if (nid != null) ids.push(nid);
      });
      this._suppress = true;
      try { this.tree.setProps({ selectedIds: ids }); } catch (e) {}
      this._suppress = false;
    },

    resize: function () {
      if (!this.tree) return;
      var rect = this.host.getBoundingClientRect();  // 量 host，避免量到被釘住的 #tree-view
      if (rect.width < 10 || rect.height < 10) return;
      try { this.tree.setProps({ size: { width: Math.round(rect.width), height: Math.round(rect.height) } }); }
      catch (e) { try { this.tree.resize(rect.width, rect.height); } catch (e2) {} }
      this.fit();
    },

    exportPNG: function () {
      if (!this.tree) return;
      try {
        var blob = this.tree.exportPNG();
        var url = (blob instanceof Blob) ? URL.createObjectURL(blob) : blob;
        var a = document.createElement("a");
        a.href = url; a.download = "tree.png"; a.click();
        if (blob instanceof Blob) setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      } catch (e) { console.warn("樹 PNG 匯出失敗", e); }
    }
  };

  // --- Newick 解析／重寫：產生「對齊型 cladogram」 ---
  // 依節點階層（rank）重算分支長度，使所有 tips 對齊右緣、層級均勻分佈，
  // 讓整棵樹填滿成方正區塊，比原始長短枝更好辨認。
  function parseNewick(str) {
    var s = str.trim().replace(/;\s*$/, ""), pos = 0;
    function node() {
      var n = { children: [], name: "", length: null };
      if (s[pos] === "(") {
        pos++;
        for (;;) {
          n.children.push(node());
          if (s[pos] === ",") { pos++; continue; }
          break;
        }
        if (s[pos] === ")") pos++;
      }
      var nm = "";
      while (pos < s.length && ":,()".indexOf(s[pos]) < 0) nm += s[pos++];
      n.name = nm;
      if (s[pos] === ":") {
        pos++; var num = "";
        while (pos < s.length && ",()".indexOf(s[pos]) < 0) num += s[pos++];
        n.length = parseFloat(num);
      }
      return n;
    }
    return node();
  }
  function rankHeight(n) {
    if (!n.children.length) { n._h = 0; return 0; }
    var mx = 0;
    n.children.forEach(function (c) { mx = Math.max(mx, rankHeight(c)); });
    n._h = mx + 1; return n._h;
  }
  function serializeAligned(n, parentH) {
    var s = "";
    if (n.children.length)
      s += "(" + n.children.map(function (c) { return serializeAligned(c, n._h); }).join(",") + ")";
    s += n.name;
    if (parentH != null) s += ":" + (parentH - n._h); // 分支長度 = 父階層 − 本階層（>0）
    return s;
  }
  function buildAlignedCladogram(nwk) {
    try {
      var root = parseNewick(nwk);
      rankHeight(root);
      return serializeAligned(root, null) + ";";
    } catch (e) {
      return nwk.replace(/:[-+0-9.eE]+/g, ""); // 後備：至少移除分支長度
    }
  }

  function collectLeaves(node) {
    if (!node) return [];
    if (node.isLeaf) return [node];
    if (Array.isArray(node.visibleLeaves) && node.visibleLeaves.length) return node.visibleLeaves;
    var out = [];
    (function walk(n) {
      if (!n) return;
      if (n.isLeaf) { out.push(n); return; }
      (n.children || []).forEach(walk);
    })(node);
    return out;
  }

  function hexToRgba(hex) {
    var h = hex.replace("#", "");
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16), 255];
  }
  function mapShape(symbol) {
    var Shapes = (global.PhylocanvasModule && global.PhylocanvasModule.Shapes) || {};
    switch (symbol) {
      case "square": return Shapes.Square || "square";
      case "diamond": return Shapes.Diamond || "diamond";
      case "triangle-up": return Shapes.Triangle || "triangle";
      case "star": return Shapes.Star || "star";
      default: return Shapes.Dot || Shapes.Circle || "circle";
    }
  }

  global.FrogDash = global.FrogDash || {};
  global.FrogDash.TreeView = TreeView;
})(window);
