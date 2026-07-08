import { BadRequestException, Body, Controller, Inject, Post, UseGuards } from "@nestjs/common";
import type { Queue } from "bullmq";
import { IngestionJobSchema, type IngestionJob } from "@movai/queue";
import { INGESTION_QUEUE } from "../infra/tokens.js";
import { AdminApiKeyGuard } from "./admin-api-key.guard.js";

interface IngestResponse {
  jobId: string;
}

/**
 * Operator-only endpoints, guarded by AdminApiKeyGuard (see that file for
 * why this is a stopgap, not real auth). `/v1/admin/ingest` enqueues a job
 * for the worker process (apps/api/src/worker.ts) to pick up - this
 * controller never touches adapters/DB/search directly, it only produces
 * a job, keeping the HTTP request itself fast.
 */
@UseGuards(AdminApiKeyGuard)
@Controller("admin")
export class AdminController {
  constructor(@Inject(INGESTION_QUEUE) private readonly ingestionQueue: Queue<IngestionJob>) {}

  @Post("ingest")
  async ingest(@Body() rawBody: unknown): Promise<IngestResponse> {
    const parsed = IngestionJobSchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const job = await this.ingestionQueue.add("manual-ingest", parsed.data);
    return { jobId: job.id ?? "unknown" };
  }
}
