import { useCallback } from "react";
import { create } from "zustand";
import { messages } from "./translations";
export type Locale = "zh" | "en" | "fr";
export type AnalysisLanguage = Locale | "auto" | "interface";
const key = "vrm.locale";
const isLocale = (value: string | null): value is Locale =>
  value === "zh" || value === "en" || value === "fr";
function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(key);
    if (isLocale(saved)) return saved;
  } catch {
    /* Storage may be disabled. */
  }
  const language = navigator.language.toLowerCase();
  return language.startsWith("zh")
    ? "zh"
    : language.startsWith("en")
      ? "en"
      : "fr";
}
function initialAnalysis(): AnalysisLanguage {
  try {
    const saved = localStorage.getItem("vrm.analysisLanguage");
    if (saved === "auto" || saved === "interface" || isLocale(saved))
      return saved;
  } catch {
    /* Storage may be disabled. */
  }
  return "interface";
}
export const useLocale = create<{
  locale: Locale;
  analysisLanguage: AnalysisLanguage;
  setLocale: (value: Locale) => void;
  setAnalysisLanguage: (value: AnalysisLanguage) => void;
}>((set) => ({
  locale: initialLocale(),
  analysisLanguage: initialAnalysis(),
  setLocale: (locale) => {
    try {
      localStorage.setItem(key, locale);
    } catch {
      /* In-memory preference still works. */
    }
    set({ locale });
  },
  setAnalysisLanguage: (analysisLanguage) => {
    try {
      localStorage.setItem("vrm.analysisLanguage", analysisLanguage);
    } catch {
      /* In-memory preference still works. */
    }
    set({ analysisLanguage });
  },
}));
export function translate(
  message: string,
  locale: Locale,
  values: Record<string, string | number> = {},
): string {
  const entry = messages[message as keyof typeof messages];
  const template = locale === "fr" ? message : (entry?.[locale] ?? message);
  const params = { plural: values.count === 1 ? "" : "s", ...values };
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in params ? String(params[name as keyof typeof params]) : match,
  );
}
export function useI18n() {
  const locale = useLocale((s) => s.locale);
  const t = useCallback(
    (message: string, values?: Record<string, string | number>) =>
      translate(message, locale, values),
    [locale],
  );
  return { locale, t };
}
