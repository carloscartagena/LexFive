#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador del "Manual del Sistema LexFive".

A partir de un ÚNICO modelo de contenido (lista de bloques) produce tres
formatos, siempre sincronizados:

  - Manual-Sistema-LexFive.pdf    (PDF con portada, logo en cada página
                                    e índice con números de página)
  - Manual-Sistema-LexFive.md     (Markdown editable)
  - Manual-Sistema-LexFive.docx   (Word editable)

No usa dependencias externas: el PDF se construye a mano con las fuentes
estándar (Helvetica / Helvetica-Bold) y el .docx con la librería estándar
(zipfile). Funciona sin internet.

Uso:  python3 scripts/generar_manual.py
"""

import os
import zipfile
import time

VERSION = "junio de 2026"
SITIO = "lexfive.netlify.app"

# ============================================================
#  MODELO DE CONTENIDO (bloques)
#  Tipos: ('h1',txt) ('h2',txt) ('p',txt) ('bullets',[..])
#         ('steps',[..]) ('note',txt,titulo) ('spacer',h)
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

    h1("1. Introducción: qué es el sistema")
    p("LexFive cuenta con dos partes que trabajan juntas:")
    bul([
        "La página web pública (%s): presenta al bufete, sus áreas de práctica, "
        "casos de éxito, blog, preguntas frecuentes y un formulario de contacto." % SITIO,
        "El panel de gestión (parte privada, en /sistema): donde el personal administra "
        "procesos, clientes, consultas, modelos de memoriales, blog y testimonios.",
    ])
    p("Toda la información se guarda de forma segura en una base de datos en la nube "
      "(Supabase). El panel y la web comparten esa base de datos: por ejemplo, un artículo "
      "que se publica en el panel aparece automáticamente en el blog, y una consulta enviada "
      "desde la web llega a la bandeja de Consultas del panel.")
    note("Para usar el panel necesita un usuario y contraseña. Para navegar la web pública "
         "no se necesita iniciar sesión.", "Importante")

    h1("2. Roles y permisos")
    p("Cada usuario tiene un rol que define lo que puede ver y hacer:")
    bul([
        "Administrador: acceso total. Gestiona usuarios, roles, auditoría, testimonios y "
        "puede eliminar registros (procesos, clientes, consultas).",
        "Abogado: gestiona procesos, clientes, consultas, modelos y blog. No accede a "
        "usuarios ni a la auditoría.",
        "Procurador: similar al abogado, enfocado en el seguimiento de los procesos.",
        "Cliente: solo ve sus propios procesos y puede dejar su opinión. No ve información "
        "del bufete ni de otros clientes.",
    ])
    note("La separación de roles protege la información: los clientes nunca ven datos "
         "internos, y solo el administrador puede borrar registros o cambiar roles.",
         "Seguridad")

    h1("3. Acceso al sistema (ingreso y registro)")
    h2("Ingresar al panel")
    stp([
        "Abra la dirección del panel: %s/sistema/login.html" % SITIO,
        "Escriba su correo y contraseña y pulse «Ingresar».",
        "Según su rol, verá el panel del bufete o el portal del cliente.",
    ])
    h2("Registro de clientes")
    p("Un cliente puede crear su cuenta desde la misma pantalla de acceso, en la pestaña de "
      "registro: ingresa nombre, apellido, correo, teléfono y una contraseña (mínimo 6 "
      "caracteres). Sus procesos se vinculan automáticamente por el correo, así que debe "
      "registrarse con el mismo correo que dejó en el bufete.")
    h2("Cierre de sesión y seguridad")
    bul([
        "La sesión se cierra sola tras 10 minutos de inactividad, por seguridad.",
        "Use el botón «Cerrar sesión» al terminar, sobre todo en equipos compartidos.",
        "Si olvidó su contraseña, solicite ayuda al administrador del sistema.",
    ])

    h1("4. Panel general (Dashboard)")
    p("Es la primera pantalla del personal. Muestra un resumen con tarjetas (métricas) y "
      "accesos rápidos:")
    bul([
        "Procesos totales y procesos activos.",
        "Audiencias próximas.",
        "Mis procesos: los casos en los que usted está asignado.",
        "Consultas nuevas: mensajes del formulario web aún sin atender. Al hacer clic en esta "
        "tarjeta se abre directamente la bandeja de Consultas.",
    ])

    h1("5. Procesos (casos)")
    p("La pestaña «Procesos» es el corazón del sistema. Allí se registra y da seguimiento a "
      "cada caso.")
    h2("Crear o editar un proceso")
    stp([
        "Pulse «Nuevo proceso» (o haga clic sobre un proceso existente para editarlo).",
        "Complete los datos: carátula, número/NUREJ, materia, estado, parte contraria y la "
        "próxima audiencia. En «Materia» puede elegir «Crear nueva categoría...» para agregar "
        "un área del derecho que no esté en la lista; quedará disponible en todo el sistema.",
        "Asigne uno o varios abogados y procuradores a cargo.",
        "Vincule un cliente existente o registre uno nuevo directamente desde el formulario.",
        "Guarde. El proceso queda registrado y visible para el equipo asignado.",
    ])
    h2("Documentos y actuaciones")
    bul([
        "Dentro del detalle de un proceso puede subir documentos (memoriales, notificaciones, "
        "etc.) y descargarlos cuando los necesite.",
        "Puede registrar actuaciones con fecha y descripción para llevar la bitácora del caso.",
    ])
    note("Solo el administrador puede eliminar un proceso de forma definitiva. La eliminación "
         "no se puede deshacer.", "Cuidado")

    h1("6. Clientes")
    p("En «Clientes» se administra la cartera de personas o empresas atendidas.")
    bul([
        "Cree o edite un cliente con su nombre/razón social, documento (CI/NIT), teléfono, "
        "correo, dirección y notas.",
        "El correo es clave: es lo que permite que, al registrarse en el portal, el cliente "
        "vea sus propios procesos.",
        "Use el buscador para encontrar un cliente por nombre, documento, correo o teléfono.",
    ])

    h1("7. Bandeja de Consultas")
    p("Cada mensaje enviado desde el formulario de contacto de la web pública llega a esta "
      "bandeja (y, si el correo está configurado, también se envía una copia por correo). Así "
      "ninguna consulta se pierde.")
    h2("Cómo trabajar las consultas")
    stp([
        "Abra la pestaña «Consultas». Verá la lista ordenada de la más reciente a la más antigua.",
        "Use el buscador o el filtro por estado (Nuevas, Atendidas, Archivadas).",
        "Haga clic en una consulta para ver el mensaje completo y los datos de contacto.",
        "Responda con un toque: botón «Responder por WhatsApp» o «Responder por correo».",
        "Marque la consulta como «Atendida» cuando la haya gestionado, o «Archivar» si ya no es "
        "relevante. Puede volver a marcarla como «Nueva» si lo necesita.",
    ])
    bul([
        "Estados: Nueva (recién llegada), Atendida (ya gestionada) y Archivada.",
        "Todo el personal puede ver y gestionar las consultas; solo el administrador puede "
        "eliminarlas.",
    ])
    note("Si la pestaña «Consultas» no aparece o da error, es porque falta ejecutar una sola "
         "vez el script db/06_consultas.sql en Supabase. Vea la sección 15.",
         "Si no ve la bandeja")

    h1("8. Modelos de memoriales")
    p("Una biblioteca reutilizable de plantillas (Word, PDF, imágenes, etc.) para el equipo, "
      "organizada por área del derecho.")
    h2("Subir modelos")
    stp([
        "Elija el «Área del derecho» (Laboral, Civil, Penal, Familia, etc.).",
        "Si necesita un área que no está en la lista, elija «Crear nueva categoría...», "
        "escriba su nombre y quedará disponible al instante en todo el sistema (procesos y "
        "modelos).",
        "Suba varios archivos a la vez, o una carpeta completa: todos quedarán clasificados "
        "en el área elegida.",
        "Si sube un solo archivo puede ponerle un nombre; si sube varios o una carpeta, se "
        "usa el nombre de cada archivo.",
        "Pulse «Subir al área seleccionada»; una barra indica el avance.",
    ])
    h2("Biblioteca")
    bul([
        "Los modelos se muestran agrupados por área, con un contador por cada una.",
        "Filtre por área o use el buscador por nombre.",
        "Descargue cualquier modelo cuando lo necesite, o elimínelo si ya no sirve.",
    ])

    h1("9. Blog")
    p("Permite publicar artículos jurídicos que aparecen en la página pública (blog.html).")
    stp([
        "Pulse «Nuevo artículo».",
        "Escriba el título, la categoría, un resumen y el contenido.",
        "Elija el estado: «Borrador» (no se publica) o «Publicado» (aparece en la web).",
        "Guarde. Los artículos publicados se muestran automáticamente en el blog público.",
    ])
    note("Cada artículo lo edita su autor o un administrador. Así se respeta la autoría del "
         "contenido.", "Autoría")

    h1("10. Testimonios")
    p("Los clientes pueden dejar su opinión desde su portal. El administrador las modera antes "
      "de que aparezcan en la web:")
    bul([
        "Aprobar: el testimonio se publica en la página de inicio.",
        "Rechazar: no se publica (el cliente puede editarlo y reenviarlo).",
        "Eliminar: quita el testimonio definitivamente.",
    ])

    h1("11. Usuarios (administrador)")
    p("Solo el administrador ve esta pestaña. Sirve para gestionar al personal:")
    bul([
        "Cambiar el rol de un usuario (administrador, abogado, procurador o cliente).",
        "Activar o desactivar cuentas. No es posible desactivar la propia cuenta.",
    ])

    h1("12. Categorías / áreas del derecho (administrador)")
    p("Las áreas del derecho (Laboral, Civil, Penal, etc.) clasifican los procesos y los "
      "modelos de memoriales. Esta pestaña permite administrarlas:")
    bul([
        "Crear una categoría nueva: aparece al instante en las listas de Procesos y Modelos.",
        "Renombrar una categoría: los procesos y modelos que la usaban se actualizan "
        "automáticamente, sin perder su clasificación.",
        "Eliminar una categoría: solo es posible si no está en uso (la tabla muestra cuántos "
        "procesos y modelos usan cada una).",
    ])
    note("También puede crear una categoría sobre la marcha desde los formularios de Procesos "
         "y de Modelos, eligiendo «Crear nueva categoría...» en el selector de área.",
         "Atajo")

    h1("13. Auditoría (administrador)")
    p("Es la bitácora del sistema. Registra las acciones importantes (quién creó, editó o "
      "eliminó algo, cambios de rol, moderación de testimonios, etc.), con fecha, usuario y "
      "detalle. Útil para control interno y transparencia.")

    h1("14. Portal del cliente")
    p("Cuando un cliente inicia sesión, ve una versión reducida y privada:")
    bul([
        "Mis procesos: el listado de sus casos, su estado y la próxima audiencia, además de un "
        "botón para consultar por WhatsApp.",
        "Mi opinión: un formulario para calificar el servicio y dejar un comentario, que el "
        "bufete revisa antes de publicarlo.",
    ])

    h1("15. La página web pública")
    p("Es la cara del bufete hacia los clientes. Incluye:")
    bul([
        "Inicio, Áreas de práctica, Nosotros (equipo), Casos de éxito, Blog y Preguntas "
        "frecuentes.",
        "Sección «Contáctenos» con el formulario (que llega a la bandeja de Consultas) y la "
        "opción de escribir por WhatsApp a un abogado específico.",
        "Botón flotante de WhatsApp que abre un menú con los cinco abogados.",
        "Páginas legales: Aviso de privacidad y Términos y condiciones, enlazadas en el pie de "
        "página.",
    ])
    note("La barra superior y el pie ya no muestran correos ni teléfonos personales: el canal "
         "principal es el formulario y, de forma directa, el WhatsApp de cada abogado.",
         "Privacidad del equipo")

    h1("16. Configuración técnica (Supabase y despliegue)")
    p("Esta sección es para quien administra la parte técnica.")
    h2("Base de datos (Supabase)")
    p("En la carpeta db/ del repositorio están los scripts SQL. Se ejecutan UNA sola vez, en "
      "orden, en el SQL Editor de Supabase:")
    bul([
        "schema.sql — tablas base, reglas de acceso por rol y almacenamiento de documentos.",
        "02_portal_clientes.sql — rol cliente y aislamiento de datos.",
        "03_blog_alertas_testimonios.sql — blog, alertas y testimonios.",
        "04_modelos_nurej.sql — biblioteca de modelos y campo NUREJ.",
        "05_multiples_abogados.sql — varios abogados/procuradores por proceso.",
        "06_consultas.sql — bandeja de Consultas (formulario de contacto).",
        "07_sync_clientes.sql — crea la ficha de cliente al registrarse en el portal.",
        "08_categorias.sql — áreas del derecho dinámicas (crear categorías desde el panel).",
    ])
    h2("Conexión y correo")
    bul([
        "La conexión a Supabase está en sistema/js/config.js (URL y clave pública).",
        "El aviso por correo de las consultas usa Web3Forms; la clave está en el formulario de "
        "contacto de index.html.",
    ])
    h2("Despliegue (publicar cambios)")
    p("El sitio se publica con Netlify, conectado al repositorio de GitHub. Al subir cambios a "
      "la rama principal (main), Netlify vuelve a publicar el sitio automáticamente en uno o "
      "dos minutos.")

    h1("17. Cómo agregar un nuevo abogado")
    stp([
        "En Supabase, vaya a Authentication → Users → Add user, y cree la cuenta con su correo "
        "(o pídale que se registre desde la pantalla de acceso).",
        "Ingrese al panel como administrador y abra la pestaña «Usuarios».",
        "Busque al nuevo usuario y cámbiele el rol a «Abogado» o «Procurador».",
        "Listo: ya podrá ingresar y trabajar según su rol.",
    ])

    h1("18. Mantenimiento y buenas prácticas")
    bul([
        "Cada persona debe tener su propia cuenta; no comparta usuarios ni contraseñas.",
        "Use contraseñas robustas y cámbielas periódicamente.",
        "Cierre sesión en equipos compartidos.",
        "Revise la bandeja de Consultas a diario para no dejar clientes sin respuesta.",
        "Mantenga al día los estados de los procesos y las próximas audiencias.",
        "Supabase guarda los datos en la nube; aun así, conviene exportar respaldos periódicos "
        "desde el panel de Supabase.",
    ])

    h1("19. Solución de problemas frecuentes")
    h2("No veo la pestaña «Consultas» o da error")
    p("Falta ejecutar el script db/06_consultas.sql en Supabase (una sola vez). Si el error "
      "menciona una columna que no existe, vuelva a ejecutar el script, que está preparado "
      "para completar la tabla sin borrar datos.")
    h2("Envié una consulta de prueba y no aparece")
    bul([
        "Verifique que el sitio ya tenga publicada la última versión (Netlify).",
        "Confirme que sistema/js/config.js tiene la URL y la clave de Supabase correctas.",
        "Revise el filtro de estado en la bandeja (puede estar en «Atendidas»).",
    ])
    h2("No puedo iniciar sesión")
    bul([
        "Revise que el correo y la contraseña sean correctos.",
        "Si la cuenta fue desactivada, pida al administrador que la reactive en «Usuarios».",
    ])
    h2("Un cliente no ve sus procesos")
    p("Debe haberse registrado con el mismo correo que figura en su ficha de cliente y en sus "
      "procesos. Verifique el correo en la pestaña «Clientes».")

    h1("20. Soporte")
    p("Ante cualquier duda sobre el uso del sistema, contacte al administrador del bufete. "
      "Para cambios o mejoras en la web o el panel, conserve este manual como referencia y "
      "describa con el mayor detalle posible lo que necesita.")
    sp(8)
    note("Este manual describe el funcionamiento del sistema a la fecha indicada en la portada. "
         "Si el sistema se actualiza, solicite una versión nueva del manual.", "Versión")

    return B


# ============================================================
#  Métricas de fuente (Helvetica y Helvetica-Bold) - unidades/1000
# ============================================================
_HELV_ASCII = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,
    556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,
    722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,
    667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,
    222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,
    260,334,584]
_BOLD_ASCII = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,
    556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,
    722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,
    667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,
    278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,
    280,389,584]
_EXTRA_HELV = {'á':556,'é':556,'í':278,'ó':556,'ú':556,'ñ':556,'ü':556,
    'Á':667,'É':667,'Í':278,'Ó':778,'Ú':722,'Ñ':722,'Ü':722,'¿':556,'¡':333,
    '°':400,'–':556,'—':1000,'·':278,'«':556,'»':556,'“':556,'”':556,'‘':222,
    '’':222,'•':350,'…':1000}
_EXTRA_BOLD = {'á':556,'é':556,'í':278,'ó':611,'ú':611,'ñ':611,'ü':611,
    'Á':722,'É':667,'Í':278,'Ó':778,'Ú':722,'Ñ':722,'Ü':722,'¿':611,'¡':333,
    '°':400,'–':556,'—':1000,'·':278,'«':556,'»':556,'“':556,'”':556,'‘':238,
    '’':238,'•':350,'…':1000}

def _wtab(ascii_widths, extra):
    d = {chr(32 + i): w for i, w in enumerate(ascii_widths)}
    d.update(extra)
    return d

W = {'F1': _wtab(_HELV_ASCII, _EXTRA_HELV),
     'F2': _wtab(_BOLD_ASCII, _EXTRA_BOLD)}

# Colores
NAVY = (0.055, 0.106, 0.173)
GOLD = (0.760, 0.635, 0.353)
GOLD_D = (0.659, 0.522, 0.235)
INK = (0.102, 0.137, 0.188)
MUTED = (0.361, 0.400, 0.459)
WHITE = (1, 1, 1)
NOTE_BG = (0.965, 0.957, 0.937)
DOTS = (0.80, 0.82, 0.85)

# Página A4
PW, PH = 595.276, 841.890
ML, MR, MT, MB = 56, 56, 70, 58
CW = PW - ML - MR
TOP = PH - MT
BOTTOM = MB + 14


def tw(s, size, font):
    table = W[font]
    return sum(table.get(ch, 556) for ch in s) * size / 1000.0


def wrap(s, size, font, maxw):
    out = []
    for para in s.split('\n'):
        cur = ''
        for w in para.split(' '):
            trial = w if not cur else cur + ' ' + w
            if tw(trial, size, font) <= maxw:
                cur = trial
            else:
                if cur:
                    out.append(cur)
                cur = w
        out.append(cur)
    return out


def _esc(s):
    b = s.encode('cp1252', 'replace')
    r = bytearray()
    for byte in b:
        if byte in (0x5c, 0x28, 0x29):
            r.append(0x5c)
        r.append(byte)
    return bytes(r)


# ============================================================
#  RENDERIZADOR PDF
# ============================================================
class PDF:
    def __init__(self):
        self.pages = []
        self.cur = None
        self.y = TOP
        self.content_no = 0
        self.section_pages = {}

    def add_cover_page(self):
        self.cur = bytearray()
        self.pages.append(self.cur)
        self._rect(0, 0, PW, PH, NAVY)
        bx, by = ML, PH - 190
        self._rect(bx, by, 66, 66, GOLD)
        self._txt(bx + 33, by + 23, "L5", 'F2', 27, NAVY, 'center')
        self._txt(ML, PH - 252, "LexFive", 'F2', 42, WHITE)
        self._txt(ML + 3, PH - 274, "A B O G A D O S", 'F1', 12, GOLD)
        self._rect(ML, PH - 302, 120, 3, GOLD)
        self._txt(ML, PH - 362, "Manual del Sistema", 'F2', 30, WHITE)
        self._txt(ML, PH - 394, "Guía completa de uso y gestión", 'F1', 14, GOLD)
        sub = ("Sitio web público, panel de gestión de procesos, bandeja de consultas y "
               "portal del cliente.")
        for i, ln in enumerate(wrap(sub, 11, 'F1', CW - 120)):
            self._txt(ML, PH - 432 - i * 16, ln, 'F1', 11, (0.78, 0.82, 0.88))
        self._txt(ML, 92, "Versión del manual: %s" % VERSION, 'F1', 10, (0.7, 0.74, 0.8))
        self._txt(ML, 74, "Sitio: %s" % SITIO, 'F1', 10, (0.7, 0.74, 0.8))

    def add_content_page(self):
        self.cur = bytearray()
        self.pages.append(self.cur)
        self.content_no += 1
        self.y = TOP
        bx, by = ML, PH - 54
        self._rect(bx, by, 18, 18, GOLD)
        self._txt(bx + 9, by + 5, "L5", 'F2', 9, NAVY, 'center')
        self._txt(bx + 26, by + 5, "LexFive Abogados", 'F2', 9.5, NAVY)
        self._txt(PW - MR, by + 5, "Manual del Sistema", 'F1', 8.5, MUTED, 'right')
        self._rule(ML, PH - 60, CW, GOLD, 0.8)
        self._rule(ML, MB + 4, CW, (0.9, 0.9, 0.9), 0.6)
        self._txt(PW / 2, MB - 6, "Página %d" % self.content_no, 'F1', 8, MUTED, 'center')

    def _rect(self, x, y, w, h, c):
        self.cur += b"%.3f %.3f %.3f rg\n%.2f %.2f %.2f %.2f re\nf\n" % (c[0], c[1], c[2], x, y, w, h)

    def _rule(self, x, y, w, c, t=1.0):
        self.cur += b"%.3f %.3f %.3f RG\n%.2f w\n%.2f %.2f m %.2f %.2f l S\n" % (
            c[0], c[1], c[2], t, x, y, x + w, y)

    def _txt(self, x, y, s, font, size, c, align='left'):
        if align == 'right':
            x -= tw(s, size, font)
        elif align == 'center':
            x -= tw(s, size, font) / 2.0
        self.cur += b"%.3f %.3f %.3f rg\nBT\n/%s %.2f Tf\n%.2f %.2f Td\n(" % (
            c[0], c[1], c[2], font.encode(), size, x, y)
        self.cur += _esc(s) + b") Tj\nET\n"

    def _need(self, h):
        if self.cur is None or self.y - h < BOTTOM:
            self.add_content_page()

    def h1(self, s):
        self._need(64)
        self.y -= 30
        self.section_pages[s] = self.content_no
        self._txt(ML, self.y, s, 'F2', 16, NAVY)
        self.y -= 8
        self._rule(ML, self.y, CW, GOLD, 1.2)
        self.y -= 12

    def h2(self, s):
        self._need(34)
        self.y -= 22
        self._txt(ML, self.y, s, 'F2', 12, NAVY)
        self.y -= 6

    def p(self, s, size=10.5, leading=14.5, gap=7, x=ML, maxw=None):
        if maxw is None:
            maxw = CW - (x - ML)
        for ln in wrap(s, size, 'F1', maxw):
            self.y -= leading
            self._need(0)
            if self.y == TOP:
                self.y -= leading
            self._txt(x, self.y, ln, 'F1', size, INK)
        self.y -= gap

    def bullets(self, items, size=10.5, leading=14.5):
        for it in items:
            first = True
            for ln in wrap(it, size, 'F1', CW - 18):
                self.y -= leading
                self._need(0)
                if self.y == TOP:
                    self.y -= leading
                if first:
                    self._txt(ML + 4, self.y, "•", 'F2', 10.5, GOLD_D)
                    first = False
                self._txt(ML + 18, self.y, ln, 'F1', size, INK)
            self.y -= 2
        self.y -= 5

    def steps(self, items, size=10.5, leading=14.5):
        for i, it in enumerate(items, 1):
            first = True
            for ln in wrap(it, size, 'F1', CW - 24):
                self.y -= leading
                self._need(0)
                if self.y == TOP:
                    self.y -= leading
                if first:
                    self._txt(ML + 2, self.y, "%d." % i, 'F2', size, NAVY)
                    first = False
                self._txt(ML + 22, self.y, ln, 'F1', size, INK)
            self.y -= 3
        self.y -= 5

    def note(self, s, title):
        size, leading, pad = 10, 13.5, 9
        lines = wrap(s, size, 'F1', CW - 2 * pad - 8)
        h = pad * 2 + (len(lines) + 1) * leading
        self._need(h + 10)
        top = self.y
        bottom = top - h
        self._rect(ML, bottom, CW, h, NOTE_BG)
        self._rect(ML, bottom, 4, h, GOLD)
        ty = top - pad - leading + 3
        self._txt(ML + pad + 6, ty, title, 'F2', size, GOLD_D)
        for ln in lines:
            ty -= leading
            self._txt(ML + pad + 6, ty, ln, 'F1', size, INK)
        self.y = bottom - 10

    def toc(self, entries, pagemap):
        for e in entries:
            self.y -= 18
            self._need(0)
            if self.y == TOP:
                self.y -= 18
            self._txt(ML + 4, self.y, e, 'F1', 10.5, INK)
            if pagemap and e in pagemap:
                num = str(pagemap[e])
                self._txt(PW - MR, self.y, num, 'F1', 10.5, MUTED, 'right')
                lx = ML + 6 + tw(e, 10.5, 'F1') + 6
                rx = PW - MR - tw(num, 10.5, 'F1') - 6
                dw = tw('.', 10.5, 'F1')
                if rx > lx and dw > 0:
                    self._txt(lx, self.y, '.' * int((rx - lx) / dw), 'F1', 10.5, DOTS)

    def build(self):
        objs = {}
        objs[1] = b"<< /Type /Catalog /Pages 2 0 R >>"
        objs[3] = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
        objs[4] = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
        res = b"<< /Font << /F1 3 0 R /F2 4 0 R >> /ProcSet [/PDF /Text] >>"
        num = 5
        refs = []
        for ops in self.pages:
            content = bytes(ops)
            objs[num] = b"<< /Length %d >>\nstream\n" % len(content) + content + b"\nendstream"
            objs[num + 1] = (b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.2f %.2f] "
                             b"/Resources %s /Contents %d 0 R >>" % (PW, PH, res, num))
            refs.append(num + 1)
            num += 2
        kids = b"[" + b" ".join(b"%d 0 R" % r for r in refs) + b"]"
        objs[2] = b"<< /Type /Pages /Kids %s /Count %d >>" % (kids, len(refs))
        out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
        offs = {}
        for n in range(1, num):
            offs[n] = len(out)
            out += b"%d 0 obj\n" % n + objs[n] + b"\nendobj\n"
        xref = len(out)
        out += b"xref\n0 %d\n0000000000 65535 f \n" % num
        for n in range(1, num):
            out += b"%010d 00000 n \n" % offs[n]
        out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (num, xref)
        return bytes(out)


def _render_pdf_once(blocks, pagemap):
    doc = PDF()
    doc.add_cover_page()
    doc.add_content_page()
    doc.h1("Contenido")
    doc.toc([b[1] for b in blocks if b[0] == 'h1'], pagemap)
    doc.add_content_page()  # el contenido empieza en una página propia
    for b in blocks:
        t = b[0]
        if t == 'h1':
            doc.h1(b[1])
        elif t == 'h2':
            doc.h2(b[1])
        elif t == 'p':
            doc.p(b[1])
        elif t == 'bullets':
            doc.bullets(b[1])
        elif t == 'steps':
            doc.steps(b[1])
        elif t == 'note':
            doc.note(b[1], b[2])
        elif t == 'spacer':
            doc.y -= b[1]
    return doc


def render_pdf(blocks, path):
    first = _render_pdf_once(blocks, None)     # pasada 1: descubre páginas
    final = _render_pdf_once(blocks, first.section_pages)  # pasada 2: con números
    data = final.build()
    with open(path, "wb") as f:
        f.write(data)
    return len(final.pages), len(data)


# ============================================================
#  RENDERIZADOR MARKDOWN
# ============================================================
def render_md(blocks, path):
    out = ["# Manual del Sistema — LexFive Abogados", "",
           "_Guía completa de uso y gestión · Versión: %s · %s_" % (VERSION, SITIO), "",
           "## Contenido", ""]
    for b in blocks:
        if b[0] == 'h1':
            out.append("- " + b[1])
    out.append("")
    for b in blocks:
        t = b[0]
        if t == 'h1':
            out += ["", "## " + b[1]]
        elif t == 'h2':
            out += ["", "### " + b[1]]
        elif t == 'p':
            out += ["", b[1]]
        elif t == 'bullets':
            out.append("")
            out += ["- " + it for it in b[1]]
        elif t == 'steps':
            out.append("")
            out += ["%d. %s" % (i, it) for i, it in enumerate(b[1], 1)]
        elif t == 'note':
            out += ["", "> **%s:** %s" % (b[2], b[1])]
        elif t == 'spacer':
            out.append("")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(out) + "\n")
    return len("\n".join(out))


# ============================================================
#  RENDERIZADOR WORD (.docx) - solo librería estándar
# ============================================================
def _xml(s):
    return (s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            .replace('"', '&quot;'))


def _run(text, bold=False, size=None, color=None, italic=False):
    rpr = ""
    if bold:
        rpr += "<w:b/>"
    if italic:
        rpr += "<w:i/>"
    if color:
        rpr += '<w:color w:val="%s"/>' % color
    if size:
        rpr += '<w:sz w:val="%d"/><w:szCs w:val="%d"/>' % (size, size)
    rpr = "<w:rPr>%s</w:rPr>" % rpr if rpr else ""
    return ('<w:r>%s<w:t xml:space="preserve">%s</w:t></w:r>' % (rpr, _xml(text)))


def _para(runs, before=0, after=80, ind=0, shade=None):
    ppr = "<w:spacing w:before=\"%d\" w:after=\"%d\"/>" % (before, after)
    if ind:
        ppr += '<w:ind w:left="%d"/>' % ind
    if shade:
        ppr += '<w:shd w:val="clear" w:fill="%s"/>' % shade
    return "<w:p><w:pPr>%s</w:pPr>%s</w:p>" % (ppr, "".join(runs))


def render_docx(blocks, path):
    body = []
    body.append(_para([_run("Manual del Sistema — LexFive Abogados", True, 44, "0E1B2C")],
                      before=0, after=60))
    body.append(_para([_run("Guía completa de uso y gestión · Versión: %s · %s"
                            % (VERSION, SITIO), False, 20, "5C6675", italic=True)], after=160))
    body.append(_para([_run("Contenido", True, 30, "0E1B2C")], before=80, after=80))
    for b in blocks:
        if b[0] == 'h1':
            body.append(_para([_run("•  " + b[1], False, 21, "1A2330")], after=20, ind=120))
    for b in blocks:
        t = b[0]
        if t == 'h1':
            body.append(_para([_run(b[1], True, 30, "0E1B2C")], before=200, after=80))
        elif t == 'h2':
            body.append(_para([_run(b[1], True, 24, "16273D")], before=120, after=60))
        elif t == 'p':
            body.append(_para([_run(b[1], False, 21, "1A2330")]))
        elif t == 'bullets':
            for it in b[1]:
                body.append(_para([_run("•  ", True, 21, "A8853C"),
                                   _run(it, False, 21, "1A2330")], after=40, ind=360))
        elif t == 'steps':
            for i, it in enumerate(b[1], 1):
                body.append(_para([_run("%d.  " % i, True, 21, "0E1B2C"),
                                   _run(it, False, 21, "1A2330")], after=40, ind=360))
        elif t == 'note':
            body.append(_para([_run(b[2] + ":  ", True, 20, "A8853C"),
                               _run(b[1], False, 20, "1A2330")],
                              before=60, after=120, ind=120, shade="F6F4ED"))
        elif t == 'spacer':
            body.append(_para([_run("", False, 12)], after=40))

    sectpr = ('<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'
              '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" '
              'w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>')
    document = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
                '<w:body>' + "".join(body) + sectpr + '</w:body></w:document>')

    content_types = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                     '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                     '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                     '<Default Extension="xml" ContentType="application/xml"/>'
                     '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
                     '</Types>')
    rels = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
            '</Relationships>')

    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types)
        z.writestr("_rels/.rels", rels)
        z.writestr("word/document.xml", document)
    return os.path.getsize(path)


# ============================================================
def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    blocks = build_blocks()

    pdf_path = os.path.join(root, "Manual-Sistema-LexFive.pdf")
    md_path = os.path.join(root, "Manual-Sistema-LexFive.md")
    docx_path = os.path.join(root, "Manual-Sistema-LexFive.docx")

    pages, pdf_size = render_pdf(blocks, pdf_path)
    md_size = render_md(blocks, md_path)
    docx_size = render_docx(blocks, docx_path)

    print("PDF : %s  (%d páginas, %.1f KB)" % (pdf_path, pages, pdf_size / 1024.0))
    print("MD  : %s  (%.1f KB)" % (md_path, md_size / 1024.0))
    print("DOCX: %s  (%.1f KB)" % (docx_path, docx_size / 1024.0))


if __name__ == "__main__":
    main()
