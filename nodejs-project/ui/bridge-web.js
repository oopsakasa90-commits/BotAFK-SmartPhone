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
  function push(m) {
    if (!m || m.push === 'ping') return;
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
