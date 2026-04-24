import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  mode: z.enum(["manual", "api", "both"]),
  clinic_name: z.string().trim().max(120).nullable().optional(),
  confirmation_template: z.string().trim().min(1).max(1000),
  reminder_template: z.string().trim().min(1).max(1000),
  meta_phone_number_id: z
    .string()
    .trim()
    .max(64)
    .regex(/^[A-Za-z0-9_-]*$/)
    .nullable()
    .optional(),
  meta_business_account_id: z
    .string()
    .trim()
    .max(64)
    .regex(/^[A-Za-z0-9_-]*$/)
    .nullable()
    .optional(),
  meta_access_token: z.string().trim().max(2048).nullable().optional(),
});

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
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    const raw = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return json({ error: parsed.error.flatten().fieldErrors }, 400);
    }
    const body = parsed.data;

    const admin = createClient(supabaseUrl, serviceKey);

    // Carrega registro atual (se existir) para decidir sobre o token
    const { data: existing } = await admin
      .from("whatsapp_settings")
      .select("id, meta_access_token, meta_phone_number_id")
      .eq("user_id", userId)
      .maybeSingle();

    const incomingToken = body.meta_access_token?.trim();
    const finalToken =
      incomingToken && incomingToken.length > 0
        ? incomingToken
        : existing?.meta_access_token ?? null;

    const credentialsChanged =
      (incomingToken && incomingToken.length > 0 &&
        incomingToken !== existing?.meta_access_token) ||
      (body.meta_phone_number_id ?? null) !== (existing?.meta_phone_number_id ?? null);

    const upsertPayload: Record<string, unknown> = {
      user_id: userId,
      mode: body.mode,
      clinic_name: body.clinic_name ?? null,
      confirmation_template: body.confirmation_template,
      reminder_template: body.reminder_template,
      meta_phone_number_id: body.meta_phone_number_id ?? null,
      meta_business_account_id: body.meta_business_account_id ?? null,
      meta_access_token: finalToken,
    };

    if (credentialsChanged) {
      upsertPayload.verification_status = "not_verified";
      upsertPayload.verification_error = null;
      upsertPayload.verified_name = null;
      upsertPayload.display_phone_number = null;
      upsertPayload.verified_at = null;
    }

    const { error: upsertError } = await admin
      .from("whatsapp_settings")
      .upsert(upsertPayload, { onConflict: "user_id" });

    if (upsertError) {
      console.error("upsert error:", upsertError);
      return json({ error: "Falha ao salvar configurações" }, 500);
    }

    const { data: safe, error: safeError } = await admin
      .from("whatsapp_settings_safe")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (safeError) {
      return json({ error: "Salvo, mas falha ao recarregar" }, 500);
    }

    return json({ settings: safe });
  } catch (e) {
    console.error("whatsapp-save-settings error:", e);
    return json({ error: "Erro interno" }, 500);
  }
});
