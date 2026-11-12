// Thay preload Electron: window.botafk gọi lõi qua HTTP /ipc, nhận sự kiện qua SSE /events.
(function () {
  var K = new URLSearchParams(location.search).get('k') || sessionStorage.getItem('sa.k') || '';
  try { sessionStorage.setItem('sa.k', K); } catch (e) {}
  var subs = { accounts: [], event: [], license: [], expiry: [], autologin: [] };
  function call(ch) {
    var args = Array.prototype.slice.call(arguments, 1);
    return fetch('/ipc', { method: 'POST', headers: { 'x-sa-key': K, 'Content-Type': 'application/json' }, body: JSON.stringify({ ch: ch, args: args }) })
      .then(function (r) { return r.json(); }).then(function (j) { if (!j.ok) throw new Error(j.error); return j.result; });
  }
  function sub(n) { return function (cb) { subs[n].push(cb); }; }
  window.botafk = {
    licenseLogin: function (u, p) { return call('license:login', u, p); }, licenseState: function () { return call('license:state'); },
    logout: function () { return call('license:logout'); }, appInfo: function () { return call('app:info'); },
    updateCheck: function () { return call('update:check'); }, updateInstall: function () { return call('update:install'); },
    keyState: function () { return call('key:state'); }, keyActivate: function (k) { return call('key:activate', k); },
    listAccounts: function () { return call('acc:list'); }, saveAccount: function (a) { return call('acc:save', a); },
    checkProxy: function (a) { return call('acc:checkProxy', a); }, deleteAccount: function (id) { return call('acc:delete', id); },
    startAccount: function (id) { return call('acc:start', id); }, stopAccount: function (id) { return call('acc:stop', id); },
    sendCommand: function (id, line) { return call('acc:cmd', id, line); },
    onAccounts: sub('accounts'), onEvent: sub('event'), onLicense: sub('license'), onExpiry: sub('expiry'), onAutoLogin: sub('autologin')
  };
  var errCount = 0;
  function push(m) {
    if (!m || m.push === 'ping') return;
    if (m.push === 'host-error') { errCount++; var d = document.getElementById('sa-diag-btn'); if (d) { d.style.background = '#e5484d'; d.textContent = '🛠 ' + errCount; } }
    if (m.push === 'fx') { if (window.__fxMsg) window.__fxMsg(m.data); }
    else if (m.push === 'fxevent') window.dispatchEvent(new CustomEvent(m.name, { detail: m.data }));
    else (subs[m.push] || []).forEach(function (f) { try { f(m.data); } catch (e) {} });
  }
  (function connect() {
    var es = new EventSource('/events?k=' + encodeURIComponent(K));
    es.onmessage = function (e) { try { push(JSON.parse(e.data)); } catch (_) {} };
    es.onerror = function () { es.close(); setTimeout(connect, 1500); };
  })();
  var ol = console.log;
  console.log = function () {
    var a = arguments[0];
    if (typeof a === 'string' && a.indexOf('@@FX@@') === 0) { try { call('fxmsg', JSON.parse(a.slice(6))); } catch (e) {} return; }
    return ol.apply(console, arguments);
  };
  window.addEventListener('DOMContentLoaded', function () { setTimeout(function () { call('ready'); }, 60); });
})();

// Nút chẩn đoán (góc dưới trái): xem nhật ký lõi để biết vì sao acc dừng
window.addEventListener('DOMContentLoaded', function () {
  var btn = document.createElement('button');
  btn.id = 'sa-diag-btn'; btn.textContent = '🛠';
  btn.style.cssText = 'position:fixed;left:8px;bottom:calc(8px + env(safe-area-inset-bottom));z-index:99998;width:38px;height:38px;border-radius:50%;border:0;background:rgba(80,90,130,.65);color:#fff;font-size:15px;opacity:.75';
  var box = document.createElement('div');
  box.style.cssText = 'display:none;position:fixed;inset:0;z-index:99999;background:#0b0f1a;color:#cfd6f5;flex-direction:column;padding:10px;padding-top:calc(10px + env(safe-area-inset-top))';
  box.innerHTML = '<div style="display:flex;gap:8px;margin-bottom:8px"><b style="flex:1;align-self:center">Nhật ký lõi</b><button id="sa-d-ref">Làm mới</button><button id="sa-d-cp">Sao chép</button><button id="sa-d-x">Đóng</button></div><pre id="sa-d-pre" style="flex:1;overflow:auto;white-space:pre-wrap;word-break:break-all;font-size:11px;margin:0;background:#05070d;padding:8px;border-radius:8px"></pre>';
  document.body.appendChild(btn); document.body.appendChild(box);
  var pre = box.querySelector('#sa-d-pre');
  function load() { fetch('/diag?k=' + encodeURIComponent(K)).then(function (r) { return r.text(); }).then(function (t) { pre.textContent = t || '(trống)'; pre.scrollTop = pre.scrollHeight; }); }
  btn.onclick = function () { box.style.display = 'flex'; load(); };
  box.querySelector('#sa-d-x').onclick = function () { box.style.display = 'none'; };
  box.querySelector('#sa-d-ref').onclick = load;
  box.querySelector('#sa-d-cp').onclick = function () { try { navigator.clipboard.writeText(pre.textContent); } catch (e) { var r = document.createRange(); r.selectNodeContents(pre); var s = getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand('copy'); } };
});
