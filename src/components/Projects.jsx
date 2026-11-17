import React, { useEffect, useRef, useState } from 'react';
import { listProjects, renameProject, duplicateProject, deleteProject, exportBackup, importBackup } from '../lib/projects.js';
import { buildSurface, readiness, slugify } from '../lib/exporter.js';
import { buildReport, zipBuild } from '../lib/report.js';
import { emptySurfaceJSON } from '../lib/editor.js';
import { download } from './common.jsx';

export default function Projects({ db, onOpen, onToast }) {
  const [items, setItems] = useState(null);
  const [sel, setSel] = useState(new Set());
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState('');
  const fileRef = useRef(null);
  const refresh = async () => { try { setItems(await listProjects()); } catch (e) { setItems([]); onToast(`Browser storage unavailable: ${e.message}`); } };
  useEffect(() => { refresh(); }, []);

  const toggle = (id) => { const s = new Set(sel); s.has(id) ? s.delete(id) : s.add(id); setSel(s); };
  const chosen = () => items.filter((p) => sel.has(p.id));

  const backup = async (projects) => {
    setBusy('Preparing backup…');
    try { const blob = await exportBackup(projects); download(blob, projects.length === 1 ? `${slugify(projects[0].name)}.bby-backup.zip` : `bby-projects-backup-${new Date().toISOString().slice(0, 10)}.zip`); }
    catch (e) { onToast(e.message); } finally { setBusy(''); }
  };

  const batchBuild = async () => {
    const entries = [];
    try {
      for (const p of chosen()) {
        const product = db.byId.get(p.productId);
        if (!product) { onToast(`Product for "${p.name}" is no longer in the catalog.`); continue; }
        const fmt = product.artworkRole === 'engraving' && product.formats.includes('SVG') ? 'SVG' : product.formats.includes('PNG') ? 'PNG' : product.formats[0];
        const results = [];
        for (const s of product.surfaces) {
          setBusy(`Building "${p.name}" — ${s.label}…`);
          const r = await buildSurface(product, s, p.surfaces[s.id] || emptySurfaceJSON(), { format: fmt });
          results.push({ ...r, surface: s });
        }
        const variant = product.variants.find((v) => v.id === p.variantId) || null;
        const ready = readiness(product, variant, results);
        entries.push({ folder: `${slugify(p.name)}_${p.id.slice(0, 6)}`, results, report: buildReport(product, variant, results, ready, p.name) });
      }
      if (entries.length) {
        const summary = entries.map((e) => `${e.report.json.productionReady ? 'READY   ' : 'NOT READY'}  ${e.folder}  (${e.report.json.product.name})`).join('\n');
        const zip = await zipBuild([...entries, { folder: '', results: [], report: { text: `BBY batch build ${new Date().toLocaleString()}\n\n${summary}\n`, json: { batch: entries.map((e) => ({ folder: e.folder, productionReady: e.report.json.productionReady })) } } }]);
        download(zip, `bby-batch-build-${new Date().toISOString().slice(0, 10)}.zip`);
      }
    } catch (e) { onToast(`Batch build failed: ${e.message}`); } finally { setBusy(''); }
  };

  if (!items) return <div className="panel">Loading projects…</div>;
  return (
    <div>
      <div className="row" style={{ marginBottom: 12 }}>
        <h2 className="grow" style={{ margin: 0 }}>My projects</h2>
        <button className="btn" onClick={() => fileRef.current.click()}>⬆ Import backup</button>
        <input ref={fileRef} type="file" accept=".zip,application/zip" hidden onChange={async (e) => {
          const f = e.target.files[0]; e.target.value = ''; if (!f) return;
          try { const imp = await importBackup(f); onToast(`Imported ${imp.length} project${imp.length === 1 ? '' : 's'}.`); refresh(); } catch (err) { onToast(err.message); }
        }} data-testid="import-input" />
        <button className="btn" disabled={!sel.size || !!busy} onClick={() => backup(chosen())}>⬇ Back up selected</button>
        <button className="btn primary" disabled={!sel.size || !!busy} onClick={batchBuild}>⚙ Build selected (ZIP)</button>
      </div>
      <div className="notice warn small" style={{ marginBottom: 12 }}>
        Projects are saved <b>only in this browser on this device</b>. They are not uploaded and do not sync to other devices. Clearing browser data deletes them — <b>download a backup</b> regularly and import it on another device.
      </div>
      {busy && <div className="notice info row"><span className="spinner" /> {busy}</div>}
      {!items.length && <div className="panel muted">No saved projects yet. Choose a product from the catalog to start one — it saves automatically.</div>}
      <div className="proj-grid">
        {items.map((p) => {
          const product = db.byId.get(p.productId);
          return (
            <div key={p.id} className={`proj ${sel.has(p.id) ? 'sel' : ''}`} data-project-id={p.id}>
              <label className="row small"><input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} /> Select</label>
              {p.thumbnail ? <img src={p.thumbnail} alt="" /> : <div className="ph" />}
              <input type="text" defaultValue={p.name} aria-label="Project name" onBlur={async (e) => { if (e.target.value !== p.name) { await renameProject(p.id, e.target.value); refresh(); } }} />
              <div className="muted small">{product ? product.name : `${p.productName} (no longer in catalog)`}<br />Saved {new Date(p.updatedAt).toLocaleString()}</div>
              <div className="row" style={{ gap: 4 }}>
                <button className="btn sm primary" disabled={!product} onClick={() => onOpen(p)}>Open</button>
                <button className="btn sm" onClick={async () => { await duplicateProject(p.id); refresh(); }}>Duplicate</button>
                <button className="btn sm" onClick={() => backup([p])}>Backup</button>
                {confirm === p.id
                  ? <button className="btn sm danger" onClick={async () => { await deleteProject(p.id); setConfirm(null); refresh(); }}>Confirm delete</button>
                  : <button className="btn sm danger" onClick={() => setConfirm(p.id)}>Delete</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
