import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { StudioTabs } from "@/components/studio/StudioTabs";

const STUDIO_BACKGROUND =
  "https://res.cloudinary.com/dora8sxcb/image/upload/v1783618062/gpt-image-2_Create_a_futuristic_cinematic_promo_video_for_MoVAI_an_AI-powered_movie_discover-0_ob1xlt.jpg";

export const metadata: Metadata = {
  title: "סטודיו AI",
  description: "צרו וידאו, מוזיקה ושירה באמצעות בינה מלאכותית",
};

export default async function StudioPage(): Promise<React.ReactElement> {
  const t = await getTranslations("studio");

  return (
    <div className="relative min-h-full pb-16">
      {/* Cinematic hero — same language as BrowseHero */}
      <div className="relative mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <div className="relative aspect-[21/9] min-h-[180px] max-h-[min(42vh,420px)] overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-2xl shadow-cyan-950/30">
          <Image
            src={STUDIO_BACKGROUND}
            alt=""
            fill
            priority
            sizes="(max-width: 1280px) 100vw, 1280px"
            quality={90}
            className="object-cover object-[center_30%]"
          />

          {/* Blend image into page background */}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/50 to-neutral-950/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/50 via-transparent to-neutral-950/50" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,10,10,0.35)_100%)]" />

          {/* Title panel sits on the image, hides baked-in promo text */}
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
            <header className="mx-auto max-w-xl rounded-xl border border-white/15 bg-black/50 px-5 py-3 text-center shadow-xl backdrop-blur-xl sm:px-6 sm:py-4">
              <h1 className="font-orbitron text-2xl font-bold tracking-wide text-white sm:text-3xl">
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
              <p className="mt-1 text-sm text-neutral-300 sm:text-base">{t("pageSubtitle")}</p>
            </header>
          </div>
        </div>
      </div>

      {/* Content flows from hero fade */}
      <div className="relative mx-auto -mt-2 max-w-6xl px-4 sm:px-6 lg:px-8">
        <StudioTabs />
      </div>
    </div>
  );
}
