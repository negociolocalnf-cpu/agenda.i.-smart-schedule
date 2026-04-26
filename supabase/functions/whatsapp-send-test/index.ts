import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  to_phone: z.string().min(8).max(32),
  template: z.enum(["confirmation", "reminder"]).default("confirmation"),
  /** Force a channel; required so the user can test API and Manual independently. */
  channel: z.enum(["manual", "api"]),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

function renderTemplate(
  tpl: string,
  vars: Record<string, string>,
) {
  return tpl.replace(/\{(paciente|profissional|data|hora|clinica)\}/g, (_, k: string) =>
    vars[k] ?? "",
  );
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

    const raw = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return json({ error: parsed.error.flatten().fieldErrors }, 400);
    }
    const { to_phone, template, channel } = parsed.data;

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: settings, error: setErr } = await admin
      .from("whatsapp_settings")
      .select(
        "clinic_name, confirmation_template, reminder_template, meta_phone_number_id, meta_access_token, verification_status",
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (setErr) return json({ error: "Falha ao carregar configurações" }, 500);
    if (!settings) {
      return json({ error: "Configure o WhatsApp em Configurações antes de enviar um teste." }, 400);
    }

    const tpl =
      template === "reminder" ? settings.reminder_template : settings.confirmation_template;

    const message = renderTemplate(tpl, {
      paciente: "Teste Paciente",
      profissional: "Dr(a). Teste",
      data: new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }),
      hora: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      }),
      clinica: settings.clinic_name?.trim() || "Sua Clínica",
    });

    const phone = normalizePhone(to_phone);
    if (!phone || phone.length < 10) {
      return json({ error: "Telefone inválido" }, 400);
    }

    if (channel === "manual") {
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(`[TESTE] ${message}`)}`;
      return json({ ok: true, channel: "manual", url, message });
    }

    // API channel
    if (!settings.meta_phone_number_id || !settings.meta_access_token) {
      return json(
        { error: "Credenciais Meta não configuradas. Salve-as antes de testar." },
        400,
      );
    }
    if (settings.verification_status !== "valid") {
      return json(
        { error: "Verifique as credenciais Meta antes de enviar um teste via API." },
        400,
      );
    }

    const metaUrl = `https://graph.facebook.com/v21.0/${encodeURIComponent(
      settings.meta_phone_number_id,
    )}/messages`;

    const metaResp = await fetch(metaUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.meta_access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: `[TESTE] ${message}` },
      }),
    });

    const metaData = await metaResp.json().catch(() => ({}));
    if (!metaResp.ok) {
      const msg = metaData?.error?.message || `Erro Meta (HTTP ${metaResp.status})`;
      return json({ error: msg }, 502);
    }

    return json({
      ok: true,
      channel: "api",
      message,
      meta_message_id: metaData?.messages?.[0]?.id ?? null,
    });
  } catch (e) {
    console.error("whatsapp-send-test error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro interno" }, 500);
  }
});
