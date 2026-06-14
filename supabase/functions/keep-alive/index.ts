// ============================================================
//  LexFive — Keep-alive (opcional)
//  Supabase Edge Function (Deno)
// ------------------------------------------------------------
//  Alternativa a la verificación por GitHub Actions: una función
//  ligerísima que hace una consulta mínima a la base de datos para
//  mantener el proyecto activo. Devuelve { ok, ts }.
//
//  NOTA: El método recomendado y sin configuración es el workflow
//  .github/workflows/keep-alive.yml. Esta función solo es útil si
//  prefiere programar el "ping" desde otro lado (p. ej. pg_cron).
//
//  Variables (Supabase las inyecta automáticamente):
//   - SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async () => {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id&limit=1`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const ok = res.ok;
    await res.text();
    return new Response(JSON.stringify({ ok, ts: new Date().toISOString() }), {
      status: ok ? 200 : 500,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
