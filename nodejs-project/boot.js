'use strict';
// BotAFK boot: chạy trước obf/main.js. Không đụng logic bot.
//  - Tối ưu hiệu năng (không bị Windows/Chromium giảm tốc khi cửa sổ bị che hoặc thu nhỏ)
//  - Liquid: bật vật liệu Acrylic của Windows 11 để nhìn xuyên thấy cửa sổ phía sau
const Module = require('module');
const os = require('os');
const electron = require('electron');
const { app } = electron;

// ---- Hiệu năng ----
// Bot chạy trong tiến trình riêng nên KHÔNG cần ép giao diện chạy hết tốc độ khi bị che/thu nhỏ.
// Đổi PERF_FULL_SPEED = true để quay lại kiểu cũ (tốn CPU hơn khi để app chạy nền).
const PERF_FULL_SPEED = false;
try {
  if (PERF_FULL_SPEED) {
    app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion,IntensiveWakeUpThrottling');
    app.commandLine.appendSwitch('disable-renderer-backgrounding');
    app.commandLine.appendSwitch('disable-background-timer-throttling');
  }
  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('enable-smooth-scrolling');
  // giới hạn bộ nhớ của tiến trình giao diện
  app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256');
} catch (_) {}

// ---- Liquid (Acrylic) ----
const WIN_BUILD = (() => { const m = String(os.release()).match(/^10\.0\.(\d+)/); return m ? Number(m[1]) : 0; })();
const MSG = '@@FX@@';

function reply(win, detail) {
  try {
    if (win.isDestroyed()) return;
    win.webContents.executeJavaScript('window.dispatchEvent(new CustomEvent("fx-liquid",{detail:' + JSON.stringify(detail) + '}))').catch(() => {});
  } catch (_) {}
}

// ---- Kiểu đăng nhập theo acc (register rồi login / chỉ login / tự nhận) ----
const fs = require('fs');
const path = require('path');
const authFile = () => path.join(app.getPath('userData'), 'authmodes.json');
const authKey = (u, h) => String(u || '').trim().toLowerCase() + '|' + String(h || '').trim().toLowerCase();
function readAuth() { try { return JSON.parse(fs.readFileSync(authFile(), 'utf8')) || {}; } catch (_) { return {}; } }
function getAuthMode(u, h) { const v = readAuth()[authKey(u, h)]; return v === 'login' || v === 'register' ? v : 'auto'; }
function setAuthMode(u, h, mode) {
  const all = readAuth(); const k = authKey(u, h);
  if (!k || k === '|') return;
  if (mode === 'login' || mode === 'register') all[k] = mode; else delete all[k];
  try { fs.mkdirSync(path.dirname(authFile()), { recursive: true }); fs.writeFileSync(authFile(), JSON.stringify(all, null, 1), 'utf8'); } catch (_) {}
}
function replyEvt(win, name, detail) {
  try { if (!win.isDestroyed()) win.webContents.executeJavaScript('window.dispatchEvent(new CustomEvent(' + JSON.stringify(name) + ',{detail:' + JSON.stringify(detail) + '}))').catch(() => {}); } catch (_) {}
}

function handleFx(win, m) {
  if (m && m.t === 'auth') { setAuthMode(m.user, m.host, m.mode); return; }
  if (m && m.t === 'bridgeget') { pushToUi(lastBridge); return; }
  if (m && m.t === 'authget') { replyEvt(win, 'fx-auth', { mode: getAuthMode(m.user, m.host), user: m.user, host: m.host }); return; }
  if (!m || m.t !== 'liquid') return;
  if (!m.on) {
    try { win.setBackgroundMaterial && win.setBackgroundMaterial('none'); win.setBackgroundColor(win.__fxBg || '#0f1420'); } catch (_) {}
    return reply(win, { on: false });
  }
  if (process.platform !== 'win32' || WIN_BUILD < 22000 || typeof win.setBackgroundMaterial !== 'function') {
    // Windows 10 (và máy không hỗ trợ Acrylic): dùng kiểu kính mờ vẽ bằng CSS trong cửa sổ, không cần Windows 11
    try { win.setBackgroundColor(win.__fxBg || '#0f1420'); } catch (_) {}
    return reply(win, { on: true, lite: true, msg: 'Liquid bản tương thích (Windows 10): kính mờ trong cửa sổ, không xuyên thấy màn hình phía sau.' });
  }
  try {
    win.setBackgroundColor('#00000000');
    win.setBackgroundMaterial('acrylic');
    reply(win, { on: true });
  } catch (e) {
    reply(win, { on: false, msg: 'Không bật được Liquid: ' + (e && e.message ? e.message : e) });
  }
}

const Orig = electron.BrowserWindow;
class FxWindow extends Orig {
  constructor(opts) {
    opts = Object.assign({}, opts || {});
    opts.webPreferences = Object.assign({}, opts.webPreferences || {}, { backgroundThrottling: !PERF_FULL_SPEED ? true : false });
    super(opts);
    this.__fxBg = opts.backgroundColor || '#0f1420';
    this.webContents.on('console-message', (ev, level, message) => {
      const text = typeof message === 'string' ? message : ev && ev.message;
      if (typeof text !== 'string' || !text.startsWith(MSG)) return;
      try { handleFx(this, JSON.parse(text.slice(MSG.length))); } catch (_) {}
    });
  }
}

const proxy = new Proxy(electron, { get: (t, k) => (k === 'BrowserWindow' ? FxWindow : t[k]) });
// ---- Chuyển dữ liệu ESP/radar từ tiến trình runner (từng acc) sang giao diện ----
// Runner gửi {type:'fx', ...}; main.js không biết loại này nên ta nghe thêm trên child rồi đẩy vào trang.
function pushToUi(m) {
  let js;
  try { js = JSON.stringify(m).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'); } catch (_) { return; }
  let list = [];
  try { list = electron.webContents.getAllWebContents(); } catch (_) {}
  for (const wc of list) {
    try { if (!wc.isDestroyed() && wc.getType() === 'window') wc.executeJavaScript('window.__fxMsg&&window.__fxMsg(' + js + ')').catch(() => {}); } catch (_) {}
  }
}
// ---- Cầu nối chức năng: code chức năng chỉ do máy chủ gửi, nằm trong bộ nhớ ----
const { Bridge } = require('./obf/src/bridge');
const PIN = require('./obf/src/pin');
const kids = new Set();
let current = null;                 // { files } đang giữ trong bộ nhớ, null = chưa có / đã xóa
let lastBridge = { state: 'idle', msg: '', at: Date.now() };
// Mất kết nối máy chủ: giữ nguyên chức năng + acc đang chạy, thử nối lại lần lượt 5 → 15 → 30 phút; hết cả 3 giai đoạn mới tự tắt.
// Chỉ lệnh từ bot Discord (thu hồi/khóa/xóa) hoặc máy chủ từ chối mới tắt ngay.
const RECONNECT_PHASES = (process.env.BOTAFK_PHASES_MS ? String(process.env.BOTAFK_PHASES_MS).split(',').map(Number).filter((n) => n > 0) : []).length
  ? String(process.env.BOTAFK_PHASES_MS).split(',').map(Number).filter((n) => n > 0)
  : [5, 15, 30].map((m) => m * 60 * 1000);
const bridge = new Bridge({ url: PIN.WS, pub: PIN.PUB, phases: RECONNECT_PHASES });
// Lệnh bật/tắt chức năng đã gửi cho từng acc, để chạy lại y hệt sau khi mất kết nối rồi nhận lại chức năng
const FEAT_RE = /^!(fightbot|autocell|autosell|addfriends?|delfriends?|unfriend|automine|minebot|sellspawner|autofarm|autoquest|autoeat)\b/i;
const SKIP_RE = /\s(status|pos|esp)\b/i;
const hists = new Map();      // child -> { key, lines }
const snaps = new Map();      // key -> { lines, at }
const SNAP_TTL = 24 * 60 * 60 * 1000; // nhớ lệnh chức năng đủ lâu để bật lại y hệt khi nối lại sau khi đã tắt
function pushBridge(o) { lastBridge = Object.assign({ kind: 'bridge', at: Date.now() }, o); pushToUi(lastBridge); }
bridge.on('status', (s) => { if (bridge.holding && s.state === 'connecting') return; pushBridge({ state: s.state, msg: s.msg, eta: s.eta }); });
bridge.on('drop', (d) => pushBridge({ state: 'dropped', msg: d.msg, eta: Math.round((d.graceMs || 0) / 1000) }));
bridge.on('phase', (p) => pushBridge({ state: 'dropped', msg: 'Vẫn mất kết nối, đang thử lại (giai đoạn ' + p.phase + '/' + p.of + ')', eta: Math.round((p.left || 0) / 1000) }));
bridge.on('resumed', () => pushBridge({ state: 'ready', msg: 'Đã nối lại máy chủ, các acc vẫn chạy' }));
bridge.on('bundle', (o) => {
  current = { files: o.files };
  for (const k of kids) { try { k.send({ type: 'bundle', files: current.files }); } catch (_) {} }
  pushBridge({ state: 'ready', msg: 'Đã nhận chức năng từ máy chủ' });
});
bridge.on('wipe', (w) => {
  const had = !!current || kids.size > 0;
  if (w && w.lost) { for (const [k, h] of hists) if (kids.has(k) && h.key && h.lines.length) snaps.set(h.key, { lines: h.lines.slice(), at: Date.now() }); }
  current = null;
  for (const k of [...kids]) { try { k.send({ type: 'wipe' }); } catch (_) {} setTimeout(() => { try { k.kill(); } catch (_) {} }, 400); }
  if (had || (w && w.code !== undefined)) pushBridge({ state: (w && w.code === 4003) ? 'denied' : 'wiped', msg: (w && w.msg) || 'Chức năng đã bị xóa', wipe: true, restart: !!(w && w.lost) });
});
// Lấy phiên đăng nhập từ chính lời gọi đăng nhập của app (license.js dùng fetch toàn cục)
const origFetch = globalThis.fetch;
if (typeof origFetch === 'function') {
  globalThis.fetch = async function (u, o) {
    const r = await origFetch.apply(this, arguments);
    try {
      const url = String(u && u.url ? u.url : u);
      if (/\/api\/login$/.test(url) && r.ok && o && typeof o.body === 'string') {
        const rq = JSON.parse(o.body);
        r.clone().json().then((j) => {
          if (j && j.ok && j.session) bridge.start({ user: rq.user, session: j.session, hwid: rq.hwid, ver: require('./package.json').version });
        }).catch(() => {});
      } else if (/\/api\/logout$/.test(url)) {
        bridge.stop(); pushBridge({ state: 'idle', msg: '' });
      } else if (/\/api\/heartbeat$/.test(url) && (r.status === 401 || r.status === 403)) {
        // chỉ khi máy chủ từ chối dứt khoát (hết hạn/khóa/phiên sai); lỗi 5xx/429 là lỗi tạm thời, không được ngắt chức năng
        bridge.stop(); pushBridge({ state: 'idle', msg: '' });
      }
    } catch (_) {}
    return r;
  };
}
// Chạy lại các chức năng đã bật: đợi bot vào game (log "Đã vào") rồi gửi lại từng lệnh
function scheduleReplay(child, lines) {
  let done = false;
  const run = async () => {
    if (done) return; done = true;
    await new Promise((r) => setTimeout(r, 2500));
    pushToUi({ kind: 'fx-note', text: 'Đang bật lại các chức năng đã chạy trước khi mất kết nối (' + lines.length + ' lệnh)' });
    for (const line of lines) {
      if (!kids.has(child)) return;
      try { child.send({ type: 'cmd', line }); } catch (_) {}
      await new Promise((r) => setTimeout(r, 800));
    }
  };
  child.on('message', (m) => { if (m && m.type === 'log' && /Đã vào|đã vào/.test(String(m.text || ''))) run(); });
  setTimeout(run, 30000);
}
const cp = require('child_process');
const cpProxy = new Proxy(cp, {
  get: (t, k) => {
    if (k !== 'fork') return t[k];
    return function () {
      const fa = Array.prototype.slice.call(arguments);
      try {
        if (/runner\.js$/.test(String(fa[0]))) {
          const o = Object.assign({}, fa[2] || {});
          // mỗi acc tối đa ~512 MB bộ nhớ JS (đủ cho tầm nhìn 8 chunk), tránh phình vô hạn
          o.execArgv = (o.execArgv || []).concat(['--max-old-space-size=512', '--max-semi-space-size=4']);
          fa[2] = o;
        }
      } catch (_) {}
      const child = t.fork.apply(t, fa);
      try {
        if (/runner\.js$/.test(String(arguments[0]))) {
          kids.add(child); child.on('exit', () => kids.delete(child));
          if (current) child.send({ type: 'bundle', files: current.files });
        }
      } catch (_) {}
      try {
        const origSend = child.send.bind(child);
        child.send = function (msg) {
          try {
            if (msg && msg.type === 'start' && msg.cfg) {
              msg.cfg.authMode = getAuthMode(msg.cfg.username, msg.cfg.host);
              const key = String(msg.cfg.username) + '@' + msg.cfg.host + ':' + msg.cfg.port;
              const h = { key, lines: [] }; hists.set(child, h); child.on('exit', () => hists.delete(child));
              const sn = snaps.get(key); snaps.delete(key);
              if (sn && Date.now() - sn.at < SNAP_TTL && sn.lines.length) scheduleReplay(child, sn.lines);
            } else if (msg && msg.type === 'cmd' && typeof msg.line === 'string') {
              const h = hists.get(child), ln = msg.line.trim();
              if (h && FEAT_RE.test(ln) && !SKIP_RE.test(ln)) { h.lines.push(ln); if (h.lines.length > 80) h.lines.shift(); }
            }
          } catch (_) {}
          return origSend.apply(null, arguments);
        };
      } catch (_) {}
      try { child.on('message', (m) => { if (m && m.type === 'fx') pushToUi(m); }); } catch (_) {}
      return child;
    };
  },
});

const origLoad = Module._load;
Module._load = function (request) {
  if (process.env.BOTAFK_DEBUG) { try { require('fs').appendFileSync('/tmp/botafk-req.log', process.pid + ' ' + request + '\n'); } catch (_) {} }
  if (request === 'electron') return proxy;
  if (request === 'child_process' || request === 'node:child_process') return cpProxy;
  return origLoad.apply(this, arguments);
};

require('./obf/main.js');
