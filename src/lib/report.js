import JSZip from 'jszip';
import { formatBytes } from './filemeta.js';
import { slugify } from './exporter.js';

/** Plain-text + JSON validation report for one built product. */
export function buildReport(product, variant, results, ready, projectName) {
  const rows = results.map((r) => ({
    product: product.name,
    productId: product.id,
    productionPartner: product.productionPartner,
    surface: r.surface.label,
    file: r.fileName || null,
    requiredDimensions: `${r.surface.width}x${r.surface.height}`,
    exportedDimensions: r.inspect?.ok ? `${Math.round(r.inspect.width)}x${Math.round(r.inspect.height)}` : null,
    requiredDpi: product.dpi,
    exportedDpi: r.format === 'SVG' ? 'n/a (vector)' : r.inspect?.dpi ?? null,
    format: r.format,
    fileSizeBytes: r.size ?? null,
    fileSize: r.size != null ? formatBytes(r.size) : null,
    maxFileSizeMB: product.maxFileSizeMB,
    validation: r.ok ? 'PASSED' : 'FAILED',
    checks: r.checks.map((c) => ({ check: c.label, result: c.status.toUpperCase(), detail: c.detail })),
  }));
  const json = {
    generator: 'BBY Product Design Studio', generatedAt: new Date().toISOString(), project: projectName,
    product: { id: product.id, name: product.name, category: product.category, productionPartner: product.productionPartner, specStatus: product.specStatus, lastVerified: product.lastVerified, variant: variant?.label || null, sources: product.sources },
    productionReady: ready.productionReady, notReadyReasons: ready.reasons, files: rows,
  };
  const L = [];
  L.push('BBY PRODUCT DESIGN STUDIO — BUILD REPORT', '='.repeat(44), `Project:   ${projectName}`, `Product:   ${product.name}`, `Partner:   ${product.productionPartner}${product.productionPartner === 'SPP' ? ' (produced by SPP, not ShineOn)' : ''}`, `Spec:      ${product.specStatus} (last verified ${product.lastVerified})`);
  if (variant) L.push(`Option:    ${variant.label}`);
  L.push(`Built:     ${new Date().toLocaleString()}`, '', `RESULT: ${ready.productionReady ? 'PRODUCTION-READY' : 'NOT PRODUCTION-READY'}`);
  ready.reasons.forEach((r) => L.push(`  - ${r}`));
  for (const r of rows) {
    L.push('', '-'.repeat(44), `${r.surface}: ${r.file || '(not exported)'}`, `  Dimensions: ${r.exportedDimensions || '—'} (required ${r.requiredDimensions})`, `  DPI:        ${r.exportedDpi ?? '—'} (required ${r.requiredDpi ?? 'not stated'})`, `  Format:     ${r.format}`, `  File size:  ${r.fileSize || '—'} (limit ${r.maxFileSizeMB ? `under ${r.maxFileSizeMB} MB` : 'not stated'})`, `  Validation: ${r.validation}`);
    r.checks.forEach((c) => L.push(`   [${c.result === 'PASS' ? ' OK ' : c.result === 'WARN' ? 'WARN' : 'FAIL'}] ${c.check}: ${c.detail}`));
  }
  L.push('', 'Sources:', ...product.sources.map((s) => `  ${s.title} — ${s.url}`), '', 'Previews in BBY Product Design Studio are illustrative, not official ShineOn mockups.');
  return { text: L.join('\n'), json };
}

export async function zipBuild(entries) {
  // entries: [{ folder, results, report }]
  const zip = new JSZip();
  for (const e of entries) {
    const dir = e.folder ? zip.folder(e.folder) : zip;
    for (const r of e.results) if (r.blob) dir.file(r.fileName, r.blob);
    dir.file('BUILD_REPORT.txt', e.report.text);
    dir.file('build-report.json', JSON.stringify(e.report.json, null, 2));
  }
  return zip.generateAsync({ type: 'blob', compression: 'STORE' });
}

export function zipName(name) { return `${slugify(name)}_bby-design.zip`; }
