/* 建立精靈：讀取使用者 CSV/樹 → 建統一 Zip → 即時預覽 → 下載 / 打包成 Pages 網站。
   全程瀏覽器內完成，無伺服器。 */
(function (global) {
  "use strict";
  var FD = global.FrogDash, Store = FD.Store, UB = FD.UnifiedBuild;

  // 打包時要抓進成品的檢視器檔案（同源，Pages/http 皆可 fetch）
  var APP_FILES = [
    "index.html", "builder.html", "css/style.css",
    "vendor/jszip/jszip-3.10.1.min.js",
    "vendor/plotly/plotly-2.35.2.min.js",
    "vendor/phylocanvas/phylocanvas.gl-1.64.0.bundle.js",
    "js/state.js", "js/zip-loader.js", "js/unified-build.js", "js/legend.js",
    "js/pca-view.js", "js/tree-view.js", "js/info-panel.js", "js/search.js",
    "js/app.js", "js/builder.js"
  ];

  var lastZipBlob = null;
  var taxaText = null, taxaHeader = [];

  function readFileText(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
      r.readAsText(file);
    });
  }
  function el(id) { return document.getElementById(id); }
  function msg(text, kind) {
    var m = el("build-msg");
    m.className = "build-msg" + (kind ? " " + kind : "");
    m.innerHTML = text || "";
  }

  // ---- 視圖列 ----
  var viewSeq = 0;
  function addViewRow(label) {
    viewSeq++;
    var wrap = document.createElement("div");
    wrap.className = "view-row";
    wrap.innerHTML =
      '<input type="text" class="v-label" placeholder="視圖名稱（例：Tadpole PCA）" value="' + (label || "") + '" />' +
      '<label class="mini">分數 CSV <input type="file" class="v-scores" accept=".csv" /></label>' +
      '<label class="mini">variance（可選）<input type="file" class="v-var" accept=".csv" /></label>' +
      '<button class="btn small v-del" title="移除">✕</button>';
    wrap.querySelector(".v-del").addEventListener("click", function () { wrap.remove(); });
    el("views-list").appendChild(wrap);
  }

  // ---- 分類欄位對應 ----
  function guess(header, cands, fallbackIdx) {
    for (var i = 0; i < cands.length; i++) {
      var idx = header.findIndex(function (h) { return h.toLowerCase() === cands[i]; });
      if (idx >= 0) return header[idx];
    }
    return header[fallbackIdx] != null ? header[fallbackIdx] : header[0];
  }
  function fillSelect(sel, header, chosen, allowNone) {
    sel.innerHTML = "";
    if (allowNone) { var o = document.createElement("option"); o.value = ""; o.textContent = "（無）"; sel.appendChild(o); }
    header.forEach(function (h) {
      var o = document.createElement("option"); o.value = h; o.textContent = h;
      if (h === chosen) o.selected = true; sel.appendChild(o);
    });
  }
  function onTaxaFile(file) {
    readFileText(file).then(function (text) {
      taxaText = text;
      var rows = FD.parseCSV(text);
      taxaHeader = rows[0] || [];
      if (taxaHeader[0] === "" || taxaHeader[0] == null) taxaHeader[0] = "(第一欄)";
      fillSelect(el("m-id"), taxaHeader, guess(taxaHeader, ["species_id", "id", "gensp"], 0));
      fillSelect(el("m-label"), taxaHeader, guess(taxaHeader, ["display_label", "gensp", "name", "label"], 0));
      fillSelect(el("m-group"), taxaHeader, guess(taxaHeader, ["clade", "fam.subfam", "subfamily", "family", "group"], Math.min(1, taxaHeader.length - 1)));
      fillSelect(el("m-image"), taxaHeader, guess(taxaHeader, ["image", "img", "photo"], -1), true);
      // 資訊欄位複選
      var box = el("m-info"); box.innerHTML = "";
      taxaHeader.forEach(function (h) {
        var id = "info_" + h;
        var lab = document.createElement("label"); lab.className = "chip-pick";
        lab.innerHTML = '<input type="checkbox" value="' + h.replace(/"/g, "&quot;") + '" /> ' + h;
        box.appendChild(lab);
      });
      el("taxa-map").hidden = false;
    });
  }

  // ---- 收集輸入 ----
  function collectInputs() {
    if (!taxaText) throw uiErr("請先上傳分類 CSV");
    var rows = Array.prototype.slice.call(document.querySelectorAll("#views-list .view-row"));
    if (!rows.length) throw uiErr("請至少新增一個 PCA 視圖");

    var infoCols = Array.prototype.slice.call(document.querySelectorAll("#m-info input:checked"))
      .map(function (c) { return c.value; });

    var viewFilePromises = rows.map(function (r) {
      var label = r.querySelector(".v-label").value.trim();
      var sf = r.querySelector(".v-scores").files[0];
      var vf = r.querySelector(".v-var").files[0];
      if (!sf) throw uiErr("視圖「" + (label || "未命名") + "」尚未選擇分數 CSV");
      return Promise.all([readFileText(sf), vf ? readFileText(vf) : Promise.resolve(null)])
        .then(function (res) { return { label: label || sf.name.replace(/\.csv$/i, ""), scoresText: res[0], varianceText: res[1] }; });
    });

    var treeFile = el("f-tree").files[0];
    var treePromise = treeFile ? readFileText(treeFile) : Promise.resolve(null);

    return Promise.all([Promise.all(viewFilePromises), treePromise]).then(function (r) {
      return {
        dataset: {
          title: el("f-title").value.trim(), doi: el("f-doi").value.trim(),
          citation: el("f-cite").value.trim(), source_url: el("f-source").value.trim()
        },
        views: r[0],
        taxa: {
          text: taxaText, idCol: el("m-id").value, labelCol: el("m-label").value,
          groupCol: el("m-group").value, imageCol: el("m-image").value || null, infoCols: infoCols
        },
        tree: { newick: r[1] }
      };
    });
  }

  // ---- 建立 & 預覽 ----
  function buildBlob() {
    return collectInputs().then(function (inputs) {
      return UB.buildZipBlob(inputs);
    });
  }

  function preview() {
    msg("建立中…");
    buildBlob().then(function (out) {
      lastZipBlob = out.blob;
      return FD.Loader.fromBlob(out.blob).then(function (model) {
        Store.setData(model);
        el("preview-empty").hidden = true;
        el("dashboard").hidden = false;
        el("btn-zip").disabled = false;
        el("btn-package").disabled = false;
        setTimeout(function () { global.dispatchEvent(new Event("resize")); if (FD.TreeView) FD.TreeView.resize(); }, 60);
        var w = out.warnings.length
          ? '<div class="warn">⚠️ ' + out.warnings.length + ' 項提醒：<br>' + out.warnings.slice(0, 6).map(esc).join("<br>") + '</div>'
          : "";
        msg('<span class="ok">✔ 預覽已更新（' + model.joinReport.nTaxa + ' 物種）</span>' + w, "");
      });
    }).catch(function (e) {
      console.error(e);
      msg('<span class="err">✗ 建立失敗：' + esc(e.userFacing ? e.message : (e.message || e)) + "</span>", "");
    });
  }

  function downloadBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a"); a.href = url; a.download = name; a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function downloadZip() {
    if (lastZipBlob) downloadBlob(lastZipBlob, (slugTitle() || "dataset") + "_unified.zip");
  }

  // ---- 打包成 Pages 網站 ----
  function blobToBase64(blob) {
    return blob.arrayBuffer().then(function (buf) {
      var b = new Uint8Array(buf), CHUNK = 0x8000, s = "";
      for (var i = 0; i < b.length; i += CHUNK) s += String.fromCharCode.apply(null, b.subarray(i, i + CHUNK));
      return btoa(s);
    });
  }
  function packageSite() {
    if (!lastZipBlob) { msg('<span class="err">請先建立預覽</span>'); return; }
    msg("打包中…（抓取檢視器與函式庫）");
    var out = new JSZip();
    var fetches = APP_FILES.map(function (path) {
      return fetch(path).then(function (r) {
        if (!r.ok) throw new Error("抓取失敗：" + path + "（HTTP " + r.status + "）");
        return r.blob().then(function (b) { out.file(path, b); });
      });
    });
    Promise.all(fetches)
      .then(function () { return blobToBase64(lastZipBlob); })
      .then(function (b64) {
        out.file("data/baked.js",
          "/* 內嵌資料（統一 Zip，base64）：本站開啟即自動載入，觀看者不需再上傳。*/\n" +
          'window.FROG_BAKED_ZIP_BASE64="' + b64 + '";\n');
        out.file(".nojekyll", "");
        return out.generateAsync({ type: "blob", compression: "DEFLATE" });
      })
      .then(function (siteBlob) {
        var fname = (slugTitle() || "my-pca-dashboard") + "_site.zip";
        el("tut-filename").textContent = fname;
        downloadBlob(siteBlob, fname);
        el("tutorial-modal").hidden = false;
        msg('<span class="ok">✔ 已下載 ' + esc(fname) + '</span>');
      })
      .catch(function (e) { console.error(e); msg('<span class="err">打包失敗：' + esc(e.message || e) + "</span>"); });
  }

  function slugTitle() {
    return (el("f-title").value.trim() || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function uiErr(m) { var e = new Error(m); e.userFacing = true; return e; }

  function initPreviewControls() {
    document.addEventListener("click", function (e) {
      var dl = e.target.closest(".dl");
      if (dl) {
        var vid = dl.dataset.view;
        Plotly.downloadImage(el(vid + "-plot"), { format: "png", width: 1000, height: 800, filename: vid + "_pca" });
      }
    });
    var seg = el("tree-mode");
    if (seg) seg.addEventListener("click", function (e) {
      var b = e.target.closest(".seg-btn"); if (!b) return;
      seg.querySelectorAll(".seg-btn").forEach(function (x) { x.classList.toggle("active", x === b); });
      FD.TreeView.setMode(b.dataset.mode);
    });
    var fit = document.querySelector(".fit-tree"); if (fit) fit.addEventListener("click", function () { FD.TreeView.resize(); });
    var dlt = document.querySelector(".dl-tree"); if (dlt) dlt.addEventListener("click", function () { FD.TreeView.exportPNG(); });
    el("clear-btn").addEventListener("click", function () { Store.clearHighlight(); });
  }

  function main() {
    FD.initPCA(); FD.TreeView.init(); FD.initInfoPanel(); FD.initSearch();
    initPreviewControls();
    addViewRow("");
    el("add-view").addEventListener("click", function () { addViewRow(""); });
    el("f-taxa").addEventListener("change", function (e) { if (e.target.files[0]) onTaxaFile(e.target.files[0]); });
    el("btn-preview").addEventListener("click", preview);
    el("btn-zip").addEventListener("click", downloadZip);
    el("btn-package").addEventListener("click", packageSite);
    document.querySelectorAll("[data-close-tut]").forEach(function (x) {
      x.addEventListener("click", function () { el("tutorial-modal").hidden = true; });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", main);
  else main();
})(window);
