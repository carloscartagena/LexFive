/* Genera imágenes de marca para redes sociales (Facebook):
     assets/social/fb-perfil.png   -> foto de perfil 512x512 (se ve en círculo)
     assets/social/fb-portada.png  -> foto de portada 820x312
   Sin dependencias externas. Render a 2x y reduce (supersampling) para bordes suaves.
   Uso: node scripts/gen_social_images.js */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const NAVY_TOP = [22, 39, 61];
const NAVY_BOT = [11, 21, 34];
const GOLD = [194, 162, 90];
const GOLD_L = [231, 211, 161];
const CREAM = [228, 224, 214];
const SS = 2;

// ---------- Lienzo ----------
function makeCanvas(w, h) { return { w, h, buf: Buffer.alloc(w * h * 4) }; }
function setPx(c, x, y, col) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  const i = (y * c.w + x) * 4;
  c.buf[i] = col[0]; c.buf[i + 1] = col[1]; c.buf[i + 2] = col[2]; c.buf[i + 3] = 255;
}
function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function bgGradient(c) {
  for (let y = 0; y < c.h; y++) { const col = lerp(NAVY_TOP, NAVY_BOT, y / c.h); for (let x = 0; x < c.w; x++) setPx(c, x, y, col); }
}
function distSeg(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0; const l2 = dx * dx + dy * dy || 1;
  let t = ((px - x0) * dx + (py - y0) * dy) / l2; t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
}
function line(c, x0, y0, x1, y1, th, col) {
  const minx = Math.floor(Math.min(x0, x1) - th), maxx = Math.ceil(Math.max(x0, x1) + th);
  const miny = Math.floor(Math.min(y0, y1) - th), maxy = Math.ceil(Math.max(y0, y1) + th);
  for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) if (distSeg(x, y, x0, y0, x1, y1) <= th / 2) setPx(c, x, y, col);
}
function disc(c, cx, cy, r, col) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) if (Math.hypot(x - cx, y - cy) <= r) setPx(c, x, y, col);
}
function ring(c, cx, cy, r, th, col) {
  for (let y = Math.floor(cy - r - th); y <= Math.ceil(cy + r + th); y++) for (let x = Math.floor(cx - r - th); x <= Math.ceil(cx + r + th); x++) if (Math.abs(Math.hypot(x - cx, y - cy) - r) <= th / 2) setPx(c, x, y, col);
}
function bowl(c, cx, cyTop, rx, ry, th, col) {
  for (let y = Math.floor(cyTop - th); y <= Math.ceil(cyTop + ry + th); y++) for (let x = Math.floor(cx - rx - th); x <= Math.ceil(cx + rx + th); x++) {
    const nx = (x - cx) / rx, ny = (y - cyTop) / ry; const d = Math.abs(Math.hypot(nx, ny) - 1) * ((rx + ry) / 2);
    if (d <= th / 2 && y >= cyTop) setPx(c, x, y, col);
  }
}
function rectBorder(c, x0, y0, x1, y1, th, col) {
  line(c, x0, y0, x1, y0, th, col); line(c, x1, y0, x1, y1, th, col); line(c, x1, y1, x0, y1, th, col); line(c, x0, y1, x0, y0, th, col);
}

// ---------- Balanza de la justicia (proporción del icono) ----------
function drawScales(c, centerX, centerY, k) {
  const ox = 256, oy = 232;
  const P = (x, y) => [centerX + (x - ox) * k, centerY + (y - oy) * k];
  const TH = 11 * k, THN = 6 * k;
  ring(c, ...P(256, 232), 120 * k, 9 * k, GOLD);
  line(c, ...P(256, 150), ...P(256, 300), TH, GOLD);
  line(c, ...P(186, 178), ...P(326, 178), TH, GOLD);
  disc(c, ...P(256, 150), 12 * k, GOLD_L);
  line(c, ...P(186, 178), ...P(150, 250), THN, GOLD);
  line(c, ...P(186, 178), ...P(222, 250), THN, GOLD);
  line(c, ...P(326, 178), ...P(290, 250), THN, GOLD);
  line(c, ...P(326, 178), ...P(362, 250), THN, GOLD);
  const lp = P(186, 250), rp = P(326, 250);
  bowl(c, lp[0], lp[1], 36 * k, 22 * k, 9 * k, GOLD);
  bowl(c, rp[0], rp[1], 36 * k, 22 * k, 9 * k, GOLD);
  line(c, ...P(256, 300), ...P(256, 330), TH, GOLD);
  line(c, ...P(214, 336), ...P(298, 336), 13 * k, GOLD);
}

// ---------- Fuente vectorial (mayúsculas) ----------
const GLYPHS = {
  'A': [[[0,10],[3,0],[6,10]],[[1.2,6.4],[4.8,6.4]]],
  'B': [[[0,0],[0,10]],[[0,0],[4,0],[5.3,1.3],[5.3,3.4],[4,4.7],[0,4.7]],[[0,4.7],[4.4,4.7],[6,6.1],[6,8.5],[4.4,10],[0,10]]],
  'D': [[[0,0],[0,10]],[[0,0],[3.4,0],[5.4,2],[6,5],[5.4,8],[3.4,10],[0,10]]],
  'E': [[[6,0],[0,0],[0,10],[6,10]],[[0,5],[4.6,5]]],
  'F': [[[6,0],[0,0],[0,10]],[[0,5],[4.3,5]]],
  'G': [[[6,2.2],[4,0.2],[2,0.2],[0.4,2],[0,5],[0.4,8],[2,9.8],[4,9.8],[6,8],[6,5.4],[3.6,5.4]]],
  'I': [[[1,0],[5,0]],[[3,0],[3,10]],[[1,10],[5,10]]],
  'L': [[[0,0],[0,10],[6,10]]],
  'O': [[[3,0],[5,0.8],[6,3],[6,7],[5,9.2],[3,10],[1,9.2],[0,7],[0,3],[1,0.8],[3,0]]],
  'S': [[[6,1.6],[4.4,0.2],[1.6,0.2],[0.2,1.9],[0.5,3.7],[2.2,4.7],[4.2,5.5],[5.8,6.6],[6,8.3],[4.4,9.9],[1.4,9.9],[0,8.4]]],
  'T': [[[0,0],[6,0]],[[3,0],[3,10]]],
  'U': [[[0,0],[0,6.8],[1.2,9.1],[3,10],[4.8,9.1],[6,6.8],[6,0]]],
  'V': [[[0,0],[3,10],[6,0]]],
  'X': [[[0,0],[6,10]],[[6,0],[0,10]]],
  ' ': [],
};
const GW = 6, GH = 10, GAP = 2.6, SPACE_W = 4.4;
function poly(c, pts, th, col) { for (let i = 0; i < pts.length - 1; i++) line(c, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], th, col); }
function textWidth(str, s) {
  let w = 0;
  for (const ch of str) { if (ch === ' ') { w += (SPACE_W + GAP) * s; continue; } if (ch === '\u00B7') { w += (2.4 + GAP) * s; continue; } w += (GW + GAP) * s; }
  return w - GAP * s;
}
function drawTextCentered(c, str, cx, topY, s, th, col) {
  let x = cx - textWidth(str, s) / 2;
  for (const ch of str) {
    if (ch === ' ') { x += (SPACE_W + GAP) * s; continue; }
    if (ch === '\u00B7') { disc(c, x + 1.2 * s, topY + GH * s * 0.5, th * 0.9, col); x += (2.4 + GAP) * s; continue; }
    const g = GLYPHS[ch];
    if (g) for (const pl of g) poly(c, pl.map(([px, py]) => [x + px * s, topY + py * s]), th, col);
    x += (GW + GAP) * s;
  }
}

// ---------- Reducción supersampling ----------
function downsample(src, W, H) {
  const out = makeCanvas(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let r = 0, g = 0, b = 0;
    for (let dy = 0; dy < SS; dy++) for (let dx = 0; dx < SS; dx++) { const i = ((y * SS + dy) * src.w + (x * SS + dx)) * 4; r += src.buf[i]; g += src.buf[i + 1]; b += src.buf[i + 2]; }
    const n = SS * SS, j = (y * W + x) * 4;
    out.buf[j] = Math.round(r / n); out.buf[j + 1] = Math.round(g / n); out.buf[j + 2] = Math.round(b / n); out.buf[j + 3] = 255;
  }
  return out;
}

// ---------- PNG ----------
const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const t = Buffer.from(type, 'ascii'); const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0); const body = Buffer.concat([t, data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0); return Buffer.concat([len, body, crc]); }
function encodePNG(c) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(c.w, 0); ihdr.writeUInt32BE(c.h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const stride = c.w * 4 + 1; const raw = Buffer.alloc(c.h * stride);
  for (let y = 0; y < c.h; y++) { raw[y * stride] = 0; c.buf.copy(raw, y * stride + 1, y * c.w * 4, (y + 1) * c.w * 4); }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ---------- Composiciones ----------
function perfil() {
  const W = 512, H = 512, c = makeCanvas(W * SS, H * SS);
  bgGradient(c);
  ring(c, 256 * SS, 256 * SS, 232 * SS, 4 * SS, GOLD);
  ring(c, 256 * SS, 256 * SS, 223 * SS, 1.4 * SS, GOLD);
  drawScales(c, 256 * SS, 248 * SS, 2.0 * SS);
  return downsample(c, W, H);
}
function portada() {
  const W = 820, H = 312, c = makeCanvas(W * SS, H * SS);
  bgGradient(c);
  rectBorder(c, 16 * SS, 16 * SS, (W - 16) * SS, (H - 16) * SS, 2.4 * SS, GOLD);
  rectBorder(c, 23 * SS, 23 * SS, (W - 23) * SS, (H - 23) * SS, 1.2 * SS, GOLD);
  // Balanza más pequeña y centrada verticalmente, sin salirse del marco ni tocar el texto.
  drawScales(c, 192 * SS, 156 * SS, 0.70 * SS);
  // Bloque de texto centrado en la mitad derecha; el conjunto (balanza + texto) queda centrado.
  drawTextCentered(c, 'LEXFIVE', 548 * SS, 92 * SS, 5.8 * SS, 2.8 * SS, CREAM);
  line(c, 408 * SS, 162 * SS, 688 * SS, 162 * SS, 2 * SS, GOLD);
  drawTextCentered(c, 'BUFETE DE ABOGADOS', 548 * SS, 178 * SS, 2.3 * SS, 1.5 * SS, GOLD_L);
  drawTextCentered(c, 'EL ALTO \u00B7 BOLIVIA', 548 * SS, 214 * SS, 2.1 * SS, 1.5 * SS, GOLD);
  return downsample(c, W, H);
}

const dir = path.join(__dirname, '..', 'assets', 'social');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'fb-perfil.png'), encodePNG(perfil()));
fs.writeFileSync(path.join(dir, 'fb-portada.png'), encodePNG(portada()));
console.log('Generadas: assets/social/fb-perfil.png (512x512) y assets/social/fb-portada.png (820x312)');
