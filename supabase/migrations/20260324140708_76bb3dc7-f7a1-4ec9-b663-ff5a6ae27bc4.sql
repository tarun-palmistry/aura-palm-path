DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'report_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.report_type AS ENUM ('palmistry', 'horoscope', 'combo');
  END IF;
END
$$;

ALTER TABLE public.payments
  ALTER COLUMN reading_id DROP NOT NULL;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS horoscope_request_id uuid,
  ADD COLUMN IF NOT EXISTS plan_type public.report_type,
  ADD COLUMN IF NOT EXISTS raw_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS failure_reason text;

UPDATE public.payments
SET plan_type = 'palmistry'::public.report_type
WHERE plan_type IS NULL;

ALTER TABLE public.payments
  ALTER COLUMN plan_type SET DEFAULT 'palmistry'::public.report_type,
  ALTER COLUMN plan_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_horoscope_request_id_fkey'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_horoscope_request_id_fkey
      FOREIGN KEY (horoscope_request_id)
      REFERENCES public.horoscope_requests(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_payments_user_plan_status
  ON public.payments (user_id, plan_type, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_order_unique
  ON public.payments (provider_order_id)
  WHERE provider_order_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.report_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  palmistry_unlocked boolean NOT NULL DEFAULT false,
  horoscope_unlocked boolean NOT NULL DEFAULT false,
  unlocked_via_combo boolean NOT NULL DEFAULT false,
  last_payment_id uuid NULL REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.report_unlocks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'report_unlocks' AND policyname = 'Users can read own unlocks'
  ) THEN
    CREATE POLICY "Users can read own unlocks"
      ON public.report_unlocks
      FOR SELECT
      USING ((auth.uid() = user_id) OR is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'report_unlocks' AND policyname = 'Users can insert own unlocks'
  ) THEN
    CREATE POLICY "Users can insert own unlocks"
      ON public.report_unlocks
      FOR INSERT
      WITH CHECK ((auth.uid() = user_id) OR is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'report_unlocks' AND policyname = 'Users can update own unlocks'
  ) THEN
    CREATE POLICY "Users can update own unlocks"
      ON public.report_unlocks
      FOR UPDATE
      USING ((auth.uid() = user_id) OR is_admin(auth.uid()))
      WITH CHECK ((auth.uid() = user_id) OR is_admin(auth.uid()));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_report_unlocks_updated_at'
  ) THEN
    CREATE TRIGGER update_report_unlocks_updated_at
      BEFORE UPDATE ON public.report_unlocks
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_payments_updated_at'
  ) THEN
    CREATE TRIGGER update_payments_updated_at
      BEFORE UPDATE ON public.payments
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$$;