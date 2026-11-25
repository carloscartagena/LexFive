/* ============================================================
   LexFive — Página de Detalle de Especialidad Jurídica (area.html)
   Carga en vivo desde Supabase (areas_practica), desglosa servicios,
   pasos de trabajo, acordeón de FAQs y artículos de blog relacionados.
   ============================================================ */
(function () {
    'use strict';

    var SB_URL = 'https://soazmibvesvuwgxeealo.supabase.co';
    var SB_KEY = 'sb_publishable_rPll8pRV30EagnHkJ68Kwg_JfoeN6vT';

    var DEFAULT_AREAS = [
        {
            id: 'laboral',
            slug: 'derecho-laboral',
            titulo: 'Derecho Laboral',
            descripcion: 'Despidos, beneficios sociales, finiquitos, reincorporaciones y asesoría laboral patronal y obrera en Bolivia.',
            detalle_json: {
                subtitulo: 'Defensa estratégica de los derechos del trabajador y cumplimiento normativo para empresas en Bolivia.',
                servicios: [
                    { titulo: 'Reincorporación Laboral', descripcion: 'Acciones de restitución inmediata ante la Jefatura Departamental de Trabajo y amparos constitucionales.' },
                    { titulo: 'Cálculo y Cobro de Beneficios Sociales', descripcion: 'Desahucio, indemnización por antigüedad, aguinaldos y primas no pagadas.' },
                    { titulo: 'Defensa Patronal y Auditorías', descripcion: 'Elaboración de contratos, reglamentos internos y prevención de contingencias sancionatorias.' },
                    { titulo: 'Conciliación y Juicios Laborales', descripcion: 'Patrocinio contencioso ante los Juzgados de Trabajo y Seguridad Social.' }
                ],
                pasos: [
                    { paso: '1', titulo: 'Diagnóstico Legal Inmediato', descripcion: 'Análisis detallado de finiquitos, contratos y antecedentes para verificar la vulneración de derechos.' },
                    { paso: '2', titulo: 'Estrategia y Liquidación Técnica', descripcion: 'Cálculo exacto conforme a la Ley General del Trabajo y propuesta de solución oportuna.' },
                    { paso: '3', titulo: 'Patrocinio y Seguimiento en Línea', descripcion: 'Representación activa en vía administrativa o judicial con reportes continuos.' }
                ],
                faqs: [
                    { pregunta: '¿Qué plazo tengo para demandar mi reincorporación laboral?', respuesta: 'Debe interponer su denuncia ante la Jefatura del Trabajo dentro de los 30 días hábiles posteriores al despido injustificado.' },
                    { pregunta: '¿Qué incluye la liquidación de beneficios sociales en Bolivia?', respuesta: 'Comprende el desahucio (si hubo despido intempestivo), indemnización por años de servicio, vacaciones proporcionales y aguinaldo adeudado.' },
                    { pregunta: '¿Puedo conciliar antes de iniciar un juicio laboral?', respuesta: 'Sí, la vía administrativa en el Ministerio de Trabajo promueve audiencias de conciliación previas y obligatorias.' }
                ]
            }
        },
        {
            id: 'civil',
            slug: 'derecho-civil',
            titulo: 'Derecho Civil',
            descripcion: 'Contratos, derecho propietario, usucapión, desalojos, recuperación de deudas y responsabilidad civil.',
            detalle_json: {
                subtitulo: 'Protección patrimonial rigurosa y resolución efectiva de controversias contractuales e inmobiliarias.',
                servicios: [
                    { titulo: 'Procesos de Usucapión y Regularización', descripcion: 'Titulación judicial de inmuebles y registro definitivo en Derechos Reales.' },
                    { titulo: 'Redacción y Resolución de Contratos', descripcion: 'Compraventa, arras, arrendamiento, anticréticos y garantías hipotecarias.' },
                    { titulo: 'Cobro de Deudas y Ejecución Coactiva', descripcion: 'Recuperación judicial ágil de capitales con embargos preventivos.' },
                    { titulo: 'Desalojos y Reivindicación', descripcion: 'Restitución de posesión legítima frente a avasallamientos o incumplimientos.' }
                ],
                pasos: [
                    { paso: '1', titulo: 'Estudio de Títulos y Antecedentes', descripcion: 'Auditoría documental exhaustiva en Derechos Reales, catastro y juzgados.' },
                    { paso: '2', titulo: 'Medidas Cautelares y Demanda', descripcion: 'Aseguramiento preventivo de bienes para garantizar la efectividad del fallo.' },
                    { paso: '3', titulo: 'Patrocinio en Audiencias y Sentencia', descripcion: 'Acompañamiento procesal continuo hasta la inscripción registral final.' }
                ],
                faqs: [
                    { pregunta: '¿Cuál es la diferencia entre usucapión quinquenal y decenal?', respuesta: 'La quinquenal exige 5 años, justo título y buena fe; la decenal exige 10 años de posesión continua y pública sin requerir justo título.' },
                    { pregunta: '¿Cómo garantizar un contrato de anticrético seguro?', respuesta: 'Debe elevarse a Escritura Pública e inscribirse necesariamente como gravamen en Derechos Reales.' },
                    { pregunta: '¿Qué hacer si un inquilino no paga y no desocupa el inmueble?', respuesta: 'Se debe promover el proceso de desalojo civil con intimación previa conforme al Código Procesal Civil.' }
                ]
            }
        },
        {
            id: 'penal',
            slug: 'derecho-penal',
            titulo: 'Derecho Penal',
            descripcion: 'Defensa penal técnica y estratégica, querellas, denuncias, medidas cautelares y audiencias de juicio.',
            detalle_json: {
                subtitulo: 'Defensa penal intransigente de su libertad, honor y patrimonio ante la Fiscalía y Juzgados.',
                servicios: [
                    { titulo: 'Defensa en Medidas Cautelares', descripcion: 'Estrategia inmediata para evitar la detención preventiva y lograr medidas sustitutivas.' },
                    { titulo: 'Interposición de Querellas y Denuncias', descripcion: 'Patrocinio de víctimas en delitos patrimoniales, estafas y agresiones.' },
                    { titulo: 'Acciones de Libertad Constitucionales', descripcion: 'Garantía tutelar urgente ante aprehensiones o persecuciones indebidas.' },
                    { titulo: 'Juicios Orales y Apelaciones', descripcion: 'Litigación técnica especializada y recursos ante tribunales superiores.' }
                ],
                pasos: [
                    { paso: '1', titulo: 'Intervención y Diagnóstico Inmediato', descripcion: 'Atención urgente en sede policial y fiscalía para salvaguardar garantías procesales.' },
                    { paso: '2', titulo: 'Construcción de la Teoría del Caso', descripcion: 'Recolección de elementos de descargo y peritajes técnicos especializados.' },
                    { paso: '3', titulo: 'Litigación Estratégica en Audiencias', descripcion: 'Defensa oral rigurosa y seguimiento minuto a minuto del cuaderno procesal.' }
                ],
                faqs: [
                    { pregunta: '¿Qué hacer ante una citación formal de la Fiscalía?', respuesta: 'No acuda sin asesoramiento de su abogado defensor. Debe presentarse asistido técnicamente para conocer los antecedentes.' },
                    { pregunta: '¿Cuándo procede una Acción de Libertad?', respuesta: 'Procede en cualquier momento en que su libertad física o locomotora se encuentre indebidamente restringida o amenazada.' },
                    { pregunta: '¿Es posible conciliar en materia penal?', respuesta: 'Sí, en delitos de contenido patrimonial y sin violencia la ley permite salidas alternativas como la conciliación o reparación del daño.' }
                ]
            }
        },
        {
            id: 'familia',
            slug: 'derecho-de-familia',
            titulo: 'Derecho de Familia',
            descripcion: 'Divorcios, asistencia familiar, guarda y custodia de menores, filiación y procesos sucesorios.',
            detalle_json: {
                subtitulo: 'Resolución jurídica sensible, respetuosa y protectora del bienestar familiar y patrimonial.',
                servicios: [
                    { titulo: 'Divorcio Notarial y Judicial', descripcion: 'Disolución vincular rápida por mutuo acuerdo o ante juzgado público de familia.' },
                    { titulo: 'Fijación e Incremento de Asistencia Familiar', descripcion: 'Determinación legal de pensión para alimentación, salud y educación de los hijos.' },
                    { titulo: 'Guarda, Custodia y Régimen de Visitas', descripcion: 'Protección prioritaria del interés superior de niñas, niños y adolescentes.' },
                    { titulo: 'División y Partición de Bienes Gananciales', descripcion: 'Liquidación equitativa del patrimonio adquirido durante el matrimonio.' }
                ],
                pasos: [
                    { paso: '1', titulo: 'Entrevista y Mediación Inicial', descripcion: 'Evaluación humana y confidencial de la dinámica familiar para evitar desgaste innecesario.' },
                    { paso: '2', titulo: 'Acuerdos Reguladores y Demanda', descripcion: 'Redacción precisa de estipulaciones sobre hijos y bienes gananciales.' },
                    { paso: '3', titulo: 'Homologación Judicial y Ejecución', descripcion: 'Garantía de cumplimiento efectivo de pensiones y resoluciones judiciales.' }
                ],
                faqs: [
                    { pregunta: '¿Cuál es el monto mínimo de asistencia familiar en Bolivia?', respuesta: 'La ley establece como parámetro base el 20% del Salario Mínimo Nacional vigente por cada beneficiario.' },
                    { pregunta: '¿Cuánto demora un divorcio notarial?', respuesta: 'Si existe acuerdo mutuo y no hay hijos menores ni bienes en controversia, se concluye en aproximadamente 60 a 90 días.' },
                    { pregunta: '¿Qué ocurre si el obligado no paga la asistencia familiar?', respuesta: 'Tras la liquidación judicial aprobada, se expide mandamiento de apremio corporal conforme a la Ley N° 603.' }
                ]
            }
        }
    ];

    function esc(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function slugify(text) {
        return (text || '')
            .toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-');
    }

    // Helper de portadas SVG temáticas (idéntico al de areas.js y main.js)
    function getAreaThemedSvg(titulo, width, height) {
        if (typeof window.getAreaThemedSvg === 'function') {
            return window.getAreaThemedSvg(titulo, width, height);
        }
        var t = (titulo || '').toLowerCase();
        var iconSvg = '<path d="M32 16v28M21 23h22M21 23l-4 8a4 4 0 0 0 8 0l-4-8zM43 23l-4 8a4 4 0 0 0 8 0l-4-8zM26 44h12" fill="none" stroke="#d4af37" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="32" cy="16" r="2" fill="#d4af37"/>';
        var w = width === '100%' ? '100%' : (width + 'px');
        var h = height === '100%' ? '100%' : (height + 'px');

        return '<svg viewBox="0 0 64 64" width="' + w + '" height="' + h + '" style="display:block;width:100%;height:100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(titulo || 'Área legal') + '">' +
            '<defs>' +
            '<linearGradient id="areaBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">' +
            '<stop offset="0%" stop-color="#0f2546"/>' +
            '<stop offset="60%" stop-color="#07152b"/>' +
            '<stop offset="100%" stop-color="#020813"/>' +
            '</linearGradient>' +
            '</defs>' +
            '<rect width="64" height="64" rx="12" fill="url(#areaBgGrad)"/>' +
            '<rect x="2" y="2" width="60" height="60" rx="10" fill="none" stroke="#d4af37" stroke-width="1" stroke-opacity="0.3"/>' +
            '<circle cx="32" cy="32" r="24" fill="none" stroke="#38bdf8" stroke-width="0.5" stroke-dasharray="2 3" opacity="0.25"/>' +
            iconSvg +
            '</svg>';
    }

    async function initAreaPage() {
        var params = new URLSearchParams(window.location.search);
        var areaId = params.get('id');
        var areaSlug = params.get('slug');

        var area = null;

        // 1. Intentar cargar desde Supabase
        try {
            var url = SB_URL + '/rest/v1/areas_practica?select=*&activo=eq.true';
            var res = await fetch(url, {
                headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
            });
            if (res.ok) {
                var rows = await res.json();
                if (rows && rows.length) {
                    try { localStorage.setItem('lexfive_areas', JSON.stringify(rows)); } catch (e) {}
                    if (areaId) {
                        area = rows.find(function (r) {
                            return String(r.id) === String(areaId) || (r.slug && r.slug === areaId) || slugify(r.titulo) === areaId;
                        });
                    }
                    if (!area && areaSlug) {
                        area = rows.find(function (r) {
                            return r.slug === areaSlug || slugify(r.titulo) === areaSlug;
                        });
                    }
                    if (!area && (areaId || areaSlug)) {
                        // Buscar por coincidencia parcial en título
                        var q = (areaId || areaSlug || '').toLowerCase();
                        area = rows.find(function (r) {
                            return r.titulo.toLowerCase().indexOf(q) !== -1 || q.indexOf(slugify(r.titulo)) !== -1;
                        });
                    }
                    if (!area) area = rows[0];
                }
            }
        } catch (e) {
            console.warn('Error conectando a Supabase para cargar área:', e);
        }

        // 2. Si no se encontró en Supabase, buscar en cache local o defaults
        if (!area) {
            try {
                var cached = JSON.parse(localStorage.getItem('lexfive_areas') || '[]');
                if (cached.length) {
                    area = cached.find(function (r) {
                        return (areaId && (String(r.id) === String(areaId) || r.slug === areaId || slugify(r.titulo) === areaId)) ||
                               (areaSlug && (r.slug === areaSlug || slugify(r.titulo) === areaSlug));
                    });
                }
            } catch (e) {}
        }

        if (!area) {
            var targetQuery = (areaId || areaSlug || 'laboral').toLowerCase();
            area = DEFAULT_AREAS.find(function (a) {
                return a.id === targetQuery || a.slug === targetQuery || slugify(a.titulo) === targetQuery;
            }) || DEFAULT_AREAS[0];
        }

        // Revisar si existe detalle guardado localmente como respaldo
        if (!area.detalle_json) {
            try {
                var localDetalle = localStorage.getItem('lexfive_area_detalle_' + (area.id || slugify(area.titulo)));
                if (localDetalle) area.detalle_json = JSON.parse(localDetalle);
            } catch (e) {}
        }

        renderAreaDetalle(area);
        cargarBlogRelacionado(area.titulo);
    }

    function renderAreaDetalle(area) {
        var titulo = area.titulo || 'Especialidad Jurídica';
        var detalle = area.detalle_json || {};
        var subtitulo = detalle.subtitulo || area.descripcion || 'Soluciones jurídicas integrales, rigurosas y estratégicas en Bolivia.';

        // Metas y título
        document.title = titulo + ' | LexFive Abogados Bolivia';
        var pageTitleEl = document.getElementById('pageTitle');
        if (pageTitleEl) pageTitleEl.textContent = titulo + ' | LexFive Abogados Bolivia';
        var ogTitleEl = document.getElementById('ogTitle');
        if (ogTitleEl) ogTitleEl.setAttribute('content', titulo + ' | LexFive Abogados');
        var ogDescEl = document.getElementById('ogDesc');
        if (ogDescEl) ogDescEl.setAttribute('content', subtitulo);

        // Breadcrumb y Hero
        var breadcrumbEl = document.getElementById('areaBreadcrumbTitle');
        if (breadcrumbEl) breadcrumbEl.textContent = titulo;
        var heroTitEl = document.getElementById('areaTituloHero');
        if (heroTitEl) heroTitEl.textContent = titulo;
        var heroSubEl = document.getElementById('areaSubtituloHero');
        if (heroSubEl) heroSubEl.textContent = subtitulo;
        var badgeEl = document.getElementById('areaBadgeTag');
        if (badgeEl) badgeEl.textContent = 'Especialidad · ' + titulo;

        // WhatsApp Phone y links
        var waPhone = '59178360469';
        try {
            var b = JSON.parse(localStorage.getItem('lexfive_branding') || '{}');
            if (b.whatsapp) waPhone = b.whatsapp.replace(/[^0-9]/g, '');
            else if (b.telefono) waPhone = b.telefono.replace(/[^0-9]/g, '');
        } catch (e) {}

        var waMsg = encodeURIComponent('Hola LexFive, requiero asesoría especializada en ' + titulo + '.');
        var waUrl = 'https://wa.me/' + waPhone + '?text=' + waMsg;

        var btnWa = document.getElementById('btnWaArea');
        if (btnWa) btnWa.href = waUrl;
        var btnWaFinal = document.getElementById('btnWaCtaFinal');
        if (btnWaFinal) btnWaFinal.href = waUrl;

        // Botón Agendar Formulario
        var btnAgendar = document.getElementById('btnAgendarForm');
        if (btnAgendar) {
            btnAgendar.href = 'index.html?area=' + encodeURIComponent(titulo) + '#contacto';
        }

        // Botón Compartir
        var btnCompartir = document.getElementById('btnCompartirArea');
        if (btnCompartir) {
            btnCompartir.onclick = function () {
                var shareUrl = window.location.href;
                if (navigator.share) {
                    navigator.share({
                        title: titulo + ' | LexFive Abogados',
                        text: subtitulo,
                        url: shareUrl
                    }).catch(function () {});
                } else {
                    navigator.clipboard.writeText(shareUrl).then(function () {
                        alert('¡Enlace copiado al portapapeles!');
                    }).catch(function () {
                        prompt('Copie el enlace para compartir:', shareUrl);
                    });
                }
            };
        }

        // Portada Visual (Foto o SVG Temático)
        var mediaCont = document.getElementById('areaMediaContainer');
        if (mediaCont) {
            if (area.imagen_url) {
                mediaCont.innerHTML = '<img src="' + esc(area.imagen_url) + '" alt="' + esc(titulo) + '" style="width:100%;height:auto;max-height:420px;object-fit:cover;display:block" onerror="this.parentElement.innerHTML=getAreaThemedSvg(\'' + esc(titulo).replace(/'/g, "\\'") + '\', \'100%\', \'320px\')">';
            } else {
                mediaCont.innerHTML = '<div style="width:100%;height:320px;display:flex;align-items:center;justify-content:center">' + getAreaThemedSvg(titulo, '100%', '100%') + '</div>';
            }
        }

        // 1. Servicios y Trámites
        var gridServ = document.getElementById('gridServicios');
        if (gridServ) {
            var servicios = (detalle && Array.isArray(detalle.servicios) && detalle.servicios.length)
                ? detalle.servicios
                : generarServiciosFallback(titulo, area.descripcion);

            gridServ.innerHTML = servicios.map(function (s, idx) {
                return '<div class="card" style="background:var(--card-bg,#0b192c);border:1px solid rgba(212,175,55,0.22);border-radius:12px;padding:24px;display:flex;flex-direction:column">' +
                    '<div style="width:42px;height:42px;border-radius:10px;background:rgba(212,175,55,0.12);display:flex;align-items:center;justify-content:center;margin-bottom:14px;color:var(--gold,#d4af37);font-weight:700;font-size:1.1rem">' +
                        (idx + 1) +
                    '</div>' +
                    '<h3 style="font-size:1.18rem;margin-bottom:8px;color:var(--navy,#fff)">' + esc(s.titulo) + '</h3>' +
                    '<p style="color:var(--muted,#94a3b8);font-size:0.95rem;line-height:1.5;margin-bottom:16px;flex:1">' + esc(s.descripcion) + '</p>' +
                    '<a href="' + waUrl + '" target="_blank" rel="noopener" style="font-size:0.88rem;color:var(--gold,#d4af37);font-weight:600;display:inline-flex;align-items:center;gap:6px">' +
                        'Consultar caso específico &rarr;' +
                    '</a>' +
                '</div>';
            }).join('');
        }

        // 2. Cómo trabajamos tu caso (3 pasos)
        var gridPasos = document.getElementById('gridPasos');
        if (gridPasos) {
            var pasos = (detalle && Array.isArray(detalle.pasos) && detalle.pasos.length === 3)
                ? detalle.pasos
                : [
                    { paso: '1', titulo: 'Diagnóstico Legal Riguroso', descripcion: 'Evaluamos antecedentes, documentos y viabilidad jurídica de forma preliminar y sin compromisos.' },
                    { paso: '2', titulo: 'Estrategia y Propuesta Clara', descripcion: 'Diseñamos la ruta procesal idónea con cronograma estimado, costos transparentes y alternativas eficaces.' },
                    { paso: '3', titulo: 'Patrocinio y Seguimiento en Línea', descripcion: 'Representación en audiencias con reportes en tiempo real accesibles desde nuestro portal de clientes.' }
                ];

            gridPasos.innerHTML = pasos.map(function (p) {
                return '<div class="card" style="background:var(--card-bg,#0b192c);border:1px solid rgba(212,175,55,0.22);border-radius:12px;padding:26px;position:relative">' +
                    '<span style="position:absolute;top:18px;right:22px;font-size:2rem;font-family:\'Cormorant Garamond\',serif;color:var(--gold,#d4af37);opacity:0.6;font-weight:700">0' + esc(p.paso) + '</span>' +
                    '<span class="tag" style="margin-bottom:10px;display:inline-block">Paso ' + esc(p.paso) + '</span>' +
                    '<h3 style="font-size:1.22rem;margin-bottom:10px;color:var(--navy,#fff)">' + esc(p.titulo) + '</h3>' +
                    '<p style="color:var(--muted,#94a3b8);font-size:0.95rem;line-height:1.55;margin:0">' + esc(p.descripcion) + '</p>' +
                '</div>';
            }).join('');
        }

        // 3. Preguntas Frecuentes
        var faqCont = document.getElementById('faqAccordion');
        if (faqCont) {
            var faqs = (detalle && Array.isArray(detalle.faqs) && detalle.faqs.length)
                ? detalle.faqs
                : generarFaqsFallback(titulo);

            faqCont.innerHTML = faqs.map(function (f, idx) {
                return '<details class="card" style="background:var(--card-bg,#0b192c);border:1px solid rgba(212,175,55,0.2);border-radius:10px;padding:16px 20px;cursor:pointer"' + (idx === 0 ? ' open' : '') + '>' +
                    '<summary style="font-weight:600;font-size:1.05rem;color:var(--navy,#fff);display:flex;justify-content:space-between;align-items:center;list-style:none">' +
                        '<span>' + esc(f.pregunta) + '</span>' +
                        '<span style="color:var(--gold,#d4af37);font-size:1.2rem;margin-left:12px">&darr;</span>' +
                    '</summary>' +
                    '<div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(212,175,55,0.15);color:var(--muted,#94a3b8);font-size:0.95rem;line-height:1.6">' +
                        esc(f.respuesta) +
                    '</div>' +
                '</details>';
            }).join('');
        }
    }

    function generarServiciosFallback(titulo, desc) {
        var t = (titulo || '').toLowerCase();
        if (desc && desc.indexOf(',') !== -1) {
            var items = desc.split(/[,.;]/).map(function (x) { return x.trim(); }).filter(function (x) { return x.length > 8; });
            if (items.length >= 3) {
                return items.slice(0, 4).map(function (it, i) {
                    return {
                        titulo: 'Asesoría y Gestión en ' + it.slice(0, 30),
                        descripcion: 'Atención personalizada, revisión documental y patrocinio técnico en ' + it + ' conforme a la normativa boliviana.'
                    };
                });
            }
        }
        return [
            { titulo: 'Asesoría Preventiva y Consultoría', descripcion: 'Evaluación previa para anticipar contingencias legales y blindar los intereses del cliente.' },
            { titulo: 'Patrocinio en Procesos Contenciosos', descripcion: 'Representación activa ante juzgados ordinarios, fiscalía y tribunales de apelación.' },
            { titulo: 'Negociación y Conciliación Extrajudicial', descripcion: 'Gestión orientada a la resolución oportuna de controversias evitando dilaciones.' },
            { titulo: 'Elaboración y Auditoría Documental', descripcion: 'Redacción de minutas, contratos, memoriales y recursos con máxima solidez procesal.' }
        ];
    }

    function generarFaqsFallback(titulo) {
        return [
            {
                pregunta: '¿Cómo inicio la consulta o revisión de mi caso en ' + titulo + '?',
                respuesta: 'Puede agendar una cita directamente por WhatsApp o mediante nuestro formulario web. Realizamos una evaluación preliminar con absoluta reserva profesional.'
            },
            {
                pregunta: '¿En qué ciudades de Bolivia atienden casos de esta materia?',
                respuesta: 'Nuestra sede principal está ubicada en El Alto y La Paz, pero brindamos patrocinio y seguimiento procesal a nivel nacional.'
            },
            {
                pregunta: '¿Puedo hacer seguimiento al avance de mi proceso por internet?',
                respuesta: 'Sí, en LexFive todos nuestros clientes cuentan con acceso privado al Portal de Clientes para revisar actuaciones, decretos y estados procesales en línea.'
            }
        ];
    }

    async function cargarBlogRelacionado(areaTitulo) {
        var grid = document.getElementById('gridBlogRelacionado');
        if (!grid) return;

        try {
            var res = await fetch(SB_URL + '/rest/v1/articulos?select=id,titulo,resumen,categoria,fecha,created_at&estado=eq.publicado&order=fecha.desc&limit=6', {
                headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
            });
            var arts = [];
            if (res.ok) {
                arts = await res.json();
            }

            // Filtrar por coincidencia con el nombre del área o mostrar los 3 primeros
            var q = (areaTitulo || '').toLowerCase();
            var matches = (arts || []).filter(function (a) {
                var c = (a.categoria || '').toLowerCase();
                var t = (a.titulo || '').toLowerCase();
                return q.indexOf(c) !== -1 || c.indexOf(q) !== -1 || t.indexOf(q) !== -1;
            });

            var lista = matches.length ? matches.slice(0, 3) : (arts || []).slice(0, 3);
            if (!lista.length) {
                var sec = document.getElementById('seccionBlogRelacionado');
                if (sec) sec.style.display = 'none';
                return;
            }

            grid.innerHTML = lista.map(function (a) {
                var fechaStr = '';
                try {
                    var d = new Date(a.fecha || a.created_at);
                    fechaStr = d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
                } catch (e) { fechaStr = a.fecha || ''; }
                var link = 'blog.html?id=' + encodeURIComponent(a.id);

                var coverUrl = a.imagen_url;
                if (!coverUrl && a.contenido) {
                    var m = a.contenido.match(/<!--cover:(https?:\/\/[^\s>]+)-->/) || a.contenido.match(/!\[(?:portada|cover)\]\((https?:\/\/[^\s)]+)\)/i);
                    if (m) coverUrl = m[1];
                }
                var cat = a.categoria || 'General';
                var mediaHtml = '';
                if (coverUrl) {
                    mediaHtml = '<img src="' + esc(coverUrl) + '" alt="' + esc(a.titulo) + '" loading="lazy" decoding="async" style="width:100%;aspect-ratio:16/9;object-fit:cover;display:block;border-radius:12px 12px 0 0" onerror="this.parentElement.innerHTML=getAreaThemedSvg(\'' + esc(cat).replace(/'/g, "\\'") + '\', \'100%\', \'100%\')">';
                } else {
                    mediaHtml = '<div style="width:100%;aspect-ratio:16/9;overflow:hidden;border-radius:12px 12px 0 0;border-bottom:1px solid rgba(212,175,55,0.2)">' + getAreaThemedSvg(cat, '100%', '100%') + '</div>';
                }
                var excerpt = (a.resumen || a.contenido || '').replace(/^<!--cover:https?:\/\/[^\s>]+-->\s*/i, '');
                return '<article class="post-card" onclick="window.location.href=\'' + link + '\'">' +
                    '<div class="post-card__media" style="overflow:hidden">' + mediaHtml + '</div>' +
                    '<div class="post-card__body">' +
                        '<div class="post-card__meta">' +
                            '<span class="tag">' + esc(cat) + '</span>' +
                            '<span class="post-card__date">' + esc(fechaStr) + '</span>' +
                        '</div>' +
                        '<h3 class="post-card__title" style="font-size:1.2rem;margin-bottom:10px">' + esc(a.titulo) + '</h3>' +
                        '<p class="post-card__excerpt">' + esc(excerpt) + '</p>' +
                        '<div style="margin-top:auto;padding-top:14px">' +
                            '<a href="' + link + '" class="post-card__link" style="font-weight:600;color:var(--gold);display:inline-flex;align-items:center;gap:6px">' +
                                'Leer artículo completo &rarr;' +
                            '</a>' +
                        '</div>' +
                    '</div>' +
                '</article>';
            }).join('');
        } catch (e) {
            console.warn('Error cargando blog relacionado:', e);
            var sec = document.getElementById('seccionBlogRelacionado');
            if (sec) sec.style.display = 'none';
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAreaPage);
    } else {
        initAreaPage();
    }
})();
