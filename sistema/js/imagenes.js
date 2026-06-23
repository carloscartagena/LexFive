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


// Editor de imagen (recorte cuadrado con zoom, arrastre, guías de centrado e
// imán, y opción de quitar el fondo blanco). Produce un PNG (o JPEG) del lado
// indicado. Usado por Sellos, Credenciales (foto) y similares.
// opts: { titulo, salida(px), quitarBlanco, formato:'jpeg', calidad }.
export function abrirEditorImagen(file, opts, onDone) {
  opts = opts || {};
  const SALIDA = opts.salida || 600;     // px del PNG final (cuadrado)
  const LIENZO = 340;                     // px del área de edición
  if (file.size > 12 * 1024 * 1024) { toast('La foto es muy pesada (máx. 12 MB).', 'error'); return; }

  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => construir(img);
    img.onerror = () => toast('No se pudo abrir la imagen.', 'error');
    img.src = reader.result;
  };
  reader.onerror = () => toast('No se pudo leer el archivo.', 'error');
  reader.readAsDataURL(file);

  function construir(img) {
    const overlay = document.createElement('div');
    overlay.className = 'img-editor';
    overlay.innerHTML = `
      <div class="img-editor__panel">
        <h3>${esc(opts.titulo || 'Ajustar imagen')}</h3>
        <p class="cell-sub">Arrastre la imagen o use las flechas para moverla. Aparecen <strong>guías verdes</strong> y se imanta al centro. El recuadro es el recorte final. Se guardará en <strong>PNG ${SALIDA}×${SALIDA}px</strong>.</p>
        <div class="img-editor__stage">
          <canvas id="ieCanvas" width="${LIENZO}" height="${LIENZO}"></canvas>
        </div>
        <div class="img-editor__nudge">
          <button type="button" class="n-up" data-nudge="up" title="Subir">&#9650;</button>
          <button type="button" class="n-left" data-nudge="left" title="Izquierda">&#9664;</button>
          <button type="button" class="n-center" data-nudge="center" title="Centrar">&#10043;</button>
          <button type="button" class="n-right" data-nudge="right" title="Derecha">&#9654;</button>
          <button type="button" class="n-down" data-nudge="down" title="Bajar">&#9660;</button>
        </div>
        <label class="img-editor__zoom">Zoom
          <input type="range" id="ieZoom" min="1" max="5" step="0.01" value="1">
        </label>
        <label class="img-editor__chk"><input type="checkbox" id="ieWhite" ${opts.quitarBlanco ? 'checked' : ''}> Quitar fondo blanco (ideal para fotos JPG)</label>
        <div class="img-editor__actions">
          <button class="btn btn--ghost" id="ieCancel" type="button">Cancelar</button>
          <button class="btn btn--primary" id="ieApply" type="button">Aplicar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const canvas = overlay.querySelector('#ieCanvas');
    const ctx = canvas.getContext('2d');
    const zoomEl = overlay.querySelector('#ieZoom');
    const whiteEl = overlay.querySelector('#ieWhite');
    const C = LIENZO / 2;

    const base = Math.min(LIENZO / img.width, LIENZO / img.height);
    const st = { scale: base, x: (LIENZO - img.width * base) / 2, y: (LIENZO - img.height * base) / 2 };

    function quitarBlanco(context, size) {
      const d = context.getImageData(0, 0, size, size);
      const p = d.data;
      // Quita el fondo claro del papel (no solo el blanco puro). Usa el canal
      // más bajo: el papel claro tiene un mínimo alto; la tinta del sello tiene
      // un mínimo bajo y se conserva. Entre BAJO y ALTO se aplica una
      // transición suave para que los bordes no queden duros.
      const ALTO = 244, BAJO = 200;
      for (let i = 0; i < p.length; i += 4) {
        const min = Math.min(p[i], p[i + 1], p[i + 2]);
        if (min >= ALTO) { p[i + 3] = 0; }
        else if (min > BAJO) { p[i + 3] = Math.round(p[i + 3] * (1 - (min - BAJO) / (ALTO - BAJO))); }
      }
      context.putImageData(d, 0, 0);
    }

    // Dibuja guías verdes cuando la imagen está centrada (como en Word)
    function ejes() {
      const cx = st.x + img.width * st.scale / 2;
      const cy = st.y + img.height * st.scale / 2;
      ctx.save();
      ctx.strokeStyle = '#19b36b'; ctx.lineWidth = 1;
      if (Math.abs(cx - C) < 1.5) { ctx.beginPath(); ctx.moveTo(C, 0); ctx.lineTo(C, LIENZO); ctx.stroke(); }
      if (Math.abs(cy - C) < 1.5) { ctx.beginPath(); ctx.moveTo(0, C); ctx.lineTo(LIENZO, C); ctx.stroke(); }
      ctx.restore();
    }

    function pintar() {
      ctx.clearRect(0, 0, LIENZO, LIENZO);
      ctx.drawImage(img, st.x, st.y, img.width * st.scale, img.height * st.scale);
      if (whiteEl.checked) quitarBlanco(ctx, LIENZO);
      ejes();
    }
    pintar();

    // Imán hacia el centro
    function imantar() {
      const SNAP = 8;
      const cx = st.x + img.width * st.scale / 2;
      const cy = st.y + img.height * st.scale / 2;
      if (Math.abs(cx - C) < SNAP) st.x = C - img.width * st.scale / 2;
      if (Math.abs(cy - C) < SNAP) st.y = C - img.height * st.scale / 2;
    }
    function centrar() {
      st.x = (LIENZO - img.width * st.scale) / 2;
      st.y = (LIENZO - img.height * st.scale) / 2;
      pintar();
    }

    zoomEl.oninput = () => {
      const nueva = base * parseFloat(zoomEl.value);
      st.x = C - ((C - st.x) / st.scale) * nueva;
      st.y = C - ((C - st.y) / st.scale) * nueva;
      st.scale = nueva;
      pintar();
    };
    whiteEl.onchange = pintar;

    overlay.querySelectorAll('[data-nudge]').forEach(b => b.onclick = () => {
      const d = b.dataset.nudge, S = 6;
      if (d === 'up') st.y -= S; else if (d === 'down') st.y += S;
      else if (d === 'left') st.x -= S; else if (d === 'right') st.x += S;
      else if (d === 'center') return centrar();
      imantar(); pintar();
    });

    let drag = false, px = 0, py = 0;
    const down = e => { drag = true; const t = e.touches ? e.touches[0] : e; px = t.clientX; py = t.clientY; };
    const move = e => {
      if (!drag) return;
      const t = e.touches ? e.touches[0] : e;
      st.x += t.clientX - px; st.y += t.clientY - py; px = t.clientX; py = t.clientY;
      imantar(); pintar(); if (e.cancelable) e.preventDefault();
    };
    const up = () => { drag = false; };
    canvas.addEventListener('mousedown', down); window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    canvas.addEventListener('touchstart', down, { passive: true }); canvas.addEventListener('touchmove', move, { passive: false }); window.addEventListener('touchend', up);

    function cerrar() {
      window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); window.removeEventListener('touchend', up);
      overlay.remove();
    }
    overlay.querySelector('#ieCancel').onclick = cerrar;
    overlay.querySelector('#ieApply').onclick = () => {
      const out = document.createElement('canvas');
      out.width = SALIDA; out.height = SALIDA;
      const octx = out.getContext('2d');
      const k = SALIDA / LIENZO;
      const esJpeg = opts.formato === 'jpeg';
      // El JPEG no tiene transparencia: se rellena de blanco para que las zonas
      // vacías no salgan en negro. (Las fotos son opacas; pesan mucho menos en JPEG.)
      if (esJpeg) { octx.fillStyle = '#ffffff'; octx.fillRect(0, 0, SALIDA, SALIDA); }
      octx.drawImage(img, st.x * k, st.y * k, img.width * st.scale * k, img.height * st.scale * k);
      if (whiteEl.checked) quitarBlanco(octx, SALIDA);
      const url = esJpeg ? out.toDataURL('image/jpeg', opts.calidad || 0.82) : out.toDataURL('image/png');
      cerrar();
      if (typeof onDone === 'function') onDone(url);
    };
  }
}
