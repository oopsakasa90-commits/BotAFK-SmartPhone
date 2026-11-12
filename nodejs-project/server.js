'use strict';
// Secret-AF (điện thoại): chạy lõi BotAFK + phục vụ giao diện ở 127.0.0.1 cho WebView / trình duyệt.
//   POST /ipc  {ch,args}  -> {result|error}      GET /events -> SSE (sự kiện đẩy từ lõi)
// Mọi yêu cầu cần header x-sa-key (khóa ngẫu nhiên mỗi lần chạy) để app khác trên máy không gọi được.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), Module = require('module');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
process.env.BOTAFK_DATA = process.env.BOTAFK_DATA || opt('--data', path.join(__dirname, 'data'));
const PORT = Number(opt('--port', 17653));
const KEY = opt('--key', crypto.randomBytes(12).toString('hex'));
const UI = path.join(__dirname, 'ui');

// Android (nodejs-mobile) không có /etc/resolv.conf: dns.resolveSrv của minecraft-protocol có thể treo -> đặt DNS rõ ràng
try { const dns = require('dns'); dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']); if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first'); } catch (_) {}
// nhật ký chẩn đoán: mọi dòng lõi in ra + lỗi + thoát đột ngột (xem tại /diag hoặc nút 🛠 trong app)
const RING = [];
const dlog = (s) => { const l = new Date().toISOString().slice(11, 19) + ' ' + s; RING.push(l); if (RING.length > 400) RING.shift(); try { fs.appendFileSync(path.join(process.env.BOTAFK_DATA, 'core.log'), l + '\n'); } catch (_) {} };
try { fs.mkdirSync(process.env.BOTAFK_DATA, { recursive: true }); const f = path.join(process.env.BOTAFK_DATA, 'core.log'); if (fs.existsSync(f) && fs.statSync(f).size > 1e6) fs.truncateSync(f, 0); } catch (_) {}
const _err = console.error.bind(console);
console.error = (...a) => { dlog(a.map((x) => (typeof x === 'string' ? x : (x && x.stack) || JSON.stringify(x))).join(' ')); _err(...a); };
process.on('exit', (c) => dlog('NODE THOAT code=' + c));
dlog('Lõi khởi động: node ' + process.version + ' ' + process.platform + '/' + process.arch);
const shim = require('./electron-shim');
const { handlers, setPush, readyRes } = shim.__host;
const origLoad = Module._load;
Module._load = function (request) { if (request === 'electron') return shim; return origLoad.apply(this, arguments); };
console.log = console.info = (...a) => console.error(...a);
console.warn = (...a) => console.error('[warn]', ...a);

const clients = new Set();
const backlog = [];
let _lastSt = '';
const emit = (o) => {
  try {
    if (o && o.push === 'event') dlog('EV ' + JSON.stringify(o.data).slice(0, 400));
    else if (o && o.push === 'accounts') { const st = (o.data || []).map((a) => a.label + ':' + a.status).join(' '); if (st !== _lastSt) { _lastSt = st; dlog('TRẠNG THÁI ' + st); } }
    else if (o && o.push && o.push !== 'ping' && o.push !== 'fx' && o.push !== 'fxevent') dlog('PUSH ' + o.push + ' ' + JSON.stringify(o.data).slice(0, 200));
  } catch (_) {}
  const l = 'data: ' + JSON.stringify(o) + '\n\n'; if (!clients.size) { backlog.push(l); if (backlog.length > 300) backlog.shift(); return; } clients.forEach((c) => c.write(l)); };
setPush(emit);
process.on('uncaughtException', (e) => { dlog('LỖI: ' + String(e && e.stack || e)); emit({ push: 'host-error', data: String(e && e.stack || e) }); });
process.on('unhandledRejection', (e) => { dlog('LỖI(promise): ' + String(e && e.stack || e)); emit({ push: 'host-error', data: String(e && e.stack || e) }); });
require('./boot.js');

const FX = '@@FX@@';
async function call(ch, args) {
  if (ch === 'ready') { readyRes(); const w = shim.BrowserWindow.current; if (w) w.webContents.emit('did-finish-load'); return true; }
  if (ch === 'fxmsg') { const w = shim.BrowserWindow.current; const s = FX + JSON.stringify((args || [])[0] || {}); if (w) w.webContents.emit('console-message', { message: s }, 0, s); return true; }
  const fn = handlers.get(ch);
  if (!fn) throw new Error('kênh không tồn tại: ' + ch);
  if (/^acc:(start|stop)$/.test(ch)) dlog('IPC ' + ch);
  const r = await fn({}, ...(args || []));
  if (/^acc:(start|stop)$/.test(ch)) dlog('IPC ' + ch + ' -> ' + JSON.stringify(r));
  return r === undefined ? null : r;
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  const authed = req.headers['x-sa-key'] === KEY || new URL(req.url, 'http://x').searchParams.get('k') === KEY;
  if (u === '/ipc' && req.method === 'POST') {
    if (!authed) { res.writeHead(403); return res.end(); }
    let b = ''; req.on('data', (d) => { b += d; if (b.length > 4e6) req.destroy(); });
    req.on('end', async () => {
      let m; try { m = JSON.parse(b); } catch (_) { res.writeHead(400); return res.end(); }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      try { res.end(JSON.stringify({ ok: true, result: await call(m.ch, m.args) })); } catch (e) { res.end(JSON.stringify({ ok: false, error: String(e && e.message || e) })); }
    });
    return;
  }
  if (u === '/diag') {
    if (!authed) { res.writeHead(403); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }); return res.end(RING.join('\n'));
  }
  if (u === '/events') {
    if (!authed) { res.writeHead(403); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(':ok\n\n'); backlog.splice(0).forEach((l) => res.write(l)); clients.add(res); req.on('close', () => clients.delete(res)); return;
  }
  // tĩnh: chỉ phục vụ thư mục ui (không cần khóa để tải trang, khóa nằm trong URL ?k=)
  const rel = u === '/' ? 'index.html' : decodeURIComponent(u).replace(/^\/+/, '');
  const f = path.join(UI, rel);
  if (!f.startsWith(UI + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); });
}).listen(PORT, '127.0.0.1', () => console.error('Secret-AF mobile: http://127.0.0.1:' + PORT + '/?k=' + KEY));
setInterval(() => emit({ push: 'ping' }), 25000).unref();
