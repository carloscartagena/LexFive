// ============================================================
//  VISTA: SELLOS Y LOGOS DEL BUFETE
//  Administración del branding: galería de logos y sellos (predeterminados y
//  propios), subir/eliminar/restaurar, ver en grande, descargar e imprimir.
//  Extraído de app.js (split por módulos).
// ============================================================
import { withTimeout } from './auth.js';
import { esc } from './util.js';
import { srcDe } from './exportar.js';
import { $, content } from './dom.js';
import { loading, toast } from './ui.js';
import { state } from './state.js';
import { subirImagenBranding } from './storage.js';
import { abrirEditorImagen, redimensionarDataUrl } from './imagenes.js';
import { ImgDB, IMG, ensureImgCache, guardarImagen, borrarImagen, saveLogosCustom, saveSellosCustom, findCustomLogo, findCustomSello } from './media.js';
import { BRAND_LOGOS, BRAND_SELLOS, BRAND_LOGO_DEFAULT, BRAND_SELLO_DEFAULT, brandHidden, brandLogosVisibles, brandSellosVisibles } from './branding-catalogos.js';
import { pushBranding, pushGalerias, hydrateBranding, brandingHydrated, pickActiveLogo, pickActiveSello, brandLogoSrc, brandSelloSrc, nombreLogoArchivo, nombreSelloArchivo, applyLogo } from './branding.js';

// Muestra una imagen de branding EN GRANDE y deja decidir si se usa como
// predeterminada (antes bastaba un clic en la miniatura para aplicarla, lo que
// provocaba selecciones accidentales). El sello se muestra sobre fondo blanco
// para que se vea bien aunque el modo oscuro esté activo.
function previewBrandImage(src, titulo, nombreArchivo, onUse, useLabel, esSello) {
  if (!src) { toast('No hay imagen para mostrar.', 'error'); return; }
  const o = document.createElement('div');
  o.className = 'img-editor';
  o.innerHTML = `
    <div class="img-editor__panel" style="width:540px;max-width:100%">
      <h3>${esc(titulo || 'Vista previa')}</h3>
      <div class="big-preview${esSello ? ' big-preview--sello' : ''}"><img src="${src}" alt="${esc(titulo || '')}"></div>
      <p class="cell-sub" style="text-align:center;margin:-2px 0 12px">Revise el diseño. Si le gusta, pulse <strong>${esc(useLabel || 'Usar este')}</strong> para dejarlo como predeterminado.</p>
      <div class="img-editor__actions">
        <a class="btn btn--ghost" href="${src}" download="${esc(nombreArchivo || 'imagen')}">Descargar</a>
        <button class="btn btn--ghost" id="bpClose" type="button">Cancelar</button>
        <button class="btn btn--primary" id="bpUse" type="button">${esc(useLabel || 'Usar este')}</button>
      </div>
    </div>`;
  document.body.appendChild(o);
  const close = () => o.remove();
  o.querySelector('#bpClose').onclick = close;
  o.querySelector('#bpUse').onclick = () => { close(); if (onUse) onUse(); };
  o.onclick = e => { if (e.target === o) close(); };
}

// Aplica el logo elegido como predeterminado del bufete (se sincroniza en la nube).
async function seleccionarLogo(id) {
  if (id.indexOf('custom:') === 0) {
    const lc = findCustomLogo(id.slice(7));
    if (lc) { const s = srcDe(lc); IMG.logo = s; try { await ImgDB.set('logo', s); } catch (e) {} localStorage.setItem('lexfive_logo_custom', '1'); }
  }
  localStorage.setItem('lexfive_logo', id);
  applyLogo(id);
  pushBranding();
  if (state.view === 'sellos') renderSellos();
  toast('Logo aplicado. Se usará en todo el sistema y en todos los dispositivos.', 'success');
}
// Aplica el sello elegido como predeterminado del bufete.
async function seleccionarSello(id) {
  if (id.indexOf('custom:') === 0) {
    const sc = findCustomSello(id.slice(7));
    if (sc) { const s = srcDe(sc); IMG.sello = s; try { await ImgDB.set('sello', s); } catch (e) {} localStorage.setItem('lexfive_sello_custom', '1'); }
  }
  localStorage.setItem('lexfive_sello', id);
  pushBranding();
  if (state.view === 'sellos') renderSellos();
  toast('Sello seleccionado. Listo para memoriales y documentos.', 'success');
}

// Lee una imagen subida por el bufete (kind = 'logo' | 'sello'), la valida y la guarda.
function leerImagenBufete(file, kind, done) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const tiposOk = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'];
  const extOk = ['svg', 'png', 'jpg', 'jpeg', 'webp'].includes(ext);
  if (!tiposOk.includes(file.type) && !extOk) {
    toast('Formato no válido. Use SVG o PNG (de preferencia con fondo transparente).', 'error');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    toast('La imagen pesa demasiado (máx. 5 MB). Exporte una versión más liviana.', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    const guardar = async (dataUrl) => {
      const ok = await guardarImagen(kind, dataUrl);
      if (!ok) { toast('No se pudo guardar la imagen. Intente con una más liviana.', 'error'); return; }
      localStorage.setItem('lexfive_' + kind, 'custom');
      if (typeof done === 'function') done();
    };
    const esSvg = file.type === 'image/svg+xml' || ext === 'svg';
    // Los SVG son livianos y escalables: se guardan tal cual. Las imágenes de
    // mapa de bits (PNG/JPG/WebP) se REDIMENSIONAN a máx. 600 px y se recomprimen,
    // para que pesen poco (subida y carga rápidas) y no inflen la base de datos.
    if (esSvg) { guardar(reader.result); }
    else { redimensionarDataUrl(reader.result, 600, (peq) => guardar(peq)); }
  };
  reader.onerror = () => toast('No se pudo leer el archivo. Intente de nuevo.', 'error');
  reader.readAsDataURL(file);
}

// ============================================================
//  Pestaña «Sellos y logos» — administración del branding del bufete.
//  Se separó de «Credenciales» para que cada cosa cargue por su cuenta y
//  sea más liviana y clara.
// ============================================================
export async function renderSellos() {
  loading();
  // Pinta de inmediato con lo que ya está en este equipo (IndexedDB + caché
  // local) y, SOLO la primera vez por sesión, baja la versión de la nube en
  // segundo plano y refresca una vez. Antes esperaba la red (hasta 8 s) ANTES
  // de mostrar nada, por eso la pestaña "se abría lenta".
  try { await withTimeout(ensureImgCache(), 8000, 'imágenes'); } catch (e) { console.warn('Sellos: ensureImgCache falló/timeout', e); }
  const necesitaRed = !brandingHydrated;

  function paint() {
  const logoActual = pickActiveLogo(localStorage.getItem('lexfive_logo'));
  const selloActual = pickActiveSello(localStorage.getItem('lexfive_sello'));
  const logosVisibles = brandLogosVisibles();
  const sellosVisibles = brandSellosVisibles();
  const hiddenLogos = brandHidden('lexfive_logos_hidden');
  const hiddenSellos = brandHidden('lexfive_sellos_hidden');

  content().innerHTML = `
    <div class="card">
      <div class="card__body">
        <h3 class="intro-title">Sellos y logos del bufete</h3>
        <p class="cell-sub">Toque cualquier logo o sello para verlo <strong>en grande</strong> y, si le gusta, pulse <strong>Usar este</strong> para dejarlo como predeterminado. Se aplican en la página, el panel, las credenciales y los memoriales.</p>
      </div>
    </div>

    <div class="card">
      <div class="card__head"><h3>Logotipo del bufete</h3></div>
      <div class="card__body">
        <p class="cell-sub" style="margin-bottom:12px">Toque un modelo para <strong>verlo en grande</strong> y decidir si lo usa. Elimínelo con la <strong>✕</strong>, o <strong>suba su propio logo</strong>.</p>
        <div class="logo-gallery">
          ${logosVisibles.map(l => `
            <div class="logo-option ${l.id === logoActual ? 'is-selected' : ''}" data-logo="${l.id}">
              <button class="tile-del" data-del-logo="${l.id}" type="button" title="Eliminar este modelo">&times;</button>
              <img src="../assets/logos/${l.id}.svg" alt="${esc(l.nombre)}">
              <span>${esc(l.nombre)}</span>
            </div>`).join('')}
          ${IMG.logosCustom.map((lc, i) => `
            <div class="logo-option ${logoActual === 'custom:' + lc.id ? 'is-selected' : ''}" data-logo="custom:${lc.id}">
              <button class="tile-del" data-del-logo="custom:${lc.id}" type="button" title="Quitar este logo">&times;</button>
              <img src="${srcDe(lc)}" alt="Mi logo ${i + 1}">
              <span>Mi logo ${i + 1}</span>
            </div>`).join('')}
          <button class="logo-option logo-upload" id="btnUploadLogo" type="button">
            <span class="logo-upload__plus">+</span>
            <span>Subir mi logo</span>
          </button>
        </div>
        <input type="file" id="fileLogo" accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp" hidden>
        <p class="cell-sub" style="margin-top:10px">Acepta <strong>SVG</strong> o foto <strong>JPG/PNG</strong>. Si sube una foto podrá <strong>recortarla, ajustar el tamaño y se convertirá a PNG</strong> automáticamente (con opción de quitar el fondo blanco). ${hiddenLogos.length ? '<button class="btn btn--ghost btn--sm" id="btnRestoreLogos" type="button" style="margin-left:8px">Restaurar modelos eliminados</button>' : ''}</p>
        <div class="brand-preview">
          <img src="${brandLogoSrc(logoActual)}" alt="Logo predeterminado" class="brand-preview__img" id="logoPreviewBig">
          <div class="brand-preview__side">
            <p class="cell-sub" style="margin:0 0 8px"><strong>Logo predeterminado actual.</strong> Es el que se usa en todo el sistema.</p>
            <button class="btn btn--ghost btn--sm" id="btnLogoBig" type="button">Ver en grande</button>
            <a class="btn btn--ghost btn--sm" id="logoDownload" href="${brandLogoSrc(logoActual)}" download="${nombreLogoArchivo(logoActual)}" style="margin-left:6px">Descargar logo</a>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card__head"><h3>Sello del bufete</h3></div>
      <div class="card__body">
        <p class="cell-sub" style="margin-bottom:12px">Toque un sello para <strong>verlo en grande</strong> y decidir si lo usa. Elimínelo con la <strong>✕</strong>, o <strong>suba el suyo</strong>. Puede descargarlo o imprimirlo para <strong>memoriales</strong>, documentos y el reverso de las credenciales.</p>
        <div class="logo-gallery">
          ${sellosVisibles.map(s => `
            <div class="logo-option sello-option ${s.id === selloActual ? 'is-selected' : ''}" data-sello="${s.id}">
              <button class="tile-del" data-del-sello="${s.id}" type="button" title="Eliminar este sello">&times;</button>
              <img src="../assets/sellos/${s.id}.svg" alt="${esc(s.nombre)}">
              <span>${esc(s.nombre)}</span>
            </div>`).join('')}
          ${IMG.sellosCustom.map((sc, i) => `
            <div class="logo-option sello-option ${selloActual === 'custom:' + sc.id ? 'is-selected' : ''}" data-sello="custom:${sc.id}">
              <button class="tile-del" data-del-sello="custom:${sc.id}" type="button" title="Quitar este sello">&times;</button>
              <img src="${srcDe(sc)}" alt="Mi sello ${i + 1}">
              <span>Mi sello ${i + 1}</span>
            </div>`).join('')}
          <button class="logo-option logo-upload" id="btnUploadSello" type="button">
            <span class="logo-upload__plus">+</span>
            <span>Subir mi sello</span>
          </button>
        </div>
        <input type="file" id="fileSello" accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp" hidden>
        <p class="cell-sub" style="margin-top:10px">Acepta <strong>SVG</strong> o foto <strong>JPG/PNG</strong>. Si sube una foto podrá <strong>recortarla, ajustar el tamaño y se convertirá a PNG</strong> (con opción de quitar el fondo blanco). ${hiddenSellos.length ? '<button class="btn btn--ghost btn--sm" id="btnRestoreSellos" type="button" style="margin-left:8px">Restaurar sellos eliminados</button>' : ''}</p>
        <div class="sello-box" style="margin-top:14px">
          <img src="${brandSelloSrc(selloActual)}" alt="Sello LexFive Abogados" class="sello-img" id="selloPreview">
          <div class="sello-actions">
            <button class="btn btn--ghost btn--sm" id="btnSelloBig" type="button">Ver en grande</button>
            <a class="btn btn--ghost btn--sm" href="${brandSelloSrc(selloActual)}" download="${nombreSelloArchivo(selloActual)}" id="selloDownload">Descargar sello</a>
            <button class="btn btn--ghost btn--sm" id="btnPrintSello">Imprimir sello</button>
          </div>
        </div>
      </div>
    </div>`;

  // ---- Logo: tocar para ver en grande y elegir ----
  content().querySelectorAll('.logo-option[data-logo]').forEach(tile => tile.onclick = () => {
    const id = tile.dataset.logo;
    previewBrandImage(brandLogoSrc(id), 'Vista del logo', nombreLogoArchivo(id), () => seleccionarLogo(id), 'Usar este logo', false);
  });
  const btnLogoBig = $('#btnLogoBig');
  if (btnLogoBig) btnLogoBig.onclick = () => previewBrandImage(brandLogoSrc(logoActual), 'Logo del bufete', nombreLogoArchivo(logoActual), () => seleccionarLogo(logoActual), 'Usar este logo', false);

  // Subir mi logo (SVG tal cual; foto JPG/PNG pasa por el editor y se convierte a PNG)
  const fileLogo = $('#fileLogo');
  const btnUploadLogo = $('#btnUploadLogo');
  if (btnUploadLogo) btnUploadLogo.onclick = () => fileLogo.click();
  // Tras subir un logo, lo agrega a la galería y lo deja seleccionado. La
  // sincronización con la nube se hace en segundo plano para que la vista
  // responda al instante (antes esperaba 2 escrituras de red antes de pintar).
  const trasSubirLogo = async () => {
    let img = IMG.logo;
    if (img && img.indexOf('data:') === 0) {
      const url = await subirImagenBranding(img, 'logos');
      if (url) { img = url; IMG.logo = url; try { await ImgDB.set('logo', url); } catch (e) {} }
    }
    let entry = IMG.logosCustom.find(x => x && srcDe(x) === img);
    if (!entry && img) { entry = (img.indexOf('http') === 0) ? { id: 'c' + Date.now(), url: img } : { id: 'c' + Date.now(), img }; IMG.logosCustom.push(entry); }
    await saveLogosCustom();
    localStorage.setItem('lexfive_logo', entry ? 'custom:' + entry.id : 'custom');
    applyLogo('custom');
    renderSellos();
    pushGalerias();
    pushBranding();
  };
  if (fileLogo) fileLogo.onchange = () => {
    const f = fileLogo.files && fileLogo.files[0];
    fileLogo.value = '';
    if (!f) return;
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (f.type === 'image/svg+xml' || ext === 'svg') {
      leerImagenBufete(f, 'logo', async () => { await trasSubirLogo(); toast('Logo subido y aplicado. Se conserva junto a los anteriores.', 'success'); });
    } else {
      abrirEditorImagen(f, { titulo: 'Ajustar logo', salida: 600, quitarBlanco: false }, async (pngUrl) => {
        const ok = await guardarImagen('logo', pngUrl);
        if (!ok) { toast('No se pudo guardar la imagen. Intente con una más liviana.', 'error'); return; }
        await trasSubirLogo();
        toast('Logo ajustado, convertido a PNG y guardado junto a los anteriores.', 'success');
      });
    }
  };

  // Eliminar / restaurar logos
  content().querySelectorAll('[data-del-logo]').forEach(b => b.onclick = async (e) => {
    e.stopPropagation();
    const id = b.dataset.delLogo;
    if (!confirm('¿Eliminar este logo de la galería?')) return;
    if (id.indexOf('custom:') === 0) {
      IMG.logosCustom = IMG.logosCustom.filter(x => x && x.id !== id.slice(7));
      await saveLogosCustom();
    } else if (id === 'custom') {
      borrarImagen('logo');
    } else {
      const arr = brandHidden('lexfive_logos_hidden'); if (arr.indexOf(id) === -1) arr.push(id); localStorage.setItem('lexfive_logos_hidden', JSON.stringify(arr));
    }
    const sel = localStorage.getItem('lexfive_logo');
    let valida = false;
    if (sel && sel.indexOf('custom:') === 0) valida = !!findCustomLogo(sel.slice(7));
    else if (sel === 'custom') valida = IMG.logosCustom.length > 0;
    else valida = BRAND_LOGOS.some(l => l.id === sel) && brandHidden('lexfive_logos_hidden').indexOf(sel) === -1;
    if (!valida) {
      const vis = brandLogosVisibles();
      let nuevo;
      if (IMG.logosCustom.length) { const f = IMG.logosCustom[0]; nuevo = 'custom:' + f.id; const s = srcDe(f); IMG.logo = s; try { await ImgDB.set('logo', s); } catch (er) {} }
      else { IMG.logo = null; try { await ImgDB.del('logo'); } catch (er) {} nuevo = vis.length ? vis[0].id : BRAND_LOGO_DEFAULT; }
      localStorage.setItem('lexfive_logo', nuevo); applyLogo(nuevo);
    }
    renderSellos();
    pushGalerias();
    pushBranding();
    toast('Logo eliminado de la galería.', 'success');
  });
  const btnRestoreLogos = $('#btnRestoreLogos');
  if (btnRestoreLogos) btnRestoreLogos.onclick = () => { localStorage.removeItem('lexfive_logos_hidden'); renderSellos(); pushBranding(); toast('Modelos de logo restaurados.', 'success'); };

  // ---- Sello: tocar para ver en grande y elegir ----
  content().querySelectorAll('.sello-option[data-sello]').forEach(tile => tile.onclick = () => {
    const id = tile.dataset.sello;
    previewBrandImage(brandSelloSrc(id), 'Vista del sello', nombreSelloArchivo(id), () => seleccionarSello(id), 'Usar este sello', true);
  });
  const btnSelloBig = $('#btnSelloBig');
  if (btnSelloBig) btnSelloBig.onclick = () => previewBrandImage(brandSelloSrc(selloActual), 'Sello del bufete', nombreSelloArchivo(selloActual), () => seleccionarSello(selloActual), 'Usar este sello', true);

  // Subir mi sello (SVG tal cual; foto pasa por el editor y se convierte a PNG)
  const fileSello = $('#fileSello');
  const btnUploadSello = $('#btnUploadSello');
  if (btnUploadSello) btnUploadSello.onclick = () => fileSello.click();
  const trasSubirSello = async () => {
    let img = IMG.sello;
    if (img && img.indexOf('data:') === 0) {
      const url = await subirImagenBranding(img, 'sellos');
      if (url) { img = url; IMG.sello = url; try { await ImgDB.set('sello', url); } catch (e) {} }
    }
    let entry = IMG.sellosCustom.find(x => x && srcDe(x) === img);
    if (!entry && img) { entry = (img.indexOf('http') === 0) ? { id: 's' + Date.now(), url: img } : { id: 's' + Date.now(), img }; IMG.sellosCustom.push(entry); }
    await saveSellosCustom();
    localStorage.setItem('lexfive_sello', entry ? 'custom:' + entry.id : 'custom');
    renderSellos();
    pushGalerias();
    pushBranding();
  };
  if (fileSello) fileSello.onchange = () => {
    const f = fileSello.files && fileSello.files[0];
    fileSello.value = '';
    if (!f) return;
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (f.type === 'image/svg+xml' || ext === 'svg') {
      leerImagenBufete(f, 'sello', async () => { await trasSubirSello(); toast('Sello subido. Se conserva junto a los anteriores.', 'success'); });
    } else {
      abrirEditorImagen(f, { titulo: 'Ajustar sello', salida: 1000, quitarBlanco: true }, async (pngUrl) => {
        const ok = await guardarImagen('sello', pngUrl);
        if (!ok) { toast('No se pudo guardar la imagen. Intente con una más liviana.', 'error'); return; }
        await trasSubirSello();
        toast('Sello ajustado, convertido a PNG y guardado junto a los anteriores.', 'success');
      });
    }
  };

  // Eliminar / restaurar sellos
  content().querySelectorAll('[data-del-sello]').forEach(b => b.onclick = async (e) => {
    e.stopPropagation();
    const id = b.dataset.delSello;
    if (!confirm('¿Eliminar este sello de la galería?')) return;
    if (id.indexOf('custom:') === 0) {
      IMG.sellosCustom = IMG.sellosCustom.filter(x => x && x.id !== id.slice(7));
      await saveSellosCustom();
    } else if (id === 'custom') {
      borrarImagen('sello');
    } else {
      const arr = brandHidden('lexfive_sellos_hidden'); if (arr.indexOf(id) === -1) arr.push(id); localStorage.setItem('lexfive_sellos_hidden', JSON.stringify(arr));
    }
    const sel = localStorage.getItem('lexfive_sello');
    let valida = false;
    if (sel && sel.indexOf('custom:') === 0) valida = !!findCustomSello(sel.slice(7));
    else if (sel === 'custom') valida = IMG.sellosCustom.length > 0;
    else valida = BRAND_SELLOS.some(s => s.id === sel) && brandHidden('lexfive_sellos_hidden').indexOf(sel) === -1;
    if (!valida) {
      const vis = brandSellosVisibles();
      let nuevo;
      if (IMG.sellosCustom.length) { const f = IMG.sellosCustom[0]; nuevo = 'custom:' + f.id; const s = srcDe(f); IMG.sello = s; try { await ImgDB.set('sello', s); } catch (er) {} }
      else { IMG.sello = null; try { await ImgDB.del('sello'); } catch (er) {} nuevo = vis.length ? vis[0].id : BRAND_SELLO_DEFAULT; }
      localStorage.setItem('lexfive_sello', nuevo);
    }
    renderSellos();
    pushGalerias();
    pushBranding();
    toast('Sello eliminado de la galería.', 'success');
  });
  const btnRestoreSellos = $('#btnRestoreSellos');
  if (btnRestoreSellos) btnRestoreSellos.onclick = () => { localStorage.removeItem('lexfive_sellos_hidden'); renderSellos(); pushBranding(); toast('Sellos restaurados.', 'success'); };

  // Imprimir sello
  const bps = $('#btnPrintSello');
  if (bps) bps.onclick = () => {
    const src = brandSelloSrc(selloActual);
    const abs = src.indexOf('data:') === 0 ? src : new URL(src, location.href).href;
    const w = window.open('', '_blank');
    w.document.write('<img src="' + abs + '" style="width:6cm;height:6cm;object-fit:contain" onload="window.print();window.close()">');
    w.document.close();
  };
  } // ---- fin de paint() ----

  paint(); // muestra YA la pestaña con los datos locales
  // Solo la primera vez por sesión se baja la versión de la nube y, si llega,
  // se vuelve a pintar una vez (las siguientes aperturas ya son instantáneas).
  if (necesitaRed) hydrateBranding().then(() => { if (state.view === 'sellos') paint(); }).catch(() => {});
}
