import type { WatchSource } from "./watch-source";

export type SubtitlePipelineKind = "youtube-captions" | "archive-whisper";

export interface SubtitlePipelinePlan {
  kind: SubtitlePipelineKind;
  /** ISO-ish language hint for the source track (YouTube captions). */
  sourceLanguage?: string;
  videoId?: string;
  archiveIdentifier?: string;
  audioUrl?: string;
}

const ARCHIVE_METADATA_SCHEMA = {
  parse(data: unknown): { name: string; format?: string }[] {
    if (!data || typeof data !== "object") return [];
    const files = (data as { files?: unknown }).files;
    if (!Array.isArray(files)) return [];
    return files
      .filter((f): f is { name: string; format?: string } => typeof f === "object" && f !== null && typeof (f as { name?: unknown }).name === "string")
      .map((f) => {
        const format = typeof f.format === "string" ? f.format : undefined;
        return format ? { name: f.name, format } : { name: f.name };
      });
  }
};

/** Pick a downloadable video file from Internet Archive metadata for Whisper input. */
export function pickArchiveMediaFile(files: { name: string; format?: string }[]): string | null {
  const candidates = files.filter((f) => /\.(mp4|mpeg4|mov|m4v|mp3|m4a|wav)$/i.test(f.name) || /mpeg4|h\.264|mp4/i.test(f.format ?? ""));
  if (candidates.length === 0) return null;

  const mp4 = candidates.find((f) => f.name.endsWith(".mp4"));
  return (mp4 ?? candidates[0])?.name ?? null;
}

export async function resolveArchiveAudioUrl(identifier: string, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  const response = await fetchImpl(`https://archive.org/metadata/${identifier}`);
  if (!response.ok) return null;
  const raw: unknown = await response.json();
  const files = ARCHIVE_METADATA_SCHEMA.parse(raw);
  const fileName = pickArchiveMediaFile(files);
  if (!fileName) return null;
  return `https://archive.org/download/${identifier}/${encodeURIComponent(fileName)}`;
}

/** Build a subtitle generation plan from a catalog watch source. */
export function planSubtitlePipeline(source: WatchSource): SubtitlePipelinePlan | null {
  if (source.kind === "youtube") {
    return { kind: "youtube-captions", videoId: source.videoId, sourceLanguage: "en" };
  }
  if (source.kind === "archive") {
    return { kind: "archive-whisper", archiveIdentifier: source.identifier };
  }
  return null;
}

/** YouTube unofficial timedtext endpoint — works for many CC-licensed public videos. */
export function buildYoutubeCaptionsUrl(videoId: string, language: string): string {
  const params = new URLSearchParams({ v: videoId, lang: language, fmt: "vtt" });
  return `https://www.youtube.com/api/timedtext?${params.toString()}`;
}

export async function fetchYoutubeCaptionsVtt(
  videoId: string,
  language: string,
  fetchImpl: typeof fetch = fetch
): Promise<string | null> {
  const response = await fetchImpl(buildYoutubeCaptionsUrl(videoId, language));
  if (!response.ok) return null;
  const text = await response.text();
  if (!text.trim().startsWith("WEBVTT")) return null;
  return text;
}

/** Map MoVAI UI language codes to Whisper / translation targets. */
export function subtitleLanguageCode(language: string): string {
  const map: Record<string, string> = { he: "he", en: "en", ar: "ar", ru: "ru", es: "es", fr: "fr" };
  return map[language] ?? language;
}
