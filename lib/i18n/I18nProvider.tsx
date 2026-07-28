"use client";

import { createContext, useContext } from "react";
import type { Dictionary, Language } from "./dictionaries";

type I18nContextValue = {
  t: Dictionary;
  language: Language;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  t,
  language,
  children,
}: I18nContextValue & { children: React.ReactNode }) {
  return <I18nContext.Provider value={{ t, language }}>{children}</I18nContext.Provider>;
}

export function useTranslations(): Dictionary {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslations must be used within I18nProvider");
  return ctx.t;
}

export function useLanguage(): Language {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useLanguage must be used within I18nProvider");
  return ctx.language;
}
