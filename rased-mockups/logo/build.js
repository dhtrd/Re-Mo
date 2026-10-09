// يبني logo/palettes.html وملفات SVG الأربعة والعشرين من مصدر واحد.
const fs = require('fs');
const path = require('path');
const C = require('./color');
const W = require('./word.json');

const ROOT = '/home/user/Re-Mo/rased-mockups/logo';
fs.mkdirSync(path.join(ROOT, 'svg'), { recursive: true });

// اللوحات كما في DESIGN-PLAN.md القسم 2 حرفياً
const P = [
  { name: 'نخلة وتمر', ink: '#1E4634', acc: '#C9822B', why: 'أخضر النخيل مع لون التمر: محلي، مالي، هادئ.' },
  { name: 'بحر جدة', ink: '#0D3B52', acc: '#E8655A', why: 'أزرق البحر الأحمر العميق مع مرجانه: هوية جدة مباشرة.' },
  { name: 'زعفران وباذنجاني', ink: '#3B1E3F', acc: '#E5A33A', why: 'فخامة ليلية دافئة تميّز التطبيق عن البنوك.' },
  { name: 'روشن', ink: '#4A2F22', acc: '#2C9C8C', why: 'خشب الرواشين الحجازية مع فيروزي: صلة بتجارة الأثاث.' },
  { name: 'حجر وكركم', ink: '#33363A', acc: '#D9B526', why: 'رمادي جرانيتي محايد مع أصفر كركم عالي الوضوح.' },
  { name: 'زيتون وسماء', ink: '#3C4A22', acc: '#4E9CC4', why: 'طبيعي ومتوازن، أخضر داكن لا يشبه الأسود+الأخضر الفاقع.' },
  { name: 'خزامى ونحاس', ink: '#2E2A5A', acc: '#C77D4E', why: 'نيلي بنفسجي مع نحاسي: رسمي دون أزرق كهربائي.' },
  { name: 'ورد طائفي', ink: '#5A1E3A', acc: '#E7A1B0', why: 'عنابي مع وردي الطائف: جريء ومختلف جذرياً.' }
];

const WHITE = '#FFFFFF';
const report = [];
for (const [i, p] of P.entries()) {
  p.n = i + 1;
  const [h, s] = C.rgb2hsl(C.hex2rgb(p.ink));
  // خلفيتا العرض: مشتقتان من صبغة الحبر بتشبّع منخفض
  p.lbg = C.hsl(h, Math.min(s, .22), .965);
  p.dbg = C.hsl(h, Math.min(s * .7, .35), .085);
  // الحبر على الداكن: درجة فاتحة من صبغة الحبر نفسها
  p.dink = C.hsl(h, Math.min(s, .30), .88);
  // الأكسنت على الداكن: يبقى كما هو إن حقق 4.5:1 على الخلفية الداكنة (كلها تحققه)، وإلا يُفتَّح
  p.dacc = C.contrast(p.acc, p.dbg) >= 4.5 ? p.acc : C.fit(p.acc, p.dbg, 4.5, +1);

  // عينة الواجهة — فاتح (السطح = الخلفية الفاتحة)
  const L = {};
  L.bg = p.lbg; L.text = C.fit(p.ink, p.lbg, 7, -1);
  L.btnBg = p.ink; L.btnText = WHITE;
  L.okBg = C.mix(p.lbg, p.ink, .12); L.okText = p.ink;
  L.pendBg = C.mix(p.lbg, p.acc, .24); L.pendText = C.fit(p.acc, L.pendBg, 4.6, -1);
  L.neg = C.fit(p.acc, p.lbg, 4.6, -1);
  L.muted = C.fit(C.mix(p.ink, p.lbg, .45), p.lbg, 4.6, -1);
  L.line = C.mix(p.lbg, p.ink, .14);
  // عينة الواجهة — داكن
  const D = {};
  D.bg = p.dbg; D.text = p.dink;
  D.btnBg = p.dink; D.btnText = p.dbg;
  D.okBg = C.mix(p.dbg, p.dink, .16); D.okText = p.dink;
  D.pendBg = C.mix(p.dbg, p.dacc, .24); D.pendText = C.fit(p.dacc, D.pendBg, 4.6, +1);
  D.neg = C.fit(p.dacc, p.dbg, 4.6, +1);
  D.muted = C.fit(C.mix(p.dink, p.dbg, .4), p.dbg, 4.6, +1);
  D.line = C.mix(p.dbg, p.dink, .16);
  p.L = L; p.D = D;

  const cr = (a, b) => +C.contrast(a, b).toFixed(2);
  p.checks = {
    light: { 'الزر': cr(L.btnText, L.btnBg), 'دخلت': cr(L.okText, L.okBg), 'لم تدخل': cr(L.pendText, L.pendBg), 'المبلغ': cr(L.neg, L.bg), 'نص ثانوي': cr(L.muted, L.bg) },
    dark: { 'الزر': cr(D.btnText, D.btnBg), 'دخلت': cr(D.okText, D.okBg), 'لم تدخل': cr(D.pendText, D.pendBg), 'المبلغ': cr(D.neg, D.bg), 'نص ثانوي': cr(D.muted, D.bg) }
  };
  p.markC = { inkL: cr(p.ink, p.lbg), accL: cr(p.acc, p.lbg), inkD: cr(p.dink, p.dbg), accD: cr(p.dacc, p.dbg), accIcon: cr(p.dacc, p.ink), inkIcon: cr(p.dink, p.ink) };
  for (const [mode, o] of Object.entries(p.checks)) for (const [k, v] of Object.entries(o)) if (v < 4.5) throw new Error(`تباين ضعيف ${p.n} ${mode} ${k} ${v}`);
  report.push({ n: p.n, name: p.name, lbg: p.lbg, dbg: p.dbg, dink: p.dink, dacc: p.dacc, ...p.checks, mark: p.markC, L, D });
}
fs.writeFileSync(path.join(__dirname, 'report.json'), JSON.stringify(report, null, 1));

// ---------- الهندسة ----------
const S = 0.085;                       // مقياس الكلمة (وحدة الخط → وحدة العلامة)
const BASE = 82;                       // خط أساس الكلمة
const GAP = 14;                        // الفراغ بين الكلمة والعلامة
const wordInk = (W.bounds[2] - W.bounds[0]) * S;   // عرض حبر الكلمة
const wx = -W.bounds[0] * S;                       // إزاحة المسار
const textX = wordInk + (W.adv - W.bounds[2]) * S; // نقطة بداية النص RTL
const dx = wordInk + GAP - 14;                     // إزاحة العلامة
const VB = `-2 34 ${(106 + dx + 4).toFixed(2)} 72`;
const VBW = 106 + dx + 4, VBH = 72;
const f = n => +n.toFixed(2);

const fa = c => c.startsWith('var') ? `style="fill:${c}"` : `fill="${c}"`;
const bars = (ink, acc) =>
  `<rect x="${f(30 + dx)}" y="36" width="76" height="16" rx="8" ${fa(ink)}/><rect x="${f(14 + dx)}" y="68" width="76" height="16" rx="8" ${fa(acc)}/>`;

// قفل الشعار: علامة + كلمة. live=true: نص حي بخط Readex Pro؛ false: مسار مُحوَّل (للملفات المستقلة)
function lockup(ink, acc, { live = true, cls = 'lockup', label = 'رصيد' } = {}) {
  const word = live
    ? `<text x="${f(textX)}" y="${BASE}" font-size="85" font-family="'Readex Pro'" font-weight="600" direction="rtl" text-anchor="start" ${fa(ink)}>رصيد</text>`
    : `<path transform="translate(${f(wx)} ${BASE}) scale(${S})" fill="${ink}" d="${W.d}"/>`;
  return `<svg class="${cls}" viewBox="${VB}" role="img" aria-label="${label}">${word}${bars(ink, acc)}</svg>`;
}

// أيقونة التطبيق: العلامة وحدها على خلفية الحبر، بزوايا iOS (22.37% من الضلع)
// الأحجام الصغيرة (64 و32): شريطان أسمك (20 بدل 16) ومقياس أكبر كي تبقى مقروءة
function icon(p, size, { file = false } = {}) {
  const small = size <= 64;
  const r = f(120 * 0.2237);
  const k = small ? 0.86 : 0.72;
  const t = `translate(60 60) scale(${k}) translate(-60 -60)`;
  const m = small
    ? `<rect x="30" y="32" width="76" height="20" rx="10" fill="${p.dink}"/><rect x="14" y="68" width="76" height="20" rx="10" fill="${p.dacc}"/>`
    : `<rect x="30" y="36" width="76" height="16" rx="8" fill="${p.dink}"/><rect x="14" y="68" width="76" height="16" rx="8" fill="${p.dacc}"/>`;
  const head = file
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="512" height="512"><title>رصيد — أيقونة اللوحة ${p.n}</title>`
    : `<svg class="appicon" viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="أيقونة رصيد ${size}×${size}">`;
  return `${head}<rect width="120" height="120" rx="${r}" fill="${p.ink}"/><g transform="${t}">${m}</g></svg>`;
}

// ---------- ملفات SVG المستقلة ----------
for (const p of P) {
  const file = (ink, acc, title) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}" width="${f(VBW * 2)}" height="${VBH * 2}"><title>${title}</title><path transform="translate(${f(wx)} ${BASE}) scale(${S})" fill="${ink}" d="${W.d}"/>${bars(ink, acc)}</svg>\n`;
  fs.writeFileSync(path.join(ROOT, 'svg', `palette-${p.n}-light.svg`), file(p.ink, p.acc, `رصيد — اللوحة ${p.n} (${p.name}) للخلفيات الفاتحة`));
  fs.writeFileSync(path.join(ROOT, 'svg', `palette-${p.n}-dark.svg`), file(p.dink, p.dacc, `رصيد — اللوحة ${p.n} (${p.name}) للخلفيات الداكنة`));
  fs.writeFileSync(path.join(ROOT, 'svg', `palette-${p.n}-icon.svg`), icon(p, 512, { file: true }) + '\n');
}

// ---------- الصفحة ----------
const hex = v => `<span class="num">${v}</span>`;
const sw = (label, v, note = '') =>
  `<div class="sw"><span class="chip" style="background:${v}"></span><dt>${label}${note ? ` <small>${note}</small>` : ''}</dt><dd>${hex(v)}</dd></div>`;
const money = `<span class="money"><svg class="sar" role="img" aria-label="ريال سعودي"><use href="#sar"/></svg><span>-42,210.00</span></span>`;

function uiSample(p, mode) {
  const T = mode === 'light' ? p.L : p.D;
  const ck = p.checks[mode];
  const st = `--u-bg:${T.bg};--u-text:${T.text};--u-btn:${T.btnBg};--u-btn-t:${T.btnText};--u-ok:${T.okBg};--u-ok-t:${T.okText};--u-pd:${T.pendBg};--u-pd-t:${T.pendText};--u-neg:${T.neg};--u-mut:${T.muted};--u-line:${T.line}`;
  const ratios = Object.entries(ck).map(([k, v]) => `<li><span>${k}</span> <span class="num">${v.toFixed(2)}:1</span></li>`).join('');
  return `<div class="ui" style="${st}">
  <p class="ui-mode">${mode === 'light' ? 'على الفاتح' : 'على الداكن'}</p>
  <div class="ui-row"><span class="ui-name">بدر زين للأثاث</span><span class="ui-neg">${money}</span></div>
  <p class="ui-note">مستحق للمورد في نهاية الربع الثالث 2026</p>
  <div class="ui-row ui-badges"><span class="badge ok"><i aria-hidden="true"></i>دخلت</span><span class="badge pend"><i aria-hidden="true"></i>لم تدخل</span></div>
  <button type="button" class="ui-btn">إضافة حركة</button>
  <ul class="ratios" aria-label="نسب التباين">${ratios}</ul>
</div>`;
}

function section(p) {
  const vars = [
    `--ink:${p.ink}`, `--acc:${p.acc}`, `--lbg:${p.lbg}`, `--dbg:${p.dbg}`, `--dink:${p.dink}`, `--dacc:${p.dacc}`,
    `--l-text:${p.L.text}`, `--l-mut:${p.L.muted}`, `--l-line:${p.L.line}`, `--l-btn:${p.L.btnBg}`, `--l-btn-t:${p.L.btnText}`, `--l-neg:${p.L.neg}`,
    `--d-text:${p.D.text}`, `--d-mut:${p.D.muted}`, `--d-line:${p.D.line}`, `--d-btn:${p.D.btnBg}`, `--d-btn-t:${p.D.btnText}`, `--d-neg:${p.D.neg}`
  ].join(';');
  const navItems = ['الأرصدة', 'كشف الحساب', 'الفواتير', 'المراجعة'];
  return `
<section class="pal" id="p${p.n}" aria-labelledby="p${p.n}-h" style="${vars}">
  <header class="pal-head">
    <div class="pal-title">
      <p class="pal-n">اللوحة ${p.n}</p>
      <h2 id="p${p.n}-h">${p.name}</h2>
      <p class="pal-why">${p.why}</p>
    </div>
    <dl class="hexes">
      ${sw('INK الحبر', p.ink, 'أساسي')}
      ${sw('ACCENT الأكسنت', p.acc, 'أساسي')}
      ${sw('خلفية العرض الفاتحة', p.lbg)}
      ${sw('خلفية العرض الداكنة', p.dbg)}
      ${sw('الحبر على الداكن', p.dink)}
      ${sw('الأكسنت على الداكن', p.dacc, p.dacc === p.acc ? 'دون تعديل' : 'مُفتَّح')}
    </dl>
  </header>

  <div class="specimens">
    <figure class="spec spec-l">
      <div class="stage">${lockup(p.ink, p.acc, { label: `رصيد — ${p.name} على خلفية فاتحة` })}</div>
      <figcaption>على الفاتح: الحبر ${hex(p.ink)} والأكسنت ${hex(p.acc)} فوق ${hex(p.lbg)}. تباين العلامة <span class="num">${p.markC.inkL.toFixed(2)}:1</span> و<span class="num">${p.markC.accL.toFixed(2)}:1</span>${p.markC.accL < 3 ? ' <em>الشريط السفلي دون 3:1 على الفاتح</em>' : ''}</figcaption>
    </figure>
    <figure class="spec spec-d">
      <div class="stage">${lockup(p.dink, p.dacc, { label: `رصيد — ${p.name} معكوساً على خلفية داكنة` })}</div>
      <figcaption>معكوس على الداكن: ${hex(p.dink)} و${hex(p.dacc)} فوق ${hex(p.dbg)}. تباين العلامة <span class="num">${p.markC.inkD.toFixed(2)}:1</span> و<span class="num">${p.markC.accD.toFixed(2)}:1</span></figcaption>
    </figure>
  </div>

  <div class="block">
    <h3>أيقونة التطبيق بالأحجام الفعلية</h3>
    <p class="block-note">العلامة وحدها على الحبر ${hex(p.ink)}. الزوايا 22.37% من الضلع كما في iOS. في 64 و32 الشريطان أسمك قليلاً ليبقيا واضحين.</p>
    <div class="icons">
      <figure class="ic ic-512">${icon(p, 512)}<figcaption><span class="num">512×512</span> <span class="scale-note" data-scale-note>بالحجم الفعلي</span></figcaption></figure>
      <div class="ic-small">
        <figure class="ic">${icon(p, 180)}<figcaption><span class="num">180×180</span> iOS</figcaption></figure>
        <figure class="ic">${icon(p, 64)}<figcaption><span class="num">64×64</span></figcaption></figure>
        <figure class="ic">${icon(p, 32)}<figcaption><span class="num">32×32</span></figcaption></figure>
      </div>
    </div>
  </div>

  <div class="block">
    <h3>في رأس التطبيق</h3>
    <p class="block-note">يتبع وضع الصفحة: بدّل الوضع من الأعلى لترى الرأسين بالألوان الداكنة.</p>
    <div class="heads">
      <figure class="phone">
        <div class="mock">
          <div class="mock-bar">
            ${lockup('var(--m-ink)', 'var(--m-acc)', { cls: 'lockup lk-phone', label: 'رصيد' })}
            <button type="button" class="mock-btn">إضافة</button>
          </div>
          <div class="mock-body">
            <p class="mock-title">الأرصدة</p>
            <div class="mock-row"><span>بدر زين للأثاث</span><span class="mock-neg">${money}</span></div>
          </div>
        </div>
        <figcaption>جوال بعرض <span class="num">390</span></figcaption>
      </figure>
      <figure class="desk">
        <div class="desk-scroll">
          <div class="mock mock-desk">
            <div class="mock-bar">
              ${lockup('var(--m-ink)', 'var(--m-acc)', { cls: 'lockup lk-desk', label: 'رصيد' })}
              <ul class="mock-nav">${navItems.map((t, j) => `<li${j === 0 ? ' class="on"' : ''}>${t}</li>`).join('')}</ul>
              <button type="button" class="mock-btn">إضافة حركة</button>
            </div>
          </div>
        </div>
        <figcaption>حاسوب: الشعار مع روابط التنقل<span class="swipe"> (اسحب الشريط أفقياً لرؤيته كاملاً)</span></figcaption>
      </figure>
    </div>
  </div>

  <div class="block">
    <h3>عينة واجهة</h3>
    <div class="uis">${uiSample(p, 'light')}${uiSample(p, 'dark')}</div>
  </div>
</section>`;
}

const tableRows = P.map(p => `
    <tr>
      <th scope="row"><a href="#p${p.n}"><span class="num">${p.n}</span> ${p.name}</a></th>
      <td class="t-l" style="background:${p.lbg}">${lockup(p.ink, p.acc, { cls: 'lockup lk-t', label: `${p.name} على الفاتح` })}</td>
      <td class="t-d" style="background:${p.dbg}">${lockup(p.dink, p.dacc, { cls: 'lockup lk-t', label: `${p.name} على الداكن` })}</td>
      <td class="t-i">${icon(p, 32)}</td>
      <td class="t-hex"><span class="pair"><span class="chip" style="background:${p.ink}"></span>${hex(p.ink)}</span><span class="pair"><span class="chip" style="background:${p.acc}"></span>${hex(p.acc)}</span></td>
      <td class="t-c"><span class="num">${p.markC.accL.toFixed(2)}</span> / <span class="num">${p.markC.accD.toFixed(2)}</span></td>
      <td class="t-why">${p.why}</td>
    </tr>`).join('');

const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>رصيد — لوحات ألوان الشعار</title>
<meta name="description" content="ثماني لوحات ألوان لشعار رصيد: الشعار على الفاتح والداكن، أيقونات التطبيق، الرأس، وعينة واجهة.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600&family=Readex+Pro:wght@600&display=swap">
<link rel="stylesheet" href="../shared/riyal.css">
<script src="../shared/core.js"></script>
<style>
:root{
  --page:#EDEFF1; --surface:#FFFFFF; --text:#1C1F24; --muted:#555B64; --line:#D3D7DC; --line-strong:#B4BAC2; --focus:#1C1F24;
  --gutter:clamp(16px,4vw,48px);
  color-scheme:light;
}
html[data-theme="dark"]{
  --page:#16181B; --surface:#1E2125; --text:#E8EAED; --muted:#A5ABB4; --line:#30353B; --line-strong:#4A5059; --focus:#E8EAED;
  color-scheme:dark;
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
body{margin:0;background:var(--page);color:var(--text);font-family:'IBM Plex Sans Arabic',sans-serif;font-size:16px;line-height:1.65;overflow-x:hidden}
h1,h2,h3,p,figure,dl,dd,ul{margin:0}
a{color:inherit}
:focus-visible{outline:3px solid var(--focus);outline-offset:3px;border-radius:4px}
.num{font-family:'IBM Plex Sans Arabic',sans-serif}
.skip{position:absolute;inset-inline-start:8px;top:-60px;background:var(--surface);padding:10px 14px;border-radius:6px;z-index:20}
.skip:focus{top:8px}

/* الشريط العلوي */
.top{position:sticky;top:0;z-index:10;background:var(--page);border-bottom:1px solid var(--line)}
.top-in{max-width:1440px;margin:0 auto;padding:8px var(--gutter);display:flex;align-items:center;gap:16px}
.top-name{font-weight:600;white-space:nowrap}
.jump{display:flex;gap:2px;overflow-x:auto;scrollbar-width:none;flex:1;min-width:0;margin:0;padding:0;list-style:none}
.jump::-webkit-scrollbar{display:none}
.jump a{display:flex;align-items:center;min-height:44px;padding:0 10px;border-radius:6px;text-decoration:none;white-space:nowrap;color:var(--muted);font-size:15px}
.jump a:hover{color:var(--text);background:var(--surface)}
.theme{flex:none;min-height:44px;min-width:44px;padding:0 14px;border:1px solid var(--line-strong);background:var(--surface);color:var(--text);border-radius:999px;font:inherit;font-size:14px;cursor:pointer}
.theme .t-dark{display:none}
html[data-theme="dark"] .theme .t-dark{display:inline}
html[data-theme="dark"] .theme .t-light{display:none}

main{max-width:1440px;margin:0 auto;padding:0 var(--gutter) 96px}

/* المقدمة والجدول */
.intro{padding:clamp(32px,6vw,72px) 0 28px;display:grid;gap:14px;max-width:72ch}
.intro h1{font-size:clamp(30px,4.4vw,52px);line-height:1.2;font-weight:600;letter-spacing:0}
.intro p{color:var(--muted);font-size:clamp(16px,1.5vw,18px)}
.intro-mark{width:96px;height:auto;margin-bottom:6px}

.compare{margin-top:8px;background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.compare table{width:100%;border-collapse:collapse}
.swipe{display:none}
.compare caption{text-align:start;padding:16px 20px 4px;font-weight:600}
.compare th,.compare td{padding:12px 14px;text-align:start;vertical-align:middle;border-top:1px solid var(--line)}
.compare thead th{font-size:13px;font-weight:500;color:var(--muted);border-top:0;padding-top:8px}
.compare tbody th{font-weight:600;white-space:nowrap}
.compare tbody th a{display:inline-flex;align-items:center;gap:8px;min-height:44px;text-decoration:none}
.compare tbody th a:hover{text-decoration:underline}
.compare tbody th .num{color:var(--muted);font-weight:500;min-width:1.2em}
.t-l,.t-d{width:150px}
.lk-t{height:30px;width:auto;display:block;margin:auto}
.t-i svg{display:block}
.t-hex .pair{display:flex;align-items:center;gap:8px;white-space:nowrap;font-size:14px}
.t-c{white-space:nowrap;font-size:14px;color:var(--muted)}
.t-why{color:var(--muted);font-size:14px;min-width:16ch}
.chip{display:inline-block;width:14px;height:14px;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(127,127,127,.35);flex:none}
.compare-note{padding:10px 20px 16px;color:var(--muted);font-size:14px;border-top:1px solid var(--line)}

@media (max-width:900px){
  .compare thead{display:none}
  .compare caption{display:block;width:100%}
  .compare table,.compare tbody,.compare tr,.compare th,.compare td{display:block}
  .compare tr{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--line);padding:6px 0 12px}
  .compare tbody th,.compare tbody td{border-top:0;padding:6px 14px}
  .compare tbody th{grid-column:1/-1}
  .t-l,.t-d{width:auto;border-radius:8px;margin:0 14px;padding:14px 8px!important}
  .t-l{margin-inline-end:4px}.t-d{margin-inline-start:4px}
  .t-i{display:none!important}
  .t-hex{display:flex!important;flex-wrap:wrap;gap:4px 16px;grid-column:1/-1}
  .t-c{grid-column:1/-1}
  .t-c::before{content:'تباين الأكسنت فاتح / داكن: '}
  .t-why{grid-column:1/-1}
}

/* قسم اللوحة */
.pal{--m-bg:var(--lbg);--m-ink:var(--ink);--m-acc:var(--acc);--m-text:var(--l-text);--m-mut:var(--l-mut);--m-line:var(--l-line);--m-btn:var(--l-btn);--m-btn-t:var(--l-btn-t);--m-neg:var(--l-neg);
  padding-top:clamp(48px,7vw,88px);scroll-margin-top:64px}
html[data-theme="dark"] .pal{--m-bg:var(--dbg);--m-ink:var(--dink);--m-acc:var(--dacc);--m-text:var(--d-text);--m-mut:var(--d-mut);--m-line:var(--d-line);--m-btn:var(--d-btn);--m-btn-t:var(--d-btn-t);--m-neg:var(--d-neg)}
.pal + .pal{border-top:1px solid var(--line);margin-top:clamp(48px,7vw,88px)}
.pal-head{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:24px 48px;align-items:start;margin-bottom:28px}
.pal-n{color:var(--muted);font-size:15px}
.pal h2{font-size:clamp(28px,3.4vw,40px);line-height:1.2;font-weight:600}
.pal-why{margin-top:8px;color:var(--muted);max-width:46ch}
.hexes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px 20px}
.sw{display:grid;grid-template-columns:28px minmax(0,1fr);grid-template-rows:auto auto;column-gap:10px;align-items:center}
.sw .chip{width:28px;height:28px;border-radius:7px;grid-row:1/3}
.sw dt{font-size:13px;color:var(--muted);line-height:1.4;overflow-wrap:anywhere}
.sw dt small{font-size:12px;border:1px solid var(--line-strong);border-radius:4px;padding:0 4px;margin-inline-start:2px;white-space:nowrap}
.sw dd{font-weight:600;font-size:15px}

.specimens{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.spec{min-width:0}
.stage{display:flex;align-items:center;justify-content:center;min-height:clamp(180px,22vw,280px);border-radius:12px;padding:32px 20px}
.spec-l .stage{background:var(--lbg);box-shadow:inset 0 0 0 1px var(--line)}
.spec-d .stage{background:var(--dbg)}
.stage .lockup{height:clamp(52px,6.2vw,88px);width:auto;max-width:100%}
.spec figcaption{margin-top:10px;font-size:14px;color:var(--muted);line-height:1.6}
.spec figcaption em{font-style:normal;display:inline-block;margin-inline-start:6px;color:var(--text);border-bottom:1px solid var(--line-strong)}

.block{margin-top:44px}
.block h3{font-size:20px;font-weight:600}
.block-note{color:var(--muted);font-size:14px;margin-top:4px;max-width:70ch}

.icons{margin-top:18px;display:flex;flex-wrap:wrap;align-items:flex-end;gap:28px 40px}
.ic{display:flex;flex-direction:column;align-items:flex-start;gap:8px;min-width:0}
.ic figcaption{font-size:13px;color:var(--muted)}
.ic-512{max-width:100%}
.ic-512 .appicon{width:512px;height:auto;max-width:100%}
.appicon{display:block;flex:none}
.ic-small{display:flex;flex-wrap:wrap;align-items:flex-end;gap:28px 36px}

.heads{margin-top:18px;display:grid;grid-template-columns:390px minmax(0,1fr);gap:24px;align-items:start}
.phone,.desk{min-width:0}
.phone figcaption,.desk figcaption{margin-top:8px;font-size:13px;color:var(--muted)}
.mock{background:var(--m-bg);color:var(--m-text);border:1px solid var(--line-strong);border-radius:14px;overflow:hidden}
.phone .mock{width:390px;max-width:100%;border-radius:22px}
.mock-bar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 16px;border-bottom:1px solid var(--m-line);min-height:64px}
.lk-phone{height:30px;width:auto}
.lk-desk{height:34px;width:auto;flex:none}
.mock-btn{min-height:44px;padding:0 18px;border:0;border-radius:10px;background:var(--m-btn);color:var(--m-btn-t);font:inherit;font-weight:600;font-size:15px;cursor:pointer;white-space:nowrap}
.mock-body{padding:16px 16px 20px}
.mock-title{font-size:20px;font-weight:600;margin-bottom:10px}
.mock-row{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:12px 0;border-top:1px solid var(--m-line);font-size:15px}
.mock-neg{color:var(--m-neg);font-weight:600}
.desk-scroll{overflow-x:auto;border-radius:14px}
.mock-desk{min-width:640px}
.mock-desk .mock-bar{padding:12px 24px;min-height:72px;border-bottom:0;justify-content:flex-start;gap:36px}
.mock-nav{display:flex;gap:28px;list-style:none;padding:0;margin-inline-end:auto;font-size:15px;color:var(--m-mut)}
.mock-nav li{white-space:nowrap;padding:6px 0;border-bottom:2px solid transparent}
.mock-nav li.on{color:var(--m-text);font-weight:600;border-bottom-color:var(--m-acc)}

.uis{margin-top:18px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.ui{background:var(--u-bg);color:var(--u-text);border-radius:12px;padding:20px;display:grid;gap:12px;align-content:start;min-width:0}
.spec-l .stage,.ui:first-child{box-shadow:inset 0 0 0 1px var(--line)}
.ui-mode{font-size:13px;color:var(--u-mut)}
.ui-row{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:8px 16px}
.ui-name{font-weight:600}
.ui-neg{color:var(--u-neg);font-weight:600;font-size:22px}
.ui-note{font-size:14px;color:var(--u-mut);margin-top:-8px}
.ui-badges{justify-content:flex-start}
.badge{display:inline-flex;align-items:center;gap:7px;padding:3px 12px;border-radius:999px;font-size:14px;font-weight:600;line-height:1.6}
.badge i{width:8px;height:8px;border-radius:50%;flex:none}
.badge.ok{background:var(--u-ok);color:var(--u-ok-t)}
.badge.ok i{background:currentColor}
.badge.pend{background:var(--u-pd);color:var(--u-pd-t)}
.badge.pend i{box-shadow:inset 0 0 0 1.5px currentColor}
.ui-btn{justify-self:start;min-height:44px;padding:0 22px;border:0;border-radius:10px;background:var(--u-btn);color:var(--u-btn-t);font:inherit;font-weight:600;cursor:pointer}
.ui-btn:focus-visible{outline-color:var(--u-text)}
.ratios{list-style:none;padding:10px 0 0;margin-top:4px;border-top:1px solid var(--u-line);display:flex;flex-wrap:wrap;gap:4px 16px;font-size:13px;color:var(--u-mut)}

.foot{margin-top:72px;padding-top:20px;border-top:1px solid var(--line);color:var(--muted);font-size:14px;display:grid;gap:6px}

@media (max-width:1100px){
  .pal-head{grid-template-columns:minmax(0,1fr)}
  .heads{grid-template-columns:minmax(0,1fr)}
}
@media (max-width:700px){
  .top-name{display:none}
  .swipe{display:inline}
  .specimens,.uis{grid-template-columns:minmax(0,1fr)}
  .hexes{grid-template-columns:repeat(2,minmax(0,1fr))}
  .icons{gap:24px}
  .ic-small{gap:20px 28px}
}
</style>
</head>
<body>
<a class="skip" href="#main">تخطَّ إلى المحتوى</a>
<header class="top">
  <div class="top-in">
    <span class="top-name">لوحات شعار رصيد</span>
    <nav aria-label="اللوحات" style="flex:1;min-width:0;display:flex">
      <ul class="jump">
        <li><a href="#compare">المقارنة</a></li>
        ${P.map(p => `<li><a href="#p${p.n}">${p.name}</a></li>`).join('\n        ')}
      </ul>
    </nav>
    <button type="button" class="theme" data-theme-toggle><span class="t-light">الوضع الداكن</span><span class="t-dark">الوضع الفاتح</span></button>
  </div>
</header>

<main id="main">
  <section class="intro" aria-labelledby="title">
    <svg class="intro-mark" viewBox="12 34 96 52" aria-hidden="true"><rect x="30" y="36" width="76" height="16" rx="8" fill="currentColor"/><rect x="14" y="68" width="76" height="16" rx="8" fill="currentColor" opacity=".45"/></svg>
    <h1 id="title">علامة التوازن بثماني لوحات</h1>
    <p>الشكل ثابت: شريط الحبر للمدين وشريط الأكسنت للدائن، متزحزحان كما يتزحزح الرصيد. يتغير اللون فقط. كل لوحة معروضة على الفاتح والداكن، وأيقونة تطبيق بأحجامها الفعلية، وفي رأس التطبيق، وفي عينة واجهة بتباين محسوب.</p>
  </section>

  <section class="compare" id="compare" aria-labelledby="compare-h">
    <table>
      <caption id="compare-h">مقارنة سريعة</caption>
      <thead><tr><th scope="col">اللوحة</th><th scope="col">على الفاتح</th><th scope="col">على الداكن</th><th scope="col">أيقونة <span class="num">32</span></th><th scope="col">INK و ACCENT</th><th scope="col">تباين الأكسنت فاتح / داكن</th><th scope="col">السبب</th></tr></thead>
      <tbody>${tableRows}
      </tbody>
    </table>
    <p class="compare-note">تباين الأكسنت محسوب للعلامة كعنصر رسومي (المرجع 3:1). الأكسنت لا يُستعمل نصاً على الفاتح في أي لوحة؛ نصوص الشارات والمبالغ بدرجات مشتقة تحقق 4.5:1 على الأقل.</p>
  </section>

  ${P.map(section).join('\n')}

  <footer class="foot">
    <p>ملفات SVG المستقلة في <span class="num">logo/svg/</span>: لكل لوحة ملف للخلفيات الفاتحة وملف للداكنة (الكلمة محوَّلة إلى مسارات من Readex Pro وزن 600) وملف أيقونة.</p>
    <p>المبلغ في العينات من بيانات الربع الثالث 2026: رصيد بدر زين للأثاث.</p>
  </footer>
</main>
<script>
// يكتب مقياس عرض أيقونة 512 عندما تُصغَّر على الشاشات الضيقة
(function(){
  function update(){
    document.querySelectorAll('.ic-512').forEach(function(fig){
      var svg=fig.querySelector('svg'), note=fig.querySelector('[data-scale-note]');
      var w=svg.getBoundingClientRect().width, pct=Math.round(w/512*100);
      note.textContent = pct>=100 ? 'بالحجم الفعلي' : 'معروض بمقياس ' + pct + '%';
    });
  }
  window.addEventListener('resize',update);
  document.addEventListener('DOMContentLoaded',update);
})();
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(ROOT, 'palettes.html'), html);
console.log('ok', (html.length / 1024).toFixed(0) + 'KB');
for (const r of report) console.log(r.n, r.name, 'lbg', r.lbg, 'dbg', r.dbg, 'dink', r.dink, 'dacc', r.dacc, JSON.stringify(r.light), JSON.stringify(r.dark), JSON.stringify(r.mark));
