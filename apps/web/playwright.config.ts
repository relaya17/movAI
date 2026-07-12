import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3110);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;

/**
 * Smoke E2E for CI: home + auth pages load without live Redis/Postgres.
 * Catalog pages fall back to mocks when DB is unreachable.
 * Uses port 3110 by default so a local `next dev` on 3100 does not collide.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  ...(process.env.CI ? { workers: 1 as const } : {}),
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    ...devices["Desktop Chrome"]
  },
  webServer: {
    // CI already ran `pnpm build`; production server avoids cold compile
    // timeouts on the movie route. Locally prefer next start if .next exists,
    // else fall back to next dev via reuseExistingServer / manual.
    command: process.env.CI
      ? `pnpm exec next start -p ${PORT} -H 127.0.0.1`
      : `pnpm exec next dev -p ${PORT} -H 127.0.0.1`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      ...process.env,
      PORT: String(PORT),
      AUTH_SECRET: process.env.AUTH_SECRET ?? "playwright-ci-auth-secret-32chars!!",
      AUTH_URL: BASE_URL,
      NEXT_PUBLIC_APP_URL: BASE_URL,
      // Soft-fail when Docker Redis/Postgres are down (catalog falls back to mocks).
      DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://movai:movai@127.0.0.1:5433/movai",
      REDIS_URL: process.env.REDIS_URL ?? "redis://127.0.0.1:6380"
    }
  }
});



