/* رصيد — الاتجاه 2 «الورشة»: سلوك الواجهة فقط (طي، فلاتر، تحديد، تحذير، اختصارات). لا منطق أعمال. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var mqMobile = matchMedia('(max-width: 600px)');
  var mqLand = matchMedia('(min-width: 1025px) and (max-width: 1279px)');
  var mqDesk = matchMedia('(min-width: 1280px)');
  var toastTimer;

  function toast(msg) {
    var t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }
  function canEdit() { return document.documentElement.getAttribute('data-role') !== 'entry'; }

  document.addEventListener('DOMContentLoaded', function () {
    /* طي الشريط الجانبي (اللوحي العمودي) */
    var shell = $('#shell');
    $$('[data-rail-toggle]').forEach(function (b) {
      b.addEventListener('click', function () {
        var open = shell.classList.toggle('rail-open');
        b.setAttribute('aria-expanded', String(open));
        b.setAttribute('aria-label', open ? 'طي القائمة' : 'توسيع القائمة');
      });
    });

    /* مزامنة كل مبدّلات الدور */
    document.addEventListener('rased:role', function (e) {
      $$('[data-role-select]').forEach(function (s) { s.value = e.detail; });
      if (window.RasedPage && window.RasedPage.onRole) window.RasedPage.onRole();
    });

    /* أزرار نموذجية بلا أثر حقيقي */
    $$('[data-toast]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.preventDefault(); toast(b.getAttribute('data-toast')); });
    });
    $$('form.period').forEach(function (f) {
      f.addEventListener('submit', function (e) { e.preventDefault(); toast('نموذج عرض: الفترة محددة، ولا بيانات حية هنا.'); });
    });

    /* صفوف قابلة للتوسيع (اللوحي) */
    $$('[data-row-toggle]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var more = document.getElementById(b.getAttribute('aria-controls'));
        var open = b.getAttribute('aria-expanded') !== 'true';
        b.setAttribute('aria-expanded', String(open));
        more.hidden = !open;
      });
    });

    initDashboard();
    initInvoices();
    initEntry();
    initReview();
  });

  /* ———————————— لوحة الأرصدة ———————————— */
  function initDashboard() {
    var grid = $('.sup-grid'); if (!grid) return;
    var cards = $$('.sup', grid);
    var detail = $('#supDetail');
    function setOpen(card, on) {
      var b = $('.sup-toggle', card), d = $('.sup-more', card);
      d.hidden = !on; b.setAttribute('aria-expanded', String(on));
    }
    function syncOpen() { cards.forEach(function (c) { setOpen(c, mqDesk.matches); }); }
    syncOpen(); mqDesk.addEventListener('change', syncOpen);

    function show(card) {
      cards.forEach(function (c) { c.removeAttribute('aria-current'); });
      card.setAttribute('aria-current', 'true');
      $('.d-name', detail).textContent = $('.sup-pick', card).textContent;
      $('.d-final', detail).innerHTML = $('.sup-final', card).innerHTML;
      $('.d-trio', detail).innerHTML = $('.trio', card).innerHTML;
      var flag = $('.flag', card);
      $('.d-flag', detail).className = 'd-flag ' + flag.className;
      $('.d-flag', detail).textContent = flag.textContent;
    }
    cards.forEach(function (card) {
      var pick = $('.sup-pick', card);
      pick.addEventListener('click', function (e) {
        e.stopPropagation();
        if (mqLand.matches) { show(card); return; }
        if (!mqDesk.matches) setOpen(card, $('.sup-more', card).hidden);
      });
      $('.sup-toggle', card).addEventListener('click', function (e) { e.stopPropagation(); setOpen(card, $('.sup-more', card).hidden); });
      card.addEventListener('click', function () { if (mqLand.matches) show(card); });
    });
  }

  /* ———————————— الفواتير ———————————— */
  function initInvoices() {
    var table = $('.invt'); if (!table) return;
    var rows = $$('tbody tr.inv-row', table);
    var filter = 'all';
    var selecting = false;

    function selected() { return rows.filter(function (r) { return r.classList.contains('is-sel'); }); }
    function setSel(r, on) {
      r.classList.toggle('is-sel', on);
      $('input[type=checkbox]', r).checked = on;
      r.setAttribute('aria-selected', String(on));
    }
    function update() {
      var n = selected().length;
      $$('.sel-n [data-n]').forEach(function (s) { s.textContent = String(n); });
      $$('[data-mark]').forEach(function (b) { b.disabled = n === 0; });
      var all = $('#selAll');
      if (all) {
        var vis = rows.filter(function (r) { return !r.hidden; });
        all.checked = vis.length > 0 && vis.every(function (r) { return r.classList.contains('is-sel'); });
      }
      // تقرير «لم تدخل»
      var list = $('#outList'); list.innerHTML = '';
      rows.filter(function (r) { return r.dataset.status === 'out'; }).forEach(function (r) {
        var li = document.createElement('li');
        li.innerHTML = '<span class="num"><strong>' + r.dataset.no + '</strong></span> <span class="num muted">' + r.dataset.date + '</span> ' + $('.c-amt', r).innerHTML;
        list.appendChild(li);
      });
      if (!list.children.length) list.innerHTML = '<li class="empty">لا فواتير «لم تدخل» بين الأمثلة المعروضة.</li>';
    }
    function applyFilter() {
      rows.forEach(function (r) {
        var hide = filter !== 'all' && r.dataset.status !== filter;
        r.hidden = hide;
        var more = document.getElementById('m-' + r.dataset.no);
        if (more && hide) more.hidden = true;
        if (hide) setSel(r, false);
      });
      update();
    }
    $$('[data-filter]').forEach(function (b) {
      b.addEventListener('click', function () {
        filter = b.dataset.filter;
        $$('[data-filter]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        applyFilter();
      });
    });
    rows.forEach(function (r) {
      $('input[type=checkbox]', r).addEventListener('change', function (e) { setSel(r, e.target.checked); update(); });
    });
    var all = $('#selAll');
    if (all) all.addEventListener('change', function () {
      rows.forEach(function (r) { if (!r.hidden) setSel(r, all.checked); }); update();
    });

    /* الجوال: ضغط مطوّل 500ms يدخل وضع التحديد */
    function enterSelecting() { selecting = true; document.body.classList.add('selecting'); }
    function exitSelecting() {
      selecting = false; document.body.classList.remove('selecting');
      rows.forEach(function (r) { setSel(r, false); }); update();
    }
    rows.forEach(function (r) {
      var timer = null, moved = false, fired = false, sx = 0, sy = 0;
      r.addEventListener('pointerdown', function (e) {
        if (!mqMobile.matches) return;
        moved = false; fired = false; sx = e.clientX; sy = e.clientY;
        timer = setTimeout(function () {
          fired = true;
          if (!selecting) enterSelecting();
          setSel(r, true); update();
          if (navigator.vibrate) navigator.vibrate(15);
        }, 500);
      });
      r.addEventListener('pointermove', function (e) { if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 10) { moved = true; clearTimeout(timer); } });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { r.addEventListener(ev, function () { clearTimeout(timer); }); });
      r.addEventListener('contextmenu', function (e) { if (mqMobile.matches) e.preventDefault(); });
      r.addEventListener('click', function (e) {
        if (!mqMobile.matches || !selecting) return;
        if (fired) { fired = false; return; }
        if (e.target.closest('input,label')) return;
        if (!moved) { setSel(r, !r.classList.contains('is-sel')); update(); }
      });
    });
    $$('[data-select-mode]').forEach(function (b) { b.addEventListener('click', function () { selecting ? exitSelecting() : enterSelecting(); }); });
    $$('[data-exit-select]').forEach(function (b) { b.addEventListener('click', exitSelecting); });

    /* تحديد كـدخلت (المالك والإدارة) */
    $$('[data-mark]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!canEdit()) return;
        var sel = selected(); if (!sel.length) return;
        sel.forEach(function (r) {
          r.dataset.status = 'in';
          var badge = $('.badge', r);
          badge.className = 'badge badge-in'; badge.textContent = 'دخلت';
          setSel(r, false);
        });
        toast('حُدّدت ' + sel.length + ' فاتورة كـدخلت (في هذه الواجهة فقط).');
        if (selecting && mqMobile.matches) exitSelecting();
        applyFilter();
      });
    });
    window.RasedPage = { onRole: function () { if (!canEdit()) exitSelecting(); } };
    update();
  }

  /* ———————————— إضافة حركة ———————————— */
  function initEntry() {
    var form = $('#entryForm'); if (!form) return;
    var ref = $('#ref'), date = $('#date'), out = $('#genRef'), warn = $('#dupWarn'), conf = $('#dupConfirm');
    var saves = $$('[data-save]'), sideLbl = $('#amtSide'), amtLabel = $('#amtLabel'), inline = $('#dupInline');
    var KNOWN_DUP = 'MISC/2026/08/0395';
    var initial = { type: 'je', date: date.value, ref: ref.value };

    function type() { return $('input[name=type]:checked').value; }
    function generate() {
      var r = ref.value.trim();
      if (!r) return '';
      if (type() === 'inv') return 'P' + r;
      var m = /^(\d{4})-(\d{2})/.exec(date.value || '');
      return m ? 'MISC/' + m[1] + '/' + m[2] + '/' + r : '';
    }
    function sync() {
      var g = generate();
      $('.gen-val', out).textContent = g || 'يُولَّد بعد إدخال المرجع';
      var dup = g === KNOWN_DUP;
      out.classList.toggle('dup', dup);
      warn.dataset.state = dup ? 'dup' : 'ok';
      if (!dup) { conf.checked = false; }
      inline.classList.toggle('on', dup);
      var ok = !dup || conf.checked;
      saves.forEach(function (b) { b.disabled = !ok; });
      var isInv = type() === 'inv';
      amtLabel.textContent = isInv ? 'المبلغ (دائن)' : 'المبلغ (مدين)';
      sideLbl.innerHTML = isInv ? 'يُسجَّل <strong>دائناً</strong> تلقائياً لأن النوع فاتورة.' : 'يُسجَّل <strong>مديناً</strong> تلقائياً لأن النوع قيد.';
      $('#genRule').textContent = isInv ? 'فاتورة: الحرف P ثم المرجع.' : 'قيد: MISC / السنة / الشهر برقمين / المرجع، من التاريخ.';
      if (dup && mqMobile.matches && !warn.classList.contains('dismissed')) openOverlay();
      if (!dup) closeOverlay(true);
    }
    function openOverlay() { warn.classList.remove('dismissed'); document.body.classList.add('warn-open'); }
    function closeOverlay(silent) {
      warn.classList.add('dismissed'); document.body.classList.remove('warn-open');
      if (!silent && mqMobile.matches) ref.focus();
    }
    [ref, date].forEach(function (el) { el.addEventListener('input', function () { warn.classList.remove('dismissed'); sync(); }); });
    $$('input[name=type]').forEach(function (el) { el.addEventListener('change', function () { warn.classList.remove('dismissed'); sync(); }); });
    conf.addEventListener('change', function () { sync(); var go = $('#warnGo'); if (go) go.disabled = !conf.checked; });
    $('#warnBack').addEventListener('click', function () { closeOverlay(false); });
    $('#warnGo').addEventListener('click', function () { closeOverlay(true); $('#voucher').focus(); });
    $('#showWarn').addEventListener('click', openOverlay);

    function save(andNew) {
      if (saves[0].disabled) { toast('لا يمكن الحفظ: أكّد أن الحركة مختلفة أو عدّل المرجع.'); return; }
      toast(andNew ? 'نموذج: حُفظت الحركة وفُتح نموذج جديد.' : 'نموذج: حُفظت الحركة.');
    }
    function reset() {
      $('input[name=type][value="' + initial.type + '"]').checked = true;
      date.value = initial.date; ref.value = initial.ref; conf.checked = false;
      sync(); toast('أُلغيت التعديلات وعاد النموذج لحالته الأولى.');
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); save(false); });
    $('#saveNew').addEventListener('click', function () { save(true); });
    $('#cancelBtn').addEventListener('click', reset);
    document.addEventListener('keydown', function (e) {
      var k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 's') { e.preventDefault(); save(false); }
      else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); save(true); }
      else if (e.key === 'Escape') {
        if (document.body.classList.contains('warn-open')) closeOverlay(false); else reset();
      }
      else if (e.altKey && (e.code === 'Digit1' || e.code === 'Digit2')) {
        e.preventDefault();
        var v = e.code === 'Digit1' ? 'inv' : 'je';
        var r = $('input[name=type][value="' + v + '"]'); r.checked = true; r.focus(); sync();
      }
    });
    mqMobile.addEventListener('change', function () { if (!mqMobile.matches) document.body.classList.remove('warn-open'); else sync(); });
    sync();
  }

  /* ———————————— المراجعة ———————————— */
  function initReview() {
    $$('[data-resolve]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!canEdit()) return;
        var row = b.closest('.cmp');
        row.classList.add('done');
        $('.done-msg', row).textContent = b.dataset.resolve === 'approve' ? 'اعتُمد التاريخ المرجّح (في هذه الواجهة فقط).' : 'تُجوهل هذا السجل (في هذه الواجهة فقط).';
      });
    });
  }
})();
