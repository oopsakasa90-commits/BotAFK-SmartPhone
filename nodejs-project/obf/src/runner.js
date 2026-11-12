'use strict';
// Khung runner: KHÔNG chứa chức năng nào. Chức năng do máy chủ gửi (đã giải mã trong tiến trình chính),
// được nạp và chạy hoàn toàn trong bộ nhớ, không ghi ra đĩa. Khi bị thu hồi / mất kết nối thì tiến trình này thoát và mọi thứ biến mất.
const path = require('path');
const vm = require('vm');
const Module = require('module');
const appRequire = Module.createRequire(path.join(__dirname, '..', '..', 'package.json'));

let files = null;
let started = false;
let startMsg = null;
const cache = Object.create(null);

function load(name) {
  if (cache[name]) return cache[name].exports;
  const module = { exports: {} };
  cache[name] = module;
  const fn = vm.compileFunction(files[name], ['require', 'module', 'exports', '__filename', '__dirname'], { filename: 'bundle:' + name });
  const req = (id) => {
    if (id.startsWith('./') || id.startsWith('../')) {
      const base = id.replace(/^(\.\.?\/)+/, '');
      for (const c of [base, base + '.js']) if (files && files[c]) return load(c);
      if (base === 'proxy' || base === 'proxy.js') return require('./proxy'); // phần proxy nằm trong app
      throw new Error('Không tìm thấy module ' + id);
    }
    return appRequire(id);
  };
  fn(req, module, module.exports, '/bundle/' + name, '/bundle');
  return module.exports;
}

function begin() {
  if (started || !files) return;
  started = true;
  try { load('runner.js'); } catch (e) { try { process.send({ type: 'log', text: 'Không nạp được chức năng: ' + e.message }); } catch (_) {} return; }
  if (startMsg) { const m = startMsg; startMsg = null; setImmediate(() => process.emit('message', m)); }
}

process.on('message', (m) => {
  if (!m || typeof m !== 'object') return;
  if (m.type === 'wipe') { files = null; for (const k in cache) delete cache[k]; process.exit(0); }
  if (started) return; // runner thật đã tự nghe các tin nhắn tiếp theo
  if (m.type === 'bundle' && m.files && typeof m.files === 'object') { files = m.files; begin(); return; }
  if (m.type === 'start') startMsg = m; // giữ lệnh khởi động cho tới khi có chức năng
});
