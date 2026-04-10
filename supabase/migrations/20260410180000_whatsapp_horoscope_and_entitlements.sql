-- WhatsApp horoscope delivery + paid monthly entitlement
-- Run in Supabase SQL Editor if migrations are not auto-applied: paste this file.

-- Ensure updated_at trigger helper exists (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Subscriptions (phone, schedule, zodiac) — one row per user per period
CREATE TABLE IF NOT EXISTS public.whatsapp_horoscope_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  phone_e164 TEXT NOT NULL,
  zodiac_sign TEXT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('today', 'weekly', 'monthly', 'yearly')),
  time_zone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  send_hour_local INT NOT NULL DEFAULT 9 CHECK (send_hour_local BETWEEN 0 AND 23),
  weekly_day INT NOT NULL DEFAULT 1 CHECK (weekly_day BETWEEN 0 AND 6),
  monthly_day INT NOT NULL DEFAULT 1 CHECK (monthly_day BETWEEN 1 AND 28),
  yearly_month INT NOT NULL DEFAULT 1 CHECK (yearly_month BETWEEN 1 AND 12),
  yearly_day INT NOT NULL DEFAULT 1 CHECK (yearly_day BETWEEN 1 AND 28),
  active BOOLEAN NOT NULL DEFAULT true,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_sent_key TEXT NULL,
  last_sent_at TIMESTAMPTZ NULL
);

DROP TRIGGER IF EXISTS update_whatsapp_horoscope_subscriptions_updated_at ON public.whatsapp_horoscope_subscriptions;
CREATE TRIGGER update_whatsapp_horoscope_subscriptions_updated_at
BEFORE UPDATE ON public.whatsapp_horoscope_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE UNIQUE INDEX IF NOT EXISTS uniq_whatsapp_horoscope_subscriptions_user_period
  ON public.whatsapp_horoscope_subscriptions (user_id, period);

CREATE INDEX IF NOT EXISTS idx_whatsapp_horoscope_subscriptions_active
  ON public.whatsapp_horoscope_subscriptions (active, period);

ALTER TABLE public.whatsapp_horoscope_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own WhatsApp subscriptions" ON public.whatsapp_horoscope_subscriptions;
CREATE POLICY "Users can manage own WhatsApp subscriptions"
ON public.whatsapp_horoscope_subscriptions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Paid entitlement (₹99/mo) — server writes only via Edge Functions (service role)
CREATE TABLE IF NOT EXISTS public.whatsapp_entitlements (
  user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ NOT NULL,
  last_payment_id UUID NULL REFERENCES public.payments (id)
);

DROP TRIGGER IF EXISTS update_whatsapp_entitlements_updated_at ON public.whatsapp_entitlements;
CREATE TRIGGER update_whatsapp_entitlements_updated_at
BEFORE UPDATE ON public.whatsapp_entitlements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.whatsapp_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own WhatsApp entitlement" ON public.whatsapp_entitlements;
CREATE POLICY "Users can read own WhatsApp entitlement"
ON public.whatsapp_entitlements
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- No direct INSERT/UPDATE/DELETE from clients (service role bypasses RLS)
