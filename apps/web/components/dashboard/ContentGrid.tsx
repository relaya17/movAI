"use client";

import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { isRtl, type Locale } from "@/i18n/config";

interface ContentItem {
  id: string;
  title: string;
  thumbnail: string;
  creator: string;
  views: number;
  gifts: number;
}

interface ContentGridProps {
  id: string;
  title: string;
  items: ContentItem[];
  /**
   * Every browse category (movies, standup, music, singing) links to
   * /movie/[slug] (apps/web/app/movie/[slug]/page.tsx, a real DB-backed,
   * contentType-agnostic page) using item.id = the catalog item's slug.
   * "/watch" default kept only for any other future caller that isn't
   * catalog-backed.
   */
  hrefBase?: string;
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export function ContentGrid({ id, title, items, hrefBase = "/watch" }: ContentGridProps): React.ReactElement {
  const t = useTranslations("browse.categoryPills");
  const locale = useLocale() as Locale;
  const arrow = isRtl(locale) ? "←" : "→";

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white sm:text-2xl">{title}</h2>
        {/* Uses the category id (matches DashboardNav/BrowseHero), not the localized title - the page filters on id. */}
        <Link
          href={`/browse?category=${id}`}
          className="text-sm font-medium text-cyan-400 transition-colors hover:text-cyan-300"
        >
          {t("showAll")} {arrow}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((item) => (
          <ContentCard key={item.id} item={item} hrefBase={hrefBase} />
        ))}
      </div>
    </section>
  );
}

function ContentCard({ item, hrefBase }: { item: ContentItem; hrefBase: string }): React.ReactElement {
  return (
    <Link href={`${hrefBase}/${item.id}`} className="group relative">
      <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-neutral-800 transition-all duration-300 group-hover:border-cyan-400/50 group-hover:shadow-lg group-hover:shadow-cyan-500/10">
        <Image
          src={item.thumbnail}
          alt={item.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="rounded-full bg-cyan-500 p-3 shadow-lg">
            <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* Gift badge */}
        {item.gifts > 0 && (
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 text-xs font-semibold text-white shadow-lg">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z" />
            </svg>
            {formatNumber(item.gifts)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-2 px-1">
        <h3 className="truncate text-sm font-semibold text-white group-hover:text-cyan-300">{item.title}</h3>
        <div className="mt-1 flex items-center justify-between text-xs text-neutral-400">
          <span>{item.creator}</span>
          <span className="flex items-center gap-1">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            {formatNumber(item.views)}
          </span>
        </div>
      </div>
    </Link>
  );
}
