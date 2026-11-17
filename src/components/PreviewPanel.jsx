import React, { useEffect, useRef, useState } from 'react';
import { renderPreviewCanvas } from '../lib/exporter.js';
import { drawPreview } from '../lib/preview.js';

export default function PreviewPanel({ product, getSurfaceJSON, active }) {
  const [sid, setSid] = useState(product.surfaces[0].id);
  const [gold, setGold] = useState(false);
  const [mode, setMode] = useState('product');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const ref = useRef(null);
  const surface = product.surfaces.find((s) => s.id === sid) || product.surfaces[0];
  const jewelry = /necklace|bangle|bracelet|keychain|ring|watch|chain|pendant/i.test(product.name) || product.artworkRole === 'message-card';

  useEffect(() => {
    if (!active) return;
    let alive = true;
    setBusy(true); setErr('');
    (async () => {
      const design = await renderPreviewCanvas(getSurfaceJSON(surface.id), surface, 900);
      if (!alive) return;
      const out = ref.current;
      if (mode === 'flat') {
        out.width = 900; out.height = 900; const ctx = out.getContext('2d');
        ctx.fillStyle = '#0a1330'; ctx.fillRect(0, 0, 900, 900);
        const k = Math.min(820 / design.width, 820 / design.height); const w = design.width * k, h = design.height * k;
        ctx.fillStyle = '#fff'; ctx.fillRect((900 - w) / 2, (900 - h) / 2, w, h);
        ctx.drawImage(design, (900 - w) / 2, (900 - h) / 2, w, h);
      } else drawPreview(out, design, product, { gold });
    })().catch((e) => setErr(e.message)).finally(() => alive && setBusy(false));
    return () => { alive = false; };
  }, [active, sid, gold, mode, product, surface, getSurfaceJSON]);

  return (
    <div className="two-col">
      <div className="panel">
        <div className="row" style={{ marginBottom: 10 }}>
          <h3 className="grow" style={{ margin: 0 }}>Step 5 — Preview</h3>
          {busy && <span className="spinner" />}
        </div>
        <canvas ref={ref} className="preview-canvas" width="900" height="900" aria-label="Product preview" data-testid="preview-canvas" />
        {err && <div className="notice bad">{err}</div>}
      </div>
      <div>
        <div className="panel">
          <h3>Preview options</h3>
          <div className="row" style={{ gap: 6 }}>
            <button className={`btn sm ${mode === 'product' ? 'active' : ''}`} onClick={() => setMode('product')}>On product (illustrative)</button>
            <button className={`btn sm ${mode === 'flat' ? 'active' : ''}`} onClick={() => setMode('flat')}>Flat artwork</button>
          </div>
          {product.surfaces.length > 1 && <div className="row" style={{ gap: 6, marginTop: 8 }}>{product.surfaces.map((s) => <button key={s.id} className={`btn sm ${s.id === sid ? 'active' : ''}`} onClick={() => setSid(s.id)}>{s.label}</button>)}</div>}
          {jewelry && mode === 'product' && <div className="row" style={{ gap: 6, marginTop: 8 }}><button className={`btn sm ${!gold ? 'active' : ''}`} onClick={() => setGold(false)}>Silver tone</button><button className={`btn sm ${gold ? 'active' : ''}`} onClick={() => setGold(true)}>Gold tone</button></div>}
        </div>
        <div className="notice warn small" style={{ marginTop: 14 }}>
          <b>This is an illustrative preview, not an official ShineOn mockup.</b> Product shapes, materials and placement are approximate. ShineOn's official mockup images are kept on their Canto portal and are not copied into this app. After uploading your file in ShineOn, use ShineOn's own preview to check the exact placement.
        </div>
        <div className="panel" style={{ marginTop: 14 }}>
          <h3>Official mockups</h3>
          {product.links.mockup ? <a className="btn" href={product.links.mockup} target="_blank" rel="noreferrer">Open ShineOn mockups for this product ↗</a> : <p className="muted small">ShineOn does not link mockups for this product.</p>}
          {product.links.blankMockups?.length > 0 && <div className="links" style={{ marginTop: 8 }}>{product.links.blankMockups.map((b) => <a key={b.url} href={b.url} target="_blank" rel="noreferrer"><span>{b.label}</span><span className="muted small">↗</span></a>)}</div>}
        </div>
      </div>
    </div>
  );
}
