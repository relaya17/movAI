import { z } from "zod";
import { InstagramMediaTypeSchema } from "./instagram";

/**
 * Every movie in the catalog must declare exactly how it can legally be
 * watched. This is a discriminated union on purpose: it forces every
 * consumer (UI, API, adapters) to handle each source explicitly instead of
 * reaching for a loose/optional field. See architecture plan §1.1 and §4.
 *
 * - "youtube" / "archive"   -> we are permitted to embed the official player.
 * - "instagram"             -> public post/reel linked by URL; Meta's official
 *                             /embed iframe only (no scraping, no bulk ingest).
 * - "external-link"         -> platform has no embed API; we deep-link out.
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
  provider: z.enum(["tubi", "pluto-tv", "instagram", "other"]),
  url: z.string().url()
});
export type ExternalLinkWatchSource = z.infer<typeof ExternalLinkWatchSourceSchema>;

/** Public Instagram post/reel — embed via Meta's official iframe only. */
export const InstagramWatchSourceSchema = z.object({
  kind: z.literal("instagram"),
  url: z.string().url(),
  shortcode: z.string().min(1),
  mediaType: InstagramMediaTypeSchema
});
export type InstagramWatchSource = z.infer<typeof InstagramWatchSourceSchema>;

export const WatchSourceSchema = z.discriminatedUnion("kind", [
  YoutubeWatchSourceSchema,
  ArchiveWatchSourceSchema,
  ExternalLinkWatchSourceSchema,
  InstagramWatchSourceSchema
]);
export type WatchSource = z.infer<typeof WatchSourceSchema>;

/** True only for sources we are legally permitted to embed directly. */
export function isEmbeddable(source: WatchSource): boolean {
  switch (source.kind) {
    case "youtube":
    case "archive":
    case "instagram":
      return true;
    case "external-link":
      return false;
  }
}
