import type { Database } from "@movai/db";
import { getMovieById, getSubtitleById, updateSubtitleStatus } from "@movai/db";
import {
  fetchYoutubeCaptionsVtt,
  planSubtitlePipeline,
  resolveArchiveAudioUrl,
  subtitleLanguageCode
} from "@movai/types";
import { runWhisperVtt, translateVtt } from "./replicate-subtitles";

const YOUTUBE_CAPTION_LANGS = ["en", "he", "ar", "ru", "es", "fr", "de"];

async function fetchBestYoutubeVtt(videoId: string, preferredLang: string): Promise<{ vtt: string; sourceLang: string } | null> {
  const tryOrder = [preferredLang, "en", ...YOUTUBE_CAPTION_LANGS.filter((l) => l !== preferredLang && l !== "en")];
  for (const lang of tryOrder) {
    const vtt = await fetchYoutubeCaptionsVtt(videoId, lang);
    if (vtt) return { vtt, sourceLang: lang };
  }
  return null;
}

async function maybeTranslate(vtt: string, sourceLang: string, targetLang: string): Promise<string> {
  if (sourceLang === targetLang) return vtt;
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error("Translation requires REPLICATE_API_TOKEN");
  }
  return translateVtt(vtt, targetLang);
}

/** BullMQ worker entry — generates VTT for a single movie_subtitles row. */
export async function processSubtitleJob(db: Database, subtitleId: string): Promise<void> {
  const subtitle = await getSubtitleById(db, subtitleId);
  if (!subtitle) return;
  if (subtitle.status === "ready" || subtitle.status === "failed") return;

  const movie = await getMovieById(db, subtitle.movieId);
  if (!movie) {
    await updateSubtitleStatus(db, subtitleId, { status: "failed", errorMessage: "Movie not found" });
    return;
  }

  const plan = planSubtitlePipeline(movie.watchSource);
  if (!plan) {
    await updateSubtitleStatus(db, subtitleId, {
      status: "failed",
      errorMessage: "Subtitle pipeline not supported for this watch source"
    });
    return;
  }

  await updateSubtitleStatus(db, subtitleId, { status: "processing" });

  try {
    const targetLang = subtitleLanguageCode(subtitle.language);
    let vtt: string;
    let sourceLang = targetLang;

    if (plan.kind === "youtube-captions" && plan.videoId) {
      const captions = await fetchBestYoutubeVtt(plan.videoId, targetLang);
      if (!captions) {
        throw new Error("No YouTube caption track found for this video");
      }
      vtt = await maybeTranslate(captions.vtt, captions.sourceLang, targetLang);
      sourceLang = captions.sourceLang;
    } else if (plan.kind === "archive-whisper" && plan.archiveIdentifier) {
      if (!process.env.REPLICATE_API_TOKEN) {
        throw new Error("REPLICATE_API_TOKEN not configured");
      }
      const audioUrl = await resolveArchiveAudioUrl(plan.archiveIdentifier);
      if (!audioUrl) {
        throw new Error("Could not resolve Internet Archive media file");
      }
      const whisperLang = targetLang === "he" ? undefined : targetLang;
      vtt = await runWhisperVtt(audioUrl, whisperLang);
      sourceLang = whisperLang ?? "auto";
      if (targetLang !== "en" && targetLang !== sourceLang) {
        vtt = await maybeTranslate(vtt, "en", targetLang);
      }
    } else {
      throw new Error("Unsupported subtitle pipeline");
    }

    await updateSubtitleStatus(db, subtitleId, { status: "ready", content: vtt });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Subtitle generation failed";
    await updateSubtitleStatus(db, subtitleId, { status: "failed", errorMessage: message });
    throw err;
  }
}
