ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS confirmation_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_channel text
    CHECK (confirmation_channel IN ('manual','api'));