"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { searchConciergeAction } from "@/lib/concierge-actions";
import { trackClientEvent } from "@/components/AnalyticsProvider";
import type { PublicMovie } from "@movai/types";

const FALLBACK_POSTER =
  "https://res.cloudinary.com/dora8sxcb/image/upload/v1783468280/gpt-image-2_Create_a_futuristic_cinematic_promo_video_for_MoVAI_an_AI-powered_movie_discover-0_c0cywb.jpg";

export function ConciergeSearch(): React.ReactElement {
  const t = useTranslations("concierge");
  const [query, setQuery] = useState("");
  const [explanation, setExplanation] = useState<string | null>(null);
  const [results, setResults] = useState<PublicMovie[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (): void => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const response = await searchConciergeAction(trimmed);
      setResults(response.movies);
      setExplanation(response.explanation);
      trackClientEvent("concierge_search", { query_length: trimmed.length, result_count: response.movies.length });
    });
  };

  return (
    <div className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/40 to-neutral-950/80 p-4 sm:p-6">
        <label htmlFor="concierge-query" className="mb-2 block text-sm font-semibold text-cyan-200">
          {t("label")}
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="concierge-query"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder={t("placeholder")}
            className="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder-neutral-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={isPending || !query.trim()}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 font-semibold text-white transition hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50"
          >
            {isPending ? t("searching") : t("search")}
          </button>
        </div>
        <p className="mt-2 text-xs text-neutral-400">{t("hint")}</p>

        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        {explanation ? <p className="mt-4 text-sm text-neutral-300">{explanation}</p> : null}

        {results.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {results.map((movie) => (
              <Link
                key={movie.id}
                href={`/movie/${movie.slug}`}
                className="group overflow-hidden rounded-xl border border-white/10 bg-white/5 transition hover:border-cyan-400/40"
              >
                <div className="relative aspect-[2/3]">
                  <Image
                    src={movie.posterUrl ?? FALLBACK_POSTER}
                    alt={movie.title}
                    fill
                    sizes="(max-width: 640px) 50vw, 16vw"
                    className="object-cover transition group-hover:scale-105"
                  />
                </div>
                <div className="p-2">
                  <p className="truncate text-sm font-medium text-white">{movie.title}</p>
                  <p className="text-xs text-neutral-400">{movie.year}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
