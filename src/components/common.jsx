import React from 'react';
import { HEART_100 } from '../lib/editor.js';

export function Logo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="lg-chrome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" /><stop offset=".45" stopColor="#c0c7d2" /><stop offset=".55" stopColor="#8e97a6" /><stop offset="1" stopColor="#e9edf3" />
        </linearGradient>
        <linearGradient id="lg-blue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3bc9ff" /><stop offset="1" stopColor="#1f6fff" /></linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="#08122b" />
      <rect x="2.5" y="2.5" width="59" height="59" rx="13" fill="none" stroke="url(#lg-blue)" strokeWidth="2.5" />
      <text x="32" y="40.5" fontFamily="Poppins, Arial Black, sans-serif" fontSize="21" fontWeight="800" textAnchor="middle" fill="url(#lg-chrome)">BBY</text>
      <path d="M48 12 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#3bc9ff" />
    </svg>
  );
}

const DOGTAG = 'M30 0 H70 Q100 0 100 30 V70 Q100 100 70 100 H30 Q0 100 0 70 V30 Q0 0 30 0 Z';

/** Simple proportional silhouette of the artwork area (not a product photo). */
export function ShapeThumb({ product, size = 120 }) {
  const s = product.surfaces[0] || { width: 1, height: 1 };
  const k = 74 / Math.max(s.width, s.height);
  const w = s.width * k, h = s.height * k, x = (100 - w) / 2, y = (92 - h) / 2;
  const role = product.artworkRole;
  const fill = role === 'engraving' ? 'url(#tg-metal)' : role === 'message-card' ? '#f6f7fb' : 'url(#tg-blue)';
  const shape = role === 'message-card' ? 'card' : product.previewShape;
  let el;
  if (shape === 'circle') el = <ellipse cx="50" cy="46" rx={w / 2} ry={h / 2} fill={fill} />;
  else if (shape === 'heart') el = <path d={HEART_100} transform={`translate(${x} ${y}) scale(${w / 100} ${h / 100})`} fill={fill} />;
  else if (shape === 'dogtag') el = <path d={DOGTAG} transform={`translate(${x} ${y}) scale(${w / 100} ${h / 100})`} fill={fill} />;
  else el = <rect x={x} y={y} width={w} height={h} rx={shape === 'card' ? 1 : 3} fill={fill} />;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`${s.width} by ${s.height} artwork area`}>
      <defs>
        <linearGradient id="tg-blue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3bc9ff" /><stop offset="1" stopColor="#1b4fd1" /></linearGradient>
        <linearGradient id="tg-metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f4f6f9" /><stop offset=".5" stopColor="#8e97a6" /><stop offset="1" stopColor="#dfe4ec" /></linearGradient>
      </defs>
      {el}
      {role === 'message-card' && <circle cx="50" cy="46" r={Math.min(w, h) * 0.16} fill="none" stroke="#c0a24a" strokeWidth="2" />}
      <text x="50" y="96" textAnchor="middle" fontSize="8" fill="#9aa6bd" fontFamily="Poppins, sans-serif">{s.width}×{s.height}</text>
    </svg>
  );
}

export function StatusChip({ status }) {
  const cls = status === 'VERIFIED' ? 'ok' : status === 'NEEDS VERIFICATION' ? 'warn' : 'bad';
  return <span className={`chip ${cls}`}>{status === 'VERIFIED' ? '✓ ' : '⚠ '}{status}</span>;
}

export function PartnerChip({ partner }) {
  return <span className="chip blue" title={partner === 'SPP' ? 'Produced by ShineOn\'s production partner SPP (not manufactured by ShineOn)' : 'Produced by ShineOn'}>{partner === 'SPP' ? 'SPP partner' : 'ShineOn'}</span>;
}

export function Modal({ title, onClose, children, wide }) {
  React.useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal panel" style={wide ? { width: 'min(1000px,100%)' } : null} role="dialog" aria-modal="true" aria-label={title}>
        <div className="row" style={{ marginBottom: 10 }}>
          <h3 className="grow" style={{ margin: 0 }}>{title}</h3>
          <button className="btn sm ghost" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
