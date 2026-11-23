'use strict';
// Secret-AF Android: (1) dựng bố cục điện thoại: dải acc phía trên + thanh điều hướng phía dưới
//                    (2) cảm ứng: nhấn giữ = chuột phải (mở cài đặt chức năng)
(function () {
  var H = document.documentElement; H.classList.add('m-perf');
  if ((navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)) H.classList.add('m-lowmem');
  // ẩn tab/vào nền: dừng mọi hoạt động giao diện (bot vẫn chạy trong lõi)
  document.addEventListener('visibilitychange', function () { H.classList.toggle('m-hidden', document.hidden); });
  function narrow() { return window.matchMedia('(max-width: 860px), (pointer: coarse) and (max-width: 1100px)').matches; }
  function build() {
    if (!narrow()) return true;
    var v = document.querySelector('.v3'); if (!v) return false;
    var side = v.querySelector('.v3-side'), nav = side && side.querySelector('nav'), accs = document.getElementById('v3-accs'), add = document.getElementById('v3-addslot'), main = v.querySelector('.v3-main');
    if (!side || !nav || !accs || !add || !main) return false;
    if (v.getAttribute('data-m')) return true;
    v.setAttribute('data-m', '1');
    var strip = document.createElement('div'); strip.className = 'm-strip';
    strip.appendChild(accs); strip.appendChild(add);
    v.insertBefore(strip, main);
    nav.classList.add('m-nav'); v.appendChild(nav);
    return true;
  }
  if (!build()) {
    var mo = new MutationObserver(function () { if (build()) mo.disconnect(); });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }
  var t = null, moved = false;
  document.addEventListener('touchstart', function (e) {
    var b = e.target.closest && e.target.closest('.fn, .fx-fn'); if (!b) return; moved = false;
    t = setTimeout(function () {
      if (moved) return;
      b.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
      if (navigator.vibrate) navigator.vibrate(25);
    }, 550);
  }, { passive: true });
  document.addEventListener('touchmove', function () { moved = true; clearTimeout(t); }, { passive: true });
  document.addEventListener('touchend', function () { clearTimeout(t); }, { passive: true });
  document.addEventListener('contextmenu', function (e) { if (e.target.closest && e.target.closest('.fn, .fx-fn')) e.preventDefault(); });
  // chạm ô Click UI = hiện thông tin item (không có chuột để hover)
  document.addEventListener('touchend', function (e) {
    var s = e.target.closest && e.target.closest('.cui-slot'); if (!s) return;
    s.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    var tip = document.getElementById('cui-tip'); if (tip) { var r = s.getBoundingClientRect(); tip.style.left = Math.min(r.left, innerWidth - 260) + 'px'; tip.style.top = Math.max(8, r.top - tip.offsetHeight - 6) + 'px'; }
  }, { passive: true });
})();
