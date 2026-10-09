/* رصيد — الاتجاه 7 «الميزان»: رسوم يدوية محسوبة من البيانات المعروضة في الصفحة نفسها.
   لا أرقام هنا: كل شريط يقرأ قيمه من data-* أو من نص الخلية. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var mqMobile = matchMedia('(max-width: 600px)');
  var mqLand = matchMedia('(min-width: 1025px) and (max-width: 1279px)');
  var root = document.documentElement;

  function el(tag, cls, style) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (style) Object.keys(style).forEach(function (k) { e.style[k] = style[k]; });
    return e;
  }
  var toastTimer;
  function toast(msg) {
    var t = $('.toast'); if (!t) return;
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 2800);
  }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- القائمة الجانبية القابلة للطي (لوحي عمودي) ---------- */
  function syncRail() {
    var collapsed = root.classList.contains('rail-collapsed');
    $$('[data-rail-toggle]').forEach(function (b) {
      b.setAttribute('aria-expanded', String(!collapsed));
      b.setAttribute('aria-label', collapsed ? 'توسيع القائمة الجانبية' : 'طي القائمة الجانبية');
    });
  }
  $$('[data-rail-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      root.classList.toggle('rail-collapsed');
      store('rased7-rail', root.classList.contains('rail-collapsed') ? 'collapsed' : 'open');
      syncRail();
    });
  });
  syncRail();

  /* ---------- شريط الميل: صفر في المنتصف، المدين يميناً والسالب يساراً ---------- */
  function drawTilt(host, fin, open, M) {
    host.innerHTML = '';
    var X = function (v) { return 50 + Math.max(-1, Math.min(1, v / M)) * 50; };
    var clipped = Math.abs(fin) > M || (open != null && Math.abs(open) > M);
    host.appendChild(el('span', 't-zero', { left: '50%' }));
    if (open != null && open !== fin) {
      var a = X(open), b = X(fin);
      host.appendChild(el('span', 't-link', { left: Math.min(a, b) + '%', width: Math.abs(a - b) + '%' }));
    }
    var xf = X(fin);
    var bar = el('span', 't-bar ' + (fin < 0 ? 'neg' : 'pos'), { left: Math.min(50, xf) + '%', width: Math.max(Math.abs(xf - 50), fin === 0 ? 0 : .8) + '%' });
    host.appendChild(bar);
    if (Math.abs(fin) > M) host.appendChild(el('span', 't-brk', { left: (fin > 0 ? 92 : 6) + '%' }));
    if (open != null) host.appendChild(el('span', 't-dot', { left: X(open) + '%' }));
    return clipped;
  }

  /* ---------- الميزان (waterfall أفقي) ---------- */
  function drawBeam(beam) {
    var rows = $$('.beam-row', beam);
    var vals = [0];
    rows.forEach(function (r) { vals.push(+r.dataset.from, +r.dataset.to); });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    var X = function (v) { return (v - lo) / (hi - lo) * 100; };
    rows.forEach(function (r, i) {
      var t = $('.beam-track', r); t.innerHTML = '';
      var a = X(+r.dataset.from), b = X(+r.dataset.to);
      if (lo < 0) t.appendChild(el('span', 'zero', { left: X(0) + '%' }));
      t.appendChild(el('span', 'bar', { left: Math.min(a, b) + '%', width: Math.max(Math.abs(b - a), .6) + '%' }));
      if (i < rows.length - 1 && r.dataset.kind !== 'final') t.appendChild(el('span', 'step', { left: b + '%' }));
    });
  }
  $$('[data-beam]').forEach(drawBeam);

  /* ---------- نقاط الوحدات: كل نقطة سجل واحد ---------- */
  $$('[data-dots]').forEach(function (d) {
    var n = +d.dataset.dots, shown = d.dataset.shown == null ? n : +d.dataset.shown;
    for (var i = 0; i < n; i++) d.appendChild(el('i', i < shown ? 'on' : ''));
  });

  /* ---------- لوحة الأرصدة ---------- */
  var ledger = $('.ledger');
  if (ledger) {
    var rows = $$('.lrow[data-final]', ledger);
    var supRows = rows.filter(function (r) { return !r.classList.contains('is-total'); });
    var absAll = [];
    rows.forEach(function (r) { absAll.push(Math.abs(+r.dataset.final), Math.abs(+r.dataset.open)); });
    var Mfull = Math.max.apply(null, absAll);
    // المقياس المكبّر: أكبر قيمة بعد استبعاد المورد الأكبر والإجمالي
    var biggest = supRows.slice().sort(function (a, b) {
      return Math.max(Math.abs(b.dataset.final), Math.abs(b.dataset.open)) - Math.max(Math.abs(a.dataset.final), Math.abs(a.dataset.open));
    });
    var rest = [];
    biggest.slice(1).forEach(function (r) { rest.push(Math.abs(+r.dataset.final), Math.abs(+r.dataset.open)); });
    var Mzoom = Math.max.apply(null, rest);
    var note = $('[data-scale-note]');
    var baseNote = note ? note.textContent : '';
    function drawAll(M) {
      var clippedNames = [];
      rows.forEach(function (r) {
        if (drawTilt($('.tilt', r), +r.dataset.final, +r.dataset.open, M)) clippedNames.push($('.name-t', r).textContent);
      });
      // ميل الموردين في الشريط الجانبي لصفحات أخرى غير موجود هنا
      if (note) note.textContent = M === Mfull ? baseNote :
        'مقياس مكبّر لرؤية الموردين الأصغر. الأشرطة المقطوعة بعلامة مائلة أطول من المقياس: ' + clippedNames.join('، ') + '.';
    }
    drawAll(Mfull);
    $$('[data-scale]').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('[data-scale]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        drawAll(b.dataset.scale === 'zoom' ? Mzoom : Mfull);
      });
    });

    var detail = $('[data-detail]');
    function select(r) {
      rows.forEach(function (x) { x.classList.toggle('is-sel', x === r); var b = $('.c-more', x); if (b) b.setAttribute('aria-pressed', String(x === r)); });
      if (!detail) return;
      $('[data-d-name]', detail).textContent = $('.name-t', r).textContent;
      $('[data-d-final]', detail).innerHTML = $('.c-final', r).innerHTML;
      var o = +r.dataset.open, d = +r.dataset.debit, c = +r.dataset.credit, f = +r.dataset.final;
      var beam = $('[data-d-beam]', detail);
      var cell = function (sel) { return $(sel + ' .money', r).outerHTML; };
      beam.innerHTML =
        '<div class="beam-row" data-kind="open" data-from="0" data-to="' + o + '"><span class="beam-k">رصيد سابق</span><span class="beam-track"></span>' + cell('.c-open') + '</div>' +
        '<div class="beam-row" data-kind="debit" data-from="' + o + '" data-to="' + (o + d) + '"><span class="beam-k">+ مدين</span><span class="beam-track"></span>' + cell('.c-debit') + '</div>' +
        '<div class="beam-row" data-kind="credit" data-from="' + (o + d) + '" data-to="' + f + '"><span class="beam-k">− دائن</span><span class="beam-track"></span>' + cell('.c-credit') + '</div>' +
        '<div class="beam-row" data-kind="final" data-from="0" data-to="' + f + '"><span class="beam-k">= نهائي</span><span class="beam-track"></span>' + cell('.c-final') + '</div>';
      drawBeam(beam);
    }
    rows.forEach(function (r) {
      var b = $('.c-more', r);
      b.addEventListener('click', function () {
        if (mqLand.matches) { select(r); return; }
        var open = !r.classList.contains('open');
        r.classList.toggle('open', open);
        b.setAttribute('aria-expanded', String(open));
      });
    });
    select(rows[rows.length - 1]);
  }

  /* ميل مصغّر في شريط الموردين الجانبي */
  var minis = $$('.tilt.mini');
  if (minis.length) {
    var Mm = Math.max.apply(null, minis.map(function (t) { return Math.abs(+t.dataset.v); }));
    minis.forEach(function (t) { drawTilt(t, +t.dataset.v, null, Mm); });
  }

  /* ---------- كشف الحساب: منحنى الرصيد التراكمي عمودياً ---------- */
  var tl = $('.tl');
  if (tl) {
    var trs = $$('.trow[data-bal], .trow[data-gap]', tl);
    var vals = trs.filter(function (r) { return r.dataset.bal != null; }).map(function (r) { return +r.dataset.bal; });
    var lo = Math.min.apply(null, vals.concat(0)), hi = Math.max.apply(null, vals.concat(0));
    var X = function (v) { return 10 + (v - lo) / ((hi - lo) || 1) * 80; };
    var NS = 'http://www.w3.org/2000/svg';
    function svgEl(tag, attrs) { var e = document.createElementNS(NS, tag); Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); }); return e; }
    var x0 = X(0);
    trs.forEach(function (r, i) {
      var svg = $('svg.curve', r); if (!svg) return;
      var prev = trs[i - 1], next = trs[i + 1];
      var top, mid, bot, gap = r.dataset.gap != null;
      svg.appendChild(svgEl('line', { x1: x0, y1: 0, x2: x0, y2: 100, class: 'zl' }));
      if (gap) {
        top = X(+prev.dataset.bal); bot = X(+next.dataset.bal);
        svg.appendChild(svgEl('polyline', { points: top + ',0 ' + bot + ',100', class: 'ln dash' }));
        return;
      }
      mid = X(+r.dataset.bal);
      if (!prev) top = x0;
      else if (prev.dataset.gap != null) top = mid;
      else top = (X(+prev.dataset.bal) + mid) / 2;
      if (!next || next.dataset.gap != null) bot = mid;
      else bot = (mid + X(+next.dataset.bal)) / 2;
      svg.appendChild(svgEl('polygon', { points: x0 + ',0 ' + top + ',0 ' + mid + ',50 ' + bot + ',100 ' + x0 + ',100', class: 'area' }));
      svg.appendChild(svgEl('polyline', { points: top + ',0 ' + mid + ',50 ' + bot + ',100', class: 'ln' }));
      var dot = $('.cdot', r);
      if (dot) { dot.style.left = mid + '%'; if (+r.dataset.bal === 0) dot.classList.add('zero'); }
    });
    $$('.trow .c-more', tl).forEach(function (b) {
      b.addEventListener('click', function () {
        var r = b.closest('.trow'); var open = !r.classList.contains('open');
        r.classList.toggle('open', open); b.setAttribute('aria-expanded', String(open));
      });
    });
  }
  $$('[data-export]').forEach(function (b) {
    b.addEventListener('click', function () { toast('تصدير ' + b.dataset.export + ': نموذج للعرض فقط، لا يُنشأ ملف.'); });
  });
  $$('.chips').forEach(function (g) {
    $$('.chip', g).forEach(function (c) {
      c.addEventListener('click', function () { $$('.chip', g).forEach(function (x) { x.setAttribute('aria-pressed', String(x === c)); }); });
    });
  });
  $$('[data-period]').forEach(function (f) {
    f.addEventListener('submit', function (e) { e.preventDefault(); toast('الفترة في هذا النموذج ثابتة على البيانات المعروضة.'); });
  });

  /* ---------- الفواتير ---------- */
  var itable = $('.itable');
  if (itable) {
    var main = $('main.inv');
    var irows = $$('.irow[data-status]', itable);
    var bulk = $('[data-bulkbar]');
    var maxAmt = Math.max.apply(null, irows.map(function (r) { return +r.dataset.amt; }));
    irows.forEach(function (r) { $('.abar span', r).style.width = (+r.dataset.amt / maxAmt * 100) + '%'; });
    var LABEL = { 'in': 'دخلت', out: 'لم تدخل' };
    var filter = 'all';

    function refresh() {
      var nIn = 0, nOut = 0;
      irows.forEach(function (r) {
        if (r.dataset.status === 'in') nIn++; else nOut++;
        $('[data-badge]', r).textContent = LABEL[r.dataset.status];
        r.hidden = !(filter === 'all' || r.dataset.status === filter);
        if (r.hidden) { var cb = $('[data-pick]', r); cb.checked = false; }
        r.classList.toggle('is-sel', $('[data-pick]', r).checked);
      });
      var total = nIn + nOut;
      $('.s-in').style.flexBasis = (nIn / total * 100) + '%';
      $('.s-out').style.flexBasis = (nOut / total * 100) + '%';
      $('.s-in').style.display = nIn ? '' : 'none';
      $('.s-out').style.display = nOut ? '' : 'none';
      $('[data-split-cap]').textContent = 'الفواتير الأربع المعروضة (مثال): ' + nIn + ' دخلت، ' + nOut + ' لم تدخل.';
      var list = $('[data-report]'); list.innerHTML = '';
      irows.filter(function (r) { return r.dataset.status === 'out'; }).forEach(function (r) {
        var li = document.createElement('li');
        li.innerHTML = [$('.c-pref', r).innerHTML, $('.c-date .num', r).outerHTML, $('.c-amt .money', r).outerHTML].join(' ');
        list.appendChild(li);
      });
      $('[data-report-empty]').hidden = nOut > 0;
      var sel = irows.filter(function (r) { return $('[data-pick]', r).checked; }).length;
      $('[data-sel-count]').textContent = sel;
      bulk.hidden = !(sel > 0 || main.classList.contains('selecting'));
      var vis = irows.filter(function (r) { return !r.hidden; });
      var all = $('[data-pick-all]');
      all.checked = vis.length > 0 && vis.every(function (r) { return $('[data-pick]', r).checked; });
    }
    $$('[data-filter]').forEach(function (b) {
      b.addEventListener('click', function () {
        filter = b.dataset.filter;
        $$('[data-filter]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        refresh();
      });
    });
    itable.addEventListener('change', function (e) {
      if (e.target.matches('[data-pick-all]')) irows.forEach(function (r) { if (!r.hidden) $('[data-pick]', r).checked = e.target.checked; });
      refresh();
    });
    function setStatus(r, s) { r.dataset.status = s; r.classList.remove('flash'); void r.offsetWidth; r.classList.add('flash'); }
    $('[data-mark]').addEventListener('click', function () {
      var sel = irows.filter(function (r) { return $('[data-pick]', r).checked; });
      if (!sel.length) { toast('حدد فاتورة واحدة على الأقل.'); return; }
      sel.forEach(function (r) { setStatus(r, 'in'); $('[data-pick]', r).checked = false; });
      main.classList.remove('selecting');
      $('[data-select-mode]').setAttribute('aria-pressed', 'false');
      refresh();
      toast('حُددت ' + sel.length + ' كـدخلت (في هذا النموذج فقط).');
    });
    $('[data-clear]').addEventListener('click', function () {
      irows.forEach(function (r) { $('[data-pick]', r).checked = false; });
      main.classList.remove('selecting');
      $('[data-select-mode]').setAttribute('aria-pressed', 'false');
      refresh();
    });
    $$('[data-flip]').forEach(function (b) {
      b.addEventListener('click', function () {
        var r = b.closest('.irow'); setStatus(r, r.dataset.status === 'in' ? 'out' : 'in'); refresh();
      });
    });
    $('[data-select-mode]').addEventListener('click', function () {
      var on = !main.classList.contains('selecting');
      main.classList.toggle('selecting', on); this.setAttribute('aria-pressed', String(on));
      if (!on) irows.forEach(function (r) { $('[data-pick]', r).checked = false; });
      refresh();
    });
    $$('.irow .c-more').forEach(function (b) {
      b.addEventListener('click', function () {
        var r = b.closest('.irow'); var open = !r.classList.contains('open');
        r.classList.toggle('open', open); b.setAttribute('aria-expanded', String(open));
      });
    });
    // الجوال: ضغط مطوّل 500ms يدخل وضع التحديد، ثم النقر يحدد
    var lpTimer = null, lpFired = false, startXY = null;
    irows.forEach(function (r) {
      r.addEventListener('pointerdown', function (e) {
        if (!mqMobile.matches || e.target.closest('button, a, label')) return;
        lpFired = false; startXY = [e.clientX, e.clientY];
        lpTimer = setTimeout(function () {
          lpFired = true;
          main.classList.add('selecting');
          $('[data-select-mode]').setAttribute('aria-pressed', 'true');
          $('[data-pick]', r).checked = true;
          if (navigator.vibrate) navigator.vibrate(15);
          refresh();
        }, 500);
      });
      r.addEventListener('pointermove', function (e) {
        if (lpTimer && startXY && (Math.abs(e.clientX - startXY[0]) > 10 || Math.abs(e.clientY - startXY[1]) > 10)) { clearTimeout(lpTimer); lpTimer = null; }
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) { r.addEventListener(t, function () { clearTimeout(lpTimer); lpTimer = null; }); });
      r.addEventListener('contextmenu', function (e) { if (mqMobile.matches) e.preventDefault(); });
      r.addEventListener('click', function (e) {
        if (!mqMobile.matches || e.target.closest('button, a, label')) return;
        if (lpFired) { lpFired = false; return; }
        if (main.classList.contains('selecting')) { var cb = $('[data-pick]', r); cb.checked = !cb.checked; refresh(); }
      });
    });
    refresh();
  }

  /* ---------- إضافة حركة ---------- */
  var form = $('#entry');
  if (form) {
    var KNOWN = { 'MISC/2026/08/0395': true }; // التكرار الوحيد المعروف في البيانات
    var gen = $('#gen'), ref = $('#ref'), date = $('#date'), amt = $('#amt');
    var dup = $('[data-dup]'), dupLine = $('[data-dup-line]'), confirmBox = $('#confirm');
    var save = $('#save'), saveNew = $('#save-new');
    var wasDup = false;
    var type = function () { return ($('input[name="type"]:checked') || {}).value; };
    function compute() {
      var r = (ref.value || '').trim();
      var d = (date.value || '').split('-');
      if (!r) return '—';
      if (type() === 'inv') return 'P' + r;
      if (d.length < 2) return 'MISC/السنة/الشهر/' + r;
      return 'MISC/' + d[0] + '/' + d[1] + '/' + r;
    }
    function amount() { var v = parseFloat(String(amt.value).replace(/,/g, '')); return isFinite(v) && v > 0 ? v : 0; }
    function update() {
      var g = compute(); gen.textContent = g;
      var isInv = type() === 'inv';
      $('[data-gen-help]').textContent = isInv ? 'فاتورة: P ثم المرجع. للقراءة فقط.' : 'قيد: MISC/السنة/الشهر/المرجع. للقراءة فقط.';
      var side = $('[data-side]'); side.textContent = isInv ? 'دائن' : 'مدين'; side.classList.toggle('cre', isInv);
      var isDup = !!KNOWN[g];
      $('.f-gen').classList.toggle('is-dup', isDup);
      dup.classList.toggle('on', isDup);
      dupLine.classList.toggle('on', isDup);
      if (!isDup) confirmBox.checked = false;
      var ok = !isDup || confirmBox.checked;
      save.disabled = !ok; saveNew.disabled = !ok;
      if (isDup && !wasDup && mqMobile.matches) root.classList.add('dup-screen');
      if (!isDup) root.classList.remove('dup-screen');
      wasDup = isDup;
      // أثر الحركة
      var a = amount(), max = Math.max(a, 1700);
      var bar = $('[data-effect]');
      bar.className = 'ex-bar ' + (isInv ? 'neg' : 'pos') + (a ? '' : ' hint');
      bar.style.width = (a ? Math.max(a / max * 46, 2) : 18) + '%';
      $('[data-effect-t]').textContent = isInv
        ? 'الفاتورة تُسجَّل دائنة، فيميل الرصيد يساراً: يزيد المستحق للمورد بقيمة المبلغ.'
        : 'القيد يُسجَّل مديناً، فيميل الرصيد يميناً بقيمة المبلغ.';
      $('.dc-bar.old').style.width = (1700 / max * 100) + '%';
      $('[data-cmp-new]').style.width = (a / max * 100) + '%';
      $('[data-cmp-t]').textContent = !a ? 'اكتب المبلغ لمقارنته بالحركة الموجودة.'
        : (a === 1700 ? 'المبلغ نفسه أيضاً: الأرجح أنها الحركة ذاتها.' : 'المبلغ مختلف عن الحركة الموجودة.');
    }
    ['input', 'change'].forEach(function (ev) { form.addEventListener(ev, update); });
    confirmBox.addEventListener('change', update);
    $$('input[name="pick"]').forEach(function (p) {
      p.addEventListener('change', function () { $('#supplier').value = p.value; });
    });
    $('#supplier').addEventListener('change', function () {
      var v = this.value; $$('input[name="pick"]').forEach(function (p) { p.checked = p.value === v; });
    });
    $('[data-dup-back]').addEventListener('click', function () { root.classList.remove('dup-screen'); ref.focus(); ref.select(); });
    $('[data-dup-open]').addEventListener('click', function () { root.classList.add('dup-screen'); window.scrollTo(0, 0); confirmBox.focus(); });
    function trySave(andNew) {
      if (save.disabled) { toast('الحفظ متوقف: الرقم مكرر. أكّد أنها حركة مختلفة أو عدّل المرجع.'); if (mqMobile.matches) root.classList.add('dup-screen'); confirmBox.focus(); return; }
      toast(andNew ? 'حُفظت الحركة. ابدأ الحركة التالية.' : 'حُفظت الحركة (نموذج للعرض فقط).');
      if (andNew) { ref.value = ''; $('#voucher').value = ''; $('#desc').value = ''; amt.value = ''; confirmBox.checked = false; update(); ref.focus(); }
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); trySave(false); });
    saveNew.addEventListener('click', function () { trySave(true); });
    document.addEventListener('keydown', function (e) {
      var mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === 's' || e.key === 'S' || e.code === 'KeyS')) { e.preventDefault(); trySave(false); }
      else if (mod && e.key === 'Enter') { e.preventDefault(); trySave(true); }
      else if (e.altKey && (e.code === 'Digit1' || e.code === 'Digit2')) {
        e.preventDefault();
        var v = e.code === 'Digit1' ? 'inv' : 'misc';
        $('input[name="type"][value="' + v + '"]').checked = true; update();
      } else if (e.key === 'Escape') {
        if (root.classList.contains('dup-screen')) { root.classList.remove('dup-screen'); ref.focus(); }
        else location.href = $('[data-cancel]').getAttribute('href');
      }
    });
    update();
  }

  /* ---------- مركز المراجعة: المسطرة الزمنية ---------- */
  var revMain = $('main.rev');
  if (revMain) {
    var t = function (s) { return Date.parse(s + 'T00:00:00Z'); };
    var Q3 = [t('2026-07-01'), t('2026-09-30')];
    $$('.cmp').forEach(function (c) {
      var cur = t(c.dataset.cur), lik = t(c.dataset.likely);
      var lo = Math.min(cur, lik, Q3[0]), hi = Math.max(cur, lik, Q3[1]);
      var pad = (hi - lo) * .06; lo -= pad; hi += pad;
      // الزمن يجري من اليمين إلى اليسار (اتجاه القراءة)
      var X = function (v) { return 100 - (v - lo) / (hi - lo) * 100; };
      var place = function (node, x) {
        node.style.left = x + '%';
        node.style.transform = x < 14 ? 'none' : (x > 86 ? 'translateX(-100%)' : 'translateX(-50%)');
      };
      var q = $('.r-q3', c); q.style.left = X(Q3[1]) + '%'; q.style.width = (X(Q3[0]) - X(Q3[1])) + '%';
      place($('.r-q3lab', c), (X(Q3[0]) + X(Q3[1])) / 2);
      $('.r-mark.cur', c).style.left = X(cur) + '%';
      $('.r-mark.likely', c).style.left = X(lik) + '%';
      var arc = $('.r-arc', c); arc.style.left = Math.min(X(cur), X(lik)) + '%'; arc.style.width = Math.abs(X(cur) - X(lik)) + '%';
      var lc = $('.r-lab.cur', c), ll = $('.r-lab.likely', c);
      lc.textContent = c.dataset.cur; ll.textContent = c.dataset.likely;
      place(lc, X(cur)); place(ll, X(lik));
    });
    $$('[data-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        var item = b.closest('.cmp, .dupe');
        var st = $('[data-state]', item);
        var approve = b.dataset.act === 'approve';
        st.hidden = false; st.classList.toggle('ign', !approve);
        st.textContent = approve
          ? (item.classList.contains('cmp') ? 'اعتُمد التاريخ المرجّح ' + item.dataset.likely + ' (في هذا النموذج فقط).' : 'اعتُمدت كحركة مختلفة (في هذا النموذج فقط).')
          : 'تم التجاهل، ويبقى السجل كما هو.';
        item.classList.add('done');
      });
    });
    var cats = $$('.cat');
    function activate(id) {
      revMain.dataset.active = id;
      cats.forEach(function (c) { c.classList.toggle('is-on', c.dataset.cat === id); if (c.dataset.cat === id) c.setAttribute('aria-current', 'true'); else c.removeAttribute('aria-current'); });
    }
    cats.forEach(function (c) {
      c.addEventListener('click', function (e) {
        activate(c.dataset.cat);
        if (mqLand.matches) { e.preventDefault(); history.replaceState(null, '', '#' + c.dataset.cat); }
      });
    });
    var h = (location.hash || '').slice(1);
    activate(['dates', 'dupes', 'untyped'].indexOf(h) >= 0 ? h : 'dates');
  }
})();
