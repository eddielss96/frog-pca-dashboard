/* 主程式：整合各模組、處理載入（上傳 / 拖放 / 範例 / 烤入資料）、狀態與下載。 */
(function (global) {
  "use strict";
  var FD = global.FrogDash, Store = FD.Store;

  var statusEl, welcomeEl, dashboardEl;

  function setStatus(msg, kind) {
    if (!msg) { statusEl.hidden = true; statusEl.className = "status"; return; }
    statusEl.hidden = false;
    statusEl.className = "status " + (kind || "");
    statusEl.textContent = msg;
  }

  function showDashboard() {
    welcomeEl.hidden = true;
    dashboardEl.hidden = false;
    // Plotly 需在容器可見後重新計算尺寸
    setTimeout(function () {
      window.dispatchEvent(new Event("resize"));
      if (FD.TreeView) FD.TreeView.resize();
    }, 50);
  }

  function loadVia(promise, label) {
    setStatus((label || "載入中") + "…", "loading");
    return promise.then(function (model) {
      Store.setData(model);
      var subtitle = document.getElementById("dataset-subtitle");
      if (model.dataset.title) subtitle.textContent = model.dataset.title;
      var rep = model.joinReport;
      setStatus("已載入：" + rep.nTaxa + " 物種、" + model.viewOrder.length +
        " 個 PCA 視圖、" + rep.nTree + " 個樹葉（join key 一致 ✓）", "success");
      showDashboard();
      setTimeout(function () { setStatus(null); }, 4000);
    }).catch(function (e) {
      console.error(e);
      setStatus("載入失敗：" + (e.userFacing ? e.message : (e.message || e)), "error");
    });
  }

  function initLoaders() {
    document.getElementById("zip-input").addEventListener("change", function (e) {
      var f = e.target.files[0]; if (f) loadVia(FD.Loader.fromBlob(f), "讀取 " + f.name);
    });
    var demoBtn = document.getElementById("demo-btn");
    if (demoBtn) demoBtn.addEventListener("click", function () {
      loadVia(FD.Loader.fromUrl("data/frog_demo.zip"), "載入青蛙範例");
    });

    // 拖放
    var drop = welcomeEl;
    ["dragenter", "dragover"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("drag"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("drag"); });
    });
    drop.addEventListener("drop", function (e) {
      var f = e.dataTransfer.files[0];
      if (f && /\.zip$/i.test(f.name)) loadVia(FD.Loader.fromBlob(f), "讀取 " + f.name);
    });

    // 烤入資料（階段四）：若存在 data/baked.js 設定的全域，直接載入
    if (global.FROG_BAKED_ZIP_BASE64) {
      var bin = atob(global.FROG_BAKED_ZIP_BASE64);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      loadVia(FD.Loader.fromArrayBuffer(bytes.buffer), "載入內嵌資料");
    }
  }

  function initButtons() {
    document.getElementById("clear-btn").addEventListener("click", function () {
      Store.clearHighlight();
    });
    // PCA 面板為動態產生，用事件委派綁定下載
    document.addEventListener("click", function (e) {
      var btn = e.target.closest(".dl"); if (!btn) return;
      var vid = btn.dataset.view;
      Plotly.downloadImage(document.getElementById(vid + "-plot"), {
        format: "png", width: 1000, height: 800, filename: vid + "_pca"
      });
    });
    var dlTree = document.querySelector(".dl-tree");
    if (dlTree) dlTree.addEventListener("click", function () { FD.TreeView.exportPNG(); });
    var fitTree = document.querySelector(".fit-tree");
    if (fitTree) fitTree.addEventListener("click", function () { FD.TreeView.resize(); });
    var modeSeg = document.getElementById("tree-mode");
    if (modeSeg) modeSeg.addEventListener("click", function (e) {
      var btn = e.target.closest(".seg-btn"); if (!btn) return;
      modeSeg.querySelectorAll(".seg-btn").forEach(function (b) { b.classList.toggle("active", b === btn); });
      FD.TreeView.setMode(btn.dataset.mode);
    });
  }

  function main() {
    statusEl = document.getElementById("status");
    welcomeEl = document.getElementById("welcome");
    dashboardEl = document.getElementById("dashboard");

    FD.initPCA();
    FD.TreeView.init();
    FD.initInfoPanel();
    FD.initSearch();
    initLoaders();
    initButtons();
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", main);
  else main();
})(window);
