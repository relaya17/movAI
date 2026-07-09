import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GenreQuizForm } from "@/components/GenreQuizForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding");
  return { title: t("title") };
}

export default async function OnboardingGenresPage(): Promise<React.ReactElement> {
  const t = await getTranslations("onboarding");

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="mb-2 text-center text-2xl font-bold text-white">{t("title")}</h1>
      <p className="mb-8 text-center text-sm text-neutral-400">{t("subtitle")}</p>
      <GenreQuizForm />
    </div>
  );
}
