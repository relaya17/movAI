"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { submitOnboardingGenres } from "@/lib/onboarding-actions";

const GENRES = [
  "Action",
  "Comedy",
  "Drama",
  "Horror",
  "Thriller",
  "Romance",
  "Documentary",
  "Crime",
  "Animation",
  "History"
] as const;

export function GenreQuizForm(): React.ReactElement {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(genre: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(genre)) next.delete(genre);
      else next.add(genre);
      return next;
    });
  }

  function submit(): void {
    if (selected.size === 0) {
      setError(t("errorNone"));
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await submitOnboardingGenres([...selected]);
      if (!result.ok) {
        setError(t("errorGeneric"));
        return;
      }
      router.push("/browse");
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {GENRES.map((genre) => {
          const isSelected = selected.has(genre);
          return (
            <button
              key={genre}
              type="button"
              aria-pressed={isSelected}
              onClick={() => toggle(genre)}
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                isSelected
                  ? "border-cyan-400 bg-cyan-400/10 text-white"
                  : "border-white/10 bg-white/5 text-neutral-400 hover:border-white/20 hover:text-white"
              }`}
            >
              {t(`genres.${genre}`)}
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="mb-4 text-center text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={pending}
        onClick={submit}
        className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-3 font-semibold text-white transition-all hover:from-cyan-400 hover:to-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? t("submitting") : t("submit")}
      </button>

      <button
        type="button"
        onClick={() => router.push("/browse")}
        className="mt-3 w-full text-center text-sm text-neutral-500 hover:text-neutral-300"
      >
        {t("skip")}
      </button>
    </div>
  );
}
