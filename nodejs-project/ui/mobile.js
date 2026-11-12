// Cảm ứng: nhấn giữ = chuột phải (mở cài đặt chức năng), chạm ô Click UI = hiện thông tin item.
(function () {
  var t = null, moved = false, el = null;
  document.addEventListener('touchstart', function (e) {
    var b = e.target.closest && e.target.closest('.fn, .fx-fn');
    if (!b) return; el = b; moved = false;
    t = setTimeout(function () {
      if (moved) return;
      b.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
      if (navigator.vibrate) navigator.vibrate(25);
      el = null;
    }, 550);
  }, { passive: true });
  document.addEventListener('touchmove', function () { moved = true; clearTimeout(t); }, { passive: true });
  document.addEventListener('touchend', function () { clearTimeout(t); }, { passive: true });
  document.addEventListener('contextmenu', function (e) { if (e.target.closest && e.target.closest('.fn, .fx-fn')) e.preventDefault(); });
  document.addEventListener('touchend', function (e) {
    var s = e.target.closest && e.target.closest('.cui-slot'); if (!s) return;
    s.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    var tip = document.getElementById('cui-tip'); if (tip) { var r = s.getBoundingClientRect(); tip.style.left = Math.min(r.left, innerWidth - 260) + 'px'; tip.style.top = Math.max(8, r.top - tip.offsetHeight - 6) + 'px'; }
  }, { passive: true });
})();
