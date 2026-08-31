import re

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

# CSS to inject
custom_css = """
    /* --- Custom 3D Cards for Tech & Why Sections --- */
    .custom-3d-wrapper {
        width: 100%;
        min-height: 420px;
        cursor: pointer;
        perspective: 1000px;
        margin: 0 auto;
    }
    
    .custom-3d-inner {
        position: relative;
        width: 100%;
        height: 100%;
        transform-style: preserve-3d;
        transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        border-radius: 12px;
        box-shadow: 0 0 20px rgba(212, 175, 55, 0.15);
    }
    
    .custom-3d-wrapper.is-flipped .custom-3d-inner {
        transform: rotateY(180deg);
    }

    .custom-face {
        position: absolute;
        width: 100%;
        height: 100%;
        backface-visibility: hidden;
        border-radius: 12px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 30px 20px;
    }

    .custom-front {
        background-color: var(--dark);
        color: var(--white);
        align-items: center;
        text-align: center;
        background-size: cover;
        background-position: center;
        border: 1px solid rgba(212, 175, 55, 0.2);
    }
    
    /* Overlay to make text readable over the background image */
    .custom-front::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: linear-gradient(to bottom, rgba(2, 11, 30, 0.4) 0%, rgba(2, 11, 30, 0.9) 100%);
        z-index: 1;
        border-radius: 12px;
    }
    
    .custom-front > * {
        z-index: 2;
        position: relative;
    }

    .custom-back {
        background-color: var(--white);
        color: var(--text);
        transform: rotateY(180deg);
        border: 2px solid var(--accent);
        align-items: center;
        text-align: center;
    }
    
    .custom-title {
        font-family: var(--serif);
        font-size: 1.4rem;
        margin-bottom: 12px;
        color: var(--white);
    }
    
    .custom-back .custom-title {
        color: var(--dark);
    }
    
    .custom-list {
        list-style: none;
        padding: 0;
        margin: 0;
        text-align: left;
        width: 100%;
    }
    
    .custom-list li {
        margin-bottom: 10px;
        font-size: 0.95rem;
        color: var(--text-light);
        display: flex;
        align-items: flex-start;
        gap: 8px;
    }
    
    .custom-list li::before {
        content: '✓';
        color: var(--accent);
        font-weight: bold;
    }
"""

if "/* --- Custom 3D Cards for Tech & Why Sections --- */" not in html:
    html = html.replace("</style>", custom_css + "\n    </style>")

# 1. Tech Section Replacement
tech_data = [
    {
        "title": "Desarrollo de software a la medida",
        "bg": "assets/tech/software.jpg",
        "subtitle": "Sistemas y aplicaciones web",
        "items": ["Reducción de tiempos", "Ahorro de costos", "Soluciones exclusivas"]
    },
    {
        "title": "Automatización de procesos",
        "bg": "assets/tech/automation.jpg",
        "subtitle": "Flujos de trabajo eficientes",
        "items": ["Auditoría de seguridad", "Protección de bases de datos", "Cifrado de información"]
    },
    {
        "title": "Datos y ciberseguridad",
        "bg": "assets/tech/security.jpg",
        "subtitle": "Protección de activos digitales",
        "items": ["Cumplimiento normativo", "Respuesta a incidentes", "Privacidad de datos"]
    },
    {
        "title": "Asesoría legal-tech",
        "bg": "assets/tech/legaltech.jpg",
        "subtitle": "Derecho en el entorno digital",
        "items": ["Propiedad Intelectual", "Términos y condiciones", "Smart contracts"]
    }
]

tech_html = '<div class="techlaw__grid">\n'
for td in tech_data:
    items_html = "".join([f"<li>{item}</li>" for item in td["items"]])
    card = f"""
    <div class="custom-3d-wrapper" onclick="this.classList.toggle('is-flipped')">
        <div class="custom-3d-inner">
            <div class="custom-face custom-front" style="background-image: url('{td['bg']}');">
                <h3 class="custom-title">{td['title']}</h3>
                <p style="color: var(--accent); font-weight: 600; margin-top: 10px;">{td['subtitle']}</p>
                <p style="font-size:0.8rem; opacity:0.7; margin-top:15px;">Haz clic para ver más</p>
            </div>
            <div class="custom-face custom-back">
                <h3 class="custom-title" style="color: var(--accent); margin-bottom: 20px;">{td['title']}</h3>
                <ul class="custom-list">
                    {items_html}
                </ul>
            </div>
        </div>
    </div>
"""
    tech_html += card
tech_html += '</div>'

# 2. Why Section Replacement
why_data = [
    {
        "title": "Experiencia y rigor",
        "bg": "assets/why/experience.jpg",
        "desc": "Equipo multidisciplinario con dominio de cada materia para defender mejor sus intereses."
    },
    {
        "title": "Atención personalizada",
        "bg": "assets/why/attention.jpg",
        "desc": "Comunicación clara y constante: usted siempre sabe en qué etapa está su caso."
    },
    {
        "title": "Honorarios transparentes",
        "bg": "assets/why/transparent.jpg",
        "desc": "Condiciones claras desde el inicio, sin sorpresas ni costos ocultos."
    },
    {
        "title": "Compromiso con resultados",
        "bg": "assets/why/results.jpg",
        "desc": "Estrategias diseñadas para alcanzar la mejor solución posible en cada situación."
    }
]

why_html = '<div class="why__grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 30px; margin-top: 40px;">\n'
for wd in why_data:
    card = f"""
    <div class="custom-3d-wrapper" onclick="this.classList.toggle('is-flipped')">
        <div class="custom-3d-inner">
            <div class="custom-face custom-front" style="background-image: url('{wd['bg']}');">
                <h3 class="custom-title">{wd['title']}</h3>
                <p style="font-size:0.8rem; opacity:0.7; margin-top:15px; color: var(--accent);">Haz clic para girar</p>
            </div>
            <div class="custom-face custom-back" style="justify-content: center; padding: 40px 30px;">
                <h3 class="custom-title" style="color: var(--accent); margin-bottom: 20px;">{wd['title']}</h3>
                <p style="color: var(--text-light); line-height: 1.6; font-size: 1rem;">{wd['desc']}</p>
            </div>
        </div>
    </div>
"""
    why_html += card
why_html += '</div>'

# Regex replacements
html = re.sub(r'<div class="techlaw__grid">[\s\S]*?(?=</section>)', tech_html + '\n                ', html)
html = re.sub(r'<div class="why__grid">[\s\S]*?(?=</section>)', why_html + '\n            ', html)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print("Updated index.html successfully.")
