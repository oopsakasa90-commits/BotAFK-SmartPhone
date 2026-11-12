'use strict';

// Cầu nối tới máy chủ: giữ WebSocket, bắt tay mã hóa (ECDH P-256 + chữ ký máy chủ đã ghim), nhận code chức năng
// đã mã hóa (AES-256-GCM) và chỉ giữ trong bộ nhớ. Mất kết nối = xóa sạch.
const {
  webcrypto: C,
  randomBytes
} = require("crypto");
const zlib = require("zlib");
const {
  EventEmitter
} = require("events");
const WebSocket = require("ws");
const te = new TextEncoder();
const FATAL = new Set([4000, 4001, 4002, 4003, 4004, 4005, 4006]); // máy chủ chủ động đóng: không tự nối lại
const cat = (...a) => Buffer.concat(a.map(x => Buffer.from(x)));
class Bridge extends EventEmitter {
  constructor(opts) {
    super();
    this.url = opts.url;
    this.pub = opts.pub;
    this.WS = opts.WebSocket || WebSocket;
    this.info = null;
    this.ws = null;
    this.stopped = true;
    this.backoff = 5000;
    this.ready = false;
    this.timers = [];
    // Mất kết nối: giữ nguyên chức năng + các acc đang chạy qua lần lượt các giai đoạn thử nối lại (mặc định 5 → 15 → 30 phút).
    // Hết cả các giai đoạn mà vẫn chưa nối lại được mới tự tắt.
    this.phases = Array.isArray(opts.phases) && opts.phases.length ? opts.phases.map(Number) : [opts.graceMs || 90000];
    this.graceMs = this.phases.reduce((a, b) => a + b, 0);
    this.phase = 0;
    this.afterLost = false;
    this.graceT = null;
    this.holding = false;
  }
  start(info) {
    this.stop(true);
    this._noGrace();
    this.afterLost = false;
    this.info = {
      user: String(info.user),
      session: String(info.session),
      hwid: String(info.hwid),
      ver: String(info.ver || "")
    };
    this.stopped = false;
    this.backoff = 5000;
    this._open();
  }
  stop(quiet) {
    this.stopped = true;
    this.afterLost = false;
    this._noGrace();
    this._clear();
    if (this.ws) {
      try {
        this.ws.removeAllListeners();
        this.ws.on("error", () => {});
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }
    if (this.ready || !quiet) {
      this.emit("wipe", {
        msg: "Đã ngắt kết nối"
      });
    }
    this.ready = false;
    this.key = null;
    this.chunks = null;
    this.holding = false;
  }
  _noGrace() {
    clearTimeout(this.graceT);
    this.graceT = null;
    this.holding = false;
  }
  _clear() {
    for (const t of this.timers) {
      clearTimeout(t);
      clearInterval(t);
    }
    this.timers = [];
  }
  _status(state, msg, eta) {
    this.emit("status", {
      state,
      msg: msg || "",
      eta: eta || 0
    });
  }
  async _open() {
    if (this.stopped) {
      return;
    }
    let ws;
    try {
      ws = new this.WS(this.url + "?user=" + encodeURIComponent(this.info.user));
    } catch (e) {
      return this._retry();
    }
    this.ws = ws;
    this.ready = false;
    this.key = null;
    this.chunks = new Map();
    this.lastPong = Date.now();
    ws.on("open", async () => {
      try {
        this.kp = await C.subtle.generateKey({
          name: "ECDH",
          namedCurve: "P-256"
        }, false, ["deriveBits"]);
        this.cpub = Buffer.from(await C.subtle.exportKey("raw", this.kp.publicKey));
        this.cnonce = randomBytes(16);
        ws.send(JSON.stringify({
          t: "hello",
          user: this.info.user,
          session: this.info.session,
          hwid: this.info.hwid,
          ver: this.info.ver,
          cpub: this.cpub.toString("base64"),
          cnonce: this.cnonce.toString("base64"),
          resume: this.holding === true
        }));
        this._status("connecting", "Đang kết nối máy chủ…");
        const ping = setInterval(() => {
          if (Date.now() - this.lastPong > 70000) {
            try {
              ws.terminate();
            } catch (_) {}
            return;
          }
          try {
            ws.send("{\"t\":\"ping\"}");
          } catch (_) {}
        }, 20000);
        this.timers.push(ping);
      } catch (e) {
        this._status("error", "Lỗi mã hóa: " + e.message);
        try {
          ws.close();
        } catch (_) {}
      }
    });
    ws.on("message", data => {
      let m;
      try {
        m = JSON.parse(data.toString());
      } catch (_) {
        return;
      }
      // xử lý tuần tự theo thứ tự nhận (giải mã là bất đồng bộ, 'done' không được chạy trước đoạn cuối)
      this.q = (this.q || Promise.resolve()).then(() => this._onMsg(m)).catch(e => {
        this._status("error", "Lỗi xử lý dữ liệu: " + e.message);
        try {
          ws.close();
        } catch (_) {}
      });
    });
    ws.on("error", () => {});
    ws.on("close", code => {
      if (this.ws !== ws) {
        return;
      }
      this._clear();
      this.ws = null;
      const had = this.ready || this.holding;
      this.key = null;
      this.chunks = null;
      const soft = !this.stopped && !FATAL.has(code);
      if (soft && had) {
        // mất kết nối bất thường: giữ chức năng và các acc đang chạy trong thời gian ân hạn, thử nối lại
        this.ready = false;
        if (!this.holding) {
          this.holding = true;
          this.backoff = 2000;
          this.emit("drop", {
            msg: "Mất kết nối máy chủ, đang nối lại…",
            graceMs: this.graceMs,
            phases: this.phases
          });
          this._runPhases(code);
        }
        this._retry();
        return;
      }
      this.ready = false;
      this._noGrace();
      // đã tắt vì mất kết nối quá lâu và đang thử nối lại: không báo "wipe" lại mỗi lần thử hụt (sẽ làm mất danh sách acc cần chạy lại)
      if (!(this.afterLost && soft && !had)) {
        this.emit("wipe", {
          msg: "Mất kết nối máy chủ",
          had,
          code
        });
      }
      if (soft) {
        this._retry();
      }
    });
  }
  // các giai đoạn: hết giai đoạn này thì sang giai đoạn kế, hết giai đoạn cuối mới tắt (wipe + lost)
  _runPhases(code) {
    const ph = this.phases;
    const run = i => {
      this.phase = i;
      if (i >= ph.length) {
        this.graceT = null;
        this.holding = false;
        this.afterLost = true;
        this.emit("wipe", {
          msg: "Mất kết nối máy chủ quá lâu",
          had: true,
          code,
          lost: true
        });
        return;
      }
      if (i > 0) {
        this.emit("phase", {
          phase: i + 1,
          of: ph.length,
          left: ph.slice(i).reduce((a, b) => a + b, 0)
        });
      }
      this.graceT = setTimeout(() => run(i + 1), ph[i]);
    };
    run(0);
  }
  _retry() {
    if (this.stopped) {
      return;
    }
    const t = setTimeout(() => this._open(), this.backoff);
    this.timers.push(t);
    const cap = this.holding ? [10000, 30000, 60000][Math.min(this.phase, 2)] : 30000;
    this.backoff = Math.min(this.backoff * 2, cap);
  }
  async _onMsg(m) {
    if (m.t === "pong") {
      this.lastPong = Date.now();
      return;
    }
    if (m.t === "status") {
      if (m.state === "resumed") {
        this._noGrace();
        this.afterLost = false;
        this.ready = true;
        this.emit("resumed", {});
        return;
      }
      if (m.state === "pending" && this.holding) {
        // đang giữ chức năng mà máy chủ lại xin duyệt = admin đã thu hồi (lệnh từ bot Discord) trong lúc mất kết nối
        this._noGrace();
        this.emit("wipe", {
          msg: "Admin đã thu hồi chức năng",
          had: true,
          code: 4001
        });
      }
      this._status(m.state, m.msg, m.eta);
      return;
    }
    if (m.t === "wipe") {
      this.afterLost = false;
      this._noGrace();
      this.ready = false;
      this.key = null;
      this.emit("wipe", {
        msg: m.msg || "",
        had: true,
        code: 4001
      });
      return;
    }
    if (m.t === "hello") {
      if (!this.pub) {
        throw new Error("app chưa ghim khóa máy chủ");
      }
      const spub = Buffer.from(m.spub, "base64");
      const snonce = Buffer.from(m.snonce, "base64");
      const sig = Buffer.from(m.sig, "base64");
      const pk = await C.subtle.importKey("raw", Buffer.from(this.pub, "base64"), {
        name: "ECDSA",
        namedCurve: "P-256"
      }, false, ["verify"]);
      const ok = await C.subtle.verify({
        name: "ECDSA",
        hash: {
          name: "SHA-256"
        }
      }, pk, sig, cat(this.cpub, spub, this.cnonce, snonce, te.encode(this.info.user)));
      if (!ok) {
        throw new Error("máy chủ không đáng tin (sai chữ ký)");
      }
      const sk = await C.subtle.importKey("raw", spub, {
        name: "ECDH",
        namedCurve: "P-256"
      }, false, []);
      const bits = await C.subtle.deriveBits({
        name: "ECDH",
        public: sk
      }, this.kp.privateKey, 256);
      const hk = await C.subtle.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
      this.key = await C.subtle.deriveKey({
        name: "HKDF",
        hash: "SHA-256",
        salt: cat(this.cnonce, snonce),
        info: te.encode("botafk-bundle-v1")
      }, hk, {
        name: "AES-GCM",
        length: 256
      }, false, ["decrypt"]);
      this.kp = null;
      return;
    }
    if (m.t === "chunk") {
      if (!this.key) {
        throw new Error("nhận dữ liệu khi chưa bắt tay");
      }
      if (!(m.n >= 1) || !(m.n <= 400) || !(m.i >= 0) || !(m.i < m.n)) {
        throw new Error("đoạn dữ liệu sai");
      }
      const pt = await C.subtle.decrypt({
        name: "AES-GCM",
        iv: Buffer.from(m.iv, "base64"),
        additionalData: te.encode(`${m.id}|${m.i}|${m.n}`)
      }, this.key, Buffer.from(m.d, "base64"));
      if (!this.chunks.has(m.id)) {
        this.chunks.set(m.id, new Map());
      }
      this.chunks.get(m.id).set(m.i, Buffer.from(pt));
      return;
    }
    if (m.t === "done") {
      const parts = this.chunks && this.chunks.get(m.id);
      if (!parts || parts.size !== m.n) {
        throw new Error("thiếu đoạn dữ liệu");
      }
      const gz = Buffer.concat([...Array(m.n).keys()].map(i => parts.get(i)));
      this.chunks.delete(m.id);
      const obj = JSON.parse(zlib.gunzipSync(gz, {
        maxOutputLength: 33554432
      }).toString("utf8"));
      if (!obj || typeof obj.files !== "object") {
        throw new Error("gói chức năng sai định dạng");
      }
      this._noGrace();
      this.afterLost = false;
      this.ready = true;
      this.emit("bundle", obj);
    }
  }
}
module.exports = {
  Bridge
};