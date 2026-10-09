/* رصيد — الاتجاه 4 «روشن»: تفاعلات العرض فقط (فلاتر، تحديد، تحذير، طي). لا منطق أعمال حقيقي. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var body = document.body;
  var mqMobile = matchMedia('(max-width: 600px)');
  var mqTL = matchMedia('(min-width: 1025px) and (max-width: 1279px)');
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  var toastEl = $('.toast'), toastT;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 2600);
  }

  /* طي القائمة الجانبية (لوحي عمودي) */
  $$('[data-rail-toggle]').forEach(function (b) {
    function sync() {
      var c = root.classList.contains('rail-collapsed');
      b.setAttribute('aria-expanded', String(!c));
      var l = $('.lbl', b); if (l) l.textContent = c ? 'توسيع القائمة' : 'طيّ القائمة';
      b.setAttribute('aria-label', c ? 'توسيع القائمة' : 'طيّ القائمة');
    }
    sync();
    b.addEventListener('click', function () {
      root.classList.toggle('rail-collapsed');
      store('rased-d4-rail', root.classList.contains('rail-collapsed') ? '1' : '0');
      sync();
    });
  });

  /* نموذج الفترة: عرض فقط */
  $$('[data-period]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var a = $('#from', f).value, b = $('#to', f).value;
      toast('الفترة: من ' + (a || 'البداية') + ' إلى ' + (b || 'نهاية الكشف'));
    });
  });

  var page = body.getAttribute('data-page');

  /* ===== لوحة الأرصدة: اختيار نافذة مورد في التخطيط المقسوم ===== */
  if (page === 'dashboard') {
    var detail = $('.detail');
    $$('.sup-w').forEach(function (w) {
      w.addEventListener('click', function (e) {
        if (!mqTL.matches) return;
        e.preventDefault();
        $$('.sup-w').forEach(function (x) { x.removeAttribute('aria-current'); });
        w.setAttribute('aria-current', 'true');
        var dds = $$('dd', w);
        $('[data-d="name"]', detail).textContent = $('.nm', w).textContent;
        $('[data-d="final"]', detail).innerHTML = $('.wv', w).innerHTML;
        $('[data-d="prev"]', detail).innerHTML = dds[0].innerHTML;
        $('[data-d="debit"]', detail).innerHTML = dds[1].innerHTML;
        $('[data-d="credit"]', detail).innerHTML = dds[2].innerHTML;
        var o = $('.owed', w);
        $('[data-d="owed"]', detail).innerHTML = o ? o.outerHTML : '';
      });
    });
  }

  /* ===== كشف الحساب: فلتر النوع والتصدير ===== */
  if (page === 'statement') {
    var fbar = $('[data-filter]');
    fbar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-f]'); if (!b) return;
      $$('[data-f]', fbar).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      var f = b.getAttribute('data-f');
      $$('[data-type]').forEach(function (r) { r.hidden = !(f === 'all' || r.getAttribute('data-type') === f); });
    });
    $$('[data-export]').forEach(function (b) {
      b.addEventListener('click', function () { toast('تصدير ' + b.getAttribute('data-export') + ': متاح عند ربط البيانات'); });
    });
  }

  /* ===== الفواتير: فلتر، تحديد جماعي، ضغط مطوّل، تحديد كـدخلت ===== */
  if (page === 'invoices') {
    var selected = {};
    var filter = 'all';
    var items = function () { return $$('[data-inv]'); };
    function statusOf(id) { return $('[data-inv="' + id + '"]').getAttribute('data-status'); }
    function setStatus(id, st) {
      $$('[data-inv="' + id + '"]').forEach(function (el) {
        el.setAttribute('data-status', st);
        var bd = $('[data-badge]', el);
        bd.className = 'badge ' + st;
        bd.textContent = st === 'in' ? 'دخلت' : 'لم تدخل';
      });
    }
    function render() {
      var ids = Object.keys(selected).filter(function (k) { return selected[k]; });
      items().forEach(function (el) {
        var id = el.getAttribute('data-inv');
        var on = !!selected[id];
        var cb = $('[data-sel]', el); if (cb) cb.checked = on;
        if (el.classList.contains('card')) el.setAttribute('aria-selected', String(on));
        el.hidden = !(filter === 'all' || el.getAttribute('data-status') === filter);
      });
      $$('[data-selcount]').forEach(function (s) { s.textContent = ids.length ? ids.length + ' محددة' : 'لا شيء محدد'; });
      $$('[data-mark]').forEach(function (b) { b.disabled = !ids.length; });
      var all = $('[data-sel-all]'); if (all) all.checked = ids.length === 4;
      var rep = $('[data-report]');
      var outs = $$('tr[data-inv]').filter(function (r) { return r.getAttribute('data-status') === 'out'; });
      rep.innerHTML = outs.length ? outs.map(function (r) {
        return '<li><span class="num">' + r.getAttribute('data-inv') + '</span> <span>' + $('.n', r).innerHTML + ' <span class="eg">مثال</span></span></li>';
      }).join('') : '<li class="empty">كل الأمثلة المعروضة دخلت Odoo.</li>';
    }
    function toggle(id, force) { selected[id] = force === undefined ? !selected[id] : force; render(); }

    $('[data-inv-filter]').addEventListener('click', function (e) {
      var b = e.target.closest('[data-f]'); if (!b) return;
      $$('[data-f]', this).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      filter = b.getAttribute('data-f'); render();
    });
    document.addEventListener('change', function (e) {
      var cb = e.target;
      if (cb.matches('[data-sel]')) toggle(cb.closest('[data-inv]').getAttribute('data-inv'), cb.checked);
      if (cb.matches('[data-sel-all]')) {
        $$('tr[data-inv]').forEach(function (r) { if (!r.hidden) selected[r.getAttribute('data-inv')] = cb.checked; });
        render();
      }
    });
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-toggle]');
      if (t) {
        var id = t.closest('[data-inv]').getAttribute('data-inv');
        setStatus(id, statusOf(id) === 'in' ? 'out' : 'in'); render();
        toast(id + ': ' + (statusOf(id) === 'in' ? 'دخلت' : 'لم تدخل'));
        return;
      }
      if (e.target.closest('[data-mark]')) {
        var ids = Object.keys(selected).filter(function (k) { return selected[k]; });
        ids.forEach(function (id) { setStatus(id, 'in'); });
        selected = {}; render(); exitSelect();
        toast('حُدّدت ' + ids.length + ' كـدخلت');
        return;
      }
      if (e.target.closest('[data-sel-exit]')) { selected = {}; render(); exitSelect(); }
    });

    /* الجوال: ضغط مطوّل 500ms يدخل وضع التحديد */
    var bar = $('[data-actionbar]');
    function enterSelect() { body.classList.add('selecting'); bar.classList.add('on'); }
    function exitSelect() { body.classList.remove('selecting'); bar.classList.remove('on'); }
    $$('.card').forEach(function (c) {
      var timer, longFired = false, sx = 0, sy = 0;
      c.addEventListener('pointerdown', function (e) {
        if (e.target.closest('button,input,label')) return;
        longFired = false; sx = e.clientX; sy = e.clientY;
        timer = setTimeout(function () {
          longFired = true; enterSelect(); toggle(c.getAttribute('data-inv'), true);
          if (navigator.vibrate) navigator.vibrate(15);
        }, 500);
      });
      c.addEventListener('pointermove', function (e) { if (Math.abs(e.clientX - sx) > 8 || Math.abs(e.clientY - sy) > 8) clearTimeout(timer); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { c.addEventListener(ev, function () { clearTimeout(timer); }); });
      c.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      c.addEventListener('click', function (e) {
        if (longFired) { longFired = false; return; }
        if (e.target.closest('button,input,label')) return;
        if (body.classList.contains('selecting')) toggle(c.getAttribute('data-inv'));
      });
      c.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); enterSelect(); toggle(c.getAttribute('data-inv')); }
      });
    });
    document.addEventListener('rased:role', render);
    render();
  }

  /* ===== إضافة حركة: توليد الرقم، التحذير الصارم، الاختصارات ===== */
  if (page === 'add-entry') {
    var form = $('[data-entry]');
    var ref = $('#ref'), date = $('#date'), sup = $('#supplier');
    var confirmCb = $('[data-confirm]');
    var dupBox = $('#dup');
    var saveBtns = $$('[data-save],[data-save-new]');
    var dismissed = false;
    var DUP = 'MISC/2026/08/0395';
    function type() { var r = $('input[name="type"]:checked'); return r ? r.value : 'misc'; }
    function gen() {
      var r = (ref.value || '').trim();
      if (!r) return '';
      if (type() === 'inv') return 'P' + r;
      var d = (date.value || '').split('-');
      if (d.length < 2) return 'MISC/????/??/' + r;
      return 'MISC/' + d[0] + '/' + d[1] + '/' + r;
    }
    function update() {
      var g = gen();
      var isDup = g === DUP;
      $$('[data-gen-out]').forEach(function (o) { o.textContent = g || '—'; });
      $('.gen').classList.toggle('is-dup', isDup);
      body.classList.toggle('has-dup', isDup);
      dupBox.classList.toggle('clear', !isDup);
      if (!isDup) { confirmCb.checked = false; dismissed = false; }
      body.classList.toggle('dup-full', isDup && mqMobile.matches && !dismissed);
      var ok = !isDup || confirmCb.checked;
      saveBtns.forEach(function (b) { b.disabled = !ok; });
      var inv = type() === 'inv';
      $('[data-side]').textContent = inv ? '(دائن)' : '(مدين)';
      $('[data-side-help]').textContent = inv ? 'الفاتورة تُسجَّل دائنةً تلقائياً.' : 'القيد يُسجَّل مديناً تلقائياً.';
    }
    [ref, date].forEach(function (el) { el.addEventListener('input', function () { dismissed = false; update(); }); });
    $$('input[name="type"]').forEach(function (el) { el.addEventListener('change', function () { dismissed = false; update(); }); });
    confirmCb.addEventListener('change', update);
    $('[data-dup-back]').addEventListener('click', function () { dismissed = true; update(); ref.focus(); });
    $('[data-dup-open]').addEventListener('click', function () { dismissed = false; update(); confirmCb.focus(); });
    mqMobile.addEventListener('change', update);

    $$('[data-pick]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        sup.value = a.getAttribute('data-pick');
        $$('[data-pick]').forEach(function (x) { x.removeAttribute('aria-current'); });
        a.setAttribute('aria-current', 'true');
        sup.focus();
      });
    });

    function save(andNew) {
      if (saveBtns[0].disabled) { toast('أكّد أولاً أنها حركة مختلفة'); confirmCb.focus(); return; }
      toast(andNew ? 'حُفظت الحركة. نموذج جديد جاهز' : 'حُفظت الحركة (نموذج للعرض)');
      if (andNew) { ref.value = ''; $('#voucher').value = ''; $('#amount').value = ''; $('#desc').value = ''; update(); ref.focus(); }
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); save(false); });
    $('[data-save-new]').addEventListener('click', function () { save(true); });
    document.addEventListener('keydown', function (e) {
      var k = e.key;
      if ((e.ctrlKey || e.metaKey) && (k === 's' || k === 'S')) { e.preventDefault(); save(false); }
      else if ((e.ctrlKey || e.metaKey) && k === 'Enter') { e.preventDefault(); save(true); }
      else if (e.altKey && (k === '1' || k === '2' || e.code === 'Digit1' || e.code === 'Digit2')) {
        e.preventDefault();
        var v = (k === '1' || e.code === 'Digit1') ? 'inv' : 'misc';
        var r = $('input[name="type"][value="' + v + '"]'); r.checked = true; r.focus(); dismissed = false; update();
      } else if (k === 'Escape') {
        if (body.classList.contains('dup-full')) { dismissed = true; update(); return; }
        form.reset(); dismissed = false; update(); toast('أُلغي الإدخال وأُعيد النموذج');
      }
    });
    update();
  }

  /* ===== المراجعة: أقسام، اعتماد/تجاهل، سجل القرارات ===== */
  if (page === 'review') {
    var main = $('.rev');
    function setCat(c) {
      main.setAttribute('data-cat', c);
      $$('[data-cat-link]').forEach(function (a) {
        if (a.getAttribute('data-cat-link') === c) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    }
    $$('[data-cat-link]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        setCat(a.getAttribute('data-cat-link'));
        if (mqTL.matches) { e.preventDefault(); history.replaceState(null, '', a.getAttribute('href')); }
      });
    });
    var h = location.hash.replace('#', '');
    if (['dates', 'dups', 'untyped'].indexOf(h) >= 0) setCat(h);
    var log = $('[data-log]'), empty = $('[data-log-empty]');
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var li = b.closest('.fix');
      var what = b.getAttribute('data-act');
      li.classList.add('done');
      $('[data-state]', li).textContent = what;
      var item = li.getAttribute('data-item');
      var entry = document.createElement('li');
      entry.innerHTML = '<span class="num">' + item + '</span>: ' + what;
      log.appendChild(entry); empty.hidden = true;
      toast(item + ': ' + what);
    });
  }
})();
