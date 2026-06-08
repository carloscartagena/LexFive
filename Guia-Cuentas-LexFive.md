# Guía de Cuentas y Accesos — LexFive Abogados

_Servicios que usa el sistema y cómo entrar a cada uno · Versión: junio de 2026 · lexfive.netlify.app_

## Contenido

- 1. Introducción
- 2. Vista rápida de las cuentas
- 3. GitHub — el código del sistema
- 4. Netlify — publica la página en internet
- 5. Supabase — la base de datos y los usuarios
- 6. Web3Forms — envío de las consultas por correo
- 7. Correo del bufete (Gmail)
- 8. Panel del sistema LexFive
- 9. Recomendaciones para no perder los accesos


## 1. Introducción

Esta guía reúne todas las cuentas y servicios en internet que hacen funcionar el sistema de LexFive. Para cada uno encontrará: para qué sirve, con qué cuenta se ingresa, la dirección web para entrar y un breve paso a paso. Así podrá cerrar las pestañas con tranquilidad y volver a entrar cuando lo necesite.

> **En resumen:** Tres servicios sostienen todo el sistema: GitHub (guarda el código), Netlify (publica la página en internet) y Supabase (guarda los datos: procesos, clientes, etc.). Además, Web3Forms envía por correo una copia de las consultas.

> **Importante sobre las contraseñas:** Sus contraseñas NO se guardan en este documento por seguridad. Anótelas en un lugar privado y seguro. Si las olvida, cada servicio tiene la opción «¿Olvidó su contraseña?» para recuperarlas por correo.

## 2. Vista rápida de las cuentas

Correo del bufete usado en todas las cuentas: alba23meira@gmail.com

- GitHub — guarda el código. Entrar en github.com con «Continuar con Google».
- Netlify — publica el sitio. Entrar en app.netlify.com con «Continuar con GitHub».
- Supabase — base de datos y usuarios. Entrar en supabase.com con «Continuar con GitHub».
- Web3Forms — envío por correo de las consultas. Funciona con una clave, no con login.
- Correo Gmail del bufete — recibe las consultas y recupera las demás cuentas.
- Panel del sistema LexFive — donde trabaja el equipo (no es una cuenta externa).

> **Lo más importante:** Cadena de accesos (verificada): Supabase entra con GitHub; Netlify entra con GitHub; y GitHub entra con Google (su Gmail). Por lo tanto, su correo de Google alba23meira@gmail.com es la LLAVE MAESTRA de todo el sistema: cuide muy bien su contraseña y actívele verificación en dos pasos.

## 3. GitHub — el código del sistema

Guarda todos los archivos del sistema (la página y el panel). Cada cambio queda registrado aquí, y desde aquí se publica automáticamente en Netlify.

### Cómo entrar

1. Vaya a github.com y pulse «Sign in».
2. Elija «Continuar con Google» con el correo del bufete (alba23meira@gmail.com). Así ingresó su cuenta y es la forma más cómoda.
3. Su proyecto (repositorio) se llama «LexFive»: github.com/carloscartagena/LexFive

### Para qué lo usará

- Ver los archivos del sistema y el historial de cambios.
- Descargar los documentos del repositorio (manuales, scripts de base de datos).
- No necesita tocar el código: de los cambios se encarga el desarrollo.

> **Su caso:** Verificado: su GitHub también tiene una contraseña propia configurada. Es decir, puede entrar con «Continuar con Google» o con su correo + contraseña de GitHub. Recomendado: use Google y conserve la contraseña como respaldo.

## 4. Netlify — publica la página en internet

Toma el código de GitHub y lo publica en internet. Gracias a Netlify, su sitio está en línea en la dirección lexfive.netlify.app. Cada vez que se sube un cambio a GitHub, Netlify vuelve a publicar el sitio solo, en uno o dos minutos.

### Cómo entrar

1. Vaya a app.netlify.com y pulse «Log in».
2. Elija «Continuar con GitHub» (su cuenta de GitHub está conectada a Netlify).
3. En «Sites» verá su sitio «lexfive»; en «Deploys» comprueba si la última publicación salió bien.

### Para qué lo usará

- Confirmar que el sitio está publicado y en línea.
- Más adelante, si compra un dominio propio (ej. lexfive.bo), se conecta aquí.
- Por lo general no necesita entrar a diario: el sitio se actualiza solo.

> **Su caso:** Verificado: en Netlify, Google NO está conectado, así que NO use «Continuar con Google» aquí. Sí puede entrar con «Continuar con GitHub» o con su correo (alba23meira@gmail.com) + la contraseña propia de Netlify.

## 5. Supabase — la base de datos y los usuarios

Es el servicio más importante para el día a día: guarda los procesos, clientes, consultas, documentos, testimonios y las cuentas de acceso de los usuarios. El panel del sistema lee y escribe aquí.

### Cómo entrar

1. Vaya a supabase.com y pulse «Sign in».
2. Elija «Continuar con GitHub» (su cuenta de Supabase está vinculada a GitHub, con el correo alba23meira@gmail.com).
3. Abra su proyecto (LexFive). Las secciones que más usará: «Authentication → Users» (cuentas) y «SQL Editor» (scripts de la carpeta db/).

### Datos de su proyecto (públicos, no son secretos)

- Dirección del proyecto (URL): https://soazmibvesvuwgxeealo.supabase.co
- Estos datos ya están configurados en el sistema; no necesita copiarlos a ningún lado.

### Para qué lo usará

- Crear o habilitar usuarios (abogados, procuradores) en Authentication → Users.
- Ejecutar una sola vez los scripts de la carpeta db/ (ver la guía de pasos pendientes).
- Hacer respaldos de la información cada cierto tiempo.

> **Su caso:** Verificado: en «Account identities» figura GitHub (carloscartagena · alba23meira@gmail.com). Su acceso a Supabase pasa por GitHub, así que entre siempre con «Continuar con GitHub». No confunda esto con «Connections → GitHub», que sirve para conectar repositorios y no es su forma de iniciar sesión.

## 6. Web3Forms — envío de las consultas por correo

Cuando alguien llena el formulario de contacto de la web, Web3Forms envía una copia de ese mensaje al correo del bufete. (La consulta además queda guardada en la bandeja «Consultas» del panel, así que no se pierde aunque el correo falle.)

### Cómo entrar

1. Vaya a web3forms.com e ingrese con su Gmail del bufete (alba23meira@gmail.com), que es con el que se registró.
2. El servicio funciona con una «Access Key» (clave de acceso) ligada a ese correo.
3. Si necesita una clave nueva, ingrese el correo del bufete en su página y la recibirá por correo.

### Para qué lo usará

- Casi nunca: solo si deja de llegar el correo de las consultas o si cambia el correo de destino.
- Si genera una clave nueva, pásesela al desarrollo para reemplazarla en el sistema.

> **Su caso:** Verificado: se registró con su Gmail del bufete. Una razón más para cuidar la contraseña de ese correo y activarle verificación en dos pasos.

## 7. Correo del bufete (Gmail)

El correo del bufete es la pieza central de todo: con él se crearon (o se pueden recuperar) las cuentas de GitHub, Netlify y Supabase, y a él llegan las consultas de la web mediante Web3Forms.

- Entrar en: gmail.com (o el proveedor de correo que use el bufete).
- Cuídelo especialmente: quien tenga acceso a este correo podría recuperar las demás cuentas. Use una contraseña fuerte y, de ser posible, verificación en dos pasos.

## 8. Panel del sistema LexFive

No es una cuenta externa, pero es donde trabaja el equipo todos los días. Sus usuarios se administran desde Supabase y desde la propia pestaña «Usuarios» del panel.

- Sitio público: https://lexfive.netlify.app
- Ingreso al panel: https://lexfive.netlify.app/sistema/login.html
- Cada abogado, procurador y cliente entra con su propio correo y contraseña.

## 9. Recomendaciones para no perder los accesos

- Use SIEMPRE el mismo correo del bufete para todos estos servicios; así son fáciles de recuperar.
- Si entró con «Continuar con Google», entre siempre por esa misma opción.
- Anote en un lugar privado y seguro qué método usó para cada servicio (Google o correo+contraseña).
- Active la verificación en dos pasos al menos en el correo y en GitHub.
- Puede cerrar todas las pestañas con tranquilidad: con esta guía sabrá volver a entrar.
- Si un servicio le pide la contraseña y no la recuerda, use «¿Olvidó su contraseña?» para recibir un enlace de recuperación en el correo del bufete.


> **Conserve esta guía:** Mantenga este documento en un lugar seguro y privado, ya que indica qué cuentas sostienen el sistema. No incluye contraseñas, pero sí orienta sobre cómo entrar.
