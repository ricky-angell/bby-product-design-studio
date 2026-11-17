#!/usr/bin/env node
/**
 * BBY Product Design Studio — ShineOn catalog audit.
 *
 * Fetches ShineOn's public Help Center (Zendesk) articles and rebuilds
 * public/data/products.json + docs/SPEC_AUDIT.md.
 *
 * Source of truth: "Product Artwork Requirements, Templates and Prices"
 * (article 32366681952017). Every product line in that article becomes a
 * product record. Each record is then cross-checked against the product's own
 * "Design and Care Advice" article; any contradiction is recorded and the
 * product is flagged NEEDS VERIFICATION. Nothing is guessed: a field the
 * sources don't state is stored as null with a reason.
 *
 * Usage:  node tools/audit-shineon.mjs            (live fetch)
 *         node tools/audit-shineon.mjs --cache DIR (reuse/save raw JSON in DIR)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HC = 'https://teamshineon.zendesk.com';
const REQ_ID = '32366681952017';
const CATALOG_ID = '10195816837265';
const MC_ID = '10283969022993';
const TODAY = new Date().toISOString().slice(0, 10);
const UA = { 'User-Agent': 'bby-product-design-studio-audit' };

const cacheIdx = process.argv.indexOf('--cache');
const CACHE = cacheIdx > -1 ? process.argv[cacheIdx + 1] : null;

async function getJSON(url, cacheName) {
  if (CACHE && cacheName) {
    const p = path.join(CACHE, cacheName);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  }
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  const j = await r.json();
  if (CACHE && cacheName) { fs.mkdirSync(CACHE, { recursive: true }); fs.writeFileSync(path.join(CACHE, cacheName), JSON.stringify(j)); }
  return j;
}

async function allArticles() {
  let url = `${HC}/api/v2/help_center/en-us/articles.json?per_page=100`;
  const out = [];
  let page = 0;
  while (url) {
    const d = await getJSON(url, `articles-page-${++page}.json`);
    out.push(...d.articles);
    url = d.next_page;
  }
  return out;
}

// ---------- HTML -> text with [text](href) links ----------
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', hellip: '…' };
function decode(s) {
  return s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENT[e.toLowerCase()] ?? m;
  });
}
function htmlToLines(html) {
  let s = html.replace(/\r/g, '');
  s = s.replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (m, href, t) => {
    const text = t.replace(/<[^>]+>/g, '');
    return text.trim() ? `[${text}](${decode(href)})` : '';
  });
  s = s.replace(/<img\b[^>]*src="([^"]*)"[^>]*>/gi, ' {IMG $1} ');
  s = s.replace(/<(br|\/p|\/li|\/h\d|\/div|\/tr)\b[^>]*>/gi, '\n');
  s = s.replace(/<[^>]+>/g, '');
  s = decode(s).replace(/[ \t ]+/g, ' ');
  return s.split('\n').map((l) => l.trim()).filter(Boolean);
}
const stripLinks = (l) => l.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
const links = (l) => [...l.matchAll(/\[([^\]]*)\]\(([^)]*)\)/g)].map((m) => ({ text: m[1].trim(), href: m[2].trim() }));

// ---------- Normalisation for matching product <-> advice article ----------
function norm(s) {
  return s.toLowerCase()
    .replace(/[’']/g, '')
    .replace(/\bnon-mc\b|\bwith mc\b|\bmc\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(design|and|care|advice|the|a|with|of)\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

// Manual product -> advice-article mapping for names that differ between the
// requirements list and the advice article titles. Value = article id, or
// null when no advice article exists (verified by searching all titles).
const ADVICE_OVERRIDES = {
  'Luxury Graphic Circle Necklace': '40694536991889',
  'Luxury Graphic Heart Necklace': '40694536991889',
  'Luxury Graphic Dog Tag Necklace': '40694536991889',
  'Non-MC Engraved Heart Necklace': '40863945154833',
  'Non-MC Engraved Dog Tag Necklace': '40867100427409',
  'Engraved 4-Sided Stick Necklace': '38930947116817',
  'Engraved Stainless Steel Cross Necklace (Ball Chain)': '40869084321553',
  'Engraved Baby Feet Necklace with Birthstone': '40933916111377',
  'Engraved Kid Charm Necklace': '40934033674129',
  'Graduation Name Necklace': '43218920915729',
  'Artisan Cross Necklace (Snake Chain)': '38546752889617',
  'Personalized Cross Necklace with Snake Chain': '38546752889617',
  'Artisan Cross with Cuban Link Chain': '38546752889617',
  'Cuban Link Chain with Engraved Artisan Cross': '38546752889617',
  "Personalized Men's Name Bracelet": '47108957691921',
  'Alluring Beauty Necklace with Rotating Rose Box': '28912266433425',
  'Forever Love Necklace with Rotating Rose Gift Box': '28912266433425',
  'Love Knot Necklace with Rotating Rose Gift Box': '28912266433425',
  'Alluring Beauty Necklace with Red Heart Rose Box': '38743725423633',
  'Forever Love Necklace with Red Heart Rose Box': '38743725423633',
  'Love Knot Necklace with Red Heart Rose Box': '38743725423633',
  'Acrylic Heart Plaque (no wooden base)': '41155584438545',
  'Acrylic Paw Print Plaque': '41330540549265',
  'Acrylic Circle Ornament': '39400416952849',
  'Acrylic Heart Ornament': '39400416952849',
  'Acrylic Paw Ornament': '39400416952849',
  'Acrylic Star Ornament': '39400416952849',
  'Acrylic Tree Ornament': '39400416952849',
  'Custom Cut Printed Acrylic Plaque Single Sided': '51606681456273',
  'Custom Cut Printed Acrylic Plaque Double Sided': '51606681456273',
  'Custom Cut Acrylic Ornament Single Sided': '51607168426129',
  'Custom Cut Acrylic Ornament Double Sided': '51607168426129',
  'Engraved Acrylic Paw Plaque': '41568490376337',
  'Non-MC Black Chronograph Watch with Engraving': null,
  'Non-MC Wood Watch with Engraving': null,
  'Open Work Watch with MC': null,
  'Wooden Watch with MC': null,
  'Black Chronograph Watch with MC': null,
  'Non-MC Luxury Circle Bangle': '41757302669201',
  'Non-MC Luxury Heart Bangle': '41757155314065',
  'Non-MC Luxury Heart Bangle with Engraving': '40405448078993',
  "Men's Cross Bracelet": '41795536794257',
  'Engraved Nylon Bracelet': '49282359685265',
  'Graphic Circle Keychain': '41835956747921',
  'Graphic Heart Keychain': '41835956747921',
  'Graphic Dog Tag Keychain': '41835956747921',
  'Buyer Upload Graphic Circle Keychain': '41876476977041',
  'Buyer Upload Graphic Heart Keychain': '41876431713297',
  'Buyer Upload Graphic Dog Tag Keychain': '41876479972369',
  'Engraved Screwdriver Keychain': '39108914104593',
  "Engraved Men's Ring": '45406551287057',
  "Engraved Women's Ring": '45406551287057',
  'Engraved Wallet Card': '24749970796305',
  'Stackable Birthstone Ring': '47108931449745',
  'Love Knot Necklace & Earring Set': null,
  'Alluring Beauty Necklace & Earring Set': null,
  'Eternal Hope Necklace & Earring Set': null,
  'Forever Love Necklace & Earring Set': null,
  'Acrylic Heart & Sweetest Devotion Flower Bouquet': null,
  'Love Knot Necklace & Sweetest Devotion Flower Bouquet': null,
  'Forever Love Necklace & Sweetest Devotion Flower Bouquet': null,
  'Alluring Beauty Necklace & Sweetest Devotion Flower Bouquet': null,
  'Keepsake Acrylic & Stainless Steel Cross': '27221790572433',
  'Keepsake Acrylic & Love Knot Necklace': '27221790572433',
  'Keepsake Acrylic & Forever Love Necklace': '27221790572433',
  'Keepsake Acrylic & Alluring Beauty Necklace': '27221790572433',
  'Keepsake Acrylic & Graduation Name Necklace': '44645394642961',
  'Keepsake Acrylic with Paw Print Name Necklace': '45745068768401',
  'Printed Canvas Poster (8" x 10")': '52689019580817',
  'Printed Canvas Poster (9" x 12")': '52689019580817',
  'Printed Canvas Poster (11" x 14")': '52689019580817',
  'Printed Canvas Poster (12" x 16")': '52689019580817',
  'Classic Tote Bag': '21774259141521',
  'Weekender Tote Rope Handle': '22402584800401',
  'Weekender Tote Woven Handle': '22402584800401',
  'Fabric Zippered Pouch Large': '32263988029841',
  'Fabric Zippered Pouch Small': '32263988029841',
  'Coral Fleece Blanket (3:4)': '26294320920209',
  'Coral Fleece Blanket (4:3)': '26294320920209',
  'Mink Touch Blanket (3:4)': '26295131841041',
  'Mink Touch Blanket (4:3)': '26295131841041',
  'Jersey Fleece Blanket Portrait': '26295746311697',
  'Jersey Fleece Blanket Landscape': '26295746311697',
  'Sherpa Fleece Blanket (3:4)': '26296079649681',
  'Sherpa Fleece Blanket (4:3)': '26296079649681',
  'Printed Woven Blanket Landscape': '33586773895057',
  'Printed Woven Blanket Portrait': '33586773895057',
  'Classic Pillow with Insert': '24144599883281',
  'Pinnacle 40oz Tumbler': '26479983582609',
  '12oz Enamel Camping Mug': '28150413312401',
  'White Ceramic Mug (11oz)': '26108009369745',
  'White Ceramic Mug (15oz)': '28150339427089',
  'Black Ceramic Mug (11oz)': '28150261026577',
  'Black Ceramic Mug (15oz)': '28328115496721',
  'Color Accent Mug (11oz)': '37181743146897',
  'Color Accent Mug (15oz)': '37181743146897',
  'Acrylic Holiday Ornament': null,
  'High Gloss Star Ornament': '28149049279633',
  'High Gloss Heart Ornament': '28149049279633',
  'High Gloss Oval Ornament': '28149049279633',
  'Puzzle 16"x20" (Large)': '26480009635473',
  'Puzzle 8"x10" (Small)': '26480009635473',
  'Wooden Frame 10" Clock': '26479905424273',
  'Wood Framed Wall Tapestry (Portrait)': '35132780808081',
  'Wood Framed Wall Tapestry (Landscape)': '35132780808081',
  'Oversized Women\'s DTG Denim Jacket': '22402679826321',
  "Men's DTG Denim Jacket": '26078219766545',
  'Bella + Canvas 3001 Unisex T-Shirt Front Print': '24115968812561',
  'Bella + Canvas 3719 Unisex Pullover Hoodie Front Print': '24116822855441',
  'Bella + Canvas 3945 Unisex Crewneck Sweatshirt Front Print': '24116384176401',
  'Bella + Canvas 3001Y Unisex Youth T-Shirt Front Print': '24750732712465',
  'Bella + Canvas 3719Y Unisex Youth Pullover Hoodie Front Print': '24751063979665',
  'Bella + Canvas 3001T Toddler Jersey Tee Front Print': '24774302934417',
  'Bella + Canvas 3001B Baby Jersey Tee Front Print': '24775716132369',
  'Gildan 18500 Unisex Hooded Sweatshirt Front Print': '24866618619025',
  'Gildan 18000 Unisex Crewneck Sweatshirt Front Print': '24864629791761',
  'Bella + Canvas 3001 Unisex T-Shirt Back Print': '24776726592145',
  'Bella + Canvas 3945 Unisex Crewneck Sweatshirt Back Print': '24777682497297',
  'Bella + Canvas 3719 Unisex Pullover Hoodie Back Print': '24778505419409',
  'Bella + Canvas 3480 Unisex Jersey Tank Front Print': '25281576424721',
  'Bella + Canvas 3480Y Kids Jersey Tank Top Front Print': '25283997328401',
  'Gerber ONESIES 6516A Short Sleeve Bodysuit Front Print': '25286210969617',
  'Plate': '33268929851921',
  'Bowl': '33270672304529',
  'Platter': '33267394918289',
  'Apron': '24114872317969',
  'Stainless Cross Necklace': null,
  'Buyer Upload Luxury Heart Bangle with MC': '41647975507601',
  'Buyer Upload Luxury Circle Bangle with MC': '41648033446161',
};
// Product families that share one advice article.
const ADVICE_FAMILY = [
  [/^(Photo|Artwork) Heirloom Woven Blanket/, '25043378578193'],
  [/^High Gloss Metal Art Print/, '34280301976465'],
  [/^High Gloss Poster/, '24141061297681'],
  [/^Matte Poster/, '24141660648849'],
  [/^Gallery Wrapped Canvas/, '29778120583697'],
];

// Categories whose 1000x1000 PNG artwork is the POD message card. Basis:
// ShineOn "Catalog Overview" > "Message Card Products" list, the
// "Design Advice - Message Cards" article (cards are 1000x1000), and each
// product's advice article ("For the message card, transparency can be used").
const CATEGORY_IDS = {
  'Simple Pendants': 'simple-pendants', Graphic: 'graphic-jewelry', 'Buyer Upload': 'buyer-upload',
  Engraved: 'engraved-necklaces', 'Name Necklace': 'name-necklaces', "Men's": 'mens-jewelry',
  'Unique Gift Boxes': 'gift-boxes', 'Printed Acrylic': 'printed-acrylic', 'Engraved Acrylic': 'engraved-acrylic',
  Watches: 'watches', Bracelets: 'bracelets-bangles', Keychains: 'keychains', 'Engraved Gifts': 'engraved-gifts',
  Rings: 'rings', 'Leather Products': 'leather', Bundles: 'bundles', Posters: 'posters', Bags: 'bags',
  Blankets: 'blankets', Pillows: 'pillows', 'Rubber Backed Mats': 'mats', Towels: 'towels', Table: 'tableware',
  Kitchen: 'kitchen', Seasonal: 'seasonal', 'Office & Crafts': 'office-crafts', 'Toys & Games': 'toys-games',
  'Wall Clocks': 'wall-clocks', 'Wall Tapestries': 'wall-tapestries', 'Metal Prints': 'metal-prints',
  'Gallery Wrapped Canvas': 'gallery-canvas', Apparel: 'apparel',
};

function slug(s) { return s.toLowerCase().replace(/["”″]/g, 'in').replace(/[’']/g, '').replace(/&/g, 'and').replace(/\+/g, 'plus').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

function requirementsSection(lines) {
  const s = lines.findIndex((l) => /^Artwork Requirements/i.test(l));
  if (s < 0) return [];
  const e = lines.findIndex((l, i) => i > s && /^(Physical Features|Shipping Details|Care Instructions|Product Features|Features)\b/i.test(l));
  return lines.slice(s + 1, e < 0 ? s + 25 : e);
}

function parseSpec(segment) {
  const toks = segment.split(/\s+-\s+/).map((t) => t.trim()).filter(Boolean);
  const spec = { dpiRaw: null, dpi: null, dims: [], maxMB: null, formatRaw: null, formats: [], notes: [] };
  for (const t of toks) {
    let m;
    if ((m = t.match(/^(\d+|Any)\s*DPI$/i))) { spec.dpiRaw = t; spec.dpi = /any/i.test(m[1]) ? 'any' : Number(m[1]); continue; }
    if ((m = t.match(/^Under\s*(\d+)\s*MB$/i))) { spec.maxMB = Number(m[1]); continue; }
    if ((m = t.match(/^(\d{3,5})\s*([x\-])\s*(\d{3,5})(?:\s+(FRONT|BACK))?$/i))) {
      spec.dims.push({ w: Number(m[1]), h: Number(m[3]), label: m[4] ? m[4][0] + m[4].slice(1).toLowerCase() : null, separator: m[2] });
      continue;
    }
    if (/^(PNG|SVG|JPG|JPEG)([\s,/&]+(PNG|SVG|JPG|JPEG|&))*$/i.test(t.replace(/\s*&\s*/g, ' & '))) {
      spec.formatRaw = t;
      spec.formats = [...new Set(t.toUpperCase().match(/PNG|SVG|JPE?G/g).map((f) => (f === 'JPEG' ? 'JPG' : f)))];
      continue;
    }
    spec.notes.push(t);
  }
  return spec;
}

function main_parseRequirements(lines) {
  const products = [];
  let section = null;
  let started = false;
  for (const raw of lines) {
    const plain = stripLinks(raw).trim();
    const sec = plain.match(/^(.+?)\s*\((ShineOn|SPP)\)$/);
    if (sec) { section = { name: sec[1].trim(), partner: sec[2] }; started = true; continue; }
    if (!started || !section) continue;
    if (/discontinued/i.test(plain) && !/\[/.test(raw)) {
      products.push({ discontinuedLine: plain, section });
      continue;
    }
    const ls = links(raw);
    if (!ls.length || !plain.includes(':')) continue;
    // Spec segment: text between ':' after the template link and the "Product Link" token.
    const afterColon = plain.slice(plain.indexOf(':', plain.indexOf(ls[0].text) + ls[0].text.length) + 1);
    const specPart = afterColon.split(/\s+-\s+(?:P(?:r)?oduct Link)/i)[0];
    const tail = plain.slice(plain.search(/P(?:r)?oduct Link/i));
    products.push({ raw, plain, section, ls, spec: parseSpec(specPart.trim()), tail });
  }
  return products;
}

function linkBy(ls, re) { const l = ls.find((x) => re.test(x.text)); return l ? l.href : null; }

function analyseAdvice(art) {
  if (!art) return null;
  const lines = htmlToLines(art.body || '');
  const req = requirementsSection(lines);
  const reqText = req.map(stripLinks).join(' ');
  const all = lines.map(stripLinks).join(' ');
  const r = { id: String(art.id), title: art.title, url: art.html_url, updated: art.updated_at.slice(0, 10), reqText, allText: all, reqLines: req };
  const tSentence = (reqText.match(/[^.]*transparen[^.]*\./i) || [null])[0];
  r.transparencyQuote = tSentence ? tSentence.trim() : null;
  if (tSentence) r.transparency = /\brequired\b/i.test(tSentence) && !/not/i.test(tSentence) ? 'required' : /should not|not be used|not compatible|cannot be used|can't be used/i.test(tSentence) ? 'not-allowed' : /can be used|supports|allowed/i.test(tSentence) ? 'allowed' : null;
  r.solidBlack = /solid black colou?r/i.test(reqText);
  r.blackRequired = /black artwork (are|is) required/i.test(reqText);
  const bgRule = reqText.match(/[^.]*(avoid using a solid black background|transparent parts being the colou?r of[^.]*)[^.]*\./i);
  r.colorNote = bgRule ? bgRule[0].trim() : null;
  r.dims = [...reqText.matchAll(/(\d{3,5})\s*x\s*(\d{3,5})/gi)].map((m) => `${m[1]}x${m[2]}`);
  r.maxMB = [...reqText.matchAll(/under\s*(\d+)\s*mb/gi)].map((m) => Number(m[1]));
  r.dpi = [...reqText.matchAll(/(\d{2,3})\s*dpi/gi)].map((m) => Number(m[1]));
  r.formats = [...new Set((reqText.match(/\.(PNG|SVG|JPE?G)\b/gi) || []).map((f) => f.slice(1).toUpperCase().replace('JPEG', 'JPG')))];
  r.luxuryBox = /luxury box/i.test(all);
  r.mcOptional = /with\]? or \[?without\]? a POD Message Card|with or without a POD Message Card/i.test(all);
  r.mcMention = /message card/i.test(reqText) || r.mcOptional;
  r.cutlineAuto = /cutline[^.]*generated/i.test(all);
  r.blankMockups = links(lines.join('\n')).filter((l) => /mock-?up/i.test(l.text) && /canto|drive|dropbox/i.test(l.href)).map((l) => ({ label: l.text, url: l.href }));
  r.physical = (lines.map(stripLinks).find((l) => /\b\d+(\.\d+)?\s*("|”|inch|in\b|mm|cm)/i.test(l) && !/shipping/i.test(l)) || null);
  return r;
}

function classifyRole(p) {
  const cat = p.section.name; const name = p.name; const f = p.spec.formats; const d = p.spec.dims[0];
  const isEngraveSvg = f.length === 1 && f[0] === 'SVG';
  if (isEngraveSvg) return { role: 'engraving', basis: 'ShineOn lists this product as SVG-only; engraved products "require a vector SVG file" (Catalog Overview > Engraved Products).' };
  if (/engraved (metal|leather)/i.test(name) || name === 'Engraved Leather Wallet Inner Section') return { role: 'engraving', basis: 'Engraved product; advice article: "Although engraved, this product supports .SVG & .PNG" / engraving has no color.' };
  if (/custom cut/i.test(name)) return { role: 'printed', basis: 'Printed acrylic; ShineOn generates the cutline from uploaded artwork.' };
  if (cat === 'Graphic' || (/graphic/i.test(name) && cat === 'Keychains' && !/buyer upload/i.test(name)) || /^Non-MC Luxury (Circle|Heart) Bangle$/.test(name)) return { role: 'graphic', basis: 'Graphic jewelry: design is transferred to the product surface and sealed under a glass-like dome (Catalog Overview > Graphical Jewelry).' };
  const mcCats = ['Simple Pendants', 'Name Necklace', "Men's", 'Unique Gift Boxes', 'Rings', 'Buyer Upload'];
  if (/with MC\b/i.test(name)) return { role: 'message-card', basis: 'Product name includes "with MC" (POD Message Card).' };
  if (cat === 'Unique Gift Boxes') return /rotating/i.test(name)
    ? { role: 'message-card', basis: 'ShineOn\'s Catalog Overview lists the "Rotating Rose Box with a Love Knot Necklace" under Message Card Products; the advice article gives the 650x602 "Rotating Rose Box template".' }
    : { role: 'message-card', basis: 'Gift-box presentation artwork (780x780 "Red Heart Rose Box template"). ShineOn does not state exactly where it is placed in the box — open the official template to confirm placement.' };
  if (mcCats.includes(cat) && d && d.w === 1000 && d.h === 1000) return { role: 'message-card', basis: 'Listed among ShineOn Message Card Products; Message Cards are 1000x1000 ("Design Advice - Message Cards").' };
  if (['Bracelets', 'Engraved', 'Engraved Gifts', 'Bundles', 'Keychains'].includes(cat) && d && d.w === 1000 && d.h === 1000 && f.includes('PNG') && f.length === 1)
    return { role: 'message-card', basis: '1000x1000 PNG on a jewelry product; ShineOn engraves the buyer\'s text itself and the uploaded artwork is the POD message card (Catalog Overview > Message Card Products; product advice article).' };
  return { role: 'printed', basis: 'Artwork is printed directly onto the product.' };
}

const ROLE_LABEL = { 'message-card': 'Message card', graphic: 'Graphic artwork (printed on jewelry)', engraving: 'Engraving artwork', printed: 'Printed artwork' };

function shapeFor(p) {
  const n = p.name.toLowerCase();
  if (p.role === 'message-card') return 'card';
  if (/dog tag/.test(n)) return 'dogtag';
  if (/watch/.test(n)) return 'circle';
  if (/heart/.test(n)) return 'heart';
  if (/circle|clock|plate|bowl/.test(n)) return 'circle';
  if (/star/.test(n)) return 'star';
  if (/paw/.test(n)) return 'paw';
  if (/dome/.test(n)) return 'dome';
  if (/mug|tumbler/.test(n)) return 'wrap';
  if (/t-shirt|hoodie|sweatshirt|tank|tee|onesie|bodysuit|jacket/.test(n)) return 'apparel';
  return 'rect';
}

async function main() {
  console.log('Fetching ShineOn help center…');
  const arts = await allArticles();
  const byId = new Map(arts.map((a) => [String(a.id), a]));
  const reqArt = byId.get(REQ_ID); const catArt = byId.get(CATALOG_ID); const mcArt = byId.get(MC_ID);
  if (!reqArt) throw new Error('Requirements article not found');
  const reqLines = htmlToLines(reqArt.body);
  const parsed = main_parseRequirements(reqLines);
  const adviceArts = arts.filter((a) => /advice/i.test(a.title));
  const adviceByNorm = new Map(adviceArts.map((a) => [norm(a.title), a]));
  const mcAdvice = analyseAdvice(mcArt);
  const catalogText = htmlToLines(catArt.body).map(stripLinks).join('\n');

  const products = []; const discontinued = []; const unmatched = [];
  const seen = new Set();
  for (const p of parsed) {
    if (p.discontinuedLine) { discontinued.push({ line: p.discontinuedLine, category: p.section.name, partner: p.section.partner }); continue; }
    let name = p.ls[0].text.replace(/\s+/g, ' ').trim();
    let availability = 'available';
    if (/^out of stock/i.test(p.plain)) { availability = 'out-of-stock'; name = p.ls.find((l) => !/^out of stock/i.test(l.text)).text.trim(); }
    const nameLink = p.ls.find((l) => l.text.trim() === name);
    const canva = p.ls.find((l) => /canva/i.test(l.text));
    const tags = []; if (/EB Exclusive/i.test(p.tail)) tags.push('Empire Builder Exclusive'); if (/Shopify Only/i.test(p.tail)) tags.push('Shopify Only');
    const rec = { name, section: p.section, spec: p.spec };
    Object.assign(rec, classifyRole(rec));

    // advice
    let advId = Object.prototype.hasOwnProperty.call(ADVICE_OVERRIDES, name) ? ADVICE_OVERRIDES[name] : undefined;
    if (advId === undefined) { const fam = ADVICE_FAMILY.find(([re]) => re.test(name)); if (fam) advId = fam[1]; }
    let advArt = advId ? byId.get(advId) : null;
    if (advId === undefined) { advArt = adviceByNorm.get(norm(name)) || null; if (!advArt) unmatched.push(name); }
    const adv = analyseAdvice(advArt);

    const reasons = []; const discrepancies = [];
    // dimensions
    const surfaces = p.spec.dims.map((d, i) => ({ id: d.label ? d.label.toLowerCase() : (i === 0 ? 'front' : `surface-${i + 1}`), label: d.label || 'Artwork', width: d.w, height: d.h }));
    if (!surfaces.length) reasons.push('No pixel dimensions stated in the requirements list.');
    const resolved = [];
    p.spec.dims.forEach((d) => {
      const msg = `Requirements list writes the size as "${d.w}-${d.h}" (dash instead of "x"); read as ${d.w}x${d.h}.`;
      if (d.separator !== '-') return;
      if (adv && adv.dims.includes(`${d.w}x${d.h}`)) resolved.push(msg + ' Confirmed by the advice article.');
      else discrepancies.push(msg);
    });
    let maxMB = p.spec.maxMB;
    if (/double sided/i.test(name) && surfaces.length === 1) {
      surfaces[0] = { ...surfaces[0], id: 'side-a', label: 'Side A' };
      surfaces.push({ id: 'side-b', label: 'Side B', width: surfaces[0].width, height: surfaces[0].height, assumedSameAsSideA: true });
      reasons.push('Double-sided product: ShineOn publishes one artwork size and does not state whether Side B needs a separate file. Side B is offered at the same size; confirm in the ShineOn product editor.');
    }
    if (p.spec.dpi === null) reasons.push('DPI is not stated in the requirements list.');
    if (p.spec.maxMB === null && !(adv && adv.maxMB.length)) reasons.push('Maximum file size is not stated in the requirements list or the advice article.');
    if (!p.spec.formats.length) reasons.push('File format is not stated in the requirements list.');

    // cross-check with advice article
    if (adv) {
      if (adv.dims.length && surfaces.length) {
        for (const s of surfaces) if (!s.assumedSameAsSideA && !adv.dims.includes(`${s.width}x${s.height}`)) discrepancies.push(`Requirements list says ${s.width}x${s.height}; the product's advice article states ${[...new Set(adv.dims)].join(', ')}.`);
      }
      if (adv.maxMB.length && p.spec.maxMB !== null && !adv.maxMB.includes(p.spec.maxMB)) {
        maxMB = Math.min(p.spec.maxMB, ...adv.maxMB);
        resolved.push(`File-size limits disagree (requirements list: under ${p.spec.maxMB}MB; advice article: under ${[...new Set(adv.maxMB)].join('/')}MB). The studio enforces the stricter limit (${maxMB}MB), which satisfies both.`);
      }
      if (adv.maxMB.length && p.spec.maxMB === null) { maxMB = Math.min(...adv.maxMB); resolved.push(`Requirements list gives no file-size limit; the advice article says under ${maxMB}MB.`); }
      if (adv.dpi.length && typeof p.spec.dpi === 'number' && !adv.dpi.includes(p.spec.dpi)) discrepancies.push(`Requirements list says ${p.spec.dpi} DPI; the advice article says ${[...new Set(adv.dpi)].join('/')} DPI.`);
      if (adv.formats.length && p.spec.formats.length && !adv.formats.some((f) => p.spec.formats.includes(f))) discrepancies.push(`Requirements list says ${p.spec.formatRaw}; the advice article mentions ${adv.formats.join('/')}.`);
    } else {
      reasons.push('ShineOn has no product-specific "Design and Care Advice" article for this product, so the requirements-list entry could not be cross-checked (transparency/colour rules not published).');
    }
    if (discrepancies.length) reasons.push('Official sources disagree — see discrepancies.');

    // transparency
    let transparency = 'unspecified'; let transparencySource = null;
    if (adv && adv.transparency) { transparency = adv.transparency; transparencySource = { quote: adv.transparencyQuote, url: adv.url }; }
    else if (rec.role === 'message-card' && mcAdvice) { transparency = 'unspecified'; }
    if (transparency === 'unspecified' && ['Wall Tapestries', 'Metal Prints', 'Posters', 'Gallery Wrapped Canvas'].includes(p.section.name)) { transparency = 'not-allowed'; transparencySource = { quote: 'Wall Art: "These products are not compatible with Transparent Artwork"', url: catArt.html_url }; }
    if (transparency === 'unspecified' && p.section.name === 'Bags') { transparency = 'not-allowed'; transparencySource = { quote: 'Bags: "Make sure not to use transparency when creating your design."', url: catArt.html_url }; }
    if (transparency === 'unspecified' && p.spec.formats.length === 1 && p.spec.formats[0] === 'JPG') { transparency = 'not-allowed'; transparencySource = { quote: 'Required format is JPG, which cannot store transparency.', url: reqArt.html_url }; }

    // colour requirements
    const colorRequirements = [];
    if (adv?.blackRequired) colorRequirements.push({ rule: 'note', text: adv.transparencyQuote, url: adv.url });
    if (adv?.solidBlack) colorRequirements.push({ rule: 'solid-black', text: 'Design must be a solid black colour (engraving).', url: adv.url });
    if (adv?.colorNote) colorRequirements.push({ rule: 'note', text: adv.colorNote, url: adv.url });
    if (rec.role === 'engraving' && !adv?.solidBlack) colorRequirements.push({ rule: 'engraved-no-color', text: 'Engraved: the design is engraved, so colour is not reproduced. ShineOn does not publish a colour rule for this product.', url: adv?.url || catArt.html_url });
    if (rec.role === 'message-card' && mcAdvice) colorRequirements.push({ rule: 'rgb', text: 'Message cards are converted to PNG/RGB; design in RGB for accurate colour.', url: mcAdvice.url });

    // safe area / bleed
    const safeArea = rec.role === 'message-card'
      ? { status: 'official-guidance-no-numbers', text: 'Keep text away from the edges; leave space in the middle for the jewelry piece. ShineOn publishes no numeric safe area — the official template shows placement.', url: mcAdvice?.url }
      : { status: 'see-official-template', text: 'ShineOn does not publish numeric safe-area values in the Help Center. Official template files "contain information on safe zones, bleed, and pixel size requirements".', url: `${HC}/hc/en-us/articles/13354007710481` };
    const bleed = rec.role === 'message-card'
      ? { status: 'official-guidance-no-numbers', text: 'ShineOn cuts "a tiny amount" into the design (bleed); amount not published.', url: mcAdvice?.url }
      : { status: 'see-official-template', text: 'Bleed (if any) is marked on the official template; not published as numbers.', url: `${HC}/hc/en-us/articles/13354007710481` };

    // variants
    const variants = [];
    if (adv?.luxuryBox && rec.role === 'message-card') {
      variants.push({ id: 'standard-box', label: 'Standard box + message card', specStatus: 'VERIFIED', note: 'Card artwork per this product\'s spec.' });
      variants.push({ id: 'luxury-box', label: 'Luxury box + message card', specStatus: 'NEEDS VERIFICATION', note: 'ShineOn says this product "comes with a Standard or Luxury box option" but publishes no separate luxury-card artwork spec. The same card spec is used here; confirm in the ShineOn product editor.' });
    }
    if (adv?.mcOptional) variants.push({ id: 'without-mc', label: 'Without message card', note: 'ShineOn sells this product with or without a POD message card. Artwork is only needed for the message card version.' });

    // artwork types available in the studio for this product
    const artworkTypes = [rec.role];
    if (/buyer upload/i.test(name)) artworkTypes.push('buyer-upload');
    if (/name/i.test(name) && rec.role === 'message-card') artworkTypes.push('personalized-name');
    if (surfaces.length > 1) artworkTypes.push('multi-surface');

    const specStatus = availability !== 'available' && false ? 'BLOCKED' : (reasons.length ? 'NEEDS VERIFICATION' : 'VERIFIED');
    let id = `${p.section.partner.toLowerCase()}-${slug(name)}`; let n = 2; while (seen.has(id)) id = `${p.section.partner.toLowerCase()}-${slug(name)}-${n++}`; seen.add(id);

    const exportFormats = p.spec.formats.length ? p.spec.formats : [];
    products.push({
      id, name,
      category: p.section.name, categoryId: CATEGORY_IDS[p.section.name] || slug(p.section.name),
      productionPartner: p.section.partner,
      availability, tags,
      artworkRole: rec.role, artworkRoleLabel: ROLE_LABEL[rec.role], artworkRoleBasis: rec.basis, artworkTypes,
      previewShape: shapeFor({ name, role: rec.role }),
      surfaces,
      dpi: p.spec.dpi, dpiText: p.spec.dpiRaw,
      formats: exportFormats, formatText: p.spec.formatRaw,
      maxFileSizeMB: maxMB,
      maxFileSizeListed: p.spec.maxMB,
      transparency, transparencySource,
      colorRequirements,
      safeArea, bleed,
      cutline: adv?.cutlineAuto ? 'ShineOn generates the cutline (and hanging hole) automatically from your artwork.' : null,
      physicalSize: adv?.physical || null,
      variants,
      links: {
        officialTemplate: nameLink ? nameLink.href : null,
        canvaTemplate: canva && !/unavailable/i.test(canva.text) ? canva.href : null,
        canvaTemplateStatus: canva ? (/unavailable/i.test(canva.text) ? 'unavailable' : 'available') : (/canva template unavailable/i.test(p.plain) ? 'unavailable' : 'not-listed'),
        product: linkBy(p.ls, /^p(r)?oduct link/i),
        mockup: linkBy(p.ls, /^mockup link/i),
        premadeDesigns: linkBy(p.ls, /^premade designs/i),
        advice: adv?.url || null,
        blankMockups: adv?.blankMockups || [],
      },
      sourceLine: p.plain,
      sources: [
        { title: reqArt.title, url: reqArt.html_url, updated: reqArt.updated_at.slice(0, 10) },
        ...(adv ? [{ title: adv.title, url: adv.url, updated: adv.updated }] : []),
        ...(rec.role === 'message-card' && mcAdvice ? [{ title: mcAdvice.title, url: mcAdvice.url, updated: mcAdvice.updated }] : []),
      ],
      discrepancies,
      resolvedNotes: resolved,
      statusReasons: reasons,
      specStatus,
      lastVerified: TODAY,
    });
  }

  const categories = [];
  for (const p of products) {
    let c = categories.find((x) => x.id === p.categoryId && x.productionPartner === p.productionPartner);
    if (!c) categories.push(c = { id: p.categoryId, name: p.category, productionPartner: p.productionPartner, count: 0 });
    c.count++;
  }

  const db = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    lastVerified: TODAY,
    generator: 'tools/audit-shineon.mjs',
    sources: [
      { id: REQ_ID, title: reqArt.title, url: reqArt.html_url, updated: reqArt.updated_at },
      { id: CATALOG_ID, title: catArt.title, url: catArt.html_url, updated: catArt.updated_at },
      { id: MC_ID, title: mcArt.title, url: mcArt.html_url, updated: mcArt.updated_at },
    ],
    notes: [
      'Production partner "SPP" products are produced by ShineOn\'s partner SPP, not manufactured by ShineOn.',
      'Official template links point to ShineOn\'s Canto portal and Canva. Canva templates open in preview mode; using one requires a (free) Canva account. ShineOn "Product Link" URLs open the ShineOn app and require a ShineOn login.',
      'ShineOn does not publish numeric safe-area or bleed values in its Help Center; they are drawn on the official template files.',
    ],
    messageCardSpec: mcAdvice ? { text: 'Message cards are about 3 x 3 inches, 1000 x 1000 pixels; 300 DPI recommended; keep text away from edges; leave the middle free for the jewelry; RGB.', url: mcAdvice.url, updated: mcAdvice.updated } : null,
    discontinued,
    categories,
    products,
  };
  fs.writeFileSync(path.join(ROOT, 'public/data/products.json'), JSON.stringify(db, null, 2));

  // ---- audit report ----
  const L = [];
  L.push('# ShineOn Specification Audit', '', `Generated ${db.generatedAt} by \`tools/audit-shineon.mjs\` from ShineOn's public Help Center.`, '');
  L.push('| Source | Last updated by ShineOn |', '|---|---|', ...db.sources.map((s) => `| [${s.title}](${s.url}) | ${s.updated.slice(0, 10)} |`), '');
  const v = products.filter((p) => p.specStatus === 'VERIFIED').length;
  L.push(`**${products.length} artwork-accepting products** (${products.filter((p) => p.productionPartner === 'ShineOn').length} ShineOn, ${products.filter((p) => p.productionPartner === 'SPP').length} SPP) in ${categories.length} categories.`, '');
  L.push(`- VERIFIED (all fields stated, cross-checked against the product advice article): **${v}**`, `- NEEDS VERIFICATION: **${products.length - v}**`, `- Listed as discontinued by ShineOn (excluded): ${discontinued.map((d) => d.line).join('; ') || 'none'}`, '');
  L.push('## Products needing verification', '', '| Product | Partner | Reason(s) |', '|---|---|---|');
  for (const p of products.filter((p) => p.specStatus !== 'VERIFIED')) L.push(`| ${p.name} | ${p.productionPartner} | ${[...p.statusReasons, ...p.discrepancies].join('<br>').replace(/\|/g, '\\|')} |`);
  L.push('', '## Full inventory', '', '| # | Product | Category | Partner | Role | Size(s) px | DPI | Format | Max | Transparency | Status |', '|---|---|---|---|---|---|---|---|---|---|---|');
  products.forEach((p, i) => L.push(`| ${i + 1} | ${p.name}${p.availability !== 'available' ? ` _(${p.availability})_` : ''} | ${p.category} | ${p.productionPartner} | ${p.artworkRoleLabel} | ${p.surfaces.map((s) => `${s.width}×${s.height}${p.surfaces.length > 1 ? ' ' + s.label : ''}`).join('<br>') || '—'} | ${p.dpi ?? '—'} | ${p.formats.join('/') || '—'} | ${p.maxFileSizeMB ? p.maxFileSizeMB + 'MB' : '—'} | ${p.transparency} | ${p.specStatus} |`));
  fs.writeFileSync(path.join(ROOT, 'docs/SPEC_AUDIT.md'), L.join('\n') + '\n');

  console.log(`Products: ${products.length}  verified: ${v}  needs verification: ${products.length - v}`);
  console.log(`Categories: ${categories.length}  discontinued lines: ${discontinued.length}`);
  if (unmatched.length) console.log('No advice article matched (add to ADVICE_OVERRIDES):\n  ' + unmatched.join('\n  '));
}

main().catch((e) => { console.error(e); process.exit(1); });
