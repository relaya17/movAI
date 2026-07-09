"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { resendVerificationEmailAction } from "@/lib/email-verification-actions";

/** Shown across every dashboard page for a signed-in user whose email isn't verified yet - the only place this status is otherwise visible at all. */
export function EmailVerificationBanner(): React.ReactElement {
  const [state, formAction, isPending] = useActionState(resendVerificationEmailAction, {});
  const t = useTranslations("auth.verifyEmail.banner");

  if (state?.sent) {
    return (
      <div className="border-b border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-center text-sm text-emerald-300">
        {t("resent")}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2 border-b border-amber-400/20 bg-amber-400/10 px-4 py-2 text-center text-sm text-amber-200 sm:flex-row">
      <span>{t("message")}</span>
      <form action={formAction}>
        <button type="submit" disabled={isPending} className="underline hover:text-amber-100 disabled:opacity-60">
          {isPending ? t("sending") : t("resend")}
        </button>
      </form>
      {state?.error && <span className="text-red-300">{state.error}</span>}
    </div>
  );
}
