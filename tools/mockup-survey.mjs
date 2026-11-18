#!/usr/bin/env node
/**
 * Surveys ShineOn's public Canto mockup folder of every catalog product and lists the official
 * PSD mockups an administrator can install (nothing is downloaded).
 * Writes docs/mockup-sources.json and docs/MOCKUP_SOURCES.md.
 *
 *   node tools/mockup-survey.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/products.json'), 'utf8'));
const parse = (u) => { const m = /shineon\.canto\.com\/v\/([^/]+)\/(folder|album)\/([A-Z0-9]+)/i.exec(u || ''); return m ? { portal: m[1], scheme: m[2].toLowerCase(), id: m[3] } : null; };
const cache = new Map();

async function list(c) {
  const key = `${c.portal}/${c.scheme}/${c.id}`;
  if (cache.has(key)) return cache.get(key);
  const url = `https://shineon.canto.com/rest/v/${c.portal}/search/${c.scheme}/${c.id}?aggsEnabled=false&sortBy=name&sortDirection=true&size=1000&type=image%7Cdocument%7Cother&operator=and`;
  const p = (async () => {
    for (let i = 0; i < 3; i++) {
      try { const r = await fetch(url, { headers: { 'User-Agent': 'bby-product-design-studio-admin' } }); if (r.ok) return (await r.json()).hits?.hit || []; if (r.status === 404 || r.status === 403) return { broken: r.status }; } catch { /* retry */ }
      await new Promise((res) => setTimeout(res, 800 * (i + 1)));
    }
    return null;
  })();
  cache.set(key, p); return p;
}

const score = (f) => {
  const t = `${f.name} ${f.description}`.toLowerCase(); let s = 0;
  if (/no[ _-]?mc|without/.test(t)) s -= 20;
  if (/custom|message card|\bmc\b|design|template|your text|text inside/.test(t)) s += 10;
  if (/zoom|explainer|specification|spec\b|amazon|amz/.test(t)) s -= 6;
  s -= f.sizeMB / 40;
  return s;
};

const rows = []; const products = db.products;
let i = 0;
async function worker() {
  while (i < products.length) {
    const p = products[i++];
    const c = parse(p.links.mockup || p.links.blankMockups?.[0]?.url);
    if (!c) { rows.push({ id: p.id, name: p.name, partner: p.productionPartner, catalogId: (/catalog\/(\d+)/.exec(p.links.product || '') || [])[1], folder: null, psd: [], other: 0 }); continue; }
    const hits0 = await list(c);
    if (hits0?.broken) { rows.push({ id: p.id, name: p.name, partner: p.productionPartner, catalogId: (/catalog\/(\d+)/.exec(p.links.product || '') || [])[1], folder: p.links.mockup || p.links.blankMockups?.[0]?.url, error: "ShineOn's mockup link is broken or private", psd: [], other: 0 }); continue; }
    const hits = hits0;
    const files = (hits || []).filter((h) => !['folder', 'album'].includes(h.scheme)).map((h) => ({
      name: h.displayName, sizeMB: +(Number(h.data?.size?.[0] || 0) / 1048576).toFixed(1), description: (h.data?.description?.[0] || '').replace(/\s+/g, ' ').trim(),
      portal: c.portal, fileId: h.path,
    }));
    const psd = files.filter((f) => /\.psd$/i.test(f.name)).sort((a, b) => score(b) - score(a));
    rows.push({ id: p.id, name: p.name, partner: p.productionPartner, catalogId: (/catalog\/(\d+)/.exec(p.links.product || '') || [])[1], folder: p.links.mockup || p.links.blankMockups?.[0]?.url, error: hits ? null : 'listing failed', psd, other: files.length - psd.length });
  }
}
await Promise.all([worker(), worker(), worker(), worker()]);
rows.sort((a, b) => products.findIndex((p) => p.id === a.id) - products.findIndex((p) => p.id === b.id));

const summary = {
  surveyedAt: new Date().toISOString(),
  products: rows.length,
  withPsd: rows.filter((r) => r.psd.length).length,
  noPsd: rows.filter((r) => r.folder && !r.error && !r.psd.length).length,
  noFolder: rows.filter((r) => !r.folder).length,
  brokenLink: rows.filter((r) => r.error && /broken/.test(r.error)).length,
  listingFailed: rows.filter((r) => r.error && !/broken/.test(r.error)).length,
};
fs.writeFileSync(path.join(ROOT, 'docs/mockup-sources.json'), JSON.stringify({ summary, products: rows.map((r) => ({ ...r, psd: r.psd.slice(0, 5) })) }, null, 1));

const L = ['# Official mockup sources (ShineOn Canto seller portal)', '',
  `Surveyed ${summary.surveyedAt.slice(0, 10)} with \`node tools/mockup-survey.mjs\`. Nothing here is a ShineOn file — only names and ShineOn's own download links.`, '',
  `- Products with official **PSD** mockups (installable for an exact preview): **${summary.withPsd}** of ${summary.products}`,
  `- Products whose ShineOn folder has only JPG/PNG photos (no design slot; ask ShineOn for a PSD): **${summary.noPsd}**`,
  `- Products with no ShineOn mockup folder: **${summary.noFolder}**${summary.listingFailed ? `\n- Folders that could not be listed this run: ${summary.listingFailed}` : ''}`, '',
  'The "suggested PSD" is a best guess from file names (message-card / custom / design files first, "No MC" files last). The installer in the app lists the PSD\'s layers so you can confirm the design slot before saving.', '',
  'To install one: run the fetch command (downloads into the git-ignored `mockup-sources/` folder), then open the app → **Mockups** → **Install PSD** for that product and choose the file. Pick both the silver and gold PSDs when a product comes in both finishes.', '',
  '| Product | Partner | Catalog # | PSDs | Suggested PSD | Fetch command |', '|---|---|---|---|---|---|'];
for (const r of rows) {
  const s = r.psd[0];
  L.push(`| ${r.name} | ${r.partner} | ${r.catalogId || '—'} | ${r.error ? 'link broken' : r.folder ? r.psd.length : 'no folder'} | ${s ? `${s.name.replace(/\|/g, '/')} (${s.sizeMB} MB)` : '—'} | ${s ? `\`node tools/fetch-mockup.mjs ${s.portal} ${s.fileId} "${s.name}"\`` : r.folder ? `[folder](${r.folder})` : ''} |`);
}
fs.writeFileSync(path.join(ROOT, 'docs/MOCKUP_SOURCES.md'), L.join('\n') + '\n');
console.log(summary);
