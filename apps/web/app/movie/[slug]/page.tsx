import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { isEmbeddable } from "@movai/types";
import { Button } from "@movai/ui";
import { auth } from "@/auth";
import { ContentGrid } from "@/components/dashboard/ContentGrid";
import { InstagramEmbed } from "@/components/InstagramEmbed";
import { ShareButton } from "@/components/ShareButton";
import { WatchlistButton } from "@/components/WatchlistButton";
import { MovieDubbingPanel } from "@/components/movie/MovieDubbingPanel";
import { MovieSubtitlesPanel } from "@/components/movie/MovieSubtitlesPanel";
import { ArchiveMoviePlayer } from "@/components/movie/ArchiveMoviePlayer";
import { resolveInstagramEmbed } from "@/lib/instagram";
import { getMovieBySlug, listMovies, listContentByType } from "@/lib/movies";
import { getIsInWatchlist } from "@/lib/watchlist-actions";
import { getSimilarMovies } from "@/lib/recommendations";

export const revalidate = 3600; // ISR - architecture plan §11.1

interface MoviePageProps {
  params: Promise<{ slug: string }>;
}

const FALLBACK_POSTER =
  "https://res.cloudinary.com/dora8sxcb/image/upload/v1783468280/gpt-image-2_Create_a_futuristic_cinematic_promo_video_for_MoVAI_an_AI-powered_movie_discover-0_c0cywb.jpg";

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const [movies, standup, music, singing] = await Promise.all([
    listMovies(),
    listContentByType("standup"),
    listContentByType("music"),
    listContentByType("singing")
  ]);
  return [...movies, ...standup, ...music, ...singing].map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: MoviePageProps): Promise<Metadata> {
  const { slug } = await params;
  const movie = await getMovieBySlug(slug);
  if (!movie) return {};

  return {
    title: movie.title,
    description: movie.synopsis,
    openGraph: {
      title: movie.title,
      description: movie.synopsis,
      images: movie.posterUrl ? [movie.posterUrl] : undefined
    }
  };
}

export default async function MoviePage({ params }: MoviePageProps): Promise<React.ReactElement> {
  const { slug } = await params;
  const movie = await getMovieBySlug(slug);
  if (!movie) notFound();

  const session = await auth();
  const [inWatchlist, similar, tRecs] = await Promise.all([
    session?.user?.id ? getIsInWatchlist(movie.id) : Promise.resolve(false),
    getSimilarMovies(movie.id, movie.genres, 8),
    getTranslations("recommendations")
  ]);

  const embeddable = isEmbeddable(movie.watchSource);
  const instagramEmbed = resolveInstagramEmbed(movie.watchSource);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100";
  const shareUrl = `${appUrl}/movie/${movie.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": movie.contentType === "movie" ? "Movie" : "VideoObject",
    name: movie.title,
    dateCreated: String(movie.year),
    genre: movie.genres,
    description: movie.synopsis,
    image: movie.posterUrl,
    url: shareUrl
  };

  const similarItems = similar.map((item) => ({
    id: item.slug,
    title: item.title,
    thumbnail: item.posterUrl ?? FALLBACK_POSTER,
    creator: item.reason,
    views: 0,
    gifts: 0
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <h1 className="text-2xl font-bold">
        {movie.title} <span className="font-normal text-neutral-500">({movie.year})</span>
      </h1>
      <p className="mt-4 text-neutral-700 dark:text-neutral-300">{movie.synopsis}</p>

      <div className="mt-4 flex flex-wrap gap-3">
        {session?.user?.id ? <WatchlistButton slug={movie.slug} initialInWatchlist={inWatchlist} /> : null}
        <ShareButton title={movie.title} url={shareUrl} />
      </div>

      <div className="mt-6">
        {instagramEmbed ? (
          <InstagramEmbed
            embedUrl={instagramEmbed.embedUrl}
            title={movie.title}
            mediaType={instagramEmbed.mediaType}
            canonicalUrl={instagramEmbed.canonicalUrl}
          />
        ) : null}

        {embeddable && movie.watchSource.kind === "youtube" && (
          <div className="aspect-video w-full overflow-hidden rounded-lg">
            <iframe
              src={`https://www.youtube.com/embed/${movie.watchSource.videoId}`}
              title={`נגן YouTube — ${movie.title}`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {embeddable && movie.watchSource.kind === "archive" && (
          <ArchiveMoviePlayer
            movieId={movie.id}
            identifier={movie.watchSource.identifier}
            title={movie.title}
          />
        )}

        {!embeddable && !instagramEmbed && movie.watchSource.kind === "external-link" && (
          <Button asChild>
            <a href={movie.watchSource.url} target="_blank" rel="noopener noreferrer">
              {movie.watchSource.provider === "tubi"
                ? "צפה ב-Tubi"
                : movie.watchSource.provider === "pluto-tv"
                  ? "צפה ב-Pluto TV"
                  : movie.watchSource.provider === "instagram"
                    ? "צפה באינסטגרם"
                    : "צפה במקור החיצוני"}{" "}
              (נפתח באתר החיצוני)
            </a>
          </Button>
        )}
      </div>

      <p className="mt-6 text-xs text-neutral-500">
        מקור התוכן:{" "}
        {movie.watchSource.kind === "youtube" && `YouTube — ${movie.watchSource.channelTitle}`}
        {movie.watchSource.kind === "archive" && `Internet Archive (רישיון: ${movie.watchSource.license})`}
        {movie.watchSource.kind === "instagram" && "Instagram (הטמעה רשמית)"}
        {movie.watchSource.kind === "external-link" &&
          (movie.watchSource.provider === "instagram" ? "Instagram" : "קישור חיצוני למקור מורשה")}
        . MoVAI אינו מארח את הקובץ ואינו קשור למקור.
      </p>

      <MovieSubtitlesPanel movieSlug={movie.slug} />
      {session?.user?.id ? <MovieDubbingPanel movieSlug={movie.slug} /> : null}

      {similarItems.length > 0 ? (
        <div className="mt-10">
          <ContentGrid id="similar" title={tRecs("similar")} items={similarItems} hrefBase="/movie" />
        </div>
      ) : null}
    </div>
  );
}
