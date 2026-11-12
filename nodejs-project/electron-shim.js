'use strict';
// Thay thế module "electron" để chạy nguyên main.js/boot.js của BotAFK không cần Electron.
// Giao diện (Rust) nói chuyện qua host.js bằng JSON theo từng dòng.
const EventEmitter = require('events');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const DATA = process.env.BOTAFK_DATA || path.join(os.homedir(), '.afkhub');
fs.mkdirSync(DATA, { recursive: true });

let push = () => {};
const setPush = (fn) => { push = fn; };

// ---- safeStorage: mã hóa AES-256-GCM, khóa lưu riêng trong thư mục dữ liệu ----
function dataKey() {
  const p = path.join(DATA, '.k');
  try { const b = fs.readFileSync(p); if (b.length === 32) return b; } catch (_) {}
  const k = crypto.randomBytes(32);
  fs.writeFileSync(p, k, { mode: 0o600 });
  return k;
}
const safeStorage = {
  isEncryptionAvailable: () => true,
  encryptString(s) {
    const iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv('aes-256-gcm', dataKey(), iv);
    const enc = Buffer.concat([c.update(String(s), 'utf8'), c.final()]);
    return Buffer.concat([iv, c.getAuthTag(), enc]);
  },
  decryptString(buf) {
    const b = Buffer.from(buf);
    const d = crypto.createDecipheriv('aes-256-gcm', dataKey(), b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8');
  },
};

// ---- app ----
const appEv = new EventEmitter();
let readyRes; const readyP = new Promise((r) => { readyRes = r; });
const app = Object.assign(appEv, {
  whenReady: () => readyP,
  getPath: () => DATA,
  getVersion: () => require('./package.json').version,
  quit: () => setTimeout(() => process.exit(0), 50),
  commandLine: { appendSwitch() {} },
  isPackaged: true,
});

// ---- ipcMain ----
const handlers = new Map();
const ipcMain = {
  handle: (ch, fn) => handlers.set(ch, fn),
  on: (ch, fn) => handlers.set(ch, fn),
  removeHandler: (ch) => handlers.delete(ch),
};

// ---- Trang giả: bắt các lệnh executeJavaScript mà boot.js/main.js gửi cho giao diện ----
function captureJs(js) {
  let m;
  if ((m = /^window\.__fxMsg&&window\.__fxMsg\(([\s\S]*)\)$/.exec(js))) {
    try { push({ push: 'fx', data: JSON.parse(m[1]) }); } catch (_) {}
  } else if ((m = /^window\.dispatchEvent\(new CustomEvent\(("[^"]+"),\{detail:([\s\S]*)\}\)\)$/.exec(js))) {
    try { push({ push: 'fxevent', name: JSON.parse(m[1]), data: JSON.parse(m[2]) }); } catch (_) {}
  }
  return Promise.resolve();
}
const fakeWc = {
  isDestroyed: () => false,
  getType: () => 'window',
  executeJavaScript: captureJs,
};
const webContents = { getAllWebContents: () => [fakeWc] };

class BrowserWindow extends EventEmitter {
  constructor() {
    super();
    const wc = new EventEmitter();
    wc.send = (ch, data) => push({ push: ch, data });
    wc.executeJavaScript = captureJs;
    wc.isDestroyed = () => false;
    wc.getType = () => 'window';
    this.webContents = wc;
    BrowserWindow.current = this;
  }
  removeMenu() {} loadFile() {} isDestroyed() { return false; }
  setBackgroundColor() {} setBackgroundMaterial() {}
}

module.exports = {
  app, ipcMain, BrowserWindow, safeStorage, webContents,
  dialog: { showMessageBox: async () => ({ response: 0 }), showOpenDialog: async () => ({ canceled: true, filePaths: [] }) },
  shell: { beep() {}, openExternal: async () => {} },
  __host: { handlers, setPush, readyRes, DATA },
};
