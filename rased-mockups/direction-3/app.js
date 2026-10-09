/* رصيد — الاتجاه 3 «المنصّة»: سلوك الواجهة فقط (لوحة الأوامر، الطي، الفلاتر، التحديد، التحذير، الاختصارات). */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var body = document.body;
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function typing(el) { return el && (el.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)); }
  var isMobile = function () { return matchMedia('(max-width: 600px)').matches; };

  /* ---------- نماذج لا ترسل شيئاً ---------- */
  $$('form[data-noop]').forEach(function (f) { f.addEventListener('submit', function (e) { e.preventDefault(); }); });

  /* ---------- طيّ القائمة الجانبية (لوحي عمودي) ---------- */
  var toggle = $('[data-rail-toggle]');
  function syncRail() {
    if (!toggle) return;
    var c = root.classList.contains('rail-c');
    toggle.setAttribute('aria-expanded', String(!c));
    toggle.querySelector('.rl-label').textContent = c ? 'توسيع القائمة' : 'طيّ القائمة';
    toggle.setAttribute('aria-label', c ? 'توسيع القائمة' : 'طيّ القائمة');
  }
  if (toggle) {
    toggle.addEventListener('click', function () {
      root.classList.toggle('rail-c');
      store('d3-rail', root.classList.contains('rail-c') ? 'c' : 'o');
      syncRail();
    });
    syncRail();
  }

  /* ---------- صفوف قابلة للتوسيع ---------- */
  $$('[data-xp]').forEach(function (b) {
    b.addEventListener('click', function () {
      var row = document.getElementById(b.getAttribute('aria-controls'));
      var open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(open));
      if (row) row.hidden = !open;
    });
  });

  /* ---------- لوحة الأوامر Ctrl+K ---------- */
  var pal = $('.palette'), palInput = $('[data-pal-input]'), palItems = $$('[data-pal-list] li'), palEmpty = $('[data-pal-empty]');
  function palFilter() {
    var q = palInput.value.trim();
    var shown = 0;
    palItems.forEach(function (li) {
      var hit = !q || li.textContent.indexOf(q) >= 0;
      li.hidden = !hit; if (hit) shown++;
    });
    palEmpty.hidden = shown > 0;
    palItems.forEach(function (li) { li.firstElementChild.classList.remove('is-active'); });
    var first = palItems.filter(function (li) { return !li.hidden; })[0];
    if (first) first.firstElementChild.classList.add('is-active');
  }
  function palOpen() {
    if (!pal || pal.open) return;
    palInput.value = ''; palFilter();
    if (pal.showModal) pal.showModal(); else pal.setAttribute('open', '');
    palInput.focus();
  }
  $$('[data-palette-open]').forEach(function (b) { b.addEventListener('click', palOpen); });
  if (palInput) {
    palInput.addEventListener('input', palFilter);
    palInput.addEventListener('keydown', function (e) {
      var vis = palItems.filter(function (li) { return !li.hidden; }).map(function (li) { return li.firstElementChild; });
      var i = vis.findIndex(function (a) { return a.classList.contains('is-active'); });
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!vis.length) return;
        if (i >= 0) vis[i].classList.remove('is-active');
        i = e.key === 'ArrowDown' ? (i + 1) % vis.length : (i - 1 + vis.length) % vis.length;
        vis[i].classList.add('is-active');
        vis[i].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (vis[i >= 0 ? i : 0]) location.href = vis[i >= 0 ? i : 0].getAttribute('href');
      }
    });
  }

  /* ---------- اختصارات عامة ---------- */
  var gPending = 0;
  var GO = { d: 'dashboard.html', s: 'statement.html', i: 'invoices.html', r: 'review.html' };
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); palOpen(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey || typing(document.activeElement) || (pal && pal.open)) return;
    var k = e.key.toLowerCase();
    if (gPending && GO[k]) { e.preventDefault(); location.href = GO[k]; return; }
    gPending = 0;
    if (k === 'g') { gPending = 1; setTimeout(function () { gPending = 0; }, 1200); return; }
    if (e.key === '/') { var s = $('[data-search]'); if (s) { e.preventDefault(); s.focus(); } return; }
    if (k === 'n' && !body.classList.contains('pg-add-entry')) { location.href = 'add-entry.html'; return; }
    document.dispatchEvent(new CustomEvent('d3:key', { detail: { key: k, event: e } }));
  });

  /* ---------- لوحة الأرصدة: بحث + اتجاه الرصيد ---------- */
  if (body.classList.contains('pg-dashboard')) {
    var sign = 'all', search = $('[data-search]');
    var apply = function () {
      var q = (search.value || '').trim();
      $$('[data-row]').forEach(function (el) {
        var ok = (sign === 'all' || el.dataset.sign === sign) && (!q || el.dataset.name.indexOf(q) >= 0);
        el.hidden = !ok;
        if (el.tagName === 'TR') {
          var xb = $('[data-xp]', el), xr = xb && document.getElementById(xb.getAttribute('aria-controls'));
          if (xr) xr.hidden = !ok || xb.getAttribute('aria-expanded') !== 'true';
        }
      });
    };
    search.addEventListener('input', apply);
    $$('[data-sign]').filter(function (b) { return b.tagName === 'BUTTON'; }).forEach(function (b) {
      b.addEventListener('click', function () {
        sign = b.dataset.sign;
        $$('button[data-sign]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        apply();
      });
    });
    $$('[data-cursor]').forEach(function (a) {
      a.addEventListener('click', function () {
        $$('.is-cursor').forEach(function (x) { x.classList.remove('is-cursor'); });
        a.classList.add('is-cursor');
        var tr = document.getElementById(a.dataset.cursor); if (tr) tr.classList.add('is-cursor');
      });
    });
  }

  /* ---------- كشف الحساب ---------- */
  if (body.classList.contains('pg-statement')) {
    var stSearch = $('[data-search]');
    stSearch.addEventListener('input', function () {
      var q = stSearch.value.trim();
      $$('.sup-list [data-row]').forEach(function (li) { li.hidden = q && li.dataset.name.indexOf(q) < 0; });
    });
    document.addEventListener('d3:key', function (ev) {
      var b = $('[data-key="' + ev.detail.key + '"]'); if (b) b.click();
    });
  }

  /* ---------- الفواتير: فلتر + تحديد جماعي + ضغط مطوّل ---------- */
  if (body.classList.contains('pg-invoices')) {
    var filter = 'all', sel = {}, selMode = false, LABEL = { 'in': 'دخلت', out: 'لم تدخل' };
    var units = function (id) { return $$('[data-inv="' + id + '"]'); };
    var ids = $$('tr[data-inv]').map(function (tr) { return tr.dataset.inv; });
    var markBtn = $('[data-mark]'), countEl = $('[data-selcount]'), bar = $('[data-bulkbar]'), rep = $('[data-report]');

    var render = function () {
      var shown = 0, nsel = 0;
      ids.forEach(function (id) {
        var st = units(id)[0].dataset.status;
        var vis = filter === 'all' || filter === st;
        if (vis) shown++;
        if (!vis) delete sel[id];
        if (sel[id]) nsel++;
        units(id).forEach(function (u) {
          u.hidden = !vis;
          u.dataset.status = st;
          u.classList.toggle('is-sel', !!sel[id]);
          if (u.tagName === 'LI') u.setAttribute('aria-selected', String(!!sel[id]));
          var cb = $('[data-sel]', u); if (cb) cb.checked = !!sel[id];
          var bd = $('[data-badge]', u);
          bd.textContent = LABEL[st]; bd.className = 'badge ' + (st === 'in' ? 'b-in' : 'b-out');
          if (u.tagName === 'TR') { var xb = $('[data-xp]', u), xr = document.getElementById(xb.getAttribute('aria-controls')); xr.hidden = !vis || xb.getAttribute('aria-expanded') !== 'true'; }
        });
      });
      var all = $('[data-selall]');
      all.checked = shown > 0 && nsel === shown; all.indeterminate = nsel > 0 && nsel < shown;
      countEl.textContent = String(nsel);
      markBtn.disabled = nsel === 0;
      bar.classList.toggle('has-sel', nsel > 0);
      $('[data-shown]').textContent = String(shown);
      rep.innerHTML = '';
      ids.filter(function (id) { return units(id)[0].dataset.status === 'out'; }).forEach(function (id) {
        var tr = units(id)[0];
        var li = document.createElement('li');
        li.innerHTML = '<span class="num ref">' + id + '</span> ' + tr.querySelector('.c-num').innerHTML;
        rep.appendChild(li);
      });
      if (!rep.children.length) { var e = document.createElement('li'); e.className = 'rep-empty'; e.textContent = 'كل الأمثلة المعروضة دخلت.'; rep.appendChild(e); }
      body.classList.toggle('sel-mode', selMode);
    };

    var setFilter = function (f) {
      filter = f;
      $$('button[data-status]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.status === f)); });
      render();
    };
    $$('button[data-status]').forEach(function (b) { b.addEventListener('click', function () { setFilter(b.dataset.status); }); });
    $$('[data-sel]').forEach(function (cb) { cb.addEventListener('change', function () { sel[cb.value] = cb.checked; render(); }); });
    $('[data-selall]').addEventListener('change', function (e) {
      ids.forEach(function (id) { if (!units(id)[0].hidden) sel[id] = e.target.checked; }); render();
    });
    var markEntered = function () {
      if (root.dataset.role === 'entry') return;
      Object.keys(sel).forEach(function (id) {
        if (!sel[id]) return;
        units(id).forEach(function (u) { u.dataset.status = 'in'; var bd = $('[data-badge]', u); bd.classList.add('flash'); setTimeout(function () { bd.classList.remove('flash'); }, 900); });
      });
      sel = {}; selMode = false; render();
    };
    markBtn.addEventListener('click', markEntered);
    $('[data-selcancel]').addEventListener('click', function () { sel = {}; selMode = false; render(); });
    $$('[data-toggle-status]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.closest('tr').dataset.inv;
        var next = units(id)[0].dataset.status === 'in' ? 'out' : 'in';
        units(id).forEach(function (u) { u.dataset.status = next; });
        render();
      });
    });

    // الجوال: ضغط مطوّل 500ms يدخل وضع التحديد، ثم النقر يحدد
    $$('.inv-card').forEach(function (card) {
      var timer = null, fired = false, sx = 0, sy = 0;
      var toggleSel = function () { var id = card.dataset.inv; sel[id] = !sel[id]; if (!Object.keys(sel).some(function (k) { return sel[k]; })) selMode = false; render(); };
      card.addEventListener('pointerdown', function (e) {
        fired = false; sx = e.clientX; sy = e.clientY;
        timer = setTimeout(function () {
          fired = true;
          if (root.dataset.role === 'entry' && !isMobile()) return;
          selMode = true; sel[card.dataset.inv] = true; render();
          if (navigator.vibrate) navigator.vibrate(15);
        }, 500);
      });
      var cancel = function () { clearTimeout(timer); };
      card.addEventListener('pointerup', cancel);
      card.addEventListener('pointerleave', cancel);
      card.addEventListener('pointercancel', cancel);
      card.addEventListener('pointermove', function (e) { if (Math.abs(e.clientX - sx) > 8 || Math.abs(e.clientY - sy) > 8) cancel(); });
      card.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      card.addEventListener('click', function () { if (fired) { fired = false; return; } if (selMode) toggleSel(); });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selMode = true; toggleSel(); }
      });
    });

    document.addEventListener('d3:key', function (ev) {
      var k = ev.detail.key;
      if (k === '1') setFilter('all'); else if (k === '2') setFilter('in'); else if (k === '3') setFilter('out');
      else if (k === 'm' && !markBtn.disabled) markEntered();
    });
    render();
  }

  /* ---------- إضافة حركة: توليد الرقم المرجعي + تحذير التكرار ---------- */
  if (body.classList.contains('pg-add-entry')) {
    var KNOWN_DUP = 'MISC/2026/08/0395';
    var form = $('[data-entry]'), refIn = $('[data-ref]'), dateIn = $('[data-date]'), gen = $('[data-gen]');
    var warn = $('[data-warn]'), confirmCb = $('[data-confirm]'), save = $('[data-save]'), saveNew = $('[data-save-new]');
    var why = $('[data-save-why]'), sideTag = $('[data-side]'), rule = $('[data-gen-rule]'), sbWarn = $('[data-sb-warn]'), supSel = $('[data-sup]');
    var wasDup = null;
    var type = function () { var r = $('[data-type]:checked'); return r ? r.value : 'misc'; };
    var compute = function () {
      var ref = refIn.value.trim(), d = dateIn.value.trim(), out = '';
      if (type() === 'inv') out = ref ? 'P' + ref : 'P…';
      else {
        var mm = /^(\d{4})-(\d{1,2})/.exec(d);
        out = 'MISC/' + (mm ? mm[1] + '/' + ('0' + mm[2]).slice(-2) : '----/--') + '/' + (ref || '…');
      }
      return out;
    };
    var update = function () {
      var out = compute(), dup = out === KNOWN_DUP;
      gen.innerHTML = '<span class="num">' + out + '</span>';
      gen.classList.toggle('is-dup', dup);
      sideTag.textContent = type() === 'inv' ? 'يُسجّل دائناً' : 'يُسجّل مديناً';
      rule.textContent = type() === 'inv' ? 'فاتورة: P + المرجع' : 'قيد: MISC / السنة / الشهر برقمين / المرجع';
      warn.hidden = !dup;
      if (sbWarn) sbWarn.hidden = !dup;
      var blocked = dup && !confirmCb.checked;
      save.disabled = blocked; saveNew.disabled = blocked;
      why.textContent = blocked ? 'الحفظ معطّل حتى تؤكد أن الحركة مختلفة عن المكررة.' : (dup ? 'أكّدت أنها حركة مختلفة. يمكنك الحفظ.' : 'الرقم المرجعي غير مستخدم. يمكنك الحفظ.');
      if (dup && wasDup === false && isMobile()) body.classList.add('warn-full');
      if (!dup) body.classList.remove('warn-full');
      wasDup = dup;
    };
    [refIn, dateIn].forEach(function (i) { i.addEventListener('input', update); });
    $$('[data-type]').forEach(function (r) { r.addEventListener('change', update); });
    confirmCb.addEventListener('change', update);
    $('[data-warn-back]').addEventListener('click', function () { body.classList.remove('warn-full'); refIn.focus(); });
    $('[data-warn-open]').addEventListener('click', function () { body.classList.add('warn-full'); confirmCb.focus(); });
    $$('[data-pick]').forEach(function (b) {
      b.addEventListener('click', function () {
        supSel.value = b.dataset.pick;
        $$('[data-pick]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      });
    });
    supSel.addEventListener('change', function () { $$('[data-pick]').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.pick === supSel.value)); }); });
    var doSave = function (andNew) {
      if (save.disabled) { confirmCb.focus(); return; }
      why.textContent = andNew ? 'حُفظت الحركة في النموذج، والنموذج جاهز لحركة جديدة.' : 'حُفظت الحركة في النموذج (عرض فقط، لا حفظ فعلي).';
      if (andNew) { refIn.value = ''; confirmCb.checked = false; update(); refIn.focus(); }
    };
    form.addEventListener('submit', function (e) { e.preventDefault(); doSave(false); });
    saveNew.addEventListener('click', function () { doSave(true); });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); doSave(false); }
      else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); doSave(true); }
      else if (e.altKey && (e.key === '1' || e.code === 'Digit1')) { e.preventDefault(); $('[data-type][value="inv"]').checked = true; update(); }
      else if (e.altKey && (e.key === '2' || e.code === 'Digit2')) { e.preventDefault(); $('[data-type][value="misc"]').checked = true; update(); }
      else if (e.key === 'Escape' && !(pal && pal.open)) {
        if (body.classList.contains('warn-full')) body.classList.remove('warn-full');
        else location.href = $('[data-cancel]').getAttribute('href');
      }
    });
    update();
    if (warn.hidden === false && isMobile()) body.classList.add('warn-full');
  }

  /* ---------- المراجعة: اعتماد / تجاهل + تنقّل J K ---------- */
  if (body.classList.contains('pg-review')) {
    var resolve = function (btn) {
      if (root.dataset.role === 'entry') return;
      var item = btn.closest('[data-item]') || btn.closest('.dup');
      var acts = btn.closest('.acts');
      item.classList.add('is-done');
      acts.classList.add('is-done');
      acts.innerHTML = btn.dataset.resolve === 'ok' ? (btn.textContent === 'إبقاء الاثنين' ? 'أُبقي الاثنان' : 'اعتُمد المرجّح') : 'تم التجاهل';
    };
    $$('[data-resolve]').forEach(function (b) { b.addEventListener('click', function () { resolve(b); }); });
    var rows = $$('tr[data-item]');
    document.addEventListener('d3:key', function (ev) {
      var k = ev.detail.key, i = rows.findIndex(function (r) { return r.classList.contains('is-cursor'); });
      if (k === 'j' || k === 'k') {
        if (i >= 0) rows[i].classList.remove('is-cursor');
        i = k === 'j' ? Math.min(rows.length - 1, i + 1) : Math.max(0, i - 1);
        rows[i].classList.add('is-cursor');
      } else if ((k === 'a' || k === 'x') && i >= 0) {
        var b = $('[data-resolve="' + (k === 'a' ? 'ok' : 'skip') + '"]', rows[i]); if (b) resolve(b);
      }
    });
  }
})();
