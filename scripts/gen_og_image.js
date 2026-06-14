/* Genera la imagen para compartir en redes (Open Graph / Twitter): assets/og-image.png
   Tarjeta 1200x630 con fondo azul marino, marco dorado, la balanza de la justicia
   y el wordmark "LEXFIVE" + datos del bufete. Sin dependencias externas.
   Renderiza a 2x y reduce (supersampling) para obtener bordes suaves.
   Uso: node scripts/gen_og_image.js */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const W = 1200, H = 630;     // tamaño final recomendado para Open Graph
const SS = 2;                // supersampling
const CW = W * SS, CH = H * SS;

const NAVY_TOP = [22, 39, 61];
const NAVY_BOT = [11, 21, 34];
const GOLD = [194, 162, 90];
const GOLD_L = [231, 211, 161];
const CREAM = [228, 224, 214];

// ---------- Lienzo RGBA ----------
function makeCanvas(w, h) { return { w, h, buf: Buffer.alloc(w * h * 4) }; }
function setPx(c, x, y, col, a = 255) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  const i = (y * c.w + x) * 4;
  c.buf[i] = col[0]; c.buf[i + 1] = col[1]; c.buf[i + 2] = col[2]; c.buf[i + 3] = a;
}
function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function bgGradient(c) {
  for (let y = 0; y < c.h; y++) {
    const col = lerp(NAVY_TOP, NAVY_BOT, y / c.h);
    for (let x = 0; x < c.w; x++) setPx(c, x, y, col);
  }
}
function distSeg(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const l2 = dx * dx + dy * dy || 1;
  let t = ((px - x0) * dx + (py - y0) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
}
function line(c, x0, y0, x1, y1, th, col) {
  const minx = Math.floor(Math.min(x0, x1) - th), maxx = Math.ceil(Math.max(x0, x1) + th);
  const miny = Math.floor(Math.min(y0, y1) - th), maxy = Math.ceil(Math.max(y0, y1) + th);
  for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++)
    if (distSeg(x, y, x0, y0, x1, y1) <= th / 2) setPx(c, x, y, col);
}
function poly(c, pts, th, col) {
  for (let i = 0; i < pts.length - 1; i++) line(c, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], th, col);
}
function disc(c, cx, cy, r, col) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
      if (Math.hypot(x - cx, y - cy) <= r) setPx(c, x, y, col);
}
function ring(c, cx, cy, r, th, col) {
  for (let y = Math.floor(cy - r - th); y <= Math.ceil(cy + r + th); y++)
    for (let x = Math.floor(cx - r - th); x <= Math.ceil(cx + r + th); x++)
      if (Math.abs(Math.hypot(x - cx, y - cy) - r) <= th / 2) setPx(c, x, y, col);
}
function bowl(c, cx, cyTop, rx, ry, th, col) {
  for (let y = Math.floor(cyTop - th); y <= Math.ceil(cyTop + ry + th); y++)
    for (let x = Math.floor(cx - rx - th); x <= Math.ceil(cx + rx + th); x++) {
      const nx = (x - cx) / rx, ny = (y - cyTop) / ry;
      const d = Math.abs(Math.hypot(nx, ny) - 1) * ((rx + ry) / 2);
      if (d <= th / 2 && y >= cyTop) setPx(c, x, y, col);
    }
}
function rectBorder(c, x0, y0, x1, y1, th, col) {
  line(c, x0, y0, x1, y0, th, col); line(c, x1, y0, x1, y1, th, col);
  line(c, x1, y1, x0, y1, th, col); line(c, x0, y1, x0, y0, th, col);
}

// ---------- Balanza de la justicia (misma proporción que el icono PWA) ----------
function drawScales(c, centerX, centerY, scale) {
  const k = scale;                       // 1.0 => tamaño del diseño base (512)
  const ox = 256, oy = 232;              // centro del diseño original
  const P = (x, y) => [centerX + (x - ox) * k, centerY + (y - oy) * k];
  const TH = 11 * k, THN = 6 * k;
  ring(c, ...P(256, 232), 120 * k, 9 * k, GOLD);
  // mástil y travesaño
  line(c, ...P(256, 150), ...P(256, 300), TH, GOLD);
  line(c, ...P(186, 178), ...P(326, 178), TH, GOLD);
  disc(c, ...P(256, 150), 12 * k, GOLD_L);
  // cuerdas
  line(c, ...P(186, 178), ...P(150, 250), THN, GOLD);
  line(c, ...P(186, 178), ...P(222, 250), THN, GOLD);
  line(c, ...P(326, 178), ...P(290, 250), THN, GOLD);
  line(c, ...P(326, 178), ...P(362, 250), THN, GOLD);
  // platillos
  const lp = P(186, 250), rp = P(326, 250);
  bowl(c, lp[0], lp[1], 36 * k, 22 * k, 9 * k, GOLD);
  bowl(c, rp[0], rp[1], 36 * k, 22 * k, 9 * k, GOLD);
  // base
  line(c, ...P(256, 300), ...P(256, 330), TH, GOLD);
  line(c, ...P(214, 336), ...P(298, 336), 13 * k, GOLD);
}

// ---------- Fuente vectorial (mayúsculas) en caja 6 x 10 ----------
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
const GLYPH_W = 6, GLYPH_H = 10, GAP = 2.6, SPACE_W = 4.4;

function textWidth(str, s) {
  let w = 0;
  for (const ch of str) {
    if (ch === ' ') { w += SPACE_W * s + GAP * s; continue; }
    if (ch === '\u00B7') { w += 2.4 * s + GAP * s; continue; }
    w += GLYPH_W * s + GAP * s;
  }
  return w - GAP * s;
}
// Dibuja texto centrado horizontalmente en cx, con la parte superior en topY.
function drawTextCentered(c, str, cx, topY, s, th, col) {
  let x = cx - textWidth(str, s) / 2;
  for (const ch of str) {
    if (ch === ' ') { x += SPACE_W * s + GAP * s; continue; }
    if (ch === '\u00B7') { disc(c, x + 1.2 * s, topY + GLYPH_H * s * 0.5, th * 0.9, col); x += 2.4 * s + GAP * s; continue; }
    const g = GLYPHS[ch];
    if (g) for (const pl of g) poly(c, pl.map(([px, py]) => [x + px * s, topY + py * s]), th, col);
    x += GLYPH_W * s + GAP * s;
  }
}

// ---------- Composición ----------
function compose() {
  const c = makeCanvas(CW, CH);
  bgGradient(c);
  // Marco dorado doble
  rectBorder(c, 26 * SS, 26 * SS, (W - 26) * SS, (H - 26) * SS, 3 * SS, GOLD);
  rectBorder(c, 34 * SS, 34 * SS, (W - 34) * SS, (H - 34) * SS, 1.4 * SS, [...GOLD]);
  // Balanza
  drawScales(c, 600 * SS, 150 * SS, 0.62 * SS);
  // Wordmark
  drawTextCentered(c, 'LEXFIVE', 600 * SS, 300 * SS, 9.4 * SS, 4.6 * SS, CREAM);
  // Regla dorada bajo el wordmark
  line(c, 420 * SS, 408 * SS, 780 * SS, 408 * SS, 2.4 * SS, GOLD);
  // Lemas
  drawTextCentered(c, 'BUFETE DE ABOGADOS', 600 * SS, 446 * SS, 2.9 * SS, 2.0 * SS, GOLD_L);
  drawTextCentered(c, 'EL ALTO \u00B7 BOLIVIA', 600 * SS, 500 * SS, 2.5 * SS, 1.8 * SS, GOLD);
  return c;
}

// ---------- Reducción 2x (supersampling -> AA) ----------
function downsample(src) {
  const out = makeCanvas(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let r = 0, g = 0, b = 0;
    for (let dy = 0; dy < SS; dy++) for (let dx = 0; dx < SS; dx++) {
      const i = ((y * SS + dy) * src.w + (x * SS + dx)) * 4;
      r += src.buf[i]; g += src.buf[i + 1]; b += src.buf[i + 2];
    }
    const n = SS * SS, j = (y * W + x) * 4;
    out.buf[j] = Math.round(r / n); out.buf[j + 1] = Math.round(g / n);
    out.buf[j + 2] = Math.round(b / n); out.buf[j + 3] = 255;
  }
  return out;
}

// ---------- Codificador PNG (RGBA 8 bits) ----------
const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(c) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(c.w, 0); ihdr.writeUInt32BE(c.h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = c.w * 4 + 1;
  const raw = Buffer.alloc(c.h * stride);
  for (let y = 0; y < c.h; y++) { raw[y * stride] = 0; c.buf.copy(raw, y * stride + 1, y * c.w * 4, (y + 1) * c.w * 4); }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const out = path.join(__dirname, '..', 'assets', 'og-image.png');
const png = encodePNG(downsample(compose()));
fs.writeFileSync(out, png);
console.log('Generado', out, png.length, 'bytes');
