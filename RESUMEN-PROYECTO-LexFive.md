# Resumen del Proyecto LexFive

> Documento de referencia general. Explica **qué se construyó**, **con qué tecnologías**,
> **cómo está organizado** y **cómo replicarlo** si en otra ocasión se usa una plataforma
> o lenguaje de programación distinto.
>
> _Última actualización: junio de 2026._

---

## 1. ¿Qué es LexFive?

LexFive es el sistema digital completo del bufete de abogados **LexFive** (El Alto, Bolivia).
Se compone de **dos partes que comparten la misma base de datos**:

1. **Sitio web público** — la cara del bufete hacia los clientes: presentación, áreas de
   práctica, casos de éxito, blog, preguntas frecuentes y formulario de contacto.
2. **Panel de gestión privado** (`/sistema`) — donde el personal administra procesos
   judiciales, clientes, consultas, modelos de memoriales, blog, testimonios, usuarios,
   credenciales y auditoría.

El objetivo del proyecto fue: **una web profesional + un sistema de gestión legal**, barato
de mantener, sin servidor propio y fácil de desplegar.

---

## 2. Tecnologías utilizadas (y por qué)

| Capa | Tecnología | Por qué se eligió |
|------|-----------|-------------------|
| **Frontend** | HTML5, CSS3 y JavaScript puro (sin frameworks) | Rápido, ligero, sin dependencias ni compilación; fácil de desplegar y mantener |
| **Backend / Base de datos** | [Supabase](https://supabase.com) (PostgreSQL gestionado) | Base de datos, autenticación y almacenamiento de archivos sin tener que programar un servidor |
| **Autenticación** | Supabase Auth (correo + contraseña) | Login, registro y recuperación de contraseña listos para usar |
| **Seguridad de datos** | Row Level Security (RLS) de PostgreSQL | Las reglas de acceso por rol viven en la base de datos, no en el navegador |
| **Almacenamiento de archivos** | Supabase Storage (bucket `documentos`) | Para memoriales, anexos y archivos de actuaciones |
| **Cliente de Supabase** | `@supabase/supabase-js` vía CDN (esm.sh) | Se importa directo en el navegador, sin `npm` ni build |
| **Envío de correos del formulario** | [Web3Forms](https://web3forms.com) | Servicio gratuito para recibir el formulario de contacto sin backend |
| **Hosting** | [Netlify](https://netlify.com), conectado a GitHub | Despliegue automático al hacer push a `main` |
| **Generación de documentos** | Scripts Python (`python-docx`, etc.) | Para generar manuales, guías y credenciales en `.docx`/`.pdf` |

> **Idea clave del proyecto:** todo el "backend" lo provee Supabase. El frontend es estático
> y la seguridad real la imponen las reglas RLS de la base de datos, no el JavaScript.

---

## 3. Estructura del proyecto

```
LexFive/
├── index.html              # Web pública: inicio, áreas, nosotros, equipo, contacto
├── casos.html              # Casos de éxito
├── blog.html               # Blog jurídico (lee artículos publicados desde Supabase)
├── faq.html                # Preguntas frecuentes (acordeón)
├── verificar.html          # Verificación pública de credenciales del bufete
├── aviso-privacidad.html   # Página legal
├── terminos.html           # Página legal
├── css/styles.css          # Estilos, paleta de colores y temas, responsive
├── js/main.js              # Interactividad de la web pública (menú, FAQ, formulario)
│
├── sistema/                # === PANEL DE GESTIÓN PRIVADO ===
│   ├── login.html          # Pantalla de acceso y registro
│   ├── index.html          # Panel (dashboard)
│   ├── css/panel.css       # Estilos del panel
│   ├── CONFIGURACION.md    # Guía de puesta en marcha del sistema
│   └── js/
│       ├── config.js       # URL + clave pública de Supabase, roles, abogados, materias
│       ├── supabase.js     # Inicializa el cliente de Supabase
│       ├── auth.js         # Sesión, perfil, roles, permisos y auditoría
│       └── app.js          # Lógica del panel (procesos, clientes, blog, usuarios, etc.)
│
├── db/                     # === SCRIPTS SQL DE LA BASE DE DATOS (Supabase) ===
│   ├── schema.sql                      # Tablas base, RLS y almacenamiento
│   ├── 02_portal_clientes.sql          # Rol "cliente" y aislamiento de datos
│   ├── 03_blog_alertas_testimonios.sql # Blog, alertas y testimonios
│   ├── 04_modelos_nurej.sql            # Biblioteca de modelos y campo NUREJ
│   ├── 05_multiples_abogados.sql       # Varios abogados/procuradores por proceso
│   ├── 06_consultas.sql                # Bandeja de consultas (formulario de contacto)
│   ├── 07_sync_clientes.sql            # Crea ficha de cliente al registrarse
│   ├── 08_categorias.sql               # Áreas del derecho dinámicas
│   └── 09_actuaciones_archivos.sql     # Adjuntar archivos a cada actuación
│
├── assets/                 # Logotipos, sellos e imágenes del equipo
├── scripts/                # Scripts Python que generan manuales y credenciales
│
└── Documentación (Markdown + PDF + Word):
    ├── Manual-Sistema-LexFive.md       # Manual completo de uso del sistema
    ├── Guia-Cuentas-LexFive.md         # Guía de cuentas
    ├── Guia-Pasos-Pendientes-LexFive.md# Pasos pendientes
    └── Tarjeta-Accesos-LexFive.md      # Tarjeta de accesos
```

---

## 4. Funcionalidades construidas

### Sitio web público
- Página de inicio con áreas de práctica, equipo, testimonios e indicadores.
- Casos de éxito, blog jurídico y preguntas frecuentes (acordeón).
- Formulario de contacto que **guarda cada mensaje en la base de datos** (bandeja de
  Consultas) y opcionalmente envía copia por correo (Web3Forms).
- Botón flotante de WhatsApp con menú de los 5 abogados.
- Páginas legales (aviso de privacidad, términos) y página de verificación de credenciales.
- 4 temas de color (azul marino, carbón, esmeralda, burdeos), todos con acento dorado.
- Diseño accesible y responsive (móvil, tablet, escritorio).

### Panel de gestión privado
- **Dashboard** con métricas (procesos totales/activos, audiencias próximas, consultas nuevas).
- **Procesos / casos:** crear, editar, asignar varios abogados y procuradores, vincular cliente,
  estados, NUREJ, próxima audiencia, historial de actuaciones con archivos adjuntos.
- **Clientes:** cartera con documento, contacto y vinculación por correo.
- **Bandeja de Consultas:** mensajes del formulario web, con estados (Nueva/Atendida/Archivada)
  y respuesta directa por WhatsApp o correo.
- **Modelos de memoriales:** biblioteca de plantillas reutilizables, organizada por área.
- **Blog:** redacción de artículos (borrador/publicado) que aparecen en la web pública.
- **Testimonios:** moderación (aprobar/rechazar) antes de publicarse.
- **Usuarios** (solo admin): cambiar roles, activar/desactivar cuentas.
- **Categorías / áreas del derecho** (solo admin): crear, renombrar y eliminar áreas dinámicas.
- **Auditoría** (solo admin): bitácora de acciones importantes.
- **Credenciales:** generador de carnet imprimible del bufete (foto, datos, logo, reverso).
- **Portal del cliente:** vista reducida donde el cliente ve solo sus procesos y deja su opinión.
- **Autoguardado de borradores** en todos los formularios y **cierre de sesión por inactividad**.

---

## 5. Modelo de datos (resumen)

Tablas principales en PostgreSQL (Supabase):

- `profiles` — usuarios del sistema, vinculados a `auth.users`, con `rol` (admin/procurador/abogado/cliente) y `activo`.
- `clientes` — cartera de clientes (vinculados por correo).
- `procesos` — casos judiciales/administrativos (carátula, número/NUREJ, materia, estado, audiencia, etc.).
- `actuaciones` — historial de pasos de cada proceso (con archivos adjuntos).
- `documentos` — metadatos de memoriales/archivos (el archivo físico va en Storage).
- `articulos` — artículos del blog (borrador/publicado).
- `auditoria` — bitácora de acciones.
- (+ tablas para consultas, testimonios, categorías, etc., añadidas por los scripts `02`–`09`).

**Seguridad (RLS):** cada tabla tiene políticas que definen quién puede ver/crear/editar/borrar.
Ejemplos: todos ven los procesos, pero **solo el admin elimina**; un cliente solo ve sus propios
procesos; la auditoría solo la ve el admin. Funciones auxiliares: `is_admin()` y `current_rol()`.

---

## 6. Cómo se pone en marcha (puesta a punto, una sola vez)

1. Crear un proyecto en **Supabase**.
2. En **SQL Editor**, ejecutar **en orden** los scripts de `db/`: primero `schema.sql`, luego
   `02_…` hasta `09_…`.
3. En **Authentication → Providers → Email**, configurar el login por correo.
4. Crear el primer usuario y convertirlo en admin con:
   `update public.profiles set rol = 'admin' where email = 'tu-correo';`
5. Poner la **URL y la clave pública** de Supabase en `sistema/js/config.js`.
6. (Opcional) Poner la clave de **Web3Forms** en el formulario de `index.html`.
7. Desplegar en **Netlify** conectando el repositorio de GitHub (push a `main` = publica solo).

> Detalle completo en `sistema/CONFIGURACION.md` y `Manual-Sistema-LexFive.md`.

---

## 7. Guía para replicar este sistema en OTRA plataforma

Si en el futuro se reconstruye con otro stack (por ejemplo React + Node, Django, Laravel,
Firebase, etc.), estos son los **componentes que hay que cubrir**, independientemente del lenguaje:

### 7.1. Lo que NO debe faltar (equivalencias por capa)

| Necesidad | Lo que se usó aquí | Alternativas en otras plataformas |
|-----------|--------------------|-----------------------------------|
| **Base de datos relacional** | Supabase (PostgreSQL) | Firebase/Firestore, MySQL, MongoDB, PlanetScale, Neon |
| **Autenticación** | Supabase Auth | Firebase Auth, Auth0, Clerk, NextAuth, Devise (Rails), Django auth |
| **Seguridad por rol** | RLS de PostgreSQL | Middleware/guards en el backend (NestJS guards, Django permissions, Laravel policies) |
| **Almacenamiento de archivos** | Supabase Storage | AWS S3, Firebase Storage, Cloudinary |
| **Frontend** | HTML/CSS/JS puro | React, Vue, Angular, Svelte, Next.js |
| **Recepción de formularios** | Web3Forms | Formspree, EmailJS, endpoint propio con Nodemailer/SendGrid |
| **Hosting** | Netlify | Vercel, GitHub Pages, Render, Cloudflare Pages, un VPS |

### 7.2. Checklist funcional para no olvidar nada

- [ ] **Roles y permisos:** admin, abogado, procurador, cliente — con quién puede borrar.
- [ ] **Gestión de procesos** con asignación múltiple de abogados/procuradores.
- [ ] **Historial de actuaciones** con archivos adjuntos por paso.
- [ ] **Clientes vinculados por correo** y **portal del cliente** (ve solo lo suyo).
- [ ] **Bandeja de consultas** alimentada por el formulario web.
- [ ] **Biblioteca de modelos** por área del derecho.
- [ ] **Blog** editable desde el panel que se publica en la web.
- [ ] **Testimonios** con moderación.
- [ ] **Categorías dinámicas** (áreas del derecho).
- [ ] **Auditoría** de acciones.
- [ ] **Generador de credenciales** imprimibles.
- [ ] **Autoguardado de borradores** y **cierre de sesión por inactividad**.

### 7.3. Lecciones aprendidas / recomendaciones

- **Empezar por el modelo de datos y los roles:** todo lo demás (pantallas, permisos) se
  deriva de ahí. Tener clara la matriz de permisos antes de programar evita rehacer trabajo.
- **Mantener la seguridad en el backend/base de datos**, nunca solo en el navegador. Aquí se
  logró con RLS; en otro stack, con guards/policies del lado del servidor.
- **Separar claves públicas de claves secretas.** En `config.js` solo va la clave pública;
  la `service_role` y contraseñas jamás se exponen en el frontend.
- **Un frontend estático + un backend gestionado (BaaS)** abarata y simplifica enormemente el
  mantenimiento de proyectos pequeños/medianos: no hay servidor que administrar.
- **Despliegue continuo** (push a `main` → publica solo) ahorra muchísimo tiempo.
- **Documentar desde el inicio** (manual + guía de configuración) facilita el traspaso y el soporte.

---

## 8. Datos clave del proyecto actual

- **Sitio:** lexfive.netlify.app
- **Frontend:** HTML/CSS/JS puro (~3.700 líneas entre `app.js`, `main.js` y `styles.css`).
- **Base de datos:** Supabase (PostgreSQL), 9 scripts SQL versionados en `db/`.
- **Despliegue:** Netlify conectado a GitHub (`main`).
- **Repositorio:** carloscartagena/LexFive
