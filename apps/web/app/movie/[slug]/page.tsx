import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isEmbeddable } from "@movai/types";
import { Button } from "@movai/ui";
import { getMovieBySlug, listMovies } from "@/lib/movies";

export const revalidate = 3600; // ISR - architecture plan §11.1

interface MoviePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const movies = await listMovies();
  return movies.map((movie) => ({ slug: movie.slug }));
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

  const embeddable = isEmbeddable(movie.watchSource);

  // schema.org structured data for SEO rich results (architecture plan §8)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title,
    dateCreated: String(movie.year),
    genre: movie.genres,
    description: movie.synopsis
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <h1 className="text-2xl font-bold">
        {movie.title} <span className="font-normal text-neutral-500">({movie.year})</span>
      </h1>
      <p className="mt-4 text-neutral-700 dark:text-neutral-300">{movie.synopsis}</p>

      <div className="mt-6">
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
          <div className="aspect-video w-full overflow-hidden rounded-lg">
            <iframe
              src={`https://archive.org/embed/${movie.watchSource.identifier}`}
              title={`נגן Internet Archive — ${movie.title}`}
              className="h-full w-full"
              allowFullScreen
            />
          </div>
        )}

        {!embeddable && movie.watchSource.kind === "external-link" && (
          <Button asChild>
            <a href={movie.watchSource.url} target="_blank" rel="noopener noreferrer">
              צפה ב-{movie.watchSource.provider === "tubi" ? "Tubi" : "Pluto TV"} (נפתח באתר החיצוני)
            </a>
          </Button>
        )}
      </div>

      <p className="mt-6 text-xs text-neutral-500">
        מקור התוכן:{" "}
        {movie.watchSource.kind === "youtube" && `YouTube — ${movie.watchSource.channelTitle}`}
        {movie.watchSource.kind === "archive" && `Internet Archive (רישיון: ${movie.watchSource.license})`}
        {movie.watchSource.kind === "external-link" && "קישור חיצוני למקור מורשה"}
        . MoVAI אינו מארח את הקובץ ואינו קשור למקור.
      </p>
    </div>
  );
}
