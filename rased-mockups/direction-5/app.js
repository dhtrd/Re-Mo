/* رصيد — الاتجاه 5 «اللافتة»: سلوك الواجهة فقط (طي، فلاتر، تحديد، تحذير). لا منطق أعمال. */
(function () {
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var mq = function (q) { return window.matchMedia(q).matches; };
  var MOBILE = '(max-width: 600px)', TAB_L = '(min-width: 1025px) and (max-width: 1279px)';

  function toast(msg) {
    var t = $('.toast'); if (!t) return;
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, 2600);
  }

  /* طي القائمة الجانبية (لوحي عمودي) */
  function setRail(open) {
    root.classList.toggle('rail-off', !open);
    $$('[data-rail-toggle]').forEach(function (b) { b.setAttribute('aria-expanded', String(open)); });
    try { localStorage.setItem('rased5-rail', open ? '1' : '0'); } catch (e) {}
  }
  try { if (localStorage.getItem('rased5-rail') === '0') setRail(false); } catch (e) {}
  $$('[data-rail-toggle]').forEach(function (b) {
    b.addEventListener('click', function () { setRail(root.classList.contains('rail-off')); });
  });

  /* صفوف قابلة للتوسيع: تُبنى من الخلايا الثانوية (c-x / c-x2) */
  $$('table.rt tbody tr').forEach(function (tr, i) {
    var cells = $$('.c-x, .c-x2, .c-sub', tr);
    var btn = $('.more', tr);
    if (!cells.length || !btn) return;
    var x = document.createElement('tr');
    x.className = 'xrow'; x.hidden = true; x.id = 'x' + i + Math.random().toString(36).slice(2, 6);
    var td = document.createElement('td'); td.colSpan = 12;
    var dl = document.createElement('dl');
    cells.forEach(function (c) {
      if (!c.textContent.trim()) return;
      var d = document.createElement('div'); d.className = c.classList.contains('c-x2') ? 'c-x2' : (c.classList.contains('c-sub') ? 'c-sub' : 'c-x');
      var dt = document.createElement('dt'); dt.textContent = c.getAttribute('data-l') || '';
      var dd = document.createElement('dd'); dd.innerHTML = c.innerHTML;
      d.appendChild(dt); d.appendChild(dd); dl.appendChild(d);
    });
    td.appendChild(dl); x.appendChild(td); tr.after(x);
    btn.setAttribute('aria-controls', x.id);
  });

  /* لوحة الأرصدة: في اللوحي الأفقي يختار الصف المورد للوحة التفاصيل */
  var pane = $('.pane');
  function pickSupplier(tr) {
    $$('.sup tbody tr.on').forEach(function (r) { r.classList.remove('on'); });
    tr.classList.add('on');
    var cells = tr.children;
    $('#pane-name').textContent = $('.nm', tr).textContent;
    ['1', '2', '3', '4'].forEach(function (k) { var el = $('[data-f="' + k + '"]', pane); if (el) el.innerHTML = cells[+k].innerHTML; });
    var v = $('.money span', cells[4]).textContent;
    $('[data-f="w"]', pane).textContent = v.charAt(0) === '-' ? 'مستحق للمورد' : (v === '0.00' ? 'لا رصيد' : 'رصيد مدين لصالحنا');
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.more'); if (!btn) return;
    var tr = btn.closest('tr');
    if (pane && mq(TAB_L) && tr.closest('.sup')) { pickSupplier(tr); return; }
    var x = document.getElementById(btn.getAttribute('aria-controls'));
    if (!x) return;
    var open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(open)); x.hidden = !open;
  });

  /* الفترات السريعة: بيانات الربع الثالث فقط معروفة */
  $$('[data-period]').forEach(function (f) {
    var status = $('.status', f);
    $$('[data-q]', f).forEach(function (c) {
      c.addEventListener('click', function () {
        $$('[data-q]', f).forEach(function (o) { o.setAttribute('aria-pressed', String(o === c)); });
        status.textContent = c.dataset.q === 'q3' ? '' : 'أرقام هذه الفترة غير متوفرة في النموذج؛ المعروض هو الربع الثالث.';
      });
    });
    f.addEventListener('submit', function (e) { e.preventDefault(); status.textContent = 'نموذج عرض: الفترة المعروضة لا تتغير.'; });
  });

  /* كشف الحساب: فلتر نوع الحركة */
  $$('[data-typefilter] [data-t]').forEach(function (c, _, all) {
    c.addEventListener('click', function () {
      all.forEach(function (o) { o.setAttribute('aria-pressed', String(o === c)); });
      $$('.stm tbody tr[data-type]').forEach(function (tr) {
        var show = c.dataset.t === 'all' || tr.dataset.type === c.dataset.t;
        tr.hidden = !show;
        var x = tr.nextElementSibling;
        if (x && x.classList.contains('xrow') && !show) { x.hidden = true; var b = $('.more', tr); if (b) b.setAttribute('aria-expanded', 'false'); }
      });
    });
  });
  $$('[data-export]').forEach(function (b) {
    b.addEventListener('click', function () { toast('نموذج عرض: التصدير إلى ' + b.dataset.export + ' غير مفعّل.'); });
  });

  /* الفواتير: فلتر، تحديد جماعي، ضغط مطوّل، تحديد كـدخلت */
  var invT = $('table.inv');
  if (invT) {
    var rows = $$('tbody tr[data-st]', invT);
    var filter = 'all';
    var badge = function (s) { return s === 'in' ? '<span class="st st-in">دخلت</span>' : '<span class="st st-out">لم تدخل</span>'; };
    var visible = function () { return rows.filter(function (r) { return !r.hidden; }); };
    var selected = function () { return rows.filter(function (r) { return $('.rowck', r).checked && !r.hidden; }); };

    function sync() {
      var n = selected().length;
      $$('[data-mark]').forEach(function (b) { b.disabled = n === 0; });
      var s1 = $('[data-selcount]'); if (s1) s1.textContent = n ? 'محدد: ' + n : 'لم تحدد شيئاً';
      var s2 = $('[data-selcount2]'); if (s2) s2.innerHTML = 'محدد: <span class="num">' + n + '</span>';
      rows.forEach(function (r) { r.classList.toggle('sel', $('.rowck', r).checked); });
      var vis = visible(); var all = $('[data-all]');
      if (all) { all.checked = vis.length > 0 && vis.every(function (r) { return $('.rowck', r).checked; }); all.indeterminate = !all.checked && n > 0; }
      var rep = $('[data-report]');
      if (rep) rep.innerHTML = rows.filter(function (r) { return r.dataset.st === 'out'; }).map(function (r) {
        return '<li><span class="num">' + r.dataset.id + '</span><span class="ex">مثال</span></li>';
      }).join('') || '<li>لا توجد أمثلة «لم تدخل» الآن.</li>';
    }
    function applyFilter() {
      rows.forEach(function (r) {
        r.hidden = !(filter === 'all' || r.dataset.st === filter);
        var x = r.nextElementSibling;
        if (x && x.classList.contains('xrow') && r.hidden) x.hidden = true;
      });
      sync();
    }
    $$('[data-stfilter] [data-f]').forEach(function (c, _, all) {
      c.addEventListener('click', function () {
        all.forEach(function (o) { o.setAttribute('aria-pressed', String(o === c)); });
        filter = c.dataset.f; applyFilter();
      });
    });
    invT.addEventListener('change', function (e) {
      if (e.target.matches('[data-all]')) visible().forEach(function (r) { $('.rowck', r).checked = e.target.checked; });
      sync();
    });
    $$('[data-mark]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (root.dataset.role === 'entry') return;
        var sel = selected();
        sel.forEach(function (r) {
          r.dataset.st = 'in';
          $('.c-st', r).innerHTML = badge('in') + '<span class="ex">مثال</span>';
          $('.rowck', r).checked = false;
        });
        toast('حُددت ' + sel.length + ' فاتورة كـدخلت (في هذا النموذج فقط).');
        endSel(); applyFilter();
      });
    });

    /* الجوال: ضغط مطوّل 500ms يدخل وضع التحديد */
    var lp = $('.lp-hint'); if (lp) lp.hidden = false;
    var timer = null, fired = false, sx = 0, sy = 0;
    function endSel() { root.classList.remove('selecting'); rows.forEach(function (r) { $('.rowck', r).checked = false; }); sync(); }
    $$('[data-endsel]').forEach(function (b) { b.addEventListener('click', endSel); });
    rows.forEach(function (r) {
      r.addEventListener('pointerdown', function (e) {
        if (!mq(MOBILE) || root.dataset.role === 'entry') return;
        fired = false; sx = e.clientX; sy = e.clientY;
        timer = setTimeout(function () {
          fired = true; root.classList.add('selecting');
          $('.rowck', r).checked = true; sync();
          if (navigator.vibrate) try { navigator.vibrate(20); } catch (err) {}
        }, 500);
      });
      r.addEventListener('pointermove', function (e) { if (timer && (Math.abs(e.clientX - sx) > 8 || Math.abs(e.clientY - sy) > 8)) { clearTimeout(timer); timer = null; } });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { r.addEventListener(ev, function () { clearTimeout(timer); timer = null; }); });
      r.addEventListener('contextmenu', function (e) { if (mq(MOBILE)) e.preventDefault(); });
      r.addEventListener('click', function (e) {
        if (!mq(MOBILE) || !root.classList.contains('selecting')) return;
        if (fired) { fired = false; return; }
        if (e.target.closest('input,label')) return;
        var ck = $('.rowck', r); ck.checked = !ck.checked; sync();
      });
    });
    document.addEventListener('rased:role', function () { if (root.dataset.role === 'entry') endSel(); });
    sync();
  }

  /* إضافة حركة: توليد الرقم المرجعي + التحذير الصارم + الاختصارات */
  var form = $('#entry');
  if (form) {
    var dup = $('#dup'), ok = $('#dupok'), save = $('#save'), saveNew = $('#savenew'), goon = $('[data-goon]');
    var KNOWN_DUP = 'MISC/2026/08/0395';
    var isDup = false;
    function gen() {
      var type = (form.querySelector('[name=type]:checked') || {}).value;
      var ref = $('#f-ref').value.trim(), date = $('#f-date').value.trim();
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
      var out = '';
      if (type === 'inv') out = ref ? 'P' + ref : '';
      else if (m && ref) out = 'MISC/' + m[1] + '/' + m[2] + '/' + ref;
      $('#genref').textContent = out || 'يكتمل بعد إدخال التاريخ والمرجع';
      $('#amtside').textContent = type === 'inv' ? 'دائن' : 'مدين';
      var was = isDup; isDup = out === KNOWN_DUP;
      $('.refout').classList.toggle('ok', !isDup);
      $('#gentag').textContent = isDup ? 'مكرر' : (out ? 'غير مكرر' : '');
      dup.hidden = !isDup;
      if (!isDup) { dup.classList.remove('sheet'); root.classList.remove('sheet-open'); ok.checked = false; }
      else if (!was) { ok.checked = false; if (mq(MOBILE)) openSheet(); }
      syncSave();
    }
    function syncSave() {
      var allowed = !isDup || ok.checked;
      save.disabled = !allowed; saveNew.disabled = !allowed; goon.disabled = !ok.checked;
    }
    function openSheet() { dup.classList.add('sheet'); root.classList.add('sheet-open'); var b = $('[data-back]', dup); if (b) setTimeout(function () { b.focus(); }, 0); }
    function closeSheet(focusRef) { dup.classList.remove('sheet'); root.classList.remove('sheet-open'); if (focusRef) $('#f-ref').focus(); }
    if (!mq(MOBILE)) dup.classList.remove('sheet'); else root.classList.add('sheet-open');
    window.addEventListener('resize', function () { if (!mq(MOBILE) && dup.classList.contains('sheet')) closeSheet(false); });
    $('[data-back]', dup).addEventListener('click', function () { closeSheet(true); });
    goon.addEventListener('click', function () { closeSheet(false); save.focus(); });
    ok.addEventListener('change', syncSave);
    form.addEventListener('input', gen);
    form.addEventListener('change', gen);
    function doSave(again) {
      if (save.disabled) { closeSheet(false); dup.classList.remove('flash'); void dup.offsetWidth; dup.classList.add('flash'); ok.focus(); toast('الحفظ معطّل: أكّد أنها حركة مختلفة أو غيّر المرجع.'); return; }
      toast(again ? 'حُفظت الحركة (نموذج). النموذج جاهز لحركة أخرى.' : 'حُفظت الحركة (نموذج عرض، لا يُرسل شيء).');
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); doSave(false); });
    saveNew.addEventListener('click', function () { doSave(true); });
    $$('[data-pick]').forEach(function (b, _, all) {
      b.addEventListener('click', function () {
        all.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        $('#f-sup').value = b.dataset.pick;
      });
    });
    $('#f-sup').addEventListener('change', function () {
      $$('[data-pick]').forEach(function (o) { o.setAttribute('aria-pressed', String(o.dataset.pick === $('#f-sup').value)); });
    });
    document.addEventListener('keydown', function (e) {
      var k = e.key;
      if ((e.ctrlKey || e.metaKey) && (k === 's' || k === 'S')) { e.preventDefault(); doSave(false); }
      else if ((e.ctrlKey || e.metaKey) && k === 'Enter') { e.preventDefault(); doSave(true); }
      else if (e.altKey && (k === '1' || e.code === 'Digit1')) { e.preventDefault(); form.querySelector('[value=inv]').checked = true; gen(); }
      else if (e.altKey && (k === '2' || e.code === 'Digit2')) { e.preventDefault(); form.querySelector('[value=misc]').checked = true; gen(); }
      else if (k === 'Escape') {
        if (dup.classList.contains('sheet')) closeSheet(true);
        else location.href = 'dashboard.html';
      }
    });
    gen();
  }

  /* المراجعة: أقسام كتبويبات في اللوحي الأفقي + إجراءات */
  var revx = $('.revx');
  if (revx) {
    var links = $$('.rindex a');
    function setCat(c) { revx.dataset.cat = c; links.forEach(function (a) { a.setAttribute('aria-current', String(a.dataset.cat === c)); }); }
    links.forEach(function (a) {
      a.addEventListener('click', function (e) {
        setCat(a.dataset.cat);
        if (mq(TAB_L)) { e.preventDefault(); history.replaceState(null, '', '#' + a.dataset.cat); }
      });
    });
    var h = location.hash.slice(1); if (['dates', 'dups', 'untyped'].indexOf(h) >= 0) setCat(h);
    revx.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b || root.dataset.role === 'entry') return;
      var cell = b.closest('td');
      var done = b.dataset.act === 'تجاهل' ? 'تُجوهل' : (b.dataset.act === 'اعتماد المرجّح' ? 'اعتُمد المرجّح' : 'أُكّد أنها مختلفة');
      cell.innerHTML = '<span class="done" role="status">' + done + '</span>';
    });
  }
})();
