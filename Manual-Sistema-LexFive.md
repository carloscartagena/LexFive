# Manual del Sistema — LexFive Abogados

_Guía completa de uso y gestión · Versión: junio de 2026 · lexfive.netlify.app_

## Contenido

- 1. Introducción: qué es el sistema
- 2. Roles y permisos
- 3. Acceso al sistema (ingreso y registro)
- 4. Panel general (Dashboard)
- 5. Procesos (casos)
- 6. Clientes
- 7. Bandeja de Consultas
- 8. Modelos de memoriales
- 9. Blog
- 10. Testimonios
- 11. Usuarios (administrador)
- 12. Auditoría (administrador)
- 13. Portal del cliente
- 14. La página web pública
- 15. Configuración técnica (Supabase y despliegue)
- 16. Cómo agregar un nuevo abogado
- 17. Mantenimiento y buenas prácticas
- 18. Solución de problemas frecuentes
- 19. Soporte


## 1. Introducción: qué es el sistema

LexFive cuenta con dos partes que trabajan juntas:

- La página web pública (lexfive.netlify.app): presenta al bufete, sus áreas de práctica, casos de éxito, blog, preguntas frecuentes y un formulario de contacto.
- El panel de gestión (parte privada, en /sistema): donde el personal administra procesos, clientes, consultas, modelos de memoriales, blog y testimonios.

Toda la información se guarda de forma segura en una base de datos en la nube (Supabase). El panel y la web comparten esa base de datos: por ejemplo, un artículo que se publica en el panel aparece automáticamente en el blog, y una consulta enviada desde la web llega a la bandeja de Consultas del panel.

> **Importante:** Para usar el panel necesita un usuario y contraseña. Para navegar la web pública no se necesita iniciar sesión.

## 2. Roles y permisos

Cada usuario tiene un rol que define lo que puede ver y hacer:

- Administrador: acceso total. Gestiona usuarios, roles, auditoría, testimonios y puede eliminar registros (procesos, clientes, consultas).
- Abogado: gestiona procesos, clientes, consultas, modelos y blog. No accede a usuarios ni a la auditoría.
- Procurador: similar al abogado, enfocado en el seguimiento de los procesos.
- Cliente: solo ve sus propios procesos y puede dejar su opinión. No ve información del bufete ni de otros clientes.

> **Seguridad:** La separación de roles protege la información: los clientes nunca ven datos internos, y solo el administrador puede borrar registros o cambiar roles.

## 3. Acceso al sistema (ingreso y registro)

### Ingresar al panel

1. Abra la dirección del panel: lexfive.netlify.app/sistema/login.html
2. Escriba su correo y contraseña y pulse «Ingresar».
3. Según su rol, verá el panel del bufete o el portal del cliente.

### Registro de clientes

Un cliente puede crear su cuenta desde la misma pantalla de acceso, en la pestaña de registro: ingresa nombre, apellido, correo, teléfono y una contraseña (mínimo 6 caracteres). Sus procesos se vinculan automáticamente por el correo, así que debe registrarse con el mismo correo que dejó en el bufete.

### Cierre de sesión y seguridad

- La sesión se cierra sola tras 10 minutos de inactividad, por seguridad.
- Use el botón «Cerrar sesión» al terminar, sobre todo en equipos compartidos.
- Si olvidó su contraseña, solicite ayuda al administrador del sistema.

## 4. Panel general (Dashboard)

Es la primera pantalla del personal. Muestra un resumen con tarjetas (métricas) y accesos rápidos:

- Procesos totales y procesos activos.
- Audiencias próximas.
- Mis procesos: los casos en los que usted está asignado.
- Consultas nuevas: mensajes del formulario web aún sin atender. Al hacer clic en esta tarjeta se abre directamente la bandeja de Consultas.

## 5. Procesos (casos)

La pestaña «Procesos» es el corazón del sistema. Allí se registra y da seguimiento a cada caso.

### Crear o editar un proceso

1. Pulse «Nuevo proceso» (o haga clic sobre un proceso existente para editarlo).
2. Complete los datos: carátula, número/NUREJ, materia, estado, parte contraria y la próxima audiencia. En «Materia» puede elegir «Crear nueva categoría...» para agregar un área del derecho que no esté en la lista; quedará disponible en todo el sistema.
3. Asigne uno o varios abogados y procuradores a cargo.
4. Vincule un cliente existente o registre uno nuevo directamente desde el formulario.
5. Guarde. El proceso queda registrado y visible para el equipo asignado.

### Documentos y actuaciones

- Dentro del detalle de un proceso puede subir documentos (memoriales, notificaciones, etc.) y descargarlos cuando los necesite.
- Puede registrar actuaciones con fecha y descripción para llevar la bitácora del caso.

> **Cuidado:** Solo el administrador puede eliminar un proceso de forma definitiva. La eliminación no se puede deshacer.

## 6. Clientes

En «Clientes» se administra la cartera de personas o empresas atendidas.

- Cree o edite un cliente con su nombre/razón social, documento (CI/NIT), teléfono, correo, dirección y notas.
- El correo es clave: es lo que permite que, al registrarse en el portal, el cliente vea sus propios procesos.
- Use el buscador para encontrar un cliente por nombre, documento, correo o teléfono.

## 7. Bandeja de Consultas

Cada mensaje enviado desde el formulario de contacto de la web pública llega a esta bandeja (y, si el correo está configurado, también se envía una copia por correo). Así ninguna consulta se pierde.

### Cómo trabajar las consultas

1. Abra la pestaña «Consultas». Verá la lista ordenada de la más reciente a la más antigua.
2. Use el buscador o el filtro por estado (Nuevas, Atendidas, Archivadas).
3. Haga clic en una consulta para ver el mensaje completo y los datos de contacto.
4. Responda con un toque: botón «Responder por WhatsApp» o «Responder por correo».
5. Marque la consulta como «Atendida» cuando la haya gestionado, o «Archivar» si ya no es relevante. Puede volver a marcarla como «Nueva» si lo necesita.

- Estados: Nueva (recién llegada), Atendida (ya gestionada) y Archivada.
- Todo el personal puede ver y gestionar las consultas; solo el administrador puede eliminarlas.

> **Si no ve la bandeja:** Si la pestaña «Consultas» no aparece o da error, es porque falta ejecutar una sola vez el script db/06_consultas.sql en Supabase. Vea la sección 15.

## 8. Modelos de memoriales

Una biblioteca reutilizable de plantillas (Word, PDF, imágenes, etc.) para el equipo, organizada por área del derecho.

### Subir modelos

1. Elija el «Área del derecho» (Laboral, Civil, Penal, Familia, etc.).
2. Si necesita un área que no está en la lista, elija «Crear nueva categoría...», escriba su nombre y quedará disponible al instante en todo el sistema (procesos y modelos).
3. Suba varios archivos a la vez, o una carpeta completa: todos quedarán clasificados en el área elegida.
4. Si sube un solo archivo puede ponerle un nombre; si sube varios o una carpeta, se usa el nombre de cada archivo.
5. Pulse «Subir al área seleccionada»; una barra indica el avance.

### Biblioteca

- Los modelos se muestran agrupados por área, con un contador por cada una.
- Filtre por área o use el buscador por nombre.
- Descargue cualquier modelo cuando lo necesite, o elimínelo si ya no sirve.

## 9. Blog

Permite publicar artículos jurídicos que aparecen en la página pública (blog.html).

1. Pulse «Nuevo artículo».
2. Escriba el título, la categoría, un resumen y el contenido.
3. Elija el estado: «Borrador» (no se publica) o «Publicado» (aparece en la web).
4. Guarde. Los artículos publicados se muestran automáticamente en el blog público.

> **Autoría:** Cada artículo lo edita su autor o un administrador. Así se respeta la autoría del contenido.

## 10. Testimonios

Los clientes pueden dejar su opinión desde su portal. El administrador las modera antes de que aparezcan en la web:

- Aprobar: el testimonio se publica en la página de inicio.
- Rechazar: no se publica (el cliente puede editarlo y reenviarlo).
- Eliminar: quita el testimonio definitivamente.

## 11. Usuarios (administrador)

Solo el administrador ve esta pestaña. Sirve para gestionar al personal:

- Cambiar el rol de un usuario (administrador, abogado, procurador o cliente).
- Activar o desactivar cuentas. No es posible desactivar la propia cuenta.

## 12. Auditoría (administrador)

Es la bitácora del sistema. Registra las acciones importantes (quién creó, editó o eliminó algo, cambios de rol, moderación de testimonios, etc.), con fecha, usuario y detalle. Útil para control interno y transparencia.

## 13. Portal del cliente

Cuando un cliente inicia sesión, ve una versión reducida y privada:

- Mis procesos: el listado de sus casos, su estado y la próxima audiencia, además de un botón para consultar por WhatsApp.
- Mi opinión: un formulario para calificar el servicio y dejar un comentario, que el bufete revisa antes de publicarlo.

## 14. La página web pública

Es la cara del bufete hacia los clientes. Incluye:

- Inicio, Áreas de práctica, Nosotros (equipo), Casos de éxito, Blog y Preguntas frecuentes.
- Sección «Contáctenos» con el formulario (que llega a la bandeja de Consultas) y la opción de escribir por WhatsApp a un abogado específico.
- Botón flotante de WhatsApp que abre un menú con los cinco abogados.
- Páginas legales: Aviso de privacidad y Términos y condiciones, enlazadas en el pie de página.

> **Privacidad del equipo:** La barra superior y el pie ya no muestran correos ni teléfonos personales: el canal principal es el formulario y, de forma directa, el WhatsApp de cada abogado.

## 15. Configuración técnica (Supabase y despliegue)

Esta sección es para quien administra la parte técnica.

### Base de datos (Supabase)

En la carpeta db/ del repositorio están los scripts SQL. Se ejecutan UNA sola vez, en orden, en el SQL Editor de Supabase:

- schema.sql — tablas base, reglas de acceso por rol y almacenamiento de documentos.
- 02_portal_clientes.sql — rol cliente y aislamiento de datos.
- 03_blog_alertas_testimonios.sql — blog, alertas y testimonios.
- 04_modelos_nurej.sql — biblioteca de modelos y campo NUREJ.
- 05_multiples_abogados.sql — varios abogados/procuradores por proceso.
- 06_consultas.sql — bandeja de Consultas (formulario de contacto).
- 07_sync_clientes.sql — crea la ficha de cliente al registrarse en el portal.
- 08_categorias.sql — áreas del derecho dinámicas (crear categorías desde el panel).

### Conexión y correo

- La conexión a Supabase está en sistema/js/config.js (URL y clave pública).
- El aviso por correo de las consultas usa Web3Forms; la clave está en el formulario de contacto de index.html.

### Despliegue (publicar cambios)

El sitio se publica con Netlify, conectado al repositorio de GitHub. Al subir cambios a la rama principal (main), Netlify vuelve a publicar el sitio automáticamente en uno o dos minutos.

## 16. Cómo agregar un nuevo abogado

1. En Supabase, vaya a Authentication → Users → Add user, y cree la cuenta con su correo (o pídale que se registre desde la pantalla de acceso).
2. Ingrese al panel como administrador y abra la pestaña «Usuarios».
3. Busque al nuevo usuario y cámbiele el rol a «Abogado» o «Procurador».
4. Listo: ya podrá ingresar y trabajar según su rol.

## 17. Mantenimiento y buenas prácticas

- Cada persona debe tener su propia cuenta; no comparta usuarios ni contraseñas.
- Use contraseñas robustas y cámbielas periódicamente.
- Cierre sesión en equipos compartidos.
- Revise la bandeja de Consultas a diario para no dejar clientes sin respuesta.
- Mantenga al día los estados de los procesos y las próximas audiencias.
- Supabase guarda los datos en la nube; aun así, conviene exportar respaldos periódicos desde el panel de Supabase.

## 18. Solución de problemas frecuentes

### No veo la pestaña «Consultas» o da error

Falta ejecutar el script db/06_consultas.sql en Supabase (una sola vez). Si el error menciona una columna que no existe, vuelva a ejecutar el script, que está preparado para completar la tabla sin borrar datos.

### Envié una consulta de prueba y no aparece

- Verifique que el sitio ya tenga publicada la última versión (Netlify).
- Confirme que sistema/js/config.js tiene la URL y la clave de Supabase correctas.
- Revise el filtro de estado en la bandeja (puede estar en «Atendidas»).

### No puedo iniciar sesión

- Revise que el correo y la contraseña sean correctos.
- Si la cuenta fue desactivada, pida al administrador que la reactive en «Usuarios».

### Un cliente no ve sus procesos

Debe haberse registrado con el mismo correo que figura en su ficha de cliente y en sus procesos. Verifique el correo en la pestaña «Clientes».

## 19. Soporte

Ante cualquier duda sobre el uso del sistema, contacte al administrador del bufete. Para cambios o mejoras en la web o el panel, conserve este manual como referencia y describa con el mayor detalle posible lo que necesita.


> **Versión:** Este manual describe el funcionamiento del sistema a la fecha indicada en la portada. Si el sistema se actualiza, solicite una versión nueva del manual.
