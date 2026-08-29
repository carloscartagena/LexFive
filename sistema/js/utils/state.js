// ============================================================
//  LexFive — Estado global compartido del panel (Reactivo)
//  Implementa un Proxy para notificar a los oyentes cuando el estado cambia.
// ============================================================

const listeners = [];

const initialState = {
  profile: null,
  profiles: [],   // todos los usuarios
  clientes: [],   // cache de clientes
  categorias: [], // áreas del derecho
  view: 'dashboard'
};

export const state = new Proxy(initialState, {
  set(target, property, value) {
    target[property] = value;
    // Notificar a todos los listeners registrados
    listeners.forEach(listener => listener(property, value, target));
    return true;
  }
});

/**
 * Permite a cualquier componente de la interfaz suscribirse a cambios en el estado.
 * @param {Function} callback - Función a ejecutar (property, newValue, state)
 */
export function subscribe(callback) {
  listeners.push(callback);
}

/**
 * Permite desuscribirse de los cambios del estado.
 */
export function unsubscribe(callback) {
  const index = listeners.indexOf(callback);
  if (index !== -1) {
    listeners.splice(index, 1);
  }
}
