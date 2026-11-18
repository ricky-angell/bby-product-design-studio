import React from 'react';
import { subscribeMockups, mockupsVersion, kitsForProduct, thumbUrl } from '../lib/mockups.js';

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

/** Subscribes a component to the installed/published mockup-kit index. */
export function useMockups() {
  return React.useSyncExternalStore(subscribeMockups, mockupsVersion);
}

/**
 * Product thumbnail: ShineOn's own product image from an installed official mockup kit, or a
 * plain placeholder that says an approved image is needed. Never a drawn stand-in shape.
 */
export function ProductThumb({ product, size = 140, variant = null }) {
  useMockups();
  const kits = kitsForProduct(product.id);
  const pick = kits.find((k) => variant && k.kit.variant === variant) || [...kits].sort((a, b) => (b.kit.overlayPixels > 0) - (a.kit.overlayPixels > 0))[0];
  const s = product.surfaces[0] || { width: 0, height: 0 };
  if (pick?.kit.thumb) {
    return (
      <figure className="pthumb" style={{ width: size, height: size }} data-thumb="official" data-kit-id={pick.kit.id}>
        <img src={thumbUrl(pick)} alt={`${product.name} — official ShineOn product image`} loading="lazy" />
        {size >= 90 && <figcaption>ShineOn image</figcaption>}
      </figure>
    );
  }
  if (size < 90) {
    return <div className="pthumb placeholder" style={{ width: size, height: size }} data-thumb="placeholder" title="No approved ShineOn product image is installed for this product"><span className="ph-sub">No image</span></div>;
  }
  return (
    <div className="pthumb placeholder" style={{ width: size, height: size }} data-thumb="placeholder" title="No approved ShineOn product image is installed for this product">
      <span className="ph-title">Product image not installed</span>
      <span className="ph-sub">Exact preview needs an approved ShineOn mockup</span>
      <span className="ph-size">Artwork {s.width}×{s.height} px</span>
    </div>
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
