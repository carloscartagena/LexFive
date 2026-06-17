# Guía de uso del sistema LexFive — Equipo del bufete

Guía práctica y detallada para el personal (administrador, abogados y procuradores).
Explica **paso a paso** cómo usar cada parte del sistema, incluidas las funciones
más recientes (notificaciones, registro de horas, estado de cuenta por cliente,
calculadora de plazos, Google Calendar y verificación en dos pasos).

> El sistema se abre en: **lexfive.netlify.app/sistema**
> Funciona en computadora y celular, y se puede **instalar como app** (PWA).

---

## Índice

1. [Acceso al sistema](#1-acceso-al-sistema)
2. [Panel general (inicio)](#2-panel-general-inicio)
3. [Procesos](#3-procesos)
4. [Plazos, audiencias y calculadora](#4-plazos-audiencias-y-calculadora)
5. [Agenda y calendario](#5-agenda-y-calendario)
6. [Recordatorios (WhatsApp, correo y push)](#6-recordatorios-whatsapp-correo-y-push)
7. [Honorarios, pagos y estado de cuenta](#7-honorarios-pagos-y-estado-de-cuenta)
8. [Registro de horas](#8-registro-de-horas)
9. [Clientes](#9-clientes)
10. [Tareas](#10-tareas)
11. [Modelos y plantillas de memoriales](#11-modelos-y-plantillas-de-memoriales)
12. [Consultas](#12-consultas)
13. [Reportes](#13-reportes)
14. [Credenciales](#14-credenciales)
15. [Seguridad: 2FA y notificaciones](#15-seguridad-2fa-y-notificaciones)
16. [Solo administrador](#16-solo-administrador)
17. [Preguntas frecuentes](#17-preguntas-frecuentes)

---

## 1. Acceso al sistema

### Iniciar sesión
1. Abra **lexfive.netlify.app/sistema**.
2. Escriba su **correo** y **contraseña** y pulse **Entrar**.
3. Si tiene activada la verificación en dos pasos (2FA), se le pedirá un **código
   de 6 dígitos** (ver sección 15).

### Olvidé mi contraseña
1. En la pantalla de acceso, pulse **«¿Olvidó su contraseña?»**.
2. Escriba su correo y pulse **Enviar enlace**.
3. Revise su correo (y la carpeta de spam) y siga el enlace para crear una nueva.

### Cerrar sesión
- Botón **«Cerrar sesión»** (abajo a la izquierda). Le lleva al sitio web público.
- Por seguridad, la sesión **se cierra sola tras 10 minutos** de inactividad.
  Lo que esté escribiendo queda **autoguardado** y se recupera al volver a entrar.

### Instalar como app (recomendado en el celular)
- En el navegador, use el menú → **«Instalar app»** / **«Agregar a pantalla de inicio»**.
- En iPhone es **necesario** instalarla para recibir notificaciones push.

---

## 2. Panel general (inicio)

Es la primera pantalla («Panel»). Muestra de un vistazo:

- **Tarjetas de resumen:** procesos totales, activos, audiencias próximas, mis
  procesos, consultas nuevas, tareas pendientes y «Por cobrar».
  - Algunas tarjetas son **clicables** (Consultas, Tareas, Por cobrar) y le llevan
    a la sección correspondiente.
- **Alertas de audiencias y plazos:** lista de audiencias **vencidas** (rojo) y
  **próximas (7 días)** (ámbar), con botón para recordar al equipo.
- **Gráficos:** procesos por estado, por materia y carga por abogado.
- **Próximas audiencias y plazos:** tabla con los más cercanos.
- **Manuales y guías:** descarga de los PDF.
- **Seguridad de la cuenta:** activar 2FA y notificaciones (ver sección 15).
- **Respaldos y datos** (solo admin): exportar respaldo en JSON.

---

## 3. Procesos

### Ver y buscar
- Menú **«Procesos»**. Use el buscador y los filtros para encontrar un caso.
- Atajo de búsqueda global: **Ctrl/⌘ + K** (busca en procesos, clientes y consultas).

### Crear un proceso
1. En «Procesos», pulse **«Nuevo proceso»**.
2. Complete: carátula, número, NUREJ, materia, tipo (judicial/administrativo),
   juzgado/entidad, estado, cliente, parte contraria, abogados y procuradores a
   cargo, fecha de inicio y próxima audiencia.
3. **Guardar**.

### Detalle del proceso
Al hacer clic en un proceso se abre su ficha, con:
- Datos generales y descripción.
- **Memoriales y documentos:** suba archivos del caso (PDF, Word, imágenes; máx. 10 MB).
- **Historial de actuaciones:** registre cada paso del caso en orden cronológico y
  **adjunte archivos** (respuesta del juzgado, nuevo memorial, etc.). El cliente
  puede ver y descargar esto desde su portal.
- Botones: **Editar**, **Plazos**, **Honorarios**, **Horas**, **Eliminar** (admin).

---

## 4. Plazos, audiencias y calculadora

Desde el detalle del proceso → botón **«Plazos»**:

### Registrar un plazo o audiencia
1. Complete **Título** (ej. «Audiencia preliminar»), **Tipo** (audiencia / plazo /
   reunión / otro), **Fecha y hora** y una nota opcional.
2. Pulse **«Agregar plazo»**. Aparecerá en la **Agenda** y se podrá exportar al calendario.
3. Marque un plazo como **«Cumplido»** cuando ya pasó, o **elimínelo** si fue un error.

### Calculadora de plazos (días hábiles)
1. En la misma ventana, sección **«Calculadora de plazo (días hábiles)»**.
2. Indique la **fecha base** y el número de **días hábiles** (omite sábados y domingos;
   **no** incluye feriados).
3. Pulse **«Calcular vencimiento»** → le muestra la fecha resultante.
4. Pulse **«Usar en el plazo»** para colocar esa fecha en el formulario de arriba.

---

## 5. Agenda y calendario

Menú **«Agenda»**: calendario mensual con todas las audiencias y plazos.
- Navegue entre meses con las flechas; botón **«Hoy»** para volver al mes actual.
- Colores: **rojo** = vencido, **ámbar** = dentro de 7 días.
- Debajo, la lista del mes con dos botones por evento:
  - **«.ics»**: descarga el evento para abrirlo en cualquier calendario.
  - **«📅 Google»**: lo agrega a **Google Calendar** en un clic (útil para que su
    teléfono le avise).

---

## 6. Recordatorios (WhatsApp, correo y push)

### Manual (cuando usted quiera)
- En el **Panel** (alertas) o en la lista de audiencias, pulse **«Recordar»**.
- Se abre una ventana con:
  - Botones para enviar el recordatorio por **WhatsApp** a cada abogado.
  - Botón **«Enviar recordatorio por correo»** a todo el personal de una vez.

### Automático (todos los días, sin abrir nada)
- Cada mañana, el sistema envía a cada abogado un aviso con **sus audiencias y
  plazos del día siguiente**, por **correo** y por **notificación push**.
- Para recibir las push, cada persona debe **activarlas** una vez en su dispositivo
  (ver sección 15).

---

## 7. Honorarios, pagos y estado de cuenta

### Por proceso
- Desde el detalle del proceso → botón **«Honorarios»**:
  - Registre **honorarios** (cargos) y **pagos** recibidos.
  - Vea el **saldo** (honorarios − pagos).
  - Genere el **recibo** de un pago (botón «Recibo»).

### Vista general (menú «Honorarios»)
- Tarjetas con el total facturado, cobrado y por cobrar.
- Conmutador **«Por proceso / Por cliente»**:
  - **Por proceso:** saldo de cada caso. Exporta a Excel e imprime/PDF.
  - **Por cliente (estado de cuenta):** suma de todos los procesos de cada cliente,
    con su **saldo total**. Botón **«Recordar cobro»** para enviar al cliente un
    aviso cordial por **WhatsApp** o **correo**. Exporta a Excel.

---

## 8. Registro de horas

Para anotar el tiempo dedicado a cada caso (sustento de facturación). Solo admin y abogado.

1. Entre al **detalle del proceso** → botón **«Horas»**.
2. Indique las **horas** (acepta decimales, ej. `1.5`), la **fecha** y una descripción.
3. Pulse **«Registrar horas»**.
4. Verá el **total de horas** del proceso y el historial; puede eliminar un registro.

---

## 9. Clientes

- Menú **«Clientes»**: lista, búsqueda y exportación a Excel.
- **Nuevo cliente:** nombre, documento, teléfono/WhatsApp, **correo**, dirección y notas.
  - **Importante:** si el cliente se registra en el portal con **ese mismo correo**,
    verá automáticamente sus procesos.
- Desde la ficha puede enviarle un mensaje de bienvenida por correo.

---

## 10. Tareas

- Menú **«Tareas»**: tablero de pendientes del equipo.
- Cree una tarea con título, responsable, prioridad y fecha de vencimiento.
- Mueva su estado: **Pendiente → En progreso → Hecha** (o reábrala).
- Las vencidas se marcan en rojo.

---

## 11. Modelos y plantillas de memoriales

### Plantillas (rellenado automático)
- Menú **«Plantillas»**: cree textos modelo con campos entre llaves, por ejemplo
  `{{cliente}}`, `{{caratula}}`, `{{nurej}}`, `{{juzgado}}`.
- Al **usar** una plantilla sobre un proceso, el sistema **rellena** esos campos con
  los datos reales del caso y del cliente. Los campos sin dato quedan como
  `__________` para completarlos a mano.
- Puede **imprimir / exportar a PDF** el memorial generado.

### Modelos
- Menú **«Modelos»**: biblioteca de memoriales de referencia para el equipo.

---

## 12. Consultas

- Menú **«Consultas»**: mensajes que llegan desde el **formulario de contacto** de la web.
- Las **nuevas** aparecen en el Panel. Ábralas para leerlas y responder por correo.

---

## 13. Reportes

- Menú **«Reportes»**: estadísticas de procesos por estado, materia y abogado, por período.
- Se pueden imprimir / exportar a PDF.

---

## 14. Credenciales

- Menú **«Credenciales»** (solo admin y abogado): genera credenciales/carnets del
  personal con código QR, listas para imprimir (anverso y reverso).

---

## 15. Seguridad: 2FA y notificaciones

Ambas se gestionan en **Panel → tarjeta «Seguridad de la cuenta»**.

### Verificación en dos pasos (2FA)
Protege su acceso con un código de su teléfono, además de la contraseña.
1. Pulse **«Verificación en dos pasos» → «Activar»**.
2. Con una app de autenticación (**Google Authenticator**, **Microsoft Authenticator**
   o **Authy**), **escanee el código QR** (o ingrese la clave manualmente).
3. Escriba el **código de 6 dígitos** que muestra la app y pulse **«Activar»**.
4. A partir de ahí, al iniciar sesión se le pedirá ese código.
- Para quitarlo: misma tarjeta → **«Desactivar 2FA»**.
> Consejo: actívelo primero en una cuenta y pruebe a entrar de nuevo, antes de
> ponerlo en todas.

### Notificaciones push
Para recibir los avisos de audiencias **aunque el sistema esté cerrado**.
1. Pulse **«Notificaciones» → «Activar»** y **acepte el permiso** del navegador.
2. Pulse **«Enviar prueba»** para confirmar que llegan.
3. Para dejar de recibirlas en ese equipo: **«Desactivar»**.

**Si no aparece la notificación de prueba, revise:**
- **Windows:** Configuración → Sistema → **Notificaciones** activadas y **«No molestar» apagado**.
- **Navegador:** que el sitio tenga permiso de notificaciones (candado junto a la dirección).
- **Brave:** active `brave://settings/privacy` → «Usar los servicios de Google para
  la mensajería push» y reinicie Brave. (En Chrome/Edge funciona sin configurar nada.)
- **iPhone/iPad:** primero **instale la app** en la pantalla de inicio (iOS 16.4+).

---

## 16. Solo administrador

El administrador ve además estas secciones:

- **Usuarios:** crear/editar el personal y asignar su rol (admin, procurador, abogado).
- **Categorías:** áreas del derecho que se usan en los procesos.
- **Testimonios:** opiniones de clientes que se muestran en la web.
- **Blog:** publicar artículos en el sitio público.
- **Auditoría:** bitácora de acciones realizadas en el sistema.
- **Papelera:** procesos y clientes eliminados (se pueden restaurar).
- **Respaldos y datos (Panel):**
  - **«Exportar respaldo (JSON)»**: descarga una copia de los datos principales.
  - La base también se respalda **automáticamente cada día** en GitHub.

---

## 17. Preguntas frecuentes

**El sistema se queda en «Cargando…».**
Recargue con **Ctrl+Shift+R**. Si la base estaba «dormida», el sistema reintenta solo;
también puede usar el botón **«Reintentar ahora»** que aparece.

**No me llegan las notificaciones push.**
Revise la sección 15 (permisos de Windows/navegador). En iPhone, instale la app.

**Un cliente no ve sus procesos en el portal.**
Verifique que el **correo** del cliente en su ficha sea **el mismo** con el que se
registró en el portal.

**¿Dónde están los manuales en PDF?**
En el **Panel → «Manuales y guías»** (sistema, abogados y clientes).

---

*Documento de uso interno de LexFive Abogados. Para dudas técnicas, consulte también
`Manual-Sistema-LexFive.md`, `MANTENIMIENTO-SETUP.md` y `RECORDATORIOS-SETUP.md`.*
