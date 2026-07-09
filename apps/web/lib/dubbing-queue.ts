import { createLazyDubbingQueue, createQueueConnection } from "@movai/queue";

const dubbingQueue = createLazyDubbingQueue(
  createQueueConnection({ url: process.env.REDIS_URL ?? "redis://127.0.0.1:6380" })
);

export async function enqueueDubbingJob(jobId: string): Promise<void> {
  try {
    await dubbingQueue.add(
      "dub",
      { jobId },
      { jobId: `dubbing-${jobId}`, removeOnComplete: 100, removeOnFail: 50 }
    );
  } catch {
    // Redis may be down in dev.
  }
}
