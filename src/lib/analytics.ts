import { supabase } from "@/integrations/supabase/client";

export type AnalyticsEventName =
  | "hero_cta_click"
  | "palm_submit_click"
  | "horoscope_submit_click"
  | "payment_unlock_click"
  | "payment_success"
  | "whatsapp_signup_click"
  | "language_toggle"
  | "palm_report_view"
  | "horoscope_report_view";

type AnalyticsMetadata = Record<string, string | number | boolean | null | undefined>;

type TrackEventArgs = {
  eventName: AnalyticsEventName;
  userId?: string | null;
  pagePath?: string;
  metadata?: AnalyticsMetadata;
};

const cleanMetadata = (metadata?: AnalyticsMetadata) => {
  if (!metadata) return {};

  return Object.entries(metadata).reduce<Record<string, string | number | boolean | null>>((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

export const trackEvent = async ({ eventName, userId = null, pagePath, metadata }: TrackEventArgs) => {
  try {
    await supabase.from("analytics_events").insert({
      event_name: eventName,
      user_id: userId,
      page_path: pagePath ?? (typeof window !== "undefined" ? `${window.location.pathname}${window.location.hash || ""}` : null),
      metadata: cleanMetadata(metadata),
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("analytics_track_failed", { eventName, error });
    }
  }
};