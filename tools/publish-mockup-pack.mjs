#!/usr/bin/env node
/**
 * Publishes official ShineOn mockup kits to the live site for every student
 * (public/mockups/), ONLY after ShineOn has given written permission.
 *
 *   node tools/publish-mockup-pack.mjs <bby-mockup-pack.zip> --permission "<reference>" --granted-by "<name, role>"
 *   node tools/publish-mockup-pack.mjs --unpublish            (removes every published kit)
 *
 * <reference> must identify ShineOn's written permission (e.g. "Email from J. Smith, ShineOn
 * Partnerships, 2026-12-01, ticket #12345"). Keep a copy of that permission yourself.
 * Then run `npm run deploy`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const JSZip = require('jszip');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = process.env.BBY_MOCKUP_DIR ? path.resolve(process.env.BBY_MOCKUP_DIR) : path.join(ROOT, 'public/mockups');
const MANIFEST = path.join(DIR, 'manifest.json');
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i > -1 ? args[i + 1] : null; };
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

if (args.includes('--unpublish')) {
  for (const k of manifest.kits) fs.rmSync(path.join(DIR, k.dir), { recursive: true, force: true });
  manifest.kits = []; manifest.permission = { granted: false, reference: null, note: manifest.permission.note };
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  console.log('All published mockup kits removed. Run `npm run deploy` to update the live site.');
  process.exit(0);
}

const pack = args.find((a) => !a.startsWith('--') && a !== opt('--permission') && a !== opt('--granted-by'));
const permission = opt('--permission'); const grantedBy = opt('--granted-by');
if (!pack || !permission || !grantedBy) {
  console.error('Refusing to publish: ShineOn licenses its mockups to each seller as non-transferable.\n'
    + 'Publish only with ShineOn\'s written permission, and record it:\n'
    + '  node tools/publish-mockup-pack.mjs <pack.zip> --permission "<ShineOn permission reference>" --granted-by "<name, role at ShineOn>"');
  process.exit(2);
}

const zip = await JSZip.loadAsync(fs.readFileSync(pack));
const meta = JSON.parse(await zip.file('bby-mockup-pack.json').async('string'));
if (meta.schema !== 'bby-mockup-pack/1') throw new Error('Not a BBY mockup pack');
let n = 0;
for (const id of meta.kits) {
  const kitFile = zip.file(`kits/${id}/kit.json`); if (!kitFile) continue;
  const kit = JSON.parse(await kitFile.async('string'));
  if (kit.schema !== 'bby-mockup-kit/1' || !/^[a-z0-9-]+$/.test(kit.id)) throw new Error(`Bad kit ${id}`);
  const out = path.join(DIR, kit.id); fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
  for (const f of Object.values(zip.files).filter((f) => f.name.startsWith(`kits/${id}/`) && !f.dir)) {
    const name = path.basename(f.name); if (!/^[a-z0-9.-]+$/i.test(name)) continue;
    fs.writeFileSync(path.join(out, name), await f.async('nodebuffer'));
  }
  manifest.kits = manifest.kits.filter((k) => k.id !== kit.id).concat({ id: kit.id, dir: kit.id, productIds: kit.productIds, variant: kit.variant, scene: kit.scene });
  n++;
}
manifest.permission = { granted: true, reference: permission, grantedBy, recordedAt: new Date().toISOString(), note: manifest.permission.note };
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
console.log(`${n} kit(s) published to ${path.relative(ROOT, DIR) || DIR}/. Run \`npm run deploy\` to put them on the live site.`);
