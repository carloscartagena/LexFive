/* =========================================================
   LexFive — JavaScript principal
   ========================================================= */
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {

        /* ---------- Logo del bufete (compartido vía Supabase) ----------
           El logo se guarda en la nube (tabla "configuracion", clave
           'branding') desde el panel. Así, el logo elegido en la
           computadora se ve igual en el celular y en cualquier equipo.
           Se pinta de inmediato con la última copia local y luego se
           refresca desde la nube. */
        try {
            // Datos PÚBLICOS de Supabase (mismos que en sistema/js/config.js).
            var SB_URL = 'https://soazmibvesvuwgxeealo.supabase.co';
            var SB_KEY = 'sb_publishable_rPll8pRV30EagnHkJ68Kwg_JfoeN6vT';
            var LOGOS_VALIDOS = ['ds1-balanza-codigo', 'ds2-L5-circuito', 'ds3-mazo-pulso', 'ds4-columna-circuito', 'ds5-balanza-chip', 'opcion-6-LF-circuito'];

            var aplicarMarca = function (url) {
                if (!url) return;
                var st = document.getElementById('lexfiveLogoStyle');
                if (!st) { st = document.createElement('style'); st.id = 'lexfiveLogoStyle'; document.head.appendChild(st); }
                st.textContent = '.logo__mark{background-image:url(' + url + ')!important;}';
            };
            // Convierte la configuración de marca en la URL del logo a mostrar.
            var urlDeMarca = function (b) {
                if (!b) return '';
                if (b.logoId === 'custom' && b.logoImg) return b.logoImg;
                if (b.logoId && LOGOS_VALIDOS.indexOf(b.logoId) !== -1) return 'assets/logos/' + b.logoId + '.svg';
                return '';
            };

            // 1) Pintado rápido con la última copia guardada en este equipo.
            try {
                var cache = JSON.parse(localStorage.getItem('lexfive_branding') || '{}');
                aplicarMarca(urlDeMarca(cache));
            } catch (e) {}

            // 2) Refresco desde la nube (fuente de verdad para todos los equipos).
            fetch(SB_URL + '/rest/v1/configuracion?clave=eq.branding&select=valor', {
                headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
            })
            .then(function (r) { return r.ok ? r.json() : []; })
            .then(function (rows) {
                if (rows && rows[0] && rows[0].valor) {
                    var b = rows[0].valor;
                    try { localStorage.setItem('lexfive_branding', JSON.stringify(b)); } catch (e) {}
                    aplicarMarca(urlDeMarca(b));
                }
            })
            .catch(function () {});
        } catch (e) {}

        /* ---------- Año actual en el footer ---------- */
        var yearEl = document.getElementById('year');
        if (yearEl) { yearEl.textContent = new Date().getFullYear(); }

        /* ---------- Menú móvil con backdrop y botón cerrar ✕ ---------- */
        var navToggle = document.getElementById('navToggle');
        var nav = document.getElementById('nav');

        if (navToggle && nav) {
            // Asegurar que exista el backdrop semitransparente
            var navBackdrop = document.getElementById('navBackdrop');
            if (!navBackdrop) {
                navBackdrop = document.createElement('div');
                navBackdrop.id = 'navBackdrop';
                navBackdrop.className = 'nav-backdrop';
                document.body.appendChild(navBackdrop);
            }

            // Asegurar que exista la cabecera con botón ✕ dentro del drawer
            var navClose = document.getElementById('navClose');
            if (!navClose) {
                var navHeader = nav.querySelector('.nav__header');
                if (!navHeader) {
                    navHeader = document.createElement('div');
                    navHeader.className = 'nav__header';
                    navHeader.innerHTML = '<div class="nav__brand"><strong>LexFive</strong><small>Menú</small></div>' +
                        '<button type="button" class="nav__close" id="navClose" aria-label="Cerrar menú">&times;</button>';
                    nav.insertBefore(navHeader, nav.firstChild);
                }
                navClose = document.getElementById('navClose');
            }

            function openMenu() {
                nav.classList.add('is-open');
                navToggle.classList.add('is-open');
                navToggle.setAttribute('aria-expanded', 'true');
                navToggle.setAttribute('aria-label', 'Cerrar menú');
                if (navBackdrop) navBackdrop.classList.add('is-active');
                document.body.style.overflow = 'hidden';
            }

            function closeMenu() {
                nav.classList.remove('is-open');
                navToggle.classList.remove('is-open');
                navToggle.setAttribute('aria-expanded', 'false');
                navToggle.setAttribute('aria-label', 'Abrir menú');
                if (navBackdrop) navBackdrop.classList.remove('is-active');
                document.body.style.overflow = '';
            }

            navToggle.addEventListener('click', function (e) {
                e.stopPropagation();
                if (nav.classList.contains('is-open')) {
                    closeMenu();
                } else {
                    openMenu();
                }
            });

            if (navClose) {
                navClose.addEventListener('click', function (e) {
                    e.stopPropagation();
                    closeMenu();
                });
            }

            if (navBackdrop) {
                navBackdrop.addEventListener('click', function () {
                    closeMenu();
                });
            }

            // Cerrar al hacer clic en un enlace
            nav.querySelectorAll('.nav__link').forEach(function (link) {
                link.addEventListener('click', closeMenu);
            });

            // Cerrar con la tecla Escape
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape' && nav.classList.contains('is-open')) {
                    closeMenu();
                }
            });

            // Cerrar al hacer clic fuera del menú
            document.addEventListener('click', function (e) {
                if (nav.classList.contains('is-open') &&
                    !nav.contains(e.target) && !navToggle.contains(e.target)) {
                    closeMenu();
                }
            });
        }

        /* ---------- Header con sombra al hacer scroll ---------- */
        var header = document.getElementById('header');
        function onScrollHeader() {
            if (!header) return;
            header.classList.toggle('is-scrolled', window.scrollY > 10);
        }
        onScrollHeader();

        /* ---------- Botón volver arriba ---------- */
        var backToTop = document.getElementById('backToTop');
        function onScrollBackTop() {
            if (!backToTop) return;
            backToTop.classList.toggle('is-visible', window.scrollY > 500);
        }
        if (backToTop) {
            backToTop.addEventListener('click', function () {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        /* ---------- Resaltado de la sección activa en el nav ---------- */
        var sections = document.querySelectorAll('main section[id]');
        var navLinks = document.querySelectorAll('.nav__link');
        function highlightNav() {
            var current = '';
            var offset = 120;
            sections.forEach(function (section) {
                if (window.scrollY >= section.offsetTop - offset) {
                    current = section.getAttribute('id');
                }
            });
            navLinks.forEach(function (link) {
                var href = link.getAttribute('href');
                link.classList.toggle('is-active', href === '#' + current);
            });
        }

        /* ---------- Scroll handler unificado (rendimiento) ---------- */
        var ticking = false;
        window.addEventListener('scroll', function () {
            if (!ticking) {
                window.requestAnimationFrame(function () {
                    onScrollHeader();
                    onScrollBackTop();
                    highlightNav();
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });

        /* ---------- Animaciones de aparición al hacer scroll ---------- */
        var revealTargets = document.querySelectorAll(
            '.area-card, .tech-card, .member, .testimonial, .stat, .about__content, .about__media, .contact__info, .contact__form, .section__head, .why-card, .step, .social-card'
        );
        revealTargets.forEach(function (el) { el.classList.add('reveal'); });

        if ('IntersectionObserver' in window) {
            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry, index) {
                    if (entry.isIntersecting) {
                        // Pequeño retraso escalonado para un efecto más elegante
                        var delay = (index % 4) * 90;
                        setTimeout(function () {
                            entry.target.classList.add('is-visible');
                        }, delay);
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

            revealTargets.forEach(function (el) { observer.observe(el); });
        } else {
            // Sin soporte: mostrar todo directamente
            revealTargets.forEach(function (el) { el.classList.add('is-visible'); });
        }

        /* ---------- Contador animado de estadísticas ---------- */
        var counters = document.querySelectorAll('.stat__number');
        function animateCounter(el) {
            var target = parseInt(el.getAttribute('data-target'), 10) || 0;
            var duration = 1800;
            var startTime = null;

            function step(timestamp) {
                if (!startTime) startTime = timestamp;
                var progress = Math.min((timestamp - startTime) / duration, 1);
                // easing (easeOutQuart)
                var eased = 1 - Math.pow(1 - progress, 4);
                var value = Math.floor(eased * target);
                el.textContent = value.toLocaleString('es-MX');
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                } else {
                    el.textContent = target.toLocaleString('es-MX');
                }
            }
            window.requestAnimationFrame(step);
        }

        if ('IntersectionObserver' in window && counters.length) {
            var counterObserver = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        animateCounter(entry.target);
                        counterObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.5 });
            counters.forEach(function (c) { counterObserver.observe(c); });
        } else {
            counters.forEach(function (c) {
                c.textContent = (parseInt(c.getAttribute('data-target'), 10) || 0).toString();
            });
        }

        /* ---------- Validación del formulario de contacto ---------- */
        var form = document.getElementById('contactForm');
        var feedback = document.getElementById('formFeedback');

        function setError(field, message) {
            var wrapper = field.closest('.field');
            if (wrapper) { wrapper.classList.add('has-error'); }
            var errorEl = form.querySelector('[data-error-for="' + field.id + '"]');
            if (errorEl) { errorEl.textContent = message; }
        }

        function clearError(field) {
            var wrapper = field.closest('.field');
            if (wrapper) { wrapper.classList.remove('has-error'); }
            var errorEl = form.querySelector('[data-error-for="' + field.id + '"]');
            if (errorEl) { errorEl.textContent = ''; }
        }

        function isValidEmail(value) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        }

        if (form) {
            // Momento en que se mostró el formulario (para detectar envíos instantáneos de bots).
            var formLoadedAt = Date.now();
            // Autoguardado del mensaje (por si recarga o cierra el navegador sin querer)
            var DRAFT_KEY = 'lexfive_contacto_borrador';
            var draftFields = ['nombre', 'apellido', 'email', 'telefono', 'area', 'mensaje'];
            try {
                var savedRaw = localStorage.getItem(DRAFT_KEY);
                if (savedRaw) {
                    var saved = JSON.parse(savedRaw);
                    draftFields.forEach(function (id) {
                        var el = document.getElementById(id);
                        if (el && saved[id] && !el.value) { el.value = saved[id]; }
                    });
                }
            } catch (e) {}
            var saveDraft = function () {
                try {
                    var o = {};
                    draftFields.forEach(function (id) { var el = document.getElementById(id); if (el) o[id] = el.value; });
                    localStorage.setItem(DRAFT_KEY, JSON.stringify(o));
                } catch (e) {}
            };
            draftFields.forEach(function (id) {
                var el = document.getElementById(id);
                if (el) { el.addEventListener('input', saveDraft); el.addEventListener('change', saveDraft); }
            });

            // Limpiar error al escribir
            form.querySelectorAll('input, select, textarea').forEach(function (field) {
                field.addEventListener('input', function () { clearError(field); });
            });

            form.addEventListener('submit', function (e) {
                e.preventDefault();

                /* ---------- Anti-spam silencioso (no molesta al usuario real) ---------- */
                var hpCheck = form.querySelector('input[name="botcheck"]');
                var hpText = document.getElementById('hp_empresa');
                var pareceBot = (hpCheck && hpCheck.checked) ||
                                (hpText && hpText.value.trim() !== '') ||
                                ((Date.now() - formLoadedAt) < 2500); // enviado demasiado rápido
                if (pareceBot) {
                    // Fingimos éxito y NO guardamos nada (así el bot no se da cuenta).
                    form.reset();
                    try { localStorage.removeItem(DRAFT_KEY); } catch (e2) {}
                    if (feedback) {
                        feedback.textContent = '¡Gracias! Hemos recibido su solicitud y le contactaremos a la brevedad.';
                        feedback.className = 'form__feedback is-success';
                    }
                    return;
                }

                var valid = true;
                if (feedback) { feedback.textContent = ''; feedback.className = 'form__feedback'; }

                var nombre = document.getElementById('nombre');
                var apellido = document.getElementById('apellido');
                var email = document.getElementById('email');
                var mensaje = document.getElementById('mensaje');
                var privacidad = document.getElementById('privacidad');

                if (!nombre.value.trim()) { setError(nombre, 'Por favor, indique su nombre.'); valid = false; }
                if (apellido && !apellido.value.trim()) { setError(apellido, 'Por favor, indique su apellido.'); valid = false; }
                if (!email.value.trim()) {
                    setError(email, 'Por favor, indique su correo.'); valid = false;
                } else if (!isValidEmail(email.value.trim())) {
                    setError(email, 'Ingrese un correo electrónico válido.'); valid = false;
                }
                if (!mensaje.value.trim()) { setError(mensaje, 'Por favor, describa brevemente su caso.'); valid = false; }
                if (privacidad && !privacidad.checked) {
                    if (feedback) {
                        feedback.textContent = 'Debe aceptar el aviso de privacidad para continuar.';
                        feedback.className = 'form__feedback is-error';
                    }
                    valid = false;
                }

                if (!valid) {
                    var firstError = form.querySelector('.has-error input, .has-error select, .has-error textarea');
                    if (firstError) { firstError.focus(); }
                    return;
                }

                /* ---------- Límite de envíos por navegador (evita spam repetido) ---------- */
                var ENVIOS_KEY = 'lexfive_envios';
                var ahoraTs = Date.now();
                var envios = [];
                try { envios = JSON.parse(localStorage.getItem(ENVIOS_KEY) || '[]'); } catch (e2) { envios = []; }
                envios = envios.filter(function (t) { return ahoraTs - t < 10 * 60 * 1000; }); // últimos 10 min
                if (envios.length >= 3) {
                    if (feedback) {
                        feedback.textContent = 'Ha enviado varias consultas seguidas. Por favor espere unos minutos o escríbanos por WhatsApp.';
                        feedback.className = 'form__feedback is-error';
                    }
                    return;
                }
                try { envios.push(ahoraTs); localStorage.setItem(ENVIOS_KEY, JSON.stringify(envios)); } catch (e2) {}

                var submitBtn = form.querySelector('button[type="submit"]');
                var accessKey = form.querySelector('input[name="access_key"]');
                var keyConfigured = accessKey && accessKey.value &&
                                    accessKey.value.indexOf('REEMPLAZA') === -1;

                function showSuccess() {
                    form.reset();
                    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Enviar solicitud'; }
                    if (feedback) {
                        feedback.textContent = '¡Gracias! Hemos recibido su solicitud y le contactaremos a la brevedad.';
                        feedback.className = 'form__feedback is-success';
                    }
                }
                function showFail() {
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Enviar solicitud'; }
                    if (feedback) {
                        feedback.textContent = 'Hubo un problema al enviar. Inténtelo de nuevo o escríbanos a alba23meira@gmail.com.';
                        feedback.className = 'form__feedback is-error';
                    }
                }

                if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Enviando...'; }

                /* Datos de la consulta (nombre y apellido por separado). */
                var telefonoEl = document.getElementById('telefono');
                var areaEl = document.getElementById('area');
                var consulta = {
                    nombre: nombre.value.trim(),
                    apellido: apellido ? apellido.value.trim() : null,
                    email: email.value.trim(),
                    telefono: telefonoEl && telefonoEl.value.trim() ? telefonoEl.value.trim() : null,
                    area: areaEl && areaEl.value ? areaEl.value : null,
                    mensaje: mensaje.value.trim()
                };

                /* 1) Inserción directa en la bandeja "Consultas" del panel (Supabase). */
                var telefonoEl = document.getElementById('telefono');
                var areaEl = document.getElementById('area');
                var consulta = {
                    nombre: nombre.value.trim(),
                    apellido: (apellido && apellido.value.trim()) ? apellido.value.trim() : null,
                    email: email.value.trim(),
                    telefono: (telefonoEl && telefonoEl.value.trim()) ? telefonoEl.value.trim() : null,
                    area: (areaEl && areaEl.value) ? areaEl.value : null,
                    mensaje: mensaje.value.trim(),
                    estado: 'nueva'
                };

                var SB_URL = 'https://soazmibvesvuwgxeealo.supabase.co';
                var SB_KEY = 'sb_publishable_rPll8pRV30EagnHkJ68Kwg_JfoeN6vT';

                /* Aviso por correo con Web3Forms (si la clave está configurada). */
                function enviarCorreo() {
                    if (!keyConfigured) { return Promise.resolve({ skipped: true }); }
                    var payload = {};
                    new FormData(form).forEach(function (value, key) { payload[key] = value; });
                    return fetch(form.action, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                        body: JSON.stringify(payload)
                    })
                    .then(function (response) { return response.json(); })
                    .catch(function () { return { success: false }; });
                }

                // Inserción en Supabase con return=minimal para cumplir RLS público
                fetch(SB_URL + '/rest/v1/consultas', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SB_KEY,
                        'Authorization': 'Bearer ' + SB_KEY,
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify(consulta)
                })
                .then(function (res) {
                    if (res.ok || res.status === 201) {
                        enviarCorreo(); // en paralelo en segundo plano
                        showSuccess();
                    } else {
                        // Reintento con helper global si existiera o correo
                        if (window.LexFive && typeof window.LexFive.guardarConsulta === 'function') {
                            window.LexFive.guardarConsulta(consulta)
                                .then(function () { showSuccess(); })
                                .catch(function () {
                                    enviarCorreo().then(function (m) {
                                        if (m && m.success) showSuccess();
                                        else showFail();
                                    });
                                });
                        } else {
                            enviarCorreo().then(function (m) {
                                if (m && m.success) showSuccess();
                                else showFail();
                            });
                        }
                    }
                })
                .catch(function () {
                    enviarCorreo().then(function (m) {
                        if (m && m.success) showSuccess();
                        else showFail();
                    });
                });
            });
        }

        /* ---------- Acordeón de Preguntas frecuentes (FAQ) ---------- */
        var faqItems = document.querySelectorAll('.faq-item');
        faqItems.forEach(function (item) {
            var btn = item.querySelector('.faq-item__q');
            var answer = item.querySelector('.faq-item__a');
            if (!btn || !answer) return;

            btn.setAttribute('aria-expanded', 'false');
            btn.addEventListener('click', function () {
                var isOpen = item.classList.contains('is-open');

                // Cerrar los demás (comportamiento tipo acordeón)
                faqItems.forEach(function (other) {
                    if (other !== item) {
                        other.classList.remove('is-open');
                        var oa = other.querySelector('.faq-item__a');
                        var ob = other.querySelector('.faq-item__q');
                        if (oa) { oa.style.maxHeight = null; }
                        if (ob) { ob.setAttribute('aria-expanded', 'false'); }
                    }
                });

                if (isOpen) {
                    item.classList.remove('is-open');
                    answer.style.maxHeight = null;
                    btn.setAttribute('aria-expanded', 'false');
                } else {
                    item.classList.add('is-open');
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                    btn.setAttribute('aria-expanded', 'true');
                }
            });
        });

        /* ---------- Botón flotante de WhatsApp (elige a qué abogado escribir) ---------- */
        var waFloat = document.querySelector('.whatsapp-float');
        if (waFloat) {
            var abogados = [
                { n: 'Abg. Carlos Cartagena', w: '59178360469' },
                { n: 'Abg. Jose Gutiérrez', w: '59169915219' },
                { n: 'Abg. Jose Antelo', w: '59175216613' },
                { n: 'Abg. Douglas Candia', w: '59168173978' },
                { n: 'Abg. Iván Payrumani', w: '59179145231' }
            ];
            var waMsg = encodeURIComponent('Hola, deseo una consulta legal con LexFive.');
            var waMenu = document.createElement('div');
            waMenu.className = 'wa-menu';
            waMenu.innerHTML = '<p class="wa-menu__title">Escríbanos por WhatsApp</p>' +
                abogados.map(function (a) {
                    return '<a href="https://wa.me/' + a.w + '?text=' + waMsg + '" target="_blank" rel="noopener">' + a.n + '</a>';
                }).join('');
            document.body.appendChild(waMenu);
            waFloat.addEventListener('click', function (e) {
                e.preventDefault();
                waMenu.classList.toggle('open');
            });
            document.addEventListener('click', function (e) {
                if (!waMenu.contains(e.target) && !waFloat.contains(e.target)) {
                    waMenu.classList.remove('open');
                }
            });
        }

    });
})();


/* ---------- Botón de modo oscuro / claro (en el encabezado) ----------
   Recuerda la preferencia en el navegador; si no hay, sigue la del sistema.
   El tema ya se aplica en <head> para evitar parpadeo; aquí se crea el botón. */
(function () {
    var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
    var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.4M12 19.6V22M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2 12h2.4M19.6 12H22M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7"/></svg>';

    function currentTheme() {
        try { var t = localStorage.getItem('lexfive_theme'); if (t) return t; } catch (e) {}
        return 'dark';
    }
    function apply(theme) {
        document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    }

    function build() {
        var bar = document.querySelector('.header__inner');
        if (!bar || document.getElementById('modeToggle')) return;
        apply(currentTheme());

        var btn = document.createElement('button');
        btn.id = 'modeToggle';
        btn.className = 'mode-toggle';
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Cambiar entre modo claro y oscuro');

        function refresh() {
            var dark = document.documentElement.getAttribute('data-theme') === 'dark';
            btn.innerHTML = dark ? SUN : MOON;
            btn.title = dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
        }
        refresh();

        btn.addEventListener('click', function () {
            var dark = document.documentElement.getAttribute('data-theme') === 'dark';
            var next = dark ? 'light' : 'dark';
            apply(next);
            try { localStorage.setItem('lexfive_theme', next); } catch (e) {}
            refresh();
            // Avisamos a otros módulos (p. ej. fondos de sección) que el tema cambió,
            // para que recalculen colores dependientes del modo claro/oscuro.
            try { window.dispatchEvent(new Event('lexfive:themechange')); } catch (e) {}
        });

        var toggle = bar.querySelector('.nav__toggle');
        if (toggle) bar.insertBefore(btn, toggle); else bar.appendChild(btn);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
    else build();
})();


/* ---------- Imagen del hero y estilo de fondo (controlados desde el panel) ----------
   El bufete elige, en el panel «Sitio web», la imagen del hero y el patrón de
   fondo (código binario, circuito, líneas o ninguno). Se guarda en Supabase
   (config 'branding') y aquí se aplica al sitio público. Si no hay nada
   configurado, se mantiene la imagen y el fondo por defecto. */
(function () {
    var SB_URL = 'https://soazmibvesvuwgxeealo.supabase.co';
    var SB_KEY = 'sb_publishable_rPll8pRV30EagnHkJ68Kwg_JfoeN6vT';
    var BG_VALIDOS = ['circuito', 'lineas', 'ninguno'];
    var brandingActual = {}; // ultima config aplicada (para re-aplicar al cambiar de tema)

    function aplicar(b) {
        if (!b) return;
        brandingActual = b; // recordamos la ultima config para re-aplicar al cambiar de tema
        if (b.heroImg) {
            var hp = document.querySelector('.hero__photo');
            if (hp && hp.getAttribute('src') !== b.heroImg) hp.setAttribute('src', b.heroImg);
        }
        // Imagen de la sección «Sobre el bufete». El <img> trae onerror que lo
        // quita si la foto por defecto no existe; por eso, si hay una imagen
        // configurada y el elemento ya no está, se vuelve a crear.
        if (b.sobreImg) {
            var ai = document.querySelector('.about__image');
            var ap = document.querySelector('.about__photo');
            if (!ap && ai) {
                ap = document.createElement('img');
                ap.className = 'about__photo';
                ap.setAttribute('alt', '');
                var illu = ai.querySelector('.about__illu');
                if (illu) ai.insertBefore(ap, illu); else ai.appendChild(ap);
            }
            if (ap && ap.getAttribute('src') !== b.sobreImg) ap.setAttribute('src', b.sobreImg);
        }
        // Imagen de fondo del encabezado (hero). Se aplica SOLO al hero, con una
        // capa oscura automática por encima para que el título y los botones
        // (texto claro) siempre se lean. Si no hay imagen, se deja el fondo CSS.
        var hero = document.querySelector('.hero');
        if (hero) {
            if (b.heroBgImg) {
                var hv = Number(b.heroBgOpacity); if (!(hv >= 10 && hv <= 100)) hv = 25;
                var ha = (0.92 - (hv / 100) * 0.55).toFixed(2); // capa oscura graduable (texto legible)
                hero.style.backgroundImage = 'linear-gradient(rgba(8,18,33,' + ha + '), rgba(10,22,38,' + ha + ')), url("' + b.heroBgImg + '")';
                hero.style.backgroundSize = 'cover';
                hero.style.backgroundPosition = 'center';
            } else {
                hero.style.backgroundImage = '';
                hero.style.backgroundSize = '';
                hero.style.backgroundPosition = '';
            }
        }
        if (BG_VALIDOS.indexOf(b.bgStyle) !== -1) document.documentElement.setAttribute('data-bg', b.bgStyle);
        else document.documentElement.removeAttribute('data-bg');

        // Imagen de fondo OPCIONAL para las secciones «Razones para confiar»
        // (.why) y «Sobre el bufete» (.about). Reemplaza al patrón con una capa
        // clara automática para que el texto (oscuro) se siga leyendo. Si no hay
        // imagen configurada, se mantiene el patrón por defecto.
        var legacyOp = b.bgImgOpacity;
        aplicarFondoSeccion('.why', b.whyBgImg, b.whyBgOpacity || legacyOp, false);
        aplicarFondoSeccion('.about', b.aboutBgImg, b.aboutBgOpacity || legacyOp, false);
        aplicarFondoSeccion('.testimonials', b.testimonialsBgImg, b.testimonialsBgOpacity || legacyOp, true);
    }

    function aplicarFondoSeccion(sel, img, vis, dark) {
        var el = document.querySelector(sel);
        if (!el) return;
        if (img) {
            // vis (10-100): a mayor valor, mas visible la imagen (menos velo).
            var v = Number(vis); if (!(v >= 10 && v <= 100)) v = 35;
            var a = (0.9 - (v / 100) * 0.5).toFixed(2); // velo mas fuerte: el texto siempre se lee
            // El velo debe contrastar con el color del texto de la seccion:
            //  - texto CLARO  -> velo OSCURO
            //  - texto OSCURO -> velo CLARO
            // Testimonios siempre tiene texto claro (dark=true). Razones y Sobre
            // el bufete tienen texto oscuro en modo claro, pero texto CLARO en
            // modo oscuro: por eso, si el tema es oscuro, tambien usamos velo
            // oscuro. Asi el texto siempre se lee en ambos modos.
            var temaOscuro = document.documentElement.getAttribute('data-theme') === 'dark';
            var usarVeloOscuro = dark || temaOscuro;
            var velo = usarVeloOscuro ? ('rgba(14,27,44,' + a + ')') : ('rgba(255,255,255,' + a + ')');
            el.style.backgroundImage = 'linear-gradient(' + velo + ',' + velo + '), url("' + img + '")';
            el.style.backgroundSize = 'cover';
            el.style.backgroundPosition = 'center';
            el.classList.add('has-bg-image');
        } else {
            el.style.backgroundImage = '';
            el.style.backgroundSize = '';
            el.style.backgroundPosition = '';
            el.classList.remove('has-bg-image');
        }
    }

    // 1) Pintado rápido con la última copia local.
    try { aplicar(JSON.parse(localStorage.getItem('lexfive_branding') || '{}')); } catch (e) {}

    // Al cambiar entre modo claro y oscuro, el color del texto de las secciones
    // cambia; por eso re-aplicamos el fondo para recalcular el velo (claro/oscuro)
    // y que el texto siga siendo legible.
    window.addEventListener('lexfive:themechange', function () {
        try { aplicar(brandingActual); } catch (e) {}
    });

    // 2) Refresco desde la nube (fuente de verdad para todos los dispositivos).
    try {
        fetch(SB_URL + '/rest/v1/configuracion?clave=eq.branding&select=valor', {
            headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
        })
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (rows) {
            if (rows && rows[0] && rows[0].valor) {
                try { localStorage.setItem('lexfive_branding', JSON.stringify(rows[0].valor)); } catch (e) {}
                aplicar(rows[0].valor);
            }
        })
        .catch(function () {});
    } catch (e) {}
})();

/* ============================================================
   LexFive — Módulos Dinámicos Públicos Conectados a Supabase
   1) Branding y Contacto en vivo
   2) Áreas de Práctica (grilla responsiva con WhatsApp y formulario)
   3) Últimas publicaciones del Blog en Home
   4) Testimonios dinámicos
   5) Selección automática de áreas desde cualquier botón
   ============================================================ */
(function () {
    'use strict';

    var SB_URL = 'https://soazmibvesvuwgxeealo.supabase.co';
    var SB_KEY = 'sb_publishable_rPll8pRV30EagnHkJ68Kwg_JfoeN6vT';

    var ICON_AREA_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 21h18M5 21V9m14 12V9M9 21V9m6 12V9M2 9l10-6 10 6"/></svg>';
    var ICON_WA_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67Z"/></svg>';

    var DEFAULT_AREAS = [
        { titulo: 'Derecho Laboral', descripcion: 'Despidos, beneficios sociales, finiquitos, reincorporaciones y asesoría laboral patronal y obrera.', orden: 1 },
        { titulo: 'Derecho Civil', descripcion: 'Contratos, derecho propietario, usucapión, desalojos, recuperación de deudas y responsabilidad civil.', orden: 2 },
        { titulo: 'Derecho Penal', descripcion: 'Defensa penal técnica y estratégica, querellas, denuncias, medidas cautelares y audiencias de juicio.', orden: 3 },
        { titulo: 'Derecho de Familia', descripcion: 'Divorcios, asistencia familiar, guarda y custodia de menores, filiación y procesos sucesorios.', orden: 4 },
        { titulo: 'Derecho Informático', descripcion: 'Protección de datos personales, delitos informáticos, contratos tecnológicos y comercio electrónico.', orden: 5 },
        { titulo: 'Derecho Minero', descripcion: 'Contratos mineros, autorizaciones transitorias especiales, servidumbres y regulación sectorial.', orden: 6 },
        { titulo: 'Derecho Agrario', descripcion: 'Saneamiento y titulación de tierras (INRA), conflictos de linderos, avasallamientos y posesión agraria.', orden: 7 },
        { titulo: 'Derecho Constitucional', descripcion: 'Acciones de libertad, amparos constitucionales, acciones de cumplimiento y defensa de garantías.', orden: 8 }
    ];

    var DEFAULT_BLOG_HOME = [
        {
            id: 'despido-injustificado-bolivia',
            titulo: '¿Qué hacer ante un despido injustificado en Bolivia?',
            categoria: 'Laboral',
            fecha: '2026-05-15',
            resumen: 'Conozca los pasos a seguir, derechos irrenunciables y los plazos legales para reclamar su reincorporación o el pago inmediato de beneficios sociales.'
        },
        {
            id: 'guia-divorcio-bolivia',
            titulo: 'Guía práctica del divorcio en Bolivia: Notarial y Judicial',
            categoria: 'Familia',
            fecha: '2026-04-28',
            resumen: 'Diferencias entre el divorcio por mutuo acuerdo notarial y el contencioso judicial, fijación de asistencia familiar y liquidación de bienes gananciales.'
        },
        {
            id: 'delitos-informaticos-estafas-digitales',
            titulo: 'Delitos informáticos y protección de datos en Bolivia',
            categoria: 'Informático',
            fecha: '2026-04-10',
            resumen: 'Cómo protegerse legalmente ante estafas digitales, suplantación de identidad en redes y transacciones electrónicas según el marco legal vigente.'
        }
    ];

    function esc(s) {
        return (s == null ? '' : String(s)).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    /* ---------- 1. BRANDING Y CONTACTO DINÁMICO ---------- */
    function aplicarBranding(b) {
        if (!b) return;

        // Logo
        if (b.logoUrl) {
            document.querySelectorAll('img[data-brand-logo]').forEach(function (img) {
                img.src = b.logoUrl;
            });
            document.querySelectorAll('.logo__mark').forEach(function (m) {
                m.style.backgroundImage = 'url("' + b.logoUrl + '")';
                m.style.backgroundSize = 'contain';
                m.style.backgroundRepeat = 'no-repeat';
                m.style.backgroundPosition = 'center';
                m.textContent = '';
            });
        }

        // Teléfono
        if (b.telefono) {
            document.querySelectorAll('[data-brand-phone]').forEach(function (el) { el.textContent = b.telefono; });
            document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
                a.href = 'tel:' + b.telefono.replace(/[^0-9+]/g, '');
            });
        }

        // WhatsApp
        var waNum = b.whatsapp || b.telefono;
        if (waNum) {
            var cleanWa = waNum.replace(/[^0-9]/g, '');
            document.querySelectorAll('[data-brand-whatsapp]').forEach(function (el) {
                if (el.tagName === 'A') el.href = 'https://wa.me/' + cleanWa;
            });
            document.querySelectorAll('a[href*="wa.me"]').forEach(function (a) {
                try {
                    var u = new URL(a.href);
                    var t = u.searchParams.get('text');
                    a.href = 'https://wa.me/' + cleanWa + (t ? '?text=' + encodeURIComponent(t) : '');
                } catch (e) {
                    a.href = 'https://wa.me/' + cleanWa;
                }
            });
        }

        // Dirección
        if (b.direccion) {
            document.querySelectorAll('[data-brand-address]').forEach(function (el) { el.textContent = b.direccion; });
        }

        // Horario
        if (b.horario) {
            document.querySelectorAll('[data-brand-schedule]').forEach(function (el) { el.textContent = b.horario; });
        }

        // Email
        if (b.email) {
            document.querySelectorAll('[data-brand-email]').forEach(function (el) { el.textContent = b.email; });
            document.querySelectorAll('a[href^="mailto:"]').forEach(function (a) { a.href = 'mailto:' + b.email; });
        }
    }

    /* ---------- 2. ÁREAS DE PRÁCTICA DINÁMICAS ---------- */
    function renderAreas(areas) {
        var grid = document.getElementById('areasGrid');
        if (!grid) return;

        var list = (areas && areas.length) ? areas : DEFAULT_AREAS;
        var waPhone = '59178360469';
        try {
            var b = JSON.parse(localStorage.getItem('lexfive_branding') || '{}');
            if (b.whatsapp) waPhone = b.whatsapp.replace(/[^0-9]/g, '');
            else if (b.telefono) waPhone = b.telefono.replace(/[^0-9]/g, '');
        } catch (e) {}

        grid.innerHTML = list.map(function (a) {
            var mediaHtml = '';
            if (a.imagen_url) {
                mediaHtml = '<div class="area-card__media"><img src="' + esc(a.imagen_url) + '" alt="' + esc(a.titulo) + '" loading="lazy" onerror="this.parentElement.remove()"></div>';
            } else {
                mediaHtml = '<div class="area-card__icon-box">' + ICON_AREA_SVG + '</div>';
            }
            var waUrl = 'https://wa.me/' + waPhone + '?text=' + encodeURIComponent('Hola LexFive, deseo consultar sobre ' + a.titulo);
            return '<article class="area-card" data-area="' + esc(a.titulo) + '">' +
                '<div>' + mediaHtml +
                '<h3 class="area-card__title">' + esc(a.titulo) + '</h3>' +
                '<p class="area-card__text">' + esc(a.descripcion || '') + '</p>' +
                '</div>' +
                '<div class="area-card__actions">' +
                    '<a href="' + waUrl + '" target="_blank" rel="noopener" class="btn-area-action btn-area-wa" title="Consultar por WhatsApp">' +
                        ICON_WA_SVG + ' WhatsApp' +
                    '</a>' +
                    '<a href="#contacto" class="btn-area-action btn-area-form" data-select-area="' + esc(a.titulo) + '" title="Solicitar consulta en el formulario">' +
                        'Consulta &darr;' +
                    '</a>' +
                '</div>' +
            '</article>';
        }).join('');

        // Sincronizar select #area en el formulario de contacto
        var selectEl = document.getElementById('area');
        if (selectEl) {
            list.forEach(function (a) {
                var exists = Array.from(selectEl.options).some(function (opt) {
                    return opt.value.toLowerCase() === a.titulo.toLowerCase() || opt.text.toLowerCase() === a.titulo.toLowerCase();
                });
                if (!exists) {
                    var opt = document.createElement('option');
                    opt.value = a.titulo;
                    opt.textContent = a.titulo;
                    selectEl.appendChild(opt);
                }
            });
        }
    }

    /* ---------- 3. ÚLTIMAS PUBLICACIONES DEL BLOG (HOME) ---------- */
    function renderHomeBlog(arts) {
        var grid = document.getElementById('homeBlogGrid');
        if (!grid) return;

        var list = (arts && arts.length) ? arts : DEFAULT_BLOG_HOME;
        grid.innerHTML = list.map(function (a) {
            var fechaStr = '';
            try {
                var d = new Date(a.fecha || a.created_at);
                fechaStr = d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
            } catch (e) { fechaStr = a.fecha || ''; }
            var link = 'blog.html?id=' + encodeURIComponent(a.id);
            return '<article class="post-card" onclick="window.location.href='' + link + ''">' +
                '<div class="post-card__media"></div>' +
                '<div class="post-card__body">' +
                    '<div class="post-card__meta">' +
                        '<span class="tag">' + esc(a.categoria || 'General') + '</span>' +
                        '<span class="post-card__date">' + esc(fechaStr) + '</span>' +
                    '</div>' +
                    '<h3 class="post-card__title" style="font-size:1.22rem; margin-bottom:10px;">' + esc(a.titulo) + '</h3>' +
                    '<p class="post-card__excerpt">' + esc(a.resumen || a.contenido || '') + '</p>' +
                    '<div style="margin-top:auto; padding-top:14px;">' +
                        '<a href="' + link + '" class="post-card__link" style="font-weight:600; color:var(--gold); display:inline-flex; align-items:center; gap:6px;">' +
                            'Leer artículo completo &rarr;' +
                        '</a>' +
                    '</div>' +
                '</div>' +
            '</article>';
        }).join('');
    }

    /* ---------- 4. TESTIMONIOS DINÁMICOS ---------- */
    function renderTestimonios(testis) {
        var grid = document.getElementById('testimoniosGrid') || document.querySelector('.testimonials__grid');
        if (!grid || !testis || !testis.length) return;

        grid.innerHTML = testis.map(function (t) {
            var starsCount = Math.max(1, Math.min(5, Number(t.calificacion) || 5));
            var stars = '★'.repeat(starsCount) + '☆'.repeat(5 - starsCount);
            return '<article class="testi-card" style="background:#041230; padding:2rem; border-radius:12px; border:1px solid rgba(212,175,55,0.2);">' +
                '<div class="testi-card__stars" style="color:#d4af37; font-size:1.2rem; margin-bottom:1rem; text-align:center;">' + stars + '</div>' +
                '<p style="color:#f8fafc; font-style:italic; font-size:0.95rem; line-height:1.6; margin-bottom:1.5rem; text-align:center;">"' + esc(t.texto) + '"</p>' +
                '<div class="testi-card__author" style="text-align:center;">' +
                    '<strong style="color:#d4af37; display:block;">' + esc(t.nombre || 'Cliente') + '</strong>' +
                    '<span style="color:#38bdf8; font-size:0.8rem;">' + esc(t.detalle || 'Cliente verificado') + '</span>' +
                '</div>' +
            '</article>';
        }).join('');
    }

    /* ---------- 5. ACCIÓN AL PULSAR CONSULTAR POR ÁREA ---------- */
    document.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-select-area]');
        if (!btn) return;
        var areaName = btn.getAttribute('data-select-area');
        var selectEl = document.getElementById('area');
        if (selectEl && areaName) {
            var opt = Array.from(selectEl.options).find(function (o) {
                return o.value.toLowerCase() === areaName.toLowerCase() || o.text.toLowerCase() === areaName.toLowerCase();
            });
            if (opt) {
                selectEl.value = opt.value;
            } else {
                var newOpt = document.createElement('option');
                newOpt.value = areaName;
                newOpt.textContent = areaName;
                selectEl.appendChild(newOpt);
                selectEl.value = areaName;
            }
        }
        var contactSec = document.getElementById('contacto');
        if (contactSec) {
            e.preventDefault();
            contactSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setTimeout(function () {
                var msg = document.getElementById('mensaje');
                if (msg) msg.focus();
            }, 450);
        }
    });

    /* ---------- INICIALIZACIÓN Y CACHÉ LOCAL ---------- */
    function initDynamicFrontend() {
        // 1. Carga inmediata con copias en caché
        try {
            var cachedBranding = JSON.parse(localStorage.getItem('lexfive_branding') || '{}');
            aplicarBranding(cachedBranding);
            var cachedAreas = JSON.parse(localStorage.getItem('lexfive_areas') || '[]');
            renderAreas(cachedAreas);
            var cachedBlog = JSON.parse(localStorage.getItem('lexfive_recent_blog') || '[]');
            renderHomeBlog(cachedBlog);
        } catch (e) {}

        // 2. Sincronización en vivo desde Supabase REST
        // Branding
        fetch(SB_URL + '/rest/v1/configuracion?clave=eq.branding&select=valor', {
            headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
        })
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (rows) {
            if (rows && rows[0] && rows[0].valor) {
                var b = rows[0].valor;
                try { localStorage.setItem('lexfive_branding', JSON.stringify(b)); } catch (e) {}
                aplicarBranding(b);
            }
        }).catch(function () {});

        // Áreas de práctica
        fetch(SB_URL + '/rest/v1/areas_practica?select=id,titulo,descripcion,imagen_url,orden&activo=eq.true&order=orden.asc', {
            headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
        })
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (rows) {
            if (rows && rows.length) {
                try { localStorage.setItem('lexfive_areas', JSON.stringify(rows)); } catch (e) {}
                renderAreas(rows);
            } else {
                renderAreas(DEFAULT_AREAS);
            }
        }).catch(function () { renderAreas(DEFAULT_AREAS); });

        // Últimos 3 artículos del Blog
        if (document.getElementById('homeBlogGrid')) {
            fetch(SB_URL + '/rest/v1/articulos?select=id,titulo,resumen,categoria,fecha,created_at&estado=eq.publicado&order=fecha.desc,created_at.desc&limit=3', {
                headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
            })
            .then(function (r) { return r.ok ? r.json() : []; })
            .then(function (rows) {
                if (rows && rows.length) {
                    try { localStorage.setItem('lexfive_recent_blog', JSON.stringify(rows)); } catch (e) {}
                    renderHomeBlog(rows);
                } else {
                    renderHomeBlog(DEFAULT_BLOG_HOME);
                }
            }).catch(function () { renderHomeBlog(DEFAULT_BLOG_HOME); });
        }

        // Testimonios aprobados
        if (document.getElementById('testimoniosGrid') || document.querySelector('.testimonials__grid')) {
            fetch(SB_URL + '/rest/v1/testimonios?select=id,nombre,detalle,texto,calificacion&estado=eq.aprobado&order=created_at.desc', {
                headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
            })
            .then(function (r) { return r.ok ? r.json() : []; })
            .then(function (rows) {
                if (rows && rows.length) {
                    renderTestimonios(rows);
                }
            }).catch(function () {});
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDynamicFrontend);
    } else {
        initDynamicFrontend();
    }
})();
