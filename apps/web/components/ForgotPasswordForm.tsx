"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@movai/ui";
import { requestPasswordResetAction } from "@/lib/password-reset-actions";

const labelClassName = "mb-1 block text-sm text-neutral-200";
const inputClassName =
  "w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400";

export function ForgotPasswordForm(): React.ReactElement {
  const [state, formAction, isPending] = useActionState(requestPasswordResetAction, {});
  const t = useTranslations("auth.forgotPassword");

  if (state?.submitted) {
    return (
      <p role="status" className="text-center text-sm text-neutral-200">
        {t("submitted")}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 text-right">
      <div>
        <label htmlFor="email" className={labelClassName}>
          {t("email")}
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" dir="ltr" className={inputClassName} />
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
