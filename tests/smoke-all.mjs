#!/usr/bin/env node
// Builds a simple design for EVERY product/surface in the catalog at full size and
// records the in-app validation result. Writes docs/ALL_PRODUCTS_EXPORT_CHECK.md.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BROWSER = process.env.BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/products.json'), 'utf8'));

const server = spawn(process.execPath, [path.join(ROOT, 'node_modules/vite/bin/vite.js'), 'preview', '--port', '4175', '--strictPort'], { cwd: ROOT, env: { ...process.env, NO_COLOR: '1' } });
await new Promise((r) => server.stdout.on('data', (d) => /4175/.test(String(d)) && r()));
const browser = await chromium.launch({ executablePath: BROWSER });
const page = await browser.newPage();
await page.goto('http://localhost:4175/');
await page.waitForFunction(() => window.__bbyTest);
const rows = [];
for (const p of db.products) {
  const fmt = p.artworkRole === 'engraving' && p.formats.includes('SVG') ? 'SVG' : p.formats.includes('PNG') ? 'PNG' : p.formats[0];
  const t0 = Date.now();
  const r = await page.evaluate(async ({ id, fmt }) => {
    const T = window.__bbyTest; const product = T.db.byId.get(id); const out = [];
    for (const s of product.surfaces) {
      const json = JSON.stringify({ version: '7', objects: [
        { type: 'Rect', originX: 'left', originY: 'top', left: 0, top: 0, width: s.width, height: s.height, fill: product.artworkRole === 'engraving' ? '' : '#ffffff', isBackground: true },
        { type: 'Circle', originX: 'left', originY: 'top', left: s.width * 0.3, top: s.height * 0.3, radius: Math.min(s.width, s.height) * 0.2, fill: '#000000' },
      ] });
      try {
        const b = await T.buildSurface(product, s, json, { format: fmt });
        out.push({ surface: s.label, w: b.inspect?.width, h: b.inspect?.height, dpi: b.inspect?.dpi, size: b.size, fails: b.checks.filter((c) => c.status === 'fail').map((c) => c.label + ': ' + c.detail) });
      } catch (e) { out.push({ surface: s.label, error: e.message }); }
    }
    return out;
  }, { id: p.id, fmt });
  const ok = r.every((x) => !x.error && !x.fails.length && x.w === p.surfaces.find((s) => s.label === x.surface).width);
  rows.push({ p, fmt, r, ok, ms: Date.now() - t0 });
  process.stdout.write(`${ok ? '.' : 'F'}`);
}
await browser.close(); server.kill();
const passed = rows.filter((x) => x.ok).length;
const L = ['# All-products export check', '', `Run ${new Date().toISOString()} in ${BROWSER}. Each product's every surface was rendered at full size in its required format (SVG for engraving products that accept it) and validated by the app's build checks (dimensions, DPI metadata, format, file size, transparency, colour).`, '', `**${passed}/${rows.length} products exported and passed all file checks.**`, '', '| Product | Partner | Format | Result | Surfaces (W×H · DPI · size) | Time |', '|---|---|---|---|---|---|'];
for (const x of rows) L.push(`| ${x.p.name} | ${x.p.productionPartner} | ${x.fmt} | ${x.ok ? '✅' : '❌ ' + x.r.map((y) => y.error || y.fails.join('; ')).join(' / ').replace(/\|/g, '/')} | ${x.r.map((y) => `${y.w}×${y.h} · ${y.dpi ?? 'n/a'} · ${y.size ? (y.size / 1e6).toFixed(2) + 'MB' : '—'}`).join('<br>')} | ${(x.ms / 1000).toFixed(1)}s |`);
fs.writeFileSync(path.join(ROOT, 'docs/ALL_PRODUCTS_EXPORT_CHECK.md'), L.join('\n') + '\n');
console.log(`\n${passed}/${rows.length}`);
