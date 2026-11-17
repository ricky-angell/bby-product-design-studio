// Illustrative product previews drawn with Canvas 2D. These are NOT official ShineOn
// mockups — every preview is stamped with that label. Official mockup folders are linked
// from the product spec sheet.
import { HEART_100 } from './editor.js';

const S = 900;

function metal(ctx, x0, y0, x1, y1, gold) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  const stops = gold ? ['#fff3c4', '#d9a93c', '#fff1b8', '#b8862a', '#f7e08a'] : ['#ffffff', '#b9c0cc', '#f4f6f9', '#8e97a6', '#e6eaf0'];
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}

function shapePath(shape, x, y, w, h) {
  const p = new Path2D();
  if (shape === 'circle') p.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  else if (shape === 'heart') { const m = new DOMMatrix().translate(x, y).scale(w / 100, h / 100); p.addPath(new Path2D(HEART_100), m); }
  else if (shape === 'dogtag') { const r = Math.min(w, h) * 0.3; p.roundRect(x, y, w, h, r); }
  else if (shape === 'star') {
    const cx = x + w / 2, cy = y + h / 2;
    for (let i = 0; i < 10; i++) { const a = (Math.PI / 5) * i - Math.PI / 2; const R = i % 2 ? w * 0.22 : w / 2; i ? p.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a) * (h / w)) : p.moveTo(cx + R * Math.cos(a), cy + R * Math.sin(a) * (h / w)); }
    p.closePath();
  } else if (shape === 'dome') { p.moveTo(x, y + h); p.lineTo(x, y + h * 0.45); p.ellipse(x + w / 2, y + h * 0.45, w / 2, h * 0.45, 0, Math.PI, 0); p.lineTo(x + w, y + h); p.closePath(); }
  else if (shape === 'paw') { p.ellipse(x + w * 0.5, y + h * 0.66, w * 0.3, h * 0.26, 0, 0, 7); for (const [cx, cy] of [[0.16, 0.36], [0.36, 0.16], [0.64, 0.16], [0.84, 0.36]]) { p.moveTo(x + w * cx + w * 0.13, y + h * cy); p.ellipse(x + w * cx, y + h * cy, w * 0.13, h * 0.14, 0, 0, 7); } }
  else p.rect(x, y, w, h);
  return p;
}

function fitRect(iw, ih, bw, bh) {
  const k = Math.min(bw / iw, bh / ih);
  return { w: iw * k, h: ih * k };
}

function backdrop(ctx, kind) {
  const g = ctx.createLinearGradient(0, 0, 0, S);
  if (kind === 'wall') { g.addColorStop(0, '#eceae6'); g.addColorStop(1, '#d9d5cf'); }
  else if (kind === 'table') { g.addColorStop(0, '#f3efe9'); g.addColorStop(1, '#e2dbd1'); }
  else { g.addColorStop(0, '#1a2440'); g.addColorStop(1, '#0b1226'); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
}

function shadow(ctx, blur = 30, y = 14, a = 0.35) { ctx.shadowColor = `rgba(0,0,0,${a})`; ctx.shadowBlur = blur; ctx.shadowOffsetY = y; }
function noShadow(ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }

/** Engraving look: dark pixels of the design become etched marks on the material. */
function engraved(design, tint) {
  const c = document.createElement('canvas'); c.width = design.width; c.height = design.height;
  const ctx = c.getContext('2d'); ctx.drawImage(design, 0, 0);
  const id = ctx.getImageData(0, 0, c.width, c.height); const d = id.data;
  const [r, g, b] = tint;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const ink = (d[i + 3] / 255) * (1 - lum / 255);
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = Math.round(ink * 235);
  }
  ctx.putImageData(id, 0, 0);
  return c;
}

function drawNecklace(ctx, cx, cy, size, gold, shape = 'circle') {
  ctx.save();
  ctx.strokeStyle = metal(ctx, cx - size * 2, 0, cx + size * 2, 0, gold);
  ctx.lineWidth = 3; ctx.setLineDash([5, 3]);
  ctx.beginPath(); ctx.moveTo(cx - size * 2.4, cy - size * 2.6); ctx.quadraticCurveTo(cx - size * 1.2, cy - size * 0.2, cx, cy - size * 0.45); ctx.quadraticCurveTo(cx + size * 1.2, cy - size * 0.2, cx + size * 2.4, cy - size * 2.6); ctx.stroke();
  ctx.setLineDash([]); shadow(ctx, 10, 4, 0.35);
  ctx.fillStyle = metal(ctx, cx - size / 2, cy - size / 2, cx + size / 2, cy + size / 2, gold);
  ctx.fill(shapePath(shape, cx - size / 2, cy - size * 0.4, size, size * 0.9));
  noShadow(ctx);
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.arc(cx - size * 0.15, cy - size * 0.05, size * 0.08, 0, 7); ctx.fill();
  ctx.restore();
}

function label(ctx, text) {
  ctx.save(); noShadow(ctx);
  ctx.fillStyle = 'rgba(8,16,38,0.82)'; ctx.fillRect(0, S - 46, S, 46);
  ctx.fillStyle = '#ffffff'; ctx.font = '600 17px Poppins, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, S / 2, S - 23);
  ctx.restore();
}

/**
 * @param out target canvas (resized to 900×900)
 * @param design canvas with the rendered design (any size, product aspect ratio)
 * @param product product record
 * @param opts { gold }
 */
export function drawPreview(out, design, product, opts = {}) {
  out.width = S; out.height = S;
  const ctx = out.getContext('2d');
  const shape = product.previewShape; const role = product.artworkRole;
  const n = product.name.toLowerCase(); const gold = !!opts.gold;
  const engrave = role === 'engraving';

  if (role === 'message-card') {
    backdrop(ctx, 'table');
    const isBox = /rose box|gift box/.test(n);
    const card = Math.min(560, 560);
    const { w, h } = fitRect(design.width, design.height, card, card);
    const x = (S - w) / 2, y = (S - h) / 2 - 20;
    if (isBox) { // gift box behind the card
      ctx.save(); shadow(ctx, 40, 20, 0.3);
      ctx.fillStyle = /red heart/.test(n) ? '#b3122c' : '#1c1c22';
      ctx.beginPath(); ctx.roundRect(x - 40, y - 40, w + 80, h + 80, 30); ctx.fill(); ctx.restore();
    }
    ctx.save(); shadow(ctx, 30, 14, 0.28); ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, h); noShadow(ctx);
    ctx.drawImage(design, x, y, w, h); ctx.restore();
    if (/watch/.test(n)) {
      const cx = S / 2, cy = y + h / 2; ctx.save(); shadow(ctx, 16, 6, 0.4);
      ctx.fillStyle = /wood/.test(n) ? '#7a4b2a' : '#1b1b1f'; ctx.fillRect(cx - 34, cy - 170, 68, 340);
      ctx.fillStyle = metal(ctx, cx - 80, cy - 80, cx + 80, cy + 80, false); ctx.beginPath(); ctx.arc(cx, cy, 82, 0, 7); ctx.fill();
      noShadow(ctx); ctx.fillStyle = /open work/.test(n) ? '#e9ecf1' : '#14161c'; ctx.beginPath(); ctx.arc(cx, cy, 68, 0, 7); ctx.fill(); ctx.restore();
    } else if (/ring/.test(n)) {
      ctx.save(); ctx.strokeStyle = metal(ctx, S / 2 - 60, 0, S / 2 + 60, 0, gold); ctx.lineWidth = 14; shadow(ctx, 10, 4, 0.35);
      ctx.beginPath(); ctx.ellipse(S / 2, y + h / 2, 56, 50, 0, 0, 7); ctx.stroke(); ctx.restore();
    } else if (/bracelet|bangle/.test(n)) {
      ctx.save(); ctx.strokeStyle = /leather|nylon|cross bracelet|love you forever/.test(n) ? '#3a2a1e' : metal(ctx, S / 2 - 100, 0, S / 2 + 100, 0, gold); ctx.lineWidth = 12; shadow(ctx, 10, 4, 0.35);
      ctx.beginPath(); ctx.ellipse(S / 2, y + h / 2, 110, 95, 0, 0, 7); ctx.stroke(); ctx.restore();
    } else {
      const ps = /heart|love/.test(n) ? 'heart' : /dog tag/.test(n) ? 'dogtag' : 'circle';
      drawNecklace(ctx, S / 2, y + h / 2, 92, gold, ps);
    }
    label(ctx, 'ILLUSTRATIVE PREVIEW — not an official ShineOn mockup');
    return;
  }

  if (shape === 'wrap') { // mugs / tumblers
    backdrop(ctx, 'table');
    const bodyW = 420, bodyH = /tumbler/.test(n) ? 560 : 400; const x = (S - bodyW) / 2, y = (S - bodyH) / 2 - 10;
    ctx.save(); shadow(ctx, 30, 16, 0.3);
    ctx.fillStyle = /black/.test(n) ? '#1d1f24' : '#ffffff'; ctx.beginPath(); ctx.roundRect(x, y, bodyW, bodyH, 18); ctx.fill(); noShadow(ctx);
    ctx.strokeStyle = /black/.test(n) ? '#1d1f24' : '#f3f3f3'; ctx.lineWidth = 34; ctx.beginPath(); ctx.ellipse(x + bodyW + 40, y + bodyH / 2, 70, 110, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    // visible ~half of the wrap, curved by slicing
    const srcW = design.width / 2, sx0 = design.width / 4; const slices = 60;
    const dh = Math.min(bodyH * 0.86, bodyW * 0.95 * design.height / srcW);
    for (let i = 0; i < slices; i++) {
      const t0 = i / slices, t1 = (i + 1) / slices;
      const a0 = Math.asin(t0 * 2 - 1), a1 = Math.asin(t1 * 2 - 1);
      const X0 = x + bodyW / 2 + Math.sin(a0) * bodyW / 2 * 0.98, X1 = x + bodyW / 2 + Math.sin(a1) * bodyW / 2 * 0.98;
      ctx.drawImage(design, sx0 + t0 * srcW, 0, srcW / slices + 1, design.height, X0, y + (bodyH - dh) / 2, Math.max(1, X1 - X0 + 0.6), dh);
    }
    const sh = ctx.createLinearGradient(x, 0, x + bodyW, 0); sh.addColorStop(0, 'rgba(0,0,0,0.25)'); sh.addColorStop(0.3, 'rgba(255,255,255,0.12)'); sh.addColorStop(0.7, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = sh; ctx.fillRect(x, y, bodyW, bodyH); ctx.restore();
    label(ctx, 'ILLUSTRATIVE PREVIEW (front half of wrap) — not an official mockup');
    return;
  }

  if (shape === 'apparel') {
    backdrop(ctx, 'studio');
    const shirt = new Path2D('M300 120 L370 95 Q450 140 530 95 L600 120 L760 220 L700 330 L640 300 L640 800 L260 800 L260 300 L200 330 L140 220 Z');
    ctx.save(); shadow(ctx, 30, 14, 0.4); ctx.fillStyle = opts.garment || '#f4f5f7'; ctx.fill(shirt); ctx.restore();
    const { w, h } = fitRect(design.width, design.height, 300, 360);
    ctx.drawImage(design, (S - w) / 2, 200 + (/back print/.test(n) ? 0 : 10), w, h);
    label(ctx, 'ILLUSTRATIVE PREVIEW — print placement approximate, not an official mockup');
    return;
  }

  const isAcrylic = /acrylic/.test(n) && !/journal/.test(n);
  const isJewelry = ['Graphic', 'Buyer Upload', 'Engraved', 'Bracelets', 'Keychains'].includes(product.category) || /necklace|bangle|keychain/.test(n);
  if (isJewelry || isAcrylic || ['circle', 'heart', 'dogtag', 'star', 'paw', 'dome'].includes(shape)) {
    backdrop(ctx, isAcrylic ? 'studio' : 'table');
    const box = isAcrylic ? 560 : 440;
    const { w, h } = fitRect(design.width, design.height, box, box);
    const x = (S - w) / 2, y = (S - h) / 2 - (isAcrylic ? 40 : 0);
    const clip = shapePath(shape === 'rect' && /bar/.test(n) ? 'rect' : shape, x, y, w, h);
    ctx.save();
    if (isAcrylic) {
      ctx.fillStyle = '#0c0f16'; ctx.beginPath(); ctx.roundRect(S / 2 - w * 0.42, y + h - 10, w * 0.84, 70, 10); ctx.fill();
      ctx.fillStyle = 'rgba(31,139,255,0.9)'; ctx.fillRect(S / 2 - w * 0.36, y + h + 4, w * 0.72, 6);
      shadow(ctx, 40, 0, 0.5); ctx.fillStyle = 'rgba(200,225,255,0.10)'; ctx.fill(clip); noShadow(ctx);
      ctx.save(); ctx.clip(clip);
      if (engrave) { const e = engraved(design, [210, 235, 255]); ctx.shadowColor = '#5fb4ff'; ctx.shadowBlur = 18; ctx.drawImage(e, x, y, w, h); }
      else ctx.drawImage(design, x, y, w, h);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3; ctx.stroke(clip);
    } else {
      if (!/keychain|watch|wallet|card|bangle|bracelet/.test(n)) { // chain
        ctx.save(); ctx.strokeStyle = metal(ctx, 0, 0, S, 0, gold); ctx.lineWidth = 4; ctx.setLineDash([6, 3]);
        ctx.beginPath(); ctx.moveTo(60, 0); ctx.quadraticCurveTo(S / 2 - w * 0.3, y - 30, S / 2, y + 6); ctx.quadraticCurveTo(S / 2 + w * 0.3, y - 30, S - 60, 0); ctx.stroke(); ctx.restore();
      }
      shadow(ctx, 24, 10, 0.35);
      ctx.fillStyle = metal(ctx, x, y, x + w, y + h, gold); ctx.save(); ctx.translate(S / 2, y + h / 2); ctx.scale(1.06, 1.06); ctx.translate(-S / 2, -(y + h / 2)); ctx.fill(clip); ctx.restore();
      noShadow(ctx);
      ctx.save(); ctx.clip(clip);
      if (engrave) { ctx.fillStyle = metal(ctx, x, y, x + w, y + h, gold); ctx.fill(clip); ctx.drawImage(engraved(design, [60, 64, 72]), x, y, w, h); }
      else { ctx.fillStyle = '#fff'; ctx.fill(clip); ctx.drawImage(design, x, y, w, h); const gl = ctx.createLinearGradient(x, y, x + w, y + h); gl.addColorStop(0, 'rgba(255,255,255,0.35)'); gl.addColorStop(0.45, 'rgba(255,255,255,0)'); ctx.fillStyle = gl; ctx.fill(clip); }
      ctx.restore();
      if (/keychain/.test(n)) { ctx.strokeStyle = metal(ctx, S / 2 - 40, 0, S / 2 + 40, 0, false); ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(S / 2, y - 50, 44, 0, 7); ctx.stroke(); }
    }
    ctx.restore();
    label(ctx, 'ILLUSTRATIVE PREVIEW — not an official ShineOn mockup');
    return;
  }

  // Generic flat products: wall art, blankets, pillows, bags, journals, mats, towels, etc.
  const wallArt = ['Posters', 'Metal Prints', 'Gallery Wrapped Canvas', 'Wall Tapestries', 'Wall Clocks'].includes(product.category);
  backdrop(ctx, wallArt ? 'wall' : 'table');
  const { w, h } = fitRect(design.width, design.height, 640, 640);
  const x = (S - w) / 2, y = (S - h) / 2 - 16;
  ctx.save(); shadow(ctx, wallArt ? 28 : 36, wallArt ? 16 : 20, 0.32);
  if (/clock/.test(n) || shape === 'circle') {
    const c = shapePath('circle', x, y, w, h); ctx.fillStyle = '#5a3b22'; ctx.save(); ctx.translate(S / 2, y + h / 2); ctx.scale(1.07, 1.07); ctx.translate(-S / 2, -(y + h / 2)); ctx.fill(c); ctx.restore();
    noShadow(ctx); ctx.save(); ctx.clip(c); ctx.drawImage(design, x, y, w, h); ctx.restore();
    if (/clock/.test(n)) { ctx.strokeStyle = '#111'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(S / 2, y + h / 2); ctx.lineTo(S / 2, y + h * 0.22); ctx.moveTo(S / 2, y + h / 2); ctx.lineTo(S / 2 + w * 0.2, y + h / 2); ctx.stroke(); }
  } else {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(x, y, w, h, /pillow|blanket|towel|bag|pouch/.test(n) ? 24 : 2); ctx.fill();
    noShadow(ctx); ctx.save(); ctx.clip(); ctx.drawImage(design, x, y, w, h);
    if (engrave) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#8a6a4a'; ctx.fillRect(x, y, w, h); }
    ctx.restore();
  }
  ctx.restore();
  label(ctx, `ILLUSTRATIVE PREVIEW${/pillow|blanket|bag|tote|pouch|towel|apron|stocking|pennant|mat/.test(n) ? ' — sewn edges/wrap not shown' : ''} — not an official mockup`);
}
