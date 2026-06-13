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

        /* ---------- Menú móvil ---------- */
        var navToggle = document.getElementById('navToggle');
        var nav = document.getElementById('nav');

        function closeMenu() {
            if (!nav || !navToggle) return;
            nav.classList.remove('is-open');
            navToggle.classList.remove('is-open');
            navToggle.setAttribute('aria-expanded', 'false');
            navToggle.setAttribute('aria-label', 'Abrir menú');
            document.body.style.overflow = '';
        }

        if (navToggle && nav) {
            navToggle.addEventListener('click', function () {
                var isOpen = nav.classList.toggle('is-open');
                navToggle.classList.toggle('is-open', isOpen);
                navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
                navToggle.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
                document.body.style.overflow = isOpen ? 'hidden' : '';
            });

            // Cerrar al hacer clic en un enlace
            nav.querySelectorAll('.nav__link').forEach(function (link) {
                link.addEventListener('click', closeMenu);
            });

            // Cerrar con la tecla Escape
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') { closeMenu(); }
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
            '.area-card, .member, .testimonial, .stat, .about__content, .about__media, .contact__info, .contact__form, .section__head'
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

                /* 1) Almacenamiento principal: la bandeja "Consultas" del panel (Supabase). */
                var saveConsulta = (window.LexFive && typeof window.LexFive.guardarConsulta === 'function')
                    ? Promise.resolve(window.LexFive.guardarConsulta(consulta))
                    : Promise.resolve({ skipped: true });

                /* 2) Aviso por correo con Web3Forms (si la clave está configurada). */
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

                saveConsulta
                    .then(function (res) {
                        var savedOk = !!(res && !res.error && !res.skipped);
                        var saveSkipped = !!(res && res.skipped);
                        return enviarCorreo().then(function (mail) {
                            var mailOk = !!(mail && mail.success);
                            var mailSkipped = !!(mail && mail.skipped);
                            // Éxito si se guardó en el panel, si se envió el correo,
                            // o si no hay backend disponible (modo demostración).
                            if (savedOk || mailOk || (saveSkipped && mailSkipped)) { showSuccess(); }
                            else { showFail(); }
                        });
                    })
                    .catch(function () { showFail(); });
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
