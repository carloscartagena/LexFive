/* Genera los iconos PNG de la PWA (sin dependencias externas).
   Dibuja una balanza de la justicia dorada sobre fondo azul marino.
   Uso: node scripts/gen_pwa_icons.js */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const NAVY = [14, 27, 44];
const GOLD = [194, 162, 90];
const GOLD_L = [231, 211, 161];

// --- Utilidades de dibujo sobre un buffer RGBA ---
function makeCanvas(S) {
  const buf = Buffer.alloc(S * S * 4);
  return { S, buf };
}
function setPx(c, x, y, col) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= c.S || y >= c.S) return;
  const i = (y * c.S + x) * 4;
  c.buf[i] = col[0]; c.buf[i + 1] = col[1]; c.buf[i + 2] = col[2]; c.buf[i + 3] = 255;
}
function fill(c, col) {
  for (let y = 0; y < c.S; y++) for (let x = 0; x < c.S; x++) setPx(c, x, y, col);
}
function distSeg(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const l2 = dx * dx + dy * dy || 1;
  let t = ((px - x0) * dx + (py - y0) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const cx = x0 + t * dx, cy = y0 + t * dy;
  return Math.hypot(px - cx, py - cy);
}
function line(c, x0, y0, x1, y1, th, col) {
  const minx = Math.floor(Math.min(x0, x1) - th), maxx = Math.ceil(Math.max(x0, x1) + th);
  const miny = Math.floor(Math.min(y0, y1) - th), maxy = Math.ceil(Math.max(y0, y1) + th);
  for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++)
    if (distSeg(x, y, x0, y0, x1, y1) <= th / 2) setPx(c, x, y, col);
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
// Cuenco (arco inferior) tipo "sonrisa"
function bowl(c, cx, cyTop, rx, ry, th, col) {
  for (let y = Math.floor(cyTop - th); y <= Math.ceil(cyTop + ry + th); y++)
    for (let x = Math.floor(cx - rx - th); x <= Math.ceil(cx + rx + th); x++) {
      const nx = (x - cx) / rx, ny = (y - cyTop) / ry;
      const d = Math.abs(Math.hypot(nx, ny) - 1) * ((rx + ry) / 2);
      if (d <= th / 2 && y >= cyTop) setPx(c, x, y, col);
    }
}

function draw(S) {
  const c = makeCanvas(S);
  const k = S / 512;       // escala respecto al diseño base (512)
  const u = v => v * k;    // de unidades base a px
  fill(c, NAVY);
  const cx = u(256);
  // Anillo dorado
  ring(c, cx, u(232), u(120), u(9), GOLD);
  // Balanza
  const th = u(11);
  line(c, cx, u(150), cx, u(300), th, GOLD);          // mástil
  line(c, u(186), u(178), u(326), u(178), th, GOLD);   // travesaño
  disc(c, cx, u(150), u(12), GOLD_L);                  // remate superior
  // Cuerdas (V) hacia cada platillo
  line(c, u(186), u(178), u(150), u(250), u(6), GOLD);
  line(c, u(186), u(178), u(222), u(250), u(6), GOLD);
  line(c, u(326), u(178), u(290), u(250), u(6), GOLD);
  line(c, u(326), u(178), u(362), u(250), u(6), GOLD);
  // Platillos (cuencos)
  bowl(c, u(186), u(250), u(36), u(22), u(9), GOLD);
  bowl(c, u(326), u(250), u(36), u(22), u(9), GOLD);
  // Base
  line(c, cx, u(300), cx, u(330), th, GOLD);
  line(c, u(214), u(336), u(298), u(336), u(13), GOLD);
  return c;
}

// --- Codificador PNG mínimo (RGBA, 8 bits) ---
function crcTable() {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
}
const CRC = crcTable();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(c) {
  const S = c.S;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  // datos raw: cada fila lleva un byte de filtro (0) al inicio
  const raw = Buffer.alloc(S * (S * 4 + 1));
  for (let y = 0; y < S; y++) {
    raw[y * (S * 4 + 1)] = 0;
    c.buf.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const outDir = path.join(__dirname, '..', 'assets', 'pwa');
[192, 512].forEach(S => {
  const png = encodePNG(draw(S));
  const f = path.join(outDir, `icon-${S}.png`);
  fs.writeFileSync(f, png);
  console.log('Generado', f, png.length, 'bytes');
});
