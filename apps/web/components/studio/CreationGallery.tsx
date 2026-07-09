"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { CreationType } from "@movai/db";
import { listCreationsAction, type CreationListItem } from "@/lib/ai-studio-actions";

const TYPE_ICONS: Record<CreationType, string> = {
  video: "🎬",
  music: "🎵",
  voice: "🎤",
  image: "🖼️"
};

export function CreationGallery(): React.ReactElement {
  const t = useTranslations("studio.gallery");
  const [filter, setFilter] = useState<CreationType | "all">("all");
  const [items, setItems] = useState<CreationListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void listCreationsAction(filter === "all" ? undefined : filter).then((result) => {
      if (cancelled) return;
      setItems(result.items);
      setError(result.error ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [filter]);

  const filters: Array<{ id: CreationType | "all"; label: string }> = [
    { id: "all", label: t("filterAll") },
    { id: "video", label: t("filterVideo") },
    { id: "music", label: t("filterMusic") },
    { id: "voice", label: t("filterVoice") },
    { id: "image", label: t("filterImage") }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-center gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-lg px-3 py-2 text-sm transition-all ${
              filter === f.id
                ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/50"
                : "bg-white/5 text-neutral-400 hover:bg-white/10"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? <p className="text-center text-sm text-neutral-400">{t("loading")}</p> : null}
      {error ? <p className="text-center text-sm text-red-400">{error}</p> : null}

      {!loading && items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-10 text-center">
          <p className="text-neutral-400">{t("empty")}</p>
          <Link href="/studio" className="mt-4 inline-block text-sm text-cyan-400 hover:underline">
            {t("emptyCta")}
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <article key={item.id} className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
            <div className="relative aspect-video bg-black/50">
              {item.resultUrl && item.type === "image" ? (
                <Image src={item.resultUrl} alt={item.prompt} fill sizes="(max-width: 640px) 100vw, 320px" className="object-cover" unoptimized />
              ) : item.resultUrl && item.type === "video" ? (
                <video src={item.resultUrl} className="h-full w-full object-cover" controls preload="metadata" />
              ) : item.resultUrl && (item.type === "music" || item.type === "voice") ? (
                <div className="flex h-full items-center justify-center p-4">
                  <audio src={item.resultUrl} controls className="w-full" />
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-4xl opacity-40">{TYPE_ICONS[item.type]}</div>
              )}
            </div>
            <div className="space-y-1 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-neutral-500">
                  {TYPE_ICONS[item.type]} {t(`type.${item.type}`)}
                </span>
                <span className={`text-xs ${item.status === "completed" ? "text-green-400" : item.status === "failed" ? "text-red-400" : "text-amber-400"}`}>
                  {t(`status.${item.status}`)}
                </span>
              </div>
              <p className="line-clamp-2 text-sm text-neutral-300">{item.prompt}</p>
              <p className="text-xs text-neutral-500">{new Date(item.createdAt).toLocaleString()}</p>
              {item.resultUrl && item.status === "completed" ? (
                <a href={item.resultUrl} download className="inline-block text-xs text-cyan-400 hover:underline">
                  {t("download")}
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
