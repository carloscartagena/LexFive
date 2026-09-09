// ============================================================
//  VISTA: HOJA MEMBRETADA
//  Hoja con el membrete del bufete (encabezado y pie de diseño, logo, marca de
//  agua y, opcional, sello) para redactar cualquier documento. Tamaño Carta y
//  Oficio, descargable en PDF y Word. El encabezado y el pie usan el diseño
//  compartido (3 modelos) de membrete-base.js.
// ============================================================
import { withTimeout } from './auth.js';
import { ICON } from './icons.js';
import { esc } from './util.js';
import { descargarArchivo } from './exportar.js';
import { $, content } from './dom.js';
import { toast, loading } from './ui.js';
import { ensureImgCache } from './media.js';
import { hydrateBranding, pickActiveLogo, pickActiveSello, brandLogoSrc, brandSelloSrc, wmOpacityActual } from './branding.js';
import { MEMBRETE_MODELOS, modeloMembrete, setModeloMembrete, membretePagina, PRINT_COLOR_CSS } from './membrete-base.js';

const PAGES = {
  carta:  { label: 'Carta',  w: '21.6cm', h: '27.9cm', css: '21.6cm 27.9cm' },
  oficio: { label: 'Oficio', w: '21.6cm', h: '33cm',   css: '21.6cm 33cm' }
};

function urlAbs(src) {
  if (!src) return '';
  return src.indexOf('data:') === 0 ? src : new URL(src, location.href).href;
}

function buildMembrete(opts) {
  const { model, logoSrc, selloSrc, pageW, pageH } = opts;
  const sello = selloSrc
    ? `<div style="margin-top:auto;text-align:right;padding-top:12px;"><img src="${selloSrc}" alt="" style="width:3cm;height:3cm;object-fit:contain;mix-blend-mode:multiply;filter:contrast(1.25) brightness(1.08);opacity:.92;transform:rotate(-6deg);"></div>`
    : '';
  return membretePagina({ model, logoSrc, pageW, pageH, wmOp: wmOpacityActual() / 100, contentHTML: sello });
}

function abrirImpresion(titulo, docHTML, pageCss) {
  const w = window.open('', '_blank');
  if (!w) { toast('Permita las ventanas emergentes para imprimir.', 'error'); return; }
  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${esc(titulo)}</title>
    <style>@page{size:${pageCss};margin:0;} html,body{margin:0;background:#fff;} ${PRINT_COLOR_CSS}</style></head><body>${docHTML}
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
      <p class="cell-sub">Hoja con el membrete del bufete (encabezado y pie de diseño, logo y marca de agua) para redactar cualquier documento. Elija el modelo de diseño y el tamaño; «Imprimir / Guardar PDF» o descárguela en Word. El modelo elegido se aplica también a certificados e informe.</p>
    </div></div>

    <div class="card"><div class="card__body">
      <div style="display:flex;gap:18px;flex-wrap:wrap;align-items:flex-end;">
        <div class="field" style="margin:0;min-width:230px"><label>Modelo de hoja membretada</label>
          <select id="mb_modelo">${MEMBRETE_MODELOS.map(m => `<option value="${m.id}">${esc(m.nombre)}</option>`).join('')}</select></div>
        <div class="field" style="margin:0;min-width:200px"><label>Tamaño de hoja</label>
          <select id="mb_tam">
            <option value="carta">Carta (21.6 &times; 27.9 cm)</option>
            <option value="oficio">Oficio (21.6 &times; 33 cm)</option>
          </select></div>
        <label class="cell-sub" style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="mb_sello"> Incluir sello del bufete (al pie)</label>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn--primary" id="mb_print">${ICON.doc} Imprimir / Guardar PDF</button>
          <button class="btn btn--ghost" id="mb_word">Descargar Word</button>
        </div>
      </div>
    </div></div>

    <div class="card">
      <div class="card__head"><h3>Vista previa</h3></div>
      <div class="card__body"><div class="cert-preview" id="mbPreview"></div></div>
    </div>`;

  $('#mb_modelo').value = modeloMembrete();
  const page = () => PAGES[$('#mb_tam').value] || PAGES.carta;
  const docActual = () => {
    const p = page();
    return buildMembrete({ model: modeloMembrete(), logoSrc, selloSrc: ($('#mb_sello') && $('#mb_sello').checked) ? selloSrc : '', pageW: p.w, pageH: p.h });
  };
  const pintar = () => { $('#mbPreview').innerHTML = docActual(); };

  $('#mb_modelo').onchange = () => { setModeloMembrete($('#mb_modelo').value); pintar(); };
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
