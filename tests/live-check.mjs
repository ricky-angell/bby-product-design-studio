// Verifies the deployed GitHub Pages site in real Chrome.
import { chromium } from 'playwright-core';
const LIVE = process.env.LIVE_URL || 'https://ricky-angell.github.io/bby-product-design-studio/';
const b = await chromium.launch({ executablePath: process.env.BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const out = {};
for (const [label, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const p = await b.newPage({ viewport: vp }); const errs = [], hosts = new Set();
  p.on('pageerror', (e) => errs.push(e.message)); p.on('request', (r) => { try { hosts.add(new URL(r.url()).host); } catch {} });
  await p.goto(LIVE); await p.waitForSelector('.pcard', { timeout: 30000 });
  const cards = await p.locator('.pcard').count();
  await p.fill('input[type=search]', 'graphic heart keychain'); await p.locator('.pcard').first().click();
  await p.click('text=Start designing'); await p.waitForFunction(() => window.__bbyStudio?.editorRef.current?.undoStack.length >= 1, null, { timeout: 30000 });
  await p.click('text=🔤 Add text'); await p.click('text=6–7 · Build & download'); await p.click('[data-testid=build-button]');
  await p.waitForSelector('[data-testid=ready-banner]', { timeout: 60000 });
  const banner = (await p.textContent('[data-testid=ready-banner]')).trim();
  const table = (await p.textContent('.report-table tbody')).trim();
  const fontOk = await p.evaluate(() => document.fonts.check('16px "Playfair Display"'));
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  out[label] = { cards, banner, table, fontOk, overflow, errs, hosts: [...hosts] };
  await p.close();
}
await b.close(); console.log(JSON.stringify(out, null, 1));
