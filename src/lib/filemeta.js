// Binary helpers for writing and independently re-reading exported files.
// Pure functions on Uint8Array — no DOM — so they run in the browser and in Node tests.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes, start = 0, end = bytes.length) {
  let c = 0xffffffff;
  for (let i = start; i < end; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10];
const u32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const u16 = (b, o) => (b[o] << 8) | b[o + 1];
const str = (b, o, n) => String.fromCharCode(...b.subarray(o, o + n));

export function isPng(b) { return b.length > 8 && PNG_SIG.every((v, i) => b[i] === v); }
export function isJpeg(b) { return b.length > 3 && b[0] === 0xff && b[1] === 0xd8; }

export function pngChunks(b) {
  const chunks = [];
  let o = 8;
  while (o + 8 <= b.length) {
    const len = u32(b, o);
    const type = str(b, o + 4, 4);
    chunks.push({ type, offset: o, length: len, dataOffset: o + 8 });
    o += 12 + len;
    if (type === 'IEND') break;
  }
  return chunks;
}

/** Insert/replace a pHYs chunk so the PNG declares `dpi` dots per inch. */
export function setPngDpi(b, dpi) {
  if (!isPng(b)) throw new Error('Not a PNG');
  const ppm = Math.round(dpi / 0.0254);
  const chunks = pngChunks(b).filter((c) => c.type !== 'pHYs');
  const phys = new Uint8Array(21);
  const dv = new DataView(phys.buffer);
  dv.setUint32(0, 9);
  phys.set([0x70, 0x48, 0x59, 0x73], 4); // 'pHYs'
  dv.setUint32(8, ppm);
  dv.setUint32(12, ppm);
  phys[16] = 1; // unit: metre
  dv.setUint32(17, crc32(phys, 4, 17));
  const parts = [b.subarray(0, 8)];
  for (const c of chunks) {
    parts.push(b.subarray(c.offset, c.offset + 12 + c.length));
    if (c.type === 'IHDR') parts.push(phys);
  }
  return concat(parts);
}

export function concat(parts) {
  const len = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/** Set JFIF density (dots per inch) on a JPEG; inserts an APP0 JFIF segment if missing. */
export function setJpegDpi(b, dpi) {
  if (!isJpeg(b)) throw new Error('Not a JPEG');
  const out = new Uint8Array(b);
  if (out[2] === 0xff && out[3] === 0xe0 && str(out, 6, 5) === 'JFIF\0') {
    out[13] = 1; // units: dots per inch
    out[14] = (dpi >> 8) & 0xff; out[15] = dpi & 0xff;
    out[16] = (dpi >> 8) & 0xff; out[17] = dpi & 0xff;
    return out;
  }
  const app0 = new Uint8Array([0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 1, (dpi >> 8) & 0xff, dpi & 0xff, (dpi >> 8) & 0xff, dpi & 0xff, 0, 0]);
  return concat([b.subarray(0, 2), app0, b.subarray(2)]);
}

/** Independently inspect an exported file's bytes. */
export function inspectFile(bytes, kind) {
  if (kind === 'PNG') {
    if (!isPng(bytes)) return { ok: false, error: 'File is not a valid PNG' };
    const chunks = pngChunks(bytes);
    const ihdr = chunks.find((c) => c.type === 'IHDR');
    if (!ihdr) return { ok: false, error: 'PNG has no IHDR' };
    const d = ihdr.dataOffset;
    const colorType = bytes[d + 9];
    const res = { ok: true, width: u32(bytes, d), height: u32(bytes, d + 4), bitDepth: bytes[d + 8], colorType, hasAlphaChannel: colorType === 4 || colorType === 6 || chunks.some((c) => c.type === 'tRNS'), dpi: null, crcOk: true };
    const phys = chunks.find((c) => c.type === 'pHYs');
    if (phys && bytes[phys.dataOffset + 8] === 1) res.dpi = Math.round(u32(bytes, phys.dataOffset) * 0.0254);
    for (const c of chunks) if (crc32(bytes, c.offset + 4, c.dataOffset + c.length) !== u32(bytes, c.dataOffset + c.length)) res.crcOk = false;
    res.hasIEND = chunks.at(-1)?.type === 'IEND';
    return res;
  }
  if (kind === 'JPG') {
    if (!isJpeg(bytes)) return { ok: false, error: 'File is not a valid JPEG' };
    const res = { ok: true, width: null, height: null, dpi: null, hasAlphaChannel: false };
    let o = 2;
    while (o + 4 < bytes.length) {
      if (bytes[o] !== 0xff) { o++; continue; }
      const m = bytes[o + 1];
      if (m === 0xd9 || m === 0xda) break;
      const len = u16(bytes, o + 2);
      if (m === 0xe0 && str(bytes, o + 4, 5) === 'JFIF\0') {
        const units = bytes[o + 11]; const xd = u16(bytes, o + 12);
        res.dpi = units === 1 ? xd : units === 2 ? Math.round(xd * 2.54) : null;
      }
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        res.height = u16(bytes, o + 5); res.width = u16(bytes, o + 7);
      }
      o += 2 + len;
    }
    res.hasEOI = bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
    if (!res.width) return { ok: false, error: 'JPEG has no frame header' };
    return res;
  }
  if (kind === 'SVG') {
    const text = typeof bytes === 'string' ? bytes : new TextDecoder().decode(bytes);
    return inspectSvgText(text);
  }
  return { ok: false, error: `Unknown kind ${kind}` };
}

/** Lightweight SVG inspection (string based so it also works in Node without a DOM). */
export function inspectSvgText(text) {
  const open = text.match(/<svg\b[^>]*>/i);
  if (!open || !/<\/svg>\s*$/i.test(text.trim())) return { ok: false, error: 'Not a complete <svg> document' };
  const attr = (n) => { const m = open[0].match(new RegExp(`\\s${n}="([^"]*)"`, 'i')); return m ? m[1] : null; };
  const vb = (attr('viewBox') || '').split(/[\s,]+/).map(Number);
  const num = (v) => (v == null ? null : parseFloat(v));
  const fills = new Set();
  for (const m of text.matchAll(/(?:^|[\s;"'])(?:fill|stroke)\s*[:=]\s*["']?\s*([a-z]+\([^)]*\)|#[0-9a-f]{3,8}\b|[a-z]+)/gi)) {
    const v = m[1].trim().toLowerCase();
    if (v && v !== 'none' && !v.startsWith('url(')) fills.add(v);
  }
  return {
    ok: true,
    width: num(attr('width')),
    height: num(attr('height')),
    viewBox: vb.length === 4 && vb.every(Number.isFinite) ? vb : null,
    hasRasterImage: /<image\b/i.test(text),
    hasText: /<text\b/i.test(text),
    hasScript: /<script\b|\son\w+\s*=/i.test(text),
    paintColors: [...fills],
  };
}

/** Is a CSS colour string effectively pure black? */
export function isBlack(c) {
  if (!c) return false;
  const v = String(c).trim().toLowerCase().replace(/\s+/g, '');
  if (['black', '#000', '#000000', '#000000ff', 'rgb(0,0,0)'].includes(v)) return true;
  const m = v.match(/^rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)$/);
  return !!m && +m[1] === 0 && +m[2] === 0 && +m[3] === 0;
}

export function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
