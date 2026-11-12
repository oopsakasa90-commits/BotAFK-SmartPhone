const crypto = require("crypto");
const os = require("os");
const fs = require("fs");
const {
  execFileSync
} = require("child_process");
const API = process.env.BOTAFK_API || "https://botafk-license.oopsakasa9-0.workers.dev";
const VERSION = "2.0.0";
const HEARTBEAT_MS = Number(process.env.BOTAFK_HB_MS) || 120000;
const OFFLINE_LIMIT_MS = 50 * 60 * 1000; // 5 + 15 + 30 phút, cùng lịch với cầu nối chức năng
const TZ = "Asia/Ho_Chi_Minh";
function getHwid() {
  const _0x35d48b = {
    newmb: function (_0x27c92a, _0x25f024) {
      return _0x27c92a === _0x25f024;
    },
    RSQPB: "win32",
    sttvo: function (_0x578cae, _0x320710, _0x10b5bd, _0x4a1e75) {
      return _0x578cae(_0x320710, _0x10b5bd, _0x4a1e75);
    },
    gSqmQ: "reg",
    MphRM: "query",
    tRMEr: "HKLM\\SOFTWARE\\Microsoft\\Cryptography",
    xMnCT: "MachineGuid",
    qeSdW: "utf8",
    uUqsa: "/etc/machine-id",
    wWHKn: function (_0x485029, _0x1ae112) {
      return _0x485029 + _0x1ae112;
    },
    nlOKS: "botafk-v1:",
    BvLoE: "hex"
  };
  let _0x5e745c = "";
  try {
    if (_0x35d48b.newmb(process.platform, _0x35d48b.RSQPB)) {
      const _0x4b617f = _0x35d48b.sttvo(execFileSync, _0x35d48b.gSqmQ, [_0x35d48b.MphRM, _0x35d48b.tRMEr, "/v", _0x35d48b.xMnCT], {
        encoding: _0x35d48b.qeSdW,
        windowsHide: true
      });
      const _0x30d6b6 = _0x4b617f.match(/MachineGuid\s+REG_SZ\s+(\S+)/);
      if (_0x30d6b6) {
        _0x5e745c = _0x30d6b6[1];
      }
    } else {
      _0x5e745c = fs.readFileSync(_0x35d48b.uUqsa, _0x35d48b.qeSdW).trim();
    }
  } catch (_0x302e71) {}
  if (!_0x5e745c) {
    _0x5e745c = os.hostname() + "|" + (os.cpus()[0] ? os.cpus()[0].model : "") + "|" + os.totalmem();
  }
  return crypto.createHash("sha256").update(_0x35d48b.wWHKn(_0x35d48b.nlOKS, _0x5e745c)).digest(_0x35d48b.BvLoE);
}
async function post(_0x2424b2, _0x473594, _0x2e94d4 = 15000) {
  const _0x57c6b2 = {
    LZqSW: function (_0xf9cae0, _0x83bd07, _0x3af181) {
      return _0xf9cae0(_0x83bd07, _0x3af181);
    },
    FxMQD: function (_0x46496c, _0x19dd3a) {
      return _0x46496c + _0x19dd3a;
    },
    oFhcK: "POST",
    VpKkg: "application/json",
    COUUf: function (_0x558259, _0x24c71f) {
      return _0x558259 >= _0x24c71f;
    },
    BrvSb: function (_0x841963, _0xf4b196) {
      return _0x841963(_0xf4b196);
    }
  };
  const _0x3e9f56 = new AbortController();
  const _0x29fa5a = _0x57c6b2.LZqSW(setTimeout, () => _0x3e9f56.abort(), _0x2e94d4);
  try {
    const _0x70c00e = await _0x57c6b2.LZqSW(fetch, _0x57c6b2.FxMQD(API, _0x2424b2), {
      method: _0x57c6b2.oFhcK,
      headers: {
        "content-type": _0x57c6b2.VpKkg
      },
      body: JSON.stringify(_0x473594),
      signal: _0x3e9f56.signal
    });
    if (_0x57c6b2.COUUf(_0x70c00e.status, 500)) {
      throw new Error("máy chủ lỗi " + _0x70c00e.status);
    }
    const _0x22006a = await _0x70c00e.json().catch(() => ({
      ok: false,
      msg: "Phản hồi không hợp lệ"
    }));
    return {
      status: _0x70c00e.status,
      ..._0x22006a
    };
  } finally {
    _0x57c6b2.BrvSb(clearTimeout, _0x29fa5a);
  }
}
function fmtDate(_0x5eb5f9) {
  const _0x5f2a97 = {
    YNgCh: "vi-VN"
  };
  return new Date(_0x5eb5f9).toLocaleString(_0x5f2a97.YNgCh, {
    timeZone: TZ
  });
}
function createLicense({
  log: _0x568ee2,
  onStop: _0x1e661d,
  onOffline,
  onBack
}) {
  const _0x449c45 = {
    ApHaf: function (_0x210d3f, _0x2481ba) {
      return _0x210d3f(_0x2481ba);
    },
    yUsqL: function (_0x3b5947, _0xc72101, _0x565938) {
      return _0x3b5947(_0xc72101, _0x565938);
    },
    envyW: "/api/heartbeat",
    HoByt: function (_0xb6f52b, _0x3d2a6c) {
      return _0xb6f52b > _0x3d2a6c;
    },
    QVGBF: function (_0x5e6690, _0x1d33a8) {
      return _0x5e6690(_0x1d33a8);
    },
    MFbPy: "Gói đã hết hạn",
    fUINd: "Bản quyền không hợp lệ",
    jHIDL: function (_0x33eaef, _0x1aac62) {
      return _0x33eaef - _0x1aac62;
    },
    SYuAf: function (_0x3fa630, _0x2db739) {
      return _0x3fa630 > _0x2db739;
    },
    tClJE: "Không kết nối được máy chủ bản quyền quá 5 phút",
    ZIinc: function (_0x23f54e, _0x5d68d9) {
      return _0x23f54e / _0x5d68d9;
    },
    EufmA: function (_0x621ded, _0x5dc4d5) {
      return _0x621ded - _0x5dc4d5;
    },
    edTsN: "/api/login",
    HZgHN: function (_0x57cbe9, _0x39fd6d) {
      return _0x57cbe9 + _0x39fd6d;
    },
    xiabe: "Đăng nhập thất bại",
    EMaxs: "UliBP",
    XyWNa: function (_0x27cc6c, _0x3f899a) {
      return _0x27cc6c(_0x3f899a);
    }
  };
  const _0x4d0c5d = {
    user: null,
    session: null,
    hwid: null,
    expiresAt: 0,
    plan: null,
    timer: null,
    lastOk: 0,
    stopped: false,
    getStatus: () => ""
  };
  function _0x58d4e0(_0x39e974) {
    if (_0x4d0c5d.stopped) {
      return;
    }
    _0x4d0c5d.stopped = true;
    _0x449c45.ApHaf(clearInterval, _0x4d0c5d.timer);
    _0x1e661d(_0x39e974);
  }
  async function _0x375b84() {
    if (_0x4d0c5d.stopped) {
      return;
    }
    try {
      const _0x8cb406 = await _0x449c45.yUsqL(post, _0x449c45.envyW, {
        user: _0x4d0c5d.user,
        session: _0x4d0c5d.session,
        hwid: _0x4d0c5d.hwid,
        status: _0x4d0c5d.getStatus()
      });
      if (_0x8cb406.ok) {
        _0x4d0c5d.lastOk = Date.now();
        _0x4d0c5d.expiresAt = _0x8cb406.expiresAt;
        if (_0x4d0c5d.offline) {
          _0x4d0c5d.offline = false;
          _0x568ee2("Đã kết nối lại máy chủ bản quyền.");
          if (onBack) {
            try {
              onBack();
            } catch (_) {}
          }
        }
        if (_0x449c45.HoByt(Date.now(), _0x4d0c5d.expiresAt)) {
          _0x449c45.QVGBF(_0x58d4e0, _0x449c45.MFbPy);
        }
        return;
      }
      // chỉ dừng khi máy chủ trả lời dứt khoát (401/403: hết hạn, khóa, đổi máy, phiên sai); lỗi tạm thời coi như mất kết nối
      if (_0x8cb406.status === 403 || _0x8cb406.status === 401) {
        return _0x449c45.QVGBF(_0x58d4e0, _0x8cb406.msg || _0x449c45.fUINd);
      }
      throw new Error(_0x8cb406.msg || "phản hồi lạ " + _0x8cb406.status);
    } catch (_0x5a9414) {
      const _0x43044e = _0x449c45.jHIDL(Date.now(), _0x4d0c5d.lastOk);
      if (_0x449c45.SYuAf(_0x43044e, OFFLINE_LIMIT_MS)) {
        // quá 50 phút không nối lại được: dừng các acc nhưng giữ vòng kiểm tra, có mạng lại là tự chạy lại
        if (!_0x4d0c5d.offline) {
          _0x4d0c5d.offline = true;
          _0x568ee2("Không kết nối được máy chủ bản quyền quá 50 phút, đã dừng các acc. Sẽ tự chạy lại khi có kết nối.");
          if (onOffline) {
            try {
              onOffline();
            } catch (_) {}
          }
        }
      } else {
        _0x568ee2("Mất kết nối máy chủ bản quyền (" + _0x5a9414.message + "), sẽ thử lại. Dừng sau " + Math.ceil(_0x449c45.ZIinc(_0x449c45.EufmA(OFFLINE_LIMIT_MS, _0x43044e), 60000)) + " phút nếu vẫn lỗi.");
      }
    }
  }
  async function _0x3c6f11(_0x26bd6a, _0x5aa0d2, _auto) {
    const _0x7a22df = getHwid();
    let _0x13c549;
    try {
      _0x13c549 = await post(_0x449c45.edTsN, {
        user: _0x26bd6a,
        pass: _0x5aa0d2,
        hwid: _0x7a22df,
        auto: !!_auto,
        discordToken: process.env.BOTAFK_DISCORD_TOKEN || "",
        version: VERSION
      });
    } catch (_0xe4a034) {
      const _0x40c45c = _0xe4a034.cause ? (" - " + (_0xe4a034.cause.code || "") + " " + (_0xe4a034.cause.message || "")).trim() : "";
      return {
        ok: false,
        msg: "Không kết nối được máy chủ bản quyền (" + _0xe4a034.message + (_0x40c45c ? _0x449c45.HZgHN(": ", _0x40c45c) : "") + ")"
      };
    }
    if (!_0x13c549.ok) {
      return {
        ok: false,
        msg: _0x13c549.msg || _0x449c45.xiabe
      };
    }
    Object.assign(_0x4d0c5d, {
      user: _0x26bd6a,
      session: _0x13c549.session,
      hwid: _0x7a22df,
      expiresAt: _0x13c549.expiresAt,
      plan: _0x13c549.plan,
      lastOk: Date.now(),
      stopped: false,
      offline: false
    });
    _0x449c45.QVGBF(clearInterval, _0x4d0c5d.timer);
    _0x4d0c5d.timer = _0x449c45.yUsqL(setInterval, _0x375b84, HEARTBEAT_MS);
    return {
      ok: true,
      plan: _0x13c549.plan,
      expiresAt: _0x13c549.expiresAt
    };
  }
  return {
    login: _0x3c6f11,
    setStatusGetter: _0x11a302 => _0x4d0c5d.getStatus = _0x11a302,
    info: () => ({
      user: _0x4d0c5d.user,
      plan: _0x4d0c5d.plan,
      expiresAt: _0x4d0c5d.expiresAt
    }),
    stop: () => {
      if (_0x449c45.EMaxs !== _0x449c45.EMaxs) {
        return new _0x55f2b9(_0x5104f4).toLocaleString("vi-VN", {
          timeZone: _0x32cb92
        });
      } else {
        _0x449c45.XyWNa(clearInterval, _0x4d0c5d.timer);
        _0x4d0c5d.stopped = true;
      }
    }
  };
}
module.exports = {
  createLicense: createLicense,
  getHwid: getHwid,
  fmtDate: fmtDate,
  VERSION: VERSION
};