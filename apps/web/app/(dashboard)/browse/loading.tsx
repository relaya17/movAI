import { MovieCardSkeleton } from "@movai/ui";

export default function BrowseLoading(): React.ReactElement {
  return (
    <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="mb-8 h-48 animate-pulse rounded-2xl bg-neutral-800" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }, (_, index) => (
          <MovieCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
