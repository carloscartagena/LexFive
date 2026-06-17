# Guía de uso para el equipo — LexFive Abogados

_Cómo usar el sistema LexFive en el día a día · Versión: junio de 2026 · lexfive.netlify.app_

## Contenido

- 1. Introducción
- 2. Acceso al sistema
- 3. Panel general (inicio)
- 4. Procesos
- 5. Plazos, audiencias y calculadora
- 6. Agenda y calendario
- 7. Recordatorios (WhatsApp, correo y push)
- 8. Honorarios, pagos y estado de cuenta
- 9. Registro de horas
- 10. Clientes
- 11. Tareas
- 12. Modelos y plantillas de memoriales
- 13. Consultas, Reportes y Credenciales
- 14. Seguridad: 2FA y notificaciones
- 15. Solo administrador
- 16. Preguntas frecuentes


## 1. Introducción

Esta guía explica, paso a paso, cómo usar el sistema LexFive en el día a día. Está pensada para todo el personal del bufete (administrador, abogados y procuradores). Incluye las funciones más recientes: notificaciones, registro de horas, estado de cuenta por cliente, calculadora de plazos, Google Calendar y verificación en dos pasos.

- El sistema se abre en: lexfive.netlify.app/sistema
- Funciona en computadora y celular, y se puede instalar como app (PWA).

## 2. Acceso al sistema

### Iniciar sesión

1. Abra lexfive.netlify.app/sistema.
2. Escriba su correo y contraseña y pulse «Entrar».
3. Si tiene activada la verificación en dos pasos (2FA), se le pedirá un código de 6 dígitos (ver sección 15).

### Olvidé mi contraseña

1. En la pantalla de acceso, pulse «¿Olvidó su contraseña?».
2. Escriba su correo y pulse «Enviar enlace».
3. Revise su correo (y la carpeta de spam) y siga el enlace para crear una nueva.

### Cerrar sesión

- Botón «Cerrar sesión» (abajo a la izquierda). Le lleva al sitio web público.
- Por seguridad, la sesión se cierra sola tras 10 minutos de inactividad. Lo que esté escribiendo queda autoguardado y se recupera al volver a entrar.

> **Instalar como app:** En el celular, instale el sistema como app (menú del navegador → «Instalar app» / «Agregar a pantalla de inicio»). En iPhone es necesario instalarla para recibir notificaciones push.

## 3. Panel general (inicio)

Es la primera pantalla. Muestra de un vistazo el estado del bufete:

- Tarjetas de resumen: procesos totales, activos, audiencias próximas, mis procesos, consultas nuevas, tareas pendientes y «Por cobrar». Algunas son clicables.
- Alertas de audiencias y plazos: vencidas (rojo) y próximas de 7 días (ámbar).
- Gráficos: procesos por estado, por materia y carga por abogado.
- Tabla de próximas audiencias y plazos.
- Manuales y guías en PDF, tarjeta de Seguridad de la cuenta y (admin) Respaldos.

## 4. Procesos

### Ver y buscar

- Menú «Procesos»: use el buscador y los filtros para encontrar un caso.
- Búsqueda global con Ctrl/Cmd + K (procesos, clientes y consultas a la vez).

### Crear un proceso

1. En «Procesos», pulse «Nuevo proceso».
2. Complete: carátula, número, NUREJ, materia, tipo, juzgado/entidad, estado, cliente, parte contraria, abogados y procuradores a cargo, fecha de inicio y próxima audiencia.
3. Guardar.

### Detalle del proceso

Al hacer clic en un proceso se abre su ficha, con:

- Datos generales y descripción.
- Memoriales y documentos: suba archivos del caso (PDF, Word, imágenes; máx. 10 MB).
- Historial de actuaciones: registre cada paso del caso en orden y adjunte archivos (respuesta del juzgado, nuevo memorial...). El cliente lo ve en su portal.
- Botones: Editar, Plazos, Honorarios, Horas y Eliminar (admin).

## 5. Plazos, audiencias y calculadora

Desde el detalle del proceso, botón «Plazos».

### Registrar un plazo o audiencia

1. Complete Título (ej. «Audiencia preliminar»), Tipo (audiencia/plazo/reunión/otro), Fecha y hora, y una nota opcional.
2. Pulse «Agregar plazo». Aparecerá en la Agenda y se podrá exportar al calendario.
3. Marque «Cumplido» cuando ya pasó, o elimínelo si fue un error.

### Calculadora de plazos (días hábiles)

1. En la misma ventana, sección «Calculadora de plazo (días hábiles)».
2. Indique la fecha base y los días hábiles (omite sábados y domingos; no incluye feriados).
3. Pulse «Calcular vencimiento» para ver la fecha resultante.
4. Pulse «Usar en el plazo» para colocar esa fecha en el formulario.

## 6. Agenda y calendario

Menú «Agenda»: calendario mensual con todas las audiencias y plazos.

- Navegue con las flechas; botón «Hoy» para volver al mes actual.
- Colores: rojo = vencido, ámbar = dentro de 7 días.
- Cada evento tiene dos botones: «.ics» (abrir en cualquier calendario) y «Google» (agregarlo a Google Calendar en un clic, útil para que el teléfono avise).

## 7. Recordatorios (WhatsApp, correo y push)

### Manual (cuando usted quiera)

- En el Panel (alertas) o en la lista de audiencias, pulse «Recordar».
- Se abre una ventana con botones para enviar por WhatsApp a cada abogado, y un botón para enviar por correo a todo el personal de una vez.

### Automático (todos los días, sin abrir nada)

- Cada mañana el sistema envía a cada abogado sus audiencias y plazos del día siguiente, por correo y por notificación push.
- Para recibir las push, cada persona debe activarlas una vez en su dispositivo (sección 15).

## 8. Honorarios, pagos y estado de cuenta

### Por proceso

- Detalle del proceso, botón «Honorarios»: registre honorarios (cargos) y pagos.
- Vea el saldo (honorarios − pagos) y genere el recibo de un pago.

### Vista general (menú «Honorarios»)

- Tarjetas con total facturado, cobrado y por cobrar.
- Conmutador «Por proceso / Por cliente».
- Por cliente (estado de cuenta): suma de todos los procesos del cliente con su saldo total, botón «Recordar cobro» (WhatsApp o correo) y exportación a Excel.

## 9. Registro de horas

Para anotar el tiempo dedicado a cada caso (sustento de facturación). Solo admin y abogado.

1. Entre al detalle del proceso, botón «Horas».
2. Indique las horas (acepta decimales, ej. 1.5), la fecha y una descripción.
3. Pulse «Registrar horas». Verá el total de horas del proceso y el historial.

## 10. Clientes

- Menú «Clientes»: lista, búsqueda y exportación a Excel.
- Nuevo cliente: nombre, documento, teléfono/WhatsApp, correo, dirección y notas.
- Importante: si el cliente se registra en el portal con ESE MISMO correo, verá automáticamente sus procesos.

## 11. Tareas

- Menú «Tareas»: tablero de pendientes del equipo.
- Cree una tarea con título, responsable, prioridad y fecha de vencimiento.
- Mueva su estado: Pendiente → En progreso → Hecha (o reábrala). Las vencidas en rojo.

## 12. Modelos y plantillas de memoriales

### Plantillas (rellenado automático)

- Menú «Plantillas»: cree textos modelo con campos entre llaves, ej. {{cliente}}, {{caratula}}, {{nurej}}, {{juzgado}}.
- Al usar la plantilla sobre un proceso, el sistema rellena esos campos con los datos reales. Los campos sin dato quedan como ______ para completar a mano.
- Puede imprimir / exportar a PDF el memorial generado.

### Modelos

- Menú «Modelos»: biblioteca de memoriales de referencia para el equipo.

## 13. Consultas, Reportes y Credenciales

- Consultas: mensajes del formulario de contacto de la web; las nuevas salen en el Panel.
- Reportes: estadísticas de procesos por estado, materia y abogado, por período (PDF).
- Credenciales (admin y abogado): carnets del personal con QR, listos para imprimir.

## 14. Seguridad: 2FA y notificaciones

Ambas se gestionan en Panel → tarjeta «Seguridad de la cuenta».

### Verificación en dos pasos (2FA)

1. Pulse «Verificación en dos pasos» → «Activar».
2. Con una app de autenticación (Google Authenticator, Microsoft Authenticator o Authy), escanee el código QR (o ingrese la clave manualmente).
3. Escriba el código de 6 dígitos que muestra la app y pulse «Activar».
4. Desde ahí, al iniciar sesión se le pedirá ese código. Para quitarlo: «Desactivar 2FA».

### Notificaciones push

1. Pulse «Notificaciones» → «Activar» y acepte el permiso del navegador.
2. Pulse «Enviar prueba» para confirmar que llegan.
3. Para dejar de recibirlas en ese equipo: «Desactivar».

> **Si no llegan las notificaciones:** Si no aparece la prueba: en Windows, active las notificaciones del sistema y apague «No molestar»; en el navegador, permita las notificaciones del sitio (candado junto a la dirección). En Brave, active brave://settings/privacy → «Usar los servicios de Google para la mensajería push» y reinicie Brave (en Chrome/Edge funciona sin configurar). En iPhone, instale primero la app en la pantalla de inicio (iOS 16.4+).

> **¿Adónde llegan?:** Las notificaciones push llegan al navegador/dispositivo donde las activó (computadora y/o celular). NO llegan a WhatsApp: WhatsApp es un envío aparte y manual. Además del push, el sistema envía cada mañana un correo automático con lo mismo.

## 15. Solo administrador

- Usuarios: crear/editar el personal y asignar su rol (admin, procurador, abogado).
- Categorías: áreas del derecho usadas en los procesos.
- Testimonios: opiniones de clientes que se muestran en la web.
- Blog: publicar artículos en el sitio público.
- Auditoría: bitácora de acciones del sistema.
- Papelera: procesos y clientes eliminados (se pueden restaurar).
- Respaldos (Panel): «Exportar respaldo (JSON)»; además la base se respalda automáticamente cada día en GitHub.

## 16. Preguntas frecuentes

### El sistema se queda en «Cargando...»

Recargue con Ctrl+Shift+R. Si la base estaba «dormida», el sistema reintenta solo; también puede usar el botón «Reintentar ahora» que aparece.

### No me llegan las notificaciones push

Revise la sección 14 (permisos de Windows y del navegador). En iPhone, instale la app.

### Un cliente no ve sus procesos en el portal

Verifique que el correo del cliente en su ficha sea el mismo con el que se registró en el portal.

### ¿Dónde están los manuales en PDF?

En el Panel → «Manuales y guías» (sistema, abogados y clientes).


> **Conserve esta guía:** Esta guía está enfocada en el uso diario del equipo. Para temas técnicos consulte también el Manual del Sistema, MANTENIMIENTO-SETUP y RECORDATORIOS-SETUP.
