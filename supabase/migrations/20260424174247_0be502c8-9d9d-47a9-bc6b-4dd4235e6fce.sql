-- Tabela de configurações de WhatsApp por usuário
CREATE TABLE public.whatsapp_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  mode text NOT NULL DEFAULT 'manual',
  clinic_name text,
  confirmation_template text NOT NULL DEFAULT 'Olá {paciente}! Confirmamos sua consulta com {profissional} em {data} às {hora}. Por favor, responda CONFIRMO para confirmar. — {clinica}',
  reminder_template text NOT NULL DEFAULT 'Olá {paciente}, lembrete da sua consulta com {profissional} amanhã ({data}) às {hora}. — {clinica}',
  meta_phone_number_id text,
  meta_access_token text,
  meta_business_account_id text,
  verification_status text NOT NULL DEFAULT 'not_verified',
  verification_error text,
  verified_name text,
  display_phone_number text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_settings_mode_check CHECK (mode IN ('manual','api','both')),
  CONSTRAINT whatsapp_settings_verification_status_check
    CHECK (verification_status IN ('not_verified','verifying','valid','invalid'))
);

ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY own_select_whatsapp_settings ON public.whatsapp_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY own_insert_whatsapp_settings ON public.whatsapp_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY own_update_whatsapp_settings ON public.whatsapp_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY own_delete_whatsapp_settings ON public.whatsapp_settings
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER whatsapp_settings_set_updated_at
  BEFORE UPDATE ON public.whatsapp_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- View segura: nunca expõe meta_access_token ao client
CREATE VIEW public.whatsapp_settings_safe
WITH (security_invoker = true)
AS
SELECT
  id,
  user_id,
  mode,
  clinic_name,
  confirmation_template,
  reminder_template,
  meta_phone_number_id,
  meta_business_account_id,
  (meta_access_token IS NOT NULL AND length(meta_access_token) > 0) AS has_access_token,
  verification_status,
  verification_error,
  verified_name,
  display_phone_number,
  verified_at,
  created_at,
  updated_at
FROM public.whatsapp_settings;

GRANT SELECT ON public.whatsapp_settings_safe TO authenticated;