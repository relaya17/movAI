import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import type { AbstractIntlMessages } from "next-intl";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, isSupportedLocale } from "./config";

/**
 * MoVAI does not prefix routes with a locale segment (no /en/browse,
 * /es/browse, etc.) - every existing route was already built flat, and
 * restructuring the whole app/ tree into app/[locale]/... just to get
 * routing-based i18n would be high-risk churn across dozens of pages for no
 * real benefit (this is a single-region product, not one that needs
 * locale-specific SEO URLs). Instead the active language is negotiated once
 * via a cookie and read here on every request.
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const locale = cookieLocale && isSupportedLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  const messages = (await import(`../messages/${locale}.json`)).default as AbstractIntlMessages;

  return { locale, messages };
});
