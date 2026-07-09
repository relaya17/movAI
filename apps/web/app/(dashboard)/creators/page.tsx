import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@movai/ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("creators");
  return { title: t("title"), description: t("subtitle") };
}

export default async function CreatorsPage(): Promise<React.ReactElement> {
  const t = await getTranslations("creators");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-center">
      <h1 className="font-orbitron text-3xl font-bold text-white md:text-4xl">{t("title")}</h1>
      <p className="mt-4 text-lg text-neutral-400">{t("subtitle")}</p>

      <div className="mt-10 grid gap-4 text-start sm:grid-cols-3">
        {(["video", "music", "image"] as const).map((key) => (
          <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-5">
            <p className="text-2xl">{key === "video" ? "🎬" : key === "music" ? "🎵" : "🖼️"}</p>
            <p className="mt-2 font-semibold text-white">{t(`features.${key}.title`)}</p>
            <p className="mt-1 text-sm text-neutral-400">{t(`features.${key}.desc`)}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button asChild className="bg-gradient-to-r from-cyan-500 to-blue-500">
          <Link href="/studio">{t("ctaStudio")}</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/upload">{t("ctaUpload")}</Link>
        </Button>
      </div>

      <p className="mt-8 text-sm text-neutral-500">{t("freemiumNote")}</p>
    </div>
  );
}
