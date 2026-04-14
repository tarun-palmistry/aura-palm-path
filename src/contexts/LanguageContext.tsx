import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import en from "@/locales/en.json";
import hi from "@/locales/hi.json";

export type Language = "en" | "hi";

type Dictionary = Record<string, unknown>;

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  isSwitchingLanguage: boolean;
  t: (key: string) => string;
  tm: <T>(key: string) => T;
};

const STORAGE_KEY = "app-language";

const dictionaries: Record<Language, Dictionary> = { en, hi };

const getByPath = (obj: Dictionary, path: string): unknown => {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const fallbackContext: LanguageContextValue = {
  language: "en",
  setLanguage: () => undefined,
  toggleLanguage: () => undefined,
  isSwitchingLanguage: false,
  t: (key: string) => {
    const value = getByPath(dictionaries.en, key);
    return typeof value === "string" ? value : key;
  },
  tm: <T,>(key: string) => getByPath(dictionaries.en, key) as T,
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "hi" ? "hi" : "en";
  });
  const [isSwitchingLanguage, setIsSwitchingLanguage] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  const switchWithAnimation = useCallback((next: Language) => {
    setIsSwitchingLanguage(true);

    window.setTimeout(() => {
      setLanguageState(next);
    }, 220);

    window.setTimeout(() => {
      setIsSwitchingLanguage(false);
    }, 1100);
  }, []);

  const setLanguage = useCallback((next: Language) => switchWithAnimation(next), [switchWithAnimation]);
  const toggleLanguage = useCallback(
    () => switchWithAnimation(language === "en" ? "hi" : "en"),
    [language, switchWithAnimation],
  );

  const dictionary = useMemo(() => dictionaries[language], [language]);

  const t = useCallback(
    (key: string) => {
      const value = getByPath(dictionary, key);
      return typeof value === "string" ? value : key;
    },
    [dictionary],
  );

  const tm = useCallback(
    <T,>(key: string): T => {
      return getByPath(dictionary, key) as T;
    },
    [dictionary],
  );

  const value = useMemo(
    () => ({ language, setLanguage, toggleLanguage, isSwitchingLanguage, t, tm }),
    [language, setLanguage, toggleLanguage, isSwitchingLanguage, t, tm],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    console.warn("useLanguage called outside LanguageProvider; using English fallback context.");
    return fallbackContext;
  }
  return context;
};
