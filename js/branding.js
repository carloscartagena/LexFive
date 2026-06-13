/* =========================================================
   LexFive — Marca compartida (logo del bufete)
   ---------------------------------------------------------
   Aplica el logo elegido por el bufete en cualquier página
   (inicio de sesión, verificación de QR, web pública, etc.).
   El logo se guarda en la nube (Supabase, tabla "configuracion",
   fila 'branding') desde el panel, por lo que se ve IGUAL en
   todos los dispositivos: computadora, celular y la web.

   Cómo usarlo en una página:
   - Incluya este script: <script src="js/branding.js"></script>
     (desde /sistema use "../js/branding.js").
   - El logo se aplica automáticamente a:
       · el fondo de los elementos con clase  .logo__mark
       · cualquier <img data-brand-logo>  (se le cambia el src)
   ========================================================= */
(function () {
    'use strict';

    // Datos PÚBLICOS de Supabase (mismos que en sistema/js/config.js).
    var SB_URL = 'https://soazmibvesvuwgxeealo.supabase.co';
    var SB_KEY = 'sb_publishable_rPll8pRV30EagnHkJ68Kwg_JfoeN6vT';
    var LOGOS_VALIDOS = ['ds1-balanza-codigo', 'ds2-L5-circuito', 'ds3-mazo-pulso', 'ds4-columna-circuito', 'ds5-balanza-chip', 'opcion-6-LF-circuito'];

    // Ruta a los logos según dónde esté la página (raíz o /sistema/).
    var ASSET_BASE = location.pathname.indexOf('/sistema/') !== -1 ? '../assets/logos/' : 'assets/logos/';

    // Convierte la configuración de marca en la URL del logo a mostrar.
    function urlDeMarca(b) {
        if (!b) return '';
        if (b.logoId === 'custom' && b.logoImg) return b.logoImg;          // logo propio (imagen subida)
        if (b.logoId && LOGOS_VALIDOS.indexOf(b.logoId) !== -1) return ASSET_BASE + b.logoId + '.svg';
        return '';
    }

    function aplicar(url) {
        if (!url) return;
        // 1) Fondo del emblema (.logo__mark) en los encabezados.
        var st = document.getElementById('lexfiveLogoStyle');
        if (!st) { st = document.createElement('style'); st.id = 'lexfiveLogoStyle'; document.head.appendChild(st); }
        st.textContent = '.logo__mark{background-image:url(' + url + ')!important;}';
        // 2) Cualquier <img data-brand-logo> (p. ej. la página de verificación).
        var imgs = document.querySelectorAll('img[data-brand-logo]');
        for (var i = 0; i < imgs.length; i++) { imgs[i].src = url; }
    }

    // 1) Pintado rápido con la última copia guardada en este equipo.
    try { aplicar(urlDeMarca(JSON.parse(localStorage.getItem('lexfive_branding') || '{}'))); } catch (e) {}

    // 2) Refresco desde la nube (fuente de verdad para todos los equipos).
    try {
        fetch(SB_URL + '/rest/v1/configuracion?clave=eq.branding&select=valor', {
            headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
        })
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (rows) {
            if (rows && rows[0] && rows[0].valor) {
                var b = rows[0].valor;
                try { localStorage.setItem('lexfive_branding', JSON.stringify(b)); } catch (e) {}
                aplicar(urlDeMarca(b));
            }
        })
        .catch(function () {});
    } catch (e) {}
})();
