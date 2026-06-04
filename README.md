# LexFive — Sitio web para bufete de abogados

Sitio web profesional, moderno y totalmente responsive para el despacho **LexFive** (El Alto, Bolivia).
Construido con **HTML5, CSS3 y JavaScript puro** (sin frameworks ni dependencias): rápido, ligero
y fácil de mantener o desplegar en cualquier servicio.

---

## Estructura del proyecto

```
.
├── index.html          # Página principal (inicio, áreas, nosotros, equipo, testimonios, contacto)
├── casos.html          # Casos de éxito
├── blog.html           # Blog jurídico
├── faq.html            # Preguntas frecuentes (acordeón)
├── css/
│   └── styles.css      # Estilos, paleta de colores, temas y diseño responsive
├── js/
│   └── main.js         # Interactividad (menú, animaciones, formulario, FAQ)
└── README.md
```

## Datos del bufete (ya integrados)

- **Nombre:** LexFive
- **Teléfono / WhatsApp:** +591 78360469
- **Correo:** alba23meira@gmail.com
- **Dirección:** Calle 12 Uruguay esq. Raúl Salmón, zona 12 de Octubre, Edificio Señor de Mayo N.º 85, planta baja, oficina 1-A. El Alto, Bolivia.
- **Áreas de práctica:** Laboral, Civil, Penal y Familiar.

---

## Opciones de color (todas con acento dorado)

El tema por defecto es **azul marino + dorado**. Para cambiarlo, añade una clase a la etiqueta
`<body>` en cada archivo `.html`:

| Clase en `<body>`        | Resultado                         |
|--------------------------|-----------------------------------|
| *(sin clase)*            | Azul marino + Dorado (por defecto)|
| `class="theme-charcoal"` | Negro carbón + Dorado (más lujoso)|
| `class="theme-emerald"`  | Verde bosque + Dorado             |
| `class="theme-burgundy"` | Vino / Burdeos + Dorado           |

Ejemplo: `<body class="theme-emerald">`

> Si quieres un color totalmente a medida, edita las variables `--navy`, `--navy-700`,
> `--navy-600` y `--gold` al inicio de `css/styles.css`.

---

## Activar el formulario de contacto (envío real de correos)

El formulario está conectado a **[Web3Forms](https://web3forms.com)** (gratuito, sin servidor propio).
Solo falta tu clave de acceso:

1. Entra a **https://web3forms.com** e ingresa el correo **alba23meira@gmail.com**.
2. Recibirás un **Access Key** en ese correo.
3. En `index.html`, busca esta línea y reemplaza el valor:

   ```html
   <input type="hidden" name="access_key" value="REEMPLAZA_CON_TU_ACCESS_KEY">
   ```

¡Listo! Los mensajes del formulario llegarán a tu correo. (Mientras no configures la clave,
el formulario muestra un mensaje de éxito simulado para poder probarlo.)

---

## Cómo verlo localmente

Al ser un sitio estático, puedes abrir `index.html` en el navegador, o servirlo con:

```bash
python3 -m http.server 8000   # luego visita http://localhost:8000
```

## Despliegue gratuito

- **GitHub Pages**: sube el repositorio y actívalo en *Settings → Pages*.
- **Netlify** o **Vercel**: arrastra la carpeta o conecta el repositorio.

---

## Notas

- El equipo, los testimonios, los casos de éxito y los artículos del blog son **contenido de
  ejemplo**: sustitúyelos por la información real del despacho.
- Las cifras de la sección de indicadores (años, casos, etc.) también son orientativas.
- Diseño accesible: etiquetas semánticas, `aria-*`, buen contraste y soporte para
  `prefers-reduced-motion`. Optimizado para móvil, tablet y escritorio.
