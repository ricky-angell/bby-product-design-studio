# BBY Product Design Studio

A **Built By You Academy** web app for creating production-ready artwork for every artwork-accepting product in ShineOn's catalog, including products made by ShineOn's production partner **SPP**.

- **243 products, 33 categories.** Every product line in ShineOn's [Product Artwork Requirements, Templates and Prices](https://teamshineon.zendesk.com/hc/en-us/articles/32366681952017) directory is included and cross-checked against that product's own "Design and Care Advice" article.
- **Exact specifications.** Each product is designed and exported at its required pixel size, DPI, format, file-size limit and transparency rule. Nothing is guessed: missing or contradictory specs are flagged **NEEDS VERIFICATION**.
- **Runs entirely in the browser.** It's a static site on GitHub Pages with no server, no accounts, no paid APIs and no AI API keys. Student artwork never leaves the student's device.

## The 7-step workflow

1. **Select a product**: browse by category, search, and filter by production partner, artwork type or spec status.
2. **Choose the artwork type**: message card, graphic, engraving, printed, buyer-upload card, personalised name, or multiple surfaces. Only the types that apply to the product are shown.
3. **Create the artwork**: text with 16 bundled fonts, photo/AI-art upload, crop, shapes, decorations, solid/gradient/image backgrounds, layers, align, opacity, rotate, flip, undo/redo, snapping, and SVG paste. *Trace to vector* turns a photo into solid-black engraving art. Guides show the official artwork boundary, an advisory margin, the message-card jewelry zone and approximate product shapes.
4. **Bring Your Own AI**: a prompt assistant builds product-aware prompts (aspect ratio, transparency, black-only engraving, keep the card centre clear, no text). Students press **COPY PROMPT** and use their own ChatGPT / Gemini / Copilot / Claude account. BBY never calls AI services.
5. **Preview**: an illustrative product preview, always labelled *not an official ShineOn mockup*, with links to ShineOn's official mockup folders.
6. **BUILD MY PRODUCT DESIGN**: renders each surface at exact size, writes DPI metadata (PNG `pHYs` / JPEG JFIF), converts SVG text to vector outlines, then re-reads the produced bytes and validates dimensions, DPI, format, size, transparency, engraving colour and vector rules. One-click fixes are offered: optimise PNG, make all black, trace, add background.
7. **Download**: individual files, or a ZIP with `BUILD_REPORT.txt` + `build-report.json`. **My Projects → Build selected** batch-builds many designs into one ZIP.

A file is labelled **PRODUCTION-READY** only if every required check passes *and* the product's specification is VERIFIED.

## Projects and backups

Projects auto-save to the browser's IndexedDB. Students can rename, duplicate and delete projects, and export or import `.zip` backups. Browser storage is **not** synced between devices, and the app says so.

## Editing product specifications

Specs live in [`public/data/products.json`](public/data/products.json), which is fetched at runtime, so a correction goes live without rebuilding the app. To regenerate it from ShineOn's live Help Center:

```bash
npm run audit:catalog   # rewrites public/data/products.json and docs/SPEC_AUDIT.md
npm run progress        # rewrites BBY_PRODUCT_DESIGN_STUDIO_PROGRESS.md
```

## Development

```bash
npm install
npm run dev        # local dev server
npm run build      # static build in dist/
npm test           # unit + real-browser export tests (needs Chrome or Edge installed)
node tests/smoke-all.mjs   # exports every product at full size
```

The app uses React + Vite, Fabric.js (canvas editor), opentype.js (SVG text outlines), UPNG.js (PNG optimisation), ImageTracer (vectorising), JSZip and idb. Fonts are SIL OFL, bundled via Fontsource.

## Documents

- [`BBY_PRODUCT_DESIGN_STUDIO_PROGRESS.md`](BBY_PRODUCT_DESIGN_STUDIO_PROGRESS.md): per-category, per-product status
- [`docs/SPEC_AUDIT.md`](docs/SPEC_AUDIT.md): the full spec inventory and every discrepancy found in ShineOn's docs
- [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md) and [`docs/ALL_PRODUCTS_EXPORT_CHECK.md`](docs/ALL_PRODUCTS_EXPORT_CHECK.md): test results
- **Live app:** https://ricky-angell.github.io/bby-product-design-studio/
- [`docs/DEPLOYMENT_REPORT.md`](docs/DEPLOYMENT_REPORT.md) and [`docs/SKOOL_PUBLICATION_REPORT.md`](docs/SKOOL_PUBLICATION_REPORT.md)

---
Not made by or affiliated with ShineOn. Product specifications are collected from ShineOn's public Help Center. Official templates, mockups and premade designs are linked, not copied.
