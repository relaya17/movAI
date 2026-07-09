import { describe, expect, it, vi } from "vitest";
import type { Queue } from "bullmq";
import { DAILY_INGESTION_QUERIES, scheduleDailyIngestion } from "../catalog-queries";
import type { IngestionJob } from "../queues";

function createFakeQueue() {
  return { add: vi.fn().mockResolvedValue({ id: "job-1" }) } as unknown as Queue<IngestionJob>;
}

describe("scheduleDailyIngestion", () => {
  it("only schedules queries for sources the caller actually has adapters for", async () => {
    const queue = createFakeQueue();

    await scheduleDailyIngestion(queue, ["archive"]);

    const scheduledSources = (queue.add as ReturnType<typeof vi.fn>).mock.calls.map(
      ([, data]: [string, { source: string }]) => data.source
    );
    expect(scheduledSources.every((source: string) => source === "archive")).toBe(true);
    expect(scheduledSources.length).toBeGreaterThan(0);
  });

  it("schedules nothing when no configured sources match any seed query", async () => {
    const queue = createFakeQueue();

    await scheduleDailyIngestion(queue, []);

    expect(queue.add).not.toHaveBeenCalled();
  });

  it("gives every scheduled job a stable, source+query-derived jobId so re-scheduling is idempotent", async () => {
    const queue = createFakeQueue();

    await scheduleDailyIngestion(queue, ["archive", "youtube"]);

    const jobIds = (queue.add as ReturnType<typeof vi.fn>).mock.calls.map(
      ([, , opts]: [string, unknown, { jobId: string }]) => opts.jobId
    );
    // No duplicates, and every id is derived (not random) from source+query.
    expect(new Set(jobIds).size).toBe(jobIds.length);
    expect(jobIds.every((id: string) => id.startsWith("daily-ingest-"))).toBe(true);
  });

  it("uses BullMQ's repeat option (a daily cron), not a one-shot add", async () => {
    const queue = createFakeQueue();

    await scheduleDailyIngestion(queue, ["archive"]);

    const [, , opts] = (queue.add as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown, { repeat?: { pattern: string } }];
    expect(opts.repeat?.pattern).toBe("0 2 * * *");
  });

  it("the seed list is non-empty for both currently-supported adapters", () => {
    const sources = new Set(DAILY_INGESTION_QUERIES.map((seed) => seed.source));
    expect(sources.has("archive")).toBe(true);
    expect(sources.has("youtube")).toBe(true);
  });

  it("includes youtube-only seeds for every browse-page content type", () => {
    const byType = new Map<string, string[]>();
    for (const seed of DAILY_INGESTION_QUERIES) {
      const key = seed.contentType ?? "movie";
      byType.set(key, [...(byType.get(key) ?? []), seed.source]);
    }
    for (const contentType of ["standup", "music", "singing"]) {
      const sources = byType.get(contentType) ?? [];
      expect(sources.length).toBeGreaterThan(0);
      expect(sources.every((source) => source === "youtube")).toBe(true);
    }
  });

  it("defaults a seed's job payload to contentType 'movie' when the seed doesn't set one, and passes through explicit ones", async () => {
    const queue = createFakeQueue();

    await scheduleDailyIngestion(queue, ["archive", "youtube"]);

    const payloads = (queue.add as ReturnType<typeof vi.fn>).mock.calls.map(
      ([, data]: [string, { source: string; query: string; contentType: string }]) => data
    );
    const archiveComedy = payloads.find((p) => p.source === "archive" && p.query === "comedy");
    const standup = payloads.find((p) => p.contentType === "standup");

    expect(archiveComedy?.contentType).toBe("movie");
    expect(standup).toBeDefined();
  });
});
