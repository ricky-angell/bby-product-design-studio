import React, { useEffect, useRef, useState, useCallback } from 'react';
import { StudioEditor, emptySurfaceJSON } from '../lib/editor.js';
import { FONT_FAMILIES, ensureFontsLoaded, variantsFor } from '../lib/fonts.js';
import { DECORATIONS } from '../lib/decorations.js';
import { Modal } from './common.jsx';

const SWATCHES = ['#000000', '#ffffff', '#0b1530', '#1f8bff', '#3bc9ff', '#c0c7d2', '#d4a537', '#e0245e', '#f28cb1', '#7b5cff', '#1f8a4c', '#8a5a2b'];

export default function EditorPanel({ product, surface, initialJSON, editorRef, onDesignChange, onToast, hidden, surfaces, activeSurface, onSurfaceChange }) {
  const wrapRef = useRef(null), holderRef = useRef(null), fileRef = useRef(null), bgFileRef = useRef(null);
  const [ed, setEd] = useState(null);
  const [guides, setGuides] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [svgModal, setSvgModal] = useState(false);
  const [busy, setBusy] = useState('');
  const engraving = product.artworkRole === 'engraving';

  // create editor for this surface
  useEffect(() => {
    const holder = holderRef.current;
    const el = document.createElement('canvas');
    holder.appendChild(el);
    const editor = new StudioEditor(el, { surface, product, onChange: (s) => { setEd(s); onDesignChange?.(surface.id); } });
    editorRef.current = editor;
    let alive = true;
    (async () => {
      await ensureFontsLoaded();
      if (!alive) return;
      await editor.load(initialJSON || emptySurfaceJSON());
      if (!initialJSON) {
        if (product.transparency === 'not-allowed' || product.artworkRole === 'message-card') editor.setBackground({ kind: 'color', color: '#ffffff' });
        editor.undoStack = [editor.snapshot()];
      }
      fit();
      editor.emit();
    })().catch((e) => onToast?.(`Could not open design: ${e.message}`));
    const ro = new ResizeObserver(() => fit());
    ro.observe(wrapRef.current);
    function fit() { const r = wrapRef.current?.getBoundingClientRect(); if (r && r.width > 0) editor.fit(r.width, r.height); }
    return () => { alive = false; ro.disconnect(); editor.dispose(); editorRef.current = null; holder.innerHTML = ''; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id, surface.id]);

  useEffect(() => { if (!hidden) { const r = wrapRef.current?.getBoundingClientRect(); if (r && r.width > 0) editorRef.current?.fit(r.width, r.height); } }, [hidden, editorRef]);

  const E = () => editorRef.current;
  const run = useCallback(async (label, fn) => {
    setBusy(label);
    try { await fn(); } catch (e) { onToast?.(e.message || String(e)); } finally { setBusy(''); }
  }, [onToast]);

  // keyboard shortcuts
  useEffect(() => {
    if (hidden) return undefined;
    const onKey = (e) => {
      const t = e.target; if (t.closest && t.closest('input,textarea,select,[contenteditable]')) return;
      const editor = E(); if (!editor) return;
      if (editor.active()?.isEditing) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); editor.undo(); }
      else if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); editor.redo(); }
      else if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); editor.duplicate(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { if (editor.active()) { e.preventDefault(); editor.remove(); } }
      else if (e.key.startsWith('Arrow') && editor.active()) {
        e.preventDefault(); const step = (e.shiftKey ? 10 : 1) / editor.zoom; const o = editor.active();
        o.set({ left: o.left + (e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0), top: o.top + (e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0) });
        o.setCoords(); editor.commit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hidden]);

  const addFiles = (files, asBackground) => run('Adding image…', async () => {
    for (const f of files) {
      if (!/^image\//.test(f.type) && !/\.svg$/i.test(f.name)) { onToast?.(`${f.name} is not an image.`); continue; }
      await E().addImageFile(f, { asBackground });
    }
  });

  const sel = ed?.selection;
  return (
    <div className="editor-layout" hidden={hidden}>
      {/* ---------- toolbox ---------- */}
      <div className="toolbox panel">
        <h4>Add</h4>
        <button className="btn" onClick={() => E().addText('Your text here')}>🔤 Add text</button>
        <button className="btn" onClick={() => E().addText('Heading', { fontFamily: 'Great Vibes', fontSize: Math.round(Math.min(surface.width, surface.height) * 0.13) })}>✒️ Script heading</button>
        <button className="btn" onClick={() => fileRef.current.click()}>🖼️ Upload photo / AI art</button>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.svg" multiple hidden onChange={(e) => { addFiles([...e.target.files]); e.target.value = ''; }} data-testid="upload-input" />
        <button className="btn" onClick={() => setSvgModal(true)}>🧩 Paste SVG code</button>
        <h4>Shapes</h4>
        <div className="grid2">
          {[['rect', '▭ Rectangle'], ['rounded', '▢ Rounded'], ['circle', '◯ Circle'], ['ellipse', '⬭ Ellipse'], ['triangle', '△ Triangle'], ['star', '☆ Star'], ['line', '― Line'], ['frame', '⬚ Border']].map(([k, l]) => (
            <button key={k} className="btn sm" onClick={() => E().addShape(k)}>{l}</button>
          ))}
        </div>
        <h4>Decorations</h4>
        <div className="deco-grid">
          {DECORATIONS.map((d) => (
            <button key={d.id} title={d.label} aria-label={d.label} onClick={() => E().addDecoration(d.id)}>
              <svg viewBox="-4 -4 108 108"><path d={d.path} fill={engraving ? '#e8ecf2' : d.color} /></svg>
            </button>
          ))}
        </div>
        <h4>Background</h4>
        <BackgroundControls editorRef={editorRef} engraving={engraving} product={product} onUploadBg={() => bgFileRef.current.click()} />
        <input ref={bgFileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { addFiles([...e.target.files], true); e.target.value = ''; }} />
      </div>

      {/* ---------- canvas ---------- */}
      <div className="canvas-col">
        {surfaces.length > 1 && (
          <div className="surface-tabs" role="tablist" aria-label="Artwork surfaces">
            {surfaces.map((s) => <button key={s.id} className={`btn sm ${s.id === activeSurface ? 'active' : ''}`} onClick={() => onSurfaceChange(s.id)} role="tab" aria-selected={s.id === activeSurface}>{s.label} · {s.width}×{s.height}</button>)}
          </div>
        )}
        <div className="canvas-bar">
          <button className="btn sm" onClick={() => E().undo()} disabled={!ed?.canUndo} title="Undo (Ctrl+Z)">↶ Undo</button>
          <button className="btn sm" onClick={() => E().redo()} disabled={!ed?.canRedo} title="Redo (Ctrl+Y)">↷ Redo</button>
          <button className="btn sm" onClick={() => E().duplicate()} disabled={!sel} title="Duplicate (Ctrl+D)">⧉ Duplicate</button>
          <button className="btn sm danger" onClick={() => E().remove()} disabled={!sel} title="Delete">🗑 Delete</button>
          <span className="grow" />
          <label className="row small" style={{ gap: 4 }}><input type="checkbox" checked={guides} onChange={(e) => { setGuides(e.target.checked); E().setGuides(e.target.checked); }} /> Guides</label>
          <span className="chip">{surface.width}×{surface.height}px · {Math.round((E()?.zoom || 0) * 100)}%</span>
          {busy && <span className="row small"><span className="spinner" /> {busy}</span>}
        </div>
        <div className="canvas-wrap" ref={wrapRef}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles([...e.dataTransfer.files]); }}>
          <div className="canvas-holder" ref={holderRef} data-testid="canvas-holder" />
          {dragOver && <div className="drop-hint">Drop images to add them</div>}
        </div>
        <p className="muted small" style={{ margin: 0 }}>
          The blue line is the official artwork edge. The dashed silver line is an <b>advisory</b> 5% margin (ShineOn doesn't publish numeric safe areas — check the official template). {product.artworkRole === 'message-card' && 'The orange circle marks roughly where the jewelry sits. '}Guides never appear in your exported file.
        </p>
      </div>

      {/* ---------- properties ---------- */}
      <div className="props">
        <div className="panel">
          <h3>{sel ? sel.name : 'Nothing selected'}</h3>
          {!sel && <p className="muted small" style={{ margin: 0 }}>Click an element on the artwork or in Layers to edit it. Double-click text to type on the canvas.</p>}
          {sel?.type === 'textbox' && <TextProps sel={sel} editorRef={editorRef} engraving={engraving} product={product} />}
          {sel?.type === 'image' && <ImageProps sel={sel} editorRef={editorRef} product={product} run={run} />}
          {sel && ['rect', 'circle', 'ellipse', 'triangle', 'polygon', 'path', 'line', 'group'].includes(sel.type) && <ShapeProps sel={sel} editorRef={editorRef} engraving={engraving} />}
          {sel && (
            <>
              <label className="field" style={{ marginTop: 10 }}><span>Opacity {Math.round(sel.opacity * 100)}%</span>
                <input type="range" min="0.05" max="1" step="0.05" value={sel.opacity} onChange={(e) => E().set({ opacity: +e.target.value })} />
              </label>
              {engraving && sel.opacity < 1 && <p className="small" style={{ color: 'var(--warn)', margin: 0 }}>Semi-transparent artwork engraves unpredictably.</p>}
              <label className="field"><span>Rotation {sel.angle}°</span>
                <input type="range" min="-180" max="180" step="1" value={sel.angle > 180 ? sel.angle - 360 : sel.angle} onChange={(e) => E().set({ angle: +e.target.value })} />
              </label>
            </>
          )}
        </div>
        <div className="panel">
          <h3>Arrange</h3>
          <div className="grid2" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            {[['left', '⇤ Left'], ['hcenter', '↔ Center'], ['right', 'Right ⇥'], ['top', '⤒ Top'], ['vcenter', '↕ Middle'], ['bottom', 'Bottom ⤓']].map(([k, l]) => (
              <button key={k} className="btn sm" disabled={!sel} onClick={() => E().align(k)}>{l}</button>
            ))}
          </div>
          <p className="muted small" style={{ margin: '6px 0 0' }}>Aligns to the artwork. Drag near the centre to snap.</p>
        </div>
        <div className="panel">
          <h3>Layers</h3>
          <Layers ed={ed} editorRef={editorRef} />
        </div>
      </div>

      {svgModal && <SvgPasteModal onClose={() => setSvgModal(false)} onAdd={(t) => run('Importing SVG…', async () => { await E().addSvgString(t, 'Pasted SVG'); setSvgModal(false); })} />}
    </div>
  );
}

function ColorRow({ value, onChange, disabled }) {
  return (
    <div className="row" style={{ gap: 6 }}>
      <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'} onChange={(e) => onChange(e.target.value)} disabled={disabled} aria-label="Colour" />
      <div className="swatches">{SWATCHES.map((c) => <button key={c} className="swatch" style={{ background: c }} onClick={() => onChange(c)} disabled={disabled} aria-label={`Colour ${c}`} />)}</div>
    </div>
  );
}

function TextProps({ sel, editorRef, engraving, product }) {
  const E = () => editorRef.current;
  const variants = variantsFor(sel.fontFamily);
  const hasBold = variants.some((v) => v.weight === 700), hasItalic = variants.some((v) => v.style === 'italic');
  const pt = typeof product.dpi === 'number' ? (sel.fontSize / product.dpi) * 72 : null;
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <label className="field"><span>Text</span><textarea rows={3} value={sel.text} onChange={(e) => E().set({ text: e.target.value })} /></label>
      <label className="field"><span>Font</span>
        <select value={sel.fontFamily} onChange={(e) => E().set({ fontFamily: e.target.value })}>
          {FONT_FAMILIES.map((f) => <option key={f.family} value={f.family} style={{ fontFamily: f.family }}>{f.family} — {f.style}</option>)}
        </select>
      </label>
      <label className="field"><span>Size {sel.fontSize}px{pt ? ` (≈${pt.toFixed(1)} pt printed)` : ''}</span>
        <input type="range" min="8" max={Math.round(Math.max(product.surfaces[0].width, product.surfaces[0].height) * 0.4)} value={sel.rawFontSize} onChange={(e) => E().set({ fontSize: +e.target.value })} />
      </label>
      <div className="row" style={{ gap: 4 }}>
        <button className={`btn sm ${sel.fontWeight === 'bold' || sel.fontWeight >= 600 ? 'active' : ''}`} disabled={!hasBold} onClick={() => E().set({ fontWeight: sel.fontWeight === 'bold' || sel.fontWeight >= 600 ? 'normal' : 'bold' })} title={hasBold ? 'Bold' : 'This font has no bold'}><b>B</b></button>
        <button className={`btn sm ${sel.fontStyle === 'italic' ? 'active' : ''}`} disabled={!hasItalic} onClick={() => E().set({ fontStyle: sel.fontStyle === 'italic' ? 'normal' : 'italic' })} title={hasItalic ? 'Italic' : 'This font has no italic'}><i>I</i></button>
        {['left', 'center', 'right'].map((a) => <button key={a} className={`btn sm ${sel.textAlign === a ? 'active' : ''}`} onClick={() => E().set({ textAlign: a })}>{a === 'left' ? '⯇' : a === 'center' ? '≡' : '⯈'}</button>)}
      </div>
      <div><span className="small muted">Colour</span>{engraving ? <p className="small muted" style={{ margin: 0 }}>Engraving artwork is solid black.</p> : <ColorRow value={sel.fill} onChange={(c) => E().set({ fill: c })} />}</div>
      <div className="grid2">
        <label className="field"><span>Letter spacing</span><input type="number" step="10" value={sel.charSpacing} onChange={(e) => E().set({ charSpacing: +e.target.value })} /></label>
        <label className="field"><span>Line height</span><input type="number" step="0.05" min="0.6" max="3" value={sel.lineHeight} onChange={(e) => E().set({ lineHeight: +e.target.value })} /></label>
      </div>
      {!engraving && (
        <div className="grid2">
          <label className="field"><span>Outline</span><input type="color" value={/^#[0-9a-f]{6}$/i.test(sel.stroke) ? sel.stroke : '#ffffff'} onChange={(e) => E().set({ stroke: e.target.value, paintFirst: 'stroke' })} /></label>
          <label className="field"><span>Outline width</span><input type="number" min="0" step="1" value={sel.strokeWidth} onChange={(e) => E().set({ strokeWidth: +e.target.value, paintFirst: 'stroke', stroke: sel.stroke || '#ffffff' })} /></label>
        </div>
      )}
    </div>
  );
}

function ImageProps({ sel, editorRef, product, run }) {
  const E = () => editorRef.current;
  const [crop, setCrop] = useState(null);
  const [thr, setThr] = useState(140);
  const img = E()?.active();
  const effDpi = typeof product.dpi === 'number' ? Math.round(product.dpi / sel.scale) : null;
  const setC = (k, v) => { const c = { ...crop, [k]: v }; if (c.l + c.r > 0.9 || c.t + c.b > 0.9) return; setCrop(c); E().crop(img, c); };
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <p className="small muted" style={{ margin: 0 }}>Original {sel.naturalWidth}×{sel.naturalHeight}px · shown at {sel.displayW}×{sel.displayH}px ({Math.round(sel.scale * 100)}%)
        {sel.scale > 1.5 && <><br /><span style={{ color: 'var(--warn)' }}>Enlarged {sel.scale.toFixed(1)}× — may print soft{effDpi ? ` (≈${effDpi} DPI effective)` : ''}.</span></>}</p>
      <div className="grid2">
        <button className="btn sm" onClick={() => E().fitSelection('fit')}>Fit inside</button>
        <button className="btn sm" onClick={() => E().fitSelection('fill')}>Fill artwork</button>
        <button className="btn sm" onClick={() => E().set({ flipX: !sel.flipX })}>⇋ Flip H</button>
        <button className="btn sm" onClick={() => E().set({ flipY: !sel.flipY })}>⇵ Flip V</button>
        <button className="btn sm" onClick={() => E().makeImageBackground()}>Set as background</button>
        <button className={`btn sm ${crop ? 'active' : ''}`} onClick={() => setCrop(crop ? null : E().cropFractions(img))}>✂ Crop</button>
      </div>
      {crop && (
        <div className="grid2">
          {[['l', 'Left'], ['r', 'Right'], ['t', 'Top'], ['b', 'Bottom']].map(([k, l]) => (
            <label key={k} className="field"><span>{l} {Math.round(crop[k] * 100)}%</span><input type="range" min="0" max="0.45" step="0.005" value={crop[k]} onChange={(e) => setC(k, +e.target.value)} /></label>
          ))}
          <button className="btn sm" onClick={() => { const c = { l: 0, t: 0, r: 0, b: 0 }; setCrop(c); E().crop(img, c); }}>Reset crop</button>
          <button className="btn sm primary" onClick={() => setCrop(null)}>Done</button>
        </div>
      )}
      {(product.artworkRole === 'engraving') && (
        <div className="notice info small">
          <b>Photos can't be engraved as SVG.</b> Trace this image into solid black vector shapes:
          <label className="field" style={{ marginTop: 6 }}><span>Darkness threshold {thr}</span><input type="range" min="40" max="230" value={thr} onChange={(e) => setThr(+e.target.value)} /></label>
          <button className="btn sm primary" style={{ marginTop: 6 }} onClick={() => run('Tracing…', () => E().traceToVector(img, { threshold: thr }))}>Trace to vector</button>
        </div>
      )}
    </div>
  );
}

function ShapeProps({ sel, editorRef, engraving }) {
  const E = () => editorRef.current;
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {sel.type !== 'line' && sel.type !== 'group' && <div><span className="small muted">Fill</span>{engraving ? <p className="small muted" style={{ margin: 0 }}>Solid black for engraving.</p> : <><ColorRow value={sel.fill} onChange={(c) => E().set({ fill: c })} /><button className="btn sm" style={{ marginTop: 4 }} onClick={() => E().set({ fill: '' })}>No fill</button></>}</div>}
      {sel.type === 'group' && !engraving && <div><span className="small muted">Recolour all</span><ColorRow value="#000000" onChange={(c) => { const g = E().active(); g.getObjects().forEach((o) => o.set('fill', c)); E().commit(); }} /></div>}
      {sel.type !== 'group' && (
        <div className="grid2">
          <label className="field"><span>Outline</span><input type="color" value={/^#[0-9a-f]{6}$/i.test(sel.stroke) ? sel.stroke : '#000000'} disabled={engraving} onChange={(e) => E().set({ stroke: e.target.value })} /></label>
          <label className="field"><span>Outline width</span><input type="number" min="0" value={Math.round(sel.strokeWidth)} onChange={(e) => E().set({ strokeWidth: +e.target.value, stroke: sel.stroke || '#000000' })} /></label>
        </div>
      )}
      {sel.type === 'rect' && <label className="field"><span>Corner radius</span><input type="range" min="0" max={Math.round(sel.width / 2)} value={sel.rx} onChange={(e) => E().set({ rx: +e.target.value, ry: +e.target.value })} /></label>}
    </div>
  );
}

function Layers({ ed, editorRef }) {
  const [editing, setEditing] = useState(null);
  if (!ed?.layers?.length) return <p className="muted small" style={{ margin: 0 }}>No layers yet.</p>;
  const E = () => editorRef.current;
  return (
    <div className="layers">
      {ed.layers.map((l) => (
        <div key={l.index} className={`layer ${l.active ? 'active' : ''}`}>
          {editing === l.index
            ? <input type="text" defaultValue={l.name} autoFocus onBlur={(e) => { E().renameLayer(l.index, e.target.value); setEditing(null); }} onKeyDown={(e) => e.key === 'Enter' && e.target.blur()} />
            : <span className="name" onClick={() => E().selectLayer(l.index)} onDoubleClick={() => setEditing(l.index)} title="Click to select · double-click to rename" style={{ opacity: l.visible ? 1 : 0.45 }}>{l.name}</span>}
          <button onClick={() => E().layerOp(l.index, 'up')} title="Move up" aria-label="Move layer up">▲</button>
          <button onClick={() => E().layerOp(l.index, 'down')} title="Move down" aria-label="Move layer down">▼</button>
          <button onClick={() => E().layerOp(l.index, 'toggleVisible')} title={l.visible ? 'Hide' : 'Show'} aria-label="Toggle visibility">{l.visible ? '👁' : '◌'}</button>
          <button onClick={() => E().layerOp(l.index, 'toggleLock')} title={l.locked ? 'Unlock' : 'Lock'} aria-label="Toggle lock">{l.locked ? '🔒' : '🔓'}</button>
          <button onClick={() => E().layerOp(l.index, 'delete')} title="Delete" aria-label="Delete layer">✕</button>
        </div>
      ))}
    </div>
  );
}

function BackgroundControls({ editorRef, engraving, product, onUploadBg }) {
  const [kind, setKind] = useState('color');
  const [c1, setC1] = useState('#ffffff'); const [c2, setC2] = useState('#cfe6ff'); const [angle, setAngle] = useState(180);
  const apply = (k = kind, a = c1, b = c2, an = angle) => editorRef.current?.setBackground({ kind: k, color: a, color2: b, angle: an });
  if (engraving) return <p className="muted small" style={{ margin: 0 }}>Engraving artwork has no background — only the black design is engraved.<br /><button className="btn sm" style={{ marginTop: 6 }} onClick={() => apply('none')}>Remove background</button></p>;
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div className="row" style={{ gap: 4 }}>
        {['color', 'gradient'].map((k) => <button key={k} className={`btn sm ${kind === k ? 'active' : ''}`} onClick={() => { setKind(k); apply(k); }}>{k === 'color' ? 'Solid' : 'Gradient'}</button>)}
        <button className="btn sm" onClick={() => apply('none')} disabled={product.transparency === 'not-allowed'} title={product.transparency === 'not-allowed' ? 'This product does not accept transparency' : 'Transparent background'}>None</button>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <input type="color" value={c1} onChange={(e) => { setC1(e.target.value); apply(kind, e.target.value); }} aria-label="Background colour" />
        {kind === 'gradient' && <><input type="color" value={c2} onChange={(e) => { setC2(e.target.value); apply(kind, c1, e.target.value); }} aria-label="Second colour" />
          <input type="range" min="0" max="360" value={angle} onChange={(e) => { setAngle(+e.target.value); apply(kind, c1, c2, +e.target.value); }} aria-label="Gradient angle" style={{ flex: 1 }} /></>}
      </div>
      <button className="btn sm" onClick={onUploadBg}>🖼️ Background image</button>
    </div>
  );
}

function SvgPasteModal({ onClose, onAdd }) {
  const [t, setT] = useState('');
  return (
    <Modal title="Paste SVG code" onClose={onClose}>
      <p className="muted small">Paste SVG code from Claude, ChatGPT or a design tool. Scripts and external links are removed automatically. Great for engraving line art.</p>
      <textarea rows={10} value={t} onChange={(e) => setT(e.target.value)} placeholder={'<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">…</svg>'} style={{ fontFamily: 'monospace', fontSize: 12 }} />
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" disabled={!/<svg[\s>]/i.test(t)} onClick={() => onAdd(t)}>Add to design</button>
      </div>
    </Modal>
  );
}
