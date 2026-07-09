import { getTranslations } from "next-intl/server";

interface StudioHeadingProps {
  compact?: boolean;
}

export async function StudioHeading({ compact = false }: StudioHeadingProps): Promise<React.ReactElement> {
  const t = await getTranslations("studio");

  return (
    <header className={compact ? "mb-6 text-center" : "mb-10 text-center"}>
      <h1
        className={`font-orbitron font-bold tracking-wide text-white ${
          compact ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"
        }`}
      >
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
      {!compact && <p className="mt-2 text-neutral-400">{t("pageSubtitle")}</p>}
    </header>
  );
}
