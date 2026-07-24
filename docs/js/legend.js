/* 圖例＋分組控制：切換分組欄位 (#5)、色盲友善圖例、顏色/形狀自訂設定選單 (#6)。 */
(function (global) {
  "use strict";
  var Store = global.FrogDash.Store, Groups = global.FrogDash.Groups;

  // 群組顯示開關
  Store.disabledGroups = new Set();
  Store.toggleGroup = function (value) {
    if (this.disabledGroups.has(value)) this.disabledGroups.delete(value);
    else this.disabledGroups.add(value);
    this.emit("groups", this.disabledGroups);
  };

  // 依 plotly 符號名畫 SVG（圖例/資訊卡共用）
  function svgSymbol(symbol, color, size) {
    size = size || 18; var c = size / 2, r = size * 0.38, s = "";
    function poly(pts) { return '<polygon points="' + pts + '" fill="' + color + '"/>'; }
    switch (symbol) {
      case "square": s = '<rect x="' + (c - r) + '" y="' + (c - r) + '" width="' + (2 * r) + '" height="' + (2 * r) + '" fill="' + color + '"/>'; break;
      case "diamond": s = poly([c + "," + (c - r), (c + r) + "," + c, c + "," + (c + r), (c - r) + "," + c].join(" ")); break;
      case "triangle-up": s = poly([c + "," + (c - r), (c + r) + "," + (c + r), (c - r) + "," + (c + r)].join(" ")); break;
      case "triangle-down": s = poly([(c - r) + "," + (c - r), (c + r) + "," + (c - r), c + "," + (c + r)].join(" ")); break;
      case "cross": s = '<path d="M' + (c - r) + ' ' + (c - r * .35) + 'h' + (r * .65) + 'v' + (-r * .65) + 'h' + (r * .7) + 'v' + (r * .65) + 'h' + (r * .65) + 'v' + (r * .7) + 'h' + (-r * .65) + 'v' + (r * .65) + 'h' + (-r * .7) + 'v' + (-r * .65) + 'h' + (-r * .65) + 'z" fill="' + color + '"/>'; break;
      case "pentagon": { var p = []; for (var k = 0; k < 5; k++) { var a = Math.PI / 2.5 * k - Math.PI / 2; p.push((c + r * Math.cos(a)).toFixed(1) + "," + (c + r * Math.sin(a)).toFixed(1)); } s = poly(p.join(" ")); break; }
      case "star": { var pts = []; for (var i = 0; i < 10; i++) { var rad = (i % 2 === 0) ? r : r * 0.45; var an = Math.PI / 5 * i - Math.PI / 2; pts.push((c + rad * Math.cos(an)).toFixed(1) + "," + (c + rad * Math.sin(an)).toFixed(1)); } s = poly(pts.join(" ")); break; }
      default: s = '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="' + color + '"/>';
    }
    return '<svg class="swatch" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '">' + s + '</svg>';
  }

  function counts(model) {
    var c = {}; model.taxaOrder.forEach(function (sid) { var v = Groups.valueOf(sid); c[v] = (c[v] || 0) + 1; }); return c;
  }

  function renderChips(model) {
    var ul = document.getElementById("legend"); ul.innerHTML = "";
    var cnt = counts(model);
    Groups.members().forEach(function (g) {
      var li = document.createElement("li");
      li.dataset.value = g.value;
      li.title = "點選切換顯示／隱藏：" + g.label;
      li.innerHTML = svgSymbol(g.symbol, g.color, 15) + '<span class="lbl">' + g.label + '</span><span class="cnt">' + (cnt[g.value] || 0) + '</span>';
      li.classList.toggle("off", Store.disabledGroups.has(g.value));
      li.addEventListener("click", function () {
        Store.toggleGroup(g.value); li.classList.toggle("off", Store.disabledGroups.has(g.value));
      });
      ul.appendChild(li);
    });
  }

  function renderSettings() {
    var box = document.getElementById("group-settings"); if (!box) return;
    var list = box.querySelector(".gs-list"); list.innerHTML = "";
    Groups.members().forEach(function (g) {
      var row = document.createElement("div"); row.className = "gs-row";
      var shapes = Groups.shapes.map(function (s) {
        return '<option value="' + s + '"' + (s === g.symbol ? " selected" : "") + '>' + s + '</option>';
      }).join("");
      row.innerHTML = '<span class="gs-name">' + g.label + '</span>' +
        '<input type="color" class="gs-color" value="' + toHex(g.color) + '" />' +
        '<select class="gs-shape">' + shapes + '</select>';
      row.querySelector(".gs-color").addEventListener("input", function (e) { Groups.setOverride(g.value, { color: e.target.value }); });
      row.querySelector(".gs-shape").addEventListener("change", function (e) { Groups.setOverride(g.value, { symbol: e.target.value }); });
      list.appendChild(row);
    });
  }
  function toHex(c) {
    if (/^#[0-9a-f]{6}$/i.test(c)) return c;
    var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c);
    if (m) return "#" + [1, 2, 3].map(function (i) { return ("0" + (+m[i]).toString(16)).slice(-2); }).join("");
    return "#888888";
  }

  function renderMeta(model) {
    var d = model.dataset, meta = document.getElementById("dataset-meta");
    if (!meta) return;
    var bits = [];
    if (d.doi) bits.push('DOI <a href="https://doi.org/' + d.doi + '" target="_blank" rel="noopener">' + d.doi + '</a>');
    var T = function (k, p) { return global.FrogDash.t ? global.FrogDash.t(k, p) : k; };
    if (d.source_url) bits.push('<a href="' + d.source_url + '" target="_blank" rel="noopener">' + T("meta.source") + '</a>');
    if (d.created_with) bits.push(T("meta.madeWith", { w: d.created_with }));
    meta.innerHTML = '<div class="row">' + bits.join(" · ") + '</div>' + (d.citation ? '<span class="cite">' + d.citation + '</span>' : "");
  }

  function renderAll() {
    if (!Store.data) return;
    var fs = document.getElementById("group-field");
    if (fs && fs.value !== Groups.field) fs.value = Groups.field;
    renderChips(Store.data); renderSettings();
  }

  function render(model) {
    var fieldSel = document.getElementById("group-field");
    if (fieldSel) {
      fieldSel.innerHTML = "";
      Groups.candidates.forEach(function (c) {
        var o = document.createElement("option"); o.value = c; o.textContent = c;
        if (c === Groups.field) o.selected = true; fieldSel.appendChild(o);
      });
    }
    renderChips(model); renderSettings(); renderMeta(model);
  }

  Store.on("data", function (model) {
    render(model);
    var fieldSel = document.getElementById("group-field");
    if (fieldSel && !fieldSel._bound) {
      fieldSel._bound = true;
      fieldSel.addEventListener("change", function () { Groups.setField(fieldSel.value); });
    }
    var btn = document.getElementById("group-settings-btn"), box = document.getElementById("group-settings");
    if (btn && box && !btn._bound) {
      btn._bound = true;
      btn.addEventListener("click", function () { box.hidden = !box.hidden; });
      var reset = box.querySelector(".gs-reset");
      if (reset) reset.addEventListener("click", function () { Groups.resetOverrides(); });
    }
  });
  Store.on("groupschanged", renderAll);

  global.FrogDash = global.FrogDash || {};
  global.FrogDash.svgSymbol = svgSymbol;
  global.FrogDash.Legend = { rerender: function () { if (Store.data) render(Store.data); } };  // 語言切換時重繪圖例/來源
})(window);
