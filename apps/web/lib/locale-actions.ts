"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE_NAME, isSupportedLocale, type Locale } from "@/i18n/config";

/** Persists the chosen UI language for a year and re-renders every server component that reads it. */
export async function setLocaleAction(locale: string): Promise<void> {
  if (!isSupportedLocale(locale)) return;

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE_NAME, locale satisfies Locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax"
  });
}
