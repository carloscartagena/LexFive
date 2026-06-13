# Recordatorios automáticos de audiencias — Guía de instalación

El sistema puede enviar **cada mañana un correo automático** a cada abogado con
las audiencias y plazos que tiene **al día siguiente**. Esto se hace con una
*Edge Function* de Supabase (el código ya está en
`supabase/functions/recordatorios-audiencias/`) y un servicio de correo gratuito
llamado **Resend**.

> Solo hay que configurarlo **una vez**. Después funciona solo, todos los días.

---

## Resumen de pasos

1. Crear una cuenta en Resend y obtener una API key.
2. Desplegar la función a Supabase.
3. Cargar las claves (secrets).
4. Programar el envío diario (cron).

---

## 1. Cuenta de correo (Resend)

1. Cree una cuenta gratuita en https://resend.com
2. Vaya a **API Keys** y cree una. Cópiela (empieza con `re_...`).
3. **Remitente (`MAIL_FROM`):**
   - Para **probar**: puede usar `LexFive <onboarding@resend.dev>` (Resend solo
     entrega a *su propio* correo verificado mientras prueba).
   - Para **producción**: en Resend agregue y verifique su dominio (ej.
     `lexfive.com`) y use algo como `LexFive <avisos@lexfive.com>`.

## 2. Desplegar la función

Con el [CLI de Supabase](https://supabase.com/docs/guides/cli) instalado y la
sesión iniciada (`supabase login`), desde la carpeta del proyecto:

```bash
supabase link --project-ref TU_PROJECT_REF
supabase functions deploy recordatorios-audiencias --no-verify-jwt
```

> `TU_PROJECT_REF` es el identificador de su proyecto (lo ve en la URL de
> Supabase: `https://supabase.com/dashboard/project/TU_PROJECT_REF`).
> `--no-verify-jwt` permite que el cron la llame sin iniciar sesión; la
> protegemos con un secreto propio (`CRON_SECRET`).

## 3. Cargar las claves (secrets)

Elija un texto secreto cualquiera para `CRON_SECRET` (sirve para que nadie más
pueda disparar los correos). Luego:

```bash
supabase secrets set RESEND_API_KEY=re_su_clave_aqui
supabase secrets set MAIL_FROM="LexFive <onboarding@resend.dev>"
supabase secrets set CRON_SECRET=un-texto-secreto-largo
```

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya las provee Supabase sola.

### Probar manualmente

```bash
curl -X POST "https://TU_PROJECT_REF.supabase.co/functions/v1/recordatorios-audiencias" \
  -H "x-cron-secret: un-texto-secreto-largo"
```

Debe responder un JSON con cuántos correos se enviaron. (Asegúrese de tener al
menos una audiencia o un plazo para *mañana* para ver un envío real.)

## 4. Programar el envío diario

En Supabase → **SQL Editor**, ejecute esto **una vez** (cambie la URL y el
secreto). Está programado para las **07:00 de Bolivia** (11:00 UTC):

```sql
-- Habilitar las extensiones necesarias (una sola vez)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Programar el envío diario
select cron.schedule(
  'recordatorios-lexfive',
  '0 11 * * *',              -- 11:00 UTC = 07:00 en Bolivia
  $$
  select net.http_post(
    url     := 'https://TU_PROJECT_REF.supabase.co/functions/v1/recordatorios-audiencias',
    headers := '{"Content-Type":"application/json","x-cron-secret":"un-texto-secreto-largo"}'::jsonb
  );
  $$
);
```

Para **cambiar el horario** vuelva a ejecutar `cron.schedule` con el mismo
nombre. Para **desactivarlo**:

```sql
select cron.unschedule('recordatorios-lexfive');
```

---

## Notas

- A quién le llega: a los **abogados a cargo** de cada proceso (campo
  "Abogados a cargo"). Si un proceso no tiene abogado asignado o el abogado no
  tiene correo en su perfil, no se envía para ese caso.
- Qué incluye: las audiencias (`próxima audiencia` del proceso) y los **plazos**
  registrados en la pestaña *Plazos* que caigan al día siguiente.
- Es independiente del sitio web: si algún día no configura esto, el resto del
  sistema funciona igual; solo no se enviarán los correos automáticos.
