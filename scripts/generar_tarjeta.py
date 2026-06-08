#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera la "Tarjeta de Accesos de LexFive": un resumen breve con el cuadro de
cómo entrar a cada servicio. Pensada para imprimir y tener a mano.

Reutiliza el motor de render del manual del sistema (generar_manual.py).

Uso:  python3 scripts/generar_tarjeta.py
Salidas (en la raíz del repositorio):
  - Tarjeta-Accesos-LexFive.pdf / .md / .docx
"""

import os
import generar_manual as M


def build_blocks():
    B = []
    h1 = lambda t: B.append(('h1', t))
    p = lambda t: B.append(('p', t))
    bul = lambda items: B.append(('bullets', items))
    note = lambda t, titulo='Nota': B.append(('note', t, titulo))

    h1("Tarjeta de Accesos · LexFive Abogados")
    p("Resumen rápido para entrar a cada servicio. Versión: " + M.VERSION + ".")

    h1("Cómo entrar a cada servicio")
    p("Correo del bufete (sirve para todo): alba23meira@gmail.com")
    bul([
        "GitHub  ->  github.com  con «Continuar con Google». (También: correo + contraseña propia.)",
        "Netlify  ->  app.netlify.com  con «Continuar con GitHub». (También: correo + contraseña. Google NO sirve aquí.)",
        "Supabase  ->  supabase.com  con «Continuar con GitHub».",
        "Web3Forms  ->  web3forms.com  con el Gmail del bufete.",
        "Panel del sistema  ->  lexfive.netlify.app/sistema/login.html  (cada usuario con su correo y contraseña).",
    ])

    h1("La llave maestra")
    p("La cadena de accesos es: Web3Forms usa el Gmail; GitHub entra con Google (ese Gmail); "
      "y Netlify y Supabase entran con GitHub.")
    note("Su Gmail alba23meira@gmail.com es la LLAVE MAESTRA de todo el sistema. Cuide su "
         "contraseña, guárdela en un lugar seguro y actívele verificación en dos pasos. Como "
         "respaldo, anote también las contraseñas propias de GitHub y Netlify.", "Importante")

    h1("Si olvida una contraseña")
    bul([
        "Use la opción «¿Olvidó su contraseña?» del servicio: le llegará un enlace al Gmail.",
        "Por eso es vital conservar el acceso al Gmail del bufete.",
        "Puede cerrar todas las pestañas con tranquilidad: con esta tarjeta sabrá volver a entrar.",
    ])

    return B


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    blocks = build_blocks()

    M.DOC_TITLE = "Tarjeta de Accesos"
    M.DOC_SUBTITLE = "Resumen rápido para entrar a cada servicio"
    M.DOC_INTRO = ("Lo esencial: cómo ingresar a GitHub, Netlify, Supabase, Web3Forms y el "
                   "panel del sistema.")
    M.DOC_HEADER = "Tarjeta de Accesos"

    pdf_path = os.path.join(root, "Tarjeta-Accesos-LexFive.pdf")
    md_path = os.path.join(root, "Tarjeta-Accesos-LexFive.md")
    docx_path = os.path.join(root, "Tarjeta-Accesos-LexFive.docx")

    pages, pdf_size = M.render_pdf(blocks, pdf_path, compact=True)
    md_size = M.render_md(blocks, md_path)
    docx_size = M.render_docx(blocks, docx_path)

    print("PDF : %s  (%d paginas, %.1f KB)" % (pdf_path, pages, pdf_size / 1024.0))
    print("MD  : %s  (%.1f KB)" % (md_path, md_size / 1024.0))
    print("DOCX: %s  (%.1f KB)" % (docx_path, docx_size / 1024.0))


if __name__ == "__main__":
    main()
