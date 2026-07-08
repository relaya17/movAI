import { Module } from "@nestjs/common";
import { QueueModule } from "./queue.module";
import { CreditsModule } from "../credits/credits.module";
import { AICreationProcessor } from "./ai-creation.processor";

/**
 * The consumer side of AI creation job processing, split out from
 * QueueModule on purpose (review finding: "AI processing runs inside the
 * HTTP-serving process"). QueueModule only registers the queue for
 * producers (StudioService's `.add()` calls) and is imported by AppModule
 * (main.ts). This module additionally provides AICreationProcessor - the
 * `@Processor` that actually executes video/music/voice generation jobs -
 * and is only ever imported by worker.module.ts, never by AppModule. So a
 * crash or slow generation job can no longer take the HTTP API down with
 * it, and heavy job processing never competes with request handling for
 * the same event loop.
 */
@Module({
  imports: [QueueModule, CreditsModule],
  providers: [AICreationProcessor],
})
export class AICreationWorkerModule {}
