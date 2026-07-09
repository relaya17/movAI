import "./load-env";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger, ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { ensureMoviesIndex } from "@movai/search";
import type { MeiliSearch } from "meilisearch";
import { AppModule } from "./app.module";
import { SEARCH_CLIENT } from "./infra/tokens";
import { initSentry } from "./monitoring/alerting";

async function bootstrap(): Promise<void> {
  // Before anything else - so a crash during module bootstrap itself is
  // still reportable, not just errors after the app is already listening.
  initSentry("api");

  const app = await NestFactory.create(AppModule);
  const logger = new Logger("Bootstrap");

  // Sets the standard defensive headers (X-Content-Type-Options,
  // X-Frame-Options, a conservative CSP, etc.) that a bare Express/Nest app
  // doesn't send on its own - table-stakes for anything serving traffic
  // outside localhost.
  app.use(helmet());

  // Was previously enforced ad hoc per-controller (`if (!dto.prompt?.trim())
  // throw new BadRequestException(...)`), inconsistently, and did nothing
  // against extra/malformed fields. Real DTO classes (studio.service.ts,
  // credits.controller.ts) now describe their own constraints; whitelist
  // strips any field a DTO didn't declare instead of silently passing it
  // through to a service method.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  // Lets NestJS run each module's onModuleDestroy/beforeApplicationShutdown
  // hooks (closing the DB pool, Redis, Meilisearch's underlying HTTP agent,
  // BullMQ connections) on SIGTERM/SIGINT instead of the process just
  // dying mid-request when a container orchestrator restarts/redeploys it.
  app.enableShutdownHooks();

  // API versioning (architecture plan §17.4) - breaking changes get /v2/,
  // /v1/ keeps working for at least 6 months per the documented policy.
  // "metrics" is excluded alongside "health" - scrapers/uptime monitors
  // expect a stable, unversioned path.
  app.setGlobalPrefix("v1", { exclude: ["health", "metrics"] });

  app.enableCors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:3100" });

  // Idempotent (see packages/search/src/index-setup.ts) - configures
  // Meilisearch's filterable/searchable attributes. Also called from
  // worker.ts; calling it here too means search filtering still works
  // correctly even if the HTTP API is ever started without the worker
  // process running alongside it.
  await ensureMoviesIndex(app.get<MeiliSearch>(SEARCH_CLIENT)).catch((error: unknown) => {
    logger.warn(`ensureMoviesIndex failed on startup (search filtering may be degraded): ${String(error)}`);
  });

  // 4000/3000 are extremely common defaults (used by countless other local
  // dev tools), which is what caused the EADDRINUSE crash - 4100 collides
  // with far less on a typical dev machine.
  const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 4100;
  await app.listen(port);
}

bootstrap().catch((error: unknown) => {
  console.error("Failed to start MoVAI API", error);
  process.exitCode = 1;
});
