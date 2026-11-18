#!/usr/bin/env node
/**
 * Lists the files in one of ShineOn's public Canto mockup folders/albums (the
 * "Mockup Link" / "Blank Mockup Files" on each product's spec sheet), so an
 * administrator can pick the official PSD to install as a mockup kit.
 *
 *   node tools/canto-list.mjs <product-id | canto-url> [--psd] [--json]
 *
 * Nothing is downloaded or redistributed. Each listed URL is ShineOn's own
 * download link; downloading is subject to ShineOn's Terms of Service
 * (digital items are licensed to each seller, non-transferable).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith('--'));
if (!target) { console.error('usage: node tools/canto-list.mjs <product-id | canto-url> [--psd] [--json]'); process.exit(2); }

export function parseCantoUrl(u) {
  const m = /shineon\.canto\.com\/v\/([^/]+)\/(folder|album)\/([A-Z0-9]+)/i.exec(u || '');
  return m ? { portal: m[1], scheme: m[2].toLowerCase(), id: m[3] } : null;
}

let url = target;
if (!/^https?:/.test(target)) {
  const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/products.json'), 'utf8'));
  const p = db.products.find((x) => x.id === target);
  if (!p) { console.error(`Unknown product id ${target}`); process.exit(2); }
  url = p.links.mockup || p.links.blankMockups?.[0]?.url;
  if (!url) { console.error(`${p.name}: ShineOn links no mockup folder.`); process.exit(1); }
}
const c = parseCantoUrl(url);
if (!c) { console.error(`Not a Canto folder/album URL: ${url}`); process.exit(2); }
const base = `https://shineon.canto.com/rest/v/${c.portal}/search/${c.scheme}/${c.id}?aggsEnabled=false&sortBy=name&sortDirection=true&size=1000&type=image%7Cdocument%7Cother&operator=and`;
const r = await fetch(base, { headers: { 'User-Agent': 'bby-product-design-studio-admin' } });
if (!r.ok) { console.error(`Canto returned ${r.status}`); process.exit(1); }
const j = await r.json();
let files = (j.hits?.hit || []).filter((h) => !['folder', 'album'].includes(h.scheme)).map((h) => ({
  name: h.displayName,
  folder: (h.data?.contained_by || [''])[0],
  sizeMB: +(Number(h.data?.size?.[0] || 0) / 1048576).toFixed(1),
  width: Number(h.data?.width?.[0] || 0), height: Number(h.data?.height?.[0] || 0),
  description: h.data?.description?.[0] || '',
  portal: c.portal, fileId: h.path,
  download: `https://shineon.canto.com/download/v/${c.portal}/${h.scheme}/${h.path}/original`,
}));
if (args.includes('--psd')) files = files.filter((f) => /\.psd$/i.test(f.name));
if (args.includes('--json')) console.log(JSON.stringify(files, null, 2));
else {
  console.log(`${files.length} file(s) in ${url.replace(/\?.*/, '')}`);
  for (const f of files.sort((a, b) => a.sizeMB - b.sizeMB)) console.log(`${String(f.sizeMB).padStart(7)} MB  ${f.width}x${f.height}  ${f.name}${f.description ? `  — ${f.description.replace(/\s+/g, ' ')}` : ''}
           install: node tools/fetch-mockup.mjs ${f.portal} ${f.fileId} "${f.name}"`);
}
