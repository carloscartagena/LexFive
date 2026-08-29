// ============================================================
//  LexFive — Atajos de DOM compartidos
//  Se separan para que app.js y ui.js usen los mismos helpers.
// ============================================================

// Selector rápido (document.querySelector).
export const $ = (sel) => document.querySelector(sel);

// Contenedor principal donde se pintan las vistas del panel.
export const content = () => $('#content');
