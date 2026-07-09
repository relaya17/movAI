"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@movai/ui";
import type { AuthActionState } from "@/lib/auth-actions";

interface SignUpFormProps {
  action: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  referralCode?: string | undefined;
}

const labelClassName = "mb-1 block text-sm text-neutral-200";
const inputClassName =
  "w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400";

export function SignUpForm({ action, referralCode }: SignUpFormProps): React.ReactElement {
  const [state, formAction, isPending] = useActionState(action, {});
  const t = useTranslations("auth.signUp");

  return (
    <form action={formAction} className="flex flex-col gap-4 text-right">
      {referralCode ? <input type="hidden" name="referralCode" value={referralCode} /> : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className={labelClassName}>
            {t("firstName")}
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            autoComplete="given-name"
            className={inputClassName}
          />
        </div>
        <div>
          <label htmlFor="lastName" className={labelClassName}>
            {t("lastName")}
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            autoComplete="family-name"
            className={inputClassName}
          />
        </div>
      </div>

      <div>
        <label htmlFor="username" className={labelClassName}>
          {t("username")}
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          minLength={3}
          maxLength={30}
          pattern="[a-zA-Z0-9_]+"
          autoComplete="username"
          dir="ltr"
          className={inputClassName}
        />
        <p className="mt-1 text-xs text-neutral-400">{t("usernameHint")}</p>
      </div>

      <div>
        <label htmlFor="dateOfBirth" className={labelClassName}>
          {t("dateOfBirth")}
        </label>
        <input
          id="dateOfBirth"
          name="dateOfBirth"
          type="date"
          required
          autoComplete="bday"
          dir="ltr"
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="email" className={labelClassName}>
          {t("email")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          dir="ltr"
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="password" className={labelClassName}>
          {t("password")}
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
