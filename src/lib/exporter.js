// "BUILD MY PRODUCT DESIGN": render each surface at the exact required pixel size,
// encode in the required format, write DPI metadata, then re-read the produced bytes
// and validate them against the product specification.
import { StaticCanvas, Path, Point, util } from 'fabric';
import UPNG from 'upng-js';
import { setPngDpi, setJpegDpi, inspectFile, isBlack, formatBytes } from './filemeta.js';
import { ensureFontsLoaded, getOpentypeFont } from './fonts.js';
import { getAsset } from './assets.js';
import { EXTRA_PROPS } from './editor.js';

const MB = 1000 * 1000; // strict decimal megabytes — the safer reading of "Under N MB"

export function slugify(s) { return String(s).toLowerCase().replace(/["”]/g, 'in').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

export function fileNameFor(product, surface, format) {
  const dpi = typeof product.dpi === 'number' ? `_${product.dpi}dpi` : '';
  const side = product.surfaces.length > 1 ? `_${surface.id}` : '';
  return `${slugify(product.name)}${side}_${surface.width}x${surface.height}${dpi}.${format === 'JPG' ? 'jpg' : format.toLowerCase()}`;
}

/** Can this browser allocate and draw a canvas of w×h? */
export function canRender(w, h) {
  try {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d'); if (!ctx) return false;
    ctx.fillStyle = '#123456'; ctx.fillRect(w - 1, h - 1, 1, 1);
    const ok = ctx.getImageData(w - 1, h - 1, 1, 1).data[3] === 255;
    c.width = c.height = 0;
    return ok;
  } catch { return false; }
}

async function rehydrate(objects) {
  for (const o of objects || []) {
    if (o.assetId) { const a = await getAsset(o.assetId); if (a) o.src = a.url; }
    if (o.objects) await rehydrate(o.objects);
  }
}

function familiesIn(objects, out = new Set()) {
  for (const o of objects || []) { if (o.fontFamily) out.add(o.fontFamily); if (o.objects) familiesIn(o.objects, out); }
  return out;
}

/** Load a surface design into an off-screen StaticCanvas of exactly w×h pixels. */
export async function loadStatic(json, w, h, { scale = 1 } = {}) {
  const data = typeof json === 'string' ? JSON.parse(json) : structuredClone(json);
  await rehydrate(data.objects);
  await ensureFontsLoaded([...familiesIn(data.objects)]);
  const el = document.createElement('canvas');
  const sc = new StaticCanvas(el, { width: Math.round(w * scale), height: Math.round(h * scale), enableRetinaScaling: false, renderOnAddRemove: false });
  await sc.loadFromJSON(data);
  sc.backgroundColor = '';
  if (scale !== 1) sc.setViewportTransform([scale, 0, 0, scale, 0, 0]);
  sc.getObjects().forEach((o) => { if (o.type === 'textbox') o.initDimensions(); });
  sc.renderAll();
  return sc;
}

function canvasToBlob(el, type, quality) {
  return new Promise((res, rej) => el.toBlob((b) => (b ? res(b) : rej(new Error(`The browser could not encode ${type} at this size.`))), type, quality));
}

/** Fraction of pixels that are not fully opaque (scanned in strips to limit memory). */
function transparencyFraction(el) {
  const ctx = el.getContext('2d', { willReadFrequently: true });
  const { width: w, height: h } = el;
  const strip = Math.max(1, Math.floor(4_000_000 / w));
  let transparent = 0;
  for (let y = 0; y < h; y += strip) {
    const rows = Math.min(strip, h - y);
    const d = ctx.getImageData(0, y, w, rows).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] < 255) transparent++;
  }
  return transparent / (w * h);
}

/** Low-resolution analysis of the design (transparency coverage, colour usage). */
async function analyse(json, surface) {
  const k = Math.min(1, 400 / Math.max(surface.width, surface.height));
  const sc = await loadStatic(json, surface.width, surface.height, { scale: k });
  const el = sc.getElement();
  const ctx = el.getContext('2d', { willReadFrequently: true });
  const d = ctx.getImageData(0, 0, el.width, el.height).data;
  let transparent = 0, colored = 0, opaque = 0, grey = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 255) transparent++;
    if (d[i + 3] > 20) {
      opaque++;
      const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
      if (mx - mn > 40) colored++; else if (mx > 40 && mx < 215) grey++;
    }
  }
  const n = d.length / 4;
  const objs = sc.getObjects();
  const info = {
    transparentFraction: transparent / n,
    coloredFraction: opaque ? colored / opaque : 0,
    greyFraction: opaque ? grey / opaque : 0,
    visibleObjects: objs.filter((o) => o.visible !== false).length,
    images: [], outOfBounds: [], nearEdge: [],
  };
  const m = 0.05;
  for (const o of objs) {
    if (o.visible === false || o.isBackground) continue;
    const br = o.getBoundingRect();
    // getBoundingRect is in scene coords (unaffected by viewport) in Fabric 6+
    const W = surface.width, H = surface.height;
    if (br.left < -1 || br.top < -1 || br.left + br.width > W + 1 || br.top + br.height > H + 1) {
      if (!(o.type === 'image' && o.layerName === 'Background image')) info.outOfBounds.push(o.layerName || o.type);
    }
    if (o.type === 'textbox' && (br.left < W * m || br.top < H * m || br.left + br.width > W * (1 - m) || br.top + br.height > H * (1 - m))) info.nearEdge.push(o.text.slice(0, 24));
    if (o.type === 'image') info.images.push({ name: o.layerName || 'Image', scale: Math.max(o.scaleX, o.scaleY), naturalW: o.width, naturalH: o.height });
  }
  sc.dispose();
  return info;
}

/** Replace every textbox with vector paths built from the bundled font files. */
async function convertTextToPaths(sc) {
  for (const t of [...sc.getObjects()]) {
    if (t.type !== 'textbox' && t.type !== 'i-text' && t.type !== 'text') continue;
    const font = await getOpentypeFont(t.fontFamily, t.fontWeight, t.fontStyle);
    t.initDimensions();
    const left = t._getLeftOffset(), top = t._getTopOffset();
    let lineHeights = 0; let d = '';
    for (let i = 0; i < t._textLines.length; i++) {
      const Hi = t.getHeightOfLineImpl ? t.getHeightOfLineImpl(i) : t.getHeightOfLine(i) / t.lineHeight;
      const baseline = top + lineHeights + Hi - Hi * t._fontSizeFraction;
      const lineLeft = left + t._getLineLeftOffset(i);
      const bounds = t.__charBounds[i];
      t._textLines[i].forEach((ch, j) => {
        if (!ch.trim()) return;
        const x = lineLeft + bounds[j].left + (j === 0 ? bounds[j].kernedWidth - bounds[j].width : 0);
        d += font.getPath(ch, x, baseline, t.fontSize, { kerning: false }).toPathData(3) + ' ';
      });
      lineHeights += t.getHeightOfLine(i);
    }
    const idx = sc.getObjects().indexOf(t);
    sc.remove(t);
    if (!d.trim()) continue;
    const p = new Path(d, { fill: t.fill, stroke: t.strokeWidth > 0 ? t.stroke : null, strokeWidth: t.strokeWidth || 0, opacity: t.opacity, paintFirst: t.paintFirst, layerName: t.layerName || 'Text', visible: t.visible });
    const c = util.transformPoint(new Point(p.pathOffset.x, p.pathOffset.y), t.calcTransformMatrix());
    p.set({ originX: 'center', originY: 'center', left: c.x, top: c.y, angle: t.angle, scaleX: t.scaleX, scaleY: t.scaleY, skewX: t.skewX, skewY: t.skewY, flipX: t.flipX, flipY: t.flipY });
    p.setCoords();
    sc.insertAt(idx, p);
  }
}

function cleanStrokes(sc) {
  const walk = (o) => { if (o.type === 'group') o.getObjects().forEach(walk); if (!o.strokeWidth) o.set('stroke', null); };
  sc.getObjects().forEach(walk);
}

const check = (id, label, status, detail, fix) => ({ id, label, status, detail, fix });

/**
 * Build one surface. Returns { fileName, blob, format, inspect, checks, ok }.
 * options: { format, flattenColor, optimizePng, jpegQuality }
 */
export async function buildSurface(product, surface, json, options = {}) {
  const format = options.format || product.formats[0] || 'PNG';
  const { width: W, height: H } = surface;
  const checks = [];
  const data = JSON.parse(json || '{"objects":[]}');

  if (!canRender(W, H)) {
    checks.push(check('render', 'Browser can render this size', 'fail', `This browser cannot create a ${W}×${H} canvas (${(W * H / 1e6).toFixed(1)} megapixels). Use desktop Chrome, Edge or Firefox for this product — phones and Safari have lower limits.`));
    return { ok: false, checks, format };
  }

  const info = await analyse(json, surface);
  if (!info.visibleObjects) checks.push(check('empty', 'Design has content', 'fail', 'The artwork is empty. Add text, images or shapes.'));

  const noTransparency = product.transparency === 'not-allowed' || format === 'JPG';
  const flatten = noTransparency ? (options.flattenColor || '#ffffff') : null;

  let blob, svgText = null;
  const sc = await loadStatic(data, W, H);
  try {
    if (format === 'SVG') {
      cleanStrokes(sc);
      await convertTextToPaths(sc);
      if (flatten) sc.backgroundColor = flatten;
      sc.renderAll();
      svgText = sc.toSVG({ width: W, height: H, viewBox: { x: 0, y: 0, width: W, height: H } });
      svgText = svgText.replace(/<desc>[\s\S]*?<\/desc>/, '<desc>Created with BBY Product Design Studio</desc>');
      blob = new Blob([svgText], { type: 'image/svg+xml' });
    } else {
      if (flatten) { sc.backgroundColor = flatten; sc.renderAll(); }
      const el = sc.getElement();
      if (el.width !== W || el.height !== H) throw new Error(`Internal render size ${el.width}×${el.height} does not match ${W}×${H}`);
      if (format === 'PNG') {
        let bytes;
        if (options.optimizePng) {
          const ctx = el.getContext('2d', { willReadFrequently: true });
          const rgba = ctx.getImageData(0, 0, W, H).data.buffer;
          bytes = new Uint8Array(UPNG.encode([rgba], W, H, 256));
        } else bytes = new Uint8Array(await (await canvasToBlob(el, 'image/png')).arrayBuffer());
        if (typeof product.dpi === 'number') bytes = setPngDpi(bytes, product.dpi);
        blob = new Blob([bytes], { type: 'image/png' });
        if (!noTransparency) info.exportTransparentFraction = transparencyFraction(el);
      } else {
        let q = options.jpegQuality || 0.92;
        const max = product.maxFileSizeMB ? product.maxFileSizeMB * MB : Infinity;
        for (;;) {
          let bytes = new Uint8Array(await (await canvasToBlob(el, 'image/jpeg', q)).arrayBuffer());
          if (typeof product.dpi === 'number') bytes = setJpegDpi(bytes, product.dpi);
          blob = new Blob([bytes], { type: 'image/jpeg' });
          if (blob.size <= max || q <= 0.5) break;
          q = Math.round((q - 0.07) * 100) / 100;
        }
        info.jpegQuality = q;
      }
    }
  } finally { sc.dispose(); }

  // ---- independent re-inspection of the produced bytes ----
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const ins = inspectFile(format === 'SVG' ? svgText : bytes, format);
  if (!ins.ok) checks.push(check('valid', `Valid ${format} file`, 'fail', ins.error));
  else checks.push(check('valid', `Valid ${format} file`, 'pass', format === 'PNG' ? `PNG structure and checksums OK${ins.crcOk ? '' : ' (CRC mismatch!)'}` : format === 'JPG' ? 'JPEG structure OK' : 'Well-formed SVG document'));

  if (format === 'SVG') {
    const parsed = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    if (parsed.querySelector('parsererror')) checks.push(check('svgparse', 'SVG parses cleanly', 'fail', 'The SVG could not be parsed by the browser XML parser.'));
    if (ins.hasScript) checks.push(check('svgscript', 'SVG contains no scripts', 'fail', 'Script content found in SVG.'));
  }

  // Dimensions
  const dimOk = ins.ok && Math.round(ins.width) === W && Math.round(ins.height) === H;
  checks.push(check('dims', 'Exact pixel dimensions', dimOk ? 'pass' : 'fail', `Required ${W}×${H}px — file is ${ins.width}×${ins.height}px${format === 'SVG' && ins.viewBox ? ` (viewBox ${ins.viewBox.join(' ')})` : ''}`));

  // Format
  const fmtOk = product.formats.includes(format);
  checks.push(check('format', 'Accepted file format', fmtOk ? 'pass' : 'fail', `ShineOn lists: ${product.formatText || product.formats.join('/') || 'not stated'} — exported ${format}`));

  // DPI
  if (typeof product.dpi === 'number' && format === 'SVG') {
    checks.push(check('dpi', 'Resolution (DPI)', 'pass', `SVG is vector and has no DPI field. It uses ShineOn's exact ${W}×${H} pixel grid (= ${(W / product.dpi).toFixed(2)}" × ${(H / product.dpi).toFixed(2)}" at ${product.dpi} DPI).`));
  } else if (typeof product.dpi === 'number') {
    checks.push(check('dpi', 'Resolution metadata (DPI)', ins.dpi === product.dpi ? 'pass' : 'fail', `Required ${product.dpi} DPI — file declares ${ins.dpi ?? 'none'} DPI`));
  } else if (product.dpi === 'any') {
    checks.push(check('dpi', 'Resolution metadata (DPI)', 'pass', 'ShineOn accepts any DPI for this product (vector SVG).'));
  } else {
    checks.push(check('dpi', 'Resolution metadata (DPI)', 'warn', 'ShineOn does not state a DPI for this product, so none was written. Confirm with ShineOn.'));
  }

  // File size
  if (product.maxFileSizeMB) {
    const ok = blob.size <= product.maxFileSizeMB * MB;
    checks.push(check('size', 'File size limit', ok ? 'pass' : 'fail', `${formatBytes(blob.size)} — limit under ${product.maxFileSizeMB} MB${info.jpegQuality && info.jpegQuality < 0.92 ? ` (JPEG quality lowered to ${Math.round(info.jpegQuality * 100)}% to fit)` : ''}${options.optimizePng ? ' (optimised PNG, 256 colours)' : ''}`, !ok && format === 'PNG' && !options.optimizePng ? 'optimize-png' : null));
  } else checks.push(check('size', 'File size limit', 'warn', `${formatBytes(blob.size)} — ShineOn does not state a limit for this product.`));

  // Transparency
  if (product.transparency === 'not-allowed' || format === 'JPG') {
    const had = info.transparentFraction > 0.0005;
    const flatOk = format === 'JPG' || !ins.hasAlphaChannel || info.transparentFraction <= 0.0005 || !!flatten;
    checks.push(check('transparency', 'No transparency', flatOk ? (had ? 'warn' : 'pass') : 'fail',
      had ? `${(info.transparentFraction * 100).toFixed(1)}% of your design was transparent and has been filled with ${flatten}. Add a background if you want a different colour.` : 'Design is fully opaque.', had ? 'add-background' : null));
  } else if (product.transparency === 'allowed') {
    const frac = info.exportTransparentFraction ?? info.transparentFraction;
    checks.push(check('transparency', 'Transparency', 'pass', format === 'PNG' ? (ins.hasAlphaChannel ? `Allowed — transparency preserved (${(frac * 100).toFixed(1)}% transparent pixels).` : 'Allowed — design is fully opaque.') : 'Allowed for this product.'));
  } else if (product.transparency === 'required') {
    checks.push(check('transparency', 'Transparency', info.transparentFraction > 0.0005 ? 'pass' : 'warn', `ShineOn: "${product.transparencySource?.quote}" Your design is ${(info.transparentFraction * 100).toFixed(1)}% transparent.`));
  } else {
    checks.push(check('transparency', 'Transparency', 'warn', `ShineOn does not state a transparency rule for this product. Your file ${ins.hasAlphaChannel && info.transparentFraction > 0.0005 ? 'contains' : 'does not contain'} transparent areas.`));
  }

  // Engraving colour rules
  if (product.artworkRole === 'engraving') {
    const solidBlack = product.colorRequirements.some((c) => c.rule === 'solid-black');
    if (format === 'SVG') {
      const nonBlack = ins.paintColors.filter((c) => !isBlack(c) && !['transparent', 'rgba(0,0,0,0)'].includes(c.replace(/\s/g, '')));
      checks.push(check('engrave-color', solidBlack ? 'Solid black artwork' : 'Engraving colours', nonBlack.length ? (solidBlack ? 'fail' : 'warn') : 'pass', nonBlack.length ? `Non-black colours found: ${nonBlack.slice(0, 5).join(', ')}. Engraving needs solid black.` : 'All artwork is solid black.', nonBlack.length ? 'make-black' : null));
      checks.push(check('engrave-vector', 'Vector artwork (no photos)', ins.hasRasterImage ? 'fail' : 'pass', ins.hasRasterImage ? 'The SVG contains a raster photo, which cannot be engraved as a vector. Use "Trace to vector" on the image, or remove it.' : 'Contains only vector shapes and outlined text.', ins.hasRasterImage ? 'trace' : null));
      checks.push(check('engrave-text', 'Text converted to outlines', ins.hasText ? 'fail' : 'pass', ins.hasText ? 'SVG still contains live text.' : 'All text was converted to vector outlines (no font needed by ShineOn).'));
    } else if (info.coloredFraction > 0.05) {
      checks.push(check('engrave-color', 'Engraving colours', 'warn', 'This product is engraved — colours will not be reproduced. A black design gives the most predictable result.', 'make-black'));
    }
  }

  // Message-card colour note
  if (product.artworkRole === 'message-card') checks.push(check('rgb', 'RGB colour', 'pass', 'Exported in RGB, as ShineOn recommends for message cards.'));

  // Image quality
  const ref = typeof product.dpi === 'number' ? product.dpi : null;
  for (const im of info.images) {
    if (im.scale > 1.5) checks.push(check('upscale', `Image quality: ${im.name}`, 'warn', `This image is enlarged ${im.scale.toFixed(1)}× beyond its original pixels${ref ? ` (effective ≈${Math.round(ref / im.scale)} DPI)` : ''}. It may print soft. Use a larger original if you can.`));
  }
  if (info.outOfBounds.length) checks.push(check('bounds', 'Everything inside the artwork', 'warn', `Partly outside the artwork edge (will be cut off): ${info.outOfBounds.slice(0, 4).join(', ')}`));
  if (info.nearEdge.length) checks.push(check('edge', 'Text away from edges', 'warn', `Text close to the edge (inside the advisory 5% margin): "${info.nearEdge.slice(0, 3).join('", "')}". ShineOn trims a little at the edges.`));

  const ok = !checks.some((c) => c.status === 'fail');
  return { ok, checks, format, blob, fileName: fileNameFor(product, surface, format), inspect: ins, size: blob.size, svgText };
}

/** Product-level readiness: every surface passes AND the spec itself is verified. */
export function readiness(product, variant, results) {
  const reasons = [];
  if (results.some((r) => !r.ok)) reasons.push('One or more required checks failed — fix the items marked ✗ and build again.');
  if (product.specStatus !== 'VERIFIED') reasons.push('This product\'s ShineOn specification NEEDS VERIFICATION (see the spec sheet). Confirm it in the ShineOn product editor before uploading.');
  if (variant && variant.specStatus === 'NEEDS VERIFICATION') reasons.push(`The "${variant.label}" option needs verification: ${variant.note}`);
  if (product.availability !== 'available') reasons.push(`ShineOn lists this product as ${product.availability.replace(/-/g, ' ')}.`);
  return { productionReady: reasons.length === 0, reasons };
}

/** A small PNG thumbnail of a surface (for project lists and previews). */
export async function renderPreviewCanvas(json, surface, maxSide = 900) {
  const k = Math.min(1, maxSide / Math.max(surface.width, surface.height));
  const sc = await loadStatic(json, surface.width, surface.height, { scale: k });
  const out = document.createElement('canvas');
  out.width = sc.getElement().width; out.height = sc.getElement().height;
  out.getContext('2d').drawImage(sc.getElement(), 0, 0);
  sc.dispose();
  return out;
}

export { EXTRA_PROPS };
