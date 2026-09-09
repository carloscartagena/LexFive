// ============================================================
//  VISTA: SITIO WEB PÚBLICO
//  Pestaña «Sitio web»: el bufete controla la IMAGEN principal (hero) y el
//  ESTILO DE FONDO del sitio público. Se guardan en la nube (config
//  'branding', campos heroImg/bgStyle) y la web los aplica automáticamente.
//  Extraído de app.js (split por módulos).
// ============================================================
import { withTimeout } from './auth.js';
import { esc } from './util.js';
import { $, content } from './dom.js';
import { loading, toast } from './ui.js';
import { subirImagenBranding } from './storage.js';
import { optimizarFotoSitio, ampliarImagenSitio } from './imagenes.js';
import { Branding, bgOpOf, pushBranding, hydrateBranding } from './branding.js';

export async function renderSitio() {
  loading();
  try { await withTimeout(hydrateBranding(), 8000, 'branding'); } catch (e) {}
  const b = (Branding && Branding.local) ? (Branding.local() || {}) : {};
  const heroActual = b.heroImg || null;
  const sobreActual = b.sobreImg || null;
  const heroBgActual = b.heroBgImg || null;
  const heroBgOpActual = bgOpOf('lexfive_herobg_op');
  const aboutBgActual = b.aboutBgImg || null;
  const whyBgActual = b.whyBgImg || null;
  const testimonialsBgActual = b.testimonialsBgImg || null;
  const whyOpActual = bgOpOf('lexfive_whybg_op');
  const aboutOpActual = bgOpOf('lexfive_aboutbg_op');
  const testimonialsOpActual = bgOpOf('lexfive_testimonialsbg_op');

  // Caja reutilizable de vista previa + botones Subir/Ampliar/Quitar para una imagen.
  const cajaImg = (url, idSubir, idQuitar, idFile, idAmp) => `
    <div class="sello-box">
      <div class="big-preview big-preview--sello" style="max-width:340px">
        ${url ? `<img src="${esc(url)}" alt="Vista previa" id="${idAmp}Img" style="width:100%;border-radius:10px;display:block;cursor:zoom-in" title="Toque para ampliar">` : '<p class="cell-sub" style="padding:22px;text-align:center">Sin imagen propia (se usa la ilustración por defecto).</p>'}
      </div>
      <div class="sello-actions">
        <button class="btn btn--primary btn--sm" id="${idSubir}" type="button">Subir imagen</button>
        ${url ? `<button class="btn btn--ghost btn--sm" id="${idAmp}" type="button">Ampliar</button>` : ''}
        ${url ? `<button class="btn btn--ghost btn--sm" id="${idQuitar}" type="button">Quitar imagen</button>` : ''}
        <input type="file" id="${idFile}" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" hidden>
      </div>
    </div>`;

  // Deslizador de opacidad/visibilidad para una imagen de fondo (uno por sección).
  const sliderOpacidad = (id, val) => `
    <div style="display:flex;align-items:center;gap:12px;max-width:430px;margin-top:10px">
      <span class="cell-sub">Tenue</span>
      <input type="range" id="${id}" min="10" max="100" step="5" value="${val}" style="flex:1" aria-label="Visibilidad de la imagen">
      <span class="cell-sub">Visible</span>
      <strong id="${id}Val" style="min-width:46px;text-align:right">${val}%</strong>
    </div>`;

  content().innerHTML = `
    <div class="card"><div class="card__body">
      <h3 class="intro-title">Sitio web público</h3>
      <p class="cell-sub">Controle las <strong>imágenes</strong> y el <strong>fondo</strong> de la página de inicio (lexfive.netlify.app). Todo se guarda solo y se ve en la web en unos segundos. Formatos: <strong>JPG, PNG o WebP</strong> (máx. 25 MB; el sistema las optimiza al subir).</p>
    </div></div>

    <div class="card">
      <div class="card__head"><h3>Imagen principal (hero)</h3></div>
      <div class="card__body">
        <p class="cell-sub" style="margin-bottom:12px">La que aparece al costado del título, como una tarjeta. Horizontal o cuadrada (ideal ~1200×900 px). Si no sube ninguna, se muestra la ilustración por defecto.</p>
        ${cajaImg(heroActual, 'btnSubirHero', 'btnQuitarHero', 'fileHero', 'ampHero')}
      </div>
    </div>

    <div class="card">
      <div class="card__head"><h3>Imagen de «Sobre el bufete»</h3></div>
      <div class="card__body">
        <p class="cell-sub" style="margin-bottom:12px">La del recuadro de la sección «Sobre el bufete». El recuadro es alto, así que conviene una imagen <strong>vertical</strong> (ideal ~800×950 px). Si no sube ninguna, se muestra la ilustración (balanza) por defecto.</p>
        ${cajaImg(sobreActual, 'btnSubirSobre', 'btnQuitarSobre', 'fileSobre', 'ampSobre')}
      </div>
    </div>

    <div class="card">
      <div class="card__head"><h3>Imagen de fondo del encabezado</h3></div>
      <div class="card__body">
        <p class="cell-sub" style="margin-bottom:12px">Opcional: una foto detrás del título del encabezado (hero). Horizontal/panorámica (ideal ~1920×1080 px); mejor si es <strong>oscura</strong>, porque el texto va encima. El sistema le pone <strong>automáticamente una capa oscura</strong> para que el título y los botones siempre se lean. Si la quita, vuelve el fondo por defecto.</p>
        ${cajaImg(heroBgActual, 'btnSubirHeroBg', 'btnQuitarHeroBg', 'fileHeroBg', 'ampHeroBg')}
        ${sliderOpacidad('opHero', heroBgOpActual)}
      </div>
    </div>

    <div class="card">
      <div class="card__head"><h3>Imagen de fondo de secciones</h3></div>
      <div class="card__body">
        <p class="cell-sub" style="margin-bottom:14px">Opcional: una foto de fondo propia para estas secciones. La imagen <strong>reemplaza al patrón</strong> en esa sección. <strong>Cada una tiene su propio control de opacidad</strong> para que el texto se siga leyendo. Ideal horizontal/panorámica (~1920×1080 px). Si la quita, vuelve el patrón.</p>

        <h4 style="margin:0 0 8px">Sección «Razones para confiar»</h4>
        ${cajaImg(whyBgActual, 'btnSubirWhyBg', 'btnQuitarWhyBg', 'fileWhyBg', 'ampWhyBg')}
        ${sliderOpacidad('opWhy', whyOpActual)}

        <hr style="border:none;border-top:1px solid var(--line,rgba(0,0,0,.1));margin:20px 0">
        <h4 style="margin:0 0 8px">Sección «Sobre el bufete»</h4>
        ${cajaImg(aboutBgActual, 'btnSubirAboutBg', 'btnQuitarAboutBg', 'fileAboutBg', 'ampAboutBg')}
        ${sliderOpacidad('opAbout', aboutOpActual)}

        <hr style="border:none;border-top:1px solid var(--line,rgba(0,0,0,.1));margin:20px 0">
        <h4 style="margin:0 0 6px">Sección «Testimonios de clientes»</h4>
        <p class="cell-sub" style="margin-bottom:10px">Esta sección tiene <strong>texto claro sobre fondo oscuro</strong>: el sistema usa una capa oscura automática para que el texto se siga leyendo por encima de la imagen.</p>
        ${cajaImg(testimonialsBgActual, 'btnSubirTestiBg', 'btnQuitarTestiBg', 'fileTestiBg', 'ampTestiBg')}
        ${sliderOpacidad('opTesti', testimonialsOpActual)}
      </div>
    </div>`;

  // Conecta un control de subida/quitar/ampliar de imagen con su clave de branding.
  // lsKey: clave en localStorage; prefijo: carpeta en Storage; maxLado: tamaño
  // máximo del lado mayor al optimizar; idAmp: botón/imagen para ampliar.
  const wireImagen = (idSubir, idQuitar, idFile, idAmp, urlActual, titulo, lsKey, prefijo, maxLado, okMsg, quitarMsg) => {
    const file = $('#' + idFile);
    const btn = $('#' + idSubir);
    if (btn) btn.onclick = () => file.click();
    if (file) file.onchange = () => {
      const f = file.files && file.files[0]; file.value = '';
      if (!f) return;
      if (f.size > 25 * 1024 * 1024) { toast('La imagen pesa demasiado (máx. 25 MB). Use una más liviana.', 'error'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        optimizarFotoSitio(reader.result, maxLado, async (peq) => {
          toast('Subiendo imagen...', 'success');
          // Intenta guardarla en Storage (URL liviana). Si Storage no está
          // configurado o falla, NO se rechaza: se guarda la propia imagen
          // optimizada (base64) en la configuración, igual que los logos/sellos.
          // Así funciona en todos los dispositivos sin configurar nada en Supabase.
          let src = null;
          try { src = await subirImagenBranding(peq, prefijo); } catch (e) {}
          if (!src) src = peq;
          localStorage.setItem(lsKey, src);
          await pushBranding();
          toast(okMsg, 'success');
          renderSitio();
        });
      };
      reader.onerror = () => toast('No se pudo leer el archivo. Intente de nuevo.', 'error');
      reader.readAsDataURL(f);
    };
    const btnQ = $('#' + idQuitar);
    if (btnQ) btnQ.onclick = async () => {
      localStorage.setItem(lsKey, '');
      await pushBranding();
      toast(quitarMsg, 'success');
      renderSitio();
    };
    const amp = $('#' + idAmp);
    if (amp) amp.onclick = () => ampliarImagenSitio(urlActual, titulo);
    const ampImg = $('#' + idAmp + 'Img');
    if (ampImg) ampImg.onclick = () => ampliarImagenSitio(urlActual, titulo);
  };

  wireImagen('btnSubirHero', 'btnQuitarHero', 'fileHero', 'ampHero', heroActual, 'Imagen principal (hero)', 'lexfive_hero_url', 'hero', 1400,
    'Imagen del hero actualizada. Se verá en la web en unos segundos.', 'Imagen quitada. Se usará la ilustración por defecto.');
  wireImagen('btnSubirSobre', 'btnQuitarSobre', 'fileSobre', 'ampSobre', sobreActual, 'Imagen de «Sobre el bufete»', 'lexfive_sobre_url', 'sobre', 1200,
    'Imagen de «Sobre el bufete» actualizada. Se verá en la web en unos segundos.', 'Imagen quitada. Se usará la ilustración por defecto.');
  wireImagen('btnSubirHeroBg', 'btnQuitarHeroBg', 'fileHeroBg', 'ampHeroBg', heroBgActual, 'Imagen de fondo del encabezado', 'lexfive_herobg_url', 'herobg', 1920,
    'Fondo del encabezado actualizado. Se verá en la web en unos segundos.', 'Fondo del encabezado quitado. Vuelve el fondo por defecto.');
  wireImagen('btnSubirWhyBg', 'btnQuitarWhyBg', 'fileWhyBg', 'ampWhyBg', whyBgActual, 'Fondo de «Razones para confiar»', 'lexfive_whybg_url', 'whybg', 1920,
    'Fondo de la sección «Razones para confiar» actualizado. Se verá en la web en unos segundos.', 'Fondo quitado. Vuelve el patrón por defecto.');
  wireImagen('btnSubirAboutBg', 'btnQuitarAboutBg', 'fileAboutBg', 'ampAboutBg', aboutBgActual, 'Fondo de «Sobre el bufete»', 'lexfive_aboutbg_url', 'aboutbg', 1920,
    'Fondo de la sección «Sobre el bufete» actualizado. Se verá en la web en unos segundos.', 'Fondo quitado. Vuelve el patrón por defecto.');
  wireImagen('btnSubirTestiBg', 'btnQuitarTestiBg', 'fileTestiBg', 'ampTestiBg', testimonialsBgActual, 'Fondo de «Testimonios de clientes»', 'lexfive_testimonialsbg_url', 'testibg', 1920,
    'Fondo de la sección «Testimonios» actualizado. Se verá en la web en unos segundos.', 'Fondo quitado. Vuelve el patrón por defecto.');

  // Deslizadores de visibilidad: uno por cada imagen de fondo de sección.
  const wireOp = (id, lsKey) => {
    const s = $('#' + id), lbl = $('#' + id + 'Val');
    if (!s) return;
    s.oninput = () => { if (lbl) lbl.textContent = s.value + '%'; };
    s.onchange = async () => {
      localStorage.setItem(lsKey, s.value);
      await pushBranding();
      toast('Visibilidad de la imagen actualizada. Se verá en la web en unos segundos.', 'success');
    };
  };
  wireOp('opWhy', 'lexfive_whybg_op');
  wireOp('opAbout', 'lexfive_aboutbg_op');
  wireOp('opTesti', 'lexfive_testimonialsbg_op');
  wireOp('opHero', 'lexfive_herobg_op');
}
