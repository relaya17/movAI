import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { ContentGrid } from "@/components/dashboard/ContentGrid";
import { listWatchlist } from "@movai/db";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Watchlist"
};

const FALLBACK_POSTER =
  "https://res.cloudinary.com/dora8sxcb/image/upload/v1783468280/gpt-image-2_Create_a_futuristic_cinematic_promo_video_for_MoVAI_an_AI-powered_movie_discover-0_c0cywb.jpg";

export default async function WatchlistPage(): Promise<React.ReactElement> {
  const t = await getTranslations("watchlist");
  const session = await auth();
  const items = session?.user?.id ? await listWatchlist(db, session.user.id) : [];

  const gridItems = items.map((item) => ({
    id: item.slug,
    title: item.title,
    thumbnail: item.posterUrl ?? FALLBACK_POSTER,
    creator: item.genres[0] ?? String(item.year),
    views: 0,
    gifts: 0
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-2 text-2xl font-bold text-white sm:text-3xl">{t("title")}</h1>
      <p className="mb-8 text-sm text-neutral-400">{t("subtitle")}</p>

      {gridItems.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center text-neutral-300">
          {t("empty")}
        </p>
      ) : (
        <ContentGrid id="watchlist" title={t("gridTitle")} items={gridItems} hrefBase="/movie" />
      )}
    </div>
  );
}
