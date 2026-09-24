// Writes app/academy.ico (32x32 and 16x16): a blue rounded square with three white bars.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function image(size) {
  const px = Buffer.alloc(size * size * 4); // BGRA, bottom-up
  const r = size * 0.22;
  const bars = [[0.22, 0.56, 0.34], [0.44, 0.36, 0.56], [0.66, 0.2, 0.78]]; // [x, top, x2] in fractions
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = Math.min(x, size - 1 - x), cy = Math.min(y, size - 1 - y);
      let inside = true;
      if (cx < r && cy < r) inside = Math.hypot(r - cx - 0.5, r - cy - 0.5) <= r;
      const fy = y / size, fx = x / size;
      const bar = bars.some(([bx, top]) => fx >= bx && fx < bx + 0.13 && fy >= top && fy < 0.8);
      const i = ((size - 1 - y) * size + x) * 4;
      if (!inside) { px.writeUInt32LE(0, i); continue; }
      if (bar) { px[i] = 255; px[i + 1] = 255; px[i + 2] = 255; px[i + 3] = 255; }
      else { px[i] = 0xeb; px[i + 1] = 0x63; px[i + 2] = 0x25; px[i + 3] = 255; } // #2563eb
    }
  }
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0); header.writeInt32LE(size, 4); header.writeInt32LE(size * 2, 8);
  header.writeUInt16LE(1, 12); header.writeUInt16LE(32, 14); header.writeUInt32LE(0, 16);
  header.writeUInt32LE(px.length, 20);
  const mask = Buffer.alloc(((size + 31) >> 5) * 4 * size); // all zero: use alpha
  return Buffer.concat([header, px, mask]);
}

const imgs = [32, 16].map((s) => ({ s, data: image(s) }));
const dir = Buffer.alloc(6 + 16 * imgs.length);
dir.writeUInt16LE(0, 0); dir.writeUInt16LE(1, 2); dir.writeUInt16LE(imgs.length, 4);
let offset = dir.length;
imgs.forEach(({ s, data }, k) => {
  const e = 6 + k * 16;
  dir[e] = s; dir[e + 1] = s; dir[e + 2] = 0; dir[e + 3] = 0;
  dir.writeUInt16LE(1, e + 4); dir.writeUInt16LE(32, e + 6);
  dir.writeUInt32LE(data.length, e + 8); dir.writeUInt32LE(offset, e + 12);
  offset += data.length;
});
fs.writeFileSync(path.join(APP, 'academy.ico'), Buffer.concat([dir, ...imgs.map((i) => i.data)]));
console.log('wrote academy.ico');
