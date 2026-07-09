import { Controller, Get, Inject } from "@nestjs/common";
import { sql } from "drizzle-orm";
import type { Database } from "@movai/db";
import type { Redis } from "ioredis";
import type { MeiliSearch } from "meilisearch";
import { DATABASE, REDIS_CLIENT, SEARCH_CLIENT } from "../infra/tokens.js";

type ServiceStatus = "ok" | "down";

interface HealthResponse {
  status: "ok" | "degraded";
  services: Record<"postgres" | "redis" | "meilisearch", ServiceStatus>;
}

/**
 * GET /health (excluded from the /v1 prefix on purpose - uptime monitors
 * should hit a stable, unversioned path). Architecture plan §12.2.
 *
 * Each dependency is checked independently and failures are caught locally -
 * one dead service reports "degraded", it never 500s the whole endpoint,
 * since the entire point of this route is to stay reachable during a
 * partial outage (architecture plan §12.1's fallback philosophy applies to
 * health checks too, not just content adapters).
 */
@Controller("health")
export class HealthController {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(SEARCH_CLIENT) private readonly search: MeiliSearch
  ) {}

  @Get()
  async check(): Promise<HealthResponse> {
    const [postgres, redis, meilisearch] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
      this.checkMeilisearch()
    ]);

    const services = { postgres, redis, meilisearch };
    const status = Object.values(services).every((serviceStatus) => serviceStatus === "ok") ? "ok" : "degraded";

    return { status, services };
  }

  private async checkPostgres(): Promise<ServiceStatus> {
    try {
      await this.db.execute(sql`select 1`);
      return "ok";
    } catch {
      return "down";
    }
  }

  private async checkRedis(): Promise<ServiceStatus> {
    try {
      // createRedisClient uses lazyConnect - first command opens the socket.
      const reply = await Promise.race([
        this.redis.ping(),
        new Promise<string>((_, reject) => {
          setTimeout(() => reject(new Error("redis ping timeout")), 2_000);
        })
      ]);
      return reply === "PONG" ? "ok" : "down";
    } catch {
      return "down";
    }
  }

  private async checkMeilisearch(): Promise<ServiceStatus> {
    try {
      const health = await this.search.health();
      return health.status === "available" ? "ok" : "down";
    } catch {
      return "down";
    }
  }
}
