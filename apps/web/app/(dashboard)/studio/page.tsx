import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StudioTabs } from "@/components/studio/StudioTabs";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary";

const STUDIO_BACKGROUND =
  "https://res.cloudinary.com/dora8sxcb/image/upload/v1783618062/gpt-image-2_Create_a_futuristic_cinematic_promo_video_for_MoVAI_an_AI-powered_movie_discover-0_ob1xlt.jpg";

export const metadata: Metadata = {
  title: "סטודיו AI",
  description: "צרו וידאו, מוזיקה ושירה באמצעות בינה מלאכותית",
};

export default async function StudioPage(): Promise<React.ReactElement> {
  const t = await getTranslations("studio");
  const bgUrl = optimizeCloudinaryUrl(STUDIO_BACKGROUND, 1920);

  return (
    <div
      className="w-full bg-neutral-950 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.7)), url('${bgUrl}')`,
      }}
    >
      <div className="mx-auto w-full max-w-5xl px-3 pb-10 pt-16 sm:px-6 sm:pb-12 sm:pt-20 lg:px-8">
        <header className="mx-auto mb-4 max-w-xl sm:mb-5">
          <div className="rounded-lg border border-white/20 bg-black/55 px-4 py-3 text-center backdrop-blur-xl sm:rounded-xl sm:px-5 sm:py-4">
            <h1 className="font-orbitron text-xl font-bold tracking-wide text-white sm:text-2xl md:text-3xl">
              {t("pageHeading")}{" "}
              <span
                style={{
                  background: "linear-gradient(180deg, #ffffff 0%, #67e8f9 50%, #06b6d4 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                AI
              </span>
            </h1>
            <p className="mt-1 text-xs text-neutral-200 sm:text-sm">{t("pageSubtitle")}</p>
          </div>
        </header>

        <StudioTabs />
      </div>
    </div>
  );
}
