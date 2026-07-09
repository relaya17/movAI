import type { WatchSource } from "@movai/types";
import { getInstagramEmbedUrl, parseInstagramUrl } from "@movai/types";

export interface InstagramEmbedInfo {
  embedUrl: string;
  canonicalUrl: string;
  mediaType: "reel" | "post";
}

/** Resolve an embeddable Instagram iframe for a catalog watch source, if legal and parseable. */
export function resolveInstagramEmbed(source: WatchSource): InstagramEmbedInfo | null {
  if (source.kind === "instagram") {
    return {
      embedUrl: getInstagramEmbedUrl(source),
      canonicalUrl: source.url,
      mediaType: source.mediaType
    };
  }

  if (source.kind === "external-link") {
    const parsed = parseInstagramUrl(source.url);
    if (!parsed) return null;
    return {
      embedUrl: getInstagramEmbedUrl(parsed),
      canonicalUrl: parsed.url,
      mediaType: parsed.mediaType
    };
  }

  return null;
}
