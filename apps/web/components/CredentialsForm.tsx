"use client";

import { useActionState } from "react";
import type { FocusEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@movai/ui";
import type { AuthActionState } from "@/lib/auth-actions";

interface CredentialsFormProps {
  action: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  submitLabel: string;
  submittingLabel: string;
}

const labelClassName = "mb-1 block text-sm text-neutral-200";
const inputClassName =
  "w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400";

/**
 * Shown as faded placeholder text (never submitted as a real value) so the
 * dummy test account created by `pnpm --filter @movai/web seed:test-user`
 * (scripts/seed-test-user.ts) is always visible as a hint on /sign-in.
 * Remove once real users replace manual QA here.
 */
const DUMMY_ACCOUNT_EMAIL = "test@movai.dev";
const DUMMY_ACCOUNT_PASSWORD = "Test1234!";

/** Auto-fills the dummy value on first click/focus - only if the field is still empty, so it never overwrites something already typed. */
function fillDummyValueOnFocus(dummyValue: string) {
  return (event: FocusEvent<HTMLInputElement>): void => {
    if (event.target.value === "") {
      event.target.value = dummyValue;
    }
  };
}

/** Shared email+password form for /sign-in - styled for the cinematic auth backdrop. */
export function CredentialsForm({ action, submitLabel, submittingLabel }: CredentialsFormProps): React.ReactElement {
  const [state, formAction, isPending] = useActionState(action, {});
  const t = useTranslations("auth.credentialsForm");

  return (
    <form action={formAction} className="flex flex-col gap-4 text-right">
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
          placeholder={DUMMY_ACCOUNT_EMAIL}
          onFocus={fillDummyValueOnFocus(DUMMY_ACCOUNT_EMAIL)}
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
          autoComplete="current-password"
          dir="ltr"
          placeholder={DUMMY_ACCOUNT_PASSWORD}
          onFocus={fillDummyValueOnFocus(DUMMY_ACCOUNT_PASSWORD)}
          className={inputClassName}
        />
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? submittingLabel : submitLabel}
      </Button>
    </form>
  );
}
