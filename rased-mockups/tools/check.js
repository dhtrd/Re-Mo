// الفحص الإلزامي: node tools/check.js direction-1 [direction-2 ...] [--json out.json]
// يفحص كل شاشة عند 360/390/834/1194/1440/1920 (فاتح) + 390/1440 (داكن).
const fs = require('fs');
const { pw, SCREENS, urlFor, open } = require('./lib');

const MONEY_ALLOWED = new Set([
  // لوحة الأرصدة
  '145,213.66', '286,869.07', '293,180.00', '138,902.73',
  '16,900.00', '35,300.00', '94,410.00', '-42,210.00',
  '1,500.00', '6,500.00', '30,560.00', '-22,560.00',
  '11,945.00', '25,630.00', '56,780.00', '-19,205.00',
  '0.00', '3,960.00', '-3,960.00',
  '2,700.00', '200.00', '2,900.00',
  '-3,300.00', '5,950.00', '4,350.00', '-1,700.00',
  '1,825.00', '2,500.00', '5,940.00', '-1,615.00',
  '175,183.66', '387,034.07', '513,265.00', '48,952.73',
  // الكشف والفواتير
  '-1,000.00', '1,200.00', '-1,200.00', '1,400.00', '-1,400.00', '1,110.00', '-1,110.00', '825.00', '-1,935.00',
  // التكرار
  '1,700.00'
]);
// القيم الموجبة لأرقام سالبة مسموحة أيضاً (عند عرض القيمة المطلقة مع كلمة «مستحق»)
for (const v of [...MONEY_ALLOWED]) if (v.startsWith('-')) MONEY_ALLOWED.add(v.slice(1));

const REQUIRED = {
  dashboard: ['145,213.66', '286,869.07', '293,180.00', '138,902.73', '-42,210.00', '-22,560.00', '-19,205.00', '-3,960.00', '2,900.00', '-1,700.00', '-1,615.00', '175,183.66', '387,034.07', '513,265.00', '48,952.73', '2026-07-01', '2026-09-30', 'منجرة العهد', 'منجرة صالحة القارحي'],
  statement: ['مؤسسة عبدالرحمن الثقفي', '-1,000.00', 'P10590', 'MISC/2025/10/0791', 'P11405', 'MISC/2025/11/0734', 'P12291', 'P12786', '-1,935.00', '-1,110.00', 'Excel', 'PDF'],
  invoices: ['P10590', 'P11405', 'P12291', 'P12786', '1,468', 'مثال', 'لم تدخل', 'دخلت', 'تحديد كـدخلت'],
  'add-entry': ['MISC/2026/08/0395', 'مفروشات الجيزاني', '148', '1,700.00', 'أؤكد أنها حركة مختلفة'],
  review: ['33', '19', 'B340', '2014-08-01', '2026-08-14', 'B147', '2026-10-08', '2026-08-10', 'MISC/2026/08/0395', '148']
};
const WIDTHS = [360, 390, 834, 1194, 1440, 1920];

async function checkPage(page, w, screen) {
  return page.evaluate(({ w, screen, REQUIRED, ALLOWED }) => {
    const issues = [];
    const de = document.documentElement;
    if (de.scrollWidth > de.clientWidth + 1) {
      // أي العناصر تتجاوز؟
      const offenders = [...document.querySelectorAll('body *')].filter(el => {
        const r = el.getBoundingClientRect();
        return r.width && (r.right > de.clientWidth + 1 || r.left < -1) && getComputedStyle(el).position !== 'fixed';
      }).slice(0, 4).map(el => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''));
      issues.push(`تمرير أفقي: scrollWidth ${de.scrollWidth} > ${de.clientWidth} [${offenders.join(', ')}]`);
    }
    if (de.getAttribute('dir') !== 'rtl' || de.getAttribute('lang') !== 'ar') issues.push('html يفتقد dir=rtl أو lang=ar');
    if (getComputedStyle(document.body).direction !== 'rtl') issues.push('اتجاه body ليس rtl');

    // الخطوط
    const failed = [...document.fonts].filter(f => f.status === 'error').map(f => f.family);
    if (failed.length) issues.push('خطوط فشل تحميلها: ' + [...new Set(failed)].join(', '));
    const loaded = new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/["']/g, '')));
    const firstFam = el => getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '').trim();
    const sample = [document.body, ...document.querySelectorAll('h1,h2,td,button,.num,.money')].slice(0, 60);
    const fams = new Set(sample.map(firstFam));
    for (const f of fams) {
      if (/^(Inter|Roboto|Arial|system-ui|sans-serif|serif|-apple-system|Helvetica)$/i.test(f)) issues.push('خط ممنوع/افتراضي ظاهر: ' + f);
      else if (!loaded.has(f)) issues.push('خط غير محمّل فعلياً: ' + f);
    }

    // رمز الريال
    if (!document.getElementById('sar')) issues.push('رمز الريال #sar غير موجود');
    if (!document.querySelector('use[href="#sar"]')) issues.push('لا يوجد استخدام لرمز الريال');
    const text = document.body.innerText + ' ' + document.body.textContent;
    if (/ر\.س|﷼|SAR\b/.test(document.body.textContent)) issues.push('يحتوي «ر.س» أو ﷼ أو SAR');

    // الأرقام: المطلوب موجود، ولا مبالغ مخترعة
    for (const r of REQUIRED[screen] || []) if (!document.body.textContent.includes(r)) issues.push('نص/رقم مطلوب مفقود: ' + r);
    const money = document.body.textContent.match(/-?\d{1,3}(?:,\d{3})*\.\d{2}/g) || [];
    const bad = [...new Set(money.filter(m => !ALLOWED.includes(m)))];
    if (bad.length) issues.push('مبالغ غير موجودة في البيانات: ' + bad.join(' '));

    // أهداف اللمس على الجوال
    if (w <= 600) {
      const sel = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [tabindex="0"]';
      const small = [];
      for (const el of document.querySelectorAll(sel)) {
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || el.closest('[hidden],[aria-hidden="true"],[inert]')) continue;
        let r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        if ((el.type === 'checkbox' || el.type === 'radio') || cs.opacity === '0') {
          const lab = el.closest('label') || (el.id && document.querySelector(`label[for="${el.id}"]`));
          if (lab) r = lab.getBoundingClientRect();
        }
        // هدف مخفي خارج الشاشة (رابط تخطٍّ) يُتجاهل
        if (r.bottom < 0 || r.right < 0 || r.left > de.clientWidth) continue;
        if (r.width < 43.5 || r.height < 43.5) small.push(`${el.tagName.toLowerCase()}「${(el.getAttribute('aria-label') || el.textContent || el.name || '').trim().slice(0, 18)}」${Math.round(r.width)}×${Math.round(r.height)}`);
      }
      if (small.length) issues.push(`أهداف لمس < 44px (${small.length}): ` + small.slice(0, 6).join('، '));
    }

    // نص مقصوص: عنصر نصي بلا عناصر أبناء، overflow مخفي، ومحتواه أعرض/أطول من صندوقه
    const clipped = [];
    for (const el of document.querySelectorAll('body *')) {
      if (el.children.length || !el.textContent.trim()) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      if (el.closest('.sr-only,.visually-hidden,[class*="sr-only"]')) continue;
      const hidden = /hidden|clip/.test(cs.overflowX + cs.overflowY);
      if (hidden && cs.textOverflow !== 'ellipsis' && (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 3) && el.clientWidth > 2)
        clipped.push(el.textContent.trim().slice(0, 20));
    }
    if (clipped.length) issues.push('نص مقصوص محتمل: ' + clipped.slice(0, 5).join('، '));

    // تداخل نصوص: أوراق نصية متجاورة تتقاطع صناديقها (عينة)
    const inFixed = el => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const ps = getComputedStyle(p).position; if (ps === 'fixed' || ps === 'sticky') return true; } return false; };
    const leaves = [...document.querySelectorAll('h1,h2,h3,p,td,th,label,button,a,.num,.money,dt,dd,li')]
      .filter(el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.position !== 'fixed' && cs.position !== 'absolute' && !inFixed(el) && !el.closest('[hidden],dialog:not([open])') && !(el.closest('details:not([open])') && !el.closest('summary')); });
    let overlaps = [];
    for (let i = 0; i < leaves.length && overlaps.length < 5; i++) {
      const a = leaves[i], ra = a.getBoundingClientRect();
      for (let j = i + 1; j < leaves.length; j++) {
        const b = leaves[j];
        if (a.contains(b) || b.contains(a)) continue;
        const rb = b.getBoundingClientRect();
        const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        const iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (ix > 4 && iy > 4) { overlaps.push(`${a.textContent.trim().slice(0, 12)} ⟂ ${b.textContent.trim().slice(0, 12)}`); break; }
      }
    }
    if (overlaps.length) issues.push('تداخل محتمل: ' + overlaps.join('، '));
    return issues;
  }, { w, screen, REQUIRED, ALLOWED: [...MONEY_ALLOWED] });
}

(async () => {
  const args = process.argv.slice(2);
  const jsonIdx = args.indexOf('--json');
  const jsonOut = jsonIdx >= 0 ? args.splice(jsonIdx, 2)[1] : null;
  const browser = await pw.chromium.launch();
  const results = [];
  let total = 0, failed = 0;
  for (const dir of args) {
    for (const screen of SCREENS) {
      const runs = WIDTHS.map(w => [w, 'light']).concat([[390, 'dark'], [1440, 'dark']]);
      for (const [w, theme] of runs) {
        total++;
        const { page, errors } = await open(browser, urlFor(dir, screen, theme), w);
        let issues = await checkPage(page, w, screen).catch(e => ['فشل الفحص: ' + e.message]);
        if (errors.length) issues.push('أخطاء JS: ' + errors.slice(0, 3).join(' | '));
        if (theme === 'dark') {
          const t = await page.evaluate(() => document.documentElement.dataset.theme);
          if (t !== 'dark') issues.push('الوضع الداكن لم يُفعّل');
        }
        await page.close();
        if (issues.length) failed++;
        results.push({ dir, screen, w, theme, issues });
        console.log(`${issues.length ? '✗' : '✓'} ${dir}/${screen} @${w} ${theme}${issues.length ? '\n    - ' + issues.join('\n    - ') : ''}`);
      }
    }
  }
  await browser.close();
  console.log(`\nالمجموع: ${total} فحص، ناجح ${total - failed}، فيه ملاحظات ${failed}`);
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(results, null, 1));
  process.exitCode = failed ? 1 : 0;
})();
