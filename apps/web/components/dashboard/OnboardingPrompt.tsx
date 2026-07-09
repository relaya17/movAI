import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { getUserPreferences } from "@movai/db";
import { db } from "@/lib/db";

/**
 * Shown only to signed-in users who haven't answered the onboarding genre
 * quiz yet - closing the gap getRecommendationsForUser otherwise fills with
 * a generic "popular" row for brand-new accounts (see lib/recommendations.ts
 * onboardingGenreSeeds()). Server component (not a dismiss-and-remember
 * banner) because "answered the quiz" is itself the dismissal signal.
 */
export async function OnboardingPrompt(): Promise<React.ReactElement | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const prefs = await getUserPreferences(db, userId);
  if (prefs && prefs.favoriteGenres.length > 0) return null;

  const t = await getTranslations("onboarding");

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4">
      <p className="text-sm text-cyan-100">{t("promptText")}</p>
      <Link
        href="/onboarding/genres"
        className="shrink-0 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-400"
      >
        {t("promptCta")}
      </Link>
    </div>
  );
}
