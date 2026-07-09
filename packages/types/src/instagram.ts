import { z } from "zod";

/** Parsed public Instagram post/reel URL. */
export const InstagramMediaTypeSchema = z.enum(["reel", "post"]);
export type InstagramMediaType = z.infer<typeof InstagramMediaTypeSchema>;

export interface ParsedInstagramUrl {
  shortcode: string;
  mediaType: InstagramMediaType;
  url: string;
}

const INSTAGRAM_HOST = /^(?:www\.)?instagram\.com$/i;

/**
 * Extract shortcode from a public Instagram post/reel URL.
 * Returns null for stories, private links, or non-Instagram URLs.
 */
export function parseInstagramUrl(rawUrl: string): ParsedInstagramUrl | null {
  try {
    const url = new URL(rawUrl);
    if (!INSTAGRAM_HOST.test(url.hostname)) return null;

    const reelMatch = url.pathname.match(/^\/reel\/([^/]+)\/?$/i);
    if (reelMatch?.[1]) {
      return { shortcode: reelMatch[1], mediaType: "reel", url: url.toString() };
    }

    const postMatch = url.pathname.match(/^\/p\/([^/]+)\/?$/i);
    if (postMatch?.[1]) {
      return { shortcode: postMatch[1], mediaType: "post", url: url.toString() };
    }

    return null;
  } catch {
    return null;
  }
}

/** Official Meta embed URL — only for explicitly linked public posts/reels. */
export function getInstagramEmbedUrl(parsed: Pick<ParsedInstagramUrl, "shortcode" | "mediaType">): string {
  const segment = parsed.mediaType === "reel" ? "reel" : "p";
  return `https://www.instagram.com/${segment}/${parsed.shortcode}/embed`;
}
