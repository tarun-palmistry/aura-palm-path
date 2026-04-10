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
      setUnlocks((prev) => {
        if (
          !prev.palmistryUnlocked &&
          !prev.horoscopeUnlocked &&
          !prev.unlockedViaCombo
        ) {
          return prev;
        }
        return defaultUnlockState;
      });
      return defaultUnlockState;
    }

    const db = supabase as any;
    const { data, error } = await db
      .from("report_unlocks")
      .select("palmistry_unlocked, horoscope_unlocked, unlocked_via_combo")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      let cleared = defaultUnlockState;
      setUnlocks((prev) => {
        if (
          prev.palmistryUnlocked === cleared.palmistryUnlocked &&
          prev.horoscopeUnlocked === cleared.horoscopeUnlocked &&
          prev.unlockedViaCombo === cleared.unlockedViaCombo
        ) {
          return prev;
        }
        return cleared;
      });
      return cleared;
    }

    const next: ReportUnlockState = {
      palmistryUnlocked: Boolean(data.palmistry_unlocked),
      horoscopeUnlocked: Boolean(data.horoscope_unlocked),
      unlockedViaCombo: Boolean(data.unlocked_via_combo),
    };

    setUnlocks((prev) => {
      if (
        prev.palmistryUnlocked === next.palmistryUnlocked &&
        prev.horoscopeUnlocked === next.horoscopeUnlocked &&
        prev.unlockedViaCombo === next.unlockedViaCombo
      ) {
        return prev;
      }
      return next;
    });
    return next;
  }, [userId]);

  useEffect(() => {
    void refreshUnlocks();
  }, [refreshUnlocks]);

  return { unlocks, refreshUnlocks };
};
