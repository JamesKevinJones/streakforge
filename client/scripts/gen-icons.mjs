// One-off PWA icon generator. No new dependencies: raw PNG encoding via
// Node's built-in zlib, pixels computed procedurally to match the app's
// flame/liquid-glass palette (#0a0a0c ground, #ff5b1f -> #ffb800 flame).
// Run once with `node scripts/gen-icons.mjs`; safe to delete after Phase 3
// if hand-designed icons ever replace these.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public');
mkdirSync(outDir, { recursive: true });

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgbaPixels) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgbaPixels.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw);

  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const GROUND = hexToRgb('#0a0a0c');
const GROUND_WARM = hexToRgb('#1a1410');
const FLAME_OUTER = hexToRgb('#ff5b1f');
const FLAME_MID = hexToRgb('#ff8a1f');
const FLAME_INNER = hexToRgb('#ffb800');
const FLAME_CORE = hexToRgb('#ffe27a');

// Signed distance-ish teardrop: in local coords where x in [-1,1], y in [0,1]
// (0 = tip, 1 = base), returns >0 inside the flame silhouette, blended by lobe width.
function flameShape(x, y) {
  const width = 0.55 * Math.sin(Math.PI * Math.pow(y, 0.7)) * (1 - 0.15 * y);
  return width - Math.abs(x);
}

function renderIcon({ size, padFactor = 1, maskableSafe = false, opaque = false }) {
  const pixels = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const scale = (size / 2) * padFactor * (maskableSafe ? 0.72 : 0.95);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const dx = (px + 0.5 - cx) / (size / 2);
      const dy = (py + 0.5 - cy) / (size / 2);
      const radial = Math.sqrt(dx * dx + dy * dy);

      let r = mix(GROUND_WARM[0], GROUND[0], Math.min(1, radial * 1.1));
      let g = mix(GROUND_WARM[1], GROUND[1], Math.min(1, radial * 1.1));
      let b = mix(GROUND_WARM[2], GROUND[2], Math.min(1, radial * 1.1));
      let a = opaque ? 255 : 255;

      // local flame coords: x in [-1,1], y in [0,1] (0 tip .. 1 base)
      const lx = (px + 0.5 - cx) / scale;
      const ly = ((py + 0.5 - cy) / scale + 1) / 2;

      if (ly >= 0 && ly <= 1) {
        const inside = flameShape(lx, ly);
        if (inside > 0) {
          const edge = Math.min(1, inside * (size / 24));
          const t = Math.max(0, Math.min(1, (ly - 0.15) / 0.85));
          let fr = mix(FLAME_INNER[0], FLAME_OUTER[0], t);
          let fg = mix(FLAME_INNER[1], FLAME_OUTER[1], t);
          let fb = mix(FLAME_INNER[2], FLAME_OUTER[2], t);

          // inner hot core near the base-center
          const coreDx = lx;
          const coreDy = ly - 0.62;
          const coreDist = Math.sqrt(coreDx * coreDx * 3 + coreDy * coreDy * 4);
          if (coreDist < 0.32) {
            const ct = Math.max(0, Math.min(1, coreDist / 0.32));
            fr = mix(FLAME_CORE[0], FLAME_MID[0], ct);
            fg = mix(FLAME_CORE[1], FLAME_MID[1], ct);
            fb = mix(FLAME_CORE[2], FLAME_MID[2], ct);
          }

          r = mix(r, fr, edge);
          g = mix(g, fg, edge);
          b = mix(b, fb, edge);
        }
      }

      const i = (py * size + px) * 4;
      pixels[i] = Math.round(r);
      pixels[i + 1] = Math.round(g);
      pixels[i + 2] = Math.round(b);
      pixels[i + 3] = a;
    }
  }
  return encodePNG(size, size, pixels);
}

const targets = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'maskable-icon-512.png', size: 512, maskableSafe: true },
  { file: 'apple-touch-icon.png', size: 180, opaque: true },
];

for (const t of targets) {
  const png = renderIcon(t);
  writeFileSync(join(outDir, t.file), png);
  console.log(`wrote ${t.file} (${png.length} bytes)`);
}
