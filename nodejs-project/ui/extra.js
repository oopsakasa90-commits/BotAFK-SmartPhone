// Secret-AF: phần cài đặt bổ sung (ore picker, lệnh khởi động, tự sửa đồ, vàng/nến, potara) + gộp vào lệnh "!automine set" / "!fightbot set".
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'sa.x.';
  function load(k, d) { try { return Object.assign({}, d, JSON.parse(localStorage.getItem(KEY + k) || '{}')); } catch (_) { return Object.assign({}, d); } }
  function save(k, v) { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (_) {} }
  var DEF = {
    am: { startOn: true, startCmds: [{ cmd: '/spawn', wait: 10 }], autoTool: true, repair: { on: true, pct: 5, cmd: '/fix hand', cd: 30 } },
    fb: { autoDrop: { on: true, keep: ['player_head', 'gold_ingot'], ms: 350 }, useGold: true, useCandle: true, potara: { on: true, max: 40 }, repair: { on: true, pct: 5, cmd: '/repair', cd: 30 } }
  };
  var X = { am: load('am', DEF.am), fb: load('fb', DEF.fb) };
  window.__mergeSet = function (line, k) {
    var re = k === 'am' ? /^(!automine\s+set\s+)([\s\S]*)$/i : /^(!fightbot\s+set\s+)([\s\S]*)$/i, m = re.exec(line);
    if (!m) return line;
    try { return m[1] + JSON.stringify(Object.assign(JSON.parse(m[2]), X[k])); } catch (_) { return line; }
  };

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function chk(label, val, on) { var l = el('label', 'check'); l.appendChild(el('span', '', label)); var i = el('input'); i.type = 'checkbox'; i.checked = !!val; i.onchange = function () { on(i.checked); }; l.appendChild(i); return l; }
  function numF(label, val, lo, hi, on) { var l = el('label', '', label + ' '); var i = el('input'); i.type = 'number'; i.min = lo; i.max = hi; i.value = val; i.onchange = function () { on(Math.max(lo, Math.min(hi, Number(i.value) || lo))); }; l.appendChild(i); return l; }
  function txtF(label, val, on) { var l = el('label', '', label + ' '); var i = el('input'); i.value = val; i.autocomplete = 'off'; i.onchange = function () { on(i.value.trim()); }; l.appendChild(i); return l; }
  function section(title) { return el('div', 'sub-title', title); }
  function before(modalId, nodes) {
    var m = $(modalId); if (!m) return;
    var anchor = m.querySelector('.modal-actions'); if (!anchor) return;
    nodes.forEach(function (n) { anchor.parentNode.insertBefore(n, anchor); });
  }

  // ---------- danh sách quặng / block có tìm kiếm ----------
  var BLOCKS = ('coal_ore deepslate_coal_ore iron_ore deepslate_iron_ore copper_ore deepslate_copper_ore gold_ore deepslate_gold_ore nether_gold_ore redstone_ore deepslate_redstone_ore lapis_ore deepslate_lapis_ore diamond_ore deepslate_diamond_ore emerald_ore deepslate_emerald_ore nether_quartz_ore ancient_debris raw_iron_block raw_gold_block raw_copper_block coal_block iron_block gold_block diamond_block emerald_block lapis_block redstone_block netherite_block amethyst_block budding_amethyst spawner ' +
    'stone deepslate cobblestone cobbled_deepslate granite diorite andesite tuff calcite dripstone_block dirt coarse_dirt grass_block podzol mycelium sand red_sand gravel clay mud sandstone red_sandstone netherrack basalt smooth_basalt blackstone end_stone obsidian crying_obsidian glowstone magma_block soul_sand soul_soil ice packed_ice blue_ice snow_block terracotta ' +
    'oak_log spruce_log birch_log jungle_log acacia_log dark_oak_log mangrove_log cherry_log crimson_stem warped_stem oak_leaves cactus sugar_cane bamboo pumpkin melon wheat carrots potatoes nether_wart kelp sea_lantern bookshelf bone_block hay_block').split(' ');

  var ITEMS = ('player_head zombie_head skeleton_skull creeper_head dragon_head gold_ingot gold_nugget iron_ingot copper_ingot netherite_ingot netherite_scrap diamond emerald lapis_lazuli redstone coal charcoal quartz amethyst_shard raw_iron raw_gold raw_copper blaze_rod blaze_powder ender_pearl ender_eye nether_star ghast_tear slime_ball magma_cream gunpowder bone bone_meal string feather leather rotten_flesh spider_eye prismarine_shard shulker_shell elytra totem_of_undying enchanted_golden_apple golden_apple golden_carrot experience_bottle name_tag saddle trident bow crossbow arrow shield diamond_sword netherite_sword diamond_pickaxe netherite_pickaxe diamond_axe netherite_axe diamond_shovel netherite_shovel diamond_hoe netherite_hoe iron_sword iron_pickaxe golden_sword golden_pickaxe bucket water_bucket lava_bucket milk_bucket cooked_beef cooked_porkchop cooked_chicken cooked_mutton bread baked_potato candle white_candle shulker_box ender_chest enchanted_book book paper map compass clock fishing_rod shears flint_and_steel torch ladder cobweb tnt end_crystal respawn_anchor beacon conduit').split(' ');
  var ALL = Array.from(new Set(ITEMS.concat(BLOCKS)));

  function picker(input, src) {
    if (!input || input.dataset.picker) return;
    src = src || BLOCKS;
    input.dataset.picker = '1'; input.style.display = 'none';
    var box = el('div', 'orepick'), chips = el('div', 'op-chips'), q = el('input', 'op-q'), list = el('div', 'op-list');
    q.placeholder = 'Tìm quặng / block... (Enter để thêm tên tự gõ)'; q.autocomplete = 'off';
    box.appendChild(chips); box.appendChild(q); box.appendChild(list); input.parentNode.insertBefore(box, input.nextSibling);
    var sel = new Set();
    function read() { sel = new Set(input.value.split(',').map(function (s) { return s.trim().toLowerCase().replace(/^minecraft:/, '').replace(/\s+/g, '_'); }).filter(Boolean)); }
    function write() { input.value = Array.from(sel).join(', '); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); }
    function render() {
      chips.innerHTML = '';
      sel.forEach(function (n) { var c = el('span', 'op-chip', n + ' ×'); c.onclick = function () { sel.delete(n); write(); render(); }; chips.appendChild(c); });
      if (!sel.size) chips.appendChild(el('span', 'muted', 'Trống = đào mọi block'));
      var f = q.value.trim().toLowerCase().replace(/\s+/g, '_');
      list.innerHTML = '';
      src.filter(function (n) { return !f || n.indexOf(f) >= 0; }).slice(0, 80).forEach(function (n) {
        var r = el('div', 'op-row' + (sel.has(n) ? ' on' : ''), '<span>' + n.replace(/_/g, ' ') + '</span><i>' + (sel.has(n) ? '✓' : '+') + '</i>');
        r.onclick = function () { if (sel.has(n)) sel.delete(n); else sel.add(n); write(); render(); };
        list.appendChild(r);
      });
    }
    q.oninput = render;
    q.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); var v = q.value.trim().toLowerCase().replace(/^minecraft:/, '').replace(/\s+/g, '_'); if (v) { sel.add(v); q.value = ''; write(); render(); } } };
    var modal = input.closest('.modal');
    if (modal) new MutationObserver(function () { if (!modal.classList.contains('hidden')) { read(); render(); } }).observe(modal, { attributes: true, attributeFilter: ['class'] });
    input.addEventListener('sa-sync', function () { read(); render(); });
    read(); render(); setTimeout(function () { read(); render(); }, 400);
  }

  // ---------- Automine: lệnh khởi động + auto tool + sửa đồ ----------
  function buildAm() {
    var a = X.am, nodes = [], wrap = el('div');
    nodes.push(section('Lệnh chạy trước khi đào'));
    nodes.push(chk('Bật (tắt = đào ngay, không gõ lệnh nào)', a.startOn, function (v) { a.startOn = v; save('am', a); }));
    var box = el('div', 'pts');
    function draw() {
      box.innerHTML = '';
      a.startCmds.forEach(function (c, i) {
        var r = el('div', 'row'), t = el('input', 'grow'); t.value = c.cmd; t.placeholder = '/spawn, /home, /warp ...';
        var w = el('input'); w.type = 'number'; w.min = 0; w.max = 120; w.value = c.wait; w.style.width = '80px'; w.title = 'Đợi (giây)';
        var d = el('button', 'btn ghost danger', '×'); d.type = 'button';
        t.onchange = function () { c.cmd = t.value.trim(); save('am', a); }; w.onchange = function () { c.wait = Math.max(0, Math.min(120, Number(w.value) || 0)); save('am', a); };
        d.onclick = function () { a.startCmds.splice(i, 1); save('am', a); draw(); };
        r.appendChild(t); r.appendChild(w); r.appendChild(el('span', 'muted', 'giây')); r.appendChild(d); box.appendChild(r);
      });
    }
    draw(); nodes.push(box);
    var add = el('button', 'btn ghost', '+ Thêm lệnh'); add.type = 'button'; add.onclick = function () { a.startCmds.push({ cmd: '/home', wait: 5 }); save('am', a); draw(); }; nodes.push(add);
    nodes.push(section('Công cụ & độ bền'));
    nodes.push(chk('Auto Tool: đào block nào thì cầm đúng công cụ đó', a.autoTool, function (v) { a.autoTool = v; save('am', a); }));
    nodes.push(chk('Tự sửa khi công cụ sắp hỏng', a.repair.on, function (v) { a.repair.on = v; save('am', a); }));
    nodes.push(numF('Sửa khi độ bền còn ≤ (%)', a.repair.pct, 1, 90, function (v) { a.repair.pct = v; save('am', a); }));
    nodes.push(txtF('Lệnh sửa (/fix hand hoặc /repair)', a.repair.cmd, function (v) { a.repair.cmd = v || '/fix hand'; save('am', a); }));
    before('amine-modal', nodes);
    var spawn = $('am-wait'); if (spawn && spawn.closest('label')) spawn.closest('label').style.display = 'none';
  }

  // ---------- Fightbot ----------
  function buildFb() {
    var f = X.fb, nodes = [];
    nodes.push(section('Vàng & Nến (tách riêng)'));
    nodes.push(chk('Dùng gold_ingot (chuột phải liên tục)', f.useGold, function (v) { f.useGold = v; save('fb', f); }));
    nodes.push(chk('Dùng nến (candle)', f.useCandle, function (v) { f.useCandle = v; save('fb', f); }));
    nodes.push(section('Tự thả đồ ở warp tuonglai (Anti drop)'));
    nodes.push(chk('Bật tự thả item trong túi', f.autoDrop.on, function (v) { f.autoDrop.on = v; save('fb', f); }));
    nodes.push(el('div', 'muted', 'Item trong danh sách dưới đây KHÔNG bị thả (khóa ô bằng chuột giữa trong Click UI vẫn có tác dụng):'));
    var kw = el('div'), ki = el('input'); ki.value = f.autoDrop.keep.join(', '); ki.addEventListener('change', function () { f.autoDrop.keep = ki.value.split(',').map(function (x) { return x.trim(); }).filter(Boolean); save('fb', f); }); kw.appendChild(ki); nodes.push(kw);
    setTimeout(function () { picker(ki, ALL); }, 0);
    nodes.push(section('Potara'));
    nodes.push(chk('Sau khi sang warp: gõ /potara tới khi hợp thể thành công', f.potara.on, function (v) { f.potara.on = v; save('fb', f); }));
    nodes.push(numF('Thử tối đa (lần)', f.potara.max, 1, 200, function (v) { f.potara.max = v; save('fb', f); }));
    nodes.push(section('Tự sửa đồ'));
    nodes.push(chk('Tự /repair khi item đang cầm sắp hỏng', f.repair.on, function (v) { f.repair.on = v; save('fb', f); }));
    nodes.push(numF('Sửa khi độ bền còn ≤ (%)', f.repair.pct, 1, 90, function (v) { f.repair.pct = v; save('fb', f); }));
    nodes.push(txtF('Lệnh sửa', f.repair.cmd, function (v) { f.repair.cmd = v || '/repair'; save('fb', f); }));
    nodes.push(section('ESP (mặc định tắt)'));
    var b = el('button', 'btn ghost', 'Mở / đóng radar ESP'); b.type = 'button';
    b.onclick = function () { var e = $('fx-esp'); if (e) e.click(); }; nodes.push(b);
    before('fight-modal', nodes);
  }

  function init() {
    try { buildAm(); } catch (e) { console.error(e); }
    try { buildFb(); } catch (e) { console.error(e); }
    picker($('am-blocks')); picker($('nk-list')); picker($('set-antidrop'), ALL);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
