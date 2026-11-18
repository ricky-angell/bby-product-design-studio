# Product Preview Accuracy Report

Run: 2026-11-18T02:02:31.737Z · Chrome (headless) · production build
Result: **183/183 checks passed**

## Summary

| | Products |
|---|---|
| Catalog products | 243 |
| **Accurate (official ShineOn mockup) previews published on the live site** | **0** — publishing needs ShineOn's written permission (see below) |
| Products verified in this test with official mockups installed through the app | **11** (18 scenes; 18 scenes rendering-verified) |
| Products that show "requires an approved asset" until a mockup is installed | 243 on a fresh browser; 232 after this test's installs |
| Products whose ShineOn mockup folder contains PSD mockups (installable) | 229 |
| Products whose folder has only JPG/PNG photos (no design slot) | 0 |
| Products with no ShineOn mockup folder | 11 |

Nothing is drawn as a stand-in any more: a product either shows ShineOn's own mockup (with your design placed in it) or a placeholder that says an approved asset is needed.

## Why the live site starts with 0 official previews

ShineOn's Terms of Service: *"Digital items (mockups, templates, images, and other design assets) … belong exclusively to ShineOn"* and are licensed to each seller as *"non-exclusive, limited, non-transferable"* for promoting ShineOn products. Bundling them into a public website and repository would redistribute them, so the app ships none. Each seller can install ShineOn's free PSDs into their own browser (as tested here), and the administrator can publish them for every student once ShineOn grants written permission (`docs/MOCKUP_ASSETS.md`).

## Tested products

| Product | Finish | Official PSD (from the product's ShineOn folder) | ShineOn render match | Placement match | Design in slot | Product parts kept on top | Screenshot (local only) |
|---|---|---|---|---|---|---|---|
| Forever Love Necklace | gold | Forever Love Gold Box Opening Hand.psd | ✅ mean Δ 1.67, 0.03% px | ✅ offset 0,0px, Δ 1.59 | 82.1% of slot, 0% outside | 50,523 px, 0% touched | local-evidence/preview-tests/preview-shineon-forever-love-necklace-gold.png |
| Forever Love Necklace | gold | Forever Love gold Model + MC.psd | ✅ mean Δ 0.97, 0.06% px | not checkable — the smart object's saved preview inside the PSD is blank (saved without 'Maximize Compatibility') | 100.1% of slot, 0% outside | nothing above slot | local-evidence/preview-tests/preview-shineon-forever-love-necklace-gold.png |
| Forever Love Necklace | silver | Forever Love Necklace_Custom Message Card.psd | ✅ mean Δ 0.99, 0% px | ✅ offset 0,0px, Δ 0 | 96.6% of slot, 0% outside | 44,933 px, 0% touched | local-evidence/preview-tests/preview-shineon-forever-love-necklace-silver.png |
| Forever Love Necklace | silver | Forever Love Silver Box Opening Hand.psd | ✅ mean Δ 1.64, 0.03% px | ✅ offset 0,0px, Δ 1.59 | 81.9% of slot, 0% outside | 50,522 px, 0% touched | local-evidence/preview-tests/preview-shineon-forever-love-necklace-silver.png |
| Forever Love Necklace | silver | Forever Love silver Model + MC.psd | ✅ mean Δ 0.92, 0.04% px | not checkable — the smart object's saved preview inside the PSD is blank (saved without 'Maximize Compatibility') | 100.1% of slot, 0% outside | nothing above slot | local-evidence/preview-tests/preview-shineon-forever-love-necklace-silver.png |
| Love Knot Necklace | silver | Love_Knot_White_Custom.psd | ✅ mean Δ 1.5, 0.01% px | ✅ offset 0,0px, Δ 2.9 | 86.1% of slot, 0% outside | 11,687 px, 0% touched | local-evidence/preview-tests/preview-shineon-love-knot-necklace-silver.png |
| Endless Love Necklace | gold | Endless Love Necklace-Maple Leaves Infinity Gold.psd | ✅ mean Δ 1.61, 0.06% px | ✅ offset 0,0px, Δ 2.22 | 84% of slot, 0% outside | 29,358 px, 0% touched | local-evidence/preview-tests/preview-shineon-endless-love-necklace-gold.png |
| Endless Love Necklace | silver | Endless Love Necklace-Maple Leaves Infinity Silver.psd | ✅ mean Δ 1.5, 0% px | ✅ offset 0,0px, Δ 2.22 | 84% of slot, 0% outside | 29,358 px, 0% touched | local-evidence/preview-tests/preview-shineon-endless-love-necklace-silver.png |
| Alluring Beauty Necklace | silver | Alluring Beauty Maple Leaves.psd | ✅ mean Δ 1.47, 0% px | ✅ offset 0,0px, Δ 2.22 | 85.2% of slot, 0% outside | 20,228 px, 0% touched | local-evidence/preview-tests/preview-shineon-alluring-beauty-necklace-silver.png |
| Eternal Hope Necklace | silver | Eternal Hope Silver Model + MC.psd | ✅ mean Δ 0.9, 0.05% px | not checkable — the smart object's saved preview inside the PSD is blank (saved without 'Maximize Compatibility') | 100.1% of slot, 0% outside | nothing above slot | local-evidence/preview-tests/preview-shineon-eternal-hope-necklace-silver.png |
| Eternal Hope Necklace | silver | Eternal_Hope_White_PropedCard_Lux_Silver_ 8.psd | ✅ mean Δ 1.23, 0.05% px | ✅ offset 0,0px, Δ 4.8 | 85.1% of slot, 0% outside | 16,944 px, 0% touched | local-evidence/preview-tests/preview-shineon-eternal-hope-necklace-silver.png |
| Engraved watch | any | Engraved Black Chronograph Watch FD 1.psd | ✅ mean Δ 2.65, 0.82% px | ✅ offset 0,0px, Δ 0.18 | 100.2% of slot, 0% outside | nothing above slot | local-evidence/preview-tests/preview-shineon-non-mc-black-chronograph-watch-with-engraving.png |
| Graphic keychain | gold | Graphic Circle Keychain IMG_4373.psd | ✅ mean Δ 0.49, 0.11% px | not checkable — the smart object's saved preview inside the PSD is blank (saved without 'Maximize Compatibility') | 80.6% of slot, 0% outside | nothing above slot | local-evidence/preview-tests/preview-shineon-graphic-circle-keychain-gold.png |
| Graphic keychain | silver | Graphic Circle Keychain IMG_4373 Silver.psd | ✅ mean Δ 0.28, 0.07% px | ✅ offset 0,0px, Δ 0 | 80.3% of slot, 0% outside | nothing above slot | local-evidence/preview-tests/preview-shineon-graphic-circle-keychain-silver.png |
| Bracelet (Luxury Circle Bangle) | silver | Graphic Circle Bangle 3.psd | ✅ mean Δ 0.43, 0.06% px | ✅ offset 0,0px, Δ 4.09 | 77.1% of slot, 0% outside | nothing above slot | local-evidence/preview-tests/preview-shineon-non-mc-luxury-circle-bangle-silver.png |
| Acrylic plaque | any | Acrylic_Square Plaque white.psd | ✅ mean Δ 0.7, 0.25% px | not checkable — the smart object's saved preview inside the PSD is blank (saved without 'Maximize Compatibility') | 97.8% of slot, 0% outside (fitted) | nothing above slot | local-evidence/preview-tests/preview-shineon-acrylic-square-plaque.png |
| Red Heart Rose Box | silver | Love Knot + Red Rose Red Box Silver 5.psd | ✅ mean Δ 1.37, 0% px | ✅ offset 0,0px, Δ 3.08 | 84.5% of slot, 0% outside | 8,357 px, 0% touched | local-evidence/preview-tests/preview-shineon-love-knot-necklace-with-red-heart-rose-box-silver.png |
| Rotating Rose Box | silver | Alluring Beauty (Silver) with Rotating Rose Box 3.psd | ✅ mean Δ 2.03, 0.7% px | ✅ offset 0,0px, Δ 1.36 | 84.5% of slot, 0% outside | 28,045 px, 0% touched | local-evidence/preview-tests/preview-shineon-alluring-beauty-necklace-with-rotating-rose-box-silver.png |

Columns: *ShineOn render match* — the kit re-rendered with ShineOn's own sample design vs the PSD's saved composite (mean per-pixel difference out of 255; % of pixels differing by more than 32). *Placement match* — BBY's perspective warp of the smart-object's contents vs Photoshop's own transformed pixels. *Design in slot* — pixels that change when the design changes (red vs blue), as % of the slot area, and the share outside the slot. *Product parts kept on top* — opaque pixels of the jewelry/hand/box drawn above the slot, and how many of them the design changed (should be 0%: the pendant hangs over the card).

### Approximations recorded per scene

- **Engraved watch (any, Engraved Black Chronograph Watch FD 1.psd)**: Photoshop "gradientOverlay" effect on the design layer is not reproduced; Photoshop "satin" effect on the design layer is not reproduced; Design-layer effects (innerShadow, bevel, gradientOverlay, satin) are re-created with BBY's approximation of Photoshop
- **Graphic keychain (gold, Graphic Circle Keychain IMG_4373.psd)**: ShineOn's solidFill, patternOverlay, stroke styling on the slot (made for its sample text) is not applied to your artwork, because Graphic Circle Keychain is printed in full colour; Design-layer effects (bevel) are re-created with BBY's approximation of Photoshop; The PSD's design slot has no mask, so your artwork is clipped to the product's circle face as detected from ShineOn's own product layer
- **Graphic keychain (silver, Graphic Circle Keychain IMG_4373 Silver.psd)**: ShineOn's solidFill, patternOverlay, stroke styling on the slot (made for its sample text) is not applied to your artwork, because Graphic Circle Keychain is printed in full colour; Design-layer effects (bevel) are re-created with BBY's approximation of Photoshop; The PSD's design slot has no mask, so your artwork is clipped to the product's circle face as detected from ShineOn's own product layer
- **Acrylic plaque (any, Acrylic_Square Plaque white.psd)**: ShineOn's design slot is 1516×1334 (aspect 1.136); the 3540×3186 artwork (aspect 1.111) is fitted inside it without stretching

## Install log

| Product | File | Size | Time | Finish |
|---|---|---|---|---|
| shineon-forever-love-necklace | Forever Love silver Model + MC.psd | 33.9 MB | 2.8s | silver |
| shineon-forever-love-necklace | Forever Love gold Model + MC.psd | 33.2 MB | 3.5s | gold |
| shineon-forever-love-necklace | Forever Love Necklace_Custom Message Card.psd | 80.5 MB | 6.1s | silver (set manually; guess: none) |
| shineon-forever-love-necklace | Forever Love Silver Box Opening Hand.psd | 65.6 MB | 7.1s | silver |
| shineon-forever-love-necklace | Forever Love Gold Box Opening Hand.psd | 65.2 MB | 6s | gold |
| shineon-love-knot-necklace | Love_Knot_White_Custom.psd | 36 MB | 4.6s | silver (set manually; guess: none) |
| shineon-endless-love-necklace | Endless Love Necklace-Maple Leaves Infinity Silver.psd | 36.7 MB | 4.8s | silver |
| shineon-endless-love-necklace | Endless Love Necklace-Maple Leaves Infinity Gold.psd | 36.6 MB | 5.3s | gold |
| shineon-alluring-beauty-necklace | Alluring Beauty Maple Leaves.psd | 35.5 MB | 5.6s | silver (set manually; guess: none) |
| shineon-eternal-hope-necklace | Eternal Hope Silver Model + MC.psd | 37.1 MB | 3.5s | silver |
| shineon-eternal-hope-necklace | Eternal_Hope_White_PropedCard_Lux_Silver_ 8.psd | 122.6 MB | 5.8s | silver |
| shineon-non-mc-black-chronograph-watch-with-engraving | Engraved Black Chronograph Watch FD 1.psd | 38.5 MB | 4.1s | — (set manually; guess: none) |
| shineon-graphic-circle-keychain | Graphic Circle Keychain IMG_4373 Silver.psd | 16.8 MB | 3.9s | silver |
| shineon-graphic-circle-keychain | Graphic Circle Keychain IMG_4373.psd | 15.8 MB | 3.7s | gold (set manually; guess: none) |
| shineon-non-mc-luxury-circle-bangle | Graphic Circle Bangle 3.psd | 8.4 MB | 3.3s | silver (set manually; guess: none) |
| shineon-acrylic-square-plaque | Acrylic_Square Plaque white.psd | 10.5 MB | 7.6s | — (set manually; guess: none) |
| shineon-love-knot-necklace-with-red-heart-rose-box | Love Knot + Red Rose Red Box Silver 5.psd | 79.3 MB | 4.8s | silver |
| shineon-alluring-beauty-necklace-with-rotating-rose-box | Alluring Beauty (Silver) with Rotating Rose Box 3.psd | 71.3 MB | 5.7s | silver |

## All checks

| Section | Check | Result | Detail |
|---|---|---|---|
| Fresh browser — no approved assets installed | Every catalog card shows an honest placeholder (no drawn product shapes) | PASS | 243/243 placeholders, 0 official |
| Fresh browser — no approved assets installed | No SVG/canvas stand-in product drawings in catalog thumbnails | PASS |  |
| Fresh browser — no approved assets installed | Preview without an approved asset says so (no generic necklace/heart drawn) | PASS |  |
| Fresh browser — no approved assets installed | "Install the official mockup" opens the installer for the same product | PASS |  |
| Install official ShineOn mockups through the app UI | Installed "Forever Love silver Model + MC.psd" for Forever Love Necklace | PASS | 2.8s, finish silver (detected from file name) |
| Install official ShineOn mockups through the app UI | Installed "Forever Love gold Model + MC.psd" for Forever Love Necklace | PASS | 3.5s, finish gold (detected from file name) |
| Install official ShineOn mockups through the app UI | Installed "Forever Love Necklace_Custom Message Card.psd" for Forever Love Necklace | PASS | 6.1s, finish silver (installer guessed "none", set manually) |
| Install official ShineOn mockups through the app UI | Installed "Forever Love Silver Box Opening Hand.psd" for Forever Love Necklace | PASS | 7.1s, finish silver (detected from file name) |
| Install official ShineOn mockups through the app UI | Installed "Forever Love Gold Box Opening Hand.psd" for Forever Love Necklace | PASS | 6.0s, finish gold (detected from file name) |
| Install official ShineOn mockups through the app UI | Installed "Love_Knot_White_Custom.psd" for Love Knot Necklace | PASS | 4.6s, finish silver (installer guessed "none", set manually) |
| Install official ShineOn mockups through the app UI | Installed "Endless Love Necklace-Maple Leaves Infinity Silver.psd" for Endless Love Necklace | PASS | 4.8s, finish silver (detected from file name) |
| Install official ShineOn mockups through the app UI | Installed "Endless Love Necklace-Maple Leaves Infinity Gold.psd" for Endless Love Necklace | PASS | 5.3s, finish gold (detected from file name) |
| Install official ShineOn mockups through the app UI | Installed "Alluring Beauty Maple Leaves.psd" for Alluring Beauty Necklace | PASS | 5.6s, finish silver (installer guessed "none", set manually) |
| Install official ShineOn mockups through the app UI | Installed "Eternal Hope Silver Model + MC.psd" for Eternal Hope Necklace | PASS | 3.5s, finish silver (detected from file name) |
| Install official ShineOn mockups through the app UI | Installed "Eternal_Hope_White_PropedCard_Lux_Silver_ 8.psd" for Eternal Hope Necklace | PASS | 5.8s, finish silver (detected from file name) |
| Install official ShineOn mockups through the app UI | Installed "Engraved Black Chronograph Watch FD 1.psd" for Engraved watch | PASS | 4.1s, finish n/a (detected from file name) |
| Install official ShineOn mockups through the app UI | Installed "Graphic Circle Keychain IMG_4373 Silver.psd" for Graphic keychain | PASS | 3.9s, finish silver (detected from file name) |
| Install official ShineOn mockups through the app UI | Installed "Graphic Circle Keychain IMG_4373.psd" for Graphic keychain | PASS | 3.7s, finish gold (installer guessed "none", set manually) |
| Install official ShineOn mockups through the app UI | Installed "Graphic Circle Bangle 3.psd" for Bracelet (Luxury Circle Bangle) | PASS | 3.3s, finish silver (installer guessed "none", set manually) |
| Install official ShineOn mockups through the app UI | Installed "Acrylic_Square Plaque white.psd" for Acrylic plaque | PASS | 7.6s, finish n/a (detected from file name) |
| Install official ShineOn mockups through the app UI | Installed "Love Knot + Red Rose Red Box Silver 5.psd" for Red Heart Rose Box | PASS | 4.8s, finish silver (detected from file name) |
| Install official ShineOn mockups through the app UI | Installed "Alluring Beauty (Silver) with Rotating Rose Box 3.psd" for Rotating Rose Box | PASS | 5.7s, finish silver (detected from file name) |
| Catalog thumbnails | Forever Love Necklace: catalog card shows ShineOn's own product image | PASS | shineon-forever-love-necklace--gold--forever-love-gold-box-opening-hand |
| Catalog thumbnails | Love Knot Necklace: catalog card shows ShineOn's own product image | PASS | shineon-love-knot-necklace--silver--love-knot-white-custom |
| Catalog thumbnails | Endless Love Necklace: catalog card shows ShineOn's own product image | PASS | shineon-endless-love-necklace--gold--endless-love-necklace-maple-leaves-infinity-gold |
| Catalog thumbnails | Alluring Beauty Necklace: catalog card shows ShineOn's own product image | PASS | shineon-alluring-beauty-necklace--silver--alluring-beauty-maple-leaves |
| Catalog thumbnails | Eternal Hope Necklace: catalog card shows ShineOn's own product image | PASS | shineon-eternal-hope-necklace--silver--eternal-hope-white-propedcard-lux-silver-8 |
| Catalog thumbnails | Engraved watch: catalog card shows ShineOn's own product image | PASS | shineon-non-mc-black-chronograph-watch-with-engraving--any--engraved-black-chronograph-watch-fd-1 |
| Catalog thumbnails | Graphic keychain: catalog card shows ShineOn's own product image | PASS | shineon-graphic-circle-keychain--gold--graphic-circle-keychain-img-4373 |
| Catalog thumbnails | Bracelet (Luxury Circle Bangle): catalog card shows ShineOn's own product image | PASS | shineon-non-mc-luxury-circle-bangle--silver--graphic-circle-bangle-3 |
| Catalog thumbnails | Acrylic plaque: catalog card shows ShineOn's own product image | PASS | shineon-acrylic-square-plaque--any--acrylic-square-plaque-white |
| Catalog thumbnails | Red Heart Rose Box: catalog card shows ShineOn's own product image | PASS | shineon-love-knot-necklace-with-red-heart-rose-box--silver--love-knot-red-rose-red-box-silver-5 |
| Catalog thumbnails | Rotating Rose Box: catalog card shows ShineOn's own product image | PASS | shineon-alluring-beauty-necklace-with-rotating-rose-box--silver--alluring-beauty-silver-with-rotating-rose-box-3 |
| Catalog thumbnails | Exact matching: "shineon-forever-love-necklace-with-red-heart-rose-box" does not borrow a similar product's mockup | PASS |  |
| Catalog thumbnails | Exact matching: "shineon-love-knot-necklace-and-earring-set" does not borrow a similar product's mockup | PASS |  |
| Catalog thumbnails | Exact matching: "shineon-alluring-beauty-necklace-with-red-heart-rose-box" does not borrow a similar product's mockup | PASS |  |
| Catalog thumbnails | Exact matching: "shineon-graphic-heart-keychain" does not borrow a similar product's mockup | PASS |  |
| Catalog thumbnails | Only the installed products show official thumbnails | PASS | 11 official thumbnails |
| Per-product verification | Forever Love Necklace — gold — Forever Love Gold Box Opening Hand.psd: kit bound to this product + catalog # | PASS | catalog #781 |
| Per-product verification | Forever Love Necklace — gold — Forever Love Gold Box Opening Hand.psd: rendering matches ShineOn's own composite | PASS | mean diff 1.67/255, 0.03% px >32 |
| Per-product verification | Forever Love Necklace — gold — Forever Love Gold Box Opening Hand.psd: placement lines up with Photoshop's own transform | PASS | best alignment offset (0, 0) px; painted-pixel mean diff 1.59/255 (1.41% px >32); outline+luminance diff 1.87 |
| Per-product verification | Forever Love Necklace — gold — Forever Love Gold Box Opening Hand.psd: student design fills the design slot | PASS | 82.1% of the slot shows the design |
| Per-product verification | Forever Love Necklace — gold — Forever Love Gold Box Opening Hand.psd: design never spills outside the slot | PASS | 0% of changed pixels outside |
| Per-product verification | Forever Love Necklace — gold — Forever Love Gold Box Opening Hand.psd: product parts above the slot stay on top of the design | PASS | 50,523 product pixels over the slot; 0% affected by the design |
| Per-product verification | Forever Love Necklace — gold — Forever Love gold Model + MC.psd: kit bound to this product + catalog # | PASS | catalog #781 |
| Per-product verification | Forever Love Necklace — gold — Forever Love gold Model + MC.psd: rendering matches ShineOn's own composite | PASS | mean diff 0.97/255, 0.06% px >32 |
| Per-product verification | Forever Love Necklace — gold — Forever Love gold Model + MC.psd: placement cross-check reported honestly when not possible | PASS | the smart object's saved preview inside the PSD is blank (saved without 'Maximize Compatibility') |
| Per-product verification | Forever Love Necklace — gold — Forever Love gold Model + MC.psd: student design fills the design slot | PASS | 100.1% of the slot shows the design |
| Per-product verification | Forever Love Necklace — gold — Forever Love gold Model + MC.psd: design never spills outside the slot | PASS | 0% of changed pixels outside |
| Per-product verification | Forever Love Necklace — silver — Forever Love Necklace_Custom Message Card.psd: kit bound to this product + catalog # | PASS | catalog #781 |
| Per-product verification | Forever Love Necklace — silver — Forever Love Necklace_Custom Message Card.psd: rendering matches ShineOn's own composite | PASS | mean diff 0.99/255, 0% px >32 |
| Per-product verification | Forever Love Necklace — silver — Forever Love Necklace_Custom Message Card.psd: placement lines up with Photoshop's own transform | PASS | best alignment offset (0, 0) px; painted-pixel mean diff 0/255 (0% px >32); outline+luminance diff 0.55 |
| Per-product verification | Forever Love Necklace — silver — Forever Love Necklace_Custom Message Card.psd: student design fills the design slot | PASS | 96.6% of the slot shows the design |
| Per-product verification | Forever Love Necklace — silver — Forever Love Necklace_Custom Message Card.psd: design never spills outside the slot | PASS | 0% of changed pixels outside |
| Per-product verification | Forever Love Necklace — silver — Forever Love Necklace_Custom Message Card.psd: product parts above the slot stay on top of the design | PASS | 44,933 product pixels over the slot; 0% affected by the design |
| Per-product verification | Forever Love Necklace — silver — Forever Love Silver Box Opening Hand.psd: kit bound to this product + catalog # | PASS | catalog #781 |
| Per-product verification | Forever Love Necklace — silver — Forever Love Silver Box Opening Hand.psd: rendering matches ShineOn's own composite | PASS | mean diff 1.64/255, 0.03% px >32 |
| Per-product verification | Forever Love Necklace — silver — Forever Love Silver Box Opening Hand.psd: placement lines up with Photoshop's own transform | PASS | best alignment offset (0, 0) px; painted-pixel mean diff 1.59/255 (1.41% px >32); outline+luminance diff 1.87 |
| Per-product verification | Forever Love Necklace — silver — Forever Love Silver Box Opening Hand.psd: student design fills the design slot | PASS | 81.9% of the slot shows the design |
| Per-product verification | Forever Love Necklace — silver — Forever Love Silver Box Opening Hand.psd: design never spills outside the slot | PASS | 0% of changed pixels outside |
| Per-product verification | Forever Love Necklace — silver — Forever Love Silver Box Opening Hand.psd: product parts above the slot stay on top of the design | PASS | 50,522 product pixels over the slot; 0% affected by the design |
| Per-product verification | Forever Love Necklace — silver — Forever Love silver Model + MC.psd: kit bound to this product + catalog # | PASS | catalog #781 |
| Per-product verification | Forever Love Necklace — silver — Forever Love silver Model + MC.psd: rendering matches ShineOn's own composite | PASS | mean diff 0.92/255, 0.04% px >32 |
| Per-product verification | Forever Love Necklace — silver — Forever Love silver Model + MC.psd: placement cross-check reported honestly when not possible | PASS | the smart object's saved preview inside the PSD is blank (saved without 'Maximize Compatibility') |
| Per-product verification | Forever Love Necklace — silver — Forever Love silver Model + MC.psd: student design fills the design slot | PASS | 100.1% of the slot shows the design |
| Per-product verification | Forever Love Necklace — silver — Forever Love silver Model + MC.psd: design never spills outside the slot | PASS | 0% of changed pixels outside |
| Per-product verification | Love Knot Necklace — silver — Love_Knot_White_Custom.psd: kit bound to this product + catalog # | PASS | catalog #4377 |
| Per-product verification | Love Knot Necklace — silver — Love_Knot_White_Custom.psd: rendering matches ShineOn's own composite | PASS | mean diff 1.5/255, 0.01% px >32 |
| Per-product verification | Love Knot Necklace — silver — Love_Knot_White_Custom.psd: placement lines up with Photoshop's own transform | PASS | best alignment offset (0, 0) px; painted-pixel mean diff 2.9/255 (3.14% px >32); outline+luminance diff 3.07 |
| Per-product verification | Love Knot Necklace — silver — Love_Knot_White_Custom.psd: student design fills the design slot | PASS | 86.1% of the slot shows the design |
| Per-product verification | Love Knot Necklace — silver — Love_Knot_White_Custom.psd: design never spills outside the slot | PASS | 0% of changed pixels outside |
| Per-product verification | Love Knot Necklace — silver — Love_Knot_White_Custom.psd: product parts above the slot stay on top of the design | PASS | 11,687 product pixels over the slot; 0% affected by the design |
| Per-product verification | Endless Love Necklace — gold — Endless Love Necklace-Maple Leaves Infinity Gold.psd: kit bound to this product + catalog # | PASS | catalog #775 |
| Per-product verification | Endless Love Necklace — gold — Endless Love Necklace-Maple Leaves Infinity Gold.psd: rendering matches ShineOn's own composite | PASS | mean diff 1.61/255, 0.06% px >32 |
| Per-product verification | Endless Love Necklace — gold — Endless Love Necklace-Maple Leaves Infinity Gold.psd: placement lines up with Photoshop's own transform | PASS | best alignment offset (0, 0) px; painted-pixel mean diff 2.22/255 (2.44% px >32); outline+luminance diff 1.65 |
| Per-product verification | Endless Love Necklace — gold — Endless Love Necklace-Maple Leaves Infinity Gold.psd: student design fills the design slot | PASS | 84% of the slot shows the design |
| Per-product verification | Endless Love Necklace — gold — Endless Love Necklace-Maple Leaves Infinity Gold.psd: design never spills outside the slot | PASS | 0% of changed pixels outside |
| Per-product verification | Endless Love Necklace — gold — Endless Love Necklace-Maple Leaves Infinity Gold.psd: product parts above the slot stay on top of the design | PASS | 29,358 product pixels over the slot; 0% affected by the design |
| Per-product verification | Endless Love Necklace — silver — Endless Love Necklace-Maple Leaves Infinity Silver.psd: kit bound to this product + catalog # | PASS | catalog #775 |
| Per-product verification | Endless Love Necklace — silver — Endless Love Necklace-Maple Leaves Infinity Silver.psd: rendering matches ShineOn's own composite | PASS | mean diff 1.5/255, 0% px >32 |
| Per-product verification | Endless Love Necklace — silver — Endless Love Necklace-Maple Leaves Infinity Silver.psd: placement lines up with Photoshop's own transform | PASS | best alignment offset (0, 0) px; painted-pixel mean diff 2.22/255 (2.44% px >32); outline+luminance diff 1.65 |
| Per-product verification | Endless Love Necklace — silver — Endless Love Necklace-Maple Leaves Infinity Silver.psd: student design fills the design slot | PASS | 84% of the slot shows the design |
| Per-product verification | Endless Love Necklace — silver — Endless Love Necklace-Maple Leaves Infinity Silver.psd: design never spills outside the slot | PASS | 0% of changed pixels outside |
| Per-product verification | Endless Love Necklace — silver — Endless Love Necklace-Maple Leaves Infinity Silver.psd: product parts above the slot stay on top of the design | PASS | 29,358 product pixels over the slot; 0% affected by the design |
| Per-product verification | Alluring Beauty Necklace — silver — Alluring Beauty Maple Leaves.psd: kit bound to this product + catalog # | PASS | catalog #4363 |
| Per-product verification | Alluring Beauty Necklace — silver — Alluring Beauty Maple Leaves.psd: rendering matches ShineOn's own composite | PASS | mean diff 1.47/255, 0% px >32 |
| Per-product verification | Alluring Beauty Necklace — silver — Alluring Beauty Maple Leaves.psd: placement lines up with Photoshop's own transform | PASS | best alignment offset (0, 0) px; painted-pixel mean diff 2.22/255 (2.44% px >32); outline+luminance diff 1.65 |
| Per-product verification | Alluring Beauty Necklace — silver — Alluring Beauty Maple Leaves.psd: student design fills the design slot | PASS | 85.2% of the slot shows the design |
| Per-product verification | Alluring Beauty Necklace — silver — Alluring Beauty Maple Leaves.psd: design never spills outside the slot | PASS | 0% of changed pixels outside |
| Per-product verification | Alluring Beauty Necklace — silver — Alluring Beauty Maple Leaves.psd: product parts above the slot stay on top of the design | PASS | 20,228 product pixels over the slot; 0% affected by the design |
| Per-product verification | Eternal Hope Necklace — silver — Eternal Hope Silver Model + MC.psd: kit bound to this product + catalog # | PASS | catalog #2646 |
| Per-product verification | Eternal Hope Necklace — silver — Eternal Hope Silver Model + MC.psd: rendering matches ShineOn's own composite | PASS | mean diff 0.9/255, 0.05% px >32 |
| Per-product verification | Eternal Hope Necklace — silver — Eternal Hope Silver Model + MC.psd: placement cross-check reported honestly when not possible | PASS | the smart object's saved preview inside the PSD is blank (saved without 'Maximize Compatibility') |
| Per-product verification | Eternal Hope Necklace — silver — Eternal Hope Silver Model + MC.psd: student design fills the design slot | PASS | 100.1% of the slot shows the design |
| Per-product verification | Eternal Hope Necklace — silver — Eternal Hope Silver Model + MC.psd: design never spills outside the slot | PASS | 0% of changed pixels outside |
| Per-product verification | Eternal Hope Necklace — silver — Eternal_Hope_White_PropedCard_Lux_Silver_ 8.psd: kit bound to this product + catalog # | PASS | catalog #2646 |
| Per-product verification | Eternal Hope Necklace — silver — Eternal_Hope_White_PropedCard_Lux_Silver_ 8.psd: rendering matches ShineOn's own composite | PASS | mean diff 1.23/255, 0.05% px >32 |
| Per-product verification | Eternal Hope Necklace — silver — Eternal_Hope_White_PropedCard_Lux_Silver_ 8.psd: placement lines up with Photoshop's own transform | PASS | best alignment offset (0, 0) px; painted-pixel mean diff 4.8/255 (5.22% px >32); outline+luminance diff 2.15 |
| Per-product verification | Eternal Hope Necklace — silver — Eternal_Hope_White_PropedCard_Lux_Silver_ 8.psd: student design fills the design slot | PASS | 85.1% of the slot shows the design |
| Per-product verification | Eternal Hope Necklace — silver — Eternal_Hope_White_PropedCard_Lux_Silver_ 8.psd: design never spills outside the slot | PASS | 0% of changed pixels outside |
| Per-product verification | Eternal Hope Necklace — silver — Eternal_Hope_White_PropedCard_Lux_Silver_ 8.psd: product parts above the slot stay on top of the design | PASS | 16,944 product pixels over the slot; 0% affected by the design |
| Per-product verification | Engraved watch — any finish — Engraved Black Chronograph Watch FD 1.psd: kit bound to this product + catalog # | PASS | catalog #1495 |
| Per-product verification | Engraved watch — any finish — Engraved Black Chronograph Watch FD 1.psd: rendering matches ShineOn's own composite | PASS | mean diff 2.65/255, 0.82% px >32 |
| Per-product verification | Engraved watch — any finish — Engraved Black Chronograph Watch FD 1.psd: placement lines up with Photoshop's own transform | PASS | best alignment offset (0, 0) px; painted-pixel mean diff 0.18/255 (0% px >32); outline+luminance diff 11.43 |
| Per-product verification | Engraved watch — any finish — Engraved Black Chronograph Watch FD 1.psd: student design fills the design slot | PASS | 100.2% of the slot shows the design |
| Per-product verification | Engraved watch — any finish — Engraved Black Chronograph Watch FD 1.psd: design never spills outside the slot | PASS | 0% of changed pixels outside |
| Per-product verification | Graphic keychain — gold — Graphic Circle Keychain IMG_4373.psd: kit bound to this product + catalog # | PASS | catalog #973 |
| Per-product verification | Graphic keychain — gold — Graphic Circle Keychain IMG_4373.psd: rendering matches ShineOn's own composite | PASS | mean diff 0.49/255, 0.11% px >32 |
| Per-product verification | Graphic keychain — gold — Graphic Circle Keychain IMG_4373.psd: placement cross-check reported honestly when not possible | PASS | the smart object's saved preview inside the PSD is blank (saved without 'Maximize Compatibility') |
| Per-product verification | Graphic keychain — gold — Graphic Circle Keychain IMG_4373.psd: student design fills the design slot | PASS | 80.6% of the slot shows the design |
| Per-product verification | Graphic keychain — gold — Graphic Circle Keychain IMG_4373.psd: design never spills outside the slot | PASS | 0% of changed pixels outside |
| Per-product verification | Graphic keychain — silver — Graphic Circle Keychain IMG_4373 Silver.psd: kit bound to this product + catalog # | PASS | catalog #973 |
| Per-product verification | Graphic keychain — silver — Graphic Circle Keychain IMG_4373 Silver.psd: rendering matches ShineOn's own composite | PASS | mean diff 0.28/255, 0.07% px >32 |
| Per-product verification | Graphic keychain — silver — Graphic Circle Keychain IMG_4373 Silver.psd: placement lines up with Photoshop's own transform | PASS | best alignment offset (0, 0) px; painted-pixel mean diff 0/255 (0% px >32); outline+luminance diff 27.23 |
| Per-product verification | Graphic keychain — silver — Graphic Circle Keychain IMG_4373 Silver.psd: student design fills the design slot | PASS | 80.3% of the slot shows the design |
| Per-product verification | Graphic keychain — silver — Graphic Circle Keychain IMG_4373 Silver.psd: design never spills outside the slot | PASS | 0% of changed pixels outside |
| Per-product verification | Bracelet (Luxury Circle Bangle) — silver — Graphic Circle Bangle 3.psd: kit bound to this product + catalog # | PASS | catalog #2 |
| Per-product verification | Bracelet (Luxury Circle Bangle) — silver — Graphic Circle Bangle 3.psd: rendering matches ShineOn's own composite | PASS | mean diff 0.43/255, 0.06% px >32 |
| Per-product verification | Bracelet (Luxury Circle Bangle) — silver — Graphic Circle Bangle 3.psd: placement lines up with Photoshop's own transform | PASS | best alignment offset (0, 0) px; painted-pixel mean diff 4.09/255 (0.02% px >32); outline+luminance diff 5.53 |
| Per-product verification | Bracelet (Luxury Circle Bangle) — silver — Graphic Circle Bangle 3.psd: student design fills the design slot | PASS | 77.1% of the slot shows the design |
| Per-product verification | Bracelet (Luxury Circle Bangle) — silver — Graphic Circle Bangle 3.psd: design never spills outside the slot | PASS | 0% of changed pixels outside |
| Per-product verification | Acrylic plaque — any finish — Acrylic_Square Plaque white.psd: kit bound to this product + catalog # | PASS | catalog #4751 |
| Per-product verification | Acrylic plaque — any finish — Acrylic_Square Plaque white.psd: rendering matches ShineOn's own composite | PASS | mean diff 0.7/255, 0.25% px >32 |
| Per-product verification | Acrylic plaque — any finish — Acrylic_Square Plaque white.psd: placement cross-check reported honestly when not possible | PASS | the smart object's saved preview inside the PSD is blank (saved without 'Maximize Compatibility') |
| Per-product verification | Acrylic plaque — any finish — Acrylic_Square Plaque white.psd: student design fills the design slot | PASS | 97.8% of the slot shows the design (artwork fitted inside a differently-shaped slot) |
| Per-product verification | Acrylic plaque — any finish — Acrylic_Square Plaque white.psd: design never spills outside the slot | PASS | 0% of changed pixels outside |
| Per-product verification | Red Heart Rose Box — silver — Love Knot + Red Rose Red Box Silver 5.psd: kit bound to this product + catalog # | PASS | catalog #8356 |
| Per-product verification | Red Heart Rose Box — silver — Love Knot + Red Rose Red Box Silver 5.psd: rendering matches ShineOn's own composite | PASS | mean diff 1.37/255, 0% px >32 |
| Per-product verification | Red Heart Rose Box — silver — Love Knot + Red Rose Red Box Silver 5.psd: placement lines up with Photoshop's own transform | PASS | best alignment offset (0, 0) px; painted-pixel mean diff 3.08/255 (1.37% px >32); outline+luminance diff 6.31 |
| Per-product verification | Red Heart Rose Box — silver — Love Knot + Red Rose Red Box Silver 5.psd: student design fills the design slot | PASS | 84.5% of the slot shows the design |
| Per-product verification | Red Heart Rose Box — silver — Love Knot + Red Rose Red Box Silver 5.psd: design never spills outside the slot | PASS | 0% of changed pixels outside |
| Per-product verification | Red Heart Rose Box — silver — Love Knot + Red Rose Red Box Silver 5.psd: product parts above the slot stay on top of the design | PASS | 8,357 product pixels over the slot; 0% affected by the design |
| Per-product verification | Rotating Rose Box — silver — Alluring Beauty (Silver) with Rotating Rose Box 3.psd: kit bound to this product + catalog # | PASS | catalog #9554 |
| Per-product verification | Rotating Rose Box — silver — Alluring Beauty (Silver) with Rotating Rose Box 3.psd: rendering matches ShineOn's own composite | PASS | mean diff 2.03/255, 0.7% px >32 |
| Per-product verification | Rotating Rose Box — silver — Alluring Beauty (Silver) with Rotating Rose Box 3.psd: placement lines up with Photoshop's own transform | PASS | best alignment offset (0, 0) px; painted-pixel mean diff 1.36/255 (0.19% px >32); outline+luminance diff 0.83 |
| Per-product verification | Rotating Rose Box — silver — Alluring Beauty (Silver) with Rotating Rose Box 3.psd: student design fills the design slot | PASS | 84.5% of the slot shows the design |
| Per-product verification | Rotating Rose Box — silver — Alluring Beauty (Silver) with Rotating Rose Box 3.psd: design never spills outside the slot | PASS | 0% of changed pixels outside |
| Per-product verification | Rotating Rose Box — silver — Alluring Beauty (Silver) with Rotating Rose Box 3.psd: product parts above the slot stay on top of the design | PASS | 28,045 product pixels over the slot; 0% affected by the design |
| Preview tab (Step 5) with a sample design | Forever Love Necklace: preview shows the official mockup of the selected product | PASS | shineon-forever-love-necklace--gold--forever-love-gold-box-opening-hand |
| Preview tab (Step 5) with a sample design | Forever Love Necklace: default scene shows the jewelry over the student's card | PASS | 50,523 product pixels over the card in "forever-love-gold-box-opening-hand" |
| Preview tab (Step 5) with a sample design | Forever Love Necklace: labelled as an official ShineOn mockup with its verification | PASS |  |
| Preview tab (Step 5) with a sample design | Forever Love Necklace: switching Silver/Gold shows ShineOn's other finish | PASS | silver → gold |
| Preview tab (Step 5) with a sample design | Love Knot Necklace: preview shows the official mockup of the selected product | PASS | shineon-love-knot-necklace--silver--love-knot-white-custom |
| Preview tab (Step 5) with a sample design | Love Knot Necklace: default scene shows the jewelry over the student's card | PASS | 11,687 product pixels over the card in "love-knot-white-custom" |
| Preview tab (Step 5) with a sample design | Love Knot Necklace: labelled as an official ShineOn mockup with its verification | PASS |  |
| Preview tab (Step 5) with a sample design | Endless Love Necklace: preview shows the official mockup of the selected product | PASS | shineon-endless-love-necklace--gold--endless-love-necklace-maple-leaves-infinity-gold |
| Preview tab (Step 5) with a sample design | Endless Love Necklace: default scene shows the jewelry over the student's card | PASS | 29,358 product pixels over the card in "endless-love-necklace-maple-leaves-infinity-gold" |
| Preview tab (Step 5) with a sample design | Endless Love Necklace: labelled as an official ShineOn mockup with its verification | PASS |  |
| Preview tab (Step 5) with a sample design | Endless Love Necklace: switching Silver/Gold shows ShineOn's other finish | PASS | silver → gold |
| Preview tab (Step 5) with a sample design | Alluring Beauty Necklace: preview shows the official mockup of the selected product | PASS | shineon-alluring-beauty-necklace--silver--alluring-beauty-maple-leaves |
| Preview tab (Step 5) with a sample design | Alluring Beauty Necklace: default scene shows the jewelry over the student's card | PASS | 20,228 product pixels over the card in "alluring-beauty-maple-leaves" |
| Preview tab (Step 5) with a sample design | Alluring Beauty Necklace: labelled as an official ShineOn mockup with its verification | PASS |  |
| Preview tab (Step 5) with a sample design | Eternal Hope Necklace: preview shows the official mockup of the selected product | PASS | shineon-eternal-hope-necklace--silver--eternal-hope-white-propedcard-lux-silver-8 |
| Preview tab (Step 5) with a sample design | Eternal Hope Necklace: default scene shows the jewelry over the student's card | PASS | 16,944 product pixels over the card in "eternal-hope-white-propedcard-lux-silver-8" |
| Preview tab (Step 5) with a sample design | Eternal Hope Necklace: labelled as an official ShineOn mockup with its verification | PASS |  |
| Preview tab (Step 5) with a sample design | Engraved watch: preview shows the official mockup of the selected product | PASS | shineon-non-mc-black-chronograph-watch-with-engraving--any--engraved-black-chronograph-watch-fd-1 |
| Preview tab (Step 5) with a sample design | Engraved watch: labelled as an official ShineOn mockup with its verification | PASS |  |
| Preview tab (Step 5) with a sample design | Graphic keychain: preview shows the official mockup of the selected product | PASS | shineon-graphic-circle-keychain--gold--graphic-circle-keychain-img-4373 |
| Preview tab (Step 5) with a sample design | Graphic keychain: labelled as an official ShineOn mockup with its verification | PASS |  |
| Preview tab (Step 5) with a sample design | Graphic keychain: switching Silver/Gold shows ShineOn's other finish | PASS | silver → gold |
| Preview tab (Step 5) with a sample design | Bracelet (Luxury Circle Bangle): preview shows the official mockup of the selected product | PASS | shineon-non-mc-luxury-circle-bangle--silver--graphic-circle-bangle-3 |
| Preview tab (Step 5) with a sample design | Bracelet (Luxury Circle Bangle): labelled as an official ShineOn mockup with its verification | PASS |  |
| Preview tab (Step 5) with a sample design | Acrylic plaque: preview shows the official mockup of the selected product | PASS | shineon-acrylic-square-plaque--any--acrylic-square-plaque-white |
| Preview tab (Step 5) with a sample design | Acrylic plaque: labelled as an official ShineOn mockup with its verification | PASS |  |
| Preview tab (Step 5) with a sample design | Red Heart Rose Box: preview shows the official mockup of the selected product | PASS | shineon-love-knot-necklace-with-red-heart-rose-box--silver--love-knot-red-rose-red-box-silver-5 |
| Preview tab (Step 5) with a sample design | Red Heart Rose Box: default scene shows the jewelry over the student's card | PASS | 8,357 product pixels over the card in "love-knot-red-rose-red-box-silver-5" |
| Preview tab (Step 5) with a sample design | Red Heart Rose Box: labelled as an official ShineOn mockup with its verification | PASS |  |
| Preview tab (Step 5) with a sample design | Rotating Rose Box: preview shows the official mockup of the selected product | PASS | shineon-alluring-beauty-necklace-with-rotating-rose-box--silver--alluring-beauty-silver-with-rotating-rose-box-3 |
| Preview tab (Step 5) with a sample design | Rotating Rose Box: default scene shows the jewelry over the student's card | PASS | 28,045 product pixels over the card in "alluring-beauty-silver-with-rotating-rose-box-3" |
| Preview tab (Step 5) with a sample design | Rotating Rose Box: labelled as an official ShineOn mockup with its verification | PASS |  |
| Preview tab (Step 5) with a sample design | Choosing a finish with no installed mockup shows a placeholder, never the other finish | PASS |  |
| Regression | Build still produces a PRODUCTION-READY 1000×1000 file after the preview change | PASS |  |
| Regression | No page errors | PASS |  |
| Regression | No network requests leave the app (PSDs read locally) | PASS | localhost:4185 |
| Administrator path: export pack → import / publish | Export pack downloads every installed scene | PASS | 6.9 MB, 18 scenes |
| Administrator path: export pack → import / publish | Importing the pack in another browser restores every scene | PASS | 18 scenes |
| Administrator path: export pack → import / publish | Publish tool refuses without a recorded ShineOn permission | PASS |  |
| Administrator path: export pack → import / publish | Publish tool writes kits + manifest when permission is recorded | PASS | 18 kit(s) published to dist\mockups/. Run `npm run deploy` to put them on the live site. |
| Administrator path: export pack → import / publish | A brand-new browser (nothing installed) gets the published official previews | PASS | 18 published scenes |
| Administrator path: export pack → import / publish | Published mockup renders in the preview and says it was published by the administrator | PASS |  |
| Administrator path: export pack → import / publish | Test publish cleaned up (dist/mockups back to the empty, permission-not-granted manifest) | PASS |  |
| Administrator path: export pack → import / publish | public/mockups (what gets deployed) still contains no ShineOn files | PASS |  |
| Mobile layout | Mockup library has no horizontal overflow at 390px | PASS | 0px |

Screenshots with ShineOn imagery are kept in `local-evidence/preview-tests/` (git-ignored; ShineOn's property). Placeholder screenshots: `docs/screenshots/preview-*.png`.
