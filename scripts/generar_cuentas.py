#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera la "Guía de Cuentas y Accesos de LexFive" en PDF, Word y Markdown.

Reutiliza el motor de render del manual del sistema (generar_manual.py), por lo
que NO usa dependencias externas y funciona sin internet.

Uso:  python3 scripts/generar_cuentas.py
Salidas (en la raíz del repositorio):
  - Guia-Cuentas-LexFive.pdf
  - Guia-Cuentas-LexFive.md
  - Guia-Cuentas-LexFive.docx
"""

import os
import generar_manual as M


# ============================================================
#  CONTENIDO: cuentas y servicios usados por el sistema
# ============================================================
def build_blocks():
    B = []
    h1 = lambda t: B.append(('h1', t))
    h2 = lambda t: B.append(('h2', t))
    p = lambda t: B.append(('p', t))
    bul = lambda items: B.append(('bullets', items))
    stp = lambda items: B.append(('steps', items))
    note = lambda t, titulo='Nota': B.append(('note', t, titulo))
    sp = lambda h=6: B.append(('spacer', h))

    # ---------- Introducción ----------
    h1("1. Introducción")
    p("Esta guía reúne todas las cuentas y servicios en internet que hacen funcionar el "
      "sistema de LexFive. Para cada uno encontrará: para qué sirve, con qué cuenta se ingresa, "
      "la dirección web para entrar y un breve paso a paso. Así podrá cerrar las pestañas con "
      "tranquilidad y volver a entrar cuando lo necesite.")
    note("Tres servicios sostienen todo el sistema: GitHub (guarda el código), Netlify "
         "(publica la página en internet) y Supabase (guarda los datos: procesos, clientes, "
         "etc.). Además, Web3Forms envía por correo una copia de las consultas.", "En resumen")
    note("Sus contraseñas NO se guardan en este documento por seguridad. Anótelas en un lugar "
         "privado y seguro. Si las olvida, cada servicio tiene la opción «¿Olvidó su "
         "contraseña?» para recuperarlas por correo.", "Importante sobre las contraseñas")

    # ---------- Tabla rápida ----------
    h1("2. Vista rápida de las cuentas")
    p("Correo del bufete usado en todas las cuentas: alba23meira@gmail.com")
    bul([
        "GitHub — guarda el código. Entrar en github.com con «Continuar con Google».",
        "Netlify — publica el sitio. Entrar en app.netlify.com con «Continuar con GitHub».",
        "Supabase — base de datos y usuarios. Entrar en supabase.com con «Continuar con GitHub».",
        "Web3Forms — envío por correo de las consultas. Funciona con una clave, no con login.",
        "Resend — envía los correos de recordatorio de audiencias. Entrar en resend.com con «Continuar con Google» (su Gmail).",
        "Correo Gmail del bufete — recibe las consultas y recupera las demás cuentas.",
        "Panel del sistema LexFive — donde trabaja el equipo (no es una cuenta externa).",
    ])
    note("Cadena de accesos (verificada): Supabase entra con GitHub; Netlify entra con GitHub; "
         "GitHub entra con Google (su Gmail); y Resend entra directamente con Google (su Gmail). "
         "Por lo tanto, su correo de Google alba23meira@gmail.com es la LLAVE MAESTRA de todo el "
         "sistema: cuide muy bien su contraseña y actívele verificación en dos pasos.", "Lo más importante")

    # ---------- GitHub ----------
    h1("3. GitHub — el código del sistema")
    p("Guarda todos los archivos del sistema (la página y el panel). Cada cambio queda "
      "registrado aquí, y desde aquí se publica automáticamente en Netlify.")
    h2("Cómo entrar")
    stp([
        "Vaya a github.com y pulse «Sign in».",
        "Elija «Continuar con Google» con el correo del bufete (alba23meira@gmail.com). Así "
        "ingresó su cuenta y es la forma más cómoda.",
        "Su proyecto (repositorio) se llama «LexFive»: github.com/carloscartagena/LexFive",
    ])
    h2("Para qué lo usará")
    bul([
        "Ver los archivos del sistema y el historial de cambios.",
        "Descargar los documentos del repositorio (manuales, scripts de base de datos).",
        "No necesita tocar el código: de los cambios se encarga el desarrollo.",
    ])
    note("Verificado: su GitHub también tiene una contraseña propia configurada. Es decir, "
         "puede entrar con «Continuar con Google» o con su correo + contraseña de GitHub. "
         "Recomendado: use Google y conserve la contraseña como respaldo.", "Su caso")

    # ---------- Netlify ----------
    h1("4. Netlify — publica la página en internet")
    p("Toma el código de GitHub y lo publica en internet. Gracias a Netlify, su sitio está en "
      "línea en la dirección lexfive.netlify.app. Cada vez que se sube un cambio a GitHub, "
      "Netlify vuelve a publicar el sitio solo, en uno o dos minutos.")
    h2("Cómo entrar")
    stp([
        "Vaya a app.netlify.com y pulse «Log in».",
        "Elija «Continuar con GitHub» (su cuenta de GitHub está conectada a Netlify).",
        "En «Sites» verá su sitio «lexfive»; en «Deploys» comprueba si la última publicación "
        "salió bien.",
    ])
    h2("Para qué lo usará")
    bul([
        "Confirmar que el sitio está publicado y en línea.",
        "Más adelante, si compra un dominio propio (ej. lexfive.bo), se conecta aquí.",
        "Por lo general no necesita entrar a diario: el sitio se actualiza solo.",
    ])
    note("Verificado: en Netlify, Google NO está conectado, así que NO use «Continuar con "
         "Google» aquí. Sí puede entrar con «Continuar con GitHub» o con su correo "
         "(alba23meira@gmail.com) + la contraseña propia de Netlify.", "Su caso")

    # ---------- Supabase ----------
    h1("5. Supabase — la base de datos y los usuarios")
    p("Es el servicio más importante para el día a día: guarda los procesos, clientes, "
      "consultas, documentos, testimonios y las cuentas de acceso de los usuarios. El panel del "
      "sistema lee y escribe aquí.")
    h2("Cómo entrar")
    stp([
        "Vaya a supabase.com y pulse «Sign in».",
        "Elija «Continuar con GitHub» (su cuenta de Supabase está vinculada a GitHub, con el "
        "correo alba23meira@gmail.com).",
        "Abra su proyecto (LexFive). Las secciones que más usará: «Authentication → Users» "
        "(cuentas) y «SQL Editor» (scripts de la carpeta db/).",
    ])
    h2("Datos de su proyecto (públicos, no son secretos)")
    bul([
        "Dirección del proyecto (URL): https://soazmibvesvuwgxeealo.supabase.co",
        "Estos datos ya están configurados en el sistema; no necesita copiarlos a ningún lado.",
    ])
    h2("Para qué lo usará")
    bul([
        "Crear o habilitar usuarios (abogados, procuradores) en Authentication → Users.",
        "Ejecutar una sola vez los scripts de la carpeta db/ (ver la guía de pasos pendientes).",
        "Hacer respaldos de la información cada cierto tiempo.",
    ])
    note("Verificado: en «Account identities» figura GitHub (carloscartagena · "
         "alba23meira@gmail.com). Su acceso a Supabase pasa por GitHub, así que entre siempre "
         "con «Continuar con GitHub». No confunda esto con «Connections → GitHub», que sirve "
         "para conectar repositorios y no es su forma de iniciar sesión.", "Su caso")

    # ---------- Web3Forms ----------
    h1("6. Web3Forms — envío de las consultas por correo")
    p("Cuando alguien llena el formulario de contacto de la web, Web3Forms envía una copia de "
      "ese mensaje al correo del bufete. (La consulta además queda guardada en la bandeja "
      "«Consultas» del panel, así que no se pierde aunque el correo falle.)")
    h2("Cómo entrar")
    stp([
        "Vaya a web3forms.com e ingrese con su Gmail del bufete (alba23meira@gmail.com), que "
        "es con el que se registró.",
        "El servicio funciona con una «Access Key» (clave de acceso) ligada a ese correo.",
        "Si necesita una clave nueva, ingrese el correo del bufete en su página y la recibirá "
        "por correo.",
    ])
    h2("Para qué lo usará")
    bul([
        "Casi nunca: solo si deja de llegar el correo de las consultas o si cambia el correo "
        "de destino.",
        "Si genera una clave nueva, pásesela al desarrollo para reemplazarla en el sistema.",
    ])
    note("Verificado: se registró con su Gmail del bufete. Una razón más para cuidar la "
         "contraseña de ese correo y activarle verificación en dos pasos.", "Su caso")

    # ---------- Resend ----------
    h1("7. Resend — recordatorios de audiencias por correo")
    p("Resend es el servicio que envía, cada mañana y de forma automática, el correo de "
      "recordatorio con las audiencias y plazos del día siguiente. Trabaja junto con una "
      "función programada dentro de Supabase (no requiere que usted haga nada a diario).")
    h2("Cómo entrar")
    stp([
        "Vaya a resend.com y pulse «Sign in» (Iniciar sesión).",
        "Elija «Continuar con Google» (Continue with Google) e ingrese con SU GMAIL. En Resend "
        "usted inicia sesión directamente con su cuenta de Google, no con usuario y contraseña "
        "propios de Resend.",
        "Si pierde el acceso, recupérelo desde su cuenta de Google (el mismo Gmail).",
    ])
    h2("Para qué lo usará")
    bul([
        "Casi nunca en el día a día: los recordatorios se envían solos.",
        "Para revisar si los correos salieron (sección «Emails» / «Logs» de Resend).",
        "Más adelante, para verificar un dominio propio (sección «Domains») y así enviar los "
        "recordatorios a TODOS los abogados en sus propios correos.",
    ])
    h2("Cómo está configurado hoy")
    bul([
        "La clave de Resend (API key) NO se anota aquí: está guardada de forma segura dentro de "
        "Supabase, en «Edge Functions → Secrets» (RESEND_API_KEY y MAIL_FROM).",
        "Por ahora, sin un dominio propio verificado, el recordatorio llega solo al correo del "
        "bufete (el dueño de la cuenta), que coordina al equipo.",
        "El envío diario está programado en Supabase → «Integrations → Cron» (trabajo "
        "«LexFive», todos los días a las 07:00 de Bolivia).",
    ])
    note("Importante: en Resend usted ingresa con su GMAIL mediante «Continuar con Google». "
         "Anote en un lugar privado cuál es ese correo exacto. Como también es su llave para "
         "Google, cuide su contraseña y mantenga la verificación en dos pasos activada.", "Su caso")

    # ---------- Correo ----------
    h1("8. Correo del bufete (Gmail)")
    p("El correo del bufete es la pieza central de todo: con él se crearon (o se pueden "
      "recuperar) las cuentas de GitHub, Netlify y Supabase, y a él llegan las consultas de la "
      "web mediante Web3Forms.")
    bul([
        "Entrar en: gmail.com (o el proveedor de correo que use el bufete).",
        "Cuídelo especialmente: quien tenga acceso a este correo podría recuperar las demás "
        "cuentas. Use una contraseña fuerte y, de ser posible, verificación en dos pasos.",
    ])

    # ---------- Panel del sistema ----------
    h1("9. Panel del sistema LexFive")
    p("No es una cuenta externa, pero es donde trabaja el equipo todos los días. Sus usuarios "
      "se administran desde Supabase y desde la propia pestaña «Usuarios» del panel.")
    bul([
        "Sitio público: https://lexfive.netlify.app",
        "Ingreso al panel: https://lexfive.netlify.app/sistema/login.html",
        "Cada abogado, procurador y cliente entra con su propio correo y contraseña.",
    ])

    # ---------- Buenas prácticas ----------
    h1("10. Recomendaciones para no perder los accesos")
    bul([
        "Use SIEMPRE el mismo correo del bufete para todos estos servicios; así son fáciles de "
        "recuperar.",
        "Si entró con «Continuar con Google», entre siempre por esa misma opción (es el caso de "
        "GitHub y de Resend).",
        "Anote en un lugar privado y seguro qué método usó para cada servicio (Google o "
        "correo+contraseña).",
        "Active la verificación en dos pasos al menos en el correo, en GitHub y en Google.",
        "Puede cerrar todas las pestañas con tranquilidad: con esta guía sabrá volver a entrar.",
        "Si un servicio le pide la contraseña y no la recuerda, use «¿Olvidó su contraseña?» "
        "para recibir un enlace de recuperación en el correo del bufete.",
    ])
    sp(6)
    note("Mantenga este documento en un lugar seguro y privado, ya que indica qué cuentas "
         "sostienen el sistema. No incluye contraseñas, pero sí orienta sobre cómo entrar.",
         "Conserve esta guía")

    return B


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    blocks = build_blocks()

    # Personalizar el título del documento (el motor es compartido con el manual)
    M.DOC_TITLE = "Guía de Cuentas y Accesos"
    M.DOC_SUBTITLE = "Servicios que usa el sistema y cómo entrar a cada uno"
    M.DOC_INTRO = ("GitHub, Netlify, Supabase, Web3Forms y el correo del bufete: qué son, para "
                   "qué sirven y cómo ingresar a cada uno.")
    M.DOC_HEADER = "Guía de Cuentas y Accesos"

    pdf_path = os.path.join(root, "Guia-Cuentas-LexFive.pdf")
    md_path = os.path.join(root, "Guia-Cuentas-LexFive.md")
    docx_path = os.path.join(root, "Guia-Cuentas-LexFive.docx")

    pages, pdf_size = M.render_pdf(blocks, pdf_path)
    md_size = M.render_md(blocks, md_path)
    docx_size = M.render_docx(blocks, docx_path)

    print("PDF : %s  (%d páginas, %.1f KB)" % (pdf_path, pages, pdf_size / 1024.0))
    print("MD  : %s  (%.1f KB)" % (md_path, md_size / 1024.0))
    print("DOCX: %s  (%.1f KB)" % (docx_path, docx_size / 1024.0))


if __name__ == "__main__":
    main()
