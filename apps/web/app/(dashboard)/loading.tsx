import { MovieCardSkeleton } from "@movai/ui";

/** Instant feedback while dashboard pages load (nav, credits, page data). */
export default function DashboardLoading(): React.ReactElement {
  return (
    <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="mb-8 h-10 w-48 animate-pulse rounded-lg bg-neutral-800" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 8 }, (_, index) => (
          <MovieCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
