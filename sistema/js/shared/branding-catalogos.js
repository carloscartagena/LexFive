// ============================================================
//  LexFive — Catálogo de logos y sellos del bufete (datos)
//  Lista de diseños disponibles y utilidades de visibilidad
//  (cuáles están ocultos). Datos puros, sin estado de imágenes.
//  Compartido por «Sellos y logos» y la marca de agua de la credencial.
//  Extraído de app.js (paso 19 del split).
// ============================================================
export const BRAND_LOGOS = [
  { id: 'ds1-balanza-codigo', nombre: 'Emblema · Balanza' },
  { id: 'ds2-L5-circuito', nombre: 'Emblema · Monograma L5' },
  { id: 'ds3-mazo-pulso', nombre: 'Emblema · Mazo del juez' },
  { id: 'ds4-columna-circuito', nombre: 'Emblema · Templo de justicia' },
  { id: 'ds5-balanza-chip', nombre: 'Emblema · Balanza en chip' },
  { id: 'opcion-6-LF-circuito', nombre: 'Monograma LF con circuito' },
  { id: 'ds7-balanza-binario', nombre: 'Balanza · Código binario' },
  { id: 'ds8-balanza-red', nombre: 'Balanza · Red de nodos' },
  { id: 'ds9-codigo-justicia', nombre: 'Balanza · Código </>' },
  { id: 'ds10-engranaje-ley', nombre: 'Balanza · Engranaje' },
  { id: 'ds11-LF-binario', nombre: 'Monograma LF · Binario' },
  { id: 'ds12-buho-circuito', nombre: 'Búho · Circuito' },
  { id: 'ds13-buho-hexagono', nombre: 'Búho · Hexágono tech' },
  { id: 'ds14-buho-balanza', nombre: 'Búho · Balanza' }
];
export const BRAND_LOGO_DEFAULT = 'ds1-balanza-codigo';
export const BRAND_SELLOS = [
  { id: 'sello-1-clasico', nombre: 'Clásico — balanza' },
  { id: 'sello-2-mazo', nombre: 'Mazo del juez' },
  { id: 'sello-3-ovalado', nombre: 'Ovalado institucional' },
  { id: 'sello-4-circuito', nombre: 'Derecho & Tecnología' },
  { id: 'sello-5-columnas', nombre: 'Templo de justicia' }
];
export const BRAND_SELLO_DEFAULT = 'sello-1-clasico';

export function brandHidden(k) { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { return []; } }
export function brandLogosVisibles() { const h = brandHidden('lexfive_logos_hidden'); return BRAND_LOGOS.filter(l => h.indexOf(l.id) === -1); }
export function brandSellosVisibles() { const h = brandHidden('lexfive_sellos_hidden'); return BRAND_SELLOS.filter(s => h.indexOf(s.id) === -1); }
