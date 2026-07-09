import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ContentType, PublicMovie } from "@movai/types";
import { auth } from "@/auth";
import { BrowseHero } from "@/components/dashboard/BrowseHero";
import { ConciergeSearch } from "@/components/dashboard/ConciergeSearch";
import { BrowsePageClient } from "@/components/dashboard/BrowsePageClient";
import { ContentGrid } from "@/components/dashboard/ContentGrid";
import { RealUploadsSection } from "@/components/dashboard/RealUploadsSection";
import { OnboardingPrompt } from "@/components/dashboard/OnboardingPrompt";
import { listMovies, listContentByType } from "@/lib/movies";
import { getRecommendationsForUser } from "@/lib/recommendations";

export const metadata: Metadata = {
  title: "גלה תוכן",
};

/** Cache the unfiltered catalog shell; category filter still uses searchParams. */
export const revalidate = 300;

// Used only when a real catalog item has no poster yet (an Archive.org/
// YouTube item TMDB enrichment hasn't matched, or a standup/music/singing
// item - those are never TMDB-enriched at all, see worker.ts) - not a
// per-item image.
const FALLBACK_POSTER =
  "https://res.cloudinary.com/dora8sxcb/image/upload/v1783468280/gpt-image-2_Create_a_futuristic_cinematic_promo_video_for_MoVAI_an_AI-powered_movie_discover-0_c0cywb.jpg";

const NON_MOVIE_CONTENT_TYPES: readonly Exclude<ContentType, "movie">[] = ["standup", "music", "singing"];

/**
 * id is the item's slug (what /movie/[slug] actually keys on, for every
 * contentType - see that page's generateStaticParams). creator/views/gifts
 * have no meaning for catalog content (none of it is a creator upload), so
 * they're zeroed out rather than fabricated - ContentGrid already hides the
 * gift badge entirely when gifts is 0.
 */
/**
 * When the item came from getRecommendationsForUser, `reason` is a short
 * "why this" line (e.g. "כי אהבת סרטי דרמה") - shown instead of the plain
 * genre/year subtitle so the recommended row is transparent about why an
 * item showed up, unlike the black-box algorithms big streamers get
 * criticized for.
 */
function toContentGridItems(items: readonly (PublicMovie & { reason?: string })[]) {
  return items.map((item) => ({
    id: item.slug,
    title: item.title,
    thumbnail: item.posterUrl ?? FALLBACK_POSTER,
    creator: item.reason ?? item.genres[0] ?? String(item.year),
    views: 0,
    gifts: 0
  }));
}

interface BrowsePageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function BrowsePage({ searchParams }: BrowsePageProps): Promise<React.ReactElement> {
  const { category } = await searchParams;
  const tBrowse = await getTranslations("browse.categoryPills");
  const tContent = await getTranslations("contentTypes");

  const CATEGORY_TITLES: Record<string, string> = {
    movies: tBrowse("movies"),
    standup: tContent("standup"),
    music: tContent("music"),
    singing: tContent("singing")
  };

  // Real catalog fetch for every category (see lib/movies.ts) - standup/
  // music/singing used to be static mock arrays hardcoded directly in this
  // file with no backing data; worker.ts now actually ingests them from
  // YouTube (packages/queue/src/catalog-queries.ts), and listContentByType
  // falls back to a small placeholder set only until the first daily sweep
  // has run, same resilience pattern as listMovies() already used.
  const session = await auth();
  const [movies, recommended, ...nonMovieResults] = await Promise.all([
    listMovies(20),
    getRecommendationsForUser(session?.user?.id, 12),
    ...NON_MOVIE_CONTENT_TYPES.map((contentType) => listContentByType(contentType, 20))
  ]);
  const tRecs = await getTranslations("recommendations");

  const CATEGORIES = [
    { id: "movies", title: CATEGORY_TITLES.movies ?? "movies", items: toContentGridItems(movies), hrefBase: "/movie" },
    ...NON_MOVIE_CONTENT_TYPES.map((contentType, index) => ({
      id: contentType,
      title: CATEGORY_TITLES[contentType] ?? contentType,
      items: toContentGridItems(nonMovieResults[index] ?? []),
      hrefBase: "/movie"
    }))
  ];

  const isKnownCategory = CATEGORIES.some((entry) => entry.id === category);
  const activeCategory = isKnownCategory && category ? category : "all";
  const visibleCategories = activeCategory === "all" ? CATEGORIES : CATEGORIES.filter((c) => c.id === activeCategory);

  return (
    <BrowsePageClient>
      <BrowseHero activeCategory={activeCategory} />
      {activeCategory === "all" ? <ConciergeSearch /> : null}
      <div className="mt-10 px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-10">
          {activeCategory === "all" ? <OnboardingPrompt /> : null}
          {activeCategory === "all" && recommended.length > 0 ? (
            <ContentGrid
              id="recommended"
              title={tRecs("title")}
              items={toContentGridItems(recommended)}
              hrefBase="/movie"
            />
          ) : null}
          {activeCategory === "all" && <RealUploadsSection />}
          {visibleCategories.map((category) => (
            <ContentGrid
              key={category.id}
              id={category.id}
              title={category.title}
              items={category.items}
              hrefBase={category.hrefBase}
            />
          ))}
        </div>
      </div>
    </BrowsePageClient>
  );
}
