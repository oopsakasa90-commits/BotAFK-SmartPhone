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
      mode: "server",
      cps: 1.6,
      maxTargets: 3,
      reach: 4,
      useGold: true,
      goldCps: 5,
      names: [],
      scope: "npc",
      radius: 48,
      points: [],
      pointRadius: 5,
      hmobs: "zombie, vex",
      vwarden: true,
      vditheo: false
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
        d.scope = r.scope === "all" ? "all" : "npc";
        d.radius = num(r.radius, 8, 100, 48);
        d.warp = ["tuonglai", "halloween", "farmvip"].indexOf(r.warp) >= 0 ? r.warp : "tuonglai";
        d.warpCmd = String(r.warpCmd || "");
        d.mode = r.mode === "aura" || r.mode === "v2" ? r.mode : r.mode === "server" ? "server" : r.serverAuto === false ? "aura" : "server";
        d.cps = num(r.cps, 0.5, 20, 1.6);
        d.maxTargets = Math.round(num(r.maxTargets, 1, 3, 3));
        d.reach = num(r.reach, 1, 4, 4);
        d.useGold = r.useGold !== false;
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
        if (typeof r.hmobs === "string") {
          d.hmobs = r.hmobs;
        }
        d.vwarden = r.vwarden !== false;
        d.vditheo = !!r.vditheo;
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
      mode: c.mode,
      cps: c.cps,
      maxTargets: c.maxTargets,
      reach: c.reach,
      useGold: c.useGold,
      goldCps: c.goldCps,
      names: c.names.filter(function (m) {
        return m.on;
      }).map(function (m) {
        return m.name;
      }),
      scope: c.scope,
      radius: c.radius,
      points: c.points,
      pointRadius: c.pointRadius,
      hallo: {
        mobs: listOf(c.hmobs)
      },
      vip: {
        warden: c.vwarden,
        ditheo: c.vditheo
      }
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
      em.textContent = "Để trống: đánh mọi NPC chưa kết bạn.";
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
    ["tuonglai", "halloween", "farmvip"].forEach(function (k) {
      $("sec-" + k).classList.toggle("hidden", k !== w);
    });
    var aura = $("fight-mode").value !== "server";
    $("fight-aura").classList.toggle("hidden", !aura);
    $("fight-modehint").classList.toggle("hidden", aura);
    $("fight-warpcmd").placeholder = "/warp " + w + " (mặc định)";
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
    $("fight-mode").value = working.mode;
    $("fight-cps").value = working.cps;
    $("fight-targets").value = working.maxTargets;
    $("fight-reach").value = working.reach;
    $("fight-gold").checked = working.useGold;
    $("fight-gcps").value = working.goldCps;
    $("fight-scope").value = working.scope;
    $("fight-radius").value = working.radius;
    $("fight-pradius").value = working.pointRadius;
    $("fight-hmobs").value = working.hmobs;
    $("fight-vwarden").checked = working.vwarden;
    $("fight-vditheo").checked = working.vditheo;
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
      working.mode = ["aura", "v2"].indexOf($("fight-mode").value) >= 0 ? $("fight-mode").value : "server";
      working.cps = num($("fight-cps").value, 0.5, 20, 1.6);
      working.maxTargets = Math.round(num($("fight-targets").value, 1, 3, 3));
      working.reach = num($("fight-reach").value, 1, 4, 4);
      working.useGold = $("fight-gold").checked;
      working.goldCps = num($("fight-gcps").value, 1, 25, 5);
      working.scope = $("fight-scope").value === "all" ? "all" : "npc";
      working.radius = num($("fight-radius").value, 8, 100, 48);
      working.pointRadius = num($("fight-pradius").value, 1, 5, 5);
      working.hmobs = $("fight-hmobs").value;
      working.vwarden = $("fight-vwarden").checked;
      working.vditheo = $("fight-vditheo").checked;
      if (working.warp === "farmvip" && !working.vwarden && !working.vditheo) {
        msgEl.style.color = "";
        msgEl.textContent = "Warp farmvip: chọn ít nhất một chức năng con.";
        return;
      }
      if (working.warp === "halloween" && !listOf(working.hmobs).length) {
        msgEl.style.color = "";
        msgEl.textContent = "Warp halloween: nhập ít nhất một mob.";
        return;
      }
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
      msgEl.textContent = "Đã xóa danh sách (để trống = đánh mọi NPC chưa kết bạn).";
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
    $("esp-count").textContent = ents.length ? "· " + ents.length + " NPC · " + (m.friends || 0) + " bạn" : "";
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
      em.textContent = "Không có NPC nào trong tầm.";
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
    b.className = "cui-slot" + (s.name ? "" : " blank") + (cls ? " " + cls : "");
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
    function plain(t) { return esc(String(t).replace(/\u00a7./g, "")); }
    document.addEventListener("mouseover", function (e) {
      var b = e.target.closest && e.target.closest(".cui-slot");
      if (!b || !win) { tip.classList.add("hidden"); return; }
      var s = (win.slots || []).filter(function (x) { return String(x.slot) === b.dataset.slot; })[0];
      if (!s || !s.name) { tip.classList.add("hidden"); return; }
      var h = '<div class="tn">' + plain(s.dn || s.name) + (s.count > 1 ? ' <small>x' + s.count + '</small>' : '') + '</div>';
      if (s.ench) h += s.ench.map(function (x) { return '<div class="te">' + esc(x) + '</div>'; }).join("");
      if (s.lore) h += s.lore.map(function (x) { return '<div class="tl">' + (plain(x) || "&nbsp;") + '</div>'; }).join("");
      if (s.dur) h += '<div class="td">Độ bền: ' + s.dur[0] + ' / ' + s.dur[1] + '</div>';
      h += '<div class="tm">minecraft:' + esc(s.name) + ' · ô ' + s.slot + '</div>';
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
    fillGrid($("cui-top"), 0, win.invStart, win.cols || 9, map);
    $("cui-top").classList.toggle("hidden", win.invStart <= 0);
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
