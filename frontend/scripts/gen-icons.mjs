// Gera os ícones do PWA (PNG) sem dependências — só Node puro (zlib).
// Marca "F" escura sobre fundo lime, no estilo do .logo .mark do app.
// Rode com: node scripts/gen-icons.mjs  (regenera tudo em public/)
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../public');
mkdirSync(outDir, { recursive: true });

const LIME = [198, 242, 78, 255];
const DARK = [13, 16, 14, 255];

// --- encoder PNG (RGBA, 8-bit) ---
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // 10,11,12 = 0 (compression, filter, interlace)
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// --- desenho ---
function draw(size, { rounded, contentScale }) {
  const buf = Buffer.alloc(size * size * 4); // transparente
  const r = rounded ? size * 0.22 : 0;
  const set = (x, y, [rr, gg, bb, aa]) => {
    const i = (y * size + x) * 4;
    buf[i] = rr; buf[i + 1] = gg; buf[i + 2] = bb; buf[i + 3] = aa;
  };
  const inRounded = (x, y) => {
    if (!rounded) return true;
    const cx = Math.min(x, size - 1 - x);
    const cy = Math.min(y, size - 1 - y);
    if (cx >= r || cy >= r) return true;
    const dx = r - cx, dy = r - cy;
    return dx * dx + dy * dy <= r * r;
  };
  // fundo lime
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (inRounded(x, y)) set(x, y, LIME);

  // marca "F" escura, centralizada
  const fw = size * 0.42 * contentScale;
  const fh = size * 0.50 * contentScale;
  const fx = (size - fw) / 2;
  const fy = (size - fh) / 2;
  const stem = fw * 0.24;
  const barTop = fh * 0.22;
  const barMid = fh * 0.20;
  const midY = fy + fh * 0.42;
  const midW = fw * 0.80;
  const rect = (x0, y0, w, h) => {
    for (let y = Math.round(y0); y < Math.round(y0 + h); y++)
      for (let x = Math.round(x0); x < Math.round(x0 + w); x++)
        if (x >= 0 && y >= 0 && x < size && y < size) set(x, y, DARK);
  };
  rect(fx, fy, stem, fh);        // haste vertical
  rect(fx, fy, fw, barTop);      // barra de cima
  rect(fx, midY, midW, barMid);  // barra do meio

  return buf;
}

const targets = [
  { file: 'icon-192.png', size: 192, rounded: true, contentScale: 1 },
  { file: 'icon-512.png', size: 512, rounded: true, contentScale: 1 },
  { file: 'icon-maskable-512.png', size: 512, rounded: false, contentScale: 0.8 },
  { file: 'apple-touch-icon.png', size: 180, rounded: false, contentScale: 1 },
];
for (const t of targets) {
  const png = encodePng(t.size, t.size, draw(t.size, t));
  writeFileSync(join(outDir, t.file), png);
  console.log(`gerado ${t.file} (${t.size}x${t.size}, ${png.length} bytes)`);
}
