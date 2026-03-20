export const SUPPORTED_LOCALES = ["en", "es"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export function hasLocale(value: string): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}

export function detectLocaleFromAcceptLanguage(
  acceptLanguageHeader: string | null,
): Locale {
  if (!acceptLanguageHeader) {
    return DEFAULT_LOCALE;
  }

  const normalized = acceptLanguageHeader.toLowerCase();

  if (normalized.includes("es")) {
    return "es";
  }

  return DEFAULT_LOCALE;
}
