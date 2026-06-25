// ============================================================
//  LexFive — Diseño compartido de HOJA MEMBRETADA (3 modelos)
//  Define el ENCABEZADO y el PIE del bufete en posiciones fijas y bien
//  establecidas, reutilizados por la hoja membretada, los certificados y el
//  informe de pasantía. Estilos EN LÍNEA (autocontenido) para vista previa,
//  impresión/PDF y Word.
//
//  3 modelos seleccionables:
//   - banda    : banda azul marino con franjas doradas + emblema (moderno).
//   - clasico  : logo centrado con línea dorada (sobrio).
//   - minimal  : barra fina dorada con logo a la izquierda (minimalista).
// ============================================================
import { esc } from './util.js';

export const MEMBRETE_MODELOS = [
  { id: 'banda', nombre: 'Banda azul moderna (franjas doradas)' },
  { id: 'clasico', nombre: 'Clásico (logo centrado, línea dorada)' },
  { id: 'minimal', nombre: 'Minimalista (barra dorada)' }
];
export function modeloMembrete() {
  const m = localStorage.getItem('lexfive_membrete_modelo');
  return MEMBRETE_MODELOS.some(x => x.id === m) ? m : 'banda';
}
export function setModeloMembrete(id) {
  if (MEMBRETE_MODELOS.some(x => x.id === id)) localStorage.setItem('lexfive_membrete_modelo', id);
}

// Datos fijos del bufete que aparecen en el encabezado/pie.
const NAVY = '#0e1b2c', NAVY2 = '#16273d', GOLD = '#c2a25a', GOLD2 = '#e7d3a1';
const DIRECCION = 'Av. Alfredo Franco Valle 708-51, Edificio Real, Planta baja oficina 6-A — El Alto, Bolivia';
const TEL = 'Tel/WhatsApp: +591 78360469';
const WEB = 'lexfive.netlify.app';

// Franjas diagonales doradas (decoración de las bandas).
function franjas(lado) {
  return `<div style="position:absolute;${lado}:0;top:0;bottom:0;width:2.1cm;background-image:repeating-linear-gradient(135deg, ${GOLD} 0, ${GOLD} 5px, transparent 5px, transparent 15px);"></div>`;
}

// ENCABEZADO según el modelo.
export function membreteHeader(model, logoSrc) {
  if (model === 'clasico') {
    return `<div style="text-align:center;border-bottom:2px solid ${GOLD};padding:1.2cm 2cm 12px;">
      ${logoSrc ? `<img src="${logoSrc}" alt="" style="width:80px;height:80px;object-fit:cover;border-radius:50%;display:block;margin:0 auto 6px;box-shadow:0 0 0 2px ${GOLD};">` : ''}
      <div style="font-size:28px;font-weight:700;color:${NAVY};letter-spacing:1px;font-family:Georgia,serif;">Lex<span style="color:${GOLD}">Five</span></div>
      <div style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#a8853c;font-family:Arial,sans-serif;">Bufete de Abogados</div>
      <div style="font-size:9.5px;color:#5c6675;font-family:Arial,sans-serif;margin-top:5px;line-height:1.5;">${esc(DIRECCION)}</div>
    </div>`;
  }
  if (model === 'minimal') {
    return `<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;border-bottom:3px solid ${GOLD};padding:1cm 2cm 10px;">
      <div style="display:flex;align-items:center;gap:10px;">
        ${logoSrc ? `<img src="${logoSrc}" alt="" style="width:54px;height:54px;object-fit:cover;border-radius:50%;box-shadow:0 0 0 2px ${GOLD};">` : ''}
        <div><div style="font-size:24px;font-weight:700;color:${NAVY};font-family:Georgia,serif;line-height:1;">Lex<span style="color:${GOLD}">Five</span></div>
        <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#a8853c;font-family:Arial,sans-serif;">Bufete de Abogados</div></div>
      </div>
      <div style="text-align:right;font-size:8.5px;color:#5c6675;font-family:Arial,sans-serif;max-width:7.5cm;line-height:1.45;">${esc(DIRECCION)}</div>
    </div>`;
  }
  // banda (predeterminado)
  return `<div style="position:relative;background:linear-gradient(120deg, ${NAVY}, ${NAVY2});height:2.5cm;display:flex;align-items:center;justify-content:center;overflow:hidden;">
    ${franjas('left')}${franjas('right')}
    <div style="position:relative;display:flex;align-items:center;gap:12px;color:#fff;">
      ${logoSrc ? `<img src="${logoSrc}" alt="" style="width:58px;height:58px;object-fit:cover;border-radius:50%;box-shadow:0 0 0 2px ${GOLD};background:#fff;">` : ''}
      <div style="text-align:left;">
        <div style="font-size:25px;font-weight:700;letter-spacing:1px;font-family:Georgia,serif;line-height:1;">Lex<span style="color:${GOLD2}">Five</span></div>
        <div style="font-size:9.5px;letter-spacing:4px;text-transform:uppercase;color:${GOLD2};font-family:Arial,sans-serif;">Bufete de Abogados</div>
      </div>
    </div>
  </div>`;
}

// PIE según el modelo.
export function membreteFooter(model) {
  if (model === 'clasico') {
    return `<div style="border-top:1px solid #d9dce1;padding:8px 2cm 1cm;text-align:center;font-size:9px;color:#5c6675;font-family:Arial,sans-serif;line-height:1.5;">
      LexFive &middot; Bufete de Abogados &middot; Derecho &amp; Tecnolog&iacute;a &middot; El Alto - La Paz, Bolivia<br>${esc(TEL)} &middot; ${esc(WEB)}</div>`;
  }
  if (model === 'minimal') {
    return `<div style="border-top:3px solid ${GOLD};padding:6px 2cm 1cm;display:flex;justify-content:space-between;gap:12px;font-size:8.5px;color:#5c6675;font-family:Arial,sans-serif;">
      <span>${esc(TEL)}</span><span style="color:${NAVY};font-weight:700;">LexFive</span><span>${esc(WEB)}</span></div>`;
  }
  // banda
  return `<div style="position:relative;background:linear-gradient(120deg, ${NAVY}, ${NAVY2});min-height:1.35cm;display:flex;align-items:center;justify-content:space-between;padding:6px 1.6cm;overflow:hidden;color:#fff;font-family:Arial,sans-serif;font-size:8.7px;">
    ${franjas('left')}${franjas('right')}
    <span style="position:relative;z-index:1;">${esc(TEL)}</span>
    <span style="position:relative;z-index:1;color:${GOLD2};font-weight:700;letter-spacing:1px;">LexFive &middot; Bufete de Abogados</span>
    <span style="position:relative;z-index:1;">${esc(WEB)}</span>
  </div>`;
}

// Marca de agua (logo de fondo) centrada en el área de contenido.
function watermark(logoSrc, wmOp) {
  if (!logoSrc || !wmOp) return '';
  return `<img src="${logoSrc}" alt="" style="position:absolute;top:50%;left:50%;width:12cm;height:12cm;object-fit:contain;transform:translate(-50%,-50%);opacity:${Number(wmOp).toFixed(2)};pointer-events:none;z-index:0;">`;
}

// DOCUMENTO DE UNA PÁGINA (membrete y certificado): encabezado fijo arriba,
// contenido flexible en medio y pie fijo abajo. El contenido es una columna
// flexible: lo que se pase puede usar un espaciador (flex:1) para empujar algo
// (p. ej. el QR) justo encima del pie.
export function membretePagina({ model, logoSrc, pageW, pageH, contentHTML, wmOp }) {
  return `
  <div style="display:flex;flex-direction:column;width:${pageW};min-height:${pageH};margin:0 auto;background:#fff;color:#101820;font-family:'Times New Roman',Georgia,serif;font-size:12.5px;line-height:1.55;box-sizing:border-box;overflow:hidden;">
    ${membreteHeader(model, logoSrc)}
    <div style="position:relative;flex:1 1 auto;display:flex;flex-direction:column;padding:18px 2cm 14px;">
      ${watermark(logoSrc, wmOp)}
      <div style="position:relative;z-index:1;display:flex;flex-direction:column;flex:1 1 auto;">${contentHTML}</div>
    </div>
    ${membreteFooter(model)}
  </div>`;
}

// DOCUMENTO QUE FLUYE EN VARIAS PÁGINAS (informe): usa una tabla para que el
// ENCABEZADO se repita arriba de CADA hoja y el PIE al final de CADA hoja al
// imprimir. El contenido va en el cuerpo de la tabla.
export function membreteDocFluido({ model, logoSrc, pageW, contentHTML, wmOp }) {
  return `
  <div style="width:${pageW};margin:0 auto;background:#fff;color:#101820;font-family:'Times New Roman',Georgia,serif;font-size:12.5px;line-height:1.55;">
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr><td style="padding:0;">${membreteHeader(model, logoSrc)}</td></tr></thead>
      <tfoot><tr><td style="padding:0;">${membreteFooter(model)}</td></tr></tfoot>
      <tbody><tr><td style="padding:16px 2cm 18px;position:relative;">${watermark(logoSrc, wmOp)}<div style="position:relative;z-index:1;">${contentHTML}</div></td></tr></tbody>
    </table>
  </div>`;
}

// CSS para que las bandas (fondos de color) SÍ se impriman aunque el usuario no
// active «Gráficos en segundo plano». Se inyecta en la ventana de impresión.
export const PRINT_COLOR_CSS = '*{-webkit-print-color-adjust:exact;print-color-adjust:exact;}';
