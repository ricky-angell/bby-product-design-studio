// Project save / reopen / rename / duplicate / delete / backup / restore.
import JSZip from 'jszip';
import { db } from './db.js';
import { uid, assetIdsIn, getAsset, putAssetRecord, deleteAsset } from './assets.js';

export const BACKUP_FORMAT = 'bby-product-design-studio-backup';

export function newProject(product, { artworkType, variantId } = {}) {
  const now = Date.now();
  return {
    id: uid(), name: `${product.name} design`, productId: product.id, productName: product.name,
    artworkType: artworkType || product.artworkRole, variantId: variantId || null,
    surfaces: {}, activeSurface: product.surfaces[0]?.id, thumbnail: null, createdAt: now, updatedAt: now,
  };
}

export async function listProjects() {
  const all = await (await db()).getAll('projects');
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}
export async function getProject(id) { return (await db()).get('projects', id); }
export async function saveProject(p) { p.updatedAt = Date.now(); await (await db()).put('projects', p); return p; }
export async function renameProject(id, name) { const p = await getProject(id); if (p) { p.name = name; await saveProject(p); } return p; }
export async function duplicateProject(id) {
  const p = await getProject(id); if (!p) return null;
  const copy = { ...structuredClone(p), id: uid(), name: `${p.name} (copy)`, createdAt: Date.now() };
  await saveProject(copy); return copy;
}
export async function deleteProject(id) {
  const d = await db();
  await d.delete('projects', id);
  // remove assets no longer referenced by any project
  const used = new Set();
  for (const p of await d.getAll('projects')) for (const s of Object.values(p.surfaces || {})) assetIdsIn(s).forEach((x) => used.add(x));
  for (const key of await d.getAllKeys('assets')) if (!used.has(key)) await deleteAsset(key);
}

const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' };

/** Build a .zip backup of one or more projects including their images. */
export async function exportBackup(projects) {
  const zip = new JSZip();
  const manifest = { format: BACKUP_FORMAT, version: 1, exportedAt: new Date().toISOString(), projects: [], assets: [] };
  const assetIds = new Set();
  for (const p of projects) {
    manifest.projects.push(`projects/${p.id}.json`);
    zip.file(`projects/${p.id}.json`, JSON.stringify(p));
    for (const s of Object.values(p.surfaces || {})) assetIdsIn(s).forEach((x) => assetIds.add(x));
  }
  for (const id of assetIds) {
    const a = await getAsset(id);
    if (!a) continue;
    const path = `assets/${id}.${EXT[a.type] || 'bin'}`;
    zip.file(path, a.blob);
    manifest.assets.push({ id, path, name: a.name, type: a.type });
  }
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('README.txt', 'BBY Product Design Studio project backup.\nImport it from the Projects page (Import backup). Keep this file somewhere safe — browser storage is not synced between devices.\n');
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

/** Restore projects from a backup zip. Imported projects get new ids so nothing is overwritten. */
export async function importBackup(fileOrBlob) {
  let zip;
  try { zip = await JSZip.loadAsync(fileOrBlob); } catch { throw new Error('That file is not a BBY project backup (.zip).'); }
  const mf = zip.file('manifest.json');
  if (!mf) throw new Error('Backup is missing manifest.json.');
  const manifest = JSON.parse(await mf.async('string'));
  if (manifest.format !== BACKUP_FORMAT) throw new Error('Backup format not recognised.');
  for (const a of manifest.assets || []) {
    const f = zip.file(a.path); if (!f) continue;
    const blob = new Blob([await f.async('uint8array')], { type: a.type });
    await putAssetRecord({ id: a.id, blob, name: a.name, type: a.type, createdAt: Date.now() });
  }
  const imported = [];
  for (const path of manifest.projects || []) {
    const f = zip.file(path); if (!f) continue;
    const p = JSON.parse(await f.async('string'));
    if (!p.productId || typeof p.surfaces !== 'object') continue;
    const np = { ...p, id: uid(), name: p.name, importedAt: Date.now() };
    await saveProject(np); imported.push(np);
  }
  if (!imported.length) throw new Error('No projects found in that backup.');
  return imported;
}
