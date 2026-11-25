// ============================================================
//  VISTA: SITIO WEB PÚBLICO
//  Pestaña «Configuración del Sitio»: control de imágenes, fondos,
//  asistente IA para campañas y textos dinámicos de portada (index.html).
//  Se guardan en la nube (config 'branding') y la web los aplica automáticamente.
// ============================================================
import { withTimeout } from './auth.js';
import { esc } from './util.js';
import { $, content } from './dom.js';
import { loading, toast } from './ui.js';
import { subirImagenBranding } from './storage.js';
import { optimizarFotoSitio, ampliarImagenSitio } from './imagenes.js';
import { Branding, bgOpOf, pushBranding, hydrateBranding } from './branding.js';
import { generateContent } from './ai.js';

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

  // Textos actuales o fallbacks por defecto
  const campanaActiva = !!b.campana_activa;
  const campanaTexto = b.campana_texto || 'Campaña especial: Asesoría jurídica prioritaria en derecho laboral y civil en El Alto.';
  const campanaEnlaceTexto = b.campana_enlace_texto || 'Consultar ahora';
  const campanaEnlaceUrl = b.campana_enlace_url || '#contacto';
  const heroBadge = b.hero_badge || 'Bufete de abogados · Derecho & Tecnología';
  const heroTitulo = b.hero_titulo || 'Defendemos sus derechos con experiencia y compromiso';
  const heroSubtitulo = b.hero_subtitulo || 'En LexFive ofrecemos soluciones legales claras, estratégicas y a la medida de cada cliente en materia laboral, civil, penal y familiar. Su tranquilidad es nuestra prioridad.';
  const heroBtnTexto = b.hero_btn_texto || 'Solicitar consulta gratis';
  const sobreTexto = b.sobre_texto || 'En LexFive creemos que cada cliente merece una atención personalizada y una defensa rigurosa. Acompañamos a personas y empresas de El Alto y La Paz en los momentos legales más decisivos, siempre con transparencia y ética profesional. Además, unimos el ejercicio del derecho con la ingeniería de sistemas y el desarrollo de software, para ofrecer soluciones modernas y a la medida.';

  const metricasDef = [
    { valor: '1', etiqueta: 'Año de experiencia' },
    { valor: '6', etiqueta: 'Abogados especialistas' },
    { valor: '25+', etiqueta: 'Áreas de práctica' },
    { valor: '95%', etiqueta: 'Clientes satisfechos' }
  ];
  const metricasActuales = (Array.isArray(b.metricas) && b.metricas.length === 4) ? b.metricas : metricasDef;

  // Caja reutilizable de vista previa + botones Subir/Ampliar/Quitar para una imagen.
  // Corrige el fondo blanco fijo en modo oscuro usando var(--card-bg, #0b192c)
  const cajaImg = (url, idSubir, idQuitar, idFile, idAmp) => `
    <div class="sello-box">
      <div class="big-preview big-preview--sitio" style="max-width:340px; background:var(--card-bg, #0b192c); border:1px solid var(--line, rgba(212,175,55,0.25)); border-radius:10px; overflow:hidden">
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
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div>
          <h3 class="intro-title" style="margin-bottom:4px">Gestión Dinámica del Sitio Web</h3>
          <p class="cell-sub" style="margin:0">Controle <strong>textos, campañas, métricas, imágenes y fondos</strong> de la página principal (lexfive.netlify.app). Los cambios se sincronizan en vivo sin necesidad de programar.</p>
        </div>
        <a href="../index.html" target="_blank" rel="noopener" class="btn btn--ghost btn--sm" style="display:inline-flex;align-items:center;gap:6px">
          Ver portada en vivo ↗
        </a>
      </div>
    </div></div>

    <!-- BLOQUE 1: ASISTENTE IA PARA PORTADA Y CAMPAÑAS -->
    <div class="card" style="border:1px solid rgba(212,175,55,0.4);background:radial-gradient(circle at 10% 10%, rgba(212,175,55,0.06) 0%, transparent 70%);">
      <div class="card__head" style="display:flex;align-items:center;gap:10px">
        <span style="font-size:1.4rem">✨</span>
        <h3 style="margin:0">Asistente IA para Portada y Campañas</h3>
      </div>
      <div class="card__body">
        <p class="cell-sub" style="margin-bottom:12px">
          Describa el objetivo o la campaña que desea promocionar y la Inteligencia Artificial redactará automáticamente el titular, subtítulo, llamada a la acción y franja de campaña optimizados para captar clientes en Bolivia.
        </p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          <input type="text" id="sitioPromptCampana" placeholder="Ej. Campaña de derecho laboral, despidos intempestivos y finiquitos en El Alto" style="flex:1;min-width:280px">
          <button type="button" class="btn btn--primary" id="btnIaCampana" style="white-space:nowrap">
            Generar textos de portada con IA
          </button>
        </div>
        <p class="cell-sub" style="margin-top:8px;font-size:0.82rem;opacity:0.8">
          Al generar, se rellenarán automáticamente los campos de campaña, hero y sobre el bufete de abajo para que pueda revisarlos o editarlos antes de guardar.
        </p>
      </div>
    </div>

    <!-- BLOQUE 2: TEXTOS, CAMPAÑA Y MÉTRICAS DE LA PORTADA -->
    <div class="card">
      <div class="card__head">
        <h3>Textos, Campaña y Métricas de la Portada (index.html)</h3>
      </div>
      <div class="card__body">
        
        <!-- Franja de Campaña Superior -->
        <div style="background:var(--bg-soft,rgba(0,0,0,0.04));padding:16px;border-radius:10px;margin-bottom:20px;border:1px solid var(--line,rgba(212,175,55,0.15))">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:10px">
            <h4 style="margin:0;font-size:1.05rem">1. Franja de Campaña Superior</h4>
            <label class="chk" style="margin:0;cursor:pointer;font-weight:600">
              <input type="checkbox" id="sitioCampanaActiva" ${campanaActiva ? 'checked' : ''}>
              Mostrar franja de campaña en la web
            </label>
          </div>
          <div class="field">
            <label>Texto del anuncio / campaña</label>
            <input type="text" id="sitioCampanaTexto" value="${esc(campanaTexto)}" placeholder="Ej. Campaña especial: Asesoría jurídica prioritaria en derecho laboral...">
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
            <div class="field">
              <label>Texto del botón / enlace</label>
              <input type="text" id="sitioCampanaEnlaceTexto" value="${esc(campanaEnlaceTexto)}" placeholder="Ej. Consultar ahora">
            </div>
            <div class="field">
              <label>Destino del enlace</label>
              <input type="text" id="sitioCampanaEnlaceUrl" value="${esc(campanaEnlaceUrl)}" placeholder="Ej. #contacto o enlace WhatsApp">
            </div>
          </div>
        </div>

        <!-- Hero Principal -->
        <h4 style="margin:16px 0 10px">2. Encabezado Principal (Hero)</h4>
        <div class="field">
          <label>Badge superior (antetítulo)</label>
          <input type="text" id="sitioHeroBadge" value="${esc(heroBadge)}" placeholder="Ej. Bufete de abogados · Derecho & Tecnología">
        </div>
        <div class="field">
          <label>Titular principal (Hero)</label>
          <input type="text" id="sitioHeroTitulo" value="${esc(heroTitulo)}" placeholder="Ej. Defendemos sus derechos con experiencia y compromiso">
        </div>
        <div class="field">
          <label>Subtítulo descriptivo</label>
          <textarea id="sitioHeroSubtitulo" rows="2" placeholder="Subtítulo persuasivo orientado a beneficios para el cliente">${esc(heroSubtitulo)}</textarea>
        </div>
        <div class="field">
          <label>Texto del botón principal (CTA)</label>
          <input type="text" id="sitioHeroBtnTexto" value="${esc(heroBtnTexto)}" placeholder="Ej. Solicitar consulta gratis">
        </div>

        <!-- Sobre el Bufete -->
        <h4 style="margin:20px 0 10px">3. Sección «Sobre el bufete»</h4>
        <div class="field">
          <label>Texto descriptivo institucional</label>
          <textarea id="sitioSobreTexto" rows="3" placeholder="Resumen institucional de excelencia jurídica">${esc(sobreTexto)}</textarea>
        </div>

        <!-- 4 Métricas de Impacto -->
        <h4 style="margin:20px 0 10px">4. Métricas de Impacto (Estadísticas en Portada)</h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px">
          ${metricasActuales.map((m, idx) => `
            <div style="padding:12px;background:var(--bg-soft,rgba(0,0,0,0.03));border-radius:8px;border:1px solid var(--line,rgba(0,0,0,0.08))">
              <strong style="display:block;margin-bottom:6px;font-size:0.85rem;color:var(--gold,#d4af37)">Métrica #${idx + 1}</strong>
              <div class="field" style="margin-bottom:8px">
                <label style="font-size:0.8rem">Valor / Cifra</label>
                <input type="text" id="metricaVal${idx}" value="${esc(m.valor)}" placeholder="Ej. 1, 6, 25+, 95%">
              </div>
              <div class="field" style="margin:0">
                <label style="font-size:0.8rem">Etiqueta descriptiva</label>
                <input type="text" id="metricaLbl${idx}" value="${esc(m.etiqueta)}" placeholder="Ej. Años de experiencia">
              </div>
            </div>
          `).join('')}
        </div>

        <div style="margin-top:24px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <button type="button" class="btn btn--primary" id="btnGuardarTextosSitio">
            💾 Guardar cambios en vivo
          </button>
          <a href="../index.html" target="_blank" rel="noopener" class="btn btn--ghost">
            Ver portada en vivo ↗
          </a>
        </div>

      </div>
    </div>

    <!-- BLOQUE 3: GESTIÓN DE IMÁGENES Y FONDOS -->
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
        <p class="cell-sub" style="margin-bottom:12px">La del recuadro de la sección «Sobre el bufete». El recuadro es alto, así que conviene una imagen vertical (ideal ~800×950 px). Si no sube ninguna, se muestra la ilustración por defecto.</p>
        ${cajaImg(sobreActual, 'btnSubirSobre', 'btnQuitarSobre', 'fileSobre', 'ampSobre')}
      </div>
    </div>

    <div class="card">
      <div class="card__head"><h3>Imagen de fondo del encabezado</h3></div>
      <div class="card__body">
        <p class="cell-sub" style="margin-bottom:12px">Opcional: una foto detrás del título del encabezado (hero). Horizontal/panorámica (ideal ~1920×1080 px); mejor si es oscura, porque el texto va encima. El sistema le pone automáticamente una capa oscura para que el texto siempre se lea.</p>
        ${cajaImg(heroBgActual, 'btnSubirHeroBg', 'btnQuitarHeroBg', 'fileHeroBg', 'ampHeroBg')}
        ${sliderOpacidad('opHero', heroBgOpActual)}
      </div>
    </div>

    <div class="card">
      <div class="card__head"><h3>Imagen de fondo de secciones</h3></div>
      <div class="card__body">
        <p class="cell-sub" style="margin-bottom:14px">Opcional: una foto de fondo propia para estas secciones. La imagen reemplaza al patrón en esa sección. Cada una tiene su propio control de opacidad.</p>

        <h4 style="margin:0 0 8px">Sección «Razones para confiar»</h4>
        ${cajaImg(whyBgActual, 'btnSubirWhyBg', 'btnQuitarWhyBg', 'fileWhyBg', 'ampWhyBg')}
        ${sliderOpacidad('opWhy', whyOpActual)}

        <hr style="border:none;border-top:1px solid var(--line,rgba(0,0,0,.1));margin:20px 0">
        <h4 style="margin:0 0 8px">Sección «Sobre el bufete»</h4>
        ${cajaImg(aboutBgActual, 'btnSubirAboutBg', 'btnQuitarAboutBg', 'fileAboutBg', 'ampAboutBg')}
        ${sliderOpacidad('opAbout', aboutOpActual)}

        <hr style="border:none;border-top:1px solid var(--line,rgba(0,0,0,.1));margin:20px 0">
        <h4 style="margin:0 0 6px">Sección «Testimonios de clientes»</h4>
        <p class="cell-sub" style="margin-bottom:10px">Esta sección tiene texto claro sobre fondo oscuro: el sistema usa una capa oscura automática.</p>
        ${cajaImg(testimonialsBgActual, 'btnSubirTestiBg', 'btnQuitarTestiBg', 'fileTestiBg', 'ampTestiBg')}
        ${sliderOpacidad('opTesti', testimonialsOpActual)}
      </div>
    </div>`;

  // Conectar asistente IA de campaña
  const btnIa = $('#btnIaCampana');
  const inputPrompt = $('#sitioPromptCampana');
  if (btnIa && inputPrompt) {
    btnIa.onclick = async () => {
      const tema = (inputPrompt.value || '').trim();
      if (!tema) {
        toast('Escriba un tema o enfoque para la campaña (ej. Derecho Laboral en El Alto).', 'error');
        inputPrompt.focus();
        return;
      }

      btnIa.disabled = true;
      const originalText = btnIa.textContent;
      btnIa.textContent = '✨ Generando con IA...';

      try {
        const systemInst = 'Eres el director de marketing jurídico de LexFive, bufete de abogados en El Alto y La Paz, Bolivia. Responde EXCLUSIVAMENTE con un JSON parseable sin markdown ni comillas triples con los campos: campana_texto, campana_enlace_texto, hero_badge, hero_titulo, hero_subtitulo, hero_btn_texto, sobre_texto.';
        const promptText = `Genera los textos para una campaña en la portada del bufete LexFive con el tema: "${tema}". Reglas:\n1. campana_texto: Franja breve (máx 12 palabras, persuasivo).\n2. campana_enlace_texto: ej. "Consultar ahora" o "Pedir cita".\n3. hero_badge: ej. "BUFETE DE ABOGADOS · ESPECIALISTAS EN [TEMA]".\n4. hero_titulo: Titular impactante de máx 8 a 10 palabras.\n5. hero_subtitulo: 2 líneas orientadas a resolver el problema del cliente en Bolivia.\n6. hero_btn_texto: ej. "Solicitar consulta gratis".\n7. sobre_texto: Párrafo claro de 2 o 3 oraciones sobre el compromiso de LexFive en esa materia.`;

        const resText = await withTimeout(generateContent(promptText, systemInst), 60000, 'IA');
        if (!resText) throw new Error('No se recibió respuesta de la IA.');

        let cleaned = resText.trim();
        if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');

        const parsed = JSON.parse(cleaned);

        if (parsed.campana_texto) $('#sitioCampanaTexto').value = parsed.campana_texto;
        if (parsed.campana_enlace_texto) $('#sitioCampanaEnlaceTexto').value = parsed.campana_enlace_texto;
        if (parsed.hero_badge) $('#sitioHeroBadge').value = parsed.hero_badge;
        if (parsed.hero_titulo) $('#sitioHeroTitulo').value = parsed.hero_titulo;
        if (parsed.hero_subtitulo) $('#sitioHeroSubtitulo').value = parsed.hero_subtitulo;
        if (parsed.hero_btn_texto) $('#sitioHeroBtnTexto').value = parsed.hero_btn_texto;
        if (parsed.sobre_texto) $('#sitioSobreTexto').value = parsed.sobre_texto;

        $('#sitioCampanaActiva').checked = true;
        toast('Textos generados con éxito. Revíselos y pulse Guardar cambios en vivo.', 'success');
      } catch (err) {
        toast('Error al generar con IA: ' + (err.message || 'Intente nuevamente'), 'error');
      } finally {
        btnIa.disabled = false;
        btnIa.textContent = originalText;
      }
    };
  }

  // Guardar textos y campaña
  const btnGuardarTextos = $('#btnGuardarTextosSitio');
  if (btnGuardarTextos) {
    btnGuardarTextos.onclick = async () => {
      btnGuardarTextos.disabled = true;
      btnGuardarTextos.textContent = 'Guardando...';
      try {
        const campana_activa = $('#sitioCampanaActiva').checked;
        const campana_texto = ($('#sitioCampanaTexto').value || '').trim();
        const campana_enlace_texto = ($('#sitioCampanaEnlaceTexto').value || '').trim();
        const campana_enlace_url = ($('#sitioCampanaEnlaceUrl').value || '').trim();
        const hero_badge = ($('#sitioHeroBadge').value || '').trim();
        const hero_titulo = ($('#sitioHeroTitulo').value || '').trim();
        const hero_subtitulo = ($('#sitioHeroSubtitulo').value || '').trim();
        const hero_btn_texto = ($('#sitioHeroBtnTexto').value || '').trim();
        const sobre_texto = ($('#sitioSobreTexto').value || '').trim();

        const metricas = [0, 1, 2, 3].map(i => ({
          valor: ($('#metricaVal' + i)?.value || '').trim() || metricasDef[i].valor,
          etiqueta: ($('#metricaLbl' + i)?.value || '').trim() || metricasDef[i].etiqueta
        }));

        const cache = (Branding && Branding.local) ? (Branding.local() || {}) : {};
        const updated = Object.assign({}, cache, {
          campana_activa,
          campana_texto,
          campana_enlace_texto,
          campana_enlace_url,
          hero_badge,
          hero_titulo,
          hero_subtitulo,
          hero_btn_texto,
          sobre_texto,
          metricas
        });

        await Branding.save(updated);
        toast('¡Textos y campaña guardados en vivo! Ya se muestran en la web.', 'success');
      } catch (err) {
        toast('Error al guardar: ' + (err.message || 'Intente nuevamente'), 'error');
      } finally {
        btnGuardarTextos.disabled = false;
        btnGuardarTextos.textContent = '💾 Guardar cambios en vivo';
      }
    };
  }

  // Conectar subida / borrado / ampliación de imágenes
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

  wireImagen('btnSubirHero', 'btnQuitarHero', 'fileHero', 'ampHero', heroActual, 'Imagen principal (hero)', 'lexfive_hero_url', 'sitio', 1200, 'Imagen del hero guardada. Se verá en la web en unos segundos.', 'Imagen del hero quitada.');
  wireImagen('btnSubirSobre', 'btnQuitarSobre', 'fileSobre', 'ampSobre', sobreActual, 'Imagen de «Sobre el bufete»', 'lexfive_sobre_url', 'sitio', 1000, 'Imagen guardada. Se verá en la web en unos segundos.', 'Imagen quitada.');
  wireImagen('btnSubirHeroBg', 'btnQuitarHeroBg', 'fileHeroBg', 'ampHeroBg', heroBgActual, 'Fondo del encabezado', 'lexfive_herobg_url', 'sitio', 1920, 'Fondo del encabezado guardado.', 'Fondo del encabezado quitado.');
  wireImagen('btnSubirWhyBg', 'btnQuitarWhyBg', 'fileWhyBg', 'ampWhyBg', whyBgActual, 'Fondo de «Razones para confiar»', 'lexfive_whybg_url', 'sitio', 1920, 'Fondo guardado.', 'Fondo quitado.');
  wireImagen('btnSubirAboutBg', 'btnQuitarAboutBg', 'fileAboutBg', 'ampAboutBg', aboutBgActual, 'Fondo de «Sobre el bufete»', 'lexfive_aboutbg_url', 'sitio', 1920, 'Fondo guardado.', 'Fondo quitado.');
  wireImagen('btnSubirTestiBg', 'btnQuitarTestiBg', 'fileTestiBg', 'ampTestiBg', testimonialsBgActual, 'Fondo de «Testimonios»', 'lexfive_testimonialsbg_url', 'sitio', 1920, 'Fondo guardado.', 'Fondo quitado.');

  // Conectar sliders de opacidad
  const wireSlider = (id, lsKey) => {
    const sl = $('#' + id);
    if (!sl) return;
    sl.oninput = () => {
      const v = $('#' + id + 'Val');
      if (v) v.textContent = sl.value + '%';
    };
    sl.onchange = async () => {
      localStorage.setItem(lsKey, sl.value);
      await pushBranding();
      toast('Visibilidad actualizada.', 'success');
    };
  };
  wireSlider('opHero', 'lexfive_herobg_op');
  wireSlider('opWhy', 'lexfive_whybg_op');
  wireSlider('opAbout', 'lexfive_aboutbg_op');
  wireSlider('opTesti', 'lexfive_testimonialsbg_op');
}
