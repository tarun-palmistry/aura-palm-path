-- Astrology birth chart requests and reports
CREATE TABLE IF NOT EXISTS public.horoscope_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  time_of_birth TIME NOT NULL,
  place_of_birth TEXT NOT NULL,
  gender TEXT,
  zodiac_sign TEXT NOT NULL,
  moon_sign TEXT NOT NULL,
  rising_sign TEXT NOT NULL,
  planetary_positions JSONB NOT NULL DEFAULT '{}'::jsonb,
  astrology_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  interpretation JSONB NOT NULL DEFAULT '{}'::jsonb,
  free_summary TEXT NOT NULL,
  full_report TEXT NOT NULL,
  is_unlocked BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.horoscope_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own horoscope requests" ON public.horoscope_requests;
CREATE POLICY "Users can insert own horoscope requests"
ON public.horoscope_requests
FOR INSERT
WITH CHECK ((auth.uid() = user_id) OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can read own horoscope requests" ON public.horoscope_requests;
CREATE POLICY "Users can read own horoscope requests"
ON public.horoscope_requests
FOR SELECT
USING ((auth.uid() = user_id) OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can update own horoscope requests" ON public.horoscope_requests;
CREATE POLICY "Users can update own horoscope requests"
ON public.horoscope_requests
FOR UPDATE
USING ((auth.uid() = user_id) OR is_admin(auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can delete own horoscope requests" ON public.horoscope_requests;
CREATE POLICY "Users can delete own horoscope requests"
ON public.horoscope_requests
FOR DELETE
USING ((auth.uid() = user_id) OR is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_horoscope_requests_user_id_created_at
  ON public.horoscope_requests (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_horoscope_requests_zodiac_sign
  ON public.horoscope_requests (zodiac_sign);

DROP TRIGGER IF EXISTS update_horoscope_requests_updated_at ON public.horoscope_requests;
CREATE TRIGGER update_horoscope_requests_updated_at
BEFORE UPDATE ON public.horoscope_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Daily horoscope snapshots per user/sign/day
CREATE TABLE IF NOT EXISTS public.daily_horoscopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  zodiac_sign TEXT NOT NULL,
  horoscope_date DATE NOT NULL DEFAULT CURRENT_DATE,
  today_prediction TEXT NOT NULL,
  lucky_number TEXT NOT NULL,
  lucky_color TEXT NOT NULL,
  advice TEXT NOT NULL,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, zodiac_sign, horoscope_date)
);

ALTER TABLE public.daily_horoscopes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own daily horoscopes" ON public.daily_horoscopes;
CREATE POLICY "Users can insert own daily horoscopes"
ON public.daily_horoscopes
FOR INSERT
WITH CHECK ((auth.uid() = user_id) OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can read own daily horoscopes" ON public.daily_horoscopes;
CREATE POLICY "Users can read own daily horoscopes"
ON public.daily_horoscopes
FOR SELECT
USING ((auth.uid() = user_id) OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can update own daily horoscopes" ON public.daily_horoscopes;
CREATE POLICY "Users can update own daily horoscopes"
ON public.daily_horoscopes
FOR UPDATE
USING ((auth.uid() = user_id) OR is_admin(auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can delete own daily horoscopes" ON public.daily_horoscopes;
CREATE POLICY "Users can delete own daily horoscopes"
ON public.daily_horoscopes
FOR DELETE
USING ((auth.uid() = user_id) OR is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_daily_horoscopes_user_date
  ON public.daily_horoscopes (user_id, horoscope_date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_horoscopes_sign_date
  ON public.daily_horoscopes (zodiac_sign, horoscope_date DESC);

DROP TRIGGER IF EXISTS update_daily_horoscopes_updated_at ON public.daily_horoscopes;
CREATE TRIGGER update_daily_horoscopes_updated_at
BEFORE UPDATE ON public.daily_horoscopes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();