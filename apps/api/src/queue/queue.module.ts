import { Module, Global } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule } from "@nestjs/config";
import { createQueueConnection } from "@movai/queue";
import { AI_CREATION_QUEUE } from "./constants";

export { AI_CREATION_QUEUE };

/**
 * Producer-only: registers the BullMQ connection/queue so any module
 * (StudioService) can `@InjectQueue(AI_CREATION_QUEUE)` and `.add()` jobs.
 * Deliberately does NOT provide AICreationProcessor (the *consumer* that
 * executes jobs) - that lives in ai-creation-worker.module.ts instead,
 * which only worker.ts ever imports. This module is imported by AppModule
 * (main.ts's HTTP process), so keeping the processor out of it is what
 * stops AI generation work from running inside the request-handling
 * process (review finding: "AI processing runs inside the HTTP process").
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      // Was reading separate REDIS_HOST/REDIS_PORT vars (defaulting to
      // 6379) here while every other Redis consumer in this app
      // (infra.module.ts, worker.ts) reads REDIS_URL (defaulting to 6380,
      // matching docker-compose.yml) - two different Redis targets in the
      // same process. createQueueConnection() is the same URL-parsing
      // helper worker.ts already uses, so this now agrees with everything
      // else instead of quietly pointing at a port nothing is listening on.
      useFactory: () => ({
        connection: createQueueConnection({ url: process.env.REDIS_URL ?? "redis://localhost:6380" }),
      }),
    }),
    BullModule.registerQueue({
      name: AI_CREATION_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: {
          age: 86400, // 24 hours
          count: 100,
        },
        removeOnFail: {
          age: 604800, // 7 days
        },
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
