import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type WhatsappMode = "manual" | "api" | "both";
export type VerificationStatus = "not_verified" | "verifying" | "valid" | "invalid";

export interface WhatsappSettings {
  id: string;
  user_id: string;
  mode: WhatsappMode;
  clinic_name: string | null;
  confirmation_template: string;
  reminder_template: string;
  meta_phone_number_id: string | null;
  meta_business_account_id: string | null;
  has_access_token: boolean;
  verification_status: VerificationStatus;
  verification_error: string | null;
  verified_name: string | null;
  display_phone_number: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavePayload {
  mode: WhatsappMode;
  clinic_name: string | null;
  confirmation_template: string;
  reminder_template: string;
  meta_phone_number_id: string | null;
  meta_business_account_id: string | null;
  /** Empty string means "keep existing token". */
  meta_access_token: string | null;
}

const DEFAULT_CONFIRMATION =
  "Olá {paciente}! Confirmamos sua consulta com {profissional} em {data} às {hora}. Por favor, responda CONFIRMO para confirmar. — {clinica}";
const DEFAULT_REMINDER =
  "Olá {paciente}, lembrete da sua consulta com {profissional} amanhã ({data}) às {hora}. — {clinica}";

export function useWhatsappSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<WhatsappSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("whatsapp_settings_safe")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!error) setSettings((data as WhatsappSettings) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const save = useCallback(
    async (payload: SavePayload) => {
      setSaving(true);
      const body = {
        ...payload,
        // Only send token if user actually typed one
        meta_access_token:
          payload.meta_access_token && payload.meta_access_token.length > 0
            ? payload.meta_access_token
            : null,
      };
      const { data, error } = await supabase.functions.invoke("whatsapp-save-settings", {
        body,
      });
      setSaving(false);
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error(JSON.stringify((data as any).error));
      const next = (data as any)?.settings as WhatsappSettings | undefined;
      if (next) setSettings(next);
      return next ?? null;
    },
    [],
  );

  const verify = useCallback(async () => {
    setVerifying(true);
    const { data, error } = await supabase.functions.invoke(
      "whatsapp-verify-credentials",
      { body: {} },
    );
    if (error) {
      setVerifying(false);
      throw new Error(error.message);
    }
    await fetchSettings();
    setVerifying(false);
    return data as { ok: boolean; error?: string; verified_name?: string; display_phone_number?: string };
  }, [fetchSettings]);

  return {
    settings,
    loading,
    saving,
    verifying,
    refetch: fetchSettings,
    save,
    verify,
    defaults: {
      confirmation_template: DEFAULT_CONFIRMATION,
      reminder_template: DEFAULT_REMINDER,
    },
  };
}
