// ============================================================
//  VISTA: HOJA MEMBRETADA
//  Genera una hoja con el membrete del bufete (logo, marca de agua, datos de
//  contacto) lista para escribir cualquier documento de la firma. Disponible
//  en tamaño Carta y Oficio, descargable en PDF (impresión) y Word.
//  Reutiliza el logo y la marca de agua del branding: si el bufete cambia el
//  logo en «Sellos y logos», esta hoja se actualiza automáticamente.
// ============================================================
import { withTimeout } from './auth.js';
import { ICON } from './icons.js';
import { esc } from './util.js';
import { descargarArchivo } from './exportar.js';
import { $, content } from './dom.js';
import { toast, loading } from './ui.js';
import { ensureImgCache } from './media.js';
import { hydrateBranding, pickActiveLogo, pickActiveSello, brandLogoSrc, brandSelloSrc, wmOpacityActual } from './branding.js';

// Tamaños de página. "Oficio" en Bolivia = 21.6 × 33 cm; "Carta" = 21.6 × 27.9 cm.
const PAGES = {
  carta:  { label: 'Carta',  w: '21.6cm', h: '27.9cm', css: '21.6cm 27.9cm' },
  oficio: { label: 'Oficio', w: '21.6cm', h: '33cm',   css: '21.6cm 33cm' }
};

function urlAbs(src) {
  if (!src) return '';
  return src.indexOf('data:') === 0 ? src : new URL(src, location.href).href;
}

// Documento de la hoja membretada con estilos EN LÍNEA (autocontenido): sirve
// para la vista previa, la impresión/PDF y la descarga en Word.
function buildMembrete(opts) {
  const { logoSrc, selloSrc, pageW, pageH } = opts;
  const wmOp = (wmOpacityActual() / 100).toFixed(2);
  // Altura del cuerpo (espacio para escribir) para empujar el pie hacia abajo,
  // también en Word (que no entiende flexbox).
  const spacer = (parseFloat(pageH) - 9).toFixed(1) + 'cm';
  const wm = logoSrc ? `<img src="${logoSrc}" alt="" style="position:absolute;top:50%;left:50%;width:13cm;height:13cm;object-fit:contain;transform:translate(-50%,-50%);opacity:${wmOp};pointer-events:none;">` : '';
  const logoBadge = logoSrc ? `<img src="${logoSrc}" alt="" style="width:84px;height:84px;object-fit:cover;border-radius:50%;display:block;margin:0 auto 8px;box-shadow:0 0 0 2px rgba(194,162,90,.6);">` : '';
  const sello = selloSrc ? `<div style="position:relative;text-align:right;margin-bottom:6px;"><img src="${selloSrc}" alt="" style="width:3cm;height:3cm;object-fit:contain;mix-blend-mode:multiply;filter:contrast(1.25) brightness(1.08);opacity:.92;transform:rotate(-6deg);"></div>` : '';
  return `
  <div style="position:relative;font-family:Georgia,'Times New Roman',serif;color:#1a2330;background:#fff;width:${pageW};min-height:${pageH};margin:0 auto;padding:1.6cm 2cm 1.4cm;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;">
    <div style="position:absolute;top:0;left:0;bottom:0;width:0.5cm;background:linear-gradient(#0e1b2c,#16273d);"></div>
    ${wm}
    <header style="position:relative;text-align:center;border-bottom:2px solid #c2a25a;padding-bottom:14px;">
      ${logoBadge}
      <div style="font-size:30px;font-weight:700;color:#0e1b2c;letter-spacing:1px;">Lex<span style="color:#c2a25a;">Five</span></div>
      <div style="font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#a8853c;font-family:Arial,sans-serif;">Bufete de Abogados</div>
      <div style="font-size:10px;color:#5c6675;font-family:Arial,sans-serif;margin-top:5px;line-height:1.55;">Calle Uruguay esq. Raúl Salmón, zona 12 de Octubre, Ed. Señor de Mayo N.&deg; 85, P.B., of. 1-A &mdash; El Alto, Bolivia<br>Tel/WhatsApp: +591 78360469 &nbsp;&middot;&nbsp; lexfive.netlify.app</div>
    </header>
    <div style="position:relative;flex:1;min-height:${spacer};"></div>
    ${sello}
    <footer style="position:relative;border-top:1px solid #d9dce1;padding-top:8px;text-align:center;font-size:9.5px;color:#5c6675;font-family:Arial,sans-serif;line-height:1.5;">
      LexFive &middot; Bufete de Abogados &middot; Derecho &amp; Tecnolog&iacute;a &middot; El Alto - La Paz, Bolivia &middot; Tel/WhatsApp +591 78360469 &middot; lexfive.netlify.app
    </footer>
  </div>`;
}

// Abre una ventana de impresión con el tamaño de página elegido (carta/oficio).
function abrirImpresion(titulo, docHTML, pageCss) {
  const w = window.open('', '_blank');
  if (!w) { toast('Permita las ventanas emergentes para imprimir.', 'error'); return; }
  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${esc(titulo)}</title>
    <style>@page{size:${pageCss};margin:0;} html,body{margin:0;background:#fff;}</style></head><body>${docHTML}
    <script>window.addEventListener('load',function(){setTimeout(function(){window.print();},400);});<\/script></body></html>`);
  w.document.close();
}

export async function renderMembrete() {
  loading();
  try { await withTimeout(ensureImgCache(), 8000, 'imágenes'); } catch (e) {}
  try { await withTimeout(hydrateBranding(), 8000, 'branding'); } catch (e) {}
  const logoSrc = urlAbs(brandLogoSrc(pickActiveLogo(localStorage.getItem('lexfive_logo'))));
  const selloSrc = urlAbs(brandSelloSrc(pickActiveSello(localStorage.getItem('lexfive_sello'))));

  content().innerHTML = `
    <div class="card"><div class="card__body">
      <h3 class="intro-title">Hoja membretada</h3>
      <p class="cell-sub">Hoja con el membrete del bufete (logo, marca de agua y datos de contacto) para redactar cualquier documento de la firma. Usa el logo y la marca de agua actuales: si los cambia en «Sellos y logos», esta hoja se actualiza sola. Elija el tamaño e «Imprimir / Guardar PDF», o descárguela en Word para escribir encima.</p>
    </div></div>

    <div class="card"><div class="card__body">
      <div style="display:flex;gap:18px;flex-wrap:wrap;align-items:flex-end;">
        <div class="field" style="margin:0;min-width:200px"><label>Tamaño de hoja</label>
          <select id="mb_tam">
            <option value="carta">Carta (21.6 &times; 27.9 cm)</option>
            <option value="oficio">Oficio (21.6 &times; 33 cm)</option>
          </select></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn--primary" id="mb_print">${ICON.doc} Imprimir / Guardar PDF</button>
          <button class="btn btn--ghost" id="mb_word">Descargar Word</button>
        </div>
        <label class="cell-sub" style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="mb_sello"> Incluir sello del bufete (al pie)</label>
      </div>
    </div></div>

    <div class="card">
      <div class="card__head"><h3>Vista previa</h3></div>
      <div class="card__body"><div class="cert-preview" id="mbPreview"></div></div>
    </div>`;

  const page = () => PAGES[$('#mb_tam').value] || PAGES.carta;
  const docActual = () => { const p = page(); return buildMembrete({ logoSrc, selloSrc: ($('#mb_sello') && $('#mb_sello').checked) ? selloSrc : '', pageW: p.w, pageH: p.h }); };
  const pintar = () => { $('#mbPreview').innerHTML = docActual(); };

  $('#mb_tam').onchange = pintar;
  const mbSello = $('#mb_sello'); if (mbSello) mbSello.onchange = pintar;
  $('#mb_print').onclick = () => { const p = page(); abrirImpresion('Hoja membretada LexFive (' + p.label + ')', docActual(), p.css); };
  $('#mb_word').onclick = () => {
    const p = page();
    const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>@page{size:' + p.css + ';margin:0;}</style></head><body>' + docActual() + '</body></html>';
    descargarArchivo('hoja-membretada-lexfive-' + p.label.toLowerCase() + '.doc', '\ufeff' + html, 'application/msword');
    toast('Hoja membretada descargada en Word.', 'success');
  };

  pintar();
}
