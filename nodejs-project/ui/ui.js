/* ===== fx.js ===== */
// Hiệu ứng + Cài đặt giao diện (không đụng tới logic bot).
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(id) {
    return document.getElementById(id);
  } // ---------- Lưu thiết lập (an toàn khi storage bị chặn) ----------
  var KEY = "botafk.fx";
  var st = {
    liquid: false,
    amt: 45,
    anim: false
  };
  try {
    var raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (raw) {
      st.liquid = !!raw.liquid;
      st.amt = Number(raw.amt) || 45;
      st.anim = raw.anim === true && !reduce;
    }
  } catch (_) {}
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(st));
    } catch (_) {}
  }
  var toastEl;
  var toastTimer;
  window.addEventListener("fx-toast", function (e) {
    toast(e.detail);
  });
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "fx-toast";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("show");
    }, 3800);
  }

  // ---------- Áp dụng thiết lập ----------
  function applyAnim() {
    root.classList.toggle("no-anim", !st.anim);
  }
  function applyAmt() {
    root.style.setProperty("--liq-pct", st.amt + "%");
    var v = $("fx-liquid-val");
    if (v) {
      v.textContent = st.amt + "%";
    }
  }
  function sendMain(obj) {
    try {
      console.log("@@FX@@" + JSON.stringify(obj));
    } catch (_) {}
  }
  function setLiquidClass(on, lite) {
    root.classList.toggle("liquid", on && !lite);
    root.classList.toggle("liquid-lite", on && !!lite);
    var row = $("fx-liquid-row");
    if (row) {
      row.classList.toggle("hidden", !on);
    }
  }

  // Main process trả kết quả (có hỗ trợ Windows 11 hay không)
  window.addEventListener("fx-liquid", function (e) {
    var d = e.detail || {};
    setLiquidClass(!!d.on, !!d.lite);
    var cb = $("fx-liquid");
    if (cb) {
      cb.checked = !!d.on;
    }
    st.liquid = !!d.on;
    save();
    if (d.msg) {
      toast(d.msg);
    }
  });
  function init() {
    applyAnim();
    applyAmt();
    var cbA = $("fx-anim");
    var cbL = $("fx-liquid");
    var amt = $("fx-liquid-amt");
    if (cbA) {
      cbA.checked = st.anim;
      cbA.addEventListener("change", function () {
        st.anim = cbA.checked;
        save();
        applyAnim();
        if (st.anim) {
          startLoop();
        }
      });
    }
    if (amt) {
      amt.value = st.amt;
      amt.addEventListener("input", function () {
        st.amt = Number(amt.value);
        applyAmt();
      });
      amt.addEventListener("change", save);
    }
    if (cbL) {
      cbL.checked = st.liquid;
      cbL.addEventListener("change", function () {
        if (cbL.checked) {
          sendMain({
            t: "liquid",
            on: true
          }); // chờ main xác nhận rồi mới đổi giao diện
        } else {
          setLiquidClass(false);
          st.liquid = false;
          save();
          sendMain({
            t: "liquid",
            on: false
          });
        }
      });
    }
    if (st.liquid) {
      sendMain({
        t: "liquid",
        on: true
      });
    }

    // Mở / đóng Cài đặt
    var modal = $("settings-modal");
    function open() {
      if (modal) {
        modal.classList.remove("hidden");
      }
    }
    function close() {
      if (modal) {
        modal.classList.add("hidden");
      }
    }
    var gear = $("btn-settings");
    if (gear) {
      gear.addEventListener("click", open);
    }
    if (modal) {
      modal.addEventListener("mousedown", function (e) {
        if (e.target === modal) {
          close();
        }
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modal && !modal.classList.contains("hidden")) {
        close();
      }
    });
    var theme = $("btn-theme");
    if (theme) {
      theme.addEventListener("click", close);
    } // app.js tự mở hộp thoại Giao diện
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // ---------- Hạt nổi (nhẹ: 30fps, tự dừng khi ẩn / mất focus / mở hộp thoại / Liquid) ----------
  var cv = $("fx-bg");
  var ctx = cv && cv.getContext("2d");
  var W = 0;
  var H = 0;
  var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  var pts = [];
  var mouse = {
    x: -999,
    y: -999
  };
  var color = "110,168,255";
  var frame = 0;
  var running = false;
  var last = 0;
  var lite = (navigator.hardwareConcurrency || 4) <= 4;
  function parse(c) {
    c = (c || "").trim();
    var m = c.match(/^#([0-9a-f]{6})$/i);
    if (m) {
      return parseInt(m[1].slice(0, 2), 16) + "," + parseInt(m[1].slice(2, 4), 16) + "," + parseInt(m[1].slice(4, 6), 16);
    }
    m = c.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
    if (m) {
      return m[1] + "," + m[2] + "," + m[3];
    } else {
      return null;
    }
  }
  function resize() {
    if (!cv) {
      return;
    }
    W = innerWidth;
    H = innerHeight;
    cv.width = W * dpr;
    cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.max(18, Math.min(lite ? 30 : 48, Math.round(W * H / 28000)));
    while (pts.length < n) {
      pts.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.5 + 0.6
      });
    }
    pts.length = n;
  }
  if (cv && !reduce) {
    addEventListener("resize", resize);
    resize();
    addEventListener("mousemove", function (e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }, {
      passive: true
    });
  }
  var idle = false;
  function shouldRun() {
    return st.anim && !root.classList.contains("liquid") && !document.hidden && document.hasFocus() && !document.querySelector(".modal:not(.hidden)");
  }
  function startLoop() {
    if (!running && cv && !reduce) {
      running = true;
      requestAnimationFrame(loop);
    }
  }
  function loop(t) {
    if (!st.anim || reduce) {
      running = false;
      return;
    }
    if (frame++ % 15 === 0) {
      idle = !shouldRun();
      root.classList.toggle("paused", idle);
      var c = parse(getComputedStyle(root).getPropertyValue("--accent"));
      if (c) {
        color = c;
      }
    }
    if (idle || t - last < 33) {
      requestAnimationFrame(loop);
      return;
    } // ~30fps
    last = t;
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > W) {
        p.vx *= -1;
      }
      if (p.y < 0 || p.y > H) {
        p.vy *= -1;
      }
      var dx = p.x - mouse.x;
      var dy = p.y - mouse.y;
      var d2 = dx * dx + dy * dy;
      if (d2 < 14000) {
        var f = (1 - d2 / 14000) * 0.6;
        p.x += dx * f * 0.03;
        p.y += dy * f * 0.03;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.283);
      ctx.fillStyle = "rgba(" + color + ",.75)";
      ctx.fill();
      for (var j = i + 1; j < pts.length; j++) {
        var q = pts[j];
        var ax = p.x - q.x;
        var ay = p.y - q.y;
        var d = ax * ax + ay * ay;
        if (d < 12100) {
          ctx.strokeStyle = "rgba(" + color + "," + ((1 - d / 12100) * 0.22).toFixed(3) + ")";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(loop);
  }
  startLoop();

  // ---------- Đèn rọi theo chuột trên thẻ acc (giới hạn theo frame) ----------
  var pend = null;
  var rafId = 0;
  document.addEventListener("mousemove", function (e) {
    var card = e.target && e.target.closest ? e.target.closest(".card") : null;
    if (!card) {
      return;
    }
    pend = {
      c: card,
      x: e.clientX,
      y: e.clientY
    };
    if (rafId) {
      return;
    }
    rafId = requestAnimationFrame(function () {
      rafId = 0;
      if (!pend) {
        return;
      }
      var r = pend.c.getBoundingClientRect();
      pend.c.style.setProperty("--mx", pend.x - r.left + "px");
      pend.c.style.setProperty("--my", pend.y - r.top + "px");
      pend = null;
    });
  }, {
    passive: true
  });

  // ---------- Ripple khi bấm nút ----------
  document.addEventListener("pointerdown", function (e) {
    var b = e.target && e.target.closest ? e.target.closest(".btn") : null;
    if (!b || reduce || !st.anim) {
      return;
    }
    var r = b.getBoundingClientRect();
    var s = Math.max(r.width, r.height) * 2;
    var d = document.createElement("span");
    d.className = "fx-ripple";
    d.style.cssText = "width:" + s + "px;height:" + s + "px;left:" + (e.clientX - r.left - s / 2) + "px;top:" + (e.clientY - r.top - s / 2) + "px";
    b.appendChild(d);
    setTimeout(function () {
      d.remove();
    }, 700);
  });
})();

// ======================= Fightbot + ESP =======================
(function () {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }
  var api = window.botafk;
  if (!api) {
    return;
  }
  var accounts = [];
  var onMap = {};
  function toast(msg) {
    try {
      window.dispatchEvent(new CustomEvent("fx-toast", {
        detail: msg
      }));
    } catch (_) {}
  }
  function selectedLabel() {
    var h = document.querySelector(".card.selected h4");
    if (h) {
      return h.textContent.trim();
    } else {
      return "";
    }
  }
  function selectedAcc() {
    var label = selectedLabel();
    if (!label) {
      return null;
    }
    for (var i = 0; i < accounts.length; i++) {
      if (accounts[i].label === label) {
        return accounts[i];
      }
    }
    for (var j = 0; j < accounts.length; j++) {
      if (accounts[j].username === label) {
        return accounts[j];
      }
    }
    return null;
  }
  function refreshAccounts() {
    return api.listAccounts().then(function (l) {
      accounts = Array.isArray(l) ? l : l && l.accounts || [];
    }).catch(function () {});
  }
  refreshAccounts();
  try {
    api.onAccounts(function (l) {
      if (Array.isArray(l)) {
        accounts = l;
      }
      syncBtn();
    });
  } catch (_) {}
  function send(id, line) {
    if (window.__mergeSet) line = window.__mergeSet(line, 'fb');
    return api.sendCommand(id, line);
  }
  async function needAcc() {
    var a = selectedAcc();
    if (!a) {
      await refreshAccounts();
      a = selectedAcc();
    }
    if (!a) {
      toast("Chọn một acc trước.");
    }
    return a;
  }

  // ---- đồng bộ trạng thái BẬT/TẮT từ log của runner ----
  try {
    api.onEvent(function (ev) {
      if (!ev || !ev.id) {
        return;
      }
      if (ev.type === "log" && typeof ev.text === "string") {
        if (/^Fightbot: BẬT$/.test(ev.text) || /^Fightbot đang BẬT/.test(ev.text)) {
          onMap[ev.id] = true;
        } else if (/^Fightbot: TẮT$/.test(ev.text) || /^Fightbot đang TẮT/.test(ev.text)) {
          onMap[ev.id] = false;
        }
      } else if (ev.type === "status" && ev.status === "stopped") {
        onMap[ev.id] = false;
        if (espAcc === ev.id) {
          closeEsp(true);
        }
      }
      syncBtn();
    });
  } catch (_) {}
  function syncBtn() {
    var a = selectedAcc();
    var f = $("fx-fight");
    if (f) {
      f.classList.toggle("on", !!a && !!onMap[a.id]);
    }
    var e = $("fx-esp");
    if (e) {
      e.classList.toggle("on", !!a && espAcc === a.id);
    }
  }

  // ---- cài đặt theo từng acc ----
  function num(v, lo, hi, d) {
    v = Number(v);
    if (isFinite(v)) {
      return Math.max(lo, Math.min(hi, v));
    } else {
      return d;
    }
  }
  function defCfg() {
    return {
      warp: "tuonglai",
      warpCmd: "",
      warpDelay: 0,
      mode: "server",
      cps: 1.6,
      maxTargets: 3,
      reach: 4,
      useGold: true,
      useCandle: true,
      swordFallback: true,
      goldCps: 5,
      names: [],
      scope: "all",
      radius: 48,
      points: [],
      pointRadius: 5
    };
  }
  function loadCfg(id) {
    var d = defCfg();
    try {
      var r = JSON.parse(localStorage.getItem("botafk.fight." + id) || "null");
      if (r && typeof r === "object") {
        if (Array.isArray(r.names)) {
          d.names = r.names;
        }
        d.scope = "all";
        d.radius = num(r.radius, 8, 100, 48);
        d.warp = r.warp === "fide" ? "fide" : "tuonglai";
        d.warpCmd = String(r.warpCmd || "");
        d.warpDelay = Math.round(num(r.warpDelay, 0, 600, 0));
        d.mode = r.mode === "aura" ? "aura" : r.mode === "server" ? "server" : r.serverAuto === false ? "aura" : "server";
        d.cps = num(r.cps, 0.5, 20, 1.6);
        d.maxTargets = Math.round(num(r.maxTargets, 1, 3, 3));
        d.reach = num(r.reach, 1, 4, 4);
        d.useGold = r.useGold !== false;
        d.useCandle = r.useCandle !== false;
        d.swordFallback = r.swordFallback !== false;
        d.goldCps = num(r.goldCps, 1, 25, 5);
        if (Array.isArray(r.points)) {
          d.points = r.points.map(function (p) {
            return {
              x: Math.round(Number(p.x) || 0),
              y: Math.round(Number(p.y) || 0),
              z: Math.round(Number(p.z) || 0),
              sec: Math.round(num(p.sec, 1, 3600, 30))
            };
          }).slice(0, 50);
        }
        d.pointRadius = num(r.pointRadius, 1, 5, 5);
      }
    } catch (_) {}
    return d;
  }
  function saveCfg(id, c) {
    try {
      localStorage.setItem("botafk.fight." + id, JSON.stringify(c));
    } catch (_) {}
  }
  function listOf(t) {
    return String(t || "").split(",").map(function (x) {
      return x.trim();
    }).filter(Boolean);
  }
  function antiGet() {
    try {
      var v = localStorage.getItem("botafk.antidrop");
      return v == null ? "blaze_rod" : v;
    } catch (e) {
      return "blaze_rod";
    }
  }
  function antiInit() {
    var el = $("set-antidrop");
    if (!el) return;
    el.value = antiGet();
    el.addEventListener("input", function () {
      try {
        localStorage.setItem("botafk.antidrop", el.value);
      } catch (e) {}
    });
  }
  window.addEventListener("DOMContentLoaded", antiInit);
  function payload(c) {
    return JSON.stringify({
      warp: c.warp,
      warpCmd: c.warpCmd,
      warpDelay: c.warpDelay,
      mode: c.mode,
      cps: c.cps,
      maxTargets: c.maxTargets,
      reach: c.reach,
      useGold: c.useGold,
      useCandle: c.useCandle,
      swordFallback: c.swordFallback,
      goldCps: c.goldCps,
      names: c.names.filter(function (m) {
        return m.on;
      }).map(function (m) {
        return m.name;
      }),
      scope: c.scope,
      radius: c.radius,
      points: c.points,
      pointRadius: c.pointRadius
    });
  }
  // names lưu dạng {name,on}
  function norm(c) {
    c.names = c.names.map(function (n) {
      if (typeof n === "string") {
        return {
          name: n,
          on: true
        };
      } else {
        return n;
      }
    });
    return c;
  }

  // ---- nút Fightbot ----
  var modal = $("fight-modal");
  var listEl = $("fight-list");
  var msgEl = $("fight-msg");
  var working = null;
  var workingId = null;
  async function toggleFight() {
    var a = await needAcc();
    if (!a) {
      return;
    }
    var r;
    if (onMap[a.id]) {
      r = await send(a.id, "!fightbot off");
    } else {
      var c = norm(loadCfg(a.id));
      await send(a.id, "!fightbot set " + payload(c));
      r = await send(a.id, "!fightbot on");
    }
    if (r && r.ok === false) {
      toast(r.msg || "Acc này chưa chạy.");
    }
  }
  function renderList() {
    listEl.innerHTML = "";
    if (!working.names.length) {
      var em = document.createElement("div");
      em.className = "esp-empty";
      em.textContent = "Để trống: đánh mọi người chơi chưa kết bạn.";
      listEl.appendChild(em);
      return;
    }
    working.names.forEach(function (m, i) {
      var lb = document.createElement("label");
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!m.on;
      cb.addEventListener("change", function () {
        m.on = cb.checked;
      });
      var sp = document.createElement("span");
      sp.textContent = m.name;
      var del = document.createElement("span");
      del.className = "cell-del";
      del.textContent = "×";
      del.title = "Xóa";
      del.addEventListener("click", function (e) {
        e.preventDefault();
        working.names.splice(i, 1);
        renderList();
      });
      lb.appendChild(cb);
      lb.appendChild(sp);
      lb.appendChild(del);
      listEl.appendChild(lb);
    });
  }
  function renderPoints() {
    var box = $("fight-points");
    box.innerHTML = "";
    if (!working.points.length) {
      var em = document.createElement("div");
      em.className = "esp-empty";
      em.textContent = "Chưa có tọa độ. Bấm \"+ Thêm tọa độ\".";
      box.appendChild(em);
      return;
    }
    var head = document.createElement("div");
    head.className = "pt-row pt-head";
    ["#", "X", "Y", "Z", "Đứng (giây)", ""].forEach(function (t) {
      var s = document.createElement("span");
      s.textContent = t;
      head.appendChild(s);
    });
    box.appendChild(head);
    working.points.forEach(function (p, i) {
      var row = document.createElement("div");
      row.className = "pt-row";
      var n = document.createElement("span");
      n.textContent = String(i + 1);
      row.appendChild(n);
      ["x", "y", "z", "sec"].forEach(function (k) {
        var inp = document.createElement("input");
        inp.type = "number";
        inp.value = p[k];
        if (k === "sec") {
          inp.min = 1;
          inp.max = 3600;
        }
        inp.addEventListener("input", function () {
          p[k] = Math.round(Number(inp.value) || 0);
        });
        row.appendChild(inp);
      });
      var del = document.createElement("button");
      del.type = "button";
      del.className = "btn ghost danger";
      del.textContent = "×";
      del.title = "Xóa tọa độ";
      del.addEventListener("click", function () {
        working.points.splice(i, 1);
        renderPoints();
      });
      row.appendChild(del);
      box.appendChild(row);
    });
  }
  function showSections() {
    var w = $("fight-warp").value;
    var mode = $("fight-mode").value;
    var aura = mode !== "server";
    $("fight-aura").classList.toggle("hidden", !aura);
    $("fight-modehint").classList.toggle("hidden", aura);
    $("fight-pbox").classList.toggle("hidden", aura);
    $("fight-pnote").classList.toggle("hidden", !aura);
    $("fight-warpcmd").placeholder = (w === "fide" ? "/home fide" : "/warp " + w) + " (mặc định)";
  }
  async function openSettings() {
    var a = await needAcc();
    if (!a) {
      return;
    }
    workingId = a.id;
    working = norm(loadCfg(a.id));
    $("fight-warp").value = working.warp;
    $("fight-warpcmd").value = working.warpCmd;
    $("fight-warpdelay").value = working.warpDelay || 0;
    $("fight-mode").value = working.mode;
    $("fight-cps").value = working.cps;
    $("fight-targets").value = working.maxTargets;
    $("fight-reach").value = working.reach;
    $("fight-gold").checked = working.useGold;
    $("fight-candle").checked = working.useCandle;
    $("fight-sword").checked = working.swordFallback;
    $("fight-gcps").value = working.goldCps;
    
    $("fight-radius").value = working.radius;
    $("fight-pradius").value = working.pointRadius;
    showSections();
    msgEl.textContent = "";
    msgEl.style.color = "";
    renderList();
    renderPoints();
    modal.classList.remove("hidden");
  }
  // nhận vị trí bot từ log "Fightbot: [pos] x y z"
  try {
    api.onEvent(function (ev) {
      if (!ev || ev.type !== "log" || typeof ev.text !== "string" || !working || ev.id !== workingId || modal.classList.contains("hidden")) {
        return;
      }
      var m = /Fightbot: \[pos\] (-?\d+) (-?\d+) (-?\d+)/.exec(ev.text);
      if (!m) {
        return;
      }
      if (working.points.length >= 50) {
        return;
      }
      working.points.push({
        x: +m[1],
        y: +m[2],
        z: +m[3],
        sec: 30
      });
      renderPoints();
      msgEl.style.color = "var(--ok)";
      msgEl.textContent = "Đã thêm tọa độ " + m[1] + " " + m[2] + " " + m[3] + ".";
    });
  } catch (_) {}
  var fightBtn = $("fx-fight");
  if (fightBtn && modal) {
    fightBtn.addEventListener("click", function (e) {
      e.preventDefault();
      toggleFight();
    });
    fightBtn.addEventListener("contextmenu", function (e) {
      e.preventDefault();
      openSettings();
    });
    $("fight-add").addEventListener("click", function () {
      var v = $("fight-custom").value.trim();
      if (!v) {
        return;
      }
      if (working.names.some(function (m) {
        return m.name.toLowerCase() === v.toLowerCase();
      })) {
        msgEl.style.color = "";
        msgEl.textContent = "Đã có trong danh sách.";
        return;
      }
      if (working.names.length >= 500) {
        msgEl.style.color = "";
        msgEl.textContent = "Tối đa 500 tên.";
        return;
      }
      working.names.push({
        name: v.slice(0, 80),
        on: true
      });
      $("fight-custom").value = "";
      msgEl.textContent = "";
      renderList();
    });
    $("fight-custom").addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        $("fight-add").click();
      }
    });
    $("fight-warp").addEventListener("change", showSections);
    $("fight-mode").addEventListener("change", showSections);
    $("fight-addpoint").addEventListener("click", function () {
      if (working.points.length >= 50) {
        msgEl.style.color = "";
        msgEl.textContent = "Tối đa 50 tọa độ.";
        return;
      }
      var l = working.points[working.points.length - 1];
      working.points.push(l ? {
        x: l.x,
        y: l.y,
        z: l.z,
        sec: l.sec
      } : {
        x: 0,
        y: 64,
        z: 0,
        sec: 30
      });
      renderPoints();
    });
    $("fight-getpos").addEventListener("click", async function () {
      var r = await send(workingId, "!fightbot pos");
      msgEl.style.color = "";
      msgEl.textContent = r && r.ok === false ? r.msg || "Acc này chưa chạy." : "Đang lấy vị trí bot…";
    });
    $("fight-apply").addEventListener("click", async function () {
      working.warp = $("fight-warp").value;
      working.warpCmd = $("fight-warpcmd").value.trim().slice(0, 60);
      working.warpDelay = Math.max(0, Math.min(600, Math.round(Number($("fight-warpdelay").value) || 0)));
      working.mode = $("fight-mode").value === "aura" ? "aura" : "server";
      working.cps = num($("fight-cps").value, 0.5, 20, 1.6);
      working.maxTargets = Math.round(num($("fight-targets").value, 1, 3, 3));
      working.reach = num($("fight-reach").value, 1, 4, 4);
      working.useGold = $("fight-gold").checked;
      working.useCandle = $("fight-candle").checked;
      working.swordFallback = $("fight-sword").checked;
      working.goldCps = num($("fight-gcps").value, 1, 25, 5);
      working.scope = "all";
      working.radius = num($("fight-radius").value, 8, 100, 48);
      working.pointRadius = num($("fight-pradius").value, 1, 5, 5);
      saveCfg(workingId, working);
      await send(workingId, "!fightbot set " + payload(working)); // runner nhớ cài đặt cho lần bật sau
      modal.classList.add("hidden");
    });
    $("fight-friends").addEventListener("click", async function () {
      var a = await needAcc();
      if (a) {
        send(a.id, "!friends");
      }
    });
    modal.addEventListener("mousedown", function (e) {
      if (e.target === modal) {
        modal.classList.add("hidden");
      }
    });

    // ---- nhập danh sách tên từ file .txt ----
    $("fight-import").addEventListener("click", function () {
      $("fight-file").value = "";
      $("fight-file").click();
    });
    $("fight-clear").addEventListener("click", function () {
      working.names = [];
      msgEl.style.color = "";
      msgEl.textContent = "Đã xóa danh sách (để trống = đánh mọi người chơi chưa kết bạn).";
      renderList();
    });
    $("fight-file").addEventListener("change", function () {
      var f = $("fight-file").files && $("fight-file").files[0];
      if (!f) {
        return;
      }
      if (f.size > 1048576) {
        msgEl.style.color = "";
        msgEl.textContent = "File quá lớn (tối đa 1 MB).";
        return;
      }
      var rd = new FileReader();
      rd.onload = function () {
        var text = String(rd.result || "").replace(/^﻿/, "");
        var lines = text.split(/\r?\n/);
        var added = 0;
        var dup = 0;
        var skipped = 0;
        var seen = {};
        working.names.forEach(function (m) {
          seen[m.name.toLowerCase()] = 1;
        });
        for (var i = 0; i < lines.length; i++) {
          var v = lines[i].trim();
          if (!v || v.charAt(0) === "#") {
            continue;
          }
          v = v.slice(0, 80);
          if (seen[v.toLowerCase()]) {
            dup++;
            continue;
          }
          if (working.names.length >= 500) {
            skipped++;
            continue;
          }
          seen[v.toLowerCase()] = 1;
          working.names.push({
            name: v,
            on: true
          });
          added++;
        }
        msgEl.style.color = added ? "var(--ok)" : "";
        msgEl.textContent = "Đã thêm " + added + " tên từ \"" + f.name + "\"" + (dup ? ", bỏ " + dup + " tên trùng" : "") + (skipped ? ", bỏ " + skipped + " tên vượt giới hạn 500" : "") + ".";
        renderList();
      };
      rd.onerror = function () {
        msgEl.style.color = "";
        msgEl.textContent = "Không đọc được file.";
      };
      rd.readAsText(f, "utf-8");
    });
  }

  // ======================= ESP / radar =======================
  var panel = $("esp-panel");
  var cv = $("esp-canvas");
  var ctx = cv && cv.getContext("2d");
  var listE = $("esp-list");
  var espAcc = null;
  var lastMsg = null;
  var dots = [];
  var lastSig = "";
  var YELLOW = "#ffd21f";
  var GREEN = "#3ddc97";
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  if (cv) {
    cv.width = DPR * 300;
    cv.height = DPR * 300;
  }
  async function openEsp() {
    var a = await needAcc();
    if (!a) {
      return;
    }
    var r = await send(a.id, "!fightbot esp on");
    if (r && r.ok === false) {
      toast(r.msg || "Acc này chưa chạy.");
      return;
    }
    espAcc = a.id;
    lastMsg = null;
    lastSig = "";
    $("esp-who").textContent = a.label || a.username;
    panel.classList.remove("hidden");
    drawEmpty("Đang chờ dữ liệu từ bot…");
    syncBtn();
  }
  function closeEsp(silent) {
    if (espAcc && !silent) {
      send(espAcc, "!fightbot esp off");
    }
    espAcc = null;
    lastMsg = null;
    panel.classList.add("hidden");
    syncBtn();
  }
  var espBtn = $("fx-esp");
  if (espBtn && panel) {
    espBtn.addEventListener("click", function (e) {
      e.preventDefault();
      if (espAcc) {
        closeEsp();
      } else {
        openEsp();
      }
    });
    $("esp-close").addEventListener("click", function () {
      closeEsp();
    });
    // đổi acc khi radar đang mở
    setInterval(function () {
      syncBtn();
      if (!espAcc) {
        return;
      }
      var a = selectedAcc();
      if (a && a.id !== espAcc) {
        send(espAcc, "!fightbot esp off");
        espAcc = null;
        openEsp();
      }
    }, 1000);
    cv.addEventListener("click", function (e) {
      var r = cv.getBoundingClientRect();
      var x = (e.clientX - r.left) * (300 / r.width);
      var y = (e.clientY - r.top) * (300 / r.height);
      var best = null;
      var bd = 12;
      dots.forEach(function (d) {
        var dd = Math.hypot(d.px - x, d.py - y);
        if (dd < bd) {
          bd = dd;
          best = d;
        }
      });
      if (best) {
        toggleFriend(best.ent);
      }
    });
    cv.addEventListener("mousemove", function (e) {
      var r = cv.getBoundingClientRect();
      var x = (e.clientX - r.left) * (300 / r.width);
      var y = (e.clientY - r.top) * (300 / r.height);
      var tip = "";
      dots.forEach(function (d) {
        if (Math.hypot(d.px - x, d.py - y) < 10) {
          tip = d.ent.label + " · " + d.ent.d + "m · " + (d.ent.friend ? "bạn bè" : "chưa add (bị đánh)");
        }
      });
      cv.title = tip;
    });
  }
  async function toggleFriend(ent) {
    if (!espAcc) {
      return;
    }
    var line = (ent.friend ? "!delfriend " : "!addfriend ") + ent.key;
    ent.friend = !ent.friend; // cập nhật ngay, lần gửi tiếp theo của bot sẽ xác nhận
    if (lastMsg) {
      draw(lastMsg);
      renderRows(lastMsg, true);
    }
    await send(espAcc, line);
  }
  function drawEmpty(text) {
    if (!ctx) {
      return;
    }
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, 300, 300);
    ctx.fillStyle = "rgba(200,210,230,.6)";
    ctx.font = "13px \"Segoe UI\", sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, 150, 150);
  }
  function draw(m) {
    if (!ctx) {
      return;
    }
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, 300, 300);
    var C = 150;
    var R = 138;
    var radius = Math.max(8, m.radius || 48);
    var s = R / radius; // vòng khoảng cách
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(160,180,210,.22)";
    [0.25, 0.5, 0.75, 1].forEach(function (f) {
      ctx.beginPath();
      ctx.arc(C, C, R * f, 0, 6.283);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(C - R, C);
    ctx.lineTo(C + R, C);
    ctx.moveTo(C, C - R);
    ctx.lineTo(C, C + R);
    ctx.stroke();
    ctx.fillStyle = "rgba(160,180,210,.5)";
    ctx.font = "10px \"Segoe UI\", sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("B", C, 12);
    ctx.fillText("N", C, 296);
    ctx.fillText("Đ", 292, C + 3);
    ctx.fillText("T", 8, C + 3);
    ctx.fillText(Math.round(radius) + "m", C + R * 0.72, C - R * 0.72);
    dots = [];
    (m.ents || []).forEach(function (e) {
      var px = C + e.x * s;
      var py = C + e.z * s;
      var len = Math.hypot(px - C, py - C);
      if (len > R) {
        px = C + (px - C) * R / len;
        py = C + (py - C) * R / len;
      }
      var col = e.friend ? GREEN : YELLOW;
      ctx.save();
      ctx.shadowColor = col;
      ctx.shadowBlur = 10;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(px, py, e.target ? 6 : 5, 0, 6.283);
      ctx.fill();
      ctx.restore();
      if (e.target) {
        ctx.strokeStyle = "#ff6b81";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, 9, 0, 6.283);
        ctx.stroke();
      }
      dots.push({
        px: px,
        py: py,
        ent: e
      });
    });
    // bot ở giữa, mũi nhọn chỉ hướng nhìn (yaw 0 = hướng +z = xuống màn hình)
    var yaw = m.yaw || 0;
    var dx = -Math.sin(yaw);
    var dz = Math.cos(yaw);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(C + dx * 9, C + dz * 9);
    ctx.lineTo(C - dx * 5 - dz * 5, C - dz * 5 + dx * 5);
    ctx.lineTo(C - dx * 5 + dz * 5, C - dz * 5 - dx * 5);
    ctx.closePath();
    ctx.fill();
  }
  function renderRows(m, force) {
    var ents = m.ents || [];
    $("esp-count").textContent = ents.length ? "· " + ents.length + " người chơi · " + (m.friends || 0) + " bạn" : "";
    var sig = ents.map(function (e) {
      return e.id + (e.friend ? "f" : "y") + (e.target ? "t" : "");
    }).join(",");
    if (sig === lastSig && !force) {
      var rows = listE.querySelectorAll(".esp-row");
      ents.forEach(function (e, i) {
        if (rows[i]) {
          var d = rows[i].querySelector(".ds");
          if (d) {
            d.textContent = e.d + "m";
          }
        }
      });
      return;
    }
    lastSig = sig;
    listE.innerHTML = "";
    if (!ents.length) {
      var em = document.createElement("div");
      em.className = "esp-empty";
      em.textContent = "Không có người chơi nào trong tầm.";
      listE.appendChild(em);
      return;
    }
    ents.forEach(function (e) {
      var row = document.createElement("div");
      row.className = "esp-row" + (e.target ? " target" : "");
      var dot = document.createElement("span");
      dot.className = "dot " + (e.friend ? "g" : "y");
      dot.style.margin = "0";
      var nm = document.createElement("span");
      nm.className = "nm";
      nm.textContent = (e.target ? "⚔ " : "") + e.label;
      nm.title = e.key;
      var ds = document.createElement("span");
      ds.className = "ds";
      ds.textContent = e.d + "m";
      var b = document.createElement("button");
      b.type = "button";
      b.className = "btn ghost";
      b.textContent = e.friend ? "Bỏ kết bạn" : "Kết bạn";
      b.addEventListener("click", function () {
        toggleFriend(e);
      });
      row.appendChild(dot);
      row.appendChild(nm);
      row.appendChild(ds);
      row.appendChild(b);
      listE.appendChild(row);
    });
  }

  // dữ liệu radar do boot.js đẩy vào trang
  window.__fxMsg = function (m) {
    if (!m || m.kind !== "esp" || !espAcc) {
      return;
    }
    var a = null;
    for (var i = 0; i < accounts.length; i++) {
      if (accounts[i].id === espAcc) {
        a = accounts[i];
      }
    }
    if (!a || a.username !== m.user) {
      return;
    }
    if (m.off) {
      return;
    }
    lastMsg = m;
    draw(m);
    renderRows(m, false);
  };
})();

// ======================= Automine (làm lại) =======================
(function () {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }
  var api = window.botafk;
  if (!api) {
    return;
  }
  var accounts = [];
  var onMap = {};
  function toast(msg) {
    try {
      window.dispatchEvent(new CustomEvent("fx-toast", {
        detail: msg
      }));
    } catch (_) {}
  }
  function selectedAcc() {
    var h = document.querySelector(".card.selected h4");
    var label = h ? h.textContent.trim() : "";
    if (!label) {
      return null;
    }
    for (var i = 0; i < accounts.length; i++) {
      if (accounts[i].label === label) {
        return accounts[i];
      }
    }
    for (var j = 0; j < accounts.length; j++) {
      if (accounts[j].username === label) {
        return accounts[j];
      }
    }
    return null;
  }
  function refresh() {
    return api.listAccounts().then(function (l) {
      accounts = Array.isArray(l) ? l : l && l.accounts || [];
    }).catch(function () {});
  }
  refresh();
  try {
    api.onAccounts(function (l) {
      if (Array.isArray(l)) {
        accounts = l;
      }
      sync();
    });
  } catch (_) {}
  async function needAcc() {
    var a = selectedAcc();
    if (!a) {
      await refresh();
      a = selectedAcc();
    }
    if (!a) {
      toast("Chọn một acc trước.");
    }
    return a;
  }
  function send(id, line) {
    if (window.__mergeSet) line = window.__mergeSet(line, 'am');
    return api.sendCommand(id, line);
  }
  function num(v, lo, hi, d) {
    v = Number(v);
    if (isFinite(v)) {
      return Math.max(lo, Math.min(hi, v));
    } else {
      return d;
    }
  }
  function sync() {
    var a = selectedAcc();
    var b = $("fx-mine");
    if (b) {
      b.classList.toggle("on", !!a && !!onMap[a.id]);
    }
  }
  var modal = $("amine-modal");
  var msg = $("am-msg");
  var working = null;
  var workingId = null;
  var pending = null;
  function def() {
    return {
      wait: 10,
      points: [],
      box: null,
      blocks: "",
      trade: true,
      tradeR: 48,
      pv: true,
      pvn: 1,
      mode: "area",
      nk: {
        shape: "cube",
        mode: "all",
        up: 1,
        down: 0,
        left: 0,
        right: 0,
        forward: 6,
        back: 2,
        walls: 6,
        delay: 0,
        max: 1,
        sort: "closest",
        suit: false,
        rot: false,
        lmode: "whitelist",
        list: ""
      }
    };
  }
  function load(id) {
    var d = def();
    try {
      var r = JSON.parse(localStorage.getItem("botafk.amine." + id) || "null");
      if (r && typeof r === "object") {
        d.wait = num(r.wait, 0, 120, 10);
        d.blocks = String(r.blocks || "");
        d.trade = r.trade !== false;
        d.tradeR = num(r.tradeR, 4, 100, 48);
        d.pv = r.pv !== false;
        d.pvn = Math.round(num(r.pvn, 1, 99, 1));
        if (Array.isArray(r.points)) {
          d.points = r.points.map(function (p) {
            return {
              x: Math.round(+p.x || 0),
              y: Math.round(+p.y || 0),
              z: Math.round(+p.z || 0),
              sec: Math.round(num(p.sec, 0, 3600, 0))
            };
          }).slice(0, 50);
        }
        if (r.box && typeof r.box === "object") {
          d.box = r.box;
        }
        if (r.mode === "nuker") {
          d.mode = "nuker";
        }
        if (r.nk && typeof r.nk === "object") {
          var k = r.nk;
          var n = d.nk;
          n.shape = String(k.shape || n.shape);
          n.mode = String(k.mode || n.mode);
          n.sort = String(k.sort || n.sort);
          n.lmode = String(k.lmode || n.lmode);
          n.list = String(k.list || "");
          n.suit = !!k.suit;
          n.rot = !!k.rot;
          ["up", "down", "left", "right", "forward", "back"].forEach(function (q) {
            n[q] = Math.round(num(k[q], 0, 6, n[q]));
          });
          n.walls = num(k.walls, 0, 6, 6);
          n.delay = Math.round(num(k.delay, 0, 40, 0));
          n.max = Math.round(num(k.max, 1, 10, 1));
        }
      }
    } catch (_) {}
    return d;
  }
  function save(id, c) {
    try {
      localStorage.setItem("botafk.amine." + id, JSON.stringify(c));
    } catch (_) {}
  }
  function antiGet() {
    try {
      var v = localStorage.getItem("botafk.antidrop");
      return v == null ? "blaze_rod" : v;
    } catch (e) {
      return "blaze_rod";
    }
  }
  function listOf(t) {
    return String(t || "").split(",").map(function (x) {
      return x.trim();
    }).filter(Boolean);
  }
  function payload(c) {
    return JSON.stringify({
      spawnWait: c.wait,
      waypoints: c.points,
      box: c.box,
      blocks: listOf(c.blocks),
      trade: c.trade,
      tradeRadius: c.tradeR,
      pv: c.pv,
      pvNum: c.pvn,
      antiDrop: listOf(antiGet()),
      mode: c.mode,
      nuker: {
        shape: c.nk.shape,
        mode: c.nk.mode,
        up: c.nk.up,
        down: c.nk.down,
        left: c.nk.left,
        right: c.nk.right,
        forward: c.nk.forward,
        back: c.nk.back,
        wallsRange: c.nk.walls,
        delay: c.nk.delay,
        maxPerTick: c.nk.max,
        sort: c.nk.sort,
        onlySuitable: c.nk.suit,
        rotate: c.nk.rot,
        listMode: c.nk.lmode,
        list: listOf(c.nk.list)
      }
    });
  }
  try {
    api.onEvent(function (ev) {
      if (!ev || !ev.id) {
        return;
      }
      if (ev.type === "log" && typeof ev.text === "string") {
        if (/^Automine: BẬT$/.test(ev.text) || /^Automine đang BẬT/.test(ev.text)) {
          onMap[ev.id] = true;
        } else if (/^Automine: TẮT/.test(ev.text) || /^Automine đang TẮT/.test(ev.text)) {
          onMap[ev.id] = false;
        }
        var m = /^Automine: \[pos\] (-?\d+) (-?\d+) (-?\d+)/.exec(ev.text);
        if (m && working && ev.id === workingId && pending && !modal.classList.contains("hidden")) {
          var x = +m[1];
          var y = +m[2];
          var z = +m[3];
          if (pending === "wp") {
            if (working.points.length < 50) {
              working.points.push({
                x: x,
                y: y,
                z: z,
                sec: 0
              });
            }
            renderPoints();
          } else if (pending === "c1") {
            $("am-x1").value = x;
            $("am-y1").value = y - 1;
            $("am-z1").value = z;
          } else if (pending === "c2") {
            $("am-x2").value = x;
            $("am-y2").value = y - 1;
            $("am-z2").value = z;
          }
          pending = null;
          msg.style.color = "var(--ok)";
          msg.textContent = "Đã lấy vị trí " + x + " " + y + " " + z + ".";
        }
      } else if (ev.type === "status" && ev.status === "stopped") {
        onMap[ev.id] = false;
      }
      sync();
    });
  } catch (_) {}
  function renderPoints() {
    var box = $("am-points");
    box.innerHTML = "";
    if (!working.points.length) {
      var em = document.createElement("div");
      em.className = "esp-empty";
      em.textContent = "Chưa có tọa độ (bỏ trống = đào luôn).";
      box.appendChild(em);
      return;
    }
    var head = document.createElement("div");
    head.className = "pt-row pt-head";
    ["#", "X", "Y", "Z", "Đợi (giây)", ""].forEach(function (t) {
      var s = document.createElement("span");
      s.textContent = t;
      head.appendChild(s);
    });
    box.appendChild(head);
    working.points.forEach(function (p, i) {
      var row = document.createElement("div");
      row.className = "pt-row";
      var n = document.createElement("span");
      n.textContent = String(i + 1);
      row.appendChild(n);
      ["x", "y", "z", "sec"].forEach(function (k) {
        var inp = document.createElement("input");
        inp.type = "number";
        inp.value = p[k];
        if (k === "sec") {
          inp.min = 0;
          inp.max = 3600;
        }
        inp.addEventListener("input", function () {
          p[k] = Math.round(Number(inp.value) || 0);
        });
        row.appendChild(inp);
      });
      var del = document.createElement("button");
      del.type = "button";
      del.className = "btn ghost danger";
      del.textContent = "×";
      del.title = "Xóa";
      del.addEventListener("click", function () {
        working.points.splice(i, 1);
        renderPoints();
      });
      row.appendChild(del);
      box.appendChild(row);
    });
  }
  async function toggle() {
    var a = await needAcc();
    if (!a) {
      return;
    }
    var r;
    if (onMap[a.id]) {
      r = await send(a.id, "!automine off");
    } else {
      var c = load(a.id);
      await send(a.id, "!automine set " + payload(c));
      r = await send(a.id, "!automine on");
    }
    if (r && r.ok === false) {
      toast(r.msg || "Acc này chưa chạy.");
    }
  }
  function modeView() {
    var nk = $("am-mode").value === "nuker";
    $("am-nuker").classList.toggle("hidden", !nk);
    $("am-areabox").classList.toggle("hidden", nk);
  }
  async function open() {
    var a = await needAcc();
    if (!a) {
      return;
    }
    workingId = a.id;
    working = load(a.id);
    pending = null;
    $("am-wait").value = working.wait;
    $("am-blocks").value = working.blocks;
    $("am-trade").checked = working.trade;
    $("am-tradeR").value = working.tradeR;
    $("am-pv").checked = working.pv;
    $("am-pvn").value = working.pvn;
    var b = working.box || {};
    ["x1", "y1", "z1", "x2", "y2", "z2"].forEach(function (k) {
      $("am-" + k).value = b[k] == null ? "" : b[k];
    });
    var nk = working.nk;
    $("am-mode").value = working.mode;
    var set = {
      "nk-shape": nk.shape,
      "nk-mode": nk.mode,
      "nk-up": nk.up,
      "nk-down": nk.down,
      "nk-left": nk.left,
      "nk-right": nk.right,
      "nk-forward": nk.forward,
      "nk-back": nk.back,
      "nk-walls": nk.walls,
      "nk-delay": nk.delay,
      "nk-max": nk.max,
      "nk-sort": nk.sort,
      "nk-lmode": nk.lmode,
      "nk-list": nk.list
    };
    Object.keys(set).forEach(function (k) {
      $(k).value = set[k];
    });
    $("nk-suit").checked = nk.suit;
    $("nk-rot").checked = nk.rot;
    modeView();
    msg.textContent = "";
    msg.style.color = "";
    renderPoints();
    modal.classList.remove("hidden");
  }
  var btn = $("fx-mine");
  if (btn && modal) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      toggle();
    });
    btn.addEventListener("contextmenu", function (e) {
      e.preventDefault();
      open();
    });
    modal.addEventListener("mousedown", function (e) {
      if (e.target === modal) {
        modal.classList.add("hidden");
      }
    });
    $("am-addpoint").addEventListener("click", function () {
      if (working.points.length >= 50) {
        msg.style.color = "";
        msg.textContent = "Tối đa 50 tọa độ.";
        return;
      }
      var l = working.points[working.points.length - 1];
      working.points.push(l ? {
        x: l.x,
        y: l.y,
        z: l.z,
        sec: l.sec
      } : {
        x: 0,
        y: 64,
        z: 0,
        sec: 0
      });
      renderPoints();
    });
    function ask(kind) {
      return async function () {
        pending = kind;
        var r = await send(workingId, "!automine pos");
        msg.style.color = "";
        msg.textContent = r && r.ok === false ? r.msg || "Acc này chưa chạy." : "Đang lấy vị trí bot…";
      };
    }
    $("am-getpoint").addEventListener("click", ask("wp"));
    $("am-pos1").addEventListener("click", ask("c1"));
    $("am-pos2").addEventListener("click", ask("c2"));
    $("am-mode").addEventListener("change", modeView);
    $("am-apply").addEventListener("click", async function () {
      working.mode = $("am-mode").value === "nuker" ? "nuker" : "area";
      var q = working.nk;
      q.shape = $("nk-shape").value;
      q.mode = $("nk-mode").value;
      q.sort = $("nk-sort").value;
      q.lmode = $("nk-lmode").value;
      q.list = $("nk-list").value;
      q.suit = $("nk-suit").checked;
      q.rot = $("nk-rot").checked;
      ["up", "down", "left", "right", "forward", "back"].forEach(function (k) {
        q[k] = Math.round(num($("nk-" + k).value, 0, 6, q[k]));
      });
      q.walls = num($("nk-walls").value, 0, 6, 6);
      q.delay = Math.round(num($("nk-delay").value, 0, 40, 0));
      q.max = Math.round(num($("nk-max").value, 1, 10, 1));
      working.wait = num($("am-wait").value, 0, 120, 10);
      working.blocks = $("am-blocks").value;
      working.trade = $("am-trade").checked;
      working.tradeR = num($("am-tradeR").value, 4, 100, 48);
      working.pv = $("am-pv").checked;
      working.pvn = Math.round(num($("am-pvn").value, 1, 99, 1));
      var vals = ["x1", "y1", "z1", "x2", "y2", "z2"].map(function (k) {
        return $("am-" + k).value;
      });
      var any = vals.some(function (v) {
        return v !== "";
      });
      var all = vals.every(function (v) {
        return v !== "";
      });
      if (working.mode === "nuker") {/* không cần vùng đào */} else if (any && !all) {
        msg.style.color = "";
        msg.textContent = "Vùng đào cần đủ 2 góc (X, Y, Z mỗi góc).";
        return;
      }
      if (all) {
        var n = vals.map(Number);
        if (n.some(function (v) {
          return !isFinite(v);
        })) {
          msg.style.color = "";
          msg.textContent = "Tọa độ vùng đào không hợp lệ.";
          return;
        }
        if (Math.abs(n[0] - n[3]) + 1 > 64 || Math.abs(n[2] - n[5]) + 1 > 64) {
          msg.style.color = "";
          msg.textContent = "Vùng đào tối đa 64 x 64 block mỗi lớp.";
          return;
        }
        working.box = {
          x1: n[0],
          y1: n[1],
          z1: n[2],
          x2: n[3],
          y2: n[4],
          z2: n[5]
        };
      } else {
        working.box = null;
      }
      save(workingId, working);
      await send(workingId, "!automine set " + payload(working));
      modal.classList.add("hidden");
    });
  }
})();

// ======================= Kiểu đăng nhập của acc =======================
(function () {
  'use strict';

  var form = document.getElementById("acc-form");
  var modal = document.getElementById("modal");
  if (!form || !modal) {
    return;
  }
  var MSG = "@@FX@@";
  function say(o) {
    try {
      console.log(MSG + JSON.stringify(o));
    } catch (_) {}
  }
  function fld(n) {
    return form.elements[n];
  }
  window.addEventListener("fx-auth", function (e) {
    var d = e.detail || {};
    var sel = fld("authmode");
    if (sel && fld("username") && String(fld("username").value).trim().toLowerCase() === String(d.user || "").toLowerCase()) {
      sel.value = d.mode || "auto";
    }
  });
  function onOpen() {
    var sel = fld("authmode");
    if (!sel) {
      return;
    }
    sel.value = "auto";
    setTimeout(function () {
      var u = String(fld("username").value || "").trim();
      var h = String(fld("host").value || "").trim();
      if (u && h) {
        say({
          t: "authget",
          user: u,
          host: h
        });
      }
    }, 150);
  }
  try {
    new MutationObserver(function () {
      if (!modal.classList.contains("hidden")) {
        onOpen();
      }
    }).observe(modal, {
      attributes: true,
      attributeFilter: ["class"]
    });
  } catch (_) {}
  form.addEventListener("submit", function () {
    var u = String(fld("username").value || "").trim();
    var h = String(fld("host").value || "").trim();
    var sel = fld("authmode");
    if (u && h && sel) {
      say({
        t: "auth",
        user: u,
        host: h,
        mode: sel.value
      });
    }
  }, true);
})();

// ======================= Click UI =======================
(function () {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }
  var api = window.botafk;
  if (!api) {
    return;
  }
  var modal = $("cui-modal");
  if (!modal) {
    return;
  }
  var accounts = [];
  var curAcc = null;
  var win = null;
  var recOn = false;
  var steps = [];
  var playing = false;
  function toast(msg) {
    try {
      window.dispatchEvent(new CustomEvent("fx-toast", {
        detail: msg
      }));
    } catch (_) {}
  }
  function selectedAcc() {
    var h = document.querySelector(".card.selected h4");
    var label = h ? h.textContent.trim() : "";
    if (!label) {
      return null;
    }
    for (var i = 0; i < accounts.length; i++) {
      if (accounts[i].label === label) {
        return accounts[i];
      }
    }
    for (var j = 0; j < accounts.length; j++) {
      if (accounts[j].username === label) {
        return accounts[j];
      }
    }
    return null;
  }
  function refresh() {
    return api.listAccounts().then(function (l) {
      accounts = Array.isArray(l) ? l : l && l.accounts || [];
    }).catch(function () {});
  }
  refresh();
  try {
    api.onAccounts(function (l) {
      if (Array.isArray(l)) {
        accounts = l;
      }
    });
  } catch (_) {}
  function send(line) {
    if (!curAcc) {
      return Promise.resolve();
    }
    return api.sendCommand(curAcc.id, line);
  }
  function msg(t) {
    var m = $("cui-msg");
    if (m) {
      m.textContent = t || "";
    }
  }
  function key() {
    return "botafk.cui." + (curAcc && curAcc.id);
  }
  function saveSteps() {
    try {
      localStorage.setItem(key(), JSON.stringify(steps));
    } catch (_) {}
  }
  function loadSteps() {
    steps = [];
    try {
      var r = JSON.parse(localStorage.getItem(key()) || "[]");
      if (Array.isArray(r)) {
        steps = r;
      }
    } catch (_) {}
  }
  function slotBtn(s, cls) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "cui-slot" + (s.name ? "" : " blank") + (cls ? " " + cls : "") + (s.locked && cls !== "locked" ? " locked" : "");
    b.dataset.slot = s.slot;
    if (s.name) {
      var n = document.createElement("span");
      n.className = "n";
      n.textContent = s.dn || s.name;
      b.appendChild(n);
      var c = document.createElement("span");
      c.className = "c";
      c.textContent = s.count > 1 ? String(s.count) : "";
      b.appendChild(c);
      b.title = (s.dn || s.name) + " x" + s.count + " (ô " + s.slot + ")";
    } else {
      b.title = "ô " + s.slot + " (trống)";
    }
    var i = document.createElement("span");
    i.className = "i";
    i.textContent = s.slot;
    b.appendChild(i);
    return b;
  }
  function fillGrid(el, from, to, cols, map) {
    el.textContent = "";
    el.style.gridTemplateColumns = "repeat(" + cols + ",minmax(0,1fr))";
    for (var i = from; i < to; i++) {
      el.appendChild(slotBtn(map[i] || {
        slot: i
      }));
    }
  }
  function itemTxt(it) {
    if (it) {
      return (it.dn || it.name) + (it.count > 1 ? " x" + it.count : "");
    } else {
      return "";
    }
  }
  // ---- tooltip thông tin item (tên, lore, enchant, độ bền) ----
  (function () {
    var tip = document.createElement("div");
    tip.id = "cui-tip";
    tip.className = "hidden";
    document.body.appendChild(tip);
    function esc(t) { return String(t).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
    var MCC = { 0: "#7a7a7a", 1: "#5a5aff", 2: "#00aa00", 3: "#00aaaa", 4: "#cc2222", 5: "#aa00aa", 6: "#ffaa00", 7: "#aaaaaa", 8: "#808080", 9: "#5555ff", a: "#55ff55", b: "#55ffff", c: "#ff5555", d: "#ff55ff", e: "#ffff55", f: "#ffffff" };
    // chuỗi có mã màu § -> HTML có màu / đậm / nghiêng như trong game
    function mc(t) {
      t = String(t == null ? "" : t);
      var out = "", buf = "", st = { c: "", b: 0, i: 0, u: 0, s: 0 };
      function flush() {
        if (!buf) return;
        var css = (st.c ? "color:" + st.c + ";" : "") + (st.b ? "font-weight:700;" : "") + (st.i ? "font-style:italic;" : "") + (st.u || st.s ? "text-decoration:" + (st.u ? "underline " : "") + (st.s ? "line-through" : "") + ";" : "");
        out += css ? '<span style="' + css + '">' + esc(buf) + "</span>" : esc(buf);
        buf = "";
      }
      for (var k = 0; k < t.length; k++) {
        var ch = t[k];
        if (ch === "\u00a7" && k + 1 < t.length) {
          var c = t[++k].toLowerCase();
          flush();
          if (MCC[c]) st = { c: MCC[c], b: 0, i: 0, u: 0, s: 0 };
          else if (c === "l") st.b = 1;
          else if (c === "o") st.i = 1;
          else if (c === "n") st.u = 1;
          else if (c === "m") st.s = 1;
          else if (c === "r") st = { c: "", b: 0, i: 0, u: 0, s: 0 };
        } else buf += ch;
      }
      flush();
      return out;
    }
    document.addEventListener("mouseover", function (e) {
      var b = e.target.closest && e.target.closest(".cui-slot");
      if (!b || !win) { tip.classList.add("hidden"); return; }
      var s = (win.slots || []).filter(function (x) { return String(x.slot) === b.dataset.slot; })[0];
      if (!s || !s.name) { tip.classList.add("hidden"); return; }
      var h = '<div class="tn">' + mc(s.dnm || s.dn || s.name) + (s.count > 1 ? ' <small>x' + s.count + '</small>' : '') + '</div>';
      if (s.ench) h += s.ench.map(function (x) { return '<div class="te">' + esc(x) + '</div>'; }).join("");
      if (s.lore) h += s.lore.map(function (x) { return '<div class="tl">' + (mc(x) || "&nbsp;") + '</div>'; }).join("");
      if (s.dur) h += '<div class="td">Độ bền: ' + s.dur[0] + ' / ' + s.dur[1] + '</div>';
      h += '<div class="tm">minecraft:' + esc(s.name) + (s.cmd != null ? ' · model ' + esc(s.cmd) : '') + ' · ô ' + s.slot + '</div>';
      tip.innerHTML = h;
      tip.classList.remove("hidden");
    });
    document.addEventListener("mousemove", function (e) {
      if (tip.classList.contains("hidden")) return;
      var x = e.clientX + 16, y = e.clientY + 14, r = tip.getBoundingClientRect();
      if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 12;
      if (y + r.height > innerHeight - 8) y = innerHeight - r.height - 8;
      tip.style.left = x + "px"; tip.style.top = Math.max(8, y) + "px";
    });
    document.addEventListener("mouseout", function (e) { if (!e.relatedTarget || !(e.relatedTarget.closest && e.relatedTarget.closest(".cui-slot"))) tip.classList.add("hidden"); });
  })();
  function render() {
    var has = !!win && !!win.total;
    $("cui-empty").classList.toggle("hidden", has);
    $("cui-body").classList.toggle("hidden", !has);
    $("cui-win").textContent = has ? "· " + (win.title || win.type) + " (" + win.type + ")" : "";
    if (!has) {
      return;
    }
    var map = {};
    (win.slots || []).forEach(function (s) {
      map[s.slot] = s;
    });
    if (win.id === 0) {
      var top = $("cui-top");
      top.textContent = "";
      top.style.gridTemplateColumns = "repeat(5,minmax(0,1fr))";
      [5, 6, 7, 8, 45].forEach(function (i) {
        var bt = slotBtn(map[i] || { slot: i }, "locked");
        bt.title = (["", "", "", "", "", "Mũ", "Áo", "Quần", "Giày"][i] || "Offhand") + " · KHÓA 100%";
        top.appendChild(bt);
      });
      top.classList.remove("hidden");
    } else {
      fillGrid($("cui-top"), 0, win.invStart, win.cols || 9, map);
      $("cui-top").classList.toggle("hidden", win.invStart <= 0);
    }
    var hs = Math.max(win.invStart, Math.min(win.hotbarStart, win.invEnd));
    fillGrid($("cui-inv"), win.invStart, hs, 9, map);
    fillGrid($("cui-hot"), hs, win.invEnd, 9, map);
    var tr = $("cui-trades");
    tr.textContent = "";
    var list = win.trades || [];
    tr.classList.toggle("hidden", !list.length);
    list.forEach(function (t) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "cui-trade" + (t.disabled ? " off" : "");
      b.dataset.idx = t.i;
      b.textContent = "#" + t.i + "  " + itemTxt(t.in1) + (t.in2 ? " + " + itemTxt(t.in2) : "") + "  ->  " + itemTxt(t.out) + (t.max ? "  (" + t.uses + "/" + t.max + ")" : "");
      b.title = "Click: trade 1 lần · Shift+click: trade 10 lần";
      tr.appendChild(b);
    });
  }
  function stepText(s, i) {
    var t = "";
    if (s.k === "click") {
      t = "Click ô " + s.slot + " (" + s.how + ")";
    } else if (s.k === "trade") {
      t = "Trade #" + s.idx + " x" + (s.times || 1);
    } else if (s.k === "open") {
      t = "Mở " + (s.target === "villager" ? "dân làng" : "rương") + " gần nhất";
    } else if (s.k === "cmd") {
      t = "Lệnh " + s.text;
    } else if (s.k === "close") {
      t = "Đóng cửa sổ";
    } else {
      t = s.k;
    }
    return i + 1 + ". " + t + (i ? "  (+" + ((s.dt || 0) / 1000).toFixed(1) + " s)" : "");
  }
  function renderSteps() {
    $("cui-steps").textContent = steps.length + " bước" + (recOn ? " · đang ghi" : "");
    var l = $("cui-list");
    l.textContent = "";
    steps.forEach(function (s, i) {
      var d = document.createElement("div");
      d.textContent = stepText(s, i);
      l.appendChild(d);
    });
    l.scrollTop = l.scrollHeight;
    var r = $("cui-rec");
    r.textContent = recOn ? "Dừng ghi" : "Bắt đầu ghi";
    r.classList.toggle("on", recOn);
  }
  var NAMES = {
    left: "chuột trái",
    right: "chuột phải",
    shift: "Shift + trái",
    shiftright: "Shift + phải",
    drop: "thả 1 (Q)",
    dropall: "thả cả stack",
    middle: "chuột giữa"
  };
  function howFor(e) {
    var sel = $("cui-how").value;
    if (sel !== "auto") {
      return sel;
    }
    var right = e.button === 2;
    if (e.button === 1) {
      return "middle";
    }
    if (e.shiftKey) {
      if (right) {
        return "shiftright";
      } else {
        return "shift";
      }
    }
    if (right) {
      return "right";
    } else {
      return "left";
    }
  }
  // Dùng mousedown để biết đúng nút nào được bấm (trái = 0, phải = 2)
  function downHandler(e) {
    if (e.button !== 0 && e.button !== 1 && e.button !== 2) {
      return;
    }
    var t = e.target.closest ? e.target.closest(".cui-slot,.cui-trade") : null;
    if (!t) {
      return;
    }
    e.preventDefault();
    if (t.classList.contains("cui-trade")) {
      var times = e.shiftKey ? 10 : 1;
      send("!clickui trade " + t.dataset.idx + " " + times);
      msg("Đã gửi: trade #" + t.dataset.idx + " x" + times);
      return;
    }
    var how = howFor(e);
    send("!clickui click " + t.dataset.slot + " " + how);
    msg("Đã gửi: " + NAMES[how] + " ô " + t.dataset.slot);
  }
  function open() {
    var a = selectedAcc();
    if (!a) {
      refresh().then(function () {
        var b = selectedAcc();
        if (!b) {
          toast("Chọn một acc trước.");
        } else {
          curAcc = b;
          open2();
        }
      });
      return;
    }
    curAcc = a;
    open2();
  }
  function open2() {
    loadSteps();
    recOn = false;
    win = null;
    render();
    renderSteps();
    msg("");
    modal.classList.remove("hidden");
    send("!clickui state");
  }
  var btn = $("fx-cui");
  if (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      open();
    });
    btn.addEventListener("contextmenu", function (e) {
      e.preventDefault();
      open();
    });
  }
  ["cui-top", "cui-inv", "cui-hot", "cui-trades"].forEach(function (id) {
    var el = $(id);
    if (!el) {
      return;
    }
    el.addEventListener("mousedown", downHandler);
    el.addEventListener("contextmenu", function (e) {
      e.preventDefault();
    });
    el.addEventListener("click", function (e) {
      e.preventDefault();
    });
  });
  $("cui-open-chest").addEventListener("click", function () {
    send("!clickui open chest");
  });
  $("cui-open-vil").addEventListener("click", function () {
    send("!clickui open villager");
  });
  $("cui-close-win").addEventListener("click", function () {
    send("!clickui close");
  });
  function sendCmd() {
    var v = $("cui-cmd").value.trim();
    if (!v) {
      return;
    }
    if (v.toLowerCase() === ".inv") {
      send("!clickui open inv");
      $("cui-cmd").value = "";
      return;
    }
    send("!clickui cmd " + (v[0] === "/" ? v : "/" + v));
  }
  $("cui-send").addEventListener("click", sendCmd);
  $("cui-cmd").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      sendCmd();
    }
  });
  $("cui-rec").addEventListener("click", function () {
    if (!recOn) {
      steps = [];
      saveSteps();
      send("!clickui rec start");
      recOn = true;
    } else {
      send("!clickui rec stop");
      recOn = false;
      saveSteps();
    }
    renderSteps();
  });
  $("cui-recclear").addEventListener("click", function () {
    steps = [];
    recOn = false;
    saveSteps();
    send("!clickui rec clear");
    renderSteps();
  });
  $("cui-play").addEventListener("click", function () {
    if (!steps.length) {
      msg("Chưa có bản ghi. Bấm \"Bắt đầu ghi\", click vài ô, rồi \"Dừng ghi\".");
      return;
    }
    var sp = $("cui-speed").value;
    var lp = Math.max(0, Math.round(Number($("cui-loops").value) || 0));
    send("!clickui rec stop").then(function () {
      return send("!clickui load " + JSON.stringify(steps));
    }).then(function () {
      return send("!clickui play " + sp + " " + lp);
    });
    msg("Đang phát x" + sp + (lp === 0 ? ", lặp mãi" : ", " + lp + " lần"));
  });
  $("cui-stop").addEventListener("click", function () {
    send("!clickui stop");
    msg("Đã dừng phát");
  });
  var prev = window.__fxMsg;
  window.__fxMsg = function (m) {
    if (m && m.kind === "ui") {
      if (!curAcc || curAcc.username !== m.user) {
        return;
      }
      if (m.event === "rec") {
        steps = m.steps || [];
        recOn = !!m.recording;
        saveSteps();
        renderSteps();
        return;
      }
      if (m.event === "play") {
        playing = !!m.playing;
        msg(playing ? "Đang phát" + (m.round ? " · vòng " + m.round : "") : "Đã phát xong");
        return;
      }
      if (m.event === "close") {
        win = null;
        render();
        return;
      }
      win = m.win || null;
      render();
      return;
    }
    if (typeof prev === "function") {
      return prev(m);
    }
  };
})();

// ======================= Trạng thái cầu nối (chức năng do máy chủ gửi) + khóa console/chat =======================
(function () {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }
  var banner = $("bridge-banner");
  var panel = $("console-panel");
  if (!banner) {
    return;
  }
  var tick = null;
  var until = 0;
  var last = null;
  var hideT = null;
  function say(txt, cls) {
    banner.className = "bridge-banner" + (cls ? " " + cls : "");
    banner.textContent = "";
    var d = document.createElement("span");
    d.className = "dot";
    banner.appendChild(d);
    var t = document.createElement("span");
    t.className = "txt";
    t.textContent = txt;
    banner.appendChild(t);
  }
  function lock(on) {
    document.documentElement.classList.toggle("fx-feat-locked", on);
    if (panel) {
      panel.classList.toggle("fx-locked", on);
    }
    var inp = $("cmd-input");
    if (inp) {
      inp.disabled = on;
    }
    if (on) {
      var l = $("logs");
      if (l) {
        l.textContent = "";
      }
    }
  }
  function toast(m) {
    try {
      window.dispatchEvent(new CustomEvent("fx-toast", {
        detail: m
      }));
    } catch (_) {}
  }
  function countdown(prefix) {
    clearInterval(tick);
    function upd() {
      var s = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      var tx = banner.querySelector(".txt");
      if (tx) {
        tx.textContent = prefix + " (" + (s >= 60 ? Math.floor(s / 60) + " phút " + s % 60 + " s" : s + " s") + ")";
      }
      if (!s) {
        clearInterval(tick);
      }
    }
    upd();
    tick = setInterval(upd, 500);
  }
  function show(m) {
    clearInterval(tick);
    clearTimeout(hideT);
    last = m;
    switch (m.state) {
      case "connecting":
        lock(true);
        say("Đang kết nối máy chủ…");
        break;
      case "pending":
        lock(true);
        say("Đã gửi yêu cầu, đang chờ admin duyệt…");
        break;
      case "approved":
        lock(true);
        until = Date.now() + (m.eta || 60) * 1000;
        say("Đã được duyệt. Chờ máy chủ gửi chức năng");
        countdown("Đã được duyệt. Chờ máy chủ gửi chức năng");
        break;
      case "wait":
        lock(true);
        until = Date.now() + (m.eta || 180) * 1000;
        say("Chờ máy chủ gửi chức năng");
        countdown("Chờ máy chủ gửi chức năng");
        break;
      case "denied":
        lock(true);
        say(m.msg || "May Bel Qua Tinh Sai Chua Ak", "bad");
        toast(m.msg || "May Bel Qua Tinh Sai Chua Ak");
        break;
      case "error":
        lock(true);
        say(m.msg || "Lỗi kết nối máy chủ", "bad");
        break;
      case "wiped":
        lock(true);
        say((m.msg || "Mất kết nối") + ". Chức năng đã bị xóa, đợi máy chủ gửi lại.", "bad");
        break;
      case "dropped":
        until = Date.now() + (m.eta || 90) * 1000;
        say("Mất kết nối máy chủ, đang nối lại… (các acc vẫn chạy)", "bad");
        countdown("Mất kết nối máy chủ, đang nối lại. Nếu không được sẽ dừng sau");
        break;
      case "ready":
        lock(false);
        say("Đã nhận chức năng từ máy chủ", "ok");
        hideT = setTimeout(function () {
          banner.classList.add("hidden");
        }, 5000);
        break;
      case "idle":
        lock(true);
        banner.classList.add("hidden");
        break;
    }
  }
  // theo dõi acc đang chạy; nếu chức năng bị xóa vì mất kết nối thì tự chạy lại khi nhận được chức năng
  var running = {};
  var toRestart = null;
  var api2 = window.botafk;
  try {
    if (api2 && api2.onBridge) {
      api2.onBridge(function (m) { window.__fxMsg(m); });
    }
  } catch (_) {}
  try {
    if (api2 && api2.onEvent) {
      api2.onEvent(function (ev) {
        if (ev && ev.type === "status" && ev.id) {
          if (ev.status && ev.status !== "stopped") {
            running[ev.id] = true;
          } else if (!toRestart || !toRestart.snap) {
            delete running[ev.id];
          }
        }
      });
    }
  } catch (_) {}
  function restartAll() {
    var ids = toRestart;
    toRestart = null;
    if (!ids || !ids.length || !api2) {
      return;
    }
    var i = 0;
    (function next() {
      if (i >= ids.length) {
        return;
      }
      var id = ids[i++];
      try {
        api2.startAccount(id);
      } catch (_) {}
      setTimeout(next, 1500);
    })();
    toast("Đã nhận lại chức năng, đang chạy lại " + ids.length + " acc");
  }
  var prev = window.__fxMsg;
  window.__fxMsg = function (m) {
    if (m && m.kind === "fx-note") {
      toast(m.text);
      return;
    }
    if (m && m.kind === "bridge") {
      if (m.wipe && m.restart && !toRestart) {
        toRestart = Object.keys(running);
        toRestart.snap = true;
      } else if (m.wipe && !m.restart) {
        toRestart = null;
      }
      if (m.state === "ready" && toRestart) {
        var ids = toRestart.slice();
        toRestart = ids;
        setTimeout(restartAll, 800);
      }
      if (m.state === "ready" || m.wipe && !m.restart) {
        if (m.state === "ready") {
          running = {};
        }
      }
      show(m);
      return;
    }
    if (typeof prev === "function") {
      return prev(m);
    }
  };
  lock(true);
  try {
    console.log("@@FX@@" + JSON.stringify({
      t: "bridgeget"
    }));
  } catch (_) {}
})();

// ======================= Giới hạn số dòng console (nhẹ RAM) =======================
(function () {
  'use strict';

  var logs = document.getElementById("logs");
  if (!logs || !window.MutationObserver) {
    return;
  }
  var MAX = 400;
  var busy = false;
  new MutationObserver(function () {
    if (busy) {
      return;
    }
    busy = true;
    requestAnimationFrame(function () {
      busy = false;
      var n = logs.childNodes.length;
      while (n-- > MAX) {
        logs.removeChild(logs.firstChild);
      }
    });
  }).observe(logs, {
    childList: true
  });
})();
// Khóa/ẩn theo key chức năng: chỉ áp dụng cho các nút ở thanh chức năng chính (Automine/Fightbot/Click UI)
(function () {
  function run() {
    var api = window.botafk;
    if (!api || !api.keyState) return;
    var MAP = { mine: 'automine', fight: 'fightbot', cui: 'clickui' };
    function apply(features) {
      var set = new Set(features || []);
      Object.keys(MAP).forEach(function (fx) {
        var el = document.getElementById('fx-' + fx);
        if (el) el.hidden = !set.has(MAP[fx]);
      });
    }
    api.keyState().then(function (s) { apply(s && s.features); }).catch(function () {});
    if (api.onEvent) {
      api.onEvent(function (ev) {
        if (ev && ev.type === 'keys') apply(ev.features);
      });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
;
/* ===== extra.js ===== */
// Secret-AF: phần cài đặt bổ sung (ore picker, lệnh khởi động, tự sửa đồ, anti drop, potara, V2) + gộp vào lệnh "!automine set" / "!fightbot set".
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'sa.x.';
  function load(k, d) { try { return Object.assign({}, d, JSON.parse(localStorage.getItem(KEY + k) || '{}')); } catch (_) { return Object.assign({}, d); } }
  function save(k, v) { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (_) {} }
  var DEF = {
    am: { startOn: true, startCmds: [{ cmd: '/spawn', wait: 10 }], autoTool: true, repair: { on: true, pct: 5, cmd: '/fix hand', cd: 30 } },
    fb: { autoDrop: { on: false, keep: [], ms: 350 }, potara: { on: true, max: 40 }, repair: { on: true, pct: 5, cmd: '/repair', cd: 30 } }
  };
  var X = { am: load('am', DEF.am), fb: load('fb', DEF.fb) };
  X.fb.autoDrop = Object.assign({ on: false, keep: [], ms: 350 }, X.fb.autoDrop || {});
  window.__mergeSet = function (line, k) {
    var re = k === 'am' ? /^(!automine\s+set\s+)([\s\S]*)$/i : /^(!fightbot\s+set\s+)([\s\S]*)$/i, m = re.exec(line);
    if (!m) return line;
    if (k === 'fb') { try { var av = localStorage.getItem('botafk.antidrop'); X.fb.autoDrop.keep = String(av == null ? 'blaze_rod' : av).split(',').map(function (x) { return x.trim(); }).filter(Boolean); } catch (_) {} }
    try { return m[1] + JSON.stringify(Object.assign(JSON.parse(m[2]), X[k])); } catch (_) { return line; }
  };

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function chk(label, val, on) { var l = el('label', 'check'); l.appendChild(el('span', '', label)); var i = el('input'); i.type = 'checkbox'; i.checked = !!val; i.onchange = function () { on(i.checked); }; l.appendChild(i); return l; }
  function numF(label, val, lo, hi, on) { var l = el('label', '', label + ' '); var i = el('input'); i.type = 'number'; i.min = lo; i.max = hi; i.value = val; i.onchange = function () { on(Math.max(lo, Math.min(hi, Number(i.value) || lo))); }; l.appendChild(i); return l; }
  function txtF(label, val, on) { var l = el('label', '', label + ' '); var i = el('input'); i.value = val; i.autocomplete = 'off'; i.onchange = function () { on(i.value.trim()); }; l.appendChild(i); return l; }
  function section(title) { return el('div', 'sub-title', title); }
  function before(modalId, nodes) {
    var m = $(modalId); if (!m) return;
    var anchor = m.querySelector('.modal-actions'); if (!anchor) return;
    nodes.forEach(function (n) { anchor.parentNode.insertBefore(n, anchor); });
  }

  // ---------- danh sách quặng / block có tìm kiếm ----------
  var BLOCKS = ('coal_ore deepslate_coal_ore iron_ore deepslate_iron_ore copper_ore deepslate_copper_ore gold_ore deepslate_gold_ore nether_gold_ore redstone_ore deepslate_redstone_ore lapis_ore deepslate_lapis_ore diamond_ore deepslate_diamond_ore emerald_ore deepslate_emerald_ore nether_quartz_ore ancient_debris raw_iron_block raw_gold_block raw_copper_block coal_block iron_block gold_block diamond_block emerald_block lapis_block redstone_block netherite_block amethyst_block budding_amethyst spawner ' +
    'stone deepslate cobblestone cobbled_deepslate granite diorite andesite tuff calcite dripstone_block dirt coarse_dirt grass_block podzol mycelium sand red_sand gravel clay mud sandstone red_sandstone netherrack basalt smooth_basalt blackstone end_stone obsidian crying_obsidian glowstone magma_block soul_sand soul_soil ice packed_ice blue_ice snow_block terracotta ' +
    'oak_log spruce_log birch_log jungle_log acacia_log dark_oak_log mangrove_log cherry_log crimson_stem warped_stem oak_leaves cactus sugar_cane bamboo pumpkin melon wheat carrots potatoes nether_wart kelp sea_lantern bookshelf bone_block hay_block').split(' ');

  var ITEMS = ('player_head zombie_head skeleton_skull creeper_head dragon_head gold_ingot gold_nugget iron_ingot copper_ingot netherite_ingot netherite_scrap diamond emerald lapis_lazuli redstone coal charcoal quartz amethyst_shard raw_iron raw_gold raw_copper blaze_rod blaze_powder ender_pearl ender_eye nether_star ghast_tear slime_ball magma_cream gunpowder bone bone_meal string feather leather rotten_flesh spider_eye prismarine_shard shulker_shell elytra totem_of_undying enchanted_golden_apple golden_apple golden_carrot experience_bottle name_tag saddle trident bow crossbow arrow shield diamond_sword netherite_sword diamond_pickaxe netherite_pickaxe diamond_axe netherite_axe diamond_shovel netherite_shovel diamond_hoe netherite_hoe iron_sword iron_pickaxe golden_sword golden_pickaxe bucket water_bucket lava_bucket milk_bucket cooked_beef cooked_porkchop cooked_chicken cooked_mutton bread baked_potato candle white_candle shulker_box ender_chest enchanted_book book paper map compass clock fishing_rod shears flint_and_steel torch ladder cobweb tnt end_crystal respawn_anchor beacon conduit').split(' ');
  var ALL = Array.from(new Set(ITEMS.concat(BLOCKS)));
  // Danh sách item đầy đủ hơn: sinh theo họ (màu, gỗ, công cụ, giáp) + item lẻ
  (function () {
    var C = 'white orange magenta light_blue yellow lime pink gray light_gray cyan purple blue brown green red black'.split(' '),
      W = 'oak spruce birch jungle acacia dark_oak mangrove cherry bamboo crimson warped'.split(' '), M = 'wooden stone iron golden diamond netherite'.split(' '), g = [];
    C.forEach(function (c) { ['wool', 'carpet', 'concrete', 'concrete_powder', 'terracotta', 'glazed_terracotta', 'stained_glass', 'stained_glass_pane', 'banner', 'bed', 'shulker_box', 'candle', 'dye'].forEach(function (t) { g.push(c + '_' + t); }); });
    W.forEach(function (w) { ['log', 'planks', 'stairs', 'slab', 'fence', 'fence_gate', 'door', 'trapdoor', 'button', 'pressure_plate', 'sign', 'boat', 'sapling', 'leaves'].forEach(function (t) { g.push(w + '_' + t); }); });
    M.forEach(function (m) { ['sword', 'pickaxe', 'axe', 'shovel', 'hoe'].forEach(function (t) { g.push(m + '_' + t); }); });
    ['iron', 'golden', 'diamond', 'netherite', 'chainmail', 'leather'].forEach(function (m) { ['helmet', 'chestplate', 'leggings', 'boots'].forEach(function (t) { g.push(m + '_' + t); }); });
    ('wither_skeleton_skull cooked_salmon cooked_cod beef porkchop chicken mutton melon_slice sweet_berries cookie cake pumpkin_pie apple carrot potato anvil chest barrel furnace blast_furnace smoker crafting_table enchanting_table brewing_stand lantern soul_torch lead stick sugar wheat_seeds glass_bottle potion splash_potion lingering_potion firework_rocket firework_star turtle_helmet heart_of_the_sea nautilus_shell phantom_membrane rabbit_foot dragon_breath honey_bottle honeycomb spectral_arrow tipped_arrow writable_book bedrock').split(' ').forEach(function (x) { g.push(x); });
    ALL = Array.from(new Set(ALL.concat(g))).sort();
  })();

  function picker(input, src, hint) {
    if (!input || input.dataset.picker) return;
    src = src || BLOCKS;
    var known = new Set(src);
    input.dataset.picker = '1'; input.style.display = 'none';
    var box = el('div', 'orepick'), chips = el('div', 'op-chips'), q = el('input', 'op-q'), list = el('div', 'op-list');
    q.placeholder = (hint || 'Tìm block') + '... (Enter để thêm tên tự gõ)'; q.autocomplete = 'off';
    box.appendChild(chips); box.appendChild(q); box.appendChild(list); input.parentNode.insertBefore(box, input.nextSibling);
    var sel = new Set();
    function read() { sel = new Set(input.value.split(',').map(function (s) { return s.trim().toLowerCase().replace(/^minecraft:/, '').replace(/\s+/g, '_'); }).filter(Boolean)); }
    function write() { input.value = Array.from(sel).join(', '); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); }
    function render() {
      chips.innerHTML = '';
      sel.forEach(function (n) { var c = el('span', 'op-chip' + (known.has(n) ? '' : ' unk'), n + ' ×'); if (!known.has(n)) c.title = 'Tên này không có trong danh sách gợi ý, kiểm tra lại chính tả (vd: player_head)'; c.onclick = function () { sel.delete(n); write(); render(); }; chips.appendChild(c); });
      if (!sel.size) chips.appendChild(el('span', 'muted', 'Trống = đào mọi block'));
      var f = q.value.trim().toLowerCase().replace(/\s+/g, '_');
      list.innerHTML = '';
      src.filter(function (n) { return !f || n.indexOf(f) >= 0; }).slice(0, 300).forEach(function (n) {
        var r = el('div', 'op-row' + (sel.has(n) ? ' on' : ''), '<span>' + n.replace(/_/g, ' ') + '</span><i>' + (sel.has(n) ? '✓' : '+') + '</i>');
        r.onclick = function () { if (sel.has(n)) sel.delete(n); else sel.add(n); write(); render(); };
        list.appendChild(r);
      });
    }
    q.oninput = render;
    q.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); var v = q.value.trim().toLowerCase().replace(/^minecraft:/, '').replace(/\s+/g, '_'); if (v) { sel.add(v); q.value = ''; write(); render(); } } };
    var modal = input.closest('.modal');
    if (modal) new MutationObserver(function () { if (!modal.classList.contains('hidden')) { read(); render(); } }).observe(modal, { attributes: true, attributeFilter: ['class'] });
    input.addEventListener('sa-sync', function () { read(); render(); });
    read(); render(); setTimeout(function () { read(); render(); }, 400);
  }

  // nhóm thu gọn: tiêu đề + mô tả ngắn, nội dung đặt trong host
  function group(title, sub, nodes, open) {
    var d = el('details', 'fsec'); if (open) d.open = true;
    d.appendChild(el('summary', '', '<b>' + title + '</b><small>' + sub + '</small>'));
    var body = el('div', 'fbody'); nodes.forEach(function (n) { body.appendChild(n); }); d.appendChild(body);
    return d;
  }
  function fill(id, nodes) { var h = $(id); if (!h) return false; nodes.forEach(function (n) { h.appendChild(n); }); return true; }

  // ---------- Automine: lệnh khởi động + auto tool + sửa đồ ----------
  function buildAm() {
    var a = X.am, host = $('am-extra'); if (!host) return;
    var cmds = [];
    cmds.push(chk('Bật (tắt = đào ngay, không gõ lệnh nào)', a.startOn, function (v) { a.startOn = v; save('am', a); }));
    var box = el('div', 'pts');
    function draw() {
      box.innerHTML = '';
      a.startCmds.forEach(function (c, i) {
        var r = el('div', 'row'), t = el('input', 'grow'); t.value = c.cmd; t.placeholder = '/spawn, /home, /warp ...';
        var w = el('input'); w.type = 'number'; w.min = 0; w.max = 120; w.value = c.wait; w.style.width = '80px'; w.title = 'Đợi (giây)';
        var d = el('button', 'btn ghost danger', '×'); d.type = 'button';
        t.onchange = function () { c.cmd = t.value.trim(); save('am', a); }; w.onchange = function () { c.wait = Math.max(0, Math.min(120, Number(w.value) || 0)); save('am', a); };
        d.onclick = function () { a.startCmds.splice(i, 1); save('am', a); draw(); };
        r.appendChild(t); r.appendChild(w); r.appendChild(el('span', 'muted', 'giây')); r.appendChild(d); box.appendChild(r);
      });
    }
    draw(); cmds.push(box);
    var add = el('button', 'btn ghost', '+ Thêm lệnh'); add.type = 'button'; add.onclick = function () { a.startCmds.push({ cmd: '/home', wait: 5 }); save('am', a); draw(); }; cmds.push(add);
    host.appendChild(group('Lệnh chạy trước khi đào', 'Gõ lần lượt rồi mới đào', cmds, false));
    host.appendChild(group('Công cụ và độ bền', 'Tự cầm đúng công cụ, tự sửa', [
      chk('Auto Tool: đào block nào thì cầm đúng công cụ đó', a.autoTool, function (v) { a.autoTool = v; save('am', a); }),
      chk('Tự sửa khi công cụ sắp hỏng', a.repair.on, function (v) { a.repair.on = v; save('am', a); }),
      numF('Sửa khi độ bền còn ≤ (%)', a.repair.pct, 1, 90, function (v) { a.repair.pct = v; save('am', a); }),
      txtF('Lệnh sửa (/fix hand hoặc /repair)', a.repair.cmd, function (v) { a.repair.cmd = v || '/fix hand'; save('am', a); })
    ], false));
    var spawn = $('am-wait'); if (spawn && spawn.closest('label')) spawn.closest('label').style.display = 'none';
  }

  // ---------- Fightbot ----------
  function buildFb() {
    var f = X.fb;
    fill('fx-drop', [
      chk('Bật Autodrop all: vứt mọi item trừ Anti drop (Cài đặt), vàng/nến, kiếm, đầu người chơi, ô đã khóa', f.autoDrop.on, function (v) { f.autoDrop.on = v; save('fb', f); }),
      numF('Delay giữa mỗi lần vứt (ms, 100–5000)', f.autoDrop.ms, 100, 5000, function (v) { f.autoDrop.ms = v; save('fb', f); })
    ]);
    fill('fx-potara', [
      chk('Sau khi sang warp: gõ /potara tới khi hợp thể thành công', f.potara.on, function (v) { f.potara.on = v; save('fb', f); }),
      numF('Thử tối đa (lần)', f.potara.max, 1, 200, function (v) { f.potara.max = v; save('fb', f); })
    ]);
    fill('fx-repair', [
      chk('Tự sửa khi item đang cầm sắp hỏng', f.repair.on, function (v) { f.repair.on = v; save('fb', f); }),
      numF('Sửa khi độ bền còn ≤ (%)', f.repair.pct, 1, 90, function (v) { f.repair.pct = v; save('fb', f); }),
      txtF('Lệnh sửa', f.repair.cmd, function (v) { f.repair.cmd = v || '/repair'; save('fb', f); })
    ]);
    var b = $('fight-esp'); if (b) b.onclick = function () { var e = $('fx-esp'); if (e) e.click(); };
  }

  function init() {
    try { buildAm(); } catch (e) { console.error(e); }
    try { buildFb(); } catch (e) { console.error(e); }
    picker($('am-blocks'), BLOCKS, 'Tìm quặng / block'); picker($('nk-list'), BLOCKS, 'Tìm quặng / block'); picker($('set-antidrop'), ALL, 'Tìm item');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
;
/* ===== ui3.js ===== */
// Secret-AF v3: dựng lại bố cục bằng cách DI CHUYỂN các phần tử có sẵn (giữ nguyên ID + sự kiện) nên app.js / fx.js / extra.js vẫn chạy.
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var H = document.documentElement, KEY = 'sa.v3';
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function el(t, c, h) { var e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; }
  function ev(n, t) { n.dispatchEvent(new Event(t, { bubbles: true })); }
  var S = { aurora: 1, part: 1, glow: 1, spd: 1, fs: 14, r: 16, bgc: '', panc: '', img: '', imgSync: 1, imgDim: 35 };
  try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (_) {}
  function applyS() {
    H.classList.toggle('v3-aurora-off', !S.aurora); H.classList.toggle('v3-part-off', !S.part); H.classList.toggle('v3-glow-off', !S.glow);
    H.style.setProperty('--spd', S.spd);
    var ph = document.getElementById('v3-photo');
    if (ph) { if (S.img) { ph.style.backgroundImage = 'url("' + S.img + '")'; ph.style.opacity = (S.imgDim / 100).toFixed(2); ph.hidden = false; } else { ph.style.backgroundImage = ''; ph.hidden = true; } }
    if (S.bgc) { H.style.setProperty('--bg', S.bgc); H.style.setProperty('--panel', S.panc || S.bgc); } else { H.style.removeProperty('--bg'); H.style.removeProperty('--panel'); } H.style.setProperty('--fs', S.fs + 'px'); H.style.setProperty('--r', S.r + 'px');
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (_) {}
  }
  var IC = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    set: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/></svg>'
  };
  // icon + mô tả + nhãn trạng thái cho từng nút chức năng (nút gốc giữ nguyên, chỉ thêm giao diện)
  var FNMAP = {
    sell: ['💰', 'Tự bán quái vật vào spawner', 'TẮT', 'BẬT'],
    mine: ['⛏', 'Tự đào mỏ · chế độ Nuker', 'TẮT', 'BẬT'], fight: ['⚔', 'Tự đánh người chơi', 'TẮT', 'BẬT'],
    cui: ['🖱', 'Thao tác giao diện bằng chuột', 'MỞ', 'MỞ'], autoeat: ['🍖', 'Tự ăn khi đói', 'TẮT', 'BẬT'], esp: ['◎', 'Radar người chơi', 'TẮT', 'BẬT'],
  };
  function deco(b) {
    if (b.querySelector('.v3-w')) return;
    var k = b.dataset.fn || b.dataset.fx, m = FNMAP[k]; if (!m) return;
    var t = b.textContent.trim();
    b.setAttribute('data-ic', m[0]); b.setAttribute('data-off', m[2]); b.setAttribute('data-on', m[3]);
    b.innerHTML = '<span class="v3-w"><b>' + esc(t) + '</b><small>' + esc(m[1]) + '</small></span>';
  }

  var page = 'home', startAt = 0;
  function go(p) {
    page = p;
    $$('.v3-n[data-p]').forEach(function (b) { b.classList.toggle('on', b.dataset.p === p); });
    $('#v3-home').classList.toggle('hidden', p !== 'home'); $('#v3-set').classList.toggle('hidden', p !== 'set');
    $('#v3-t').textContent = p === 'set' ? 'Cài đặt' : 'Trang chủ';
    $('#v3-s').textContent = p === 'set' ? 'Tùy chỉnh ứng dụng' : 'Tổng quan và điều khiển';
  }

  function build() {
    var main = $('#main'); if (!main || main.dataset.v3) return; main.dataset.v3 = '1';
    // lấy các phần tử cần giữ TRƯỚC khi xóa khung cũ
    var R = {};
    ['lic-info', 'btn-logout', 'btn-add', 'bridge-banner', 'cards', 'empty', 'side-empty', 'side-buttons', 'console-panel'].forEach(function (id) { R[id] = $('#' + id); });
    var setModal = $('#settings-modal'), themeModal = $('#theme-modal');
    var N = {
      ad: $('#set-antidrop') && $('#set-antidrop').closest('.set-section'),
      key: $('#key-box') && $('#key-box').closest('.set-section'),
      upd: $('#btn-update') && $('#btn-update').closest('.set-section'),
      anim: $('#fx-anim') && $('#fx-anim').closest('label'),
      liq: $('#fx-liquid') && $('#fx-liquid').closest('label'), liqRow: $('#fx-liquid-row'),
      prev: themeModal && $('.theme-preview', themeModal),
      c1: $('#th-accent') && $('#th-accent').closest('.theme-row'), c2: $('#th-accent2') && $('#th-accent2').closest('.theme-row'), rb: $('#th-rainbow') && $('#th-rainbow').closest('.theme-row'),
      bgT: $('#th-bg') && $('#th-bg').previousElementSibling, bg: $('#th-bg'), glass: $('#th-glass-row')
    };
    var v3 = el('div', 'v3');
    v3.innerHTML =
      '<aside class="v3-side"><div class="v3-brand"><img class="v3-logo" src="logo.png" alt=""><div><b>Secret-AF</b><small>v3.7.1</small></div></div>' +
      '<nav><button class="v3-n on" data-p="home">' + IC.home + 'Trang chủ</button><button class="v3-n" data-p="set">' + IC.set + 'Cài đặt</button><button class="v3-n" data-p="help">' + IC.help + 'Hướng dẫn</button></nav>' +
      '<div class="v3-sec">Tab acc game</div><div id="v3-accs" class="v3-accs"></div><div id="v3-addslot"></div></aside>' +
      '<div class="v3-main"><header class="v3-top"><div><h1 id="v3-t">Trang chủ</h1><p id="v3-s">Tổng quan và điều khiển</p></div><div class="v3-topr" id="v3-topr"><span id="v3-key">Key: —</span></div></header><div id="v3-banner"></div>' +
      '<div class="v3-page" id="v3-home"><div class="v3-stats"><div class="v3-stat"><small>Chức năng đang bật</small><b id="v3-on">0 / 0</b></div><div class="v3-stat"><small>Key còn hạn</small><b id="v3-days">—</b></div><div class="v3-stat"><small>Phiên làm việc</small><b id="v3-time">00:00:00</b></div></div>' +
      '<section class="v3-card"><h2>Chức năng của acc <small id="v3-who"></small></h2><p class="v3-hint">Chuột trái: bật/tắt · Chuột phải: mở cài đặt của chức năng</p><div id="v3-fnslot"></div></section><div id="v3-conslot"></div></div>' +
      '<div class="v3-page hidden" id="v3-set"><section class="v3-card"><div class="v3-tabs" id="v3-stabs" role="tablist"></div><div id="v3-sbody"></div></section></div></div>';
    var store = el('div', 'hidden'); store.id = 'v3-store';
    var old = el('aside', 'hidden'); old.id = 'sidebar';
    main.innerHTML = ''; main.appendChild(v3); main.appendChild(store); main.appendChild(old);
    // đưa phần tử cũ về chỗ mới
    var topr = $('#v3-topr'); if (R['lic-info']) topr.insertBefore(R['lic-info'], topr.firstChild); if (R['btn-logout']) topr.appendChild(R['btn-logout']);
    if (R['btn-add']) $('#v3-addslot').appendChild(R['btn-add']);
    if (R['bridge-banner']) $('#v3-banner').appendChild(R['bridge-banner']);
    if (R['cards']) store.appendChild(R['cards']); if (R['empty']) store.appendChild(R['empty']);
    var fs = $('#v3-fnslot'); if (R['side-empty']) fs.appendChild(R['side-empty']); if (R['side-buttons']) fs.appendChild(R['side-buttons']);
    if (R['console-panel']) { var cp = R['console-panel']; cp.insertBefore(el('div', 'v3-ctitle', 'Nhật ký'), cp.firstChild); $('#v3-conslot').appendChild(cp); cp.classList.remove('hidden'); }
    if (!document.getElementById('v3-photo')) { var pe = el('div'); pe.id = 'v3-photo'; pe.hidden = true; document.body.insertBefore(pe, document.body.firstChild); }
    var lg = $('.v3-logo'); if (lg) lg.onerror = function () { lg.onerror = null; lg.src = 'logo.svg'; };
    $('#btn-settings') && ($('#btn-settings').style.display = 'none');
    buildSettings(N, setModal, themeModal);

    $$('.v3-n').forEach(function (b) {
      b.onclick = function () { if (b.dataset.p === 'help') { var h = $('.fn[data-fn="help"]'); if (h) h.click(); return; } go(b.dataset.p); };
    });
    var sb = $('#side-buttons');
    if (sb) { $$('.fn,.fx-fn', sb).forEach(deco); new MutationObserver(function () { $$('.fn,.fx-fn', sb).forEach(deco); stats(); }).observe(sb, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] }); }
    var cards = $('#cards');
    if (cards) { new MutationObserver(sched).observe(cards, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }); rebuild(); }
    if (R['lic-info']) new MutationObserver(keyInfo).observe(R['lic-info'], { childList: true, characterData: true, subtree: true });
    new MutationObserver(function () { if (!main.classList.contains('hidden') && !startAt) startAt = Date.now(); if (main.classList.contains('hidden')) startAt = 0; }).observe(main, { attributes: true, attributeFilter: ['class'] });
    if (!main.classList.contains('hidden')) startAt = Date.now();
    setInterval(tick, 1000); tick(); stats(); keyInfo();
  }

  // ---------- thẻ acc (đồng bộ từ #cards của app.js) ----------
  var raf = 0, auto = false;
  function sched() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; rebuild(); }); }
  function act(card, label) { var bs = $$('button', card); for (var i = 0; i < bs.length; i++) if (bs[i].textContent.trim() === label) { bs[i].click(); return; } }
  function rebuild() {
    var box = $('#v3-accs'); if (!box) return; box.innerHTML = '';
    var cs = $$('#cards .card');
    if (!cs.length) box.appendChild(el('div', 'v3-noacc', 'Chưa có acc. Bấm “+ Thêm acc”.'));
    var sel = null;
    cs.forEach(function (c, i) {
      var h = $('h4', c), p = $('.pill', c), st = p ? p.textContent : '', cl = p ? p.className : '', on = c.classList.contains('selected'), run = c.classList.contains('running');
      if (on) sel = h ? h.textContent : '';
      var tone = /online|sellspawner|autofarm|automine/.test(cl) ? 'g' : /connecting|reconnecting/.test(cl) ? 'w' : /wrongpass|offline/.test(cl) ? 'r' : '';
      var b = el('button', 'v3-acc ' + tone + (on ? ' on' : ''), '<span class="dot"></span><span><b>' + esc(h ? h.textContent : '') + '</b><small>' + esc(st) + ' · ' + $$('.tag.on', c).length + ' chức năng</small></span>');
      b.style.animationDelay = i * 0.05 + 's';
      b.onclick = function () { c.click(); };
      b.oncontextmenu = function (e) { e.preventDefault(); menu(e.clientX, e.clientY, c, run); };
      box.appendChild(b);
    });
    $('#v3-who').textContent = sel ? '· ' + sel : '';
    if (cs.length && !sel && !auto) { auto = true; cs[0].click(); }
    stats();
  }
  function menu(x, y, card, run) {
    var o = $('.v3-ctx'); if (o) o.remove();
    var m = el('div', 'v3-ctx');
    m.style.left = Math.min(x, innerWidth - 210) + 'px'; m.style.top = Math.min(y, innerHeight - 170) + 'px';
    m.innerHTML = '<button data-a="Sửa">✏️ Chỉnh sửa acc</button><button data-a="' + (run ? 'Dừng' : 'Chạy') + '">' + (run ? '⏹ Dừng acc' : '▶ Chạy acc') + '</button><button class="x" data-a="Xóa">🗑 Xóa acc</button>';
    document.body.appendChild(m);
    m.onclick = function (e) { var a = e.target.dataset && e.target.dataset.a; if (!a) return; m.remove(); act(card, a); };
    setTimeout(function () { document.addEventListener('click', function f() { m.remove(); document.removeEventListener('click', f); }); document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { m.remove(); document.removeEventListener('keydown', k); } }); }, 0);
  }

  // ---------- số liệu trang chủ ----------
  function stats() {
    var n = $('#v3-on'); if (!n) return;
    var bs = $$('#side-buttons .fn,#side-buttons .fx-fn').filter(function (b) { return !b.hidden && !/^(console|help|automine)$/.test(b.dataset.fn || '') && !b.classList.contains('locked') && b.dataset.fx !== 'cui' && b.dataset.fx !== 'esp'; });
    n.textContent = bs.filter(function (b) { return b.classList.contains('on'); }).length + ' / ' + bs.length;
  }
  function keyInfo() {
    var li = $('#lic-info'), t = li ? li.textContent : '', d = null, m;
    if ((m = t.match(/(\d{1,2}):(\d{2}):(\d{2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/))) d = new Date(+m[6], +m[5] - 1, +m[4], +m[1], +m[2], +m[3]);
    else if ((m = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2}))?/))) d = new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0));
    var s = '—';
    if (d && !isNaN(d)) { var ms = d - Date.now(); s = ms <= 0 ? 'Hết hạn' : ms >= 864e5 ? Math.floor(ms / 864e5) + ' ngày' : ms >= 36e5 ? Math.floor(ms / 36e5) + ' giờ' : Math.max(1, Math.floor(ms / 6e4)) + ' phút'; }
    if ($('#v3-days')) $('#v3-days').textContent = s; if ($('#v3-key')) $('#v3-key').textContent = s === '—' ? 'Key: —' : 'Key còn ' + s;
  }
  function tick() {
    var s = startAt ? Math.floor((Date.now() - startAt) / 1000) : 0, p = function (x) { return String(x).padStart(2, '0'); };
    var t = $('#v3-time'); if (t) t.textContent = p(s / 3600 | 0) + ':' + p(s / 60 % 60 | 0) + ':' + p(s % 60);
    if (s % 30 === 0) keyInfo();
  }

  // ---------- trang Cài đặt ----------
  function sw(t, d, v, on) {
    var l = el('label', 'check set-switch', '<span class="set-text"><b>' + t + '</b><span class="muted">' + d + '</span></span>'), i = el('input'); i.type = 'checkbox'; i.checked = !!v; i.onchange = function () { on(i.checked); }; l.appendChild(i); return l;
  }
  function rng(t, min, max, step, v, on) {
    var r = el('div', 'theme-row', '<span>' + t + ' <b></b></span>'), i = el('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = v;
    var b = $('b', r); b.textContent = v; i.oninput = function () { b.textContent = i.value; on(+i.value); }; r.appendChild(i); return r;
  }
  // lấy 2 màu nổi bật nhất của ảnh (theo nhóm màu sắc độ bão hòa cao) rồi áp vào màu nhấn của app
  function syncFromImg(url) {
    var im = new Image();
    im.onload = function () {
      var cv = document.createElement('canvas'), W = 48, Hh = 48; cv.width = W; cv.height = Hh;
      var cx = cv.getContext('2d'); cx.drawImage(im, 0, 0, W, Hh);
      var d; try { d = cx.getImageData(0, 0, W, Hh).data; } catch (_) { return; }
      var bins = {}, i, r, g, b, mx, mn, l, sat, h, key, hue;
      for (i = 0; i < d.length; i += 4) {
        r = d[i] / 255; g = d[i + 1] / 255; b = d[i + 2] / 255;
        mx = Math.max(r, g, b); mn = Math.min(r, g, b); l = (mx + mn) / 2;
        sat = mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1));
        if (sat < 0.25 || l < 0.15 || l > 0.9) continue;
        if (mx === r) hue = ((g - b) / (mx - mn) + (g < b ? 6 : 0)); else if (mx === g) hue = (b - r) / (mx - mn) + 2; else hue = (r - g) / (mx - mn) + 4;
        key = Math.floor(((hue * 60) % 360) / 30);
        if (!bins[key]) bins[key] = { n: 0, r: 0, g: 0, b: 0 };
        var w = sat * (1 - Math.abs(l - 0.55)); bins[key].n += w; bins[key].r += r * w; bins[key].g += g * w; bins[key].b += b * w;
      }
      var arr = Object.keys(bins).map(function (k) { return bins[k]; }).sort(function (x, y) { return y.n - x.n; });
      function hex(c) { var t = function (v) { return Math.max(0, Math.min(255, Math.round(v * 255))).toString(16).padStart(2, '0'); }; return '#' + t(c.r) + t(c.g) + t(c.b); }
      function toHex(o) { return hex({ r: o.r / o.n, g: o.g / o.n, b: o.b / o.n }); }
      if (!arr.length || !arr[0].n) return;
      var a = toHex(arr[0]), b2 = arr[1] && arr[1].n ? toHex(arr[1]) : a;
      setColor('th-accent', a); setColor('th-accent2', b2);
      var pv = $('.v3-tpv'); if (pv) { pv.style.setProperty('--ta', a); pv.style.setProperty('--tb', b2); }
    };
    im.src = url;
  }

  function setColor(id, v) { var i = $('#' + id); if (!i) return; var rb = $('#th-rainbow'); if (rb && rb.checked) { rb.checked = false; ev(rb, 'change'); } i.value = v; ev(i, 'input'); ev(i, 'change'); }
  function buildSettings(N, setModal, themeModal) {
    var P = {};
    var ad = el('div', 'v3-pn v3-ad'); ad.innerHTML = '<h2>Anti drop 100%<span class="v3-badge">ƯU TIÊN CAO NHẤT</span></h2><p class="v3-hint">Item chọn ở đây luôn được giữ lại trong túi, thắng mọi chức năng khác. Gõ để tìm, bấm để chọn; Enter để thêm tên tự gõ.</p>';
    if (N.ad) ad.appendChild(N.ad); P.ad = ad;
    var fx = el('div', 'v3-pn');
    if (N.anim) fx.appendChild(N.anim);
    fx.appendChild(sw('Nền aurora', 'Vệt sáng trôi chậm phía sau', S.aurora, function (v) { S.aurora = v ? 1 : 0; applyS(); }));
    fx.appendChild(sw('Hạt nổi', 'Chấm sáng bay lơ lửng', S.part, function (v) { S.part = v ? 1 : 0; applyS(); }));
    fx.appendChild(sw('Vệt sáng theo chuột', 'Quầng sáng đi theo con trỏ', S.glow, function (v) { S.glow = v ? 1 : 0; applyS(); }));
    fx.appendChild(rng('Tốc độ hiệu ứng', 0.4, 2, 0.1, S.spd, function (v) { S.spd = v; applyS(); }));
    P.fx = fx;
    var co = el('div', 'v3-pn'); co.innerHTML = '<h2>Màu sắc</h2><p class="v3-hint">Đổi là áp dụng ngay.</p>';
    if (N.prev) co.appendChild(N.prev);
    var pr = [['#d9d4ff', '#8f7bff'], ['#9fe8ff', '#4f8cff'], ['#b8ffd9', '#2fcf8e'], ['#ffd1e8', '#ff5fa8'], ['#ffe3a3', '#ff9d3a'], ['#ffb3b3', '#ff5d73']];
    var row = el('div', 'theme-row', '<span>Bảng màu gợi ý</span>'), sws = el('div', 'v3-sw');
    pr.forEach(function (p, i) { var b = el('button'); b.type = 'button'; b.style.background = 'linear-gradient(135deg,' + p[0] + ',' + p[1] + ')'; b.setAttribute('aria-label', 'Bảng màu ' + (i + 1)); b.onclick = function () { setColor('th-accent', p[0]); setColor('th-accent2', p[1]); }; sws.appendChild(b); });
    row.appendChild(sws); co.appendChild(row);
    [N.c1, N.c2, N.rb].forEach(function (n) { if (n) co.appendChild(n); });
    P.co = co;
    var th = el('div', 'v3-pn v3-themes'); th.innerHTML = '<h2>Chủ đề</h2><p class="v3-hint">Chọn bộ chủ đề có sẵn, hoặc tự phối màu bên dưới. Áp dụng ngay và được nhớ lại lần sau.</p>';
    var grid = el('div', 'v3-tgrid');
    var PACKS = [
      { n: 'Graphite Lilac', a: '#d9d4ff', b: '#8f7bff', bg: 'default', g: 0 },
      { n: 'Ocean Glass', a: '#9fe8ff', b: '#4f8cff', bg: 'blur', g: 40 },
      { n: 'Emerald Night', a: '#b8ffd9', b: '#2fcf8e', bg: 'dark', g: 0 },
      { n: 'Sakura Pop', a: '#ffd1e8', b: '#ff5fa8', bg: 'default', g: 0 },
      { n: 'Solar Amber', a: '#ffe3a3', b: '#ff9d3a', bg: 'dark', g: 0 },
      { n: 'Crimson Ink', a: '#ffb3b3', b: '#ff5d73', bg: 'dark', g: 0 },
      { n: 'Paper Light', a: '#4f5bd5', b: '#8a6cf0', bg: 'light', g: 0 },
      { n: 'Aurora Rainbow', a: '#9fe8ff', b: '#ff5fa8', bg: 'dark', g: 0, rb: 1 }
    ];
    PACKS.forEach(function (p) {
      var c = el('button', 'v3-tcard'); c.type = 'button';
      c.style.setProperty('--ta', p.a); c.style.setProperty('--tb', p.b);
      c.innerHTML = '<span class="v3-tswatch"></span><b>' + esc(p.n) + '</b><small>' + p.a + ' · ' + p.b + '</small>';
      c.onclick = function () {
        if (p.rb) { var r = $('#th-rainbow'); if (r && !r.checked) { r.checked = true; ev(r, 'change'); } }
        else setColor('th-accent', p.a), setColor('th-accent2', p.b);
        var bgb = $('#th-bg button[data-bg="' + p.bg + '"]'); if (bgb) bgb.click();
        var gl = $('#th-glass'); if (gl && p.g) { gl.value = p.g; ev(gl, 'input'); }
        S.bgc = ''; S.panc = ''; applyS(); syncBuilder();
        $$('.v3-tcard', grid).forEach(function (x) { x.classList.toggle('on', x === c); });
      };
      grid.appendChild(c);
    });
    th.appendChild(grid);
    var bld = el('div', 'v3-bld'); bld.innerHTML = '<h3>Tự phối màu</h3>';
    var pv = el('div', 'v3-tpv', '<div class="v3-tpv-bar"></div><div class="v3-tpv-row"><span class="v3-tpv-btn">Nút chính</span><span class="v3-tpv-chip">BẬT</span><span class="v3-tpv-txt">Chữ & nền</span></div>');
    bld.appendChild(pv);
    var mk = function (label, val, on) { var l = el('label', 'v3-cp', '<span>' + label + '</span>'), i = el('input'); i.type = 'color'; i.value = val; i.oninput = function () { on(i.value); }; l.appendChild(i); return { l: l, i: i }; };
    var cA = mk('Màu nhấn', $('#th-accent') ? $('#th-accent').value : '#d9d4ff', function (v) { setColor('th-accent', v); pvSync(); });
    var cB = mk('Màu nhấn phụ', $('#th-accent2') ? $('#th-accent2').value : '#8f7bff', function (v) { setColor('th-accent2', v); pvSync(); });
    var cN = mk('Nền', S.bgc || '#07080c', function (v) { S.bgc = v; if (!S.panc) S.panc = v; applyS(); pvSync(); });
    var cP = mk('Bảng/thẻ', S.panc || '#12131b', function (v) { S.panc = v; applyS(); pvSync(); });
    var cw = el('div', 'v3-cps'); [cA.l, cB.l, cN.l, cP.l].forEach(function (x) { cw.appendChild(x); }); bld.appendChild(cw);
    var rs = el('button', 'btn v3-tred', 'Bỏ màu nền/thẻ tùy chỉnh'); rs.type = 'button';
    rs.onclick = function () { S.bgc = ''; S.panc = ''; applyS(); syncBuilder(); };
    bld.appendChild(rs);
    th.appendChild(bld);
    var up = el('div', 'v3-up'); up.innerHTML = '<h3>Ảnh nền tùy chỉnh</h3><p class="v3-hint">Tải ảnh (PNG/JPG/WebP). Ảnh được thu nhỏ và lưu trên máy này.</p>';
    var fi = el('input'); fi.type = 'file'; fi.accept = 'image/*'; fi.id = 'v3-bgfile'; fi.className = 'v3-hide';
    var bar = el('div', 'v3-upbar');
    var bUp = el('button', 'btn primary', 'Tải ảnh lên'); bUp.type = 'button'; bUp.onclick = function () { fi.click(); };
    var bRm = el('button', 'btn ghost', 'Xóa ảnh'); bRm.type = 'button';
    bRm.onclick = function () { S.img = ''; applyS(); };
    bar.appendChild(bUp); bar.appendChild(bRm); up.appendChild(fi); up.appendChild(bar);
    var dim = rng('Độ hiện ảnh (%)', 5, 90, 5, S.imgDim, function (v) { S.imgDim = v; applyS(); });
    up.appendChild(dim);
    up.appendChild(sw('Tự đồng bộ màu theo ảnh', 'Lấy màu nổi bật của ảnh làm màu nhấn và màu nhấn phụ', S.imgSync, function (v) { S.imgSync = v ? 1 : 0; applyS(); if (v && S.img) syncFromImg(S.img); }));
    th.appendChild(up);
    fi.onchange = function () {
      var f = fi.files && fi.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        var im = new Image();
        im.onload = function () {
          var m = 1600, k = Math.min(1, m / Math.max(im.width, im.height)), cv = document.createElement('canvas');
          cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
          cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
          var url = cv.toDataURL('image/jpeg', 0.85);
          S.img = url; applyS(); if (S.imgSync) syncFromImg(url); fi.value = '';
        };
        im.src = rd.result;
      };
      rd.readAsDataURL(f);
    };
    function pvSync() {
      var a = $('#th-accent') ? $('#th-accent').value : '#d9d4ff', b = $('#th-accent2') ? $('#th-accent2').value : '#8f7bff';
      pv.style.setProperty('--ta', a); pv.style.setProperty('--tb', b);
      pv.style.setProperty('--tbg', S.bgc || ''); pv.style.setProperty('--tpanel', S.panc || '');
    }
    function syncBuilder() { cA.i.value = ($('#th-accent') || {}).value || cA.i.value; cB.i.value = ($('#th-accent2') || {}).value || cB.i.value; cN.i.value = S.bgc || '#07080c'; cP.i.value = S.panc || '#12131b'; pvSync(); }
    pvSync();
    P.th = th;
    var ui = el('div', 'v3-pn'); ui.innerHTML = '<h2>Giao diện</h2>';
    if (N.bgT) ui.appendChild(N.bgT); if (N.bg) ui.appendChild(N.bg); if (N.glass) ui.appendChild(N.glass);
    if (N.liq) ui.appendChild(N.liq); if (N.liqRow) ui.appendChild(N.liqRow);
    ui.appendChild(rng('Cỡ chữ (px)', 12, 17, 1, S.fs, function (v) { S.fs = v; applyS(); }));
    ui.appendChild(rng('Bo góc (px)', 6, 26, 2, S.r, function (v) { S.r = v; applyS(); }));
    if (N.upd) ui.appendChild(N.upd);
    P.ui = ui;
    var cd = el('div', 'v3-pn'); cd.innerHTML = '<h2>Nhập code chức năng</h2><p class="v3-hint">Nhập key để mở khóa chức năng cho tài khoản này.</p>'; if (N.key) cd.appendChild(N.key); P.cd = cd;
    var T = [['ad', 'Anti drop'], ['fx', 'Hiệu ứng'], ['co', 'Màu sắc'], ['th', 'Chủ đề'], ['ui', 'Giao diện'], ['cd', 'Mã chức năng']], tb = $('#v3-stabs'), body = $('#v3-sbody');
    function show(k) { document.documentElement.classList.toggle('theme-peek', k === 'co' || k === 'th' || k === 'ui'); $$('.v3-tab', tb).forEach(function (b) { b.classList.toggle('on', b.dataset.k === k); }); Object.keys(P).forEach(function (x) { if (!P[x].parentNode) body.appendChild(P[x]); P[x].classList.toggle('hidden', x !== k); }); }
    T.forEach(function (t) { var b = el('button', 'v3-tab', t[1]); b.type = 'button'; b.dataset.k = t[0]; b.setAttribute('role', 'tab'); b.onclick = function () { show(t[0]); }; tb.appendChild(b); });
    show('ad');
    [setModal, themeModal].forEach(function (m) { if (m) m.classList.add('hidden'); });
  }

  // ---------- form acc: gom Tên hiển thị/Phiên bản vào "Tùy chọn thêm" + chọn loại proxy ----------
  function accForm() {
    var f = $('#acc-form'); if (!f || f.dataset.v3) return; f.dataset.v3 = '1';
    var lab = f.label && f.label.closest('label'), ver = f.version && f.version.closest('label');
    if (lab || ver) { var d = el('details', 'fsec', '<summary><b>Tùy chọn thêm</b><small>Tên hiển thị, phiên bản</small></summary>'), b = el('div', 'fbody'); d.appendChild(b); [lab, ver].forEach(function (n) { if (n) b.appendChild(n); }); f.insertBefore(d, $('#acc-msg') || null); }
    var px = f.proxy; if (!px) return;
    var pl = px.closest('label'); if (pl && pl.firstChild) { pl.firstChild.nodeValue = 'Proxy '; var mu = $('.muted', pl); if (mu) mu.textContent = '(không bắt buộc, host:port:user:pass)'; }
    var sel = el('select', 'v3-ptype'); sel.setAttribute('aria-label', 'Loại proxy');
    [['', 'Tự nhận (HTTP mặc định)'], ['http', 'HTTP'], ['https', 'HTTPS'], ['socks4', 'SOCKS4'], ['socks5', 'SOCKS5']].forEach(function (o) { var op = el('option'); op.value = o[0]; op.textContent = o[1]; sel.appendChild(op); });
    px.parentNode.insertBefore(sel, px);
    var fromField = function () { var m = /^(\w+):\/\//.exec(px.value.trim()); sel.value = m && /^(http|https|socks4|socks5)$/i.test(m[1]) ? m[1].toLowerCase() : ''; };
    sel.onchange = function () { var v = px.value.trim().replace(/^\w+:\/\//, ''); px.value = v && sel.value ? sel.value + '://' + v : v; };
    px.addEventListener('input', fromField);
    var mo = $('#modal'); if (mo) new MutationObserver(function () { if (!mo.classList.contains('hidden')) fromField(); }).observe(mo, { attributes: true, attributeFilter: ['class'] });
    // ---- checkbox "Không dùng proxy": tick vào thì ẩn luôn ô proxy + dropdown, xoá giá trị ----
    var noProxy = el('label', 'check'); noProxy.style.marginBottom = '8px';
    var noProxyChk = el('input'); noProxyChk.type = 'checkbox';
    noProxy.appendChild(noProxyChk); noProxy.appendChild(document.createTextNode(' Không dùng proxy'));
    pl.parentNode.insertBefore(noProxy, pl);
    var checkBtn = $('#acc-check-proxy');
    function applyNoProxy() {
      var on = noProxyChk.checked;
      pl.classList.toggle('hidden', on);
      sel.classList.toggle('hidden', on);
      if (checkBtn) checkBtn.classList.toggle('hidden', on);
      if (on) px.value = '';
    }
    noProxyChk.onchange = applyNoProxy;
    var mo2 = $('#modal'); if (mo2) new MutationObserver(function () { if (!mo2.classList.contains('hidden')) { noProxyChk.checked = !px.value.trim(); applyNoProxy(); } }).observe(mo2, { attributes: true, attributeFilter: ['class'] });
    noProxyChk.checked = !px.value.trim(); applyNoProxy();
  }

  // ---------- hiệu ứng con trỏ ----------
  function fxCursor() {
    var g = el('div'); g.id = 'v3-glow'; document.body.appendChild(g);
    addEventListener('pointermove', function (e) {
      g.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
      var c = e.target.closest && e.target.closest('.v3-card,.v3-stat');
      if (c) { var r = c.getBoundingClientRect(); c.style.setProperty('--mx', e.clientX - r.left + 'px'); c.style.setProperty('--my', e.clientY - r.top + 'px'); }
    }, { passive: true });
  }

  // ---------- đồng bộ giao diện cài đặt của mọi chức năng ----------
  function modals() {
    var M = {
      'modal': ['👤', 'Acc game', 'Server, tài khoản, proxy'],
      'fight-modal': ['⚔', 'Fightbot', 'Warp, tầm nhận, cơ chế đánh, vàng và nến'],
      'amine-modal': ['⛏', 'Automine', 'Vùng đào, tọa độ, trade và cất đồ'],
      'cui-modal': ['🖱', 'Click UI', 'Phản chiếu và ghi/phát lại thao tác'],
      'theme-modal': ['🎨', 'Giao diện', 'Màu sắc và nền'],
      'help-modal': ['❔', 'Hướng dẫn', 'Cách dùng từng chức năng']
    };
    Object.keys(M).forEach(function (id) {
      var m = $('#' + id); if (!m) return;
      var c = id === 'modal' ? $('#acc-form') : $('.modal-card', m); if (!c) return;
      var h = $('h3', c); if (!h) return;
      c.classList.add('v3-mc'); h.dataset.ic = M[id][0]; h.dataset.sub = M[id][2];
      if (h.firstChild && h.firstChild.nodeType === 3) h.firstChild.nodeValue = M[id][1] + ' ';
    });
  }

  function init() { applyS(); fxCursor(); try { build(); } catch (e) { console.error('ui3 build', e); } applyS(); try { accForm(); } catch (e) { console.error(e); } try { modals(); } catch (e) { console.error(e); } go('home'); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
