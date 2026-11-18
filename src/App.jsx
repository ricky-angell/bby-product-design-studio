import React, { useCallback, useEffect, useState } from 'react';
import { loadCatalog } from './lib/catalog.js';
import { storageAvailable } from './lib/db.js';
import { newProject, saveProject, getProject, listProjects, deleteProject, exportBackup, importBackup } from './lib/projects.js';
import { buildSurface, readiness } from './lib/exporter.js';
import { inspectFile } from './lib/filemeta.js';
import { buildPrompt } from './lib/prompts.js';
import Catalog from './components/Catalog.jsx';
import ProductSetup from './components/ProductSetup.jsx';
import Studio from './components/Studio.jsx';
import Projects from './components/Projects.jsx';
import MockupLibrary from './components/MockupLibrary.jsx';
import * as mockupApi from './lib/mockups.js';
const { loadMockups } = mockupApi;
import { Logo, Modal } from './components/common.jsx';

const STEPS = [
  { n: 1, label: 'Select product' }, { n: 2, label: 'Artwork type' }, { n: 3, label: 'Create artwork', tab: 'design' },
  { n: 4, label: 'AI prompts', tab: 'ai' }, { n: 5, label: 'Preview', tab: 'preview' }, { n: 6, label: 'Build', tab: 'build' }, { n: 7, label: 'Download', tab: 'build' },
];

export default function App() {
  const [db, setDb] = useState(null);
  const [err, setErr] = useState('');
  const [view, setView] = useState('catalog');
  const [productId, setProductId] = useState(null);
  const [project, setProject] = useState(null);
  const [tab, setTab] = useState('design');
  const [toast, setToast] = useState('');
  const [help, setHelp] = useState(false);
  const [saveState, setSaveState] = useState('');
  const [storageOk, setStorageOk] = useState(true);
  const [mockupFocus, setMockupFocus] = useState(null);
  const [returnTo, setReturnTo] = useState(null);

  useEffect(() => { loadCatalog().then(setDb).catch((e) => setErr(e.message)); storageAvailable().then(setStorageOk); loadMockups(); }, []);
  useEffect(() => { if (!toast) return undefined; const t = setTimeout(() => setToast(''), 4200); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { window.scrollTo(0, 0); }, [view]);

  // Automated-test hook (no secrets; exposes the same functions the UI uses).
  useEffect(() => { if (db) window.__bbyTest = { db, buildSurface, readiness, inspectFile, newProject, saveProject, getProject, listProjects, deleteProject, exportBackup, importBackup, buildPrompt, openProject: (p) => openProject(p), mockups: mockupApi }; });

  const product = db && (project ? db.byId.get(project.productId) : productId ? db.byId.get(productId) : null);
  const onSaved = useCallback((p, s) => setSaveState(s === 'saving' ? 'Saving…' : s === 'error' ? 'Not saved' : `Saved ${new Date().toLocaleTimeString()}`), []);

  function openProject(p) { setProject(p); setProductId(p.productId); setTab('design'); setView('studio'); }
  const start = async ({ artworkType, variantId }) => {
    const p = newProject(product, { artworkType, variantId });
    try { await saveProject(p); } catch { setToast('This browser blocks local storage — your design will not be saved. Download backups or use another browser.'); }
    openProject(p);
  };

  const currentStep = view === 'catalog' ? 1 : view === 'setup' ? 2 : view === 'studio' ? STEPS.find((s) => s.tab === tab)?.n || 3 : 0;
  const goStep = (s) => {
    if (s.n === 1) { setProject(null); setView('catalog'); }
    else if (s.n === 2 && product) { setProject(null); setView('setup'); }
    else if (s.tab && project) setTab(s.tab);
  };

  return (
    <>
      <header className="app-header">
        <button className="brand" onClick={() => { setProject(null); setView('catalog'); }} aria-label="BBY Product Design Studio home">
          <Logo size={38} />
          <span><span className="brand-title chrome-text">BBY Product Design Studio</span><br /><span className="brand-sub">Built By You Academy</span></span>
        </button>
        <nav className="nav">
          <button className={view === 'catalog' || view === 'setup' ? 'active' : ''} onClick={() => { setProject(null); setView('catalog'); }}>Catalog</button>
          {project && <button className={view === 'studio' ? 'active' : ''} onClick={() => setView('studio')}>Studio</button>}
          <button className={view === 'projects' ? 'active' : ''} onClick={async () => { if (view === 'studio') await window.__bbyStudio?.persist?.(); setView('projects'); }}>My Projects</button>
          <button className={view === 'mockups' ? 'active' : ''} onClick={async () => { if (view === 'studio') await window.__bbyStudio?.persist?.(); setMockupFocus(null); setReturnTo(null); setView('mockups'); }}>Mockups</button>
          <button onClick={() => setHelp(true)}>Help</button>
        </nav>
        {view === 'studio' && <span className="save-state" aria-live="polite">{saveState}</span>}
      </header>
      <main>
        {!storageOk && <div className="notice warn" style={{ marginBottom: 12 }}>This browser is blocking local storage (private mode?). You can design and download, but projects won't be saved here.</div>}
        {(view === 'catalog' || view === 'setup' || view === 'studio') && (
          <nav className="steps" aria-label="Steps">
            {STEPS.map((s) => {
              const reachable = s.n === 1 || (s.n === 2 && product) || (s.tab && project);
              return <button key={s.n} className={`step ${currentStep === s.n || (s.n === 7 && currentStep === 6) ? 'active' : ''} ${currentStep > s.n ? 'done' : ''}`} disabled={!reachable} onClick={() => goStep(s)}><b>{currentStep > s.n ? '✓' : s.n}</b>{s.label}</button>;
            })}
          </nav>
        )}
        {err && <div className="notice bad">Could not load the product catalog: {err}</div>}
        {!db && !err && <div className="panel row"><span className="spinner" /> Loading product catalog…</div>}
        {db && view === 'catalog' && <Catalog db={db} onSelect={(id) => { setProductId(id); setProject(null); setView('setup'); }} />}
        {db && view === 'setup' && product && <ProductSetup product={product} onBack={() => setView('catalog')} onStart={start} />}
        {db && view === 'studio' && project && product && <Studio key={project.id} product={product} project={project} tab={tab} setTab={setTab} onSaved={onSaved} onToast={setToast} onBack={() => { setProject(null); setView('catalog'); }} onManageMockups={(id) => { setMockupFocus(id); setReturnTo('studio'); setView('mockups'); }} />}
        {db && view === 'mockups' && <MockupLibrary db={db} focusId={mockupFocus} onToast={setToast} onReturn={returnTo && project ? async () => { const p = await getProject(project.id).catch(() => null); if (p) setProject(p); setTab('preview'); setView('studio'); } : null} />}
        {db && view === 'projects' && <Projects db={db} onOpen={async (p) => openProject(await getProject(p.id))} onToast={setToast} />}
      </main>
      <footer>
        BBY Product Design Studio · a Built By You Academy tool · Not made by or affiliated with ShineOn — product specifications are collected from ShineOn's public Help Center{db ? ` (checked ${db.lastVerified})` : ''}. Your designs stay in your browser.
      </footer>
      {toast && <div className="toast" role="status">{toast}</div>}
      {help && <HelpModal db={db} onClose={() => setHelp(false)} />}
    </>
  );
}

function HelpModal({ db, onClose }) {
  return (
    <Modal title="How BBY Product Design Studio works" onClose={onClose}>
      <ol style={{ paddingLeft: 18 }}>
        <li><b>Select a product</b> from the catalog. Each product shows the exact artwork size, DPI, format, file-size limit and transparency rule ShineOn publishes.</li>
        <li><b>Choose the artwork type</b> the product accepts (message card, graphic, engraving or printed artwork).</li>
        <li><b>Create your artwork</b> with text, fonts, colours, photos, shapes, decorations, backgrounds and layers. Undo/redo with Ctrl+Z / Ctrl+Y.</li>
        <li><b>Bring your own AI</b> — copy a ready-made prompt into your own ChatGPT, Gemini, Copilot or Claude account. BBY never pays for AI, never asks for API keys, and your AI limits depend on your own plan.</li>
        <li><b>Preview</b> your design on ShineOn's own official mockup for that exact product and finish (once the mockup is installed — see <b>Mockups</b>). BBY never draws a stand-in product shape.</li>
        <li><b>BUILD MY PRODUCT DESIGN</b> renders the file at the exact required size, writes the DPI, re-opens the file and validates it.</li>
        <li><b>Download</b> the file(s), or a ZIP with a validation report.</li>
      </ol>
      <h3>Specification status</h3>
      <p className="small"><span className="chip ok">VERIFIED</span> every field is stated in ShineOn's requirements list and agrees with the product's own advice article. <span className="chip warn">NEEDS VERIFICATION</span> something is missing or ShineOn's own pages disagree — you can design, but files are not marked production-ready until you confirm the spec in ShineOn.</p>
      <h3>Official product previews</h3>
      <p className="small">ShineOn's mockups belong to ShineOn and are licensed to each seller, so they can't be bundled with this app. Download a mockup PSD from ShineOn's free seller portal and drop it into <b>Mockups</b>: it is read in your browser, matched to the exact product and finish, and checked against ShineOn's own render. Your BBY administrator can also publish approved mockups for everyone.</p>
      <h3>Your projects and privacy</h3>
      <p className="small">Projects and images are stored in this browser (IndexedDB) only. Nothing is uploaded. Projects don't sync between devices — use <b>My Projects → Backup</b> and <b>Import backup</b>.</p>
      <h3>Sources</h3>
      <ul className="small">{db?.sources.map((s) => <li key={s.id}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> (ShineOn updated {s.updated.slice(0, 10)})</li>)}</ul>
      <p className="small muted">Fonts are open-licence (SIL OFL) and bundled with the app, so exported SVG text is converted to vector outlines.</p>
    </Modal>
  );
}
