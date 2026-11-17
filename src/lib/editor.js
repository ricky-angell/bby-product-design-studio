// StudioEditor — Fabric.js canvas wrapper. All object coordinates are in
// *artwork pixels* (the product's required width × height); the view is zoomed to fit.
import {
  Canvas, Textbox, Rect, Circle, Ellipse, Triangle, Line, Path, Polygon, FabricImage, Gradient,
  loadSVGFromString, util, Point,
} from 'fabric';
import { newAssetFromBlob, getAsset } from './assets.js';
import { DECORATIONS } from './decorations.js';

export const EXTRA_PROPS = ['assetId', 'layerName', 'isBackground', 'bgKind', 'locked', 'shapeKind', 'selectable', 'evented', 'lockMovementX', 'lockMovementY', 'lockScalingX', 'lockScalingY', 'lockRotation', 'hasControls'];
const ORIGIN = { originX: 'left', originY: 'top' };
const HISTORY_LIMIT = 60;

export function emptySurfaceJSON() { return JSON.stringify({ version: '7', objects: [] }); }

export class StudioEditor {
  constructor(el, { surface, product, onChange }) {
    this.w = surface.width; this.h = surface.height;
    this.surface = surface; this.product = product;
    this.onChange = onChange || (() => {});
    this.zoom = 1; this.showGuides = true; this.snapLines = [];
    this.undoStack = []; this.redoStack = []; this.restoring = false;
    this.canvas = new Canvas(el, { preserveObjectStacking: true, controlsAboveOverlay: true, stopContextMenu: true, fireRightClick: false, selectionColor: 'rgba(31,139,255,0.12)', selectionBorderColor: '#1f8bff' });
    this.defaultInk = product.artworkRole === 'engraving' ? '#000000' : '#1b2a4a';
    const c = this.canvas;
    const changed = () => { if (!this.restoring) { this.queueHistory(); this.emit(); } };
    c.on('object:added', changed); c.on('object:removed', changed); c.on('object:modified', changed);
    c.on('text:changed', changed);
    c.on('selection:created', () => this.emit()); c.on('selection:updated', () => this.emit()); c.on('selection:cleared', () => this.emit());
    c.on('object:moving', (e) => this.snap(e.target));
    c.on('mouse:up', () => { if (this.snapLines.length) { this.snapLines = []; c.requestRenderAll(); } });
    c.on('after:render', ({ ctx }) => this.drawGuides(ctx));
  }

  // ---------- lifecycle ----------
  async load(json) {
    this.restoring = true;
    try {
      const data = typeof json === 'string' ? JSON.parse(json) : json;
      await rehydrateAssetUrls(data.objects || []);
      await this.canvas.loadFromJSON(data);
      this.canvas.getObjects().forEach((o) => applyLockState(o));
      this.canvas.requestRenderAll();
    } finally { this.restoring = false; }
    this.undoStack = [this.snapshot()]; this.redoStack = [];
    this.emit();
  }
  dispose() { clearTimeout(this.histTimer); this.canvas.dispose(); }
  fit(cw, ch) {
    const z = Math.max(0.01, Math.min((cw - 24) / this.w, (ch - 24) / this.h));
    this.zoom = z;
    this.canvas.setDimensions({ width: Math.round(this.w * z), height: Math.round(this.h * z) });
    this.canvas.setViewportTransform([z, 0, 0, z, 0, 0]);
    this.canvas.requestRenderAll();
  }
  snapshot() { return JSON.stringify(this.canvas.toObject(EXTRA_PROPS)); }
  toJSON() { return this.snapshot(); }

  // ---------- history ----------
  queueHistory() {
    clearTimeout(this.histTimer);
    this.histTimer = setTimeout(() => {
      const s = this.snapshot();
      if (this.undoStack.at(-1) === s) return;
      this.undoStack.push(s); if (this.undoStack.length > HISTORY_LIMIT) this.undoStack.shift();
      this.redoStack = [];
      this.emit();
    }, 250);
  }
  get canUndo() { return this.undoStack.length > 1; }
  get canRedo() { return this.redoStack.length > 0; }
  async undo() {
    clearTimeout(this.histTimer);
    if (!this.canUndo) return;
    this.redoStack.push(this.undoStack.pop());
    await this.restore(this.undoStack.at(-1));
  }
  async redo() {
    if (!this.canRedo) return;
    const s = this.redoStack.pop(); this.undoStack.push(s);
    await this.restore(s);
  }
  async restore(s) {
    this.restoring = true;
    try { await this.canvas.loadFromJSON(JSON.parse(s)); this.canvas.getObjects().forEach(applyLockState); this.canvas.requestRenderAll(); }
    finally { this.restoring = false; }
    this.emit();
  }

  emit() { this.onChange(this.state()); }
  state() {
    const c = this.canvas;
    const active = c.getActiveObject();
    return {
      canUndo: this.canUndo, canRedo: this.canRedo,
      selection: active ? describe(active) : null,
      selectionCount: c.getActiveObjects().length,
      layers: c.getObjects().map((o, i) => ({ index: i, name: layerName(o), type: o.type, visible: o.visible !== false, locked: !!o.locked, isBackground: !!o.isBackground, active: c.getActiveObjects().includes(o) })).reverse(),
      objectCount: c.getObjects().length,
    };
  }
  commit() { this.canvas.requestRenderAll(); this.queueHistory(); this.emit(); }

  // ---------- adding content ----------
  center(obj) {
    obj.setCoords();
    const br = obj.getBoundingRect();
    obj.set({ left: obj.left + (this.w / 2 - (br.left + br.width / 2)), top: obj.top + (this.h / 2 - (br.top + br.height / 2)) });
    obj.setCoords();
  }
  add(obj, { select = true, centerIt = true } = {}) {
    if (centerIt) this.center(obj);
    this.canvas.add(obj);
    this.keepBackgroundAtBottom();
    if (select) this.canvas.setActiveObject(obj);
    this.canvas.requestRenderAll();
    return obj;
  }
  addText(text = 'Your text here', opts = {}) {
    const fontSize = Math.round(Math.min(this.w, this.h) * 0.08);
    const t = new Textbox(text, {
      ...ORIGIN, left: 0, top: 0, width: Math.round(this.w * 0.7), fontSize, fontFamily: 'Playfair Display',
      fill: this.defaultInk, textAlign: 'center', lineHeight: 1.15, layerName: 'Text', splitByGrapheme: false, ...opts,
    });
    return this.add(t);
  }
  addShape(kind) {
    const s = Math.min(this.w, this.h) * 0.3;
    const fill = this.product.artworkRole === 'engraving' ? '#000000' : '#1f8bff';
    let o;
    const base = { ...ORIGIN, left: 0, top: 0, fill, shapeKind: kind };
    switch (kind) {
      case 'rect': o = new Rect({ ...base, width: s * 1.4, height: s }); break;
      case 'rounded': o = new Rect({ ...base, width: s * 1.4, height: s, rx: s * 0.15, ry: s * 0.15 }); break;
      case 'circle': o = new Circle({ ...base, radius: s / 2 }); break;
      case 'ellipse': o = new Ellipse({ ...base, rx: s * 0.7, ry: s * 0.45 }); break;
      case 'triangle': o = new Triangle({ ...base, width: s, height: s * 0.87 }); break;
      case 'line': o = new Line([0, 0, s * 1.5, 0], { ...base, fill: undefined, stroke: fill, strokeWidth: Math.max(2, s * 0.03) }); break;
      case 'frame': o = new Rect({ ...base, width: this.w * 0.86, height: this.h * 0.86, fill: '', stroke: fill, strokeWidth: Math.max(2, Math.min(this.w, this.h) * 0.012), rx: 0, ry: 0 }); break;
      case 'star': o = new Polygon(starPoints(5, s / 2, s / 4.6), { ...base }); break;
      default: return null;
    }
    o.layerName = kind[0].toUpperCase() + kind.slice(1);
    return this.add(o);
  }
  async addDecoration(id) {
    const d = DECORATIONS.find((x) => x.id === id);
    if (!d) return null;
    const p = new Path(d.path, { ...ORIGIN, left: 0, top: 0, fill: this.product.artworkRole === 'engraving' ? '#000000' : d.color || '#c0c7d2', shapeKind: 'decoration', layerName: d.label });
    const target = Math.min(this.w, this.h) * (d.scale || 0.3);
    p.scale(target / Math.max(p.width, p.height));
    return this.add(p);
  }
  async addImageFile(file, { asBackground = false } = {}) {
    if (/svg/i.test(file.type) || /\.svg$/i.test(file.name)) return this.addSvgString(await file.text(), file.name.replace(/\.svg$/i, ''));
    const asset = await newAssetFromBlob(file, file.name);
    return this.addImageAsset(asset, { asBackground });
  }
  async addImageAsset(asset, { asBackground = false } = {}) {
    const img = await FabricImage.fromURL(asset.url);
    img.set({ ...ORIGIN, left: 0, top: 0, assetId: asset.id, layerName: asset.name || 'Image' });
    const nat = { w: img.width, h: img.height };
    const k = asBackground ? Math.max(this.w / nat.w, this.h / nat.h) : Math.min((this.w * 0.8) / nat.w, (this.h * 0.8) / nat.h);
    img.scale(k);
    this.add(img);
    if (asBackground) this.makeImageBackground(img);
    return img;
  }
  async addSvgString(svgText, name = 'Vector art') {
    const clean = sanitizeSvg(svgText);
    const { objects, options } = await loadSVGFromString(clean);
    const objs = objects.filter(Boolean);
    if (!objs.length) throw new Error('No drawable shapes were found in that SVG.');
    const g = util.groupSVGElements(objs, options);
    g.set({ ...ORIGIN, layerName: name, shapeKind: 'svg' });
    const k = Math.min((this.w * 0.8) / g.width, (this.h * 0.8) / g.height);
    g.scale(k);
    return this.add(g);
  }

  // ---------- background ----------
  getBackground() { return this.canvas.getObjects().find((o) => o.isBackground); }
  setBackground({ kind, color, color2, angle = 90 }) {
    let bg = this.getBackground();
    if (kind === 'none') { if (bg) this.canvas.remove(bg); this.commit(); return; }
    if (!bg) {
      bg = new Rect({ ...ORIGIN, left: 0, top: 0, width: this.w, height: this.h, isBackground: true, layerName: 'Background', selectable: false, evented: false, locked: true, strokeWidth: 0 });
      this.canvas.add(bg);
    }
    bg.set({ width: this.w, height: this.h, left: 0, top: 0, bgKind: kind });
    if (kind === 'gradient') {
      const rad = (angle * Math.PI) / 180;
      const cx = this.w / 2, cy = this.h / 2, len = Math.abs(this.w * Math.sin(rad)) / 2 + Math.abs(this.h * Math.cos(rad)) / 2;
      // CSS convention: 0° = towards top, 90° = towards right, 180° = towards bottom (first colour at the start)
      const dx = Math.sin(rad), dy = -Math.cos(rad);
      bg.set('fill', new Gradient({ type: 'linear', gradientUnits: 'pixels', coords: { x1: cx - dx * len, y1: cy - dy * len, x2: cx + dx * len, y2: cy + dy * len }, colorStops: [{ offset: 0, color }, { offset: 1, color: color2 }] }));
    } else bg.set('fill', color);
    this.keepBackgroundAtBottom();
    this.commit();
  }
  keepBackgroundAtBottom() {
    const bg = this.getBackground();
    if (bg && this.canvas.getObjects().indexOf(bg) !== 0) this.canvas.moveObjectTo(bg, 0);
  }
  makeImageBackground(img) {
    img = img || this.canvas.getActiveObject();
    if (!img || img.type !== 'image') return;
    const k = Math.max(this.w / (img.width), this.h / (img.height));
    img.set({ scaleX: k, scaleY: k, angle: 0 });
    this.center(img);
    const bg = this.getBackground();
    this.canvas.moveObjectTo(img, bg ? 1 : 0);
    img.set({ layerName: 'Background image' });
    this.commit();
  }

  // ---------- selection helpers ----------
  active() { return this.canvas.getActiveObject(); }
  set(props) {
    const objs = this.canvas.getActiveObjects();
    if (!objs.length) return;
    for (const o of objs) {
      o.set(props);
      if (o.type === 'textbox' && ('fontFamily' in props || 'fontWeight' in props || 'fontStyle' in props || 'fontSize' in props || 'charSpacing' in props)) o.initDimensions?.();
      o.setCoords();
    }
    this.commit();
  }
  async duplicate() {
    const o = this.active(); if (!o) return;
    const objs = this.canvas.getActiveObjects();
    this.canvas.discardActiveObject();
    const clones = [];
    for (const x of objs) {
      const cl = await x.clone(EXTRA_PROPS);
      cl.set({ left: x.left + this.w * 0.03, top: x.top + this.h * 0.03 });
      this.canvas.add(cl); clones.push(cl);
    }
    if (clones.length === 1) this.canvas.setActiveObject(clones[0]);
    this.commit();
  }
  remove() {
    const objs = this.canvas.getActiveObjects();
    this.canvas.discardActiveObject();
    objs.forEach((o) => this.canvas.remove(o));
    this.commit();
  }
  selectLayer(index) {
    const o = this.canvas.getObjects()[index];
    if (!o || o.locked) return;
    this.canvas.setActiveObject(o); this.canvas.requestRenderAll(); this.emit();
  }
  layerOp(index, op) {
    const c = this.canvas; const o = c.getObjects()[index]; if (!o) return;
    if (op === 'up') c.bringObjectForward(o);
    if (op === 'down') c.sendObjectBackwards(o);
    if (op === 'front') c.bringObjectToFront(o);
    if (op === 'back') c.sendObjectToBack(o);
    if (op === 'toggleVisible') o.set('visible', o.visible === false);
    if (op === 'toggleLock') { o.locked = !o.locked; applyLockState(o); if (o.locked) c.discardActiveObject(); }
    if (op === 'delete') c.remove(o);
    this.keepBackgroundAtBottom();
    this.commit();
  }
  renameLayer(index, name) { const o = this.canvas.getObjects()[index]; if (o) { o.layerName = name; this.commit(); } }
  align(mode) {
    const o = this.active(); if (!o) return;
    const br = o.getBoundingRect();
    let dx = 0, dy = 0;
    if (mode === 'left') dx = -br.left;
    if (mode === 'hcenter') dx = this.w / 2 - (br.left + br.width / 2);
    if (mode === 'right') dx = this.w - (br.left + br.width);
    if (mode === 'top') dy = -br.top;
    if (mode === 'vcenter') dy = this.h / 2 - (br.top + br.height / 2);
    if (mode === 'bottom') dy = this.h - (br.top + br.height);
    o.set({ left: o.left + dx, top: o.top + dy }); o.setCoords();
    this.commit();
  }
  fitSelection(mode) {
    const o = this.active(); if (!o) return;
    o.set({ angle: 0 });
    const k = mode === 'fill' ? Math.max(this.w / o.width, this.h / o.height) : Math.min(this.w / o.width, this.h / o.height);
    o.set({ scaleX: k, scaleY: k }); this.center(o);
    this.commit();
  }
  /** Crop an image by fractions of its natural size, keeping the visible content in place. */
  crop(img, { l, t, r, b }) {
    if (!img || img.type !== 'image') return;
    const el = img.getElement();
    const nw = el.naturalWidth || el.width, nh = el.naturalHeight || el.height;
    const ncx = Math.round(nw * l), ncy = Math.round(nh * t);
    const nwid = Math.max(1, Math.round(nw * (1 - l - r))), nhei = Math.max(1, Math.round(nh * (1 - t - b)));
    const dx = (ncx - (img.cropX || 0)) * img.scaleX * (img.flipX ? -1 : 1);
    const dy = (ncy - (img.cropY || 0)) * img.scaleY * (img.flipY ? -1 : 1);
    const v = util.rotateVector(new Point(dx, dy), util.degreesToRadians(img.angle || 0));
    img.set({ cropX: ncx, cropY: ncy, width: nwid, height: nhei, left: img.left + v.x, top: img.top + v.y });
    img.setCoords();
    this.commit();
  }
  cropFractions(img) {
    const el = img.getElement();
    const nw = el.naturalWidth || el.width, nh = el.naturalHeight || el.height;
    return { l: (img.cropX || 0) / nw, t: (img.cropY || 0) / nh, r: 1 - ((img.cropX || 0) + img.width) / nw, b: 1 - ((img.cropY || 0) + img.height) / nh };
  }
  /** Make every element pure black (engraving fix). */
  makeAllBlack() {
    for (const o of this.canvas.getObjects()) {
      if (o.isBackground) { this.canvas.remove(o); continue; }
      const paint = (x) => {
        if (x.type === 'group') { x.getObjects().forEach(paint); return; }
        if (x.fill && x.fill !== 'none' && x.fill !== '') x.set('fill', '#000000');
        if (x.stroke && x.strokeWidth > 0) x.set('stroke', '#000000');
        x.set('opacity', 1);
      };
      paint(o);
    }
    this.commit();
  }

  // ---------- trace raster -> black vector (for engraving) ----------
  async traceToVector(img, { threshold = 128, detail = 'normal' } = {}) {
    if (!img || img.type !== 'image') throw new Error('Select an image to trace.');
    const { default: ImageTracer } = await import('imagetracerjs');
    const el = img.getElement();
    const maxSide = 1200;
    const nw = img.width, nh = img.height;
    const k = Math.min(1, maxSide / Math.max(nw, nh));
    const cw = Math.max(1, Math.round(nw * k)), ch = Math.max(1, Math.round(nh * k));
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(el, img.cropX || 0, img.cropY || 0, nw, nh, 0, 0, cw, ch);
    const id = ctx.getImageData(0, 0, cw, ch);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const v = d[i + 3] < 128 ? 255 : lum < threshold ? 0 : 255;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
    const svg = ImageTracer.imagedataToSVG(id, {
      colorsampling: 0, numberofcolors: 2, pal: [{ r: 0, g: 0, b: 0, a: 255 }, { r: 255, g: 255, b: 255, a: 255 }],
      ltres: detail === 'fine' ? 0.5 : 1, qtres: detail === 'fine' ? 0.5 : 1, pathomit: detail === 'fine' ? 4 : 10, linefilter: true, strokewidth: 0, roundcoords: 1, viewbox: true,
    });
    const { objects } = await loadSVGFromString(svg);
    const black = objects.filter(Boolean).filter((o) => /^(rgb\(0,0,0\)|#000000|black)$/i.test(String(o.fill).replace(/\s/g, '')));
    if (!black.length) throw new Error('Nothing dark enough to trace. Try a higher threshold.');
    black.forEach((o) => o.set({ fill: '#000000', stroke: null, strokeWidth: 0 }));
    const g = util.groupSVGElements(black, { width: cw, height: ch });
    // place over the original image
    const br = img.getBoundingRect();
    g.set({ ...ORIGIN, layerName: `${layerName(img)} (traced)`, shapeKind: 'svg' });
    g.scale(Math.min(br.width / cw, br.height / ch) * (cw / g.width));
    g.setCoords();
    const gb = g.getBoundingRect();
    g.set({ left: g.left + (br.left + br.width / 2 - (gb.left + gb.width / 2)), top: g.top + (br.top + br.height / 2 - (gb.top + gb.height / 2)), angle: 0 });
    const idx = this.canvas.getObjects().indexOf(img);
    this.canvas.remove(img);
    this.canvas.insertAt(idx, g);
    this.canvas.setActiveObject(g);
    this.commit();
    return g;
  }

  // ---------- guides ----------
  snap(o) {
    const tol = 8 / this.zoom;
    const br = o.getBoundingRect();
    const cx = br.left + br.width / 2, cy = br.top + br.height / 2;
    this.snapLines = [];
    if (Math.abs(cx - this.w / 2) < tol) { o.set({ left: o.left + (this.w / 2 - cx) }); this.snapLines.push({ x: this.w / 2 }); }
    if (Math.abs(cy - this.h / 2) < tol) { o.set({ top: o.top + (this.h / 2 - cy) }); this.snapLines.push({ y: this.h / 2 }); }
  }
  setGuides(on) { this.showGuides = on; this.canvas.requestRenderAll(); }
  drawGuides(ctx) {
    if (!this.showGuides && !this.snapLines.length) return;
    const z = this.zoom; const w = this.w, h = this.h;
    ctx.save();
    ctx.setTransform(z * (ctx.canvas.width / this.canvas.getWidth()), 0, 0, z * (ctx.canvas.height / this.canvas.getHeight()), 0, 0);
    const px = 1 / z;
    for (const l of this.snapLines) {
      ctx.strokeStyle = '#ff2d95'; ctx.lineWidth = px; ctx.beginPath();
      if (l.x != null) { ctx.moveTo(l.x, 0); ctx.lineTo(l.x, h); } else { ctx.moveTo(0, l.y); ctx.lineTo(w, l.y); }
      ctx.stroke();
    }
    if (this.showGuides) {
      for (const g of guideSpecs(this.product, this.surface)) {
        ctx.setLineDash(g.dash ? [6 * px, 4 * px] : []);
        ctx.strokeStyle = g.color; ctx.lineWidth = (g.width || 1.5) * px;
        ctx.beginPath();
        if (g.kind === 'rect') ctx.rect(g.x * w, g.y * h, g.w * w, g.h * h);
        if (g.kind === 'ellipse') ctx.ellipse(g.cx * w, g.cy * h, g.rx * w, g.ry * h, 0, 0, Math.PI * 2);
        if (g.kind === 'path') { ctx.save(); ctx.translate(g.x * w, g.y * h); ctx.scale(g.w * w / 100, g.h * h / 100); ctx.lineWidth = (g.width || 1.5) * px / (g.w * w / 100); ctx.stroke(new Path2D(g.d)); ctx.restore(); }
        ctx.stroke();
        if (g.label) {
          ctx.setLineDash([]);
          const fs = 11 * px; ctx.font = `600 ${fs}px Poppins, sans-serif`;
          const tx = (g.lx ?? g.x ?? (g.cx - g.rx)) * w + 4 * px, ty = (g.ly ?? g.y ?? (g.cy - g.ry)) * h + 14 * px;
          const tw = ctx.measureText(g.label).width;
          ctx.fillStyle = 'rgba(8,16,38,0.78)'; ctx.fillRect(tx - 3 * px, ty - fs, tw + 6 * px, fs * 1.35);
          ctx.fillStyle = g.color; ctx.fillText(g.label, tx, ty);
        }
      }
    }
    ctx.restore();
  }
}

/** Guide definitions in fractions of the artboard. Only the artboard edge is official. */
export function guideSpecs(product, surface) {
  const g = [{ kind: 'rect', x: 0, y: 0, w: 1, h: 1, color: '#1f8bff', width: 2, label: `Artwork boundary ${surface.width}×${surface.height}px (official)` }];
  const m = 0.05;
  g.push({ kind: 'rect', x: m, y: m, w: 1 - 2 * m, h: 1 - 2 * m, color: '#c0c7d2', dash: true, label: 'Advisory safe margin — not an official value; check the ShineOn template', lx: m, ly: m + 0.0 });
  if (product.artworkRole === 'message-card') g.push({ kind: 'ellipse', cx: 0.5, cy: 0.5, rx: 0.2, ry: 0.2, color: '#ffb547', dash: true, label: 'Jewelry sits around here (approximate)' });
  const shape = product.previewShape;
  if (product.artworkRole === 'graphic' || product.artworkRole === 'engraving') {
    if (shape === 'circle') g.push({ kind: 'ellipse', cx: 0.5, cy: 0.5, rx: 0.5, ry: 0.5, color: '#7ee0ff', dash: true, label: 'Approximate product shape (illustrative)', lx: 0.06, ly: 0.9 });
    if (shape === 'heart') g.push({ kind: 'path', d: HEART_100, x: 0, y: 0, w: 1, h: 1, color: '#7ee0ff', dash: true, label: 'Approximate product shape (illustrative)', lx: 0.06, ly: 0.9 });
    if (shape === 'dogtag') g.push({ kind: 'path', d: 'M30 0 H70 Q100 0 100 30 V70 Q100 100 70 100 H30 Q0 100 0 70 V30 Q0 0 30 0 Z', x: 0, y: 0, w: 1, h: 1, color: '#7ee0ff', dash: true, label: 'Approximate product shape (illustrative)', lx: 0.06, ly: 0.9 });
  }
  if (product.artworkRole === 'engraving') g.push({ kind: 'rect', x: 0, y: 0, w: 0, h: 0, color: '#9fe870', label: 'Engraving: solid black artwork only', lx: 0.06, ly: 0.06 + 0.04 });
  return g;
}
export const HEART_100 = 'M50 96 C22 74 0 56 0 30 C0 13 13 0 29 0 C39 0 46 5 50 13 C54 5 61 0 71 0 C87 0 100 13 100 30 C100 56 78 74 50 96 Z';

function starPoints(n, R, r) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (Math.PI / n) * i - Math.PI / 2; const rad = i % 2 ? r : R;
    pts.push({ x: R + rad * Math.cos(a), y: R + rad * Math.sin(a) });
  }
  return pts;
}

export function layerName(o) {
  if (o.layerName) return o.layerName;
  if (o.type === 'textbox' || o.type === 'i-text' || o.type === 'text') return `Text: ${(o.text || '').slice(0, 18)}`;
  return o.type[0].toUpperCase() + o.type.slice(1);
}

function describe(o) {
  const base = { type: o.type, name: layerName(o), opacity: o.opacity ?? 1, angle: Math.round(o.angle || 0), flipX: !!o.flipX, flipY: !!o.flipY, locked: !!o.locked };
  if (o.type === 'activeselection') return { ...base, type: 'multiple' };
  if (o.type === 'textbox') Object.assign(base, { text: o.text, fontFamily: o.fontFamily, fontSize: Math.round(o.fontSize * (o.scaleY || 1)), rawFontSize: o.fontSize, fill: typeof o.fill === 'string' ? o.fill : '#000000', fontWeight: o.fontWeight, fontStyle: o.fontStyle, textAlign: o.textAlign, charSpacing: o.charSpacing || 0, lineHeight: o.lineHeight, stroke: o.stroke || '#ffffff', strokeWidth: o.strokeWidth || 0, underline: !!o.underline });
  if (o.type === 'image') {
    const el = o.getElement();
    Object.assign(base, { naturalWidth: el.naturalWidth || el.width, naturalHeight: el.naturalHeight || el.height, displayW: Math.round(o.getScaledWidth()), displayH: Math.round(o.getScaledHeight()), scale: o.scaleX });
  }
  if (['rect', 'circle', 'ellipse', 'triangle', 'polygon', 'path', 'line', 'group'].includes(o.type)) Object.assign(base, { fill: typeof o.fill === 'string' ? o.fill : '', stroke: o.stroke || '', strokeWidth: o.strokeWidth || 0, rx: o.rx || 0, shapeKind: o.shapeKind, width: o.width });
  return base;
}

export function applyLockState(o) {
  const locked = !!o.locked || !!o.isBackground;
  o.set({ selectable: !locked, evented: !locked, lockMovementX: locked, lockMovementY: locked, hasControls: !locked });
}

async function rehydrateAssetUrls(objects) {
  for (const o of objects) {
    if (o.assetId) { const a = await getAsset(o.assetId); if (a) o.src = a.url; }
    if (o.objects) await rehydrateAssetUrls(o.objects);
  }
}

/** Remove scripts, event handlers, external references and foreignObject from user SVG. */
export function sanitizeSvg(text) {
  if (typeof DOMParser === 'undefined') return text;
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  if (doc.querySelector('parsererror')) throw new Error('That is not valid SVG code.');
  doc.querySelectorAll('script,foreignObject,iframe,object,embed').forEach((n) => n.remove());
  doc.querySelectorAll('*').forEach((n) => {
    for (const a of [...n.attributes]) {
      if (/^on/i.test(a.name)) n.removeAttribute(a.name);
      if (/href$/i.test(a.name) && !/^(#|data:image\/(png|jpe?g|gif|webp);)/i.test(a.value)) n.removeAttribute(a.name);
    }
  });
  return new XMLSerializer().serializeToString(doc);
}
