import React, { useEffect, useMemo, useRef, useState } from 'react';
import { renderPreviewCanvas } from '../lib/exporter.js';
import { kitsForProduct, renderKit, fileGetter, productFinishes, VARIANTS, kitAccuracy, catalogIdOf } from '../lib/mockups.js';
import { useMockups } from './common.jsx';

const STRIP = 46;

export default function PreviewPanel({ product, getSurfaceJSON, active, onManageMockups }) {
  useMockups();
  const kits = kitsForProduct(product.id);
  const finishes = useMemo(() => {
    const f = new Set(productFinishes(product));
    for (const k of kits) if (k.kit.variant) f.add(k.kit.variant);
    return ['silver', 'gold'].filter((v) => f.has(v));
  }, [product, kits.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const [variant, setVariant] = useState(() => kits.find((k) => k.kit.variant)?.kit.variant || finishes[0] || null);
  const [sceneId, setSceneId] = useState(null);
  const [mode, setMode] = useState('product');
  const [sid, setSid] = useState(product.surfaces[0].id);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const ref = useRef(null);

  const matching = kits.filter((k) => !finishes.length || !k.kit.variant || k.kit.variant === variant)
    // message-card jewelry: show first the scenes where ShineOn's photo has the piece over the card
    .sort((a, b) => (product.artworkRole === 'message-card' ? (b.kit.overlayPixels > 0) - (a.kit.overlayPixels > 0) : 0));
  const entry = matching.find((k) => k.kit.id === sceneId) || matching[0] || null;
  const surface = product.surfaces.find((s) => s.id === sid) || product.surfaces[0];
  const showKit = mode === 'product' && entry;

  useEffect(() => {
    if (!active || (mode === 'product' && !entry)) return undefined;
    let alive = true;
    setBusy(true); setErr('');
    (async () => {
      const out = ref.current; const ctx = out.getContext('2d');
      if (mode === 'flat') {
        const design = await renderPreviewCanvas(getSurfaceJSON(surface.id), surface, 900);
        if (!alive) return;
        out.width = 900; out.height = 900;
        ctx.fillStyle = '#0a1330'; ctx.fillRect(0, 0, 900, 900);
        const k = Math.min(820 / design.width, 820 / design.height); const w = design.width * k, h = design.height * k;
        ctx.fillStyle = '#fff'; ctx.fillRect((900 - w) / 2, (900 - h) / 2, w, h);
        ctx.drawImage(design, (900 - w) / 2, (900 - h) / 2, w, h);
        return;
      }
      const kit = entry.kit; const designs = {};
      for (const item of kit.stack.filter((s) => s.type === 'design')) {
        const s = product.surfaces.find((x) => x.id === item.surfaceId) || product.surfaces[0];
        designs[item.slot] = await renderPreviewCanvas(getSurfaceJSON(s.id), s, Math.min(1600, Math.max(s.width, s.height)));
      }
      const img = await renderKit(kit, fileGetter(entry), designs);
      if (!alive) return;
      out.width = kit.width; out.height = kit.height + STRIP;
      ctx.drawImage(img, 0, 0);
      ctx.fillStyle = 'rgba(8,16,38,0.92)'; ctx.fillRect(0, kit.height, kit.width, STRIP);
      ctx.fillStyle = '#ffffff'; ctx.font = `600 ${Math.round(STRIP * 0.36)}px Poppins, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const label = `OFFICIAL SHINEON MOCKUP · ${VARIANTS[kit.variant]?.label || 'all finishes'} · your design placed by BBY Studio`;
      ctx.fillText(label, kit.width / 2, kit.height + STRIP / 2, kit.width - 24);
    })().catch((e) => alive && setErr(e.message)).finally(() => alive && setBusy(false));
    return () => { alive = false; };
  }, [active, sid, mode, product, surface, getSurfaceJSON, entry?.kit.id, entry?.kit.builtAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const acc = entry ? kitAccuracy(entry.kit) : null;

  return (
    <div className="two-col">
      <div className="panel">
        <div className="row" style={{ marginBottom: 10 }}>
          <h3 className="grow" style={{ margin: 0 }}>Step 5 — Preview</h3>
          {busy && <span className="spinner" />}
        </div>
        {mode === 'product' && !entry ? (
          <div className="preview-placeholder" data-testid="preview-placeholder" data-product-id={product.id}>
            <div>
              <h4>{kits.length && finishes.length ? `No approved ${VARIANTS[variant]?.label || ''} mockup installed` : 'Exact product preview needs an approved ShineOn mockup'}</h4>
              <p className="muted small" style={{ maxWidth: 460, margin: '0 auto 12px' }}>
                BBY only shows {product.name} using ShineOn's own product mockup, so you see the real {kits.length ? 'finish' : 'product'} — never a drawn stand-in.
                ShineOn's mockups are licensed to each seller and can't be bundled with this app, so one has to be installed{kits.length ? ' for this finish' : ''} first (takes about a minute).
              </p>
              <div className="row" style={{ justifyContent: 'center', gap: 8 }}>
                {onManageMockups && <button className="btn primary" onClick={() => onManageMockups(product.id)} data-testid="install-mockup-button">Install the official mockup</button>}
                {product.links.mockup && <a className="btn" href={product.links.mockup} target="_blank" rel="noreferrer">ShineOn mockup folder ↗</a>}
              </div>
              <p className="muted small" style={{ marginTop: 12 }}>Meanwhile, <button className="linklike" onClick={() => setMode('flat')}>view your flat artwork</button>.</p>
            </div>
          </div>
        ) : (
          <canvas ref={ref} className="preview-canvas" width="900" height="900" aria-label={showKit ? `${product.name} official ShineOn mockup with your design` : 'Your flat artwork'}
            data-testid="preview-canvas" data-mode={showKit ? 'official' : 'flat'} data-product-id={product.id} data-catalog-id={catalogIdOf(product) || ''}
            data-kit-id={showKit ? entry.kit.id : ''} data-variant={showKit ? entry.kit.variant || '' : ''} />
        )}
        {err && <div className="notice bad">{err}</div>}
      </div>
      <div>
        <div className="panel">
          <h3>Preview options</h3>
          <div className="row" style={{ gap: 6 }}>
            <button className={`btn sm ${mode === 'product' ? 'active' : ''}`} onClick={() => setMode('product')}>On the product</button>
            <button className={`btn sm ${mode === 'flat' ? 'active' : ''}`} onClick={() => setMode('flat')}>Flat artwork</button>
          </div>
          {mode === 'flat' && product.surfaces.length > 1 && <div className="row" style={{ gap: 6, marginTop: 8 }}>{product.surfaces.map((s) => <button key={s.id} className={`btn sm ${s.id === sid ? 'active' : ''}`} onClick={() => setSid(s.id)}>{s.label}</button>)}</div>}
          {mode === 'product' && finishes.length > 0 && (
            <div className="row" style={{ gap: 6, marginTop: 8 }} role="radiogroup" aria-label="Finish">
              {finishes.map((v) => {
                const has = kits.some((k) => k.kit.variant === v || !k.kit.variant);
                return <button key={v} role="radio" aria-checked={variant === v} data-variant={v} className={`btn sm ${variant === v ? 'active' : ''}`} onClick={() => { setVariant(v); setSceneId(null); }}>{VARIANTS[v].label}{has ? '' : ' (not installed)'}</button>;
              })}
            </div>
          )}
          {mode === 'product' && matching.length > 1 && (
            <label className="small" style={{ display: 'block', marginTop: 10 }}>Scene{' '}
              <select value={entry?.kit.id || ''} onChange={(e) => setSceneId(e.target.value)} data-testid="scene-select">
                {matching.map((k) => <option key={k.kit.id} value={k.kit.id}>{k.kit.scene}</option>)}
              </select>
            </label>
          )}
        </div>

        {showKit && (
          <div className="panel" style={{ marginTop: 14 }} data-testid="mockup-info">
            <span className="badge-official">✓ Official ShineOn mockup</span>{' '}
            {acc.level !== 'verified' && <span className="badge-approx">Rendering approximated</span>}
            <p className="small" style={{ marginTop: 10 }}>
              ShineOn's own product photo and design slot for <b>{product.name}</b> ({VARIANTS[entry.kit.variant]?.long || 'finish not specified by ShineOn'}), from <i>{entry.kit.source.fileName}</i>. Your artwork is placed into the slot with the same perspective, mask and layer order as ShineOn's Photoshop file.
            </p>
            <ul className="small" style={{ paddingLeft: 18, margin: '6px 0' }}>
              {acc.lines.map((l) => <li key={l}>{l}</li>)}
            </ul>
            {entry.kit.notes.length > 0 && <details className="small"><summary>Approximations ({entry.kit.notes.length})</summary><ul style={{ paddingLeft: 18 }}>{entry.kit.notes.map((n) => <li key={n}>{n}</li>)}</ul></details>}
            <p className="muted small" style={{ marginBottom: 0 }}>Matched by BBY product <code>{product.id}</code> · ShineOn catalog #{entry.kit.catalogId} · {entry.origin === 'published' ? 'published by your BBY administrator' : 'installed in this browser'}.</p>
          </div>
        )}
        {mode === 'flat' && <div className="notice small" style={{ marginTop: 14 }}>This is your artwork exactly as it will be exported, before it is put on the product.</div>}
        <div className="panel" style={{ marginTop: 14 }}>
          <h3>ShineOn's official mockups</h3>
          {product.links.mockup ? <a className="btn" href={product.links.mockup} target="_blank" rel="noreferrer">Open ShineOn mockups for this product ↗</a> : <p className="muted small">ShineOn does not link mockups for this product.</p>}
          {onManageMockups && <button className="btn sm" style={{ marginLeft: 8 }} onClick={() => onManageMockups(product.id)}>Manage mockups</button>}
          <p className="muted small" style={{ marginBottom: 0 }}>After uploading your file in ShineOn, ShineOn's product editor shows its own generated preview too.</p>
        </div>
      </div>
    </div>
  );
}
