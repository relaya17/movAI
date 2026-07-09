import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { getPublishedUploads } from "@movai/db";
import { db } from "@/lib/db";
import { GiftButton } from "@/components/gifts/GiftButton";
import { ReportButton } from "@/components/ReportButton";

/** Real, DB-backed creator uploads (distinct from the curated demo catalog above it) - the actual output of /upload. */
export async function RealUploadsSection(): Promise<React.ReactElement | null> {
  const uploads = await getPublishedUploads(db, 12);
  const t = await getTranslations();

  if (uploads.length === 0) return null;

  const CONTENT_TYPE_LABELS: Record<string, string> = {
    standup: t("contentTypes.standup"),
    music: t("contentTypes.music"),
    singing: t("contentTypes.singing")
  };

  return (
    <section>
      <h2 className="mb-4 text-xl font-bold text-white sm:text-2xl">{t("browse.communityCreations")}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {uploads.map((upload) => (
          <div key={upload.id} className="group relative">
            <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-neutral-800">
              {upload.thumbnailUrl ? (
                <Image src={upload.thumbnailUrl} alt={upload.title} fill sizes="20vw" className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-3xl">🎬</div>
              )}
              <div className="absolute bottom-2 right-2">
                <GiftButton uploadId={upload.id} />
              </div>
              <div className="absolute left-2 top-2">
                <ReportButton uploadId={upload.id} uploadTitle={upload.title} />
              </div>
            </div>
            <div className="mt-2 px-1">
              <h3 className="truncate text-sm font-semibold text-white">{upload.title}</h3>
              <p className="mt-1 text-xs text-neutral-400">{CONTENT_TYPE_LABELS[upload.contentType] ?? upload.contentType}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
