import React, { useState } from 'react';
import { buildSurface, readiness } from '../lib/exporter.js';
import { buildReport, zipBuild, zipName } from '../lib/report.js';
import { formatBytes } from '../lib/filemeta.js';
import { download } from './common.jsx';

export default function BuildPanel({ product, project, variant, getSurfaceJSON, editorRef, onGoDesign, onToast }) {
  const multi = product.formats.length > 1;
  const preferSvg = product.artworkRole === 'engraving' && product.formats.includes('SVG');
  const [format, setFormat] = useState(preferSvg ? 'SVG' : product.formats.includes('PNG') ? 'PNG' : product.formats[0]);
  const [flatten, setFlatten] = useState('#ffffff');
  const [optimize, setOptimize] = useState(false);
  const [busy, setBusy] = useState('');
  const [state, setState] = useState(null); // { results, ready, report }
  const needsFlatten = product.transparency === 'not-allowed' || format === 'JPG';

  const build = async (opts = {}) => {
    const useOptimize = opts.optimizePng ?? optimize;
    setState(null);
    const results = [];
    try {
      for (const s of product.surfaces) {
        setBusy(`Building ${s.label} (${s.width}×${s.height})…`);
        await new Promise((r) => setTimeout(r, 30));
        const r = await buildSurface(product, s, getSurfaceJSON(s.id), { format, flattenColor: flatten, optimizePng: useOptimize });
        results.push({ ...r, surface: s });
      }
      const ready = readiness(product, variant, results);
      const report = buildReport(product, variant, results, ready, project.name);
      setState({ results, ready, report });
    } catch (e) { onToast(`Build failed: ${e.message}`); }
    finally { setBusy(''); }
  };

  const fix = async (kind) => {
    if (kind === 'optimize-png') { setOptimize(true); await build({ optimizePng: true }); }
    else if (kind === 'make-black') { editorRef.current?.makeAllBlack(); await new Promise((r) => setTimeout(r, 350)); await build(); }
    else if (kind === 'trace') { onGoDesign(); onToast('Select the photo, then use "Trace to vector" in the right-hand panel.'); }
    else if (kind === 'add-background') { onGoDesign(); onToast('Use Background (left panel) to choose a background colour.'); }
  };
  const FIX_LABEL = { 'optimize-png': 'Optimise PNG', 'make-black': 'Make all black', trace: 'Go to tracing', 'add-background': 'Choose background' };

  return (
    <div className="two-col">
      <div>
        <div className="panel">
          <h3>Step 6 — Build my product design</h3>
          <p className="muted small">Renders your artwork at exactly {product.surfaces.map((s) => `${s.width}×${s.height}px`).join(' + ')}, writes the correct DPI, then re-opens the file and checks it against ShineOn's specification.</p>
          <div style={{ display: 'grid', gap: 8 }}>
            {multi && (
              <label className="field"><span>File format (ShineOn accepts {product.formats.join(' or ')})</span>
                <select value={format} onChange={(e) => { setFormat(e.target.value); setState(null); }}>{product.formats.map((f) => <option key={f}>{f}</option>)}</select>
              </label>
            )}
            {needsFlatten && (
              <label className="field"><span>Fill colour for any transparent areas ({format === 'JPG' ? 'JPG has no transparency' : 'this product does not accept transparency'})</span>
                <div className="row"><input type="color" value={flatten} onChange={(e) => setFlatten(e.target.value)} /><span className="small muted">{flatten}</span></div>
              </label>
            )}
            {format === 'PNG' && <label className="row small"><input type="checkbox" checked={optimize} onChange={(e) => setOptimize(e.target.checked)} /> Optimise PNG to 256 colours (smaller file; only needed if it is over the size limit)</label>}
          </div>
          <button className="btn-build" style={{ marginTop: 14 }} onClick={() => build()} disabled={!!busy} data-testid="build-button">
            {busy ? <><span className="spinner" /> {busy}</> : 'BUILD MY PRODUCT DESIGN'}
          </button>
          {product.specStatus !== 'VERIFIED' && <div className="notice warn small" style={{ marginTop: 10 }}>This product's specification NEEDS VERIFICATION, so files will be built but not marked production-ready.</div>}
        </div>
      </div>

      <div>
        {!state && !busy && <div className="panel muted">Your validation report and downloads will appear here.</div>}
        {state && (
          <>
            <div className={`ready-banner ${state.ready.productionReady ? 'ok' : 'no'}`} data-testid="ready-banner">
              {state.ready.productionReady ? '✓ PRODUCTION-READY — all required checks passed' : '⚠ NOT PRODUCTION-READY'}
            </div>
            {state.ready.reasons.length > 0 && <ul className="small" style={{ paddingLeft: 18 }}>{state.ready.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>}
            {state.results.map((r) => (
              <div className="panel" key={r.surface.id} style={{ marginTop: 12 }}>
                <div className="row"><h3 className="grow" style={{ margin: 0 }}>{r.surface.label}{r.fileName ? ` — ${r.fileName}` : ''}</h3><span className={`chip ${r.ok ? 'ok' : 'bad'}`}>{r.ok ? 'PASSED' : 'FAILED'}</span></div>
                <ul className="check-list" style={{ marginTop: 10 }}>
                  {r.checks.map((c, i) => (
                    <li key={i} className={c.status}>
                      <span className="i">{c.status === 'pass' ? '✓' : c.status === 'warn' ? '!' : '✗'}</span>
                      <span><b>{c.label}</b><br /><span className="small muted">{c.detail}</span></span>
                      {c.fix && <button className="btn sm" onClick={() => fix(c.fix)}>{FIX_LABEL[c.fix]}</button>}
                    </li>
                  ))}
                </ul>
                {r.blob && <button className="btn primary" style={{ marginTop: 10 }} onClick={() => download(r.blob, r.fileName)}>⬇ Download {r.format} ({formatBytes(r.size)})</button>}
              </div>
            ))}
            <div className="panel" style={{ marginTop: 12 }}>
              <h3>Step 7 — Download</h3>
              <div className="table-scroll">
                <table className="report-table">
                  <thead><tr><th>Product</th><th>Surface</th><th>Dimensions</th><th>DPI</th><th>Format</th><th>File size</th><th>Validation</th></tr></thead>
                  <tbody>{state.report.json.files.map((f, i) => (
                    <tr key={i}><td>{f.product}</td><td>{f.surface}</td><td>{f.exportedDimensions}</td><td>{String(f.exportedDpi ?? '—')}</td><td>{f.format}</td><td>{f.fileSize}</td><td><span className={`chip ${f.validation === 'PASSED' ? 'ok' : 'bad'}`}>{f.validation}</span></td></tr>
                  ))}</tbody>
                </table>
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn primary" onClick={async () => download(await zipBuild([{ results: state.results, report: state.report }]), zipName(project.name))} data-testid="zip-button">⬇ Download all + report (ZIP)</button>
                <button className="btn" onClick={() => download(new Blob([state.report.text], { type: 'text/plain' }), 'BUILD_REPORT.txt')}>Report (.txt)</button>
              </div>
              <p className="muted small">Upload the file{product.surfaces.length > 1 ? 's' : ''} in ShineOn using <a href={product.links.product || 'https://app.shineon.com/'} target="_blank" rel="noreferrer">Create Product ↗</a> (ShineOn login required). Several designs at once? Use <b>My Projects → Build selected (ZIP)</b>.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
