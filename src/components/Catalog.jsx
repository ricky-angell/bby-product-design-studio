import React, { useMemo, useState } from 'react';
import { ProductThumb, StatusChip, PartnerChip } from './common.jsx';
import { ROLE_INFO } from '../lib/catalog.js';

export default function Catalog({ db, onSelect }) {
  const [q, setQ] = useState('');
  const [partner, setPartner] = useState('all');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [cat, setCat] = useState('all');

  const cats = useMemo(() => {
    const m = new Map();
    for (const p of db.products) { const k = `${p.productionPartner}|${p.category}`; m.set(k, (m.get(k) || 0) + 1); }
    return [...m.entries()].map(([k, n]) => { const [pp, c] = k.split('|'); return { key: k, partner: pp, name: c, n }; });
  }, [db]);

  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return db.products.filter((p) => {
      if (partner !== 'all' && p.productionPartner !== partner) return false;
      if (role !== 'all' && p.artworkRole !== role) return false;
      if (status !== 'all' && p.specStatus !== status) return false;
      if (cat !== 'all' && `${p.productionPartner}|${p.category}` !== cat) return false;
      const hay = `${p.name} ${p.category} ${p.productionPartner} ${p.artworkRoleLabel} ${p.surfaces.map((s) => `${s.width}x${s.height}`).join(' ')} ${p.formats.join(' ')}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [db, q, partner, role, status, cat]);

  const groups = useMemo(() => {
    const m = new Map();
    for (const p of list) { const k = `${p.productionPartner}|${p.category}`; if (!m.has(k)) m.set(k, []); m.get(k).push(p); }
    return [...m.entries()];
  }, [list]);

  const verified = db.products.filter((p) => p.specStatus === 'VERIFIED').length;

  return (
    <div>
      <section className="hero">
        <div>
          <div className="chip blue" style={{ marginBottom: 10 }}>Built By You Academy</div>
          <h1><span className="chrome-text">Product Design Studio</span></h1>
          <p>Design production-ready artwork for ShineOn and SPP-partner products, right in your browser. Pick a product, design it (bring your own AI art if you like), then press <b>BUILD MY PRODUCT DESIGN</b> to get a file at the exact size, format and resolution ShineOn asks for.</p>
          <p className="small">Step 1 — <b>Select a product.</b> Every spec below comes from ShineOn's public Help Center (last checked {db.lastVerified}).</p>
        </div>
        <div className="stats">
          <div className="stat"><b>{db.products.length}</b><span className="muted small">artwork products</span></div>
          <div className="stat"><b style={{ color: 'var(--ok)' }}>{verified}</b><span className="muted small">specs verified</span></div>
          <div className="stat"><b style={{ color: 'var(--warn)' }}>{db.products.length - verified}</b><span className="muted small">need verification</span></div>
        </div>
      </section>

      <div className="filters">
        <input type="search" placeholder="Search products, sizes or formats… (e.g. heart, 2000x2000, SVG)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
        <select value={partner} onChange={(e) => { setPartner(e.target.value); setCat('all'); }} aria-label="Production partner">
          <option value="all">All production partners</option>
          <option value="ShineOn">Made by ShineOn</option>
          <option value="SPP">Made by SPP (partner)</option>
        </select>
        <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Artwork type">
          <option value="all">All artwork types</option>
          {Object.entries(ROLE_INFO).filter(([k]) => ['message-card', 'graphic', 'engraving', 'printed'].includes(k)).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Specification status">
          <option value="all">Any spec status</option>
          <option value="VERIFIED">Verified specs</option>
          <option value="NEEDS VERIFICATION">Needs verification</option>
        </select>
      </div>
      <div className="cat-chips" role="toolbar" aria-label="Categories">
        <button className={cat === 'all' ? 'active' : ''} onClick={() => setCat('all')}>All categories</button>
        {cats.filter((c) => partner === 'all' || c.partner === partner).map((c) => (
          <button key={c.key} className={cat === c.key ? 'active' : ''} onClick={() => setCat(c.key)}>{c.name}{c.partner === 'SPP' ? ' (SPP)' : ''}<small>{c.n}</small></button>
        ))}
      </div>

      <p className="muted small">{list.length} product{list.length === 1 ? '' : 's'} shown</p>
      {groups.map(([k, ps]) => {
        const [pp, name] = k.split('|');
        return (
          <section key={k}>
            <div className="category-head"><h2>{name}</h2><PartnerChip partner={pp} /><span className="muted small">{ps.length}</span></div>
            <div className="product-grid">
              {ps.map((p) => (
                <button key={p.id} className="pcard" onClick={() => onSelect(p.id)} data-product-id={p.id}>
                  <div className="thumb"><ProductThumb product={p} size={140} /></div>
                  <h4>{p.name}</h4>
                  <div className="meta">{p.surfaces.map((s) => `${s.width}×${s.height}`).join(' + ')} px · {p.formats.join('/')} · {typeof p.dpi === 'number' ? `${p.dpi} DPI` : p.dpi === 'any' ? 'any DPI' : 'DPI n/a'}</div>
                  <div className="row" style={{ gap: 4 }}>
                    <span className="chip">{ROLE_INFO[p.artworkRole].icon} {ROLE_INFO[p.artworkRole].label}</span>
                    <StatusChip status={p.specStatus} />
                    {p.availability !== 'available' && <span className="chip bad">{p.availability.replace(/-/g, ' ')}</span>}
                    {p.tags.map((t) => <span key={t} className="chip">{t}</span>)}
                  </div>
                </button>
              ))}
            </div>
          </section>
        );
      })}
      {!list.length && <div className="notice">No products match. Try a different search.</div>}
      {db.discontinued?.length > 0 && <p className="muted small" style={{ marginTop: 20 }}>Listed by ShineOn as discontinued and not included: {db.discontinued.map((d) => d.line).join('; ')}.</p>}
    </div>
  );
}
