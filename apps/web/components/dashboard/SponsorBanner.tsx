import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { listActiveSponsors } from "@movai/db";

const getCachedSponsors = unstable_cache(
  async () => listActiveSponsors(db),
  ["active-sponsors"],
  { revalidate: 120 }
);

/**
 * The manually-curated "ad" a non-subscriber sees (see
 * apps/web/app/(dashboard)/admin/sponsors for how these are added - no
 * automated ad network). Rendered conditionally by the caller based on
 * whether the current user has an ad-free subscription perk - this
 * component itself doesn't know about subscriptions, it just shows
 * whichever sponsor sorts first, or nothing if none are configured yet.
 */
export async function SponsorBanner(): Promise<React.ReactElement | null> {
  const sponsors = await getCachedSponsors();
  const sponsor = sponsors[0];
  if (!sponsor) return null;

  return (
    <a
      href={sponsor.linkUrl}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="mx-auto flex max-w-7xl items-center gap-3 border-b border-white/10 bg-white/5 px-4 py-2 text-sm text-neutral-300 transition-colors hover:bg-white/10 sm:px-6 lg:px-8"
    >
      <img src={sponsor.imageUrl} alt={sponsor.name} className="h-8 w-auto rounded" />
      <span className="truncate">{sponsor.name}</span>
      <span className="mr-auto shrink-0 text-xs text-neutral-500">בחסות</span>
    </a>
  );
}
