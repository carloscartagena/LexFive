// ============================================================
//  LexFive — Recordatorios automáticos de audiencias y plazos
//  Supabase Edge Function (Deno)
// ------------------------------------------------------------
//  Qué hace:
//   - Cada vez que se ejecuta (idealmente una vez al día por la mañana),
//     busca las audiencias (procesos.proxima_audiencia) y los plazos
//     (eventos.fecha) que ocurren MAÑANA (hora de Bolivia, UTC-4).
//   - Envía un correo a cada abogado responsable con su lista del día.
//
//  Variables de entorno (Supabase > Edge Functions > Secrets):
//   - SUPABASE_URL                (la inyecta Supabase automáticamente)
//   - SUPABASE_SERVICE_ROLE_KEY   (la inyecta Supabase automáticamente)
//   - RESEND_API_KEY              clave de https://resend.com
//   - MAIL_FROM                   remitente, ej: "LexFive <avisos@tudominio.com>"
//   - CRON_SECRET (opcional)      si se define, se exige el header
//                                 "x-cron-secret" con ese valor.
//
//  Ver la guía completa en: RECORDATORIOS-SETUP.md
// ============================================================

interface Perfil { id: string; nombre: string; email: string | null; }
interface Proceso { id: string; caratula: string; numero: string | null; juzgado: string | null; proxima_audiencia: string | null; abogados_ids: string[] | null; abogado_id: string | null; estado: string | null; }
interface Evento { id: string; proceso_id: string; titulo: string; tipo: string; fecha: string; estado: string; }

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const MAIL_FROM = Deno.env.get("MAIL_FROM") ?? "LexFive <onboarding@resend.dev>";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

const esc = (s: string) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

async function sb(path: string): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!res.ok) throw new Error(`PostgREST ${path}: ${res.status} ${await res.text()}`);
  return await res.json();
}

function rangoManianaUTC(): { startISO: string; endISO: string; etiqueta: string } {
  // Bolivia no tiene horario de verano: siempre UTC-4.
  const ahora = new Date();
  const bo = new Date(ahora.getTime() - 4 * 3600 * 1000);
  const medianocheBoEnUTC = new Date(Date.UTC(bo.getUTCFullYear(), bo.getUTCMonth(), bo.getUTCDate() + 1, 0, 0, 0));
  const start = new Date(medianocheBoEnUTC.getTime() + 4 * 3600 * 1000); // mañana 00:00 Bolivia, en UTC
  const end = new Date(start.getTime() + 24 * 3600 * 1000);
  const etiqueta = new Date(medianocheBoEnUTC.getTime()).toLocaleDateString("es-BO", { weekday: "long", day: "numeric", month: "long" });
  return { startISO: start.toISOString(), endISO: end.toISOString(), etiqueta };
}

function horaBolivia(iso: string): string {
  const d = new Date(new Date(iso).getTime() - 4 * 3600 * 1000);
  return d.getUTCHours().toString().padStart(2, "0") + ":" + d.getUTCMinutes().toString().padStart(2, "0");
}

async function enviarCorreo(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) throw new Error("Falta RESEND_API_KEY");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: MAIL_FROM, to: [to], subject, html }),
  });
  if (!res.ok) throw new Error(`Resend: ${res.status} ${await res.text()}`);
}

Deno.serve(async (req) => {
  try {
    if (CRON_SECRET && req.headers.get("x-cron-secret") !== CRON_SECRET) {
      return new Response("No autorizado", { status: 401 });
    }

    const { startISO, endISO, etiqueta } = rangoManianaUTC();

    const [perfiles, procesos, eventos] = await Promise.all([
      sb(`profiles?select=id,nombre,email`) as Promise<Perfil[]>,
      sb(`procesos?select=id,caratula,numero,juzgado,proxima_audiencia,abogados_ids,abogado_id,estado&proxima_audiencia=gte.${startISO}&proxima_audiencia=lt.${endISO}`) as Promise<Proceso[]>,
      sb(`eventos?select=id,proceso_id,titulo,tipo,fecha,estado&estado=eq.pendiente&fecha=gte.${startISO}&fecha=lt.${endISO}`) as Promise<Evento[]>,
    ]);

    const perfilPorId = new Map(perfiles.map((p) => [p.id, p]));
    const caratulaPorProc = new Map(procesos.map((p) => [p.id, p.caratula]));
    // Para eventos necesitamos también la carátula y los abogados de procesos no incluidos arriba.
    const idsFaltantes = [...new Set(eventos.map((e) => e.proceso_id))].filter((id) => !caratulaPorProc.has(id));
    let procEventos: Proceso[] = [];
    if (idsFaltantes.length) {
      procEventos = await sb(`procesos?select=id,caratula,abogados_ids,abogado_id&id=in.(${idsFaltantes.join(",")})`) as Proceso[];
      procEventos.forEach((p) => caratulaPorProc.set(p.id, p.caratula));
    }
    const procPorId = new Map<string, Proceso>([...procesos, ...procEventos].map((p) => [p.id, p]));

    // Agrupar por destinatario (abogados responsables).
    type Item = { hora: string; titulo: string; detalle: string };
    const porEmail = new Map<string, { nombre: string; items: Item[] }>();

    const agregar = (abogadosIds: string[] | null, abogadoId: string | null, item: Item) => {
      const ids = (abogadosIds && abogadosIds.length) ? abogadosIds : (abogadoId ? [abogadoId] : []);
      for (const id of ids) {
        const perfil = perfilPorId.get(id);
        if (!perfil || !perfil.email) continue;
        if (!porEmail.has(perfil.email)) porEmail.set(perfil.email, { nombre: perfil.nombre, items: [] });
        porEmail.get(perfil.email)!.items.push(item);
      }
    };

    for (const p of procesos) {
      if (p.estado && ["archivado", "concluido"].includes(p.estado)) continue;
      agregar(p.abogados_ids, p.abogado_id, {
        hora: horaBolivia(p.proxima_audiencia!),
        titulo: p.caratula,
        detalle: [p.numero ? "Nº " + p.numero : "", p.juzgado || ""].filter(Boolean).join(" · "),
      });
    }
    for (const e of eventos) {
      const p = procPorId.get(e.proceso_id);
      agregar(p?.abogados_ids ?? null, p?.abogado_id ?? null, {
        hora: horaBolivia(e.fecha),
        titulo: e.titulo + (caratulaPorProc.get(e.proceso_id) ? " — " + caratulaPorProc.get(e.proceso_id) : ""),
        detalle: e.tipo,
      });
    }

    let enviados = 0;
    const errores: string[] = [];
    for (const [email, data] of porEmail) {
      data.items.sort((a, b) => a.hora.localeCompare(b.hora));
      const filas = data.items.map((it) =>
        `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee;font-weight:700;color:#0e1b2c">${esc(it.hora)}</td>` +
        `<td style="padding:6px 10px;border-bottom:1px solid #eee">${esc(it.titulo)}${it.detalle ? `<br><small style="color:#666">${esc(it.detalle)}</small>` : ""}</td></tr>`
      ).join("");
      const html =
        `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
          <div style="background:#0e1b2c;color:#fff;padding:18px 22px;border-radius:10px 10px 0 0">
            <strong style="font-size:18px">Lex<span style="color:#c2a25a">Five</span></strong>
            <div style="color:#c2a25a;font-size:12px;letter-spacing:2px;text-transform:uppercase">Recordatorio de agenda</div>
          </div>
          <div style="border:1px solid #e6e8ec;border-top:none;border-radius:0 0 10px 10px;padding:20px 22px">
            <p>Hola ${esc(data.nombre)}, le recordamos sus audiencias y plazos para <strong>mañana ${esc(etiqueta)}</strong>:</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px">${filas}</table>
            <p style="color:#666;font-size:12px;margin-top:18px">Mensaje automático del sistema LexFive. No responda a este correo.</p>
          </div>
        </div>`;
      try {
        await enviarCorreo(email, `LexFive · Agenda de mañana (${data.items.length})`, html);
        enviados++;
      } catch (e) {
        errores.push(`${email}: ${(e as Error).message}`);
      }
    }

    return new Response(JSON.stringify({
      ok: true, fecha: etiqueta, destinatarios: porEmail.size, enviados, errores,
      audiencias: procesos.length, eventos: eventos.length,
    }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
