// Official ShineOn mockup kits.
//
// ShineOn's mockups, templates and product images are ShineOn's property and are licensed to
// each seller as "non-exclusive, limited, non-transferable" for promoting ShineOn products
// (ShineOn Terms of Service — "Digital Items" / "ShineOn Intellectual Property"). So this app
// ships NO ShineOn imagery. Instead a seller (or the BBY administrator) installs the official
// PSD they downloaded from ShineOn's Canto portal: the PSD is parsed locally in the browser,
// turned into a compact "kit" (scene layers + the smart-object slot geometry) and stored in
// this browser only. An administrator who has written permission from ShineOn can publish
// kits for every student (public/mockups/ — see docs/MOCKUP_ASSETS.md).
//
// Every kit is bound to an exact BBY product id + ShineOn catalog id + finish variant, and is
// verified when built: it is re-rendered with ShineOn's own sample design and compared
// pixel-by-pixel with the PSD's own composite image.
import JSZip from 'jszip';
import { db } from './db.js';
import {
  makeCanvas, imageToCanvas, applyMask, renderEffects, drawPart, clipTo, warpImage, slotMapping,
  compareImages, blendIsApprox, prefilter, quadEdge, isFlat, detectFace, quadToRect,
} from './mockup-render.js';

const RECOLOUR_FX = ['solidFill', 'gradientOverlay', 'patternOverlay', 'satin', 'stroke'];
const SHAPED = ['circle', 'heart', 'dogtag', 'star', 'paw', 'dome'];

export const KIT_SCHEMA = 'bby-mockup-kit/1';
export const PACK_SCHEMA = 'bby-mockup-pack/1';
export const KIT_MAX_SIDE = 1600;
const BASE = import.meta.env.BASE_URL;

export const VARIANTS = {
  silver: { label: 'Silver tone', long: '14k white gold finish / silver tone' },
  gold: { label: 'Gold tone', long: '18k yellow gold finish / gold tone' },
};

export function catalogIdOf(product) {
  const m = /catalog\/(\d+)/.exec(product?.links?.product || '');
  return m ? m[1] : null;
}

/** Finish options ShineOn sells this product in (from its own product description). */
export function productFinishes(product) {
  const t = `${product.physicalSize || ''} ${product.name}`.toLowerCase();
  const out = [];
  if (/white gold|silver|stainless|steel|rhodium/.test(t)) out.push('silver');
  if (/yellow gold|18k|gold finish|gold tone/.test(t.replace(/14k white gold|white gold/g, ''))) out.push('gold');
  return out.length === 2 ? out : [];
}

export function guessVariant(fileName) {
  const n = fileName.toLowerCase();
  const gold = /gold|18k|yellow/.test(n.replace(/white[ _-]?gold/g, ''));
  const silver = /silver|white[ _-]?gold|14k|rhodium/.test(n);
  return gold && !silver ? 'gold' : silver && !gold ? 'silver' : null;
}

export function sceneName(fileName) {
  return fileName.replace(/\.(psd|psb)$/i, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// ---------------- PSD parsing (worker) ----------------
export function parsePsdFile(file, { maxSide = KIT_MAX_SIDE, onStage } = {}) {
  return new Promise((resolve, reject) => {
    onStage?.('Reading file…');
    file.arrayBuffer().then((buffer) => {
      onStage?.('Parsing Photoshop layers in your browser…');
      const w = new Worker(new URL('./psd-worker.js', import.meta.url), { type: 'module' });
      w.onmessage = (e) => { w.terminate(); if (e.data.ok) resolve(e.data.tree); else reject(new Error(`Could not read this PSD: ${e.data.error}`)); };
      w.onerror = (e) => { w.terminate(); reject(new Error(e.message || 'PSD worker failed')); };
      w.postMessage({ buffer, maxSide }, [buffer]);
    }, reject);
  });
}

function flatten(children, ctx = { opacity: 1, hidden: false, masks: [], path: [] }, out = [], notes = []) {
  for (const [i, n] of (children || []).entries()) {
    const path = [...ctx.path, i];
    if (n.isGroup) {
      if (!['pass through', 'normal'].includes(n.blendMode) && !n.hidden) notes.push(`Group "${n.name}" uses "${n.blendMode}" blending — composited as pass-through`);
      if (n.effects && !n.hidden) notes.push(`Effects on group "${n.name}" are not reproduced`);
      flatten(n.children, { opacity: ctx.opacity * n.opacity, hidden: ctx.hidden || n.hidden, masks: n.mask ? [...ctx.masks, n.mask] : ctx.masks, path }, out, notes);
    } else out.push({ node: n, path: path.join('.'), opacity: ctx.opacity * n.opacity, hidden: ctx.hidden || n.hidden, masks: n.mask ? [...ctx.masks, n.mask] : ctx.masks });
  }
  return { leaves: out, notes };
}

/** Placed (smart-object) layers that could be the design slot, best guess first. */
export function designCandidates(tree) {
  const { leaves } = flatten(tree.children);
  const c = leaves.filter((l) => l.node.placed).map((l) => {
    const name = l.node.name; let score = 0;
    if (/design|your text|text inside|artwork|your image|photo here|place|insert|replace|^text$/i.test(name)) score += 10;
    if (/keep.?hidden|do not edit|don'?t edit/i.test(name)) score -= 8;
    if (l.hidden) score -= 3;
    if (l.node.clipping) score -= 2;
    return { path: l.path, name, hidden: l.hidden, so: { width: l.node.placed.width, height: l.node.placed.height }, warp: l.node.placed.warp?.style || 'none', score };
  });
  return c.sort((a, b) => b.score - a.score);
}

async function toBlob(canvas, opaque) {
  const type = 'image/webp';
  const b = canvas.convertToBlob ? await canvas.convertToBlob({ type, quality: 0.9 }) : await new Promise((r) => canvas.toBlob(r, type, 0.9));
  if (b && b.type === type) return b;
  return canvas.convertToBlob ? canvas.convertToBlob({ type: 'image/png' }) : new Promise((r) => canvas.toBlob(r, opaque ? 'image/jpeg' : 'image/png', 0.92));
}

function trimCanvas(canvas) {
  const ctx = canvas.getContext('2d'); const { width: w, height: h } = canvas; const d = ctx.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  const c = makeCanvas(x1 - x0 + 1, y1 - y0 + 1); c.getContext('2d').drawImage(canvas, -x0, -y0);
  return { canvas: c, x: x0, y: y0 };
}

/** Rasterises one static (design-independent) layer into positioned parts. */
function staticParts(leaf, tree, notes) {
  const n = leaf.node; let content = null;
  if (n.image) content = { canvas: imageToCanvas(n.image), x: n.image.x, y: n.image.y };
  else if (n.vectorFill?.type === 'color') {
    const k = tree.scale; const l = n.right > n.left ? n : { left: 0, top: 0, right: tree.width, bottom: tree.height };
    const c = makeCanvas((l.right - l.left) * k, (l.bottom - l.top) * k); const ctx = c.getContext('2d');
    const col = n.vectorFill.color; ctx.fillStyle = `rgb(${col.r},${col.g},${col.b})`; ctx.fillRect(0, 0, c.width, c.height);
    content = { canvas: c, x: Math.floor(l.left * k), y: Math.floor(l.top * k) };
    if (n.vectorMask) notes.push(`Fill layer "${n.name}" has a vector shape; drawn using its raster mask only`);
  } else if (n.vectorFill) { notes.push(`${n.vectorFill.type} fill layer "${n.name}" is not reproduced`); return null; }
  if (!content) return null;
  for (const m of leaf.masks) applyMask(content, m);
  const fx = renderEffects(content.canvas, n.effects, tree.scale);
  notes.push(...fx.notes.map((t) => `${t} (layer "${n.name}")`));
  if (blendIsApprox(n.blendMode)) notes.push(`Blend mode "${n.blendMode}" on "${n.name}" is approximated`);
  const parts = [];
  for (const p of fx.below) parts.push({ canvas: p.canvas, x: content.x - fx.pad, y: content.y - fx.pad, blend: p.blend, opacity: p.opacity * leaf.opacity });
  parts.push({ canvas: content.canvas, x: content.x, y: content.y, blend: n.blendMode, opacity: leaf.opacity * (n.fillOpacity ?? 1) });
  for (const p of fx.above) parts.push({ canvas: p.canvas, x: content.x - fx.pad, y: content.y - fx.pad, blend: p.blend, opacity: p.opacity * leaf.opacity });
  return { content, parts };
}

function maskImageFromMask(m, tree) {
  if (!m.image) return { x: 0, y: 0, width: 0, height: 0, data: null, defaultColor: m.defaultColor };
  return { ...m.image, defaultColor: m.defaultColor };
}

/**
 * Builds a kit from a parsed PSD tree.
 * opts: { product, designPaths: [{ path, surfaceId }], variant, scene, source: { fileName, fileSize, cantoUrl } }
 */
export async function buildKit(tree, opts) {
  const { product } = opts;
  const { leaves, notes } = flatten(tree.children);
  const designByPath = new Map((opts.designPaths || []).map((d, i) => [d.path, { ...d, slot: i }]));
  if (!designByPath.size) throw new Error('Choose the layer where the design goes.');
  const W = tree.kitWidth, H = tree.kitHeight, K = tree.scale;

  // 1. Resolve every leaf into stack entries (bottom -> top), handling clipping groups.
  const entries = []; let base = null; let lastContent = null;
  for (const leaf of leaves) {
    const n = leaf.node; const d = designByPath.get(leaf.path);
    if (n.adjustment) { if (!leaf.hidden) notes.push(`Adjustment layer "${n.name}" (${n.adjustment}) is not reproduced`); continue; }
    if (!n.clipping) base = null;
    if (d) {
      const p = n.placed; const surface = product.surfaces.find((s) => s.id === d.surfaceId) || product.surfaces[0];
      const q = (p.nonAffineTransform && p.nonAffineTransform.length === 8 ? p.nonAffineTransform : p.transform).map((v) => v * K);
      const soAspect = p.width / p.height, artAspect = surface.width / surface.height;
      const fit = Math.abs(soAspect / artAspect - 1) <= 0.015 ? 'stretch' : 'contain';
      if (fit === 'contain') notes.push(`ShineOn's design slot is ${p.width}×${p.height} (aspect ${soAspect.toFixed(3)}); the ${surface.width}×${surface.height} artwork (aspect ${artAspect.toFixed(3)}) is fitted inside it without stretching`);
      if (p.warp?.style && !['none', 'custom'].includes(p.warp.style)) notes.push(`"${p.warp.style}" warp on the design layer is not reproduced`);
      if (blendIsApprox(n.blendMode)) notes.push(`Blend mode "${n.blendMode}" on the design layer is approximated`);
      // Printed products: ShineOn's slot styling that recolours its sample text is not applied to full-colour art
      let effects = n.effects || null;
      if (effects && product.artworkRole !== 'engraving') {
        const dropped = Object.keys(effects).filter((k) => RECOLOUR_FX.includes(k));
        if (dropped.length) {
          effects = Object.fromEntries(Object.entries(effects).filter(([k]) => !RECOLOUR_FX.includes(k)));
          if (!Object.keys(effects).length) effects = null;
          notes.push(`ShineOn's ${dropped.join(', ')} styling on the slot (made for its sample text) is not applied to your artwork, because ${product.name} is printed in full colour`);
        }
      }
      for (const k of Object.keys(effects || {})) if (!['dropShadow', 'innerShadow', 'outerGlow', 'innerGlow', 'bevel', 'solidFill', 'stroke'].includes(k)) notes.push(`Photoshop "${k}" effect on the design layer is not reproduced`);
      if (effects) notes.push(`Design-layer effects (${Object.keys(effects).join(', ')}) are re-created with BBY's approximation of Photoshop`);
      const masks = leaf.masks.map((m) => maskImageFromMask(m, tree));
      // Shaped products whose PSD slot is a larger, unmasked text template: fit the artwork to the
      // product's printable face, detected from ShineOn's own product layer under the slot.
      let artRect = null;
      if (SHAPED.includes(product.previewShape) && product.artworkRole !== 'engraving' && !masks.some((m) => m.data || m.defaultColor < 128) && lastContent) {
        const face = detectFace(lastContent, q);
        const qx = [q[0], q[2], q[4], q[6]], qy = [q[1], q[3], q[5], q[7]];
        const quadBox = (Math.max(...qx) - Math.min(...qx)) * (Math.max(...qy) - Math.min(...qy));
        if (face) {
          masks.push({ ...face.mask, defaultColor: 0 });
          const b = face.bbox;
          if (b.w * b.h < quadBox * 0.85) {
            const inv = quadToRect(p.width, p.height, q);
            const pts = [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]].map(([x, y]) => inv(x, y));
            const ux = pts.map((t) => t[0]), uy = pts.map((t) => t[1]);
            artRect = { x: Math.min(...ux), y: Math.min(...uy), w: Math.max(...ux) - Math.min(...ux), h: Math.max(...uy) - Math.min(...uy) };
            notes.push(`ShineOn's design slot in this PSD (${p.width}×${p.height}) is a text template larger than the product; the artwork is fitted to the product's printable ${product.previewShape} face (${Math.round(b.w / K)}×${Math.round(b.h / K)} px in the PSD), detected from ShineOn's own product layer`);
          }
          notes.push(`The PSD's design slot has no mask, so your artwork is clipped to the product's ${product.previewShape} face as detected from ShineOn's own product layer`);
        }
      }
      const entry = {
        type: 'design', slot: d.slot, surfaceId: surface.id, layerName: n.name, hiddenInSource: leaf.hidden,
        so: { width: p.width, height: p.height }, quad: q, mesh: p.warp?.style === 'custom' ? p.warp.mesh : null, fit, artRect,
        blend: n.blendMode, opacity: leaf.opacity, fillOpacity: n.fillOpacity ?? 1, effects, sourceEffects: n.effects || null,
        masks, _leaf: leaf,
      };
      entries.push(entry); base = { design: d.slot, hidden: false };
      continue;
    }
    if (leaf.hidden) { if (!n.clipping) base = { hidden: true }; continue; }
    if (n.clipping && base?.hidden) continue;
    const sp = staticParts(leaf, tree, notes);
    if (!sp) { if (!n.clipping) base = { hidden: true }; continue; }
    if (n.clipping && base) {
      if (base.design != null) entries.push({ type: 'static', parts: sp.parts, clipToSlot: base.design });
      else entries.push({ type: 'static', parts: sp.parts.map((p) => ({ ...p, canvas: clipTo(p.canvas, p.x, p.y, base.content.canvas, base.content.x, base.content.y) })) });
    } else { entries.push({ type: 'static', parts: sp.parts }); base = { content: sp.content }; lastContent = sp.content; }
  }

  // 2. Flatten: everything under the first design slot becomes one base image; runs of
  //    normal-blend layers above it are merged (source-over is associative).
  const files = new Map(); const stack = []; let fileNo = 0;
  const firstDesign = entries.findIndex((e) => e.type === 'design');
  const baseCanvas = makeCanvas(W, H); const bctx = baseCanvas.getContext('2d');
  for (const e of entries.slice(0, firstDesign)) for (const p of e.parts) drawPart(bctx, p.canvas, p.x, p.y, p.blend, p.opacity);
  const tb = trimCanvas(baseCanvas);
  const push = async (canvas, x, y, blend, opacity, clipToSlot) => {
    const name = `layer-${fileNo++}.webp`; files.set(name, await toBlob(canvas));
    stack.push({ type: 'image', file: name, x, y, width: canvas.width, height: canvas.height, blend, opacity, ...(clipToSlot != null ? { clipToSlot } : {}) });
  };
  if (tb) await push(tb.canvas, tb.x, tb.y, 'normal', 1);
  let run = null;
  const flush = async () => { if (!run) return; const t = trimCanvas(run); if (t) await push(t.canvas, t.x, t.y, 'normal', 1); run = null; };
  for (const e of entries.slice(firstDesign)) {
    if (e.type === 'design') {
      await flush();
      const masks = [];
      for (const m of e.masks) {
        if (!m.data) { masks.push({ file: null, defaultColor: m.defaultColor }); continue; }
        const c = imageToCanvas(m); const name = `mask-${fileNo++}.png`;
        files.set(name, await (c.convertToBlob ? c.convertToBlob({ type: 'image/png' }) : new Promise((r) => c.toBlob(r, 'image/png'))));
        masks.push({ file: name, x: m.x, y: m.y, width: m.width, height: m.height, defaultColor: m.defaultColor });
      }
      const { _leaf, masks: _m, ...slot } = e;
      stack.push({ ...slot, masks });
      continue;
    }
    for (const p of e.parts) {
      if (e.clipToSlot == null && (p.blend === 'normal' || p.blend === 'pass through')) {
        if (!run) run = makeCanvas(W, H);
        drawPart(run.getContext('2d'), p.canvas, p.x, p.y, 'normal', p.opacity);
      } else { await flush(); await push(p.canvas, p.x, p.y, p.blend, p.opacity, e.clipToSlot); }
    }
  }
  await flush();

  // 3. Thumbnail = ShineOn's own composite (with ShineOn's sample design).
  let thumbName = null;
  if (tree.composite) {
    const full = imageToCanvas(tree.composite);
    const k = Math.min(1, 480 / Math.max(full.width, full.height));
    const t = makeCanvas(full.width * k, full.height * k); const tctx = t.getContext('2d'); tctx.imageSmoothingQuality = 'high'; tctx.drawImage(full, 0, 0, t.width, t.height);
    thumbName = 'thumb.webp'; files.set(thumbName, await toBlob(t, true));
  }

  const kit = {
    schema: KIT_SCHEMA,
    id: `${product.id}--${(opts.variant || 'any')}--${slug(opts.scene)}`.slice(0, 120),
    productIds: [product.id], productName: product.name, catalogId: catalogIdOf(product),
    variant: opts.variant || null, scene: opts.scene,
    source: { fileName: opts.source?.fileName || '', fileSize: opts.source?.fileSize || 0, cantoUrl: opts.source?.cantoUrl || product.links.mockup || null, psdWidth: tree.width, psdHeight: tree.height },
    width: W, height: H, scale: K, stack, thumb: thumbName,
    notes: [...new Set(notes)],
    builtAt: new Date().toISOString(),
  };

  kit.overlayPixels = await overlayOverSlot(kit, files);

  // 4. Verification against the PSD itself.
  kit.verification = await verifyKit(kit, files, tree, entries);
  return { kit, files };
}

/** Opaque product pixels drawn over the design slot (e.g. a pendant hanging over the card). */
async function overlayOverSlot(kit, files) {
  const slot = kit.stack.find((s) => s.type === 'design'); if (!slot) return 0;
  const c = makeCanvas(kit.width, kit.height); const ctx = c.getContext('2d');
  for (const it of kit.stack.slice(kit.stack.indexOf(slot) + 1)) if (it.type === 'image' && it.blend === 'normal' && it.clipToSlot == null) ctx.drawImage(await createImageBitmap(files.get(it.file)), it.x, it.y);
  const q = slot.quad; const xs = [q[0], q[2], q[4], q[6]], ys = [q[1], q[3], q[5], q[7]];
  const x0 = Math.max(0, Math.floor(Math.min(...xs))), y0 = Math.max(0, Math.floor(Math.min(...ys)));
  const w = Math.min(kit.width, Math.ceil(Math.max(...xs))) - x0, h = Math.min(kit.height, Math.ceil(Math.max(...ys))) - y0;
  if (w < 1 || h < 1) return 0;
  const d = ctx.getImageData(x0, y0, w, h).data;
  const inside = (x, y) => { let sign = 0; for (let i = 0; i < 4; i++) { const ax = q[i * 2], ay = q[i * 2 + 1], bx = q[((i + 1) % 4) * 2], by = q[((i + 1) % 4) * 2 + 1]; const cr = (bx - ax) * (y - ay) - (by - ay) * (x - ax); const sg = Math.sign(cr); if (sg && sign && sg !== sign) return false; if (sg) sign = sg; } return true; };
  let n = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] >= 254 && inside(x0 + x + 0.5, y0 + y + 0.5)) n++;
  return n;
}

function slug(s) { return String(s || 'scene').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60); }

/** Re-renders the kit with ShineOn's own sample design and compares with the PSD composite. */
async function verifyKit(kit, files, tree, entries) {
  const v = { composite: null, warp: [], checkedAt: new Date().toISOString() };
  const getFile = async (name) => createImageBitmap(files.get(name));
  // (a) composite check: design slots filled with the PSD's own (already transformed) pixels
  if (tree.composite) {
    const pre = {};
    for (const e of entries.filter((x) => x.type === 'design')) {
      const n = e._leaf.node;
      if (e.hiddenInSource || !n.image) pre[e.slot] = { omit: true };
      else pre[e.slot] = { prewarped: { canvas: imageToCanvas(n.image), x: n.image.x, y: n.image.y } };
    }
    const asInPsd = { ...kit, stack: kit.stack.map((x) => (x.type === 'design' ? { ...x, effects: x.sourceEffects } : x)) };
    const out = await renderKit(asInPsd, getFile, pre);
    const a = out.getContext('2d').getImageData(0, 0, kit.width, kit.height).data;
    const c = tree.composite; const b = new Uint8ClampedArray(kit.width * kit.height * 4);
    for (let y = 0; y < Math.min(c.height, kit.height); y++) for (let x = 0; x < Math.min(c.width, kit.width); x++) { const si = ((y) * c.width + x) * 4, di = (y * kit.width + x) * 4; b[di] = c.data[si]; b[di + 1] = c.data[si + 1]; b[di + 2] = c.data[si + 2]; b[di + 3] = c.data[si + 3]; }
    v.composite = compareImages(a, b, kit.width, kit.height);
    v.composite.match = v.composite.meanDiff <= 4 && v.composite.pctOver32 <= 2;
  }
  // (b) warp check: the smart-object's own content warped by BBY vs Photoshop's transformed pixels
  for (const e of entries.filter((x) => x.type === 'design')) {
    const n = e._leaf.node; const src = tree.linked?.[n.placed.id];
    if (!src || !n.image) { v.warp.push({ slot: e.slot, checked: false, reason: src ? 'layer has no pixels' : 'smart-object contents not embedded in the PSD' }); continue; }
    const slot = kit.stack.find((s) => s.type === 'design' && s.slot === e.slot);
    if (isFlat(src) && !isFlat(n.image)) { v.warp.push({ slot: e.slot, checked: false, reason: "the smart object's saved preview inside the PSD is blank (saved without 'Maximize Compatibility')" }); continue; }
    const w = warpImage(prefilter(src, Math.ceil(quadEdge(slot.quad) * 1.25)), { x: 0, y: 0, w: slot.so.width, h: slot.so.height }, slotMapping(slot));
    const ps = n.image; const W = ps.width, Hh = ps.height;
    const mine = new Uint8ClampedArray(W * Hh * 4);
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) { const gx = ps.x + x - w.x, gy = ps.y + y - w.y; if (gx < 0 || gy < 0 || gx >= w.width || gy >= w.height) continue; const s = (gy * w.width + gx) * 4, d = (y * W + x) * 4; for (let k = 0; k < 4; k++) mine[d + k] = w.data[s + k]; }
    // compare inside the slot, ignoring a 2px seam at the slot edge
    const res = compareImages(mine, ps.data, W, Hh, (x, y, i) => ps.data[i + 3] > 250 && mine[i + 3] > 250 && x > 4 && y > 4 && x < W - 5 && y < Hh - 5);
    const off = bestOffset(mine, ps.data, W, Hh, 3);
    if (off.contrast < 1) { v.warp.push({ slot: e.slot, checked: false, reason: "the smart object's contents are a plain colour with no detail to align against" }); continue; }
    v.warp.push({ slot: e.slot, checked: res.pixels > 100, ...res, offset: off, match: res.pixels > 100 && Math.abs(off.dx) <= 1 && Math.abs(off.dy) <= 1 && Math.min(off.meanDiff, res.meanDiff) <= 8 });
  }
  return v;
}

/** Human-readable verification summary. level: 'verified' | 'approximate'. */
export function kitAccuracy(kit) {
  const v = kit.verification || {}; const lines = []; const c = v.composite;
  if (c) lines.push(c.match
    ? `Rendering verified: re-rendered with ShineOn's sample design it matches ShineOn's own composite (mean difference ${c.meanDiff}/255; ${c.pctOver32}% of pixels differ noticeably).`
    : `Rendering differs from ShineOn's own composite (mean difference ${c.meanDiff}/255; ${c.pctOver32}% of pixels differ noticeably) — lighting/effects are approximate.`);
  else lines.push("ShineOn's PSD has no saved composite image, so the rendering could not be compared.");
  for (const w of v.warp || []) lines.push(w.checked
    ? (w.match ? `Placement verified: BBY's perspective warp lines up with Photoshop's own transform (best alignment offset ${w.offset.dx},${w.offset.dy} px; where both are painted the mean difference is ${w.meanDiff}/255).` : `Placement differs from Photoshop's own transform (best alignment offset ${w.offset?.dx},${w.offset?.dy} px; mean difference ${w.offset?.meanDiff ?? w.meanDiff}/255).`)
    : `Placement uses the PSD's exact corner coordinates (independent check not possible: ${w.reason}).`);
  const level = c?.match && (v.warp || []).every((w) => !w.checked || w.match) ? 'verified' : 'approximate';
  return { level, lines };
}

/**
 * Finds the shift (±r px) that best aligns two RGBA images, using premultiplied luminance plus
 * the alpha outline. Returns { dx, dy, meanDiff, contrast } — contrast ≈ 0 means the content has
 * no detail to align against (every shift scores the same).
 */
function bestOffset(a, b, w, h, r) {
  const val = (d, i) => ((0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) * d[i + 3]) / 255;
  const scores = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    let s = 0, n = 0;
    for (let y = r + 2; y < h - r - 2; y += 2) for (let x = r + 2; x < w - r - 2; x += 2) {
      const i = (y * w + x) * 4, j = ((y + dy) * w + (x + dx)) * 4;
      if (!a[i + 3] && !b[j + 3]) continue;
      s += Math.abs(val(a, i) - val(b, j)) + Math.abs(a[i + 3] - b[j + 3]); n++;
    }
    scores.push({ dx, dy, meanDiff: n ? s / n : Infinity });
  }
  const zero = scores.find((x) => !x.dx && !x.dy);
  let best = zero;
  for (const x of scores) if (x.meanDiff < best.meanDiff - 0.05) best = x;
  const worst = Math.max(...scores.map((x) => x.meanDiff));
  return { dx: best.dx, dy: best.dy, meanDiff: +best.meanDiff.toFixed(2), contrast: +(worst - best.meanDiff).toFixed(2) };
}

// ---------------- runtime rendering ----------------
async function loadMask(m, getFile) {
  if (!m.file) return { defaultColor: m.defaultColor, image: null };
  const bmp = await getFile(m.file); const c = makeCanvas(bmp.width, bmp.height); const ctx = c.getContext('2d'); ctx.drawImage(bmp, 0, 0);
  return { defaultColor: m.defaultColor, image: { x: m.x, y: m.y, width: bmp.width, height: bmp.height, data: ctx.getImageData(0, 0, bmp.width, bmp.height).data } };
}

/**
 * Renders a kit. designs: { [slot]: HTMLCanvasElement | { prewarped: {canvas,x,y} } | { omit: true } }.
 * Returns a canvas of kit.width × kit.height.
 */
export async function renderKit(kit, getFile, designs) {
  const out = makeCanvas(kit.width, kit.height); const ctx = out.getContext('2d');
  const slotAlpha = {};
  for (const item of kit.stack) {
    if (item.type === 'image') {
      let img = await getFile(item.file); let x = item.x, y = item.y;
      if (item.clipToSlot != null) { const s = slotAlpha[item.clipToSlot]; if (!s) continue; img = clipTo(img, x, y, s.canvas, s.x, s.y); }
      drawPart(ctx, img, x, y, item.blend, item.opacity);
    } else if (item.type === 'design') {
      const d = designs?.[item.slot];
      if (!d || d.omit) continue;
      let placed;
      if (d.prewarped) placed = { canvas: d.prewarped.canvas, x: d.prewarped.x, y: d.prewarped.y };
      else {
        const dc = d;
        const { width: W, height: H } = item.so;
        const area = item.artRect || { x: 0, y: 0, w: W, h: H };
        const k = Math.min(area.w / dc.width, area.h / dc.height); // contain inside the area
        const rect = item.fit === 'stretch' && !item.artRect ? { x: 0, y: 0, w: W, h: H } : { x: area.x + (area.w - dc.width * k) / 2, y: area.y + (area.h - dc.height * k) / 2, w: dc.width * k, h: dc.height * k };
        const src = prefilter(dc, Math.ceil(quadEdge(item.quad) * Math.max(rect.w / W, rect.h / H) * 1.25));
        const wimg = warpImage(src, rect, slotMapping(item));
        placed = { canvas: imageToCanvas(wimg), x: wimg.x, y: wimg.y };
      }
      for (const m of item.masks || []) applyMask(placed, await loadMask(m, getFile));
      const fx = renderEffects(placed.canvas, item.effects, kit.scale);
      for (const p of fx.below) drawPart(ctx, p.canvas, placed.x - fx.pad, placed.y - fx.pad, p.blend, p.opacity * item.opacity);
      drawPart(ctx, placed.canvas, placed.x, placed.y, item.blend, item.opacity * (item.fillOpacity ?? 1));
      for (const p of fx.above) drawPart(ctx, p.canvas, placed.x - fx.pad, placed.y - fx.pad, p.blend, p.opacity * item.opacity);
      slotAlpha[item.slot] = placed;
    }
  }
  return out;
}

// ---------------- storage: this browser (IndexedDB) + published packs ----------------
const state = { loaded: false, local: [], published: [], publishedInfo: null, listeners: new Set(), version: 0 };
const urlCache = new Map();

function emit() { state.version++; for (const l of state.listeners) l(); }
export function subscribeMockups(fn) { state.listeners.add(fn); return () => state.listeners.delete(fn); }
export function mockupsVersion() { return state.version; }

export async function loadMockups() {
  try {
    const d = await db(); state.local = (await d.getAll('mockups')).map((r) => ({ kit: r.kit, origin: 'local', files: r.files }));
  } catch { state.local = []; }
  try {
    const r = await fetch(`${BASE}mockups/manifest.json`, { cache: 'no-cache' });
    if (r.ok) {
      const m = await r.json(); state.publishedInfo = m;
      const kits = [];
      if (m.permission?.granted) for (const k of m.kits || []) {
        try { const kr = await fetch(`${BASE}mockups/${k.dir}/kit.json`); if (kr.ok) kits.push({ kit: await kr.json(), origin: 'published', dir: k.dir }); } catch { /* skip */ }
      }
      state.published = kits;
    }
  } catch { state.published = []; }
  state.loaded = true; emit();
}

export function allKits() { return [...state.published, ...state.local]; }
export function publishedInfo() { return state.publishedInfo; }
export function kitsForProduct(productId) { return allKits().filter((k) => k.kit.productIds.includes(productId)); }
export function mockupsLoaded() { return state.loaded; }

export function fileGetter(entry) {
  const cache = new Map();
  return async (name) => {
    if (cache.has(name)) return cache.get(name);
    let blob;
    if (entry.origin === 'local') blob = entry.files[name];
    else { const r = await fetch(`${BASE}mockups/${entry.dir}/${name}`); if (!r.ok) throw new Error(`Missing mockup file ${name}`); blob = await r.blob(); }
    const bmp = await createImageBitmap(blob); cache.set(name, bmp); return bmp;
  };
}

export function thumbUrl(entry) {
  if (!entry.kit.thumb) return null;
  if (entry.origin === 'published') return `${BASE}mockups/${entry.dir}/${entry.kit.thumb}`;
  const key = `${entry.kit.id}|${entry.kit.builtAt}`;
  if (!urlCache.has(key)) urlCache.set(key, URL.createObjectURL(entry.files[entry.kit.thumb]));
  return urlCache.get(key);
}

export async function saveKit(kit, files) {
  const d = await db();
  await d.put('mockups', { id: kit.id, kit, files: Object.fromEntries(files) });
  await loadMockups();
}
export async function removeKit(id) { const d = await db(); await d.delete('mockups', id); await loadMockups(); }

// ---------------- packs (zip) ----------------
export async function exportPack(ids) {
  const zip = new JSZip(); const chosen = state.local.filter((e) => !ids || ids.includes(e.kit.id));
  zip.file('bby-mockup-pack.json', JSON.stringify({
    schema: PACK_SCHEMA, createdAt: new Date().toISOString(), kits: chosen.map((e) => e.kit.id),
    notice: 'Contains imagery from official ShineOn mockups. ShineOn licenses these to each seller as non-exclusive and non-transferable. Do not share or publish this pack without written permission from ShineOn.',
  }, null, 2));
  for (const e of chosen) {
    zip.file(`kits/${e.kit.id}/kit.json`, JSON.stringify(e.kit, null, 2));
    for (const [name, blob] of Object.entries(e.files)) zip.file(`kits/${e.kit.id}/${name}`, blob);
  }
  return zip.generateAsync({ type: 'blob' });
}

export async function importPack(file) {
  const zip = await JSZip.loadAsync(file);
  const meta = JSON.parse(await zip.file('bby-mockup-pack.json')?.async('string') || '{}');
  if (meta.schema !== PACK_SCHEMA) throw new Error('This is not a BBY mockup pack.');
  const d = await db(); let n = 0;
  for (const id of meta.kits || []) {
    const kj = zip.file(`kits/${id}/kit.json`); if (!kj) continue;
    const kit = JSON.parse(await kj.async('string')); if (kit.schema !== KIT_SCHEMA) continue;
    const files = {};
    for (const name of [...kit.stack.flatMap((s) => (s.type === 'image' ? [s.file] : (s.masks || []).map((m) => m.file).filter(Boolean))), kit.thumb].filter(Boolean)) {
      const f = zip.file(`kits/${id}/${name}`); if (f) files[name] = new Blob([await f.async('uint8array')], { type: name.endsWith('.png') ? 'image/png' : 'image/webp' });
    }
    await d.put('mockups', { id: kit.id, kit, files }); n++;
  }
  await loadMockups();
  return n;
}
