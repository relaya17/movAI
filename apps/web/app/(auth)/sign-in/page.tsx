import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { signIn } from "@/auth";
import { signInAction } from "@/lib/auth-actions";
import { CredentialsForm } from "@/components/CredentialsForm";
import { Button } from "@movai/ui";

export const metadata = { title: "התחברות" };

interface SignInPageProps {
  searchParams: Promise<{ passwordReset?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps): Promise<React.ReactElement> {
  const { passwordReset } = await searchParams;
  const t = await getTranslations("auth.signIn");
  const tReset = await getTranslations("auth.resetPassword");

  return (
    <>
      <h1 className="mb-2 text-center text-2xl font-bold">
        <span className="text-white">{t("titlePrefix")}</span>
        <span className="font-orbitron font-bold tracking-wider text-white">MoV</span>
        <span
          className="font-orbitron text-3xl font-bold tracking-wider"
          style={{
            background: "linear-gradient(180deg, #ffffff 0%, #67e8f9 50%, #06b6d4 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 10px rgba(103,232,249,0.5))"
          }}
        >
          AI
        </span>
      </h1>
      <p className="mb-8 text-center text-sm text-neutral-300">{t("subtitle")}</p>

      {passwordReset === "1" && (
        <p role="status" className="mb-4 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-center text-sm text-emerald-300">
          {tReset("success")}
        </p>
      )}

      <CredentialsForm action={signInAction} submitLabel={t("submit")} submittingLabel={t("submitting")} />

      <p className="mt-3 text-center text-sm">
        <Link href="/forgot-password" className="text-cyan-300 underline hover:text-cyan-200">
          {t("forgotPasswordLink")}
        </Link>
      </p>

      <p className="mt-4 text-center text-sm text-neutral-300">
        {t("noAccount")}{" "}
        <Link href="/sign-up" className="font-medium text-cyan-300 underline hover:text-cyan-200">
          {t("signUpLink")}
        </Link>
      </p>

      <div className="my-6 flex items-center gap-3 text-xs text-neutral-400">
        <span className="h-px flex-1 bg-white/20" />
        {t("or")}
        <span className="h-px flex-1 bg-white/20" />
      </div>

      <div className="flex flex-col gap-3">
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/browse" });
          }}
        >
          <Button
            type="submit"
            className="flex w-full items-center justify-center gap-2 bg-white text-neutral-900 hover:bg-neutral-100"
          >
            <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
              <path
                fill="#FFC107"
                d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
              />
              <path
                fill="#FF3D00"
                d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
              />
            </svg>
            {t("continueWithGoogle")}
          </Button>
        </form>

        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/browse" });
          }}
        >
          <Button
            type="submit"
            variant="secondary"
            className="w-full border-white/30 bg-white/10 text-white hover:bg-white/20"
          >
            {t("continueWithGithub")}
          </Button>
        </form>
      </div>

      <p className="mt-8 text-center text-xs text-neutral-400">
        {t("consentPrefix")}{" "}
        <a href="/legal/terms" className="underline hover:text-neutral-200">
          {t("termsLink")}
        </a>{" "}
        {t("and")}{" "}
        <a href="/legal/privacy" className="underline hover:text-neutral-200">
          {t("privacyLink")}
        </a>
        .
      </p>
    </>
  );
}
