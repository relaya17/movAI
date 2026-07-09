import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { verifyEmailAction } from "@/lib/email-verification-actions";

export const metadata = { title: "אימות אימייל" };

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps): Promise<React.ReactElement> {
  const { token } = await searchParams;
  const t = await getTranslations("auth.verifyEmail");

  const result = token ? await verifyEmailAction(token) : { success: false };

  return (
    <>
      <h1 className="mb-4 text-center text-2xl font-bold text-white">{t("title")}</h1>

      {result.success ? (
        <p role="status" className="text-center text-sm text-emerald-300">
          {t("success")}
        </p>
      ) : (
        <p role="alert" className="text-center text-sm text-red-400">
          {t("failure")}
        </p>
      )}

      <p className="mt-6 text-center text-sm text-neutral-300">
        <Link href="/browse" className="font-medium text-cyan-300 underline hover:text-cyan-200">
          {t("continueToApp")}
        </Link>
      </p>
    </>
  );
}
