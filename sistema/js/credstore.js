// ============================================================
//  LexFive — Almacén de CREDENCIALES en la nube (Supabase)
//  Cada credencial creada se guarda en la tabla "credenciales", por
//  lo que se puede editar, reimprimir y eliminar desde cualquier
//  dispositivo. Se mantiene una caché local para pintar rápido y
//  tolerar cortes de red. Extraído de app.js (paso 17 del split).
// ============================================================
import { supabase } from './supabase.js';

// Convierte una fila de la tabla (snake_case) al formato que usa la interfaz.
export function normCred(r) {
  r = r || {};
  return {
    id: r.id,
    nombre: r.nombre || '', cargo: r.cargo || '', ci: r.ci || '',
    telPersonal: r.tel_personal || '', telOficina: r.tel_oficina || '',
    emision: r.emision || '', validez: r.validez || '',
    frase: r.frase || '', representacion: r.representacion || '',
    foto: r.foto || null
  };
}

export const CredStore = {
  cache: null,
  // Devuelve la caché en memoria al instante si ya existe (para que los
  // re-render de la pestaña —al elegir/subir/eliminar un logo o sello— NO
  // vuelvan a descargar las credenciales de la nube y se sientan rápidos).
  // Solo va a la red la primera vez o cuando la caché se invalidó tras
  // guardar/eliminar una credencial.
  async listCached() {
    if (this.cache) return this.cache;
    return this.list();
  },
  // Trae las credenciales de la nube (y guarda copia local por si no hay red).
  async list() {
    try {
      const { data, error } = await supabase
        .from('credenciales').select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      this.cache = (data || []).map(normCred);
      try { localStorage.setItem('lexfive_cred_cache', JSON.stringify(this.cache)); } catch (e) {}
      return this.cache;
    } catch (e) {
      if (this.cache) return this.cache;
      try { return JSON.parse(localStorage.getItem('lexfive_cred_cache') || '[]'); } catch (e2) { return []; }
    }
  },
  // Crea o actualiza una credencial en la nube. Devuelve la fila guardada.
  async upsert(rec) {
    const row = {
      nombre: rec.nombre || '', cargo: rec.cargo || null, ci: rec.ci || null,
      tel_personal: rec.telPersonal || null, tel_oficina: rec.telOficina || null,
      emision: rec.emision || null, validez: rec.validez || null,
      frase: rec.frase || null, representacion: rec.representacion || null,
      foto: rec.foto || null, updated_at: new Date().toISOString()
    };
    if (rec.id) row.id = rec.id;
    const { data, error } = await supabase.from('credenciales').upsert(row).select().maybeSingle();
    if (error) throw error;
    this.cache = null; // forzar relectura desde la nube en el próximo render
    return normCred(data);
  },
  // Elimina una credencial de la nube.
  async remove(id) {
    const { error } = await supabase.from('credenciales').delete().eq('id', id);
    if (error) throw error;
    this.cache = null;
  }
};
