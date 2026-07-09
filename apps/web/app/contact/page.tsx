import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ContactForm } from "@/components/ContactForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contact");
  return { title: t("title") };
}

export default async function ContactPage(): Promise<React.ReactElement> {
  const t = await getTranslations("contact");

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-2 text-center text-2xl font-bold text-white">{t("title")}</h1>
      <p className="mb-8 text-center text-sm text-neutral-400">{t("subtitle")}</p>
      <ContactForm />
    </div>
  );
}
