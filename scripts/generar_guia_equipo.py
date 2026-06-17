#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera la "Guía de uso del sistema LexFive — Equipo" en PDF, Word y Markdown.

Reutiliza el motor de render del manual del sistema (generar_manual.py), por lo
que NO usa dependencias externas y funciona sin internet.

Uso:  python3 scripts/generar_guia_equipo.py
Salidas (en la raíz del repositorio):
  - Guia-Uso-Equipo-LexFive.pdf
  - Guia-Uso-Equipo-LexFive.md
  - Guia-Uso-Equipo-LexFive.docx
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

    # ---------- Introducción ----------
    h1("1. Introducción")
    p("Esta guía explica, paso a paso, cómo usar el sistema LexFive en el día a día. "
      "Está pensada para todo el personal del bufete (administrador, abogados y procuradores). "
      "Incluye las funciones más recientes: notificaciones, registro de horas, estado de cuenta "
      "por cliente, calculadora de plazos, Google Calendar y verificación en dos pasos.")
    bul([
        "El sistema se abre en: lexfive.netlify.app/sistema",
        "Funciona en computadora y celular, y se puede instalar como app (PWA).",
    ])

    # ---------- Acceso ----------
    h1("2. Acceso al sistema")
    h2("Iniciar sesión")
    stp([
        "Abra lexfive.netlify.app/sistema.",
        "Escriba su correo y contraseña y pulse «Entrar».",
        "Si tiene activada la verificación en dos pasos (2FA), se le pedirá un código de 6 "
        "dígitos (ver sección 15).",
    ])
    h2("Olvidé mi contraseña")
    stp([
        "En la pantalla de acceso, pulse «¿Olvidó su contraseña?».",
        "Escriba su correo y pulse «Enviar enlace».",
        "Revise su correo (y la carpeta de spam) y siga el enlace para crear una nueva.",
    ])
    h2("Cerrar sesión")
    bul([
        "Botón «Cerrar sesión» (abajo a la izquierda). Le lleva al sitio web público.",
        "Por seguridad, la sesión se cierra sola tras 10 minutos de inactividad. Lo que esté "
        "escribiendo queda autoguardado y se recupera al volver a entrar.",
    ])
    note("En el celular, instale el sistema como app (menú del navegador → «Instalar app» / "
         "«Agregar a pantalla de inicio»). En iPhone es necesario instalarla para recibir "
         "notificaciones push.", "Instalar como app")

    # ---------- Panel ----------
    h1("3. Panel general (inicio)")
    p("Es la primera pantalla. Muestra de un vistazo el estado del bufete:")
    bul([
        "Tarjetas de resumen: procesos totales, activos, audiencias próximas, mis procesos, "
        "consultas nuevas, tareas pendientes y «Por cobrar». Algunas son clicables.",
        "Alertas de audiencias y plazos: vencidas (rojo) y próximas de 7 días (ámbar).",
        "Gráficos: procesos por estado, por materia y carga por abogado.",
        "Tabla de próximas audiencias y plazos.",
        "Manuales y guías en PDF, tarjeta de Seguridad de la cuenta y (admin) Respaldos.",
    ])

    # ---------- Procesos ----------
    h1("4. Procesos")
    h2("Ver y buscar")
    bul([
        "Menú «Procesos»: use el buscador y los filtros para encontrar un caso.",
        "Búsqueda global con Ctrl/Cmd + K (procesos, clientes y consultas a la vez).",
    ])
    h2("Crear un proceso")
    stp([
        "En «Procesos», pulse «Nuevo proceso».",
        "Complete: carátula, número, NUREJ, materia, tipo, juzgado/entidad, estado, cliente, "
        "parte contraria, abogados y procuradores a cargo, fecha de inicio y próxima audiencia.",
        "Guardar.",
    ])
    h2("Detalle del proceso")
    p("Al hacer clic en un proceso se abre su ficha, con:")
    bul([
        "Datos generales y descripción.",
        "Memoriales y documentos: suba archivos del caso (PDF, Word, imágenes; máx. 10 MB).",
        "Historial de actuaciones: registre cada paso del caso en orden y adjunte archivos "
        "(respuesta del juzgado, nuevo memorial...). El cliente lo ve en su portal.",
        "Botones: Editar, Plazos, Honorarios, Horas y Eliminar (admin).",
    ])

    # ---------- Plazos ----------
    h1("5. Plazos, audiencias y calculadora")
    p("Desde el detalle del proceso, botón «Plazos».")
    h2("Registrar un plazo o audiencia")
    stp([
        "Complete Título (ej. «Audiencia preliminar»), Tipo (audiencia/plazo/reunión/otro), "
        "Fecha y hora, y una nota opcional.",
        "Pulse «Agregar plazo». Aparecerá en la Agenda y se podrá exportar al calendario.",
        "Marque «Cumplido» cuando ya pasó, o elimínelo si fue un error.",
    ])
    h2("Calculadora de plazos (días hábiles)")
    stp([
        "En la misma ventana, sección «Calculadora de plazo (días hábiles)».",
        "Indique la fecha base y los días hábiles (omite sábados y domingos; no incluye feriados).",
        "Pulse «Calcular vencimiento» para ver la fecha resultante.",
        "Pulse «Usar en el plazo» para colocar esa fecha en el formulario.",
    ])

    # ---------- Agenda ----------
    h1("6. Agenda y calendario")
    p("Menú «Agenda»: calendario mensual con todas las audiencias y plazos.")
    bul([
        "Navegue con las flechas; botón «Hoy» para volver al mes actual.",
        "Colores: rojo = vencido, ámbar = dentro de 7 días.",
        "Cada evento tiene dos botones: «.ics» (abrir en cualquier calendario) y «Google» "
        "(agregarlo a Google Calendar en un clic, útil para que el teléfono avise).",
    ])

    # ---------- Recordatorios ----------
    h1("7. Recordatorios (WhatsApp, correo y push)")
    h2("Manual (cuando usted quiera)")
    bul([
        "En el Panel (alertas) o en la lista de audiencias, pulse «Recordar».",
        "Se abre una ventana con botones para enviar por WhatsApp a cada abogado, y un botón "
        "para enviar por correo a todo el personal de una vez.",
    ])
    h2("Automático (todos los días, sin abrir nada)")
    bul([
        "Cada mañana el sistema envía a cada abogado sus audiencias y plazos del día siguiente, "
        "por correo y por notificación push.",
        "Para recibir las push, cada persona debe activarlas una vez en su dispositivo (sección 15).",
    ])

    # ---------- Honorarios ----------
    h1("8. Honorarios, pagos y estado de cuenta")
    h2("Por proceso")
    bul([
        "Detalle del proceso, botón «Honorarios»: registre honorarios (cargos) y pagos.",
        "Vea el saldo (honorarios − pagos) y genere el recibo de un pago.",
    ])
    h2("Vista general (menú «Honorarios»)")
    bul([
        "Tarjetas con total facturado, cobrado y por cobrar.",
        "Conmutador «Por proceso / Por cliente».",
        "Por cliente (estado de cuenta): suma de todos los procesos del cliente con su saldo "
        "total, botón «Recordar cobro» (WhatsApp o correo) y exportación a Excel.",
    ])

    # ---------- Horas ----------
    h1("9. Registro de horas")
    p("Para anotar el tiempo dedicado a cada caso (sustento de facturación). Solo admin y abogado.")
    stp([
        "Entre al detalle del proceso, botón «Horas».",
        "Indique las horas (acepta decimales, ej. 1.5), la fecha y una descripción.",
        "Pulse «Registrar horas». Verá el total de horas del proceso y el historial.",
    ])

    # ---------- Clientes ----------
    h1("10. Clientes")
    bul([
        "Menú «Clientes»: lista, búsqueda y exportación a Excel.",
        "Nuevo cliente: nombre, documento, teléfono/WhatsApp, correo, dirección y notas.",
        "Importante: si el cliente se registra en el portal con ESE MISMO correo, verá "
        "automáticamente sus procesos.",
    ])

    # ---------- Tareas ----------
    h1("11. Tareas")
    bul([
        "Menú «Tareas»: tablero de pendientes del equipo.",
        "Cree una tarea con título, responsable, prioridad y fecha de vencimiento.",
        "Mueva su estado: Pendiente → En progreso → Hecha (o reábrala). Las vencidas en rojo.",
    ])

    # ---------- Plantillas ----------
    h1("12. Modelos y plantillas de memoriales")
    h2("Plantillas (rellenado automático)")
    bul([
        "Menú «Plantillas»: cree textos modelo con campos entre llaves, ej. {{cliente}}, "
        "{{caratula}}, {{nurej}}, {{juzgado}}.",
        "Al usar la plantilla sobre un proceso, el sistema rellena esos campos con los datos "
        "reales. Los campos sin dato quedan como ______ para completar a mano.",
        "Puede imprimir / exportar a PDF el memorial generado.",
    ])
    h2("Modelos")
    bul(["Menú «Modelos»: biblioteca de memoriales de referencia para el equipo."])

    # ---------- Consultas / Reportes / Credenciales ----------
    h1("13. Consultas, Reportes y Credenciales")
    bul([
        "Consultas: mensajes del formulario de contacto de la web; las nuevas salen en el Panel.",
        "Reportes: estadísticas de procesos por estado, materia y abogado, por período (PDF).",
        "Credenciales (admin y abogado): carnets del personal con QR, listos para imprimir.",
    ])

    # ---------- Seguridad ----------
    h1("14. Seguridad: 2FA y notificaciones")
    p("Ambas se gestionan en Panel → tarjeta «Seguridad de la cuenta».")
    h2("Verificación en dos pasos (2FA)")
    stp([
        "Pulse «Verificación en dos pasos» → «Activar».",
        "Con una app de autenticación (Google Authenticator, Microsoft Authenticator o Authy), "
        "escanee el código QR (o ingrese la clave manualmente).",
        "Escriba el código de 6 dígitos que muestra la app y pulse «Activar».",
        "Desde ahí, al iniciar sesión se le pedirá ese código. Para quitarlo: «Desactivar 2FA».",
    ])
    h2("Notificaciones push")
    stp([
        "Pulse «Notificaciones» → «Activar» y acepte el permiso del navegador.",
        "Pulse «Enviar prueba» para confirmar que llegan.",
        "Para dejar de recibirlas en ese equipo: «Desactivar».",
    ])
    note("Si no aparece la prueba: en Windows, active las notificaciones del sistema y apague "
         "«No molestar»; en el navegador, permita las notificaciones del sitio (candado junto a "
         "la dirección). En Brave, active brave://settings/privacy → «Usar los servicios de "
         "Google para la mensajería push» y reinicie Brave (en Chrome/Edge funciona sin "
         "configurar). En iPhone, instale primero la app en la pantalla de inicio (iOS 16.4+).",
         "Si no llegan las notificaciones")
    note("Las notificaciones push llegan al navegador/dispositivo donde las activó (computadora "
         "y/o celular). NO llegan a WhatsApp: WhatsApp es un envío aparte y manual. Además del "
         "push, el sistema envía cada mañana un correo automático con lo mismo.",
         "¿Adónde llegan?")

    # ---------- Admin ----------
    h1("15. Solo administrador")
    bul([
        "Usuarios: crear/editar el personal y asignar su rol (admin, procurador, abogado).",
        "Categorías: áreas del derecho usadas en los procesos.",
        "Testimonios: opiniones de clientes que se muestran en la web.",
        "Blog: publicar artículos en el sitio público.",
        "Auditoría: bitácora de acciones del sistema.",
        "Papelera: procesos y clientes eliminados (se pueden restaurar).",
        "Respaldos (Panel): «Exportar respaldo (JSON)»; además la base se respalda automáticamente "
        "cada día en GitHub.",
    ])

    # ---------- FAQ ----------
    h1("16. Preguntas frecuentes")
    h2("El sistema se queda en «Cargando...»")
    p("Recargue con Ctrl+Shift+R. Si la base estaba «dormida», el sistema reintenta solo; "
      "también puede usar el botón «Reintentar ahora» que aparece.")
    h2("No me llegan las notificaciones push")
    p("Revise la sección 14 (permisos de Windows y del navegador). En iPhone, instale la app.")
    h2("Un cliente no ve sus procesos en el portal")
    p("Verifique que el correo del cliente en su ficha sea el mismo con el que se registró en el portal.")
    h2("¿Dónde están los manuales en PDF?")
    p("En el Panel → «Manuales y guías» (sistema, abogados y clientes).")
    sp(6)
    note("Esta guía está enfocada en el uso diario del equipo. Para temas técnicos consulte "
         "también el Manual del Sistema, MANTENIMIENTO-SETUP y RECORDATORIOS-SETUP.",
         "Conserve esta guía")

    return B


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    blocks = build_blocks()

    M.DOC_TITLE = "Guía de uso para el equipo"
    M.DOC_SUBTITLE = "Cómo usar el sistema LexFive en el día a día"
    M.DOC_INTRO = ("Acceso, procesos, plazos, agenda, recordatorios, honorarios, registro de "
                   "horas, 2FA y notificaciones: todo explicado paso a paso.")
    M.DOC_HEADER = "Guía de uso para el equipo"

    pdf_path = os.path.join(root, "Guia-Uso-Equipo-LexFive.pdf")
    md_path = os.path.join(root, "Guia-Uso-Equipo-LexFive.md")
    docx_path = os.path.join(root, "Guia-Uso-Equipo-LexFive.docx")

    pages, pdf_size = M.render_pdf(blocks, pdf_path)
    md_size = M.render_md(blocks, md_path)
    docx_size = M.render_docx(blocks, docx_path)

    print("PDF : %s  (%d páginas, %.1f KB)" % (pdf_path, pages, pdf_size / 1024.0))
    print("MD  : %s  (%.1f KB)" % (md_path, md_size / 1024.0))
    print("DOCX: %s  (%.1f KB)" % (docx_path, docx_size / 1024.0))


if __name__ == "__main__":
    main()
