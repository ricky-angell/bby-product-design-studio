#!/usr/bin/env node
// Copies the bundled Fontsource WOFF files (SIL Open Font License) into public/fonts
// and writes src/lib/font-manifest.json listing which weights/styles exist.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(ROOT, 'public/fonts');
fs.mkdirSync(out, { recursive: true });
const pkgs = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).dependencies;
const manifest = {};
for (const dep of Object.keys(pkgs).filter((d) => d.startsWith('@fontsource/'))) {
  const pkg = dep.split('/')[1];
  const dir = path.join(ROOT, 'node_modules', dep, 'files');
  manifest[pkg] = [];
  for (const f of fs.readdirSync(dir)) {
    const m = f.match(new RegExp(`^${pkg}-latin-(400|700)-(normal|italic)\\.woff$`));
    if (!m) continue;
    fs.copyFileSync(path.join(dir, f), path.join(out, f));
    manifest[pkg].push(`${m[1]}-${m[2]}`);
  }
  const lic = path.join(ROOT, 'node_modules', dep, 'LICENSE');
  if (fs.existsSync(lic)) fs.copyFileSync(lic, path.join(out, `${pkg}-LICENSE.txt`));
}
fs.writeFileSync(path.join(ROOT, 'src/lib/font-manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`Copied fonts for ${Object.keys(manifest).length} families`);
