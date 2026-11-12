'use strict';
// Proxy cho bot: hỗ trợ http, https, socks4, socks4a, socks5 (socks5h).
// Cách nhập (mỗi dòng một proxy):
//   host:port                      host:port:user:pass            user:pass@host:port
//   http://[user:pass@]host:port   https://...   socks4://...   socks4a://...   socks5://...   socks5h://...
// Không ghi giao thức (chỉ host:port...) = TỰ DÒ: thử http -> socks5 -> socks4 -> https cho tới khi được.
const net = require('net');
const tls = require('tls');
const dns = require('dns');

const SCHEMES = { http: 'http', https: 'https', socks: 'socks5', socks4: 'socks4', socks4a: 'socks4a', socks5: 'socks5', socks5h: 'socks5' };
const AUTO_ORDER = ['http', 'socks5', 'socks4', 'https'];
const detected = new Map(); // khóa proxy -> giao thức đã dò được

function parseProxy(input) {
  let s = String(input == null ? '' : input).trim();
  if (!s) return null;
  let type = 'auto';
  const m = s.match(/^([a-z0-9]+):\/\/(.*)$/i);
  if (m) {
    const t = SCHEMES[m[1].toLowerCase()];
    if (!t) throw new Error('Giao thức proxy không hỗ trợ: ' + m[1] + ' (dùng http, https, socks4, socks4a, socks5)');
    type = t; s = m[2];
  }
  s = s.replace(/\/+$/, '');
  let host, port, user = '', pass = '';
  const at = s.lastIndexOf('@');
  if (at >= 0) {
    const cred = s.slice(0, at), hp = s.slice(at + 1);
    const ci = cred.indexOf(':');
    user = decodeURIComponent(ci >= 0 ? cred.slice(0, ci) : cred);
    pass = ci >= 0 ? decodeURIComponent(cred.slice(ci + 1)) : '';
    const p = hp.split(':');
    if (p.length < 2) throw new Error('Proxy sai định dạng. Dùng host:port, host:port:user:pass hoặc user:pass@host:port');
    host = p[0].trim(); port = Number(p[1]);
  } else {
    const p = s.split(':');
    if (p.length < 2) throw new Error('Proxy sai định dạng. Dùng host:port, host:port:user:pass hoặc user:pass@host:port');
    if (p.length >= 4 && !/^\d+$/.test(p[1]) && /^\d+$/.test(p[3])) { // user:pass:host:port
      user = p[0]; pass = p[1]; host = p[2].trim(); port = Number(p[3]);
    } else {
      host = p[0].trim(); port = Number(p[1]);
      if (p.length >= 3) user = p[2];
      if (p.length >= 4) pass = p.slice(3).join(':');
    }
  }
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Proxy sai host hoặc port');
  return { type, host, port, user, pass };
}
const keyOf = (p) => p.host + ':' + p.port + '|' + p.user;

// ---------- đọc dữ liệu có đệm ----------
function reader(sock) {
  let buf = Buffer.alloc(0), waiter = null, err = null, ended = false;
  const wake = () => { if (waiter) { const w = waiter; waiter = null; w(); } };
  const onData = (d) => { buf = Buffer.concat([buf, d]); wake(); };
  const onErr = (e) => { err = e; wake(); };
  const onEnd = () => { ended = true; wake(); };
  sock.on('data', onData); sock.on('error', onErr); sock.on('end', onEnd); sock.on('close', onEnd);
  return {
    async need(n, ms) {
      const end = Date.now() + ms;
      while (buf.length < n) {
        if (err) throw err;
        if (ended) throw new Error('Proxy đóng kết nối giữa chừng');
        const left = end - Date.now(); if (left <= 0) throw new Error('Proxy trả lời quá chậm');
        await new Promise((res) => { waiter = res; setTimeout(() => { if (waiter === res) { waiter = null; res(); } }, Math.min(left, 250)); });
      }
      const out = buf.slice(0, n); buf = buf.slice(n); return out;
    },
    async until(marker, ms, max) {
      const end = Date.now() + ms;
      for (;;) {
        const i = buf.indexOf(marker);
        if (i >= 0) { const out = buf.slice(0, i + marker.length); buf = buf.slice(i + marker.length); return out; }
        if (buf.length > (max || 16384)) throw new Error('Proxy trả lời sai');
        if (err) throw err;
        if (ended) throw new Error('Proxy đóng kết nối giữa chừng');
        const left = end - Date.now(); if (left <= 0) throw new Error('Proxy trả lời quá chậm');
        await new Promise((res) => { waiter = res; setTimeout(() => { if (waiter === res) { waiter = null; res(); } }, Math.min(left, 250)); });
      }
    },
    release() { // trả lại phần dữ liệu thừa cho socket rồi ngừng đọc
      sock.removeListener('data', onData); sock.removeListener('error', onErr); sock.removeListener('end', onEnd); sock.removeListener('close', onEnd);
      if (buf.length) sock.unshift(buf);
    },
  };
}
function openSocket(p, type, ms) {
  return new Promise((resolve, reject) => {
    let done = false;
    const fin = (e, s) => { if (done) return; done = true; clearTimeout(t); if (e) { try { s && s.destroy(); } catch (_) {} reject(e); } else resolve(s); };
    let s;
    const t = setTimeout(() => fin(new Error('Không kết nối được tới proxy (quá thời gian)'), s), ms);
    if (type === 'https') { s = tls.connect({ host: p.host, port: p.port, servername: net.isIP(p.host) ? undefined : p.host }, () => fin(null, s)); }
    else { s = net.connect({ host: p.host, port: p.port }, () => fin(null, s)); }
    s.setNoDelay && s.setNoDelay(true);
    s.once('error', (e) => fin(new Error('Không kết nối được tới proxy: ' + e.message), s));
  });
}

// ---------- các giao thức ----------
async function viaHttp(sock, p, host, port, ms) {
  const rd = reader(sock);
  let req = 'CONNECT ' + host + ':' + port + ' HTTP/1.1\r\nHost: ' + host + ':' + port + '\r\n';
  if (p.user || p.pass) req += 'Proxy-Authorization: Basic ' + Buffer.from(p.user + ':' + p.pass).toString('base64') + '\r\n';
  req += 'Proxy-Connection: keep-alive\r\n\r\n';
  sock.write(req);
  const head = (await rd.until(Buffer.from('\r\n\r\n'), ms)).toString('latin1');
  const m = head.match(/^HTTP\/1\.[01] (\d{3})/);
  if (!m) throw new Error('Proxy này không phải HTTP');
  if (m[1] === '407') throw new Error('Proxy sai user/pass (407)');
  if (m[1] !== '200') throw new Error('Proxy từ chối kết nối (HTTP ' + m[1] + ')');
  rd.release();
}
async function viaSocks5(sock, p, host, port, ms) {
  const rd = reader(sock);
  const useAuth = !!(p.user || p.pass);
  sock.write(Buffer.from(useAuth ? [5, 2, 0, 2] : [5, 1, 0]));
  const g = await rd.need(2, ms);
  if (g[0] !== 5) throw new Error('Proxy này không phải SOCKS5');
  if (g[1] === 0xff) throw new Error('Proxy SOCKS5 không chấp nhận cách xác thực');
  if (g[1] === 2) {
    const u = Buffer.from(p.user), w = Buffer.from(p.pass);
    sock.write(Buffer.concat([Buffer.from([1, u.length]), u, Buffer.from([w.length]), w]));
    const a = await rd.need(2, ms);
    if (a[1] !== 0) throw new Error('Proxy sai user/pass (SOCKS5)');
  } else if (g[1] !== 0) throw new Error('Proxy SOCKS5 dùng cách xác thực chưa hỗ trợ');
  const hb = Buffer.from(host);
  const pt = Buffer.alloc(2); pt.writeUInt16BE(port);
  let addr;
  if (net.isIPv4(host)) addr = Buffer.concat([Buffer.from([1]), Buffer.from(host.split('.').map(Number))]);
  else addr = Buffer.concat([Buffer.from([3, hb.length]), hb]);
  sock.write(Buffer.concat([Buffer.from([5, 1, 0]), addr, pt]));
  const r = await rd.need(4, ms);
  if (r[1] !== 0) {
    const why = { 1: 'lỗi chung', 2: 'bị chặn bởi luật proxy', 3: 'mạng không tới được', 4: 'không tới được máy chủ', 5: 'máy chủ từ chối kết nối', 6: 'quá thời gian', 7: 'lệnh không hỗ trợ', 8: 'địa chỉ không hỗ trợ' }[r[1]] || ('mã ' + r[1]);
    throw new Error('Proxy SOCKS5 không mở được đường tới máy chủ: ' + why);
  }
  const atyp = r[3];
  if (atyp === 1) await rd.need(4 + 2, ms);
  else if (atyp === 4) await rd.need(16 + 2, ms);
  else if (atyp === 3) { const l = await rd.need(1, ms); await rd.need(l[0] + 2, ms); }
  rd.release();
}
async function viaSocks4(sock, p, host, port, ms, a) {
  const rd = reader(sock);
  const pt = Buffer.alloc(2); pt.writeUInt16BE(port);
  const uid = Buffer.concat([Buffer.from(p.user || ''), Buffer.from([0])]);
  let ip, tail = Buffer.alloc(0);
  if (net.isIPv4(host)) ip = Buffer.from(host.split('.').map(Number));
  else if (a) { ip = Buffer.from([0, 0, 0, 1]); tail = Buffer.concat([Buffer.from(host), Buffer.from([0])]); }
  else {
    const addr = await new Promise((res, rej) => dns.lookup(host, { family: 4 }, (e, ad) => (e ? rej(new Error('Không phân giải được tên miền (SOCKS4 cần IPv4): ' + host)) : res(ad))));
    ip = Buffer.from(addr.split('.').map(Number));
  }
  sock.write(Buffer.concat([Buffer.from([4, 1]), pt, ip, uid, tail]));
  const r = await rd.need(8, ms);
  if (r[0] !== 0) throw new Error('Proxy này không phải SOCKS4');
  if (r[1] !== 90) throw new Error('Proxy SOCKS4 từ chối kết nối (mã ' + r[1] + ')');
  rd.release();
}
async function tunnelAs(type, p, host, port, ms) {
  const sock = await openSocket(p, type, ms);
  try {
    if (type === 'http' || type === 'https') await viaHttp(sock, p, host, port, ms);
    else if (type === 'socks5') await viaSocks5(sock, p, host, port, ms);
    else if (type === 'socks4') await viaSocks4(sock, p, host, port, ms, false);
    else if (type === 'socks4a') await viaSocks4(sock, p, host, port, ms, true);
    else throw new Error('Giao thức proxy không hỗ trợ: ' + type);
  } catch (e) { try { sock.destroy(); } catch (_) {} throw e; }
  return sock;
}
// mở đường tới host:port qua proxy; type 'auto' thì thử lần lượt
async function openTunnel(p, host, port, ms) {
  ms = ms || 12000;
  if (p.type !== 'auto') { const s = await tunnelAs(p.type, p, host, port, ms); s.__proxyType = p.type; return s; }
  const k = keyOf(p), order = detected.has(k) ? [detected.get(k)] : AUTO_ORDER;
  const errs = [];
  for (const t of order) {
    try { const s = await tunnelAs(t, p, host, port, ms); detected.set(k, t); s.__proxyType = t; return s; }
    catch (e) {
      errs.push(t + ': ' + e.message);
      if (/sai user\/pass|407/.test(e.message)) throw e; // sai tài khoản thì dừng, khỏi thử tiếp
    }
  }
  throw new Error('Thử http/socks5/socks4/https đều không được (' + errs.join(' | ') + ')');
}

// ---------- ping Minecraft (Server List Ping) qua socket đã có ----------
const varint = (n) => { const o = []; do { let b = n & 0x7f; n >>>= 7; if (n) b |= 0x80; o.push(b); } while (n); return Buffer.from(o); };
const mcStr = (s) => { const b = Buffer.from(s, 'utf8'); return Buffer.concat([varint(b.length), b]); };
const pkt = (...parts) => { const b = Buffer.concat(parts); return Buffer.concat([varint(b.length), b]); };
function readVarint(buf) { let n = 0, sh = 0; for (let i = 0; i < Math.min(buf.length, 5); i++) { n |= (buf[i] & 0x7f) << sh; if (!(buf[i] & 0x80)) return { n, size: i + 1 }; sh += 7; } return null; }
function pingServer(sock, host, port, ms) {
  return new Promise((resolve, reject) => {
    let buf = Buffer.alloc(0), done = false;
    const fin = (e) => { if (done) return; done = true; clearTimeout(t); sock.removeAllListeners('data'); try { sock.destroy(); } catch (_) {} e ? reject(e) : resolve(); };
    const t = setTimeout(() => fin(new Error('Máy chủ Minecraft không trả lời (quá thời gian)')), ms);
    sock.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      const l = readVarint(buf); if (!l || buf.length < l.size + l.n) return;
      if (l.n < 1 || buf[l.size] !== 0) return fin(new Error('Máy chủ trả lời sai gói tin'));
      fin(null);
    });
    sock.on('error', (e) => fin(new Error('Lỗi kết nối: ' + e.message)));
    sock.on('close', () => fin(new Error('Máy chủ đóng kết nối')));
    const pb = Buffer.alloc(2); pb.writeUInt16BE(port);
    sock.write(Buffer.concat([pkt(Buffer.from([0]), varint(767), mcStr(host), pb, varint(1)), pkt(Buffer.from([0]))]));
  });
}

async function checkProxy({ proxy, host, port, timeoutMs = 12000 }) {
  let p;
  try { p = parseProxy(proxy); } catch (e) { return { ok: false, msg: e.message }; }
  if (!p) return { ok: false, msg: 'Chưa nhập proxy' };
  const mport = Number(port) || 25565, t0 = Date.now();
  let sock;
  try {
    sock = await openTunnel(p, host, mport, timeoutMs);
    const type = sock.__proxyType;
    await pingServer(sock, host, mport, timeoutMs);
    return { ok: true, msg: 'Proxy vào được máy chủ (' + (Date.now() - t0) + ' ms, ' + type + ')', type };
  } catch (e) { return { ok: false, msg: e.message }; }
}
function connectViaProxy(p, host, port) { return openTunnel(p, host, port, 15000); }

module.exports = { parseProxy, checkProxy, connectViaProxy };
