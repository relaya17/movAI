import Link from "next/link";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { signUpAction } from "@/lib/auth-actions";
import { SignUpForm } from "@/components/SignUpForm";
import { REFERRAL_COOKIE } from "@/lib/referral-constants";

export const metadata = { title: "הרשמה" };

interface SignUpPageProps {
  searchParams: Promise<{ ref?: string }>;
}

export default async function SignUpPage({ searchParams }: SignUpPageProps): Promise<React.ReactElement> {
  const t = await getTranslations("auth.signUp");
  const params = await searchParams;
  const jar = await cookies();
  const referralCode = params.ref ?? jar.get(REFERRAL_COOKIE)?.value;

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
      <p className="mb-8 text-center text-sm text-neutral-300">
        {t("subtitle")}
      </p>

      <SignUpForm action={signUpAction} referralCode={referralCode} />

      <p className="mt-4 text-center text-sm text-neutral-300">
        {t("haveAccount")}{" "}
        <Link href="/sign-in" className="font-medium text-cyan-300 underline hover:text-cyan-200">
          {t("signInLink")}
        </Link>
      </p>

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
