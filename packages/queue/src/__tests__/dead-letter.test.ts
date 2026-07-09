import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import type { Job, Queue, Worker } from "bullmq";
import { attachDeadLetterRouting } from "../dead-letter";
import type { DeadLetterJob } from "../queues";

function createFakeWorker() {
  const emitter = new EventEmitter();
  return Object.assign(emitter, {
    on: emitter.on.bind(emitter),
    emit: emitter.emit.bind(emitter)
  }) as unknown as Worker;
}

function createFakeJob(overrides: Partial<{ attemptsMade: number; attempts: number; id: string; data: unknown }>): Job {
  return {
    id: overrides.id ?? "job-1",
    attemptsMade: overrides.attemptsMade ?? 1,
    opts: { attempts: overrides.attempts ?? 3 },
    data: overrides.data ?? { foo: "bar" }
  } as unknown as Job;
}

describe("attachDeadLetterRouting", () => {
  it("routes to the dead-letter queue once retries are exhausted", () => {
    const worker = createFakeWorker();
    const add = vi.fn();
    const deadLetterQueue = { add } as unknown as Queue<DeadLetterJob>;

    attachDeadLetterRouting(worker, deadLetterQueue, "movai-ingestion");
    worker.emit("failed", createFakeJob({ attemptsMade: 3, attempts: 3 }), new Error("boom"), "");

    expect(add).toHaveBeenCalledWith(
      "dead-letter",
      expect.objectContaining({ originalQueue: "movai-ingestion", failedReason: "boom" })
    );
  });

  it("does not route to the dead-letter queue while retries remain", () => {
    const worker = createFakeWorker();
    const add = vi.fn();
    const deadLetterQueue = { add } as unknown as Queue<DeadLetterJob>;

    attachDeadLetterRouting(worker, deadLetterQueue, "movai-ingestion");
    worker.emit("failed", createFakeJob({ attemptsMade: 1, attempts: 3 }), new Error("transient"), "");

    expect(add).not.toHaveBeenCalled();
  });

  it("invokes the onDeadLettered alerting callback once retries are exhausted", () => {
    // Regression guard for the review finding "dead-letter queue exists but
    // nothing alerts on it" - a job landing here must not go unnoticed.
    const worker = createFakeWorker();
    const deadLetterQueue = { add: vi.fn() } as unknown as Queue<DeadLetterJob>;
    const onDeadLettered = vi.fn();

    attachDeadLetterRouting(worker, deadLetterQueue, "movai-link-check", onDeadLettered);
    worker.emit("failed", createFakeJob({ attemptsMade: 2, attempts: 3, id: "job-9" }), new Error("upstream down"), "");

    expect(onDeadLettered).toHaveBeenCalledWith(
      expect.objectContaining({ originalQueue: "movai-link-check", originalJobId: "job-9", failedReason: "upstream down" })
    );
  });

  it("does not invoke onDeadLettered while retries remain", () => {
    const worker = createFakeWorker();
    const deadLetterQueue = { add: vi.fn() } as unknown as Queue<DeadLetterJob>;
    const onDeadLettered = vi.fn();

    attachDeadLetterRouting(worker, deadLetterQueue, "movai-ingestion", onDeadLettered);
    worker.emit("failed", createFakeJob({ attemptsMade: 0, attempts: 3 }), new Error("transient"), "");

    expect(onDeadLettered).not.toHaveBeenCalled();
  });

  it("works with no onDeadLettered callback provided (optional, backward compatible)", () => {
    const worker = createFakeWorker();
    const add = vi.fn();
    const deadLetterQueue = { add } as unknown as Queue<DeadLetterJob>;

    expect(() => {
      attachDeadLetterRouting(worker, deadLetterQueue, "movai-ingestion");
      worker.emit("failed", createFakeJob({ attemptsMade: 3, attempts: 3 }), new Error("boom"), "");
    }).not.toThrow();
    expect(add).toHaveBeenCalledOnce();
  });
});
