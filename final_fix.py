import re
import os

with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Force dark mode in HTML tag
content = content.replace('<html lang="es">', '<html lang="es" data-theme="dark">')
content = content.replace('<html lang="es" data-theme="light">', '<html lang="es" data-theme="dark">')

# 2. Add Paulina Tinta to Contact
paulina_pill = """                            <a class="wa-btn" target="_blank" rel="noopener" href="https://wa.me/59178360469?text=Hola%2C%20deseo%20una%20consulta%20legal%20con%20LexFive.">Abg. Paulina Tinta Mamani</a>\n"""

# Insert Paulina pill after Iván Payrumani
if "Abg. Paulina Tinta Mamani" not in content:
    content = content.replace(
        """<a class="wa-btn" target="_blank" rel="noopener" href="https://wa.me/59179145231?text=Hola%2C%20deseo%20una%20consulta%20legal%20con%20LexFive.">Abg. Iv&aacute;n Payrumani</a>""",
        """<a class="wa-btn" target="_blank" rel="noopener" href="https://wa.me/59179145231?text=Hola%2C%20deseo%20una%20consulta%20legal%20con%20LexFive.">Abg. Iv&aacute;n Payrumani</a>\n""" + paulina_pill
    )

# 3. Add Paulina Tinta to Team section
# We will duplicate Iván Payrumani's card and replace details for Paulina
if "Paulina Tinta Mamani" not in content:
    match = re.search(r'(<div class="card-3d-wrapper">.*?Ivǭn Payrumani.*?</div>\s*</div>\s*</div>)', content, flags=re.DOTALL)
    if match:
        ivan_card = match.group(1)
        paulina_card = ivan_card.replace("Henry Ivǭn Payrumani", "Paulina Tinta Mamani")
        paulina_card = paulina_card.replace("Socio Fundador", "Asociada")
        
        # We need to ensure Iván's card is preserved and Paulina's is added after it
        content = content.replace(ivan_card, ivan_card + "\n" + paulina_card)

# 4. Add 2 Tech cards
tech_cards = """
        <div class="custom-3d-wrapper">
          <div class="custom-3d-inner">
              <div class="custom-face custom-front" style="background-image: url('assets/tech/legal-design.jpg');">
                  <h3 class="custom-title">Dise&ntilde;o Legal</h3>
                  <p style="color: var(--accent); font-weight: 600; margin-top: 10px;">Documentos claros</p>
                  <p style="font-size:0.8rem; opacity:0.7; margin-top:15px;">Haz clic para ver m&aacute;s</p>
              </div>
              <div class="custom-face custom-back">
                  <h3 class="custom-title" style="color: var(--accent); margin-bottom: 20px;">Dise&ntilde;o Legal</h3>
                  <ul class="custom-list">
                      <li>Simplificaci&oacute;n de contratos</li>
                      <li>Visualizaci&oacute;n de datos legales</li>
                      <li>Mejora de experiencia de usuario</li>
                  </ul>
              </div>
          </div>
        </div>
        
        <div class="custom-3d-wrapper">
          <div class="custom-3d-inner">
              <div class="custom-face custom-front" style="background-image: url('assets/tech/security.jpg');">
                  <h3 class="custom-title">Inteligencia Artificial</h3>
                  <p style="color: var(--accent); font-weight: 600; margin-top: 10px;">Asistencia Legal</p>
                  <p style="font-size:0.8rem; opacity:0.7; margin-top:15px;">Haz clic para ver m&aacute;s</p>
              </div>
              <div class="custom-face custom-back">
                  <h3 class="custom-title" style="color: var(--accent); margin-bottom: 20px;">Inteligencia Artificial</h3>
                  <ul class="custom-list">
                      <li>An&aacute;lisis predictivo</li>
                      <li>Automatizaci&oacute;n de redacci&oacute;n</li>
                      <li>Revisi&oacute;n r&aacute;pida de jurisprudencia</li>
                  </ul>
              </div>
          </div>
        </div>
"""
if "Dise&ntilde;o Legal" not in content:
    # Insert before closing tag of tech__grid
    # Wait, the cards are inside <div class="tech__grid container">
    # Let's find the last card (Privacidad de Datos) and insert after it.
    match = re.search(r'(Privacidad de Datos.*?</div>\s*</div>\s*</div>)', content, flags=re.DOTALL)
    if match:
        last_card = match.group(1)
        content = content.replace(last_card, last_card + "\n" + tech_cards)


with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)
print("index.html updated")

# 5. Disable theme toggle in js/main.js
with open("js/main.js", "r", encoding="utf-8") as f:
    js_content = f.read()

# Instead of breaking the JS, we just hide the button logic or force it to dark.
js_content = js_content.replace("var btn = document.createElement('button');", "var btn = document.createElement('button');\n      btn.style.display = 'none';")
js_content = js_content.replace("return localStorage.getItem('theme') || 'dark';", "return 'dark';")

with open("js/main.js", "w", encoding="utf-8") as f:
    f.write(js_content)
print("js/main.js updated")

