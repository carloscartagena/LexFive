# Verificación de certificados (versión avanzada)

Cada certificado que se genera se **registra en la base de datos** y la página
pública `verificar-certificado.html` lo **consulta por su N.º de referencia**.
Así, al escanear el QR, se confirma que el certificado **existe en los registros
del bufete** (no solo que el QR contiene datos).

## Paso único — correr el script SQL

En **Supabase → SQL Editor**, pega y ejecuta el contenido de
`db/25_certificados.sql` (botón **Run**). Es seguro repetirlo.

Esto crea:
- La tabla `certificados` (con permisos: solo admin/abogado registran y ven).
- La función pública `verificar_certificado(ref)` para la verificación por QR
  (devuelve un certificado solo si se conoce su referencia exacta; no permite
  "listar" todos, por privacidad).

## Cómo funciona

- Al pulsar **Imprimir / Guardar PDF** o **Descargar Word**, el certificado se
  registra automáticamente (con su N.º de referencia, p. ej. `LF-2026-12345`).
- El **QR** abre `verificar-certificado.html?ref=...`; la página consulta la BD:
  - Si lo encuentra → muestra **«Documento verificado en los registros oficiales»**.
  - Si no (o aún no corre el SQL) → usa como respaldo los datos del propio QR.
  - Si hay una referencia que no existe → **«Certificado no encontrado»**.

> Mientras no se ejecute `db/25`, los certificados se generan igual y el QR
> muestra los datos; solo no quedan registrados para la verificación oficial.


## Actualización — Certificados emitidos (reimprimir)

Para poder **reimprimir** un certificado tal cual se emitió, se agregó una
columna `cuerpo`. Si ya habías corrido `db/25` antes de esta mejora, ejecuta
también **`db/26_certificados_cuerpo.sql`** (una sola vez) en el SQL Editor.

En la pestaña **Certificados** ahora hay una sección **«Certificados emitidos»**
donde puedes **buscar**, **reimprimir** y **eliminar** los certificados generados.
