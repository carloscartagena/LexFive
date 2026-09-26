import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

new_grid = '''<div class="team__grid">
                    <article class="member">
                        <div class="member__photo member__photo--1" data-initials="ZC">
                            <img class="member__photo-img" src="assets/equipo/cartagena.jpg" alt="Abg. Zumel Cartagena S." onerror="this.remove()">
                        </div>
                        <div class="member__info">
                            <h3 class="member__name">Abg. Zumel Cartagena S.</h3>
                            <p class="member__role">Socio Fundador</p>
                            <p class="member__areas">Derecho Laboral, Administrativo y Civil</p>
                            <p class="member__bio">Amplia experiencia en litigios y asesoramiento corporativo. Comprometido con la defensa de los derechos laborales.</p>
                        </div>
                    </article>

                    <article class="member">
                        <div class="member__photo member__photo--2" data-initials="JG">
                            <img class="member__photo-img" src="assets/equipo/corwin.jpg" alt="Abg. Jose Corwin Gutiérrez" onerror="this.remove()">
                        </div>
                        <div class="member__info">
                            <h3 class="member__name">Abg. Jose Corwin Gutiérrez</h3>
                            <p class="member__role">Socio Fundador</p>
                            <p class="member__areas">Derecho de Familia, Minero y Agrario</p>
                            <p class="member__bio">Especialista en asuntos de familia, minería y derecho agrario, con un enfoque cercano y orientado a soluciones.</p>
                        </div>
                    </article>

                    <article class="member">
                        <div class="member__photo member__photo--3" data-initials="JA">
                            <img class="member__photo-img" src="assets/equipo/antelo.jpg" alt="Abg. Jose Antonio Antelo" onerror="this.remove()">
                        </div>
                        <div class="member__info">
                            <h3 class="member__name">Abg. Jose Antonio Antelo</h3>
                            <p class="member__role">Socio Fundador</p>
                            <p class="member__areas">Derecho Penal, Civil y Constitucional</p>
                            <p class="member__bio">Defensa penal estratégica, con experiencia en materia civil y constitucional en todas las etapas del proceso.</p>
                        </div>
                    </article>

                    <article class="member">
                        <div class="member__photo member__photo--4" data-initials="DC">
                            <img class="member__photo-img" src="assets/equipo/candia.jpg" alt="Abg. Douglas Yamil Candia" onerror="this.remove()">
                        </div>
                        <div class="member__info">
                            <h3 class="member__name">Abg. Douglas Yamil Candia</h3>
                            <p class="member__role">Socio Fundador</p>
                            <p class="member__areas">Derecho Penal, Comercial y Tributario</p>
                            <p class="member__bio">Abogado versátil en materia penal y diversas áreas del derecho, atento a las necesidades de cada cliente.</p>
                        </div>
                    </article>

                    <article class="member">
                        <div class="member__photo member__photo--5" data-initials="HP">
                            <img class="member__photo-img" src="assets/equipo/payrumani.jpg" alt="Abg. Henry Iván Payrumani" onerror="this.remove()">
                        </div>
                        <div class="member__info">
                            <h3 class="member__name">Abg. Henry Iván Payrumani</h3>
                            <p class="member__role">Socio Fundador</p>
                            <p class="member__areas">Derecho Deportivo, Civil y Comercial</p>
                            <p class="member__bio">Especialista en derecho deportivo, civil y comercial: contratos, transferencias y representación de atletas y clubes.</p>
                        </div>
                    </article>

                    <article class="member">
                        <div class="member__photo member__photo--6" data-initials="PT">
                            <img class="member__photo-img" src="assets/equipo/paulina.jpg" alt="Abg. Paulina Tinta Mamani" onerror="this.remove()">
                        </div>
                        <div class="member__info">
                            <h3 class="member__name">Abg. Paulina Tinta Mamani</h3>
                            <p class="member__role">Abogada Asociada</p>
                            <p class="member__areas">Asesoría Jurídica Integral</p>
                            <p class="member__bio">Profesional dedicada a brindar asesoramiento preventivo y soluciones legales efectivas para nuestros clientes.</p>
                        </div>
                    </article>
                </div>'''

pattern = re.compile(r'<div class="team__grid">.*?</div>\s*</div>\s*</section>', re.DOTALL)
new_content = pattern.sub(new_grid + '\n            </div>\n        </section>', content)

if content == new_content:
    print("WARNING: Could not find team__grid with closing tags")
else:
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Replaced')
