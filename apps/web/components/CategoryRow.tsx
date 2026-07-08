import Link from "next/link";
import type { PublicMovie } from "@movai/types";
import { MovieCard, MovieCardSkeleton } from "@movai/ui";

export interface CategoryRowProps {
  /** Stable id for aria linkage - keep in sync between the row heading and list. */
  id: string;
  title: string;
  /** Short mood/description line shown under the category title, Netflix-style. */
  description?: string;
  movies: PublicMovie[];
  /** Shown instead of the row when there are no matching titles yet, so the section stays honest about content gaps rather than hiding entirely. */
  emptyMessage?: string;
}

/**
 * Netflix-style horizontally scrolling category row. Each row is its own
 * landmark section so screen reader users can jump between genres, and the
 * scroll container stays fully keyboard-reachable (native overflow-x, no
 * custom focus trapping - architecture plan §6 accessibility).
 */
export function CategoryRow({ id, title, description, movies, emptyMessage }: CategoryRowProps): React.ReactElement {
  const headingId = `category-${id}-heading`;

  return (
    <section aria-labelledby={headingId} className="mb-9">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id={headingId} className="text-xl font-bold sm:text-2xl">
          {title}
        </h2>
        {description && <p className="hidden text-sm text-neutral-500 sm:block">{description}</p>}
      </div>

      {movies.length > 0 ? (
        <ul
          className="scrollbar-thin flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
          aria-label={title}
        >
          {movies.map((movie) => (
            <li key={movie.id} className="w-36 flex-none snap-start sm:w-44 md:w-48">
              <MovieCard movie={movie} renderLink={(children, href) => <Link href={href}>{children}</Link>} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-sm text-neutral-500 dark:border-neutral-700">
          {emptyMessage ?? "תוכן בקטגוריה הזו בדרך - מתעדכן בקרוב."}
        </p>
      )}
    </section>
  );
}

export function CategoryRowSkeleton({ title }: { title: string }): React.ReactElement {
  return (
    <section className="mb-9" aria-hidden="true">
      <h2 className="mb-3 text-xl font-bold sm:text-2xl">{title}</h2>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="w-36 flex-none sm:w-44 md:w-48">
            <MovieCardSkeleton />
          </div>
        ))}
      </div>
    </section>
  );
}
