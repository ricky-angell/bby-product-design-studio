// Browser-local storage (IndexedDB). Nothing is uploaded anywhere.
import { openDB } from 'idb';

const DB_NAME = 'bby-product-design-studio';
let dbp = null;

export function db() {
  if (!dbp) {
    dbp = openDB(DB_NAME, 1, {
      upgrade(d) {
        d.createObjectStore('projects', { keyPath: 'id' });
        d.createObjectStore('assets', { keyPath: 'id' });
      },
    });
  }
  return dbp;
}

export async function storageAvailable() {
  try { const d = await db(); await d.count('projects'); return true; } catch { return false; }
}

export async function storageEstimate() {
  try { return await navigator.storage?.estimate?.(); } catch { return null; }
}
