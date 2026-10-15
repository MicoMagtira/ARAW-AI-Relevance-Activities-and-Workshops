// Generates the PWA icons from one 16x16 pixel sun/Ara mark (no dependencies).
// Run: node scripts/make-icons.mjs   (outputs are committed; re-run only when the mark changes)
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const C = { '.': '#FFF8EC', r: '#35408E', g: '#F5D89E', d: '#E8B84A', k: '#1F2550', c: '#FF7A59' };
const MARK = [
  '.......rr.......',
  '.......rr.......',
  '..r....rr....r..',
  '...r.......r....',
  '.....dgggd......',
  '....dggggggd....',
  '...dggggggggd...',
  'rr.ggkggggkggrr.',
  'rr.ggkggggkggrr.',
  '...ggggggggggd..',
  '...dgcgkkgcgd...',
  '....dgggggggd...',
  '...r.dgggggd.r..',
  '..r....rr....r..',
  '.......rr.......',
  '.......rr.......',
];
// keep the grid symmetric: mirror the left half so the mark is exact
const GRID = MARK.map((row) => row.slice(0, 8) + [...row.slice(0, 8)].reverse().join(''));

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

function crc32(buf) {
  let c;
  let crc = ~0;
  for (const byte of buf) {
    c = (crc ^ byte) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return ~crc >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'latin1');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/** size px square; the mark is drawn at a whole-number scale inside `safe` of the width, centred. */
function png(size, safe) {
  const scale = Math.max(1, Math.floor((size * safe) / 16));
  const offset = Math.floor((size - scale * 16) / 2);
  const bg = rgb(C['.']);
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const gx = Math.floor((x - offset) / scale);
      const gy = Math.floor((y - offset) / scale);
      const key = gx >= 0 && gx < 16 && gy >= 0 && gy < 16 ? GRID[gy][gx] : '.';
      const [r, g, b] = key === '.' ? bg : rgb(C[key]);
      const i = y * (size * 3 + 1) + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }
  const head = Buffer.alloc(13);
  head.writeUInt32BE(size, 0);
  head.writeUInt32BE(size, 4);
  head[8] = 8; // bit depth
  head[9] = 2; // truecolor
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

function svg() {
  const rects = [];
  GRID.forEach((row, y) => {
    let x = 0;
    while (x < 16) {
      const key = row[x];
      let end = x;
      while (end + 1 < 16 && row[end + 1] === key) end++;
      if (key !== '.') rects.push(`<rect x="${x}" y="${y}" width="${end - x + 1}" height="1" fill="${C[key]}"/>`);
      x = end + 1;
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges" role="img" aria-label="ARAW sun"><rect width="16" height="16" fill="${C['.']}"/>${rects.join('')}</svg>\n`;
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon.svg', svg());
writeFileSync('public/icons/icon-192.png', png(192, 1));
writeFileSync('public/icons/icon-512.png', png(512, 1));
// maskable: the important part stays inside the central 80% safe zone
writeFileSync('public/icons/icon-maskable-512.png', png(512, 0.8));
writeFileSync('public/icons/apple-touch-icon.png', png(180, 0.9));
console.log('icons written');
