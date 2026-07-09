"use client";

import { NextIntlClientProvider } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";
import type { ReactNode } from "react";
import type { Locale } from "@/i18n/config";

interface IntlProviderProps {
  locale: Locale;
  messages: AbstractIntlMessages;
  children: ReactNode;
}

/** Client boundary for next-intl — keeps server layout free of client imports. */
export function IntlProvider({ locale, messages, children }: IntlProviderProps): React.ReactElement {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
