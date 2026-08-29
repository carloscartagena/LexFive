// ============================================================
//  LexFive — Estado global compartido del panel
//  Un único objeto que comparten app.js y los módulos de vistas.
//  Se importa por referencia: mutar sus propiedades (state.x = ...)
//  se ve reflejado en todos los módulos.
// ============================================================
export const state = {
  profile: null,
  profiles: [],   // todos los usuarios (para mapear nombres y selects)
  clientes: [],   // cache de clientes
  categorias: [], // áreas del derecho (dinámicas, desde la tabla "categorias")
  view: 'dashboard'
};
