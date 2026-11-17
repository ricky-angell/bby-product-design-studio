// Bring-Your-Own-AI prompt builder. No AI APIs are called — students copy these
// prompts into their own ChatGPT / Claude / Gemini / Copilot accounts.

export const PURPOSES = [
  { id: 'jewelry', label: 'Jewelry artwork', hint: 'Artwork printed on a pendant, bangle or keychain.' },
  { id: 'personalized', label: 'Personalized graphic', hint: 'A design built around a name, date or initials (add the text in the Studio).' },
  { id: 'background', label: 'Background design', hint: 'A background you will put text or photos on.' },
  { id: 'engraving', label: 'Engraving concept', hint: 'Solid black line art you can trace to vector for engraving.' },
  { id: 'gift-message', label: 'Gift message (text)', hint: 'Ask an AI to write short, emotional card messages.' },
  { id: 'floral', label: 'Floral design', hint: 'Roses, wildflowers, botanical wreaths.' },
  { id: 'memorial', label: 'Memorial artwork', hint: 'Gentle remembrance designs — doves, angel wings, sunsets.' },
  { id: 'pet', label: 'Pet artwork', hint: 'Dogs, cats, paw prints, pet portraits from a photo.' },
  { id: 'family', label: 'Family artwork', hint: 'Family trees, mother & child, grandparents.' },
  { id: 'holiday', label: 'Holiday design', hint: 'Christmas, Valentine\'s, Mother\'s Day, Father\'s Day…' },
  { id: 'product', label: 'Product-specific artwork', hint: 'Let the product rules shape everything.' },
];

export const STYLES = ['Watercolor', 'Minimalist line art', 'Elegant vintage', 'Realistic painting', 'Cute cartoon', 'Boho', 'Modern geometric', 'Hand-drawn sketch', 'Stained glass', 'Retro 70s', 'Luxury gold foil look', 'Soft pastel'];

export const AI_TOOLS = [
  { name: 'ChatGPT', url: 'https://chatgpt.com/', note: 'Makes images and writes messages. Free plans have a small daily image limit.' },
  { name: 'Google Gemini', url: 'https://gemini.google.com/', note: 'Makes images and writes messages. Limits depend on your Google plan.' },
  { name: 'Microsoft Copilot', url: 'https://copilot.microsoft.com/', note: 'Makes images with a free Microsoft account (daily limits apply).' },
  { name: 'Claude', url: 'https://claude.ai/', note: 'Writes gift messages and can write simple SVG line art code. Claude does not create photos or painted images.' },
];

const AI_RATIOS = [[1, 1], [2, 3], [3, 2], [3, 4], [4, 3], [4, 5], [5, 4], [9, 16], [16, 9]];
export function nearestRatio(w, h) {
  const r = w / h; let best = AI_RATIOS[0];
  for (const x of AI_RATIOS) if (Math.abs(Math.log(x[0] / x[1] / r)) < Math.abs(Math.log(best[0] / best[1] / r))) best = x;
  return `${best[0]}:${best[1]}`;
}

const SUBJECTS = {
  floral: 'a lush arrangement of flowers',
  memorial: 'a peaceful remembrance scene with soft light, gentle doves or angel wings',
  pet: 'a beloved pet',
  family: 'a warm family theme',
  holiday: 'a festive holiday theme',
  jewelry: 'a small, bold, centred motif',
  personalized: 'a decorative frame or motif with an empty space where a name will be added later',
  background: 'a soft decorative background texture',
  engraving: 'a simple iconic motif',
  product: 'artwork suited to this product',
};

export function buildPrompt(product, surface, f) {
  const w = surface.width, h = surface.height;
  const ratio = nearestRatio(w, h);
  const role = product.artworkRole;
  const lines = []; const tips = [];
  const subject = [f.subject?.trim() || SUBJECTS[f.purpose] || 'artwork', f.recipient && `for ${f.recipient}`, f.occasion && `for ${f.occasion}`].filter(Boolean).join(' ');

  if (f.purpose === 'gift-message') {
    const maxWords = role === 'message-card' ? 25 : 40;
    const text = [
      `Write ${f.count || 10} short gift messages for a ${product.name}${f.recipient ? ` given to ${f.recipient}` : ''}${f.occasion ? ` for ${f.occasion}` : ''}.`,
      `Each message must be under ${maxWords} words${role === 'message-card' ? ' because it is printed on a small 3 × 3 inch card' : ''}.`,
      `Tone: ${f.mood || 'heartfelt and sincere'}. ${f.style ? `Style: ${f.style}.` : ''}`,
      'Make them emotionally specific, easy to read at a glance, and avoid clichés. Number them. No hashtags or emojis.',
      f.extra ? `Extra details: ${f.extra}` : '',
    ].filter(Boolean).join(' ');
    tips.push('Pick your favourite message, then add it in the Studio with the Text tool so the spelling and font are perfect.');
    tips.push('Short phrases sell best on message cards — ShineOn recommends short, emotionally punchy phrases.');
    return { prompt: text, kind: 'text', tips, ratio };
  }

  if (f.purpose === 'engraving' || role === 'engraving') {
    lines.push(`Create ${f.style ? `${f.style.toLowerCase()} ` : ''}stencil-style engraving artwork of ${subject}.`);
    lines.push('Pure solid black (#000000) shapes on a plain pure white background. No grey, no gradients, no shading, no textures, no shadows, no photo realism.');
    lines.push('Bold, clean, closed shapes with lines thick enough to engrave on a small metal or acrylic surface. Keep fine detail to a minimum.');
    lines.push(`Composition centred with generous empty margin around it. Aspect ratio ${ratio}.`);
    lines.push('Do not include any words, letters or numbers.');
    tips.push('After uploading, select the image and press "Trace to vector" — this converts it to solid black vector shapes that ShineOn can engrave.');
    tips.push(`Alternative: ask Claude or ChatGPT "Write an SVG (viewBox 0 0 ${w} ${h}) of ${subject} using only solid black filled paths, no strokes, no text, no gradients. Reply with only the SVG code." — then use "Paste SVG code" in the Studio.`);
  } else {
    lines.push(`Create ${f.style ? `a ${f.style.toLowerCase()} ` : 'an '}illustration of ${subject}.`);
    if (f.colors) lines.push(`Colour palette: ${f.colors}.`);
    if (f.mood) lines.push(`Mood: ${f.mood}.`);
    if (role === 'message-card') {
      lines.push('This is a square gift message card about 3 × 3 inches. A necklace will rest on the centre of the card, so keep the centre area soft, light and uncluttered.');
      lines.push('Place decorative elements around the edges and corners, but not touching the very edge (a little is trimmed in printing). Simple, elegant, high contrast.');
    } else if (role === 'graphic') {
      lines.push('This prints on a small piece of jewelry (about 1 inch). Use one bold, simple subject that fills the frame, high contrast, minimal fine detail, no thin lines.');
    } else if (/apparel|t-shirt|hoodie|sweatshirt|tank|tee|onesie|jacket/i.test(product.name)) {
      lines.push('Isolated graphic for a garment print — a single cohesive design, crisp edges, no background scenery, no mockup, no shirt shown.');
    } else {
      lines.push(`Full-bleed artwork for a printed ${product.name}. Fill the whole frame edge to edge; keep important details away from the edges.`);
    }
    lines.push(`Aspect ratio ${ratio}${ratio !== '1:1' ? ` (final size ${w}×${h}px)` : ''}. High resolution, sharp focus.`);
    if (product.transparency === 'allowed' && (role === 'graphic' || /apparel|tee|shirt|hoodie|sweatshirt|tank|onesie|jacket/i.test(product.name)) && f.transparent) lines.push('Transparent background (PNG).');
    if (product.transparency === 'not-allowed') lines.push('Solid, fully opaque background — no transparent areas, no white borders.');
    if (f.purpose === 'background') lines.push('Leave calm open space for text to be added later.');
    if (f.purpose === 'pet' && f.photo) lines.push('Use the attached photo of my pet as the reference and keep its exact markings and colours.');
    lines.push('Do not include any text, letters, words or numbers in the image.');
    if (f.extra) lines.push(f.extra);
    tips.push('Add names and messages in the Studio with the Text tool — AI image tools often misspell words.');
    if (Math.max(w, h) > 2048) tips.push(`This product needs ${w}×${h}px. Most AI tools output about 1024–2048px, so the Studio will warn you if the image is enlarged a lot. Download the largest size your AI tool offers.`);
    if (product.transparency === 'not-allowed') tips.push('This product does not accept transparency — the Studio fills any transparent area with your background colour when you build.');
    if (product.transparency === 'allowed' && f.transparent) tips.push('Not every AI tool supports transparent backgrounds. If you get a white background, it will print white.');
  }
  return { prompt: lines.join(' '), kind: 'image', tips, ratio };
}
