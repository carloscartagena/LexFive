# Resumen de actualizaciones — LexFive

Documento de referencia para futuras actualizaciones o mejoras del sistema.
Resume el trabajo realizado, los scripts de base de datos a ejecutar y las
ideas pendientes. Última actualización: junio de 2026.

---

## 1. Scripts de base de datos (Supabase)

Los scripts viven en la carpeta `db/` y se ejecutan **una sola vez**, en orden,
en Supabase → **SQL Editor**. Los más recientes (de estas actualizaciones):

| Script | Para qué | ¿Obligatorio? |
|---|---|---|
| `17_credenciales.sql` | Credenciales del bufete compartidas en la nube | Sí (para guardar credenciales) |
| `18_realtime_branding.sql` | Logo y sello en tiempo real (en vivo) | Sí (para actualización instantánea) |
| `19_branding_galerias.sql` | Galerías de logos/sellos en fila aparte (más liviano) | Sí (para que carguen las galerías) |
| `20_seguridad_eventos.sql` | Corrige la lectura de "eventos" (privacidad del cliente) | **Sí (seguridad)** |

> Regla práctica: cada vez que se agregue una función que necesite base de
> datos, habrá un nuevo `db/NN_*.sql` que se ejecuta una sola vez.

---

## 2. Qué se hizo, por área

### Blog
- Se desarrollaron los **6 artículos de ejemplo** completos (laboral, familiar,
  penal, civil) y el botón «Leer más» abre cada artículo en una ventana.

### Credenciales del bufete
- Las credenciales creadas se **guardan en la nube** y se pueden **editar,
  reimprimir, buscar y eliminar** desde cualquier dispositivo.
- Tamaño de la credencial: **9 × 6 cm**, con **guía de corte punteada**.
- **Vista previa** antes de imprimir.
- Control de **intensidad del logo de fondo** (marca de agua).
- Arreglo: el texto ya no sale gris/blanco en modo oscuro ni al descargar el PDF.

### Logo y sello (branding)
- El logo y el sello se **sincronizan en todos los dispositivos** (computadora,
  celular y web pública) y se actualizan **en tiempo real**.
- Las galerías de logos/sellos propios se guardan en una **fila aparte**, para
  que la web y el panel carguen más rápido.
- Arreglo: el logo ya no «vuelve al de por defecto» por datos vacíos; se
  refresca al volver a la pestaña.
- El panel ahora incluye `branding.js` para aplicar el logo al cargar.

### Rendimiento
- El **Service Worker** usa «stale-while-revalidate»: los recursos (CSS, JS,
  íconos, logos) se sirven al instante desde la caché y se actualizan en
  segundo plano. El panel se siente mucho más ágil.
- Las **fotos** de credencial se guardan en **JPEG** (mucho más livianas).

### Procesos, clientes y honorarios
- **Filtros avanzados** en Procesos: por abogado y por rango de fechas
  (además de materia, estado y buscador).
- **Exportar a Excel/CSV**: procesos, clientes y honorarios. Procesos también a PDF.
- **Recordatorios automáticos**: al abrir el panel avisa de audiencias vencidas
  o próximas (7 días).
- **Adjuntos**: vista previa del archivo, validación de tamaño (máx. 10 MB) y de
  tipo, tanto en documentos del proceso como en los adjuntos de cada actuación.
- **Validación** del formato de correo en la ficha del cliente.

### Manuales y ayuda
- Tres manuales (PDF, Word y Markdown), generados por `scripts/generar_manual.py`:
  **Manual del Sistema**, **Manual para Abogados** y **Manual para Clientes**.
- Descarga de manuales desde el **panel** (dashboard) y desde el **portal del cliente**.
- Enlaces a los manuales en la **pantalla de inicio de sesión**.
- **Correo de bienvenida** para clientes: plantilla lista para copiar (con pasos
  de registro y enlace a la guía), desde la ficha del cliente.

### Respaldos y datos
- Respaldo automático diario (GitHub Actions) + **exportar respaldo manual (JSON)**.
- **Revisar un respaldo**: abrir un archivo de respaldo y explorar sus tablas
  (solo lectura), desde el dashboard del administrador.

### Experiencia y accesibilidad
- Indicador discreto de **«borrador guardado»** en formularios con autoguardado.
- **Página amable de «sin conexión»** y aviso cuando no hay internet.
- **Manejo global de errores** (avisa de forma amable en vez de fallar en silencio).
- Mejoras de **accesibilidad**: foco visible para teclado, anuncios para lectores
  de pantalla (toast), foco al abrir ventanas (modal), mejor contraste en modo oscuro.
- **PWA** pulida (instalable como app; manifest e íconos mejorados).

### Seguridad (repaso de políticas RLS)
- Se revisaron, tabla por tabla, las reglas de acceso por rol. Resultado:
  - Datos económicos (**honorarios, pagos**): solo admin y abogado. ✓
  - **Procesos, actuaciones, documentos, clientes** y archivos en Storage:
    el cliente solo accede a **lo suyo**. ✓
  - **Consultas** del formulario: cualquiera envía, solo el personal lee. ✓
  - **Tareas**: solo personal. **Perfiles**: el cliente solo ve su ficha. ✓
  - **Credenciales**: solo admin y abogado. ✓
  - **Corrección aplicada**: la tabla **eventos** (audiencias/plazos) permitía
    lectura a cualquier usuario con sesión; ahora el cliente solo ve los de
    sus procesos (ver `db/20_seguridad_eventos.sql`).

---

## 3. Ideas pendientes / futuras mejoras

- **Notificaciones por correo/WhatsApp automáticas** de audiencias (hoy el aviso
  es dentro del panel y el recordatorio por WhatsApp es manual).
- **Restaurar** datos desde un respaldo (hoy el respaldo se puede *revisar*, no
  reimportar automáticamente).
- **Comprimir también** logos/sellos raster (hoy se comprime la foto a JPEG;
  los logos se mantienen en PNG por la transparencia).
- **Reportes** más completos y exportables (gráficos, períodos).
- Revisión periódica de seguridad cuando se agreguen tablas nuevas (definir su
  RLS desde el inicio, como se hizo con credenciales y galerías).

---

## 4. Cómo mantener el sistema

- **Código**: el panel está en `sistema/` (`js/app.js`, `css/panel.css`).
  La web pública en la raíz. Todo es estático; el «backend» es Supabase.
- **Manuales**: editar `scripts/generar_manual.py` y ejecutar
  `python3 scripts/generar_manual.py` para regenerar los tres manuales.
- **Base de datos**: cada cambio que la necesite va en un nuevo `db/NN_*.sql`.
- **Despliegue**: al hacer merge a `main`, Netlify publica automáticamente.
  Tras un cambio importante, en el celular conviene cerrar y reabrir la app
  para tomar la última versión (Service Worker).
