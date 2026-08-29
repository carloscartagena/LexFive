// ============================================================
//  LexFive — Helpers comunes de presentación
//  Nombres, opciones de <select>, casillas y badges que dependen
//  del estado compartido (perfiles, clientes) y de los catálogos.
//  Usados por muchas vistas. Extraído de app.js (paso 6 del split).
// ============================================================
import { state } from '@/utils/state.js';
import { ESTADOS, ROLES } from '@/utils/config.js';
import { esc } from '@/utils/util.js';

// Nombre de un usuario del personal por su id (o "—").
export function profName(id) {
  if (!id) return '—';
  const p = state.profiles.find(x => x.id === id);
  return p ? p.nombre : '—';
}

// Nombre de un cliente por su id (o "—").
export function clienteName(id) {
  if (!id) return '—';
  const c = state.clientes.find(x => x.id === id);
  return c ? c.nombre : '—';
}

// Insignia (badge) del estado de un proceso.
export function badgeEstado(estado) {
  const label = ESTADOS[estado] || estado || '—';
  return `<span class="badge badge-estado ${esc(estado || '')}">${esc(label)}</span>`;
}

// <option> de personal activo para un <select> de "asignado a".
export function optionsProfiles(selected) {
  return '<option value="">— Sin asignar —</option>' + state.profiles.filter(p => p.activo)
    .map(p => `<option value="${p.id}" ${p.id === selected ? 'selected' : ''}>${esc(p.nombre)} (${ROLES[p.rol] || p.rol})</option>`).join('');
}

// Casillas (checkbox) de personal activo para asignar varios abogados/procuradores.
export function checkboxesProfiles(selected, cls) {
  const sel = selected || [];
  const staff = state.profiles.filter(p => p.activo && ['admin', 'procurador', 'abogado'].includes(p.rol));
  if (!staff.length) return '<span class="cell-sub">No hay personal disponible.</span>';
  return staff.map(p => `<label class="chk"><input type="checkbox" class="${cls}" value="${p.id}" ${sel.includes(p.id) ? 'checked' : ''}> ${esc(p.nombre)} <span class="chk-rol">(${ROLES[p.rol] || p.rol})</span></label>`).join('');
}

// Lista de nombres a partir de una lista de ids de personal (o null).
export function namesFromIds(ids) {
  if (!ids || !ids.length) return null;
  return ids.map(profName).join(', ');
}

// <option> de clientes para un <select>.
export function optionsClientes(selected) {
  return '<option value="">— Sin cliente —</option>' + state.clientes
    .map(c => `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('');
}
