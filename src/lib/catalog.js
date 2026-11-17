// Loads the editable product database (public/data/products.json).
// The JSON is fetched at runtime, so specs can be corrected without rebuilding the app.

let cache = null;

export async function loadCatalog() {
  if (cache) return cache;
  const res = await fetch(`${import.meta.env.BASE_URL}data/products.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Could not load product database (${res.status})`);
  const db = await res.json();
  db.byId = new Map(db.products.map((p) => [p.id, p]));
  cache = db;
  return db;
}

export const ROLE_INFO = {
  'message-card': { label: 'Message card', icon: '💌', desc: 'Full-colour card presented with the jewelry. The jewelry sits in the middle of the card.' },
  graphic: { label: 'Graphic artwork', icon: '🎨', desc: 'Printed directly on the jewelry surface and sealed under a glass-like dome.' },
  engraving: { label: 'Engraving artwork', icon: '⚙️', desc: 'Engraved into the product. Use solid black artwork; colour is not reproduced.' },
  printed: { label: 'Printed artwork', icon: '🖨️', desc: 'Printed directly onto the product.' },
  'buyer-upload': { label: 'Buyer-upload card', icon: '📷', desc: 'Your customer uploads their own photo for the pendant; you design the message card.' },
  'personalized-name': { label: 'Personalized name', icon: '✍️', desc: 'ShineOn personalises the jewelry with the buyer\'s name; you design the message card.' },
  'multi-surface': { label: 'Multiple surfaces', icon: '🗂️', desc: 'This product needs more than one artwork file (e.g. front and back).' },
};

export function aspectLabel(w, h) {
  const g = (a, b) => (b ? g(b, a % b) : a);
  const d = g(w, h);
  const rw = w / d, rh = h / d;
  if (rw <= 50 && rh <= 50) return `${rw}:${rh}`;
  const r = w / h;
  return r >= 1 ? `${r.toFixed(2)}:1` : `1:${(1 / r).toFixed(2)}`;
}

/** Physical size at the product DPI, if DPI is numeric. */
export function printSize(surface, dpi) {
  if (typeof dpi !== 'number') return null;
  return `${(surface.width / dpi).toFixed(2)}" × ${(surface.height / dpi).toFixed(2)}"`;
}

export function statusClass(s) {
  return s === 'VERIFIED' ? 'ok' : s === 'NEEDS VERIFICATION' ? 'warn' : 'bad';
}
