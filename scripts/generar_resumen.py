#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador del "Resumen del Proyecto LexFive".

Reutiliza el mismo motor de generar_manual.py (PDF/Markdown/Word) para
producir, desde un ÚNICO modelo de contenido, tres formatos sincronizados:

  - RESUMEN-PROYECTO-LexFive.pdf   (PDF con portada, logo en cada página e índice)
  - RESUMEN-PROYECTO-LexFive.md    (Markdown editable)
  - RESUMEN-PROYECTO-LexFive.docx  (Word editable)

El documento es una guía de referencia: qué se construyó, con qué tecnologías,
cómo está organizado y cómo replicarlo si se usa otra plataforma o lenguaje.

No usa dependencias externas. Uso:  python3 scripts/generar_resumen.py
"""

import os
import generar_manual as gm

# --- Identidad del documento (sobrescribe los globales del motor) ---
gm.DOC_TITLE = "Resumen del Proyecto"
gm.DOC_SUBTITLE = "Guía de referencia para replicarlo en otras plataformas"
gm.DOC_INTRO = ("Qué se construyó, con qué tecnologías, cómo está organizado y cómo "
                "recrearlo si en otra ocasión se usa otra plataforma o lenguaje de "
                "programación.")
gm.DOC_HEADER = "Resumen del Proyecto"

SITIO = gm.SITIO


def build_blocks():
    B = []
    h1 = lambda t: B.append(('h1', t))
    h2 = lambda t: B.append(('h2', t))
    p = lambda t: B.append(('p', t))
    bul = lambda items: B.append(('bullets', items))
    stp = lambda items: B.append(('steps', items))
    note = lambda t, titulo='Nota': B.append(('note', t, titulo))
    sp = lambda h=6: B.append(('spacer', h))

    # 1
    h1("1. Qué es LexFive")
    p("LexFive es el sistema digital completo del bufete de abogados LexFive (El Alto, "
      "Bolivia). Se compone de dos partes que comparten la misma base de datos:")
    bul([
        "Sitio web público: la cara del bufete hacia los clientes (presentación, áreas de "
        "práctica, casos de éxito, blog, preguntas frecuentes y formulario de contacto).",
        "Panel de gestión privado (en /sistema): donde el personal administra procesos "
        "judiciales, clientes, consultas, modelos de memoriales, blog, testimonios, "
        "usuarios, credenciales y auditoría.",
    ])
    p("El objetivo del proyecto fue: una web profesional más un sistema de gestión legal, "
      "barato de mantener, sin servidor propio y fácil de desplegar.")

    # 2
    h1("2. Tecnologías utilizadas (y por qué)")
    bul([
        "Frontend: HTML5, CSS3 y JavaScript puro (sin frameworks). Rápido, ligero, sin "
        "dependencias ni compilación; fácil de desplegar y mantener.",
        "Backend y base de datos: Supabase (PostgreSQL gestionado). Aporta base de datos, "
        "autenticación y almacenamiento de archivos sin programar un servidor.",
        "Autenticación: Supabase Auth (correo + contraseña). Login, registro y recuperación "
        "de contraseña listos para usar.",
        "Seguridad de datos: Row Level Security (RLS) de PostgreSQL. Las reglas de acceso por "
        "rol viven en la base de datos, no en el navegador.",
        "Almacenamiento de archivos: Supabase Storage (bucket «documentos»), para memoriales, "
        "anexos y archivos de actuaciones.",
        "Cliente de Supabase: la librería supabase-js cargada por CDN (esm.sh), sin npm ni build.",
        "Envío de correos del formulario: Web3Forms, servicio gratuito para recibir el "
        "formulario de contacto sin backend.",
        "Hosting: Netlify, conectado a GitHub (despliegue automático al hacer push a main).",
        "Generación de documentos: scripts en Python que generan manuales, guías y "
        "credenciales en formatos .md, .docx y .pdf.",
    ])
    note("Idea clave del proyecto: todo el «backend» lo provee Supabase. El frontend es "
         "estático y la seguridad real la imponen las reglas RLS de la base de datos, no el "
         "JavaScript del navegador.", "Idea clave")

    # 3
    h1("3. Estructura del proyecto")
    p("Las páginas públicas están en la raíz; el panel privado, en la carpeta /sistema; los "
      "scripts de base de datos, en /db; y los generadores de documentos, en /scripts.")
    h2("Web pública (raíz)")
    bul([
        "index.html — inicio, áreas, nosotros, equipo y contacto.",
        "casos.html — casos de éxito.",
        "blog.html — blog jurídico (lee los artículos publicados desde Supabase).",
        "faq.html — preguntas frecuentes (acordeón).",
        "verificar.html — verificación pública de credenciales del bufete.",
        "aviso-privacidad.html y terminos.html — páginas legales.",
        "css/styles.css — estilos, paleta de colores, temas y diseño responsive.",
        "js/main.js — interactividad de la web (menú, FAQ, formulario).",
    ])
    h2("Panel de gestión (carpeta /sistema)")
    bul([
        "login.html — pantalla de acceso y registro.",
        "index.html — el panel (dashboard).",
        "css/panel.css — estilos del panel.",
        "js/config.js — URL y clave pública de Supabase, roles, abogados y materias.",
        "js/supabase.js — inicializa el cliente de Supabase.",
        "js/auth.js — sesión, perfil, roles, permisos y auditoría.",
        "js/app.js — lógica del panel (procesos, clientes, blog, usuarios, etc.).",
    ])
    h2("Base de datos (carpeta /db)")
    bul([
        "schema.sql — tablas base, RLS y almacenamiento.",
        "02_portal_clientes.sql — rol «cliente» y aislamiento de datos.",
        "03_blog_alertas_testimonios.sql — blog, alertas y testimonios.",
        "04_modelos_nurej.sql — biblioteca de modelos y campo NUREJ.",
        "05_multiples_abogados.sql — varios abogados/procuradores por proceso.",
        "06_consultas.sql — bandeja de consultas (formulario de contacto).",
        "07_sync_clientes.sql — crea la ficha de cliente al registrarse.",
        "08_categorias.sql — áreas del derecho dinámicas.",
        "09_actuaciones_archivos.sql — adjuntar archivos a cada actuación.",
    ])

    # 4
    h1("4. Funcionalidades construidas")
    h2("Sitio web público")
    bul([
        "Página de inicio con áreas de práctica, equipo, testimonios e indicadores.",
        "Casos de éxito, blog jurídico y preguntas frecuentes.",
        "Formulario de contacto que guarda cada mensaje en la base de datos (bandeja de "
        "Consultas) y, opcionalmente, envía copia por correo (Web3Forms).",
        "Botón flotante de WhatsApp con menú de los cinco abogados.",
        "Páginas legales y página de verificación de credenciales.",
        "Cuatro temas de color con acento dorado y diseño accesible y responsive.",
    ])
    h2("Panel de gestión privado")
    bul([
        "Dashboard con métricas (procesos totales/activos, audiencias próximas, consultas nuevas).",
        "Procesos/casos: crear, editar, asignar varios abogados y procuradores, vincular "
        "cliente, estados, NUREJ, próxima audiencia e historial de actuaciones con archivos.",
        "Clientes: cartera con documento, contacto y vinculación por correo.",
        "Bandeja de consultas con estados (Nueva/Atendida/Archivada) y respuesta por WhatsApp o correo.",
        "Modelos de memoriales: biblioteca de plantillas por área del derecho.",
        "Blog: redacción de artículos (borrador/publicado) que aparecen en la web pública.",
        "Testimonios: moderación (aprobar/rechazar) antes de publicarse.",
        "Usuarios (solo admin): cambiar roles, activar/desactivar cuentas.",
        "Categorías/áreas del derecho (solo admin): crear, renombrar y eliminar.",
        "Auditoría (solo admin): bitácora de acciones importantes.",
        "Credenciales: generador de carnet imprimible del bufete.",
        "Portal del cliente: vista reducida donde el cliente ve solo sus procesos y deja su opinión.",
        "Autoguardado de borradores y cierre de sesión por inactividad.",
    ])

    # 5
    h1("5. Modelo de datos (resumen)")
    p("Tablas principales en PostgreSQL (Supabase):")
    bul([
        "profiles — usuarios del sistema, vinculados a auth.users, con rol "
        "(admin/procurador/abogado/cliente) y estado activo.",
        "clientes — cartera de clientes (vinculados por correo).",
        "procesos — casos judiciales/administrativos (carátula, número/NUREJ, materia, "
        "estado, audiencia, etc.).",
        "actuaciones — historial de pasos de cada proceso (con archivos adjuntos).",
        "documentos — metadatos de memoriales/archivos (el archivo físico va en Storage).",
        "articulos — artículos del blog (borrador/publicado).",
        "auditoria — bitácora de acciones.",
        "Más tablas para consultas, testimonios y categorías, añadidas por los scripts 02 a 09.",
    ])
    note("Seguridad (RLS): cada tabla tiene políticas que definen quién puede ver, crear, "
         "editar o borrar. Por ejemplo, todos ven los procesos pero solo el admin elimina; "
         "un cliente solo ve sus propios procesos; la auditoría solo la ve el admin. Funciones "
         "auxiliares: is_admin() y current_rol().", "Seguridad")

    # 6
    h1("6. Cómo se pone en marcha (una sola vez)")
    stp([
        "Crear un proyecto en Supabase.",
        "En el SQL Editor, ejecutar en orden los scripts de db/: primero schema.sql, luego "
        "del 02 al 09.",
        "En Authentication → Providers → Email, configurar el login por correo.",
        "Crear el primer usuario y convertirlo en admin con: update public.profiles set "
        "rol = 'admin' where email = 'tu-correo';",
        "Poner la URL y la clave pública de Supabase en sistema/js/config.js.",
        "(Opcional) Poner la clave de Web3Forms en el formulario de index.html.",
        "Desplegar en Netlify conectando el repositorio de GitHub (push a main = publica solo).",
    ])
    note("El detalle completo está en sistema/CONFIGURACION.md y en el Manual del Sistema.",
         "Más detalle")

    # 7
    h1("7. Guía para replicar el sistema en otra plataforma")
    p("Si en el futuro se reconstruye con otro stack (por ejemplo React + Node, Django, "
      "Laravel, Firebase, etc.), estos son los componentes que hay que cubrir, "
      "independientemente del lenguaje.")
    h2("Equivalencias por capa (lo usado aquí y sus alternativas)")
    bul([
        "Base de datos relacional — aquí: Supabase (PostgreSQL). Alternativas: "
        "Firebase/Firestore, MySQL, MongoDB, PlanetScale, Neon.",
        "Autenticación — aquí: Supabase Auth. Alternativas: Firebase Auth, Auth0, Clerk, "
        "NextAuth, Devise (Rails), auth de Django.",
        "Seguridad por rol — aquí: RLS de PostgreSQL. Alternativas: middleware/guards en el "
        "backend (guards de NestJS, permissions de Django, policies de Laravel).",
        "Almacenamiento de archivos — aquí: Supabase Storage. Alternativas: AWS S3, "
        "Firebase Storage, Cloudinary.",
        "Frontend — aquí: HTML/CSS/JS puro. Alternativas: React, Vue, Angular, Svelte, Next.js.",
        "Recepción de formularios — aquí: Web3Forms. Alternativas: Formspree, EmailJS, o un "
        "endpoint propio con Nodemailer/SendGrid.",
        "Hosting — aquí: Netlify. Alternativas: Vercel, GitHub Pages, Render, Cloudflare "
        "Pages o un VPS.",
    ])
    h2("Checklist funcional para no olvidar nada")
    bul([
        "Roles y permisos: admin, abogado, procurador, cliente — con quién puede borrar.",
        "Gestión de procesos con asignación múltiple de abogados/procuradores.",
        "Historial de actuaciones con archivos adjuntos por paso.",
        "Clientes vinculados por correo y portal del cliente (ve solo lo suyo).",
        "Bandeja de consultas alimentada por el formulario web.",
        "Biblioteca de modelos por área del derecho.",
        "Blog editable desde el panel que se publica en la web.",
        "Testimonios con moderación.",
        "Categorías dinámicas (áreas del derecho).",
        "Auditoría de acciones.",
        "Generador de credenciales imprimibles.",
        "Autoguardado de borradores y cierre de sesión por inactividad.",
    ])
    h2("Lecciones aprendidas y recomendaciones")
    bul([
        "Empezar por el modelo de datos y los roles: todo lo demás (pantallas, permisos) se "
        "deriva de ahí. Tener clara la matriz de permisos antes de programar evita rehacer trabajo.",
        "Mantener la seguridad en el backend o la base de datos, nunca solo en el navegador. "
        "Aquí se logró con RLS; en otro stack, con guards/policies del lado del servidor.",
        "Separar claves públicas de claves secretas. En config.js solo va la clave pública; "
        "la service_role y las contraseñas jamás se exponen en el frontend.",
        "Un frontend estático más un backend gestionado (BaaS) abarata y simplifica el "
        "mantenimiento de proyectos pequeños y medianos: no hay servidor que administrar.",
        "El despliegue continuo (push a main que publica solo) ahorra mucho tiempo.",
        "Documentar desde el inicio (manual y guía de configuración) facilita el traspaso y el soporte.",
    ])

    # 8
    h1("8. Datos clave del proyecto actual")
    bul([
        "Sitio: %s." % SITIO,
        "Frontend: HTML/CSS/JS puro (alrededor de 3.700 líneas entre app.js, main.js y styles.css).",
        "Base de datos: Supabase (PostgreSQL), 9 scripts SQL versionados en db/.",
        "Despliegue: Netlify conectado a GitHub (rama main).",
        "Repositorio: carloscartagena/LexFive.",
    ])
    sp(8)
    note("Este resumen describe el proyecto a la fecha indicada en la portada. Si el sistema "
         "cambia, vuelva a generar el documento con scripts/generar_resumen.py.", "Versión")

    return B


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    blocks = build_blocks()

    pdf_path = os.path.join(root, "RESUMEN-PROYECTO-LexFive.pdf")
    md_path = os.path.join(root, "RESUMEN-PROYECTO-LexFive.md")
    docx_path = os.path.join(root, "RESUMEN-PROYECTO-LexFive.docx")

    pages, pdf_size = gm.render_pdf(blocks, pdf_path)
    md_size = gm.render_md(blocks, md_path)
    docx_size = gm.render_docx(blocks, docx_path)

    print("PDF : %s  (%d paginas, %.1f KB)" % (pdf_path, pages, pdf_size / 1024.0))
    print("MD  : %s  (%.1f KB)" % (md_path, md_size / 1024.0))
    print("DOCX: %s  (%.1f KB)" % (docx_path, docx_size / 1024.0))


if __name__ == "__main__":
    main()
