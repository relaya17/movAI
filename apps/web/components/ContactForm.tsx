"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@movai/ui";
import { submitContactMessage, type ContactFormState } from "@/lib/contact-actions";

const labelClassName = "mb-1 block text-sm text-neutral-200";
const inputClassName =
  "w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400";

const INITIAL_STATE: ContactFormState = { ok: false, error: "" };

export function ContactForm(): React.ReactElement {
  const [state, formAction, isPending] = useActionState(submitContactMessage, INITIAL_STATE);
  const t = useTranslations("contact");

  if (state.ok) {
    return (
      <p role="status" className="text-center text-sm text-neutral-200">
        {t("success")}
      </p>
    );
  }

  const errorMessage =
    state.error === "rate_limited"
      ? t("errorRateLimited")
      : state.error === "send_failed"
        ? t("errorSendFailed")
        : state.error === "invalid_input"
          ? t("errorInvalid")
          : null;

  return (
    <form action={formAction} className="flex flex-col gap-4 text-right">
      <div>
        <label htmlFor="name" className={labelClassName}>
          {t("name")}
        </label>
        <input id="name" name="name" type="text" required maxLength={120} autoComplete="name" className={inputClassName} />
      </div>

      <div>
        <label htmlFor="email" className={labelClassName}>
          {t("email")}
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" dir="ltr" className={inputClassName} />
      </div>

      <div>
        <label htmlFor="message" className={labelClassName}>
          {t("message")}
        </label>
        <textarea
          id="message"
          name="message"
          required
          minLength={10}
          maxLength={4000}
          rows={5}
          className={inputClassName}
        />
      </div>

      {errorMessage && (
        <p role="alert" className="text-sm text-red-400">
          {errorMessage}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
