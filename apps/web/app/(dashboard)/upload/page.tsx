import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { UploadForm } from "@/components/dashboard/UploadForm";

export const metadata: Metadata = {
  title: "העלאת תוכן",
};

export default async function UploadPage(): Promise<React.ReactElement> {
  const t = await getTranslations("upload");

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:p-8">
          <h1 className="mb-2 text-center text-2xl font-bold text-white">
            {t("pageHeadingPrefix")}
            <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-teal-300 bg-clip-text text-transparent">
              MoVAI
            </span>
          </h1>
          <p className="mb-8 text-center text-sm text-neutral-400">
            {t("pageSubtitle")}
          </p>

          <UploadForm />
        </div>
      </div>
    </div>
  );
}
