"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toggleWatchlistBySlug } from "@/lib/watchlist-actions";

interface WatchlistButtonProps {
  slug: string;
  initialInWatchlist: boolean;
}

export function WatchlistButton({ slug, initialInWatchlist }: WatchlistButtonProps): React.ReactElement {
  const t = useTranslations("watchlist");
  const router = useRouter();
  const [inWatchlist, setInWatchlist] = useState(initialInWatchlist);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await toggleWatchlistBySlug(slug);
            if (!result.ok) {
              setError(result.error === "auth_required" ? t("authRequired") : t("error"));
              return;
            }
            setInWatchlist(result.inWatchlist);
            router.refresh();
          });
        }}
        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          inWatchlist
            ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40 hover:bg-cyan-500/30"
            : "bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/15"
        } disabled:opacity-60`}
      >
        {pending ? t("saving") : inWatchlist ? t("remove") : t("add")}
      </button>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
