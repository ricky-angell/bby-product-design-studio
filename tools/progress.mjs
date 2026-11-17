#!/usr/bin/env node
// Regenerates BBY_PRODUCT_DESIGN_STUDIO_PROGRESS.md from public/data/products.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/products.json'), 'utf8'));
// Products whose exports are produced and byte-verified directly by tests/run-tests.mjs
const DIRECT = new Set(['Endless Love Necklace', 'Alluring Beauty Necklace with Rotating Rose Box', 'Love Knot Necklace with Red Heart Rose Box', 'Open Work Watch with MC', 'Graphic Circle Keychain', 'Graphic Heart Keychain', 'Non-MC Engraved Heart Necklace', 'Engraved Metal Wallet', 'Custom Cut Acrylic Ornament Double Sided', 'Classic Tote Bag', 'Printed Canvas Poster (8" x 10")', 'High Gloss Poster (3:2)']);
const status = (p) => (p.specStatus === 'VERIFIED' ? 'COMPLETED' : 'NEEDS VERIFICATION');

const L = [];
L.push('# BBY Product Design Studio — Development Progress', '');
L.push(`Last updated: ${new Date().toISOString().slice(0, 10)} · catalog checked against ShineOn on ${db.lastVerified}`, '');
L.push('## Status definitions', '',
  '- **COMPLETED** — specification verified from ShineOn sources; product is in the catalog, designable at its exact size, and exports in its required format through the tested build/validation pipeline.',
  '- **NEEDS VERIFICATION** — designable and exportable, but ShineOn\'s published data is missing or contradictory (reason listed). Files are never labelled production-ready for these products.',
  '- **IN PROGRESS / TESTING / BLOCKED / NOT STARTED** — not currently used by any product; see "Open items" for work outside the catalog.', '',
  '"Direct test" = a file for that exact product is built in the browser and verified byte-by-byte in `tests/run-tests.mjs`. Other products use the same tested pipeline (PNG, JPG and SVG paths are each tested).', '');
const P = db.products;
const n = (s) => P.filter((p) => status(p) === s).length;
L.push('## Summary', '', '| Status | Products |', '|---|---|', `| COMPLETED | ${n('COMPLETED')} |`, `| NEEDS VERIFICATION | ${n('NEEDS VERIFICATION')} |`, `| **Total artwork products** | **${P.length}** (${P.filter((p) => p.productionPartner === 'ShineOn').length} ShineOn · ${P.filter((p) => p.productionPartner === 'SPP').length} SPP) |`, '');
L.push(`Excluded (ShineOn lists as discontinued): ${db.discontinued.map((d) => d.line).join('; ') || 'none'}.`, '');
L.push('## Categories', '', '| Category | Partner | Products | Completed | Needs verification | Category status |', '|---|---|---|---|---|---|');
for (const c of db.categories) {
  const ps = P.filter((p) => p.categoryId === c.id && p.productionPartner === c.productionPartner);
  const done = ps.filter((p) => status(p) === 'COMPLETED').length;
  L.push(`| ${c.name} | ${c.productionPartner} | ${ps.length} | ${done} | ${ps.length - done} | ${done === ps.length ? 'COMPLETED' : done ? 'COMPLETED (partial — see products)' : 'NEEDS VERIFICATION'} |`);
}
for (const c of db.categories) {
  const ps = P.filter((p) => p.categoryId === c.id && p.productionPartner === c.productionPartner);
  L.push('', `### ${c.name} (${c.productionPartner})`, '', '| Product | Size(s) px | DPI | Format | Max | Status | Direct test | Notes |', '|---|---|---|---|---|---|---|---|');
  for (const p of ps) L.push(`| ${p.name} | ${p.surfaces.map((s) => `${s.width}×${s.height}`).join(' + ')} | ${p.dpi ?? '—'} | ${p.formats.join('/')} | ${p.maxFileSizeMB ? `${p.maxFileSizeMB}MB` : '—'} | ${status(p)} | ${DIRECT.has(p.name) ? '✅' : ''} | ${[...p.statusReasons.filter((r) => !/see discrepancies/.test(r)), ...p.discrepancies].join(' ').replace(/\|/g, '/') || (p.availability !== 'available' ? p.availability : '')} |`);
}
L.push('', '## Development batches', '',
  '1. **Catalog audit** — parsed every product line of ShineOn\'s requirements directory (both ShineOn and SPP sections) and cross-checked each against its "Design and Care Advice" article → `public/data/products.json`, `docs/SPEC_AUDIT.md`. COMPLETED.',
  '2. **Editor** — Fabric.js canvas at exact artwork pixels, text/fonts, images, crop, shapes, decorations, backgrounds, layers, align, opacity, undo/redo, guides, SVG paste, trace-to-vector. COMPLETED.',
  '3. **Build & validation** — exact-size render, PNG pHYs / JPEG JFIF DPI, SVG with text→outlines, independent re-inspection, size/transparency/colour checks, fixes, ZIP + report. COMPLETED.',
  '4. **AI Prompt Assistant, previews, projects (IndexedDB), backups, batch ZIP.** COMPLETED.',
  '5. **Automated tests** (desktop/tablet/mobile, real Chrome) — see `docs/TEST_REPORT.md`. COMPLETED.',
  '6. **Deployment to GitHub Pages** — see `docs/DEPLOYMENT_REPORT.md`.',
  '7. **Skool publication** — see `docs/SKOOL_PUBLICATION_REPORT.md`.', '',
  '## Open items', '',
  '- 29 products need verification against the ShineOn product editor (listed above). Correct `public/data/products.json` (no rebuild needed) or re-run `npm run audit:catalog` when ShineOn updates its pages.',
  '- Official ShineOn mockup images are linked, not embedded (redistribution permission not established). Previews are illustrative and labelled as such.',
  '- Numeric safe areas/bleed are not published by ShineOn; the editor shows an advisory margin and links to the official template.');
fs.writeFileSync(path.join(ROOT, 'BBY_PRODUCT_DESIGN_STUDIO_PROGRESS.md'), L.join('\n') + '\n');
console.log('Progress tracker written');
