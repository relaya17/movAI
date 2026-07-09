import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Orbitron, Bebas_Neue } from "next/font/google";
import { getLocale, getMessages } from "next-intl/server";
import { isRtl, type Locale } from "@/i18n/config";
import { IntlProvider } from "@/components/IntlProvider";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import "./globals.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-orbitron",
  display: "swap",
});

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bebas",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100"),
  title: {
    default: "MoVAI — גלה סרטים חוקיים וחינמיים",
    template: "%s | MoVAI"
  },
  description:
    "מנוע גילוי סרטים המרכז תוכן חוקי וחינמי מ-YouTube, Internet Archive ומקורות מורשים נוספים, עם המלצות AI וחיפוש סמנטי.",
  openGraph: {
    type: "website",
    locale: "he_IL"
  }
};

export default async function RootLayout({ children }: { children: ReactNode }): Promise<React.ReactElement> {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const dir = isRtl(locale) ? "rtl" : "ltr";

  // "דלג לתוכן הראשי" only makes sense in Hebrew - it's a skip-to-content
  // link, not something worth a translation key lookup this early in the
  // tree, so it's kept simple with an inline per-locale fallback.
  const skipToContentLabel = locale === "he" ? "דלג לתוכן הראשי" : locale === "ar" ? "تخطَّ إلى المحتوى الرئيسي" : "Skip to main content";

  return (
    <html lang={locale} dir={dir} className={`${orbitron.variable} ${bebasNeue.variable}`}>
      <body className="min-h-screen bg-white text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white"
        >
          {skipToContentLabel}
        </a>
        <IntlProvider locale={locale} messages={messages}>
          <AnalyticsProvider />
          <ServiceWorkerRegister />
          <div id="main-content">{children}</div>
          <CookieConsentBanner />
        </IntlProvider>
      </body>
    </html>
  );
}
