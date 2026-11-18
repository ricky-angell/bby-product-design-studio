# Deployment Report

| Item | Value |
|---|---|
| Live app | https://ricky-angell.github.io/bby-product-design-studio/ |
| Repository | https://github.com/ricky-angell/bby-product-design-studio (public) |
| Hosting | GitHub Pages, "deploy from branch" `gh-pages` (free; no paid hosting or subscriptions) |
| Source branch | `main` |
| Deployed | 2026-11-17 |

## How to deploy

```bash
npm run deploy   # builds the app and force-pushes dist/ to the gh-pages branch
```

This is the same branch-based Pages setup as your existing BBY apps. A GitHub Actions workflow wasn't used because the GitHub CLI login doesn't include the `workflow` permission. Run `gh auth refresh -s workflow` if you want Actions later.

## Live verification (2026-11-17, `tests/live-check.mjs`, real Chrome)

| Check | Desktop 1440×900 | Mobile 390×844 |
|---|---|---|
| Page and `data/products.json` return HTTP 200 | ✅ | ✅ |
| Catalog shows all 243 products | ✅ | ✅ |
| Open product → design → **BUILD MY PRODUCT DESIGN** | ✅ PRODUCTION-READY, 1000×1000 PNG at 300 DPI | ✅ same |
| Bundled fonts load | ✅ | ✅ |
| No horizontal overflow | ✅ 0px | ✅ 0px |
| No page errors | ✅ | ✅ |
| Hosts contacted | only `ricky-angell.github.io` | only `ricky-angell.github.io` |

## Update 2026-11-18: product-specific previews (commit 1294006)

The generic drawn previews were replaced with official-ShineOn-mockup previews (see `docs/PREVIEW_ACCURACY_REPORT.md` and `docs/MOCKUP_ASSETS.md`). The update was redeployed with `npm run deploy` and verified on the live site with `tests/live-check.mjs` in real Chrome.

| Check | Desktop | Mobile |
|---|---|---|
| All 243 catalog cards show the "product image not installed" placeholder; drawn stand-in shapes | ✅ 243 / 0 | ✅ 243 / 0 |
| `mockups/manifest.json`: published kits / ShineOn permission | 0 / not granted | 0 / not granted |
| Preview tab without an installed mockup | "Exact product preview needs an approved ShineOn mockup" | same |
| Build still PRODUCTION-READY; fonts; overflow; page errors | ✅ / ✅ / 0px / none | ✅ / ✅ / 0px / none |
| Hosts contacted | only `ricky-angell.github.io` | same |
| Installing an official PSD on the live site (Graphic Circle Bangle 3.psd, 8 MB) | ✅ 3.0 s, rendering + placement verified, **no upload requests** | — |

No ShineOn imagery is deployed: ShineOn's Terms of Service license mockups to each seller as non-transferable. Publishing them for every student requires ShineOn's written permission (`node tools/publish-mockup-pack.mjs … --permission …`).

## Privacy and student data

- The site is static. Student projects and artwork are stored only in each student's browser (IndexedDB) and are never uploaded.
- The repository contains no student artwork. `.gitignore` excludes test outputs and `*.bby-backup.zip`. Screenshots in `docs/screenshots/` show synthetic test designs only.
- No AI, image-generation or analytics services are called.

## Updating product specs

Edit `public/data/products.json`, or run `npm run audit:catalog` to re-read ShineOn's Help Center. Then run `npm run deploy`. No code changes are needed.
