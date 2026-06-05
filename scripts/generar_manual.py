#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador del "Manual del Sistema LexFive" en PDF.

No usa dependencias externas: construye el PDF a mano con las fuentes
estándar (Helvetica / Helvetica-Bold) y codificación WinAnsi, por lo que
funciona sin internet ni librerías adicionales.

Uso:  python3 scripts/generar_manual.py
Salida: Manual-Sistema-LexFive.pdf  (en la raíz del repositorio)
"""

import os

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

# Caracteres acentuados / signos en español (código WinAnsi -> ancho)
_EXTRA_HELV = {'á':556,'é':556,'í':278,'ó':556,'ú':556,'ñ':556,'ü':556,
    'Á':667,'É':667,'Í':278,'Ó':778,'Ú':722,'Ñ':722,'Ü':722,'¿':556,'¡':333,
    '°':400,'–':556,'—':1000,'·':278,'«':556,'»':556,'“':556,'”':556,'‘':222,
    '’':222,'•':350,'…':1000,'™':1000,'©':737,'®':737}
_EXTRA_BOLD = {'á':556,'é':556,'í':278,'ó':611,'ú':611,'ñ':611,'ü':611,
    'Á':722,'É':667,'Í':278,'Ó':778,'Ú':722,'Ñ':722,'Ü':722,'¿':611,'¡':333,
    '°':400,'–':556,'—':1000,'·':278,'«':556,'»':556,'“':556,'”':556,'‘':238,
    '’':238,'•':350,'…':1000,'™':1000,'©':747,'®':747}

def _build(ascii_widths, extra):
    d = {}
    for i, w in enumerate(ascii_widths):
        d[chr(32 + i)] = w
    d.update(extra)
    return d

W = {
    'F1': _build(_HELV_ASCII, _EXTRA_HELV),   # Helvetica
    'F2': _build(_BOLD_ASCII, _EXTRA_BOLD),   # Helvetica-Bold
    'F3': _build(_HELV_ASCII, _EXTRA_HELV),   # Helvetica-Oblique (mismos anchos)
}

# ============================================================
#  Colores (RGB 0..1)
# ============================================================
NAVY = (0.055, 0.106, 0.173)
GOLD = (0.760, 0.635, 0.353)
GOLD_D = (0.659, 0.522, 0.235)
INK = (0.102, 0.137, 0.188)
MUTED = (0.361, 0.400, 0.459)
WHITE = (1, 1, 1)
NOTE_BG = (0.965, 0.957, 0.937)

# ============================================================
#  Geometría de página (A4)
# ============================================================
PW, PH = 595.276, 841.890
ML, MR, MT, MB = 56, 56, 64, 58
CW = PW - ML - MR
TOP = PH - MT
BOTTOM = MB + 14


def text_width(s, size, font):
    table = W[font]
    return sum(table.get(ch, 556) for ch in s) * size / 1000.0


def wrap(s, size, font, maxw):
    out = []
    for para in s.split('\n'):
        words = para.split(' ')
        cur = ''
        for w in words:
            trial = w if not cur else cur + ' ' + w
            if text_width(trial, size, font) <= maxw:
                cur = trial
            else:
                if cur:
                    out.append(cur)
                if text_width(w, size, font) > maxw:
                    piece = ''
                    for ch in w:
                        if text_width(piece + ch, size, font) <= maxw:
                            piece += ch
                        else:
                            out.append(piece)
                            piece = ch
                    cur = piece
                else:
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


class PDF:
    def __init__(self):
        self.pages = []      # cada página: bytearray de operadores
        self.cur = None
        self.y = TOP
        self.content_no = 0  # número visible (pie de página)

    # -------- páginas --------
    def add_content_page(self):
        self.cur = bytearray()
        self.pages.append(self.cur)
        self.content_no += 1
        self.y = TOP
        # Encabezado
        self._line_text(PW - MR, PH - 38, "Manual del Sistema  ·  LexFive Abogados",
                        'F1', 8, MUTED, align='right')
        self._rule(ML, PH - 46, CW, GOLD, 0.8)
        # Pie de página
        self._rule(ML, MB + 4, CW, (0.9, 0.9, 0.9), 0.6)
        self._line_text(PW / 2, MB - 6, "Página %d" % self.content_no,
                        'F1', 8, MUTED, align='center')

    def add_cover_page(self):
        self.cur = bytearray()
        self.pages.append(self.cur)
        # Fondo navy completo
        self._rect(0, 0, PW, PH, NAVY)
        # Badge "L5"
        bx, by = ML, PH - 190
        self._rect(bx, by, 64, 64, GOLD)
        self._line_text(bx + 32, by + 22, "L5", 'F2', 26, NAVY, align='center')
        # Marca
        self._line_text(ML, PH - 250, "LexFive", 'F2', 40, WHITE)
        self._line_text(ML + 2, PH - 272, "A B O G A D O S", 'F1', 12, GOLD)
        # Línea divisoria
        self._rect(ML, PH - 300, 120, 3, GOLD)
        # Título del documento
        self._line_text(ML, PH - 360, "Manual del Sistema", 'F2', 30, WHITE)
        self._line_text(ML, PH - 392, "Guía completa de uso y gestión", 'F1', 14, GOLD)
        # Subtítulo
        sub = ("Sitio web público, panel de gestión de procesos, "
               "bandeja de consultas y portal del cliente.")
        for i, ln in enumerate(wrap(sub, 11, 'F1', CW - 120)):
            self._line_text(ML, PH - 430 - i * 16, ln, 'F1', 11, (0.78, 0.82, 0.88))
        # Pie de portada
        self._line_text(ML, 90, "Versión del manual: junio de 2026", 'F1', 10, (0.7, 0.74, 0.8))
        self._line_text(ML, 72, "Sitio: lexfive.netlify.app", 'F1', 10, (0.7, 0.74, 0.8))

    # -------- primitivas de dibujo --------
    def _rect(self, x, y, w, h, color):
        r, g, b = color
        self.cur += b"%.3f %.3f %.3f rg\n" % (r, g, b)
        self.cur += b"%.2f %.2f %.2f %.2f re\nf\n" % (x, y, w, h)

    def _rule(self, x, y, w, color, thick=1.0):
        r, g, b = color
        self.cur += b"%.3f %.3f %.3f RG\n%.2f w\n" % (r, g, b, thick)
        self.cur += b"%.2f %.2f m %.2f %.2f l S\n" % (x, y, x + w, y)

    def _line_text(self, x, y, s, font, size, color, align='left'):
        if align == 'right':
            x = x - text_width(s, size, font)
        elif align == 'center':
            x = x - text_width(s, size, font) / 2.0
        r, g, b = color
        self.cur += b"%.3f %.3f %.3f rg\nBT\n/%s %.2f Tf\n%.2f %.2f Td\n(" % (
            r, g, b, font.encode(), size, x, y)
        self.cur += _esc(s)
        self.cur += b") Tj\nET\n"

    # -------- flujo de contenido --------
    def _need(self, h):
        if self.cur is None or self.y - h < BOTTOM:
            self.add_content_page()

    def h1(self, s):
        self._need(60)
        self.y -= 30
        self._line_text(ML, self.y, s, 'F2', 16, NAVY)
        self.y -= 8
        self._rule(ML, self.y, CW, GOLD, 1.2)
        self.y -= 12

    def h2(self, s):
        self._need(34)
        self.y -= 22
        self._line_text(ML, self.y, s, 'F2', 12, NAVY)
        self.y -= 6

    def p(self, s, size=10.5, leading=14.5, gap=7, font='F1', x=ML, maxw=None):
        if maxw is None:
            maxw = CW - (x - ML)
        for ln in wrap(s, size, font, maxw):
            self.y -= leading
            self._need(0)
            if self.y == TOP:  # tras salto de página, baja una línea
                self.y -= leading
            self._line_text(x, self.y, ln, font, size, INK)
        self.y -= gap

    def bullets(self, items, size=10.5, leading=14.5, gap=3):
        for it in items:
            lines = wrap(it, size, 'F1', CW - 18)
            first = True
            for ln in lines:
                self.y -= leading
                self._need(0)
                if self.y == TOP:
                    self.y -= leading
                if first:
                    self._line_text(ML + 4, self.y, "•", 'F2', 10.5, GOLD_D)
                    first = False
                self._line_text(ML + 18, self.y, ln, size and size, 'F1') if False else \
                    self._line_text(ML + 18, self.y, ln, 'F1', size, INK)
            self.y -= 2
        self.y -= gap

    def steps(self, items, size=10.5, leading=14.5, gap=4):
        for i, it in enumerate(items, 1):
            label = "%d." % i
            lines = wrap(it, size, 'F1', CW - 24)
            first = True
            for ln in lines:
                self.y -= leading
                self._need(0)
                if self.y == TOP:
                    self.y -= leading
                if first:
                    self._line_text(ML + 2, self.y, label, 'F2', size, NAVY)
                    first = False
                self._line_text(ML + 22, self.y, ln, 'F1', size, INK)
            self.y -= 3
        self.y -= gap

    def note(self, s, title="Nota", size=10, leading=13.5, pad=9):
        lines = wrap(s, size, 'F1', CW - 2 * pad - 8)
        h = pad * 2 + (len(lines) + 1) * leading
        self._need(h + 10)
        top = self.y
        bottom = top - h
        self._rect(ML, bottom, CW, h, NOTE_BG)
        self._rect(ML, bottom, 4, h, GOLD)
        ty = top - pad - leading + 3
        self._line_text(ML + pad + 6, ty, title, 'F2', size, GOLD_D)
        for ln in lines:
            ty -= leading
            self._line_text(ML + pad + 6, ty, ln, 'F1', size, INK)
        self.y = bottom - 10

    def spacer(self, h=6):
        self.y -= h

    def toc(self, entries):
        for e in entries:
            self.y -= 17
            self._need(0)
            if self.y == TOP:
                self.y -= 17
            self._line_text(ML + 4, self.y, e, 'F1', 11, INK)

    # -------- serialización --------
    def build(self):
        objs = {}
        objs[1] = b"<< /Type /Catalog /Pages 2 0 R >>"
        objs[3] = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
        objs[4] = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
        objs[5] = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>"
        res = (b"<< /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> "
               b"/ProcSet [/PDF /Text] >>")
        num = 6
        page_refs = []
        for ops in self.pages:
            content = bytes(ops)
            cobj = num
            objs[cobj] = b"<< /Length %d >>\nstream\n" % len(content) + content + b"\nendstream"
            pobj = num + 1
            objs[pobj] = (b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.2f %.2f] "
                          b"/Resources %s /Contents %d 0 R >>" % (PW, PH, res, cobj))
            page_refs.append(pobj)
            num += 2
        kids = b"[" + b" ".join(b"%d 0 R" % r for r in page_refs) + b"]"
        objs[2] = b"<< /Type /Pages /Kids %s /Count %d >>" % (kids, len(page_refs))

        out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
        offsets = {}
        for n in range(1, num):
            offsets[n] = len(out)
            out += b"%d 0 obj\n" % n + objs[n] + b"\nendobj\n"
        xref_pos = len(out)
        out += b"xref\n0 %d\n" % num
        out += b"0000000000 65535 f \n"
        for n in range(1, num):
            out += b"%010d 00000 n \n" % offsets[n]
        out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (num, xref_pos)
        return bytes(out)


# ============================================================
#  CONTENIDO DEL MANUAL
# ============================================================
def construir(doc):
    doc.add_cover_page()

    # ---------- Índice ----------
    doc.add_content_page()
    doc.h1("Contenido")
    doc.toc([
        "1.  Introducción: qué es el sistema",
        "2.  Roles y permisos",
        "3.  Acceso al sistema (ingreso y registro)",
        "4.  Panel general (Dashboard)",
        "5.  Procesos (casos)",
        "6.  Clientes",
        "7.  Bandeja de Consultas",
        "8.  Modelos de memoriales",
        "9.  Blog",
        "10. Testimonios",
        "11. Usuarios (administrador)",
        "12. Auditoría (administrador)",
        "13. Portal del cliente",
        "14. La página web pública",
        "15. Configuración técnica (Supabase y despliegue)",
        "16. Cómo agregar un nuevo abogado",
        "17. Mantenimiento y buenas prácticas",
        "18. Solución de problemas frecuentes",
        "19. Soporte",
    ])

    # ---------- 1. Introducción ----------
    doc.h1("1. Introducción: qué es el sistema")
    doc.p("LexFive cuenta con dos partes que trabajan juntas:")
    doc.bullets([
        "La página web pública (lexfive.netlify.app): presenta al bufete, sus áreas de "
        "práctica, casos de éxito, blog, preguntas frecuentes y un formulario de contacto.",
        "El panel de gestión (parte privada, en /sistema): donde el personal administra "
        "procesos, clientes, consultas, modelos de memoriales, blog y testimonios.",
    ])
    doc.p("Toda la información se guarda de forma segura en una base de datos en la nube "
          "(Supabase). El panel y la web comparten esa base de datos: por ejemplo, un "
          "artículo que se publica en el panel aparece automáticamente en el blog, y una "
          "consulta enviada desde la web llega a la bandeja de Consultas del panel.")
    doc.note("Para usar el panel necesita un usuario y contraseña. Para navegar la web "
             "pública no se necesita iniciar sesión.", title="Importante")

    # ---------- 2. Roles ----------
    doc.h1("2. Roles y permisos")
    doc.p("Cada usuario tiene un rol que define lo que puede ver y hacer:")
    doc.bullets([
        "Administrador: acceso total. Gestiona usuarios, roles, auditoría, testimonios y "
        "puede eliminar registros (procesos, clientes, consultas).",
        "Abogado: gestiona procesos, clientes, consultas, modelos y blog. No accede a "
        "usuarios ni a la auditoría.",
        "Procurador: similar al abogado, enfocado en el seguimiento de los procesos.",
        "Cliente: solo ve sus propios procesos y puede dejar su opinión. No ve información "
        "del bufete ni de otros clientes.",
    ])
    doc.note("La separación de roles protege la información: los clientes nunca ven datos "
             "internos, y solo el administrador puede borrar registros o cambiar roles.",
             title="Seguridad")

    # ---------- 3. Acceso ----------
    doc.h1("3. Acceso al sistema (ingreso y registro)")
    doc.h2("Ingresar al panel")
    doc.steps([
        "Abra la dirección del panel: lexfive.netlify.app/sistema/login.html",
        "Escriba su correo y contraseña y pulse «Ingresar».",
        "Según su rol, verá el panel del bufete o el portal del cliente.",
    ])
    doc.h2("Registro de clientes")
    doc.p("Un cliente puede crear su cuenta desde la misma pantalla de acceso, en la pestaña "
          "de registro: ingresa nombre, apellido, correo, teléfono y una contraseña (mínimo "
          "6 caracteres). Sus procesos se vinculan automáticamente por el correo, así que "
          "debe registrarse con el mismo correo que dejó en el bufete.")
    doc.h2("Cierre de sesión y seguridad")
    doc.bullets([
        "La sesión se cierra sola tras 10 minutos de inactividad, por seguridad.",
        "Use el botón «Cerrar sesión» al terminar, sobre todo en equipos compartidos.",
        "Si olvidó su contraseña, solicite ayuda al administrador del sistema.",
    ])

    # ---------- 4. Dashboard ----------
    doc.h1("4. Panel general (Dashboard)")
    doc.p("Es la primera pantalla del personal. Muestra un resumen con tarjetas (métricas) "
          "y accesos rápidos:")
    doc.bullets([
        "Procesos totales y procesos activos.",
        "Audiencias próximas.",
        "Mis procesos: los casos en los que usted está asignado.",
        "Consultas nuevas: mensajes del formulario web aún sin atender. Al hacer clic en "
        "esta tarjeta se abre directamente la bandeja de Consultas.",
    ])

    # ---------- 5. Procesos ----------
    doc.h1("5. Procesos (casos)")
    doc.p("La pestaña «Procesos» es el corazón del sistema. Allí se registra y da "
          "seguimiento a cada caso.")
    doc.h2("Crear o editar un proceso")
    doc.steps([
        "Pulse «Nuevo proceso» (o haga clic sobre un proceso existente para editarlo).",
        "Complete los datos: carátula, número/NUREJ, materia, estado, parte contraria y la "
        "próxima audiencia.",
        "Asigne uno o varios abogados y procuradores a cargo.",
        "Vincule un cliente existente o registre uno nuevo directamente desde el formulario.",
        "Guarde. El proceso queda registrado y visible para el equipo asignado.",
    ])
    doc.h2("Documentos y actuaciones")
    doc.bullets([
        "Dentro del detalle de un proceso puede subir documentos (memoriales, notificaciones, "
        "etc.) y descargarlos cuando los necesite.",
        "Puede registrar actuaciones con fecha y descripción para llevar la bitácora del caso.",
    ])
    doc.note("Solo el administrador puede eliminar un proceso de forma definitiva. La "
             "eliminación no se puede deshacer.", title="Cuidado")

    # ---------- 6. Clientes ----------
    doc.h1("6. Clientes")
    doc.p("En «Clientes» se administra la cartera de personas o empresas atendidas.")
    doc.bullets([
        "Cree o edite un cliente con su nombre/razón social, documento (CI/NIT), teléfono, "
        "correo, dirección y notas.",
        "El correo es clave: es lo que permite que, al registrarse en el portal, el cliente "
        "vea sus propios procesos.",
        "Use el buscador para encontrar un cliente por nombre, documento, correo o teléfono.",
    ])

    # ---------- 7. Consultas ----------
    doc.h1("7. Bandeja de Consultas")
    doc.p("Cada mensaje enviado desde el formulario de contacto de la web pública llega a "
          "esta bandeja (y, si el correo está configurado, también se envía una copia por "
          "correo). Así ninguna consulta se pierde.")
    doc.h2("Cómo trabajar las consultas")
    doc.steps([
        "Abra la pestaña «Consultas». Verá la lista ordenada de la más reciente a la más antigua.",
        "Use el buscador o el filtro por estado (Nuevas, Atendidas, Archivadas).",
        "Haga clic en una consulta para ver el mensaje completo y los datos de contacto.",
        "Responda con un toque: botón «Responder por WhatsApp» o «Responder por correo».",
        "Marque la consulta como «Atendida» cuando la haya gestionado, o «Archivar» si ya no "
        "es relevante. Puede volver a marcarla como «Nueva» si lo necesita.",
    ])
    doc.bullets([
        "Estados: Nueva (recién llegada), Atendida (ya gestionada) y Archivada.",
        "Todo el personal puede ver y gestionar las consultas; solo el administrador puede "
        "eliminarlas.",
    ])
    doc.note("Si la pestaña «Consultas» no aparece o da error, es porque falta ejecutar una "
             "sola vez el script db/06_consultas.sql en Supabase. Vea la sección 15.",
             title="Si no ve la bandeja")

    # ---------- 8. Modelos ----------
    doc.h1("8. Modelos de memoriales")
    doc.p("Una biblioteca reutilizable de plantillas (Word, PDF, etc.) para el equipo.")
    doc.bullets([
        "Suba un modelo con su nombre y categoría, y el archivo correspondiente.",
        "Descargue cualquier modelo cuando lo necesite, o elimínelo si ya no sirve.",
        "Use el buscador para filtrar por nombre o categoría.",
    ])

    # ---------- 9. Blog ----------
    doc.h1("9. Blog")
    doc.p("Permite publicar artículos jurídicos que aparecen en la página pública (blog.html).")
    doc.steps([
        "Pulse «Nuevo artículo».",
        "Escriba el título, la categoría, un resumen y el contenido.",
        "Elija el estado: «Borrador» (no se publica) o «Publicado» (aparece en la web).",
        "Guarde. Los artículos publicados se muestran automáticamente en el blog público.",
    ])
    doc.note("Cada artículo lo edita su autor o un administrador. Así se respeta la autoría "
             "del contenido.", title="Autoría")

    # ---------- 10. Testimonios ----------
    doc.h1("10. Testimonios")
    doc.p("Los clientes pueden dejar su opinión desde su portal. El administrador las modera "
          "antes de que aparezcan en la web:")
    doc.bullets([
        "Aprobar: el testimonio se publica en la página de inicio.",
        "Rechazar: no se publica (el cliente puede editarlo y reenviarlo).",
        "Eliminar: quita el testimonio definitivamente.",
    ])

    # ---------- 11. Usuarios ----------
    doc.h1("11. Usuarios (administrador)")
    doc.p("Solo el administrador ve esta pestaña. Sirve para gestionar al personal:")
    doc.bullets([
        "Cambiar el rol de un usuario (administrador, abogado, procurador o cliente).",
        "Activar o desactivar cuentas. No es posible desactivar la propia cuenta.",
    ])

    # ---------- 12. Auditoría ----------
    doc.h1("12. Auditoría (administrador)")
    doc.p("Es la bitácora del sistema. Registra las acciones importantes (quién creó, editó "
          "o eliminó algo, cambios de rol, moderación de testimonios, etc.), con fecha, "
          "usuario y detalle. Útil para control interno y transparencia.")

    # ---------- 13. Portal del cliente ----------
    doc.h1("13. Portal del cliente")
    doc.p("Cuando un cliente inicia sesión, ve una versión reducida y privada:")
    doc.bullets([
        "Mis procesos: el listado de sus casos, su estado y la próxima audiencia, además de "
        "un botón para consultar por WhatsApp.",
        "Mi opinión: un formulario para calificar el servicio y dejar un comentario, que el "
        "bufete revisa antes de publicarlo.",
    ])

    # ---------- 14. Web pública ----------
    doc.h1("14. La página web pública")
    doc.p("Es la cara del bufete hacia los clientes. Incluye:")
    doc.bullets([
        "Inicio, Áreas de práctica, Nosotros (equipo), Casos de éxito, Blog y Preguntas "
        "frecuentes.",
        "Sección «Contáctenos» con el formulario (que llega a la bandeja de Consultas) y la "
        "opción de escribir por WhatsApp a un abogado específico.",
        "Botón flotante de WhatsApp que abre un menú con los cinco abogados.",
        "Páginas legales: Aviso de privacidad y Términos y condiciones, enlazadas en el pie "
        "de página.",
    ])
    doc.note("La barra superior y el pie ya no muestran correos ni teléfonos personales: el "
             "canal principal es el formulario y, de forma directa, el WhatsApp de cada "
             "abogado.", title="Privacidad del equipo")

    # ---------- 15. Configuración técnica ----------
    doc.h1("15. Configuración técnica (Supabase y despliegue)")
    doc.p("Esta sección es para quien administra la parte técnica.")
    doc.h2("Base de datos (Supabase)")
    doc.p("En la carpeta db/ del repositorio están los scripts SQL. Se ejecutan UNA sola "
          "vez, en orden, en el SQL Editor de Supabase:")
    doc.bullets([
        "schema.sql — tablas base, reglas de acceso por rol y almacenamiento de documentos.",
        "02_portal_clientes.sql — rol cliente y aislamiento de datos.",
        "03_blog_alertas_testimonios.sql — blog, alertas y testimonios.",
        "04_modelos_nurej.sql — biblioteca de modelos y campo NUREJ.",
        "05_multiples_abogados.sql — varios abogados/procuradores por proceso.",
        "06_consultas.sql — bandeja de Consultas (formulario de contacto).",
    ])
    doc.h2("Conexión y correo")
    doc.bullets([
        "La conexión a Supabase está en sistema/js/config.js (URL y clave pública).",
        "El aviso por correo de las consultas usa Web3Forms; la clave está en el formulario "
        "de contacto de index.html.",
    ])
    doc.h2("Despliegue (publicar cambios)")
    doc.p("El sitio se publica con Netlify, conectado al repositorio de GitHub. Al subir "
          "cambios a la rama principal (main), Netlify vuelve a publicar el sitio "
          "automáticamente en uno o dos minutos.")

    # ---------- 16. Agregar abogado ----------
    doc.h1("16. Cómo agregar un nuevo abogado")
    doc.steps([
        "En Supabase, vaya a Authentication → Users → Add user, y cree la cuenta con su "
        "correo (o pídale que se registre desde la pantalla de acceso).",
        "Ingrese al panel como administrador y abra la pestaña «Usuarios».",
        "Busque al nuevo usuario y cámbiele el rol a «Abogado» o «Procurador».",
        "Listo: ya podrá ingresar y trabajar según su rol.",
    ])

    # ---------- 17. Mantenimiento ----------
    doc.h1("17. Mantenimiento y buenas prácticas")
    doc.bullets([
        "Cada persona debe tener su propia cuenta; no comparta usuarios ni contraseñas.",
        "Use contraseñas robustas y cámbielas periódicamente.",
        "Cierre sesión en equipos compartidos.",
        "Revise la bandeja de Consultas a diario para no dejar clientes sin respuesta.",
        "Mantenga al día los estados de los procesos y las próximas audiencias.",
        "Supabase guarda los datos en la nube; aun así, conviene exportar respaldos "
        "periódicos desde el panel de Supabase.",
    ])

    # ---------- 18. Problemas frecuentes ----------
    doc.h1("18. Solución de problemas frecuentes")
    doc.h2("No veo la pestaña «Consultas» o da error")
    doc.p("Falta ejecutar el script db/06_consultas.sql en Supabase (una sola vez). Si el "
          "error menciona una columna que no existe, vuelva a ejecutar el script, que está "
          "preparado para completar la tabla sin borrar datos.")
    doc.h2("Envié una consulta de prueba y no aparece")
    doc.bullets([
        "Verifique que el sitio ya tenga publicada la última versión (Netlify).",
        "Confirme que sistema/js/config.js tiene la URL y la clave de Supabase correctas.",
        "Revise el filtro de estado en la bandeja (puede estar en «Atendidas»).",
    ])
    doc.h2("No puedo iniciar sesión")
    doc.bullets([
        "Revise que el correo y la contraseña sean correctos.",
        "Si la cuenta fue desactivada, pida al administrador que la reactive en «Usuarios».",
    ])
    doc.h2("Un cliente no ve sus procesos")
    doc.p("Debe haberse registrado con el mismo correo que figura en su ficha de cliente y "
          "en sus procesos. Verifique el correo en la pestaña «Clientes».")

    # ---------- 19. Soporte ----------
    doc.h1("19. Soporte")
    doc.p("Ante cualquier duda sobre el uso del sistema, contacte al administrador del "
          "bufete. Para cambios o mejoras en la web o el panel, conserve este manual como "
          "referencia y describa con el mayor detalle posible lo que necesita.")
    doc.spacer(10)
    doc.note("Este manual describe el funcionamiento del sistema a la fecha indicada en la "
             "portada. Si el sistema se actualiza, solicite una versión nueva del manual.",
             title="Versión")


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(os.path.dirname(here), "Manual-Sistema-LexFive.pdf")
    doc = PDF()
    construir(doc)
    data = doc.build()
    with open(out_path, "wb") as f:
        f.write(data)
    print("PDF generado: %s" % out_path)
    print("Páginas: %d  |  Tamaño: %.1f KB" % (len(doc.pages), len(data) / 1024.0))


if __name__ == "__main__":
    main()
