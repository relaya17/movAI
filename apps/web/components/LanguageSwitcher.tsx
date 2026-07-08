"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/i18n/config";
import { setLocaleAction } from "@/lib/locale-actions";

/** Small globe-icon dropdown that persists the chosen language in a cookie, then refreshes so every server component re-renders with the new messages. */
export function LanguageSwitcher(): React.ReactElement {
  const locale = useLocale() as Locale;
  const t = useTranslations("language");
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSelect = (next: Locale): void => {
    setIsOpen(false);
    if (next === locale) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={t("label")}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/10 disabled:opacity-50"
      >
        <span aria-hidden="true">🌐</span>
        <span className="hidden sm:inline">{LOCALE_LABELS[locale]}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute end-0 top-full z-50 mt-2 w-40 rounded-xl border border-white/10 bg-neutral-900/95 py-2 shadow-2xl backdrop-blur-xl">
            {LOCALES.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => handleSelect(code)}
                className={`block w-full px-4 py-2 text-start text-sm transition-colors hover:bg-white/5 ${
                  code === locale ? "text-cyan-300" : "text-neutral-300 hover:text-white"
                }`}
              >
                {LOCALE_LABELS[code]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
