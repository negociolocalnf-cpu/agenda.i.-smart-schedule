import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  appointment_id: z.string().uuid(),
  template: z.enum(["confirmation", "reminder"]).default("confirmation"),
  /** Force a specific channel — used when mode = 'both'. */
  channel: z.enum(["manual", "api"]).optional(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function renderTemplate(
  tpl: string,
  vars: { paciente: string; profissional: string; data: string; hora: string; clinica: string },
) {
  return tpl.replace(/\{(paciente|profissional|data|hora|clinica)\}/g, (_, k: string) =>
    (vars as Record<string, string>)[k] ?? "",
  );
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  // If user typed BR number without country code (10–11 digits), prefix 55
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
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
    const { appointment_id, template, channel: forcedChannel } = parsed.data;

    const admin = createClient(supabaseUrl, serviceKey);

    // Server-side subscription gate (consistent with the rest of the app)
    const { data: hasSub, error: subError } = await admin.rpc("has_active_subscription", {
      _user_id: userId,
      _environment: "sandbox",
    });
    // Fallback: if RPC errors due to auth context, do a direct check
    let allowed = !subError && hasSub === true;
    if (!allowed) {
      const { data: subRow } = await admin
        .from("subscriptions")
        .select("status, current_period_end")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (subRow) {
        const okStatus = ["active", "past_due", "canceled"].includes(subRow.status);
        const inPeriod =
          !subRow.current_period_end || new Date(subRow.current_period_end) > new Date();
        // never trust trialing / incomplete
        const blocked = ["trialing", "incomplete", "incomplete_expired", "unpaid", "paused"].includes(
          subRow.status,
        );
        allowed = okStatus && inPeriod && !blocked;
      }
    }
    if (!allowed) {
      return json({ error: "Assinatura ativa necessária para enviar confirmações." }, 403);
    }

    // Load appointment and ensure ownership
    const { data: appt, error: apptErr } = await admin
      .from("appointments")
      .select(
        "id, user_id, starts_at, patient:patients(name, phone), professional:professionals(name)",
      )
      .eq("id", appointment_id)
      .maybeSingle();

    if (apptErr || !appt) return json({ error: "Consulta não encontrada" }, 404);
    if (appt.user_id !== userId) return json({ error: "Forbidden" }, 403);

    const patient = appt.patient as { name: string; phone: string | null } | null;
    const professional = appt.professional as { name: string } | null;

    if (!patient?.name) return json({ error: "Paciente sem nome cadastrado" }, 400);
    if (!patient?.phone) return json({ error: "Paciente sem telefone cadastrado" }, 400);

    // Load WhatsApp settings (fallback to manual defaults if not yet configured)
    const { data: settingsRow, error: setErr } = await admin
      .from("whatsapp_settings")
      .select(
        "mode, clinic_name, confirmation_template, reminder_template, meta_phone_number_id, meta_access_token, verification_status",
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (setErr) return json({ error: "Falha ao carregar configurações" }, 500);

    const DEFAULT_CONFIRMATION =
      "Olá {paciente}! Confirmamos sua consulta com {profissional} em {data} às {hora}. Por favor, responda CONFIRMO para confirmar. — {clinica}";
    const DEFAULT_REMINDER =
      "Olá {paciente}, lembrete da sua consulta com {profissional} amanhã ({data}) às {hora}. — {clinica}";

    const settings = settingsRow ?? {
      mode: "manual",
      clinic_name: null,
      confirmation_template: DEFAULT_CONFIRMATION,
      reminder_template: DEFAULT_REMINDER,
      meta_phone_number_id: null,
      meta_access_token: null,
      verification_status: "not_verified",
    };

    const tpl =
      template === "reminder" ? settings.reminder_template : settings.confirmation_template;

    const message = renderTemplate(tpl, {
      paciente: patient.name,
      profissional: professional?.name ?? "",
      data: fmtDate(appt.starts_at),
      hora: fmtTime(appt.starts_at),
      clinica: settings.clinic_name?.trim() || "",
    });

    const phone = normalizePhone(patient.phone);
    if (!phone || phone.length < 10) {
      return json({ error: "Telefone do paciente inválido" }, 400);
    }

    // Decide channel
    let channel: "manual" | "api";
    if (forcedChannel) {
      channel = forcedChannel;
    } else if (settings.mode === "manual") {
      channel = "manual";
    } else if (settings.mode === "api") {
      channel = "api";
    } else {
      // both → prefer api when verified credentials exist
      channel =
        settings.verification_status === "valid" &&
        settings.meta_phone_number_id &&
        settings.meta_access_token
          ? "api"
          : "manual";
    }

    if (channel === "manual") {
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      await admin
        .from("appointments")
        .update({
          confirmation_sent_at: new Date().toISOString(),
          confirmation_channel: "manual",
        })
        .eq("id", appointment_id);
      return json({ ok: true, channel, mode: "manual", url, message });
    }

    // API channel
    if (!settings.meta_phone_number_id || !settings.meta_access_token) {
      return json(
        { error: "Credenciais Meta não configuradas. Use o modo manual ou configure a API." },
        400,
      );
    }
    if (settings.verification_status !== "valid") {
      return json(
        { error: "Verifique as credenciais Meta em Configurações antes de enviar via API." },
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
        text: { body: message },
      }),
    });

    const metaData = await metaResp.json().catch(() => ({}));
    if (!metaResp.ok) {
      const msg = metaData?.error?.message || `Erro Meta (HTTP ${metaResp.status})`;
      return json({ error: msg }, 502);
    }

    await admin
      .from("appointments")
      .update({
        confirmation_sent_at: new Date().toISOString(),
        confirmation_channel: "api",
      })
      .eq("id", appointment_id);

    return json({
      ok: true,
      channel,
      mode: "api",
      message,
      meta_message_id: metaData?.messages?.[0]?.id ?? null,
    });
  } catch (e) {
    console.error("whatsapp-send-confirmation error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro interno" }, 500);
  }
});
