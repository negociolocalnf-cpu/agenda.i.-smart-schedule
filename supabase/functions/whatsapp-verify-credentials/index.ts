import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: row, error } = await admin
      .from("whatsapp_settings")
      .select("meta_phone_number_id, meta_access_token")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) return json({ error: "Falha ao carregar configurações" }, 500);
    if (!row?.meta_phone_number_id || !row?.meta_access_token) {
      return json(
        { error: "Informe Phone Number ID e Access Token antes de verificar." },
        400,
      );
    }

    await admin
      .from("whatsapp_settings")
      .update({ verification_status: "verifying", verification_error: null })
      .eq("user_id", userId);

    const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(
      row.meta_phone_number_id,
    )}?fields=verified_name,display_phone_number`;

    let metaResp: Response;
    try {
      metaResp = await fetch(url, {
        headers: { Authorization: `Bearer ${row.meta_access_token}` },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha de rede";
      await admin
        .from("whatsapp_settings")
        .update({ verification_status: "invalid", verification_error: msg })
        .eq("user_id", userId);
      return json({ ok: false, error: msg }, 200);
    }

    const data = await metaResp.json().catch(() => ({}));

    if (!metaResp.ok) {
      const msg =
        data?.error?.message ||
        `Erro Meta (HTTP ${metaResp.status})`;
      await admin
        .from("whatsapp_settings")
        .update({
          verification_status: "invalid",
          verification_error: msg,
          verified_name: null,
          display_phone_number: null,
          verified_at: null,
        })
        .eq("user_id", userId);
      return json({ ok: false, error: msg }, 200);
    }

    const verifiedName = data?.verified_name ?? null;
    const displayPhone = data?.display_phone_number ?? null;

    await admin
      .from("whatsapp_settings")
      .update({
        verification_status: "valid",
        verification_error: null,
        verified_name: verifiedName,
        display_phone_number: displayPhone,
        verified_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    return json({
      ok: true,
      verified_name: verifiedName,
      display_phone_number: displayPhone,
    });
  } catch (e) {
    console.error("whatsapp-verify-credentials error:", e);
    return json({ error: "Erro interno" }, 500);
  }
});
