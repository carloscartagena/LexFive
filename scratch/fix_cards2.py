import re
import os

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

# 1. Fix Team headers accurately
html = html.replace('Derecho Civil &amp; Especial', 'Derecho Civil')
html = html.replace('Derecho Civil & Especial', 'Derecho Civil')
html = html.replace('Constitucional &amp; Civil', 'Constitucional')
html = html.replace('Constitucional & Civil', 'Constitucional')
html = html.replace('Penal &amp; Administrativo', 'Derecho Penal')
html = html.replace('Penal & Administrativo', 'Derecho Penal')
html = html.replace('Derecho Corporativo', 'Derecho Comercial')
html = html.replace('Área Civil &amp; Familia', 'Civil y Familia')
html = html.replace('Área Civil & Familia', 'Civil y Familia')

# 2. Add 2 more items to Tech grid
tech_new_cards = """
    <div class="custom-3d-wrapper" onclick="this.classList.toggle('is-flipped')">
        <div class="custom-3d-inner">
            <div class="custom-face custom-front" style="background-image: url('assets/tech/audit.jpg');">
                <h3 class="custom-title">Auditoría Tecnológica</h3>
                <p style="color: var(--accent); font-weight: 600; margin-top: 10px;">Evaluación de riesgos</p>
                <p style="font-size:0.8rem; opacity:0.7; margin-top:15px;">Haz clic para ver más</p>
            </div>
            <div class="custom-face custom-back">
                <h3 class="custom-title" style="color: var(--accent); margin-bottom: 20px;">Auditoría Tecnológica</h3>
                <ul class="custom-list">
                    <li>Evaluación exhaustiva de riesgos</li><li>Revisión de contratos de software</li><li>Validación de firmas digitales</li>
                </ul>
            </div>
        </div>
    </div>
    <div class="custom-3d-wrapper" onclick="this.classList.toggle('is-flipped')">
        <div class="custom-3d-inner">
            <div class="custom-face custom-front" style="background-image: url('assets/tech/privacy.jpg');">
                <h3 class="custom-title">Privacidad de Datos</h3>
                <p style="color: var(--accent); font-weight: 600; margin-top: 10px;">Protección de la información</p>
                <p style="font-size:0.8rem; opacity:0.7; margin-top:15px;">Haz clic para ver más</p>
            </div>
            <div class="custom-face custom-back">
                <h3 class="custom-title" style="color: var(--accent); margin-bottom: 20px;">Privacidad de Datos</h3>
                <ul class="custom-list">
                    <li>Adecuación a normativas vigentes</li><li>Gestión de bases de datos</li><li>Protección de identidad digital</li>
                </ul>
            </div>
        </div>
    </div>"""

# Insert new cards before the closing div of techlaw__grid
html = re.sub(r'(<div class="techlaw__grid">[\s\S]*?)(</div>\s*</section>)', r'\1' + tech_new_cards + r'\n\2', html)

# 3. Add 2 more items to Why grid
why_new_cards = """
    <div class="custom-3d-wrapper" onclick="this.classList.toggle('is-flipped')">
        <div class="custom-3d-inner">
            <div class="custom-face custom-front" style="background-image: url('assets/why/innovation.jpg');">
                <h3 class="custom-title">Innovación constante</h3>
                <p style="font-size:0.8rem; opacity:0.7; margin-top:15px; color: var(--accent);">Haz clic para girar</p>
            </div>
            <div class="custom-face custom-back" style="justify-content: center; padding: 40px 30px;">
                <h3 class="custom-title" style="color: var(--accent); margin-bottom: 20px;">Innovación constante</h3>
                <p style="color: var(--text-light); line-height: 1.6; font-size: 1rem;">Búsqueda continua de las mejores herramientas tecnológicas para brindar soluciones legales más rápidas.</p>
            </div>
        </div>
    </div>
    <div class="custom-3d-wrapper" onclick="this.classList.toggle('is-flipped')">
        <div class="custom-3d-inner">
            <div class="custom-face custom-front" style="background-image: url('assets/why/ethics.jpg');">
                <h3 class="custom-title">Ética inquebrantable</h3>
                <p style="font-size:0.8rem; opacity:0.7; margin-top:15px; color: var(--accent);">Haz clic para girar</p>
            </div>
            <div class="custom-face custom-back" style="justify-content: center; padding: 40px 30px;">
                <h3 class="custom-title" style="color: var(--accent); margin-bottom: 20px;">Ética inquebrantable</h3>
                <p style="color: var(--text-light); line-height: 1.6; font-size: 1rem;">Actuamos siempre con absoluta honestidad, rectitud y lealtad hacia los intereses de nuestros clientes.</p>
            </div>
        </div>
    </div>"""

html = re.sub(r'(<div class="why__grid"[^>]*>[\s\S]*?)(</div>\s*</section>)', r'\1' + why_new_cards + r'\n\2', html)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

# 4. Modify chatbot.css position
with open("css/chatbot.css", "r", encoding="utf-8") as f:
    chat_css = f.read()

chat_css = chat_css.replace('left: 20px;', 'right: 88px;\n    left: auto;')
with open("css/chatbot.css", "w", encoding="utf-8") as f:
    f.write(chat_css)


# 5. Modify encabezado-navegaci-n.css for sticky header
with open("css/components/encabezado-navegaci-n.css", "r", encoding="utf-8") as f:
    header_css = f.read()

if 'position: sticky;' not in header_css:
    header_css = header_css.replace('.header {', '.header {\n    position: sticky;\n    top: 0;\n    z-index: 1000;\n    background-color: var(--bg);\n')
    with open("css/components/encabezado-navegaci-n.css", "w", encoding="utf-8") as f:
        f.write(header_css)

# 6. Fix custom-3d.css light mode colors
with open("css/components/custom-3d.css", "r", encoding="utf-8") as f:
    custom_css = f.read()

# Make sure front title is always white
custom_css = custom_css.replace('.custom-title {\n    font-family: var(--serif);\n    font-size: 1.4rem;\n    margin-bottom: 12px;\n    color: var(--white);\n}', 
                                '.custom-title {\n    font-family: var(--serif);\n    font-size: 1.4rem;\n    margin-bottom: 12px;\n}\n.custom-front .custom-title {\n    color: #ffffff;\n}')

# Make sure back title adapts (already uses var(--dark), let's use var(--heading))
custom_css = custom_css.replace('color: var(--dark);', 'color: var(--heading);')

# Make sure back background adapts (use var(--card-bg) or var(--surface) instead of var(--white))
custom_css = custom_css.replace('background-color: var(--white);', 'background-color: var(--surface);')
custom_css = custom_css.replace('color: var(--text);', 'color: var(--text);') # Should be fine

with open("css/components/custom-3d.css", "w", encoding="utf-8") as f:
    f.write(custom_css)

print("Done fixing everything!")
