# Mantenimiento: continuidad y respaldos

Esta guía explica dos automatizaciones que dan tranquilidad operativa al sistema LexFive:

1. **Keep-alive** — evita que Supabase (plan gratuito) se *pause* por inactividad.
2. **Respaldos automáticos** — guarda copias de la base de datos cada día.

Ambas funcionan con **GitHub Actions** (ya incluidas en `.github/workflows/`). No hay que instalar nada en su computadora.

---

## 1. Keep-alive (sin configuración)

Archivo: `.github/workflows/keep-alive.yml`

- Se ejecuta automáticamente **cada 3 días** y hace una consulta mínima de solo lectura a Supabase.
- Usa la **clave pública** del proyecto (la misma que ya está en `sistema/js/config.js`), así que **no necesita configurar nada**.
- Para probarlo manualmente: pestaña **Actions** del repositorio → *Keep-alive Supabase* → **Run workflow**.

> Si en el futuro cambia la URL o la clave pública del proyecto, actualice esos valores dentro de `keep-alive.yml`.

---

## 2. Respaldos automáticos (requiere 1 secreto)

Archivo: `.github/workflows/backup-db.yml`

Genera un volcado completo (`pg_dump`) de la base y lo guarda como **artefacto descargable** en cada ejecución (se conservan **90 días**). Se ejecuta **todos los días a las 03:00 (hora de Bolivia)**.

### Configuración (una sola vez)

1. **Obtenga la cadena de conexión** en Supabase:
   - Vaya a **Project Settings → Database → Connection string → URI**.
   - Recomendado: la opción **Session pooler** (puerto `5432`).
   - Copie la cadena completa y **reemplace `[YOUR-PASSWORD]`** por la contraseña real de la base de datos.
   - Queda parecido a:
     `postgresql://postgres.xxxx:CONTRASEÑA@aws-0-...pooler.supabase.com:5432/postgres`

2. **Cree el secreto en GitHub:**
   - Repositorio → **Settings → Secrets and variables → Actions → New repository secret**.
   - **Name:** `SUPABASE_DB_URL`
   - **Secret:** la cadena de conexión del paso anterior.

3. **Pruébelo:** pestaña **Actions** → *Respaldo de base de datos* → **Run workflow**. Al terminar, baje al final de la ejecución y descargue el artefacto **`lexfive-db-backup`**.

### Cómo descargar un respaldo

Pestaña **Actions** → entre a una ejecución de *Respaldo de base de datos* → sección **Artifacts** → descargue `lexfive-db-backup` (un `.sql.gz`).

### Cómo restaurar un respaldo

Descomprima y aplique el volcado contra la base (reemplaza el contenido actual):

```bash
gunzip -c lexfive-backup-AAAAMMDD-HHMMSS.sql.gz | psql "LA_CADENA_DE_CONEXION"
```

> El volcado se genera con `--clean --if-exists`, por lo que limpia los objetos antes de recrearlos. Restaure solo cuando realmente quiera volver a ese punto.

---

## Resumen rápido

| Automatización | Archivo | Configuración | Frecuencia |
|---|---|---|---|
| Keep-alive | `keep-alive.yml` | Ninguna | Cada 3 días |
| Respaldos | `backup-db.yml` | Secreto `SUPABASE_DB_URL` | Diaria (03:00 Bolivia) |
