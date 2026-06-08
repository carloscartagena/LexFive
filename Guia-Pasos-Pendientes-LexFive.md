# Tareas Pendientes — LexFive Abogados

_Configuración manual para dejar el sistema 100% operativo · Versión: junio de 2026 · lexfive.netlify.app_

## Contenido

- 1. Introducción
- 2. IMPRESCINDIBLE — Ejecutar los scripts de la base de datos
- 3. IMPRESCINDIBLE — Activar el inicio de sesión por correo
- 4. IMPRESCINDIBLE — Crear y marcar al administrador
- 5. IMPRESCINDIBLE — Dar de alta a los abogados y procuradores
- 6. RECOMENDADO — Subir las fotos del equipo
- 7. RECOMENDADO — Verificar el correo de las consultas
- 8. OPCIONAL — Mejoras a futuro
- 9. Lista de verificación rápida


## 1. Introducción

El sistema (página web y panel) ya está construido y publicado. Para dejarlo 100% operativo quedan algunas tareas que solo usted puede hacer, porque requieren sus cuentas, sus contraseñas o sus archivos. Esta guía las explica paso a paso, ordenadas por prioridad.

> **Cómo leer esta guía:** Las tareas marcadas como IMPRESCINDIBLES deben hacerse para que ciertas funciones trabajen. Las RECOMENDADAS mejoran la presentación. Las OPCIONALES son para más adelante.

## 2. IMPRESCINDIBLE — Ejecutar los scripts de la base de datos

En Supabase hay que ejecutar, una sola vez y en orden, los archivos de la carpeta db/ del proyecto. Cada uno activa una parte del sistema.

### Cómo hacerlo

1. Entre a supabase.com y abra su proyecto.
2. En el menú de la izquierda, elija «SQL Editor» y luego «New query».
3. Abra el primer archivo de la carpeta db/ (en GitHub), copie TODO su contenido, péguelo y pulse «Run».
4. Repita con cada archivo, respetando el orden de la lista de abajo.

### Orden de los scripts

- schema.sql — crea las tablas base, los permisos y el almacenamiento.
- 02_portal_clientes.sql — rol cliente y separación de datos.
- 03_blog_alertas_testimonios.sql — blog, alertas y testimonios.
- 04_modelos_nurej.sql — biblioteca de modelos y campo NUREJ.
- 05_multiples_abogados.sql — varios abogados/procuradores por proceso.
- 06_consultas.sql — bandeja de Consultas (formulario de contacto).
- 07_sync_clientes.sql — que los clientes registrados aparezcan en el panel.
- 08_categorias.sql — áreas del derecho que se pueden crear desde el panel.
- 09_actuaciones_archivos.sql — adjuntar archivos a cada paso del historial.

> **Si aparece un error:** Si un script muestra un error de «columna que no existe» o «ya existe», vuelva a ejecutarlo: están preparados para correrse sin romper ni borrar datos. Si el error persiste, cópielo y páselo al desarrollo.

## 3. IMPRESCINDIBLE — Activar el inicio de sesión por correo

Para que las cuentas funcionen al instante en uso interno, conviene no exigir confirmación por correo.

1. En Supabase, vaya a «Authentication» y luego a «Providers» (o «Sign In / Providers»).
2. Abra la opción «Email».
3. Desactive «Confirm email» y guarde los cambios.

## 4. IMPRESCINDIBLE — Crear y marcar al administrador

El administrador es quien tiene acceso total (usuarios, auditoría, categorías, etc.).

1. Cree su cuenta: desde la pantalla de acceso del panel (registro) o en Supabase, en «Authentication → Users → Add user».
2. En Supabase, abra «SQL Editor → New query».
3. Pegue esta línea, cambiando el correo por el suyo real, y pulse «Run»:
4. update public.profiles set rol = 'admin' where email = 'SU_CORREO@gmail.com';
5. Cierre sesión y vuelva a entrar: ya tendrá el rol de administrador.

## 5. IMPRESCINDIBLE — Dar de alta a los abogados y procuradores

1. Pídales que se registren desde la pantalla de acceso, o créelos en Supabase («Authentication → Users → Add user»).
2. Entre al panel como administrador y abra la pestaña «Usuarios».
3. A cada persona, cámbiele el rol a «Abogado» o «Procurador» según corresponda.

> **Recuerde:** Cuando alguien se registra, entra como «Cliente» por defecto. Para el personal, recuerde cambiarle el rol en la pestaña Usuarios.

## 6. RECOMENDADO — Subir las fotos del equipo

La sección «Nosotros» de la web muestra a los abogados. Mientras no haya fotos, se ven las iniciales (no se rompe nada).

1. Prepare 5 fotos cuadradas (aprox. 600 x 600 px), una por abogado.
2. Súbalas a la carpeta assets/equipo/ del proyecto en GitHub.
3. Use exactamente estos nombres de archivo: cartagena.jpg, corwin.jpg, antelo.jpg, candia.jpg, payrumani.jpg.

> **Atajo:** Si no sabe subir archivos a GitHub, puede enviármelas y yo las dejo colocadas con el nombre correcto.

## 7. RECOMENDADO — Verificar el correo de las consultas

El formulario de contacto envía una copia por correo mediante Web3Forms.

- Envíe una consulta de prueba desde la web y confirme que llega al correo del bufete.
- Si no llega, revise la carpeta de spam, o genere una clave nueva en web3forms.com con el correo del bufete y pásela al desarrollo.
- Aunque el correo falle, la consulta SIEMPRE queda guardada en la bandeja «Consultas» del panel.

## 8. OPCIONAL — Mejoras a futuro

- Dominio propio (por ejemplo lexfive.bo) y correo profesional (contacto@lexfive.bo) en lugar de Gmail. El dominio se conecta en Netlify.
- Revisar con criterio de abogado los textos del Aviso de privacidad y de Términos y condiciones, por si desean ajustar algún punto.
- Hacer respaldos periódicos de la base de datos desde Supabase.

## 9. Lista de verificación rápida

- [  ] Ejecuté los 9 scripts de la carpeta db/ en orden.
- [  ] Desactivé «Confirm email» en Supabase.
- [  ] Creé mi cuenta y me asigné el rol de administrador.
- [  ] Di de alta a los abogados/procuradores y les puse su rol.
- [  ] Subí las 5 fotos del equipo (o se las envié al desarrollo).
- [  ] Probé una consulta y confirmé que llega al correo.
- [  ] (Opcional) Dominio propio, textos legales revisados y respaldos.


> **Si se complica:** ¿Le aparece un error o se traba en algún paso? Anote en qué punto quedó y el mensaje exacto que ve; con eso es muy fácil ayudarle a destrabarlo.
