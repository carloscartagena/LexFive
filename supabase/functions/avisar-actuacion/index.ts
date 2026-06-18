// ============================================================
//  LexFive — Aviso al cliente por nueva actuación
//  Supabase Edge Function (Deno)
// ------------------------------------------------------------
//  Qué hace:
//   - Se llama desde el sistema cuando un abogado/procurador registra una
//     nueva actuación (paso) en un proceso.
//   - Busca al cliente del proceso y le avisa de que hay una novedad:
//       * por correo (Resend), si el cliente tiene email; y
//       * por notificación push, si el cliente activó las notificaciones
//         en su portal (se vincula por su correo).
//   - El correo es GENÉRICO a propósito (no incluye el detalle de la
//     actuación) para no exponer información sensible por email; invita al
//     cliente a entrar a su portal para ver la novedad.
//
//  Cómo se invoca (desde el navegador, con el usuario autenticado):
//     supabase.functions.invoke('avisar-actuacion',
//       { body: { proceso_id, descripcion } })
//
//  Variables de entorno (Supabase > Edge Functions > Secrets):
//   - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY  (las inyecta Supabase)
//   - RESEND_API_KEY     clave de https://resend.com  (para el correo)
//   - MAIL_FROM          remitente, ej: "LexFive <avisos@tudominio.com>"
//   - VAPID_PUBLIC / VAPID_PRIVATE   claves para push (las mismas que ya
//                        usa la función recordatorios-audiencias)
//   - PORTAL_URL (opcional)  URL del portal; por defecto el de Netlify.
// ============================================================

import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const MAIL_FROM = Deno.env.get("MAIL_FROM") ?? "LexFive <onboarding@resend.dev>";
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE") ?? "";
const PORTAL_URL = Deno.env.get("PORTAL_URL") ?? "https://lexfive.netlify.app/sistema/index.html";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const esc = (s: string) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

async function sb(path: string): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!res.ok) throw new Error(`PostgREST ${path}: ${res.status} ${await res.text()}`);
  return await res.json();
}

async function enviarCorreo(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: MAIL_FROM, to: [to], subject, html }),
  });
  if (!res.ok) throw new Error(`Resend: ${res.status} ${await res.text()}`);
  return true;
}

function jsonResp(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { proceso_id, descripcion } = await req.json().catch(() => ({}));
    if (!proceso_id) return jsonResp({ ok: false, error: "Falta proceso_id" }, 400);

    // 1) Proceso y su cliente
    const procs = await sb(`procesos?select=id,caratula,numero,cliente_id&id=eq.${proceso_id}`);
    const proc = procs[0];
    if (!proc) return jsonResp({ ok: true, notified: false, reason: "proceso no encontrado" });
    if (!proc.cliente_id) return jsonResp({ ok: true, notified: false, reason: "el proceso no tiene cliente" });

    const clientes = await sb(`clientes?select=id,nombre,email&id=eq.${proc.cliente_id}`);
    const cli = clientes[0];
    if (!cli) return jsonResp({ ok: true, notified: false, reason: "cliente no encontrado" });

    const caratula = proc.caratula || "su proceso";
    const resumen = (descripcion ? String(descripcion) : "").trim();

    // 2) Correo (genérico, sin el detalle, por privacidad)
    let correoEnviado = false;
    const errores: string[] = [];
    if (cli.email) {
      const html =
        `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
          <div style="background:#0e1b2c;color:#fff;padding:18px 22px;border-radius:10px 10px 0 0">
            <strong style="font-size:18px">Lex<span style="color:#c2a25a">Five</span></strong>
            <div style="color:#c2a25a;font-size:12px;letter-spacing:2px;text-transform:uppercase">Novedad en su proceso</div>
          </div>
          <div style="border:1px solid #e6e8ec;border-top:none;border-radius:0 0 10px 10px;padding:20px 22px">
            <p>Estimado(a) ${esc(cli.nombre || "cliente")},</p>
            <p>Se registró una <strong>nueva actuación</strong> en su proceso <strong>${esc(caratula)}</strong>${proc.numero ? ` (Nº ${esc(proc.numero)})` : ""}.</p>
            <p>Por su seguridad, el detalle no se envía por correo. Ingrese a su portal del cliente para verlo:</p>
            <p style="text-align:center;margin:22px 0">
              <a href="${esc(PORTAL_URL)}" style="background:#c2a25a;color:#0e1b2c;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px;display:inline-block">Ver en mi portal</a>
            </p>
            <p style="color:#666;font-size:12px;margin-top:18px">Mensaje automático del sistema LexFive. No responda a este correo.</p>
          </div>
        </div>`;
      try {
        correoEnviado = await enviarCorreo(cli.email, "LexFive · Novedad en su proceso", html);
      } catch (e) {
        errores.push(`correo: ${(e as Error).message}`);
      }
    }

    // 3) Push (si el cliente activó notificaciones; se vincula por su correo).
    let pushEnviados = 0, pushBorradas = 0;
    if (cli.email && VAPID_PUBLIC && VAPID_PRIVATE) {
      try {
        // Buscar el usuario (profile) cuyo correo coincide con el del cliente.
        const perfiles = await sb(`profiles?select=id&email=eq.${encodeURIComponent(cli.email)}`);
        const userIds = perfiles.map((p) => p.id);
        if (userIds.length) {
          webpush.setVapidDetails("mailto:notificaciones@lexfive.app", VAPID_PUBLIC, VAPID_PRIVATE);
          const subs = await sb(`push_subscriptions?select=id,user_id,endpoint,p256dh,auth&user_id=in.(${userIds.join(",")})`);
          const payload = JSON.stringify({
            title: "Novedad en su proceso",
            body: `Se registró una nueva actuación en «${caratula}». Toque para verla.`,
            url: PORTAL_URL,
          });
          for (const s of subs) {
            try {
              await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
              pushEnviados++;
            } catch (err) {
              const code = (err as any)?.statusCode;
              if (code === 404 || code === 410) {
                await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${s.id}`, {
                  method: "DELETE",
                  headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
                });
                pushBorradas++;
              } else {
                console.error("push error", code, (err as any)?.body ?? (err as Error)?.message);
              }
            }
          }
        }
      } catch (e) {
        errores.push(`push: ${(e as Error).message}`);
      }
    }

    return jsonResp({
      ok: true,
      notified: correoEnviado || pushEnviados > 0,
      correo: correoEnviado,
      push: { enviados: pushEnviados, borradas: pushBorradas },
      errores,
      resumen_len: resumen.length,
    });
  } catch (e) {
    return jsonResp({ ok: false, error: (e as Error).message }, 500);
  }
});
