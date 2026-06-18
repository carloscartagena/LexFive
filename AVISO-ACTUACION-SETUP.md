# Aviso automático al cliente por nueva actuación

Cuando un abogado o procurador registra una **nueva actuación** (paso) en un
proceso, el sistema avisa automáticamente al **cliente** de ese proceso:

- por **correo** (genérico, sin el detalle, invitándolo a entrar a su portal), y
- por **notificación push**, si el cliente activó las notificaciones en su portal.

La lógica vive en la Edge Function `supabase/functions/avisar-actuacion`.

## Requisitos

Esta función reutiliza la misma configuración que los recordatorios diarios
(`recordatorios-audiencias`). Si esa ya funciona, solo falta **desplegar** esta.

Secretos necesarios en **Supabase → Edge Functions → Secrets** (ya deberían
existir si los recordatorios funcionan):

- `RESEND_API_KEY` — clave de [resend.com](https://resend.com) para enviar correo.
- `MAIL_FROM` — remitente, por ejemplo `LexFive <avisos@tudominio.com>`.
- `VAPID_PUBLIC` y `VAPID_PRIVATE` — claves para las notificaciones push.
- `PORTAL_URL` *(opcional)* — URL del portal; por defecto el de Netlify.

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase solo.

## Desplegar

Con el [CLI de Supabase](https://supabase.com/docs/guides/cli) instalado y sesión
iniciada (`supabase login`), desde la carpeta del proyecto:

```bash
supabase functions deploy avisar-actuacion --project-ref soazmibvesvuwgxeealo
```

Eso es todo. El sistema ya llama a la función al guardar una actuación; mientras
no esté desplegada, **no pasa nada** (el guardado funciona igual, solo no se
envía el aviso).

## Notas

- El correo es **genérico a propósito**: dice que hay una novedad e invita a
  entrar al portal, sin incluir el texto de la actuación (privacidad).
- El cliente recibe el push solo si **activó las notificaciones** en su portal
  y se registró con el **mismo correo** que figura en su ficha de cliente.
- No requiere cambios en la base de datos.
