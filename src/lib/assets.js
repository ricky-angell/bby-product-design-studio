// Image assets (photos / AI artwork) are stored once as Blobs and referenced from
// designs by `assetId`, which keeps undo history and saved projects small.
import { db } from './db.js';

const mem = new Map(); // id -> { id, blob, url, name, type }

export function uid() {
  return (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
}

export async function newAssetFromBlob(blob, name = 'Image', id = uid()) {
  const a = { id, blob, name, type: blob.type || 'application/octet-stream', url: URL.createObjectURL(blob) };
  mem.set(id, a);
  try { await (await db()).put('assets', { id, blob, name, type: a.type, createdAt: Date.now() }); } catch { /* storage unavailable: keep in memory */ }
  return a;
}

export async function getAsset(id) {
  if (mem.has(id)) return mem.get(id);
  try {
    const rec = await (await db()).get('assets', id);
    if (!rec) return null;
    const a = { ...rec, url: URL.createObjectURL(rec.blob) };
    mem.set(id, a);
    return a;
  } catch { return null; }
}

export async function putAssetRecord(rec) {
  await (await db()).put('assets', rec);
  if (mem.has(rec.id)) { URL.revokeObjectURL(mem.get(rec.id).url); mem.delete(rec.id); }
}

export async function deleteAsset(id) {
  try { await (await db()).delete('assets', id); } catch { /* ignore */ }
  if (mem.has(id)) { URL.revokeObjectURL(mem.get(id).url); mem.delete(id); }
}

/** Collect assetIds referenced by a Fabric JSON object tree. */
export function assetIdsIn(json) {
  const out = new Set();
  const walk = (objs) => { for (const o of objs || []) { if (o.assetId) out.add(o.assetId); if (o.objects) walk(o.objects); } };
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  walk(data.objects);
  return out;
}
