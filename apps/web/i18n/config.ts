/**
 * Central list of supported languages. MoVAI is Hebrew-first (the seeded
 * default and the language every existing page was originally written in),
 * with English, Spanish, Russian and Arabic added on top. Hebrew and Arabic
 * are RTL - every other supported language is LTR, so `dir` is derived from
 * this list rather than hand-maintained separately per component.
 */
export const LOCALES = ["he", "en", "es", "ru", "ar"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "he";

export const RTL_LOCALES: ReadonlySet<Locale> = new Set(["he", "ar"]);

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.has(locale);
}

export const LOCALE_LABELS: Record<Locale, string> = {
  he: "עברית",
  en: "English",
  es: "Español",
  ru: "Русский",
  ar: "العربية"
};

export function isSupportedLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Name of the cookie that persists the visitor's chosen locale across requests. */
export const LOCALE_COOKIE_NAME = "movai-locale";
