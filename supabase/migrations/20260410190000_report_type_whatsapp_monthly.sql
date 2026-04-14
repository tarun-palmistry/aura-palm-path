-- Allow payments.plan_type = whatsapp_monthly for Razorpay WhatsApp subscription
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.typname = 'report_type'
      AND e.enumlabel = 'whatsapp_monthly'
  ) THEN
    ALTER TYPE public.report_type ADD VALUE 'whatsapp_monthly';
  END IF;
END
$$;
