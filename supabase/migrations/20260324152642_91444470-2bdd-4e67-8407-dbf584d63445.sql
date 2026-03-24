-- Analytics event name enum for structured tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'analytics_event_name' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.analytics_event_name AS ENUM (
      'hero_cta_click',
      'palm_submit_click',
      'horoscope_submit_click',
      'payment_unlock_click',
      'payment_success',
      'whatsapp_signup_click',
      'language_toggle',
      'palm_report_view',
      'horoscope_report_view'
    );
  END IF;
END $$;

-- Event log table
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NULL,
  event_name public.analytics_event_name NOT NULL,
  page_path TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow clients to insert tracking events safely
DROP POLICY IF EXISTS "Users can insert analytics events" ON public.analytics_events;
CREATE POLICY "Users can insert analytics events"
ON public.analytics_events
FOR INSERT
TO public
WITH CHECK (
  user_id IS NULL
  OR auth.uid() = user_id
  OR is_admin(auth.uid())
);

-- Restrict read access to admins only
DROP POLICY IF EXISTS "Admins can read analytics events" ON public.analytics_events;
CREATE POLICY "Admins can read analytics events"
ON public.analytics_events
FOR SELECT
TO public
USING (is_admin(auth.uid()));

-- Helpful indexes for admin reporting
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON public.analytics_events (event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events (user_id);

-- Realtime support optional for admin dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.analytics_events;