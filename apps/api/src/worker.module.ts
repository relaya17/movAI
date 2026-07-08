import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { InfraModule } from "./infra/infra.module";
import { AIProvidersModule } from "./ai-providers/ai-providers.module";
import { AICreationWorkerModule } from "./queue/ai-creation-worker.module";

/**
 * Entry module for the standalone worker process (worker.ts) - deliberately
 * separate from AppModule (main.ts's HTTP entry point), not a subset of it.
 * Pulls in only what BullMQ job processing needs: DB/Redis/Search via the
 * @Global() InfraModule, the AI provider clients (Replicate/Suno/
 * ElevenLabs), and the AI creation processor itself. No HTTP controllers,
 * no ThrottlerModule/APP_GUARD, no MoviesModule/AdminModule/StudioModule -
 * keeping this surface small is what guarantees the request-handling
 * process can never again accidentally end up running job-processing code
 * on its event loop (review finding: "AI processing runs inside the
 * HTTP-serving process").
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), InfraModule, AIProvidersModule, AICreationWorkerModule]
})
export class WorkerModule {}
