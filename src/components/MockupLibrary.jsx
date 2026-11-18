import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ProductThumb, useMockups, download, PartnerChip } from './common.jsx';
import {
  parsePsdFile, designCandidates, buildKit, saveKit, removeKit, renderKit, kitsForProduct, allKits, exportPack, importPack,
  guessVariant, sceneName, VARIANTS, kitAccuracy, catalogIdOf, publishedInfo,
} from '../lib/mockups.js';
import { makeCanvas } from '../lib/mockup-render.js';

const REPO = 'https://github.com/ricky-angell/bby-product-design-studio/blob/main/docs/MOCKUP_ASSETS.md';

/** A neutral test card (grid + label) used to show where a design lands before saving. */
function testPattern(w, h) {
  const k = Math.min(1, 1200 / Math.max(w, h)); const c = makeCanvas(w * k, h * k); const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#1f8bff'; ctx.lineWidth = Math.max(2, c.width / 150);
  for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo((c.width * i) / 8, 0); ctx.lineTo((c.width * i) / 8, c.height); ctx.moveTo(0, (c.height * i) / 8); ctx.lineTo(c.width, (c.height * i) / 8); ctx.globalAlpha = 0.25; ctx.stroke(); ctx.globalAlpha = 1; }
  ctx.strokeStyle = '#e0245e'; ctx.lineWidth = Math.max(4, c.width / 60); ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, c.width - ctx.lineWidth, c.height - ctx.lineWidth);
  ctx.fillStyle = '#0b1b44'; ctx.font = `700 ${Math.round(c.width / 11)}px Poppins, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('YOUR DESIGN', c.width / 2, c.height * 0.42); ctx.font = `500 ${Math.round(c.width / 20)}px Poppins, sans-serif`; ctx.fillText(`${w} × ${h} px`, c.width / 2, c.height * 0.58);
  return c;
}

function InstallFlow({ db, productId, setProductId, onToast, onDone }) {
  const product = db.byId.get(productId);
  const [stage, setStage] = useState('');
  const [err, setErr] = useState('');
  const [tree, setTree] = useState(null);
  const [file, setFile] = useState(null);
  const [cands, setCands] = useState([]);
  const [layerPath, setLayerPath] = useState('');
  const [surfaceId, setSurfaceId] = useState(product.surfaces[0].id);
  const [variant, setVariant] = useState('');
  const [scene, setScene] = useState('');
  const [built, setBuilt] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => { setTree(null); setBuilt(null); setErr(''); setSurfaceId(product.surfaces[0].id); }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onFile(f) {
    if (!f) return;
    setErr(''); setBuilt(null); setTree(null); setFile(f);
    if (!/\.(psd|psb)$/i.test(f.name)) { setErr('Choose the Photoshop (.psd) mockup file you downloaded from ShineOn.'); return; }
    if (f.size > 700 * 1048576) { setErr('This PSD is over 700 MB — too large to process in a browser. Pick a smaller scene from the same ShineOn folder.'); return; }
    try {
      const t = await parsePsdFile(f, { onStage: setStage });
      const c = designCandidates(t);
      if (!c.length) throw new Error('This PSD has no smart-object layer for a design (it is a finished photo). In the ShineOn folder, pick a mockup PSD that has a "Design" / "Design Here" layer.');
      setTree(t); setCands(c); setLayerPath(c[0].path);
      setVariant(guessVariant(f.name) || ''); setScene(sceneName(f.name)); setStage('');
    } catch (e) { setErr(e.message); setStage(''); }
  }

  async function build() {
    setErr(''); setStage('Building and verifying the kit…');
    try {
      const res = await buildKit(tree, { product, designPaths: [{ path: layerPath, surfaceId }], variant: variant || null, scene: scene || sceneName(file.name), source: { fileName: file.name, fileSize: file.size, cantoUrl: product.links.mockup } });
      const s = product.surfaces.find((x) => x.id === surfaceId) || product.surfaces[0];
      const img = await renderKit(res.kit, async (n) => createImageBitmap(res.files.get(n)), { 0: testPattern(s.width, s.height) });
      setBuilt(res); setStage('');
      requestAnimationFrame(() => { const c = canvasRef.current; if (!c) return; c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0); });
    } catch (e) { setErr(e.message); setStage(''); }
  }

  async function save() {
    await saveKit(built.kit, built.files);
    onToast(`Official mockup installed for ${product.name}${built.kit.variant ? ` (${VARIANTS[built.kit.variant].label})` : ''}.`);
    setBuilt(null); setTree(null); setFile(null); onDone?.();
  }

  const acc = built ? kitAccuracy(built.kit) : null;
  return (
    <div className="panel" data-testid="install-flow">
      <h3>Install an official ShineOn mockup</h3>
      <label className="small">Product{' '}
        <select value={productId} onChange={(e) => setProductId(e.target.value)} data-testid="install-product" style={{ maxWidth: '100%' }}>
          {db.products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.productionPartner === 'SPP' ? ' (SPP)' : ''} — catalog #{catalogIdOf(p)}</option>)}
        </select>
      </label>
      <ol className="small" style={{ paddingLeft: 18 }}>
        <li>{product.links.mockup ? <a href={product.links.mockup} target="_blank" rel="noreferrer">Open ShineOn's mockup folder for {product.name} ↗</a> : <span>ShineOn does not link a mockup folder for this product — ask ShineOn support for one.</span>}</li>
        <li>Download a <b>.psd</b> mockup that has a design or message-card slot (names often include "MC", "Custom", "Design" or "Text"). Pick the <b>silver</b> and <b>gold</b> versions if the product comes in both finishes. ShineOn's portal is free for sellers.</li>
        <li>Drop the file below. It is read <b>in this browser only</b> — nothing is uploaded.</li>
      </ol>
      <div className="drop">
        <input type="file" accept=".psd,.psb" onChange={(e) => onFile(e.target.files[0])} data-testid="psd-input" aria-label="Official mockup PSD" />
      </div>
      {stage && <p className="row small"><span className="spinner" /> {stage}</p>}
      {err && <div className="notice bad small" style={{ marginTop: 8 }}>{err}</div>}
      {tree && !built && (
        <div style={{ marginTop: 12 }}>
          <p className="small">{file.name} · {tree.width}×{tree.height}px Photoshop document.</p>
          <fieldset className="small" style={{ border: 0, padding: 0 }}>
            <legend><b>Which layer holds the design?</b></legend>
            {cands.map((c) => (
              <label key={c.path} style={{ display: 'block' }}>
                <input type="radio" name="layer" checked={layerPath === c.path} onChange={() => setLayerPath(c.path)} /> "{c.name}" — {c.so.width}×{c.so.height}px smart object{c.hidden ? ' (hidden in the PSD)' : ''}{c.warp === 'custom' ? ' · warped' : ''}
              </label>
            ))}
          </fieldset>
          {product.surfaces.length > 1 && <label className="small">Surface{' '}<select value={surfaceId} onChange={(e) => setSurfaceId(e.target.value)}>{product.surfaces.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>}
          <div className="row small" style={{ gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
            <label>Finish shown{' '}
              <select value={variant} onChange={(e) => setVariant(e.target.value)} data-testid="install-variant">
                <option value="">Not finish-specific</option>
                {Object.entries(VARIANTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </label>
            <label>Scene name <input value={scene} onChange={(e) => setScene(e.target.value)} style={{ width: 220 }} /></label>
          </div>
          <button className="btn primary" style={{ marginTop: 10 }} onClick={build} disabled={!!stage} data-testid="build-kit">Build &amp; verify</button>
        </div>
      )}
      {built && (
        <div style={{ marginTop: 12 }} data-testid="kit-built">
          <canvas ref={canvasRef} className="preview-canvas" style={{ maxWidth: 520 }} aria-label="Placement check with a test card" />
          <p className="small"><span className="badge-official">✓ Official ShineOn mockup</span> {acc.level !== 'verified' && <span className="badge-approx">Rendering approximated</span>}</p>
          <ul className="small" style={{ paddingLeft: 18 }}>{acc.lines.map((l) => <li key={l}>{l}</li>)}</ul>
          {built.kit.notes.length > 0 && <details className="small"><summary>Approximations ({built.kit.notes.length})</summary><ul>{built.kit.notes.map((n) => <li key={n}>{n}</li>)}</ul></details>}
          <p className="small">The red border shows the edges of the {product.surfaces.find((s) => s.id === surfaceId)?.width}×{product.surfaces.find((s) => s.id === surfaceId)?.height} artwork. Bound to <code>{product.id}</code> · catalog #{built.kit.catalogId} · {built.kit.variant ? VARIANTS[built.kit.variant].label : 'any finish'}.</p>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn primary" onClick={save} data-testid="save-kit">Save to this browser</button>
            <button className="btn" onClick={() => setBuilt(null)}>Back</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MockupLibrary({ db, focusId, onToast, onReturn }) {
  useMockups();
  const [installFor, setInstallFor] = useState(focusId || null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const pub = publishedInfo();
  const kits = allKits();
  const covered = useMemo(() => new Set(kits.flatMap((k) => k.kit.productIds)), [kits]);
  const installedHere = kits.filter((k) => k.origin === 'local').length;
  const rows = db.products.filter((p) => {
    if (filter === 'installed' && !covered.has(p.id)) return false;
    if (filter === 'missing' && covered.has(p.id)) return false;
    return !q || `${p.name} ${p.category} ${catalogIdOf(p)}`.toLowerCase().includes(q.toLowerCase());
  });

  return (
    <div>
      <div className="row" style={{ marginBottom: 10 }}>
        <h2 className="grow" style={{ margin: 0 }}>Official product mockups</h2>
        {onReturn && <button className="btn" onClick={onReturn}>← Back to my design preview</button>}
      </div>
      <div className="panel">
        <div className="stats" style={{ marginBottom: 10 }}>
          <div className="stat"><b style={{ color: 'var(--ok)' }} data-testid="count-accurate">{covered.size}</b><span className="muted small">products with an official preview</span></div>
          <div className="stat"><b style={{ color: 'var(--warn)' }} data-testid="count-missing">{db.products.length - covered.size}</b><span className="muted small">still need an approved asset</span></div>
          <div className="stat"><b>{kits.length}</b><span className="muted small">mockup scenes ({installedHere} in this browser)</span></div>
        </div>
        <p className="small">Previews in this studio use <b>only ShineOn's own product mockups</b>, matched to the exact product (BBY id + ShineOn catalog number) and finish. Where none is installed, the studio says so instead of drawing a look-alike.</p>
        <p className="small muted">Why they aren't built in: ShineOn's Terms of Service say mockups, templates and images belong to ShineOn and are licensed to each seller as non-exclusive and <b>non-transferable</b>. So each seller installs the free PSDs from ShineOn's seller portal into their own browser, or the BBY administrator publishes them for everyone after getting ShineOn's written permission ({pub?.permission?.granted ? `granted: ${pub.permission.reference}` : 'not granted yet'}). <a href={REPO} target="_blank" rel="noreferrer">Administrator guide ↗</a></p>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button className="btn sm" disabled={!installedHere} onClick={async () => download(await exportPack(), `bby-mockup-pack-${new Date().toISOString().slice(0, 10)}.zip`)}>Export installed mockups (pack)</button>
          <label className="btn sm">Import a mockup pack<input type="file" accept=".zip" hidden onChange={async (e) => { try { const n = await importPack(e.target.files[0]); onToast(`${n} mockup scene(s) imported.`); } catch (er) { onToast(er.message); } e.target.value = ''; }} /></label>
        </div>
      </div>

      {installFor && <InstallFlow db={db} productId={installFor} setProductId={setInstallFor} onToast={onToast} onDone={() => { if (focusId && onReturn) onReturn(); }} />}

      <div className="panel">
        <div className="filters" style={{ marginBottom: 8 }}>
          <input type="search" placeholder="Search products or catalog number" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search mockups" />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Mockup status">
            <option value="all">All products</option>
            <option value="installed">Official preview available</option>
            <option value="missing">Needs an approved asset</option>
          </select>
        </div>
        <div className="table-wrap">
          <table className="kit-table" data-testid="mockup-table">
            <thead><tr><th>Product</th><th>ShineOn catalog #</th><th>Preview status</th><th /></tr></thead>
            <tbody>
              {rows.map((p) => {
                const ks = kitsForProduct(p.id);
                return (
                  <tr key={p.id} data-product-id={p.id} data-status={ks.length ? 'official' : 'missing'}>
                    <td><div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}><ProductThumb product={p} size={56} /><span>{p.name} {p.productionPartner === 'SPP' && <PartnerChip partner="SPP" />}</span></div></td>
                    <td className="num">#{catalogIdOf(p)}</td>
                    <td>
                      {ks.length ? ks.map((k) => {
                        const a = kitAccuracy(k.kit);
                        return (
                          <div key={k.kit.id} className="small">
                            <span className="badge-official">✓ Official</span> {k.kit.variant ? VARIANTS[k.kit.variant].label : 'any finish'} · {k.kit.scene} {a.level !== 'verified' && <span className="badge-approx">approx.</span>}
                            {k.origin === 'local' && <button className="linklike" style={{ marginLeft: 6 }} onClick={() => removeKit(k.kit.id)}>remove</button>}
                          </div>
                        );
                      }) : <span className="small muted">Requires an approved ShineOn asset</span>}
                    </td>
                    <td className="num">
                      <button className="btn sm" onClick={() => { setInstallFor(p.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }} data-testid={`install-${p.id}`}>Install PSD</button>
                      {p.links.mockup && <a className="btn sm ghost" href={p.links.mockup} target="_blank" rel="noreferrer" style={{ marginLeft: 4 }}>Folder ↗</a>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
