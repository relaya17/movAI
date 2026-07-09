import { Skeleton } from "@movai/ui";

export default function MovieLoading(): React.ReactElement {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="aspect-video w-full" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}