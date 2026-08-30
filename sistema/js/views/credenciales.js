// ============================================================
//  VISTA: CREDENCIALES Y ACCESOS (solo administrador y abogados)
//  Genera una credencial/carnet del bufete para el usuario, lista para
//  imprimir (anverso y reverso). Incluye el editor de credenciales, la lista
//  de credenciales guardadas y la impresión a hoja 4x6.
//  Extraído de app.js (split por módulos).
// ============================================================
import { withTimeout } from '@/api/auth.js';
import { ROLES } from '@/utils/config.js';
import { ICON } from '@/utils/icons.js';
import { esc, hoyISO, addAnios, fmtFechaCorta, qrURL, RPA_URL, qrPersona, resaltarRepre, initials } from '@/utils/util.js';
import { srcDe } from '@/views/exportar.js';
import { $, content } from '@/utils/dom.js';
import { toast, loading, openModal, closeModal } from '@/utils/ui.js';
import { state } from '@/utils/state.js';
import { Draft } from '@/views/draft.js';
import { CredStore } from '@/api/credstore.js';
import { ImgDB, IMG, ensureImgCache, guardarImagen, borrarImagen } from '@/utils/media.js';
import { abrirEditorImagen } from '@/views/imagenes.js';
import { wmOpacityActual, applyWmOpacity, pushBranding, hydrateBranding, brandingHydrated, pickActiveLogo, pickActiveSello } from '@/shared/branding.js';
import { navigate } from '@/app.js';

// Identificador de la credencial guardada que se está editando (null = nueva).
let credEditId = null;

export async function renderCredenciales() {
  loading();
  // Pinta de inmediato con lo que hay en este equipo y refresca en segundo
  // plano (el branding la 1ª vez por sesión y la lista de credenciales si no
  // está en caché). Antes esperaba la red ANTES de pintar: por eso "se abría
  // lenta". Las siguientes aperturas en la misma sesión ya son instantáneas.
  try { await withTimeout(ensureImgCache(), 8000, 'imágenes'); } catch (e) { console.warn('Credenciales: ensureImgCache falló/timeout', e); }
  const necesitaRed = !brandingHydrated;

  function paint() {
  const p = state.profile;
  const rolLabel = ROLES[p.rol] || p.rol;

  // Datos editables de la credencial (los llena el director). Se guardan en
  // Texto legal por defecto del reverso (base de la representación del portador),
  // tomado de la normativa boliviana vigente proporcionada por el bufete.
  const REPRE_DEFAULT = 'El PORTADOR se encuentra AUTORIZADO y FACULTADO para: ENTREGAR, EXAMINAR, SOLICITAR y RECOGER de las autoridades (Estrados Judiciales, Públicas y Privadas) correspondientes a Procesos y/o Trámites Administrativos que se PATROCINAN en calidad de ABOGADO, de acuerdo a normativa vigente: Art. 8 núm. 1 Ley 387 "Ley del Ejercicio de la Abogacía", concordante con los Arts. 84, 100 y 101 Ley 439 "Código Procesal Civil", Art. 300 parágrafo I Ley 603 "Código de las Familias y del Proceso Familiar" y demás normativa, bajo el PRINCIPIO del Art. 24 de la Constitución Política del Estado. Certifico.';

  // este equipo mediante el autoguardado por usuario.
  const saved = (Draft.load('credencial') || {}).data || {};
  const datos = {
    nombre: saved.nombre || '',
    cargo: saved.cargo || rolLabel,
    ci: saved.ci || '',
    correo: saved.correo || '',
    telPersonal: saved.telPersonal || '',
    telOficina: saved.telOficina || '',
    emision: saved.emision || hoyISO(),
    validez: saved.validez || '',
    frase: saved.frase || '',
    representacion: saved.representacion || REPRE_DEFAULT
  };

  // Opciones de logo disponibles para elegir (Derecho + Ingeniería en Sistemas)
  const LOGOS = [
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
  const LOGO_DEFAULT = 'ds1-balanza-codigo';

  // Opciones de sello para el bufete (memoriales y documentos)
  const SELLOS = [
    { id: 'sello-1-clasico', nombre: 'Clásico — balanza' },
    { id: 'sello-2-mazo', nombre: 'Mazo del juez' },
    { id: 'sello-3-ovalado', nombre: 'Ovalado institucional' },
    { id: 'sello-4-circuito', nombre: 'Derecho & Tecnología' },
    { id: 'sello-5-columnas', nombre: 'Templo de justicia' }
  ];
  const SELLO_DEFAULT = 'sello-1-clasico';

  // Modelos ocultos (eliminados de la galería por el bufete)
  const readList = k => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { return []; } };
  const hiddenLogos = readList('lexfive_logos_hidden');
  const hiddenSellos = readList('lexfive_sellos_hidden');
  const logosVisibles = LOGOS.filter(l => hiddenLogos.indexOf(l.id) === -1);
  const sellosVisibles = SELLOS.filter(s => hiddenSellos.indexOf(s.id) === -1);

  const customLogo = IMG.logo;
  const customSello = IMG.sello;

  // Elige la opción activa respetando ocultos y la imagen propia
  const pickActive = (saved, custom, visibles, def) => {
    if (saved === 'custom' && custom) return 'custom';
    if (visibles.some(x => x.id === saved)) return saved;
    if (custom) return 'custom';
    if (visibles.length) return visibles[0].id;
    return def;
  };
  const findCustom = cid => IMG.logosCustom.find(x => x && x.id === cid);
  const pickActiveLogo = (saved) => {
    if (saved && saved.indexOf('custom:') === 0 && findCustom(saved.slice(7))) return saved;
    if (saved === 'custom' && IMG.logosCustom.length) return 'custom:' + IMG.logosCustom[0].id;
    if (logosVisibles.some(x => x.id === saved)) return saved;
    if (IMG.logosCustom.length) return 'custom:' + IMG.logosCustom[0].id;
    if (logosVisibles.length) return logosVisibles[0].id;
    return LOGO_DEFAULT;
  };
  const logoActual = pickActiveLogo(localStorage.getItem('lexfive_logo'));
  const findSello = sid => IMG.sellosCustom.find(x => x && x.id === sid);
  const pickActiveSello = (saved) => {
    if (saved && saved.indexOf('custom:') === 0 && findSello(saved.slice(7))) return saved;
    if (saved === 'custom' && IMG.sellosCustom.length) return 'custom:' + IMG.sellosCustom[0].id;
    if (sellosVisibles.some(x => x.id === saved)) return saved;
    if (IMG.sellosCustom.length) return 'custom:' + IMG.sellosCustom[0].id;
    if (sellosVisibles.length) return sellosVisibles[0].id;
    return SELLO_DEFAULT;
  };
  const selloActual = pickActiveSello(localStorage.getItem('lexfive_sello'));
  // Mostrar u ocultar el sello en la credencial (por defecto sí). Se controla
  // con un check; útil mientras el bufete prepara sus propios sellos.
  const selloOn = localStorage.getItem('lexfive_cred_sello') !== '0';

  // Devuelven la fuente correcta: archivo del repo o imagen subida por el bufete (data URL)
  const logoSrc = id => {
    if (id && id.indexOf('custom:') === 0) { const lc = findCustom(id.slice(7)); return srcDe(lc); }
    if (id === 'custom') return IMG.logo || srcDe(IMG.logosCustom[0]);
    return `../assets/logos/${id}.svg`;
  };
  const selloSrc = id => {
    if (id && id.indexOf('custom:') === 0) { const sc = findSello(id.slice(7)); return srcDe(sc); }
    if (id === 'custom') return IMG.sello || srcDe(IMG.sellosCustom[0]);
    return `../assets/sellos/${id}.svg`;
  };

  // Frases sugeridas para el reverso
  const FRASES = [
    'Justicia con tecnología.',
    'Donde el derecho y la innovación se encuentran.',
    'Defendemos sus derechos con la fuerza de la tecnología.',
    'Derecho moderno, soluciones reales.',
    'La justicia a su alcance.',
    'Su confianza, nuestra causa.'
  ];

  content().innerHTML = `
    <div class="card">
      <div class="card__body">
        <h3 class="intro-title">Credencial del bufete</h3>
        <p class="cell-sub">Complete los datos y se reflejarán en la credencial en tiempo real. Luego use <strong>Imprimir / Guardar PDF</strong>. Lo que escriba queda guardado en este equipo.</p>
      </div>
    </div>

    <div class="card">
      <div class="card__body" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <img src="${logoSrc(logoActual)}" alt="Logo del bufete" style="width:54px;height:54px;object-fit:contain;border-radius:8px;background:#fff;padding:5px;border:1px solid var(--line,#e6e8ec);flex-shrink:0">
        <div style="flex:1;min-width:200px">
          <p class="cell-sub" style="margin:0">El <strong>logo</strong> (marca de agua de la credencial) y el <strong>sello</strong> del bufete se administran ahora en la pestaña <strong>«Sellos y logos»</strong>. Lo que elija allí se aplica aquí automáticamente.</p>
        </div>
        <button class="btn btn--ghost btn--sm" id="btnIrSellos" type="button" style="flex-shrink:0">Ir a Sellos y logos</button>
      </div>
    </div>

    <div class="card">
      <div class="card__head"><h3>Datos de la credencial</h3></div>
      <div class="card__body">
        <div class="field-row">
          <div class="field"><label>Nombre completo</label><input id="cr_nombre" value="${esc(datos.nombre)}" placeholder="Escriba el nombre y apellido"></div>
          <div class="field"><label>Cargo / rol (aparece solo en la banda superior)</label><input id="cr_cargo" value="${esc(datos.cargo)}" placeholder="Ej: Procurador / Abogado"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Carnet de identidad</label><input id="cr_ci" value="${esc(datos.ci)}" placeholder="Ej: 6813383 L.P."></div>
          <div class="field"><label>Teléfono personal</label><input id="cr_telpers" value="${esc(datos.telPersonal)}" placeholder="Ej: 700 00 000"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Teléfono de la oficina</label><input id="cr_teloff" value="${esc(datos.telOficina)}" placeholder="Ej: 2 000 000"></div>
          <div class="field"><label>Fecha de emisión</label><input id="cr_emision" type="date" value="${esc(datos.emision)}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Válido hasta (automático · 3 años)</label><input id="cr_validez_view" type="text" readonly value="" style="background:#f4f5f7;color:#0e1b2c;font-weight:600"></div>
          <div class="field">
            <label>Foto del procurador (2,5 × 2,5)</label>
            <div style="display:flex;align-items:center;gap:8px">
              <button class="btn btn--ghost btn--sm" id="btnUploadFoto" type="button">Subir foto</button>
              ${IMG.foto ? '<button class="btn btn--ghost btn--sm" id="btnRemoveFoto" type="button">Quitar</button><img src="' + IMG.foto + '" alt="foto" style="width:34px;height:34px;border-radius:5px;object-fit:cover;border:1px solid #e6e8ec">' : '<span class="cell-sub">Se recorta cuadrada (2,5 × 2,5)</span>'}
            </div>
            <input type="file" id="fileFoto" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" hidden>
          </div>
        </div>
        <div class="field"><label>Frase del bufete (reverso)</label>
          <input id="cr_frase" value="${esc(datos.frase)}" placeholder="Escríbala o elija una sugerencia" list="fraseList">
          <datalist id="fraseList">${FRASES.map(f => `<option value="${esc(f)}">`).join('')}</datalist>
          <span class="cell-sub" style="display:block;margin-top:5px">Sugerencias: ${FRASES.map(f => `&ldquo;${esc(f)}&rdquo;`).join(' &middot; ')}</span>
        </div>
        <div class="field"><label>Base legal de la representación (reverso) <button class="btn btn--primary btn--sm" id="cr_ia_btn" type="button" style="margin-left:8px; background: linear-gradient(45deg, #1e3c72, #2a5298); border: none; color: white;">✨ Redactar con IA</button></label>
          <textarea id="cr_repre" style="min-height:120px">${esc(datos.representacion)}</textarea>
          <span class="cell-sub" style="display:block;margin-top:5px">Ya viene con la base legal vigente (Ley 387, Ley 439, Ley 603 y Art. 24 CPE). Puede editarla con su criterio profesional.</span>
        </div>
      </div>
    </div>

    <div class="cred-wm-control">
      <label for="cr_wm">Intensidad del logo de fondo</label>
      <input type="range" id="cr_wm" min="3" max="40" step="1" value="${wmOpacityActual()}">
      <output id="cr_wm_out">${wmOpacityActual()}%</output>
    </div>
    <label class="cell-sub" style="display:flex;align-items:center;gap:6px;margin:2px 0 8px"><input type="checkbox" id="cr_sello" ${selloOn ? 'checked' : ''}> Incluir el sello del bufete en la credencial</label>
    <p class="cell-sub" style="margin:2px 0 10px">La línea punteada alrededor de cada cara es la <strong>guía de corte</strong>: imprima y recorte por ahí. Tamaño final: 9 × 6 cm.</p>
    <div class="cred-wrap" id="credPrintArea">
      <!-- ANVERSO -->
      <div class="cred-cut">
      <div class="cred-card">
        <img class="cred-wm" id="cv_logo" src="${logoSrc(logoActual)}" alt="">
        <div class="cred-band"><strong>LexFive</strong> &middot; Credencial &middot; <span id="cv_cargo_band">${esc(datos.cargo || '')}</span></div>
        <div class="cred-body">
          <div class="cred-photo" id="cv_foto">${IMG.foto ? '<img src="' + IMG.foto + '" alt="Foto del portador">' : esc(initials(datos.nombre) || '')}</div>
          <div class="cred-data">
            <div class="cred-row"><span>Nombre</span><strong id="cv_nombre">${esc(datos.nombre || '')}</strong></div>
            <div class="cred-row"><span>Carnet de identidad</span><strong id="cv_ci">${esc(datos.ci || '')}</strong></div>
            <div class="cred-row"><span>Tel. personal / oficina</span><strong id="cv_tel">${esc([datos.telPersonal, datos.telOficina].filter(Boolean).join('  /  '))}</strong></div>
          </div>
        </div>
        <div class="cred-foot">
          <div><span>Emisión</span><strong id="cv_emision">${esc(fmtFechaCorta(datos.emision))}</strong></div>
          <div class="cred-foot__qrs">
            <div class="cred-foot__qr"><img id="cv_qr" src="${qrURL(qrPersona(datos))}" alt="Verificación del bufete" class="cred-qr-cert"><small class="cred-qr-cap">Verificar</small></div>
            <div class="cred-foot__qr"><img src="${qrURL(RPA_URL)}" alt="SAJ-RPA" class="cred-qr-cert"><small class="cred-qr-cap">SAJ-RPA</small></div>
          </div>
          <div class="cred-foot__validez"><span>Válido hasta</span><strong id="cv_validez">${esc(fmtFechaCorta(addAnios(datos.emision, 3)))}</strong>
            ${selloActual ? `<img class="cred-sello-img cred-sello-img--front"${selloOn ? '' : ' style="display:none"'} src="${selloSrc(selloActual)}" alt="Sello del bufete">` : ''}
          </div>
        </div>
      </div>
      </div>

      <!-- REVERSO -->
      <div class="cred-cut">
      <div class="cred-card cred-card--back">
        <img class="cred-wm" id="cv_logo_back" src="${logoSrc(logoActual)}" alt="">
        <div class="cred-band">LexFive &middot; La Paz / El Alto - Bolivia</div>
        <p class="cred-cert" id="cv_repre">${resaltarRepre(datos.representacion || REPRE_DEFAULT)}</p>
        <p class="cred-cert cred-frase" id="cv_frase">${esc(datos.frase || '')}</p>
        <div class="cred-sign">
          <div class="cred-sign__line">Firma autorizada</div>
          <div class="cred-sign__line cred-sign__sello">
            ${selloActual ? `<img class="cred-sello-img"${selloOn ? '' : ' style="display:none"'} id="cv_sello" src="${selloSrc(selloActual)}" alt="Sello del bufete">` : ''}
            Sello del bufete
          </div>
        </div>
        <p class="cred-note">Documento de uso institucional. Si la encuentra, devuélvala a LexFive.</p>
      </div>
      </div>
    </div>

    <div class="cred-actions">
      <button class="btn btn--primary" id="btnPrintCred">${ICON.doc} Imprimir / Guardar PDF</button>
      <button class="btn btn--ghost" id="btnPreviewCred" type="button">Vista previa</button>
      <button class="btn" id="btnSaveCred">${ICON.llave || ''} ${credEditId ? 'Actualizar credencial' : 'Guardar credencial'}</button>
      ${credEditId ? '<button class="btn btn--ghost" id="btnSaveCredNew" type="button">Guardar como nueva</button><button class="btn btn--ghost" id="btnNewCred" type="button">Nueva credencial (limpiar)</button>' : ''}
    </div>
    ${credEditId ? `<p class="cell-sub" id="credEditBanner" style="text-align:center;margin-top:4px"><strong>Editando una credencial guardada.</strong> Los cambios se aplicarán al actualizar.</p>` : ''}

    <div class="card">
      <div class="card__body" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <p class="cell-sub" style="margin:0">Las credenciales que guarde quedan en la pestaña <strong>«Credenciales guardadas»</strong>, donde puede volver a imprimirlas, editarlas o eliminarlas.</p>
        </div>
        <button class="btn btn--ghost btn--sm" id="btnVerGuardadas" type="button" style="flex-shrink:0">Ver credenciales guardadas</button>
      </div>
    </div>

    <div class="card">
      <div class="card__head"><h3>${ICON.usuarios} Cómo entregar una credencial a un procurador</h3></div>
      <div class="card__body">
        <ol class="cred-steps">
          <li>Pida al procurador que se registre en <strong>lexfive.netlify.app/sistema/login.html</strong> con su correo y una contraseña (entra como «Cliente» por defecto).</li>
          <li>El <strong>administrador</strong> abre la pestaña <strong>Usuarios</strong> y le cambia el rol a <strong>Procurador</strong>.</li>
          <li>Llene aquí los datos de la credencial del procurador, imprímala y entréguesela.</li>
        </ol>
        <p class="cell-sub" style="margin-top:10px"><strong>Importante:</strong> cada persona tiene su propia cuenta. No comparta contraseñas ni la cuenta principal del bufete.</p>
      </div>
    </div>`;

  // Botón para ir a la pestaña «Sellos y logos» (la administración del branding
  // se movió allí para que esta pestaña cargue más liviana).
  const btnIrSellos = $('#btnIrSellos');
  if (btnIrSellos) btnIrSellos.onclick = () => navigate('sellos');

  // Enlazar los campos con la credencial en vivo + autoguardado
  const sync = () => {
    const v = id => ($('#' + id).value || '').trim();
    $('#cv_nombre').textContent = v('cr_nombre');
    $('#cv_cargo_band').textContent = v('cr_cargo');
    $('#cv_ci').textContent = v('cr_ci');
    $('#cv_tel').textContent = [v('cr_telpers'), v('cr_teloff')].filter(Boolean).join('  /  ');
    const emi = v('cr_emision') || hoyISO();
    const val = addAnios(emi, 3);
    const cvqr = $('#cv_qr');
    if (cvqr) cvqr.src = qrURL(qrPersona({ nombre: v('cr_nombre'), ci: v('cr_ci'), cargo: v('cr_cargo') }));
    $('#cv_emision').textContent = fmtFechaCorta(emi);
    $('#cv_validez').textContent = fmtFechaCorta(val);
    const vv = $('#cr_validez_view'); if (vv) vv.value = fmtFechaCorta(val);
    $('#cv_frase').textContent = v('cr_frase');
    $('#cv_repre').innerHTML = resaltarRepre(v('cr_repre') || REPRE_DEFAULT);
    const fotoEl = $('#cv_foto');
    if (fotoEl && !IMG.foto) fotoEl.textContent = initials(v('cr_nombre')) || '';
    Draft.save('credencial', {
      nombre: v('cr_nombre'), cargo: v('cr_cargo'), ci: v('cr_ci'),
      telPersonal: v('cr_telpers'), telOficina: v('cr_teloff'),
      emision: emi, validez: val,
      frase: v('cr_frase'), representacion: v('cr_repre')
    });
  };
  ['cr_nombre', 'cr_cargo', 'cr_ci', 'cr_telpers', 'cr_teloff', 'cr_emision', 'cr_frase', 'cr_repre']
    .forEach(id => { const el = $('#' + id); if (el) { el.addEventListener('input', sync); el.addEventListener('change', sync); } });
  sync();
  
  const crIaBtn = $('#cr_ia_btn');
  if (crIaBtn) {
    crIaBtn.onclick = async () => {
      crIaBtn.disabled = true;
      const originalText = crIaBtn.innerHTML;
      crIaBtn.innerHTML = '<span class="spinner" style="width:12px;height:12px;border-width:2px;margin-right:6px"></span> Redactando...';
      try {
        const res = await fetch('/.netlify/functions/ai-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipoDocumento: 'credencial',
            datos: {
              cargo: $('#cr_cargo').value
            }
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error de IA');
        
        $('#cr_repre').value = data.text;
        sync();
        toast('Base legal generada con IA exitosamente.', 'success');
      } catch (err) {
        toast('Error al generar texto con IA.', 'error');
        console.error(err);
      } finally {
        crIaBtn.disabled = false;
        crIaBtn.innerHTML = originalText;
      }
    };
  }

  // Subir / quitar foto del procurador (se recorta cuadrada y se guarda en IndexedDB)
  const fileFoto = $('#fileFoto');
  const btnUploadFoto = $('#btnUploadFoto');
  if (btnUploadFoto) btnUploadFoto.onclick = () => fileFoto.click();
  if (fileFoto) fileFoto.onchange = () => {
    const f = fileFoto.files && fileFoto.files[0];
    fileFoto.value = '';
    if (!f) return;
    abrirEditorImagen(f, { titulo: 'Ajustar foto (2,5 × 2,5)', salida: 360, quitarBlanco: false, formato: 'jpeg', calidad: 0.82 }, async (png) => {
      const ok = await guardarImagen('foto', png);
      if (!ok) { toast('No se pudo guardar la foto.', 'error'); return; }
      renderCredenciales();
      toast('Foto agregada a la credencial.', 'success');
    });
  };
  const btnRemoveFoto = $('#btnRemoveFoto');
  if (btnRemoveFoto) btnRemoveFoto.onclick = () => { borrarImagen('foto'); renderCredenciales(); toast('Foto quitada.', 'success'); };

  // Selección de sello: se administra en la pestaña «Sellos y logos».
  $('#btnPrintCred').onclick = imprimirCredencial;

  // Intensidad de la marca de agua del logo (slider).
  applyWmOpacity(wmOpacityActual());
  const wm = $('#cr_wm');
  if (wm) {
    const wmOut = $('#cr_wm_out');
    wm.addEventListener('input', () => { applyWmOpacity(wm.value); if (wmOut) wmOut.textContent = wm.value + '%'; });
    wm.addEventListener('change', () => { localStorage.setItem('lexfive_wm_op', wm.value); pushBranding(); });
  }

  // Mostrar/ocultar el sello del bufete en la credencial (anverso y reverso).
  const crSello = $('#cr_sello');
  if (crSello) crSello.addEventListener('change', () => {
    localStorage.setItem('lexfive_cred_sello', crSello.checked ? '1' : '0');
    content().querySelectorAll('.cred-sello-img').forEach(im => { im.style.display = crSello.checked ? '' : 'none'; });
  });

  // Vista previa de impresión: muestra ambas caras tal como saldrán.
  const bPrev = $('#btnPreviewCred');
  if (bPrev) bPrev.onclick = () => {
    const area = document.getElementById('credPrintArea');
    if (!area) return;
    openModal('Vista previa de la credencial',
      `<p class="cell-sub" style="margin-bottom:12px">Así se imprimirá (tamaño real aproximado). Recorte por la línea punteada. Use «Imprimir / Guardar PDF» para descargarla.</p>
       <div class="cred-preview-stage">${area.innerHTML}</div>`,
      [
        { label: 'Imprimir / Guardar PDF', class: 'btn--primary', onClick: () => { closeModal(); setTimeout(imprimirCredencial, 250); } },
        { label: 'Cerrar', onClick: closeModal }
      ], true);
  };

  // Botón para ver la pestaña de credenciales guardadas (la lista se movió allí).
  const btnVerGuardadas = $('#btnVerGuardadas');
  if (btnVerGuardadas) btnVerGuardadas.onclick = () => navigate('credguardadas');


  // ---- Guardado y edición de la credencial en curso ----
  const leerCred = () => {
    const v = id => ((($('#' + id) || {}).value) || '').trim();
    const emi = v('cr_emision') || hoyISO();
    return {
      nombre: v('cr_nombre'), cargo: v('cr_cargo'), ci: v('cr_ci'),
      telPersonal: v('cr_telpers'), telOficina: v('cr_teloff'),
      emision: emi, validez: addAnios(emi, 3),
      frase: v('cr_frase'), representacion: v('cr_repre'),
      foto: IMG.foto || null
    };
  };
  const guardarCred = async (forzarNueva) => {
    const datosCred = leerCred();
    if (!datosCred.nombre) { toast('Escriba al menos el nombre antes de guardar la credencial.', 'error'); return; }
    const editando = !forzarNueva && !!credEditId;
    if (editando) datosCred.id = credEditId;
    const btns = content().querySelectorAll('#btnSaveCred,#btnSaveCredNew');
    btns.forEach(b => b.disabled = true);
    try {
      const saved = await CredStore.upsert(datosCred);
      credEditId = (saved && saved.id) || credEditId;
      toast(editando ? 'Credencial actualizada y sincronizada.' : 'Credencial guardada y sincronizada en todos los dispositivos.', 'success');
      renderCredenciales();
    } catch (e) {
      btns.forEach(b => b.disabled = false);
      toast('No se pudo sincronizar la credencial. Revise su conexión e intente de nuevo.', 'error');
    }
  };
  const bSaveCred = $('#btnSaveCred'); if (bSaveCred) bSaveCred.onclick = () => guardarCred(false);
  const bSaveCredNew = $('#btnSaveCredNew'); if (bSaveCredNew) bSaveCredNew.onclick = () => guardarCred(true);
  const bNewCred = $('#btnNewCred');
  if (bNewCred) bNewCred.onclick = () => {
    credEditId = null;
    Draft.clear('credencial');
    borrarImagen('foto');
    renderCredenciales();
    toast('Formulario listo para una credencial nueva.', 'success');
  };
  } // ---- fin de paint() ----

  paint(); // muestra YA la pestaña con los datos locales

  // Refresco en segundo plano: solo la 1ª vez por sesión baja el branding
  // (logo/sello elegido) de la nube y vuelve a pintar una vez.
  if (necesitaRed) hydrateBranding().then(() => { if (state.view === 'credenciales') paint(); }).catch(() => {});
}

// ============================================================
//  Pestaña «Credenciales guardadas»: lista de todas las credenciales
//  creadas, separada del formulario de creación (pestaña «Credenciales»).
//  Permite reimprimir, editar (abre el formulario con los datos cargados) y
//  eliminar. Pinta al instante con la caché local y refresca desde la nube.
// ============================================================
export async function renderCredGuardadas() {
  loading();
  let credList = CredStore.cache;
  if (!credList) { try { credList = JSON.parse(localStorage.getItem('lexfive_cred_cache') || '[]'); } catch (e) { credList = []; } }
  credList = credList || [];

  // Carga los datos de una credencial guardada en el formulario (borrador +
  // foto) para editarla o reimprimirla en la pestaña «Credenciales».
  const prepararForm = (rec) => {
    credEditId = rec.id;
    Draft.save('credencial', {
      nombre: rec.nombre || '', cargo: rec.cargo || '', ci: rec.ci || '',
      telPersonal: rec.telPersonal || '', telOficina: rec.telOficina || '',
      emision: rec.emision || hoyISO(), validez: rec.validez || '',
      frase: rec.frase || '', representacion: rec.representacion || ''
    });
    if (rec.foto) { IMG.foto = rec.foto; ImgDB.set('foto', rec.foto).catch(() => {}); }
    else { borrarImagen('foto'); }
  };

  function paint() {
    content().innerHTML = `
      <div class="card">
        <div class="card__body" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <h3 class="intro-title">Credenciales guardadas</h3>
            <p class="cell-sub" style="margin:0">Todas las credenciales que creó. Puede <strong>volver a imprimirlas</strong>, <strong>editarlas</strong> o eliminarlas. Se guardan en la nube y se ven en todos los dispositivos del bufete.</p>
          </div>
          <button class="btn btn--primary btn--sm" id="btnNuevaCred" type="button" style="flex-shrink:0">${ICON.llave || ''} Crear nueva credencial</button>
        </div>
      </div>

      <div class="card" id="credSavedCard">
        <div class="card__head"><h3>${ICON.usuarios || ''} Guardadas (${credList.length})</h3></div>
        <div class="card__body">
          ${credList.length ? `
          ${credList.length > 3 ? '<input type="text" class="cred-search" id="credSearch" placeholder="Buscar por nombre, CI o cargo...">' : ''}
          <div class="cred-saved-list">
            ${credList.map(c => `
              <div class="cred-saved-item" data-cred="${esc(c.id)}">
                <div class="cred-saved-item__info">
                  <strong>${esc(c.nombre || 'Sin nombre')}</strong>
                  <span class="cell-sub">${esc(c.cargo || '')}${c.ci ? ' &middot; CI ' + esc(c.ci) : ''}${c.emision ? ' &middot; Emisión ' + esc(fmtFechaCorta(c.emision)) : ''}</span>
                </div>
                <div class="cred-saved-item__actions">
                  <button class="btn btn--primary btn--sm" data-cred-print="${esc(c.id)}" type="button">${ICON.doc} Imprimir / PDF</button>
                  <button class="btn btn--ghost btn--sm" data-cred-edit="${esc(c.id)}" type="button">Editar</button>
                  <button class="btn btn--danger btn--sm" data-cred-del="${esc(c.id)}" type="button">Eliminar</button>
                </div>
              </div>`).join('')}
          </div>
          <p class="cred-saved-empty-search" id="credSearchNone" style="display:none">No se encontraron credenciales con ese texto.</p>` : '<p class="cell-sub">Todavía no ha guardado ninguna credencial. Vaya a <strong>Credenciales</strong>, complete los datos y pulse <strong>Guardar credencial</strong> para conservarla aquí.</p>'}
        </div>
      </div>`;

    const btnNueva = $('#btnNuevaCred');
    if (btnNueva) btnNueva.onclick = () => { credEditId = null; Draft.clear('credencial'); borrarImagen('foto'); navigate('credenciales'); };

    // Buscador en vivo (nombre, CI o cargo).
    const cs = $('#credSearch');
    if (cs) cs.addEventListener('input', () => {
      const q = cs.value.trim().toLowerCase();
      let visibles = 0;
      content().querySelectorAll('.cred-saved-item').forEach(it => {
        const ok = !q || it.textContent.toLowerCase().includes(q);
        it.style.display = ok ? '' : 'none';
        if (ok) visibles++;
      });
      const none = $('#credSearchNone');
      if (none) none.style.display = (visibles || !q) ? 'none' : 'block';
    });

    // Reimprimir: carga la credencial en el formulario, abre la pestaña
    // «Credenciales» y manda a imprimir en cuanto el área esté lista.
    content().querySelectorAll('[data-cred-print]').forEach(b => b.onclick = () => {
      const rec = credList.find(c => c.id === b.dataset.credPrint);
      if (!rec) return;
      prepararForm(rec);
      navigate('credenciales');
      toast('Preparando la credencial para imprimir/descargar...', 'success');
      const esperar = (n = 24) => {
        if (document.getElementById('credPrintArea')) { setTimeout(imprimirCredencial, 250); return; }
        if (n <= 0) return;
        setTimeout(() => esperar(n - 1), 150);
      };
      esperar();
    });

    // Editar: carga los datos y abre el formulario.
    content().querySelectorAll('[data-cred-edit]').forEach(b => b.onclick = () => {
      const rec = credList.find(c => c.id === b.dataset.credEdit);
      if (!rec) return;
      prepararForm(rec);
      navigate('credenciales');
      toast('Credencial cargada. Edite los datos y pulse «Actualizar credencial».', 'success');
    });

    // Eliminar: borra en la nube y quita de la lista al instante.
    content().querySelectorAll('[data-cred-del]').forEach(b => b.onclick = async () => {
      if (!confirm('¿Eliminar esta credencial guardada? Se quitará de todos los dispositivos y no se podrá recuperar.')) return;
      const id = b.dataset.credDel;
      b.disabled = true;
      try {
        await CredStore.remove(id);
        if (credEditId === id) credEditId = null;
        credList = credList.filter(c => c.id !== id);
        paint();
        toast('Credencial eliminada en todos los dispositivos.', 'success');
      } catch (e) {
        b.disabled = false;
        toast('No se pudo eliminar la credencial. Revise su conexión e intente de nuevo.', 'error');
      }
    });
  }

  paint(); // muestra YA la lista con la caché local

  // Si aún no hay caché en memoria, baja la lista de la nube en segundo plano.
  if (!CredStore.cache) {
    try {
      const fresh = await withTimeout(CredStore.list(), 8000, 'credenciales');
      if (fresh && JSON.stringify(fresh) !== JSON.stringify(credList) && state.view === 'credguardadas') { credList = fresh; paint(); }
    } catch (e) { console.warn('Credenciales guardadas: lista falló/timeout', e); }
  }
}

// Imprime la credencial: clona las dos caras en un contenedor a nivel de <body>
// para imprimir ambas caras (anverso y reverso) juntas en una sola hoja de 4x6.
function imprimirCredencial() {
  const area = document.getElementById('credPrintArea');
  if (!area) { window.print(); return; }
  const previo = document.getElementById('printRoot');
  if (previo) previo.remove();
  const root = document.createElement('div');
  root.id = 'printRoot';
  root.innerHTML = area.innerHTML;
  document.body.appendChild(root);
  document.body.classList.add('printing');
  const limpiar = () => { document.body.classList.remove('printing'); const r = document.getElementById('printRoot'); if (r) r.remove(); };
  window.addEventListener('afterprint', limpiar, { once: true });
  let hecho = false;
  const imprimir = () => { if (hecho) return; hecho = true; window.print(); setTimeout(limpiar, 3000); };
  // Esperar a que carguen las imágenes del clon (QRs, logo, foto) antes de imprimir.
  const imgs = Array.from(root.querySelectorAll('img'));
  let pendientes = imgs.filter(i => !i.complete).length;
  if (pendientes === 0) { setTimeout(imprimir, 60); }
  else {
    const check = () => { pendientes--; if (pendientes <= 0) imprimir(); };
    imgs.forEach(i => { if (!i.complete) { i.addEventListener('load', check, { once: true }); i.addEventListener('error', check, { once: true }); } });
    setTimeout(imprimir, 2500);
  }
}
