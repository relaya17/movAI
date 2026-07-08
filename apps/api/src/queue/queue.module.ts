import { Module, Global } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AICreationProcessor } from "./ai-creation.processor";
import { AI_CREATION_QUEUE } from "./constants";

export { AI_CREATION_QUEUE };

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get("REDIS_HOST", "localhost"),
          port: config.get("REDIS_PORT", 6379),
        },
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
  providers: [AICreationProcessor],
  exports: [BullModule],
})
export class QueueModule {}
