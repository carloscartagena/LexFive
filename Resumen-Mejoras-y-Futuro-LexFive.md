# LexFive — Resumen de mejoras y hoja de ruta a futuro

Documento de referencia para el bufete. Resume **lo que se construyó**, **cómo está montado** (todo en planes gratuitos) y **qué se podría hacer más adelante**. Pensado para retomar el proyecto en cualquier momento sin perder el hilo.

> Última actualización: junio 2026.

---

## 1. Qué es LexFive (en una frase)

Una **web pública** (la cara del bufete) más un **panel de gestión privado** (`/sistema`) para administrar procesos, clientes, audiencias, documentos, honorarios y más. Todo funciona con un sitio estático (HTML/CSS/JS) + **Supabase** (base de datos, login y archivos) + **Netlify** (publicación), sin servidor propio.

---

## 2. Mejoras construidas en esta etapa

Organizadas por bloque. Cada una está fusionada en el repositorio.

### Identidad visual y marca
- **Logo sincronizado entre dispositivos**: el logo elegido se guarda en la nube y se ve igual en computadora, celular y web pública.
- Logo aplicado también en **inicio de sesión** y en la **página de verificación de credenciales**.
- Logo más grande y legible en la **credencial**.

### Bloque "Mejoras rápidas"
- **Agenda / Calendario** de audiencias y plazos, con navegación por mes.
- **Exportaciones**: lista de procesos a **Excel** y **PDF**; audiencias a **calendario personal (.ics)**.
- **Buscador global** (procesos, clientes y consultas) con atajo **Ctrl/⌘ + K**.
- **App instalable (PWA)**: se puede "Agregar a la pantalla de inicio" en el celular.
- **Gráficos** en el panel: procesos por estado, por materia y carga por abogado.

### Bloque "Gestión avanzada"
- **Tareas / Pendientes**: tablero del equipo (Pendiente / En progreso / Hecha) con responsable, prioridad y vencimiento.
- **Plazos múltiples por proceso**: varias audiencias/plazos por caso, visibles en la Agenda.
- **Honorarios y Pagos**: cargos, pagos y saldo por proceso; vista de cartera con totales.
- **Generador de memoriales desde plantillas**: plantillas con campos (`{{cliente}}`, `{{nurej}}`…) que se rellenan solos con los datos del proceso y se exportan a PDF/Word.
- **Recordatorios automáticos de audiencias** por correo (cada mañana), mediante una función programada en Supabase + Resend.

### Bloque "Seguridad y rendimiento"
- **Privacidad del personal**: el cliente ya no puede ver los correos del personal (solo el nombre de su abogado).
- **Anti-spam** en el formulario de contacto (campo trampa, control de envío instantáneo y límite por navegador).
- **Novedades en el portal del cliente**: avisos de nuevas actuaciones/documentos, con contador en el menú.
- **Paginación** de listas (procesos, clientes, consultas, auditoría) para que el sistema siga ágil al crecer.

### Bloque "Reportes y orden"
- **Recibos de pago imprimibles** (desde Honorarios).
- **Reporte de cartera de honorarios** imprimible.
- **Papelera de procesos**: borrado seguro con opción de **restaurar** o eliminar definitivamente (solo admin).
- **Reportes de procesos** por estado, materia y abogado, con filtro por período e impresión/PDF.

---

## 3. Scripts de base de datos ejecutados

Para que el sistema funcione, en Supabase (SQL Editor) se ejecutaron los scripts de la carpeta `db/`. Los de esta etapa:

| Script | Para qué |
|---|---|
| `10_branding.sql` | Logo/sello compartido entre dispositivos |
| `11_gestion_avanzada.sql` | Tareas, plazos/eventos, honorarios y pagos |
| `12_plantillas.sql` | Plantillas de memoriales |
| `13_privacidad_personal.sql` | Privacidad del personal (vista "directorio") |
| `14_papelera_procesos.sql` | Papelera de procesos |

> Regla práctica: cada vez que se agregue una función que necesite base de datos, habrá un nuevo script `db/NN_*.sql` que se ejecuta **una sola vez** en Supabase.

---

## 4. Servicios y accesos (todos gratuitos)

- **GitHub** — guarda el código. (Login con Google.)
- **Netlify** — publica el sitio. (Login con GitHub.)
- **Supabase** — base de datos, login y archivos. (Login con GitHub.)
- **Resend** — envía los correos de recordatorio. (Login con Google.)
- **Web3Forms** — copia por correo de las consultas (opcional).

> El detalle de cómo entrar y recuperar cada cuenta está en **`Guia-Cuentas-LexFive`** (md / Word / PDF).

---

## 5. Mantenimiento y cosas para tener presentes

- **Recordatorios**: el envío diario está programado en Supabase → Integrations → Cron (trabajo "LexFive", 07:00 Bolivia). Para que llegue a **todos los abogados** (no solo al correo principal) hace falta verificar un **dominio** en Resend.
- **Supabase gratuito**: si el proyecto pasa mucho tiempo **sin actividad**, puede **pausarse**; se reactiva entrando al panel de Supabase. Conviene ingresar de vez en cuando.
- **Copias de seguridad**: exportar de tanto en tanto los datos importantes (o considerar el plan de respaldos de Supabase si el volumen crece).
- **Claves**: la clave de Resend y demás secretos viven dentro de Supabase (Edge Functions → Secrets), nunca en el código.

---

## 6. Límites del plan gratuito (cuándo podría hacer falta pagar)

Hoy todo entra cómodamente en lo gratuito. Estos son los topes aproximados a vigilar si el bufete crece mucho:

- **Supabase (Free)**: ~500 MB de base de datos y ~1 GB de archivos; el proyecto se pausa tras inactividad prolongada. Si se llena o se necesita respaldo diario, el plan de pago lo amplía.
- **Resend (Free)**: ~3.000 correos al mes y ~100 por día; **requiere un dominio verificado** para enviar a destinatarios distintos al dueño de la cuenta.
- **Netlify (Free)**: ancho de banda mensual amplio; suficiente para un sitio del bufete.

---

## 7. Ideas para continuar (hoja de ruta)

### A. Se pueden hacer GRATIS (solo programación)
- **Avisos por correo al cliente** cuando cambia su proceso (reutilizando "Novedades"). *Nota: para enviar a los clientes hace falta el dominio verificado en Resend.*
- **Papelera también para clientes** (borrado seguro de fichas de cliente).
- **Recibos con el monto en letras** y numeración correlativa.
- **Reportes adicionales**: honorarios por abogado/período, productividad, casos ganados/perdidos.
- **Suscripción de calendario (.ics)**: que cada abogado vea TODAS sus audiencias en Google Calendar, actualizadas solas.
- **Mejoras de uso**: modo oscuro, resaltado de resultados de búsqueda, más accesibilidad, atajos de teclado.
- **Plantillas**: más campos automáticos y guardar el memorial generado en el expediente del proceso.
- **Auditoría con filtros** (por usuario, fecha o acción).

### B. Requieren algo externo (pequeño costo o trámite)
- **Dominio propio** (ej. `lexfive.com` / `lexfive.bo`): habilita correos a **todos** los abogados y a los clientes, y un correo institucional más profesional. Es el siguiente paso de mayor impacto.
- **Recordatorios por WhatsApp automáticos**: requieren la **API de WhatsApp Business** (de pago). Hoy el aviso por WhatsApp es manual (botón) y por correo es automático.
- **Firma electrónica** de documentos / credenciales.
- **Plan de pago de Supabase**: solo si crece el volumen de datos/archivos o se quieren respaldos automáticos.

### C. Prioridad sugerida
1. Conseguir el **dominio** (desbloquea correos a todos).
2. Activar **avisos por correo al cliente** (ya está la base con "Novedades").
3. Reportes y recibos adicionales según lo que el bufete vaya pidiendo.

---

## 8. Cómo se trabaja (para futuras mejoras)

1. Cada mejora se hace en una **rama** y se abre un **Pull Request** en GitHub.
2. Se revisa (Netlify genera una **vista previa** por cada PR) y se **fusiona**.
3. Si la mejora necesita base de datos, se ejecuta su script `db/NN_*.sql` en Supabase.
4. Netlify publica el sitio automáticamente al fusionar.

> Con este flujo, siempre se puede probar antes de aplicar y volver atrás si algo no convence.
