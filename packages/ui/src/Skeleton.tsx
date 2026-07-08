import * as React from "react";
import clsx from "clsx";

/** Loading placeholder - architecture plan §11.4 (perceived speed). */
export function Skeleton({ className }: { className?: string }): React.ReactElement {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={clsx("animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800", className)}
    />
  );
}

export function MovieCardSkeleton(): React.ReactElement {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="aspect-[2/3] w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}
