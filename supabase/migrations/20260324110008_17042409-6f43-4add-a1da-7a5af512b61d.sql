-- Fix linter error: enforce security invoker on admin view
alter view public.admin_reading_overview set (security_invoker = true);