import { z } from "zod";

/**
 * Every movie in the catalog must declare exactly how it can legally be
 * watched. This is a discriminated union on purpose: it forces every
 * consumer (UI, API, adapters) to handle each source explicitly instead of
 * reaching for a loose/optional field. See architecture plan §1.1 and §4.
 *
 * - "youtube" / "archive"  -> we are permitted to embed the official player.
 * - "external-link"        -> platform (e.g. Tubi, Pluto TV) has no public
 *                             embed API for us; we only deep-link out.
 */
export const YoutubeWatchSourceSchema = z.object({
  kind: z.literal("youtube"),
  videoId: z.string().min(1),
  channelTitle: z.string().min(1)
});
export type YoutubeWatchSource = z.infer<typeof YoutubeWatchSourceSchema>;

export const ArchiveWatchSourceSchema = z.object({
  kind: z.literal("archive"),
  identifier: z.string().min(1),
  license: z.enum(["public-domain", "cc-by", "cc-by-sa", "cc0", "unknown"])
});
export type ArchiveWatchSource = z.infer<typeof ArchiveWatchSourceSchema>;

export const ExternalLinkWatchSourceSchema = z.object({
  kind: z.literal("external-link"),
  provider: z.enum(["tubi", "pluto-tv", "other"]),
  url: z.string().url()
});
export type ExternalLinkWatchSource = z.infer<typeof ExternalLinkWatchSourceSchema>;

export const WatchSourceSchema = z.discriminatedUnion("kind", [
  YoutubeWatchSourceSchema,
  ArchiveWatchSourceSchema,
  ExternalLinkWatchSourceSchema
]);
export type WatchSource = z.infer<typeof WatchSourceSchema>;

/** True only for sources we are legally permitted to embed directly. */
export function isEmbeddable(source: WatchSource): boolean {
  switch (source.kind) {
    case "youtube":
    case "archive":
      return true;
    case "external-link":
      return false;
  }
}
