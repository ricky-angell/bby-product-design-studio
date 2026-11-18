# Official product mockups — administrator guide

The Studio's Step 5 preview shows a student's design on **ShineOn's own mockup** of the exact product and finish they chose. For example, the Forever Love heart pendant hangs over the student's message card, and the Red Heart Rose Box opens on their card. Where no approved mockup is installed, the preview and the catalog card say so. The Studio never draws a stand-in product shape.

## Why no ShineOn images are built in

ShineOn's [Terms of Service](https://www.shineon.com/terms-of-service) cover this in two clauses:

> **Digital Items.** Digital items (mockups, templates, images, and other design assets) … belong exclusively to ShineOn. Digital items may only be used in connection with the advertising, promoting, offering, and sale of ShineOn's Products …

> **ShineOn Intellectual Property.** … a non-exclusive, limited, **non-transferable**, revocable, royalty-free right and license to use any materials such as generated image assets, source files or other content provided by ShineOn …

Each seller may download and use the mockups on ShineOn's free seller portal; ShineOn's help article ["Adding Additional Product Mockups"](https://teamshineon.zendesk.com/hc/en-us/articles/10482796083089) says "These are free to download". Copying them into a public GitHub repository and website would transfer them to everyone, which needs ShineOn's permission.

There are two lawful ways to get the previews.

| | Who | What happens |
|---|---|---|
| **A. Seller installs** (works today) | Each student or seller | Downloads a PSD from ShineOn's portal and drops it into **Mockups → Install PSD**. It is parsed in their browser and stored there only. |
| **B. Administrator publishes** (needs ShineOn's written permission) | BBY administrator | Builds kits once, exports a pack and publishes it to `public/mockups/`. Every student then sees the previews with nothing to install. |

## Asking ShineOn for permission (route B)

Email ShineOn seller support (helpme@shineon.com) or your ShineOn partner manager. Suggested text:

> Built By You Academy runs a free design tool for ShineOn sellers (https://ricky-angell.github.io/bby-product-design-studio/). It previews a student's artwork on ShineOn's official mockups from the Public Seller Portal, so students see the real product before uploading to ShineOn. May we host processed copies of those mockups (layers extracted from the Canto PSDs, about 5 MB per 15 scenes) on that site, for ShineOn sellers only, credited to ShineOn and removed on request? We would like written permission to keep on file.

Keep ShineOn's reply. You record its reference when publishing.

## Installing a mockup (both routes)

1. **Find the PSD.** [`docs/MOCKUP_SOURCES.md`](MOCKUP_SOURCES.md) lists every product's ShineOn mockup folder, how many PSDs it holds, a suggested PSD and a one-line download command. Regenerate the list with `node tools/mockup-survey.mjs`. To list one product's files:
   ```bash
   node tools/canto-list.mjs shineon-forever-love-necklace --psd
   node tools/fetch-mockup.mjs PublicSellerPortal c4hc1p1g8d3tnatlev2bsjf55q "Forever Love silver Model + MC.psd"
   ```
   Downloads go into `mockup-sources/`, which is git-ignored. Never commit these files. A student can do the same from the **ShineOn mockup folder ↗** link in the app.
2. **Choose a good PSD.**
   - It must have a design or message-card slot: a smart-object layer named "Design", "Design Here", "Your Text Inside" or similar.
   - Files named "No MC", "Explainer" or "Specification" are finished photos without a slot.
   - Smaller files (under about 150 MB) install faster.
   - For products sold in both finishes, install a **silver** and a **gold** PSD so the Silver/Gold buttons show the real finish.
3. **Install.**
   1. Open the app, go to **Mockups**, and choose **Install PSD** on the product row.
   2. Choose the file. The installer lists the PSD's smart-object layers and pre-selects the design slot. It reads the finish from the file name; if the name doesn't say, set it yourself (e.g. "Graphic Circle Keychain IMG_4373.psd" is the gold one).
   3. Press **Build & verify**. A red-bordered test card shows exactly where the artwork lands.
   4. Check the verification lines, then press **Save to this browser**.

### What "verified" means

Each kit is checked when it is built:

- **Rendering:** the kit is re-rendered with ShineOn's own sample design and compared with the composite image saved inside the PSD (mean difference per pixel out of 255). If it matches, the kit gets the "Official ShineOn mockup" badge. If not, it also shows "Rendering approximated".
- **Placement:** BBY's perspective warp of the smart object's contents is aligned against Photoshop's own transformed pixels. The best alignment must be within 1 px. Some ShineOn PSDs store a blank preview of the smart object, or a plain-colour one. Then this check is reported as *not checkable*, never as passed.
- **Notes:** anything that is approximated is listed with the kit. Examples:
  - Photoshop "pattern overlay" or "satin" effects;
  - an artwork whose aspect ratio differs from ShineOn's slot (fitted inside without stretching);
  - on full-colour printed products, ShineOn's gold or silver text styling on the slot (not applied to the student's art);
  - on shaped products whose PSD slot has no mask, clipping to the product face found in ShineOn's own product layer.

### How products are matched

A kit is bound to **one BBY product id**, the product's **ShineOn catalog number** (from `app.shineon.com/catalog/<n>`) and a **finish** (silver tone, gold tone, or not finish-specific). It is never matched by keyword: installing the Love Knot PSD does not affect "Love Knot Necklace & Earring Set". Choosing a finish that has no kit shows "No approved Gold tone mockup installed". The preview never shows the other finish instead.

## Publishing for every student (route B, only with permission)

1. Install all the mockups you want in one browser (see above).
2. In **Mockups**, use **Export installed mockups (pack)**. This downloads `bby-mockup-pack-YYYY-MM-DD.zip`, which contains ShineOn imagery, so don't share it.
3. Publish it and deploy:
   ```bash
   node tools/publish-mockup-pack.mjs bby-mockup-pack-2026-12-01.zip \
     --permission "Email from <name>, ShineOn <team>, 2026-12-01, ref #…" --granted-by "<name>, <role>"
   npm run deploy
   ```
   The tool refuses to run without `--permission` and `--granted-by`. It writes kits to `public/mockups/<kit-id>/` and records the permission in `public/mockups/manifest.json`. The app loads published kits only while `permission.granted` is true.
4. To withdraw everything: `node tools/publish-mockup-pack.mjs --unpublish`, then `npm run deploy`.

## Sharing a pack privately

**Mockups → Import a mockup pack** installs a pack into another browser. Only share a pack where ShineOn's licence allows it, for example between your own devices.

## Technical notes

- **Parsing:** PSDs are parsed in a Web Worker with [ag-psd](https://github.com/Agamnentzar/ag-psd) (MIT).
- **Kit contents:** layers are flattened into the base scene below the slot and merged runs of layers above it. Images are stored at up to 1600 px as WebP. The slot keeps:
  - its exact corner coordinates (Photoshop's `nonAffineTransform`);
  - an optional custom-warp mesh;
  - its layer and group masks, blend mode and opacity;
  - its layer effects.
- **Blend modes and clipping:** Photoshop blend modes map to canvas composite modes. Linear burn, dissolve and similar modes are approximated and noted. Clipping masks are honoured, including layers clipped to the design slot.
- **Effects:** drop shadow, inner shadow, inner and outer glow, bevel, colour overlay and stroke are re-created. Gradient overlay, pattern overlay and satin are noted as not reproduced.
- **Storage:** kits are stored in the browser's IndexedDB (`mockups` store), or published under `public/mockups/`.
- **Tests:** `node tests/mockup-tests.mjs` downloads the test PSDs from ShineOn's portal into `mockup-sources/`, installs them through the UI and verifies every scene. Results go to [`PREVIEW_ACCURACY_REPORT.md`](PREVIEW_ACCURACY_REPORT.md). Screenshots containing ShineOn imagery stay in the git-ignored `local-evidence/` folder.
