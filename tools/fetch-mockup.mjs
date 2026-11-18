#!/usr/bin/env node
/**
 * Downloads one official mockup file from ShineOn's public Canto seller portal into
 * mockup-sources/ (git-ignored) so an administrator can install it in the app.
 *
 *   node tools/fetch-mockup.mjs <portal> <file-id> "<file name>"
 *   (portal / file-id come from `node tools/canto-list.mjs <product-id> --psd`)
 *
 * The file stays ShineOn's property: ShineOn licenses it to you as a seller (non-transferable).
 * Do not commit it or share it without ShineOn's written permission.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function fetchMockup(portal, id, name, dir) {
  const out = path.join(dir, name);
  if (fs.existsSync(out) && fs.statSync(out).size > 0) return out;
  fs.mkdirSync(dir, { recursive: true });
  const r = await fetch(`https://shineon.canto.com/download/v/${portal}/image/${id}/original`, { redirect: 'follow', headers: { 'User-Agent': 'bby-product-design-studio-admin' } });
  if (!r.ok) throw new Error(`Canto returned ${r.status} for ${name}`);
  fs.writeFileSync(out + '.part', Buffer.from(await r.arrayBuffer()));
  fs.renameSync(out + '.part', out);
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [portal, id, name] = process.argv.slice(2);
  if (!portal || !id || !name) { console.error('usage: node tools/fetch-mockup.mjs <portal> <file-id> "<file name>"'); process.exit(2); }
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  console.log(await fetchMockup(portal, id, name, path.join(ROOT, 'mockup-sources')));
}
