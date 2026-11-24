/* ============================================================
   LexFive — Blog Público (Buscador, Categorías, Detalle y Compartir)
   Sincronizado en tiempo real con Supabase (articulos publicados).
   ============================================================ */
(function () {
    'use strict';

    var SB_URL = 'https://soazmibvesvuwgxeealo.supabase.co';
    var SB_KEY = 'sb_publishable_rPll8pRV30EagnHkJ68Kwg_JfoeN6vT';

    var DEFAULT_ARTICLES = [
        {
            id: 'despido-injustificado-bolivia',
            titulo: '¿Qué hacer ante un despido injustificado en Bolivia?',
            categoria: 'Laboral',
            fecha: '2026-05-15',
            autor: 'Abg. Carlos Cartagena',
            resumen: 'Conozca los pasos a seguir, sus derechos irrenunciables y los plazos legales para reclamar reincorporación o el pago de beneficios sociales ante la Jefatura del Trabajo.',
            contenido: 'El despido injustificado o intempestivo es una de las vulneraciones más frecuentes a los derechos laborales en Bolivia. La Constitución Política del Estado garantiza la estabilidad laboral y prohíbe el despido sin causa legal debidamente comprobada.\n\n' +
                '1. ¿Cuáles son las causales legales de despido?\n' +
                'El artículo 16 de la Ley General del Trabajo y el artículo 9 de su Decreto Reglamentario establecen taxativamente las causales de despido justificado (perjuicio material intencional, revelación de secretos industriales, inasistencias injustificadas por más de 6 días continuos, entre otras). Cualquier desvinculación fuera de estas causales se considera despido intempestivo o forzoso.\n\n' +
                '2. Opciones legales del trabajador\n' +
                'Frente a un despido injustificado, el trabajador cuenta con dos opciones excluyentes:\n' +
                'a) Demandar la REINCORPORACIÓN laboral con pago de sueldos devengados, manteniendo su antigüedad y todos sus derechos adquiridos.\n' +
                'b) Optar por el COBRO DE BENEFICIOS SOCIALES, que incluye desahucio (3 sueldos), indemnización por tiempo de servicios (un sueldo por año trabajado), aguinaldo proporcional, vacaciones no gozadas y primas legales.\n\n' +
                '3. Plazos para interponer la denuncia\n' +
                'Si el trabajador solicita la reincorporación, debe acudir dentro de los 30 días hábiles ante la Jefatura Departamental o Regional del Trabajo correspondiente.\n\n' +
                'Si usted o un familiar atraviesa esta situación, en LexFive le brindamos patrocinio legal integral y estratégico para hacer valer sus derechos.'
        },
        {
            id: 'guia-divorcio-bolivia',
            titulo: 'Guía práctica del divorcio en Bolivia: Notarial y Judicial',
            categoria: 'Familia',
            fecha: '2026-04-28',
            autor: 'Abg. Jose Corwin',
            resumen: 'Diferencias entre el divorcio por mutuo acuerdo en Notaría de Fe Pública y el contencioso ante juzgado familiar. Requisitos, asistencia familiar y división de bienes.',
            contenido: 'La Ley N° 603 (Código de las Familias y del Proceso Familiar) simplificó sustancialmente el trámite de desvinculación conyugal en Bolivia, consagrando el principio de que el matrimonio se disuelve por la sola voluntad de uno o ambos cónyuges, sin necesidad de demostrar culpabilidad ni causales infamantes.\n\n' +
                '1. Divorcio Notarial (Vía voluntaria y rápida)\n' +
                'Procede ante un Notario de Fe Pública y toma aproximadamente entre 30 y 90 días. Requisitos indispensables:\n' +
                '- Mutuo acuerdo de ambos cónyuges expresado libremente.\n' +
                '- No tener hijos menores de edad o dependientes comunes.\n' +
                '- No tener bienes gananciales sujetos a registro o haber suscrito acuerdo regulador con división de bienes previa.\n\n' +
                '2. Divorcio Judicial\n' +
                'Cuando existen hijos menores de edad, bienes sujetos a registro o controversia entre las partes, el trámite debe promoverse ante un Juez Público de Familia.\n' +
                'En este proceso se regulan tres aspectos fundamentales:\n' +
                '- Asistencia familiar (mínimo legal del 20% del salario mínimo nacional por beneficiario).\n' +
                '- Guarda y régimen de visitas de los hijos menores.\n' +
                '- Liquidación y división de la comunidad de gananciales (50% para cada cónyuge).\n\n' +
                'En LexFive gestionamos ambos procedimientos con celeridad, empatía y absoluta reserva profesional.'
        },
        {
            id: 'delitos-informaticos-estafas-digitales',
            titulo: 'Delitos informáticos y protección de datos en Bolivia',
            categoria: 'Informático',
            fecha: '2026-04-10',
            autor: 'Abg. Jose Antonio',
            resumen: 'Marco legal frente a estafas por WhatsApp, QR, suplantación de identidad y hackeo de cuentas bancarias según el Código Penal boliviano.',
            contenido: 'El incremento del comercio digital y las transacciones mediante código QR ha disparado los ciberdelitos en Bolivia. Nuestra legislación penal contempla figuras específicas para sancionar estas conductas ilegales.\n\n' +
                '1. Tipificación en el Código Penal\n' +
                '- Manipulación informática (Art. 363 bis): alterar o interceptar sistemas informáticos para obtener un beneficio indebido.\n' +
                '- Alteración y daño a datos informáticos (Art. 363 ter): borrado, daño o deterioro de sistemas y bases de datos.\n' +
                '- Estafa agravada con medios electrónicos (Art. 335 y concordantes).\n\n' +
                '2. ¿Qué hacer si fue víctima de una estafa virtual?\n' +
                '- Preservar la evidencia digital de inmediato: capturas de pantalla certificadas, comprobantes de transferencia bancaria, números de teléfono y registros de chat.\n' +
                '- No eliminar las conversaciones ni formatear el dispositivo.\n' +
                '- Presentar la denuncia formal ante la División Cibercrimen de la FELCC y requerir congelamiento preventivo de cuentas destino mediante requerimiento fiscal.\n\n' +
                'En LexFive unimos la ciencia jurídica con la ingeniería de sistemas forense para rastrear evidencia digital y lograr la sanción de los responsables.'
        },
        {
            id: 'usucapion-derecho-propietario-inmuebles',
            titulo: 'Usucapión: Regularización del derecho propietario sobre inmuebles',
            categoria: 'Civil',
            fecha: '2026-03-22',
            autor: 'Abg. Douglas Yamil',
            resumen: 'Requisitos y diferencias entre la usucapión quinquenal (ordinaria) y decenal (extraordinaria) para obtener título de propiedad con registro en Derechos Reales.',
            contenido: 'La usucapión o prescripción adquisitiva es el modo de adquirir la propiedad de un bien inmueble mediante la posesión continua, pacífica y pública durante el tiempo determinado por ley.\n\n' +
                '1. Tipos de Usucapión según el Código Civil\n' +
                '- Usucapión Quinquenal u Ordinaria (Art. 134): Requiere 5 años de posesión, justo título y buena fe.\n' +
                '- Usucapión Decenal o Extraordinaria (Art. 138): Requiere 10 años de posesión ininterrumpida. No exige justo título ni buena fe, pero sí posesión a título de dueño (animus domini).\n\n' +
                '2. Pruebas indispensables en el proceso judicial\n' +
                '- Testificales de vecinos colindantes que acrediten la antigüedad de la posesión.\n' +
                '- Facturas o comprobantes de pago de servicios básicos (agua, luz, gas) a nombre del poseedor.\n' +
                '- Pago de impuestos municipales de la propiedad inmueble.\n' +
                '- Plano topográfico georreferenciado visado por el Gobierno Autónomo Municipal.\n' +
                '- Inspección judicial y peritaje técnico sobre mejoras construidas.\n\n' +
                'La sentencia judicial ejecutoriada constituye título auténtico de propiedad con validez para su matriculación definitiva en Derechos Reales.'
        },
        {
            id: 'accion-de-libertad-defensa-constitucional',
            titulo: 'La Acción de Libertad: Mecanismo urgente de defensa constitucional',
            categoria: 'Constitucional',
            fecha: '2026-03-05',
            autor: 'Abg. Henry Iván',
            resumen: 'Alcances y procedencia de la Acción de Libertad (antiguo Hábeas Corpus) ante aprehensiones ilegales, dilaciones indebidas y vulneración del derecho a la vida.',
            contenido: 'Consagrada en el artículo 125 de la Constitución Política del Estado, la Acción de Libertad es la garantía jurisdiccional de tutela más ágil del ordenamiento jurídico boliviano.\n\n' +
                '1. ¿Cuándo procede?\n' +
                'Cualquier persona que considere que su vida está en peligro, que está ilegalmente perseguida, indebidamente procesada o privada de libertad, puede interponer esta acción de manera oral o escrita, a cualquier hora, sin necesidad de poder notariado ni de patrocinio legal obligatorio.\n\n' +
                '2. Celeridad del procedimiento\n' +
                'El juez constitucional debe señalar audiencia dentro de las 24 horas siguientes a la admisión de la acción y dictar sentencia en el mismo acto, disponiendo la inmediata restitución de la libertad o el cese de la persecución ilegal.\n\n' +
                'Nuestro bufete cuenta con guardia permanente para la interposición y patrocinio de acciones tutelares constitucionales con máxima efectividad procesal.'
        },
        {
            id: 'derecho-minero-contratos-ajam',
            titulo: 'Contratos administrativos mineros y adecuación ante la AJAM',
            categoria: 'Minero',
            fecha: '2026-02-18',
            autor: 'Abg. Carlos Cartagena',
            resumen: 'Guía legal sobre la Ley N° 535 de Minería y Metalurgia, derechos de cooperativas mineras, empresas unipersonales y fiscalización ambiental.',
            contenido: 'La Ley N° 535 de Minería y Metalurgia transformó las antiguas concesiones mineras en Derechos Mineros preconstituidos que requieren formalización mediante Contratos Administrativos Mineros (CAM) suscritos con la Autoridad Jurisdiccional Administrativa Minera (AJAM).\n\n' +
                '1. Puntos clave de la regulación minera en Bolivia\n' +
                '- Consulta previa libre e informada con las comunidades indígenas y campesinas del área de influencia.\n' +
                '- Plan de Trabajo e Inversiones (PTI) debidamente aprobado.\n' +
                '- Licencia ambiental y plan de manejo de pasivos y colas mineras.\n' +
                '- Pago regular de la patente minera anual para evitar la caducidad del derecho.\n\n' +
                'Asesoramos a cooperativas, asociaciones y empresas mineras en toda la tramitación técnica y legal ante las direcciones regionales y nacional de la AJAM.'
        }
    ];

    var allArticles = [];
    var activeCategory = 'all';
    var searchQuery = '';

    function esc(s) {
        return (s == null ? '' : String(s)).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function fmtDate(d) {
        try {
            var date = new Date(d);
            return date.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch (e) {
            return d || '';
        }
    }

    function calcReadTime(text) {
        if (!text) return '3 min';
        var words = text.trim().split(/\s+/).length;
        var mins = Math.max(2, Math.round(words / 175));
        return mins + ' min de lectura';
    }

    function renderCategoryButtons(categories) {
        var container = document.getElementById('blogCategories');
        if (!container) return;
        var cats = ['all'].concat(categories.filter(function (c) { return c && c !== 'all'; }));
        container.innerHTML = cats.map(function (cat) {
            var label = (cat === 'all') ? 'Todas las materias' : cat;
            var isAct = (cat === activeCategory) ? ' is-active' : '';
            return '<button type="button" class="blog-cat-btn' + isAct + '" data-cat="' + esc(cat) + '">' + esc(label) + '</button>';
        }).join('');

        container.querySelectorAll('.blog-cat-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                activeCategory = btn.getAttribute('data-cat') || 'all';
                container.querySelectorAll('.blog-cat-btn').forEach(function (b) { b.classList.remove('is-active'); });
                btn.classList.add('is-active');
                filterAndRender();
            });
        });
    }

    function renderArticlesGrid(items) {
        var grid = document.getElementById('blogGrid');
        var empty = document.getElementById('blogEmpty');
        if (!grid) return;

        if (!items || !items.length) {
            grid.innerHTML = '';
            if (empty) empty.style.display = 'block';
            return;
        }

        if (empty) empty.style.display = 'none';
        grid.innerHTML = items.map(function (a) {
            var cat = a.categoria || 'General';
            var fecha = fmtDate(a.fecha || a.created_at);
            return '<article class="post-card" data-id="' + esc(a.id) + '">' +
                '<div class="post-card__media"></div>' +
                '<div class="post-card__body">' +
                    '<div class="post-card__meta">' +
                        '<span class="tag">' + esc(cat) + '</span>' +
                        '<span class="post-card__date">' + esc(fecha) + '</span>' +
                    '</div>' +
                    '<h2 class="post-card__title" style="font-size:1.25rem; margin-bottom:10px;">' + esc(a.titulo) + '</h2>' +
                    '<p class="post-card__excerpt">' + esc(a.resumen || a.contenido || '') + '</p>' +
                    '<div style="margin-top:auto; padding-top:16px;">' +
                        '<span class="post-card__link" style="color:var(--gold); font-weight:600; display:inline-flex; align-items:center; gap:6px;">' +
                            'Leer artículo completo &rarr;' +
                        '</span>' +
                    '</div>' +
                '</div>' +
            '</article>';
        }).join('');

        grid.querySelectorAll('.post-card').forEach(function (card) {
            card.addEventListener('click', function () {
                var id = card.getAttribute('data-id');
                var found = allArticles.find(function (x) { return String(x.id) === String(id); });
                if (found) {
                    showArticleDetail(found, true);
                }
            });
        });
    }

    function filterAndRender() {
        var q = searchQuery.toLowerCase().trim();
        var filtered = allArticles.filter(function (a) {
            var matchCat = (activeCategory === 'all') || (a.categoria && a.categoria.toLowerCase() === activeCategory.toLowerCase());
            if (!matchCat) return false;
            if (!q) return true;
            var inTit = (a.titulo || '').toLowerCase().indexOf(q) !== -1;
            var inRes = (a.resumen || '').toLowerCase().indexOf(q) !== -1;
            var inCont = (a.contenido || '').toLowerCase().indexOf(q) !== -1;
            var inCat = (a.categoria || '').toLowerCase().indexOf(q) !== -1;
            return inTit || inRes || inCont || inCat;
        });
        renderArticlesGrid(filtered);
    }

    function showArticleDetail(a, pushHistory) {
        var controls = document.getElementById('blogControls');
        var listView = document.getElementById('blogListView');
        var detailView = document.getElementById('blogDetailView');
        if (!detailView) return;

        if (controls) controls.style.display = 'none';
        if (listView) listView.style.display = 'none';
        detailView.style.display = 'block';

        var titleEl = document.getElementById('detailTitle');
        var catEl = document.getElementById('detailCategory');
        var dateEl = document.getElementById('detailDate');
        var authorEl = document.getElementById('detailAuthor');
        var readEl = document.getElementById('detailReadTime');
        var contentEl = document.getElementById('detailContent');

        if (titleEl) titleEl.textContent = a.titulo;
        if (catEl) catEl.textContent = a.categoria || 'General';
        if (dateEl) dateEl.textContent = fmtDate(a.fecha || a.created_at);
        if (authorEl) authorEl.textContent = a.autor || 'Equipo Legal LexFive';
        if (readEl) readEl.textContent = calcReadTime(a.contenido || a.resumen);

        if (contentEl) {
            var text = a.contenido || a.resumen || '';
            // Formatear párrafos
            var pars = text.split(/\n\n+/).filter(Boolean);
            if (pars.length > 1) {
                contentEl.innerHTML = pars.map(function (p) {
                    return '<p style="margin-bottom:1.4em;">' + esc(p).replace(/\n/g, '<br>') + '</p>';
                }).join('');
            } else {
                contentEl.textContent = text;
            }
        }

        // WhatsApp Share
        var shareUrl = window.location.origin + window.location.pathname + '?id=' + encodeURIComponent(a.id);
        var waMsg = a.titulo + '\n\n' + shareUrl;
        var btnWa = document.getElementById('btnShareWa');
        if (btnWa) {
            btnWa.href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(waMsg);
        }

        // Copy Link
        var btnCopy = document.getElementById('btnShareCopy');
        if (btnCopy) {
            btnCopy.onclick = function () {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(shareUrl).then(function () {
                        btnCopy.textContent = '✓ ¡Enlace copiado!';
                        setTimeout(function () {
                            btnCopy.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copiar enlace';
                        }, 2200);
                    });
                } else {
                    prompt('Copie el siguiente enlace:', shareUrl);
                }
            };
        }

        // Consult Topic Button
        var btnConsult = document.getElementById('btnConsultTopic');
        if (btnConsult) {
            btnConsult.href = 'index.html#contacto?area=' + encodeURIComponent(a.categoria || '');
        }

        if (pushHistory) {
            try {
                window.history.pushState({ articleId: a.id }, '', '?id=' + encodeURIComponent(a.id));
            } catch (e) {}
        }

        // Scroll suave al inicio del artículo
        var sec = document.getElementById('blogSection');
        if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function showArticleList(pushHistory) {
        var controls = document.getElementById('blogControls');
        var listView = document.getElementById('blogListView');
        var detailView = document.getElementById('blogDetailView');

        if (controls) controls.style.display = 'flex';
        if (listView) listView.style.display = 'block';
        if (detailView) detailView.style.display = 'none';

        if (pushHistory) {
            try {
                window.history.pushState(null, '', 'blog.html');
            } catch (e) {}
        }
    }

    function initBlog() {
        // Evento volver al listado
        var btnBack = document.getElementById('btnBackToBlog');
        if (btnBack) {
            btnBack.addEventListener('click', function () {
                showArticleList(true);
            });
        }

        // Evento restablecer filtros
        var btnReset = document.getElementById('btnResetFilters');
        if (btnReset) {
            btnReset.addEventListener('click', function () {
                searchQuery = '';
                activeCategory = 'all';
                var searchInput = document.getElementById('blogSearch');
                if (searchInput) searchInput.value = '';
                var catBtns = document.querySelectorAll('.blog-cat-btn');
                catBtns.forEach(function (b) {
                    if (b.getAttribute('data-cat') === 'all') b.classList.add('is-active');
                    else b.classList.remove('is-active');
                });
                filterAndRender();
            });
        }

        // Buscador
        var searchInput = document.getElementById('blogSearch');
        if (searchInput) {
            searchInput.addEventListener('input', function () {
                searchQuery = searchInput.value;
                filterAndRender();
            });
        }

        // Manejo de historial (atrás / adelante del navegador)
        window.addEventListener('popstate', function (e) {
            var params = new URLSearchParams(window.location.search);
            var id = params.get('id');
            if (id) {
                var found = allArticles.find(function (x) { return String(x.id) === String(id); });
                if (found) showArticleDetail(found, false);
                else showArticleList(false);
            } else {
                showArticleList(false);
            }
        });

        // 1. Cargar desde Supabase REST
        var fetchArticles = fetch(SB_URL + '/rest/v1/articulos?select=*&estado=eq.publicado&order=fecha.desc,created_at.desc', {
            headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
        })
        .then(function (r) { return r.ok ? r.json() : []; })
        .catch(function () { return []; });

        var fetchAreas = fetch(SB_URL + '/rest/v1/areas_practica?select=titulo&activo=eq.true&order=orden.asc', {
            headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
        })
        .then(function (r) { return r.ok ? r.json() : []; })
        .catch(function () { return []; });

        Promise.all([fetchArticles, fetchAreas]).then(function (results) {
            var dbArticles = results[0] || [];
            var dbAreas = results[1] || [];

            // Si hay artículos publicados en Supabase, los usamos como prioritarios
            if (dbArticles.length > 0) {
                allArticles = dbArticles;
            } else {
                // Si la tabla aún no tiene publicaciones, se cargan los artículos modelo
                allArticles = DEFAULT_ARTICLES;
            }

            // Construir lista única de categorías
            var catsSet = {};
            allArticles.forEach(function (a) { if (a.categoria) catsSet[a.categoria] = true; });
            dbAreas.forEach(function (ar) { if (ar.titulo) catsSet[ar.titulo.replace(/^Derecho\s+/i, '')] = true; });
            var categories = Object.keys(catsSet).sort();

            renderCategoryButtons(categories);
            filterAndRender();

            // Comprobar si se abrió directamente un artículo (?id=...)
            var params = new URLSearchParams(window.location.search);
            var reqId = params.get('id');
            if (reqId) {
                var target = allArticles.find(function (x) { return String(x.id) === String(reqId); });
                if (target) {
                    showArticleDetail(target, false);
                }
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBlog);
    } else {
        initBlog();
    }
})();
