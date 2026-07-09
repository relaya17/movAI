import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const metadata = { title: "שכחתי סיסמה" };

export default async function ForgotPasswordPage(): Promise<React.ReactElement> {
  const t = await getTranslations("auth.forgotPassword");

  return (
    <>
      <h1 className="mb-2 text-center text-2xl font-bold text-white">{t("title")}</h1>
      <p className="mb-8 text-center text-sm text-neutral-300">{t("subtitle")}</p>

      <ForgotPasswordForm />

      <p className="mt-6 text-center text-sm text-neutral-300">
        <Link href="/sign-in" className="font-medium text-cyan-300 underline hover:text-cyan-200">
          {t("backToSignIn")}
        </Link>
      </p>
    </>
  );
}
