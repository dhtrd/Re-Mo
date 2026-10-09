// الاستخدام: node tools/shoot.js direction-N outDir
const fs = require('fs'); const path = require('path');
const { pw, SCREENS, urlFor, open } = require('./lib');
(async () => {
  const [dir, out] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const shots = [[390, 'light'], [834, 'light'], [1194, 'light'], [1440, 'light'], [390, 'dark'], [1440, 'dark']];
  const browser = await pw.chromium.launch();
  for (const s of (process.argv[4] ? process.argv[4].split(',') : SCREENS)) {
    for (const [w, theme] of shots) {
      const { page } = await open(browser, urlFor(dir, s, theme), w);
      const f = path.join(out, `${s}-${w}${theme === 'dark' ? '-dark' : ''}.png`);
      await page.screenshot({ path: f });
      await page.close();
      console.log(f);
    }
  }
  await browser.close();
})();
