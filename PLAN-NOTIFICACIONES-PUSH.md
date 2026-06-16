# Plan — Notificaciones push reales (función #10)

Este documento describe **cómo implementar notificaciones push de verdad** en LexFive:
avisos que lleguen al teléfono o la computadora del abogado **aunque el sistema
esté cerrado** (por ejemplo: "Mañana tiene audiencia en el proceso X").

> **Importante (por qué es un plan y no un PR de código):** las push reales
> necesitan **un servidor que las envíe**. La web por sí sola no puede mandar
> una notificación cuando está cerrada. Por eso esta función requiere desplegar
> una **Edge Function en Supabase** y programarla. Todo se puede hacer en los
> planes **gratuitos** de Supabase, Netlify y GitHub.

---

## 1. ¿Qué ya tienes hoy (sin push)?

- Aviso de audiencias **al abrir el panel** (toast de vencidas/próximas).
- Recordatorios manuales por **WhatsApp** y por **correo**.
- Exportar el evento a **Google Calendar** (que sí notifica en el teléfono).

La push agrega el aviso **automático y sin abrir nada**.

---

## 2. Arquitectura (4 piezas)

```
   [Navegador del abogado]            [Supabase]                 [Programador]
  ┌───────────────────────┐     ┌────────────────────┐      ┌──────────────────┐
  │ 1. Service Worker      │     │ 3. Tabla            │      │ 4. Cron diario   │
  │    (recibe la push)    │◄────│  push_subscriptions │◄─────│  (GitHub Actions)│
  │ 2. Pide permiso y se   │     │ 5. Edge Function    │      │  llama a la      │
  │    suscribe (guarda en │────►│  "enviar-recordatorios"     │  Edge Function   │
  │    push_subscriptions) │     │   firma con VAPID y │      └──────────────────┘
  └───────────────────────┘     │   envía las push    │
                                 └────────────────────┘
```

1. **Service Worker** (`sistema/sw.js`): escucha el evento `push` y muestra la notificación.
2. **Suscripción** (en `app.js`): pide permiso al usuario y guarda su "suscripción" en la base.
3. **Tabla `push_subscriptions`**: guarda a quién y a qué dispositivo enviar.
4. **Edge Function + Cron**: una vez al día revisa audiencias próximas y envía las push.

---

## 3. Pasos de implementación

### Paso 0 — Generar las claves VAPID (una sola vez)
Las claves VAPID identifican al servidor que envía las push.
```bash
npx web-push generate-vapid-keys
```
Se obtienen una **clave pública** (va en el navegador) y una **privada** (secreta, va en Supabase).

### Paso 1 — Tabla en la base de datos
```sql
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;

-- Cada usuario gestiona solo SUS suscripciones.
create policy push_sel on public.push_subscriptions for select to authenticated
  using (user_id = auth.uid());
create policy push_ins on public.push_subscriptions for insert to authenticated
  with check (user_id = auth.uid());
create policy push_del on public.push_subscriptions for delete to authenticated
  using (user_id = auth.uid());
```

### Paso 2 — Service Worker (`sistema/sw.js`)
Agregar al final:
```js
self.addEventListener('push', (event) => {
  const data = (() => { try { return event.data.json(); } catch (e) { return { title: 'LexFive', body: event.data ? event.data.text() : '' }; } })();
  event.waitUntil(self.registration.showNotification(data.title || 'LexFive', {
    body: data.body || '',
    icon: '../assets/pwa/icon-192.png',
    badge: '../assets/pwa/icon-192.png',
    data: { url: data.url || './index.html' }
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url || './index.html'));
});
```

### Paso 3 — Suscripción en la app (`app.js`)
Un botón "Activar notificaciones" (junto a la tarjeta de Seguridad del Panel) que:
```js
async function activarPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    toast('Su navegador no soporta notificaciones push.', 'error'); return;
  }
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') { toast('No se concedió el permiso de notificaciones.', 'error'); return; }
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) // la clave pública
  });
  const json = sub.toJSON();
  await supabase.from('push_subscriptions').upsert({
    user_id: state.profile.id,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth
  }, { onConflict: 'endpoint' });
  toast('Notificaciones activadas en este dispositivo.', 'success');
}
```
(`urlBase64ToUint8Array` es un helper estándar de ~6 líneas; la clave pública VAPID iría en `config.js`.)

### Paso 4 — Edge Function que envía (`supabase/functions/enviar-recordatorios/index.ts`)
En Deno, usando `web-push`:
```ts
// Pseudocódigo resumido
import webpush from "npm:web-push";
webpush.setVapidDetails("mailto:bufete@lexfive.com", VAPID_PUBLIC, VAPID_PRIVATE);

// 1) Buscar audiencias/plazos dentro de las próximas 24-48 h.
// 2) Para cada abogado responsable, traer sus push_subscriptions.
// 3) Enviar la push:
await webpush.sendNotification(sub, JSON.stringify({
  title: "Audiencia próxima",
  body: `Mañana: ${proceso.caratula}`,
  url: "https://lexfive.netlify.app/sistema/index.html"
}));
// 4) Si una suscripción da 404/410, borrarla (dispositivo dado de baja).
```
Se despliega con la CLI de Supabase:
```bash
supabase functions deploy enviar-recordatorios
supabase secrets set VAPID_PUBLIC=... VAPID_PRIVATE=...
```

### Paso 5 — Programar el envío (cron diario)
La opción más simple y gratuita, **reutilizando lo que ya usas (GitHub Actions)**:
`.github/workflows/push-recordatorios.yml`
```yaml
on:
  schedule:
    - cron: '0 12 * * *'   # 08:00 Bolivia, todos los días
  workflow_dispatch: {}
jobs:
  push:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X POST "https://soazmibvesvuwgxeealo.supabase.co/functions/v1/enviar-recordatorios" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_FUNCTION_KEY }}"
```
(Alternativa: `pg_cron` + `pg_net` dentro de Supabase, sin GitHub.)

---

## 4. Esfuerzo estimado y costo

| Pieza | Esfuerzo | Costo |
|---|---|---|
| Tabla + RLS | Bajo | Gratis |
| Service Worker + suscripción (frontend) | Medio | Gratis |
| Edge Function (envío) | Medio | Gratis (límites holgados) |
| Cron (GitHub Actions) | Bajo | Gratis |

**Total:** ~1 a 2 sesiones de trabajo. Sin costo en los planes gratuitos.

---

## 5. Limitaciones honestas

- **iPhone/iPad:** las push web **solo** funcionan si el usuario **instala la app**
  en la pantalla de inicio (iOS 16.4+). En Android y computadora funcionan en el navegador.
- Cada usuario debe **conceder permiso** y **activarlas** en cada dispositivo.
- Si el navegador/dispositivo está apagado, la notificación llega cuando se reconecta.
- Requiere **mantener** una Edge Function (es una pieza más de infraestructura).

---

## 6. Recomendación de implementación por fases

1. **Fase A (base):** tabla `push_subscriptions` + Service Worker + botón "Activar
   notificaciones". Probar que llega una push de prueba manual.
2. **Fase B (envío real):** Edge Function `enviar-recordatorios` + secrets VAPID.
3. **Fase C (automatización):** cron diario por GitHub Actions.
4. **Fase D (pulido):** baja automática de suscripciones muertas, preferencias por
   usuario (a cuántas horas avisar), etc.

> Mientras tanto, las alternativas que **ya funcionan** (aviso al abrir el panel +
> WhatsApp + correo + Google Calendar) cubren la necesidad sin infraestructura extra.
