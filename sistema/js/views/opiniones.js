// ============================================================
//  OPINIONES Y TESTIMONIOS
//  - mountOpinion: widget reutilizable «Mi opinión» (dashboard del cliente,
//    dentro de cada proceso y en la vista dedicada).
//  - renderMiOpinion: vista dedicada del cliente.
//  - renderTestimonios: vista del administrador para aprobar/ocultar opiniones
//    y publicarlas como testimonios en la web.
//  - starsHtml: helper de estrellas (privado).
//  Extraído de app.js (split por módulos).
// ============================================================
import { logAccion } from '@/api/auth.js';
import { ICON } from '@/utils/icons.js';
import { esc } from '@/utils/util.js';
import { $, content } from '@/utils/dom.js';
import { toast, loading } from '@/utils/ui.js';
import { state } from '@/utils/state.js';
import { profName } from '@/shared/comunes.js';
import { loadProfiles } from '@/shared/datos.js';
import { Draft } from '@/views/draft.js';
import { supabase } from '@/api/supabase.js';

function starsHtml(n) {
  let s = '<span class="stars">';
  for (let i = 1; i <= 5; i++) s += `<span class="${i <= n ? '' : 'off'}">${ICON.estrella}</span>`;
  return s + '</span>';
}

// Widget reutilizable de "Mi opinión": se monta en el dashboard del cliente,
// dentro de cada proceso y en la vista dedicada. Usa selectores por clase y
// queda aislado en su contenedor, por lo que puede mostrarse en varios sitios
// a la vez sin colisiones de IDs. El cliente tiene UNA opinión (sobre el
// servicio del bufete) que se edita desde cualquiera de esos lugares.
export async function mountOpinion(el) {
  if (!el) return;
  el.innerHTML = '<div class="card__body"><p class="cell-sub">Cargando su opinión...</p></div>';
  const { data } = await supabase.from('testimonios').select('*')
    .eq('autor_id', state.profile.id).order('created_at', { ascending: false }).limit(1);
  const t = (data && data[0]) || null;
  let rating = t ? t.calificacion : 5;
  const estadoMsg = t ? ({
    pendiente: '<span class="badge badge-borrador">Pendiente</span> Su opinión será revisada por el bufete antes de publicarse.',
    aprobado: '<span class="badge badge-publicado">Publicada</span> ¡Gracias! Su opinión ya aparece en nuestra página web.',
    rechazado: '<span class="badge badge-rol-admin">No publicada</span> Puede editarla y volver a enviarla.'
  }[t.estado]) : '';

  el.innerHTML = `
    <div class="card__head"><h3>Mi opinión sobre el servicio</h3></div>
    <div class="card__body">
      <p class="cell-sub" style="margin-bottom:14px">Califique la atención recibida de su(s) abogado(s). Tras la aprobación del bufete, su testimonio aparecerá en la página web pública.</p>
      ${t ? `<p style="margin-bottom:14px">${estadoMsg}</p>` : ''}
      <div class="field"><label>Su calificación</label>
        <div class="rating-pick js-rate">${[1,2,3,4,5].map(i => `<button type="button" data-v="${i}" class="${i <= rating ? 'on' : ''}">${ICON.estrella}</button>`).join('')}</div>
      </div>
      <div class="field"><label>Su comentario</label><textarea class="js-texto" style="min-height:110px" placeholder="Cuéntenos cómo fue su experiencia...">${t ? esc(t.texto) : ''}</textarea></div>
      <div class="field"><label>¿Cómo desea que aparezca su nombre? (opcional)</label><input class="js-nombre" value="${t ? esc(t.nombre || '') : esc(state.profile.nombre)}"></div>
      <button class="btn btn--primary js-send">${t ? 'Actualizar mi opinión' : 'Enviar mi opinión'}</button>
    </div>`;

  el.querySelectorAll('.js-rate button').forEach(b => b.onclick = () => {
    rating = parseInt(b.dataset.v, 10);
    el.querySelectorAll('.js-rate button').forEach(x => x.classList.toggle('on', parseInt(x.dataset.v, 10) <= rating));
  });
  el.querySelector('.js-send').onclick = async () => {
    const texto = el.querySelector('.js-texto').value.trim();
    if (!texto) { toast('Escriba su comentario.', 'error'); return; }
    const payload = { texto, calificacion: rating, nombre: el.querySelector('.js-nombre').value.trim() || state.profile.nombre, detalle: 'Cliente', estado: 'pendiente', updated_at: new Date().toISOString() };
    const btn = el.querySelector('.js-send'); btn.disabled = true;
    let error;
    if (t) ({ error } = await supabase.from('testimonios').update(payload).eq('id', t.id));
    else { payload.autor_id = state.profile.id; ({ error } = await supabase.from('testimonios').insert(payload)); }
    if (error) { toast('Error: ' + error.message, 'error'); btn.disabled = false; return; }
    Draft.clear('opinion');
    toast('¡Gracias! Su opinión fue enviada para revisión.', 'success');
    mountOpinion(el);
  };

  // Autoguardado del comentario de la opinión (texto y nombre)
  const ta = el.querySelector('.js-texto'), nm = el.querySelector('.js-nombre');
  const saveOp = () => Draft.save('opinion', { texto: ta.value, nombre: nm.value });
  ta.addEventListener('input', saveOp); nm.addEventListener('input', saveOp);
  const svOp = Draft.load('opinion');
  if (svOp && svOp.data && svOp.data.texto && !ta.value) { ta.value = svOp.data.texto; if (svOp.data.nombre) nm.value = svOp.data.nombre; }
}

// Vista del CLIENTE dedicada a dejar su opinión
export async function renderMiOpinion() {
  loading();
  content().innerHTML = `<div class="card" style="max-width:680px" id="opinionCard"></div>`;
  await mountOpinion($('#opinionCard'));
}

// Vista del ADMIN para moderar (aprobar/rechazar) los testimonios
export async function renderTestimonios() {
  loading();
  await loadProfiles();
  const { data } = await supabase.from('testimonios').select('*').order('created_at', { ascending: false });
  const list = data || [];
  content().innerHTML = `
    <div class="card"><div class="card__head"><h3>Testimonios de clientes</h3></div>
    <div class="card__body--flush">
      ${list.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th>Cliente</th><th>Opinión</th><th>Calif.</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>${list.map(t => `<tr class="no-hover">
          <td class="cell-strong">${esc(t.nombre || profName(t.autor_id))}<div class="cell-sub">${esc(t.detalle || '')}</div></td>
          <td style="max-width:340px">${esc(t.texto)}</td>
          <td>${starsHtml(t.calificacion)}</td>
          <td><span class="badge badge-${t.estado === 'aprobado' ? 'publicado' : (t.estado === 'rechazado' ? 'rol-admin' : 'borrador')}">${t.estado}</span></td>
          <td style="white-space:nowrap">
            ${t.estado !== 'aprobado' ? `<button class="btn btn--ghost btn--sm js-ap" data-id="${t.id}">Aprobar</button>` : ''}
            ${t.estado !== 'rechazado' ? `<button class="btn btn--ghost btn--sm js-re" data-id="${t.id}">Rechazar</button>` : ''}
            <button class="btn btn--danger btn--sm js-del" data-id="${t.id}">Eliminar</button>
          </td></tr>`).join('')}</tbody></table></div>`
      : `<div class="empty">${ICON.estrella}<p>Aún no hay testimonios. Aparecerán aquí cuando los clientes los envíen desde su portal.</p></div>`}
    </div></div>`;

  const setEstado = async (id, estado) => {
    const { error } = await supabase.from('testimonios').update({ estado, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    await logAccion('moderar', 'testimonio', id, estado);
    toast(estado === 'aprobado' ? 'Aprobado y publicado en la web.' : 'Testimonio ' + estado + '.', 'success');
    renderTestimonios();
  };
  content().querySelectorAll('.js-ap').forEach(b => b.onclick = () => setEstado(b.dataset.id, 'aprobado'));
  content().querySelectorAll('.js-re').forEach(b => b.onclick = () => setEstado(b.dataset.id, 'rechazado'));
  content().querySelectorAll('.js-del').forEach(b => b.onclick = async () => {
    if (!confirm('¿Eliminar este testimonio?')) return;
    await supabase.from('testimonios').delete().eq('id', b.dataset.id);
    await logAccion('eliminar', 'testimonio', b.dataset.id, '');
    renderTestimonios();
  });
}
