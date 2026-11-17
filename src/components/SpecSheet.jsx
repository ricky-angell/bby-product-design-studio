import React from 'react';
import { StatusChip, PartnerChip } from './common.jsx';
import { printSize, aspectLabel } from '../lib/catalog.js';

const TRANS = { allowed: 'Allowed', 'not-allowed': 'Not allowed', required: 'Required', unspecified: 'Not stated by ShineOn' };

export function SpecTable({ product: p }) {
  return (
    <table className="spec-table">
      <tbody>
        <tr><th>Production partner</th><td><PartnerChip partner={p.productionPartner} /> {p.productionPartner === 'SPP' && <span className="muted small">Made by ShineOn's partner SPP, not by ShineOn.</span>}</td></tr>
        <tr><th>Category</th><td>{p.category}</td></tr>
        <tr><th>Artwork type</th><td>{p.artworkRoleLabel}<div className="muted small">{p.artworkRoleBasis}</div></td></tr>
        <tr><th>Artwork size{p.surfaces.length > 1 ? 's' : ''}</th><td>{p.surfaces.length ? p.surfaces.map((s) => (
          <div key={s.id}><b>{s.width} × {s.height} px</b>{p.surfaces.length > 1 ? ` — ${s.label}` : ''} <span className="muted small">({aspectLabel(s.width, s.height)}{printSize(s, p.dpi) ? `, ${printSize(s, p.dpi)} at ${p.dpi} DPI` : ''})</span>{s.assumedSameAsSideA && <span className="chip warn" style={{ marginLeft: 6 }}>assumed</span>}</div>
        )) : <span className="chip warn">Not published</span>}</td></tr>
        <tr><th>Resolution (DPI)</th><td>{typeof p.dpi === 'number' ? `${p.dpi} DPI` : p.dpi === 'any' ? 'Any DPI (vector SVG)' : <span className="chip warn">Not stated</span>}</td></tr>
        <tr><th>File format</th><td>{p.formats.join(' or ') || <span className="chip warn">Not stated</span>} {p.formatText && p.formatText !== p.formats.join('/') && <span className="muted small">(ShineOn: “{p.formatText}”)</span>}</td></tr>
        <tr><th>Maximum file size</th><td>{p.maxFileSizeMB ? `Under ${p.maxFileSizeMB} MB` : <span className="chip warn">Not stated</span>}{p.maxFileSizeListed && p.maxFileSizeListed !== p.maxFileSizeMB && <div className="muted small">Requirements list says {p.maxFileSizeListed} MB; the stricter limit is enforced.</div>}</td></tr>
        <tr><th>Transparency</th><td>{TRANS[p.transparency]}{p.transparencySource && <div className="muted small">“{p.transparencySource.quote}” — <a href={p.transparencySource.url} target="_blank" rel="noreferrer">source</a></div>}</td></tr>
        <tr><th>Colour requirements</th><td>{p.colorRequirements.length ? p.colorRequirements.map((c, i) => <div key={i}>{c.text} <a className="small" href={c.url} target="_blank" rel="noreferrer">source</a></div>) : <span className="muted">None published</span>}</td></tr>
        <tr><th>Safe area</th><td>{p.safeArea.text} {p.safeArea.url && <a className="small" href={p.safeArea.url} target="_blank" rel="noreferrer">source</a>}</td></tr>
        <tr><th>Bleed</th><td>{p.bleed.text}</td></tr>
        <tr><th>Front / back</th><td>{p.surfaces.length > 1 ? `${p.surfaces.length} artwork files: ${p.surfaces.map((s) => s.label).join(', ')}` : 'One artwork file'}</td></tr>
        {p.cutline && <tr><th>Cutline</th><td>{p.cutline}</td></tr>}
        {p.physicalSize && <tr><th>Physical details</th><td className="small">{p.physicalSize}</td></tr>}
        <tr><th>Availability</th><td>{p.availability === 'available' ? 'Listed' : <span className="chip bad">{p.availability.replace(/-/g, ' ')}</span>} {p.tags.map((t) => <span key={t} className="chip" style={{ marginLeft: 4 }}>{t}</span>)}</td></tr>
        <tr><th>Specification status</th><td><StatusChip status={p.specStatus} /> <span className="muted small">last verified {p.lastVerified}</span></td></tr>
      </tbody>
    </table>
  );
}

export function SpecIssues({ product: p }) {
  if (!p.statusReasons.length && !p.discrepancies.length && !p.resolvedNotes?.length) return null;
  return (
    <div className="grid" style={{ display: 'grid', gap: 8 }}>
      {(p.statusReasons.length > 0 || p.discrepancies.length > 0) && (
        <div className="notice warn">
          <b>Why this needs verification</b>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            {p.statusReasons.filter((r) => !/see discrepancies/.test(r)).map((r, i) => <li key={`r${i}`}>{r}</li>)}
            {p.discrepancies.map((r, i) => <li key={`d${i}`}>{r}</li>)}
          </ul>
          <div className="small" style={{ marginTop: 6 }}>You can still design it — the Studio uses ShineOn's requirements list. Files are not marked production-ready until this is confirmed in the ShineOn product editor. Specs can be corrected in <code>data/products.json</code> without rebuilding the app.</div>
        </div>
      )}
      {p.resolvedNotes?.length > 0 && <div className="notice info small">{p.resolvedNotes.map((r, i) => <div key={i}>ℹ {r}</div>)}</div>}
    </div>
  );
}

export function SpecLinks({ product: p }) {
  const L = p.links;
  const item = (href, label, note) => href
    ? <a href={href} target="_blank" rel="noreferrer"><span>{label}</span><span className="muted small">{note}</span></a>
    : <div className="na">{label}: not provided by ShineOn</div>;
  return (
    <div className="links">
      {item(L.officialTemplate, 'Official template (ShineOn Canto)', 'public portal ↗')}
      {L.canvaTemplate ? item(L.canvaTemplate, 'Canva template', 'free Canva login to edit ↗') : <div className="na">Canva template: {L.canvaTemplateStatus === 'unavailable' ? 'ShineOn lists it as unavailable' : 'not listed'}</div>}
      {item(L.mockup, 'Official mockups', 'ShineOn Canto ↗')}
      {item(L.premadeDesigns, 'Premade designs', 'ShineOn Canto ↗')}
      {item(L.product, 'Create this product in ShineOn', 'ShineOn login required ↗')}
      {item(L.advice, 'Design & care advice', 'ShineOn Help Center ↗')}
      {L.blankMockups?.map((b) => <a key={b.url} href={b.url} target="_blank" rel="noreferrer"><span>Blank mockup: {b.label}</span><span className="muted small">↗</span></a>)}
      <p className="muted small" style={{ margin: '4px 0 0' }}>Templates are not downloaded into this app. Open the official template to see ShineOn's exact safe zones, then design here.</p>
    </div>
  );
}

export function SpecSources({ product: p }) {
  return (
    <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>
      {p.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> (updated {s.updated})</li>)}
    </ul>
  );
}
