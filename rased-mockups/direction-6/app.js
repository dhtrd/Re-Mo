/* رصيد — الاتجاه 6 «هادئ»: سلوك الواجهة فقط (فلاتر، تحديد، تحذير، طي). لا منطق أعمال. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var mqMobile = window.matchMedia('(max-width: 600px)');
  var mqDesk = window.matchMedia('(min-width: 1280px)');

  /* ---------- توست ---------- */
  var toastTimer;
  function toast(msg) {
    var t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }

  /* ---------- طي القائمة الجانبية ---------- */
  function navExpanded() {
    var flip = document.body.classList.contains('nav-flip');
    return mqDesk.matches ? !flip : flip;
  }
  function syncNav() {
    $$('.nav-toggle').forEach(function (b) { b.setAttribute('aria-expanded', String(navExpanded())); });
  }
  $$('[data-nav-toggle]').forEach(function (b) {
    b.addEventListener('click', function () { document.body.classList.toggle('nav-flip'); syncNav(); });
  });
  mqDesk.addEventListener('change', function () { document.body.classList.remove('nav-flip'); syncNav(); });
  syncNav();

  /* ---------- حدّ الشريط العلوي عند التمرير ---------- */
  var bar = $('.topbar');
  function onScroll() { if (bar) bar.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- أدوات عامة ---------- */
  $$('[data-export]').forEach(function (b) {
    b.addEventListener('click', function () { toast('نموذج عرض: التصدير غير مفعّل هنا.'); });
  });
  $$('[data-unavail]').forEach(function (b) {
    b.addEventListener('click', function () { toast('كشف هذا المورد غير مضمَّن في النموذج.'); });
  });
  var search = $('#supSearch');
  if (search) search.addEventListener('input', function () {
    var q = search.value.trim();
    $$('.split-list > li').forEach(function (li) { li.hidden = q && li.textContent.indexOf(q) < 0; });
  });

  // ربط مجموعات راديو بنفس الدور (مثلاً فلتر الجوال وفلتر الحاسوب)
  function radioGroup(names, onChange) {
    names.forEach(function (name) {
      $$('input[name="' + name + '"]').forEach(function (r) {
        r.addEventListener('change', function () {
          if (!r.checked) return;
          names.forEach(function (n2) { $$('input[name="' + n2 + '"]').forEach(function (o) { o.checked = o.value === r.value; }); });
          onChange(r.value);
        });
      });
    });
  }

  /* ---------- لوحة الأرصدة ---------- */
  if (document.body.classList.contains('page-dashboard')) {
    radioGroup(['supf', 'supf2', 'supf3'], function (v) {
      $$('[data-sign]').forEach(function (el) {
        var hide = v !== 'all' && el.getAttribute('data-sign') !== v;
        var host = el.classList.contains('pick') ? el.parentElement : el;
        host.hidden = hide;
      });
    });
    var num = function (s) { return parseFloat(String(s).replace(/,/g, '')); };
    var moneyHTML = function (v, cls) {
      return '<span class="money' + (cls ? ' ' + cls : '') + '"><svg class="sar" role="img" aria-label="ريال سعودي"><use href="#sar"/></svg><span>' + v + '</span></span>';
    };
    $$('.pick[data-n]').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.pick[data-n]').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        var d = b.dataset, f = d.f, neg = f.charAt(0) === '-', zero = f === '0.00';
        $('#sdName').textContent = d.n;
        $('#sdF').innerHTML = moneyHTML(f, neg ? 'neg' : (zero ? '' : 'pos'));
        var t = $('#sdTone'); t.textContent = neg ? 'مستحق للمورد' : (zero ? 'متوازن' : 'لصالحنا');
        t.className = 'tone badge ' + (neg ? 'no' : 'ok');
        $('#sdP').innerHTML = moneyHTML(d.p); $('#sdD').innerHTML = moneyHTML(d.d); $('#sdC').innerHTML = moneyHTML(d.c);
        $('#sdD2').innerHTML = moneyHTML(d.d); $('#sdC2').innerHTML = moneyHTML(d.c);
        var max = Math.max(num(d.d), num(d.c)) || 1;
        $('#sdBarD').style.setProperty('--w', (num(d.d) / max * 100).toFixed(1) + '%');
        $('#sdBarC').style.setProperty('--w', (num(d.c) / max * 100).toFixed(1) + '%');
      });
    });
  }

  /* ---------- كشف الحساب ---------- */
  if (document.body.classList.contains('page-statement')) {
    radioGroup(['stf'], function (v) {
      $$('[data-type]').forEach(function (el) { el.hidden = v !== 'all' && el.getAttribute('data-type') !== v; });
      $$('[data-day]').forEach(function (day) { day.hidden = !$$('[data-type]', day).some(function (r) { return !r.hidden; }); });
    });
  }

  /* ---------- الفواتير ---------- */
  if (document.body.classList.contains('page-invoices')) {
    var selected = new Set();
    var filter = 'all';
    var canEdit = function () { return document.documentElement.getAttribute('data-role') !== 'entry'; };
    var list = $('#invList');
    var selBar = $('#selBar');

    function statusOf(ref) { return $('[data-ref="' + ref + '"]').getAttribute('data-status'); }
    function applyFilter() {
      $$('[data-ref][data-status]').forEach(function (el) {
        el.hidden = filter !== 'all' && el.getAttribute('data-status') !== filter;
      });
    }
    function renderReport() {
      var refs = $$('#invList .inv').filter(function (li) { return li.getAttribute('data-status') === 'out'; });
      $$('[data-report]').forEach(function (ul) {
        ul.innerHTML = refs.length ? refs.map(function (li) {
          var ref = li.getAttribute('data-ref');
          var money = $('.money', li).outerHTML;
          var date = $('.meta .num', li).outerHTML;
          return '<li><div class="cell"><span class="grow"><b class="num">' + ref + '</b><span class="cell-sub" style="display:block">' + date + '</span></span> ' + money + ' <span class="ex">مثال</span></div></li>';
        }).join('') : '<li><p class="cell muted">كل الفواتير المعروضة دخلت Odoo.</p></li>';
      });
    }
    function syncSelection() {
      $$('input[data-sel]').forEach(function (c) { c.checked = selected.has(c.getAttribute('data-sel')); });
      $$('[data-ref]').forEach(function (el) { el.classList.toggle('is-sel', selected.has(el.getAttribute('data-ref'))); });
      var all = $('[data-sel-all]');
      if (all) { all.checked = selected.size === 4; all.indeterminate = selected.size > 0 && selected.size < 4; }
      $$('[data-mark]').forEach(function (b) { b.disabled = selected.size === 0; });
      var c = $('#selCount'); if (c) c.textContent = selected.size ? 'تم تحديد ' + selected.size : 'لم يُحدَّد شيء';
    }
    function setStatus(ref, s) {
      $$('[data-ref="' + ref + '"]').forEach(function (el) {
        el.setAttribute('data-status', s);
        var b = $('[data-st-badge]', el);
        b.className = 'badge ' + (s === 'in' ? 'ok' : 'no'); b.textContent = s === 'in' ? 'دخلت' : 'لم تدخل';
      });
    }
    function enterSelect(on) {
      list.classList.toggle('selecting', on);
      document.body.classList.toggle('selecting', on);
      if (selBar) selBar.hidden = !on;
      if (!on) { selected.clear(); syncSelection(); }
    }

    radioGroup(['invf'], function (v) { filter = v; applyFilter(); });
    $$('input[data-sel]').forEach(function (c) {
      c.addEventListener('change', function () {
        var ref = c.getAttribute('data-sel');
        if (c.checked) selected.add(ref); else selected.delete(ref);
        syncSelection();
      });
    });
    var all = $('[data-sel-all]');
    if (all) all.addEventListener('change', function () {
      $$('#invList .inv').forEach(function (li) {
        var ref = li.getAttribute('data-ref');
        if (all.checked && !li.hidden) selected.add(ref); else selected.delete(ref);
      });
      syncSelection();
    });
    $$('[data-mark]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!canEdit() || !selected.size) return;
        var n = selected.size;
        selected.forEach(function (ref) { setStatus(ref, 'in'); });
        selected.clear(); syncSelection(); applyFilter(); renderReport();
        if (mqMobile.matches) enterSelect(false);
        toast('حُدِّدت ' + n + ' كـدخلت (في هذا النموذج فقط).');
      });
    });
    $$('[data-toggle-st]').forEach(function (b) {
      b.addEventListener('click', function () {
        var ref = b.getAttribute('data-toggle-st');
        setStatus(ref, statusOf(ref) === 'in' ? 'out' : 'in'); applyFilter(); renderReport();
      });
    });
    var sm = $('[data-select-mode]');
    if (sm) sm.addEventListener('click', function () { enterSelect(!list.classList.contains('selecting')); });
    var sc = $('[data-select-cancel]');
    if (sc) sc.addEventListener('click', function () { enterSelect(false); });

    // جوال: ضغط مطوّل 500ms يدخل وضع التحديد، ثم النقر يحدد
    $$('#invList .inv').forEach(function (li) {
      var timer = null, fired = false, sx = 0, sy = 0;
      var ref = li.getAttribute('data-ref');
      function toggle() { if (selected.has(ref)) selected.delete(ref); else selected.add(ref); syncSelection(); }
      li.addEventListener('pointerdown', function (e) {
        if (!mqMobile.matches || !canEdit()) return;
        fired = false; sx = e.clientX; sy = e.clientY;
        clearTimeout(timer);
        timer = setTimeout(function () {
          fired = true;
          if (!list.classList.contains('selecting')) enterSelect(true);
          selected.add(ref); syncSelection();
          if (navigator.vibrate) navigator.vibrate(12);
        }, 500);
      });
      li.addEventListener('pointermove', function (e) { if (Math.abs(e.clientX - sx) > 8 || Math.abs(e.clientY - sy) > 8) clearTimeout(timer); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { li.addEventListener(ev, function () { clearTimeout(timer); }); });
      li.addEventListener('contextmenu', function (e) { if (mqMobile.matches) e.preventDefault(); });
      li.addEventListener('click', function (e) {
        if (!mqMobile.matches) return;
        if (fired) { fired = false; e.preventDefault(); return; }
        if (list.classList.contains('selecting') && !e.target.closest('.ck')) { e.preventDefault(); toggle(); }
      });
    });
    document.addEventListener('rased:role', function () { if (!canEdit()) enterSelect(false); });
    renderReport(); syncSelection();
  }

  /* ---------- إضافة حركة ---------- */
  var form = $('#entryForm');
  if (form) {
    var DUP = 'MISC/2026/08/0395';
    var confirmBox = $('#confirmDup');
    var save = $('#saveBtn'), saveNew = $('#saveNewBtn');
    var dupPanel = $('#dup'), inline = $('#dupInline');
    var cont = $('[data-sheet-continue]');
    var wasDup = true;
    var supSel = $('#supSel');
    var allOptions = supSel.innerHTML;

    function isDup() { return $('#genRef').textContent === DUP; }
    function openSheet() { document.body.classList.add('sheet-open'); if (inline) inline.hidden = true; }
    function closeSheet() { document.body.classList.remove('sheet-open'); if (inline) inline.hidden = !isDup(); }
    function syncSave() {
      var block = isDup() && !confirmBox.checked;
      save.disabled = block; saveNew.disabled = block;
      if (cont) cont.disabled = !confirmBox.checked;
      $('#saveHint').hidden = !block;
    }
    function gen() {
      var type = form.type.value, ref = form.ref.value.trim(), date = form.date.value.trim();
      var out;
      if (type === 'invoice') out = ref ? 'P' + ref : 'P + المرجع';
      else {
        var m = date.match(/^(\d{4})-(\d{2})-\d{2}$/);
        out = (m && ref) ? 'MISC/' + m[1] + '/' + m[2] + '/' + ref : 'MISC/السنة/الشهر/المرجع';
      }
      $('#genRef').textContent = out;
      $('#sideBadge').textContent = type === 'invoice' ? 'دائن' : 'مدين';
      var dup = out === DUP;
      $('#genRef').classList.toggle('dup-on', dup);
      $('#genBadge').hidden = !dup;
      dupPanel.hidden = !dup;
      if (dup && !wasDup) { confirmBox.checked = false; if (mqMobile.matches) openSheet(); }
      if (!dup) { document.body.classList.remove('sheet-open'); if (inline) inline.hidden = true; }
      wasDup = dup;
      syncSave();
    }
    ['input', 'change'].forEach(function (ev) { form.addEventListener(ev, function (e) { if (e.target.name === 'type' || e.target.name === 'ref' || e.target.name === 'date') gen(); }); });
    confirmBox.addEventListener('change', syncSave);
    $$('[data-sheet-back]').forEach(function (b) { b.addEventListener('click', function () { closeSheet(); form.ref.focus(); }); });
    if (cont) cont.addEventListener('click', function () { closeSheet(); save.focus(); });
    $$('[data-sheet-open]').forEach(function (b) { b.addEventListener('click', function () { openSheet(); $('[data-sheet-back]').focus(); }); });
    $$('[data-edit-ref]').forEach(function (b) { b.addEventListener('click', function () { form.ref.focus(); form.ref.select(); }); });
    // ابدأ بالورقة مفتوحة على الجوال فقط
    if (!mqMobile.matches) document.body.classList.remove('sheet-open');
    mqMobile.addEventListener('change', function (e) { if (!e.matches) document.body.classList.remove('sheet-open'); else if (isDup() && !confirmBox.checked) openSheet(); });

    function trySave(andNew) {
      if (save.disabled) {
        toast('حدِّد «أؤكد أنها حركة مختلفة» أولاً.');
        if (mqMobile.matches) openSheet();
        confirmBox.focus();
        return;
      }
      toast(andNew ? 'حُفظت الحركة. نموذج جديد جاهز (عرض فقط).' : 'حُفظت الحركة (عرض فقط، لا يُرسل شيء).');
      if (andNew) { form.ref.value = ''; form.desc.value = ''; form.amount.value = ''; form.voucher.value = ''; gen(); form.ref.focus(); }
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); trySave(false); });
    saveNew.addEventListener('click', function () { trySave(true); });
    document.addEventListener('keydown', function (e) {
      var mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === 's' || e.key === 'S')) { e.preventDefault(); trySave(false); }
      else if (mod && e.key === 'Enter') { e.preventDefault(); trySave(true); }
      else if (e.altKey && (e.key === '1' || e.code === 'Digit1')) { e.preventDefault(); form.type.value = 'invoice'; gen(); }
      else if (e.altKey && (e.key === '2' || e.code === 'Digit2')) { e.preventDefault(); form.type.value = 'misc'; gen(); }
      else if (e.key === 'Escape') {
        if (document.body.classList.contains('sheet-open') && mqMobile.matches) { closeSheet(); return; }
        if (document.body.classList.contains('nav-flip') && !mqDesk.matches) { document.body.classList.remove('nav-flip'); syncNav(); return; }
        toast('أُلغي الإدخال. العودة إلى الأرصدة…');
        setTimeout(function () { location.href = 'dashboard.html'; }, 700);
      }
    });
    function roleSupp() {
      var entry = document.documentElement.getAttribute('data-role') === 'entry';
      supSel.innerHTML = entry ? '<option>[الموردون المسندون]</option>' : allOptions;
    }
    document.addEventListener('rased:role', roleSupp);
    roleSupp();
    gen();
  } else {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('nav-flip') && !mqDesk.matches) { document.body.classList.remove('nav-flip'); syncNav(); }
    });
  }

  /* ---------- مركز المراجعة ---------- */
  var rv = $('#rv');
  if (rv) {
    function show(k) {
      rv.setAttribute('data-show', k);
      $$('.pick[data-rv]').forEach(function (p) { p.setAttribute('aria-pressed', String(p.getAttribute('data-rv') === k)); });
      $$('input[name="rvs"]').forEach(function (r) { r.checked = r.value === k; });
    }
    radioGroup(['rvs'], show);
    $$('.pick[data-rv]').forEach(function (p) { p.addEventListener('click', function () { show(p.getAttribute('data-rv')); }); });
    function fromHash() { var h = location.hash.slice(1); if (['dates', 'dups', 'untyped'].indexOf(h) >= 0) show(h); }
    window.addEventListener('hashchange', fromHash); fromHash();
    function resolve(btn, msg) {
      var item = btn.closest('.cmp, tr');
      var box = btn.closest('.cmp-act');
      item.classList.add('done');
      box.innerHTML = '<span class="done-note" role="status">' + msg + '</span>';
      toast(msg + ' (في هذا النموذج فقط).');
    }
    rv.addEventListener('click', function (e) {
      var a = e.target.closest('[data-approve]'), i = e.target.closest('[data-ignore]');
      if (a) resolve(a, a.getAttribute('data-done') || 'اعتُمد التاريخ المرجّح');
      if (i) resolve(i, 'تم التجاهل');
    });
  }
})();
