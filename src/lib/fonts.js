// Bundled open-licence fonts (SIL OFL via Fontsource). Each font is used both for
// on-canvas rendering (FontFace) and for SVG export (opentype.js text -> vector paths).
import { parse as parseFont } from 'opentype.js';

import manifest from './font-manifest.json';

export const FONT_FAMILIES = [
  { family: 'Poppins', pkg: 'poppins', style: 'Modern sans' },
  { family: 'Montserrat', pkg: 'montserrat', style: 'Modern sans' },
  { family: 'Lato', pkg: 'lato', style: 'Clean sans' },
  { family: 'Oswald', pkg: 'oswald', style: 'Condensed' },
  { family: 'Bebas Neue', pkg: 'bebas-neue', style: 'Bold display' },
  { family: 'Playfair Display', pkg: 'playfair-display', style: 'Elegant serif' },
  { family: 'Lora', pkg: 'lora', style: 'Book serif' },
  { family: 'Cinzel', pkg: 'cinzel', style: 'Classic capitals' },
  { family: 'Abril Fatface', pkg: 'abril-fatface', style: 'Heavy serif' },
  { family: 'Great Vibes', pkg: 'great-vibes', style: 'Script' },
  { family: 'Allura', pkg: 'allura', style: 'Script' },
  { family: 'Parisienne', pkg: 'parisienne', style: 'Script' },
  { family: 'Dancing Script', pkg: 'dancing-script', style: 'Casual script' },
  { family: 'Pacifico', pkg: 'pacifico', style: 'Retro script' },
  { family: 'Caveat', pkg: 'caveat', style: 'Handwriting' },
  { family: 'Amatic SC', pkg: 'amatic-sc', style: 'Hand-drawn' },
];

function urlFor(pkg, weight, style) {
  if (!manifest[pkg] || !manifest[pkg].includes(`${weight}-${style}`)) return null;
  return `${import.meta.env.BASE_URL}fonts/${pkg}-latin-${weight}-${style}.woff`;
}

export function variantsFor(family) {
  const f = FONT_FAMILIES.find((x) => x.family === family);
  if (!f) return [];
  const out = [];
  for (const w of [400, 700]) for (const s of ['normal', 'italic']) if (urlFor(f.pkg, w, s)) out.push({ weight: w, style: s });
  return out;
}

/** Choose the closest available face (fonts without bold/italic fall back to regular). */
export function resolveFace(family, weight, style) {
  const f = FONT_FAMILIES.find((x) => x.family === family) || FONT_FAMILIES[0];
  const w = Number(weight) >= 600 || weight === 'bold' ? 700 : 400;
  const s = style === 'italic' ? 'italic' : 'normal';
  for (const [ww, ss] of [[w, s], [w, 'normal'], [400, s], [400, 'normal']]) {
    const u = urlFor(f.pkg, ww, ss);
    if (u) return { family: f.family, weight: ww, style: ss, url: u };
  }
  return null;
}

const loadedFaces = new Set();
export async function ensureFontsLoaded(families = FONT_FAMILIES.map((f) => f.family)) {
  if (typeof document === 'undefined') return;
  const jobs = [];
  for (const family of families) {
    const f = FONT_FAMILIES.find((x) => x.family === family);
    if (!f) continue;
    for (const v of variantsFor(family)) {
      const key = `${family}|${v.weight}|${v.style}`;
      if (loadedFaces.has(key)) continue;
      loadedFaces.add(key);
      const face = new FontFace(family, `url(${urlFor(f.pkg, v.weight, v.style)}) format('woff')`, { weight: String(v.weight), style: v.style });
      jobs.push(face.load().then((ff) => document.fonts.add(ff)).catch(() => loadedFaces.delete(key)));
    }
  }
  await Promise.all(jobs);
}

const otCache = new Map();
/** Load an opentype.js Font for the closest face. */
export async function getOpentypeFont(family, weight, style) {
  const face = resolveFace(family, weight, style);
  if (!face) throw new Error(`Font not bundled: ${family}`);
  if (!otCache.has(face.url)) {
    otCache.set(face.url, fetch(face.url).then((r) => r.arrayBuffer()).then((buf) => parseFont(buf)));
  }
  return otCache.get(face.url);
}
