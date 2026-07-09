import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { InfraModule } from "./infra/infra.module";

/**
 * Entry module for the standalone worker process (worker.ts) - deliberately
 * separate from AppModule (main.ts's HTTP entry point), not a subset of it.
 * Pulls in only what worker.ts's ingestion/link-check/dead-letter workers
 * need: DB/Redis/Search via the @Global() InfraModule. No HTTP controllers,
 * no ThrottlerModule/APP_GUARD, no MoviesModule/AdminModule - keeping this
 * surface small is what guarantees the request-handling process can never
 * again accidentally end up running job-processing code on its event loop
 * (review finding: "AI processing runs inside the HTTP-serving process").
 *
 * Previously also pulled in AIProvidersModule + AICreationWorkerModule (the
 * Replicate/Suno/ElevenLabs job processor) - removed along with the rest of
 * apps/api's Studio/Credits/AI-provider subsystem, which duplicated
 * apps/web's own already-live direct-to-Replicate generation pipeline and
 * was never wired to any frontend.
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), InfraModule]
})
export class WorkerModule {}
