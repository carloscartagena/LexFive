#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera la "Guía de Tareas Pendientes (configuración manual) de LexFive" en
PDF, Word y Markdown. Reutiliza el motor de render del manual del sistema.

Uso:  python3 scripts/generar_pendientes.py
Salidas (en la raíz del repositorio):
  - Guia-Pasos-Pendientes-LexFive.pdf / .md / .docx
"""

import os
import generar_manual as M


def build_blocks():
    B = []
    h1 = lambda t: B.append(('h1', t))
    h2 = lambda t: B.append(('h2', t))
    p = lambda t: B.append(('p', t))
    bul = lambda items: B.append(('bullets', items))
    stp = lambda items: B.append(('steps', items))
    note = lambda t, titulo='Nota': B.append(('note', t, titulo))
    sp = lambda h=6: B.append(('spacer', h))

    h1("1. Introducción")
    p("El sistema (página web y panel) ya está construido y publicado. Para dejarlo 100% "
      "operativo quedan algunas tareas que solo usted puede hacer, porque requieren sus "
      "cuentas, sus contraseñas o sus archivos. Esta guía las explica paso a paso, ordenadas "
      "por prioridad.")
    note("Las tareas marcadas como IMPRESCINDIBLES deben hacerse para que ciertas funciones "
         "trabajen. Las RECOMENDADAS mejoran la presentación. Las OPCIONALES son para más "
         "adelante.", "Cómo leer esta guía")

    # ---------- Imprescindibles ----------
    h1("2. IMPRESCINDIBLE — Ejecutar los scripts de la base de datos")
    p("En Supabase hay que ejecutar, una sola vez y en orden, los archivos de la carpeta db/ "
      "del proyecto. Cada uno activa una parte del sistema.")
    h2("Cómo hacerlo")
    stp([
        "Entre a supabase.com y abra su proyecto.",
        "En el menú de la izquierda, elija «SQL Editor» y luego «New query».",
        "Abra el primer archivo de la carpeta db/ (en GitHub), copie TODO su contenido, "
        "péguelo y pulse «Run».",
        "Repita con cada archivo, respetando el orden de la lista de abajo.",
    ])
    h2("Orden de los scripts")
    bul([
        "schema.sql — crea las tablas base, los permisos y el almacenamiento.",
        "02_portal_clientes.sql — rol cliente y separación de datos.",
        "03_blog_alertas_testimonios.sql — blog, alertas y testimonios.",
        "04_modelos_nurej.sql — biblioteca de modelos y campo NUREJ.",
        "05_multiples_abogados.sql — varios abogados/procuradores por proceso.",
        "06_consultas.sql — bandeja de Consultas (formulario de contacto).",
        "07_sync_clientes.sql — que los clientes registrados aparezcan en el panel.",
        "08_categorias.sql — áreas del derecho que se pueden crear desde el panel.",
        "09_actuaciones_archivos.sql — adjuntar archivos a cada paso del historial.",
    ])
    note("Si un script muestra un error de «columna que no existe» o «ya existe», vuelva a "
         "ejecutarlo: están preparados para correrse sin romper ni borrar datos. Si el error "
         "persiste, cópielo y páselo al desarrollo.", "Si aparece un error")

    h1("3. IMPRESCINDIBLE — Activar el inicio de sesión por correo")
    p("Para que las cuentas funcionen al instante en uso interno, conviene no exigir "
      "confirmación por correo.")
    stp([
        "En Supabase, vaya a «Authentication» y luego a «Providers» (o «Sign In / Providers»).",
        "Abra la opción «Email».",
        "Desactive «Confirm email» y guarde los cambios.",
    ])

    h1("4. IMPRESCINDIBLE — Crear y marcar al administrador")
    p("El administrador es quien tiene acceso total (usuarios, auditoría, categorías, etc.).")
    stp([
        "Cree su cuenta: desde la pantalla de acceso del panel (registro) o en Supabase, en "
        "«Authentication → Users → Add user».",
        "En Supabase, abra «SQL Editor → New query».",
        "Pegue esta línea, cambiando el correo por el suyo real, y pulse «Run»:",
        "update public.profiles set rol = 'admin' where email = 'SU_CORREO@gmail.com';",
        "Cierre sesión y vuelva a entrar: ya tendrá el rol de administrador.",
    ])

    h1("5. IMPRESCINDIBLE — Dar de alta a los abogados y procuradores")
    stp([
        "Pídales que se registren desde la pantalla de acceso, o créelos en Supabase "
        "(«Authentication → Users → Add user»).",
        "Entre al panel como administrador y abra la pestaña «Usuarios».",
        "A cada persona, cámbiele el rol a «Abogado» o «Procurador» según corresponda.",
    ])
    note("Cuando alguien se registra, entra como «Cliente» por defecto. Para el personal, "
         "recuerde cambiarle el rol en la pestaña Usuarios.", "Recuerde")

    # ---------- Recomendadas ----------
    h1("6. RECOMENDADO — Subir las fotos del equipo")
    p("La sección «Nosotros» de la web muestra a los abogados. Mientras no haya fotos, se ven "
      "las iniciales (no se rompe nada).")
    stp([
        "Prepare 5 fotos cuadradas (aprox. 600 x 600 px), una por abogado.",
        "Súbalas a la carpeta assets/equipo/ del proyecto en GitHub.",
        "Use exactamente estos nombres de archivo: cartagena.jpg, corwin.jpg, antelo.jpg, "
        "candia.jpg, payrumani.jpg.",
    ])
    note("Si no sabe subir archivos a GitHub, puede enviármelas y yo las dejo colocadas con el "
         "nombre correcto.", "Atajo")

    h1("7. RECOMENDADO — Verificar el correo de las consultas")
    p("El formulario de contacto envía una copia por correo mediante Web3Forms.")
    bul([
        "Envíe una consulta de prueba desde la web y confirme que llega al correo del bufete.",
        "Si no llega, revise la carpeta de spam, o genere una clave nueva en web3forms.com con "
        "el correo del bufete y pásela al desarrollo.",
        "Aunque el correo falle, la consulta SIEMPRE queda guardada en la bandeja «Consultas» "
        "del panel.",
    ])

    # ---------- Opcionales ----------
    h1("8. OPCIONAL — Mejoras a futuro")
    bul([
        "Dominio propio (por ejemplo lexfive.bo) y correo profesional (contacto@lexfive.bo) en "
        "lugar de Gmail. El dominio se conecta en Netlify.",
        "Revisar con criterio de abogado los textos del Aviso de privacidad y de Términos y "
        "condiciones, por si desean ajustar algún punto.",
        "Hacer respaldos periódicos de la base de datos desde Supabase.",
    ])

    h1("9. Lista de verificación rápida")
    bul([
        "[  ] Ejecuté los 9 scripts de la carpeta db/ en orden.",
        "[  ] Desactivé «Confirm email» en Supabase.",
        "[  ] Creé mi cuenta y me asigné el rol de administrador.",
        "[  ] Di de alta a los abogados/procuradores y les puse su rol.",
        "[  ] Subí las 5 fotos del equipo (o se las envié al desarrollo).",
        "[  ] Probé una consulta y confirmé que llega al correo.",
        "[  ] (Opcional) Dominio propio, textos legales revisados y respaldos.",
    ])
    sp(6)
    note("¿Le aparece un error o se traba en algún paso? Anote en qué punto quedó y el mensaje "
         "exacto que ve; con eso es muy fácil ayudarle a destrabarlo.", "Si se complica")

    return B


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    blocks = build_blocks()

    M.DOC_TITLE = "Tareas Pendientes"
    M.DOC_SUBTITLE = "Configuración manual para dejar el sistema 100% operativo"
    M.DOC_INTRO = ("Pasos que solo usted puede hacer: base de datos, usuarios, fotos del equipo "
                   "y correo de las consultas.")
    M.DOC_HEADER = "Tareas Pendientes"

    pdf_path = os.path.join(root, "Guia-Pasos-Pendientes-LexFive.pdf")
    md_path = os.path.join(root, "Guia-Pasos-Pendientes-LexFive.md")
    docx_path = os.path.join(root, "Guia-Pasos-Pendientes-LexFive.docx")

    pages, pdf_size = M.render_pdf(blocks, pdf_path)
    md_size = M.render_md(blocks, md_path)
    docx_size = M.render_docx(blocks, docx_path)

    print("PDF : %s  (%d páginas, %.1f KB)" % (pdf_path, pages, pdf_size / 1024.0))
    print("MD  : %s  (%.1f KB)" % (md_path, md_size / 1024.0))
    print("DOCX: %s  (%.1f KB)" % (docx_path, docx_size / 1024.0))


if __name__ == "__main__":
    main()
