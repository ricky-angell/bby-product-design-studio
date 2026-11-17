import React, { useMemo, useState } from 'react';
import { PURPOSES, STYLES, AI_TOOLS, buildPrompt } from '../lib/prompts.js';

export default function PromptAssistant({ product, surface, onUploadArt }) {
  const defaultPurpose = product.artworkRole === 'engraving' ? 'engraving' : product.artworkRole === 'graphic' ? 'jewelry' : 'product';
  const [f, setF] = useState({ purpose: defaultPurpose, subject: '', recipient: '', occasion: '', style: '', colors: '', mood: '', extra: '', transparent: false, photo: false, count: 10 });
  const [copied, setCopied] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const out = useMemo(() => buildPrompt(product, surface, f), [product, surface, f]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(out.prompt); }
    catch {
      const ta = document.createElement('textarea'); ta.value = out.prompt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    setCopied(true); setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="two-col">
      <div>
        <div className="panel">
          <h3>Step 4 — Bring Your Own AI</h3>
          <div className="notice info small">
            <b>BBY does not pay for AI and never asks for API keys.</b> Copy the prompt, paste it into <i>your own</i> AI account, download the image, then upload it here. How many images you can make depends on your own AI plan — free plans have daily limits. A paid subscription is not needed for the basic workflow.
          </div>
          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            <label className="field"><span>What do you want to make?</span>
              <select value={f.purpose} onChange={set('purpose')}>{PURPOSES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
            </label>
            <p className="muted small" style={{ margin: 0 }}>{PURPOSES.find((p) => p.id === f.purpose)?.hint}</p>
            <label className="field"><span>Describe the subject</span><input type="text" value={f.subject} onChange={set('subject')} placeholder={f.purpose === 'pet' ? 'e.g. a golden retriever puppy with a red bandana' : 'e.g. pink peonies and eucalyptus wreath'} /></label>
            <div className="grid2">
              <label className="field"><span>Recipient</span><input type="text" value={f.recipient} onChange={set('recipient')} placeholder="e.g. my mom" /></label>
              <label className="field"><span>Occasion</span><input type="text" value={f.occasion} onChange={set('occasion')} placeholder="e.g. Mother's Day" /></label>
              <label className="field"><span>Style</span><select value={f.style} onChange={set('style')}><option value="">Any style</option>{STYLES.map((s) => <option key={s}>{s}</option>)}</select></label>
              <label className="field"><span>Mood / tone</span><input type="text" value={f.mood} onChange={set('mood')} placeholder="e.g. warm, elegant" /></label>
            </div>
            {f.purpose !== 'gift-message' && product.artworkRole !== 'engraving' && <label className="field"><span>Colours</span><input type="text" value={f.colors} onChange={set('colors')} placeholder="e.g. blush pink, sage green, gold" /></label>}
            <label className="field"><span>Anything else?</span><input type="text" value={f.extra} onChange={set('extra')} placeholder="Extra details for the AI" /></label>
            {f.purpose === 'pet' && <label className="row small"><input type="checkbox" checked={f.photo} onChange={set('photo')} /> I will attach a photo of the pet to the AI chat</label>}
            {product.transparency === 'allowed' && f.purpose !== 'gift-message' && product.artworkRole !== 'engraving' && <label className="row small"><input type="checkbox" checked={f.transparent} onChange={set('transparent')} /> Ask for a transparent background</label>}
          </div>
        </div>
      </div>
      <div>
        <div className="panel">
          <div className="row"><h3 className="grow" style={{ margin: 0 }}>Your prompt</h3><span className="chip">{out.kind === 'text' ? 'Text prompt' : `Image prompt · ${out.ratio}`}</span></div>
          <div className="prompt-out" data-testid="prompt-output" style={{ marginTop: 10 }}>{out.prompt}</div>
          <button className="btn-build" style={{ marginTop: 10, fontSize: 16, padding: 14 }} onClick={copy}>{copied ? '✓ COPIED — now paste it into your AI' : '📋 COPY PROMPT'}</button>
          {out.tips.length > 0 && <ul className="small" style={{ paddingLeft: 18, marginBottom: 0 }}>{out.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>}
        </div>
        <div className="panel">
          <h3>Open your AI account</h3>
          <div className="tool-links">{AI_TOOLS.map((t) => <a key={t.name} href={t.url} target="_blank" rel="noreferrer"><b>{t.name} ↗</b><span className="muted small">{t.note}</span></a>)}</div>
          <ol className="small" style={{ paddingLeft: 18 }}>
            <li>Click <b>COPY PROMPT</b>.</li>
            <li>Open your own AI account and paste the prompt.</li>
            <li>Download the image it creates (largest size available).</li>
            <li>Upload it here — it goes straight onto your design.</li>
          </ol>
          {out.kind === 'image' && <button className="btn primary" onClick={onUploadArt}>⬆ Upload my AI artwork</button>}
          <p className="muted small">Only use images you have the right to sell. Check your AI tool's terms for commercial use.</p>
        </div>
      </div>
    </div>
  );
}
