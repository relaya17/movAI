import { createLazySubtitleQueue, createQueueConnection } from "@movai/queue";

const subtitleQueue = createLazySubtitleQueue(
  createQueueConnection({ url: process.env.REDIS_URL ?? "redis://127.0.0.1:6380" })
);

/** Enqueue Whisper/caption processing — no-op if Redis is unavailable locally. */
export async function enqueueSubtitleJob(subtitleId: string): Promise<void> {
  try {
    await subtitleQueue.add(
      "generate",
      { subtitleId },
      { jobId: `subtitle-${subtitleId}`, removeOnComplete: 100, removeOnFail: 50 }
    );
  } catch {
    // Redis may be down in dev — row stays pending until worker rescans (future) or retry.
  }
}
