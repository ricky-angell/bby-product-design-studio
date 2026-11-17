import React, { useCallback, useEffect, useRef, useState } from 'react';
import EditorPanel from './EditorPanel.jsx';
import PromptAssistant from './PromptAssistant.jsx';
import PreviewPanel from './PreviewPanel.jsx';
import BuildPanel from './BuildPanel.jsx';
import { SpecTable, SpecIssues, SpecLinks, SpecSources } from './SpecSheet.jsx';
import { Modal, StatusChip, PartnerChip } from './common.jsx';
import { saveProject } from '../lib/projects.js';
import { emptySurfaceJSON } from '../lib/editor.js';
import { renderPreviewCanvas } from '../lib/exporter.js';

export const STUDIO_TABS = [
  { id: 'design', label: '3 · Create artwork' },
  { id: 'ai', label: '4 · AI prompts' },
  { id: 'preview', label: '5 · Preview' },
  { id: 'build', label: '6–7 · Build & download' },
];

export default function Studio({ product, project: initial, tab, setTab, onSaved, onToast, onBack }) {
  const projRef = useRef(initial);
  const [name, setName] = useState(initial.name);
  const [activeSurface, setActiveSurface] = useState(initial.activeSurface && product.surfaces.some((s) => s.id === initial.activeSurface) ? initial.activeSurface : product.surfaces[0].id);
  const [specOpen, setSpecOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const editorRef = useRef(null);
  const saveTimer = useRef(null), thumbTimer = useRef(null);
  const aiFileRef = useRef(null);
  const variant = product.variants.find((v) => v.id === initial.variantId) || null;
  const surface = product.surfaces.find((s) => s.id === activeSurface);

  const flush = useCallback(() => {
    if (editorRef.current) projRef.current.surfaces[activeSurface] = editorRef.current.toJSON();
  }, [activeSurface]);

  const persist = useCallback(async () => {
    flush();
    projRef.current.activeSurface = activeSurface;
    try { await saveProject(projRef.current); onSaved?.(projRef.current, 'saved'); } catch (e) { onSaved?.(projRef.current, 'error'); onToast?.(`Could not save to this browser: ${e.message}`); }
  }, [flush, activeSurface, onSaved, onToast]);

  const onDesignChange = useCallback(() => {
    onSaved?.(projRef.current, 'saving');
    setVersion((v) => v + 1);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(persist, 900);
    clearTimeout(thumbTimer.current);
    thumbTimer.current = setTimeout(async () => {
      try {
        const s0 = product.surfaces[0];
        const json = s0.id === activeSurface && editorRef.current ? editorRef.current.toJSON() : projRef.current.surfaces[s0.id] || emptySurfaceJSON();
        const c = await renderPreviewCanvas(json, s0, 240);
        projRef.current.thumbnail = c.toDataURL('image/png');
        await saveProject(projRef.current);
      } catch { /* thumbnail is optional */ }
    }, 3000);
  }, [persist, product, activeSurface]);

  useEffect(() => () => { clearTimeout(saveTimer.current); clearTimeout(thumbTimer.current); }, []);
  useEffect(() => { const h = () => { flush(); saveProject(projRef.current).catch(() => {}); }; window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h); }, [flush]);

  const switchSurface = (sid) => { flush(); setActiveSurface(sid); persist(); };
  const getSurfaceJSON = useCallback((sid) => (sid === activeSurface && editorRef.current ? editorRef.current.toJSON() : projRef.current.surfaces[sid] || emptySurfaceJSON()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeSurface, version]);

  const rename = (n) => { setName(n); projRef.current.name = n; persist(); };

  // test hook
  useEffect(() => { window.__bbyStudio = { editorRef, project: projRef, product, getSurfaceJSON, persist, setActiveSurface: switchSurface }; });

  return (
    <div>
      <div className="studio-top">
        <button className="btn sm" onClick={async () => { await persist(); onBack(); }}>← Catalog</button>
        <input className="project-name" value={name} onChange={(e) => rename(e.target.value)} aria-label="Project name" />
        <span className="chip">{product.name}</span>
        <PartnerChip partner={product.productionPartner} />
        <StatusChip status={product.specStatus} />
        {variant && <span className={`chip ${variant.specStatus === 'NEEDS VERIFICATION' ? 'warn' : ''}`}>{variant.label}</span>}
        <button className="btn sm" onClick={() => setSpecOpen(true)}>📐 Spec sheet</button>
        <span className="grow" />
        <div className="tabs" role="tablist">
          {STUDIO_TABS.map((t) => <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'active' : ''} onClick={() => { flush(); setTab(t.id); }}>{t.label}</button>)}
        </div>
      </div>

      <EditorPanel key={`${product.id}:${activeSurface}`} product={product} surface={surface} initialJSON={projRef.current.surfaces[activeSurface]} editorRef={editorRef}
        onDesignChange={onDesignChange} onToast={onToast} hidden={tab !== 'design'} surfaces={product.surfaces} activeSurface={activeSurface} onSurfaceChange={switchSurface} />
      {tab === 'ai' && <PromptAssistant product={product} surface={surface} onUploadArt={() => aiFileRef.current.click()} />}
      <input ref={aiFileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg" hidden onChange={async (e) => {
        const f = e.target.files[0]; e.target.value = ''; if (!f) return;
        setTab('design');
        try { await editorRef.current.addImageFile(f); onToast('Artwork added to your design.'); } catch (err) { onToast(err.message); }
      }} />
      {tab === 'preview' && <PreviewPanel product={product} getSurfaceJSON={getSurfaceJSON} active={tab === 'preview'} />}
      {tab === 'build' && <BuildPanel product={product} project={projRef.current} variant={variant} getSurfaceJSON={getSurfaceJSON} editorRef={editorRef} onGoDesign={() => setTab('design')} onToast={onToast} />}

      {specOpen && (
        <Modal title={`${product.name} — specification`} onClose={() => setSpecOpen(false)} wide>
          <div className="two-col"><div><SpecTable product={product} /></div><div><SpecIssues product={product} /><h3 style={{ marginTop: 10 }}>Official resources</h3><SpecLinks product={product} /><h3 style={{ marginTop: 10 }}>Sources</h3><SpecSources product={product} /></div></div>
        </Modal>
      )}
    </div>
  );
}
