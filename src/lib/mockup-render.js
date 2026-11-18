// Rendering engine for official-mockup kits: perspective / mesh warp of the student's design
// into the PSD's smart-object slot, Photoshop blend modes and the common layer effects.
// Used both when a kit is built (to verify it against ShineOn's own composite) and at preview time.

export function makeCanvas(w, h) {
  const c = typeof OffscreenCanvas !== 'undefined' && typeof document === 'undefined' ? new OffscreenCanvas(w, h) : document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return c;
}

// ---------------- blend modes ----------------
const BLEND = {
  normal: 'source-over', 'pass through': 'source-over', dissolve: 'source-over', multiply: 'multiply', screen: 'screen', overlay: 'overlay',
  darken: 'darken', lighten: 'lighten', 'color dodge': 'color-dodge', 'color burn': 'color-burn', 'hard light': 'hard-light', 'soft light': 'soft-light',
  difference: 'difference', exclusion: 'exclusion', hue: 'hue', saturation: 'saturation', color: 'color', luminosity: 'luminosity',
  'linear dodge': 'lighter', 'linear burn': 'multiply', 'darker color': 'darken', 'lighter color': 'lighten',
};
const APPROX_BLEND = new Set(['dissolve', 'linear burn', 'darker color', 'lighter color', 'vivid light', 'linear light', 'pin light', 'hard mix', 'subtract', 'divide']);
export function canvasBlend(mode) { return BLEND[mode] || 'source-over'; }
export function blendIsApprox(mode) { return APPROX_BLEND.has(mode) || !(mode in BLEND); }

// ---------------- geometry ----------------
/** Homography mapping the rectangle (0,0)-(w,h) to quad [x0,y0, x1,y1, x2,y2, x3,y3] (TL, TR, BR, BL). */
export function rectToQuad(w, h, q) {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  let g = 0, hh = 0;
  const den = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(dx3) > 1e-9 || Math.abs(dy3) > 1e-9) { g = (dx3 * dy2 - dx2 * dy3) / den; hh = (dx1 * dy3 - dx3 * dy1) / den; }
  const a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3, c = x0;
  const d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3, f = y0;
  // unit square -> quad; prepend scaling of (u, v) by 1/w, 1/h
  return (u, v) => { const s = u / w, t = v / h; const z = g * s + hh * t + 1; return [(a * s + b * t + c) / z, (d * s + e * t + f) / z]; };
}

/** Inverse of rectToQuad: kit-space point -> smart-object-space point. */
export function quadToRect(w, h, q) {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  let g = 0, hh = 0; const den = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(dx3) > 1e-9 || Math.abs(dy3) > 1e-9) { g = (dx3 * dy2 - dx2 * dy3) / den; hh = (dx1 * dy3 - dx3 * dy1) / den; }
  const [a, b, c, d, e, f, gg, h2, i] = [x1 - x0 + g * x1, x3 - x0 + hh * x3, x0, y1 - y0 + g * y1, y3 - y0 + hh * y3, y0, g, hh, 1];
  const A = e * i - f * h2, B = -(d * i - f * gg), C = d * h2 - e * gg;
  const det = a * A + b * B + c * C;
  const inv = [A, -(b * i - c * h2), b * f - c * e, B, a * i - c * gg, -(a * f - c * d), C, -(a * h2 - b * gg), a * e - b * d].map((v) => v / det);
  return (x, y) => { const z = inv[6] * x + inv[7] * y + inv[8]; return [((inv[0] * x + inv[1] * y + inv[2]) / z) * w, ((inv[3] * x + inv[4] * y + inv[5]) / z) * h]; };
}

/**
 * Finds the product's printable face under a design slot: opaque pixels of the product layer
 * inside the slot, morphologically opened (drops thin chain links / rings), largest component.
 * Returns { mask: ImageData-like (grey, kit coords), bbox } or null.
 */
export function detectFace(layer, quad) {
  const xs = [quad[0], quad[2], quad[4], quad[6]], ys = [quad[1], quad[3], quad[5], quad[7]];
  const X0 = Math.floor(Math.min(...xs)), Y0 = Math.floor(Math.min(...ys)), X1 = Math.ceil(Math.max(...xs)), Y1 = Math.ceil(Math.max(...ys));
  const w = X1 - X0, h = Y1 - Y0; if (w < 8 || h < 8) return null;
  const tmp = makeCanvas(w, h); tmp.getContext('2d').drawImage(layer.canvas, layer.x - X0, layer.y - Y0);
  const d = tmp.getContext('2d').getImageData(0, 0, w, h).data;
  const A = new Float32Array(w * h); for (let i = 0; i < A.length; i++) A[i] = d[i * 4 + 3] > 128 ? 1 : 0;
  const r = Math.max(2, Math.round(quadEdge(quad) * 0.04));
  const inv = new Float32Array(A.length); for (let i = 0; i < A.length; i++) inv[i] = 1 - A[i];
  const eroded = maxFilter(inv, w, h, r); for (let i = 0; i < eroded.length; i++) eroded[i] = 1 - eroded[i];
  const opened = maxFilter(eroded, w, h, r);
  const lab = new Int32Array(A.length); let best = 0, bestN = 0, cur = 0; const stack = [];
  for (let i = 0; i < A.length; i++) {
    if (!opened[i] || lab[i]) continue;
    cur++; let n = 0; stack.push(i); lab[i] = cur;
    while (stack.length) {
      const j = stack.pop(); n++; const x = j % w, y = (j / w) | 0;
      const nb = [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, y > 0 ? j - w : -1, y < h - 1 ? j + w : -1];
      for (const k of nb) if (k >= 0 && opened[k] && !lab[k]) { lab[k] = cur; stack.push(k); }
    }
    if (n > bestN) { bestN = n; best = cur; }
  }
  if (!best || bestN < w * h * 0.05) return null;
  const comp = new Float32Array(A.length); for (let i = 0; i < A.length; i++) comp[i] = lab[i] === best ? 1 : 0;
  const grown = maxFilter(comp, w, h, r + 1);
  const out = new Uint8ClampedArray(w * h * 4); let bx0 = w, by0 = h, bx1 = -1, by1 = -1;
  for (let i = 0; i < A.length; i++) {
    const v = grown[i] ? d[i * 4 + 3] : 0; const o = i * 4; out[o] = v; out[o + 1] = v; out[o + 2] = v; out[o + 3] = 255;
    if (v > 128) { const x = i % w, y = (i / w) | 0; if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
  }
  if (bx1 < 0) return null;
  return { mask: { x: X0, y: Y0, width: w, height: h, data: out }, bbox: { x: X0 + bx0, y: Y0 + by0, w: bx1 - bx0 + 1, h: by1 - by0 + 1 } };
}

const bern = (i, t) => [(1 - t) ** 3, 3 * t * (1 - t) ** 2, 3 * t * t * (1 - t), t ** 3][i];
/** Photoshop custom warp: 4x4 bicubic Bézier patch in smart-object space (row-major mesh points). */
export function meshWarp(mesh, w, h) {
  if (!mesh || mesh.length !== 16) return null;
  let identity = true;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const p = mesh[r * 4 + c]; if (Math.abs(p.x - (c * w) / 3) > 0.5 || Math.abs(p.y - (r * h) / 3) > 0.5) identity = false; }
  if (identity) return null;
  return (u, v) => {
    const s = u / w, t = v / h; let x = 0, y = 0;
    for (let r = 0; r < 4; r++) { const br = bern(r, t); for (let c = 0; c < 4; c++) { const k = br * bern(c, s); const p = mesh[r * 4 + c]; x += k * p.x; y += k * p.y; } }
    return [x, y];
  };
}

/** Builds the smart-object-space -> kit-space mapping for a design slot. */
export function slotMapping(slot) {
  const H = rectToQuad(slot.so.width, slot.so.height, slot.quad);
  const M = slot.mesh ? meshWarp(slot.mesh, slot.so.width, slot.so.height) : null;
  return M ? (u, v) => { const [x, y] = M(u, v); return H(x, y); } : H;
}

/**
 * Warps `src` (ImageData-like) into a new ImageData covering bbox of the mapped region, by
 * rasterising a fine triangle mesh with bilinear sampling. `srcRect` = region of the
 * smart-object space the source image covers ({x, y, w, h}); mapping: SO space -> kit space.
 */
export function warpImage(src, srcRect, mapping, N = 40) {
  const V = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
    const [x, y] = mapping(srcRect.x + (srcRect.w * i) / N, srcRect.y + (srcRect.h * j) / N);
    V.push(x, y);
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const bx = Math.floor(minX), by = Math.floor(minY);
  const W = Math.max(1, Math.ceil(maxX) - bx + 1), Hh = Math.max(1, Math.ceil(maxY) - by + 1);
  const out = new Uint8ClampedArray(W * Hh * 4);
  const sd = src.data, sw = src.width, sh = src.height;
  const sample = (u, v, o) => { // u, v in source pixel coords (centre-based); premultiplied bilinear
    const x = Math.min(Math.max(u - 0.5, 0), sw - 1), y = Math.min(Math.max(v - 0.5, 0), sh - 1);
    const x0 = x | 0, y0 = y | 0, x1 = Math.min(x0 + 1, sw - 1), y1 = Math.min(y0 + 1, sh - 1);
    const fx = x - x0, fy = y - y0;
    const i00 = (y0 * sw + x0) * 4, i10 = (y0 * sw + x1) * 4, i01 = (y1 * sw + x0) * 4, i11 = (y1 * sw + x1) * 4;
    const w00 = (1 - fx) * (1 - fy) * sd[i00 + 3], w10 = fx * (1 - fy) * sd[i10 + 3], w01 = (1 - fx) * fy * sd[i01 + 3], w11 = fx * fy * sd[i11 + 3];
    const a = w00 + w10 + w01 + w11;
    if (a <= 0) { out[o + 3] = 0; return; }
    out[o] = (sd[i00] * w00 + sd[i10] * w10 + sd[i01] * w01 + sd[i11] * w11) / a;
    out[o + 1] = (sd[i00 + 1] * w00 + sd[i10 + 1] * w10 + sd[i01 + 1] * w01 + sd[i11 + 1] * w11) / a;
    out[o + 2] = (sd[i00 + 2] * w00 + sd[i10 + 2] * w10 + sd[i01 + 2] * w01 + sd[i11 + 2] * w11) / a;
    out[o + 3] = a;
  };
  const tri = (ax, ay, au, av, bxx, byy, bu, bv, cx, cy, cu, cv) => {
    const den = (byy - cy) * (ax - cx) + (cx - bxx) * (ay - cy);
    if (Math.abs(den) < 1e-9) return;
    const x0 = Math.max(Math.floor(Math.min(ax, bxx, cx)), bx), x1 = Math.min(Math.ceil(Math.max(ax, bxx, cx)), bx + W - 1);
    const y0 = Math.max(Math.floor(Math.min(ay, byy, cy)), by), y1 = Math.min(Math.ceil(Math.max(ay, byy, cy)), by + Hh - 1);
    for (let y = y0; y <= y1; y++) {
      const py = y + 0.5;
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5;
        const l1 = ((byy - cy) * (px - cx) + (cx - bxx) * (py - cy)) / den;
        const l2 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / den;
        const l3 = 1 - l1 - l2;
        if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
        sample(l1 * au + l2 * bu + l3 * cu, l1 * av + l2 * bv + l3 * cv, ((y - by) * W + (x - bx)) * 4);
      }
    }
  };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const a = (j * (N + 1) + i) * 2, b = a + 2, c = a + (N + 1) * 2, d = c + 2;
    const u0 = (i / N) * sw, u1 = ((i + 1) / N) * sw, v0 = (j / N) * sh, v1 = ((j + 1) / N) * sh;
    tri(V[a], V[a + 1], u0, v0, V[b], V[b + 1], u1, v0, V[d], V[d + 1], u1, v1);
    tri(V[a], V[a + 1], u0, v0, V[d], V[d + 1], u1, v1, V[c], V[c + 1], u0, v1);
  }
  return { x: bx, y: by, width: W, height: Hh, data: out };
}

/** Longest edge of a slot's quad (kit px). */
export function quadEdge(q) {
  let m = 0; for (let i = 0; i < 4; i++) m = Math.max(m, Math.hypot(q[((i + 1) % 4) * 2] - q[i * 2], q[((i + 1) % 4) * 2 + 1] - q[i * 2 + 1]));
  return m;
}

/**
 * Downscales a canvas / ImageData-like image (mip-style halving + high-quality resample) so its
 * longest side is about `targetMax`. Avoids aliasing when a large design is warped into a small slot.
 * Returns an ImageData-like object.
 */
export function prefilter(img, targetMax) {
  const w0 = img.width, h0 = img.height;
  let cur = img.getContext ? img : imageToCanvas(img);
  if (Math.max(w0, h0) <= targetMax * 1.05) { const c = cur.getContext('2d'); return { width: w0, height: h0, data: c.getImageData(0, 0, w0, h0).data }; }
  let w = w0, h = h0;
  while (Math.max(w, h) / 2 >= targetMax) {
    const nw = Math.max(1, Math.round(w / 2)), nh = Math.max(1, Math.round(h / 2));
    const t = makeCanvas(nw, nh); const tc = t.getContext('2d'); tc.imageSmoothingQuality = 'high'; tc.drawImage(cur, 0, 0, nw, nh); cur = t; w = nw; h = nh;
  }
  const k = targetMax / Math.max(w, h); const fw = Math.max(1, Math.round(w * k)), fh = Math.max(1, Math.round(h * k));
  const f = makeCanvas(fw, fh); const fc = f.getContext('2d'); fc.imageSmoothingQuality = 'high'; fc.drawImage(cur, 0, 0, fw, fh);
  return { width: fw, height: fh, data: fc.getImageData(0, 0, fw, fh).data };
}

/** True when an ImageData-like image is a single flat colour (e.g. a blank saved preview). */
export function isFlat(img) {
  const d = img.data; let n = 0, s = [0, 0, 0], s2 = [0, 0, 0];
  for (let i = 0; i < d.length; i += 4 * 7) { if (d[i + 3] < 10) continue; n++; for (let c = 0; c < 3; c++) { s[c] += d[i + c]; s2[c] += d[i + c] * d[i + c]; } }
  if (!n) return true;
  return [0, 1, 2].every((c) => s2[c] / n - (s[c] / n) ** 2 < 4);
}

// ---------------- canvas helpers ----------------
export function imageToCanvas(img) {
  const c = makeCanvas(img.width, img.height);
  c.getContext('2d').putImageData(new ImageData(img.data instanceof Uint8ClampedArray ? img.data : new Uint8ClampedArray(img.data), img.width, img.height), 0, 0);
  return c;
}

/** A positioned layer bitmap: { canvas, x, y }. Applies a positioned grey mask (Photoshop layer mask). */
export function applyMask(layer, mask, docW, docH) {
  if (!mask) return layer;
  const { canvas, x, y } = layer;
  const ctx = canvas.getContext('2d');
  const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const m = mask.image; const def = (mask.defaultColor ?? 0) / 255;
  for (let j = 0; j < canvas.height; j++) for (let i = 0; i < canvas.width; i++) {
    const gx = x + i, gy = y + j; let v = def;
    if (m) {
      const mx = gx - m.x, my = gy - m.y;
      // resampled masks have partially-covered edge pixels: blend with the default colour by coverage
      if (mx >= 0 && my >= 0 && mx < m.width && my < m.height) { const o = (my * m.width + mx) * 4; const cov = m.data[o + 3] / 255; v = (m.data[o] / 255) * cov + def * (1 - cov); }
    }
    if (v < 1) id.data[(j * canvas.width + i) * 4 + 3] *= v;
  }
  ctx.putImageData(id, 0, 0);
  return layer;
}

// ---------------- alpha-field operations for layer effects ----------------
function boxBlur1(a, w, h, r, horiz) {
  if (r < 1) return a;
  const out = new Float32Array(a.length); const n = 2 * r + 1;
  if (horiz) for (let y = 0; y < h; y++) {
    let s = 0; const row = y * w;
    for (let x = -r; x <= r; x++) s += a[row + Math.min(Math.max(x, 0), w - 1)];
    for (let x = 0; x < w; x++) { out[row + x] = s / n; s += a[row + Math.min(x + r + 1, w - 1)] - a[row + Math.max(x - r, 0)]; }
  } else for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = -r; y <= r; y++) s += a[Math.min(Math.max(y, 0), h - 1) * w + x];
    for (let y = 0; y < h; y++) { out[y * w + x] = s / n; s += a[Math.min(y + r + 1, h - 1) * w + x] - a[Math.max(y - r, 0) * w + x]; }
  }
  return out;
}
/** ~Gaussian blur with Photoshop "size" semantics (3 box passes). */
export function blurField(a, w, h, size) {
  const r = Math.max(0, Math.round(size / 3));
  if (!r) return a;
  let o = a; for (let k = 0; k < 3; k++) { o = boxBlur1(o, w, h, r, true); o = boxBlur1(o, w, h, r, false); }
  return o;
}
function maxFilter(a, w, h, r) {
  if (r < 1) return a;
  const t = new Float32Array(a.length), o = new Float32Array(a.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let m = 0; for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) if (a[y * w + k] > m) m = a[y * w + k]; t[y * w + x] = m; }
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) { let m = 0; for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++) if (t[k * w + x] > m) m = t[k * w + x]; o[y * w + x] = m; }
  return o;
}
function shift(a, w, h, dx, dy, fill = 0) {
  const o = new Float32Array(a.length); const ix = Math.round(dx), iy = Math.round(dy);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const sx = x - ix, sy = y - iy; o[y * w + x] = sx >= 0 && sy >= 0 && sx < w && sy < h ? a[sy * w + sx] : fill; }
  return o;
}
function fieldCanvas(field, w, h, color, opacity = 1) {
  const c = makeCanvas(w, h); const ctx = c.getContext('2d'); const id = ctx.createImageData(w, h);
  const r = color?.r ?? 0, g = color?.g ?? 0, b = color?.b ?? 0;
  for (let i = 0; i < field.length; i++) { const v = field[i]; if (v <= 0) continue; const o = i * 4; id.data[o] = r; id.data[o + 1] = g; id.data[o + 2] = b; id.data[o + 3] = Math.min(255, v * opacity * 255); }
  ctx.putImageData(id, 0, 0); return c;
}
const px = (v, k) => (v && typeof v === 'object' ? v.value : v || 0) * k;
const rad = (deg) => (deg * Math.PI) / 180;

/**
 * Turns Photoshop layer effects into extra positioned sub-layers (approximations of
 * Photoshop's own algorithms). Returns { pad, below:[], above:[], notes:[] } where each part is
 * { canvas, blend, opacity } covering the padded layer rect.
 */
export function renderEffects(layerCanvas, effects, k, globalAngle = 120) {
  const notes = [];
  if (!effects) return { pad: 0, below: [], above: [], notes };
  const sizes = [];
  for (const [key, list] of Object.entries(effects)) for (const e of list) sizes.push(px(e.size, k) + px(e.distance, k) + (key === 'stroke' ? px(e.size, k) : 0));
  const pad = Math.ceil(Math.max(0, ...sizes) * 1.5) + 2;
  const w = layerCanvas.width + pad * 2, h = layerCanvas.height + pad * 2;
  const src = makeCanvas(w, h); const sctx = src.getContext('2d'); sctx.drawImage(layerCanvas, pad, pad);
  const id = sctx.getImageData(0, 0, w, h);
  const A = new Float32Array(w * h); for (let i = 0; i < A.length; i++) A[i] = id.data[i * 4 + 3] / 255;
  const below = [], above = [];
  const ang = (e) => rad(e.useGlobalLight ? globalAngle : e.angle ?? globalAngle);
  for (const [key, list] of Object.entries(effects)) for (const e of list) {
    const blend = e.blendMode || 'normal'; const opacity = e.opacity ?? 1;
    if (key === 'dropShadow') {
      const a = ang(e), d = px(e.distance, k);
      const f = blurField(shift(A, w, h, -Math.cos(a) * d, Math.sin(a) * d), w, h, px(e.size, k) * (1 - (e.choke?.value ?? 0) / 100));
      below.push({ canvas: fieldCanvas(f, w, h, e.color, 1), blend, opacity });
    } else if (key === 'outerGlow') {
      const f = blurField(maxFilter(A, w, h, Math.round(px(e.size, k) * (e.choke?.value ?? 0) / 100)), w, h, px(e.size, k));
      below.push({ canvas: fieldCanvas(f, w, h, e.color, 1), blend: e.blendMode || 'screen', opacity });
    } else if (key === 'solidFill') {
      const f = A; above.push({ canvas: fieldCanvas(f, w, h, e.color, 1), blend, opacity });
    } else if (key === 'innerShadow') {
      const a = ang(e), d = px(e.distance, k);
      const inv = new Float32Array(A.length); for (let i = 0; i < A.length; i++) inv[i] = 1 - A[i];
      const s = blurField(shift(inv, w, h, -Math.cos(a) * d, Math.sin(a) * d, 1), w, h, px(e.size, k));
      const f = new Float32Array(A.length); for (let i = 0; i < A.length; i++) f[i] = A[i] * s[i];
      above.push({ canvas: fieldCanvas(f, w, h, e.color, 1), blend: e.blendMode || 'multiply', opacity });
    } else if (key === 'innerGlow') {
      const s = blurField(A, w, h, px(e.size, k));
      const f = new Float32Array(A.length);
      for (let i = 0; i < A.length; i++) f[i] = e.source === 'center' ? A[i] * s[i] : A[i] * (1 - s[i]);
      above.push({ canvas: fieldCanvas(f, w, h, e.color, 1), blend: e.blendMode || 'screen', opacity });
    } else if (key === 'bevel') {
      const size = Math.max(1, px(e.size, k)); const depth = (e.strength ?? 1) * (e.direction === 'down' ? -1 : 1);
      const Hf = blurField(A, w, h, size);
      const a = ang(e); const lx = Math.cos(a), ly = -Math.sin(a);
      const hi = new Float32Array(A.length), sh = new Float32Array(A.length);
      const gain = size * depth * 1.6;
      const inner = e.style !== 'outer bevel';
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const gx = (Hf[i + 1] - Hf[i - 1]) / 2, gy = (Hf[i + w] - Hf[i - w]) / 2;
        const s = -(gx * lx + gy * ly) * gain;
        const m = inner ? A[i] : 1 - A[i];
        if (s > 0) hi[i] = Math.min(1, s) * m; else sh[i] = Math.min(1, -s) * m;
      }
      above.push({ canvas: fieldCanvas(sh, w, h, e.shadowColor, 1), blend: e.shadowBlendMode || 'multiply', opacity: e.shadowOpacity ?? 0.75 });
      above.push({ canvas: fieldCanvas(hi, w, h, e.highlightColor || { r: 255, g: 255, b: 255 }, 1), blend: e.highlightBlendMode || 'screen', opacity: e.highlightOpacity ?? 0.75 });
    } else if (key === 'stroke') {
      const s = Math.max(1, Math.round(px(e.size, k)));
      let f;
      if (e.position === 'inside') { const inv = new Float32Array(A.length); for (let i = 0; i < A.length; i++) inv[i] = 1 - A[i]; const d = maxFilter(inv, w, h, s); f = new Float32Array(A.length); for (let i = 0; i < A.length; i++) f[i] = Math.min(A[i], d[i]); }
      else { const r = e.position === 'center' ? Math.ceil(s / 2) : s; const d = maxFilter(A, w, h, r); f = new Float32Array(A.length); for (let i = 0; i < A.length; i++) f[i] = Math.max(0, d[i] - (e.position === 'center' ? 0 : A[i])); }
      if (e.fillType && e.fillType !== 'color') notes.push(`${e.fillType} stroke drawn as a solid colour`);
      above.push({ canvas: fieldCanvas(f, w, h, e.color, 1), blend, opacity });
    } else notes.push(`Photoshop "${key}" effect is not reproduced`);
  }
  return { pad, below, above, notes };
}

/** Composites a positioned bitmap onto ctx. */
export function drawPart(ctx, canvas, x, y, blend = 'normal', opacity = 1) {
  if (opacity <= 0) return;
  ctx.save(); ctx.globalAlpha = Math.min(1, opacity); ctx.globalCompositeOperation = canvasBlend(blend);
  ctx.drawImage(canvas, x, y); ctx.restore();
}

/** Alpha-masks `canvas` (at x, y) by `maskCanvas` (at mx, my). Returns a new canvas. */
export function clipTo(canvas, x, y, maskCanvas, mx, my) {
  const c = makeCanvas(canvas.width, canvas.height); const ctx = c.getContext('2d');
  ctx.drawImage(canvas, 0, 0); ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(maskCanvas, mx - x, my - y);
  return c;
}

// ---------------- image comparison ----------------
/** Compares two RGBA buffers of the same size (both flattened over white). */
export function compareImages(a, b, w, h, region = null) {
  let n = 0, sum = 0, over = 0; const diffs = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (region && !region(x, y, i)) continue;
    const fa = a[i + 3] / 255, fb = b[i + 3] / 255; let m = 0;
    for (let c = 0; c < 3; c++) { const va = a[i + c] * fa + 255 * (1 - fa), vb = b[i + c] * fb + 255 * (1 - fb); m = Math.max(m, Math.abs(va - vb)); }
    sum += m; n++; if (m > 32) over++; if ((n & 15) === 0) diffs.push(m);
  }
  diffs.sort((p, q) => p - q);
  return { pixels: n, meanDiff: n ? +(sum / n).toFixed(2) : 0, pctOver32: n ? +((over / n) * 100).toFixed(2) : 0, p95: diffs.length ? diffs[Math.floor(diffs.length * 0.95)] : 0 };
}
