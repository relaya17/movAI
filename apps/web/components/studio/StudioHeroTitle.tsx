import { getTranslations } from "next-intl/server";

export async function StudioHeroTitle(): Promise<React.ReactElement> {
  const t = await getTranslations("studio");

  return (
    <header className="relative z-20 -mt-2 w-full px-4 text-center sm:-mt-3">
      <div className="relative mx-auto w-fit max-w-md rounded-xl border border-white/10 bg-black/30 px-5 pb-5 pt-9 shadow-lg backdrop-blur-lg sm:max-w-lg sm:px-6 sm:pb-6 sm:pt-10">
        <h1 className="font-orbitron text-3xl font-black tracking-[0.15em] text-white sm:text-4xl">
          {t("pageHeading")}{" "}
          <span
            style={{
              background: "linear-gradient(180deg, #ffffff 0%, #67e8f9 40%, #06b6d4 70%, #0e7490 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 24px rgba(103,232,249,0.6))",
            }}
          >
            AI
          </span>
        </h1>

        <p className="mt-4 text-sm font-medium leading-relaxed tracking-wide text-cyan-100/95 sm:mt-5 sm:text-base">
          {t("heroTagline")}
        </p>
      </div>
    </header>
  );
}
