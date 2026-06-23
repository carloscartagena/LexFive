// ============================================================
//  LexFive — Helpers de imágenes del panel
//  Optimización (redimensionar a JPEG) y vista ampliada.
//  Usados por Áreas, Sellos y Sitio. Extraído de app.js (paso 16).
// ============================================================
import { esc } from './util.js';
import { toast } from './ui.js';

// Redimensiona una imagen (data URL) a un lado máximo y la devuelve como JPEG
// (más liviana). Si algo falla, devuelve la original. Llama a cb(resultado).
export function optimizarFotoSitio(dataUrl, maxLado, cb) {
  try {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
      if (!w || !h) { cb(dataUrl); return; }
      const escala = Math.min(1, maxLado / Math.max(w, h));
      const cw = Math.max(1, Math.round(w * escala)), ch = Math.max(1, Math.round(h * escala));
      try {
        const c = document.createElement('canvas'); c.width = cw; c.height = ch;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cw, ch); // JPEG no tiene transparencia
        ctx.drawImage(img, 0, 0, cw, ch);
        cb(c.toDataURL('image/jpeg', 0.72));
      } catch (e) { cb(dataUrl); }
    };
    img.onerror = () => cb(dataUrl);
    img.src = dataUrl;
  } catch (e) { cb(dataUrl); }
}

// Muestra una imagen en grande, en una capa sobre la pantalla, con opción de descargar.
export function ampliarImagenSitio(src, titulo) {
  if (!src) { toast('No hay imagen para mostrar.', 'error'); return; }
  const o = document.createElement('div');
  o.className = 'img-editor';
  o.innerHTML = `
    <div class="img-editor__panel" style="width:820px;max-width:100%">
      <h3>${esc(titulo || 'Vista ampliada')}</h3>
      <div class="big-preview"><img src="${src}" alt="${esc(titulo || '')}" style="max-width:100%;max-height:72vh;border-radius:10px;display:block;margin:0 auto"></div>
      <div class="img-editor__actions">
        <a class="btn btn--ghost" href="${src}" download="imagen-sitio">Descargar</a>
        <button class="btn btn--primary" id="aiClose" type="button">Cerrar</button>
      </div>
    </div>`;
  document.body.appendChild(o);
  const close = () => o.remove();
  o.querySelector('#aiClose').onclick = close;
  o.onclick = e => { if (e.target === o) close(); };
}


// Redimensiona una imagen (data URL) para que su lado mayor no supere "maxLado",
// recomprimiéndola en PNG (conserva transparencia). Si ya es pequeña o algo
// falla, devuelve la original. Reduce el peso de logos/sellos subidos como foto.
export function redimensionarDataUrl(dataUrl, maxLado, cb) {
  try {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
      if (!w || !h || (w <= maxLado && h <= maxLado)) { cb(dataUrl); return; }
      const escala = Math.min(maxLado / w, maxLado / h);
      const cw = Math.max(1, Math.round(w * escala)), ch = Math.max(1, Math.round(h * escala));
      try {
        const c = document.createElement('canvas'); c.width = cw; c.height = ch;
        c.getContext('2d').drawImage(img, 0, 0, cw, ch);
        cb(c.toDataURL('image/png'));
      } catch (e) { cb(dataUrl); }
    };
    img.onerror = () => cb(dataUrl);
    img.src = dataUrl;
  } catch (e) { cb(dataUrl); }
}
