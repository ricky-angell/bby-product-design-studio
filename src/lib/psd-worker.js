// Web Worker: parses an official ShineOn mockup PSD (in the user's own browser — the file
// is never uploaded) and returns a simplified, downscaled layer tree for kit building.
import { readPsd, initializeCanvas } from 'ag-psd';

initializeCanvas(
  (w, h) => new OffscreenCanvas(Math.max(1, w), Math.max(1, h)),
  (w, h) => new ImageData(Math.max(1, w), Math.max(1, h)),
);

const transfers = [];

/** Resample an ImageData positioned at (left, top) in document space into kit space (factor k). */
function scaleImage(id, left, top, k) {
  if (!id || !id.width || !id.height) return null;
  const x0 = Math.floor(left * k), y0 = Math.floor(top * k);
  const x1 = Math.ceil((left + id.width) * k), y1 = Math.ceil((top + id.height) * k);
  const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
  let cur = new OffscreenCanvas(id.width, id.height);
  cur.getContext('2d').putImageData(id instanceof ImageData ? id : new ImageData(new Uint8ClampedArray(id.data.buffer, id.data.byteOffset, id.data.length), id.width, id.height), 0, 0);
  // halve repeatedly first so large reductions stay smooth (same document rect each time)
  let cw = id.width, ch = id.height;
  while (k * id.width < cw / 2.2 && cw > 8 && ch > 8) {
    const nw = Math.round(cw / 2), nh = Math.round(ch / 2);
    const t = new OffscreenCanvas(nw, nh); const tc = t.getContext('2d'); tc.imageSmoothingQuality = 'high';
    tc.drawImage(cur, 0, 0, nw, nh); cur = t; cw = nw; ch = nh;
  }
  const dst = new OffscreenCanvas(w, h);
  const ctx = dst.getContext('2d');
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(cur, left * k - x0, top * k - y0, id.width * k, id.height * k);
  const out = ctx.getImageData(0, 0, w, h);
  transfers.push(out.data.buffer);
  return { x: x0, y: y0, width: w, height: h, data: out.data };
}
let K = 1;

function slimEffects(fx) {
  if (!fx || fx.disabled) return null;
  const out = {};
  for (const [key, v] of Object.entries(fx)) {
    if (key === 'scale' || key === 'disabled') continue;
    const list = (Array.isArray(v) ? v : [v]).filter((e) => e && e.enabled);
    if (list.length) out[key] = list;
  }
  return Object.keys(out).length ? out : null;
}

function slimLayer(l) {
  const o = {
    name: l.name || '', hidden: !!l.hidden, opacity: l.opacity ?? 1, fillOpacity: l.fillOpacity ?? 1,
    blendMode: l.blendMode || 'normal', clipping: !!l.clipping,
    left: l.left || 0, top: l.top || 0, right: l.right || 0, bottom: l.bottom || 0,
    isGroup: !!l.children, effects: slimEffects(l.effects), text: !!l.text,
    adjustment: l.adjustment?.type || null, vectorMask: !!l.vectorMask,
    vectorFill: l.vectorFill?.type === 'color' ? { type: 'color', color: l.vectorFill.color } : l.vectorFill ? { type: l.vectorFill.type } : null,
  };
  if (l.imageData) o.image = scaleImage(l.imageData, l.left || 0, l.top || 0, K);
  if (l.mask && !l.mask.disabled) {
    o.mask = { defaultColor: l.mask.defaultColor ?? 0, positionRelativeToLayer: !!l.mask.positionRelativeToLayer };
    if (l.mask.imageData) o.mask.image = scaleImage(l.mask.imageData, l.mask.left || 0, l.mask.top || 0, K);
  }
  if (l.placedLayer) {
    const p = l.placedLayer;
    o.placed = { id: p.id, width: p.width, height: p.height, transform: p.transform, nonAffineTransform: p.nonAffineTransform || null, warp: p.warp ? { style: p.warp.style, mesh: p.warp.customEnvelopeWarp?.meshPoints || null, value: p.warp.value } : null, type: p.type };
  }
  if (l.children) o.children = l.children.map(slimLayer);
  return o;
}

async function decodeLinked(f, maxSide) {
  try {
    if (!f?.data) return null;
    let bmp = null;
    if (/^(8BPS|8BPB)$/.test(f.type) || /\.ps[bd]$/i.test(f.name || '')) {
      const p = readPsd(f.data, { skipLayerImageData: true, skipThumbnail: true, useImageData: true, skipLinkedFilesData: true });
      if (!p.imageData) return null;
      const c = new OffscreenCanvas(p.width, p.height); c.getContext('2d').putImageData(p.imageData, 0, 0); bmp = c;
    } else {
      bmp = await createImageBitmap(new Blob([f.data]));
    }
    const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
    const c = new OffscreenCanvas(w, h); const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(bmp, 0, 0, w, h);
    const id = ctx.getImageData(0, 0, w, h); transfers.push(id.data.buffer);
    return { width: w, height: h, data: id.data, sourceWidth: bmp.width, sourceHeight: bmp.height };
  } catch { return null; }
}

self.onmessage = async (e) => {
  const { buffer, maxSide = 1600, wantLinked = [] } = e.data;
  transfers.length = 0;
  try {
    const psd = readPsd(buffer, { useImageData: true, skipThumbnail: true });
    K = Math.min(1, maxSide / Math.max(psd.width, psd.height));
    const tree = {
      width: psd.width, height: psd.height, scale: K, kitWidth: Math.round(psd.width * K), kitHeight: Math.round(psd.height * K),
      bitsPerChannel: psd.bitsPerChannel, colorMode: psd.colorMode,
      children: (psd.children || []).map(slimLayer),
      composite: psd.imageData ? scaleImage(psd.imageData, 0, 0, K) : null,
      linked: {},
    };
    // decode the smart-object contents of placed layers (used to verify the warp)
    const want = new Set(wantLinked.length ? wantLinked : collectPlacedIds(tree.children));
    for (const f of psd.linkedFiles || []) if (want.has(f.id)) tree.linked[f.id] = await decodeLinked(f, 1400);
    self.postMessage({ ok: true, tree }, transfers);
  } catch (err) {
    self.postMessage({ ok: false, error: err?.message || String(err) });
  }
};

function collectPlacedIds(ls, out = []) { for (const l of ls || []) { if (l.placed?.id) out.push(l.placed.id); collectPlacedIds(l.children, out); } return out; }
