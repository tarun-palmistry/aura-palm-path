import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ReportUnlockState = {
  palmistryUnlocked: boolean;
  horoscopeUnlocked: boolean;
  unlockedViaCombo: boolean;
};

const defaultUnlockState: ReportUnlockState = {
  palmistryUnlocked: false,
  horoscopeUnlocked: false,
  unlockedViaCombo: false,
};

export const useReportUnlocks = (userId?: string) => {
  const [unlocks, setUnlocks] = useState<ReportUnlockState>(defaultUnlockState);

  const refreshUnlocks = useCallback(async () => {
    if (!userId) {
      setUnlocks(defaultUnlockState);
      return defaultUnlockState;
    }

    const db = supabase as any;
    const { data, error } = await db
      .from("report_unlocks")
      .select("palmistry_unlocked, horoscope_unlocked, unlocked_via_combo")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      const fallback = defaultUnlockState;
      setUnlocks(fallback);
      return fallback;
    }

    const next: ReportUnlockState = {
      palmistryUnlocked: Boolean(data.palmistry_unlocked),
      horoscopeUnlocked: Boolean(data.horoscope_unlocked),
      unlockedViaCombo: Boolean(data.unlocked_via_combo),
    };

    setUnlocks(next);
    return next;
  }, [userId]);

  useEffect(() => {
    void refreshUnlocks();
  }, [refreshUnlocks]);

  return { unlocks, refreshUnlocks };
};
