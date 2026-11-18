import React, { useState } from 'react';
import { SpecTable, SpecIssues, SpecLinks, SpecSources } from './SpecSheet.jsx';
import { ProductThumb } from './common.jsx';
import { ROLE_INFO } from '../lib/catalog.js';

export default function ProductSetup({ product: p, onBack, onStart }) {
  const [type, setType] = useState(p.artworkTypes[0]);
  const variants = p.variants.filter((v) => v.id !== 'without-mc');
  const [variant, setVariant] = useState(variants[0]?.id || null);
  const withoutMc = p.variants.find((v) => v.id === 'without-mc');

  return (
    <div>
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="btn sm" onClick={onBack}>← Back to catalog</button>
        <h2 className="grow" style={{ margin: 0, fontSize: 20 }}>{p.name}</h2>
      </div>
      <div className="setup">
        <div>
          <div className="panel">
            <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
              <ProductThumb product={p} size={110} />
              <div className="grow">
                <h3>Artwork specification</h3>
                <p className="muted small" style={{ margin: 0 }}>Exactly what ShineOn asks for. The Studio builds your file to these numbers.</p>
              </div>
            </div>
            <SpecTable product={p} />
          </div>
          <div className="panel"><SpecIssues product={p} /><h3 style={{ marginTop: 10 }}>Sources</h3><SpecSources product={p} /></div>
        </div>
        <div>
          <div className="panel">
            <h3>Step 2 — Choose your artwork type</h3>
            <div className="choice-list" role="radiogroup">
              {p.artworkTypes.map((t) => (
                <button key={t} className={`choice ${type === t ? 'active' : ''}`} onClick={() => setType(t)} role="radio" aria-checked={type === t}>
                  <span className="ico">{ROLE_INFO[t].icon}</span>
                  <span><b>{ROLE_INFO[t].label}</b><br /><span className="muted small">{ROLE_INFO[t].desc}</span></span>
                </button>
              ))}
            </div>
            {p.artworkTypes.length === 1 && <p className="muted small">This product accepts one kind of artwork.</p>}
            {variants.length > 0 && (
              <>
                <h3 style={{ marginTop: 14 }}>Presentation</h3>
                <div className="choice-list">
                  {variants.map((v) => (
                    <button key={v.id} className={`choice ${variant === v.id ? 'active' : ''}`} onClick={() => setVariant(v.id)}>
                      <span className="ico">{v.id === 'luxury-box' ? '🎁' : '📦'}</span>
                      <span><b>{v.label}</b> {v.specStatus === 'NEEDS VERIFICATION' && <span className="chip warn">needs verification</span>}<br /><span className="muted small">{v.note}</span></span>
                    </button>
                  ))}
                </div>
              </>
            )}
            {withoutMc && <p className="notice small" style={{ marginTop: 10 }}>{withoutMc.note}</p>}
            {p.surfaces.length > 0 ? (
              <button className="btn primary" style={{ width: '100%', marginTop: 14, padding: 12, fontSize: 15 }} onClick={() => onStart({ artworkType: type, variantId: variant })}>
                Start designing → ({p.surfaces.map((s) => `${s.width}×${s.height}`).join(' + ')} px)
              </button>
            ) : <div className="notice bad">ShineOn has not published artwork dimensions for this product, so it cannot be designed yet.</div>}
          </div>
          <div className="panel">
            <h3>Official ShineOn resources</h3>
            <SpecLinks product={p} />
          </div>
        </div>
      </div>
    </div>
  );
}
