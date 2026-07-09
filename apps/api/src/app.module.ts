import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { InfraModule } from "./infra/infra.module";
import { HealthModule } from "./health/health.module";
import { MoviesModule } from "./movies/movies.module";
import { AdminModule } from "./admin/admin.module";
import { MonitoringModule } from "./monitoring/monitoring.module";

/**
 * StudioModule/CreditsModule/QueueModule/AIProvidersModule (+ the
 * jwt-auth.guard.ts they were gated behind) were removed - that was a
 * second, independently-built AI-generation backend (queue + Replicate/
 * Suno/ElevenLabs + its own credits ledger) that no frontend ever called
 * (apps/web's Studio UI has always used its own direct-to-Replicate
 * pipeline in apps/web/lib/ai-studio-actions.ts, against the SAME
 * credit_balances/credit_transactions tables via packages/db). Two
 * parallel systems able to mutate the same ledger was the real duplication
 * risk, not just unused code - removed rather than migrated, since the
 * live pipeline already works end-to-end and the API one was never wired
 * to anything.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Per-IP rate limiting (architecture plan §13.2) - 100 req/min default,
    // tightened per-route (e.g. auth) inside the relevant controllers.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    InfraModule,
    MonitoringModule,
    HealthModule,
    MoviesModule,
    AdminModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }]
})
export class AppModule {}
