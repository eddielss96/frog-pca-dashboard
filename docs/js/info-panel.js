/* 物種資訊視窗：click 點位後彈出。缺圖優雅降級為佔位圖。 */
(function (global) {
  "use strict";
  var Store = global.FrogDash.Store;

  var modal, imgWrap, img, nameEl, groupEl, table;

  function open(model, sid) {
    var t = model.taxa[sid];
    if (!t) return;
    nameEl.textContent = t[model.displayLabelCol] || sid;

    var g = Store.groupOf(sid);
    groupEl.innerHTML = g
      ? global.FrogDash.svgSymbol(g.symbol, g.color, 14) + "<span>" + g.label + "</span>"
      : "";

    // 圖片或佔位
    var url = model.imageURLs[sid];
    if (url) { imgWrap.classList.remove("placeholder"); img.src = url; img.alt = nameEl.textContent; }
    else { imgWrap.classList.add("placeholder"); img.removeAttribute("src"); img.alt = ""; }

    // 中介資料表（依 manifest 的 info_fields 有序顯示）
    var rows = "";
    rows += tr("species_id", sid);
    model.infoFields.forEach(function (f) {
      var v = t[f.column];
      if (v != null && v !== "") rows += tr(f.label, v);
    });
    table.innerHTML = rows;

    modal.hidden = false;
  }
  function tr(k, v) {
    return "<tr><td class='k'>" + esc(k) + "</td><td>" + esc(v) + "</td></tr>";
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function close() { modal.hidden = true; }

  function init() {
    modal = document.getElementById("info-modal");
    imgWrap = modal.querySelector(".info-image-wrap");
    img = document.getElementById("info-image");
    nameEl = document.getElementById("info-name");
    groupEl = document.getElementById("info-group");
    table = document.getElementById("info-table");

    modal.querySelectorAll("[data-close]").forEach(function (el) {
      el.addEventListener("click", close);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !modal.hidden) close();
    });
    Store.on("focus", function (p) {
      if (Store.data) open(Store.data, p.speciesId);
    });
  }

  global.FrogDash = global.FrogDash || {};
  global.FrogDash.initInfoPanel = init;
})(window);
