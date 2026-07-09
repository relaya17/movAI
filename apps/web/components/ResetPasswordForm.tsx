"use client";

import { useActionState, useState } from "react";
import type { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@movai/ui";
import { resetPasswordAction } from "@/lib/password-reset-actions";

const labelClassName = "mb-1 block text-sm text-neutral-200";
const inputClassName =
  "w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400";

export function ResetPasswordForm({ token }: { token: string }): React.ReactElement {
  const [state, formAction, isPending] = useActionState(resetPasswordAction, {});
  const [mismatchError, setMismatchError] = useState<string | null>(null);
  const t = useTranslations("auth.resetPassword");

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    const form = event.currentTarget;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const confirmPassword = (form.elements.namedItem("confirmPassword") as HTMLInputElement).value;

    if (password !== confirmPassword) {
      event.preventDefault();
      setMismatchError(t("mismatch"));
      return;
    }
    setMismatchError(null);
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="flex flex-col gap-4 text-right">
      <input type="hidden" name="token" value={token} />

      <div>
        <label htmlFor="password" className={labelClassName}>
          {t("newPassword")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          dir="ltr"
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className={labelClassName}>
          {t("confirmPassword")}
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          dir="ltr"
          className={inputClassName}
        />
      </div>

      {(mismatchError ?? state?.error) && (
        <p role="alert" className="text-sm text-red-400">
          {mismatchError ?? state?.error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
