import * as React from "react";
import type { PublicMovie } from "@movai/types";

export interface MovieCardProps {
  movie: PublicMovie;
  /** Renders the poster/title as a link to this href - kept generic so apps/web supplies its own <Link>. */
  renderLink: (children: React.ReactNode, href: string) => React.ReactElement;
}

/**
 * Catalog grid card. Accessibility notes (architecture plan §6):
 *  - poster always has a meaningful `alt` (falls back to the title, never
 *    a filename or empty string).
 *  - the whole card is reachable via a single Tab stop (one link), not a
 *    div full of separately-focusable pieces.
 *  - dead links are surfaced visually + to screen readers, not silently
 *    hidden, so a returning user understands why a movie is unavailable.
 */
export function MovieCard({ movie, renderLink }: MovieCardProps): React.ReactElement {
  const isDead = movie.linkStatus === "dead";

  return (
    <article className="group flex flex-col gap-2">
      {renderLink(
        <>
          <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800">
            {movie.posterUrl ? (
              <img
                src={movie.posterUrl}
                alt={`פוסטר הסרט ${movie.title}`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-200 motion-safe:group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-neutral-500">
                {movie.title}
              </div>
            )}
            {isDead && (
              <span className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1 text-center text-xs text-white">
                הקישור אינו זמין כרגע
              </span>
            )}
          </div>
          <h3 className="line-clamp-2 text-sm font-medium">
            {movie.title} <span className="text-neutral-500">({movie.year})</span>
          </h3>
        </>,
        `/movie/${movie.slug}`
      )}
    </article>
  );
}
