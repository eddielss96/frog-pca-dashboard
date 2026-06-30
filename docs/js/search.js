/* 物種搜尋：即時過濾，選取後高亮 + 開資訊視窗。 */
(function (global) {
  "use strict";
  var Store = global.FrogDash.Store;
  var input, list, items = [], active = -1, model = null;

  function buildIndex(m) {
    model = m;
    items = m.taxaOrder.map(function (sid) {
      var t = m.taxa[sid];
      var label = t[m.displayLabelCol] || sid;
      var hay = [label, sid, t.genus, t.species, t.family, t.clade]
        .filter(Boolean).join(" ").toLowerCase();
      return { sid: sid, label: label, sci: [t.genus, t.species].filter(Boolean).join(" "), hay: hay };
    });
  }

  function render(matches) {
    list.innerHTML = "";
    active = -1;
    if (!matches.length) { list.hidden = true; return; }
    matches.slice(0, 50).forEach(function (m, i) {
      var li = document.createElement("li");
      li.dataset.sid = m.sid;
      li.innerHTML = "<span>" + esc(m.label) + "</span>" +
        (m.sci && m.sci !== m.label ? " <span class='sci'>" + esc(m.sci) + "</span>" : "");
      li.addEventListener("mousedown", function (e) { e.preventDefault(); choose(m.sid); });
      li.addEventListener("mouseenter", function () { setActive(i); });
      list.appendChild(li);
    });
    list.hidden = false;
  }

  function setActive(i) {
    var lis = list.querySelectorAll("li");
    lis.forEach(function (li, j) { li.classList.toggle("active", j === i); });
    active = i;
  }

  function choose(sid) {
    input.value = "";
    list.hidden = true;
    Store.setHighlight([sid], "search");
    Store.focus(sid, "search");
  }

  function onInput() {
    var q = input.value.trim().toLowerCase();
    if (!q || !model) { list.hidden = true; return; }
    render(items.filter(function (it) { return it.hay.indexOf(q) >= 0; }));
  }

  function onKey(e) {
    if (list.hidden) return;
    var lis = list.querySelectorAll("li");
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(Math.min(active + 1, lis.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(Math.max(active - 1, 0)); }
    else if (e.key === "Enter") {
      if (active >= 0 && lis[active]) choose(lis[active].dataset.sid);
      else if (lis[0]) choose(lis[0].dataset.sid);
    } else if (e.key === "Escape") { list.hidden = true; }
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function init() {
    input = document.getElementById("search-input");
    list = document.getElementById("search-results");
    input.addEventListener("input", onInput);
    input.addEventListener("keydown", onKey);
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".search-wrap")) list.hidden = true;
    });
    Store.on("data", buildIndex);
  }

  global.FrogDash = global.FrogDash || {};
  global.FrogDash.initSearch = init;
})(window);
