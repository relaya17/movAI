import { config } from "dotenv";
import { resolve } from "node:path";

/**
 * Must run before InfraModule's Redis/DB factories - Nest's ConfigModule
 * initializes *after* InfraModule in this app's import graph, so REDIS_URL
 * from apps/api/.env would otherwise still be unset when ioredis connects.
 */
config({ path: resolve(process.cwd(), ".env") });

if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = "redis://127.0.0.1:6380";
}
