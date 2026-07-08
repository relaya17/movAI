import { defineConfig } from "drizzle-kit";

// DATABASE_URL should be the *direct* (non-pooled) connection string for
// migrations - pooled/PgBouncer connections don't support the prepared
// statements drizzle-kit needs. Runtime app traffic uses the pooled string
// instead (see src/client.ts / architecture plan §11.3).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://movai:movai@localhost:5433/movai"
  }
});
