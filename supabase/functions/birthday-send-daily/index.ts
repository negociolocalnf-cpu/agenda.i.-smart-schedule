// Envia mensagens automáticas de aniversário via WhatsApp Cloud API.
// Pode ser invocada por:
//   - cron (sem corpo) -> processa todos os usuários elegíveis na hora atual (UTC -> BRT)
//   - usuário autenticado com { manual: true } -> processa apenas o próprio user_id (botão "Rodar agora")
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

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

function renderTemplate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(paciente|clinica)\}/g, (_, k: string) => vars[k] ?? "");
}

// Retorna a data e hora atuais no fuso America/Sao_Paulo (UTC-3) sem DST.
function nowBrt() {
  const now = new Date();
  const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return {
    isoDate: brt.toISOString().slice(0, 10), // YYYY-MM-DD
    hour: brt.getUTCHours(), // hora local BRT
    month: brt.getUTCMonth() + 1, // 1-12
    day: brt.getUTCDate(),
  };
}

interface ProcessResult {
  user_id: string;
  attempted: number;
  sent: number;
  skipped: number;
  failed: number;
  errors: string[];
}

async function processUser(
  admin: ReturnType<typeof createClient>,
  userId: string,
  opts: { ignoreHour?: boolean; ignoreEnabled?: boolean },
): Promise<ProcessResult> {
  const result: ProcessResult = {
    user_id: userId,
    attempted: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  const { isoDate, hour, month, day } = nowBrt();

  // 1. Carrega config de automação
  const { data: settings } = await admin
    .from("birthday_automation_settings")
    .select("enabled, send_hour, template, last_run_on")
    .eq("user_id", userId)
    .maybeSingle();

  if (!settings) {
    result.errors.push("Sem configuração de automação");
    return result;
  }
  if (!opts.ignoreEnabled && !settings.enabled) {
    result.skipped += 1;
    return result;
  }
  if (!opts.ignoreHour && settings.send_hour !== hour) {
    result.skipped += 1;
    return result;
  }
  if (!opts.ignoreHour && settings.last_run_on === isoDate) {
    // Já rodou hoje no horário certo -> evita reprocessar no cron
    result.skipped += 1;
    return result;
  }

  // 2. Carrega WhatsApp settings (precisa estar no modo api/both e verificado)
  const { data: wa } = await admin
    .from("whatsapp_settings")
    .select(
      "mode, clinic_name, meta_phone_number_id, meta_access_token, verification_status",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (!wa) {
    result.errors.push("WhatsApp não configurado");
    return result;
  }
  if (wa.mode === "manual") {
    result.errors.push("Automação requer modo API (ou Ambos)");
    return result;
  }
  if (
    !wa.meta_phone_number_id ||
    !wa.meta_access_token ||
    wa.verification_status !== "valid"
  ) {
    result.errors.push("Credenciais Meta ausentes ou não verificadas");
    return result;
  }

  // 3. Busca aniversariantes do dia (com telefone)
  const { data: patients } = await admin
    .from("patients")
    .select("id, name, phone, birth_date")
    .eq("user_id", userId)
    .not("birth_date", "is", null)
    .not("phone", "is", null);

  const todays = (patients ?? []).filter((p) => {
    if (!p.birth_date) return false;
    const [, m, d] = (p.birth_date as string).split("-").map(Number);
    return m === month && d === day;
  });

  result.attempted = todays.length;

  if (todays.length === 0) {
    await admin
      .from("birthday_automation_settings")
      .update({ last_run_on: isoDate })
      .eq("user_id", userId);
    return result;
  }

  const clinic = wa.clinic_name?.trim() || "nossa clínica";
  const metaUrl = `https://graph.facebook.com/v21.0/${encodeURIComponent(
    wa.meta_phone_number_id,
  )}/messages`;

  for (const p of todays) {
    // Idempotência: já enviado hoje?
    const { data: existing } = await admin
      .from("birthday_send_log")
      .select("id")
      .eq("user_id", userId)
      .eq("patient_id", p.id)
      .eq("sent_on", isoDate)
      .eq("status", "sent")
      .maybeSingle();

    if (existing) {
      result.skipped += 1;
      continue;
    }

    const phone = normalizePhone(p.phone as string);
    if (!phone || phone.length < 10) {
      result.failed += 1;
      await admin.from("birthday_send_log").insert({
        user_id: userId,
        patient_id: p.id,
        sent_on: isoDate,
        status: "failed",
        error: "Telefone inválido",
      });
      continue;
    }

    const message = renderTemplate(settings.template, {
      paciente: p.name.split(" ")[0],
      clinica: clinic,
    });

    try {
      const resp = await fetch(metaUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${wa.meta_access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "text",
          text: { body: message },
        }),
      });
      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        const msg = data?.error?.message || `Meta HTTP ${resp.status}`;
        result.failed += 1;
        result.errors.push(`${p.name}: ${msg}`);
        await admin.from("birthday_send_log").insert({
          user_id: userId,
          patient_id: p.id,
          sent_on: isoDate,
          status: "failed",
          error: msg,
        });
      } else {
        result.sent += 1;
        await admin.from("birthday_send_log").insert({
          user_id: userId,
          patient_id: p.id,
          sent_on: isoDate,
          status: "sent",
          channel: "whatsapp_api",
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro de rede";
      result.failed += 1;
      result.errors.push(`${p.name}: ${msg}`);
      await admin.from("birthday_send_log").insert({
        user_id: userId,
        patient_id: p.id,
        sent_on: isoDate,
        status: "failed",
        error: msg,
      });
    }
  }

  await admin
    .from("birthday_automation_settings")
    .update({ last_run_on: isoDate })
    .eq("user_id", userId);

  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const isManual = body?.manual === true;

    if (isManual) {
      // Requer JWT do usuário
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } =
        await userClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims?.sub) return json({ error: "Unauthorized" }, 401);
      const userId = claimsData.claims.sub as string;

      const result = await processUser(admin, userId, {
        ignoreHour: true,
        ignoreEnabled: true,
      });
      return json({ ok: true, manual: true, result });
    }

    // Cron: processa todos com automação ativa
    const { hour } = nowBrt();
    const { data: users } = await admin
      .from("birthday_automation_settings")
      .select("user_id")
      .eq("enabled", true)
      .eq("send_hour", hour);

    const results: ProcessResult[] = [];
    for (const u of users ?? []) {
      const r = await processUser(admin, u.user_id as string, {});
      results.push(r);
    }

    return json({ ok: true, processed: results.length, results });
  } catch (e) {
    console.error("birthday-send-daily error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro interno" }, 500);
  }
});
