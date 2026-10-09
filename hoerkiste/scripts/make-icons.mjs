// Erzeugt die PWA-Icons (PNG) ohne Zusatzpakete: Kiste mit Play-Symbol.
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [255, 183, 3];
const BOX = [255, 255, 255];
const PLAY = [232, 93, 4];

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size, pixel) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Signed distance functions in Einheitskoordinaten (0..1)
const roundRect = (px, py, cx, cy, hw, hh, r) => {
  const qx = Math.abs(px - cx) - hw + r, qy = Math.abs(py - cy) - hh + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};
const triangle = (px, py, a, b, c) => {
  // Abstand zu Dreieck (negativ innen)
  const edge = (p, q) => {
    const ex = q[0] - p[0], ey = q[1] - p[1], wx = px - p[0], wy = py - p[1];
    const t = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey)));
    return [Math.hypot(wx - ex * t, wy - ey * t), ex * wy - ey * wx];
  };
  const [d1, s1] = edge(a, b), [d2, s2] = edge(b, c), [d3, s3] = edge(c, a);
  const inside = (s1 > 0 && s2 > 0 && s3 > 0) || (s1 < 0 && s2 < 0 && s3 < 0);
  const d = Math.min(d1, d2, d3);
  return inside ? -d : d;
};

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const cov = (d, px) => Math.max(0, Math.min(1, 0.5 - d / px));

function draw(size, { maskable, rounded }) {
  const s = maskable ? 0.78 : 1; // Safe-Zone für maskable Icons
  const off = (1 - s) / 2;
  return png(size, (x, y) => {
    const u = (x + 0.5) / size, v = (y + 0.5) / size;
    const px = 1 / size;
    // Hintergrund
    let alpha = 1;
    if (rounded) alpha = cov(roundRect(u, v, 0.5, 0.5, 0.5, 0.5, 0.22), px);
    let col = BG;
    // Kiste
    const lu = (u - off) / s, lv = (v - off) / s, lp = px / s;
    const dBox = roundRect(lu, lv, 0.5, 0.56, 0.32, 0.27, 0.08);
    col = mix(col, BOX, cov(dBox, lp));
    // Deckel
    const dLid = roundRect(lu, lv, 0.5, 0.25, 0.36, 0.06, 0.05);
    col = mix(col, [255, 241, 214], cov(dLid, lp));
    // Play
    const dPlay = triangle(lu, lv, [0.42, 0.42], [0.42, 0.70], [0.64, 0.56]) - 0.02;
    col = mix(col, PLAY, cov(dPlay, lp));
    return [...col, Math.round(alpha * 255)];
  });
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', draw(192, { rounded: true }));
writeFileSync('public/icons/icon-512.png', draw(512, { rounded: true }));
writeFileSync('public/icons/icon-maskable-512.png', draw(512, { maskable: true }));
writeFileSync('public/icons/apple-touch-icon.png', draw(180, { maskable: false }));
console.log('Icons geschrieben.');
