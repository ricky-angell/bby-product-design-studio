#!/usr/bin/env node
/**
 * Product-preview accuracy tests (real Chrome, production build).
 *
 *  1. Fresh browser: every catalog thumbnail and preview is an honest placeholder (no drawn
 *     stand-in shapes), and the preview says an approved asset is needed.
 *  2. Official ShineOn mockup PSDs (downloaded from ShineOn's public seller portal into the
 *     git-ignored mockup-sources/ folder) are installed through the app's own UI.
 *  3. For each tested product: the kit is bound to that exact product / catalog number / finish,
 *     its rendering is verified against ShineOn's own composite, and pixel tests prove the
 *     student's design lands in the slot while the jewelry stays on top of it.
 *  4. Preview tab: the official mockup is shown for the selected product, finish switching
 *     changes the product variant, and screenshots are saved.
 *
 * Screenshots that contain ShineOn imagery go to local-evidence/ (git-ignored — ShineOn's
 * property, not redistributed). Placeholder screenshots go to docs/screenshots/.
 * Writes docs/PREVIEW_ACCURACY_REPORT.md.
 *
 * Usage: npm run build && node tests/mockup-tests.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { fetchMockup } from '../tools/fetch-mockup.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'mockup-sources');
const EVID = path.join(ROOT, 'local-evidence/preview-tests');
const SHOTS = path.join(ROOT, 'docs/screenshots');
fs.mkdirSync(EVID, { recursive: true }); fs.mkdirSync(SHOTS, { recursive: true });
const P = 'PublicSellerPortal';

// Each file is an official ShineOn mockup PSD from that product's own Canto mockup folder.
const FIXTURES = [
  { label: 'Forever Love Necklace', product: 'shineon-forever-love-necklace', files: [
    { portal: P, id: 'c4hc1p1g8d3tnatlev2bsjf55q', name: 'Forever Love silver Model + MC.psd' },
    { portal: P, id: 'hsdotrgbil45h019qm6c1u486j', name: 'Forever Love gold Model + MC.psd' },
    { portal: P, id: 'au0p45kof15n72p18kq921ur0l', name: 'Forever Love Necklace_Custom Message Card.psd', variant: 'silver' },
    { portal: P, id: 'k329i7h5t500dds4fec4eaa24s', name: 'Forever Love Silver Box Opening Hand.psd' },
    { portal: P, id: 'mtiqnp6n157q7dj6upcrvkd149', name: 'Forever Love Gold Box Opening Hand.psd' }] },
  { label: 'Love Knot Necklace', product: 'shineon-love-knot-necklace', files: [
    { portal: P, id: 'dokq7d0qb55c72pptndj6j4q7s', name: 'Love_Knot_White_Custom.psd', variant: 'silver' }] },
  { label: 'Endless Love Necklace', product: 'shineon-endless-love-necklace', files: [
    { portal: P, id: '643rtf9s3906550pgndas5ro70', name: 'Endless Love Necklace-Maple Leaves Infinity Silver.psd' },
    { portal: P, id: 'v702b55mc51fbdj53h77mlrl3a', name: 'Endless Love Necklace-Maple Leaves Infinity Gold.psd' }] },
  { label: 'Alluring Beauty Necklace', product: 'shineon-alluring-beauty-necklace', files: [
    { portal: P, id: 'bl84i82it16jfdc67c5e6dfq3q', name: 'Alluring Beauty Maple Leaves.psd', variant: 'silver' }] },
  { label: 'Eternal Hope Necklace', product: 'shineon-eternal-hope-necklace', files: [
    { portal: P, id: 'g6sddgtha15db9jgepjhcmm347', name: 'Eternal Hope Silver Model + MC.psd' },
    { portal: P, id: 'noulfvgpdl49ff70ki64u7sa23', name: 'Eternal_Hope_White_PropedCard_Lux_Silver_ 8.psd' }] },
  { label: 'Engraved watch', product: 'shineon-non-mc-black-chronograph-watch-with-engraving', files: [
    { portal: P, id: '8nqqc2rent79hddmq93fu6g071', name: 'Engraved Black Chronograph Watch FD 1.psd' }] },
  { label: 'Graphic keychain', product: 'shineon-graphic-circle-keychain', files: [
    { portal: P, id: '91l6o160715h9fskb7gpki9861', name: 'Graphic Circle Keychain IMG_4373 Silver.psd' },
    { portal: P, id: 'fuuj6c1vst1lpcbrivm8g1c264', name: 'Graphic Circle Keychain IMG_4373.psd', variant: 'gold' }] },
  { label: 'Bracelet (Luxury Circle Bangle)', product: 'shineon-non-mc-luxury-circle-bangle', files: [
    { portal: P, id: 'cr22m88l394qdecpaph50lpt15', name: 'Graphic Circle Bangle 3.psd', variant: 'silver' }] },
  { label: 'Acrylic plaque', product: 'shineon-acrylic-square-plaque', files: [
    { portal: P, id: 'v0di5nbnal1c5bkm6t7gv35u7a', name: 'Acrylic_Square Plaque white.psd' }] },
  { label: 'Red Heart Rose Box', product: 'shineon-love-knot-necklace-with-red-heart-rose-box', files: [
    { portal: 'VR8GOHE46I', id: '4e6q6q1e454vv41nv16jbke34o', name: 'Love Knot + Red Rose Red Box Silver 5.psd' }] },
  { label: 'Rotating Rose Box', product: 'shineon-alluring-beauty-necklace-with-rotating-rose-box', files: [
    { portal: 'N1VQ0N4L2Q', id: 'tdp0iha2qp3i392l81tid44j4m', name: 'Alluring Beauty (Silver) with Rotating Rose Box 3.psd' }] },
];
// Products that must NOT pick up a neighbour's mockup (exact matching, no keyword matching)
const MUST_STAY_PLACEHOLDER = ['shineon-forever-love-necklace-with-red-heart-rose-box', 'shineon-love-knot-necklace-and-earring-set', 'shineon-alluring-beauty-necklace-with-red-heart-rose-box', 'shineon-graphic-heart-keychain'];

const results = []; let current = 'General';
const section = (n) => { current = n; console.log(`\n== ${n}`); };
function expect(name, cond, detail = '') { results.push({ section: current, name, pass: !!cond, detail }); console.log(`${cond ? '  PASS' : '  FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`); return !!cond; }

function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [path.join(ROOT, 'node_modules/vite/bin/vite.js'), 'preview', '--port', '4185', '--strictPort'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' } });
    let out = '';
    // eslint-disable-next-line no-control-regex
    const onData = (d) => { out += String(d).replace(/\x1b\[[0-9;]*m/g, ''); if (/localhost:4185/.test(out)) resolve(proc); };
    proc.stdout.on('data', onData); proc.stderr.on('data', onData);
    proc.on('exit', (c) => reject(new Error(`preview exited ${c}: ${out}`)));
    setTimeout(() => reject(new Error(`preview did not start: ${out}`)), 30000);
  });
}
const BROWSER = process.env.BROWSER || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p));
const URL0 = 'http://localhost:4185/';

async function gotoApp(page) {
  await page.goto(URL0);
  await page.waitForFunction(() => window.__bbyTest?.db && window.__bbyTest.mockups.mockupsLoaded());
}

/** In-page: open a fresh project for a product and draw a sample design suited to it. */
async function openWithSampleDesign(page, productId) {
  return page.evaluate(async (id) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const waitFor = async (fn, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { try { const v = fn(); if (v) return v; } catch { /* retry */ } await sleep(50); } throw new Error('timeout'); };
    const T = window.__bbyTest; const product = T.db.byId.get(id);
    const p = T.newProject(product, {}); p.name = `Preview test — ${product.name}`; await T.saveProject(p); T.openProject(p);
    await waitFor(() => window.__bbyStudio?.project.current.id === p.id && window.__bbyStudio.editorRef.current?.undoStack.length >= 1);
    const E = window.__bbyStudio.editorRef.current;
    if (product.artworkRole === 'engraving') {
      E.setBackground({ kind: 'none' });
      E.addText('Dad\nWe love you\n2026', { fill: '#000000', fontFamily: 'Cinzel', fontSize: Math.round(E.w * 0.11), fontWeight: 700 });
    } else {
      E.setBackground({ kind: 'gradient', color: '#ff5fa2', color2: '#5b2bd6', angle: 135 });
      E.addText(product.artworkRole === 'message-card' ? 'To my Mom\n\n\n\n\nLove you forever' : 'Best Mom\nEver', { fill: '#ffffff', fontFamily: 'Great Vibes', fontSize: Math.round(Math.min(E.w, E.h) * 0.1) });
    }
    await window.__bbyStudio.persist();
    return { id: p.id };
  }, productId);
}

/** In-page pixel proof for every kit of a product (two designs: solid red vs solid blue). */
async function pixelProof(page, productId) {
  return page.evaluate(async (id) => {
    const M = window.__bbyTest.mockups; const product = window.__bbyTest.db.byId.get(id);
    const out = [];
    for (const entry of M.kitsForProduct(id)) {
      const kit = entry.kit; const get = M.fileGetter(entry);
      const solid = (color) => { const s = product.surfaces[0]; const k = Math.min(1, 800 / Math.max(s.width, s.height)); const c = document.createElement('canvas'); c.width = Math.round(s.width * k); c.height = Math.round(s.height * k); const x = c.getContext('2d'); x.fillStyle = color; x.fillRect(0, 0, c.width, c.height); return c; };
      const slots = kit.stack.filter((s) => s.type === 'design');
      const A = await M.renderKit(kit, get, Object.fromEntries(slots.map((s) => [s.slot, solid('#ff0000')])));
      const B = await M.renderKit(kit, get, Object.fromEntries(slots.map((s) => [s.slot, solid('#0000ff')])));
      const W = kit.width, H = kit.height;
      const a = A.getContext('2d').getImageData(0, 0, W, H).data, b = B.getContext('2d').getImageData(0, 0, W, H).data;
      // layers drawn above the design slot (the jewelry, box lid, hand…)
      const ov = document.createElement('canvas'); ov.width = W; ov.height = H; const octx = ov.getContext('2d');
      const di = kit.stack.findIndex((s) => s.type === 'design');
      for (const it of kit.stack.slice(di + 1)) if (it.type === 'image' && (it.blend === 'normal' || !it.blend) && it.clipToSlot == null) octx.drawImage(await get(it.file), it.x, it.y);
      const o = octx.getImageData(0, 0, W, H).data;
      const q = slots[0].quad; const inside = (x, y, pad) => { // point in (convex) quad, expanded by pad px
        let sign = 0;
        for (let i = 0; i < 4; i++) { const x1 = q[i * 2], y1 = q[i * 2 + 1], x2 = q[((i + 1) % 4) * 2], y2 = q[((i + 1) % 4) * 2 + 1]; const len = Math.hypot(x2 - x1, y2 - y1) || 1; const c = ((x2 - x1) * (y - y1) - (y2 - y1) * (x - x1)) / len; const s = c > pad ? 1 : c < -pad ? -1 : 0; if (s && sign && s !== sign) return false; if (s) sign = s; }
        return true;
      };
      let quadArea = 0; for (let i = 0; i < 4; i++) quadArea += q[i * 2] * q[((i + 1) % 4) * 2 + 1] - q[((i + 1) % 4) * 2] * q[i * 2 + 1]; quadArea = Math.abs(quadArea / 2);
      let changed = 0, changedOutside = 0, overlayInQuad = 0, overlayChanged = 0;
      const fxPad = 12 + (slots[0].effects ? 20 : 0);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
        const inQ = inside(x + 0.5, y + 0.5, 0);
        if (d > 8) { changed++; if (!inside(x + 0.5, y + 0.5, fxPad)) changedOutside++; }
        if (o[i + 3] >= 254 && inQ) { overlayInQuad++; if (d > 8) overlayChanged++; }
      }
      out.push({
        kitId: kit.id, variant: kit.variant, scene: kit.scene, file: kit.source.fileName, catalogId: kit.catalogId, productIds: kit.productIds,
        accuracy: M.kitAccuracy(kit).level, verification: kit.verification, notes: kit.notes, fit: slots[0].fit, so: slots[0].so,
        designVisiblePct: +((changed / quadArea) * 100).toFixed(1), changedOutsidePct: changed ? +((changedOutside / changed) * 100).toFixed(2) : 0,
        overlayPixelsOverSlot: overlayInQuad, overlayChangedPct: overlayInQuad ? +((overlayChanged / overlayInQuad) * 100).toFixed(2) : 0,
      });
    }
    return out;
  }, productId);
}

async function run(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  const hosts = new Set(); page.on('request', (r) => { const u = new URL(r.url()); if (/^https?:$/.test(u.protocol)) hosts.add(u.host); });

  section('Fresh browser — no approved assets installed');
  await gotoApp(page);
  const total = await page.evaluate(() => window.__bbyTest.db.products.length);
  await page.waitForSelector('.pcard');
  const ph0 = await page.locator('.pcard [data-thumb=placeholder]').count();
  const off0 = await page.locator('.pcard [data-thumb=official]').count();
  expect('Every catalog card shows an honest placeholder (no drawn product shapes)', ph0 === total && off0 === 0, `${ph0}/${total} placeholders, ${off0} official`);
  expect('No SVG/canvas stand-in product drawings in catalog thumbnails', (await page.locator('.pcard .thumb svg, .pcard .thumb canvas').count()) === 0);
  await page.screenshot({ path: path.join(SHOTS, 'preview-0-catalog-placeholders.png'), clip: { x: 0, y: 0, width: 1440, height: 1000 } });
  await openWithSampleDesign(page, 'shineon-forever-love-necklace');
  await page.click('text=5 · Preview');
  await page.waitForSelector('[data-testid=preview-placeholder]');
  expect('Preview without an approved asset says so (no generic necklace/heart drawn)', (await page.locator('[data-testid=preview-canvas][data-mode=official]').count()) === 0 && /approved ShineOn mockup/.test(await page.textContent('[data-testid=preview-placeholder]')));
  await page.screenshot({ path: path.join(SHOTS, 'preview-1-placeholder.png'), fullPage: true });
  await page.click('[data-testid=install-mockup-button]');
  await page.waitForSelector('[data-testid=install-flow]');
  expect('"Install the official mockup" opens the installer for the same product', await page.inputValue('[data-testid=install-product]') === 'shineon-forever-love-necklace');
  await page.screenshot({ path: path.join(SHOTS, 'preview-2-mockup-library.png'), fullPage: false });

  section('Install official ShineOn mockups through the app UI');
  const installLog = [];
  for (const fx of FIXTURES) {
    for (const f of fx.files) {
      const file = await fetchMockup(f.portal, f.id, f.name, SRC);
      const t0 = Date.now();
      await page.click('nav >> text=Mockups');
      await page.click(`[data-testid="install-${fx.product}"]`);
      await page.waitForSelector('[data-testid=psd-input]');
      await page.setInputFiles('[data-testid=psd-input]', file);
      await page.waitForSelector('[data-testid=build-kit]', { timeout: 240000 });
      const guessed = await page.inputValue('[data-testid=install-variant]');
      if (f.variant !== undefined && guessed !== f.variant) await page.selectOption('[data-testid=install-variant]', f.variant || '');
      await page.click('[data-testid=build-kit]');
      await page.waitForSelector('[data-testid=kit-built]', { timeout: 300000 });
      await page.locator('[data-testid=kit-built] canvas').screenshot({ path: path.join(EVID, `install-${fx.product}-${path.parse(f.name).name.replace(/[^a-z0-9]+/gi, '-')}.png`) });
      await page.click('[data-testid=save-kit]');
      await page.waitForFunction(([pid, n]) => window.__bbyTest.mockups.kitsForProduct(pid).some((k) => k.kit.source.fileName === n), [fx.product, f.name], { timeout: 30000 });
      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      installLog.push({ product: fx.product, file: f.name, sizeMB: +(fs.statSync(file).size / 1048576).toFixed(1), seconds: +secs, guessedVariant: guessed || null, variant: f.variant ?? guessed ?? null });
      expect(`Installed "${f.name}" for ${fx.label}`, true, `${secs}s, finish ${f.variant ?? (guessed || 'n/a')}${f.variant !== undefined && guessed !== f.variant ? ` (installer guessed "${guessed || 'none'}", set manually)` : ' (detected from file name)'}`);
    }
  }

  section('Catalog thumbnails');
  await page.click('nav >> text=Catalog');
  await page.waitForSelector('.pcard');
  const installedProducts = FIXTURES.map((f) => f.product);
  for (const fx of FIXTURES) {
    const card = page.locator(`.pcard[data-product-id="${fx.product}"]`);
    const kitId = await card.locator('[data-thumb=official]').getAttribute('data-kit-id').catch(() => null);
    expect(`${fx.label}: catalog card shows ShineOn's own product image`, kitId && kitId.startsWith(`${fx.product}--`), kitId || 'placeholder');
  }
  for (const id of MUST_STAY_PLACEHOLDER) {
    const n = await page.locator(`.pcard[data-product-id="${id}"] [data-thumb=placeholder]`).count();
    expect(`Exact matching: "${id}" does not borrow a similar product's mockup`, n === 1);
  }
  const off1 = await page.locator('.pcard [data-thumb=official]').count();
  expect('Only the installed products show official thumbnails', off1 === installedProducts.length, `${off1} official thumbnails`);
  await page.fill('input[type=search]', 'necklace');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(EVID, 'catalog-thumbnails-necklaces.png'), fullPage: false });
  await page.fill('input[type=search]', '');

  section('Per-product verification');
  const perProduct = [];
  for (const fx of FIXTURES) {
    const proofs = await pixelProof(page, fx.product);
    for (const pr of proofs) {
      const v = pr.verification; const c = v.composite; const w = v.warp[0];
      const tag = `${fx.label} — ${pr.variant || 'any finish'} — ${pr.file}`;
      expect(`${tag}: kit bound to this product + catalog #`, pr.productIds.length === 1 && pr.productIds[0] === fx.product && pr.catalogId === (await page.evaluate((id) => window.__bbyTest.mockups.catalogIdOf(window.__bbyTest.db.byId.get(id)), fx.product)), `catalog #${pr.catalogId}`);
      expect(`${tag}: rendering matches ShineOn's own composite`, c?.match, c ? `mean diff ${c.meanDiff}/255, ${c.pctOver32}% px >32` : 'no composite');
      if (w?.checked) expect(`${tag}: placement lines up with Photoshop's own transform`, w.match, `best alignment offset (${w.offset.dx}, ${w.offset.dy}) px; painted-pixel mean diff ${w.meanDiff}/255 (${w.pctOver32}% px >32); outline+luminance diff ${w.offset.meanDiff}`);
      else expect(`${tag}: placement cross-check reported honestly when not possible`, w && !w.checked && w.reason, w?.reason);
      expect(`${tag}: student design fills the design slot`, pr.designVisiblePct > 25, `${pr.designVisiblePct}% of the slot shows the design${pr.fit === 'contain' ? ' (artwork fitted inside a differently-shaped slot)' : ''}`);
      expect(`${tag}: design never spills outside the slot`, pr.changedOutsidePct < 0.5, `${pr.changedOutsidePct}% of changed pixels outside`);
      if (pr.overlayPixelsOverSlot > 0) expect(`${tag}: product parts above the slot stay on top of the design`, pr.overlayChangedPct < 0.5, `${pr.overlayPixelsOverSlot.toLocaleString()} product pixels over the slot; ${pr.overlayChangedPct}% affected by the design`);
      perProduct.push({ ...pr, label: fx.label, product: fx.product });
    }
  }

  section('Preview tab (Step 5) with a sample design');
  for (const fx of FIXTURES) {
    await openWithSampleDesign(page, fx.product);
    await page.click('text=5 · Preview');
    await page.waitForSelector('[data-testid=preview-canvas][data-mode=official]', { timeout: 60000 });
    await page.waitForFunction(() => !document.querySelector('.two-col .spinner'), null, { timeout: 60000 });
    const attrs = await page.evaluate(() => { const c = document.querySelector('[data-testid=preview-canvas]'); return { ...c.dataset, w: c.width, h: c.height }; });
    expect(`${fx.label}: preview shows the official mockup of the selected product`, attrs.productId === fx.product && attrs.kitId.startsWith(`${fx.product}--`), `${attrs.kitId}`);
    const label = await page.textContent('[data-testid=mockup-info]');
    const prod = await page.evaluate((id) => window.__bbyTest.db.byId.get(id).artworkRole, fx.product);
    if (prod === 'message-card') {
      const over = await page.evaluate((kid) => window.__bbyTest.mockups.allKits().find((k) => k.kit.id === kid)?.kit.overlayPixels || 0, attrs.kitId);
      expect(`${fx.label}: default scene shows the jewelry over the student's card`, over > 0, `${over.toLocaleString()} product pixels over the card in "${attrs.kitId.split('--').pop()}"`);
    }
    expect(`${fx.label}: labelled as an official ShineOn mockup with its verification`, /Official ShineOn mockup/.test(label) && /verified|differs/i.test(label));
    const variants = [...new Set(fx.files.map((f) => f.variant ?? (/gold/i.test(f.name) ? 'gold' : /silver/i.test(f.name) ? 'silver' : null)).filter(Boolean))];
    const shots = [];
    for (const v of variants.length ? variants : [null]) {
      if (v) {
        await page.click(`[role=radiogroup][aria-label=Finish] [data-variant=${v}]`);
        await page.waitForFunction((vv) => document.querySelector('[data-testid=preview-canvas]')?.dataset.variant === vv, v, { timeout: 30000 });
        await page.waitForFunction(() => !document.querySelector('.two-col .spinner'), null, { timeout: 60000 });
        await page.waitForTimeout(250);
      }
      const shot = path.join(EVID, `preview-${fx.product}${v ? `-${v}` : ''}.png`);
      await page.locator('[data-testid=preview-canvas]').screenshot({ path: shot });
      shots.push(path.relative(ROOT, shot).replace(/\\/g, '/'));
      const sig = await page.evaluate(() => { const c = document.querySelector('[data-testid=preview-canvas]'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i += 997) s = (s * 31 + d[i]) % 1e9; return s; });
      shots.push(sig);
    }
    if (variants.length > 1) {
      const sigs = shots.filter((x) => typeof x === 'number');
      expect(`${fx.label}: switching Silver/Gold shows ShineOn's other finish`, new Set(sigs).size === sigs.length, `${variants.join(' → ')}`);
    }
    await page.screenshot({ path: path.join(EVID, `preview-page-${fx.product}.png`), fullPage: true });
    const pp = perProduct.filter((x) => x.product === fx.product); for (const x of pp) x.screenshots = shots.filter((s) => typeof s === 'string');
  }
  // a finish that is sold but not installed (Eternal Hope is only sold in white gold — so take Love Knot: gold not installed)
  await openWithSampleDesign(page, 'shineon-love-knot-necklace');
  await page.click('text=5 · Preview');
  await page.waitForSelector('[data-testid=preview-canvas][data-mode=official]', { timeout: 60000 });
  await page.click('[role=radiogroup][aria-label=Finish] [data-variant=gold]');
  await page.waitForSelector('[data-testid=preview-placeholder]');
  expect('Choosing a finish with no installed mockup shows a placeholder, never the other finish', /No approved Gold tone mockup installed/.test(await page.textContent('[data-testid=preview-placeholder]')));

  section('Regression');
  await openWithSampleDesign(page, 'shineon-forever-love-necklace');
  await page.click('text=6–7 · Build & download');
  await page.click('[data-testid=build-button]');
  await page.waitForSelector('[data-testid=ready-banner]', { timeout: 60000 });
  expect('Build still produces a PRODUCTION-READY 1000×1000 file after the preview change', /PRODUCTION-READY/.test(await page.textContent('[data-testid=ready-banner]')));
  expect('No page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  expect('No network requests leave the app (PSDs read locally)', [...hosts].every((h) => h === 'localhost:4185'), [...hosts].join(', '));

  section('Administrator path: export pack → import / publish');
  await page.click('nav >> text=Mockups');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('text=Export installed mockups (pack)')]);
  const packPath = path.join(EVID, 'test-pack.zip'); await dl.saveAs(packPath); // ShineOn imagery: kept in git-ignored local-evidence/
  const kitCount = await page.evaluate(() => window.__bbyTest.mockups.allKits().length);
  expect('Export pack downloads every installed scene', fs.statSync(packPath).size > 10000, `${(fs.statSync(packPath).size / 1048576).toFixed(1)} MB, ${kitCount} scenes`);
  // import into a different browser profile
  const ic = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const ip = await ic.newPage(); await gotoApp(ip);
  await ip.click('nav >> text=Mockups');
  await ip.setInputFiles('text=Import a mockup pack >> input[type=file]', packPath);
  await ip.waitForFunction((n) => window.__bbyTest.mockups.allKits().length === n, kitCount, { timeout: 60000 });
  expect('Importing the pack in another browser restores every scene', true, `${kitCount} scenes`);
  await ic.close();
  // publish tool: refuses without permission, publishes with it (into the test server's dist/ only)
  const { spawnSync } = await import('node:child_process');
  const pubDir = path.join(ROOT, 'dist/mockups'); const manifestBackup = fs.readFileSync(path.join(pubDir, 'manifest.json'));
  const refuse = spawnSync(process.execPath, ['tools/publish-mockup-pack.mjs', packPath], { cwd: ROOT, env: { ...process.env, BBY_MOCKUP_DIR: pubDir }, encoding: 'utf8' });
  expect('Publish tool refuses without a recorded ShineOn permission', refuse.status === 2 && /Refusing to publish/.test(refuse.stderr));
  try {
    const ok = spawnSync(process.execPath, ['tools/publish-mockup-pack.mjs', packPath, '--permission', 'TEST ONLY — local test server, not deployed', '--granted-by', 'test harness'], { cwd: ROOT, env: { ...process.env, BBY_MOCKUP_DIR: pubDir }, encoding: 'utf8' });
    expect('Publish tool writes kits + manifest when permission is recorded', ok.status === 0, ok.stdout.trim());
    const pc = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const pp = await pc.newPage(); await gotoApp(pp);
    const pubKits = await pp.evaluate(() => window.__bbyTest.mockups.allKits().filter((k) => k.origin === 'published').length);
    expect('A brand-new browser (nothing installed) gets the published official previews', pubKits === kitCount, `${pubKits} published scenes`);
    await openWithSampleDesign(pp, 'shineon-forever-love-necklace');
    await pp.click('text=5 · Preview');
    await pp.waitForSelector('[data-testid=preview-canvas][data-mode=official]', { timeout: 60000 });
    expect('Published mockup renders in the preview and says it was published by the administrator', /published by your BBY administrator/.test(await pp.textContent('[data-testid=mockup-info]')));
    await pc.close();
  } finally {
    for (const d of fs.readdirSync(pubDir)) if (d !== 'manifest.json') fs.rmSync(path.join(pubDir, d), { recursive: true, force: true });
    fs.writeFileSync(path.join(pubDir, 'manifest.json'), manifestBackup);
  }
  expect('Test publish cleaned up (dist/mockups back to the empty, permission-not-granted manifest)', fs.readdirSync(pubDir).length === 1 && !JSON.parse(fs.readFileSync(path.join(pubDir, 'manifest.json'), 'utf8')).permission.granted);
  expect('public/mockups (what gets deployed) still contains no ShineOn files', fs.readdirSync(path.join(ROOT, 'public/mockups')).join() === 'manifest.json');

  section('Mobile layout');
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const mp = await m.newPage(); await gotoApp(mp); await mp.click('nav >> text=Mockups');
  await mp.waitForSelector('[data-testid=mockup-table]');
  const ow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect('Mockup library has no horizontal overflow at 390px', ow <= 0, `${ow}px`);
  await m.close();

  const counts = await page.evaluate(() => { const M = window.__bbyTest.mockups; const all = M.allKits(); return { kits: all.length, products: new Set(all.flatMap((k) => k.kit.productIds)).size, verified: all.filter((k) => M.kitAccuracy(k.kit).level === 'verified').length }; });
  await ctx.close();
  return { total, counts, perProduct, installLog };
}

function writeReport({ total, counts, perProduct, installLog }, sources) {
  const passed = results.filter((r) => r.pass).length;
  const L = ['# Product Preview Accuracy Report', '', `Run: ${new Date().toISOString()} · Chrome (headless) · production build`, `Result: **${passed}/${results.length} checks passed**`, ''];
  L.push('## Summary', '',
    '| | Products |', '|---|---|',
    `| Catalog products | ${total} |`,
    `| **Accurate (official ShineOn mockup) previews published on the live site** | **0** — publishing needs ShineOn's written permission (see below) |`,
    `| Products verified in this test with official mockups installed through the app | **${counts.products}** (${counts.kits} scenes; ${counts.verified} scenes rendering-verified) |`,
    `| Products that show "requires an approved asset" until a mockup is installed | ${total} on a fresh browser; ${total - counts.products} after this test's installs |`,
    ...(sources ? [`| Products whose ShineOn mockup folder contains PSD mockups (installable) | ${sources.withPsd} |`, `| Products whose folder has only JPG/PNG photos (no design slot) | ${sources.noPsd} |`, `| Products with no ShineOn mockup folder | ${sources.noFolder} |`] : []),
    '', 'Nothing is drawn as a stand-in any more: a product either shows ShineOn\'s own mockup (with your design placed in it) or a placeholder that says an approved asset is needed.', '');
  L.push('## Why the live site starts with 0 official previews', '',
    'ShineOn\'s Terms of Service: *"Digital items (mockups, templates, images, and other design assets) … belong exclusively to ShineOn"* and are licensed to each seller as *"non-exclusive, limited, non-transferable"* for promoting ShineOn products. Bundling them into a public website and repository would redistribute them, so the app ships none. Each seller can install ShineOn\'s free PSDs into their own browser (as tested here), and the administrator can publish them for every student once ShineOn grants written permission (`docs/MOCKUP_ASSETS.md`).', '');
  L.push('## Tested products', '', '| Product | Finish | Official PSD (from the product\'s ShineOn folder) | ShineOn render match | Placement match | Design in slot | Product parts kept on top | Screenshot (local only) |', '|---|---|---|---|---|---|---|---|');
  for (const p of perProduct) {
    const c = p.verification.composite, w = p.verification.warp[0];
    L.push(`| ${p.label} | ${p.variant || 'any'} | ${p.file} | ${c ? `${c.match ? '✅' : '⚠️'} mean Δ ${c.meanDiff}, ${c.pctOver32}% px` : '—'} | ${w?.checked ? `${w.match ? '✅' : '⚠️'} offset ${w.offset.dx},${w.offset.dy}px, Δ ${w.meanDiff}` : `not checkable — ${w?.reason || '—'}`} | ${p.designVisiblePct}% of slot, ${p.changedOutsidePct}% outside${p.fit === 'contain' ? ' (fitted)' : ''} | ${p.overlayPixelsOverSlot ? `${p.overlayPixelsOverSlot.toLocaleString()} px, ${p.overlayChangedPct}% touched` : 'nothing above slot'} | ${(p.screenshots || []).find((s) => s.includes(p.variant || '')) || (p.screenshots || [])[0] || ''} |`);
  }
  L.push('', 'Columns: *ShineOn render match* — the kit re-rendered with ShineOn\'s own sample design vs the PSD\'s saved composite (mean per-pixel difference out of 255; % of pixels differing by more than 32). *Placement match* — BBY\'s perspective warp of the smart-object\'s contents vs Photoshop\'s own transformed pixels. *Design in slot* — pixels that change when the design changes (red vs blue), as % of the slot area, and the share outside the slot. *Product parts kept on top* — opaque pixels of the jewelry/hand/box drawn above the slot, and how many of them the design changed (should be 0%: the pendant hangs over the card).', '');
  L.push('### Approximations recorded per scene', '');
  for (const p of perProduct) if (p.notes.length) L.push(`- **${p.label} (${p.variant || 'any'}, ${p.file})**: ${p.notes.join('; ')}`);
  L.push('', '## Install log', '', '| Product | File | Size | Time | Finish |', '|---|---|---|---|---|');
  for (const i of installLog) L.push(`| ${i.product} | ${i.file} | ${i.sizeMB} MB | ${i.seconds}s | ${i.variant || '—'}${i.guessedVariant !== i.variant ? ` (set manually; guess: ${i.guessedVariant || 'none'})` : ''} |`);
  L.push('', '## All checks', '', '| Section | Check | Result | Detail |', '|---|---|---|---|');
  for (const r of results) L.push(`| ${r.section} | ${r.name.replace(/\|/g, '/')} | ${r.pass ? 'PASS' : '**FAIL**'} | ${String(r.detail).replace(/\|/g, '/')} |`);
  L.push('', 'Screenshots with ShineOn imagery are kept in `local-evidence/preview-tests/` (git-ignored; ShineOn\'s property). Placeholder screenshots: `docs/screenshots/preview-*.png`.');
  fs.writeFileSync(path.join(ROOT, 'docs/PREVIEW_ACCURACY_REPORT.md'), L.join('\n') + '\n');
  return { passed, total: results.length };
}

(async () => {
  if (!BROWSER) { console.error('No Chrome/Edge found; set BROWSER='); process.exit(1); }
  const server = await startServer();
  const browser = await chromium.launch({ executablePath: BROWSER, headless: true });
  let data = { total: 0, counts: { kits: 0, products: 0, verified: 0 }, perProduct: [], installLog: [] };
  try { data = await run(browser); } catch (e) { expect(`Test harness error: ${e.message.split('\n')[0]}`, false, e.stack?.split('\n').slice(1, 3).join(' ')); }
  finally { await browser.close(); server.kill(); }
  let sources = null; try { sources = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/mockup-sources.json'), 'utf8')).summary; } catch { /* optional */ }
  const { passed, total } = writeReport(data, sources);
  console.log(`\n${passed}/${total} passed`);
  process.exit(passed === total ? 0 : 1);
})();
