#!/usr/bin/env node
/**
 * BBY Product Design Studio — test runner.
 *  1. Node unit tests: product database integrity, PNG/JPEG metadata helpers.
 *  2. Browser tests (real Chrome/Edge via playwright-core) against the production build:
 *     actual exports are produced in the browser, returned as bytes, and verified here in
 *     Node with independent decoders (UPNG for PNG pixels, a separate JPEG parser).
 *  3. UI flows at desktop and mobile sizes with screenshots.
 * Writes docs/TEST_REPORT.md and docs/screenshots/*.png.
 *
 * Usage: npm run build && npm test        (BROWSER=path/to/chrome.exe to override)
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';
import { setPngDpi, setJpegDpi, inspectFile, crc32 } from '../src/lib/filemeta.js';

const require = createRequire(import.meta.url);
const UPNG = require('upng-js');
const JSZip = require('jszip');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'tests/output');
const SHOTS = path.join(ROOT, 'docs/screenshots');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
let current = 'General';
function section(name) { current = name; console.log(`\n== ${name}`); }
function record(name, pass, detail = '') {
  results.push({ section: current, name, pass, detail });
  console.log(`${pass ? '  PASS' : '  FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}
function expect(name, cond, detail) { record(name, !!cond, detail); return !!cond; }

// ---------------- independent decoders (do not reuse app code) ----------------
function pngInfo(buf) {
  const b = new Uint8Array(buf);
  const sig = [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v);
  const dv = new DataView(b.buffer, b.byteOffset);
  let o = 8; let w, h, ct, dpi = null; let crcOk = true; const types = [];
  while (o < b.length) {
    const len = dv.getUint32(o); const t = String.fromCharCode(...b.slice(o + 4, o + 8)); types.push(t);
    if (crc32(b, o + 4, o + 8 + len) !== dv.getUint32(o + 8 + len)) crcOk = false;
    if (t === 'IHDR') { w = dv.getUint32(o + 8); h = dv.getUint32(o + 12); ct = b[o + 17]; }
    if (t === 'pHYs' && b[o + 16] === 1) dpi = Math.round(dv.getUint32(o + 8) * 0.0254);
    o += 12 + len; if (t === 'IEND') break;
  }
  return { sig, w, h, colorType: ct, dpi, crcOk, physBeforeIdat: types.indexOf('pHYs') > -1 && types.indexOf('pHYs') < types.indexOf('IDAT') };
}
function jpegInfo(buf) {
  const b = new Uint8Array(buf); let o = 2; const r = { soi: b[0] === 0xff && b[1] === 0xd8, eoi: b.at(-2) === 0xff && b.at(-1) === 0xd9 };
  while (o < b.length) {
    if (b[o] !== 0xff) { o++; continue; }
    const m = b[o + 1]; if (m === 0xda) break;
    const len = (b[o + 2] << 8) | b[o + 3];
    if (m === 0xe0) { r.jfif = String.fromCharCode(...b.slice(o + 4, o + 8)) === 'JFIF'; r.units = b[o + 11]; r.xd = (b[o + 12] << 8) | b[o + 13]; r.yd = (b[o + 14] << 8) | b[o + 15]; }
    if (m === 0xc0 || m === 0xc2) { r.h = (b[o + 5] << 8) | b[o + 6]; r.w = (b[o + 7] << 8) | b[o + 8]; r.components = b[o + 9]; }
    o += 2 + len;
  }
  return r;
}
function pngPixels(buf) { const img = UPNG.decode(buf); return { w: img.width, h: img.height, rgba: new Uint8Array(UPNG.toRGBA8(img)[0]) }; }
const px = (p, x, y) => { const i = (y * p.w + x) * 4; return [p.rgba[i], p.rgba[i + 1], p.rgba[i + 2], p.rgba[i + 3]]; };
const near = (a, b, tol = 12) => a.every((v, i) => Math.abs(v - b[i]) <= tol);

// ---------------- 1. unit tests ----------------
async function unitTests() {
  section('Product database');
  const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/products.json'), 'utf8'));
  const P = db.products;
  expect('Database loads with products', P.length > 200, `${P.length} products, ${db.categories.length} categories`);
  expect('Every product has a production partner (ShineOn or SPP)', P.every((p) => ['ShineOn', 'SPP'].includes(p.productionPartner)), `${P.filter((p) => p.productionPartner === 'ShineOn').length} ShineOn / ${P.filter((p) => p.productionPartner === 'SPP').length} SPP`);
  expect('Every product has ≥1 surface with positive integer dimensions', P.every((p) => p.surfaces.length && p.surfaces.every((s) => Number.isInteger(s.width) && Number.isInteger(s.height) && s.width > 0 && s.height > 0)));
  expect('Every product has a format', P.every((p) => p.formats.length && p.formats.every((f) => ['PNG', 'JPG', 'SVG'].includes(f))));
  expect('Every product has a status of VERIFIED or NEEDS VERIFICATION', P.every((p) => ['VERIFIED', 'NEEDS VERIFICATION'].includes(p.specStatus)));
  expect('Every NEEDS VERIFICATION product explains why', P.filter((p) => p.specStatus !== 'VERIFIED').every((p) => p.statusReasons.length > 0));
  expect('Every product cites the requirements article as a source', P.every((p) => p.sources.some((s) => /32366681952017/.test(s.url))));
  expect('Every product has a last-verified date', P.every((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.lastVerified)));
  expect('Unique product ids', new Set(P.map((p) => p.id)).size === P.length);
  expect('Not all products are 1000×1000', new Set(P.map((p) => `${p.surfaces[0].width}x${p.surfaces[0].height}`)).size > 50, `${new Set(P.map((p) => `${p.surfaces[0].width}x${p.surfaces[0].height}`)).size} distinct sizes`);
  const find = (re) => P.find((p) => re.test(p.name));
  const exp = [[/Rotating Rose Box/, 650, 602], [/Red Heart Rose Box/, 780, 780], [/^Open Work Watch with MC$/, 1000, 1077], [/^Graphic Circle Keychain$/, 2000, 2000], [/^Graphic Heart Keychain$/, 2000, 1959], [/^Endless Love Necklace$/, 1000, 1000], [/^Engraved Metal Wallet$/, 1300, 946]];
  for (const [re, w, h] of exp) { const p = find(re); expect(`Spec: ${p?.name} = ${w}×${h}`, p && p.surfaces[0].width === w && p.surfaces[0].height === h, p ? `${p.surfaces[0].width}×${p.surfaces[0].height}` : 'missing'); }
  const wallet = find(/^Engraved Metal Wallet$/);
  expect('Engraved Metal Wallet has front 1300×946 and back 898×448', wallet.surfaces.length === 2 && wallet.surfaces[1].width === 898 && wallet.surfaces[1].height === 448);
  expect('SPP products are never labelled ShineOn-made', P.filter((p) => ['Bags', 'Blankets', 'Apparel', 'Kitchen'].includes(p.category)).every((p) => p.productionPartner === 'SPP'));
  const cats = ['Simple Pendants', 'Graphic', 'Buyer Upload', 'Engraved', 'Name Necklace', "Men's", 'Unique Gift Boxes', 'Printed Acrylic', 'Engraved Acrylic', 'Watches', 'Bracelets', 'Keychains', 'Engraved Gifts', 'Rings', 'Leather Products', 'Bundles', 'Posters', 'Bags', 'Blankets', 'Pillows', 'Rubber Backed Mats', 'Towels', 'Table', 'Kitchen', 'Seasonal', 'Office & Crafts', 'Toys & Games', 'Wall Clocks', 'Wall Tapestries', 'Metal Prints', 'Gallery Wrapped Canvas', 'Apparel'];
  const missing = cats.filter((c) => !P.some((p) => p.category === c));
  expect('All 32 ShineOn/SPP requirement sections are represented (33 incl. both Posters sections)', !missing.length, missing.join(', ') || `${db.categories.length} category/partner groups`);

  section('File metadata helpers');
  const tiny = new Uint8Array(UPNG.encode([new Uint8Array(4 * 4 * 4).fill(255).buffer], 4, 4, 0));
  const withDpi = setPngDpi(tiny, 300);
  const i1 = pngInfo(withDpi.buffer);
  expect('setPngDpi writes 300 DPI pHYs before IDAT with valid CRCs', i1.dpi === 300 && i1.physBeforeIdat && i1.crcOk, JSON.stringify({ dpi: i1.dpi, crc: i1.crcOk }));
  const again = pngInfo(setPngDpi(withDpi, 150).buffer);
  expect('setPngDpi replaces an existing pHYs (no duplicates)', again.dpi === 150);
  expect('inspectFile reads PNG dims/DPI', (() => { const r = inspectFile(withDpi, 'PNG'); return r.width === 4 && r.dpi === 300; })());
  const fakeJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xc0, 0, 11, 8, 0, 20, 0, 30, 1, 1, 0x11, 0, 0xff, 0xd9]);
  const j = jpegInfo(setJpegDpi(fakeJpeg, 150).buffer);
  expect('setJpegDpi sets JFIF density to 150 DPI', j.units === 1 && j.xd === 150 && j.yd === 150 && j.w === 30 && j.h === 20, JSON.stringify(j));
  const svgOk = inspectFile('<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="996" viewBox="0 0 1000 996"><path d="M0 0" style="fill: rgb(0,0,0); stroke: none"/></svg>', 'SVG');
  expect('inspectSvgText reads width/height/viewBox and paint colours', svgOk.width === 1000 && svgOk.height === 996 && svgOk.viewBox[3] === 996 && svgOk.paintColors.includes('rgb(0,0,0)'));
}

// ---------------- 2. browser tests ----------------
function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [path.join(ROOT, 'node_modules/vite/bin/vite.js'), 'preview', '--port', '4173', '--strictPort'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' } });
    let out = '';
    // eslint-disable-next-line no-control-regex
    const onData = (d) => { out += String(d).replace(/\x1b\[[0-9;]*m/g, ''); if (/localhost:4173/.test(out)) resolve(proc); };
    proc.stdout.on('data', onData); proc.stderr.on('data', onData);
    proc.on('exit', (c) => reject(new Error(`preview exited ${c}: ${out}`)));
    setTimeout(() => reject(new Error(`preview did not start: ${out}`)), 30000);
  });
}

const BROWSER = process.env.BROWSER || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p));

// Page-side case runner, installed once per page.
const PAGE_RUNNER = () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function waitFor(fn, ms = 20000) { const t = Date.now(); while (Date.now() - t < ms) { try { const v = fn(); if (v) return v; } catch { /* retry */ } await sleep(50); } throw new Error('timeout waiting for condition'); }
  const toB64 = async (blob) => { const b = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
  async function makeImageFile(w, h, kind) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    if (kind === 'noise') { const id = x.createImageData(w, h); for (let i = 0; i < id.data.length; i++) id.data[i] = (i % 4 === 3) ? 255 : (Math.random() * 255) | 0; x.putImageData(id, 0, 0); }
    else if (kind === 'logo') { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.fillStyle = '#000'; x.beginPath(); x.arc(w / 2, h / 2, Math.min(w, h) * 0.35, 0, 7); x.fill(); x.fillStyle = '#fff'; x.fillRect(w * 0.42, h * 0.2, w * 0.16, h * 0.6); }
    else { const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#ff4d6d'); g.addColorStop(0.5, '#ffd166'); g.addColorStop(1, '#118ab2'); x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = '#073b4c'; x.fillRect(w * 0.25, h * 0.25, w * 0.5, h * 0.5); }
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    return new File([blob], `test-${kind}-${w}x${h}.png`, { type: 'image/png' });
  }
  async function openNew(productId, opts = {}) {
    const T = window.__bbyTest; const product = T.db.byId.get(productId);
    if (!product) throw new Error(`no product ${productId}`);
    const p = T.newProject(product, opts); await T.saveProject(p); T.openProject(p);
    await waitFor(() => window.__bbyStudio && window.__bbyStudio.project.current.id === p.id && window.__bbyStudio.editorRef.current && window.__bbyStudio.editorRef.current.undoStack.length >= 1);
    return { T, product, p };
  }
  async function applyOps(ops) {
    const S = window.__bbyStudio; const E = () => S.editorRef.current; const out = {};
    for (const op of ops) {
      if (op.op === 'surface') { const prev = E(); S.setActiveSurface(op.id); await waitFor(() => E() && E() !== prev && E().surface.id === op.id && E().undoStack.length >= 1); }
      if (op.op === 'bg') E().setBackground({ kind: op.kind || 'color', color: op.color, color2: op.color2, angle: op.angle });
      if (op.op === 'nobg') E().setBackground({ kind: 'none' });
      if (op.op === 'text') { const t = E().addText(op.text, op.opts || {}); if (op.pos) { t.set(op.pos); t.setCoords(); E().commit(); } }
      if (op.op === 'rect') { const r = E().addShape('rect'); r.set({ left: op.left, top: op.top, width: op.width, height: op.height, scaleX: 1, scaleY: 1, fill: op.fill, angle: 0 }); r.setCoords(); E().commit(); }
      if (op.op === 'shape') E().addShape(op.kind);
      if (op.op === 'deco') await E().addDecoration(op.id);
      if (op.op === 'image') { const f = await makeImageFile(op.w, op.h, op.kind); const img = await E().addImageFile(f); if (op.fill) { E().canvas.setActiveObject(img); E().fitSelection('fill'); } out.lastImage = img; }
      if (op.op === 'crop') { const img = out.lastImage; E().crop(img, op.frac); out.crop = { w: img.width, h: img.height, cropX: img.cropX, cropY: img.cropY }; }
      if (op.op === 'trace') { await E().traceToVector(out.lastImage || E().canvas.getObjects().find((o) => o.type === 'image'), { threshold: 128 }); }
      if (op.op === 'black') E().makeAllBlack();
    }
    await sleep(300);
    return out;
  }
  async function buildAll(format, opts = {}, withBytes = true) {
    const S = window.__bbyStudio; const T = window.__bbyTest; const product = S.product; const res = [];
    for (const s of product.surfaces) {
      const r = await T.buildSurface(product, s, S.getSurfaceJSON(s.id), { format, ...opts });
      res.push({ surface: s, ok: r.ok, checks: r.checks, format: r.format, size: r.size, fileName: r.fileName, inspect: r.inspect, b64: withBytes && r.blob ? await toB64(r.blob) : null, _blob: r.blob });
    }
    const ready = T.readiness(product, product.variants.find((v) => v.id === S.project.current.variantId), res);
    window.__lastBuild = res;
    return { res: res.map(({ _blob, ...x }) => x), ready, specStatus: product.specStatus };
  }
  /** Rasterise an exported SVG and compare its dark pixels with the PNG export of the same design. */
  async function svgVsPng(surfaceIdx = 0) {
    const S = window.__bbyStudio; const T = window.__bbyTest; const product = S.product; const s = product.surfaces[surfaceIdx];
    const json = S.getSurfaceJSON(s.id);
    const svg = await T.buildSurface(product, s, json, { format: 'SVG' });
    const png = await T.buildSurface({ ...product, formats: ['PNG'], dpi: 300 }, s, json, { format: 'PNG' });
    const load = (blob) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('image failed to load')); i.src = URL.createObjectURL(blob); });
    const [a, b] = await Promise.all([load(svg.blob), load(png.blob)]);
    const draw = (img) => { const c = document.createElement('canvas'); c.width = s.width; c.height = s.height; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, s.width, s.height); return x.getImageData(0, 0, c.width, c.height).data; };
    const da = draw(a), db = draw(b); let darkA = 0, darkB = 0, diff = 0;
    for (let i = 0; i < da.length; i += 4) { const ka = da[i] < 128, kb = db[i] < 128; darkA += ka; darkB += kb; if (ka !== kb) diff++; }
    return { svgRendered: a.naturalWidth > 0, darkSvg: darkA, darkPng: darkB, mismatch: diff / Math.max(darkA, darkB, 1) };
  }
  window.__case = { openNew, applyOps, buildAll, svgVsPng, waitFor };
};

async function browserTests(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://localhost:4173/');
  await page.waitForFunction(() => window.__bbyTest, null, { timeout: 30000 });
  await page.evaluate(`(${PAGE_RUNNER.toString()})()`);
  const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/products.json'), 'utf8'));
  const id = (re) => db.products.find((p) => re.test(p.name)).id;
  const save = (name, b64) => { const buf = Buffer.from(b64, 'base64'); fs.writeFileSync(path.join(OUT, name), buf); return buf; };

  async function runCase(title, productRe, ops, { format, opts, withBytes = true, open = {} } = {}) {
    section(title);
    const t0 = Date.now();
    const r = await page.evaluate(async ({ pid, ops, format, opts, withBytes, open }) => {
      await window.__case.openNew(pid, open); const extra = await window.__case.applyOps(ops);
      const b = await window.__case.buildAll(format, opts, withBytes); return { ...b, extra };
    }, { pid: id(productRe), ops, format, opts: opts || {}, withBytes, open });
    r.ms = Date.now() - t0;
    return r;
  }
  const checkStatus = (r, idx, cid) => r.res[idx].checks.find((c) => c.id === cid)?.status;
  const verifyPng = (r, idx, w, h, dpi, maxMB) => {
    const f = r.res[idx]; const buf = save(f.fileName, f.b64); const i = pngInfo(buf);
    expect(`${f.fileName}: valid PNG (signature + all CRCs)`, i.sig && i.crcOk);
    expect(`${f.fileName}: exactly ${w}×${h}px`, i.w === w && i.h === h, `${i.w}×${i.h}`);
    expect(`${f.fileName}: ${dpi} DPI metadata`, i.dpi === dpi, `pHYs=${i.dpi}`);
    expect(`${f.fileName}: under ${maxMB} MB`, buf.length < maxMB * 1e6, `${(buf.length / 1e6).toFixed(2)} MB`);
    return { buf, info: i, pix: pngPixels(buf) };
  };

  // --- 1000×1000 pendant message card ---
  let r = await runCase('Export: 1000×1000 pendant message card (Endless Love Necklace)', /^Endless Love Necklace$/, [
    { op: 'bg', color: '#ffffff' }, { op: 'rect', left: 100, top: 100, width: 200, height: 200, fill: '#000000' },
    { op: 'rect', left: 700, top: 650, width: 150, height: 120, fill: '#ff0000' },
    { op: 'text', text: 'Love you Mom', opts: { fontFamily: 'Great Vibes', fill: '#0b1530' }, pos: { left: 150, top: 820 } },
  ], { format: 'PNG' });
  let v = verifyPng(r, 0, 1000, 1000, 300, 5);
  expect('Image positioning: black square at (100..300) lands at pixel (200,200)', near(px(v.pix, 200, 200), [0, 0, 0, 255]), px(v.pix, 200, 200).join(','));
  expect('Image positioning: red rect at (700,650) lands at pixel (775,700)', near(px(v.pix, 775, 700), [255, 0, 0, 255]), px(v.pix, 775, 700).join(','));
  expect('Background white outside elements (pixel 500,500 under jewelry zone)', near(px(v.pix, 500, 500), [255, 255, 255, 255]));
  let dark = 0; for (let y = 820; y < 990; y++) for (let x = 150; x < 850; x++) { const p = px(v.pix, x, y); if (p[0] < 120 && p[2] < 160) dark++; }
  expect('Text positioning: script text rendered in the box it was placed (y≥820)', dark > 1500, `${dark} dark text pixels`);
  expect('In-app validation passed and product is PRODUCTION-READY (verified spec)', r.res[0].ok && r.ready.productionReady, r.ready.reasons.join(' | '));

  // --- 650×602 Rotating Rose Box with transparency ---
  r = await runCase('Export: 650×602 Rotating Rose Box card with transparency', /^Alluring Beauty Necklace with Rotating Rose Box$/, [
    { op: 'nobg' }, { op: 'deco', id: 'heart' }, { op: 'text', text: 'Forever', opts: { fontFamily: 'Cinzel' } },
  ], { format: 'PNG' });
  v = verifyPng(r, 0, 650, 602, 300, 5);
  expect('Transparency preserved (RGBA PNG, corner pixel alpha 0)', v.info.colorType === 6 && px(v.pix, 3, 3)[3] === 0, `colorType ${v.info.colorType}, corner alpha ${px(v.pix, 3, 3)[3]}`);
  expect('Centre pixel opaque (heart drawn)', px(v.pix, 325, 301)[3] === 255);
  expect('Validation passed', r.res[0].ok, r.res[0].checks.filter((c) => c.status !== 'pass').map((c) => c.label).join(', '));

  // --- 780×780 Red Heart Rose Box ---
  r = await runCase('Export: 780×780 Red Heart Rose Box card', /^Love Knot Necklace with Red Heart Rose Box$/, [
    { op: 'bg', kind: 'gradient', color: '#ffe3ea', color2: '#ffffff', angle: 180 }, { op: 'text', text: 'To my wife', opts: { fontFamily: 'Playfair Display' } },
  ], { format: 'PNG' });
  v = verifyPng(r, 0, 780, 780, 300, 5);
  expect('Gradient background rendered (top pinker than bottom)', px(v.pix, 390, 5)[1] < px(v.pix, 390, 775)[1], `${px(v.pix, 390, 5)} vs ${px(v.pix, 390, 775)}`);
  expect('Validation passed and PRODUCTION-READY', r.res[0].ok && r.ready.productionReady);

  // --- 1000×1077 watch ---
  r = await runCase('Export: 1000×1077 watch message card (Open Work Watch with MC)', /^Open Work Watch with MC$/, [
    { op: 'bg', color: '#0b1530' }, { op: 'text', text: 'Time with you', opts: { fill: '#ffffff', fontFamily: 'Montserrat' } },
  ], { format: 'PNG' });
  v = verifyPng(r, 0, 1000, 1077, 300, 5);
  expect('File checks pass', r.res[0].ok);
  expect('NOT marked production-ready because spec NEEDS VERIFICATION (no advice article)', !r.ready.productionReady && r.specStatus === 'NEEDS VERIFICATION', r.ready.reasons[0]);

  // --- 2000×2000 graphic circle keychain with a photo ---
  r = await runCase('Export: 2000×2000 graphic circle keychain with uploaded photo', /^Graphic Circle Keychain$/, [
    { op: 'image', w: 1600, h: 1200, kind: 'photo', fill: true }, { op: 'text', text: 'BUDDY', opts: { fontFamily: 'Bebas Neue', fill: '#ffffff' } },
  ], { format: 'PNG' });
  v = verifyPng(r, 0, 2000, 2000, 300, 5);
  expect('Uploaded photo fills the artwork (corner pixel opaque, not white)', px(v.pix, 10, 10)[3] === 255 && !near(px(v.pix, 10, 10), [255, 255, 255, 255]));
  const up = r.res[0].checks.find((c) => c.id === 'upscale');
  expect('Upscale warning raised for 1600×1200 photo filled to 2000×2000 (scale 1.67)', up && up.status === 'warn', up?.detail || 'no warning');
  expect('Validation passed', r.res[0].ok, r.res[0].checks.filter((c) => c.status === 'fail').map((c) => c.detail).join(' | '));

  // --- 2000×1959 heart keychain ---
  r = await runCase('Export: 2000×1959 graphic heart keychain', /^Graphic Heart Keychain$/, [
    { op: 'bg', color: '#1f8bff' }, { op: 'deco', id: 'paw' }, { op: 'image', w: 800, h: 800, kind: 'photo' }, { op: 'crop', frac: { l: 0.25, t: 0, r: 0, b: 0.25 } },
  ], { format: 'PNG' });
  v = verifyPng(r, 0, 2000, 1959, 300, 5);
  expect('Crop applied: 800px image cropped 25% left / 25% bottom → 600×600 source', r.extra.crop.w === 600 && r.extra.crop.h === 600 && r.extra.crop.cropX === 200, JSON.stringify(r.extra.crop));
  expect('Validation passed', r.res[0].ok);

  // --- SVG engraving ---
  r = await runCase('Export: SVG engraving (Non-MC Engraved Heart Necklace 1000×996)', /^Non-MC Engraved Heart Necklace$/, [
    { op: 'shape', kind: 'circle' }, { op: 'text', text: 'Always', opts: { fontFamily: 'Great Vibes' } }, { op: 'deco', id: 'heart' },
  ], { format: 'SVG' });
  let f = r.res[0]; let svg = save(f.fileName, f.b64).toString('utf8');
  expect('SVG has width=1000 height=996 and viewBox 0 0 1000 996', /width="1000"/.test(svg) && /height="996"/.test(svg) && /viewBox="0 0 1000 996"/.test(svg));
  expect('SVG text converted to outlines (no <text>)', !/<text\b/.test(svg));
  expect('SVG contains no raster images and no scripts', !/<image\b/.test(svg) && !/<script/i.test(svg));
  const paints = [...svg.matchAll(/(?:fill|stroke):\s*([^;"]+)/g)].map((m) => m[1].trim()).filter((c) => c !== 'none');
  expect('SVG artwork is solid black only', paints.length > 0 && paints.every((c) => /^rgb\(0,\s*0,\s*0\)$|^#000000$|^black$/i.test(c)), [...new Set(paints)].join(', '));
  expect('Validation passed (solid black, vector, outlined text)', f.ok, f.checks.filter((c) => c.status === 'fail').map((c) => c.detail).join(' | '));
  const cmp = await page.evaluate(() => window.__case.svgVsPng(0));
  expect('SVG renders in the browser and matches the PNG render (text/shape positioning)', cmp.svgRendered && cmp.mismatch < 0.06, `mismatch ${(cmp.mismatch * 100).toFixed(2)}% of ${cmp.darkPng} dark px`);

  section('Engraving error detection and correction');
  r = await page.evaluate(async (pid) => {
    await window.__case.openNew(pid); await window.__case.applyOps([{ op: 'rect', left: 100, top: 100, width: 300, height: 300, fill: '#1f8bff' }, { op: 'image', w: 300, h: 300, kind: 'logo' }]);
    const before = await window.__case.buildAll('SVG', {}, false);
    await window.__case.applyOps([{ op: 'black' }, { op: 'trace' }]);
    const after = await window.__case.buildAll('SVG', {}, false);
    return { before, after };
  }, id(/^Non-MC Engraved Heart Necklace$/));
  const st = (b, cid) => b.res[0].checks.find((c) => c.id === cid)?.status;
  expect('Coloured shape flagged (engrave-color FAIL) with "Make all black" fix', st(r.before, 'engrave-color') === 'fail' && r.before.res[0].checks.find((c) => c.id === 'engrave-color').fix === 'make-black');
  expect('Raster photo in SVG flagged (engrave-vector FAIL) with trace fix', st(r.before, 'engrave-vector') === 'fail');
  expect('After "Make all black" + "Trace to vector", all checks pass', r.after.res[0].ok && st(r.after, 'engrave-color') === 'pass' && st(r.after, 'engrave-vector') === 'pass', r.after.res[0].checks.filter((c) => c.status === 'fail').map((c) => c.detail).join(' | '));

  // --- multi-surface ---
  r = await runCase('Export: multiple surfaces (Engraved Metal Wallet front 1300×946 + back 898×448)', /^Engraved Metal Wallet$/, [
    { op: 'text', text: 'FRONT', opts: { fontFamily: 'Oswald' } }, { op: 'surface', id: 'back' }, { op: 'text', text: 'BACK', opts: { fontFamily: 'Oswald' } }, { op: 'deco', id: 'cross' },
  ], { format: 'PNG' });
  expect('Two files built', r.res.length === 2, r.res.map((x) => x.fileName).join(', '));
  const vf = verifyPng(r, 0, 1300, 946, 300, 25); const vb = verifyPng(r, 1, 898, 448, 300, 25);
  expect('Front and back contain their own content', vf.pix.rgba.some((x, i) => i % 4 === 3 && x > 0) && vb.pix.rgba.some((x, i) => i % 4 === 3 && x > 0));
  expect('Both surfaces passed validation', r.res.every((x) => x.ok));
  r = await runCase('Export: double-sided product (Custom Cut Acrylic Ornament Double Sided)', /^Custom Cut Acrylic Ornament Double Sided$/, [
    { op: 'deco', id: 'star' }, { op: 'surface', id: 'side-b' }, { op: 'deco', id: 'moon' },
  ], { format: 'PNG' });
  verifyPng(r, 0, 3540, 3186, 300, 25); verifyPng(r, 1, 3540, 3186, 300, 25);
  expect('Not production-ready: Side B requirement NEEDS VERIFICATION', !r.ready.productionReady);

  // --- JPG + no transparency ---
  r = await runCase('Export: JPG, no transparency (Classic Tote Bag 2925×5850, 150 DPI)', /^Classic Tote Bag$/, [
    { op: 'nobg' }, { op: 'deco', id: 'flower' }, { op: 'text', text: 'Garden Club', opts: { fontFamily: 'Pacifico' } },
  ], { format: 'JPG', opts: { flattenColor: '#ffffff' } });
  f = r.res[0]; let buf = save(f.fileName, f.b64); let ji = jpegInfo(buf);
  expect('Valid JPEG (SOI/EOI, JFIF)', ji.soi && ji.eoi && ji.jfif);
  expect('Exactly 2925×5850px', ji.w === 2925 && ji.h === 5850, `${ji.w}×${ji.h}`);
  expect('150 DPI in JFIF header', ji.units === 1 && ji.xd === 150 && ji.yd === 150, `units ${ji.units} ${ji.xd}×${ji.yd}`);
  expect('Under 100 MB', buf.length < 100e6, `${(buf.length / 1e6).toFixed(2)} MB`);
  expect('Transparent areas filled (warned, not failed)', checkStatus(r, 0, 'transparency') === 'warn' && f.ok);

  r = await runCase('Export: PNG product that forbids transparency (Printed Canvas Poster 8"×10")', /^Printed Canvas Poster \(8" x 10"\)$/, [
    { op: 'nobg' }, { op: 'deco', id: 'butterfly' },
  ], { format: 'PNG', opts: { flattenColor: '#fdf6e3' } });
  v = verifyPng(r, 0, 2400, 3000, 300, 100);
  let minA = 255; for (let i = 3; i < v.pix.rgba.length; i += 4) if (v.pix.rgba[i] < minA) minA = v.pix.rgba[i];
  expect('Every pixel fully opaque (flattened)', minA === 255, `min alpha ${minA}`);
  expect('Flatten colour applied at corner (#fdf6e3)', near(px(v.pix, 2, 2), [253, 246, 227, 255], 3), px(v.pix, 2, 2).join(','));

  // --- file size limit + optimisation ---
  r = await runCase('File size: oversize detection and PNG optimisation (2000×2000 keychain, noise photo)', /^Graphic Circle Keychain$/, [
    { op: 'image', w: 2000, h: 2000, kind: 'noise', fill: true },
  ], { format: 'PNG', withBytes: false });
  const sizeCheck = r.res[0].checks.find((c) => c.id === 'size');
  expect('Oversize PNG detected as FAIL with optimise fix', sizeCheck.status === 'fail' && sizeCheck.fix === 'optimize-png', sizeCheck.detail);
  const opt = await page.evaluate(() => window.__case.buildAll('PNG', { optimizePng: true }, true));
  f = opt.res[0]; buf = save(`optimised_${f.fileName}`, f.b64); const oi = pngInfo(buf);
  const optSize = f.checks.find((c) => c.id === 'size');
  expect('Optimised PNG keeps 2000×2000 and 300 DPI, valid CRCs', oi.w === 2000 && oi.h === 2000 && oi.dpi === 300 && oi.crcOk);
  record('Optimised PNG fits under 5 MB', optSize.status === 'pass', optSize.detail);

  // --- very large export ---
  r = await runCase('Export: very large JPG (High Gloss Poster 3:2, 14550×9750 = 142 MP)', /^High Gloss Poster \(3:2\)$/, [
    { op: 'bg', kind: 'gradient', color: '#0b1530', color2: '#1f8bff', angle: 90 }, { op: 'text', text: 'Big print test' },
  ], { format: 'JPG', withBytes: true });
  f = r.res[0];
  if (f.b64) { buf = save(f.fileName, f.b64); ji = jpegInfo(buf); expect('14550×9750 JPEG at 300 DPI, under 100 MB', ji.w === 14550 && ji.h === 9750 && ji.xd === 300 && buf.length < 100e6, `${ji.w}×${ji.h} ${ji.xd}dpi ${(buf.length / 1e6).toFixed(1)}MB in ${(r.ms / 1000).toFixed(1)}s`); }
  else expect('Large export rendered', false, f.checks.map((c) => c.detail).join(' | '));

  // --- undo / redo ---
  section('Editor: undo / redo / layers');
  const ur = await page.evaluate(async (pid) => {
    await window.__case.openNew(pid); const E = window.__bbyStudio.editorRef.current; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const n0 = E.canvas.getObjects().length; E.addText('one'); await sleep(400); E.addText('two'); await sleep(400);
    const n2 = E.canvas.getObjects().length; await E.undo(); const n1 = E.canvas.getObjects().length; await E.redo(); const n3 = E.canvas.getObjects().length;
    E.layerOp(n3 - 1, 'down'); const order = E.canvas.getObjects().map((o) => o.text || o.layerName);
    E.layerOp(0, 'toggleVisible'); const vis = E.canvas.getObjects()[0].visible;
    return { n0, n2, n1, n3, order, vis };
  }, id(/^Endless Love Necklace$/));
  expect('Undo removes the last added object', ur.n1 === ur.n2 - 1, JSON.stringify(ur));
  expect('Redo restores it', ur.n3 === ur.n2);
  expect('Layer move down reorders layers', ur.order.at(-1) === 'one' && ur.order.at(-2) === 'two', ur.order.join(' > '));

  // --- projects ---
  section('Projects: save, reopen, rename, duplicate, delete, backup, import');
  const pr = await page.evaluate(async (pid) => {
    const C = window.__case; const T = window.__bbyTest;
    const { p } = await C.openNew(pid); await C.applyOps([{ op: 'image', w: 500, h: 500, kind: 'photo' }, { op: 'text', text: 'Saved text' }]);
    await window.__bbyStudio.persist();
    const saved = await T.getProject(p.id);
    const surf = JSON.parse(saved.surfaces[Object.keys(saved.surfaces)[0]]);
    const blob = await T.exportBackup([saved]);
    const b = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    const before = (await T.listProjects()).length;
    await T.deleteProject(p.id);
    const afterDelete = (await T.listProjects()).length;
    const imported = await T.importBackup(blob);
    const re = await T.getProject(imported[0].id);
    // reopen imported project in the studio and build it
    T.openProject(re);
    await C.waitFor(() => window.__bbyStudio.project.current.id === re.id && window.__bbyStudio.editorRef.current?.undoStack.length >= 1);
    const objs = window.__bbyStudio.editorRef.current.canvas.getObjects().map((o) => o.type);
    const built = await C.buildAll('PNG', {}, false);
    return { savedObjects: surf.objects.length, hasAsset: surf.objects.some((o) => o.assetId), backupB64: btoa(s), before, afterDelete, importedName: re.name, importedSurfaces: Object.keys(re.surfaces).length, reopenedTypes: objs, builtOk: built.res[0].ok, sameJSON: JSON.stringify(JSON.parse(re.surfaces[Object.keys(re.surfaces)[0]]).objects.map((o) => o.type)) === JSON.stringify(surf.objects.map((o) => o.type)) };
  }, id(/^Graphic Circle Keychain$/));
  expect('Project saved to IndexedDB with image referenced by assetId', pr.savedObjects >= 2 && pr.hasAsset, `${pr.savedObjects} objects`);
  expect('Delete removes the project', pr.afterDelete === pr.before - 1, `${pr.before} → ${pr.afterDelete}`);
  const zip = await JSZip.loadAsync(Buffer.from(pr.backupB64, 'base64'));
  const files = Object.keys(zip.files);
  fs.writeFileSync(path.join(OUT, 'project-backup.zip'), Buffer.from(pr.backupB64, 'base64'));
  expect('Backup ZIP contains manifest, project JSON and the image asset', files.includes('manifest.json') && files.some((x) => x.startsWith('projects/')) && files.some((x) => x.startsWith('assets/') && x.endsWith('.png')), files.join(', '));
  expect('Imported project restored with identical layers', pr.sameJSON && pr.importedSurfaces >= 1, pr.reopenedTypes.join(','));
  expect('Imported project reopens in the editor (image + text) and builds', pr.reopenedTypes.includes('image') && pr.reopenedTypes.includes('textbox') && pr.builtOk);

  // --- prompts ---
  section('AI Prompt Assistant (no API calls)');
  const pp = await page.evaluate((ids) => {
    const T = window.__bbyTest; const g = (pid, f) => { const p = T.db.byId.get(pid); return T.buildPrompt(p, p.surfaces[0], f); };
    return {
      engr: g(ids.engr, { purpose: 'engraving', subject: 'a paw print and heart' }),
      card: g(ids.card, { purpose: 'floral', subject: 'peonies', recipient: 'mom' }),
      msg: g(ids.card, { purpose: 'gift-message', recipient: 'mom', occasion: "Mother's Day" }),
      blanket: g(ids.blanket, { purpose: 'family', subject: 'family tree' }),
    };
  }, { engr: id(/^Non-MC Engraved Heart Necklace$/), card: id(/^Endless Love Necklace$/), blanket: id(/^Sherpa Fleece Blanket \(3:4\)$/) });
  expect('Engraving prompt demands solid black on white, no text', /solid black/i.test(pp.engr.prompt) && /no grey/i.test(pp.engr.prompt) && /Do not include any words/i.test(pp.engr.prompt));
  expect('Message-card prompt keeps the centre clear for the jewelry', /centre area/i.test(pp.card.prompt) && pp.card.ratio === '1:1');
  expect('Gift-message prompt limits words for a 3×3" card', /under 25 words/.test(pp.msg.prompt) && pp.msg.kind === 'text');
  expect('Blanket prompt uses product aspect ratio and opaque background', pp.blanket.ratio === '3:4' && /fully opaque/i.test(pp.blanket.prompt), pp.blanket.ratio);
  const net = []; page.on('request', (q) => { if (/^https?:/.test(q.url()) && !q.url().startsWith('http://localhost:4173')) net.push(q.url()); });

  // --- UI flow desktop ---
  section('UI flow — desktop 1440×900');
  await page.goto('http://localhost:4173/'); await page.waitForSelector('.pcard');
  await page.screenshot({ path: path.join(SHOTS, 'desktop-1-catalog.png') });
  await page.fill('input[type=search]', 'rotating rose');
  const n = await page.locator('.pcard').count();
  expect('Catalog search filters products', n === 3, `${n} results for "rotating rose"`);
  await page.locator('.pcard').first().click();
  await page.waitForSelector('text=Step 2 — Choose your artwork type');
  await page.screenshot({ path: path.join(SHOTS, 'desktop-2-setup.png'), fullPage: true });
  await page.click('text=Start designing');
  await page.waitForSelector('[data-testid=canvas-holder] canvas');
  await page.waitForFunction(() => window.__bbyStudio?.editorRef.current?.undoStack.length >= 1);
  await page.click('text=🔤 Add text');
  await page.locator('[data-testid=upload-input]').setInputFiles({ name: 'ai-art.png', mimeType: 'image/png', buffer: Buffer.from(UPNG.encode([new Uint8Array(300 * 300 * 4).map((_, i) => (i % 4 === 3 ? 255 : (i % 4 === 0 ? 200 : 60))).buffer], 300, 300, 0)) });
  await page.waitForFunction(() => window.__bbyStudio.editorRef.current.canvas.getObjects().some((o) => o.type === 'image'));
  await page.click('text=⯇').catch(() => {});
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(SHOTS, 'desktop-3-editor.png') });
  const uiObjs = await page.evaluate(() => window.__bbyStudio.editorRef.current.canvas.getObjects().map((o) => o.type + (o.isBackground ? '(bg)' : '')));
  expect('Editor: new message card starts on white; add text + upload image through the UI', uiObjs.length === 3 && uiObjs[0] === 'rect(bg)' && uiObjs.includes('textbox') && uiObjs.includes('image'), uiObjs.join(', '));
  await page.fill('.project-name', 'Mom rose box — test');
  await page.click('text=4 · AI prompts');
  await page.click('text=📋 COPY PROMPT').catch(() => {});
  await page.screenshot({ path: path.join(SHOTS, 'desktop-4-ai.png'), fullPage: true });
  expect('AI prompt rendered', (await page.textContent('[data-testid=prompt-output]')).length > 80);
  await page.click('text=5 · Preview');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SHOTS, 'desktop-5-preview.png'), fullPage: true });
  await page.click('text=6–7 · Build & download');
  await page.click('[data-testid=build-button]');
  await page.waitForSelector('[data-testid=ready-banner]', { timeout: 60000 });
  const banner = await page.textContent('[data-testid=ready-banner]');
  await page.screenshot({ path: path.join(SHOTS, 'desktop-6-build.png'), fullPage: true });
  expect('Build through the UI shows a validation banner', /PRODUCTION-READY/.test(banner), banner.trim());
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-testid=zip-button]')]);
  const zp = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(zp);
  const z2 = await JSZip.loadAsync(fs.readFileSync(zp));
  expect('ZIP download contains the PNG + BUILD_REPORT.txt + build-report.json', Object.keys(z2.files).some((x) => /650x602_300dpi\.png$/.test(x)) && z2.files['BUILD_REPORT.txt'] && z2.files['build-report.json'], Object.keys(z2.files).join(', '));
  await page.click('text=My Projects');
  await page.waitForSelector('.proj');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SHOTS, 'desktop-7-projects.png') });
  const firstName = await page.locator('.proj input[type=text]').first().inputValue();
  expect('Renamed project appears in My Projects', /Mom rose box — test/.test(firstName), firstName);
  const before = await page.locator('.proj').count();
  await page.locator('.proj').first().locator('text=Duplicate').click(); await page.waitForTimeout(500);
  expect('Duplicate adds a copy', (await page.locator('.proj').count()) === before + 1);
  await page.locator('.proj').first().locator('text=Delete').click(); await page.locator('.proj').first().locator('text=Confirm delete').click(); await page.waitForTimeout(500);
  expect('Delete (with confirmation) removes it', (await page.locator('.proj').count()) === before);
  expect('No requests to external hosts (no AI/API calls)', net.length === 0, net.slice(0, 3).join(', ') || 'none');
  expect('No uncaught page errors', errors.length === 0, errors.slice(0, 3).join(' | ') || 'none');
  await ctx.close();
}

async function mobileTests(browser) {
  section('UI flow — mobile 390×844 and tablet 820×1180');
  for (const [label, vp] of [['mobile', { width: 390, height: 844 }], ['tablet', { width: 820, height: 1180 }]]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: label === 'mobile', hasTouch: true });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://localhost:4173/'); await page.waitForSelector('.pcard');
    const over = async () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await page.screenshot({ path: path.join(SHOTS, `${label}-1-catalog.png`) });
    expect(`${label}: catalog has no horizontal overflow`, (await over()) <= 0, `${await over()}px`);
    await page.fill('input[type=search]', 'engraved heart necklace'); await page.locator('.pcard').first().click();
    await page.click('text=Start designing'); await page.waitForSelector('[data-testid=canvas-holder] canvas');
    await page.waitForFunction(() => window.__bbyStudio?.editorRef.current?.undoStack.length >= 1);
    await page.click('text=🔤 Add text'); await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SHOTS, `${label}-2-editor.png`) });
    expect(`${label}: editor has no horizontal overflow`, (await over()) <= 0, `${await over()}px`);
    const cw = await page.evaluate(() => document.querySelector('[data-testid=canvas-holder]').getBoundingClientRect().width);
    expect(`${label}: canvas fits the screen`, cw > 100 && cw <= vp.width, `${Math.round(cw)}px wide`);
    await page.click('text=6–7 · Build & download'); await page.click('[data-testid=build-button]');
    await page.waitForSelector('[data-testid=ready-banner]', { timeout: 60000 });
    await page.screenshot({ path: path.join(SHOTS, `${label}-3-build.png`), fullPage: true });
    expect(`${label}: build page has no horizontal overflow`, (await over()) <= 0, `${await over()}px`);
    expect(`${label}: SVG engraving build completes`, /PRODUCTION-READY/.test(await page.textContent('[data-testid=ready-banner]')));
    expect(`${label}: no page errors`, errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
}

function writeReport(meta) {
  const passed = results.filter((r) => r.pass).length;
  const L = ['# BBY Product Design Studio — Test Report', '', `Run: ${new Date().toISOString()}  `, `Browser: ${meta.browser}  `, `Build: production (\`vite build\`) served by \`vite preview\`  `, `Result: **${passed}/${results.length} checks passed**${passed === results.length ? '' : ` — **${results.length - passed} FAILED**`}`, '',
    'Exports are produced by the real application code in the browser, returned as bytes and verified in Node with independent decoders (UPNG pixel decode, a separate PNG chunk/CRC reader and JPEG marker parser). Exported files from the last run are in `tests/output/` (git-ignored) and screenshots in `docs/screenshots/`.', ''];
  let sec = '';
  for (const r of results) {
    if (r.section !== sec) { sec = r.section; L.push('', `## ${sec}`, '', '| Result | Check | Detail |', '|---|---|---|'); }
    L.push(`| ${r.pass ? '✅ PASS' : '❌ FAIL'} | ${r.name.replace(/\|/g, '\\|')} | ${String(r.detail).replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 300)} |`);
  }
  L.push('', '## Screenshots', '', ...fs.readdirSync(SHOTS).sort().map((f) => `- [${f}](screenshots/${f})`));
  fs.writeFileSync(path.join(ROOT, 'docs/TEST_REPORT.md'), L.join('\n') + '\n');
  return { passed, total: results.length };
}

(async () => {
  await unitTests();
  if (!BROWSER) { console.error('No Chrome/Edge found; set BROWSER='); process.exit(1); }
  const server = await startServer();
  const browser = await chromium.launch({ executablePath: BROWSER, headless: true });
  try { await browserTests(browser); await mobileTests(browser); }
  catch (e) { record(`Test harness error: ${e.message.split('\n')[0]}`, false, e.stack?.split('\n').slice(1, 3).join(' ')); }
  finally { await browser.close(); server.kill(); }
  const { passed, total } = writeReport({ browser: BROWSER });
  console.log(`\n${passed}/${total} passed`);
  process.exit(passed === total ? 0 : 1);
})();
