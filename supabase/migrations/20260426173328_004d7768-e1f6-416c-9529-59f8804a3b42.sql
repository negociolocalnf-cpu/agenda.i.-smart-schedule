-- Tabela de configuração da automação de aniversários
CREATE TABLE public.birthday_automation_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  send_hour smallint NOT NULL DEFAULT 8 CHECK (send_hour >= 0 AND send_hour <= 23),
  template text NOT NULL DEFAULT 'Olá {paciente}! 🎉 Toda a equipe da {clinica} deseja a você um feliz aniversário! Tenha um dia incrível. 🎂',
  last_run_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.birthday_automation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY own_select_birthday_automation ON public.birthday_automation_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY own_insert_birthday_automation ON public.birthday_automation_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY own_update_birthday_automation ON public.birthday_automation_settings
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY own_delete_birthday_automation ON public.birthday_automation_settings
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER tg_birthday_automation_updated_at
  BEFORE UPDATE ON public.birthday_automation_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Log de envios para evitar duplicidade no mesmo dia por paciente
CREATE TABLE public.birthday_send_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  sent_on date NOT NULL DEFAULT CURRENT_DATE,
  channel text NOT NULL DEFAULT 'whatsapp_api',
  status text NOT NULL DEFAULT 'sent',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, patient_id, sent_on)
);

ALTER TABLE public.birthday_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY own_select_birthday_log ON public.birthday_send_log
  FOR SELECT USING (auth.uid() = user_id);

-- Habilita extensões para cron + http
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;