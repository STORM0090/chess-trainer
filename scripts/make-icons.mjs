// Generates the PWA icons as PNG files without any image dependency.
// The icon is a 4x4 chessboard on a dark rounded tile. Run with `npm run icons`;
// the output in public/icons/ is committed.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

const BACKGROUND = [0x1f, 0x29, 0x37];
const LIGHT = [0xf0, 0xd9, 0xb5];
const DARK = [0xb5, 0x88, 0x63];

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([length, body, checksum]);
}

function encodePng(size, pixelAt) {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelAt(x, y);
      const offset = y * stride + 1 + x * 4;
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = a;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function insideRoundedSquare(x, y, size, radius) {
  const cx = Math.min(Math.max(x + 0.5, radius), size - radius);
  const cy = Math.min(Math.max(y + 0.5, radius), size - radius);
  return (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= radius ** 2;
}

/**
 * @param size       icon edge in pixels
 * @param boardShare share of the edge taken by the chessboard (smaller for maskable icons,
 *                   whose outer 10% on each side may be cropped by the launcher)
 * @param rounded    transparent rounded corners (false for maskable and Apple icons)
 */
function drawIcon(size, boardShare, rounded) {
  const board = Math.round((size * boardShare) / 4) * 4;
  const origin = (size - board) / 2;
  const cell = board / 4;
  const radius = size * 0.18;
  return encodePng(size, (x, y) => {
    if (rounded && !insideRoundedSquare(x, y, size, radius)) return [0, 0, 0, 0];
    const bx = x - origin;
    const by = y - origin;
    if (bx < 0 || by < 0 || bx >= board || by >= board) return [...BACKGROUND, 255];
    const isLight = (Math.floor(bx / cell) + Math.floor(by / cell)) % 2 === 0;
    return [...(isLight ? LIGHT : DARK), 255];
  });
}

mkdirSync(outDir, { recursive: true });

const icons = [
  ['icon-192.png', 192, 0.72, true],
  ['icon-512.png', 512, 0.72, true],
  ['maskable-512.png', 512, 0.56, false],
  ['apple-touch-icon.png', 180, 0.72, false],
];

for (const [name, size, boardShare, rounded] of icons) {
  writeFileSync(join(outDir, name), drawIcon(size, boardShare, rounded));
  console.log(`make-icons: ${name}`);
}
