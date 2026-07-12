import { resolveArchiveAudioUrl } from "@movai/types";
import { listMovieSubtitles } from "@movai/db";
import { db } from "./db";

export interface ArchivePlaybackData {
  videoUrl: string;
  vttContent: string;
  language: string;
}

/** Resolve direct MP4 + ready VTT for archive movies (enables synced overlay player). */
export async function getArchivePlayback(
  movieId: string,
  identifier: string,
  preferredLanguage = "he"
): Promise<ArchivePlaybackData | null> {
  let subtitleRows: Awaited<ReturnType<typeof listMovieSubtitles>> = [];
  try {
    subtitleRows = await listMovieSubtitles(db, movieId);
  } catch {
    // CI / offline: no Postgres — fall back to Archive.org iframe embed.
  }

  const videoUrl = await resolveArchiveAudioUrl(identifier).catch(() => null);
  if (!videoUrl) return null;

  const readyTracks = subtitleRows.filter((row) => row.status === "ready" && row.content);
  const preferred =
    readyTracks.find((row) => row.language === preferredLanguage) ??
    readyTracks.find((row) => row.language === "he") ??
    readyTracks[0];

  if (!preferred?.content) return null;

  return { videoUrl, vttContent: preferred.content, language: preferred.language };
}
