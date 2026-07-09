import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const metadata = { title: "איפוס סיסמה" };

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps): Promise<React.ReactElement> {
  const { token } = await searchParams;
  const t = await getTranslations("auth.resetPassword");

  if (!token) {
    return (
      <>
        <h1 className="mb-2 text-center text-2xl font-bold text-white">{t("title")}</h1>
        <p role="alert" className="text-center text-sm text-red-400">
          {t("missingToken")}
        </p>
        <p className="mt-6 text-center text-sm text-neutral-300">
          <Link href="/forgot-password" className="font-medium text-cyan-300 underline hover:text-cyan-200">
            {t("requestNewLink")}
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="mb-2 text-center text-2xl font-bold text-white">{t("title")}</h1>
      <p className="mb-8 text-center text-sm text-neutral-300">{t("subtitle")}</p>

      <ResetPasswordForm token={token} />
    </>
  );
}
