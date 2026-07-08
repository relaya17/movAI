import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { InfraModule } from "./infra/infra.module";
import { HealthModule } from "./health/health.module";
import { MoviesModule } from "./movies/movies.module";
import { AdminModule } from "./admin/admin.module";
import { CreditsModule } from "./credits/credits.module";
import { QueueModule } from "./queue/queue.module";
import { StudioModule } from "./studio/studio.module";
import { AIProvidersModule } from "./ai-providers/ai-providers.module";
import { MonitoringModule } from "./monitoring/monitoring.module";

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
    CreditsModule,
    QueueModule,
    StudioModule,
    AIProvidersModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }]
})
export class AppModule {}
