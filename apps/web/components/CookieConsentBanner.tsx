"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const STORAGE_KEY = "movai-cookie-consent";

/**
 * Real, dismissible consent UI - not just a policy page nobody has to
 * acknowledge. localStorage-only (no cookie of its own, no server call) so
 * the banner itself doesn't need consent to render.
 */
export function CookieConsentBanner(): React.ReactElement | null {
  const t = useTranslations("cookieConsent");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable (private mode / disabled) - skip the banner rather than error.
    }
  }, []);

  function accept(): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      // Best-effort - if storage fails the banner will just reappear next visit, not a functional break.
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label={t("policyLink")}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-neutral-950/95 px-4 py-4 backdrop-blur-xl sm:px-6"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-center text-sm text-neutral-300 sm:text-right">
          {t("message")}{" "}
          <a href="/legal/cookies" className="text-cyan-400 underline">
            {t("policyLink")}
          </a>
        </p>
        <button
          type="button"
          onClick={accept}
          className="shrink-0 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-2 text-sm font-semibold text-white transition-all hover:from-cyan-400 hover:to-blue-400"
        >
          {t("accept")}
        </button>
      </div>
    </div>
  );
}
