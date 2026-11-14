const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  safeStorage,
  shell
} = require("electron");
const path = require("path");
const fs = require("fs");
const {
  fork
} = require("child_process");
const {
  createLicense,
  getHwid
} = require("./src/license");
const {
  parseProxy,
  checkProxy
} = require("./src/proxy");
const {
  checkUpdate,
  downloadAndVerify,
  applyUpdate
} = require("./src/updater");
let win = null;
const lic = {
  state: null
};
const accounts = new Map();
const runners = new Map();
let licenseOk = false;
const storePath = () => path.join(app.getPath("userData"), "accounts.dat");
function loadAccounts() {
  const _0x4821dd = {
    UvdMJ: function (_0x1e49e0) {
      return _0x1e49e0();
    },
    gnGDM: "utf8"
  };
  accounts.clear();
  try {
    const _0x8321fd = fs.readFileSync(_0x4821dd.UvdMJ(storePath));
    const _0x32e819 = safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(_0x8321fd) : _0x8321fd.toString(_0x4821dd.gnGDM);
    for (const _0xe4d131 of JSON.parse(_0x32e819)) {
      accounts.set(_0xe4d131.id, _0xe4d131);
    }
  } catch (_0x571394) {}
}
function saveAccounts() {
  const _0x199817 = {
    YNXiR: function (_0x46a338) {
      return _0x46a338();
    },
    mpdQy: function (_0x2c2d20) {
      return _0x2c2d20();
    }
  };
  const _0x7c56b8 = JSON.stringify([...accounts.values()]);
  const _0xed41c3 = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(_0x7c56b8) : Buffer.from(_0x7c56b8, "utf8");
  fs.mkdirSync(path.dirname(_0x199817.YNXiR(storePath)), {
    recursive: true
  });
  fs.writeFileSync(_0x199817.mpdQy(storePath), _0xed41c3);
}
const REMEMBER_MS = 3650 * 86400000; // nhớ đăng nhập gần như vĩnh viễn (10 năm), chỉ mất khi bấm Đăng xuất hoặc đổi mật khẩu
const rememberPath = () => path.join(app.getPath("userData"), "remember.dat");
function saveRemember(_0x59bdd4, _0x32cc91) {
  const _0xf3830e = {
    afFKc: function (_0x5853b9) {
      return _0x5853b9();
    },
    EqLnB: function (_0x22a7f6) {
      return _0x22a7f6();
    }
  };
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      return;
    }
    const _0x4564a1 = safeStorage.encryptString(JSON.stringify({
      user: _0x59bdd4,
      pass: _0x32cc91,
      hwid: getHwid(),
      at: Date.now()
    }));
    fs.mkdirSync(path.dirname(_0xf3830e.afFKc(rememberPath)), {
      recursive: true
    });
    fs.writeFileSync(_0xf3830e.EqLnB(rememberPath), _0x4564a1);
  } catch (_0x57f68c) {}
}
function loadRemember() {
  const _0xb7d0b6 = {
    lmMwt: function (_0x22345b) {
      return _0x22345b();
    },
    zgGSi: "did-finish-load",
    cwyCX: function (_0x36a8fd, _0x141229) {
      return _0x36a8fd > _0x141229;
    },
    VUQkd: function (_0x413dd9, _0x494130) {
      return _0x413dd9 - _0x494130;
    },
    ZiKdi: function (_0x554a1a, _0x5d9292) {
      return _0x554a1a !== _0x5d9292;
    },
    uIlNB: "npEOf"
  };
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      return null;
    }
    const _0x5848fb = JSON.parse(safeStorage.decryptString(fs.readFileSync(rememberPath())));
    if (!_0x5848fb || !_0x5848fb.user || !_0x5848fb.pass || !_0x5848fb.at) {
      return null;
    }
    if (_0xb7d0b6.cwyCX(_0xb7d0b6.VUQkd(Date.now(), _0x5848fb.at), REMEMBER_MS)) {
      return null;
    }
    // chỉ dùng lại phiên đã nhớ khi đúng máy (HWID); khác máy thì phải đăng nhập lại
    if (_0x5848fb.hwid && _0x5848fb.hwid !== getHwid()) {
      return null;
    }
    return _0x5848fb;
  } catch (_0x5bf32b) {
    if (_0xb7d0b6.ZiKdi("JpeGI", _0xb7d0b6.uIlNB)) {
      return null;
    } else {
      _0xb7d0b6.lmMwt(_0x174c70);
      _0xb7d0b6.lmMwt(_0x25492c);
      _0x4ef30c.webContents.once(_0xb7d0b6.zgGSi, () => {
        _0xb1dc30().catch(() => {});
      });
    }
  }
}
function clearRemember() {
  const _0xc70357 = {
    abrTI: function (_0x2c4503) {
      return _0x2c4503();
    }
  };
  try {
    fs.rmSync(_0xc70357.abrTI(rememberPath), {
      force: true
    });
  } catch (_0x57fcff) {}
}
const sendUi = (_0x3e695d, _0x410f38) => {
  if (win && !win.isDestroyed()) {
    win.webContents.send(_0x3e695d, _0x410f38);
  }
};
function publicAccount(_0x261a36) {
  const _0x598b9e = {
    VyHZH: "stopped"
  };
  const _0xb163c7 = runners.get(_0x261a36.id);
  return {
    id: _0x261a36.id,
    label: _0x261a36.label,
    host: _0x261a36.host,
    port: _0x261a36.port,
    username: _0x261a36.username,
    version: _0x261a36.version || "",
    proxy: _0x261a36.proxy || "",
    running: !!_0xb163c7,
    status: _0xb163c7 ? _0xb163c7.status : _0x598b9e.VyHZH,
    features: _0xb163c7 ? _0xb163c7.features : {},
    mine: _0xb163c7 ? _0xb163c7.mine || null : null,
    quest: _0xb163c7 ? _0xb163c7.quest || null : null
  };
}
function pushAccounts() {
  const _0x35e27a = {
    MJbeL: function (_0x65ffbc, _0x36f055, _0x3c4aba) {
      return _0x65ffbc(_0x36f055, _0x3c4aba);
    }
  };
  _0x35e27a.MJbeL(sendUi, "accounts", [...accounts.values()].map(publicAccount));
}
const EXPIRED_MSG = "Tài khoản hết hạn, liên hệ Akasa nếu muốn sử dụng tiếp";
const WARN_MS = 300000;
let expiryTimer = null;
let keyCheckTimer = null;
let warned = false;
let lastCount = null;
let lockPending = false;
function killLocalData() {
  try { clearInterval(expiryTimer); } catch (_) {}
  for (const id of [...runners.keys()]) { try { stopAccount(id); } catch (_) {} }
  try { sendUi("license", { ok: false, msg: "Tài khoản đã bị xóa toàn bộ dữ liệu theo lệnh admin" }); } catch (_) {}
  try { clearRemember(); } catch (_) {}
  try {
    const dir = app.getPath("userData");
    setTimeout(() => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} if (app.exit) app.exit(0); else app.quit(); }, 300);
  } catch (_) { if (app.exit) app.exit(0); else app.quit(); }
}
function lockApp(_0x248a15) {
  const _0x3b43c3 = {
    dbDde: function (_0x47579c, _0x1158a3) {
      return _0x47579c(_0x1158a3);
    },
    HLvTn: function (_0x155a6f, _0x167f33) {
      return _0x155a6f(_0x167f33);
    },
    ePuqL: function (_0x374262, _0x2dade5, _0x142468) {
      return _0x374262(_0x2dade5, _0x142468);
    }
  };
  licenseOk = false;
  _0x3b43c3.dbDde(clearInterval, expiryTimer);
  expiryTimer = null;
  for (const _0x17a5c0 of [...runners.keys()]) {
    _0x3b43c3.HLvTn(stopAccount, _0x17a5c0);
  }
  _0x3b43c3.ePuqL(sendUi, "license", {
    ok: false,
    msg: _0x248a15
  });
}
function watchExpiry() {
  const _0x4ffc41 = {
    jbnaZ: "event",
    ImEKd: "status",
    KZBPE: function (_0x36a71e) {
      return _0x36a71e();
    },
    IYNip: function (_0xb8576e, _0x52025f) {
      return _0xb8576e !== _0x52025f;
    },
    ZOpNl: function (_0x576929, _0x2d3bb9) {
      return _0x576929 === _0x2d3bb9;
    },
    vtZoc: "log",
    GQsqf: "stopped",
    MEAWk: function (_0x5e8bef, _0x2c7a67, _0x450ed3) {
      return _0x5e8bef(_0x2c7a67, _0x450ed3);
    },
    pITCN: "online",
    yCSQC: function (_0x298aca, _0x190ffa) {
      return _0x298aca(_0x190ffa);
    },
    jNepV: function (_0xbdc881, _0xaecfef) {
      return _0xbdc881 > _0xaecfef;
    },
    Bsyzq: "fmLoZ",
    tZuJO: "expiry",
    FlsVq: function (_0x201cf8, _0x40d769, _0x4819b8) {
      return _0x201cf8(_0x40d769, _0x4819b8);
    },
    aKITp: "Tài khoản còn 5 phút nữa sẽ hết hạn",
    eUmkC: function (_0x413d7e, _0x3d65dd) {
      return _0x413d7e <= _0x3d65dd;
    },
    AfUeB: "uWpQL",
    duUAO: "xcoCR",
    oABGs: function (_0x1274aa, _0x51feac) {
      return _0x1274aa / _0x51feac;
    },
    uIebR: "oyDyp",
    UcQuQ: "HlKFl",
    cFTYF: function (_0x604fe6, _0x192df7, _0x111b1d) {
      return _0x604fe6(_0x192df7, _0x111b1d);
    },
    VmyKS: "count",
    sWGiF: function (_0x5ed8ad, _0xa88d34) {
      return _0x5ed8ad <= _0xa88d34;
    },
    rLOmF: "szUbv",
    ZjVTQ: "METaP",
    NatwA: function (_0x19eea2, _0xae631b) {
      return _0x19eea2(_0xae631b);
    },
    VUEiT: function (_0x591458, _0xf6d87b, _0x3f5223) {
      return _0x591458(_0xf6d87b, _0x3f5223);
    },
    QPLMH: "done"
  };
  clearInterval(expiryTimer);
  warned = false;
  lastCount = null;
  lockPending = false;
  expiryTimer = setInterval(() => {
    const _0x39747f = {
      fzier: function (_0x9e3555, _0x25914e) {
        return _0x4ffc41.IYNip(_0x9e3555, _0x25914e);
      },
      yRTLX: function (_0x29a016, _0x13dcd8) {
        return _0x4ffc41.ZOpNl(_0x29a016, _0x13dcd8);
      },
      ZhHWh: function (_0x3c88c3, _0x10f80c, _0x26d449) {
        return _0x3c88c3(_0x10f80c, _0x26d449);
      },
      VwmCP: _0x4ffc41.jbnaZ,
      ZRVld: _0x4ffc41.vtZoc,
      zLVfg: function (_0xfc22f4, _0x2c5dbb) {
        return _0xfc22f4 === _0x2c5dbb;
      },
      RVPsv: _0x4ffc41.ImEKd,
      nnFOQ: function (_0x5c43ce, _0x1dc7e0) {
        return _0x4ffc41.ZOpNl(_0x5c43ce, _0x1dc7e0);
      },
      klsPO: _0x4ffc41.GQsqf,
      EybAE: function (_0x1a5c72, _0x1e279f, _0x515127) {
        return _0x4ffc41.MEAWk(_0x1a5c72, _0x1e279f, _0x515127);
      },
      gwKUn: function (_0x23614b) {
        return _0x23614b();
      },
      UGdbb: _0x4ffc41.pITCN,
      CQHwh: function (_0x155465, _0x4f4af9) {
        return _0x4ffc41.yCSQC(_0x155465, _0x4f4af9);
      }
    };
    if (!licenseOk) {
      return;
    }
    const _0x2eeb91 = license.info().expiresAt;
    if (!_0x2eeb91) {
      return;
    }
    const _0x2dd846 = _0x2eeb91 - Date.now();
    if (_0x4ffc41.jNepV(_0x2dd846, WARN_MS)) {
      if (_0x4ffc41.IYNip(_0x4ffc41.Bsyzq, _0x4ffc41.Bsyzq)) {
        if (!_0x59d717 || _0x39747f.fzier(typeof _0x353e8d, "object")) {
          return;
        }
        if (_0x39747f.yRTLX(_0x3194b6.type, "log")) {
          _0x39747f.ZhHWh(_0x346428, _0x39747f.VwmCP, {
            type: _0x39747f.ZRVld,
            id: _0x3c0522,
            text: _0xc82d46.text
          });
        }
        if (_0x39747f.zLVfg(_0x5e9c38.type, _0x39747f.RVPsv)) {
          _0x5b92b4.status = _0x33738b.value;
          if (_0x39747f.nnFOQ(_0x4de0b8.value, _0x39747f.klsPO)) {
            _0x37dc7a.status = _0x39747f.klsPO;
          }
          const {
            seller: _0x25fab8,
            farmer: _0x501d3c,
            automine: _0x575096,
            autoeat: _0x529358,
            autofarm: _0x2e78ad,
            autoquest: _0x1bde67
          } = _0x37bc5e;
          if (_0x39747f.fzier(_0x2e4330.mine, _0x438b42)) {
            _0x16de95.mine = _0x2ad03d.mine;
          }
          if (_0x39747f.fzier(_0x4fd06d.quest, _0x3d7773)) {
            _0x1bb27.quest = _0x506d7e.quest;
          }
          if (_0x39747f.fzier(_0x25fab8, _0x3a5c86)) {
            _0x55d60e.features = {
              seller: _0x25fab8,
              farmer: _0x501d3c,
              automine: _0x575096,
              autoeat: _0x529358,
              autofarm: !!_0x2e78ad,
              autoquest: !!_0x1bde67
            };
          }
          _0x39747f.EybAE(_0x55c505, _0x39747f.VwmCP, {
            type: _0x39747f.RVPsv,
            id: _0x14f719,
            status: _0x3ef48d.status,
            features: _0x573437.features,
            quest: _0x57b3b8.quest || null,
            mine: _0x37bd47.mine || null
          });
          _0x39747f.gwKUn(_0x38dd7f);
        }
      } else {
        if (warned) {
          _0x4ffc41.MEAWk(sendUi, _0x4ffc41.tZuJO, {
            stage: "clear"
          });
        }
        warned = false;
        lastCount = null;
        return;
      }
    }
    if (!warned) {
      warned = true;
      shell.beep();
      _0x4ffc41.FlsVq(sendUi, _0x4ffc41.tZuJO, {
        stage: "warn",
        text: _0x4ffc41.aKITp
      });
    }
    if (_0x4ffc41.eUmkC(_0x2dd846, 5000) && _0x4ffc41.jNepV(_0x2dd846, 0)) {
      if (_0x4ffc41.AfUeB !== _0x4ffc41.duUAO) {
        const _0x97ff43 = Math.ceil(_0x4ffc41.oABGs(_0x2dd846, 1000));
        if (_0x4ffc41.IYNip(_0x97ff43, lastCount)) {
          if (_0x4ffc41.uIebR !== _0x4ffc41.UcQuQ) {
            lastCount = _0x97ff43;
            shell.beep();
            _0x4ffc41.cFTYF(sendUi, _0x4ffc41.tZuJO, {
              stage: _0x4ffc41.VmyKS,
              n: _0x97ff43
            });
          } else {
            const _0x1f835f = [..._0xe9117a.values()].find(_0x57c069 => _0x57c069.status && _0x57c069.status !== "stopped");
            if (_0x1f835f) {
              return _0x1f835f.status;
            } else {
              return _0x39747f.UGdbb;
            }
          }
        }
      } else {
        if (_0x59f091.get(_0x66aed2) === _0x587ca7) {
          _0x244026.delete(_0x38f2e8);
        }
        _0x312089(_0x4ffc41.jbnaZ, {
          type: _0x4ffc41.ImEKd,
          id: _0x553e67,
          status: "stopped",
          features: {}
        });
        _0x4ffc41.KZBPE(_0x2d82be);
      }
    }
    if (_0x4ffc41.sWGiF(_0x2dd846, 0)) {
      if (_0x4ffc41.ZOpNl(_0x4ffc41.rLOmF, _0x4ffc41.ZjVTQ)) {
        _0x39747f.CQHwh(_0x443d35, _0x1aecb6);
      } else {
        if (lockPending) {
          return;
        }
        lockPending = true;
        licenseOk = false;
        for (const _0x4d03d7 of [...runners.keys()]) {
          _0x4ffc41.NatwA(stopAccount, _0x4d03d7);
        }
        _0x4ffc41.VUEiT(sendUi, _0x4ffc41.tZuJO, {
          stage: _0x4ffc41.QPLMH
        });
        setTimeout(() => lockApp(EXPIRED_MSG), 6000);
      }
    }
  }, 1000);
}
let offlineIds = [];
const license = createLicense({
  // quá 50 phút không liên lạc được máy chủ bản quyền: dừng acc nhưng không khóa app, có kết nối lại là tự chạy lại
  onOffline: () => {
    offlineIds = [...runners.keys()];
    for (const id of offlineIds) {
      try { stopAccount(id); } catch (_) {}
    }
  },
  onBack: async () => {
    const ids = offlineIds;
    offlineIds = [];
    for (const id of ids) {
      if (!licenseOk) return;
      try { await startAccount(id); } catch (_) {}
      await new Promise((res) => setTimeout(res, 1500));
    }
  },
  log: _0x498632 => sendUi("event", {
    type: "log",
    text: _0x498632
  }),
  onStop: (_0x30ca4d, _0xkill) => {
    if (_0xkill) return killLocalData();
    const _0x3787fc = {
      uvDnz: function (_0x1046c1, _0x1fe4f4, _0x56f07f) {
        return _0x1046c1(_0x1fe4f4, _0x56f07f);
      },
      jHEds: "expiry",
      wwgbn: function (_0x18da3c, _0x5b126c) {
        return _0x18da3c(_0x5b126c);
      }
    };
    if (/hết hạn/i.test(_0x30ca4d)) {
      _0x3787fc.uvDnz(sendUi, _0x3787fc.jHEds, {
        stage: "done"
      });
      return _0x3787fc.wwgbn(lockApp, EXPIRED_MSG);
    }
    lockApp("BẢN QUYỀN: " + _0x30ca4d + ". Đã dừng toàn bộ acc.");
  }
});
license.setStatusGetter(() => {
  const _0x1abbcb = [...runners.values()].find(_0x2ff9ba => _0x2ff9ba.status && _0x2ff9ba.status !== "stopped");
  if (_0x1abbcb) {
    return _0x1abbcb.status;
  } else {
    return "online";
  }
});
async function doLicenseLogin(_0x262864, _0x2422e3, _auto) {
  const _0x41b219 = {
    Nbdps: function (_0xee2831) {
      return _0xee2831();
    },
    UWvUW: function (_0x23b282, _0x2bbfd8) {
      return _0x23b282 !== _0x2bbfd8;
    },
    IUrql: "WgBaf",
    gfOTk: "esEwp"
  };
  const _0xebd0d = await license.login(_0x262864, _0x2422e3, _auto);
  if (_0xebd0d.ok) {
    if (_0x41b219.UWvUW(_0x41b219.IUrql, _0x41b219.gfOTk)) {
      licenseOk = true;
      lic.state = {
        user: _0x262864,
        plan: _0xebd0d.plan,
        expiresAt: _0xebd0d.expiresAt
      };
      watchExpiry();
      verifyKeys();
      clearInterval(keyCheckTimer);
      keyCheckTimer = setInterval(verifyKeys, 60000); // cho /xoachucnang có tác dụng mà không cần mở lại app
    } else {
      try {
        _0x488f30.rmSync(_0x41b219.Nbdps(_0x2862a7), {
          force: true
        });
      } catch (_0x3bff60) {}
    }
  }
  return _0xebd0d;
}
ipcMain.handle("license:login", async (_0x36d532, _0x1aa1e1, _0xcc5843) => {
  const _0x71b09c = {
    EFgCV: function (_0x167bc4, _0x136509) {
      return _0x167bc4(_0x136509);
    },
    MKDhg: function (_0x2f6108, _0x22bf25) {
      return _0x2f6108 || _0x22bf25;
    },
    EKvPI: function (_0x35fbf4, _0x2ed1e1) {
      return _0x35fbf4(_0x2ed1e1);
    },
    wOIDb: function (_0x3c5d70, _0x1a424a) {
      return _0x3c5d70 || _0x1a424a;
    },
    Viykf: function (_0x4b4f3f, _0x74a5b0, _0x43ac1d) {
      return _0x4b4f3f(_0x74a5b0, _0x43ac1d);
    }
  };
  const _0x45dd57 = _0x71b09c.EFgCV(String, _0x71b09c.MKDhg(_0x1aa1e1, "")).trim();
  const _0x47b000 = _0x71b09c.EKvPI(String, _0x71b09c.wOIDb(_0xcc5843, "")).trim();
  const _0x35c068 = await doLicenseLogin(_0x45dd57, _0x47b000);
  if (!_0x35c068.ok) {
    if (_0x35c068.kill) killLocalData();
    return {
      ok: false,
      msg: _0x35c068.msg
    };
  }
  _0x71b09c.Viykf(saveRemember, _0x45dd57, _0x47b000);
  return {
    ok: true,
    state: lic.state
  };
});
let autoLoginBusy = false;
async function tryAutoLogin() {
  if (autoLoginBusy) return;
  const saved = loadRemember();
  if (!saved) return;
  autoLoginBusy = true;
  try {
    // Lỗi tạm thời (mất mạng, phiên cũ chưa kịp thoát, giới hạn thử) thì giữ tài khoản đã nhớ và thử lại.
    // Chỉ xóa khi máy chủ nói rõ sai tài khoản/mật khẩu (ví dụ admin đã đổi mật khẩu).
    for (let i = 0; i < 40; i++) {
      const r = await doLicenseLogin(saved.user, saved.pass, true);
      if (r.ok) {
        saveRemember(saved.user, saved.pass); // làm mới thời hạn nhớ
        sendUi("autologin", { ok: true, state: lic.state });
        return;
      }
      const m = r.msg || "";
      if (/Sai tài khoản|chưa được cấp mật khẩu|không tồn tại|đăng nhập lại/i.test(m)) {
        clearRemember();
        return;
      }
      if (/khóa|hết hạn|gắn với máy khác/i.test(m)) return; // giữ nguyên, admin xử lý xong là vào lại được
      await new Promise((res) => setTimeout(res, 30000));
    }
  } finally {
    autoLoginBusy = false;
  }
}
ipcMain.handle("license:state", () => ({
  ok: licenseOk,
  state: lic.state
}));
ipcMain.handle("license:logout", () => {
  clearInterval(keyCheckTimer);
  keyCheckTimer = null;
  const _0x573bb8 = {
    GJeSI: function (_0x244e06) {
      return _0x244e06();
    }
  };
  _0x573bb8.GJeSI(clearRemember);
  licenseOk = false;
  lic.state = null;
  clearInterval(expiryTimer);
  expiryTimer = null;
  license.stop();
  for (const _0xcca27b of [...runners.keys()]) {
    stopAccount(_0xcca27b);
  }
  return {
    ok: true
  };
});
ipcMain.handle("app:info", () => ({
  version: app.getVersion()
}));
const KEY_FEATURES = ["autoquest", "automine", "sellspawner", "fightbot", "clickui"];
const keysPath = () => path.join(app.getPath("userData"), "keys.dat");
const unlocked = new Set();
let savedKeys = [];
let keysLoaded = false;
function refreshUnlocked() {
  unlocked.clear();
  for (const _0x263c0d of savedKeys) {
    if (KEY_FEATURES.includes(_0x263c0d.feature)) {
      unlocked.add(_0x263c0d.feature);
    }
  }
}
function ensureKeys() {
  const _0x412226 = {
    mfhqJ: function (_0x105d53) {
      return _0x105d53();
    }
  };
  if (keysLoaded) {
    return;
  }
  keysLoaded = true;
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      return;
    }
    savedKeys = JSON.parse(safeStorage.decryptString(fs.readFileSync(_0x412226.mfhqJ(keysPath))));
  } catch (_0xe5ad82) {
    savedKeys = [];
  }
  _0x412226.mfhqJ(refreshUnlocked);
}
function saveKeys() {
  const _0x3b7d8d = {
    aOkOo: function (_0x24caf8) {
      return _0x24caf8();
    }
  };
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      return;
    }
    fs.writeFileSync(_0x3b7d8d.aOkOo(keysPath), safeStorage.encryptString(JSON.stringify(savedKeys)));
  } catch (_0x596f2e) {}
}
function clearKeys() {
  const _0xae89ef = {
    uYBUo: function (_0xf546bf, _0x2dfdc8) {
      return _0xf546bf(_0x2dfdc8);
    },
    EQcAd: function (_0xf93e56, _0x2988d4) {
      return _0xf93e56(_0x2988d4);
    },
    UWxow: function (_0x239d00, _0x9ba2a3) {
      return _0x239d00(_0x9ba2a3);
    },
    UyfZG: function (_0x30070e) {
      return _0x30070e();
    },
    QWlPF: "JQiyZ"
  };
  savedKeys = [];
  unlocked.clear();
  try {
    if (_0xae89ef.QWlPF !== "JQiyZ") {
      const _0x53f34a = _0x392797.id || "acc_" + _0x1974de.now() + "_" + _0x487d2a.random().toString(36).slice(2, 7);
      const _0x3e463c = _0x3a3e82.get(_0x53f34a) || {};
      const _0x27ae05 = {
        id: _0x53f34a,
        label: _0xae89ef.uYBUo(_0x169f59, _0xf7fa1.label || _0x44ec9b.username || "Acc").slice(0, 40),
        host: _0x4c938e(_0x2c2186.host || "").trim(),
        port: _0xae89ef.uYBUo(_0x138078, _0x296ef1.port) || 25565,
        username: _0xae89ef.uYBUo(_0x2e2f65, _0x5825b7.username || "").trim(),
        password: _0x3657ca.password ? _0x526802(_0x51be42.password) : _0x3e463c.password || "",
        version: _0x19766d(_0x405f61.version || "").trim(),
        proxy: _0xae89ef.EQcAd(_0x498b84, _0x678372.proxy || "").trim()
      };
      if (!_0x27ae05.host || !_0x27ae05.username || !_0x27ae05.password) {
        return {
          ok: false,
          msg: "Thiếu IP, tên bot hoặc mật khẩu."
        };
      }
      try {
        _0xae89ef.UWxow(_0xfd39b2, _0x27ae05.proxy);
      } catch (_0x3bd302) {
        return {
          ok: false,
          msg: _0x3bd302.message
        };
      }
      _0x41d68c.set(_0x53f34a, _0x27ae05);
      _0xae89ef.UyfZG(_0x589cbd);
      _0xae89ef.UyfZG(_0x5a97ac);
      return {
        ok: true,
        id: _0x53f34a
      };
    } else {
      fs.rmSync(keysPath(), {
        force: true
      });
    }
  } catch (_0x5c41a6) {}
}
function broadcastUnlocked() {
  const _0x345233 = {
    JYCAn: function (_0x7b7484) {
      return _0x7b7484();
    },
    ByBCd: function (_0x512602) {
      return _0x512602();
    },
    IEnEo: function (_0x384711, _0x91ecf4, _0x276a87) {
      return _0x384711(_0x91ecf4, _0x276a87);
    },
    WQJXg: "keys",
    vIdFY: function (_0x4f7d5e, _0x3df45b) {
      return _0x4f7d5e === _0x3df45b;
    },
    JJokP: "MkNwn",
    ZDinq: "KcRwz"
  };
  _0x345233.IEnEo(sendUi, "event", {
    type: _0x345233.WQJXg,
    features: [...unlocked]
  });
  for (const _0xeb09b9 of runners.values()) {
    try {
      if (_0x345233.vIdFY(_0x345233.JJokP, _0x345233.ZDinq)) {
        _0x345233.JYCAn(_0x9077b7);
        _0x13df0d();
        _0x345233.ByBCd(_0x36bc72);
      } else {
        _0xeb09b9.child.send({
          type: "unlock",
          features: [...unlocked]
        });
      }
    } catch (_0xf4f21f) {}
  }
}
async function keyPost(_0x10aa54, _0x597a60) {
  const _0x250fd2 = {
    WhiAn: function (_0x83a29, _0x58f083, _0x38d29a) {
      return _0x83a29(_0x58f083, _0x38d29a);
    },
    Hrtep: function (_0x2029b6, _0x30465c) {
      return _0x2029b6 + _0x30465c;
    },
    jlpsU: "POST",
    bzQaR: function (_0x464f12, _0x511a4b) {
      return _0x464f12 >= _0x511a4b;
    },
    LQIFk: function (_0x1ea141, _0x35eebf) {
      return _0x1ea141(_0x35eebf);
    }
  };
  const _0x2b75d5 = new AbortController();
  const _0x18bd3e = setTimeout(() => _0x2b75d5.abort(), 15000);
  try {
    const _0x2a941b = await _0x250fd2.WhiAn(fetch, _0x250fd2.Hrtep(API_BASE, _0x10aa54), {
      method: _0x250fd2.jlpsU,
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(_0x597a60),
      signal: _0x2b75d5.signal
    });
    if (_0x250fd2.bzQaR(_0x2a941b.status, 500)) {
      throw new Error("máy chủ lỗi " + _0x2a941b.status);
    }
    const _0x595708 = await _0x2a941b.json().catch(() => ({
      ok: false,
      msg: "Phản hồi không hợp lệ"
    }));
    return {
      status: _0x2a941b.status,
      ..._0x595708
    };
  } finally {
    _0x250fd2.LQIFk(clearTimeout, _0x18bd3e);
  }
}
async function verifyKeys() {
  const _0x4c2c11 = {
    NIfkt: "unlock",
    RNDbT: function (_0x214eb4, _0x54fa16) {
      return _0x214eb4(_0x54fa16);
    },
    VwRsF: function (_0x420e28) {
      return _0x420e28();
    },
    AClEa: function (_0x4a1bbe) {
      return _0x4a1bbe();
    },
    kaLVA: "imGcf",
    fZeQd: "oxYbn",
    MmKQC: function (_0x5372e3, _0x446c32) {
      return _0x5372e3 !== _0x446c32;
    },
    wKGTQ: "PmRXZ",
    yHQbi: function (_0x223d42, _0x4ff271, _0x1917d1) {
      return _0x223d42(_0x4ff271, _0x1917d1);
    },
    zKZmZ: "/api/key/check",
    UbomK: function (_0x394edf, _0x2377dd) {
      return _0x394edf === _0x2377dd;
    },
    ZgylO: function (_0x469534) {
      return _0x469534();
    },
    fZoSH: function (_0x52b710) {
      return _0x52b710();
    },
    kJJVx: function (_0x1a0bd9) {
      return _0x1a0bd9();
    }
  };
  _0x4c2c11.VwRsF(ensureKeys);
  if (!savedKeys.length) {
    return;
  }
  const _0x2c2ea3 = _0x4c2c11.AClEa(getHwid);
  let _0xa4b6fd = false;
  for (const _0x4f3f3e of [...savedKeys]) {
    if (_0x4c2c11.kaLVA === _0x4c2c11.fZeQd) {
      try {
        _0x5e3981.child.send({
          type: _0x4c2c11.NIfkt,
          features: [..._0x2001b1]
        });
      } catch (_0x3151b7) {}
    } else {
      let _0x5ae375;
      try {
        if (_0x4c2c11.MmKQC(_0x4c2c11.wKGTQ, _0x4c2c11.wKGTQ)) {
          _0x35a237();
          _0x59d936 = false;
          _0x553b81.state = null;
          _0x4c2c11.RNDbT(_0xdf470e, _0x4b9ef0);
          _0x1eca7b = null;
          _0x415f3b.stop();
          for (const _0x8845b6 of [..._0x3d8c6c.keys()]) {
            _0x4c7749(_0x8845b6);
          }
          return {
            ok: true
          };
        } else {
          _0x5ae375 = await _0x4c2c11.yHQbi(keyPost, _0x4c2c11.zKZmZ, {
            key: _0x4f3f3e.key,
            hwid: _0x2c2ea3
          });
        }
      } catch (_0xf1c1c1) {
        continue;
      }
      if (_0x4c2c11.UbomK(_0x5ae375.status, 200) && !_0x5ae375.ok) {
        savedKeys = savedKeys.filter(_0x5bb737 => _0x5bb737 !== _0x4f3f3e);
        _0xa4b6fd = true;
      }
    }
  }
  if (_0xa4b6fd) {
    _0x4c2c11.ZgylO(saveKeys);
    _0x4c2c11.fZoSH(refreshUnlocked);
    _0x4c2c11.kJJVx(broadcastUnlocked);
  }
}
ipcMain.handle("key:state", () => {
  const _0x45ff50 = {
    DxHbn: function (_0x5eefca) {
      return _0x5eefca();
    }
  };
  _0x45ff50.DxHbn(ensureKeys);
  return {
    features: [...unlocked]
  };
});
ipcMain.handle("key:activate", async (_0x3b7aec, _0x1f6abd) => {
  const _0x9d857f = {
    aLOTJ: function (_0x389ab7) {
      return _0x389ab7();
    },
    OdWfK: function (_0x42d252, _0x46795b) {
      return _0x42d252(_0x46795b);
    },
    sadRb: function (_0x4478a7, _0x517a10) {
      return _0x4478a7 || _0x517a10;
    },
    YUKDS: "Nhập key trước.",
    HtAIN: "Key này đã kích hoạt rồi.",
    ljuwx: function (_0x2ef146, _0x24c3db) {
      return _0x2ef146 !== _0x24c3db;
    },
    KgXQK: "DNamH",
    IMvNQ: function (_0x5216f0, _0x532a65, _0x347fa7) {
      return _0x5216f0(_0x532a65, _0x347fa7);
    },
    QaAcT: "/api/key/activate",
    lXeAB: "Kích hoạt thất bại",
    LgQWO: function (_0x5947d3) {
      return _0x5947d3();
    }
  };
  _0x9d857f.aLOTJ(ensureKeys);
  if (!licenseOk) {
    return {
      ok: false,
      msg: "Hãy đăng nhập tài khoản phần mềm trước."
    };
  }
  const _0x2b0695 = _0x9d857f.OdWfK(String, _0x9d857f.sadRb(_0x1f6abd, "")).trim();
  if (!_0x2b0695) {
    return {
      ok: false,
      msg: _0x9d857f.YUKDS
    };
  }
  if (savedKeys.some(_0x1c50c5 => _0x1c50c5.key === _0x2b0695)) {
    return {
      ok: false,
      msg: _0x9d857f.HtAIN
    };
  }
  let _0x42f32c;
  try {
    if (_0x9d857f.ljuwx("DNamH", _0x9d857f.KgXQK)) {
      for (const _0x4b3d2e of [..._0x1db514.keys()]) {
        try {
          _0x3dccbe.get(_0x4b3d2e).child.kill();
        } catch (_0x59b1c7) {}
      }
    } else {
      _0x42f32c = await _0x9d857f.IMvNQ(keyPost, _0x9d857f.QaAcT, {
        key: _0x2b0695,
        hwid: _0x9d857f.aLOTJ(getHwid)
      });
    }
  } catch (_0x1fcb28) {
    return {
      ok: false,
      msg: "Không kết nối được máy chủ (" + _0x1fcb28.message + ")"
    };
  }
  if (!_0x42f32c.ok) {
    return {
      ok: false,
      msg: _0x42f32c.msg || _0x9d857f.lXeAB
    };
  }
  if (!KEY_FEATURES.includes(_0x42f32c.feature)) {
    return {
      ok: false,
      msg: "Key không hợp lệ"
    };
  }
  savedKeys.push({
    key: _0x2b0695,
    feature: _0x42f32c.feature
  });
  _0x9d857f.aLOTJ(saveKeys);
  _0x9d857f.LgQWO(refreshUnlocked);
  broadcastUnlocked();
  return {
    ok: true,
    feature: _0x42f32c.feature,
    features: [...unlocked]
  };
});
const API_BASE = process.env.BOTAFK_API || "https://botafk-license.oopsakasa9-0.workers.dev";
let updating = false;
ipcMain.handle("update:check", () => checkUpdate({
  api: API_BASE,
  current: app.getVersion()
}));
ipcMain.handle("update:install", async () => {
  const _0x1c3598 = {
    ejgXP: function (_0x195ea5, _0x47bd7a) {
      return _0x195ea5 > _0x47bd7a;
    },
    WaknW: "Hãy dừng tất cả acc đang chạy trước khi cập nhật.",
    LxGsx: function (_0x242c0e, _0x29af6e) {
      return _0x242c0e(_0x29af6e);
    },
    EMlIg: "Đã là bản mới nhất.",
    TvBOM: function (_0x2ccec7) {
      return _0x2ccec7();
    },
    VtQVP: function (_0x32be0c, _0x5d279b, _0x34c6fb) {
      return _0x32be0c(_0x5d279b, _0x34c6fb);
    }
  };
  if (updating) {
    return {
      ok: false,
      msg: "Đang cập nhật."
    };
  }
  if (_0x1c3598.ejgXP(runners.size, 0)) {
    return {
      ok: false,
      msg: _0x1c3598.WaknW
    };
  }
  updating = true;
  try {
    const _0x558c80 = await _0x1c3598.LxGsx(checkUpdate, {
      api: API_BASE,
      current: app.getVersion()
    });
    if (_0x558c80.error) {
      return {
        ok: false,
        msg: _0x558c80.error
      };
    }
    if (!_0x558c80.hasUpdate) {
      return {
        ok: false,
        msg: _0x1c3598.EMlIg
      };
    }
    const _0x3a2486 = await downloadAndVerify({
      url: _0x558c80.url,
      sha256: _0x558c80.sha256,
      onProgress: _0x18e9d6 => sendUi("event", {
        type: "update",
        progress: _0x18e9d6
      })
    });
    const _0x5239f1 = _0x1c3598.LxGsx(applyUpdate, _0x3a2486);
    if (!_0x5239f1.ok) {
      return _0x5239f1;
    }
    _0x1c3598.TvBOM(clearKeys);
    _0x1c3598.VtQVP(setTimeout, () => app.quit(), 500);
    return {
      ok: true
    };
  } catch (_0x13d2a4) {
    return {
      ok: false,
      msg: _0x13d2a4.message
    };
  } finally {
    updating = false;
  }
});
ipcMain.handle("acc:list", () => [...accounts.values()].map(publicAccount));
ipcMain.handle("acc:save", (_0x5a7875, _0x396022) => {
  const _0x33c085 = {
    yqles: function (_0x4cbc54, _0x1fcbb5) {
      return _0x4cbc54(_0x1fcbb5);
    },
    BGMUS: "Acc",
    saYvL: function (_0x417ebf, _0x2c1fa9) {
      return _0x417ebf(_0x2c1fa9);
    },
    rhpiU: function (_0x3c0bba, _0x5a1475) {
      return _0x3c0bba(_0x5a1475);
    },
    WVQaV: "Thiếu IP, tên bot hoặc mật khẩu.",
    JxZvv: function (_0x5297e9, _0x53858c) {
      return _0x5297e9(_0x53858c);
    },
    vRVjW: function (_0x576d8d, _0x75ff65) {
      return _0x576d8d !== _0x75ff65;
    }
  };
  const _0x40b1a5 = _0x396022.id || "acc_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  const _0x2b0dc2 = accounts.get(_0x40b1a5) || {};
  const _0x2113ae = {
    id: _0x40b1a5,
    label: _0x33c085.yqles(String, _0x396022.label || _0x396022.username || _0x33c085.BGMUS).slice(0, 40),
    host: String(_0x396022.host || "").trim(),
    port: _0x33c085.yqles(Number, _0x396022.port) || 25565,
    username: _0x33c085.saYvL(String, _0x396022.username || "").trim(),
    password: _0x396022.password ? _0x33c085.rhpiU(String, _0x396022.password) : _0x2b0dc2.password || "",
    version: _0x33c085.yqles(String, _0x396022.version || "").trim(),
    proxy: String(_0x396022.proxy || "").trim()
  };
  if (!_0x2113ae.host || !_0x2113ae.username || !_0x2113ae.password) {
    return {
      ok: false,
      msg: _0x33c085.WVQaV
    };
  }
  try {
    _0x33c085.JxZvv(parseProxy, _0x2113ae.proxy);
  } catch (_0x1e28cd) {
    if (_0x33c085.vRVjW("HWWoF", "HWWoF")) {
      _0x512d70 = _0x3f0746.filter(_0x377673 => _0x377673 !== _0x472ea5);
      _0x32a7e9 = true;
    } else {
      return {
        ok: false,
        msg: _0x1e28cd.message
      };
    }
  }
  accounts.set(_0x40b1a5, _0x2113ae);
  saveAccounts();
  pushAccounts();
  return {
    ok: true,
    id: _0x40b1a5
  };
});
ipcMain.handle("acc:delete", (_0x10dc71, _0x118e1e) => {
  const _0x579a65 = {
    imhmK: "0|1|4|3|2",
    qlGeM: function (_0x171002, _0x31ca2d) {
      return _0x171002(_0x31ca2d);
    }
  };
  const _0x5131bf = _0x579a65.imhmK.split("|");
  let _0x57580c = 0;
  while (true) {
    switch (_0x5131bf[_0x57580c++]) {
      case "0":
        _0x579a65.qlGeM(stopAccount, _0x118e1e);
        continue;
      case "1":
        accounts.delete(_0x118e1e);
        continue;
      case "2":
        return {
          ok: true
        };
      case "3":
        pushAccounts();
        continue;
      case "4":
        saveAccounts();
        continue;
    }
    break;
  }
});
ipcMain.handle("acc:start", (_0x2b354e, _0x5c175f) => startAccount(_0x5c175f));
ipcMain.handle("acc:checkProxy", (_0x597236, _0x552482) => checkProxy({
  proxy: String(_0x552482 && _0x552482.proxy || ""),
  host: String(_0x552482 && _0x552482.host || "").trim(),
  port: Number(_0x552482 && _0x552482.port) || 25565
}));
ipcMain.handle("acc:stop", (_0x335bd2, _0x3de0dc) => {
  const _0x4cbff9 = {
    xAJyf: function (_0x5aeaef, _0x731885) {
      return _0x5aeaef(_0x731885);
    }
  };
  _0x4cbff9.xAJyf(stopAccount, _0x3de0dc);
  return {
    ok: true
  };
});
ipcMain.handle("acc:cmd", (_0x57f561, _0x47fb5b, _0x227e23) => {
  const _0x3fd1bc = {
    eOMWJ: "cmd",
    TFlvM: function (_0x2b6f39, _0x346d09) {
      return _0x2b6f39(_0x346d09);
    },
    iRDJY: function (_0x37319b, _0x5690cc) {
      return _0x37319b || _0x5690cc;
    }
  };
  const _0x17d7e1 = runners.get(_0x47fb5b);
  if (!_0x17d7e1) {
    return {
      ok: false,
      msg: "Acc này chưa chạy."
    };
  }
  _0x17d7e1.child.send({
    type: _0x3fd1bc.eOMWJ,
    line: _0x3fd1bc.TFlvM(String, _0x3fd1bc.iRDJY(_0x227e23, ""))
  });
  return {
    ok: true
  };
});
async function startAccount(_0x2881ff) {
  const _0x2a1d1d = {
    IhQax: function (_0x3e3ea3, _0xfafd3d, _0x503ae6) {
      return _0x3e3ea3(_0xfafd3d, _0x503ae6);
    },
    NqLhs: function (_0x104679, _0xee0b9a) {
      return _0x104679 !== _0xee0b9a;
    },
    oWsrc: "MYqKN",
    KGaRK: "Lngnn",
    jEpUt: "object",
    GyAQO: function (_0x44c178, _0x5a1957) {
      return _0x44c178 === _0x5a1957;
    },
    DcOyi: "log",
    LlVag: function (_0x3614ab, _0x29a57a, _0x31587b) {
      return _0x3614ab(_0x29a57a, _0x31587b);
    },
    EDIRf: "event",
    IDUIO: "status",
    EgFNt: "pMtNe",
    heHeM: "LdvYt",
    tEmOm: function (_0x5145ea, _0x20c38b) {
      return _0x5145ea === _0x20c38b;
    },
    gvmae: "stopped",
    DbYWF: function (_0x4cae8a, _0x547177) {
      return _0x4cae8a !== _0x547177;
    },
    LcqWR: function (_0x20370c) {
      return _0x20370c();
    },
    RSYPZ: function (_0x319bf9, _0x3ccb00) {
      return _0x319bf9 === _0x3ccb00;
    },
    KTtVR: "Chưa đăng nhập tài khoản phần mềm.",
    MlraU: "Không tìm thấy acc.",
    zPgMi: "Acc này đang chạy.",
    ypzgU: function (_0x5bae20, _0x30b713) {
      return _0x5bae20 + _0x30b713;
    },
    AvDhC: "Proxy không vào được server: ",
    IRuqi: "src",
    OckHg: "ignore",
    oMPbA: "ipc",
    cfPlo: "connecting",
    pVqxf: "message",
    vlvBh: "exit",
    rpNYo: function (_0x2d975d) {
      return _0x2d975d();
    }
  };
  if (!licenseOk) {
    return {
      ok: false,
      msg: _0x2a1d1d.KTtVR
    };
  }
  const _0x5ced09 = accounts.get(_0x2881ff);
  if (!_0x5ced09) {
    return {
      ok: false,
      msg: _0x2a1d1d.MlraU
    };
  }
  if (runners.has(_0x2881ff)) {
    return {
      ok: false,
      msg: _0x2a1d1d.zPgMi
    };
  }
  if (_0x5ced09.proxy) {
    const _0x1e661b = await checkProxy({
      proxy: _0x5ced09.proxy,
      host: _0x5ced09.host,
      port: _0x5ced09.port
    });
    if (!_0x1e661b.ok) {
      return {
        ok: false,
        msg: _0x2a1d1d.ypzgU(_0x2a1d1d.AvDhC, _0x1e661b.msg)
      };
    }
    if (runners.has(_0x2881ff)) {
      return {
        ok: false,
        msg: _0x2a1d1d.zPgMi
      };
    }
  }
  const _0x5e650b = fork(path.join(__dirname, _0x2a1d1d.IRuqi, "runner.js"), [], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1"
    },
    execPath: process.execPath,
    stdio: ["ignore", "ignore", _0x2a1d1d.OckHg, _0x2a1d1d.oMPbA]
  });
  const _0x1a89ee = {
    child: _0x5e650b,
    status: _0x2a1d1d.cfPlo,
    features: {}
  };
  runners.set(_0x2881ff, _0x1a89ee);
  _0x5e650b.on(_0x2a1d1d.pVqxf, _0x3acbdb => {
    if (_0x2a1d1d.NqLhs(_0x2a1d1d.oWsrc, _0x2a1d1d.KGaRK)) {
      if (!_0x3acbdb || _0x2a1d1d.NqLhs(typeof _0x3acbdb, _0x2a1d1d.jEpUt)) {
        return;
      }
      if (_0x2a1d1d.GyAQO(_0x3acbdb.type, _0x2a1d1d.DcOyi)) {
        _0x2a1d1d.LlVag(sendUi, _0x2a1d1d.EDIRf, {
          type: "log",
          id: _0x2881ff,
          text: _0x3acbdb.text
        });
      }
      if (_0x3acbdb.type === _0x2a1d1d.IDUIO) {
        if (_0x2a1d1d.NqLhs(_0x2a1d1d.EgFNt, _0x2a1d1d.heHeM)) {
          _0x1a89ee.status = _0x3acbdb.value;
          if (_0x2a1d1d.tEmOm(_0x3acbdb.value, _0x2a1d1d.gvmae)) {
            _0x1a89ee.status = _0x2a1d1d.gvmae;
          }
          const {
            seller: _0x4a71f6,
            farmer: _0x7649e2,
            automine: _0x5879a1,
            autoeat: _0x427930,
            autofarm: _0x532a0e,
            autoquest: _0x1a60fc
          } = _0x3acbdb;
          if (_0x2a1d1d.DbYWF(_0x3acbdb.mine, undefined)) {
            _0x1a89ee.mine = _0x3acbdb.mine;
          }
          if (_0x2a1d1d.DbYWF(_0x3acbdb.quest, undefined)) {
            _0x1a89ee.quest = _0x3acbdb.quest;
          }
          if (_0x2a1d1d.NqLhs(_0x4a71f6, undefined)) {
            _0x1a89ee.features = {
              seller: _0x4a71f6,
              farmer: _0x7649e2,
              automine: _0x5879a1,
              autoeat: _0x427930,
              autofarm: !!_0x532a0e,
              autoquest: !!_0x1a60fc
            };
          }
          sendUi("event", {
            type: _0x2a1d1d.IDUIO,
            id: _0x2881ff,
            status: _0x1a89ee.status,
            features: _0x1a89ee.features,
            quest: _0x1a89ee.quest || null,
            mine: _0x1a89ee.mine || null
          });
          _0x2a1d1d.LcqWR(pushAccounts);
        } else {
          if (_0xc6fc3a) {
            _0x2a1d1d.IhQax(_0x246d1d, "expiry", {
              stage: "clear"
            });
          }
          _0x335d09 = false;
          _0x449002 = null;
          return;
        }
      }
    } else {
      return {
        ok: false,
        msg: "Không kết nối được máy chủ (" + _0x2c8b51.message + ")"
      };
    }
  });
  _0x5e650b.on(_0x2a1d1d.vlvBh, () => {
    if (_0x2a1d1d.RSYPZ(runners.get(_0x2881ff), _0x1a89ee)) {
      runners.delete(_0x2881ff);
    }
    _0x2a1d1d.LlVag(sendUi, _0x2a1d1d.EDIRf, {
      type: _0x2a1d1d.IDUIO,
      id: _0x2881ff,
      status: _0x2a1d1d.gvmae,
      features: {}
    });
    _0x2a1d1d.LcqWR(pushAccounts);
  });
  _0x2a1d1d.LcqWR(ensureKeys);
  _0x5e650b.send({
    type: "start",
    cfg: {
      host: _0x5ced09.host,
      port: _0x5ced09.port,
      username: _0x5ced09.username,
      password: _0x5ced09.password,
      version: _0x5ced09.version || null,
      proxy: _0x5ced09.proxy || null
    },
    unlocked: [...unlocked]
  });
  _0x2a1d1d.rpNYo(pushAccounts);
  return {
    ok: true
  };
}
function stopAccount(_0x22ea67) {
  const _0x1521fb = {
    xKWes: function (_0x192409, _0x2ab241, _0x11da75) {
      return _0x192409(_0x2ab241, _0x11da75);
    },
    AWNsr: function (_0x25c15b) {
      return _0x25c15b();
    }
  };
  const _0x5188cb = runners.get(_0x22ea67);
  if (!_0x5188cb) {
    return;
  }
  try {
    _0x5188cb.child.send({
      type: "stop"
    });
  } catch (_0x5c1d06) {}
  _0x1521fb.xKWes(setTimeout, () => {
    try {
      _0x5188cb.child.kill();
    } catch (_0x87bd1f) {}
  }, 1500);
  runners.delete(_0x22ea67);
  _0x1521fb.AWNsr(pushAccounts);
}
function createWindow() {
  const _0x2497b2 = {
    cGqNH: "#0f1420",
    vDfaQ: "BotAFK",
    pCVRo: "preload.js",
    EPxhh: "index.html",
    eNQAe: "closed"
  };
  win = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: _0x2497b2.cGqNH,
    title: _0x2497b2.vDfaQ,
    webPreferences: {
      preload: path.join(__dirname, _0x2497b2.pCVRo),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.removeMenu();
  win.loadFile(path.join(__dirname, "ui", _0x2497b2.EPxhh));
  win.on(_0x2497b2.eNQAe, () => {
    win = null;
  });
}
app.whenReady().then(() => {
  const _0x22c7ab = {
    VayGR: function (_0x2c0288) {
      return _0x2c0288();
    },
    ygTZu: function (_0x1b711d, _0x4145d1) {
      return _0x1b711d === _0x4145d1;
    },
    Nsixa: "uZBxL",
    rObAd: "did-finish-load"
  };
  loadAccounts();
  createWindow();
  win.webContents.once(_0x22c7ab.rObAd, () => {
    if (_0x22c7ab.ygTZu(_0x22c7ab.Nsixa, "uZBxL")) {
      _0x22c7ab.VayGR(tryAutoLogin).catch(() => {});
    } else {
      if (!_0x45b9f8.isEncryptionAvailable()) {
        return;
      }
      _0x1c8789.writeFileSync(_0x22c7ab.VayGR(_0x6c8dad), _0x33bffa.encryptString(_0x55de1a.stringify(_0x4815a1)));
    }
  });
});
app.on("window-all-closed", () => {
  const _0x286de1 = {
    EyHzK: function (_0x22799d, _0x27b2f3, _0x24d310) {
      return _0x22799d(_0x27b2f3, _0x24d310);
    }
  };
  for (const _0x4d92c6 of [...runners.keys()]) {
    stopAccount(_0x4d92c6);
  }
  _0x286de1.EyHzK(setTimeout, () => app.quit(), 800);
});
app.on("before-quit", () => {
  const _0x21c2f7 = {
    YbIBi: "expiry",
    sQOWZ: "done",
    Fvywn: function (_0x3df577, _0x3a6dde) {
      return _0x3df577(_0x3a6dde);
    },
    LqXLk: function (_0x4155e4, _0x3d9045) {
      return _0x4155e4 === _0x3d9045;
    },
    hYTwo: "zJfjx"
  };
  for (const _0x3da528 of [...runners.keys()]) {
    try {
      if (_0x21c2f7.LqXLk(_0x21c2f7.hYTwo, _0x21c2f7.hYTwo)) {
        runners.get(_0x3da528).child.kill();
      } else {
        if (/hết hạn/i.test(_0x33aab6)) {
          _0x302637(_0x21c2f7.YbIBi, {
            stage: _0x21c2f7.sQOWZ
          });
          return _0x21c2f7.Fvywn(_0x32baea, _0x5a3159);
        }
        _0xcf8df0("BẢN QUYỀN: " + _0x232ba7 + ". Đã dừng toàn bộ acc.");
      }
    } catch (_0x15a4c7) {}
  }
});
module.exports = {
  dialog: dialog
};