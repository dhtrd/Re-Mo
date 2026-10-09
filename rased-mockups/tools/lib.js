// أدوات فحص النماذج — تعمل بـ Playwright المثبت عالمياً
const path = require('path');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const SCREENS = ['dashboard', 'statement', 'invoices', 'add-entry', 'review'];
const VIEWPORTS = { 360: 780, 390: 844, 834: 1194, 1194: 834, 1440: 900, 1920: 1080 };
function urlFor(dir, screen, theme) {
  return 'file://' + path.resolve(dir, screen + '.html') + (theme ? '?theme=' + theme : '');
}
async function open(browser, url, w) {
  const page = await browser.newPage({ viewport: { width: +w, height: VIEWPORTS[w] || 900 }, hasTouch: +w <= 600, isMobile: false });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(e => errors.push('goto: ' + e.message));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  return { page, errors };
}
module.exports = { pw, SCREENS, VIEWPORTS, urlFor, open };
