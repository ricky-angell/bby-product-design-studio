// Original vector decorations drawn in a 100×100 box. Vector, so they stay crisp
// and are valid for engraving SVG exports.
const circ = (cx, cy, r) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
const ell = (cx, cy, rx, ry) => `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0 Z`;
const flower = () => {
  let d = circ(50, 50, 12);
  for (let i = 0; i < 5; i++) { const a = (i * 72 - 90) * Math.PI / 180; d += ' ' + circ(+(50 + 27 * Math.cos(a)).toFixed(2), +(50 + 27 * Math.sin(a)).toFixed(2), 19); }
  return d;
};
const HEART = 'M50 96 C22 74 0 56 0 30 C0 13 13 0 29 0 C39 0 46 5 50 13 C54 5 61 0 71 0 C87 0 100 13 100 30 C100 56 78 74 50 96 Z';

export const DECORATIONS = [
  { id: 'heart', label: 'Heart', path: HEART, color: '#e0245e' },
  { id: 'two-hearts', label: 'Two hearts', path: 'M35 80 C17 66 3 54 3 37 C3 26 11 18 21 18 C28 18 32 21 35 27 C38 21 42 18 49 18 C59 18 67 26 67 37 C67 54 53 66 35 80 Z M68 70 C55 60 45 51 45 39 C45 31 51 25 58 25 C63 25 66 27 68 31 C70 27 73 25 78 25 C85 25 91 31 91 39 C91 51 81 60 68 70 Z', color: '#e0245e' },
  { id: 'star', label: 'Star', path: 'M50 2 L61.8 35.6 L97.6 36.4 L69 58.2 L79.4 92.4 L50 72 L20.6 92.4 L31 58.2 L2.4 36.4 L38.2 35.6 Z', color: '#ffc83d' },
  { id: 'sparkle', label: 'Sparkle', path: 'M50 0 C54 36 64 46 100 50 C64 54 54 64 50 100 C46 64 36 54 0 50 C36 46 46 36 50 0 Z', color: '#c0c7d2' },
  { id: 'paw', label: 'Paw print', path: [ell(50, 68, 22, 18), circ(22, 40, 9), circ(38, 22, 9), circ(62, 22, 9), circ(78, 40, 9)].join(' '), color: '#3b2a1a' },
  { id: 'cross', label: 'Cross', path: 'M42 0 H58 V28 H84 V44 H58 V100 H42 V44 H16 V28 H42 Z', color: '#1b2a4a', scale: 0.35 },
  { id: 'crown', label: 'Crown', path: 'M5 80 L15 30 L35 55 L50 20 L65 55 L85 30 L95 80 Z M5 86 H95 V96 H5 Z', color: '#d4a537' },
  { id: 'flower', label: 'Flower', path: flower(), color: '#f28cb1' },
  { id: 'butterfly', label: 'Butterfly', path: 'M50 30 C40 0 0 5 10 40 C15 55 35 55 48 50 C35 60 20 80 35 92 C45 98 50 80 50 60 C50 80 55 98 65 92 C80 80 65 60 52 50 C65 55 85 55 90 40 C100 5 60 0 50 30 Z', color: '#7b5cff' },
  { id: 'moon', label: 'Crescent moon', path: 'M60 5 A45 45 0 1 0 95 70 A36 36 0 1 1 60 5 Z', color: '#ffd76a' },
  { id: 'tree', label: 'Holiday tree', path: 'M50 0 L80 40 H65 L90 75 H58 V100 H42 V75 H10 L35 40 H20 Z', color: '#1f8a4c' },
  { id: 'grad-cap', label: 'Graduation cap', path: 'M50 10 L100 32 L50 54 L0 32 Z M22 44 V68 C22 78 78 78 78 68 V44 L50 58 Z', color: '#0b1530' },
  { id: 'divider', label: 'Divider', path: 'M0 48 H38 L50 34 L62 48 H100 V52 H62 L50 66 L38 52 H0 Z', color: '#c0c7d2', scale: 0.6 },
  { id: 'banner', label: 'Ribbon banner', path: 'M0 20 H100 L88 40 L100 60 H0 L12 40 Z', color: '#1f8bff', scale: 0.7 },
  { id: 'ring', label: 'Circle frame', path: 'M50 0 A50 50 0 1 1 49.99 0 Z M50 6 A44 44 0 1 0 50.01 6 Z', color: '#c0c7d2', scale: 0.7 },
  { id: 'heart-frame', label: 'Heart frame', path: `${HEART} M50 84 C73 66 92 51 92 31 C92 18 82 8 70 8 C61 8 55 13 50 22 C45 13 39 8 30 8 C18 8 8 18 8 31 C8 51 27 66 50 84 Z`, color: '#c0c7d2', scale: 0.7 },
];
