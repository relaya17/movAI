import { getDubbingJobById, getMovieById, updateDubbingJob, type Database } from "@movai/db";
import { resolveArchiveAudioUrl } from "@movai/types";
import { getElevenLabsDubbingStatus, startElevenLabsDubbing } from "./elevenlabs-dubbing";

async function resolveSourceUrl(
  watchSource: NonNullable<Awaited<ReturnType<typeof getMovieById>>>["watchSource"]
): Promise<string | null> {
  if (watchSource.kind === "archive") {
    return resolveArchiveAudioUrl(watchSource.identifier);
  }
  if (watchSource.kind === "youtube") {
    return `https://www.youtube.com/watch?v=${watchSource.videoId}`;
  }
  return null;
}

/** Process a pending dubbing_jobs row via ElevenLabs Dubbing API. */
export async function processDubbingJob(db: Database, jobId: string): Promise<void> {
  const job = await getDubbingJobById(db, jobId);
  if (!job || job.status === "completed" || job.status === "failed") return;

  const movie = await getMovieById(db, job.movieId);
  if (!movie) {
    await updateDubbingJob(db, jobId, { status: "failed", errorMessage: "Movie not found" });
    return;
  }

  await updateDubbingJob(db, jobId, { status: "processing" });

  try {
    let providerProjectId = job.providerProjectId ?? undefined;

    if (!providerProjectId) {
      const sourceUrl = await resolveSourceUrl(movie.watchSource);
      if (!sourceUrl) {
        await updateDubbingJob(db, jobId, {
          status: "failed",
          errorMessage: "No downloadable source for dubbing"
        });
        return;
      }

      providerProjectId = await startElevenLabsDubbing({
        sourceUrl,
        targetLanguage: job.targetLanguage,
        name: `MoVAI — ${movie.title}`
      });
      await updateDubbingJob(db, jobId, { providerProjectId });
    }

    const status = await getElevenLabsDubbingStatus(providerProjectId);

    if (status.status === "dubbed" || status.status === "completed") {
      await updateDubbingJob(db, jobId, {
        status: "completed",
        ...(status.targetUrl ? { resultUrl: status.targetUrl } : {})
      });
      return;
    }

    if (status.status === "failed") {
      await updateDubbingJob(db, jobId, { status: "failed", errorMessage: "ElevenLabs dubbing failed" });
      return;
    }

    // Still processing — leave as processing for a later retry/poll job.
    await updateDubbingJob(db, jobId, { status: "processing" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dubbing failed";
    await updateDubbingJob(db, jobId, { status: "failed", errorMessage: message });
  }
}
