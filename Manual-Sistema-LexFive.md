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
- 12. Categorías / áreas del derecho (administrador)
- 13. Auditoría (administrador)
- 14. Portal del cliente
- 15. La página web pública
- 16. Configuración técnica (Supabase y despliegue)
- 17. Cómo agregar un nuevo abogado
- 18. Mantenimiento y buenas prácticas
- 19. Solución de problemas frecuentes
- 20. Credenciales del bufete (administrador y abogados)
- 21. Certificados y constancias
- 22. Sitio web (imágenes y fondo de la página)
- 23. Respaldos, instalación y conexión a internet
- 24. Soporte


## 1. Introducción: qué es el sistema

LexFive cuenta con dos partes que trabajan juntas:

- La página web pública (lexfive.netlify.app): presenta al bufete, sus áreas de práctica, casos de éxito, blog, preguntas frecuentes y un formulario de contacto.
- El panel de gestión (parte privada, en /sistema): donde el personal administra procesos, clientes, consultas, modelos de memoriales, blog y testimonios.

Toda la información se guarda de forma segura en una base de datos en la nube (Supabase). El panel y la web comparten esa base de datos: por ejemplo, un artículo que se publica en el panel aparece automáticamente en el blog, y una consulta enviada desde la web llega a la bandeja de Consultas del panel.

> **Importante:** Para usar el panel necesita un usuario y contraseña. Para navegar la web pública no se necesita iniciar sesión.

> **Ayuda en pantalla:** ¿No sabe qué hace un campo o un botón? Pase el mouse (o toque, en celular) sobre el ícono «?» de color dorado que aparece junto a títulos y campos: el propio sistema le explicará para qué sirve y qué debe hacer. Están repartidos por todo el panel.

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
- No se preocupe si esto ocurre mientras redacta: el sistema guarda automáticamente lo que escribe en cualquier formulario (proceso, cliente, actuación, artículo del blog, opinión y el formulario de contacto de la web). Al volver a abrir ese mismo formulario, le ofrecerá «Recuperar» lo que había dejado.
- Use el botón «Cerrar sesión» al terminar, sobre todo en equipos compartidos.
- Al hacer clic en el logo de LexFive (arriba a la izquierda) vuelve al sitio web público y, por seguridad, se cierra su sesión: al regresar deberá ingresar sus credenciales de nuevo. Lo que estaba escribiendo queda autoguardado y se recupera al volver a entrar.
- Si olvidó su contraseña, solicite ayuda al administrador del sistema.

## 4. Panel general (Dashboard)

Es la primera pantalla del personal. Muestra un resumen con tarjetas (métricas) y accesos rápidos:

- Procesos totales y procesos activos.
- Audiencias próximas.
- Mis procesos: los casos en los que usted está asignado.
- Consultas nuevas: mensajes del formulario web aún sin atender. Al hacer clic en esta tarjeta se abre directamente la bandeja de Consultas.
- «Mis pendientes»: sus tareas asignadas sin terminar, con las vencidas en rojo y las de hoy en ámbar; puede completarlas con un toque (✓) o abrirlas.
- «Mi agenda» (próximos 7 días): sus audiencias y los plazos de sus procesos, con acceso directo al proceso o al calendario.
- Gráficos: procesos por estado, materia, carga por abogado e ingresos por mes.

En la barra superior y el menú lateral, todos los roles disponen de: una campanita de notificaciones (novedades, con contador de no leídas); contadores en el menú (tareas pendientes asignadas y consultas nuevas); botones de tamaño de letra (A− / A+) y modo claro/oscuro; y un buscador global (procesos, clientes, consultas y actuaciones) con el botón «Buscar» o Ctrl/Cmd + K.

> **Recordatorios:** Cada mañana el sistema envía a cada abogado, por correo y notificación push, un resumen con sus audiencias, plazos y tareas del día siguiente.

## 5. Procesos (casos)

La pestaña «Procesos» es el corazón del sistema. Allí se registra y da seguimiento a cada caso.

### Crear o editar un proceso

1. Pulse «Nuevo proceso» (o haga clic sobre un proceso existente para editarlo).
2. Complete los datos: carátula, número/NUREJ, materia, estado, parte contraria y la próxima audiencia. En «Materia» puede elegir «Crear nueva categoría...» para agregar un área del derecho que no esté en la lista; quedará disponible en todo el sistema.
3. Asigne uno o varios abogados y procuradores a cargo.
4. Vincule un cliente existente o registre uno nuevo directamente desde el formulario.
5. Guarde. El proceso queda registrado y visible para el equipo asignado.

> **Autoguardado:** Mientras escribe (sobre todo descripciones largas o un memorial), el sistema guarda un borrador automático en su equipo. Esto aplica a TODOS los formularios del sistema (procesos, clientes, actuaciones, blog, opinión y el contacto de la web). Si la sesión se cierra o cierra el navegador, al reabrir el formulario podrá «Recuperar» lo que había dejado y solo completar lo que falte. Al guardar, el borrador se descarta.

### Documentos y actuaciones

- Documentos generales del proceso: en «Memoriales y documentos» puede subir y descargar archivos sueltos (carátula, poder, anexos, etc.).
- Historial de actuaciones: registre cada paso del proceso con su fecha y una descripción (por ejemplo, «Respuesta del juzgado» o «Nuevo memorial presentado»).
- A cada paso del historial puede adjuntar uno o varios archivos: así sube la respuesta recibida del juzgado y, junto a ella, el nuevo memorial que se presentará.
- El cliente del caso ve su historial en modo lectura: puede abrir y descargar la respuesta del juzgado y el nuevo memorial, pero no modificar nada.

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

## 12. Categorías / áreas del derecho (administrador)

Las áreas del derecho (Laboral, Civil, Penal, etc.) clasifican los procesos y los modelos de memoriales. Esta pestaña permite administrarlas:

- Crear una categoría nueva: aparece al instante en las listas de Procesos y Modelos.
- Renombrar una categoría: los procesos y modelos que la usaban se actualizan automáticamente, sin perder su clasificación.
- Eliminar una categoría: solo es posible si no está en uso (la tabla muestra cuántos procesos y modelos usan cada una).

> **Atajo:** También puede crear una categoría sobre la marcha desde los formularios de Procesos y de Modelos, eligiendo «Crear nueva categoría...» en el selector de área.

## 13. Auditoría (administrador)

Es la bitácora del sistema. Registra las acciones importantes (quién creó, editó o eliminó algo, cambios de rol, moderación de testimonios, etc.), con fecha, usuario y detalle. Útil para control interno y transparencia.

## 14. Portal del cliente

Cuando un cliente inicia sesión, ve una versión reducida y privada:

- Mis procesos: el listado de sus casos, su estado y la próxima audiencia, además de un botón para consultar por WhatsApp.
- Dentro de cada caso ve su historial de actuaciones y puede descargar los archivos de cada paso: la respuesta del juzgado y el nuevo memorial presentado, entre otros.
- Avisos de novedades: cuando su abogado registra una nueva actuación, el cliente recibe un aviso por la campanita de su portal, por notificación push y por correo (genérico, sin el detalle, por privacidad).
- Mi estado de cuenta: el cliente puede descargar en PDF el detalle de honorarios y pagos de sus procesos, con el saldo pendiente.
- Mi opinión: un formulario para calificar el servicio y dejar un comentario, que el bufete revisa antes de publicarlo.

## 15. La página web pública

Es la cara del bufete hacia los clientes. Incluye:

- Inicio, Áreas de práctica, Nosotros (equipo), Casos de éxito, Blog y Preguntas frecuentes.
- Sección «Contáctenos» con el formulario (que llega a la bandeja de Consultas) y la opción de escribir por WhatsApp a un abogado específico.
- Botón flotante de WhatsApp que abre un menú con los cinco abogados.
- Páginas legales: Aviso de privacidad y Términos y condiciones, enlazadas en el pie de página.

> **Privacidad del equipo:** La barra superior y el pie ya no muestran correos ni teléfonos personales: el canal principal es el formulario y, de forma directa, el WhatsApp de cada abogado.

## 16. Configuración técnica (Supabase y despliegue)

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
- 09_actuaciones_archivos.sql — adjuntar archivos a cada actuación del historial.
- 10 a 26 — etapas siguientes: branding compartido y en tiempo real (logo/sello), gestión avanzada (tareas, plazos, honorarios y pagos), plantillas, privacidad del personal, papeleras de procesos y clientes, recibos correlativos, credenciales en la nube, registro de horas, suscripciones push, notificaciones in-app y estado de cuenta del cliente (24_notificaciones_estado_cuenta.sql), y el registro y verificación de certificados (25_certificados.sql y 26_certificados_cuerpo.sql).

Además, en supabase/functions/ hay dos funciones programadas que se despliegan en Supabase: «recordatorios-audiencias» (envía cada mañana audiencias, plazos y tareas del día siguiente por correo y push) y «avisar-actuacion» (avisa al cliente por correo, push y campanita al registrarse una nueva actuación). Su configuración está en los archivos RECORDATORIOS-SETUP.md, AVISO-ACTUACION-SETUP.md y MEJORAS-BLOQUE2-SETUP.md.

### Conexión y correo

- La conexión a Supabase está en sistema/js/config.js (URL y clave pública).
- El aviso por correo de las consultas usa Web3Forms; la clave está en el formulario de contacto de index.html.

### Despliegue (publicar cambios)

El sitio se publica con Netlify, conectado al repositorio de GitHub. Al subir cambios a la rama principal (main), Netlify vuelve a publicar el sitio automáticamente en uno o dos minutos.

## 17. Cómo agregar un nuevo abogado

1. En Supabase, vaya a Authentication → Users → Add user, y cree la cuenta con su correo (o pídale que se registre desde la pantalla de acceso).
2. Ingrese al panel como administrador y abra la pestaña «Usuarios».
3. Busque al nuevo usuario y cámbiele el rol a «Abogado» o «Procurador».
4. Listo: ya podrá ingresar y trabajar según su rol.

## 18. Mantenimiento y buenas prácticas

- Cada persona debe tener su propia cuenta; no comparta usuarios ni contraseñas.
- Use contraseñas robustas y cámbielas periódicamente.
- Cierre sesión en equipos compartidos.
- Revise la bandeja de Consultas a diario para no dejar clientes sin respuesta.
- Mantenga al día los estados de los procesos y las próximas audiencias.
- Supabase guarda los datos en la nube; aun así, conviene exportar respaldos periódicos desde el panel de Supabase.

## 19. Solución de problemas frecuentes

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

## 20. Credenciales del bufete (administrador y abogados)

El panel incluye una pestaña «Credenciales», visible solo para el administrador y los abogados (los procuradores y clientes no la ven). Genera una credencial o carnet de LexFive con fondo blanco, tamaño 9 x 6 cm y con una guía de corte punteada para recortarla, lista para imprimir o guardar como PDF.

- Usted llena los datos: nombre, cargo, carnet de identidad, correo, teléfono personal y de oficina, y las fechas de emisión y validez. La credencial se actualiza en vivo.
- Puede elegir el logotipo del bufete entre varios modelos; el elegido se aplica en toda la página, el panel y la credencial. El logo y el sello se sincronizan en la nube y se actualizan en vivo en todos los dispositivos (computadora y celular).
- Puede regular la «Intensidad del logo de fondo» (la marca de agua de la credencial) con un control deslizante; el ajuste se guarda y se aplica en todos los dispositivos.
- Las credenciales que crea quedan GUARDADAS en la nube: en «Credenciales guardadas» puede verlas, editarlas, volver a imprimirlas o eliminarlas desde cualquier dispositivo. Si tiene muchas, use el buscador por nombre, carnet o cargo.
- Con el botón «Vista previa» revisa cómo saldrá la credencial (ambas caras) antes de imprimir o guardar el PDF.
- En el reverso puede escribir una frase del bufete y la base legal que faculta la representación del procurador (texto que redacta usted como abogado).
- Hay líneas para la firma autorizada y el sello del bufete. El sello del bufete ya se imprime en la credencial (en el frente y el reverso), usando el sello elegido en «Sellos y logos» y sin el cuadro blanco de fondo; así solo hace falta agregar a mano la firma o el sello personal.
- El logo y el sello se administran en la pestaña «Sellos y logos»: toque uno para verlo en grande y pulse «Usar este» para dejarlo como predeterminado, o suba el suyo (con opción de «Quitar fondo blanco» para fotos). Lo elegido se aplica en la web, el panel, las credenciales y los memoriales.

El administrador y los abogados entregan las credenciales a sus procuradores: el procurador se registra, el administrador le asigna el rol «Procurador» en Usuarios, y luego se llena e imprime su credencial.

> **Importante:** La base legal de la representación la redacta usted con su criterio profesional; el sistema no inventa números de artículo. Cada persona tiene su propia cuenta y no se comparten contraseñas.

## 21. Certificados y constancias

La pestaña «Certificados» (administrador y abogados) genera certificados y constancias en hoja membretada del bufete, en tamaño carta, con el logo, la dirección de la oficina, el sello y un código QR de verificación.

- Formatos: certificado de trabajo (procurador y general), constancia de pasantía universitaria, certificado de horas de práctica, carta de recomendación, constancia de desempeño/conducta y constancia de servicios prestados.
- Se completan los datos (nombre, C.I., cargo, período, universidad, etc.); el texto se redacta solo y puede editarse antes de imprimir. El nombre y el C.I. salen en negrilla.
- Botones «Imprimir / Guardar PDF» y «Descargar Word». El sello del bufete (el elegido en «Sellos y logos») va impreso a la derecha de la firma.
- Verificación: cada certificado se registra con un N.º de referencia y su QR abre la página pública de verificación, que confirma contra la base de datos que el documento fue emitido por el bufete.
- Sección «Certificados emitidos»: lista los generados, con búsqueda, filtro por fecha, quién lo emitió, y opciones para reimprimir o eliminar el registro.

> **Configuración:** Requiere ejecutar una sola vez los scripts db/25 y db/26 en Supabase para activar el registro y la verificación de certificados.

## 22. Sitio web (imágenes y fondo de la página)

La pestaña «Sitio web» (administrador y abogados) permite controlar las imágenes y el fondo de la página de inicio (lexfive.netlify.app) sin tocar el código. Lo que cambia aquí se ve en la web pública en unos segundos y se sincroniza entre todos los dispositivos.

- Imagen principal (hero): suba o quite la imagen que aparece como una tarjeta al costado del título. Conviene horizontal o cuadrada (ideal ~1200×900 px). Si no sube ninguna, se muestra la ilustración por defecto.
- Imagen de «Sobre el bufete»: la del recuadro de esa sección. Como el recuadro es alto, conviene una imagen vertical (ideal ~800×950 px). Si no sube ninguna, se usa la ilustración (la balanza) por defecto.
- Fondo del sitio: elija el patrón tenue que se ve detrás de algunas secciones — código binario (recomendado), circuito, líneas finas o ninguno.
- Imagen de fondo del encabezado: opcional, una foto panorámica detrás del título del hero (ideal ~1920×1080 px). El sistema le pone automáticamente una capa oscura por encima para que el título y los botones siempre se lean; solo afecta al encabezado, no a toda la página.
- Cada imagen tiene botones «Subir» y «Quitar». Al quitarla, vuelve la ilustración o el fondo por defecto.

Formatos admitidos: JPG, PNG o WebP (máximo 6 MB; el sistema las optimiza al subir).

> **Recomendación:** Todo se guarda en la configuración compartida del bufete (branding) y no requiere ningún script SQL. Consejo: para el fondo del encabezado, use imágenes oscuras o con poco detalle en el centro, ya que el título y los botones van encima.

## 23. Respaldos, instalación y conexión a internet

El sistema incluye varias ayudas para la seguridad de los datos y la comodidad de uso:

- Respaldo automático: la base de datos se respalda sola cada día (mediante GitHub Actions). No tiene que hacer nada.
- Respaldo manual: en el «Panel general», el administrador puede pulsar «Exportar respaldo (JSON)» para descargar una copia de los datos principales en su equipo. Se muestra la fecha del último respaldo manual.
- Instalar como app: en el celular puede «Agregar a la pantalla de inicio» desde el navegador y usar el sistema como una aplicación (abre más rápido y a pantalla completa).
- Aviso de «sin conexión»: si se queda sin internet, aparece un aviso. Lo que guarde queda en el equipo y se sincroniza al volver la conexión.

> **Recomendación:** Guarde los respaldos manuales en un lugar seguro. Son útiles si necesita revisar o restaurar datos antiguos.

## 24. Soporte

Ante cualquier duda sobre el uso del sistema, contacte al administrador del bufete. Para cambios o mejoras en la web o el panel, conserve este manual como referencia y describa con el mayor detalle posible lo que necesita.


> **Versión:** Este manual describe el funcionamiento del sistema a la fecha indicada en la portada. Si el sistema se actualiza, solicite una versión nueva del manual.
