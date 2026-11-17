# BBY Product Design Studio — Test Report

Run: 2026-11-17T23:31:30.983Z  
Browser: C:/Program Files/Google/Chrome/Application/chrome.exe  
Build: production (`vite build`) served by `vite preview`  
Result: **144/144 checks passed**

Exports are produced by the real application code in the browser, returned as bytes and verified in Node with independent decoders (UPNG pixel decode, a separate PNG chunk/CRC reader and JPEG marker parser). Exported files from the last run are in `tests/output/` (git-ignored) and screenshots in `docs/screenshots/`.


## Product database

| Result | Check | Detail |
|---|---|---|
| ✅ PASS | Database loads with products | 243 products, 33 categories |
| ✅ PASS | Every product has a production partner (ShineOn or SPP) | 134 ShineOn / 109 SPP |
| ✅ PASS | Every product has ≥1 surface with positive integer dimensions |  |
| ✅ PASS | Every product has a format |  |
| ✅ PASS | Every product has a status of VERIFIED or NEEDS VERIFICATION |  |
| ✅ PASS | Every NEEDS VERIFICATION product explains why |  |
| ✅ PASS | Every product cites the requirements article as a source |  |
| ✅ PASS | Every product has a last-verified date |  |
| ✅ PASS | Unique product ids |  |
| ✅ PASS | Not all products are 1000×1000 | 113 distinct sizes |
| ✅ PASS | Spec: Alluring Beauty Necklace with Rotating Rose Box = 650×602 | 650×602 |
| ✅ PASS | Spec: Alluring Beauty Necklace with Red Heart Rose Box = 780×780 | 780×780 |
| ✅ PASS | Spec: Open Work Watch with MC = 1000×1077 | 1000×1077 |
| ✅ PASS | Spec: Graphic Circle Keychain = 2000×2000 | 2000×2000 |
| ✅ PASS | Spec: Graphic Heart Keychain = 2000×1959 | 2000×1959 |
| ✅ PASS | Spec: Endless Love Necklace = 1000×1000 | 1000×1000 |
| ✅ PASS | Spec: Engraved Metal Wallet = 1300×946 | 1300×946 |
| ✅ PASS | Engraved Metal Wallet has front 1300×946 and back 898×448 |  |
| ✅ PASS | SPP products are never labelled ShineOn-made |  |
| ✅ PASS | All 32 ShineOn/SPP requirement sections are represented (33 incl. both Posters sections) | 33 category/partner groups |

## File metadata helpers

| Result | Check | Detail |
|---|---|---|
| ✅ PASS | setPngDpi writes 300 DPI pHYs before IDAT with valid CRCs | {"dpi":300,"crc":true} |
| ✅ PASS | setPngDpi replaces an existing pHYs (no duplicates) |  |
| ✅ PASS | inspectFile reads PNG dims/DPI |  |
| ✅ PASS | setJpegDpi sets JFIF density to 150 DPI | {"soi":true,"eoi":true,"jfif":true,"units":1,"xd":150,"yd":150,"h":20,"w":30,"components":1} |
| ✅ PASS | inspectSvgText reads width/height/viewBox and paint colours |  |

## Export: 1000×1000 pendant message card (Endless Love Necklace)

| Result | Check | Detail |
|---|---|---|
| ✅ PASS | endless-love-necklace_1000x1000_300dpi.png: valid PNG (signature + all CRCs) |  |
| ✅ PASS | endless-love-necklace_1000x1000_300dpi.png: exactly 1000×1000px | 1000×1000 |
| ✅ PASS | endless-love-necklace_1000x1000_300dpi.png: 300 DPI metadata | pHYs=300 |
| ✅ PASS | endless-love-necklace_1000x1000_300dpi.png: under 5 MB | 0.05 MB |
| ✅ PASS | Image positioning: black square at (100..300) lands at pixel (200,200) | 0,0,0,255 |
| ✅ PASS | Image positioning: red rect at (700,650) lands at pixel (775,700) | 255,0,0,255 |
| ✅ PASS | Background white outside elements (pixel 500,500 under jewelry zone) |  |
| ✅ PASS | Text positioning: script text rendered in the box it was placed (y≥820) | 4843 dark text pixels |
| ✅ PASS | In-app validation passed and product is PRODUCTION-READY (verified spec) |  |

## Export: 650×602 Rotating Rose Box card with transparency

| Result | Check | Detail |
|---|---|---|
| ✅ PASS | alluring-beauty-necklace-with-rotating-rose-box_650x602_300dpi.png: valid PNG (signature + all CRCs) |  |
| ✅ PASS | alluring-beauty-necklace-with-rotating-rose-box_650x602_300dpi.png: exactly 650×602px | 650×602 |
| ✅ PASS | alluring-beauty-necklace-with-rotating-rose-box_650x602_300dpi.png: 300 DPI metadata | pHYs=300 |
| ✅ PASS | alluring-beauty-necklace-with-rotating-rose-box_650x602_300dpi.png: under 5 MB | 0.02 MB |
| ✅ PASS | Transparency preserved (RGBA PNG, corner pixel alpha 0) | colorType 6, corner alpha 0 |
| ✅ PASS | Centre pixel opaque (heart drawn) |  |
| ✅ PASS | Validation passed |  |

## Export: 780×780 Red Heart Rose Box card

| Result | Check | Detail |
|---|---|---|
| ✅ PASS | love-knot-necklace-with-red-heart-rose-box_780x780_300dpi.png: valid PNG (signature + all CRCs) |  |
| ✅ PASS | love-knot-necklace-with-red-heart-rose-box_780x780_300dpi.png: exactly 780×780px | 780×780 |
| ✅ PASS | love-knot-necklace-with-red-heart-rose-box_780x780_300dpi.png: 300 DPI metadata | pHYs=300 |
| ✅ PASS | love-knot-necklace-with-red-heart-rose-box_780x780_300dpi.png: under 5 MB | 0.08 MB |
| ✅ PASS | Gradient background rendered (top pinker than bottom) | 255,227,234,255 vs 255,255,255,255 |
| ✅ PASS | Validation passed and PRODUCTION-READY |  |

## Export: 1000×1077 watch message card (Open Work Watch with MC)

| Result | Check | Detail |
|---|---|---|
| ✅ PASS | open-work-watch-with-mc_1000x1077_300dpi.png: valid PNG (signature + all CRCs) |  |
| ✅ PASS | open-work-watch-with-mc_1000x1077_300dpi.png: exactly 1000×1077px | 1000×1077 |
| ✅ PASS | open-work-watch-with-mc_1000x1077_300dpi.png: 300 DPI metadata | pHYs=300 |
| ✅ PASS | open-work-watch-with-mc_1000x1077_300dpi.png: under 5 MB | 0.04 MB |
| ✅ PASS | File checks pass |  |
| ✅ PASS | NOT marked production-ready because spec NEEDS VERIFICATION (no advice article) | This product's ShineOn specification NEEDS VERIFICATION (see the spec sheet). Confirm it in the ShineOn product editor before uploading. |

## Export: 2000×2000 graphic circle keychain with uploaded photo

| Result | Check | Detail |
|---|---|---|
| ✅ PASS | graphic-circle-keychain_2000x2000_300dpi.png: valid PNG (signature + all CRCs) |  |
| ✅ PASS | graphic-circle-keychain_2000x2000_300dpi.png: exactly 2000×2000px | 2000×2000 |
| ✅ PASS | graphic-circle-keychain_2000x2000_300dpi.png: 300 DPI metadata | pHYs=300 |
| ✅ PASS | graphic-circle-keychain_2000x2000_300dpi.png: under 5 MB | 1.71 MB |
| ✅ PASS | Uploaded photo fills the artwork (corner pixel opaque, not white) |  |
| ✅ PASS | Upscale warning raised for 1600×1200 photo filled to 2000×2000 (scale 1.67) | This image is enlarged 1.7× beyond its original pixels (effective ≈180 DPI). It may print soft. Use a larger original if you can. |
| ✅ PASS | Validation passed |  |

## Export: 2000×1959 graphic heart keychain

| Result | Check | Detail |
|---|---|---|
| ✅ PASS | graphic-heart-keychain_2000x1959_300dpi.png: valid PNG (signature + all CRCs) |  |
| ✅ PASS | graphic-heart-keychain_2000x1959_300dpi.png: exactly 2000×1959px | 2000×1959 |
| ✅ PASS | graphic-heart-keychain_2000x1959_300dpi.png: 300 DPI metadata | pHYs=300 |
| ✅ PASS | graphic-heart-keychain_2000x1959_300dpi.png: under 5 MB | 0.53 MB |
| ✅ PASS | Crop applied: 800px image cropped 25% left / 25% bottom → 600×600 source | {"w":600,"h":600,"cropX":200,"cropY":0} |
| ✅ PASS | Validation passed |  |

## Export: SVG engraving (Non-MC Engraved Heart Necklace 1000×996)

| Result | Check | Detail |
|---|---|---|
| ✅ PASS | SVG has width=1000 height=996 and viewBox 0 0 1000 996 |  |
| ✅ PASS | SVG text converted to outlines (no <text>) |  |
| ✅ PASS | SVG contains no raster images and no scripts |  |
| ✅ PASS | SVG artwork is solid black only | rgb(0,0,0) |
| ✅ PASS | Validation passed (solid black, vector, outlined text) |  |
| ✅ PASS | SVG renders in the browser and matches the PNG render (text/shape positioning) | mismatch 0.06% of 74804 dark px |

## Engraving error detection and correction

| Result | Check | Detail |
|---|---|---|
| ✅ PASS | Coloured shape flagged (engrave-color FAIL) with "Make all black" fix |  |
| ✅ PASS | Raster photo in SVG flagged (engrave-vector FAIL) with trace fix |  |
| ✅ PASS | After "Make all black" + "Trace to vector", all checks pass |  |

## Export: multiple surfaces (Engraved Metal Wallet front 1300×946 + back 898×448)

| Result | Check | Detail |
|---|---|---|
| ✅ PASS | Two files built | engraved-metal-wallet_front_1300x946_300dpi.png, engraved-metal-wallet_back_898x448_300dpi.png |
| ✅ PASS | engraved-metal-wallet_front_1300x946_300dpi.png: valid PNG (signature + all CRCs) |  |
| ✅ PASS | engraved-metal-wallet_front_1300x946_300dpi.png: exactly 1300×946px | 1300×946 |
| ✅ PASS | engraved-metal-wallet_front_1300x946_300dpi.png: 300 DPI metadata | pHYs=300 |
| ✅ PASS | engraved-metal-wallet_front_1300x946_300dpi.png: under 25 MB | 0.03 MB |
| ✅ PASS | engraved-metal-wallet_back_898x448_300dpi.png: valid PNG (signature + all CRCs) |  |
| ✅ PASS | engraved-metal-wallet_back_898x448_300dpi.png: exactly 898×448px | 898×448 |
| ✅ PASS | engraved-metal-wallet_back_898x448_300dpi.png: 300 DPI metadata | pHYs=300 |
| ✅ PASS | engraved-metal-wallet_back_898x448_300dpi.png: under 25 MB | 0.01 MB |
| ✅ PASS | Front and back contain their own content |  |
| ✅ PASS | Both surfaces passed validation |  |

## Export: double-sided product (Custom Cut Acrylic Ornament Double Sided)

| Result | Check | Detail |
|---|---|---|
| ✅ PASS | custom-cut-acrylic-ornament-double-sided_side-a_3540x3186_300dpi.png: valid PNG (signature + all CRCs) |  |
| ✅ PASS | custom-cut-acrylic-ornament-double-sided_side-a_3540x3186_300dpi.png: exactly 3540×3186px | 3540×3186 |
| ✅ PASS | custom-cut-acrylic-ornament-double-sided_side-a_3540x3186_300dpi.png: 300 DPI metadata | pHYs=300 |
| ✅ PASS | custom-cut-acrylic-ornament-double-sided_side-a_3540x3186_300dpi.png: under 25 MB | 0.27 MB |
| ✅ PASS | custom-cut-acrylic-ornament-double-sided_side-b_3540x3186_300dpi.png: valid PNG (signature + all CRCs) |  |
| ✅ PASS | custom-cut-acrylic-ornament-double-sided_side-b_3540x3186_300dpi.png: exactly 3540×3186px | 3540×3186 |
| ✅ PASS | custom-cut-acrylic-ornament-double-sided_side-b_3540x3186_300dpi.png: 300 DPI metadata | pHYs=300 |
| ✅ PASS | custom-cut-acrylic-ornament-double-sided_side-b_3540x3186_300dpi.png: under 25 MB | 0.27 MB |
| ✅ PASS | Not production-ready: Side B requirement NEEDS VERIFICATION |  |

## Export: JPG, no transparency (Classic Tote Bag 2925×5850, 150 DPI)

| Result | Check | Detail |
|---|---|---|
| ✅ PASS | Valid JPEG (SOI/EOI, JFIF) |  |
| ✅ PASS | Exactly 2925×5850px | 2925×5850 |
| ✅ PASS | 150 DPI in JFIF header | units 1 150×150 |
| ✅ PASS | Under 100 MB | 0.16 MB |
| ✅ PASS | Transparent areas filled (warned, not failed) |  |

## Export: PNG product that forbids transparency (Printed Canvas Poster 8"×10")

| Result | Check | Detail |
|---|---|---|
| ✅ PASS | printed-canvas-poster-8in-x-10in_2400x3000_300dpi.png: valid PNG (signature + all CRCs) |  |
| ✅ PASS | printed-canvas-poster-8in-x-10in_2400x3000_300dpi.png: exactly 2400×3000px | 2400×3000 |
| ✅ PASS | printed-canvas-poster-8in-x-10in_2400x3000_300dpi.png: 300 DPI metadata | pHYs=300 |
| ✅ PASS | printed-canvas-poster-8in-x-10in_2400x3000_300dpi.png: under 100 MB | 0.19 MB |
| ✅ PASS | Every pixel fully opaque (flattened) | min alpha 255 |
| ✅ PASS | Flatten colour applied at corner (#fdf6e3) | 253,246,227,255 |

## File size: oversize detection and PNG optimisation (2000×2000 keychain, noise photo)

| Result | Check | Detail |
|---|---|---|
| ✅ PASS | Oversize PNG detected as FAIL with optimise fix | 13.13 MB — limit under 5 MB |
| ✅ PASS | Optimised PNG keeps 2000×2000 and 300 DPI, valid CRCs |  |
| ✅ PASS | Optimised PNG fits under 5 MB | 3.82 MB — limit under 5 MB (optimised PNG, 256 colours) |

## Export: very large JPG (High Gloss Poster 3:2, 14550×9750 = 142 MP)

| Result | Check | Detail |
|---|---|---|
| ✅ PASS | 14550×9750 JPEG at 300 DPI, under 100 MB | 14550×9750 300dpi 2.9MB in 2.4s |

## Editor: undo / redo / layers

| Result | Check | Detail |
|---|---|---|
| ✅ PASS | Undo removes the last added object | {"n0":1,"n2":3,"n1":2,"n3":3,"order":["Background","two","one"],"vis":false} |
| ✅ PASS | Redo restores it |  |
| ✅ PASS | Layer move down reorders layers | Background > two > one |

## Projects: save, reopen, rename, duplicate, delete, backup, import

| Result | Check | Detail |
|---|---|---|
| ✅ PASS | Project saved to IndexedDB with image referenced by assetId | 2 objects |
| ✅ PASS | Delete removes the project | 16 → 15 |
| ✅ PASS | Backup ZIP contains manifest, project JSON and the image asset | projects/, projects/6ef6e2da-0e00-4bfb-905f-92b1344e9c03.json, assets/, assets/325bc44e-750c-4d26-b210-8c59e435aac5.png, manifest.json, README.txt |
| ✅ PASS | Imported project restored with identical layers | image,textbox |
| ✅ PASS | Imported project reopens in the editor (image + text) and builds |  |

## AI Prompt Assistant (no API calls)

| Result | Check | Detail |
|---|---|---|
| ✅ PASS | Engraving prompt demands solid black on white, no text |  |
| ✅ PASS | Message-card prompt keeps the centre clear for the jewelry |  |
| ✅ PASS | Gift-message prompt limits words for a 3×3" card |  |
| ✅ PASS | Blanket prompt uses product aspect ratio and opaque background | 3:4 |

## UI flow — desktop 1440×900

| Result | Check | Detail |
|---|---|---|
| ✅ PASS | Catalog search filters products | 3 results for "rotating rose" |
| ✅ PASS | Editor: new message card starts on white; add text + upload image through the UI | rect(bg), textbox, image |
| ✅ PASS | AI prompt rendered |  |
| ✅ PASS | Build through the UI shows a validation banner | ✓ PRODUCTION-READY — all required checks passed |
| ✅ PASS | ZIP download contains the PNG + BUILD_REPORT.txt + build-report.json | alluring-beauty-necklace-with-rotating-rose-box_650x602_300dpi.png, BUILD_REPORT.txt, build-report.json |
| ✅ PASS | Renamed project appears in My Projects | Mom rose box — test |
| ✅ PASS | Duplicate adds a copy |  |
| ✅ PASS | Delete (with confirmation) removes it |  |
| ✅ PASS | No requests to external hosts (no AI/API calls) | none |
| ✅ PASS | No uncaught page errors | none |

## UI flow — mobile 390×844 and tablet 820×1180

| Result | Check | Detail |
|---|---|---|
| ✅ PASS | mobile: catalog has no horizontal overflow | 0px |
| ✅ PASS | mobile: editor has no horizontal overflow | 0px |
| ✅ PASS | mobile: canvas fits the screen | 334px wide |
| ✅ PASS | mobile: build page has no horizontal overflow | 0px |
| ✅ PASS | mobile: SVG engraving build completes |  |
| ✅ PASS | mobile: no page errors |  |
| ✅ PASS | tablet: catalog has no horizontal overflow | 0px |
| ✅ PASS | tablet: editor has no horizontal overflow | 0px |
| ✅ PASS | tablet: canvas fits the screen | 554px wide |
| ✅ PASS | tablet: build page has no horizontal overflow | 0px |
| ✅ PASS | tablet: SVG engraving build completes |  |
| ✅ PASS | tablet: no page errors |  |

## Screenshots

- [desktop-1-catalog.png](screenshots/desktop-1-catalog.png)
- [desktop-2-setup.png](screenshots/desktop-2-setup.png)
- [desktop-3-editor.png](screenshots/desktop-3-editor.png)
- [desktop-4-ai.png](screenshots/desktop-4-ai.png)
- [desktop-5-preview.png](screenshots/desktop-5-preview.png)
- [desktop-6-build.png](screenshots/desktop-6-build.png)
- [desktop-7-projects.png](screenshots/desktop-7-projects.png)
- [mobile-1-catalog.png](screenshots/mobile-1-catalog.png)
- [mobile-2-editor.png](screenshots/mobile-2-editor.png)
- [mobile-3-build.png](screenshots/mobile-3-build.png)
- [tablet-1-catalog.png](screenshots/tablet-1-catalog.png)
- [tablet-2-editor.png](screenshots/tablet-2-editor.png)
- [tablet-3-build.png](screenshots/tablet-3-build.png)
